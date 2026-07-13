/**
 * ReelsPreviewRow — TikTok-style horizontal carousel of trending short videos.
 * Renders inside the feed (every Nth card) as a "Reels" hero block.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, ChevronRight, Clapperboard, Flame, Gauge, Loader2, Play, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

import ReelThumbnail from "./ReelThumbnail";

interface PreviewReel {
  id: string;
  thumbnail: string | null;
  caption: string | null;
  views: number;
  authorName: string;
  mediaType: string;
}

interface Props {
  /** When true, renders inside the snap-scroll viewport (full-bleed black bg). */
  fullBleed?: boolean;
}

export default function ReelsPreviewRow({ fullBleed = true }: Props) {
  const navigate = useNavigate();
  const [reels, setReels] = useState<PreviewReel[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await (supabase as any)
        .from("user_posts")
        .select("id, user_id, media_url, media_urls, media_type, caption, views_count, likes_count, created_at")
        .eq("is_published", true)
        .in("media_type", ["video", "reel"])
        .order("views_count", { ascending: false, nullsFirst: false })
        .limit(8);
      if (!rows || cancelled) return;

      const userIds = [...new Set(rows.map((r: any) => r.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, user_id, full_name, username")
            .or(`user_id.in.(${userIds.join(",")}),id.in.(${userIds.join(",")})`)
        : { data: [] as any[] };
      const profileMap = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => {
        if (p.id) profileMap.set(p.id, p);
        if (p.user_id) profileMap.set(p.user_id, p);
      });

      const out: PreviewReel[] = rows
        .map((r: any) => {
          const urls: string[] = Array.isArray(r.media_urls) && r.media_urls.length > 0
            ? r.media_urls
            : r.media_url ? [r.media_url] : [];
          if (!urls.length) return null;
          const author = profileMap.get(r.user_id);
          return {
            id: r.id,
            thumbnail: urls[0],
            caption: r.caption,
            views: r.views_count ?? 0,
            authorName: author?.full_name ?? author?.username ?? "Creator",
            mediaType: r.media_type,
          };
        })
        .filter((r: PreviewReel | null): r is PreviewReel => r !== null);

      if (!cancelled) setReels(out);
    })();
    return () => { cancelled = true; };
  }, []);

  if (reels !== null && reels.length === 0) return null; // no reels — skip block entirely

  const formatViews = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000     ? `${(n / 1_000).toFixed(1)}K`
    : String(n);
  const totalViews = reels?.reduce((sum, reel) => sum + reel.views, 0) ?? 0;
  const topViews = reels?.[0]?.views ?? 0;
  const topReel = reels?.[0] ?? null;
  const averageViews = reels && reels.length > 0 ? Math.round(totalViews / reels.length) : 0;
  const trendPulse = topViews >= averageViews * 2 && averageViews > 0
    ? "Breakout clip"
    : totalViews > 0
      ? "Steady climb"
      : "Warming up";

  return (
    <div
      className={
        fullBleed
          ? "w-full h-full snap-start flex flex-col bg-gradient-to-b from-black via-zinc-950 to-black px-4 py-8 justify-center"
          : "zivo-social-module mx-2 my-3 overflow-hidden rounded-[1.25rem] px-3 py-3"
      }
    >
      <div className={cn(
        "mb-3 flex items-center justify-between gap-2",
        !fullBleed && "zivo-social-header-glass rounded-[1.15rem] px-3 py-2.5",
      )}>
        <div className="flex min-w-0 items-center gap-2.5">
          {!fullBleed && (
            <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
              <Clapperboard className="h-4 w-4 text-primary" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className={fullBleed ? "text-xl sm:text-2xl md:text-3xl font-extrabold text-white drop-shadow tracking-tight" : "truncate text-[13px] font-bold text-foreground tracking-tight"}>Trending Reels</h2>
            <p className={fullBleed ? "text-xs sm:text-sm text-white/60 mt-0.5" : "mt-0.5 truncate text-[11px] font-medium text-muted-foreground"}>Most-watched videos</p>
          </div>
        </div>
        <button type="button"
          onClick={() => navigate("/reels")}
          aria-label="Open all reels"
          className={fullBleed ? "shrink-0 flex items-center gap-1 text-emerald-400 text-xs sm:text-sm font-semibold hover:text-emerald-300 px-3 py-2 sm:p-0 rounded-full sm:rounded-none active:scale-95 transition-transform" : "zivo-social-chip shrink-0 flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-semibold text-primary active:scale-95 transition-transform"}
        >
          See all
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {reels && reels.length > 0 && (
        <div className={cn(
          "mb-3 grid grid-cols-3 gap-2",
          fullBleed && "relative",
        )}>
          <div className={fullBleed ? "rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-white shadow-xl backdrop-blur-xl" : "zivo-social-module-tile rounded-2xl px-3 py-2"}>
            <div className="flex items-center gap-2">
              <span className={fullBleed ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200" : "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"}>
                <Clapperboard className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className={fullBleed ? "block truncate text-xs font-black tabular-nums text-white" : "block truncate text-xs font-black tabular-nums text-foreground"}>{reels.length}</span>
                <span className={fullBleed ? "block truncate text-[10px] font-semibold text-white/60" : "block truncate text-[10px] font-semibold text-muted-foreground"}>Showing</span>
              </span>
            </div>
          </div>
          <div className={fullBleed ? "rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-white shadow-xl backdrop-blur-xl" : "zivo-social-module-tile rounded-2xl px-3 py-2"}>
            <div className="flex items-center gap-2">
              <span className={fullBleed ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-orange-300/10 text-orange-200" : "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"}>
                <Flame className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className={fullBleed ? "block truncate text-xs font-black tabular-nums text-white" : "block truncate text-xs font-black tabular-nums text-foreground"}>{formatViews(topViews)}</span>
                <span className={fullBleed ? "block truncate text-[10px] font-semibold text-white/60" : "block truncate text-[10px] font-semibold text-muted-foreground"}>Top clip</span>
              </span>
            </div>
          </div>
          <div className={fullBleed ? "rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-white shadow-xl backdrop-blur-xl" : "zivo-social-module-tile rounded-2xl px-3 py-2"}>
            <div className="flex items-center gap-2">
              <span className={fullBleed ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-300/10 text-fuchsia-200" : "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500"}>
                <BarChart3 className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className={fullBleed ? "block truncate text-xs font-black tabular-nums text-white" : "block truncate text-xs font-black tabular-nums text-foreground"}>{formatViews(totalViews)}</span>
                <span className={fullBleed ? "block truncate text-[10px] font-semibold text-white/60" : "block truncate text-[10px] font-semibold text-muted-foreground"}>Views</span>
              </span>
            </div>
          </div>
        </div>
      )}
      {topReel && (
        <button
          type="button"
          onClick={() => navigate(`/feed?post=u-${topReel.id}`)}
          aria-label={`Open top reel by ${topReel.authorName} with ${formatViews(topReel.views)} views`}
          className={cn(
            "mb-3 flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition-transform active:scale-[0.99]",
            fullBleed
              ? "border border-white/10 bg-white/[0.075] text-white shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
              : "zivo-social-share-preview",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={cn(
              "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
              fullBleed ? "bg-white/10 text-emerald-200" : "bg-primary/10 text-primary",
            )}>
              {topReel.thumbnail ? (
                topReel.mediaType === "video" || topReel.mediaType === "reel" ? (
                  <video src={topReel.thumbnail} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={topReel.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                )
              ) : (
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                <Play className="h-3.5 w-3.5 fill-white" aria-hidden="true" />
              </span>
            </span>
            <span className="min-w-0">
              <span className={cn(
                "block truncate text-[10px] font-black uppercase tracking-[0.08em]",
                fullBleed ? "text-white/55" : "text-muted-foreground",
              )}>
                Top reel now
              </span>
              <span className={cn("block truncate text-sm font-bold", fullBleed ? "text-white" : "text-foreground")}>
                {topReel.caption?.trim() || `By ${topReel.authorName}`}
              </span>
            </span>
          </span>
          <span className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums",
            fullBleed ? "border border-white/10 bg-white/10 text-white/80" : "zivo-social-chip-active",
          )}>
            {formatViews(topReel.views)}
          </span>
        </button>
      )}
      {reels && reels.length > 0 && (
        <div className={cn(
          "mb-3 grid grid-cols-2 gap-2 rounded-2xl px-3 py-2",
          fullBleed
            ? "border border-white/10 bg-white/[0.075] text-white shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
            : "zivo-social-module-tile",
        )}>
          <div className="flex min-w-0 items-center gap-2">
            <span className={fullBleed ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-300/10 text-orange-200" : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"}>
              <Gauge className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className={fullBleed ? "block truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/55" : "block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground"}>
                Trend pulse
              </span>
              <span className={fullBleed ? "block truncate text-xs font-black text-white" : "block truncate text-xs font-black text-foreground"}>
                {trendPulse}
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className={fullBleed ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200" : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"}>
              <Target className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className={fullBleed ? "block truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/55" : "block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground"}>
                Avg views
              </span>
              <span className={fullBleed ? "block truncate text-xs font-black text-white" : "block truncate text-xs font-black text-foreground"}>
                {formatViews(averageViews)}
              </span>
            </span>
          </div>
        </div>
      )}

      {reels === null ? (
        <div className={cn(
          "flex items-center justify-center py-12",
          !fullBleed && "zivo-social-module-tile rounded-2xl",
        )}>
          <Loader2 className={cn("h-6 w-6 animate-spin", fullBleed ? "text-white/60" : "text-primary")} />
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {reels.map((reel, index) => (
            <motion.button
              key={reel.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/feed?post=u-${reel.id}`)}
              aria-label={`Open reel ${index + 1} by ${reel.authorName} with ${formatViews(reel.views)} views`}
              className={fullBleed ? "relative shrink-0 w-32 h-52 sm:w-40 sm:h-64 md:w-44 md:h-72 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 group transition-transform hover:-translate-y-1" : "zivo-social-module-tile group relative h-44 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-800 shadow-[0_16px_30px_hsl(210_28%_18%/0.16)] transition-transform hover:-translate-y-1 sm:h-52 sm:w-32"}
            >
              {reel.thumbnail ? (
                reel.mediaType === "video" || reel.mediaType === "reel" ? (
                  <ReelThumbnail
                    url={reel.thumbnail}
                    className="group-hover:scale-105"
                    iconClassName="h-8 w-8"
                  />
                ) : (
                  <img
                    src={reel.thumbnail}
	                    alt=""
	                    loading="lazy"
	                    decoding="async"
	                    className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
	                  />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-10 w-10 text-white/40" />
                </div>
              )}
              {/* "Hot" is earned, not decoration — top-3 by views only. */}
              {!fullBleed && index < 3 && reel.views > 0 && (
                <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/35 px-2 py-1 text-[10px] font-black text-white backdrop-blur-md">
                  <Flame className="h-3 w-3 fill-orange-300 text-orange-300" aria-hidden="true" />
                  Hot
                </span>
              )}
              <span className={cn(
                "absolute right-2 top-2 z-10 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[10px] font-black shadow-lg backdrop-blur-md",
                fullBleed ? "border border-white/15 bg-white/15 text-white" : "border border-white/20 bg-black/35 text-white",
              )}>
                #{index + 1}
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-2 text-white">
                <div className="flex items-center gap-1 text-[11px] font-semibold drop-shadow">
                  <Play className="h-3 w-3 fill-white" aria-hidden="true" />
                  {formatViews(reel.views)}
                </div>
                {index === 0 && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-white backdrop-blur-sm">
                    <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                    Leader
                  </span>
                )}
                {reel.caption && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-tight">{reel.caption}</p>
                )}
                <p className="mt-0.5 truncate text-[10px] text-white/70">@{reel.authorName}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
