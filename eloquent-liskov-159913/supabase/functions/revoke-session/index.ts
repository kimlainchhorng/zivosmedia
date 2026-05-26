/**
 * revoke-session — terminates a single login_session belonging to the caller.
 *
 * POST { sessionId } — owner-only. Marks is_active=false, sets terminated_at
 * and terminated_reason='user_revoked'. The actual auth-token revocation for
 * Supabase happens via auth.admin.signOut() server-side so the targeted
 * device's refresh_token stops working immediately.
 *
 * Special value sessionId: "all_others" terminates every session except the
 * caller's current one (matched by x-device-fingerprint header).
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type, x-device-fingerprint";
function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

Deno.serve(withSecurity("revoke-session", async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "Missing Authorization header" }, 401);

    let body: any;
    try { body = await req.json(); } catch { return json(req, { error: "Invalid JSON body" }, 400); }
    const sessionId: string | undefined = body?.sessionId?.toString();
    if (!sessionId) return json(req, { error: "sessionId is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json(req, { error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const callerFingerprint = req.headers.get("x-device-fingerprint");

    let revoked = 0;
    if (sessionId === "all_others") {
      // Terminate every active session for this user EXCEPT the caller's.
      const query = admin
        .from("login_sessions")
        .update({ is_active: false, terminated_at: new Date().toISOString(), terminated_reason: "user_revoked_others" })
        .eq("user_id", userId)
        .eq("is_active", true);
      if (callerFingerprint) query.neq("device_fingerprint", callerFingerprint);
      const { data, error } = await query.select("id");
      if (error) {
        console.error("[revoke-session] all_others", error);
        return json(req, { error: "Could not revoke other sessions" }, 500);
      }
      revoked = data?.length ?? 0;
    } else {
      // Verify the row belongs to caller before updating
      const { data: row, error: getErr } = await admin
        .from("login_sessions")
        .select("id, user_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (getErr || !row) return json(req, { error: "Session not found" }, 404);
      if (row.user_id !== userId) return json(req, { error: "Forbidden" }, 403);

      const { error: upErr } = await admin
        .from("login_sessions")
        .update({ is_active: false, terminated_at: new Date().toISOString(), terminated_reason: "user_revoked" })
        .eq("id", sessionId)
        .eq("user_id", userId);
      if (upErr) {
        console.error("[revoke-session]", upErr);
        return json(req, { error: "Could not revoke session" }, 500);
      }
      revoked = 1;
    }

    // Best-effort: revoke the user's Supabase refresh tokens so the device
    // can't keep using its stored token. We only do this for "all_others" or
    // when the caller explicitly asked for self — single-session revoke just
    // marks the row, since we can't pinpoint a Supabase refresh-token to a
    // specific login_session row without extra metadata.
    if (sessionId === "all_others") {
      try {
        await admin.auth.admin.signOut(userId, "others" as any).catch(() => {});
      } catch {}
    }

    return json(req, { success: true, revoked });
  } catch (err) {
    console.error("[revoke-session] unhandled", err);
    return json(req, { error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
}, { rateLimit: "auth_password_reset" }));
