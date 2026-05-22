import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Cron cleanup: closes Twilio Proxy sessions for rides that ended >5min ago.
interface CloseAttemptResult {
  status: "closed" | "not_found" | "error";
  responseCode: number | null;
  errorMessage: string | null;
}

async function attemptCloseTwilioSession(sessionSid: string): Promise<CloseAttemptResult> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const proxySid = Deno.env.get("TWILIO_PROXY_SERVICE_SID")!;
  const auth = btoa(`${sid}:${token}`);
  try {
    const r = await fetch(`https://proxy.twilio.com/v1/Services/${proxySid}/Sessions/${sessionSid}`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "Status=closed",
    });
    if (r.ok) return { status: "closed", responseCode: r.status, errorMessage: null };
    if (r.status === 404) return { status: "not_found", responseCode: 404, errorMessage: "session not found" };
    const txt = await r.text();
    return { status: "error", responseCode: r.status, errorMessage: txt.slice(0, 500) };
  } catch (e) {
    return { status: "error", responseCode: null, errorMessage: `network: ${String(e).slice(0, 400)}` };
  }
}

async function writeAudit(admin: any, row: any) {
  try { await admin.from("call_session_closure_audit").insert(row); } catch (e) { console.warn("audit insert failed", e); }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function closeWithRetry(admin: any, sessionSid: string, rideRequestId: string | null) {
  const delays = [500, 1500, 4000];
  let lastResult: CloseAttemptResult = { status: "error", responseCode: null, errorMessage: "no attempt" };
  for (let i = 0; i < 3; i++) {
    const attempt = i + 1;
    lastResult = await attemptCloseTwilioSession(sessionSid);
    await writeAudit(admin, {
      ride_request_id: rideRequestId,
      twilio_proxy_session_sid: sessionSid,
      closure_source: "cron",
      twilio_status: lastResult.status,
      twilio_response_code: lastResult.responseCode,
      error_message: lastResult.errorMessage,
      attempt_number: attempt,
    });
    if (lastResult.status === "closed" || lastResult.status === "not_found") {
      return { ok: true, attempts: attempt };
    }
    if (lastResult.responseCode === 401 || lastResult.responseCode === 403) return { ok: false, attempts: attempt };
    const code = lastResult.responseCode;
    const retriable = code === null || code === 429 || (code >= 500 && code < 600);
    if (!retriable) return { ok: false, attempts: attempt };
    if (i < 2) await sleep(delays[i]);
  }
  return { ok: false, attempts: 3 };
}

Deno.serve(withSecurity("close-trip-call-sessions", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!isInternalCaller(req)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: sessions } = await admin
      .from("trip_call_sessions")
      .select("id, twilio_proxy_session_sid, ride_request_id, expires_at, closure_attempts, ride_requests!inner(status)")
      .lt("expires_at", cutoff)
      .not("twilio_proxy_session_sid", "is", null)
      .limit(100);

    let closed = 0;
    let failed = 0;
    for (const s of (sessions as any[]) || []) {
      if (!s.twilio_proxy_session_sid) continue;
      const result = await closeWithRetry(admin, s.twilio_proxy_session_sid, s.ride_request_id);
      const newAttempts = (s.closure_attempts || 0) + result.attempts;
      if (result.ok) {
        await admin.from("trip_call_sessions").update({
          twilio_proxy_session_sid: null,
          closure_attempts: newAttempts,
          closure_failed_at: null,
        } as any).eq("id", s.id);
        closed++;
      } else {
        await admin.from("trip_call_sessions").update({
          closure_attempts: newAttempts,
          closure_failed_at: new Date().toISOString(),
        } as any).eq("id", s.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, closed, failed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[close-trip-call-sessions]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { rateLimit: "admin_action", strictCors: true, skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));

function isInternalCaller(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const cronSecret = Deno.env.get("INTERNAL_CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) return true;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceKey && authHeader.includes(serviceKey)) return true;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  return Boolean(anonKey && authHeader.includes(anonKey));
}
