/**
 * notification-preferences-update
 * -------------------------------
 * Server-gated writes for notification delivery preferences and SMS re-enable.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["update", "reenable_sms"]);

type Body = {
  action?: unknown;
  emailEnabled?: unknown;
  pushEnabled?: unknown;
  smsEnabled?: unknown;
  inAppEnabled?: unknown;
  marketingEnabled?: unknown;
  operationalEnabled?: unknown;
  phoneNumber?: unknown;
  quietHoursEnabled?: unknown;
  quietHoursStart?: unknown;
  quietHoursEnd?: unknown;
  smsConsentAt?: unknown;
  smsConsentText?: unknown;
  automatedMessagesEnabled?: unknown;
  automatedCartReminders?: unknown;
  automatedReengagement?: unknown;
  automatedBirthday?: unknown;
};

serve(withSecurity("notification-preferences-update", async (req, ctx) => {
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

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const action = cleanEnum(body.action, ACTIONS) ?? "update";
  const now = new Date().toISOString();

  if (action === "reenable_sms") {
    await admin
      .from("profiles")
      .update({ sms_opted_out: false, sms_opted_out_at: null, sms_consent: true })
      .eq("user_id", user.id);

    return upsertPreferences(admin, user.id, {
      sms_enabled: true,
      updated_at: now,
    }, json);
  }

  const update = cleanPreferencePatch(body, now);
  if (Object.keys(update).length <= 1) return json({ error: "No preference changes supplied" }, 400);

  if (body.smsEnabled !== undefined || body.smsConsentAt !== undefined) {
    await admin
      .from("profiles")
      .update({ sms_consent: body.smsEnabled === undefined ? true : Boolean(body.smsEnabled) })
      .eq("user_id", user.id);
  }

  return upsertPreferences(admin, user.id, update, json);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function upsertPreferences(
  admin: ReturnType<typeof createClient>,
  userId: string,
  patch: Record<string, unknown>,
  json: (body: unknown, status?: number) => Response,
) {
  const { data, error } = await admin
    .from("notification_preferences")
    .upsert({
      user_id: userId,
      email_enabled: true,
      sms_enabled: false,
      in_app_enabled: true,
      marketing_enabled: false,
      operational_enabled: true,
      // notification_preferences has no push_enabled, quiet_hours_* or
      // sms_consent_* columns (verified against the live database). Sending
      // them made PostgREST reject the upsert, so NO preference change saved
      // at all. Those settings need a migration before they can persist.
      phone_verified: false,
      ...patch,
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[notification-preferences-update]", error.message);
    return json({ error: "Preference update failed" }, 500);
  }

  return json({ ok: true, preferences: data });
}

function cleanPreferencePatch(body: Body, now: string): Record<string, unknown> {
  const patch: Record<string, unknown> = { updated_at: now };
  setBool(patch, "email_enabled", body.emailEnabled);
  setBool(patch, "sms_enabled", body.smsEnabled);
  setBool(patch, "in_app_enabled", body.inAppEnabled);
  setBool(patch, "marketing_enabled", body.marketingEnabled);
  setBool(patch, "operational_enabled", body.operationalEnabled);
  setBool(patch, "automated_messages_enabled", body.automatedMessagesEnabled);
  setBool(patch, "automated_cart_reminders", body.automatedCartReminders);
  setBool(patch, "automated_reengagement", body.automatedReengagement);
  setBool(patch, "automated_birthday", body.automatedBirthday);

  if (body.phoneNumber === null) patch.phone_number = null;
  if (typeof body.phoneNumber === "string") patch.phone_number = body.phoneNumber.trim().slice(0, 32);
  return patch;
}

function setBool(patch: Record<string, unknown>, key: string, value: unknown) {
  if (typeof value === "boolean") patch[key] = value;
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return allowed.has(text) ? text : null;
}

function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
