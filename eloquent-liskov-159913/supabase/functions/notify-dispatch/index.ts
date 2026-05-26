/**
 * notify-dispatch
 * ---------------
 * Single fan-out point for user-facing notifications across the super-app.
 *
 * Inputs (JSON):
 *   {
 *     user_id:        uuid (required)
 *     event_type:     string (e.g. "chat_message", "ride_driver_assigned",
 *                     "eats_order_confirmed", "lodge_booking_confirmed",
 *                     "flight_booking_confirmed", "social_follow",
 *                     "social_like", "social_comment", "social_mention",
 *                     "channel_post", "wallet_received", "bot_reply", ...)
 *     title:          string (required)
 *     body?:          string
 *     data?:          { ...deeplink payload }
 *     channels?:      ("push" | "email" | "sms" | "inbox")[]   // override
 *     email?:         { recipient, template, data, idempotencyKey }
 *     sms?:           { phone_e164, body }
 *     image_url?:     string
 *     category?:      "transactional" | "marketing" | "social" | "chat"
 *     idempotency_key?: string
 *   }
 *
 * Behavior:
 *   1. Reads user's notification_preferences (push/email/sms toggles + per-event flags + quiet hours).
 *   2. Inserts an `inbox` row into public.notifications (so the bell badge updates).
 *   3. Calls send-push-notification, send-transactional-email, send-sms in parallel
 *      (only the channels that are enabled and have credentials).
 *   4. Returns a per-channel result map.
 *
 * Auth: accepts service-role JWT (internal callers, triggers via pg_net, other
 * edge functions) or an authenticated user JWT (in which case user_id is
 * forced to auth.uid() to prevent spoofing).
 */
import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Channel = "push" | "email" | "sms" | "inbox";

interface DispatchRequest {
  user_id: string;
  event_type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  channels?: Channel[];
  email?: {
    recipient?: string;
    template?: string;
    data?: Record<string, unknown>;
    idempotencyKey?: string;
  };
  sms?: { phone_e164?: string; body?: string };
  image_url?: string;
  category?: "transactional" | "marketing" | "social" | "chat";
  idempotency_key?: string;
}

const j = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Map event_type → notification_preferences boolean column (when applicable).
// Anything not listed defaults to "transactional" which respects the master push/email/sms toggles only.
function prefFlagForEvent(event: string): string | null {
  if (event.startsWith("chat_") || event === "bot_reply") return "messages";
  if (event === "social_like") return "likes";
  if (event === "social_comment") return "comments";
  if (event === "social_follow") return "follows";
  if (event === "social_mention") return "mentions";
  if (event === "social_story" || event === "story_reply") return "stories";
  if (event === "group_invite") return "group_invites";
  if (event === "post_from_following") return "post_from_following";
  if (event === "marketing") return "marketing";
  return null; // transactional — always-on (subject to master toggles)
}

