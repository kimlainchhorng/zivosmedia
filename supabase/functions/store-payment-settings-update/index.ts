/**
 * store-payment-settings-update
 * -----------------------------
 * Server-gated salon payment configuration updates. Stripe Connect fields stay
 * provider/webhook-owned and are never accepted from the browser.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

type Body = {
  store_id?: unknown;
  settings?: unknown;
};

serve(withSecurity("store-payment-settings-update", async (req, ctx) => {
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

  const { data: existing, error: existingError } = await admin
    .from("store_payment_settings")
    .select("id")
    .eq("store_id", storeId)
    .eq("market", "us")
    .maybeSingle();
  if (existingError) {
    console.error("[store-payment-settings-update:lookup]", existingError.message);
    return json({ error: "Could not verify payment settings" }, 500);
  }

  const selectColumns = [
    "id",
    "market",
    "stripe_account_id",
    "stripe_status",
    "accept_card",
    "accept_cash",
    "tips_enabled",
    "tip_presets",
    "tip_applies_pre_tax",
    "tax_enabled",
    "tax_rate",
    "tax_label",
    "deposit_percent",
    "no_show_fee_cents",
    "cancellation_window_hours",
  ].join(", ");

  if (existing?.id) {
    const { data, error } = await admin
      .from("store_payment_settings")
      .update(settings.values)
      .eq("id", existing.id)
      .select(selectColumns)
      .single();
    if (error) {
      console.error("[store-payment-settings-update:update]", error.message);
      return json({ error: "Could not update payment settings" }, 500);
    }
    return json({ ok: true, settings: data });
  }

  const { data, error } = await admin
    .from("store_payment_settings")
    .insert({ ...settings.values, store_id: storeId, market: "us" })
    .select(selectColumns)
    .single();
  if (error) {
    console.error("[store-payment-settings-update:insert]", error.message);
    return json({ error: "Could not create payment settings" }, 500);
  }

  return json({ ok: true, settings: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[store-payment-settings-update:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-payment-settings-update:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanSettings(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Payment settings are required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  for (const field of ["accept_card", "accept_cash", "tips_enabled", "tip_applies_pre_tax", "tax_enabled"]) {
    if (field in input) {
      const bool = cleanBoolean(input[field]);
      if (bool === null) return { ok: false, error: `Invalid ${field}` };
      values[field] = bool;
    }
  }

  if ("tip_presets" in input) {
    const presets = cleanTipPresets(input.tip_presets);
    if (!presets) return { ok: false, error: "Invalid tip presets" };
    values.tip_presets = presets;
  }
  if ("tax_rate" in input) {
    const taxRate = cleanNumber(input.tax_rate, 0, 30, 3);
    if (taxRate === null) return { ok: false, error: "Invalid tax rate" };
    values.tax_rate = taxRate;
  }
  if ("tax_label" in input) {
    const label = cleanText(input.tax_label, 1, 80);
    if (!label) return { ok: false, error: "Invalid tax label" };
    values.tax_label = label;
  }
  if ("deposit_percent" in input) {
    const deposit = cleanInteger(input.deposit_percent, 0, 100);
    if (deposit === null) return { ok: false, error: "Invalid deposit percent" };
    values.deposit_percent = deposit;
  }
  if ("no_show_fee_cents" in input) {
    const fee = cleanInteger(input.no_show_fee_cents, 0, 1000000);
    if (fee === null) return { ok: false, error: "Invalid no-show fee" };
    values.no_show_fee_cents = fee;
  }
  if ("cancellation_window_hours" in input) {
    const hours = cleanInteger(input.cancellation_window_hours, 0, 168);
    if (hours === null) return { ok: false, error: "Invalid cancellation window" };
    values.cancellation_window_hours = hours;
  }

  return { ok: true, values };
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function cleanTipPresets(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return null;
  const presets: number[] = [];
  for (const item of value) {
    const preset = cleanInteger(item, 0, 100);
    if (preset === null) return null;
    presets.push(preset);
  }
  return presets;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function cleanNumber(value: unknown, min: number, max: number, decimals: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  const factor = 10 ** decimals;
  return Math.round(number * factor) / factor;
}
