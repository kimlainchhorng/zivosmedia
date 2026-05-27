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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md md:max-w-lg rounded-t-3xl bg-background p-5 pb-8 shadow-2xl sm:rounded-3xl sm:pb-5 max-h-[90vh] overflow-y-auto"
            initial={{ y: 400, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "max(2rem, var(--zivo-safe-bottom,0px))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30 sm:hidden" />
            <h3 className="mb-3 text-base font-semibold">Post insights</h3>

            {!stats ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Tile icon={<Eye          className="h-4 w-4 text-blue-500" />}    label="Views"     value={formatNum(stats.views)} />
                  <Tile icon={<Heart        className="h-4 w-4 text-red-500" />}     label="Likes"     value={formatNum(stats.likes)} />
                  <Tile icon={<MessageCircle className="h-4 w-4 text-emerald-500" />} label="Comments"  value={formatNum(stats.comments)} />
                  <Tile icon={<Share2       className="h-4 w-4 text-foreground" />}  label="Shares"    value={formatNum(stats.shares)} />
                  <Tile icon={<Repeat2      className="h-4 w-4 text-emerald-600" />} label="Reposts"   value={formatNum(stats.reposts)} />
                  <Tile icon={<Bookmark     className="h-4 w-4 text-amber-500" />}   label="Saves"     value={formatNum(stats.bookmarks)} />
                </div>

                {stats.reactions.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Reactions breakdown</p>
                    <div className="flex flex-wrap gap-2">
                      {stats.reactions.map((r) => (
                        <span key={r.emoji} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm">
                          <span className="leading-none">{r.emoji}</span>
                          <span className="text-xs font-semibold">{r.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement rate */}
                {stats.views > 0 && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Engagement rate</p>
                    <p className="mt-0.5 text-lg font-bold">
                      {(((stats.likes + stats.comments + stats.shares + stats.reposts) / stats.views) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Interactions ÷ Views — higher is better.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3 sm:p-2.5 transition-colors hover:bg-muted/60">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl sm:text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
