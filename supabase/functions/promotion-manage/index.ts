/**
 * promotion-manage
 * ----------------
 * Server-gated merchant/admin mutations for general shop promotions.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "set_active", "delete"]);
const DISCOUNT_TYPES = new Set(["percentage", "fixed", "free_delivery"]);

type Body = {
  action?: unknown;
  merchant_id?: unknown;
  promotion_id?: unknown;
  promotion?: unknown;
  is_active?: unknown;
};

serve(withSecurity("promotion-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid promotion action" }, 400);

  const promotionId = cleanUuid(body.promotion_id);
  const merchantId = cleanUuid(body.merchant_id);

  const targetMerchantId = action === "create"
    ? merchantId
    : await getPromotionMerchantId(admin, promotionId);
  if (!targetMerchantId) return json({ error: "Invalid merchant or promotion id" }, 400);

  if (!await canManageMerchant(admin, user.id, targetMerchantId)) {
    return json({ error: "Not authorized for this merchant" }, 403);
  }

  const selectColumns = "id, code, name, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, usage_count, per_user_limit, starts_at, ends_at, is_active, created_at";

  if (action === "delete") {
    const { error } = await admin
      .from("promotions")
      .delete()
      .eq("id", promotionId)
      .eq("merchant_id", targetMerchantId);
    if (error) {
      console.error("[promotion-manage:delete]", error.message);
      return json({ error: "Could not delete promotion" }, 500);
    }
    return json({ ok: true, promotion_id: promotionId });
  }

  if (action === "set_active") {
    if (typeof body.is_active !== "boolean") return json({ error: "Invalid promotion status" }, 400);
    const { data, error } = await admin
      .from("promotions")
      .update({ is_active: body.is_active })
      .eq("id", promotionId)
      .eq("merchant_id", targetMerchantId)
      .select(selectColumns)
      .single();
    if (error) {
      console.error("[promotion-manage:set-active]", error.message);
      return json({ error: "Could not update promotion status" }, 500);
    }
    return json({ ok: true, promotion: data });
  }

  const promotion = cleanPromotion(body.promotion);
  if (!promotion.ok) return json({ error: promotion.error }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("promotions")
      .update(promotion.values)
      .eq("id", promotionId)
      .eq("merchant_id", targetMerchantId)
      .select(selectColumns)
      .single();
    if (error) {
      console.error("[promotion-manage:update]", error.message);
      return json({ error: "Could not update promotion" }, 500);
    }
    return json({ ok: true, promotion: data });
  }

  const { data, error } = await admin
    .from("promotions")
    .insert({ ...promotion.values, merchant_id: targetMerchantId, created_by: user.id })
    .select(selectColumns)
    .single();
  if (error) {
    console.error("[promotion-manage:create]", error.message);
    return json({ error: "Could not create promotion" }, 500);
  }
  return json({ ok: true, promotion: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageMerchant(admin: any, userId: string, merchantId: string): Promise<boolean> {
  const { data: storeProfile, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", merchantId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) console.error("[promotion-manage:store-profile]", storeError.message);
  if (storeProfile?.id) return true;

  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .select("id")
    .eq("id", merchantId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (restaurantError) console.error("[promotion-manage:restaurant]", restaurantError.message);
  if (restaurant?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[promotion-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getPromotionMerchantId(admin: any, promotionId: string | null): Promise<string | null> {
  if (!promotionId) return null;
  const { data, error } = await admin
    .from("promotions")
    .select("merchant_id")
    .eq("id", promotionId)
    .maybeSingle();
  if (error) {
    console.error("[promotion-manage:promotion-merchant]", error.message);
    return null;
  }
  return data?.merchant_id ?? null;
}

function cleanPromotion(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Promotion payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  const code = cleanCode(input.code);
  if (!code) return { ok: false, error: "Promotion code is required" };
  values.code = code;

  const name = cleanText(input.name, 1, 160);
  if (!name) return { ok: false, error: "Promotion name is required" };
  values.name = name;

  if ("description" in input) values.description = cleanText(input.description, 0, 500);

  const discountType = cleanDiscountType(input.discount_type);
  if (!discountType) return { ok: false, error: "Invalid discount type" };
  values.discount_type = discountType;

  const discountValue = discountType === "free_delivery"
    ? 0
    : cleanNumber(input.discount_value, 0.01, 100000, 2);
  if (discountValue === null) return { ok: false, error: "Invalid discount value" };
  values.discount_value = discountValue;

  if ("min_order_amount" in input) values.min_order_amount = cleanNullableNumber(input.min_order_amount, 0, 100000, 2);
  if ("max_discount" in input) values.max_discount = cleanNullableNumber(input.max_discount, 0, 100000, 2);
  if ("usage_limit" in input) values.usage_limit = cleanNullableInteger(input.usage_limit, 1, 1000000);
  if ("per_user_limit" in input) values.per_user_limit = cleanNullableInteger(input.per_user_limit, 1, 1000);
  if ("starts_at" in input) values.starts_at = cleanNullableDate(input.starts_at);
  if ("ends_at" in input) values.ends_at = cleanNullableDate(input.ends_at);
  if ("is_active" in input) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };
    values.is_active = input.is_active;
  }

  return { ok: true, values };
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

function cleanCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return code.length >= 3 && code.length <= 40 ? code : null;
}

function cleanDiscountType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const type = value.trim().toLowerCase();
  return DISCOUNT_TYPES.has(type) ? type : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNullableDate(value: unknown): string | null {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function cleanNullableInteger(value: unknown, min: number, max: number): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function cleanNullableNumber(value: unknown, min: number, max: number, decimals: number): number | null {
  if (value === null || value === "" || value === undefined) return null;
  return cleanNumber(value, min, max, decimals);
}

function cleanNumber(value: unknown, min: number, max: number, decimals: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  const factor = 10 ** decimals;
  return Math.round(number * factor) / factor;
}
