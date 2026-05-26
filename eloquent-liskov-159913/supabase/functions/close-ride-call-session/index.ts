import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Immediate Twilio Proxy session teardown for a single ride.
// Invoked by a Postgres trigger when ride_requests.status hits a terminal value.
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

async function writeAudit(admin: any, row: {
  ride_request_id: string | null;
  twilio_proxy_session_sid: string | null;
  closure_source: string;
  twilio_status: string;
  twilio_response_code: number | null;
  error_message: string | null;
  attempt_number: number;
}) {
  try {
    await admin.from("call_session_closure_audit").insert(row as any);
  } catch (e) {
    console.warn("[close-ride-call-session] audit insert failed", e);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function closeWithRetry(
  admin: any,
  sessionSid: string,
  rideRequestId: string,
  source: string,
): Promise<{ ok: boolean; attempts: number; lastResult: CloseAttemptResult }> {
  const delays = [500, 1500, 4000];
  let lastResult: CloseAttemptResult = { status: "error", responseCode: null, errorMessage: "no attempt" };
  for (let i = 0; i < 3; i++) {
    const attempt = i + 1;
    lastResult = await attemptCloseTwilioSession(sessionSid);
    await writeAudit(admin, {
      ride_request_id: rideRequestId,
      twilio_proxy_session_sid: sessionSid,
      closure_source: source,
      twilio_status: lastResult.status,
      twilio_response_code: lastResult.responseCode,
      error_message: lastResult.errorMessage,
      attempt_number: attempt,
    });
    // Success or terminal failure (404/401/403) — stop
    if (lastResult.status === "closed" || lastResult.status === "not_found") {
      return { ok: true, attempts: attempt, lastResult };
    }
    if (lastResult.responseCode === 401 || lastResult.responseCode === 403) {
      return { ok: false, attempts: attempt, lastResult };
    }
    // Retry on 5xx, 429, network — otherwise stop
    const code = lastResult.responseCode;
    const retriable = code === null || code === 429 || (code >= 500 && code < 600);
    if (!retriable) return { ok: false, attempts: attempt, lastResult };
    if (i < 2) await sleep(delays[i]);
  }
  return { ok: false, attempts: 3, lastResult };
}

Deno.serve(withSecurity("close-ride-call-session", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Reject anon: require service role bearer (the trigger uses it)
    const authHeader = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!authHeader.includes(serviceKey)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const ride_request_id: string | undefined = body.ride_request_id;
    const closure_source: string = body.closure_source ?? "trigger";
    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sessions } = await admin
      .from("trip_call_sessions")
      .select("id, twilio_proxy_session_sid, closure_attempts")
      .eq("ride_request_id", ride_request_id)
      .not("twilio_proxy_session_sid", "is", null);

    let closed = 0;
    let failed = 0;
    for (const s of (sessions as any[]) || []) {
      if (!s.twilio_proxy_session_sid) continue;
      const result = await closeWithRetry(admin, s.twilio_proxy_session_sid, ride_request_id, closure_source);
      const newAttempts = (s.closure_attempts || 0) + result.attempts;
      if (result.ok) {
        await admin
          .from("trip_call_sessions")
          .update({
            twilio_proxy_session_sid: null,
            expires_at: new Date().toISOString(),
            closure_attempts: newAttempts,
            closure_failed_at: null,
          } as any)
          .eq("id", s.id);
        closed++;
      } else {
        await admin
          .from("trip_call_sessions")
          .update({
            closure_attempts: newAttempts,
            closure_failed_at: new Date().toISOString(),
          } as any)
          .eq("id", s.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, closed, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[close-ride-call-session]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "admin_action", strictCors: true, skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));
