import { supabase } from "@/integrations/supabase/client";

export class SoftwareCheckoutError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "SoftwareCheckoutError";
    this.code = code;
  }
}

export type CreateSoftwareCheckoutResult = {
  url: string;
  checkoutSessionId: string;
  cached: boolean;
};

function isStripeHostedUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "stripe.com" || host.endsWith(".stripe.com"));
  } catch {
    return false;
  }
}

function friendlyMessage(code: string, operation: "checkout" | "portal"): string {
  const normalized = code.toLowerCase();
  if (normalized.includes("idempotency")) {
    return operation === "portal"
      ? "Billing settings are already being prepared. Please wait a moment."
      : "Checkout is already being prepared. Please wait a moment.";
  }
  if (normalized.includes("existing software subscription") || normalized.includes("existing subscription")) {
    return "This business already has a Software subscription. Open Manage billing to change it.";
  }
  if (normalized.includes("owner access")) return "Only a business owner or administrator can manage this subscription.";
  if (normalized.includes("pricing plan") || normalized.includes("plan_id")) return "That plan is not currently available.";
  if (normalized.includes("stripe") && normalized.includes("configured")) return "Subscriptions are not available right now.";
  return operation === "portal"
    ? "Couldn't open billing settings. Please try again."
    : "Couldn't start checkout. Please try again.";
}

async function functionError(
  error: unknown,
  operation: "checkout" | "portal",
): Promise<SoftwareCheckoutError> {
  let code = error instanceof Error ? error.message : String(error || "checkout_error");
  try {
    const context = (error as { context?: { json?: () => Promise<unknown> } })?.context;
    const payload = context?.json ? await context.json() as { error?: unknown; message?: unknown } : null;
    code = String(payload?.message || payload?.error || code);
  } catch {
    // Keep the provider-neutral message from the function client.
  }
  return new SoftwareCheckoutError(friendlyMessage(code, operation), code);
}

export function newSoftwareBillingIdempotencyKey(scope: "checkout" | "portal"): string {
  return `zivo-software-${scope}-${crypto.randomUUID()}`;
}

/**
 * Starts the canonical hosted Stripe Checkout flow. The browser selects only a
 * server catalog plan UUID; price, currency, trial, product, and entitlement
 * metadata are loaded again by the authenticated Edge Function.
 */
export async function createSoftwareCheckoutUrl(input: {
  planId: string;
  businessId: string;
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CreateSoftwareCheckoutResult> {
  const { data, error } = await supabase.functions.invoke("software-create-subscription", {
    body: {
      plan_id: input.planId,
      business_id: input.businessId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    },
    headers: { "Idempotency-Key": input.idempotencyKey },
  });
  if (error) throw await functionError(error, "checkout");

  const payload = (data ?? {}) as Record<string, unknown>;
  const url = String(payload.url || "");
  if (!isStripeHostedUrl(url)) {
    throw new SoftwareCheckoutError("Couldn't start checkout. Please try again.", "invalid_checkout_url");
  }
  return {
    url,
    checkoutSessionId: String(payload.checkout_session_id || ""),
    cached: payload.cached === true,
  };
}

export async function createSoftwareBillingPortalUrl(input: {
  businessId: string;
  idempotencyKey: string;
  returnUrl: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("zivopay-create-billing-portal", {
    body: { business_id: input.businessId, return_url: input.returnUrl },
    headers: { "Idempotency-Key": input.idempotencyKey },
  });
  if (error) throw await functionError(error, "portal");

  const url = String((data as Record<string, unknown> | null)?.url || "");
  if (!isStripeHostedUrl(url)) {
    throw new SoftwareCheckoutError("Couldn't open billing settings. Please try again.", "invalid_portal_url");
  }
  return url;
}
