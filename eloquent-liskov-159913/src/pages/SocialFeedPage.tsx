/**
 * SocialFeedPage — Facebook-style social feed.
 *
 * Layout (top to bottom):
 *   - Sticky header: hamburger (CreateSheet trigger) | "Feed" | search | + | bell | chat (with unread badge)
 *   - Segmented tabs: For You / Friends / Following
 *   - Stories rail
 *   - Post list
 *
 * Routed at /feed.
 */
import { Fragment, Suspense, lazy, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Menu, Search, Plus, Bell, MessageSquare,
  Loader2, Heart, MessageCircle, Share2, MoreHorizontal, Bookmark,
  UserPlus, Check,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { toast } from "sonner";
import { openPostShareSheet } from "@/components/social/PostShareSheet";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import NavBar from "@/components/home/NavBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Link2, EyeOff, Flag, Trash2, UserMinus,
  Pin, PinOff, BookmarkPlus, Pencil, ShoppingBag,
  Globe2, Users as UsersIcon, Lock, Coins, BellOff,
  Megaphone, FolderPlus, MessageSquareOff,
  Share2 as Share2Icon, Send as SendIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import CreateSheet from "@/components/feed/CreateSheet";
import { useQueryClient } from "@tanstack/react-query";
import { getPostShareUrl } from "@/lib/getPublicOrigin";
import { normalizeSupabaseMediaUrl } from "@/utils/normalizeSupabaseMediaUrl";
import { withSupabaseAbortSignal } from "@/utils/withSupabaseAbortSignal";
import { reportFeedQueryError } from "@/lib/feedQueryTelemetry";

const FeedStoryRing = lazy(() => import("@/components/social/FeedStoryRing"));
const ZivoMobileNav = lazy(() => import("@/components/app/ZivoMobileNav"));
const CreatePostModal = lazy(() => import("@/components/social/CreatePostModal"));
const CommentsSheet = lazy(() => import("@/components/social/CommentsSheet"));
const CreateStorySheet = lazy(() => import("@/components/profile/CreateStorySheet"));
const FollowSuggestions = lazy(() => import("@/components/social/FollowSuggestions"));

type FeedTab = "for-you" | "friends" | "following";

type FeedPost = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_urls: string[] | null;
  media_type: string | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  // Owner-controlled toggles set via the post "…" menu. When false, the
  // matching action button is hidden from non-owner viewers and disabled
  // for the owner with a clear "Off" hint.
  comments_enabled?: boolean | null;
  sharing_enabled?: boolean | null;
  tips_enabled?: boolean | null;
  is_pinned?: boolean | null;
  visibility?: string | null;
};

const TABS: { id: FeedTab; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "friends", label: "Friends" },
  { id: "following", label: "Following" },
];

