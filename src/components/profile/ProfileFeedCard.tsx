/**
 * ProfileFeedCard — Mirrors FeedCard from ReelsFeedPage for profile "All" tab.
 * Full interactive features: video playback, double-tap to like, emoji reactions,
 * counts next to action icons, "View all comments", clickable avatars.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Send, Play, Bookmark, Globe, MoreVertical,
  Volume2, VolumeX, Eye, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { toUserPostInteractionId } from "@/lib/social/postInteraction";
import CommentsSheet from "@/components/social/CommentsSheet";
import CollapsibleCaption from "@/components/social/CollapsibleCaption";
import { formatCount } from "@/lib/social/formatCount";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHaptic } from "@/hooks/useHaptic";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";

// Emojis constrained by the post_reactions DB CHECK: ❤️ 😂 😮 😢 😡 🔥 (👍 is not allowed)
const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "🔥"];
const POST_REACTIONS_ENABLED = import.meta.env.VITE_ENABLE_POST_REACTIONS === "true";

export type ProfileFeedItem = {
  id: string;
  type: "photo" | "reel";
  likes: number;
  comments: number;
  caption: string;
  time: string;
  url: string | null;
  filterCss?: string;
  views?: number;
  user: { name: string; avatar: string; isVerified?: boolean };
  isShared?: boolean;
  sharedOrigin?: {
    name: string;
    avatar: string;
    caption?: string;
    userId?: string;
    storeSlug?: string;
    source?: "user" | "store";
  } | null;
  createdAt?: string;
  userId?: string;
  location?: string | null;
};

interface ProfileFeedCardProps {
  item: ProfileFeedItem;
  currentUserId: string | undefined;
  profileOwnerId: string | undefined;
  isLiked: boolean;
  isBookmarked: boolean;
  onToggleLike: (item: ProfileFeedItem) => void;
  onToggleBookmark: (item: ProfileFeedItem) => void;
  onOpenMenu: (item: ProfileFeedItem) => void;
  onShare: (postId: string) => void;
  onSelectPost: (item: ProfileFeedItem) => void;
  onCommentsCountChange?: (count: number) => void;
  testId?: string;
}

export default function ProfileFeedCard({
  item,
  currentUserId,
  profileOwnerId,
  isLiked,
  isBookmarked,
  onToggleLike,
  onToggleBookmark,
  onOpenMenu,
  onShare,
  onSelectPost,
  onCommentsCountChange,
  testId,
}: ProfileFeedCardProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [topLikerName, setTopLikerName] = useState<string | null>(null);
  const lastTapRef = useRef(0);
  const openTimerRef = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const haptic = useHaptic();

  // Clear a pending deferred single-tap open on unmount
  useEffect(() => () => { if (openTimerRef.current) clearTimeout(openTimerRef.current); }, []);

  // Deep link: open comments when URL contains ?post=<id>&comments=1
  useEffect(() => {
    if (
      searchParams.get("comments") === "1" &&
      searchParams.get("post") === item.id
    ) {
      setShowComments(true);
    }
  }, [searchParams, item.id]);

  const openComments = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.set("post", item.id);
    next.set("src", "user");
    next.set("comments", "1");
    setSearchParams(next, { replace: false });
    setShowComments(true);
  }, [searchParams, setSearchParams, item.id]);

  const closeComments = useCallback(() => {
    setShowComments(false);
    const next = new URLSearchParams(searchParams);
    next.delete("post");
    next.delete("src");
    next.delete("comments");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const isVideo = item.type === "reel";
  const hasMedia = Boolean(item.url);

  const timeAgo = item.createdAt
    ? (() => { try { return formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }); } catch { return item.time; } })()
    : item.time;

  // Auto-play video when visible
  useEffect(() => {
    if (!isVideo || !hasMedia) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVideo, hasMedia]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  }, []);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (openTimerRef.current) { clearTimeout(openTimerRef.current); openTimerRef.current = null; }
      if (!isLiked) onToggleLike(item);
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 800);
    }
    lastTapRef.current = now;
  }, [isLiked, item, onToggleLike]);

  const handleReaction = async (emoji: string) => {
    if (!POST_REACTIONS_ENABLED) {
      setShowReactionPicker(false);
      toast.error("Reactions are being upgraded");
      return;
    }
    if (!currentUserId) {
      toast.error("Please sign in to react");
      return;
    }
    const previous = selectedReaction;
    const next = previous === emoji ? null : emoji;
    setSelectedReaction(next);
    setShowReactionPicker(false);
    try {
      if (next == null) {
        const { error } = await (supabase as any)
          .from("post_reactions")
          .delete()
          .eq("user_id", currentUserId)
          .eq("post_id", toUserPostInteractionId(item.id))
          .eq("source", "user");
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("post_reactions")
          .upsert(
            { user_id: currentUserId, post_id: toUserPostInteractionId(item.id), source: "user", emoji: next },
            { onConflict: "user_id,post_id,source" },
          );
        if (error) throw error;
        if (!isLiked) onToggleLike(item);
      }
    } catch {
      setSelectedReaction(previous);
      toast.error("Couldn't save reaction");
    }
  };

  // Hydrate the viewer's persisted reaction so it survives remount/reload.
  useEffect(() => {
    if (!POST_REACTIONS_ENABLED || !currentUserId) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("post_reactions")
        .select("emoji")
        .eq("user_id", currentUserId)
        .eq("post_id", toUserPostInteractionId(item.id))
        .eq("source", "user")
        .maybeSingle();
      if (alive && data?.emoji) setSelectedReaction(data.emoji);
    })();
    return () => { alive = false; };
  }, [currentUserId, item.id]);

  const navigateToAuthor = (userId?: string) => {
    if (userId && userId !== currentUserId) {
      navigate(`/user/${userId}`);
    }
  };

  // Resolve the most-recent liker's name for the single "Liked by NAME"
  // social-proof line (name, not number — counts live on the action buttons).
  useEffect(() => {
    if (item.likes <= 0) { setTopLikerName(null); return; }
    let cancelled = false;
    (async () => {
      const { data: rows } = await (supabase as any)
        .from("post_likes")
        .select("user_id, created_at")
        .eq("post_id", item.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (cancelled) return;
      const winner = (rows || []).find((r: { user_id: string }) => r.user_id && r.user_id !== currentUserId)?.user_id;
      if (!winner) { setTopLikerName(null); return; }
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("user_id", winner)
        .maybeSingle();
      if (cancelled) return;
      const display = (prof as { full_name?: string | null; username?: string | null } | null)?.full_name
        || ((prof as { username?: string | null } | null)?.username ? `@${(prof as any).username}` : null);
      setTopLikerName(display);
    })();
    return () => { cancelled = true; };
  }, [item.likes, item.id, currentUserId]);

  return (
    <article
      className="overflow-hidden rounded-2xl border border-border/30 bg-background/92 shadow-sm transition-colors duration-200 hover:border-border/50"
      data-testid={testId}
    >
      {item.isShared && item.sharedOrigin ? (
        <>
          {/* Sharer header */}
          <div className="flex items-start border-b border-border/15">
            <button
              type="button"
              onClick={() => navigateToAuthor(item.userId || profileOwnerId)}
              className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5 py-3 text-left active:opacity-70"
            >
              <Avatar className="h-10 w-10 shrink-0 border border-border/30">
                <AvatarImage src={item.user.avatar || undefined} />
                <AvatarFallback className="text-xs font-bold">{item.user.name?.[0]?.toUpperCase() || "Z"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="inline-flex max-w-full items-center gap-1 text-[13px] font-semibold text-foreground">
                  <span className="truncate">{item.user.name}</span>
                  {isBlueVerified(item.user.isVerified) && <VerifiedBadge size={14} interactive={false} />}
                </p>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-none text-muted-foreground">
                  <span className="shrink-0">{timeAgo}</span>
                  <span className="shrink-0">·</span>
                  <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
              </div>
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onOpenMenu(item); }} className="p-1.5 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          {/* Sharer's own caption */}
          {item.caption && item.caption !== item.sharedOrigin.caption && (
            <div className="px-3.5 pb-3 pt-1">
              <CollapsibleCaption text={item.caption} lines={3} className="text-[13px] leading-5" />
            </div>
          )}

          {/* Embedded original post card */}
          <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-border/30 bg-muted/20">
            <div className="flex items-center border-b border-border/15 px-3 py-2.5">
              <button
                type="button"
                onClick={() => {
                  if (item.sharedOrigin?.source === "store" && item.sharedOrigin.storeSlug) {
                    navigate(`/grocery/shop/${item.sharedOrigin.storeSlug}`);
                  } else if (item.sharedOrigin?.userId) {
                    navigateToAuthor(item.sharedOrigin.userId);
                  }
                }}
                className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={item.sharedOrigin.avatar} />
                  <AvatarFallback className="text-[10px]">{item.sharedOrigin.name?.[0] || "S"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-semibold text-foreground truncate">{item.sharedOrigin.name}</p>
                  <div className="flex items-center gap-1">
                    <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </div>
              </button>
              {item.sharedOrigin?.userId && item.sharedOrigin.userId !== currentUserId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/${item.sharedOrigin!.userId}`);
                  }}
                  className="text-primary text-[13px] font-semibold ml-2 shrink-0"
                >
                  View profile
                </button>
              )}
            </div>

            {item.sharedOrigin.caption && (
              <div className="px-3 pb-2 pt-1">
                <CollapsibleCaption text={item.sharedOrigin.caption} lines={3} className="text-[13px] leading-5" />
              </div>
            )}

            {/* Media */}
            {hasMedia && (
              <div
                ref={containerRef}
                onClick={handleDoubleTap}
                className={cn("relative w-full overflow-hidden bg-black", isVideo && "aspect-square")}
              >
                {isVideo ? (
                  <>
                    <video ref={videoRef} src={item.url!} muted={muted} loop playsInline preload="metadata"
                      onClick={togglePlay} className="h-full w-full object-cover cursor-pointer" />
                    {!isPlaying && (
                      <button type="button" onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <Play className="h-14 w-14 text-white/80 fill-white/80 drop-shadow-lg" />
                      </button>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                      className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center min-h-[44px] min-w-[44px]">
                      {muted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
                    </button>
                  </>
                ) : (
                  <img src={item.url!} alt="" className="block h-auto max-h-[560px] w-full cursor-pointer object-contain"
                    style={{ filter: item.filterCss || "none" }} loading="lazy" decoding="async" onClick={() => { openTimerRef.current = window.setTimeout(() => onSelectPost(item), 300); }} />
                )}
                {/* Double-tap heart */}
                <AnimatePresence>
                  {showDoubleTapHeart && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.4 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <Heart className="h-20 w-20 text-white fill-white drop-shadow-2xl" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Normal post header */}
          <div className="flex items-start border-b border-border/15">
            <button
              type="button"
              onClick={() => navigateToAuthor(item.userId || profileOwnerId)}
              className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5 py-3 text-left active:opacity-70"
            >
              <Avatar className="h-10 w-10 shrink-0 border border-border/30">
                <AvatarImage src={item.user.avatar || undefined} />
                <AvatarFallback className="text-xs font-bold">{item.user.name?.[0]?.toUpperCase() || "Z"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="inline-flex max-w-full items-center gap-1 text-[13px] font-semibold text-foreground">
                  <span className="truncate">{item.user.name}</span>
                  {isBlueVerified(item.user.isVerified) && <VerifiedBadge size={14} interactive={false} />}
                </p>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-none text-muted-foreground">
                  <span className="shrink-0">{timeAgo}</span>
                  <span className="shrink-0">·</span>
                  {item.location && (
                    <>
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </>
                  )}
                  {!item.location && (
                    <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onOpenMenu(item); }} className="p-1.5 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          {/* Caption */}
          {item.caption && (
            <div className="px-3.5 pb-3 pt-1">
              <CollapsibleCaption
                text={item.caption}
                lines={3}
                className="text-[13px] leading-5"
                prefix={<span className="font-semibold mr-1">{item.user.name}</span>}
              />
            </div>
          )}

          {/* Media */}
          {hasMedia && (
            <div
              ref={containerRef}
              onClick={handleDoubleTap}
              className={cn("relative w-full overflow-hidden bg-black", isVideo && "aspect-square")}
            >
              {isVideo ? (
                <>
                  <video ref={videoRef} src={item.url!} muted={muted} loop playsInline preload="metadata"
                    onClick={togglePlay} className="h-full w-full object-cover cursor-pointer" />
                  {!isPlaying && (
                    <button type="button" onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <Play className="h-14 w-14 text-white/80 fill-white/80 drop-shadow-lg" />
                    </button>
                  )}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                    className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center min-h-[44px] min-w-[44px]">
                    {muted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
                  </button>
                </>
              ) : (
                <img src={item.url!} alt="" className="block h-auto max-h-[560px] w-full cursor-pointer object-contain"
                  style={{ filter: item.filterCss || "none" }} loading="lazy" decoding="async" onClick={() => { openTimerRef.current = window.setTimeout(() => onSelectPost(item), 300); }} />
              )}
              {/* Double-tap heart */}
              <AnimatePresence>
                {showDoubleTapHeart && (
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.4 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <Heart className="h-20 w-20 text-white fill-white drop-shadow-2xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Engagement summary — single "Liked by …" social-proof line.
          Numeric counts live exactly once, on the action buttons below. */}
      {item.likes > 0 && (topLikerName || !(isLiked && item.likes === 1)) && (
        <div className="mx-3 mt-1.5 px-1">
          <p className="text-[11px] text-foreground leading-tight">
            {topLikerName ? (
              <span>Liked by <span className="font-semibold">{topLikerName}</span></span>
            ) : (
              <span>Liked by <span className="font-semibold">{formatCount(item.likes)} {item.likes === 1 ? "person" : "people"}</span></span>
            )}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mx-3 mb-2.5 mt-1 flex items-center gap-1 border-t border-border/15 pt-1">
        <div className="flex items-center gap-1 flex-1">
          {/* Like — long-press (touch) or right-click opens the reaction popover */}
          <div className="relative">
            <AnimatePresence>
              {showReactionPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.7 }}
                  transition={{ type: "spring", damping: 16, stiffness: 420, mass: 0.7 }}
                  role="toolbar" aria-label="Reactions"
                  className="zivo-social-reaction-dock absolute bottom-full left-0 mb-3 z-50 flex items-center gap-0.5 rounded-full px-2.5 py-1.5"
                >
                  {REACTIONS.map((emoji) => (
                    <button type="button" key={emoji}
                      onClick={(e) => { e.stopPropagation(); void handleReaction(emoji); }}
                      aria-label={`React with ${emoji}`}
                      aria-pressed={selectedReaction === emoji}
                      className={cn("text-xl p-1.5 rounded-full transition-transform hover:scale-[1.35] active:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        selectedReaction === emoji && "bg-primary/10 ring-2 ring-primary/30")}>
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                if (longPressFired.current) { longPressFired.current = false; return; }
                onToggleLike(item);
              }}
              onPointerDown={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                longPressFired.current = false;
                longPressTimer.current = setTimeout(() => {
                  longPressFired.current = true;
                  haptic("medium");
                  setShowReactionPicker(true);
                }, 350);
              }}
              onPointerUp={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
              onPointerLeave={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
              onPointerCancel={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
              onContextMenu={(e) => { e.preventDefault(); setShowReactionPicker(!showReactionPicker); }}
              aria-label={isLiked ? `Unlike post${formatCount(item.likes) ? `, ${formatCount(item.likes)} likes` : ""}` : `Like post${formatCount(item.likes) ? `, ${formatCount(item.likes)} likes` : ""}`}
              aria-pressed={isLiked}
              title={isLiked ? "Unlike post" : "Like post"}
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
              className={cn(
                "min-h-[40px] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex items-center justify-center gap-1.5 rounded-full transition-colors touch-manipulation",
                isLiked || selectedReaction
                  ? "bg-destructive/10 text-destructive"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {selectedReaction ? (
                <span className="text-lg leading-none" aria-hidden>{selectedReaction}</span>
              ) : (
                <Heart aria-hidden className={cn("h-[20px] w-[20px] transition-all", isLiked && "fill-destructive scale-105")} />
              )}
              {formatCount(item.likes) && (
                <span aria-hidden className={cn("text-[12px] font-semibold tabular-nums", isLiked || selectedReaction ? "text-destructive" : "text-muted-foreground")}>
                  {formatCount(item.likes)}
                </span>
              )}
            </motion.button>
          </div>

          {/* Comment */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={openComments}
            aria-label={`Open comments${formatCount(item.comments) ? `, ${formatCount(item.comments)} comments` : ""}`}
            className="min-h-[40px] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex items-center justify-center gap-1.5 rounded-full text-muted-foreground hover:bg-muted/60 transition-colors touch-manipulation"
          >
            <MessageCircle aria-hidden className="h-[20px] w-[20px]" />
            {formatCount(item.comments) && (
              <span aria-hidden className="text-[12px] text-muted-foreground font-semibold tabular-nums">
                {formatCount(item.comments)}
              </span>
            )}
          </motion.button>

          {/* Share — paper-plane (Send) */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onShare(item.id)}
            aria-label="Share post"
            className="min-h-[40px] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex items-center justify-center gap-1.5 rounded-full text-muted-foreground hover:bg-muted/60 transition-colors touch-manipulation"
          >
            <Send aria-hidden className="h-[20px] w-[20px] shrink-0" />
          </motion.button>
        </div>

        {/* Save / Bookmark */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onToggleBookmark(item)}
          aria-label={isBookmarked ? "Remove bookmark" : "Save post"}
          aria-pressed={isBookmarked}
          title={isBookmarked ? "Remove bookmark" : "Save post"}
          className={cn(
            "min-h-[40px] w-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex items-center justify-center rounded-full transition-colors touch-manipulation",
            isBookmarked
              ? "text-primary"
              : "text-muted-foreground hover:bg-muted/60",
          )}
        >
          <Bookmark aria-hidden className={cn("h-[20px] w-[20px] transition-all", isBookmarked && "fill-primary")} />
        </motion.button>
      </div>

      {/* Views for videos — single views chip on the main-feed token */}
      {isVideo && (item.views || 0) > 0 && (
        <div className="px-3 pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/15 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Eye aria-hidden className="h-3 w-3" />
            {formatCount(item.views || 0)} views
          </span>
        </div>
      )}

      {/* Comments Sheet */}
      <CommentsSheet
        open={showComments}
        onClose={closeComments}
        postId={toUserPostInteractionId(item.id)}
        postSource="user"
        currentUserId={currentUserId || null}
        commentsCount={item.comments}
        onCommentsCountChange={onCommentsCountChange}
      />
    </article>
  );
}
