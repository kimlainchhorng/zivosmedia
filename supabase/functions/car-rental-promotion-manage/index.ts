/**
 * car-rental-promotion-manage
 * ---------------------------
 * Server-gated owner/admin CRUD for car-rental promo codes.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "delete"]);
const KINDS = new Set(["percent", "flat"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  promotion_id?: unknown;
  promotion?: unknown;
};

serve(withSecurity("car-rental-promotion-manage", async (req, ctx) => {
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
      .from("car_rental_promotions")
      .delete()
      .eq("id", promotionId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-rental-promotion-manage:delete]", error.message);
      return json({ error: "Could not delete promotion" }, 500);
    }
    return json({ ok: true, promotion_id: promotionId });
  }

  const promotion = cleanPromotion(body.promotion);
  if (!promotion.ok) return json({ error: promotion.error }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("car_rental_promotions")
      .update(promotion.values)
      .eq("id", promotionId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-rental-promotion-manage:update]", error.message);
      return json({ error: "Could not update promotion" }, 500);
    }
    return json({ ok: true, promotion: data });
  }

  const { data, error } = await admin
    .from("car_rental_promotions")
    .insert({ ...promotion.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[car-rental-promotion-manage:create]", error.message);
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
    console.error("[car-rental-promotion-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-rental-promotion-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getPromotionStoreId(admin: any, promotionId: string | null): Promise<string | null> {
  if (!promotionId) return null;
  const { data, error } = await admin
    .from("car_rental_promotions")
    .select("store_id")
    .eq("id", promotionId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-promotion-manage:promotion-store]", error.message);
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

  if ("code" in input) {
    const code = cleanCode(input.code);
    if (!code) return { ok: false, error: "Promotion code is required" };
    values.code = code;
  }
  if ("description" in input) values.description = cleanText(input.description, 0, 500);
  if ("kind" in input) {
    const kind = cleanKind(input.kind);
    if (!kind) return { ok: false, error: "Invalid promotion kind" };
    values.kind = kind;
  }
  const kind = (values.kind ?? input.kind) as unknown;
  if ("amount" in input) {
    const amount = cleanInteger(input.amount, 1, kind === "percent" ? 100 : 100000000);
    if (amount === null) return { ok: false, error: "Invalid promotion amount" };
    values.amount = amount;
  }
  if ("min_rental_days" in input) {
    const days = cleanInteger(input.min_rental_days, 1, 365);
    if (days === null) return { ok: false, error: "Invalid minimum rental days" };
    values.min_rental_days = days;
  }
  if ("min_amount_cents" in input) {
    const cents = cleanInteger(input.min_amount_cents, 0, 100000000);
    if (cents === null) return { ok: false, error: "Invalid minimum amount" };
    values.min_amount_cents = cents;
  }
  if ("max_redemptions" in input) values.max_redemptions = cleanNullableInteger(input.max_redemptions, 1, 1000000);
  if ("max_per_customer" in input) values.max_per_customer = cleanNullableInteger(input.max_per_customer, 1, 1000);
  if ("starts_at" in input) values.starts_at = cleanNullableDate(input.starts_at);
  if ("ends_at" in input) values.ends_at = cleanNullableDate(input.ends_at);
  if ("is_active" in input) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };
    values.is_active = input.is_active;
  }

  if (!("code" in values) && Object.keys(values).length === 0) {
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

function cleanKind(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const kind = value.trim().toLowerCase();
  return KINDS.has(kind) ? kind : null;
}

function cleanCode(value: unknown): string | null {
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
