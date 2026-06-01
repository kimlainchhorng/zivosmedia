/**
 * car-dealership-promotion-manage
 * -------------------------------
 * Server-gated owner/admin CRUD for dealership specials.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "delete"]);
const PROMO_TYPES = new Set(["discount", "financing", "lease", "trade_in_bonus", "event"]);
const DISCOUNT_TYPES = new Set(["percent", "flat"]);
const APPLIES_TO = new Set(["all", "new", "used", "certified", "specific_make", "specific_model"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  promotion_id?: unknown;
  promotion?: unknown;
};

serve(withSecurity("car-dealership-promotion-manage", async (req, ctx) => {
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
      .from("car_dealership_promotions")
      .delete()
      .eq("id", promotionId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-dealership-promotion-manage:delete]", error.message);
      return json({ error: "Could not delete promotion" }, 500);
    }
    return json({ ok: true, promotion_id: promotionId });
  }

  const promotion = cleanPromotion(body.promotion);
  if (!promotion.ok) return json({ error: promotion.error }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("car_dealership_promotions")
      .update(promotion.values)
      .eq("id", promotionId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-dealership-promotion-manage:update]", error.message);
      return json({ error: "Could not update promotion" }, 500);
    }
    return json({ ok: true, promotion: data });
  }

  const { data, error } = await admin
    .from("car_dealership_promotions")
    .insert({ ...promotion.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[car-dealership-promotion-manage:create]", error.message);
    return json({ error: error.message?.includes("unique") ? "Code already in use" : "Could not create promotion" }, 500);
  }
  return json({ ok: true, promotion: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-dealership-promotion-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-dealership-promotion-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getPromotionStoreId(admin: any, promotionId: string | null): Promise<string | null> {
  if (!promotionId) return null;
  const { data, error } = await admin
    .from("car_dealership_promotions")
    .select("store_id")
    .eq("id", promotionId)
    .maybeSingle();
  if (error) {
    console.error("[car-dealership-promotion-manage:promotion-store]", error.message);
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

  if ("title" in input) {
    const title = cleanText(input.title, 1, 160);
    if (!title) return { ok: false, error: "Promotion title is required" };
    values.title = title;
  }
  if ("description" in input) values.description = cleanText(input.description, 0, 1000);
  if ("promo_type" in input) {
    const promoType = cleanEnum(input.promo_type, PROMO_TYPES);
    if (!promoType) return { ok: false, error: "Invalid promotion type" };
    values.promo_type = promoType;
  }
  if ("discount_type" in input) {
    values.discount_type = input.discount_type == null ? null : cleanEnum(input.discount_type, DISCOUNT_TYPES);
    if (input.discount_type != null && !values.discount_type) return { ok: false, error: "Invalid discount type" };
  }
  if ("discount_amount" in input) {
    const max = (values.discount_type ?? input.discount_type) === "percent" ? 100 : 100000000;
    const amount = cleanInteger(input.discount_amount, 0, max);
    if (amount === null) return { ok: false, error: "Invalid discount amount" };
    values.discount_amount = amount;
  }
  if ("applies_to" in input) {
    const appliesTo = cleanEnum(input.applies_to, APPLIES_TO);
    if (!appliesTo) return { ok: false, error: "Invalid vehicle targeting" };
    values.applies_to = appliesTo;
  }
  if ("applies_to_make" in input) values.applies_to_make = cleanText(input.applies_to_make, 0, 80);
  if ("applies_to_model" in input) values.applies_to_model = cleanText(input.applies_to_model, 0, 80);
  if ("financing_apr_bps" in input) values.financing_apr_bps = cleanNullableInteger(input.financing_apr_bps, 0, 5000);
  if ("financing_term_months" in input) values.financing_term_months = cleanNullableInteger(input.financing_term_months, 1, 120);
  if ("code" in input) values.code = cleanCode(input.code);
  if ("starts_at" in input) values.starts_at = cleanNullableDate(input.starts_at);
  if ("ends_at" in input) values.ends_at = cleanNullableDate(input.ends_at);
  if ("is_active" in input) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };
    values.is_active = input.is_active;
  }
  if ("is_featured" in input) {
    if (typeof input.is_featured !== "boolean") return { ok: false, error: "Invalid featured status" };
    values.is_featured = input.is_featured;
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

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  return allowed.has(text) ? text : null;
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
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function cleanNullableInteger(value: unknown, min: number, max: number): number | null {
  if (value === null || value === "" || value === undefined) return null;
  return cleanInteger(value, min, max);
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
