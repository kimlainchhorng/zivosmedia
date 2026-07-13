/**
 * store-promotion-manage
 * ----------------------
 * Server-gated owner/admin CRUD for legacy store_promotions.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "set_active", "delete"]);
const DISCOUNT_TYPES = new Set(["percent", "amount"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  promotion_id?: unknown;
  promotion?: unknown;
  is_active?: unknown;
};

serve(withSecurity("store-promotion-manage", async (req, ctx) => {
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
  const storeId = action === "create"
    ? cleanUuid(body.store_id)
    : await getPromotionStoreId(admin, promotionId);
  if (!storeId) return json({ error: "Invalid store or promotion id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("store_promotions")
      .delete()
      .eq("id", promotionId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[store-promotion-manage:delete]", error.message);
      return json({ error: "Could not delete promotion" }, 500);
    }
    return json({ ok: true, promotion_id: promotionId });
  }

  if (action === "set_active") {
    if (typeof body.is_active !== "boolean") return json({ error: "Invalid active status" }, 400);
    const { data, error } = await admin
      .from("store_promotions")
      .update({ is_active: body.is_active })
      .eq("id", promotionId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[store-promotion-manage:set-active]", error.message);
      return json({ error: "Could not update promotion" }, 500);
    }
    return json({ ok: true, promotion: data });
  }

  const promotion = cleanPromotion(body.promotion);
  if (!promotion.ok) return json({ error: promotion.error }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("store_promotions")
      .update(promotion.values)
      .eq("id", promotionId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[store-promotion-manage:update]", error.message);
      return json({ error: "Could not update promotion" }, 500);
    }
    return json({ ok: true, promotion: data });
  }

  const { data, error } = await admin
    .from("store_promotions")
    .insert({ ...promotion.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[store-promotion-manage:create]", error.message);
    return json({ error: "Could not create promotion" }, 500);
  }
  return json({ ok: true, promotion: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (restaurantError) console.error("[store-promotion-manage:restaurant]", restaurantError.message);
  if (restaurant?.id) return true;

  const { data: storeProfile, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) console.error("[store-promotion-manage:store-profile]", storeError.message);
  if (storeProfile?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-promotion-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getPromotionStoreId(admin: any, promotionId: string | null): Promise<string | null> {
  if (!promotionId) return null;
  const { data, error } = await admin
    .from("store_promotions")
    .select("store_id")
    .eq("id", promotionId)
    .maybeSingle();
  if (error) {
    console.error("[store-promotion-manage:promotion-store]", error.message);
    return null;
  }
  return data?.store_id ?? null;
}

function cleanPromotion(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Promotion payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  const fallbackTitle = typeof input.description === "string" ? input.description : undefined;
  if ("title" in input || "description" in input) {
    const title = cleanText(input.title ?? fallbackTitle, 1, 160);
    if (!title) return { ok: false, error: "Promotion title is required" };
    values.title = title;
  }
  if ("promo_code" in input || "code" in input) values.promo_code = cleanCode(input.promo_code ?? input.code);
  if ("discount_type" in input) {
    const type = normalizeDiscountType(input.discount_type);
    if (!type) return { ok: false, error: "Invalid discount type" };
    values.discount_type = type;
  }
  if ("discount_value" in input) {
    const amount = cleanNumber(input.discount_value, 0, 1000000);
    if (amount === null) return { ok: false, error: "Invalid discount value" };
    values.discount_value = amount;
  }
  if ("start_date" in input || "starts_at" in input) values.start_date = cleanNullableDate(input.start_date ?? input.starts_at);
  if ("end_date" in input || "expires_at" in input || "ends_at" in input) {
    values.end_date = cleanNullableDate(input.end_date ?? input.expires_at ?? input.ends_at);
  }
  if ("is_active" in input) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };
    values.is_active = input.is_active;
  }

  if (!("title" in values) && Object.keys(values).length === 0) {
    return { ok: false, error: "No promotion changes supplied" };
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

function normalizeDiscountType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const type = value.trim().toLowerCase();
  if (type === "percentage") return "percent";
  if (type === "fixed") return "amount";
  return DISCOUNT_TYPES.has(type) ? type : null;
}

function cleanCode(value: unknown): string | null {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return code.length >= 1 && code.length <= 40 ? code : null;
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
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Math.round(number * 100) / 100;
}
