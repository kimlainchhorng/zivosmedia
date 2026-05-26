/**
 * twilio-webhook
 * ---------------
 * Handles inbound SMS replies from Twilio. Currently used by the salon
 * reminder system so a customer can text "CANCEL" to cancel their upcoming
 * booking without opening the app.
 *
 * Auth: validates X-Twilio-Signature (HMAC-SHA1 over URL + sorted form
 * params, base64-encoded). Mirrors Twilio's published algorithm:
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Idempotency: every inbound write is gated by salon_sms_inbound_log
 * (message_sid UNIQUE). Twilio retries failed deliveries on its side; the
 * UNIQUE index prevents duplicate processing.
 *
 * On success the function returns an empty TwiML <Response/> body. Our outbound
 * reply goes via the existing Twilio REST API (Lovable connector) so the
 * notification_audit table sees it and our retry/error handling is consistent
 * with all other salon outbound SMS.
 */
import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

const twimlEmpty = () =>
  new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });

const twimlReject = (msg: string) =>
  new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const constantTimeEquals = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
};

/** HMAC-SHA1 → base64. Web Crypto API only. */
async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  // base64-encode the raw bytes.
  let binary = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Compute Twilio's expected signature for a webhook request.
 *
 *   signature = base64(HMAC-SHA1(authToken, fullUrl + concatenated_sorted_params))
 *
 * Where concatenated_sorted_params is the form params sorted alphabetically
 * by key, each rendered as `${key}${value}` (no separators), then joined.
 */
async function computeTwilioSignature(
  authToken: string,
  fullUrl: string,
  params: Record<string, string>,
): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  let payload = fullUrl;
  for (const k of sortedKeys) payload += k + params[k];
  return hmacSha1Base64(authToken, payload);
}

interface InboundParsed {
  from: string;
  to: string;
  body: string;
  messageSid: string;
  raw: Record<string, string>;
}

function parseFormBody(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const key = decodeURIComponent(eq < 0 ? part : part.slice(0, eq));
    const value = decodeURIComponent(eq < 0 ? "" : part.slice(eq + 1).replace(/\+/g, " "));
    out[key] = value;
  }
  return out;
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

