/**
 * eats-order-state-update
 * -----------------------
 * Server-gated driver lifecycle and customer rating updates for Eats orders.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DRIVER_STATUS_TO_ORDER_STATUS: Record<string, string> = {
  assigned: "confirmed",
  en_route_pickup: "preparing",
  arrived_pickup: "ready",
  en_route_dropoff: "out_for_delivery",
  completed: "delivered",
};

type Body = {
  action?: unknown;
  order_id?: unknown;
  job_status?: unknown;
  order_status?: unknown;
  rating?: unknown;
};

serve(
  withSecurity(
    "eats-order-state-update",
    async (req, ctx) => {
      const corsHeaders = ctx.corsHeaders;
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      if (req.method !== "POST")
        return json({ error: "Method not allowed" }, 405);

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const token = req.headers
        .get("Authorization")
        ?.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      }) as any;
      const { data: authData } = await admin.auth.getUser(token);
      const user = authData.user;
      if (!user) return json({ error: "Unauthorized" }, 401);

      const body = (await req.json().catch(() => ({}))) as Body;
      const orderId = cleanUuid(body.order_id);
      if (!orderId) return json({ error: "Invalid order id" }, 400);

      if (body.action === "restaurant_status") {
        const orderStatus = cleanRestaurantStatus(body.order_status);
        if (!orderStatus)
          return json({ error: "Invalid restaurant status" }, 400);

        const { data, error } = await admin.rpc(
          "advance_eats_restaurant_order",
          {
            p_order_id: orderId,
            p_restaurant_owner_id: user.id,
            p_requested_status: orderStatus,
          },
        );
        if (error) {
          console.error(
            "[eats-order-state-update:restaurant-status]",
            error.message,
          );
          return json(
            { error: "Could not update order status", retryable: true },
            503,
          );
        }
        if (!data?.ok) {
          const code = String(data?.code || "restaurant_transition_rejected");
          const status = code.endsWith("not_found") ? 404 : 409;
          return json({ error: code }, status);
        }
        return json({ ok: true, order: data });
      }

      if (body.action === "driver_status") {
        const jobStatus = cleanDriverStatus(body.job_status);
        if (!jobStatus) return json({ error: "Invalid driver status" }, 400);

        const { data: driver, error: driverError } = await admin
          .from("drivers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (driverError) {
          console.error(
            "[eats-order-state-update:driver]",
            driverError.message,
          );
          return json({ error: "Could not verify driver" }, 500);
        }
        if (!driver?.id) return json({ error: "Driver account required" }, 403);

        const { data, error } = await admin.rpc("advance_eats_delivery_job", {
          p_order_id: orderId,
          p_driver_user_id: user.id,
          p_job_status: jobStatus,
        });
        if (error) {
          console.error(
            "[eats-order-state-update:driver-status]",
            error.message,
          );
          return json(
            { error: "Could not update order status", retryable: true },
            503,
          );
        }
        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.ok) {
          const code = String(result?.code ?? "driver_transition_rejected");
          const status =
            code === "driver_not_found" || code === "driver_not_assigned"
              ? 403
              : 409;
          return json({ error: code }, status);
        }
        return json({ ok: true, order: result });
      }

      if (body.action === "rate_order") {
        const rating = cleanRating(body.rating);
        if (rating === null) return json({ error: "Invalid rating" }, 400);

        const { data, error } = await admin
          .from("food_orders")
          .update({ rating, updated_at: new Date().toISOString() })
          .eq("id", orderId)
          .eq("customer_id", user.id)
          .eq("status", "delivered")
          .select("id, rating")
          .maybeSingle();

        if (error) {
          console.error("[eats-order-state-update:rating]", error.message);
          return json({ error: "Could not save rating" }, 500);
        }
        if (!data) return json({ error: "Delivered order not found" }, 404);
        return json({ ok: true, order: data });
      }

      return json({ error: "Invalid action" }, 400);
    },
    {
      allowedMethods: ["POST"],
      strictCors: true,
      rateLimit: "api_general",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanDriverStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return Object.prototype.hasOwnProperty.call(
    DRIVER_STATUS_TO_ORDER_STATUS,
    value,
  )
    ? value
    : null;
}

function cleanRestaurantStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ["confirmed", "preparing", "ready"].includes(value) ? value : null;
}

function cleanRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > 5) return null;
  return value;
}
