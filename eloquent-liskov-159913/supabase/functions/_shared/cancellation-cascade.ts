// Shared helper: notify the assigned driver and flip the unified
// service_orders + legacy jobs rows to 'cancelled' when a customer cancels.
// Used by cancel-eats-order, cancel-grocery-order, cancel-ride-request.

import { createClient } from "./deps.ts";

type Kind = "delivery" | "ride";

export async function cascadeCancellationToDriver(
  admin: ReturnType<typeof createClient>,
  externalOrderId: string,
  kind: Kind,
) {
  // Find the matching service_orders row via items.external_order_id, special_notes,
  // or external_order_id column if it exists.
  const { data: serviceRow } = await (admin as any)
    .from("service_orders")
    .select("id, driver_id, customer_id, status, kind")
    .or([
      `external_order_id.eq.${externalOrderId}`,
      `items->>external_order_id.eq.${externalOrderId}`,
    ].join(","))
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const driverId: string | null = (serviceRow as any)?.driver_id ?? null;
  const customerId: string | null = (serviceRow as any)?.customer_id ?? null;
  const serviceId: string | null = (serviceRow as any)?.id ?? null;
  const previousStatus: string | null = (serviceRow as any)?.status ?? null;

  // Flip service_orders if it exists and isn't already terminal.
  if (serviceId && previousStatus && !["cancelled", "completed"].includes(previousStatus)) {
    await (admin as any)
      .from("service_orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_source: "customer",
      } as any)
      .eq("id", serviceId);
  }

  // Cascade to legacy jobs row if any (older flow tags `notes` with the order id).
  const noteHints: Record<Kind, string> = {
    delivery: "Food order:",
    ride: "ride_request:",
  };
  await admin
    .from("jobs")
    .update({ status: "cancelled" } as any)
    .like("notes", `%${noteHints[kind]} ${externalOrderId}%`)
    .neq("status", "completed");

  // Push the assigned driver — they should stop driving toward this job.
  if (driverId) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      // Drivers live in zivodriver — its push function is `send-push`. Try
      // both that and the generic `send-push-notification` used by myzivo.
      const payload = {
        user_id: driverId,
        title: kind === "ride" ? "Ride cancelled" : "Order cancelled",
        body: kind === "ride"
          ? "The rider cancelled this trip. You're released."
          : "The customer cancelled this order. You don't need to deliver it.",
        data: {
          type: "service_cancelled",
          kind,
          external_order_id: externalOrderId,
          service_order_id: serviceId,
          action_url: "/driver/service-jobs",
        },
      };
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify(payload),
      }).catch(() => null);
      // Also fan out via the customer-side push function, in case the driver
      // user_id has tokens registered there.
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          user_id: driverId,
          notification_type: "service_cancelled",
          title: payload.title,
          body: payload.body,
          data: payload.data,
        }),
      }).catch(() => null);
    } catch (e) {
      console.warn("[cascadeCancellationToDriver] push failed", e);
    }
  }

  return { driverId, customerId, serviceId };
}
