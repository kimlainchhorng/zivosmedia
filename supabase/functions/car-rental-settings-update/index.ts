/**
 * car-rental-settings-update
 * --------------------------
 * Server-gated owner/admin upsert for per-store car-rental settings.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const CURRENCIES = /^[A-Z]{3}$/;
const PAYMENT_PROVIDERS = new Set(["stripe", "manual"]);
const DEPOSIT_CAPTURE_MODES = new Set(["manual", "immediate"]);

type Body = {
  store_id?: unknown;
  settings?: unknown;
};

serve(withSecurity("car-rental-settings-update", async (req, ctx) => {
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
  const storeId = cleanUuid(body.store_id);
  if (!storeId) return json({ error: "Invalid store id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  const settings = cleanSettings(body.settings);
  if (!settings.ok) return json({ error: settings.error }, 400);

  const { data, error } = await admin
    .from("car_rental_store_settings")
    .upsert({ ...settings.values, store_id: storeId }, { onConflict: "store_id" })
    .select("*")
    .single();
  if (error) {
    console.error("[car-rental-settings-update:upsert]", error.message);
    return json({ error: "Could not save car rental settings" }, 500);
  }
  return json({ ok: true, settings: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-rental-settings-update:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-rental-settings-update:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanSettings(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Settings payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  for (const [key, min, max] of [
    ["tax_rate_bps", 0, 10000],
    ["no_show_grace_hours", 0, 72],
    ["late_grace_hours", 0, 48],
  ] as const) {
    if (key in input) {
      const number = cleanInteger(input[key], min, max);
      if (number === null) return { ok: false, error: `Invalid ${key}` };
      values[key] = number;
    }
  }
  if ("tax_label" in input) {
    const label = cleanText(input.tax_label, 1, 40);
    if (!label) return { ok: false, error: "Invalid tax label" };
    values.tax_label = label;
  }
  if ("currency_code" in input) {
    if (typeof input.currency_code !== "string") return { ok: false, error: "Invalid currency" };
    const currency = input.currency_code.trim().toUpperCase();
    if (!CURRENCIES.test(currency)) return { ok: false, error: "Invalid currency" };
    values.currency_code = currency;
  }
  if ("auto_confirm_app_bookings" in input) {
    if (typeof input.auto_confirm_app_bookings !== "boolean") return { ok: false, error: "Invalid auto-confirm setting" };
    values.auto_confirm_app_bookings = input.auto_confirm_app_bookings;
  }
  if ("cancellation_policy" in input) values.cancellation_policy = cleanText(input.cancellation_policy, 0, 1000);
  if ("refund_tiers" in input) {
    const tiers = cleanRefundTiers(input.refund_tiers);
    if (!tiers) return { ok: false, error: "Invalid refund tiers" };
    values.refund_tiers = tiers;
  }
  if ("payment_provider" in input) {
    const provider = cleanEnum(input.payment_provider, PAYMENT_PROVIDERS);
    if (!provider) return { ok: false, error: "Invalid payment provider" };
    values.payment_provider = provider;
  }
  if ("stripe_account_id" in input) values.stripe_account_id = cleanText(input.stripe_account_id, 0, 255);
  if ("deposit_capture_mode" in input) {
    const mode = cleanEnum(input.deposit_capture_mode, DEPOSIT_CAPTURE_MODES);
    if (!mode) return { ok: false, error: "Invalid deposit capture mode" };
    values.deposit_capture_mode = mode;
  }

  if (Object.keys(values).length === 0) return { ok: false, error: "No settings supplied" };
  return { ok: true, values };
}

function cleanRefundTiers(value: unknown): Array<{ days_before: number; percent: number }> | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const tiers: Array<{ days_before: number; percent: number }> = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const record = row as Record<string, unknown>;
    const days = cleanInteger(record.days_before, 0, 3650);
    const percent = cleanInteger(record.percent, 0, 100);
    if (days === null || percent === null) return null;
    tiers.push({ days_before: days, percent });
  }
  return tiers;
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

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
