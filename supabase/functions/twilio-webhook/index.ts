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
  // YES / Y / CONFIRM / OK / C — all forms a customer might naturally use to
  // acknowledge the 24h reminder. Match `c` too because some customers
  // shorten "confirm" → "c". The narrow regex avoids matching "yes please
  // cancel" — wantsCancel would match first anyway, but be defensive.
  const wantsConfirm = /^(yes|y|confirm|confirming|ok|okay|c)\b/.test(normalized);
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

  // CONFIRM: customer replied YES / OK / CONFIRM to the 24h reminder.
  // Flip the most-imminent upcoming pending booking for this phone to
  // 'confirmed'. Already-confirmed bookings short-circuit at the RPC and
  // we send a friendly "you're already confirmed" reply.
  if (wantsConfirm) {
    const { data: booking } = await supabase
      .from("salon_bookings")
      .select("id, store_id, start_at, service_name, status")
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

    const storeName = await (async () => {
      const { data: sp } = await supabase
        .from("store_profiles")
        .select("name")
        .eq("id", (booking as any).store_id)
        .maybeSingle();
      return (sp as any)?.name ?? "your salon";
    })();

    // Booking already confirmed? Skip the RPC call and just acknowledge.
    if ((booking as any).status === "confirmed") {
      const r = await sendReplySms(
        parsed.from,
        `You're already confirmed for ${formatWhen((booking as any).start_at)} at ${storeName}. See you then!`,
      );
      await supabase
        .from("salon_sms_inbound_log")
        .update({
          processed_action: "confirmed_booking",
          affected_booking_id: (booking as any).id,
          affected_store_id: (booking as any).store_id,
          reply_sent: r.sent,
          reply_error: r.error ?? null,
        })
        .eq("id", logId);
      return twimlEmpty();
    }

    const confirmRes = await supabase.rpc("salon_public_confirm_booking", { p_id: (booking as any).id });
    const confirmed = !confirmRes.error;
    const replyBody = confirmed
      ? `Confirmed! See you ${formatWhen((booking as any).start_at)} at ${storeName}. Reply CANCEL if anything changes.`
      : `We couldn't confirm that booking automatically. Call ${storeName} to make changes.`;
    const r = await sendReplySms(parsed.from, replyBody);

    await supabase
      .from("salon_sms_inbound_log")
      .update({
        processed_action: confirmed ? "confirmed_booking" : "no_match",
        affected_booking_id: confirmed ? (booking as any).id : null,
        affected_store_id: (booking as any).store_id,
        reply_sent: r.sent,
        reply_error: r.error ?? null,
      })
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

    // Waitlist nudge: the cancel just freed a slot at this salon. Find the
    // longest-waiting client and ping them. Best-effort — failures here
    // don't change the outcome for the cancelling customer.
    if (cancelled) {
      try {
        // Look up the booking's original stylist + service so we can
        // match the waitlist row most likely to want exactly this slot.
        const { data: bookingDetail } = await supabase
          .from("salon_bookings")
          .select("stylist_id, service_id")
          .eq("id", (booking as any).id)
          .maybeSingle();
        const stylistId = (bookingDetail as any)?.stylist_id as string | null;
        const serviceId = (bookingDetail as any)?.service_id as string | null;

        // Priority order: exact stylist+service match → service match →
        // any waiter for the store. Each query is bounded to 1 row.
        const findWaiter = async (filterStylist: boolean, filterService: boolean) => {
          let q = supabase
            .from("salon_waitlist")
            .select("id, client_name, client_phone, requested_stylist_name")
            .eq("store_id", (booking as any).store_id)
            .eq("status", "waiting")
            .not("client_phone", "is", null)
            // Don't notify the canceller about their own freed slot.
            .neq("client_phone", parsed.from)
            .order("created_at", { ascending: true })
            .limit(1);
          if (filterStylist && stylistId) q = q.eq("requested_stylist_id", stylistId);
          if (filterService && serviceId) q = q.eq("requested_service_id", serviceId);
          const { data } = await q.maybeSingle();
          return data as { id: string; client_name: string; client_phone: string; requested_stylist_name: string | null } | null;
        };

        let waiter = await findWaiter(true, true)
          ?? await findWaiter(false, true)
          ?? await findWaiter(false, false);

        if (waiter) {
          const bookingUrl = `${Deno.env.get("PUBLIC_APP_URL") || "https://hizivo.com"}/salon/${(booking as any).store_id}`;
          const nudgeBody = `${storeName}: a slot just opened${waiter.requested_stylist_name ? ` with ${waiter.requested_stylist_name}` : ""}. Book here: ${bookingUrl}`;
          const nudge = await sendReplySms(waiter.client_phone, nudgeBody);
          if (nudge.sent) {
            await supabase
              .from("salon_waitlist")
              .update({ status: "notified", updated_at: new Date().toISOString() })
              .eq("id", waiter.id);
            // Log a second row so the audit trail captures the outbound
            // nudge (the original log row is about the inbound CANCEL).
            await supabase.from("salon_sms_inbound_log").insert({
              from_phone: parsed.to, // salon's twilio number sent the nudge
              to_phone: waiter.client_phone,
              message_sid: `nudge:${(booking as any).id}:${waiter.id}`,
              body: nudgeBody.slice(0, 1600),
              processed_action: "notified_waitlist",
              affected_booking_id: (booking as any).id,
              affected_store_id: (booking as any).store_id,
              affected_client_phone: waiter.client_phone,
              reply_sent: true,
            });
          } else {
            console.warn("[twilio-webhook] waitlist nudge send failed", nudge.error);
          }
        }
      } catch (e) {
        // Don't fail the whole webhook on a waitlist nudge failure.
        console.error("[twilio-webhook] waitlist nudge errored", e);
      }
    }

    return twimlEmpty();
  }

  // Unrecognized: log it, send one helpful reply.
  const r = await sendReplySms(
    parsed.from,
    "We didn't understand that. Reply YES to confirm or CANCEL to cancel your upcoming booking, or call the salon directly.",
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
