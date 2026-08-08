import { supabase } from "@/integrations/supabase/client";
import { isZivoSoftwareHost } from "@/config/autoRepairDomain";

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

function dedicatedSoftwareBillingHost(): boolean {
  return typeof window !== "undefined" && isZivoSoftwareHost(window.location.hostname);
}

function dedicatedReturnPath(returnUrl: string): string {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "https://zivosoftware.com";
    const url = new URL(returnUrl, base);
    return `${url.pathname}${url.search}${url.hash}` || "/business";
  } catch {
    return "/business";
  }
}

function absoluteReturnUrl(returnUrl: string): string {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "https://zivosoftware.com";
    return new URL(returnUrl, base).toString();
  } catch {
    return "https://zivosoftware.com/business";
  }
}

function checkoutReturnUrl(returnUrl: string, status: "success" | "cancelled"): string {
  const url = absoluteReturnUrl(returnUrl);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}checkout=${status}${status === "success" ? "&session_id={CHECKOUT_SESSION_ID}" : ""}`;
}

/**
 * Starts the hosted Stripe Checkout flow. The browser selects only a server
 * catalog identifier and billing cycle; price, trial, product, and entitlement
 * metadata are loaded again by the authenticated Edge Function.
 */
export async function createSoftwareCheckoutUrl(input: {
  planId: string;
  cycle: "monthly" | "annual";
  businessId: string;
  idempotencyKey: string;
  returnUrl: string;
}): Promise<CreateSoftwareCheckoutResult> {
  const absoluteUrl = absoluteReturnUrl(input.returnUrl);
  const { data, error } = await supabase.functions.invoke("software-create-subscription", {
    body: {
      plan_id: input.planId,
      cycle: input.cycle,
      business_id: input.businessId,
      // Dedicated Software consumes return_url; the shared billing function
      // consumes success_url/cancel_url. Sending the compatible fields keeps
      // the same checkout action correct on either backend.
      return_url: dedicatedReturnPath(input.returnUrl),
      success_url: checkoutReturnUrl(absoluteUrl, "success"),
      cancel_url: checkoutReturnUrl(absoluteUrl, "cancelled"),
    },
    headers: { "Idempotency-Key": input.idempotencyKey },
  });
  if (error) throw await functionError(error, "checkout");

  const payload = (data ?? {}) as Record<string, unknown>;
  // Dedicated Software returns checkout_url; the shared provider boundary
  // historically returned url. Accept both while deployments converge.
  const url = String(payload.checkout_url || payload.url || "");
  if (!isStripeHostedUrl(url)) {
    throw new SoftwareCheckoutError("Couldn't start checkout. Please try again.", "invalid_checkout_url");
  }
  return {
    url,
    checkoutSessionId: String(payload.checkout_session_id || payload.session_id || ""),
    cached: payload.cached === true,
  };
}

export async function createSoftwareBillingPortalUrl(input: {
  businessId: string;
  idempotencyKey: string;
  returnUrl: string;
}): Promise<string> {
  const dedicated = dedicatedSoftwareBillingHost();
  const { data, error } = await supabase.functions.invoke(
    dedicated ? "software-subscription-portal" : "zivopay-create-billing-portal",
    {
      body: {
        // Main uses business_id; the dedicated Software function uses
        // store_id. Both refer to the same owner-scoped workspace.
        business_id: input.businessId,
        store_id: input.businessId,
        return_url: dedicated ? dedicatedReturnPath(input.returnUrl) : input.returnUrl,
      },
      headers: { "Idempotency-Key": input.idempotencyKey },
    },
  );
  if (error) throw await functionError(error, "portal");

  const url = String((data as Record<string, unknown> | null)?.url || "");
  if (!isStripeHostedUrl(url)) {
    throw new SoftwareCheckoutError("Couldn't open billing settings. Please try again.", "invalid_portal_url");
  }
  return url;
}
