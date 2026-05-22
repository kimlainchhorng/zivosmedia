import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Twilio Proxy: creates a masked-number session so rider and driver can call each other
// without exposing their real phone numbers. Reuses an active session if one exists.
async function twilioRequest(path: string, body: Record<string, string>) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const auth = btoa(`${sid}:${token}`);
  const r = await fetch(`https://proxy.twilio.com/v1${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

Deno.serve(withSecurity("create-masked-call-session", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const proxySid = Deno.env.get("TWILIO_PROXY_SERVICE_SID")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { ride_request_id } = await req.json();
    if (!ride_request_id) return new Response(JSON.stringify({ error: "ride_request_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is rider or assigned driver
    const { data: isParticipant } = await admin.rpc("is_trip_participant", { _ride_id: ride_request_id, _user_id: user.id } as any);
    if (!isParticipant) {
      return new Response(JSON.stringify({ error: "not a trip participant" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: ride } = await admin.from("ride_requests").select("id, user_id, assigned_driver_id, status").eq("id", ride_request_id).maybeSingle();
    if (!ride) return new Response(JSON.stringify({ error: "ride not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Defense in depth: refuse new call sessions for rides in terminal states
    const TERMINAL = ["completed", "cancelled", "canceled", "no_show", "expired"];
    if (ride.status && TERMINAL.includes(ride.status)) {
      return new Response(JSON.stringify({ error: "ride is no longer active" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isRider = ride.user_id === user.id;
    const callerRole = isRider ? "rider" : "driver";

    // Reuse active session
    const { data: existing } = await admin
      .from("trip_call_sessions")
      .select("id, twilio_proxy_session_sid, rider_proxy_number, driver_proxy_number, expires_at")
      .eq("ride_request_id", ride_request_id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing?.twilio_proxy_session_sid) {
      const proxyNumber = isRider ? existing.rider_proxy_number : existing.driver_proxy_number;
      if (proxyNumber) {
        return new Response(JSON.stringify({ proxy_number: proxyNumber, reused: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Fetch real numbers
    const { data: riderProfile } = await admin.from("profiles").select("phone").eq("user_id", ride.user_id).maybeSingle();
    const { data: driverRow } = ride.assigned_driver_id
      ? await admin.from("drivers").select("phone").eq("id", ride.assigned_driver_id).maybeSingle()
      : { data: null };

    if (!riderProfile?.phone || !driverRow?.phone) {
      return new Response(JSON.stringify({ error: "missing phone numbers for one party" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ttlMs = 1000 * 60 * 60; // 60 minutes
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    // Create Twilio Proxy session
    const session = await twilioRequest(`/Services/${proxySid}/Sessions`, {
      UniqueName: `ride-${ride_request_id}-${Date.now()}`,
      Mode: "voice-only",
      Ttl: String(Math.floor(ttlMs / 1000)),
    });
    const sessionSid = session.sid as string;

    // Add participants
    const riderPart = await twilioRequest(`/Services/${proxySid}/Sessions/${sessionSid}/Participants`, {
      Identifier: riderProfile.phone,
      FriendlyName: "rider",
    });
    const driverPart = await twilioRequest(`/Services/${proxySid}/Sessions/${sessionSid}/Participants`, {
      Identifier: driverRow.phone,
      FriendlyName: "driver",
    });

    const riderProxy = riderPart.proxy_identifier as string;
    const driverProxy = driverPart.proxy_identifier as string;

    await admin.from("trip_call_sessions").insert({
      ride_request_id,
      twilio_proxy_session_sid: sessionSid,
      rider_proxy_number: riderProxy,
      driver_proxy_number: driverProxy,
      expires_at: expiresAt,
    } as any);

    const proxyNumber = isRider ? driverProxy : riderProxy; // Caller dials the OTHER party's proxy
    // Actually: each participant has their own proxy_identifier — when they dial the OTHER party's number it routes through.
    // Simpler: return the participant's own proxy number that they can save / dial.
    const callerProxy = isRider ? riderProxy : driverProxy;

    return new Response(JSON.stringify({ proxy_number: callerProxy, session_sid: sessionSid, role: callerRole, reused: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[create-masked-call-session]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { rateLimit: "admin_action", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
