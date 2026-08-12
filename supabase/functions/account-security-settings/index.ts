/**
 * account-security-settings
 * -------------------------
 * Server-gated writes for local two-step and app-passcode settings. The
 * browser may still verify existing salted hashes locally, but writes are
 * scoped to the authenticated user server-side.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const RESOURCES = new Set(["two_step", "passcode", "parental"]);
const ACTIONS = new Set(["upsert", "update", "delete"]);

// Mirror of the CHECK constraints on parental_safety_settings; refusing here
// returns a 400 instead of surfacing a 23514 as a generic 500.
const PARENTAL_SCREEN_TIMES = new Set(["none", "30m", "1h", "2h", "4h"]);
const PARENTAL_CONTENT_FILTERS = new Set(["relaxed", "standard", "strict"]);

type Body = Record<string, unknown>;

serve(withSecurity("account-security-settings", async (req, ctx) => {
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
  const resource = cleanEnum(body.resource, RESOURCES);
  const action = cleanEnum(body.action, ACTIONS);
  if (!resource || !action) return json({ error: "Invalid security settings request" }, 400);

  if (resource === "two_step") {
    const result = await writeTwoStep(admin, user.id, action, body);
    return json(result.body, result.status);
  }

  if (resource === "parental") {
    const result = await writeParental(admin, user.id, action, body);
    return json(result.body, result.status);
  }

  const result = await writePasscode(admin, user.id, action, body);
  return json(result.body, result.status);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "auth_login", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

async function writeTwoStep(admin: any, userId: string, action: string, body: Body) {
  if (action === "delete") {
    const { error } = await admin.from("two_step_auth").delete().eq("user_id", userId);
    await recordAlert(admin, userId, "disabled");
    return done(error);
  }

  if (action === "update") {
    const enabled = typeof body.enabled === "boolean" ? body.enabled : null;
    if (enabled === null) return bad();
    const { error } = await admin
      .from("two_step_auth")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await recordAlert(admin, userId, enabled ? "enabled" : "disabled");
    return done(error);
  }

  const passwordHash = cleanText(body.password_hash, 512);
  const passwordSalt = cleanText(body.password_salt, 256);
  if (!passwordHash || !passwordSalt) return bad();
  const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
  const { error } = await admin.from("two_step_auth").upsert({
    user_id: userId,
    password_hash: passwordHash,
    password_salt: passwordSalt,
    hint: cleanText(body.hint, 160),
    recovery_email: cleanEmail(body.recovery_email),
    enabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  await recordAlert(admin, userId, enabled ? "enabled" : "configured");
  return done(error);
}

async function writePasscode(admin: any, userId: string, action: string, body: Body) {
  if (action === "delete") {
    const { error } = await admin.from("user_passcode").delete().eq("user_id", userId);
    return done(error);
  }

  if (action === "update") {
    const patch: Record<string, unknown> = {};
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.biometric_enabled === "boolean") patch.biometric_enabled = body.biometric_enabled;
    const minutes = cleanAutoLock(body.auto_lock_minutes);
    if (minutes !== null) patch.auto_lock_minutes = minutes;
    if (Object.keys(patch).length === 0) return bad();
    const { error } = await admin.from("user_passcode").update(patch).eq("user_id", userId);
    return done(error);
  }

  const passcodeHash = cleanText(body.passcode_hash, 512);
  const passcodeSalt = cleanText(body.passcode_salt, 256);
  if (!passcodeHash || !passcodeSalt) return bad();
  const { error } = await admin.from("user_passcode").upsert({
    user_id: userId,
    passcode_hash: passcodeHash,
    passcode_salt: passcodeSalt,
    auto_lock_minutes: cleanAutoLock(body.auto_lock_minutes) ?? 5,
    biometric_enabled: body.biometric_enabled === true,
    enabled: body.enabled !== false,
  }, { onConflict: "user_id" });
  return done(error);
}

/**
 * Parental-safety settings: toggles / screen time / content filter, plus a
 * salted PIN verifier with the same client-hashed contract as the passcode
 * (the raw digits never reach this function).
 *
 * - upsert: full write — settings and, when provided together, pin_hash+pin_salt.
 * - update: partial patch of settings only; a PIN change must come through
 *   upsert with both hash and salt, or clear_pin to remove it. This keeps the
 *   hash-and-salt-together invariant out of reach of a partial patch.
 * - delete: remove the row entirely (all controls off, PIN gone).
 *
 * PIN transitions are audited to login_alerts like two-step changes: turning
 * parental controls off is precisely the event the account owner needs to see.
 */
