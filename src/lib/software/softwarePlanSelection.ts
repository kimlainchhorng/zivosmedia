const SOFTWARE_PLAN_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validSoftwarePlanId(value: string | null): string | null {
  return value && SOFTWARE_PLAN_UUID.test(value) ? value : null;
}

export function appendSoftwarePlanSelection(
  target: string,
  planId: string | null,
  cycle: "monthly" | "annual",
  baseOrigin = "https://zivosoftware.com",
): string {
  const validPlanId = validSoftwarePlanId(planId);
  if (!validPlanId) return target;

  try {
    const url = new URL(target, baseOrigin);
    url.searchParams.set("tab", "subscriptions");
    url.searchParams.set("plan_id", validPlanId);
    url.searchParams.set("cycle", cycle);

    const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//");
    return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return target;
  }
}