export default function SocialFeedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { unreadCount: notificationUnread = 0 } = useNotifications(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"photo" | "reel" | "poll" | "post" | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const [tab, setTab] = useState<FeedTab>("for-you");

  // Honor ?compose=post|reel|poll|photo|story and ?post=<id> from external links
  // (CreateSheet shortcuts, /saved tap-throughs, push notifications).
  useEffect(() => {
    const compose = searchParams.get("compose");
    const postId = searchParams.get("post");
    if (compose) {
      if (compose === "story") setStoryOpen(true);
      else if (compose === "reel" || compose === "poll" || compose === "photo" || compose === "post") {
        setComposerMode(compose);
      }
      // strip the param so refresh / back doesn't re-open the sheet
      const next = new URLSearchParams(searchParams);
      next.delete("compose");
      setSearchParams(next, { replace: true });
    }
    if (postId) {
      setHighlightPostId(postId);
      const next = new URLSearchParams(searchParams);
      next.delete("post");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chat unread — separate query so we don't depend on the entire chat hub.
  const { data: chatUnread = 0 } = useQuery({
    queryKey: ["feed-header-chat-unread", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!user?.id) return 0;
      const { count } = await withSupabaseAbortSignal((supabase as any)
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", user.id)
        .is("read_at", null), signal);
      return count ?? 0;
    },
  });

  // Posts query — Friends/Following narrow the author set; For You is everyone.
  // Returns null when the tab needs auth and the user is logged out, so the
  // empty state can show a tailored Sign-in CTA instead of "no posts yet".
  const { data: rawPosts, isLoading, isError: hasFeedError, error: feedError } = useQuery({
    queryKey: ["social-feed-posts", tab, user?.id],
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }): Promise<FeedPost[] | null> => {
      let allowedAuthorIds: string[] | null = null;

      if (tab === "friends") {
        if (!user?.id) return null;
        const { data: friendships } = await withSupabaseAbortSignal(supabase
          .from("friendships")
          .select("user_id, friend_id")
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq("status", "accepted"), signal);
        const rows = (friendships || []) as { user_id: string; friend_id: string }[];
        allowedAuthorIds = rows.map((r) => (r.user_id === user.id ? r.friend_id : r.user_id));
        if (allowedAuthorIds.length === 0) return [];
      } else if (tab === "following") {
        if (!user?.id) return null;
        const { data: follows } = await withSupabaseAbortSignal((supabase as any)
          .from("user_followers")
          .select("following_id")
          .eq("follower_id", user.id), signal);
        allowedAuthorIds = (follows || []).map((r: any) => r.following_id).filter(Boolean) as string[];
        if (allowedAuthorIds.length === 0) return [];
      }

      let query: any = (supabase as any)
        .from("user_posts")
        .select("id, user_id, caption, media_url, media_urls, media_type, likes_count, comments_count, shares_count, created_at, comments_enabled, sharing_enabled, tips_enabled, is_pinned, visibility")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(30);
      if (allowedAuthorIds) {
        query = query.in("user_id", allowedAuthorIds);
      }

      const { data: posts } = await withSupabaseAbortSignal(query, signal);
      if (!posts?.length) return [];

      const userIds = [...new Set(posts.map((p: any) => p.user_id))] as string[];
      const { data: profiles } = await withSupabaseAbortSignal(supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds), signal);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return posts.map((p: any) => {
        const author = profileMap.get(p.user_id);
        return {
          ...p,
          author_name: author?.full_name || null,
          author_avatar: author?.avatar_url || null,
        };
      });
    },
  });

  const needsAuth = rawPosts === null;
  const posts = rawPosts ?? [];

  useEffect(() => {
    if (!hasFeedError || !feedError) return;
    reportFeedQueryError(
      {
        scope: "social-feed-posts",
        queryKey: "social-feed-posts",
        userId: user?.id ?? null,
        tab,
      },
      feedError,
    );
  }, [feedError, hasFeedError, tab, user?.id]);

  const goAuth = () => {
    navigate("/auth?next=" + encodeURIComponent("/feed"));
  };

  return (
    <div className="zivo-shell-mobile pb-20">
      {/* Desktop / iPad top NavBar — hidden on phones */}
      <div className="hidden lg:block">
        <NavBar />
      </div>

      {/* Centered content column. On lg+ we offset for the NavBar height
          and cap a sensible max width so the feed doesn't span the whole
          monitor on a 27" screen. */}
      <div className="mx-auto max-w-2xl lg:pt-[72px]">
      {/* Sticky header — mobile only (NavBar replaces it on lg+) */}
      <div className="zivo-sticky-mobile-header pt-safe z-20 px-3 py-2 bg-background/95 backdrop-blur-xl border-b border-border/30 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="-ml-1 p-2 rounded-full hover:bg-muted active:scale-95 transition-all"
            aria-label="Open create menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-extrabold tracking-tight">Feed</h1>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => navigate("/explore")}
            className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => (user ? setComposerMode("post") : goAuth())}
            className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all"
            aria-label="Create post"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => (user ? navigate("/notifications") : goAuth())}
            className="relative p-2 rounded-full hover:bg-muted active:scale-95 transition-all"
            aria-label={notificationUnread > 0 ? `Notifications, ${notificationUnread} unread` : "Notifications"}
          >
            <Bell className="w-5 h-5" />
            {notificationUnread > 0 && (
              <span className="absolute -top-2 -right-2 z-10 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-black leading-none text-white shadow-md shadow-red-500/30 ring-2 ring-background">
                {notificationUnread > 99 ? "99+" : notificationUnread}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => (user ? navigate("/chat") : goAuth())}
            className="relative p-2 rounded-full hover:bg-muted active:scale-95 transition-all"
            aria-label={chatUnread > 0 ? `Messages, ${chatUnread} unread` : "Messages"}
          >
            <MessageSquare className="w-5 h-5" />
            {chatUnread > 0 && (
              <span className="absolute top-0.5 right-0.5 inline-flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {chatUnread > 99 ? "99+" : chatUnread}
              </span>
            )}
          </button>
        </div>

        {/* Segmented tabs */}
        <div className="mt-2 flex items-center justify-around border-b border-border/30 -mx-3 px-3">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative py-2 text-[14px] font-semibold transition-colors",
                  active ? "text-foreground" : "text-muted-foreground/80",
                )}
              >
                {t.label}
                {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-foreground rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stories rail (auth-gated inside the component already) */}
      <Suspense fallback={null}>
        <FeedStoryRing />
      </Suspense>

      {/* Posts */}
      <div className="space-y-3 p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <>
            <FeedEmptyState
              tab={tab}
              needsAuth={needsAuth}
              onSignIn={goAuth}
              onDiscover={() => navigate("/explore")}
            />
            {tab === "following" && !needsAuth && user && (
              <Suspense fallback={null}>
                <FollowSuggestions />
              </Suspense>
            )}
          </>
        ) : (
          posts.map((p, i) => (
            <Fragment key={p.id}>
              <PostCard post={p} highlight={p.id === highlightPostId} />
              {tab === "for-you" && i === 2 && user && (
                <Suspense fallback={null}>
                  <FollowSuggestions />
                </Suspense>
              )}
            </Fragment>
          ))
        )}
      </div>

      <CreateSheet open={createOpen} onOpenChange={setCreateOpen} authRedirectPath="/feed" />

      {storyOpen && user && (
        <Suspense fallback={null}>
          <CreateStorySheet
            open={storyOpen}
            onClose={() => setStoryOpen(false)}
            onPublished={() => {
              setStoryOpen(false);
              queryClient.invalidateQueries({ queryKey: ["feed-story-users"] });
            }}
          />
        </Suspense>
      )}

      {composerMode && user && (
        <Suspense fallback={null}>
          <CreatePostModal
            userId={user.id}
            userProfile={{
              name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "You",
              avatar: profile?.avatar_url || user.user_metadata?.avatar_url || null,
            }}
            initialMode={composerMode === "post" ? undefined : composerMode}
            onClose={() => setComposerMode(null)}
            onCreated={() => {
              setComposerMode(null);
              queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });
            }}
          />
        </Suspense>
      )}

      </div>{/* /max-w-2xl column */}

      <Suspense fallback={<div className="fixed inset-x-0 bottom-0 h-16 bg-background border-t border-border lg:hidden pb-safe" />}>
        <ZivoMobileNav />
      </Suspense>
    </div>
  );
}

