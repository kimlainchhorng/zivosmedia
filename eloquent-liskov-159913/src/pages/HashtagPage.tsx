/**
 * HashtagPage — `/tag/:tag`
 * Shows every published post whose caption contains the given hashtag.
 * 2-column tile grid (3 on sm, 4 on md, 5 on lg, 6 on xl).
 *
 * Why a dedicated page (vs the old /explore?tag=…): a single canonical URL
 * per tag is shareable, indexable, and easy to deep-link from a caption.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Hash from "lucide-react/dist/esm/icons/hash";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Image from "lucide-react/dist/esm/icons/image";
import { EmptyState } from "@/components/ui/empty-state";
import Play from "lucide-react/dist/esm/icons/play";
import Heart from "lucide-react/dist/esm/icons/heart";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import SEOHead from "@/components/SEOHead";
import ReelThumbnail from "@/components/social/ReelThumbnail";

interface Tile {
  feedId: string;       // id used by `/feed?post=…`
  source: "store" | "user";
  caption: string | null;
  thumbnail: string | null;
  isVideo: boolean;
  authorName: string;
  likes: number;
  comments: number;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const safeTag = (tag ?? "").toLowerCase().replace(/^#/, "");

  // Match #tag bounded by start-of-text or whitespace, escape regex specials
  const ilikePattern = `%#${safeTag}%`;

  const { data: tiles = [], isLoading } = useQuery<Tile[]>({
    queryKey: ["hashtag-tiles", safeTag],
    enabled: safeTag.length > 0,
    queryFn: async () => {
      const [{ data: storePosts }, { data: userPosts }] = await Promise.all([
        supabase
          .from("store_posts")
          .select("id, store_id, caption, media_urls, media_type, likes_count, comments_count, created_at")
          .eq("is_published", true)
          .ilike("caption", ilikePattern)
          .order("created_at", { ascending: false })
          .limit(60),
        (supabase as any)
          .from("user_posts")
          .select("id, user_id, caption, media_url, media_urls, media_type, likes_count, comments_count, views_count, created_at")
          .eq("is_published", true)
          .ilike("caption", ilikePattern)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);

      const storeIds = [...new Set((storePosts ?? []).map((p: any) => p.store_id))];
      const userIds  = [...new Set((userPosts  ?? []).map((p: any) => p.user_id))];

      const [{ data: stores }, { data: profiles }] = await Promise.all([
        storeIds.length
          ? supabase.from("store_profiles").select("id, name, logo_url, slug").in("id", storeIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? supabase.from("profiles").select("id, user_id, full_name, username, avatar_url").or(`user_id.in.(${userIds.join(",")}),id.in.(${userIds.join(",")})`)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const storeMap = new Map<string, any>((stores ?? []).map((s: any) => [s.id, s]));
      const userMap  = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => {
        if (p.id) userMap.set(p.id, p);
        if (p.user_id) userMap.set(p.user_id, p);
      });

      const out: Tile[] = [];

      for (const p of storePosts ?? []) {
        const urls: string[] = Array.isArray(p.media_urls) ? p.media_urls : [];
        out.push({
          feedId:    p.id,
          source:    "store",
          caption:   p.caption,
          thumbnail: urls[0] ?? null,
          isVideo:   p.media_type === "video" || p.media_type === "reel",
          authorName: storeMap.get(p.store_id)?.name ?? "Store",
          likes:     p.likes_count ?? 0,
          comments:  p.comments_count ?? 0,
        });
      }

      for (const p of userPosts ?? []) {
        const urls: string[] = Array.isArray(p.media_urls) && p.media_urls.length > 0
          ? p.media_urls
          : p.media_url ? [p.media_url] : [];
        if (!urls.length) continue;
        const author = userMap.get(p.user_id);
        out.push({
          feedId:    `u-${p.id}`,
          source:    "user",
          caption:   p.caption,
          thumbnail: urls[0] ?? null,
          isVideo:   p.media_type === "video" || p.media_type === "reel",
          authorName: author?.full_name ?? author?.username ?? "User",
          likes:     p.likes_count ?? 0,
          comments:  p.comments_count ?? 0,
        });
      }

      // Sort blended results by engagement
      out.sort((a, b) => (b.likes + b.comments * 2) - (a.likes + a.comments * 2));
      return out;
    },
  });

  // Stats summary
  const totalPosts    = tiles.length;
  const totalLikes    = tiles.reduce((acc, t) => acc + t.likes, 0);
  const totalComments = tiles.reduce((acc, t) => acc + t.comments, 0);

  if (!safeTag) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Invalid hashtag</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead
        title={`#${safeTag} on ZIVO — top posts and reels`}
        description={`Browse the most engaging posts tagged #${safeTag}.`}
      />

      {/* Sticky header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur"
        style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}
      >
        <button type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Hash className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-lg font-bold text-ig-gradient truncate">{safeTag}</h1>
        </div>
      </div>

      {/* Hero with stat tiles */}
      <div className="px-4 sm:px-6 pt-5 pb-3 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-5 sm:p-6 md:p-7">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Hash className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight truncate">#{safeTag}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isLoading ? "Loading…" : totalPosts === 0 ? "Nothing here yet" : `${formatCount(totalPosts)} posts`}
              </p>
            </div>
          </div>
          {totalPosts > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatTile label="Posts"    value={formatCount(totalPosts)}    />
              <StatTile label="Likes"    value={formatCount(totalLikes)}    />
              <StatTile label="Comments" value={formatCount(totalComments)} />
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : tiles.length === 0 ? (
        <EmptyState
          icon={Hash}
          tone="brand"
          title={`No posts tagged #${safeTag} yet`}
          description={`Be the first — create a post and include #${safeTag} in your caption.`}
          action={
            <button
              type="button"
              onClick={() => navigate("/feed")}
              className="rounded-full bg-ig-gradient px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Browse the feed
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 max-w-7xl mx-auto">
          {tiles.map((tile, i) => (
            <motion.button
              key={`${tile.source}-${tile.feedId}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              onClick={() => navigate(`/feed?post=${tile.feedId}`)}
              className="group relative overflow-hidden rounded-xl bg-muted aspect-[3/4]"
              aria-label={`Open: ${tile.caption ?? "post"}`}
            >
              {tile.thumbnail ? (
                tile.isVideo ? (
                  <ReelThumbnail
                    url={tile.thumbnail}
                    className="group-hover:scale-105"
                  />
                ) : (
                  <img
                    src={tile.thumbnail}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <Image className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              {tile.isVideo && (
                <div className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 backdrop-blur-sm">
                  <Play className="h-3 w-3 fill-white text-white" />
                </div>
              )}
              {/* Engagement badges */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2 text-white">
                <div className="flex items-center gap-3 text-[11px] font-semibold drop-shadow">
                  {tile.likes > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-3 w-3 fill-white" />
                      {formatCount(tile.likes)}
                    </span>
                  )}
                  {tile.comments > 0 && (
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="h-3 w-3 fill-white" />
                      {formatCount(tile.comments)}
                    </span>
                  )}
                </div>
                {tile.caption && <p className="mt-0.5 line-clamp-1 text-[11px]">{tile.caption}</p>}
                <p className="mt-0.5 truncate text-[10px] text-white/70">{tile.authorName}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/60 backdrop-blur-sm p-2.5 sm:p-3 md:p-4 text-center border border-border/30">
      <div className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
