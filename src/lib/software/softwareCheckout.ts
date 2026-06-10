/**
 * Cross-project bridge to the ZIVO Software billing backend.
 *
 * Subscriptions live in the dedicated zivosoftware Supabase project (separate
 * from this app). To let store owners pay for their software plan *inside* this
 * admin, we call that project's unauthenticated `create-subscription` Edge
 * Function (it only needs plan + cycle + email) and render Stripe's embedded
 * Payment Element with the software project's publishable key. Nothing is
 * charged for a trial — Stripe collects the card via a SetupIntent.
 */
import { loadStripe, type Stripe } from "@stripe/stripe-js";

// The software project (ydxztoresbdeoeijhxww). The anon key is a *publishable*
// key — safe to ship in client code (RLS gates data, not key secrecy).
const SOFTWARE_SUPABASE_URL =
  (import.meta.env.VITE_ZIVO_SOFTWARE_SUPABASE_URL as string | undefined) ??
  "https://ydxztoresbdeoeijhxww.supabase.co";
const SOFTWARE_SUPABASE_ANON_KEY =
  (import.meta.env.VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkeHp0b3Jlc2JkZW9laWpoeHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTU0NTMsImV4cCI6MjA5NTc3MTQ1M30.TsxngKnoX_HXYyh4m1gK7peS4BUSl-NTTeAESdHJ70k";

// Software project's Stripe publishable key. Must match the account that the
// `create-subscription` function uses, since the clientSecret is account-scoped.
export const SOFTWARE_STRIPE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_ZIVO_SOFTWARE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? "";

export const isSoftwareStripeConfigured = SOFTWARE_STRIPE_PUBLISHABLE_KEY.length > 0;

let cachedStripe: Promise<Stripe | null> | null = null;
export function getSoftwareStripe(): Promise<Stripe | null> {
  if (!isSoftwareStripeConfigured) return Promise.resolve(null);
  if (!cachedStripe) cachedStripe = loadStripe(SOFTWARE_STRIPE_PUBLISHABLE_KEY);
  return cachedStripe;
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
 * Create an incomplete subscription on the software project and return the
 * client secret for the embedded Payment Element. Throws SoftwareCheckoutError
 * with a `code` ("stripe_not_configured" | "price_not_configured" | …) the UI
 * can branch on to show a friendly "billing launching soon" state.
 */
export async function createSoftwareSubscription(input: {
  planId: string;
  cycle: "monthly" | "annual";
  email: string;
}): Promise<CreateSoftwareSubscriptionResult> {
  let res: Response;
  try {
    res = await fetch(`${SOFTWARE_SUPABASE_URL}/functions/v1/create-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SOFTWARE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SOFTWARE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(input),
    });
  } catch (e) {
    throw new SoftwareCheckoutError(
      (e as Error)?.message || "Couldn't reach the billing service",
      "network_error",
    );
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = typeof data.error === "string" ? data.error : `http_${res.status}`;
    throw new SoftwareCheckoutError(friendlyMessage(code), code);
  }
  return data as unknown as CreateSoftwareSubscriptionResult;
}

function friendlyMessage(code: string): string {
  switch (code) {
    case "stripe_not_configured":
    case "price_not_configured":
      return "Subscriptions are launching soon — billing is being connected.";
    case "unknown_plan":
      return "That plan isn't available. Please pick another.";
    case "email_required":
      return "We need your email to start the subscription.";
    default:
      return "Couldn't start checkout. Please try again.";
  }
}
