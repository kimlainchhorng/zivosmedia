/**
 * privacy-settings-update
 * -----------------------
 * Server-gated writes for user privacy preferences with an explicit key
 * allowlist so arbitrary client payloads cannot mutate the row.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const BOOLEAN_KEYS = new Set([
  "show_activity_status",
  "show_read_receipts",
  "allow_message_requests",
  "blur_sensitive_media",
]);
const PROFILE_VISIBILITY = new Set(["public", "followers", "private"]);

type Body = {
  key?: unknown;
  value?: unknown;
};

serve(withSecurity("privacy-settings-update", async (req, ctx) => {
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
  const patch = normalizePatch(body);
  if (!patch) return json({ error: "Invalid privacy setting" }, 400);

  const { data, error } = await admin
    .from("privacy_settings")
    .upsert({
      user_id: user.id,
      ...patch,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("user_id")
    .single();

  if (error) {
    console.error("[privacy-settings-update]", error.message);
    return json({ error: "Privacy update failed" }, 500);
  }

  return json({ ok: true, user_id: data?.user_id ?? user.id });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function normalizePatch(body: Body): Record<string, unknown> | null {
  if (typeof body.key !== "string") return null;
  const key = body.key.trim();
  if (BOOLEAN_KEYS.has(key)) {
    if (typeof body.value !== "boolean") return null;
    return { [key]: body.value };
  }
  if (key === "profile_visibility") {
    if (typeof body.value !== "string") return null;
    const value = body.value.trim();
    return PROFILE_VISIBILITY.has(value) ? { profile_visibility: value } : null;
  }
  return null;
}
