// channel-broadcast — owner/admin posts a message to a channel, fans out push
// notifications to all subscribers via the existing device_tokens table.
import { createClient } from "../_shared/deps.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (isLikelyMaliciousBot(req.headers)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(supabase, ipHash)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (await isAbuseThresholdExceeded(supabase, u.user.id)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions. Try again in 24 hours." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { channel_id, body: text, media, scheduled_for } = body || {};
    if (!channel_id || (!text && !media)) {
      return new Response(JSON.stringify({ error: "channel_id and body or media required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof text === "string") {
      const linkScan = scanContentForLinks(text);
      if (!linkScan.ok) {
        logBlockedAttempt(supabase, {
          endpoint: "channel-broadcast",
          userId: u.user.id,
          urls: linkScan.blocked,
          text,
          ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
        });
        return new Response(
          JSON.stringify({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Verify caller is owner or admin
    const { data: ch } = await supabase
      .from("channels").select("id, owner_id, name, handle").eq("id", channel_id).maybeSingle();
    if (!ch) {
      return new Response(JSON.stringify({ error: "channel not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let canPost = ch.owner_id === u.user.id;
    if (!canPost) {
      const { data: sub } = await supabase
        .from("channel_subscribers")
        .select("role").eq("channel_id", channel_id).eq("user_id", u.user.id).maybeSingle();
      canPost = sub?.role === "admin" || sub?.role === "editor";
    }
    if (!canPost) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert post
    const publishNow = !scheduled_for;
    const { data: post, error: postErr } = await supabase
      .from("channel_posts")
      .insert({
        channel_id,
        author_id: u.user.id,
        body: text ?? null,
        media: media ?? null,
        scheduled_for: scheduled_for ?? null,
        published_at: publishNow ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (postErr) {
      return new Response(JSON.stringify({ error: postErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fan-out only when published immediately. Schedule path is handled by
    // the channel-publish-scheduled cron, which also runs the fan-out so
    // subscribers always learn about the post the moment it goes live —
    // not at insert time.
    let notified = 0;
    if (publishNow) {
      const { data: subs } = await supabase
        .from("channel_subscribers")
        .select("user_id, notifications_on")
        .eq("channel_id", channel_id);
      const recipients = (subs ?? [])
        .filter((s: any) => s.notifications_on !== false && s.user_id !== u.user.id)
        .map((s: any) => s.user_id);
      if (recipients.length) {
        const actionUrl = ch.handle ? `/c/${ch.handle}` : `/channels`;
        const rows = recipients.map((uid: string) => ({
          user_id: uid,
          channel: "in_app" as const,
          category: "social" as const,
          template: "channel_post",
          title: ch.name,
          body: (text ?? "Sent a new post").slice(0, 140),
          action_url: actionUrl,
          status: "sent" as const,
          metadata: { channel_id, post_id: post.id, handle: ch.handle },
        }));
        const { error: notifyErr } = await supabase.from("notifications").insert(rows);
        if (!notifyErr) notified = rows.length;
        else console.warn("[channel-broadcast] notify insert failed", notifyErr.message);

        // Batch push fan-out — best-effort, fire-and-forget.
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_ids: recipients,
              notification_type: "channel_post",
              title: ch.name,
              body: (text ?? "Sent a new post").slice(0, 140),
              data: { channel_id, post_id: post.id, handle: ch.handle, url: actionUrl },
            }),
          });
        } catch (e) {
          console.warn("[channel-broadcast] push fanout failed", String(e));
        }
      }
    }

    return new Response(JSON.stringify({ post_id: post.id, notified, scheduled: !publishNow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