async function writeParental(admin: any, userId: string, action: string, body: Body) {
  if (action === "delete") {
    const { error } = await admin.from("parental_safety_settings").delete().eq("user_id", userId);
    await recordParentalAlert(admin, userId, "removed");
    return done(error);
  }

  const toggles = cleanToggleMap(body.toggles);
  const screenTime = cleanEnum(body.screen_time, PARENTAL_SCREEN_TIMES);
  const contentFilter = cleanEnum(body.content_filter, PARENTAL_CONTENT_FILTERS);

  if (action === "update") {
    const patch: Record<string, unknown> = {};
    if (toggles !== null) patch.toggles = toggles;
    if (screenTime) patch.screen_time = screenTime;
    if (contentFilter) patch.content_filter = contentFilter;
    if (body.clear_pin === true) {
      patch.pin_hash = null;
      patch.pin_salt = null;
    }
    if (Object.keys(patch).length === 0) return bad();
    patch.updated_at = new Date().toISOString();
    const { error } = await admin
      .from("parental_safety_settings")
      .update(patch)
      .eq("user_id", userId);
    if (body.clear_pin === true) await recordParentalAlert(admin, userId, "pin_cleared");
    return done(error);
  }

  const pinHash = cleanText(body.pin_hash, 512);
  const pinSalt = cleanText(body.pin_salt, 256);
  // Hash and salt travel together or not at all — half a verifier is a row
  // that can never verify anything and reads as "PIN active" in the UI.
  if ((pinHash === null) !== (pinSalt === null)) return bad();

  const row: Record<string, unknown> = {
    user_id: userId,
    toggles: toggles ?? {},
    screen_time: screenTime ?? "none",
    content_filter: contentFilter ?? "standard",
    updated_at: new Date().toISOString(),
  };
  if (pinHash && pinSalt) {
    row.pin_hash = pinHash;
    row.pin_salt = pinSalt;
  }
  const { error } = await admin
    .from("parental_safety_settings")
    .upsert(row, { onConflict: "user_id" });
  await recordParentalAlert(admin, userId, pinHash ? "pin_configured" : "configured");
  return done(error);
}

/** Toggle map: plain object of boolean values, anything else refused. */
function cleanToggleMap(value: unknown): Record<string, boolean> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const out: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(value as Record<string, unknown>)) {
    if (typeof enabled !== "boolean") return null;
    if (key.length === 0 || key.length > 64) return null;
    out[key] = enabled;
  }
  return out;
}

async function recordParentalAlert(admin: any, userId: string, action: string) {
  await admin.from("login_alerts").insert({
    user_id: userId,
    event: "parental_safety_changed",
    metadata: { action },
  });
}

async function recordAlert(admin: any, userId: string, action: string) {
  await admin.from("login_alerts").insert({
    user_id: userId,
    event: "two_step_changed",
    metadata: { action },
  });
}

function done(error: any) {
  if (error) {
    console.error("[account-security-settings]", error.message);
    return { status: 500, body: { error: "Security settings update failed" } };
  }
  return { status: 200, body: { ok: true } };
}

function bad() {
  return { status: 400, body: { error: "Invalid security settings request" } };
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  const text = cleanText(value, 80);
  return text && allowed.has(text) ? text : null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanEmail(value: unknown): string | null {
  const email = cleanText(value, 254)?.toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function cleanAutoLock(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const minutes = Math.round(value);
  return minutes >= 1 && minutes <= 240 ? minutes : null;
}
