/**
 * store-product-manage
 * --------------------
 * Server-gated merchant/admin mutations for store catalog products.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "toggle_stock", "delete"]);
const DISCOUNT_TYPES = new Set(["percentage", "fixed", "bogo"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  product_id?: unknown;
  product?: unknown;
  in_stock?: unknown;
};

serve(withSecurity("store-product-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid product action" }, 400);

  if (action === "create") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const product = cleanProduct(body.product, "create");
    if (!product.ok) return json({ error: product.error }, 400);

    const { data, error } = await admin
      .from("store_products")
      .insert({ ...product.values, store_id: storeId })
      .select()
      .single();
    if (error) {
      console.error("[store-product-manage:create]", error.message);
      return json({ error: "Could not create product" }, 500);
    }
    return json({ ok: true, product: data });
  }

  const productId = cleanUuid(body.product_id);
  if (!productId) return json({ error: "Invalid product id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("store_products")
    .select("id, store_id, in_stock")
    .eq("id", productId)
    .maybeSingle();
  if (lookupError) {
    console.error("[store-product-manage:lookup]", lookupError.message);
    return json({ error: "Could not verify product" }, 500);
  }
  if (!existing) return json({ error: "Product not found" }, 404);
  if (!await canManageStore(admin, user.id, existing.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "update") {
    const product = cleanProduct(body.product, "update");
    if (!product.ok) return json({ error: product.error }, 400);

    const { data, error } = await admin
      .from("store_products")
      .update(product.values)
      .eq("id", productId)
      .select()
      .single();
    if (error) {
      console.error("[store-product-manage:update]", error.message);
      return json({ error: "Could not update product" }, 500);
    }
    return json({ ok: true, product: data });
  }

  if (action === "toggle_stock") {
    const nextStock = typeof body.in_stock === "boolean" ? body.in_stock : !existing.in_stock;
    const { data, error } = await admin
      .from("store_products")
      .update({ in_stock: nextStock })
      .eq("id", productId)
      .select("id, in_stock")
      .single();
    if (error) {
      console.error("[store-product-manage:toggle-stock]", error.message);
      return json({ error: "Could not update stock status" }, 500);
    }
    return json({ ok: true, product: data });
  }

  const { error } = await admin
    .from("store_products")
    .delete()
    .eq("id", productId);
  if (error) {
    console.error("[store-product-manage:delete]", error.message);
    return json({ error: "Could not delete product" }, 500);
  }
  return json({ ok: true, product_id: productId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[store-product-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-product-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanProduct(value: unknown, mode: "create" | "update"):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Product payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  const name = cleanText(input.name, mode === "create" ? 1 : 0, 160);
  if (mode === "create" && !name) return { ok: false, error: "Product name is required" };
  if (name !== undefined) values.name = name;

  const price = cleanNumber(input.price, 0, 999999.99);
  if (mode === "create" && price == null) return { ok: false, error: "Product price is required" };
  if (price != null) values.price = price;

  for (const [field, max] of [
    ["description", 4000],
    ["image_url", 1000],
    ["category", 120],
    ["brand", 120],
    ["sku", 120],
    ["unit", 80],
    ["badge", 80],
  ] as const) {
    if (field in input) values[field] = cleanText(input[field], 0, max);
  }

  for (const field of ["price_khr", "sort_order", "buy_quantity", "get_quantity", "discount_price_khr"] as const) {
    if (field in input) values[field] = cleanInteger(input[field], field === "sort_order" ? -999999 : 0, 999999999);
  }

  if ("discount_value" in input) values.discount_value = cleanNumber(input.discount_value, 0, 999999.99);
  if ("discount_type" in input) values.discount_type = cleanDiscountType(input.discount_type);
  if ("discount_expires_at" in input) values.discount_expires_at = cleanDate(input.discount_expires_at);
  if ("in_stock" in input) values.in_stock = input.in_stock !== false;
  if ("image_urls" in input) values.image_urls = cleanStringArray(input.image_urls, 20, 1000);
  if ("size_variants" in input) values.size_variants = Array.isArray(input.size_variants) ? input.size_variants.slice(0, 50) : [];

  return { ok: true, values };
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

function cleanText(value: unknown, minLength: number, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Math.round(number * 100) / 100;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function cleanDiscountType(value: unknown): string | null {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return null;
  return DISCOUNT_TYPES.has(value) ? value : null;
}

function cleanDate(value: unknown): string | null {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= maxLength)
    .slice(0, maxItems);
}
