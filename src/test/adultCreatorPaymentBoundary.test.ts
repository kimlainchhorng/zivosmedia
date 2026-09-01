import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

/** Stripe calls that create an account, a charge, or a payout. */
const STRIPE_CREATES =
  /(accounts|accountSessions|checkout\.sessions|paymentIntents|subscriptions|payouts|transfers)\.create/;

function stripeCreatingFunctions(): string[] {
  const dir = path.join(root, "supabase", "functions");
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      const file = path.join(dir, name, "index.ts");
      return (
        existsSync(file) && STRIPE_CREATES.test(readFileSync(file, "utf8"))
      );
    })
    .sort();
}

/**
 * Stripe endpoints that create money movement but cannot serve creator content.
 *
 * Ordinary commerce — rides, food, groceries, flights, lodging, car rental,
 * salon, bus, gift cards, wallet top-ups, ads, ZIVO+. None of these can be a
 * route to an adult creator's paid content, so none needs the boundary.
 *
 * This is an ALLOWLIST rather than a guarded-list because the risk is a NEW
 * Stripe endpoint nobody thinks to guard. Anything not named here must carry
 * the guard, so adding a creator-facing charge path forces a deliberate choice
 * instead of silently widening the exposure. `connect-account-session` was
 * exactly that kind of miss: a second onboarding route found only by hand.
 */
const NON_CREATOR_COMMERCE = new Set([
  "approve-lodging-change",
  "auto-recharge-ads-wallet",
  "cancel-eats-order",
  "capture-car-rental-balance",
  "capture-ride-tip",
  "charge-salon-no-show-fee",
  "charge-salon-tip",
  "connect-onboard-stylist",
  "create-ads-wallet-topup",
  "create-bus-payment-intent",
  "create-car-rental-deposit",
  "create-coin-checkout",
  "create-coin-payment-intent",
  "create-eats-payment",
  "create-flight-checkout",
  "create-flight-payment-intent",
  "create-grocery-checkout",
  "create-grocery-payment-intent",
  "create-lodging-deposit",
  "create-payment-intent",
  "create-reel-boost",
  "create-ride-payment",
  "create-ride-payment-intent",
  "create-salon-deposit",
  "create-user-wallet-topup",
  "create-zivo-plus-checkout",
  "driver-connect-onboard",
  "driver-payout",
  "purchase-gift-card",
  "purchase-lodging-addons",
  "restaurant-cancel-order",
  "stripe-lodging-webhook",
  "subscribe-salon-membership",
  "zivopay-create-checkout-session",
  "zivopay-create-subscription-checkout",
]);

const BOUNDARY = "supabase/functions/_shared/adultCreatorPaymentBoundary.ts";

/**
 * Every Stripe path that can charge for an adult creator's paid content.
 *
 * Split by role because the failure modes differ: a create path that slips
 * through opens a charge, while a confirm path that slips through grants access
 * to something already charged. Both end with restricted content settled on the
 * platform's Stripe account.
 */
const CHARGE_FUNCTIONS = [
  "supabase/functions/unlock-media-checkout/index.ts", // pay-per-view media
  "supabase/functions/create-tip-checkout/index.ts", // tips (hosted checkout)
  "supabase/functions/create-tip-payment-intent/index.ts", // tips (intent)
  "supabase/functions/subscribe-to-tier/index.ts", // recurring subscription
  "supabase/functions/subscribe-to-tier-intent/index.ts", // lifetime / intent
  "supabase/functions/confirm-tier-subscription/index.ts", // confirm (defence in depth)
] as const;

/**
 * ZIVO lets creators self-designate as adult creators, and the platform's own
 * age gate warns that they "may post explicit 18+ content". Paid access to that
 * content was charged through the same Stripe account as rides, food, and
 * travel — and adult content sits on Stripe's restricted-businesses list,
 * naming pay-per-view and adult subscriptions specifically.
 *
 * The risk is not the creator feature; it is that losing the Stripe account
 * would stop rides and deliveries too. These tests keep the boundary in place
 * until an adult-permitted processor exists to route these charges to.
 */
