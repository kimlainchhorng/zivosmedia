/**
 * device-key-manage
 * -----------------
 * Server-gated publication and reset for Secret Chat device public keys.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["upsert", "delete"]);

type Body = Record<string, unknown>;

serve(withSecurity("device-key-manage", async (req, ctx) => {
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
  const action = cleanEnum(body.action, ACTIONS);
  const fingerprint = cleanFingerprint(body.device_fingerprint);
  if (!action || !fingerprint) return json({ error: "Invalid device key request" }, 400);

  if (action === "delete") {
    const { error } = await admin
      .from("device_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("device_fingerprint", fingerprint);
    return done(json, error);
  }

  const publicKeyJwk = cleanPublicKey(body.public_key_jwk);
  if (!publicKeyJwk) return json({ error: "Invalid public key" }, 400);

  const { error } = await admin.from("device_keys").upsert({
    user_id: user.id,
    device_fingerprint: fingerprint,
    public_key_jwk: publicKeyJwk,
  }, { onConflict: "user_id,device_fingerprint" });
  return done(json, error);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function done(json: (body: unknown, status?: number) => Response, error: any) {
  if (error) {
    console.error("[device-key-manage]", error.message);
    return json({ error: "Device key update failed" }, 500);
  }
  return json({ ok: true });
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return allowed.has(text) ? text : null;
}

function cleanFingerprint(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return /^[A-Za-z0-9:_-]{8,160}$/.test(text) ? text : null;
}

function cleanPublicKey(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const jwk = value as Record<string, unknown>;
  if (jwk.kty !== "EC" && jwk.kty !== "OKP" && jwk.kty !== "RSA") return null;
  return jwk;
}