function isWithinQuietHours(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  // start/end are TIME strings in user's timezone. Best-effort: use UTC.
  const now = new Date();
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":");
    return Number(h) * 60 + Number(m || 0);
  };
  const s = toMin(start);
  const e = toMin(end);
  if (s === e) return false;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return j(500, { error: "Server misconfigured" });
  }
  if (!authHeader.startsWith("Bearer ")) {
    return j(401, { error: "Authentication required" });
  }

  const isServiceCall = authHeader === `Bearer ${serviceKey}`;
  const isAnonCall = authHeader === `Bearer ${anonKey}`;

  let callerUserId: string | null = null;
  if (!isServiceCall && !isAnonCall) {
    try {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (error || !data?.user?.id) return j(401, { error: "Authentication required" });
      callerUserId = data.user.id;
    } catch {
      return j(401, { error: "Authentication required" });
    }
  }

  let payload: DispatchRequest;
  try {
    payload = await req.json();
  } catch {
    return j(400, { error: "Invalid JSON body" });
  }

  if (!payload?.user_id || !payload.event_type || !payload.title) {
    return j(400, { error: "Missing required fields: user_id, event_type, title" });
  }

  // Non-service callers can only dispatch to themselves.
  if (callerUserId && payload.user_id !== callerUserId) {
    return j(403, { error: "Cannot dispatch notifications for another user" });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Idempotency: skip if we've already processed this key in the last 24h.
  if (payload.idempotency_key) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", payload.user_id)
      .eq("template", payload.idempotency_key)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();
    if (existing) {
      return j(200, { success: true, deduped: true });
    }
  }

  // Load user's prefs (best-effort — defaults applied if row missing).
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", payload.user_id)
    .maybeSingle();

  const pushEnabled = prefs?.push_enabled ?? true;
  const emailEnabled = prefs?.email_enabled ?? true;
  const smsEnabled = prefs?.sms_enabled ?? false;

  const flag = prefFlagForEvent(payload.event_type);
  const eventAllowed =
    !flag || prefs == null || (prefs as Record<string, unknown>)[flag] !== false;

  const inQuiet = isWithinQuietHours(
    prefs?.quiet_hours_start,
    prefs?.quiet_hours_end,
  );

  const requested = new Set<Channel>(
    payload.channels && payload.channels.length > 0
      ? payload.channels
      : ["inbox", "push"],
  );

  // Resolve recipient details for email/sms when not provided.
  let recipientEmail = payload.email?.recipient ?? null;
  let recipientPhone = payload.sms?.phone_e164 ?? null;
  if (
    (requested.has("email") && !recipientEmail) ||
    (requested.has("sms") && !recipientPhone)
  ) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("email, phone, phone_e164")
      .eq("id", payload.user_id)
      .maybeSingle();
    if (prof) {
      recipientEmail = recipientEmail ?? (prof as any).email ?? null;
      recipientPhone =
        recipientPhone ?? (prof as any).phone_e164 ?? (prof as any).phone ?? null;
    }
    if (!recipientEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(payload.user_id);
      recipientEmail = recipientEmail ?? authUser?.user?.email ?? null;
    }
  }

  const results: Record<string, unknown> = {};

  // ---- 1. Inbox row -------------------------------------------------------
  if (requested.has("inbox")) {
    try {
      const { data: inboxRow, error: inboxErr } = await supabase
        .from("notifications")
        .insert({
          user_id: payload.user_id,
          channel: "in_app",
          category: payload.category ?? "transactional",
          template: payload.idempotency_key ?? payload.event_type,
          title: payload.title,
          body: payload.body ?? "",
          action_url: (payload.data?.url as string) ?? null,
          status: "sent",
        })
        .select("id")
        .single();
      results.inbox = inboxErr ? { ok: false, error: inboxErr.message } : { ok: true, id: inboxRow?.id };
    } catch (err) {
      results.inbox = { ok: false, error: err instanceof Error ? err.message : "inbox_failed" };
    }
  }

  const tasks: Promise<void>[] = [];

  // ---- 2. Push ------------------------------------------------------------
  if (requested.has("push") && pushEnabled && eventAllowed && !inQuiet) {
    tasks.push(
      (async () => {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: payload.user_id,
            notification_type: payload.event_type,
            title: payload.title,
            body: payload.body,
            data: payload.data,
            image_url: payload.image_url,
          }),
        });
        results.push = { ok: r.ok, status: r.status, body: await safeJson(r) };
      })().catch((e) => {
        results.push = { ok: false, error: e?.message };
      }),
    );
  } else if (requested.has("push")) {
    results.push = { ok: false, skipped: true, reason: !pushEnabled ? "disabled" : !eventAllowed ? "event_muted" : "quiet_hours" };
  }

  // ---- 3. Email -----------------------------------------------------------
  if (requested.has("email") && emailEnabled && eventAllowed && recipientEmail) {
    tasks.push(
      (async () => {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateName: payload.email?.template ?? payload.event_type,
            recipientEmail,
            idempotencyKey: payload.email?.idempotencyKey ?? payload.idempotency_key,
            templateData: {
              title: payload.title,
              body: payload.body,
              event_type: payload.event_type,
              ...(payload.email?.data ?? {}),
              ...(payload.data ?? {}),
            },
          }),
        });
        results.email = { ok: r.ok, status: r.status, body: await safeJson(r) };
      })().catch((e) => {
        results.email = { ok: false, error: e?.message };
      }),
    );
  } else if (requested.has("email")) {
    results.email = { ok: false, skipped: true, reason: !emailEnabled ? "disabled" : !recipientEmail ? "no_recipient" : "event_muted" };
  }

  // ---- 4. SMS -------------------------------------------------------------
  if (requested.has("sms") && smsEnabled && eventAllowed && recipientPhone) {
    tasks.push(
      (async () => {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: recipientPhone,
            body: payload.sms?.body ?? `${payload.title}${payload.body ? `: ${payload.body}` : ""}`,
            user_id: payload.user_id,
            event_type: payload.event_type,
          }),
        });
        results.sms = { ok: r.ok, status: r.status, body: await safeJson(r) };
      })().catch((e) => {
        results.sms = { ok: false, error: e?.message };
      }),
    );
  } else if (requested.has("sms")) {
    results.sms = { ok: false, skipped: true, reason: !smsEnabled ? "disabled" : !recipientPhone ? "no_phone" : "event_muted" };
  }

  await Promise.all(tasks);

  return j(200, { success: true, event_type: payload.event_type, results });
});

async function safeJson(r: Response): Promise<unknown> {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