describe("adult creator payment boundary", () => {
  it("guards every Stripe charge path for creator content", () => {
    for (const file of CHARGE_FUNCTIONS) {
      const source = read(file);
      expect(source, `${file} is missing the adult creator guard`).toContain(
        "isAdultCreatorAccount(",
      );
      expect(source, `${file} does not refuse the charge`).toContain(
        "adultCreatorPaymentBlockedResponse(",
      );
    }
  });

  it("checks before any Stripe object is created", () => {
    // A guard placed after `new Stripe(...)` can still leave a half-created
    // session or intent behind on the account, which is the record a review
    // would find.
    for (const file of CHARGE_FUNCTIONS) {
      const source = read(file);
      const guard = source.indexOf("isAdultCreatorAccount(");
      const stripeClient = source.indexOf("new Stripe(");
      expect(guard, `${file} has no guard`).toBeGreaterThan(-1);
      if (stripeClient > -1) {
        expect(guard, `${file} guards after constructing Stripe`).toBeLessThan(
          stripeClient,
        );
      }
    }
  });

  it("resolves the creator server-side, never from the request body alone", () => {
    // The browser knows who it is paying, but is not an authorization boundary.
    // The lookup runs through a service-role client against the creator's own
    // profile row.
    const boundary = read(BOUNDARY);
    expect(boundary).toContain('.from("profiles")');
    expect(boundary).toContain('.eq("user_id"');
    expect(boundary).toContain("is_of_creator");
    expect(boundary).toContain("creator_type");
  });

  it("fails closed when the creator cannot be resolved", () => {
    // Treating an unknown account as ordinary would mean a transient database
    // error is enough to put a restricted charge through, unnoticed.
    const boundary = read(BOUNDARY);
    expect(boundary).toMatch(/if \(!id\) return true;/);
    expect(boundary).toMatch(/if \(error \|\| !data\) return true;/);
    expect(boundary).toMatch(/catch \{\s*return true;\s*\}/);
  });

  it("answers with a distinct, non-retryable code", () => {
    const boundary = read(BOUNDARY);
    expect(boundary).toContain("adult_creator_payments_unavailable");
    expect(boundary).toContain("status: 409");
  });

  /**
   * Money out, not just money in.
   *
   * Blocking the charges while still opening a Stripe Connect account for an
   * adult creator would leave the platform sponsoring a restricted business
   * directly — and a Connect account is attributed to the platform, not to the
   * creator, so that is arguably the worse half.
   */
  /**
   * The sweep that would have caught `connect-account-session` on its own.
   *
   * Enumerating every Stripe endpoint that creates an account, charge, or
   * payout — rather than checking a hand-written list — means a new
   * creator-facing charge path cannot be added without someone deciding, in
   * this file, whether it needs the boundary.
   */
  it("leaves no Stripe money-movement endpoint unclassified", () => {
    const unclassified = stripeCreatingFunctions().filter((name) => {
      if (NON_CREATOR_COMMERCE.has(name)) return false;
      const source = read(`supabase/functions/${name}/index.ts`);
      return !source.includes("isAdultCreatorAccount");
    });

    expect(
      unclassified,
      "Stripe endpoint(s) neither guarded nor allowlisted as non-creator commerce. " +
        "Add the adult-creator guard, or add to NON_CREATOR_COMMERCE with a reason.",
    ).toEqual([]);
  });

  describe("outbound payout boundary", () => {
    // BOTH onboarding routes. connect-onboard returns a hosted account link;
    // connect-account-session creates the same Connect account plus an embedded
    // session. Guarding one and not the other left the boundary open.
    const OUTBOUND = [
      "supabase/functions/connect-onboard/index.ts",
      "supabase/functions/connect-account-session/index.ts",
    ] as const;

    it("refuses Connect onboarding and payouts for adult creators", () => {
      for (const file of OUTBOUND) {
        const source = read(file);
        expect(source, `${file} is missing the adult creator guard`).toContain(
          "isAdultCreatorAccount(",
        );
        expect(source, `${file} does not refuse`).toContain(
          "adultCreatorPaymentBlockedResponse(",
        );
      }
    });

    it("scopes the check to the signed-in account holder", () => {
      // These endpoints are shared with salon and lodging merchants. Checking
      // the authenticated user's own profile leaves them untouched — they carry
      // neither is_of_creator nor creator_type — while a body-supplied id would
      // have been both spoofable and wrong here.
      for (const file of OUTBOUND) {
        expect(read(file)).toMatch(
          /isAdultCreatorAccount\(\s*supabase,\s*user\.id\s*\)/,
        );
      }
    });

    it("checks before any Stripe object is created", () => {
      for (const file of OUTBOUND) {
        const source = read(file);
        const guard = source.indexOf("isAdultCreatorAccount(");
        const stripeClient = source.indexOf("new Stripe(");
        expect(guard).toBeGreaterThan(-1);
        if (stripeClient > -1) {
          expect(
            guard,
            `${file} guards after constructing Stripe`,
          ).toBeLessThan(stripeClient);
        }
      }
    });

    it("universally tombstones legacy instant payout before any account or provider work", () => {
      const source = read("supabase/functions/connect-instant-payout/index.ts");
      expect(source).toContain("wallet_cashout_authority_unavailable");
      expect(source).toContain("status: 503");
      expect(source).toContain("retryable: false");
      expect(source).not.toContain("new Stripe(");
      expect(source).not.toContain("withIdempotency(");
      expect(source).not.toContain('from("customer_wallets")');
    });
  });

  /**
   * Blocking new charges is only half the problem. A subscription opened before
   * this boundary existed keeps renewing by itself, so restricted content would
   * go on settling on the account every month — which is what a processor
   * review actually looks at.
   */
  describe("legacy subscription wind-down", () => {
    const WEBHOOK = "supabase/functions/stripe-webhook/index.ts";
    const SWEEP = "scripts/payments/wind-down-adult-creator-subscriptions.mjs";

    it("stops adult-creator subscriptions renewing when the webhook sees them", () => {
      const webhook = read(WEBHOOK);
      expect(webhook).toContain("isAdultCreatorAccount(");
      expect(webhook).toContain("cancel_at_period_end: true");
    });

    it("cancels at period end rather than immediately", () => {
      // The subscriber has paid for the current period. Revoking access they
      // are owed would invite exactly the dispute this boundary exists to
      // avoid, and refunding mid-term is worse than simply not renewing.
      const webhook = read(WEBHOOK);
      expect(webhook).not.toMatch(/subscriptions\.cancel\(/);
      expect(read(SWEEP)).toContain('cancel_at_period_end: "true"');
    });

    it("does not re-issue the Stripe call on repeated webhook deliveries", () => {
      // Webhooks retry. Without this the same subscription is updated on every
      // delivery, for no change.
      expect(read(WEBHOOK)).toContain("!subscription.cancel_at_period_end");
    });

    it("keeps the proactive sweep read-only unless explicitly applied", () => {
      // The webhook only fires around a renewal, so it reacts to a charge that
      // has already happened. The sweep is what stops the NEXT one — but it
      // must not act by accident.
      const sweep = read(SWEEP);
      expect(sweep).toContain('const APPLY = process.argv.includes("--apply")');
      expect(sweep).toMatch(/if \(!APPLY\)/);
      expect(sweep).toMatch(/refusing to --apply/);
    });
  });
});
