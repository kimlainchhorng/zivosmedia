/**
 * BookmarksPage — Saved posts, flights, restaurants organized by collection
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, Plane, UtensilsCrossed, Image, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { EmptyState } from "@/components/ui/empty-state";
import ReelThumbnail from "@/components/social/ReelThumbnail";

type BookmarkTab = "all" | "post" | "flight" | "restaurant";

const stripUserPostPrefix = (id: string) => id.replace(/^u-/, "");
const postOpenHref = (source: "store" | "user", postId: string, isVideo?: boolean) => {
  const id = source === "user" ? `u-${postId}` : postId;
  return isVideo ? `/reels?post=${encodeURIComponent(id)}` : `/feed?post=${encodeURIComponent(id)}`;
};

export default function BookmarksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<BookmarkTab>("all");

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const [legacyResult, postBookmarkResult] = await Promise.all([
        (supabase as any)
          .from("bookmarks")
          .select("id, user_id, item_id, item_type, collection_name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("post_bookmarks")
          .select("id, post_id, source, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      const legacyRows = (legacyResult.data || []) as any[];
      const postBookmarkRows = (postBookmarkResult.data || []) as any[];
      const legacyPostRows = legacyRows.filter((b) => b.item_type === "post");
      const legacyRawIds = legacyPostRows.map((b) => stripUserPostPrefix(String(b.item_id)));
      const modernRawIds = postBookmarkRows.map((b: any) => String(b.post_id));
      const postIds = Array.from(new Set([...legacyRawIds, ...modernRawIds].filter(Boolean)));

      if (postIds.length === 0) return legacyRows;

      const [{ data: userPosts }, { data: storePosts }] = await Promise.all([
        (supabase as any)
          .from("user_posts")
          .select("id, user_id, caption, media_url, media_urls, media_type")
          .in("id", postIds),
        (supabase as any)
          .from("store_posts")
          .select("id, store_id, caption, media_urls, media_type")
          .in("id", postIds),
      ]);

      const userPostMap = new Map<string, any>((userPosts || []).map((p: any) => [p.id, p]));
      const storePostMap = new Map<string, any>((storePosts || []).map((p: any) => [p.id, p]));
      const userIds = [...new Set((userPosts || []).map((p: any) => p.user_id).filter(Boolean))];
      const storeIds = [...new Set((storePosts || []).map((p: any) => p.store_id).filter(Boolean))];

      const [{ data: profiles }, { data: stores }] = await Promise.all([
        userIds.length
          ? (supabase as any).from("profiles").select("id, user_id, full_name, username, avatar_url").or(`user_id.in.(${userIds.join(",")}),id.in.(${userIds.join(",")})`)
          : Promise.resolve({ data: [] as any[] }),
        storeIds.length
          ? (supabase as any).from("store_profiles").select("id, name, logo_url, slug").in("id", storeIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => {
        if (p.id) profileMap.set(p.id, p);
        if (p.user_id) profileMap.set(p.user_id, p);
      });
      const storeMap = new Map<string, any>((stores || []).map((s: any) => [s.id, s]));
      const seenPostKeys = new Set<string>();

      const enrichPost = (base: any, source: "store" | "user", rawId: string) => {
        const post = source === "user" ? userPostMap.get(rawId) : storePostMap.get(rawId);
        if (!post) return base;
        const mediaUrls: string[] = Array.isArray(post.media_urls) && post.media_urls.length > 0
          ? post.media_urls
          : post.media_url ? [post.media_url] : [];
        const isVideo = post.media_type === "video" || post.media_type === "reel";
        const title = (post.caption || "").trim().split("\n")[0].slice(0, 140) || "Saved reel";
        const author = source === "user" ? profileMap.get(post.user_id) : storeMap.get(post.store_id);
        return {
          ...base,
          item_id: source === "user" ? `u-${rawId}` : rawId,
          title,
          preview_url: mediaUrls[0] || null,
          is_video: isVideo,
          collection_name: base.collection_name || "Reels",
          open_href: postOpenHref(source, rawId, isVideo),
          source,
          author_name: source === "user"
            ? (author?.full_name || author?.username || "Creator")
            : (author?.name || "Store"),
        };
      };

      const modernRows = postBookmarkRows
        .map((b: any) => {
          const source = b.source === "user" ? "user" : "store";
          const rawId = String(b.post_id);
          const key = `${source}:${rawId}`;
          seenPostKeys.add(key);
          return enrichPost({
            id: `post_bookmarks:${b.id}`,
            post_bookmark_id: b.id,
            item_type: "post",
            item_id: source === "user" ? `u-${rawId}` : rawId,
            collection_name: "Reels",
            created_at: b.created_at,
            post_source: source,
            post_raw_id: rawId,
          }, source, rawId);
        });

      const legacyRowsEnriched = legacyRows
        .map((b) => {
          if (b.item_type !== "post") return b;
          const rawId = stripUserPostPrefix(String(b.item_id));
          const source: "store" | "user" = String(b.item_id).startsWith("u-") || (!storePostMap.has(rawId) && userPostMap.has(rawId))
            ? "user"
            : "store";
          const key = `${source}:${rawId}`;
          if (seenPostKeys.has(key)) return null;
          seenPostKeys.add(key);
          return enrichPost({ ...b, post_source: source, post_raw_id: rawId }, source, rawId);
        })
        .filter(Boolean);

      return [...modernRows, ...legacyRowsEnriched]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const filtered = activeTab === "all" ? bookmarks : bookmarks.filter((b: any) => b.item_type === activeTab);

  const removeBookmark = async (bookmark: any) => {
    if (bookmark.post_bookmark_id && bookmark.post_raw_id && bookmark.post_source) {
      await Promise.all([
        (supabase as any).from("post_bookmarks").delete().eq("id", bookmark.post_bookmark_id),
        (supabase as any)
          .from("bookmarks")
          .delete()
          .eq("user_id", user?.id)
          .eq("item_type", "post")
          .in("item_id", [bookmark.item_id, bookmark.post_raw_id]),
      ]);
    } else {
      await (supabase as any).from("bookmarks").delete().eq("id", bookmark.id);
      if (bookmark.post_raw_id && bookmark.post_source) {
        await (supabase as any)
          .from("post_bookmarks")
          .delete()
          .eq("user_id", user?.id)
          .eq("post_id", bookmark.post_raw_id)
          .eq("source", bookmark.post_source);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    queryClient.invalidateQueries({ queryKey: ["saved-posts-count"] });
    toast.success("Bookmark removed");
  };

  const tabs: { id: BookmarkTab; label: string; icon: typeof Bookmark }[] = [
    { id: "all", label: "All", icon: Bookmark },
    { id: "post", label: "Posts", icon: Image },
    { id: "flight", label: "Flights", icon: Plane },
    { id: "restaurant", label: "Food", icon: UtensilsCrossed },
  ];

  return (
    <div className="zivo-shell-mobile bg-background pb-20">
      <SEOHead title="Bookmarks – ZIVO" description="Your saved flights, restaurants, and content on ZIVO." canonical="/bookmarks" noIndex />
      <div className="zivo-sticky-mobile-header safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Saved</h1>
        </div>
        <div className="flex gap-1 px-4 pb-2">
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12 text-muted-foreground" />}
        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={Bookmark}
            tone="brand"
            title={activeTab === "all" ? "Nothing saved yet" : `No ${activeTab}s saved`}
            description="Tap the bookmark icon on any post, flight, or restaurant to keep it here."
            action={
              <Button onClick={() => navigate("/feed")} className="rounded-full">
                Browse the feed
              </Button>
            }
          />
        )}
        <AnimatePresence>
          {filtered.map((b: any) => {
            // Resolve a tap target — posts open in the feed at the saved item.
            const openHref = (() => {
              if (b.open_href) return b.open_href;
              if (b.item_type === "post" && b.item_id) return `/feed?post=${encodeURIComponent(b.item_id)}`;
              if (b.item_type === "flight" && b.item_id) return `/flights/${b.item_id}`;
              if (b.item_type === "restaurant" && b.item_id) return `/eats/${b.item_id}`;
              return null;
            })();
            const previewTitle = b.title || (b.item_type === "post" ? "Saved post" : null);
            return (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex items-stretch gap-3 p-3 rounded-xl bg-card border border-border/40 active:bg-muted/40 transition-colors"
            >
              <button
                type="button"
                onClick={() => openHref && navigate(openHref)}
                disabled={!openHref}
                className="flex flex-1 items-start gap-3 min-w-0 text-left disabled:cursor-default"
              >
                <div className="relative h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {b.item_type === "post" && b.preview_url && b.is_video ? (
                    <ReelThumbnail url={b.preview_url} className="h-full w-full" />
                  ) : b.item_type === "post" && b.preview_url ? (
	                    <img src={b.preview_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : b.item_type === "post" ? (
                    <Image className="h-4 w-4 text-primary" />
                  ) : b.item_type === "flight" ? (
                    <Plane className="h-4 w-4 text-primary" />
                  ) : b.item_type === "restaurant" ? (
                    <UtensilsCrossed className="h-4 w-4 text-primary" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  {previewTitle ? (
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{previewTitle}</p>
                  ) : (
                    <p className="text-sm font-medium text-foreground capitalize">{b.item_type}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {b.collection_name && <>{b.collection_name} · </>}
                    {b.author_name && <>{b.author_name} · </>}
                    Saved {new Date(b.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
              <button type="button" onClick={() => removeBookmark(b)} aria-label="Remove bookmark" title="Remove bookmark" className="p-2 rounded-full hover:bg-destructive/10 self-start">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
