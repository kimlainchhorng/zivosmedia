import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** Webhook-reconciled provider state returned after owner/admin validation. */
export interface SoftwareSubscription {
  id: string;
  plan_id: string | null;
  plan: string | null;
  cycle: string | null;
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  amount_cents: number | null;
  currency: string | null;
  interval: string | null;
  billing_portal_available: boolean;
  reconciliation_required: boolean;
  access_granted: boolean;
}

const BILLING_PORTAL_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * Normalizes both Software billing deployments. The dedicated Software
 * backend predates the shared billing response and omits the bookkeeping
 * fields, but its webhook-reconciled status is still authoritative.
 */
export function normalizeSoftwareSubscription(value: unknown): SoftwareSubscription | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const status = nullableString(raw.status);
  if (!status) return null;

  const interval = nullableString(raw.interval);
  const cycle = raw.cycle === "monthly" || raw.cycle === "annual"
    ? raw.cycle
    : interval === "month"
      ? "monthly"
      : interval === "year"
        ? "annual"
        : null;
  const billingPortalAvailable = typeof raw.billing_portal_available === "boolean"
    ? raw.billing_portal_available
    : BILLING_PORTAL_STATUSES.has(status);
  const accessGranted = typeof raw.access_granted === "boolean"
    ? raw.access_granted
    : status === "active" || status === "trialing";

  return {
    id: nullableString(raw.id) ?? "legacy-software-subscription",
    plan_id: nullableString(raw.plan_id),
    plan: nullableString(raw.plan),
    cycle,
    status,
    current_period_end: nullableString(raw.current_period_end),
    trial_end: nullableString(raw.trial_end),
    cancel_at_period_end: raw.cancel_at_period_end === true,
    amount_cents: typeof raw.amount_cents === "number" ? raw.amount_cents : null,
    currency: nullableString(raw.currency),
    interval,
    billing_portal_available: billingPortalAvailable,
    reconciliation_required: raw.reconciliation_required === true,
    access_granted: accessGranted,
  };
}

export function useSoftwareSubscription(businessId: string | undefined) {
  return useQuery({
    queryKey: ["software-subscription", businessId],
    enabled: Boolean(businessId),
    staleTime: 60_000,
    queryFn: async (): Promise<SoftwareSubscription | null> => {
      const { data, error } = await supabase.functions.invoke("software-subscription-status", {
        // The shared backend names this business_id; the dedicated Software
        // backend still names the same store_id. Sending both keeps one web
        // build compatible while the deployments converge.
        body: { business_id: businessId, store_id: businessId },
      });
      if (error) throw error;
      return normalizeSoftwareSubscription(
        (data as { subscription?: unknown } | null)?.subscription,
      );
    },
  });
}
