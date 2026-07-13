/**
 * account-security-settings
 * -------------------------
 * Server-gated writes for local two-step and app-passcode settings. The
 * browser may still verify existing salted hashes locally, but writes are
 * scoped to the authenticated user server-side.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const RESOURCES = new Set(["two_step", "passcode"]);
const ACTIONS = new Set(["upsert", "update", "delete"]);

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
