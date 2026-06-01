/**
 * TrendingHashtags — horizontal chip row of the most-used hashtags in the
 * current feed. Tapping a chip filters the feed to posts containing it.
 * Tapping the active chip again clears the filter.
 * All chips stay visible at all times so you can switch without clearing first.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import Hash from "lucide-react/dist/esm/icons/hash";
import X from "lucide-react/dist/esm/icons/x";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Layers3 from "lucide-react/dist/esm/icons/layers-3";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Gauge from "lucide-react/dist/esm/icons/gauge";
import { HASHTAG_RE } from "@/lib/social/hashtags";

interface FeedPostLike {
  caption?: string | null;
}

interface Props {
  posts: FeedPostLike[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
  /** Show at most this many tags. */
  limit?: number;
  /** "overlay" = absolute, dark background (Reels). "inline" = inline, theme-aware (Feed). */
  variant?: "overlay" | "inline";
}

function extractHashtags(posts: FeedPostLike[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    if (!p.caption) continue;
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    HASHTAG_RE.lastIndex = 0;
    while ((m = HASHTAG_RE.exec(p.caption)) !== null) {
      const tag = m[1].toLowerCase();
      if (seen.has(tag)) continue;
      seen.add(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export default function TrendingHashtags({ posts, selected, onSelect, limit = 12, variant = "overlay" }: Props) {
  const tags = useMemo(() => extractHashtags(posts).slice(0, limit), [posts, limit]);
  const totalMentions = tags.reduce((sum, item) => sum + item.count, 0);
  const topTag = tags[0]?.tag ?? selected ?? "";
  const activeTagCount = selected ? tags.find((item) => item.tag === selected)?.count : undefined;
  const topTagCount = tags[0]?.count ?? 0;
  const trendDensity = totalMentions > 0 ? Math.round((topTagCount / totalMentions) * 100) : 0;
  const trendDensityLabel = trendDensity >= 50 ? "Dominant tag" : trendDensity >= 25 ? "Focused mix" : "Wide mix";

  if (tags.length === 0 && !selected) return null;

  // ── Inline variant (theme-aware, e.g. ReelsFeedPage list) ─────────────────
  if (variant === "inline") {
    return (
      <div className="zivo-social-hashtag-rail overflow-hidden rounded-[1.25rem] px-2 py-2" style={{ scrollbarWidth: "none" }} aria-label="Trending hashtag filters">
        <div className="mb-2 grid grid-cols-3 gap-2">
          <span className="zivo-social-module-tile flex min-w-0 items-center gap-1.5 rounded-2xl px-2.5 py-2 text-[10px] font-black text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{tags.length} trends</span>
          </span>
          <span className="zivo-social-module-tile flex min-w-0 items-center gap-1.5 rounded-2xl px-2.5 py-2 text-[10px] font-black text-muted-foreground">
            <Layers3 className="h-3.5 w-3.5 shrink-0 text-fuchsia-500" aria-hidden="true" />
            <span className="truncate">{totalMentions} mentions</span>
          </span>
          <span className="zivo-social-module-tile flex min-w-0 items-center gap-1.5 rounded-2xl px-2.5 py-2 text-[10px] font-black text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            <span className="truncate">{selected ? "Filtered" : topTag || "Fresh"}</span>
          </span>
        </div>
        {(topTag || selected) && (
          <div className="zivo-social-share-preview mb-2 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary">
                <Hash className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  {selected ? "Active filter" : "Top trend"}
                </span>
                <span className="block truncate text-xs font-black text-foreground">#{selected || topTag}</span>
              </span>
            </span>
            <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
              {selected && activeTagCount ? `${activeTagCount} posts` : "Hot"}
            </span>
          </div>
        )}
        {tags.length > 1 && (
          <div className="zivo-social-module-tile mb-2 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                <Gauge className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  Trend density
                </span>
                <span className="block truncate text-xs font-black text-foreground">{trendDensityLabel}</span>
              </span>
            </span>
            <span className="zivo-social-chip shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black text-muted-foreground">
              {trendDensity}% top
            </span>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto scrollbar-none" role="list" aria-label="Hashtag chips">
          {/* "All" clear chip — only shown when a filter is active */}
          {selected && (
            <button type="button"
              onClick={() => onSelect(null)}
              className="zivo-social-hashtag-chip shrink-0 inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-bold text-foreground active:scale-95 sm:px-3 sm:py-1.5 sm:text-xs"
              aria-label="Clear hashtag filter and show all posts"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              All
            </button>
          )}
          {!selected && tags.length > 0 && (
            <div className="zivo-social-hashtag-lead shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Trending
            </div>
          )}
          {tags.map(({ tag, count }) => {
            const isActive = selected === tag;
            return (
              <button type="button"
                key={tag}
                onClick={() => onSelect(isActive ? null : tag)}
                className={[
                  "shrink-0 inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-bold transition-all active:scale-95 sm:px-3 sm:py-1.5 sm:text-xs",
                  isActive
                    ? "zivo-social-hashtag-chip-active"
                    : "zivo-social-hashtag-chip text-foreground",
                ].join(" ")}
                aria-label={isActive ? `Clear hashtag ${tag}` : `Filter by hashtag ${tag}, ${count} mentions`}
                aria-pressed={isActive}
              >
                {isActive ? (
                  <X className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Hash className="h-3 w-3 text-primary" aria-hidden="true" />
                )}
                {tag}
                <span className={isActive ? "text-[10px] font-extrabold tabular-nums text-primary-foreground/80" : "text-muted-foreground text-[10px] font-extrabold tabular-nums"}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Overlay variant (default, e.g. /reels TikTok-style page) ──────────────
  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute left-0 right-0 top-14 z-40 px-3"
      style={{ paddingTop: "var(--zivo-safe-top-overlay)" }}
    >
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {/* "All" clear chip — only when a filter is active */}
        {selected && (
          <button type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/18 px-3.5 py-2 text-[13px] font-extrabold text-white shadow-lg backdrop-blur-xl transition-all active:scale-95 sm:px-3 sm:py-1.5 sm:text-xs"
            aria-label="Clear hashtag filter and show all reels"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            All
          </button>
        )}
        {/* Trending label when nothing selected */}
        {!selected && tags.length > 0 && (
          <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/28 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/72 backdrop-blur-xl sm:py-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
            Trending
          </div>
        )}
        {tags.map(({ tag, count }) => {
          const isActive = selected === tag;
          return (
            <button type="button"
              key={tag}
              onClick={() => onSelect(isActive ? null : tag)}
              className={[
                "shrink-0 inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-extrabold shadow-lg backdrop-blur-xl transition-all hover:-translate-y-0.5 active:scale-95 sm:px-3 sm:py-1.5 sm:text-xs",
                isActive
                  ? "border border-emerald-300/45 bg-emerald-500 text-white shadow-emerald-500/20"
                  : "border border-white/10 bg-black/38 text-white hover:bg-black/56",
              ].join(" ")}
              aria-label={isActive ? `Clear hashtag ${tag}` : `Filter by hashtag ${tag}, ${count} mentions`}
              aria-pressed={isActive}
            >
              {isActive ? (
                <X className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Hash className="h-3 w-3 text-emerald-400" aria-hidden="true" />
              )}
              {tag}
              <span className={isActive ? "text-white/72 text-[10px] font-black tabular-nums" : "text-white/50 text-[10px] font-black tabular-nums"}>{count}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
