/**
 * car-dealership-trade-in-manage
 * ------------------------------
 * Server-gated owner/admin CRUD for dealership trade-in appraisals.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "delete"]);
const CONDITIONS = new Set(["excellent", "good", "fair", "poor", "salvage"]);
const STATUSES = new Set(["appraised", "offered", "accepted", "declined", "completed"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  trade_in_id?: unknown;
  trade_in?: unknown;
};

serve(withSecurity("car-dealership-trade-in-manage", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

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
  if (!action) return json({ error: "Invalid trade-in action" }, 400);

  const tradeInId = cleanUuid(body.trade_in_id);
  const existing = action === "create" ? null : await getTradeIn(admin, tradeInId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or trade-in id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_dealership_trade_ins")
      .delete()
      .eq("id", tradeInId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-dealership-trade-in-manage:delete]", error.message);
      return json({ error: "Could not delete trade-in" }, 500);
    }
    return json({ ok: true, trade_in_id: tradeInId });
  }

  const tradeIn = cleanTradeIn(body.trade_in, action);
  if (!tradeIn.ok) return json({ error: tradeIn.error }, 400);

  const relationError = await validateRelations(admin, tradeIn.values, storeId);
  if (relationError) return json({ error: relationError }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("car_dealership_trade_ins")
      .update(tradeIn.values)
      .eq("id", tradeInId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-dealership-trade-in-manage:update]", error.message);
      return json({ error: "Could not update trade-in" }, 500);
    }
    return json({ ok: true, trade_in: data });
  }

  const { data, error } = await admin
    .from("car_dealership_trade_ins")
    .insert({ ...tradeIn.values, store_id: storeId, appraiser_user_id: user.id })
    .select("*")
    .single();
  if (error) {
    console.error("[car-dealership-trade-in-manage:create]", error.message);
    return json({ error: "Could not create trade-in" }, 500);
  }
  return json({ ok: true, trade_in: data });
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-dealership-trade-in-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-dealership-trade-in-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getTradeIn(admin: any, tradeInId: string | null): Promise<{ store_id: string } | null> {
  if (!tradeInId) return null;
  const { data, error } = await admin
    .from("car_dealership_trade_ins")
    .select("store_id")
    .eq("id", tradeInId)
    .maybeSingle();
  if (error) {
    console.error("[car-dealership-trade-in-manage:trade-in-store]", error.message);
    return null;
  }
  return data ?? null;
}

async function validateRelations(admin: any, values: Record<string, unknown>, storeId: string): Promise<string | null> {
  const checks: Array<[string, string, string]> = [
    ["sale_id", "car_dealership_sales", "Invalid sale for this store"],
    ["customer_id", "car_dealership_customers", "Invalid customer for this store"],
  ];
  for (const [key, table, message] of checks) {
    const id = values[key];
    if (id === null || id === undefined) continue;
    const { data, error } = await admin
      .from(table)
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) {
      console.error(`[car-dealership-trade-in-manage:${key}]`, error.message);
      return message;
    }
    if (!data?.id) return message;
  }
  return null;
}

function cleanTradeIn(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Trade-in payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  for (const key of ["sale_id", "customer_id"] as const) {
    if (key in input) {
      const id = cleanNullableUuid(input[key]);
      if (id === undefined) return { ok: false, error: `Invalid ${key}` };
      values[key] = id;
    }
  }
  for (const [key, min, max] of [
    ["make", 1, 80],
    ["model", 1, 80],
    ["trim", 0, 100],
    ["vin", 0, 32],
    ["license_plate", 0, 32],
    ["color", 0, 60],
    ["payoff_lender", 0, 160],
    ["notes", 0, 2000],
  ] as const) {
    if (key in input) {
      const text = cleanText(input[key], min, max);
      if (min > 0 && !text) return { ok: false, error: `Invalid ${key}` };
      values[key] = text;
    }
  }
  if ("year" in input) {
    const year = cleanNullableInteger(input.year, 1900, 2100);
    if (year === undefined) return { ok: false, error: "Invalid year" };
    values.year = year;
  }
  if ("mileage" in input) {
    const mileage = cleanNullableInteger(input.mileage, 0, 10000000);
    if (mileage === undefined) return { ok: false, error: "Invalid mileage" };
    values.mileage = mileage;
  }
  for (const key of ["appraised_value_cents", "offered_value_cents", "payoff_amount_cents"] as const) {
    if (key in input) {
      const cents = cleanInteger(input[key], 0, 100000000);
      if (cents === null) return { ok: false, error: `Invalid ${key}` };
      values[key] = cents;
    }
  }
  if ("condition" in input) {
    values.condition = input.condition == null ? null : cleanEnum(input.condition, CONDITIONS);
    if (input.condition != null && !values.condition) return { ok: false, error: "Invalid condition" };
  }
  if ("status" in input) {
    const status = cleanEnum(input.status, STATUSES);
    if (!status) return { ok: false, error: "Invalid status" };
    values.status = status;
  }
  if ("photo_urls" in input) {
    const urls = cleanPhotoUrls(input.photo_urls);
    if (!urls) return { ok: false, error: "Invalid photo URLs" };
    values.photo_urls = urls;
  }

  if (action === "create") {
    for (const key of ["make", "model"] as const) {
      if (!values[key]) return { ok: false, error: "Missing required trade-in fields" };
    }
  } else if (Object.keys(values).length === 0) {
    return { ok: false, error: "No trade-in changes supplied" };
  }
  return { ok: true, values };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value.trim()) ? value.trim() : null;
}

function cleanNullableUuid(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  return cleanUuid(value) ?? undefined;
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  return allowed.has(text) ? text : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text.length ? text : null;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function cleanNullableInteger(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  const n = cleanInteger(value, min, max);
  return n === null ? undefined : n;
}

function cleanPhotoUrls(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 12) return null;
  const urls = [];
  for (const raw of value) {
    if (typeof raw !== "string") return null;
    const url = raw.trim();
    if (!/^https?:\/\//i.test(url) || url.length > 1000) return null;
    urls.push(url);
  }
  return urls;
}
