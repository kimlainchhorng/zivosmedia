/**
 * salon-booking-retail-manage
 * ---------------------------
 * Owner/admin mutation gate for retail line items attached to a salon booking.
 * Completed bookings keep the existing delete+insert replacement behavior so
 * stock-sync triggers restore/decrement inventory correctly.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["add_product", "set_item_quantity", "remove_item"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  booking_id?: unknown;
  product_id?: unknown;
  item_id?: unknown;
  quantity?: unknown;
};

type BookingRow = {
  id: string;
  store_id: string;
  status: string;
};

type RetailItem = {
  id: string;
  booking_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

serve(withSecurity("salon-booking-retail-manage", async (req, ctx) => {
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
  const action = cleanAction(body.action);
  const storeId = cleanUuid(body.store_id);
  const bookingId = cleanUuid(body.booking_id);
  if (!action) return json({ error: "Invalid retail action" }, 400);
  if (!storeId || !bookingId) return json({ error: "Invalid store or booking id" }, 400);

  const booking = await getBooking(admin, bookingId, storeId);
  if (!booking.ok) return json({ error: booking.error }, booking.status);
  if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "add_product") {
    const productId = cleanUuid(body.product_id);
    if (!productId) return json({ error: "Invalid product id" }, 400);

    const product = await getProduct(admin, productId, storeId);
    if (!product.ok) return json({ error: product.error }, product.status);

    const { data: existing, error: existingError } = await admin
      .from("salon_booking_retail_items")
      .select("id, booking_id, product_id, product_name, unit_price_cents, quantity")
      .eq("booking_id", bookingId)
      .eq("product_id", productId)
      .maybeSingle();
    if (existingError) {
      console.error("[salon-booking-retail-manage:existing]", existingError.message);
      return json({ error: "Could not verify retail item" }, 500);
    }

    if (existing) {
      const nextQuantity = Math.min(99, Number(existing.quantity ?? 0) + 1);
      const result = await replaceOrUpdateItem(admin, booking.data, existing as RetailItem, nextQuantity);
      if (!result.ok) return json({ error: result.error }, result.status);
    } else {
      const insert = await insertItem(admin, bookingId, {
        product_id: productId,
        product_name: product.data.name,
        unit_price_cents: product.data.price_cents,
        quantity: 1,
      });
      if (!insert.ok) return json({ error: insert.error }, insert.status);
    }
  } else {
    const itemId = cleanUuid(body.item_id);
    if (!itemId) return json({ error: "Invalid retail item id" }, 400);

    const item = await getItem(admin, itemId, bookingId);
    if (!item.ok) return json({ error: item.error }, item.status);

    if (action === "remove_item") {
      const deleted = await deleteItem(admin, item.data.id);
      if (!deleted.ok) return json({ error: deleted.error }, deleted.status);
    } else {
      const quantity = cleanQuantity(body.quantity);
      if (quantity === null) return json({ error: "Invalid quantity" }, 400);
      if (quantity === 0) {
        const deleted = await deleteItem(admin, item.data.id);
        if (!deleted.ok) return json({ error: deleted.error }, deleted.status);
      } else {
        const result = await replaceOrUpdateItem(admin, booking.data, item.data, quantity);
        if (!result.ok) return json({ error: result.error }, result.status);
      }
    }
  }

  const items = await listItems(admin, bookingId);
  if (!items.ok) return json({ error: items.error }, items.status);
  return json({ ok: true, items: items.data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-booking-retail-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-booking-retail-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getBooking(admin: any, bookingId: string, storeId: string):
  Promise<{ ok: true; data: BookingRow } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_bookings")
    .select("id, store_id, status")
    .eq("id", bookingId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[salon-booking-retail-manage:booking]", error.message);
    return { ok: false, error: "Could not verify booking", status: 500 };
  }
  if (!data) return { ok: false, error: "Booking not found", status: 404 };
  return { ok: true, data: data as BookingRow };
}

async function getProduct(admin: any, productId: string, storeId: string):
  Promise<{ ok: true; data: { id: string; name: string; price_cents: number } } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_retail_products")
    .select("id, name, price_cents, is_active")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[salon-booking-retail-manage:product]", error.message);
    return { ok: false, error: "Could not verify product", status: 500 };
  }
  if (!data || !data.is_active) return { ok: false, error: "Product not found", status: 404 };
  return { ok: true, data: { id: data.id, name: data.name, price_cents: data.price_cents } };
}

async function getItem(admin: any, itemId: string, bookingId: string):
  Promise<{ ok: true; data: RetailItem } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_booking_retail_items")
    .select("id, booking_id, product_id, product_name, unit_price_cents, quantity")
    .eq("id", itemId)
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error) {
    console.error("[salon-booking-retail-manage:item]", error.message);
    return { ok: false, error: "Could not verify retail item", status: 500 };
  }
  if (!data) return { ok: false, error: "Retail item not found", status: 404 };
  return { ok: true, data: data as RetailItem };
}

async function replaceOrUpdateItem(admin: any, booking: BookingRow, item: RetailItem, quantity: number):
  Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (booking.status === "completed") {
    const deleted = await deleteItem(admin, item.id);
    if (!deleted.ok) return deleted;
    return insertItem(admin, booking.id, {
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price_cents: item.unit_price_cents,
      quantity,
    });
  }

  const { error } = await admin
    .from("salon_booking_retail_items")
    .update({ quantity })
    .eq("id", item.id)
    .eq("booking_id", booking.id);
  if (error) {
    console.error("[salon-booking-retail-manage:update]", error.message);
    return { ok: false, error: "Could not update retail item", status: 500 };
  }
  return { ok: true };
}

async function insertItem(admin: any, bookingId: string, values: {
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { error } = await admin
    .from("salon_booking_retail_items")
    .insert({ booking_id: bookingId, ...values });
  if (error) {
    console.error("[salon-booking-retail-manage:insert]", error.message);
    return { ok: false, error: "Could not add retail item", status: 500 };
  }
  return { ok: true };
}

async function deleteItem(admin: any, itemId: string):
  Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { error } = await admin
    .from("salon_booking_retail_items")
    .delete()
    .eq("id", itemId);
  if (error) {
    console.error("[salon-booking-retail-manage:delete]", error.message);
    return { ok: false, error: "Could not remove retail item", status: 500 };
  }
  return { ok: true };
}

async function listItems(admin: any, bookingId: string):
  Promise<{ ok: true; data: RetailItem[] } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_booking_retail_items")
    .select("id, booking_id, product_id, product_name, unit_price_cents, quantity")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[salon-booking-retail-manage:list]", error.message);
    return { ok: false, error: "Could not load retail items", status: 500 };
  }
  return { ok: true, data: (data ?? []) as RetailItem[] };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanQuantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > 99) return null;
  return value;
}
