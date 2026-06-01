/**
 * cafe-promotion-manage
 * ---------------------
 * Server-gated owner/admin CRUD for cafe checkout promotions.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "delete"]);
const KINDS = new Set(["percent", "fixed_cents"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  promotion_id?: unknown;
  promotion?: unknown;
};

serve(withSecurity("cafe-promotion-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid cafe promotion action" }, 400);

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
      .from("cafe_promotions")
      .delete()
      .eq("id", promotionId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[cafe-promotion-manage:delete]", error.message);
      return json({ error: "Could not delete promotion" }, 500);
    }
    return json({ ok: true, promotion_id: promotionId });
  }

  const promotion = cleanPromotion(body.promotion);
  if (!promotion.ok) return json({ error: promotion.error }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("cafe_promotions")
      .update(promotion.values)
      .eq("id", promotionId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[cafe-promotion-manage:update]", error.message);
      return json({ error: "Could not update promotion" }, 500);
    }
    return json({ ok: true, promotion: data });
  }

  const { data, error } = await admin
    .from("cafe_promotions")
    .insert({ ...promotion.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[cafe-promotion-manage:create]", error.message);
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
    console.error("[cafe-promotion-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[cafe-promotion-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getPromotionStoreId(admin: any, promotionId: string | null): Promise<string | null> {
  if (!promotionId) return null;
  const { data, error } = await admin
    .from("cafe_promotions")
    .select("store_id")
    .eq("id", promotionId)
    .maybeSingle();
  if (error) {
    console.error("[cafe-promotion-manage:promotion-store]", error.message);
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

  if ("name" in input) {
    const name = cleanText(input.name, 1, 80);
    if (!name) return { ok: false, error: "Promotion name is required" };
    values.name = name;
  }
  if ("description" in input) values.description = cleanText(input.description, 0, 500);
  if ("kind" in input) {
    const kind = cleanKind(input.kind);
    if (!kind) return { ok: false, error: "Invalid promotion kind" };
    values.kind = kind;
  }
  const kind = (values.kind ?? input.kind) as unknown;
  if ("amount" in input) {
    const amount = cleanInteger(input.amount, 1, kind === "percent" ? 100 : 1000000);
    if (amount === null) return { ok: false, error: "Invalid promotion amount" };
    values.amount = amount;
  }
  if ("code" in input) values.code = cleanCode(input.code);
  if ("start_at" in input) values.start_at = cleanNullableDate(input.start_at);
  if ("end_at" in input) values.end_at = cleanNullableDate(input.end_at);
  if ("weekdays" in input) {
    const weekdays = cleanWeekdays(input.weekdays);
    if (!weekdays) return { ok: false, error: "Invalid weekdays" };
    values.weekdays = weekdays;
  }
  if ("hour_start" in input) values.hour_start = cleanNullableInteger(input.hour_start, 0, 23);
  if ("hour_end" in input) values.hour_end = cleanNullableInteger(input.hour_end, 0, 23);
  if ("min_subtotal_cents" in input) {
    const minSubtotal = cleanInteger(input.min_subtotal_cents, 0, 100000000);
    if (minSubtotal === null) return { ok: false, error: "Invalid minimum subtotal" };
    values.min_subtotal_cents = minSubtotal;
  }
  if ("max_redemptions" in input) values.max_redemptions = cleanNullableInteger(input.max_redemptions, 1, 1000000);
  if ("is_active" in input) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };
    values.is_active = input.is_active;
  }
  if ("sort_order" in input) {
    const sortOrder = cleanInteger(input.sort_order, -1000000, 1000000);
    if (sortOrder === null) return { ok: false, error: "Invalid sort order" };
    values.sort_order = sortOrder;
  }

  if (!("name" in values) && !("is_active" in values) && Object.keys(values).length === 0) {
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
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return code.length >= 2 && code.length <= 40 ? code : null;
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

function cleanWeekdays(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length > 7) return null;
  const seen = new Set<number>();
  for (const item of value) {
    const day = cleanInteger(item, 0, 6);
    if (day === null) return null;
    seen.add(day);
  }
  return Array.from(seen).sort();
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
