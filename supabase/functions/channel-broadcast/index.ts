// channel-broadcast — owner/admin posts a message to a channel, fans out push
// notifications to all subscribers via the existing device_tokens table.
import { createClient } from "../_shared/deps.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("channel-broadcast", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

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
    const { channel_id, body: text, media, scheduled_for, comments_enabled } = body || {};
    const normalizedText = typeof text === "string" ? text.trim() : "";
    const normalizedMedia = Array.isArray(media) ? media.filter(Boolean) : [];
    const scheduledFor = typeof scheduled_for === "string" && scheduled_for.trim() ? scheduled_for.trim() : null;

    if (!channel_id || (!normalizedText && normalizedMedia.length === 0)) {
      return new Response(JSON.stringify({ error: "channel_id and body or media required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (scheduledFor) {
      const scheduledAt = new Date(scheduledFor);
      if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        return new Response(JSON.stringify({ error: "scheduled_for must be a future ISO timestamp" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (normalizedText) {
      const linkScan = scanContentForLinks(normalizedText);
      if (!linkScan.ok) {
        logBlockedAttempt(supabase, {
          endpoint: "channel-broadcast",
          userId: u.user.id,
          urls: linkScan.blocked,
          text: normalizedText,
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
      .from("channels").select("id, owner_id, name, handle, slow_mode_seconds").eq("id", channel_id).maybeSingle();
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

    const publishNow = !scheduledFor;
    const slowModeSeconds = Number(ch.slow_mode_seconds || 0);
    if (publishNow && slowModeSeconds > 0) {
      const { data: lastPost } = await supabase
        .from("channel_posts")
        .select("published_at")
        .eq("channel_id", channel_id)
        .eq("author_id", u.user.id)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastPublishedAt = lastPost?.published_at ? new Date(lastPost.published_at).getTime() : 0;
      const waitMs = slowModeSeconds * 1000 - (Date.now() - lastPublishedAt);
      if (lastPublishedAt > 0 && waitMs > 0) {
        return new Response(JSON.stringify({
          error: "slow_mode_active",
          code: "slow_mode_active",
          message: `Slow mode is active. Try again in ${Math.ceil(waitMs / 1000)} seconds.`,
          retry_after_seconds: Math.ceil(waitMs / 1000),
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert post
    const { data: post, error: postErr } = await supabase
      .from("channel_posts")
      .insert({
        channel_id,
        author_id: u.user.id,
        body: normalizedText || null,
        media: normalizedMedia,
        comments_enabled: comments_enabled === false ? false : true,
        scheduled_for: scheduledFor,
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
          body: (normalizedText || "Sent a new post").slice(0, 140),
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
              body: (normalizedText || "Sent a new post").slice(0, 140),
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
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