function PostCard({ post, highlight = false }: { post: FeedPost; highlight?: boolean }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const urls = ((post.media_urls && post.media_urls.length > 0) ? post.media_urls : (post.media_url ? [post.media_url] : []))
    .map((url) => normalizeSupabaseMediaUrl(url, { preferredBucket: "user-posts" }))
    .filter(Boolean);
  const isVideo = post.media_type === "video" || urls[0]?.match(/\.(mp4|mov|webm)/i);
  const relTime = (() => {
    try {
      return formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
    } catch {
      return "";
    }
  })();

  useEffect(() => {
    if (highlight && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  return (
    <article
      ref={ref}
      className={cn(
        "rounded-2xl border bg-card overflow-hidden transition-all",
        highlight ? "border-primary ring-2 ring-primary/40 shadow-lg" : "border-border/40",
      )}
    >
      <header className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        <button
          type="button"
          onClick={() => navigate(`/user/${post.user_id}`)}
          className="shrink-0"
          aria-label={`${post.author_name || "User"} profile`}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={optimizeAvatar(post.author_avatar, 80) || post.author_avatar || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {(post.author_name || "U")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-tight truncate">{post.author_name || "ZIVO User"}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{relTime}</p>
        </div>
        <FollowPill targetUserId={post.user_id} />
        <PostMoreMenu post={post} />
      </header>

      {post.caption && <PostCaption caption={post.caption} />}

      {urls.length > 0 && (
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950">
          {isVideo ? (
            <video
              // #t=0.1 hint nudges the browser past the black intro frame
              // many phone-recorded clips begin with, so the paused poster
              // frame is a real image instead of a black rectangle.
              src={`${urls[0]}#t=0.1`}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[70vh] object-contain"
            />
          ) : (
            <img
              src={urls[0]}
              alt={post.caption || "Post"}
              loading="lazy"
              className="w-full max-h-[70vh] object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                const fallback = event.currentTarget.parentElement?.querySelector("[data-media-fallback]") as HTMLElement | null;
                if (fallback) fallback.hidden = false;
              }}
            />
          )}
          <div data-media-fallback hidden className="flex min-h-[240px] items-center justify-center px-4 py-10 text-sm text-zinc-300">
            Media could not be loaded.
          </div>
        </div>
      )}

      <PostFooter post={post} />
    </article>
  );
}

function PostFooter({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(post.likes_count ?? 0);
  const [comments, setComments] = useState(post.comments_count ?? 0);
  const [shares, setShares] = useState(post.shares_count ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Track whether the user has manually toggled like/save so a late-arriving
  // hydration fetch can't clobber their optimistic update (the #1 cause of
  // "I tapped like and nothing happened" reports).
  const userTouchedRef = useRef({ liked: false, saved: false });

  // Hydrate like + save state for this post.
  useEffect(() => {
    if (!user?.id) {
      if (!userTouchedRef.current.liked) setLiked(false);
      if (!userTouchedRef.current.saved) setSaved(false);
      return;
    }
    let alive = true;
    (async () => {
      const [{ data: likeRow }, { data: saveRow }] = await Promise.all([
        (supabase as any).from("post_likes").select("post_id").eq("user_id", user.id).eq("post_id", post.id).maybeSingle(),
        (supabase as any).from("bookmarks").select("id").eq("user_id", user.id).eq("item_type", "post").eq("item_id", post.id).maybeSingle(),
      ]);
      if (!alive) return;
      // Only apply the fetched state if the user hasn't manually toggled — their
      // intent always wins over a late hydration result.
      if (!userTouchedRef.current.liked) setLiked(!!likeRow);
      if (!userTouchedRef.current.saved) setSaved(!!saveRow);
    })();
    return () => { alive = false; };
  }, [post.id, user?.id]);

  const goAuth = () => navigate("/auth?next=" + encodeURIComponent("/feed"));

  const handleLike = async () => {
    if (!user?.id) return goAuth();
    const wasLiked = liked;
    userTouchedRef.current.liked = true;
    setLiked(!wasLiked);
    setLikes((n) => Math.max(0, n + (wasLiked ? -1 : 1)));
    try {
      if (wasLiked) {
        await (supabase as any).from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      } else {
        const { error } = await (supabase as any).from("post_likes").insert({ post_id: post.id, user_id: user.id });
        if (error && (error as any).code !== "23505") throw error;
        // Notify the author (best-effort, only on a real new like to a different user)
        if (!error && post.user_id && post.user_id !== user.id) {
          (async () => {
            try {
              const { data: sp } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", user.id)
                .maybeSingle();
              await supabase.functions.invoke("send-push-notification", {
                body: {
                  user_id: post.user_id,
                  notification_type: "post_liked",
                  title: "New Like ❤️",
                  body: `${(sp as any)?.full_name || "Someone"} liked your post`,
                  data: {
                    type: "post_liked",
                    post_id: post.id,
                    liker_id: user.id,
                    action_url: `/feed?post=${post.id}`,
                  },
                },
              });
            } catch { /* non-fatal */ }
          })();
        }
      }
      queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });
    } catch {
      setLiked(wasLiked);
      setLikes((n) => Math.max(0, n + (wasLiked ? 1 : -1)));
    }
  };

  const handleSave = async () => {
    if (!user?.id) return goAuth();
    const wasSaved = saved;
    userTouchedRef.current.saved = true;
    setSaved(!wasSaved);
    try {
      if (wasSaved) {
        await (supabase as any)
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", "post")
          .eq("item_id", post.id);
        toast("Removed from Saved");
      } else {
        const { error } = await (supabase as any)
          .from("bookmarks")
          .insert({ user_id: user.id, item_type: "post", item_id: post.id });
        if (error && (error as any).code !== "23505") throw error;
        toast.success("Saved", {
          description: "Find it in your Saved collection.",
          action: { label: "View", onClick: () => navigate("/saved") },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    } catch {
      setSaved(wasSaved);
      toast.error("Couldn't save — please try again.");
    }
  };

  const handleComment = () => {
    if (!user?.id) return goAuth();
    setCommentsOpen(true);
  };

  const handleShare = async () => {
    const shareUrl = getPostShareUrl(post.id);
    const shareText = post.caption?.slice(0, 140) || "Check out this post on ZIVO";
    const firstImage = (Array.isArray(post.media_urls) && post.media_urls[0]) || post.media_url || null;
    // Open the bottom-sheet share menu. Each tile fires its own
    // success/failure toast inside the sheet itself.
    openPostShareSheet({
      postId: post.id,
      url: shareUrl,
      title: post.author_name ? `${post.author_name} on ZIVO` : "ZIVO post",
      text: shareText,
      imageUrl: firstImage,
      onSendToFriend: () => openShareToChat({
        kind: "post" as never,
        title: post.author_name ? `${post.author_name} on ZIVO` : "ZIVO post",
        subtitle: post.caption?.slice(0, 80) || undefined,
        image: firstImage,
        deepLink: shareUrl,
      }),
      onShared: async (channel) => {
        setShares((n) => n + 1);
        try { await (supabase as any).rpc("increment_post_shares", { p_post_id: post.id }); }
        catch {
          await (supabase as any)
            .from("user_posts")
            .update({ shares_count: (post.shares_count ?? 0) + 1 })
            .eq("id", post.id);
        }
        // Channel name lets us track which destination users actually use.
        void channel;
      },
    });
  };
  // Legacy direct-copy / native-share fallback retained for any other call
  // site that still imports it (no-op locally since handleShare now opens
  // the sheet). Inlined to keep the diff focused.
  const _legacyShare = async () => {
    const shareUrl = getPostShareUrl(post.id);
    const shareText = post.caption?.slice(0, 140) || "Check out this post on ZIVO";

    // Last-resort fallback: works in iframes / restricted browsers where
    // navigator.clipboard is blocked. Uses the legacy execCommand API and
    // shows the URL in the toast so the user can long-press to copy it.
    const fallbackCopy = (): boolean => {
      try {
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch { return false; }
    };

    const showLinkInToast = () => {
      toast("Tap to copy this link", {
        duration: 12000,
        description: shareUrl,
        action: {
          label: "Copy",
          onClick: () => { void navigator.clipboard?.writeText(shareUrl).catch(() => fallbackCopy()); },
        },
      });
    };

    let succeeded = false;

    // 1) Try Capacitor (native iOS / Android share sheet)
    try {
      const { Share } = await import("@capacitor/share");
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({ title: "ZIVO post", text: shareText, url: shareUrl, dialogTitle: "Share post" });
        succeeded = true;
      }
    } catch { /* fall through */ }

    // 2) Try Web Share API (mobile browsers)
    if (!succeeded && typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "ZIVO post", text: shareText, url: shareUrl });
        succeeded = true;
      } catch (e) {
        // AbortError = user cancelled the share sheet — that's fine, just exit.
        if ((e as { name?: string })?.name === "AbortError") return;
      }
    }

    // 3) Async clipboard
    if (!succeeded) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        succeeded = true;
        toast.success("Link copied", { description: "Paste it anywhere to share this post." });
      } catch { /* fall through */ }
    }

    // 4) Legacy execCommand
    if (!succeeded && fallbackCopy()) {
      succeeded = true;
      toast.success("Link copied", { description: "Paste it anywhere to share this post." });
    }

    // 5) Last resort: surface the link in the toast so the user can copy manually
    if (!succeeded) {
      showLinkInToast();
      return; // don't bump the share count if we couldn't actually share
    }

    setShares((n) => n + 1);
    try {
      await (supabase as any).rpc("increment_post_shares", { p_post_id: post.id });
    } catch {
      await (supabase as any)
        .from("user_posts")
        .update({ shares_count: (post.shares_count ?? 0) + 1 })
        .eq("id", post.id);
    }
  };

  // Owner-controlled toggles: when off the matching button is hidden for
  // viewers and disabled for the owner (so the owner sees they're "Off").
  const isOwn = !!user?.id && user.id === post.user_id;
  const commentsOn = post.comments_enabled !== false;
  const sharingOn = post.sharing_enabled !== false;
  const showCommentBtn = commentsOn || isOwn;
  const showShareBtn = sharingOn || isOwn;

  return (
    <>
      <footer className="flex items-center gap-1 px-2 py-1.5 border-t border-border/30">
        <ActionButton icon={Heart} label={likes} active={liked} onClick={handleLike} activeClass="text-rose-500 fill-rose-500" />
        {showCommentBtn && (
          <ActionButton
            icon={MessageCircle}
            label={comments}
            onClick={commentsOn ? handleComment : () => toast("Comments are turned off for this post")}
            activeClass={!commentsOn ? "opacity-40" : undefined}
            active={!commentsOn}
          />
        )}
        {showShareBtn && (
          <ActionButton
            icon={Share2}
            label={shares}
            onClick={sharingOn ? handleShare : () => toast("Sharing is turned off for this post")}
            activeClass={!sharingOn ? "opacity-40" : undefined}
            active={!sharingOn}
          />
        )}
        <ActionButton icon={Bookmark} label={0} hideLabel active={saved} onClick={handleSave} activeClass="text-amber-500 fill-amber-500" />
      </footer>

      {commentsOpen && (
        <Suspense fallback={null}>
          <CommentsSheet
            open={commentsOpen}
            onClose={() => setCommentsOpen(false)}
            postId={post.id}
            postSource="user"
            currentUserId={user?.id ?? null}
            commentsCount={comments}
            onCommentsCountChange={(n) => setComments(n)}
          />
        </Suspense>
      )}
    </>
  );
}

function PostCaption({ caption }: { caption: string }) {
  const [expanded, setExpanded] = useState(false);
  const [needsClamp, setNeedsClamp] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (ref.current && !expanded) {
      setNeedsClamp(ref.current.scrollHeight > ref.current.clientHeight + 1);
    }
  }, [caption, expanded]);

  return (
    <div className="px-4 pb-2">
      <p
        ref={ref}
        className={cn(
          "text-[14px] leading-relaxed whitespace-pre-wrap",
          !expanded && "line-clamp-2",
        )}
      >
        {caption}
      </p>
      {needsClamp && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mt-0.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground active:opacity-70"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}

/**
 * PostMoreMenu — the "…" dropdown next to each post header.
 * Was a no-op stub. Now exposes Copy link / Hide post / Mute author /
 * Report / Delete (own posts only). Uses optimistic UI + toast feedback.
 */
function PostMoreMenu({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOwn = !!user?.id && user.id === post.user_id;
  // Owner-side toggles. We mirror the server values into local state so the
  // optimistic flip feels instant even though we re-fetch on success.
  const p = post as unknown as Record<string, unknown>;
  const [isPinned, setIsPinned] = useState<boolean>(!!p.is_pinned);
  const [tipsEnabled, setTipsEnabled] = useState<boolean>(p.tips_enabled !== false);
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(p.owner_notifications_enabled !== false);
  const [commentsEnabled, setCommentsEnabled] = useState<boolean>(p.comments_enabled !== false);
  const [sharingEnabled, setSharingEnabled] = useState<boolean>(p.sharing_enabled !== false);
  const [visibility, setVisibility] = useState<string>(typeof p.visibility === "string" ? (p.visibility as string) : "public");

  const updateOwnPost = async (patch: Record<string, unknown>) => {
    if (!isOwn) return false;
    const { error } = await (supabase as any).from("user_posts").update(patch).eq("id", post.id);
    if (error) { toast.error("Couldn't update post"); return false; }
    queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });
    return true;
  };

  const handleCopyLink = async () => {
    const url = getPostShareUrl(post.id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleHidePost = async () => {
    if (!user?.id) return navigate("/auth?next=" + encodeURIComponent("/feed"));
    try {
      const { error } = await (supabase as any)
        .from("hidden_posts")
        .insert({ user_id: user.id, post_id: post.id });
      if (error && (error as any).code !== "23505") throw error;
      queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });
      toast.success("Post hidden", {
        description: "We won't show this in your feed again.",
      });
    } catch {
      toast.error("Couldn't hide post");
    }
  };

  const handleMuteAuthor = async () => {
    if (!user?.id) return navigate("/auth?next=" + encodeURIComponent("/feed"));
    try {
      const { error } = await (supabase as any)
        .from("muted_users")
        .insert({ user_id: user.id, muted_user_id: post.user_id });
      if (error && (error as any).code !== "23505") throw error;
      queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });
      toast.success("Author muted", {
        description: `${post.author_name || "This user"}'s posts are hidden.`,
      });
    } catch {
      toast.error("Couldn't mute author");
    }
  };

  const handleReport = async () => {
    if (!user?.id) return navigate("/auth?next=" + encodeURIComponent("/feed"));
    const reason = window.prompt("Why are you reporting this post?");
    if (!reason || !reason.trim()) return;
    try {
      const { error } = await (supabase as any)
        .from("post_reports")
        .insert({
          post_id: post.id,
          reporter_id: user.id,
          reason: reason.trim().slice(0, 500),
        });
      if (error) throw error;
      toast.success("Report submitted", {
        description: "Our team will review it.",
      });
    } catch {
      toast.error("Couldn't submit report");
    }
  };

  const handleDelete = async () => {
    if (!isOwn) return;
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    try {
      const { error } = await (supabase as any)
        .from("user_posts")
        .delete()
        .eq("id", post.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });
      toast.success("Post deleted");
    } catch {
      toast.error("Couldn't delete post");
    }
  };

  // ---------------- Owner-only actions ----------------
  const handlePinToggle = async () => {
    const next = !isPinned;
    setIsPinned(next);
    const ok = await updateOwnPost({ is_pinned: next });
    if (ok) toast.success(next ? "Pinned to your profile" : "Unpinned");
    else setIsPinned(!next);
  };

  const handleSaveOwn = async () => {
    if (!user?.id) return;
    try {
      const { error } = await (supabase as any)
        .from("bookmarks")
        .insert({ user_id: user.id, item_type: "post", item_id: post.id });
      if (error && (error as any).code !== "23505") throw error;
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success("Saved", { description: "Find it in your Saved collection.", action: { label: "View", onClick: () => navigate("/saved") } });
    } catch { toast.error("Couldn't save post"); }
  };

  // The detail-page UIs for these flows are next on the roadmap. Until then
  // we gracefully tell the user it's coming so the menu never lands on a 404.
  const comingSoon = (label: string) => () => toast(`${label} — coming soon`, {
    description: "We're building this — your post is fine, the detail page just isn't live yet.",
  });
  const handleEdit = comingSoon("Edit post");
  const handleManageProducts = comingSoon("Manage product links");
  const handleAddToAlbum = comingSoon("Add to album");
  const handleCreateBoost = comingSoon("Create boost");
  const handleHideFromPeople = comingSoon("Hide from specific people");

  const handleVisibility = async (v: "public" | "friends" | "only_me") => {
    setVisibility(v);
    const ok = await updateOwnPost({ visibility: v });
    if (ok) toast.success(v === "public" ? "Now public" : v === "friends" ? "Friends only" : "Only you can see this");
    else setVisibility(visibility);
  };

  const handleTipsToggle = async () => {
    const next = !tipsEnabled;
    setTipsEnabled(next);
    const ok = await updateOwnPost({ tips_enabled: next });
    if (ok) toast.success(next ? "Tips enabled" : "Tips disabled");
    else setTipsEnabled(!next);
  };

  const handleNotifyToggle = async () => {
    const next = !notifyEnabled;
    setNotifyEnabled(next);
    const ok = await updateOwnPost({ owner_notifications_enabled: next });
    if (ok) toast.success(next ? "Notifications on for this post" : "Notifications muted");
    else setNotifyEnabled(!next);
  };

  const handleCommentsToggle = async () => {
    const next = !commentsEnabled;
    setCommentsEnabled(next);
    const ok = await updateOwnPost({ comments_enabled: next });
    if (ok) toast.success(next ? "Comments allowed" : "Comments turned off");
    else setCommentsEnabled(!next);
  };

  const handleSharingToggle = async () => {
    const next = !sharingEnabled;
    setSharingEnabled(next);
    const ok = await updateOwnPost({ sharing_enabled: next });
    if (ok) toast.success(next ? "Sharing enabled" : "Sharing turned off");
    else setSharingEnabled(!next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More"
          className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-transform"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 max-h-[80vh] overflow-y-auto">
        <DropdownMenuItem onSelect={handleCopyLink} className="gap-2">
          <Link2 className="h-4 w-4" /> Copy link
        </DropdownMenuItem>

        {!isOwn && (
          <>
            <DropdownMenuItem onSelect={handleHidePost} className="gap-2">
              <EyeOff className="h-4 w-4" /> Hide this post
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleMuteAuthor} className="gap-2">
              <UserMinus className="h-4 w-4" /> Mute {post.author_name?.split(" ")[0] || "author"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleReport} className="gap-2 text-destructive focus:text-destructive">
              <Flag className="h-4 w-4" /> Report
            </DropdownMenuItem>
          </>
        )}

        {isOwn && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Quick actions</DropdownMenuLabel>
            <DropdownMenuItem onSelect={handlePinToggle} className="gap-2">
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned ? "Unpin from profile" : "Pin to profile"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSaveOwn} className="gap-2">
              <BookmarkPlus className="h-4 w-4" /> Save to collection
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleEdit} className="gap-2">
              <Pencil className="h-4 w-4" /> Edit post
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleManageProducts} className="gap-2">
              <ShoppingBag className="h-4 w-4" /> Manage product links
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleAddToAlbum} className="gap-2">
              <FolderPlus className="h-4 w-4" /> Add to album
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Visibility & controls</DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                {visibility === "public" ? <Globe2 className="h-4 w-4" /> : visibility === "friends" ? <UsersIcon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                Who can see · {visibility === "friends" ? "Friends" : visibility === "only_me" ? "Only me" : "Public"}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onSelect={() => handleVisibility("public")} className="gap-2">
                  <Globe2 className="h-4 w-4" /> Public {visibility === "public" && "·"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleVisibility("friends")} className="gap-2">
                  <UsersIcon className="h-4 w-4" /> Friends {visibility === "friends" && "·"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleVisibility("only_me")} className="gap-2">
                  <Lock className="h-4 w-4" /> Only me {visibility === "only_me" && "·"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleHideFromPeople} className="gap-2">
                  <EyeOff className="h-4 w-4" /> Hide from specific people…
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={handleTipsToggle} className="gap-2">
              <Coins className="h-4 w-4" /> Tips · {tipsEnabled ? "On" : "Off"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleCommentsToggle} className="gap-2">
              {commentsEnabled ? <MessageSquare className="h-4 w-4" /> : <MessageSquareOff className="h-4 w-4" />}
              Comments · {commentsEnabled ? "On" : "Off"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSharingToggle} className="gap-2">
              {sharingEnabled ? <Share2Icon className="h-4 w-4" /> : <SendIcon className="h-4 w-4 opacity-50" />}
              Sharing · {sharingEnabled ? "On" : "Off"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleNotifyToggle} className="gap-2">
              {notifyEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              Notifications · {notifyEnabled ? "On" : "Off"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleCreateBoost} className="gap-2">
              <Megaphone className="h-4 w-4" /> Create boost
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleDelete} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" /> Delete post
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * FollowPill — adaptive author-action pill.
 *
 *   • Personal account → single **Add Friend** pill. Sending the request
 *     also auto-follows; accepting does too. Removing the friend also
 *     unfollows. (Friend implies follow on both sides.)
 *   • Business account → single **Follow** pill (friending a brand makes
 *     no sense).
 *
 * Account-type detection:
 *   Business if a row exists in `store_profiles` for the target user, OR if
 *   `profiles.display_brand_name` is non-null. Personal otherwise.
 */
function FollowPill({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_out" | "pending_in" | "accepted" | null>(null);
  const [isBusiness, setIsBusiness] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);

  const isSelf = !!user?.id && user.id === targetUserId;

  // Detect personal vs business once per target.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: storeRow }, { data: profileRow }] = await Promise.all([
          (supabase as any).from("store_profiles").select("id").eq("user_id", targetUserId).maybeSingle(),
          (supabase as any).from("profiles").select("display_brand_name").or(`id.eq.${targetUserId},user_id.eq.${targetUserId}`).maybeSingle(),
        ]);
        if (!alive) return;
        setIsBusiness(!!storeRow || !!profileRow?.display_brand_name);
      } catch {
        if (alive) setIsBusiness(false);
      }
    })();
    return () => { alive = false; };
  }, [targetUserId]);

  // Hydrate follow + friend state.
  useEffect(() => {
    if (!user?.id || isSelf) { setFollowing(null); setFriendStatus(null); return; }
    let alive = true;
    (async () => {
      const [{ data: followRow }, { data: outRow }, { data: inRow }] = await Promise.all([
        (supabase as any).from("user_followers").select("id").eq("follower_id", user.id).eq("following_id", targetUserId).maybeSingle(),
        (supabase as any).from("friendships").select("status").eq("user_id", user.id).eq("friend_id", targetUserId).maybeSingle(),
        (supabase as any).from("friendships").select("status").eq("user_id", targetUserId).eq("friend_id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      setFollowing(!!followRow);
      if (outRow?.status === "accepted" || inRow?.status === "accepted") setFriendStatus("accepted");
      else if (outRow?.status === "pending") setFriendStatus("pending_out");
      else if (inRow?.status === "pending") setFriendStatus("pending_in");
      else setFriendStatus("none");
    })();
    return () => { alive = false; };
  }, [user?.id, targetUserId, isSelf]);

  // Don't render until detection is done — prevents flash of wrong button set.
  if (isSelf || isBusiness === null || following === null || friendStatus === null) return null;

  const handleFollow = async () => {
    if (!user?.id) { navigate("/auth?next=" + encodeURIComponent("/feed")); return; }
    if (followBusy) return;
    setFollowBusy(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    try {
      if (wasFollowing) {
        await (supabase as any).from("user_followers").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
      } else {
        const { error } = await (supabase as any).from("user_followers").insert({ follower_id: user.id, following_id: targetUserId });
        if (error && (error as any).code !== "23505") throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["follow-suggestions"] });
    } catch {
      setFollowing(wasFollowing);
      toast.error("Couldn't update — please try again.");
    } finally {
      setFollowBusy(false);
    }
  };

  // Friend ⇄ Follow always travel together for personal accounts.
  // Sending or accepting a friend request also follows; cancelling or
  // removing a friend also unfollows. The user only ever taps one pill.
  const ensureFollow = async () => {
    if (!user?.id) return;
    const { error } = await (supabase as any)
      .from("user_followers")
      .insert({ follower_id: user.id, following_id: targetUserId });
    if (error && (error as any).code !== "23505") throw error;
    setFollowing(true);
  };
  const ensureUnfollow = async () => {
    if (!user?.id) return;
    await (supabase as any)
      .from("user_followers")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);
    setFollowing(false);
  };

  const handleFriend = async () => {
    if (!user?.id) { navigate("/auth?next=" + encodeURIComponent("/feed")); return; }
    if (friendBusy) return;
    setFriendBusy(true);
    const prev = friendStatus;
    const prevFollowing = following;
    try {
      if (prev === "none") {
        // Send request + auto-follow
        setFriendStatus("pending_out");
        const { error } = await (supabase as any).from("friendships").insert({ user_id: user.id, friend_id: targetUserId, status: "pending" });
        if (error && (error as any).code !== "23505") throw error;
        await ensureFollow();
        toast.success("Friend request sent · also following");
      } else if (prev === "pending_out") {
        // Cancel pending request + unfollow
        setFriendStatus("none");
        await (supabase as any).from("friendships").delete().eq("user_id", user.id).eq("friend_id", targetUserId);
        await ensureUnfollow();
        toast("Request cancelled");
      } else if (prev === "pending_in") {
        // Accept their request + follow back
        setFriendStatus("accepted");
        await (supabase as any).from("friendships").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("user_id", targetUserId).eq("friend_id", user.id);
        await ensureFollow();
        toast.success("Friends 🎉");
      } else if (prev === "accepted") {
        // Unfriend + unfollow
        setFriendStatus("none");
        await (supabase as any).from("friendships").delete().or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`);
        await ensureUnfollow();
        toast("Friend removed · unfollowed");
      }
      queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["follow-suggestions"] });
    } catch {
      setFriendStatus(prev);
      setFollowing(prevFollowing);
      toast.error("Couldn't update — please try again.");
    } finally {
      setFriendBusy(false);
    }
  };

  const followLabel = following ? (
    <><Check className="h-3.5 w-3.5" />Following</>
  ) : (
    <><UserPlus className="h-3.5 w-3.5" />Follow</>
  );

  const friendLabel =
    friendStatus === "accepted" ? <><Check className="h-3.5 w-3.5" />Friends</> :
    friendStatus === "pending_out" ? <>Requested</> :
    friendStatus === "pending_in" ? <><UserPlus className="h-3.5 w-3.5" />Accept</> :
    <><UserPlus className="h-3.5 w-3.5" />Add Friend</>;

  const FollowBtn = following ? (
    <button
      type="button"
      onClick={handleFollow}
      disabled={followBusy}
      aria-pressed="true"
      className={cn(
        "shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-full text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-60",
        "bg-muted text-foreground/80 hover:bg-muted/80",
      )}
    >
      {followLabel}
    </button>
  ) : (
    <button
      type="button"
      onClick={handleFollow}
      disabled={followBusy}
      aria-pressed="false"
      className={cn(
        "shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-full text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-60",
        "bg-primary text-primary-foreground hover:opacity-90",
      )}
    >
      {followLabel}
    </button>
  );

  // Business → Follow only
  if (isBusiness) return FollowBtn;

  // Personal → single Add Friend pill (auto-follows on send/accept,
  // auto-unfollows on cancel/unfriend — friend implies follow).
  return friendStatus === "accepted" ? (
    <button
      type="button"
      onClick={handleFriend}
      disabled={friendBusy}
      aria-pressed="true"
      className={cn(
        "shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-full text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-60",
        "bg-muted text-foreground/80 hover:bg-muted/80",
      )}
    >
      {friendLabel}
    </button>
  ) : (
    <button
      type="button"
      onClick={handleFriend}
      disabled={friendBusy}
      aria-pressed="false"
      className={cn(
        "shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-full text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-60",
        friendStatus === "pending_out"
          ? "bg-muted text-foreground/80 hover:bg-muted/80"
          : "bg-primary text-primary-foreground hover:opacity-90",
      )}
    >
      {friendLabel}
    </button>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  activeClass,
  hideLabel = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: number;
  onClick?: () => void;
  active?: boolean;
  activeClass?: string;
  hideLabel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-medium text-foreground/80 hover:bg-muted active:scale-95 transition-all"
    >
      <Icon className={cn("h-4 w-4 transition-colors", active && activeClass)} />
      {!hideLabel && (
        <span className={cn("transition-colors", active && activeClass)}>
          {Number(label || 0).toLocaleString()}
        </span>
      )}
    </button>
  );
}

function FeedEmptyState({
  tab,
  needsAuth,
  onSignIn,
  onDiscover,
}: {
  tab: FeedTab;
  needsAuth: boolean;
  onSignIn: () => void;
  onDiscover: () => void;
}) {
  if (needsAuth) {
    const what = tab === "friends" ? "your friends' posts" : "posts from people you follow";
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
        <p className="text-sm font-semibold">Sign in to see {what}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Create a free account to add friends and follow creators.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-primary px-6 text-[13px] font-semibold text-primary-foreground active:opacity-80"
        >
          Sign in
        </button>
      </div>
    );
  }

  let title = "No posts yet";
  let body = "Posts will show up here as they're shared.";
  let cta: { label: string; onClick: () => void } | null = null;

  if (tab === "friends") {
    title = "No friends yet";
    body = "Add friends to see their posts in this tab.";
    cta = { label: "Find friends", onClick: onDiscover };
  } else if (tab === "following") {
    title = "Nothing in Following yet";
    body = "Follow creators and you'll see their posts here.";
    cta = { label: "Discover creators", onClick: onDiscover };
  }

  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{body}</p>
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-full bg-foreground px-5 text-[13px] font-semibold text-background active:opacity-80"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
