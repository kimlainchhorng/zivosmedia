/**
 * In-app checkout bridge for ZIVO Software plans.
 *
 * Subscriptions are created on THIS project's `software-subscription-intent`
 * Edge Function, which returns a Stripe client secret for the embedded Payment
 * Element so the owner never leaves the admin. We reuse the app's main Stripe
 * publishable key (src/lib/stripe.ts) — the same "Zivo" Stripe account the rest
 * of the app already bills on. A trial collects the card via a SetupIntent
 * (nothing charged today).
 */
import { supabase } from "@/integrations/supabase/client";
import { getStripe, STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe";
import type { Stripe } from "@stripe/stripe-js";

export const isSoftwareStripeConfigured = STRIPE_PUBLISHABLE_KEY.length > 0;

export function getSoftwareStripe(): Promise<Stripe | null> {
  return getStripe();
}

export interface CreateSoftwareSubscriptionResult {
  clientSecret: string;
  subscriptionId: string;
  /** "setup" = free trial (SetupIntent, $0 today); "payment" = amount due now. */
  mode: "setup" | "payment";
}

export class SoftwareCheckoutError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "SoftwareCheckoutError";
    this.code = code;
  }
}

/**
 * Create an incomplete subscription for the owner's store and return the client
 * secret for the embedded Payment Element. Throws SoftwareCheckoutError with a
 * `code` ("stripe_not_configured" | "unknown_plan" | …) the dialog branches on
 * to show a friendly "billing launching soon" state.
 */
export async function createSoftwareSubscription(input: {
  planId: string;
  cycle: "monthly" | "annual";
  storeId: string;
}): Promise<CreateSoftwareSubscriptionResult> {
  const { data, error } = await supabase.functions.invoke("software-subscription-intent", {
    body: { plan_id: input.planId, cycle: input.cycle, store_id: input.storeId },
  });

  if (error) {
    let code: string | undefined;
    let message = error.message || "Couldn't start checkout. Please try again.";
    try {
      const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
      const body = ctx && typeof ctx.json === "function" ? (await ctx.json()) as { error?: string } : null;
      if (body?.error) {
        const raw = String(body.error);
        const normalized = raw.toLowerCase();
        code = normalized.includes("stripe") && normalized.includes("secret") ? "stripe_not_configured" : raw;
        message = friendlyMessage(code);
      }
    } catch {
      /* couldn't parse the function body — keep the generic message */
    }
    throw new SoftwareCheckoutError(message, code);
  }

  const d = (data ?? {}) as Record<string, unknown>;
  if (!d.client_secret) {
    throw new SoftwareCheckoutError("Couldn't start checkout. Please try again.");
  }
  return {
    clientSecret: String(d.client_secret),
    subscriptionId: String(d.subscription_id ?? ""),
    mode: d.mode === "payment" ? "payment" : "setup",
  };
}

/**
 * True only for an https Stripe-hosted URL. The hosted-checkout fallback hands
 * its return value straight to a same-tab `window.location.href`, so we confirm
 * the edge function really returned a Stripe page (checkout.stripe.com et al) —
 * a compromised or buggy response must not be able to bounce the owner to a
 * look-alike phishing site. Any `*.stripe.com` host is accepted so a future
 * Stripe host change can't lock owners out of paying.
 */
function isStripeHostedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return host === "stripe.com" || host.endsWith(".stripe.com");
  } catch {
    return false;
  }
}

/**
 * Hosted Stripe Checkout fallback — returns a Stripe-hosted URL to redirect to.
 * Used when the embedded publishable key isn't configured, so owners can still
 * pay using only the backend secret key. No card is collected until they finish
 * the hosted page.
 */
export async function createSoftwareCheckoutUrl(input: {
  planId: string;
  cycle: "monthly" | "annual";
  storeId: string;
  returnUrl?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("software-subscription-intent", {
    body: {
      plan_id: input.planId,
      cycle: input.cycle,
      store_id: input.storeId,
      flow: "hosted",
      return_url: input.returnUrl,
    },
  });
  if (error) {
    let code: string | undefined;
    let message = error.message || "Couldn't start checkout. Please try again.";
    try {
      const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
      const body = ctx && typeof ctx.json === "function" ? (await ctx.json()) as { error?: string } : null;
      if (body?.error) { code = String(body.error); message = friendlyMessage(code); }
    } catch { /* keep generic */ }
    throw new SoftwareCheckoutError(message, code);
  }
  const url = (data as Record<string, unknown>)?.url;
  if (typeof url !== "string" || !url || !isStripeHostedUrl(url)) {
    throw new SoftwareCheckoutError("Couldn't start checkout. Please try again.");
  }
  return url;
}

function friendlyMessage(code: string): string {
  switch (code) {
    case "stripe_not_configured":
      return "Subscriptions are launching soon — billing is being connected.";
    case "unknown_plan":
      return "That plan isn't available. Please pick another.";
    case "store_id is required":
      return "We couldn't tell which store this is for. Please reopen this page.";
    default:
      return "Couldn't start checkout. Please try again.";
  }
}
