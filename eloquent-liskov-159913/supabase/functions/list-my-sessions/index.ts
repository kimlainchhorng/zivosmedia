/**
 * list-my-sessions — returns the active login sessions for the calling user.
 *
 * Authenticated. Returns a small JSON array each user can render in their
 * security settings page so they can see "where you're signed in" and revoke
 * any rogue session via /revoke-session.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";
function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

Deno.serve(withSecurity("list-my-sessions", async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller via their JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json(req, { error: "Invalid session" }, 401);
    const userId = userData.user.id;

    // Service role for the read so RLS-blocked columns are surfaced to the
    // OWNER only (we filter by user_id ourselves below).
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sessions, error: listError } = await admin
      .from("login_sessions")
      .select("id, ip_address, user_agent, device_type, device_fingerprint, location_city, location_country, is_trusted, is_active, last_activity, expires_at, created_at, terminated_at, terminated_reason")
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("terminated_at", null)
      .order("last_activity", { ascending: false, nullsFirst: false })
      .limit(50);

    if (listError) {
      console.error("[list-my-sessions]", listError);
      return json(req, { error: "Could not fetch sessions" }, 500);
    }

    // Light hydration: derive a user-friendly label and a "current session" hint.
    const callerFingerprint = req.headers.get("x-device-fingerprint") || null;
    const out = (sessions ?? []).map((s) => ({
      id: s.id,
      label: s.user_agent || s.device_type || "Unknown device",
      device_type: s.device_type,
      ip: s.ip_address,
      location: [s.location_city, s.location_country].filter(Boolean).join(", ") || null,
      is_trusted: !!s.is_trusted,
      is_current: callerFingerprint != null && s.device_fingerprint === callerFingerprint,
      last_activity: s.last_activity ?? s.created_at,
      created_at: s.created_at,
      expires_at: s.expires_at,
    }));

    return json(req, { success: true, sessions: out });
  } catch (err) {
    console.error("[list-my-sessions] unhandled", err);
    return json(req, { error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
}, { rateLimit: "api_general" }));
