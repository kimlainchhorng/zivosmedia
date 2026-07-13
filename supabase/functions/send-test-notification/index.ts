/**
 * send-test-notification
 * ----------------------
 * Admin-only edge function that fires a synthetic notification through the
 * full notify-dispatch pipeline (push + email + SMS + inbox) and returns a
 * per-channel result map plus a provider-configuration diagnostic. Use it
 * from the /admin/notifications/analytics page to verify deliverability
 * end-to-end without waiting for a real event.
 *
 * Body:
 *   {
 *     channels?:    ("inbox"|"push"|"email"|"sms")[]   // default: all four
 *     target_user?: uuid                                // default: caller
 *   }
 *
 * Auth: caller must be an admin (public.is_admin) — verified via the user's
 * JWT, not service-role.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const j = (headers: Record<string, string>, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

interface Body {
  channels?: ("inbox" | "push" | "email" | "sms")[];
  target_user?: string;
}

serve(withSecurity("send-test-notification", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j(corsHeaders, 405, { error: "Method not allowed" });

  const auth = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return j(corsHeaders, 500, { error: "Server misconfigured" });
  }
  if (!auth.startsWith("Bearer ")) return j(corsHeaders, 401, { error: "Authentication required" });

  // Identify caller via their JWT.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(
    auth.replace("Bearer ", ""),
  );
  if (userErr || !userData?.user?.id) return j(corsHeaders, 401, { error: "Authentication required" });
  const callerId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdminRow } = await admin.rpc("is_admin", { user_uuid: callerId });
  if (!isAdminRow) return j(corsHeaders, 403, { error: "Admin only" });

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body */
  }

  const channels = body.channels && body.channels.length > 0
    ? body.channels
    : (["inbox", "push", "email", "sms"] as const);
  const targetUser = body.target_user ?? callerId;

  // Provider configuration diagnostic — surfaced in the response so admins
  // can immediately see why a channel might silently no-op.
  const diagnostics = {
    fcm:    !!Deno.env.get("FCM_SERVICE_ACCOUNT_JSON"),
    apns:   !!(Deno.env.get("APNS_KEY_ID") && Deno.env.get("APNS_TEAM_ID") && Deno.env.get("APNS_PRIVATE_KEY")),
    vapid:  !!(Deno.env.get("VAPID_PUBLIC_KEY") && Deno.env.get("VAPID_PRIVATE_KEY") && Deno.env.get("VAPID_SUBJECT")),
    resend: !!Deno.env.get("RESEND_API_KEY"),
    twilio: !!(
      (Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN") && (Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_MESSAGING_SERVICE_SID"))) ||
      (Deno.env.get("LOVABLE_API_KEY") && Deno.env.get("TWILIO_API_KEY") && Deno.env.get("TWILIO_FROM_NUMBER"))
    ),
  };

  // Fire through notify-dispatch so we exercise the actual production path.
  const dispatchRes = await fetch(`${supabaseUrl}/functions/v1/notify-dispatch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: targetUser,
      event_type: "admin_test_notification",
      title: "Zivo test notification",
      body: `Sent at ${new Date().toLocaleTimeString()} from admin diagnostics.`,
      data: { url: "/admin/notifications/analytics", source: "admin_test" },
      channels,
      category: "transactional",
    }),
  });

  let dispatch: unknown = null;
  try {
    dispatch = await dispatchRes.json();
  } catch {
    /* keep null */
  }

  return j(corsHeaders, 200, {
    success: dispatchRes.ok,
    target_user: targetUser,
    channels,
    diagnostics,
    dispatch,
  });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
