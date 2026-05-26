/**
 * send-sms
 * --------
 * Generic transactional SMS sender. Used by notify-dispatch and any other
 * internal caller that needs to send a one-off SMS (ride status updates,
 * order confirmations, security alerts, etc.).
 *
 * Provider: Twilio Messages API (direct, with optional Lovable connector
 * fallback to mirror the existing eats-notifications.ts pattern).
 *
 * Auth: service-role only (internal callers). Logs to public.sms_send_log
 * (created in 20260509120000_unified_notifications.sql).
 *
 * Body:
 *   { to: "+14155552671", body: "...", user_id?: uuid, event_type?: string }
 */
import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const j = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface SmsRequest {
  to: string;
  body: string;
  user_id?: string;
  event_type?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j(405, { error: "Method not allowed" });

  const auth = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return j(500, { error: "Server misconfigured" });
  if (auth !== `Bearer ${serviceKey}`) return j(401, { error: "Service-role only" });

  let payload: SmsRequest;
  try {
    payload = await req.json();
  } catch {
    return j(400, { error: "Invalid JSON body" });
  }

  const to = (payload.to || "").trim();
  const body = (payload.body || "").trim();
  if (!to || !body) return j(400, { error: "Missing 'to' or 'body'" });
  if (!/^\+[1-9]\d{6,14}$/.test(to)) return j(400, { error: "to must be E.164" });

  const supabase = createClient(supabaseUrl, serviceKey);

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from =
    Deno.env.get("TWILIO_FROM_NUMBER") ?? Deno.env.get("TWILIO_PHONE_NUMBER");
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

  // Lovable connector fallback (already used by eats-notifications.ts).
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioConnKey = Deno.env.get("TWILIO_API_KEY");

  const truncated = body.slice(0, 1200);
  const masked = `***${to.slice(-4)}`;

  // Insert pending log row.
  const { data: logRow } = await supabase
    .from("sms_send_log")
    .insert({
      user_id: payload.user_id ?? null,
      event_type: payload.event_type ?? null,
      destination_masked: masked,
      status: "pending",
      provider: "twilio",
    })
    .select("id")
    .single();

  const finish = async (
    ok: boolean,
    extra: { provider_id?: string; error?: string },
  ) => {
    if (logRow?.id) {
      await supabase
        .from("sms_send_log")
        .update({
          status: ok ? "sent" : "failed",
          provider_message_id: extra.provider_id ?? null,
          error_message: extra.error ?? null,
          sent_at: ok ? new Date().toISOString() : null,
        })
        .eq("id", logRow.id);
    }
  };

  try {
    let providerId: string | undefined;

    if (accountSid && authToken && (from || messagingServiceSid)) {
      const params = new URLSearchParams({ To: to, Body: truncated });
      if (messagingServiceSid) params.append("MessagingServiceSid", messagingServiceSid);
      else if (from) params.append("From", from);

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await finish(false, { error: JSON.stringify(data).slice(0, 500) });
        return j(502, { success: false, error: data });
      }
      providerId = data.sid;
    } else if (lovableKey && twilioConnKey && from) {
      const res = await fetch(
        "https://connector-gateway.lovable.dev/twilio/Messages.json",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": twilioConnKey,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: to, From: from, Body: truncated }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await finish(false, { error: JSON.stringify(data).slice(0, 500) });
        return j(502, { success: false, error: data });
      }
      providerId = data.sid;
    } else {
      await finish(false, { error: "sms_not_configured" });
      return j(503, { success: false, error: "SMS provider not configured" });
    }

    await finish(true, { provider_id: providerId });
    return j(200, { success: true, sid: providerId, to: masked });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send_failed";
    await finish(false, { error: msg });
    return j(500, { success: false, error: msg });
  }
});
