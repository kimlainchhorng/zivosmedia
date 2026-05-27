/**
 * ChannelPostInsights
 * -------------------
 * Owner/admin-only summary card under a channel post: views, unique
 * reactions, comment count, top emoji breakdown, and a 7-day micro-bar of
 * views (if `channel_post_views` has timestamped rows).
 *
 * Renders inside ChannelPostCard when `canManage` is true. Collapsed by
 * default — tap "Insights" to expand.
 */
import { useEffect, useState } from "react";
import { BarChart3, Eye, Heart, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ChannelPost } from "@/hooks/useChannel";

interface Props {
  post: ChannelPost;
}

interface DailyBucket {
  day: string; // YYYY-MM-DD
  count: number;
}

export default function ChannelPostInsights({ post }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uniqueViewers, setUniqueViewers] = useState<number | null>(null);
  const [reactionBreakdown, setReactionBreakdown] = useState<{ emoji: string; count: number }[]>([]);
  const [daily, setDaily] = useState<DailyBucket[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Unique viewers + 7-day distribution
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
        const { data: views } = await (supabase as any)
          .from("channel_post_views")
          .select("user_id, viewed_at")
          .eq("post_id", post.id)
          .gte("viewed_at", sevenDaysAgo);

        if (!cancelled) {
          const uniq = new Set((views ?? []).map((v: any) => v.user_id));
          setUniqueViewers(uniq.size);

          const buckets = new Map<string, number>();
          for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400_000);
            buckets.set(d.toISOString().slice(0, 10), 0);
          }
          for (const v of views ?? []) {
            const day = String(v.viewed_at).slice(0, 10);
            if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
          }
          setDaily(Array.from(buckets.entries()).map(([day, count]) => ({ day, count })));
        }

        // Reaction emoji breakdown — read directly so the chart matches
        // ChannelPostCard's live counter.
        const { data: reactions } = await (supabase as any)
          .from("channel_post_reactions")
          .select("emoji")
          .eq("post_id", post.id);
        if (!cancelled) {
          const counts = new Map<string, number>();
          for (const r of reactions ?? []) {
            counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
          }
          setReactionBreakdown(
            Array.from(counts.entries())
              .map(([emoji, count]) => ({ emoji, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 6)
          );
        }
      } catch (e) {
        console.error("[ChannelPostInsights] load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, post.id]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        Insights
      </button>
    );
  }

  const maxDaily = Math.max(1, ...daily.map((d) => d.count));

  return (
    <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-primary" /> Post insights
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Hide
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md bg-background p-2">
              <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                <Eye className="w-3 h-3" /> Views
              </div>
              <p className="text-base font-bold tabular-nums mt-0.5">{post.view_count}</p>
              {uniqueViewers != null && (
                <p className="text-[10px] text-muted-foreground">{uniqueViewers} unique · 7d</p>
              )}
            </div>
            <div className="rounded-md bg-background p-2">
              <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                <Heart className="w-3 h-3" /> Reactions
              </div>
              <p className="text-base font-bold tabular-nums mt-0.5">
                {reactionBreakdown.reduce((sum, r) => sum + r.count, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">{reactionBreakdown.length} kinds</p>
            </div>
            <div className="rounded-md bg-background p-2">
              <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                <MessageCircle className="w-3 h-3" /> Comments
              </div>
              <p className="text-base font-bold tabular-nums mt-0.5">{post.comments_count ?? 0}</p>
            </div>
          </div>

          {/* 7-day view sparkline */}
          {daily.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Views · last 7 days
              </p>
              <div className="flex items-end gap-1 h-12">
                {daily.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full bg-primary/60 rounded-sm"
                      style={{ height: `${Math.max(2, (d.count / maxDaily) * 100)}%` }}
                      title={`${d.day}: ${d.count}`}
                    />
                    <span className="text-[8px] text-muted-foreground">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reaction breakdown chips */}
          {reactionBreakdown.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Top reactions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {reactionBreakdown.map((r) => (
                  <span
                    key={r.emoji}
                    className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px]"
                  >
                    <span>{r.emoji}</span>
                    <span className="font-semibold tabular-nums">{r.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