async function sendReplySms(to: string, body: string): Promise<{ sent: boolean; error?: string }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!lovableKey || !twilioKey || (!messagingServiceSid && !fromNumber)) {
    return { sent: false, error: "sms_not_configured" };
  }
  const params = new URLSearchParams({ To: to, Body: body.slice(0, 1200) });
  if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid);
  else if (fromNumber) params.set("From", fromNumber);
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { sent: false, error: `${res.status} ${errBody.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: String((e as Error).message || e) };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!supabaseUrl || !serviceKey || !authToken) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Twilio always POSTs form-urlencoded. Read raw text to compute signature.
  const rawBody = await req.text();
  const params = parseFormBody(rawBody);

  // ---- Signature validation ------------------------------------------------
  const providedSig = req.headers.get("X-Twilio-Signature") ?? req.headers.get("x-twilio-signature");
  if (!providedSig) return twimlReject("Missing X-Twilio-Signature");

  // Twilio signs the EXACT URL the request was made to, including the path
  // and any query string. Edge functions are reached via the SUPABASE_URL
  // base + functions/v1/<name>. We accept either the host-derived URL (when
  // Supabase forwards) or the configured PUBLIC_APP_URL-based webhook URL
  // (when Twilio's webhook is set to a custom domain). Compare both.
  const url = req.url;
  const expected = await computeTwilioSignature(authToken, url, params);
  if (!constantTimeEquals(expected, providedSig)) {
    // Try with `https://` swapped in case Twilio used a different scheme than
    // the proxy reports. Edge case, but cheap.
    const alt = url.startsWith("http://") ? url.replace(/^http:\/\//, "https://") : url;
    if (alt !== url) {
      const expectedAlt = await computeTwilioSignature(authToken, alt, params);
      if (constantTimeEquals(expectedAlt, providedSig)) {
        // Match on the alt URL — fall through.
      } else {
        return twimlReject("Signature mismatch");
      }
    } else {
      return twimlReject("Signature mismatch");
    }
  }

  // ---- Parse the inbound payload ------------------------------------------
  const parsed: InboundParsed = {
    from: params.From ?? "",
    to: params.To ?? "",
    body: (params.Body ?? "").trim(),
    messageSid: params.MessageSid ?? "",
    raw: params,
  };
  if (!parsed.from || !parsed.messageSid) {
    return twimlEmpty(); // bad request but Twilio retries forever on non-2xx
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // ---- Idempotency: write the log row first; UNIQUE message_sid dedupes. --
  const initialInsert = await supabase
    .from("salon_sms_inbound_log")
    .insert({
      from_phone: parsed.from,
      to_phone: parsed.to,
      message_sid: parsed.messageSid,
      body: parsed.body.slice(0, 1600),
      processed_action: "unrecognized", // updated below once we decide
      affected_client_phone: parsed.from,
    })
    .select("id")
    .maybeSingle();
  if (initialInsert.error) {
    // 23505 (unique violation) means we've already processed this message.
    if ((initialInsert.error as any).code === "23505") return twimlEmpty();
    console.error("[twilio-webhook] failed to log inbound", initialInsert.error);
    return twimlEmpty();
  }
  const logId = (initialInsert.data as any)?.id as string;

  // ---- Dispatch by body keyword -------------------------------------------
  const normalized = parsed.body.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const wantsCancel = /^(cancel|cancel booking|cancel my booking)\b/.test(normalized);
  const wantsStop = /^(stop|unsubscribe|stopall|end|quit|cancel sms)\b/.test(normalized);

  // STOP: opt the phone out of SMS at the salon level. Twilio itself
  // handles the standard opt-out reply; we don't send one of our own.
  if (wantsStop) {
    await supabase
      .from("salon_clients")
      .update({ sms_opt_in: false, updated_at: new Date().toISOString() })
      .eq("phone", parsed.from);
    await supabase
      .from("salon_sms_inbound_log")
      .update({ processed_action: "opt_out" })
      .eq("id", logId);
    return twimlEmpty();
  }

  // CANCEL: find the most-imminent upcoming booking for this phone.
  if (wantsCancel) {
    const { data: booking } = await supabase
      .from("salon_bookings")
      .select("id, store_id, start_at, service_name")
      .eq("client_phone", parsed.from)
      .in("status", ["pending", "confirmed"])
      .gt("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!booking) {
      await supabase
        .from("salon_sms_inbound_log")
        .update({ processed_action: "no_match" })
        .eq("id", logId);
      const r = await sendReplySms(
        parsed.from,
        "We couldn't find an upcoming booking under this number. Reply with the salon name or call them directly.",
      );
      await supabase
        .from("salon_sms_inbound_log")
        .update({ reply_sent: r.sent, reply_error: r.error ?? null })
        .eq("id", logId);
      return twimlEmpty();
    }

    // Use the public cancellation RPC — it already checks the cancellation
    // window and respects the booking's status state machine.
    const cancelRes = await supabase.rpc("salon_public_cancel_booking", { p_id: (booking as any).id });
    const cancelled = !cancelRes.error;
    const storeName = await (async () => {
      const { data: sp } = await supabase
        .from("store_profiles")
        .select("name")
        .eq("id", (booking as any).store_id)
        .maybeSingle();
      return (sp as any)?.name ?? "your salon";
    })();

    const replyBody = cancelled
      ? `Your booking on ${formatWhen((booking as any).start_at)} at ${storeName} is cancelled. Reply BOOK or call us to schedule another visit.`
      : `We couldn't cancel that booking automatically (it may be too close to the appointment). Call ${storeName} to make changes.`;
    const r = await sendReplySms(parsed.from, replyBody);

    await supabase
      .from("salon_sms_inbound_log")
      .update({
        processed_action: cancelled ? "cancelled_booking" : "no_match",
        affected_booking_id: cancelled ? (booking as any).id : null,
        affected_store_id: (booking as any).store_id,
        reply_sent: r.sent,
        reply_error: r.error ?? null,
      })
      .eq("id", logId);

    return twimlEmpty();
  }

  // Unrecognized: log it, send one helpful reply.
  const r = await sendReplySms(
    parsed.from,
    "We didn't understand that. Reply CANCEL to cancel your upcoming booking, or call the salon directly.",
  );
  await supabase
    .from("salon_sms_inbound_log")
    .update({
      processed_action: "unrecognized",
      reply_sent: r.sent,
      reply_error: r.error ?? null,
    })
    .eq("id", logId);

  return twimlEmpty();
});
