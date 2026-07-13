/**
 * channel-publish-scheduled
 * -------------------------
 * Invoked every minute by pg_cron. Two responsibilities:
 *   1. Flip channel_posts.published_at = now() for every row whose
 *      scheduled_for has elapsed and that has not yet been published.
 *   2. For each post just transitioned, fan-out an in_app notification
 *      row to every subscriber of that channel whose `notifications_on`
 *      flag is still true (skipping the author).
 *
 * Idempotent: the WHERE clause guarantees we only ever flip a post once,
 * and we only fan-out for the rows we actually flipped in this run.
 */
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const provided = url.searchParams.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
  const expected = Deno.env.get("CRON_SECRET") ?? "";
  if (expected && provided !== expected) {
    if (!req.headers.get("authorization")) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Promote due posts and capture which rows we just flipped.
  const { data: flipped, error } = await supabase
    .from("channel_posts")
    .update({ published_at: new Date().toISOString() })
    .is("published_at", null)
    .lte("scheduled_for", new Date().toISOString())
    .select("id, channel_id, author_id, body");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const flippedRows = flipped ?? [];

  // 2. Fan-out notifications for the rows we just promoted.
  let totalNotified = 0;
  if (flippedRows.length > 0) {
    const channelIds = Array.from(new Set(flippedRows.map((p: any) => p.channel_id)));
    const { data: channels } = await supabase
      .from("channels")
      .select("id, name, handle")
      .in("id", channelIds);
    const chMap = new Map<string, { name: string; handle: string }>();
    (channels ?? []).forEach((c: any) => chMap.set(c.id, { name: c.name, handle: c.handle }));

    for (const post of flippedRows as any[]) {
      const ch = chMap.get(post.channel_id);
      if (!ch) continue;

      const { data: subs } = await supabase
        .from("channel_subscribers")
        .select("user_id, notifications_on")
        .eq("channel_id", post.channel_id);

      const recipients = (subs ?? [])
        .filter((s: any) => s.notifications_on !== false && s.user_id !== post.author_id)
        .map((s: any) => s.user_id);

      if (recipients.length === 0) continue;

      const actionUrl = ch.handle ? `/c/${ch.handle}` : `/channels`;
      const rows = recipients.map((uid: string) => ({
        user_id: uid,
        channel: "in_app" as const,
        category: "social" as const,
        template: "channel_post",
        title: ch.name,
        body: (post.body ?? "Posted in channel").slice(0, 140),
        action_url: actionUrl,
        status: "sent" as const,
        metadata: { channel_id: post.channel_id, post_id: post.id, handle: ch.handle },
      }));

      const { error: notifyErr } = await supabase.from("notifications").insert(rows);
      if (notifyErr) {
        console.warn("[channel-publish-scheduled] notify insert failed", notifyErr.message);
        continue;
      }
      totalNotified += rows.length;

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
            body: (post.body ?? "Posted in channel").slice(0, 140),
            data: { channel_id: post.channel_id, post_id: post.id, handle: ch.handle, url: actionUrl },
          }),
        });
      } catch (e) {
        console.warn("[channel-publish-scheduled] push fanout failed", String(e));
      }
    }
  }

  return new Response(
    JSON.stringify({
      published: flippedRows.length,
      notified: totalNotified,
      ts: new Date().toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
