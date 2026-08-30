/**
 * store-order-state-update
 * ------------------------
 * Server-gated merchant/admin lifecycle updates for store orders.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["confirm_payment", "reject_order", "assign_driver", "mark_delivered", "advance_status"]);
const ADVANCE_STATUSES = new Set(["confirmed", "picked_up", "delivered", "cancelled"]);

type Body = {
  action?: unknown;
  order_id?: unknown;
  store_id?: unknown;
  status?: unknown;
};

serve(withSecurity("store-order-state-update", async (req, ctx) => {
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
  const storeId = cleanUuid(body.store_id);
  const action = cleanAction(body.action);
  if (!orderId || !action) return json({ error: "Invalid order state request" }, 400);

  const { data: order, error: orderError } = await admin
    .from("store_orders")
    .select("id, store_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    console.error("[store-order-state-update:lookup]", orderError.message);
    return json({ error: "Could not verify order" }, 500);
  }
  if (!order) return json({ error: "Order not found" }, 404);
  if (storeId && storeId !== order.store_id) return json({ error: "Store mismatch" }, 400);

  const authorized = await canManageStore(admin, user.id, order.store_id);
  if (!authorized) return json({ error: "Not authorized for this store" }, 403);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (action === "confirm_payment") {
    update.status = "payment_confirmed";
    update.payment_confirmed_at = new Date().toISOString();
    update.confirmed_by = user.id;
  } else if (action === "reject_order") {
    update.status = "cancelled";
    update.cancelled_at = new Date().toISOString();
    update.cancel_reason = "Payment not verified";
  } else if (action === "assign_driver") {
    update.status = "assigned";
  } else if (action === "mark_delivered") {
    update.status = "delivered";
    update.delivered_at = new Date().toISOString();
  } else if (action === "advance_status") {
    const nextStatus = cleanAdvanceStatus(body.status);
    if (!nextStatus) return json({ error: "Invalid status" }, 400);
    update.status = nextStatus;
    if (nextStatus === "delivered") update.delivered_at = new Date().toISOString();
    if (nextStatus === "cancelled") update.cancelled_at = new Date().toISOString();
  }

  const { data, error } = await admin
    .from("store_orders")
    .update(update)
    .eq("id", orderId)
    .select("id, status, payment_confirmed_at, delivered_at, cancelled_at")
    .maybeSingle();
  if (error) {
    console.error("[store-order-state-update:update]", error.message);
    return json({ error: "Could not update order" }, 500);
  }
  return json({ ok: true, order: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[store-order-state-update:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-order-state-update:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanAdvanceStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ADVANCE_STATUSES.has(value) ? value : null;
}
