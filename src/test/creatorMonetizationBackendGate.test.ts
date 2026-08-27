import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREATOR_MONETIZATION_BLOCKED_CODE,
  creatorMonetizationBlockedResponse,
  creatorMonetizationWebhookAcknowledgement,
  isCreatorMonetizationDisabled,
} from "../../supabase/functions/_shared/creatorMonetizationCompliance";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const functionSource = (name: string) =>
  read(`supabase/functions/${name}/index.ts`);

const handlerSource = (name: string) => {
  const source = functionSource(name);
  const marker = `withSecurity("${name}"`;
  const start = source.indexOf(marker);
  expect(start, `${name} has no secured handler`).toBeGreaterThan(-1);
  return source.slice(start);
};

const ALWAYS_BLOCKED = [
  "create-tip-checkout",
  "create-tip-payment-intent",
  "create-tip-paypal-order",
  "capture-tip-paypal-order",
  "create-tip-square-checkout",
  "subscribe-to-tier",
  "subscribe-to-tier-intent",
  "confirm-tier-subscription",
  "unlock-media-checkout",
  "verify-media-unlock",
  "create-coin-checkout",
  "create-coin-payment-intent",
  "verify-coin-purchase",
  "chat-send-gift",
  "chat-send-premium-gift",
  "chat-transfer-coins",
  "chat-unlock-group-media",
  "create-p2p-transfer",
  "creator-payout-method-record",
  "creator-payout-request",
] as const;

