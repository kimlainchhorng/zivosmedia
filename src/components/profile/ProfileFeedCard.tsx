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
import { formatCount, commentsLinkLabel } from "@/lib/social/formatCount";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";

const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

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
  const lastTapRef = useRef(0);

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
      if (!isLiked) onToggleLike(item);
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 800);
    }
    lastTapRef.current = now;
  }, [isLiked, item, onToggleLike]);

  const handleReaction = (emoji: string) => {
    setSelectedReaction(selectedReaction === emoji ? null : emoji);
    setShowReactionPicker(false);
    if (!isLiked) onToggleLike(item);
  };

  const navigateToAuthor = (userId?: string) => {
    if (userId && userId !== currentUserId) {
      navigate(`/user/${userId}`);
    }
  };

  return (
    <div className="bg-card" data-testid={testId}>
      {item.isShared && item.sharedOrigin ? (
        <>
          {/* Sharer header */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigateToAuthor(item.userId || profileOwnerId)}
              className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0 active:opacity-70"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={item.user.avatar || undefined} />
                <AvatarFallback className="text-xs font-bold">{item.user.name?.[0]?.toUpperCase() || "Z"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold text-foreground truncate inline-flex items-center gap-1">
                  <span className="truncate">{item.user.name}</span>
                  {isBlueVerified(item.user.isVerified) && <VerifiedBadge size={14} interactive={false} />}
                </p>
                <div className="flex items-center gap-1 leading-none mt-0.5">
                  <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
                  <span className="text-[10px] text-muted-foreground leading-none">·</span>
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
            <div className="px-3 pb-2">
              <CollapsibleCaption text={item.caption} lines={3} className="text-[13px]" />
            </div>
          )}

          {/* Embedded original post card */}
          <div className="mb-2 border-y border-border/50 overflow-hidden bg-card">
           <div className="flex items-center px-3 py-2.5">
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
                  Follow
                </button>
              )}
            </div>

            {item.sharedOrigin.caption && (
              <div className="px-3 pb-2">
                <CollapsibleCaption text={item.sharedOrigin.caption} lines={3} className="text-[13px]" />
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
	                  <img src={item.url!} alt="" className="block w-full h-auto cursor-pointer"
	                    style={{ filter: item.filterCss || "none" }} loading="lazy" decoding="async" onClick={() => onSelectPost(item)} />
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
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => navigateToAuthor(item.userId || profileOwnerId)}
              className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0 active:opacity-70"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={item.user.avatar || undefined} />
                <AvatarFallback className="text-xs font-bold">{item.user.name?.[0]?.toUpperCase() || "Z"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-semibold text-foreground truncate inline-flex items-center gap-1">
                  <span className="truncate">{item.user.name}</span>
                  {isBlueVerified(item.user.isVerified) && <VerifiedBadge size={14} interactive={false} />}
                  {item.location && (
                    <>
                      <span className="text-[10px] text-muted-foreground font-normal"> is in </span>
                      <span className="text-[12px] text-foreground font-semibold truncate">{item.location}</span>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  {item.location ? (
                    <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                  ) : (
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
            <div className="px-3 pb-2">
              <CollapsibleCaption
                text={item.caption}
                lines={3}
                className="text-[13px]"
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
	                <img src={item.url!} alt="" className="block w-full h-auto cursor-pointer"
	                  style={{ filter: item.filterCss || "none" }} loading="lazy" decoding="async" onClick={() => onSelectPost(item)} />
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

      {/* Emoji reaction bar */}
      <AnimatePresence>
        {showReactionPicker && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            role="toolbar" aria-label="Reactions"
            className="flex items-center gap-1 px-3 py-2 mx-3 mt-1 bg-card rounded-full shadow-lg border border-border/30 w-fit">
            {REACTIONS.map((emoji) => (
              <button type="button" key={emoji} onClick={() => handleReaction(emoji)}
                aria-label={`React with ${emoji}`}
                aria-pressed={selectedReaction === emoji}
                className={cn("text-xl p-1.5 rounded-full transition-all active:scale-125 hover:bg-muted",
                  selectedReaction === emoji && "bg-primary/10 ring-2 ring-primary/30")}>
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons — v2026 chip-style icons */}
      <div className="flex items-center px-2.5 sm:px-3 py-1.5">
        <div className="flex items-center gap-1.5 flex-1">
          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onToggleLike(item)}
            onContextMenu={(e) => { e.preventDefault(); setShowReactionPicker(!showReactionPicker); }}
            aria-label={isLiked ? `Unlike post${formatCount(item.likes) ? `, ${formatCount(item.likes)} likes` : ""}` : `Like post${formatCount(item.likes) ? `, ${formatCount(item.likes)} likes` : ""}`}
            aria-pressed={isLiked}
            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
            className={cn(
              "min-h-[44px] h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-full transition-all",
              isLiked
                ? "bg-rose-500/12 text-rose-500 shadow-[0_0_18px_-6px_hsl(347_77%_55%/0.55)]"
                : "text-foreground hover:bg-muted/50",
            )}
          >
            {selectedReaction ? (
              <span className="text-lg leading-none" aria-hidden>{selectedReaction}</span>
            ) : (
              <Heart aria-hidden strokeWidth={2.2} className={cn("h-[22px] w-[22px] transition-transform", isLiked && "fill-rose-500 scale-110")} />
            )}
            {formatCount(item.likes) && (
              <span aria-hidden className={cn("text-[12px] font-semibold tabular-nums", isLiked || selectedReaction ? "text-rose-500" : "text-muted-foreground")}>
                {formatCount(item.likes)}
              </span>
            )}
          </motion.button>

          {/* Comment */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={openComments}
            aria-label={`Open comments${formatCount(item.comments) ? `, ${formatCount(item.comments)} comments` : ""}`}
            className="min-h-[44px] h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-full text-foreground hover:bg-muted/50 transition-all"
          >
            <MessageCircle aria-hidden strokeWidth={2.2} className="h-[22px] w-[22px]" />
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
            className="min-h-[44px] h-11 w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 inline-flex items-center justify-center rounded-full text-foreground hover:bg-muted/50 transition-all"
          >
            <Send aria-hidden strokeWidth={2.2} className="h-[21px] w-[21px] -rotate-12" />
          </motion.button>
        </div>

        {/* Save / Bookmark */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onToggleBookmark(item)}
          aria-label={isBookmarked ? "Remove bookmark" : "Save post"}
          aria-pressed={isBookmarked}
          className={cn(
            "min-h-[44px] h-11 w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 inline-flex items-center justify-center rounded-full transition-all",
            isBookmarked
              ? "bg-emerald-500/12 text-emerald-500"
              : "text-foreground hover:bg-muted/50",
          )}
        >
          <Bookmark aria-hidden strokeWidth={2.2} className={cn("h-[22px] w-[22px] transition-transform", isBookmarked && "fill-emerald-500 scale-110")} />
        </motion.button>
      </div>

      {/* View all comments — deep-linkable */}
      {item.comments > 0 && (
        <a
          href={`?post=${encodeURIComponent(item.id)}&src=user&comments=1`}
          onClick={(e) => { e.preventDefault(); openComments(); }}
          aria-label={`View all ${formatCount(item.comments) ?? item.comments} comments on this post`}
          className="block px-3 pb-2 text-left active:opacity-70"
        >
          <p className="text-[13px] text-muted-foreground font-medium hover:text-foreground transition-colors">
            {commentsLinkLabel(item.comments)}
          </p>
        </a>
      )}

      {/* Views for videos */}
      {isVideo && (item.views || 0) > 0 && (
        <div className="px-3 pb-2 flex items-center gap-1">
          <Eye aria-hidden className="h-3 w-3 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">{(item.views || 0).toLocaleString()} views</p>
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
      />
    </div>
  );
}
