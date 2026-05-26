/**
 * notifications-weekly-digest
 * ---------------------------
 * Runs every Monday at 09:00 UTC (scheduled via pg_cron). For each user
 * who had any activity in the past 7 days, dispatches a personalised
 * "Your week in Zivo" email + inbox card with:
 *
 *   • New followers (user_followers in last 7d)
 *   • Unread notifications count
 *   • Spend (food_orders + marketplace_orders totals last 7d)
 *   • Tip earnings (creator_tips received last 7d)
 *
 * Sent via notify-dispatch with category="marketing" so it respects the
 * user's marketing toggle (and their quiet-hours preference, even though
 * Monday 9am should rarely overlap quiet hours).
 *
 * Idempotency: keyed on `weekly_digest:<user_id>:<YYYY-WW>` (ISO week)
 * so re-running the cron the same week never double-sends.
 *
 * Auth: cron-secret OR service-role.
 */
import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const j = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function isoWeekStamp(d: Date): string {
  const target = new Date(d.valueOf());
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function fmt(n: number): string {
  if (!n) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtMoney(cents: number): string {
  if (!cents) return "$0";
  return `$${(cents / 100).toFixed(2)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return j(500, { error: "Server misconfigured" });

  // Auth: cron secret OR service role.
  const cronSecretExpected = Deno.env.get("CRON_SECRET") ?? "";
  const url = new URL(req.url);
  const providedSecret =
    url.searchParams.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const isService = auth === `Bearer ${serviceKey}`;
  const cronOk = !!cronSecretExpected && providedSecret === cronSecretExpected;
  if (!isService && !cronOk) return j(401, { error: "Unauthorized" });

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
  const weekStamp = isoWeekStamp(now);

  // 1. Identify "active" users — anyone who had activity in the last 7d.
  // We union from a few high-signal tables; fall back to recent profile
  // updates so brand-new users don't get a digest the same week they joined.
  const activeUserIds = new Set<string>();

  const collect = async (table: string, col: string) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(col)
        .gte("created_at", weekAgo)
        .limit(5000);
      if (error) return;
      for (const r of data ?? []) {
        const v = (r as Record<string, unknown>)[col];
        if (typeof v === "string") activeUserIds.add(v);
      }
    } catch {
      /* table may not exist in some envs */
    }
  };

  await Promise.all([
    collect("user_followers", "follower_id"),
    collect("user_followers", "following_id"),
    collect("food_orders", "customer_id"),
    collect("marketplace_orders", "buyer_id"),
    collect("creator_tips", "creator_id"),
    collect("creator_tips", "tipper_id"),
    collect("post_likes", "user_id"),
    collect("post_comments", "user_id"),
  ]);

  if (activeUserIds.size === 0) {
    return j(200, { ok: true, recipients: 0, week: weekStamp });
  }

  // Cap per-run for safety. The cron only runs once a week so unless you
  // have >5000 active users you'll never hit this.
  const recipients = Array.from(activeUserIds).slice(0, 5000);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  // 2. For each user, compute counts and dispatch.
  for (const uid of recipients) {
    try {
      const [followers, eats, market, tips, unread] = await Promise.all([
        supabase
          .from("user_followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", uid)
          .gte("created_at", weekAgo),
        supabase
          .from("food_orders")
          .select("total_amount")
          .eq("customer_id", uid)
          .gte("created_at", weekAgo),
        supabase
          .from("marketplace_orders")
          .select("total_cents")
          .eq("buyer_id", uid)
          .gte("created_at", weekAgo),
        supabase
          .from("creator_tips")
          .select("amount_cents")
          .eq("creator_id", uid)
          .gte("created_at", weekAgo),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("channel", "in_app")
          .eq("is_read", false),
      ]);

      const newFollowers = followers.count ?? 0;
      const eatsSum = (eats.data ?? []).reduce(
        (a: number, r: any) => a + (Number(r.total_amount) || 0),
        0,
      );
      const marketSumCents = (market.data ?? []).reduce(
        (a: number, r: any) => a + (Number(r.total_cents) || 0),
        0,
      );
      const tipSumCents = (tips.data ?? []).reduce(
        (a: number, r: any) => a + (Number(r.amount_cents) || 0),
        0,
      );
      const spendCents = Math.round(eatsSum * 100) + marketSumCents;
      const unreadCount = unread.count ?? 0;

      // Skip users with literally zero highlights to avoid spammy empty digests.
      if (
        newFollowers === 0 &&
        spendCents === 0 &&
        tipSumCents === 0 &&
        unreadCount === 0
      ) {
        skipped++;
        continue;
      }

      const bullets: string[] = [];
      if (newFollowers > 0) bullets.push(`👥 ${fmt(newFollowers)} new follower${newFollowers === 1 ? "" : "s"}`);
      if (unreadCount > 0) bullets.push(`🔔 ${fmt(unreadCount)} unread notification${unreadCount === 1 ? "" : "s"}`);
      if (spendCents > 0) bullets.push(`🧾 ${fmtMoney(spendCents)} spent`);
      if (tipSumCents > 0) bullets.push(`💝 ${fmtMoney(tipSumCents)} earned in tips`);

      const r = await fetch(`${supabaseUrl}/functions/v1/notify-dispatch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: uid,
          event_type: "weekly_digest",
          title: "Your week in Zivo",
          body: bullets.join("  •  "),
          data: { url: "/notifications", week: weekStamp },
          channels: ["inbox", "email"],
          category: "marketing",
          idempotency_key: `weekly_digest:${uid}:${weekStamp}`,
        }),
      });
      if (r.ok) sent++;
    } catch (e) {
      errors.push(`${uid}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return j(200, {
    ok: true,
    week: weekStamp,
    active: recipients.length,
    sent,
    skipped,
    errors: errors.slice(0, 20),
  });
});