describe("creator monetization backend compliance gate", () => {
  it("returns one stable, non-cacheable 403 contract", async () => {
    expect(isCreatorMonetizationDisabled()).toBe(true);
    const response = creatorMonetizationBlockedResponse({
      "Access-Control-Allow-Origin": "https://zivosmedia.com",
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://zivosmedia.com",
    );
    await expect(response.json()).resolves.toEqual({
      error: CREATOR_MONETIZATION_BLOCKED_CODE,
      code: CREATOR_MONETIZATION_BLOCKED_CODE,
      message:
        "Creator payments and peer-to-peer value transfers are not available.",
    });
  });

  it.each(ALWAYS_BLOCKED)("fails closed at the start of %s", (name) => {
    const source = handlerSource(name);
    const gate = source.indexOf("creatorMonetizationBlockedResponse(");
    const work = source.indexOf("try {");

    expect(gate, `${name} is missing the compliance refusal`).toBeGreaterThan(
      -1,
    );
    expect(gate, `${name} performs work before refusing`).toBeLessThan(work);
    expect(gate, `${name} does not refuse near the handler boundary`)
      .toBeLessThan(600);

    const stripeObject = source.indexOf("new Stripe(");
    if (stripeObject > -1) {
      expect(gate, `${name} constructs Stripe before refusing`).toBeLessThan(
        stripeObject,
      );
    }
  });

  it("scopes shared Connect and wallet payout routes to creator accounts", () => {
    const scoped = [
      ["connect-onboard", "new Stripe("],
      ["connect-account-session", "new Stripe("],
      ["connect-instant-payout", "withIdempotency("],
      ["paypal-payout", "withIdempotency("],
      ["process-withdrawal", "rateLimitDb("],
    ] as const;

    for (const [name, firstMoneyWork] of scoped) {
      const source = handlerSource(name);
      const classifier = source.indexOf("isCreatorMonetizationAccount(");
      const refusal = source.indexOf("creatorMonetizationBlockedResponse(");
      const providerOrLedger = source.indexOf(firstMoneyWork);
      expect(classifier, `${name} does not classify the signed-in account`)
        .toBeGreaterThan(-1);
      expect(refusal, `${name} does not refuse creator money movement`)
        .toBeGreaterThan(classifier);
      expect(refusal, `${name} refuses after provider/ledger work`)
        .toBeLessThan(providerOrLedger);
    }
  });

  it("fails closed when a shared-route account cannot be classified", () => {
    const source = read(
      "supabase/functions/_shared/creatorMonetizationCompliance.ts",
    );
    expect(source).toContain('.from("creator_profiles")');
    expect(source).toContain('.from("profiles")');
    expect(source).toMatch(/if \(!id\) return true;/);
    expect(source).toMatch(/if \(creatorProfile\.error\) return true;/);
    expect(source).toMatch(
      /if \(profile\.error \|\| !profile\.data\) return true;/,
    );
    expect(source).toMatch(/catch \{\s*return true;\s*\}/);
  });

  it("rejects ZIVO+ gift-recipient checkout before Stripe while preserving self checkout", () => {
    const source = handlerSource("create-zivo-plus-checkout");
    const bodyRead = source.indexOf("gift_recipient_id");
    const giftGate = source.indexOf("creatorMonetizationBlockedResponse(");
    const stripeObject = source.indexOf("new Stripe(");

    expect(bodyRead).toBeGreaterThan(-1);
    expect(source).toContain(
      'typeof gift_recipient_id === "string" && gift_recipient_id.trim().length > 0',
    );
    expect(giftGate).toBeGreaterThan(bodyRead);
    expect(giftGate).toBeLessThan(stripeObject);
    expect(source).toContain("if (isCreatorMonetizationDisabled() && hasGiftRecipient)");
    expect(source).toContain('type: "membership"');
  });

  it("acknowledges signed disabled webhooks without crediting value", async () => {
    const acknowledgement = creatorMonetizationWebhookAcknowledgement();
    expect(acknowledgement.status).toBe(200);
    await expect(acknowledgement.json()).resolves.toEqual({
      received: true,
      ignored: true,
      code: CREATOR_MONETIZATION_BLOCKED_CODE,
    });

    for (const name of ["paypal-tip-webhook", "square-tip-webhook"] as const) {
      const source = handlerSource(name);
      const verified = source.indexOf("if (!verified)");
      const ignored = source.indexOf(
        "creatorMonetizationWebhookAcknowledgement(",
      );
      const creatorWrite = source.indexOf('.from("creator_tips")');
      expect(ignored, `${name} does not ignore successful creator value events`)
        .toBeGreaterThan(verified);
      expect(ignored, `${name} writes creator value before ignoring`)
        .toBeLessThan(creatorWrite);
    }

    const stripeWebhook = functionSource("stripe-webhook");
    const signatureCheck = stripeWebhook.indexOf("constructEvent");
    const acknowledgements = [
      ...stripeWebhook.matchAll(/creatorMonetizationWebhookAcknowledgement\(/g),
    ]
      .map((match) => match.index ?? -1);
    expect(signatureCheck).toBeGreaterThan(-1);
    expect(acknowledgements).toHaveLength(7);
    expect(acknowledgements.every((position) => position > signatureCheck))
      .toBe(true);

    const paymentIntentStart = stripeWebhook.indexOf(
      'case "payment_intent.succeeded"',
    );
    const paymentIntentEnd = stripeWebhook.indexOf(
      'case "payment_intent.payment_failed"',
    );
    const paymentIntentSucceeded = stripeWebhook.slice(
      paymentIntentStart,
      paymentIntentEnd,
    );
    const firstGenericWrite = paymentIntentSucceeded.indexOf(
      '.from("ride_requests")',
    );
    const earlyAcknowledgements = [
      ...paymentIntentSucceeded.matchAll(
        /creatorMonetizationWebhookAcknowledgement\(/g,
      ),
    ]
      .map((match) => match.index ?? -1);
    expect(earlyAcknowledgements).toHaveLength(3);
    expect(
      earlyAcknowledgements.every((position) => position < firstGenericWrite),
    ).toBe(true);

    const checkoutStart = stripeWebhook.indexOf(
      'case "checkout.session.completed"',
    );
    const checkoutEnd = stripeWebhook.indexOf(
      'case "checkout.session.expired"',
    );
    const checkoutCompleted = stripeWebhook.slice(checkoutStart, checkoutEnd);
    const giftCheckoutGate = checkoutCompleted.indexOf(
      'metadata.type === "zivo_plus_gift"',
    );
    const giftCheckoutAcknowledgement = checkoutCompleted.indexOf(
      "creatorMonetizationWebhookAcknowledgement(",
      giftCheckoutGate,
    );
    expect(giftCheckoutGate).toBeGreaterThan(-1);
    expect(giftCheckoutAcknowledgement).toBeGreaterThan(giftCheckoutGate);
    expect(checkoutCompleted).not.toContain("syncZivoPlusSubscription(");
    expect(checkoutCompleted).not.toContain('.from("direct_messages")');
    expect(checkoutCompleted).not.toContain("fn_record_gift_transaction");
    expect(checkoutCompleted).not.toContain("membership_gift_received");
    expect(checkoutCompleted).not.toContain("membership_gift_sent");

    const giftPaymentIntentGate = paymentIntentSucceeded.indexOf(
      'paymentIntent.metadata?.type === "zivo_plus_gift"',
    );
    const giftPaymentIntentAcknowledgement = paymentIntentSucceeded.indexOf(
      "creatorMonetizationWebhookAcknowledgement(",
      giftPaymentIntentGate,
    );
    expect(giftPaymentIntentGate).toBeGreaterThan(-1);
    expect(giftPaymentIntentAcknowledgement).toBeGreaterThan(
      giftPaymentIntentGate,
    );
    expect(giftPaymentIntentAcknowledgement).toBeLessThan(firstGenericWrite);
  });

  it("preserves cancellation, refund, dispute, and ordinary-commerce paths", () => {
    for (
      const name of [
        "cancel-creator-subscription",
        "process-refund",
        "capture-ride-tip",
        "charge-salon-tip",
        "connect-onboard-stylist",
        "driver-payout",
        "square-payout",
      ] as const
    ) {
      expect(functionSource(name), `${name} was caught by the creator shutdown`)
        .not.toContain(
          "creatorMonetizationBlockedResponse(",
        );
    }

    expect(functionSource("stripe-webhook")).toContain(
      'case "customer.subscription.deleted"',
    );
    expect(functionSource("stripe-webhook")).toContain(
      'case "charge.refunded"',
    );
    expect(functionSource("paypal-tip-webhook")).toContain(
      'eventType === "PAYMENT.CAPTURE.REFUNDED"',
    );
    expect(functionSource("square-tip-webhook")).toContain(
      'eventType === "refund.updated"',
    );
  });

  it("suppresses creator renewal and tip-earnings notifications only", () => {
    const cron = functionSource("notifications-cron");
    const cronGate = cron.indexOf("if (!isCreatorMonetizationDisabled())");
    const subscriptionRead = cron.indexOf('.from("creator_subscriptions")');
    const ordinaryFlightRead = cron.indexOf('.from("flight_bookings")');
    const ordinaryBirthdayRead = cron.indexOf('.from("profiles")');
    expect(cronGate).toBeGreaterThan(-1);
    expect(subscriptionRead).toBeGreaterThan(cronGate);
    expect(ordinaryFlightRead).toBeLessThan(cronGate);
    expect(ordinaryBirthdayRead).toBeGreaterThan(subscriptionRead);

    const digest = functionSource("notifications-weekly-digest");
    expect(digest).toContain(
      "const creatorMonetizationDisabled = isCreatorMonetizationDisabled();",
    );
    expect(digest).toMatch(
      /\.\.\.\(!creatorMonetizationDisabled[\s\S]*?collect\("creator_tips", "creator_id"\)/,
    );
    expect(digest).toMatch(
      /creatorMonetizationDisabled[\s\S]*?Promise\.resolve\(\{ data: \[\][\s\S]*?: supabase[\s\S]*?\.from\("creator_tips"\)/,
    );
    expect(digest).toContain('.from("food_orders")');
    expect(digest).toContain('.from("marketplace_orders")');
    expect(digest).toContain('.from("notifications")');
    expect(digest).toContain('event_type: "weekly_digest"');
  });

  it("does not suggest routing prohibited adult content to another processor", () => {
    const source = read(
      "supabase/functions/_shared/adultCreatorPaymentBoundary.ts",
    );
    expect(source).toContain(
      "Adult creator content and related payments are prohibited.",
    );
    expect(source).not.toContain("adult-permitted processor");
    expect(source).not.toContain("temporarily unavailable");
  });
});
