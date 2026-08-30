/**
 * shopping-order-state-update
 * ---------------------------
 * Server-gated lifecycle and rating updates for Grocery shopping orders.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DRIVER_STATUSES = new Set(["shopping", "shopping_complete", "picked_up", "delivered", "cancelled"]);

type Body = {
  action?: unknown;
  order_id?: unknown;
  status?: unknown;
  rating?: unknown;
};

serve(withSecurity("shopping-order-state-update", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const orderId = cleanUuid(body.order_id);
  if (!orderId) return json({ error: "Invalid order id" }, 400);

  if (body.action === "driver_accept") {
    const driver = await getDriver(admin, user.id);
    if (!driver?.id || driver.can_go_online === false) return json({ error: "Driver account unavailable" }, 403);

    const { data, error } = await admin
      .from("shopping_orders")
      .update({
        driver_id: driver.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "pending")
      .is("driver_id", null)
      .select("id, status, driver_id")
      .maybeSingle();

    if (error) {
      console.error("[shopping-order-state-update:accept]", error.message);
      return json({ error: "Could not accept order" }, 500);
    }
    if (!data) return json({ error: "Order not available" }, 409);
    return json({ ok: true, order: data });
  }

  if (body.action === "driver_status") {
    const nextStatus = cleanDriverStatus(body.status);
    if (!nextStatus) return json({ error: "Invalid status" }, 400);

    const driver = await getDriver(admin, user.id);
    if (!driver?.id) return json({ error: "Driver account required" }, 403);

    const update: Record<string, unknown> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    const tsField = timestampFieldFor(nextStatus);
    if (tsField) update[tsField] = new Date().toISOString();

    const { data, error } = await admin
      .from("shopping_orders")
      .update(update)
      .eq("id", orderId)
      .eq("driver_id", driver.id)
      .select("id, status, driver_id")
      .maybeSingle();

    if (error) {
      console.error("[shopping-order-state-update:driver-status]", error.message);
      return json({ error: "Could not update status" }, 500);
    }
    if (!data) return json({ error: "Assigned order not found" }, 404);
    return json({ ok: true, order: data });
  }

  if (body.action === "rate_order") {
    const rating = cleanRating(body.rating);
    if (rating === null) return json({ error: "Invalid rating" }, 400);

    const { data, error } = await admin
      .from("shopping_orders")
      .update({ rating, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .eq("status", "delivered")
      .select("id, rating")
      .maybeSingle();

    if (error) {
      console.error("[shopping-order-state-update:rating]", error.message);
      return json({ error: "Could not save rating" }, 500);
    }
    if (!data) return json({ error: "Delivered order not found" }, 404);
    return json({ ok: true, order: data });
  }

  if (body.action === "cancel_stale_pending_payment") {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("shopping_orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .eq("status", "pending_payment")
      .lt("placed_at", oneHourAgo)
      .select("id, status, cancelled_at")
      .maybeSingle();

    if (error) {
      console.error("[shopping-order-state-update:cancel-stale]", error.message);
      return json({ error: "Could not cancel stale order" }, 500);
    }
    if (!data) return json({ error: "Stale order not found" }, 404);
    return json({ ok: true, order: data });
  }

  return json({ error: "Invalid action" }, 400);
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function getDriver(admin: any, userId: string): Promise<any | null> {
  const { data, error } = await admin
    .from("drivers")
    .select("id, can_go_online")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[shopping-order-state-update:driver]", error.message);
    return null;
  }
  return data;
}

function timestampFieldFor(status: string): string | null {
  if (status === "shopping") return "shopping_started_at";
  if (status === "shopping_complete") return "shopping_completed_at";
  if (status === "picked_up") return "picked_up_at";
  if (status === "delivered") return "delivered_at";
  if (status === "cancelled") return "cancelled_at";
  return null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanDriverStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return DRIVER_STATUSES.has(value) ? value : null;
}

function cleanRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > 5) return null;
  return value;
}
