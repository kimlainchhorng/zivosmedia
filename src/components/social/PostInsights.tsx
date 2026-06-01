/**
 * PostInsights — analytics drawer surfaced from the 3-dot menu when the
 * caller is the post author. Shows views / likes / reactions / comments /
 * shares / reposts, plus a tiny breakdown of the top reactions.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Eye from "lucide-react/dist/esm/icons/eye";
import Heart from "lucide-react/dist/esm/icons/heart";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Repeat2 from "lucide-react/dist/esm/icons/repeat-2";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Zap from "lucide-react/dist/esm/icons/zap";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Target from "lucide-react/dist/esm/icons/target";
import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right";
import X from "lucide-react/dist/esm/icons/x";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  postId: string;
  source: "store" | "user";
}

interface Stats {
  views: number;
  likes: number;
  reactions: { emoji: string; count: number }[];
  comments: number;
  shares: number;
  reposts: number;
  bookmarks: number;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function PostInsights({ open, onClose, postId, source }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!open) {
      setStats(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Pull from the post row + the action tables in parallel
      const table = source === "user" ? "user_posts" : "store_posts";
      const viewsCol = source === "user" ? "views_count" : "view_count";

      const [
        { data: post },
        { data: reactionRows },
        { count: bookmarkCount },
      ] = await Promise.all([
        (supabase as any)
          .from(table)
          .select(`${viewsCol}, likes_count, comments_count, shares_count, reposts_count`)
          .eq("id", postId)
          .maybeSingle(),
        (supabase as any)
          .from("post_reactions")
          .select("emoji")
          .eq("post_id", postId)
          .eq("source", source),
        (supabase as any)
          .from("post_bookmarks")
          .select("id", { count: "exact", head: true })
          .eq("post_id", postId)
          .eq("source", source),
      ]);

      if (cancelled) return;

      const counts = new Map<string, number>();
      for (const r of (reactionRows ?? [])) {
        counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
      }
      const reactions = Array.from(counts.entries())
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        views:     post?.[viewsCol] ?? 0,
        likes:     post?.likes_count ?? 0,
        comments:  post?.comments_count ?? 0,
        shares:    post?.shares_count ?? 0,
        reposts:   post?.reposts_count ?? 0,
        bookmarks: bookmarkCount ?? 0,
        reactions,
      });
    })();
    return () => { cancelled = true; };
  }, [open, postId, source]);

  const totalInteractions = stats
    ? stats.likes + stats.comments + stats.shares + stats.reposts + stats.bookmarks
    : 0;
  const engagementRate = stats && stats.views > 0
    ? ((totalInteractions / stats.views) * 100).toFixed(1)
    : null;
  const topReaction = stats?.reactions[0] ?? null;
  const healthLabel = engagementRate
    ? Number(engagementRate) >= 8
      ? "Strong"
      : Number(engagementRate) >= 3
        ? "Building"
        : "Warming"
    : "Collecting";
  const saveRate = stats && stats.views > 0
    ? ((stats.bookmarks / stats.views) * 100).toFixed(1)
    : "0.0";
  const sourceLabel = source === "store" ? "Shop post" : "Creator post";
  const reactionTotal = stats?.reactions.reduce((sum, reaction) => sum + reaction.count, 0) ?? 0;
  const topReactionShare = topReaction && reactionTotal > 0
    ? Math.round((topReaction.count / reactionTotal) * 100)
    : 0;
  const nextMove = stats
    ? stats.comments === 0
      ? {
          label: "Ask a question",
          detail: "Prompt replies in the caption or pin a first comment.",
          accent: "text-emerald-500",
        }
      : stats.shares > stats.bookmarks
        ? {
            label: "Add a save hook",
            detail: "Turn this into a checklist, route, product list, or mini guide.",
            accent: "text-amber-500",
          }
        : stats.likes > stats.shares + stats.reposts
          ? {
              label: "Push sharing",
              detail: "Invite people to send it to someone who would use it today.",
              accent: "text-sky-500",
            }
          : {
              label: "Keep the format",
              detail: "This mix is balanced enough to repeat with a new angle.",
              accent: "text-primary",
            }
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="zivo-social-sheet-panel w-full max-w-md overflow-hidden rounded-t-[1.75rem] p-0 sm:max-w-lg sm:rounded-[1.75rem]"
            initial={{ y: 400, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/25 shadow-[0_0_12px_hsl(var(--foreground)/0.12)] sm:hidden" />
              <div className="zivo-social-header-glass rounded-[1.25rem] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold leading-tight">Post insights</h3>
                    <p className="truncate text-[11px] font-medium text-muted-foreground">
                      Views, reactions, comments, saves, and shares
                    </p>
                  </div>
                  {engagementRate && (
                    <span className="zivo-social-chip-active rounded-full px-3 py-1.5 text-[11px] font-bold">
                      {engagementRate}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close post insights"
                    className="zivo-social-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="max-h-[calc(90vh-5rem)] overflow-y-auto px-3 pb-3 pt-3 scrollbar-none"
              style={{ paddingBottom: "max(1rem, var(--zivo-safe-bottom,0px))" }}
            >
              {!stats ? (
              <div className="zivo-social-module flex flex-col items-center justify-center rounded-[1.25rem] px-4 py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="mt-3 text-xs font-semibold">Loading insights</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="zivo-social-share-preview flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Insight summary</p>
                    <p className="truncate text-sm font-bold text-foreground">
                      {healthLabel} engagement across {formatNum(totalInteractions)} actions
                    </p>
                  </div>
                  <span className="zivo-social-chip shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black text-primary">
                    {sourceLabel}
                  </span>
                </div>
                {nextMove && (
                  <div className="zivo-social-module relative overflow-hidden rounded-[1.25rem] p-3">
                    <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
                    <div className="flex items-start gap-3">
                      <span className="zivo-social-share-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                        <Target className={cn("h-5 w-5", nextMove.accent)} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Next move</p>
                          <span className="zivo-social-chip-active rounded-full px-2 py-0.5 text-[9px] font-black">Smart cue</span>
                        </div>
                        <p className="mt-1 text-sm font-black text-foreground">{nextMove.label}</p>
                        <p className="mt-0.5 text-xs font-semibold leading-relaxed text-muted-foreground">{nextMove.detail}</p>
                      </div>
                      <span className="zivo-social-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                        <ArrowUpRight className="h-4 w-4 text-primary" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                )}
                <div className="zivo-social-module rounded-[1.25rem] p-3">
                  <div className="flex items-center gap-3">
                    <span className="zivo-social-share-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Engagement health</p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums">
                        {engagementRate ? `${engagementRate}%` : "0.0%"}
                      </p>
                    </div>
                    <div className="zivo-social-module-tile rounded-2xl px-3 py-2 text-right">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Actions</p>
                      <p className="text-sm font-bold tabular-nums">{formatNum(totalInteractions)}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary to-fuchsia-500"
                      style={{ width: `${Math.min(Number(engagementRate ?? 0), 100)}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="zivo-social-module-tile rounded-2xl px-3 py-2">
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Health
                      </div>
                      <p className="truncate text-sm font-black text-foreground">{healthLabel}</p>
                    </div>
                    <div className="zivo-social-module-tile rounded-2xl px-3 py-2">
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        <Bookmark className="h-3 w-3 text-amber-500" />
                        Save rate
                      </div>
                      <p className="truncate text-sm font-black tabular-nums text-foreground">{saveRate}%</p>
                    </div>
                    <div className="zivo-social-module-tile rounded-2xl px-3 py-2">
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        <Zap className="h-3 w-3 text-primary" />
                        Reaction
                      </div>
                      <p className="truncate text-sm font-black text-foreground">
                        {topReaction ? `${topReaction.emoji} ${topReactionShare}%` : "None"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Tile icon={<Eye          className="h-4 w-4 text-blue-500" />}    label="Views"     value={formatNum(stats.views)} />
                  <Tile icon={<Heart        className="h-4 w-4 text-red-500" />}     label="Likes"     value={formatNum(stats.likes)} />
                  <Tile icon={<MessageCircle className="h-4 w-4 text-emerald-500" />} label="Comments"  value={formatNum(stats.comments)} />
                  <Tile icon={<Share2       className="h-4 w-4 text-foreground" />}  label="Shares"    value={formatNum(stats.shares)} />
                  <Tile icon={<Repeat2      className="h-4 w-4 text-emerald-600" />} label="Reposts"   value={formatNum(stats.reposts)} />
                  <Tile icon={<Bookmark     className="h-4 w-4 text-amber-500" />}   label="Saves"     value={formatNum(stats.bookmarks)} />
                </div>

                <div className="zivo-social-module rounded-[1.25rem] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Reaction mix</p>
                      <p className="text-[11px] text-muted-foreground">
                        {topReaction ? `${topReaction.emoji} is leading` : "No emoji reactions yet"}
                      </p>
                    </div>
                    <span className="zivo-social-share-orb flex h-9 w-9 items-center justify-center rounded-2xl">
                      <Zap className="h-4 w-4 text-primary" />
                    </span>
                  </div>
                  {stats.reactions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {stats.reactions.map((r) => (
                        <span key={r.emoji} className="zivo-social-chip inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm">
                          <span className="leading-none">{r.emoji}</span>
                          <span className="text-xs font-semibold">{r.count}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="zivo-social-module-tile rounded-2xl px-3 py-3 text-xs font-medium text-muted-foreground">
                      Emoji reactions will appear here when people react to the post.
                    </p>
                  )}
                </div>
              </div>
            )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="zivo-social-module-tile rounded-2xl p-3 transition-all hover:-translate-y-0.5 active:scale-[0.99] sm:p-2.5">
      <div className="mb-2 flex items-center justify-between gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/60">
          {icon}
        </span>
      </div>
      <div className={cn("text-xl font-bold tabular-nums sm:text-lg", value.length > 4 && "text-lg sm:text-base")}>{value}</div>
    </div>
  );
}
