const ACCESS_STATUSES = new Set(["active", "trialing"]);

type ManualSoftwareEntitlement = {
  status?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
  payment_subscription_id?: string | null;
  provider_subscription_id?: string | null;
};

export function stripeSoftwareAccessGranted(status?: string | null): boolean {
  return ACCESS_STATUSES.has(String(status || "").toLowerCase());
}

function futureDate(value: string | null | undefined, now: number): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now;
}

export function manualSoftwareAccessGranted(
  entitlement?: ManualSoftwareEntitlement | null,
  now = Date.now(),
): boolean {
  if (!entitlement) return false;
  if (entitlement.payment_subscription_id || entitlement.provider_subscription_id) return false;

  const status = String(entitlement.status || "").toLowerCase();
  if (!ACCESS_STATUSES.has(status)) return false;

  if (status === "trialing") {
    return futureDate(entitlement.trial_end ?? entitlement.current_period_end, now);
  }

  return entitlement.current_period_end
    ? futureDate(entitlement.current_period_end, now)
    : true;
}
