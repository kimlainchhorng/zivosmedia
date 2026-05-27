/**
 * SavedPostsPage — `/saved`
 * Shows every post the current user has bookmarked, in a 2-column tile grid.
 * Tapping a tile navigates to the feed and scrolls to that post via ?post=<id>.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Play from "lucide-react/dist/esm/icons/play";
import Image from "lucide-react/dist/esm/icons/image";

import ReelThumbnail from "@/components/social/ReelThumbnail";

interface SavedTile {
  bookmarkId: string;
  postId: string;
  source: "store" | "user";
  caption: string | null;
  thumbnail: string | null;
  isVideo: boolean;
  authorName: string;
  authorAvatar: string | null;
  feedHref: string;
}

export default function SavedPostsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: tiles = [], isLoading, refetch } = useQuery<SavedTile[]>({
    queryKey: ["saved-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any)
        .from("post_bookmarks")
        .select("id, post_id, source, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const storeIds = (rows ?? []).filter((r: any) => r.source === "store").map((r: any) => r.post_id);
      const userPostIds = (rows ?? []).filter((r: any) => r.source === "user").map((r: any) => r.post_id);

      const [{ data: storePosts }, { data: userPosts }] = await Promise.all([
        storeIds.length
          ? supabase.from("store_posts").select("id, store_id, caption, media_urls, media_type").in("id", storeIds)
          : Promise.resolve({ data: [] as any[] }),
        userPostIds.length
          ? (supabase as any).from("user_posts").select("id, user_id, caption, media_url, media_urls, media_type").in("id", userPostIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const storeMap = new Map<string, any>((storePosts ?? []).map((p: any) => [p.id, p]));
      const userMap  = new Map<string, any>((userPosts ?? []).map((p: any) => [p.id, p]));

      // Resolve author display info
      const storeAuthorIds = [...new Set((storePosts ?? []).map((p: any) => p.store_id))];
      const userAuthorIds  = [...new Set((userPosts ?? []).map((p: any) => p.user_id))];

      const [{ data: stores }, { data: profiles }] = await Promise.all([
        storeAuthorIds.length
          ? supabase.from("store_profiles").select("id, name, logo_url, slug").in("id", storeAuthorIds)
          : Promise.resolve({ data: [] as any[] }),
        userAuthorIds.length
          ? supabase.from("profiles").select("id, user_id, full_name, username, avatar_url").or(`user_id.in.(${userAuthorIds.join(",")}),id.in.(${userAuthorIds.join(",")})`)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const storeProfile = new Map<string, any>((stores ?? []).map((s: any) => [s.id, s]));
      const userProfile  = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => {
        if (p.id) userProfile.set(p.id, p);
        if (p.user_id) userProfile.set(p.user_id, p);
      });

      return (rows ?? [])
        .map((r: any): SavedTile | null => {
          if (r.source === "store") {
            const post = storeMap.get(r.post_id);
            if (!post) return null;
            const author = storeProfile.get(post.store_id);
            const urls: string[] = Array.isArray(post.media_urls) ? post.media_urls : [];
            return {
              bookmarkId: r.id,
              postId: r.post_id,
              source: "store",
              caption: post.caption,
              thumbnail: urls[0] ?? null,
              isVideo: post.media_type === "video" || post.media_type === "reel",
              authorName: author?.name ?? "Store",
              authorAvatar: author?.logo_url ?? null,
              feedHref: `/feed?post=${r.post_id}`,
            };
          } else {
            const post = userMap.get(r.post_id);
            if (!post) return null;
            const author = userProfile.get(post.user_id);
            const urls: string[] = Array.isArray(post.media_urls) && post.media_urls.length > 0
              ? post.media_urls
              : post.media_url ? [post.media_url] : [];
            return {
              bookmarkId: r.id,
              postId: r.post_id,
              source: "user",
              caption: post.caption,
              thumbnail: urls[0] ?? null,
              isVideo: post.media_type === "video" || post.media_type === "reel",
              authorName: author?.full_name ?? author?.username ?? "User",
              authorAvatar: author?.avatar_url ?? null,
              feedHref: `/feed?post=u-${r.post_id}`,
            };
          }
        })
        .filter((t): t is SavedTile => t !== null);
    },
  });

  async function handleRemove(bookmarkId: string) {
    try {
      await (supabase as any).from("post_bookmarks").delete().eq("id", bookmarkId);
      toast.success("Removed from saved");
      refetch();
    } catch {
      toast.error("Couldn't remove");
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
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
        <div className="flex flex-1 items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-ig-gradient">Saved</h1>
        </div>
        <span className="text-sm text-muted-foreground">{tiles.length} {tiles.length === 1 ? "post" : "posts"}</span>
      </div>

      {/* Content */}
      {!userId ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <Bookmark className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-semibold">Sign in to see your saved posts</p>
          <button type="button"
            onClick={() => navigate("/login")}
            className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : tiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <Bookmark className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-semibold">No saved posts yet</p>
          <p className="text-sm text-muted-foreground">
            Tap the 3-dot menu on any post in your feed and choose "Save post" to bookmark it.
          </p>
          <button type="button"
            onClick={() => navigate("/feed")}
            className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Browse the feed
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 max-w-7xl mx-auto">
          {tiles.map((tile) => (
            <motion.div
              key={tile.bookmarkId}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative overflow-hidden rounded-xl bg-muted aspect-[3/4]"
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
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <Image className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}

              {/* Top-right: video badge */}
              {tile.isVideo && (
                <div className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 backdrop-blur-sm">
                  <Play className="h-3 w-3 fill-white text-white" />
                </div>
              )}

              {/* Bottom: caption + author */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 text-white">
                {tile.caption && (
                  <p className="line-clamp-2 text-[11px] leading-tight">{tile.caption}</p>
                )}
                <p className="mt-1 truncate text-[10px] text-white/70">{tile.authorName}</p>
              </div>

              {/* Tap targets */}
              <button type="button"
                onClick={() => navigate(tile.feedHref)}
                className="absolute inset-0 cursor-pointer focus:outline-none"
                aria-label={`Open: ${tile.caption ?? "post"}`}
              />
              <button type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(tile.bookmarkId); }}
                className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500/90 p-2 text-white shadow-lg opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 group-active:opacity-100 transition-opacity active:scale-90"
                aria-label="Remove from saved"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
