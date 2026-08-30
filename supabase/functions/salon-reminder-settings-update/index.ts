/**
 * salon-reminder-settings-update
 * ------------------------------
 * Owner/admin mutation gate for per-store salon reminder configuration.
 * Reminder scheduling remains trigger/cron-driven; this endpoint only writes
 * the store's settings row after validation.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  store_id?: unknown;
  settings?: unknown;
};

type SettingsValues = {
  booking_reminder_enabled: boolean;
  booking_reminder_lead_hours: number[];
  birthday_enabled: boolean;
  birthday_discount_percent: number;
  winback_enabled: boolean;
  winback_days_threshold: number;
  sender_name: string | null;
};

serve(withSecurity("salon-reminder-settings-update", async (req, ctx) => {
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
  if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

  const settings = cleanSettings(body.settings);
  if (!settings.ok) return json({ error: settings.error }, 400);

  const { data, error } = await admin
    .from("salon_reminder_settings")
    .upsert({ store_id: storeId, ...settings.values }, { onConflict: "store_id" })
    .select("store_id, booking_reminder_enabled, booking_reminder_lead_hours, birthday_enabled, birthday_discount_percent, winback_enabled, winback_days_threshold, sender_name")
    .single();
  if (error) {
    console.error("[salon-reminder-settings-update:upsert]", error.message);
    return json({ error: "Could not save reminder settings" }, 500);
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
    console.error("[salon-reminder-settings-update:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-reminder-settings-update:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanSettings(value: unknown): { ok: true; values: SettingsValues } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Settings payload is required" };
  }
  const input = value as Record<string, unknown>;
  const leadHours = cleanLeadHours(input.booking_reminder_lead_hours);
  if (!leadHours) return { ok: false, error: "Invalid reminder lead hours" };

  const birthdayDiscount = cleanInt(input.birthday_discount_percent, 0, 50);
  if (birthdayDiscount === null) return { ok: false, error: "Invalid birthday discount" };

  const winbackDays = cleanInt(input.winback_days_threshold, 30, 365);
  if (winbackDays === null) return { ok: false, error: "Invalid win-back threshold" };

  if (
    typeof input.booking_reminder_enabled !== "boolean" ||
    typeof input.birthday_enabled !== "boolean" ||
    typeof input.winback_enabled !== "boolean"
  ) {
    return { ok: false, error: "Invalid reminder toggle" };
  }

  return {
    ok: true,
    values: {
      booking_reminder_enabled: input.booking_reminder_enabled,
      booking_reminder_lead_hours: leadHours,
      birthday_enabled: input.birthday_enabled,
      birthday_discount_percent: birthdayDiscount,
      winback_enabled: input.winback_enabled,
      winback_days_threshold: winbackDays,
      sender_name: cleanNullableText(input.sender_name, 80),
    },
  };
}

function cleanLeadHours(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const leadHours = Array.from(new Set(value.map((v) => cleanInt(v, 1, 168)).filter((v): v is number => v !== null)))
    .sort((a, b) => b - a)
    .slice(0, 5);
  return leadHours.length > 0 ? leadHours : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.length <= maxLength ? text : null;
}
