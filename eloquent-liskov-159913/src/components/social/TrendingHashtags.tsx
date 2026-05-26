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

const TAG_RE = /#([\p{L}\p{N}_]{2,30})/gu;

function extractHashtags(posts: FeedPostLike[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    if (!p.caption) continue;
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(p.caption)) !== null) {
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

  if (tags.length === 0 && !selected) return null;

  // ── Inline variant (theme-aware, e.g. ReelsFeedPage list) ─────────────────
  if (variant === "inline") {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {/* "All" clear chip — only shown when a filter is active */}
        {selected && (
          <button type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted/60 px-3.5 py-2 sm:px-3 sm:py-1.5 text-[13px] sm:text-xs font-semibold text-foreground border border-border/30 active:scale-95"
          >
            All
          </button>
        )}
        {tags.map(({ tag, count }) => {
          const isActive = selected === tag;
          return (
            <button type="button"
              key={tag}
              onClick={() => onSelect(isActive ? null : tag)}
              className={[
                "shrink-0 inline-flex items-center gap-1 rounded-full px-3.5 py-2 sm:px-3 sm:py-1.5 text-[13px] sm:text-xs font-semibold transition-all active:scale-95",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-foreground hover:bg-muted",
              ].join(" ")}
            >
              {isActive ? (
                <X className="h-3 w-3" />
              ) : (
                <Hash className="h-3 w-3 text-primary" />
              )}
              {tag}
              {!isActive && <span className="text-muted-foreground text-[10px]">{count}</span>}
            </button>
          );
        })}
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
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3.5 py-2 sm:px-3 sm:py-1.5 text-[13px] sm:text-xs font-semibold text-white border border-white/20 active:scale-95"
          >
            All
          </button>
        )}
        {/* Trending label when nothing selected */}
        {!selected && tags.length > 0 && (
          <div className="shrink-0 inline-flex items-center gap-1 px-1 py-2 sm:py-1.5 text-[11px] font-semibold text-white/60">
            <TrendingUp className="h-3 w-3" />
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
                "shrink-0 inline-flex items-center gap-1 rounded-full px-3.5 py-2 sm:px-3 sm:py-1.5 text-[13px] sm:text-xs font-semibold transition-all active:scale-95",
                isActive
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-black/40 backdrop-blur-sm text-white border border-white/10 hover:bg-black/60",
              ].join(" ")}
            >
              {isActive ? (
                <X className="h-3 w-3" />
              ) : (
                <Hash className="h-3 w-3 text-emerald-400" />
              )}
              {tag}
              {!isActive && <span className="text-white/50 text-[10px]">{count}</span>}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Predicate: does a post's caption contain the given hashtag (case-insensitive)?
 */
export function postHasHashtag(caption: string | null | undefined, tag: string): boolean {
  if (!caption) return false;
  const re = new RegExp(`#${tag.replace(/[^\p{L}\p{N}_]/gu, "\\$&")}\\b`, "iu");
  return re.test(caption);
}
