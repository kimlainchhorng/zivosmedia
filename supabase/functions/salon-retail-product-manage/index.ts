/**
 * salon-retail-product-manage
 * ---------------------------
 * Owner/admin mutation gate for salon retail inventory. Public active-product
 * reads stay RLS-backed; all stock and catalog writes are validated here.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["save", "adjust_stock", "delete"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  product_id?: unknown;
  product?: unknown;
  stock_quantity?: unknown;
};

serve(withSecurity("salon-retail-product-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid retail product action" }, 400);

  if (action === "save") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const product = cleanProduct(body.product);
    if (!product.ok) return json({ error: product.error }, 400);

    const productId = cleanOptionalUuid(body.product_id);
    const query = productId
      ? admin.from("salon_retail_products").update(product.values).eq("id", productId).eq("store_id", storeId)
      : admin.from("salon_retail_products").insert({ ...product.values, store_id: storeId });

    const { data, error } = await query.select("*").single();
    if (error) {
      if ((error as any).code === "23505") return json({ error: "Another product already uses that SKU" }, 409);
      console.error("[salon-retail-product-manage:save]", error.message);
      return json({ error: "Could not save product" }, 500);
    }
    return json({ ok: true, product: data });
  }

  const productId = cleanUuid(body.product_id);
  if (!productId) return json({ error: "Invalid product id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("salon_retail_products")
    .select("id, store_id")
    .eq("id", productId)
    .maybeSingle();
  if (lookupError) {
    console.error("[salon-retail-product-manage:lookup]", lookupError.message);
    return json({ error: "Could not verify product" }, 500);
  }
  if (!existing) return json({ error: "Product not found" }, 404);
  if (!await canManageStore(admin, user.id, existing.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "adjust_stock") {
    const stockQuantity = cleanInteger(body.stock_quantity, 0, 1_000_000);
    if (stockQuantity === null) return json({ error: "Invalid stock quantity" }, 400);
    const { data, error } = await admin
      .from("salon_retail_products")
      .update({ stock_quantity: stockQuantity })
      .eq("id", existing.id)
      .eq("store_id", existing.store_id)
      .select("*")
      .single();
    if (error) {
      console.error("[salon-retail-product-manage:adjust-stock]", error.message);
      return json({ error: "Could not adjust stock" }, 500);
    }
    return json({ ok: true, product: data });
  }

  const { error } = await admin
    .from("salon_retail_products")
    .delete()
    .eq("id", existing.id)
    .eq("store_id", existing.store_id);
  if (error) {
    console.error("[salon-retail-product-manage:delete]", error.message);
    return json({ error: "Could not delete product" }, 500);
  }
  return json({ ok: true, product_id: existing.id });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-retail-product-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-retail-product-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanProduct(value: unknown):
  | { ok: true; values: Record<string, string | number | boolean | null> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Product payload is required" };
  }
  const input = value as Record<string, unknown>;
  const name = cleanText(input.name, 1, 120);
  if (!name) return { ok: false, error: "Name is required" };

  const priceCents = cleanInteger(input.price_cents, 0, 10_000_000);
  const costCents = cleanInteger(input.cost_cents, 0, 10_000_000);
  const stockQuantity = cleanInteger(input.stock_quantity, 0, 1_000_000);
  const lowStockThreshold = cleanInteger(input.low_stock_threshold, 0, 1_000_000);
  if (priceCents === null || costCents === null || stockQuantity === null || lowStockThreshold === null) {
    return { ok: false, error: "Invalid product numbers" };
  }

  return {
    ok: true,
    values: {
      name,
      description: cleanNullableText(input.description, 500),
      sku: cleanNullableText(input.sku, 40),
      brand: cleanNullableText(input.brand, 60),
      price_cents: priceCents,
      cost_cents: costCents,
      stock_quantity: stockQuantity,
      low_stock_threshold: lowStockThreshold,
      is_active: typeof input.is_active === "boolean" ? input.is_active : true,
    },
  };
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

function cleanOptionalUuid(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return cleanUuid(value);
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > maxLength ? null : text || null;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
