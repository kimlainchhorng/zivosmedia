/**
 * ReelsPreviewRow — TikTok-style horizontal carousel of trending short videos.
 * Renders inside the feed (every Nth card) as a "Reels" hero block.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Play from "lucide-react/dist/esm/icons/play";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

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

  return (
    <div
      className={
        fullBleed
          ? "w-full h-full snap-start flex flex-col bg-gradient-to-b from-black via-zinc-950 to-black px-4 py-8 justify-center"
          : "w-full px-4 py-3"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white drop-shadow tracking-tight">Trending Reels 🔥</h2>
          <p className="text-xs sm:text-sm text-white/60 mt-0.5">Most-watched videos this week</p>
        </div>
        <button type="button"
          onClick={() => navigate("/reels")}
          className="shrink-0 flex items-center gap-1 text-emerald-400 text-xs sm:text-sm font-semibold hover:text-emerald-300 px-3 py-2 sm:p-0 rounded-full sm:rounded-none active:scale-95 transition-transform"
        >
          See all
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {reels === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          {reels.map((reel) => (
            <motion.button
              key={reel.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/feed?post=u-${reel.id}`)}
              className="relative shrink-0 w-32 h-52 sm:w-40 sm:h-64 md:w-44 md:h-72 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 group transition-transform hover:-translate-y-1"
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
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-2 text-white">
                <div className="flex items-center gap-1 text-[11px] font-semibold drop-shadow">
                  <Play className="h-3 w-3 fill-white" />
                  {formatViews(reel.views)}
                </div>
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
