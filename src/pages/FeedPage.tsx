/**
 * FeedPage — TikTok / Facebook Reels style full-screen vertical feed
 * Each post fills the entire viewport. Swipe up/down to navigate.
 * Videos auto-play when scrolled into view, pause when scrolled away.
 */
import { lazy, Suspense } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeSupabaseMediaUrl } from "@/utils/normalizeSupabaseMediaUrl";
import { withSupabaseAbortSignal } from "@/utils/withSupabaseAbortSignal";
import { useI18n } from "@/hooks/useI18n";
import SEOHead from "@/components/SEOHead";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import TrendingHashtags, { postHasHashtag } from "@/components/social/TrendingHashtags";
import { EmptyState } from "@/components/ui/empty-state";
import MentionPicker, { detectMention, applyMention } from "@/components/social/MentionPicker";
import { usePostActions, type PostActionTarget } from "@/hooks/usePostActions";
import { usePostReactions } from "@/hooks/usePostReactions";
import { usePostReposts } from "@/hooks/usePostReposts";
import { usePostViewTracking } from "@/hooks/usePostViewTracking";
import { useHiddenPosts } from "@/hooks/useHiddenPosts";
import { useSensitiveMediaPreference } from "@/hooks/useSensitiveMediaPreference";
import type { ReactionEmoji } from "@/components/social/ReactionPicker";
import { topicForUserSync } from "@/lib/security/channelName";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Heart from "lucide-react/dist/esm/icons/heart";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Repeat2 from "lucide-react/dist/esm/icons/repeat-2";
import Store from "lucide-react/dist/esm/icons/store";
import Play from "lucide-react/dist/esm/icons/play";
import Volume2 from "lucide-react/dist/esm/icons/volume-2";
import VolumeX from "lucide-react/dist/esm/icons/volume-x";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Send from "lucide-react/dist/esm/icons/send";
import XIcon from "lucide-react/dist/esm/icons/x";
import Eye from "lucide-react/dist/esm/icons/eye";
import Copy from "lucide-react/dist/esm/icons/copy";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import Search from "lucide-react/dist/esm/icons/search";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import UserCircle from "lucide-react/dist/esm/icons/user-circle";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Flag from "lucide-react/dist/esm/icons/flag";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Music from "lucide-react/dist/esm/icons/music";
import Flame from "lucide-react/dist/esm/icons/flame";
import Languages from "lucide-react/dist/esm/icons/languages";
import Gauge from "lucide-react/dist/esm/icons/gauge";
import PictureInPicture from "lucide-react/dist/esm/icons/picture-in-picture-2";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import Radio from "lucide-react/dist/esm/icons/radio";
import Gift from "lucide-react/dist/esm/icons/gift";
import Film from "lucide-react/dist/esm/icons/film";
import Scissors from "lucide-react/dist/esm/icons/scissors";
import Download from "lucide-react/dist/esm/icons/download";
import FileText from "lucide-react/dist/esm/icons/file-text";
import ImageOff from "lucide-react/dist/esm/icons/image-off";
import Pin from "lucide-react/dist/esm/icons/pin";
import Layers from "lucide-react/dist/esm/icons/layers";
import Tv2 from "lucide-react/dist/esm/icons/tv-2";
import Plane from "lucide-react/dist/esm/icons/plane";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Car from "lucide-react/dist/esm/icons/car";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import Plus from "lucide-react/dist/esm/icons/plus";
import { motion, AnimatePresence, MotionConfig, useDragControls, type PanInfo } from "framer-motion";
import type * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getPostShareUrl } from "@/lib/getPublicOrigin";
import { shouldSendLikeNotification } from "@/lib/social/likeNotificationGuard";
import { useOwnerStoreProfile } from "@/hooks/useOwnerStoreProfile";
import { useHaptic } from "@/hooks/useHaptic";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import RelativeTime from "@/components/social/RelativeTime";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import { useLodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";
import { getLodgingCompletion } from "@/lib/lodging/lodgingCompletion";
import { perfLog, perfMeasure, perfNow } from "@/lib/perfTrace";
import { reportFeedQueryError } from "@/lib/feedQueryTelemetry";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import LoadFailureCard from "@/components/reliability/LoadFailureCard";
import SensitiveMediaGate from "@/components/social/SensitiveMediaGate";
import { detectSensitiveContent, isSensitiveReportReason, isSensitiveSchemaDriftError } from "@/lib/social/sensitiveContent";
// videoRepair is heavy (FFmpeg WASM) — dynamic import only when needed

const FEED_STORE_PAGE_SIZE = 18;
const FEED_USER_PAGE_SIZE = 30;
const firstMediaLogged = { value: false };
const FEED_USER_REELS_SELECT =
  "id, user_id, media_url, media_urls, media_type, caption, likes_count, comments_count, shares_count, views_count, created_at, audio_name, location, shared_from_post_id, shared_from_user_id, is_sensitive, sensitive_reason";
const FEED_USER_REELS_SELECT_FALLBACK =
  "id, user_id, media_url, media_urls, media_type, caption, likes_count, comments_count, shares_count, views_count, created_at, audio_name, location, shared_from_post_id, shared_from_user_id";
type ReelSourceFilter = "all" | "people" | "shops";
const REEL_SOURCE_FILTERS: Array<{
  key: ReelSourceFilter;
  label: string;
  shortLabel: string;
}> = [
  { key: "all", label: "All reels", shortLabel: "All" },
  { key: "people", label: "People reels", shortLabel: "People" },
  { key: "shops", label: "Shop reels", shortLabel: "Shops" },
];

const isVideoMediaUrl = (url: string) => /\.(mp4|mov|webm|avi|mkv|m4v)(\?.*)?$/i.test(url);

const normalizeUserPostMediaType = (post: { media_type?: string | null; media_urls?: string[] | null; media_url?: string | null }) => {
  const type = String(post.media_type || "").toLowerCase();
  const urls = Array.isArray(post.media_urls) && post.media_urls.length > 0
    ? post.media_urls
    : post.media_url ? [post.media_url] : [];
  return type === "video" || type === "reel" || urls.some(isVideoMediaUrl) ? "video" : "image";
};

const blendCreatorAndStoreReels = (items: FeedPost[]) => {
  const creators = items.filter((item) => item.source === "user");
  const stores = items.filter((item) => item.source !== "user");
  const blended: FeedPost[] = [];
  let creatorIndex = 0;
  let storeIndex = 0;

  while (creatorIndex < creators.length || storeIndex < stores.length) {
    if (creatorIndex < creators.length) blended.push(creators[creatorIndex++]);
    if (storeIndex < stores.length) blended.push(stores[storeIndex++]);
  }

  return blended;
};
// Shared translation cache — keyed by `${targetLang}:${caption}` so the same
// text in the same target language is never fetched twice across all cards.
const translationCache = new Map<string, string>();

// ── Lazy components ──────────────────────────────────────────────────────────
// All lazy() calls are grouped AFTER imports. Interleaving them with imports
// can cause "Cannot access 'lazy' before initialization" TDZ errors under
// Vite + react-refresh dev-mode transforms.
const UnifiedShareSheet = lazy(() => import("@/components/shared/ShareSheet"));
const ZivoMobileNav = lazy(() => import("@/components/app/ZivoMobileNav"));
const NavBar = lazy(() => import("@/components/home/NavBar"));
const CreatePostModal = lazy(() => import("@/components/social/CreatePostModal"));
const FeedSidebar = lazy(() => import("@/components/social/FeedSidebar"));
const SafeCaption = lazy(() => import("@/components/social/SafeCaption"));
const SuggestedUsersCarousel = lazy(() => import("@/components/social/SuggestedUsersCarousel"));
const NewPostsPill = lazy(() => import("@/components/social/NewPostsPill"));
const PostActionsMenu = lazy(() => import("@/components/social/PostActionsMenu"));
const ReactionPicker = lazy(() => import("@/components/social/ReactionPicker"));
const CanonicalCommentsSheet = lazy(() => import("@/components/social/CommentsSheet"));
const CommentPreview = lazy(() => import("@/components/social/CommentPreview"));
const ReactionSummary = lazy(() => import("@/components/social/ReactionSummary"));
const RepostDialog = lazy(() => import("@/components/social/RepostDialog"));
const PostInsights = lazy(() => import("@/components/social/PostInsights"));
const CaptionEditDialog = lazy(() => import("@/components/social/CaptionEditDialog"));
const CommentHeartButton = lazy(() => import("@/components/social/CommentHeartButton"));
const CommentRowActions = lazy(() => import("@/components/social/CommentRowActions"));
const ReelsCoachmarks = lazy(() => import("@/components/social/ReelsCoachmarks"));
const LikedByModal = lazy(() => import("@/components/social/LikedByModal"));

interface FeedPost {
  id: string;
  store_id: string;
  caption: string | null;
  media_urls: string[];
  media_type: string;
  is_published: boolean;
  created_at: string;
  store_name?: string;
  store_logo?: string;
  store_slug?: string;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  reposts_count?: number;
  view_count?: number;
  audio_name?: string | null;
  source?: "store" | "user";
  author_id?: string;
  author_name?: string;
  author_avatar?: string | null;
  author_is_verified?: boolean;
  store_is_verified?: boolean;
  location?: string | null;
  shared_from_post_id?: string | null;
  shared_from_user_id?: string | null;
  is_sensitive?: boolean | null;
  sensitive_reason?: string | null;
}

type FeedPostSource = NonNullable<FeedPost["source"]>;
type EngagementCountField = "comments_count" | "shares_count" | "reposts_count";
type RemixType = "duet" | "stitch";

type CommentTarget = {
  postId: string;
  source: FeedPostSource;
  initialCount: number;
};

type ReelComposerDraft = {
  mode: "reel" | "story";
  caption?: string;
  audioName?: string;
  sharedMediaUrl?: string;
  sharedMediaType?: "image" | "video";
  sharedPostId?: string;
  sharedPostAuthorId?: string;
  sharedPostAuthorName?: string;
  remixType?: RemixType;
  successMessage?: string;
};

const getReelAuthorLabel = (post: FeedPost) => {
  if (post.source === "user") return post.author_name ? `@${post.author_name}` : "this creator";
  return post.store_name || "this shop";
};

const getReelSoundLabel = (post: FeedPost) =>
  post.audio_name ||
  `Original Sound - ${post.source === "user" ? post.author_name || "ZIVO" : post.store_name || "ZIVO"}`;

const getSharedMediaType = (url?: string): "image" | "video" =>
  url && isVideoMediaUrl(url) ? "video" : "image";

const getReelRemixSource = (post: FeedPost) => ({
  sharedPostId: getFeedPostRawId(post),
  sharedPostAuthorId: post.source === "user" ? post.author_id : undefined,
  sharedPostAuthorName: post.source === "user" ? post.author_name : post.store_name,
});

const getFeedPostRawId = (postOrId: Pick<FeedPost, "id"> | string): string => {
  const id = typeof postOrId === "string" ? postOrId : postOrId.id;
  return id.replace(/^u-/, "");
};

const getFeedPostSource = (post: Pick<FeedPost, "id" | "source">): "store" | "user" =>
  post.source === "user" || post.id.startsWith("u-") ? "user" : "store";

const getFeedPostBookmarkKey = (post: Pick<FeedPost, "id" | "source">): string =>
  `${getFeedPostSource(post)}:${getFeedPostRawId(post)}`;

const shouldDismissBottomSheet = (info: PanInfo) =>
  info.offset.y > 64 || info.velocity.y > 520;

/* ── Scrolling music ticker ───────────────────────────────────── */
/**
 * IntersectionObserver-based sentinel rendered at the end of the feed.
 * When it scrolls into view, fires `onReachEnd` (debounced via isFetching).
 * Renders a small "Loading more…" indicator while the next page is in flight.
 */
function InfiniteScrollSentinel({
  isFetching,
  onReachEnd,
  totalCount,
  onRefresh,
  onBackToTop,
  onSwitchMode,
  feedMode,
}: {
  isFetching: boolean;
  onReachEnd: () => void;
  totalCount?: number;
  onRefresh?: () => void;
  onBackToTop?: () => void;
  onSwitchMode?: () => void;
  feedMode?: "foryou" | "following";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastFiredAt = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching) {
          // Throttle to once per second
          const now = Date.now();
          if (now - lastFiredAt.current < 1000) return;
          lastFiredAt.current = now;
          onReachEnd();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isFetching, onReachEnd]);

  return (
    <div
      ref={ref}
      className="w-full h-full snap-start flex items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-black px-6"
    >
      {isFetching ? (
        <div className="flex flex-col items-center gap-3 text-white/70">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm font-medium">Loading more reels…</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 max-w-sm text-center">
          {/* Hero icon */}
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent flex items-center justify-center border border-white/10">
              <span className="text-4xl">🎬</span>
            </div>
            <span className="absolute -top-1 -right-1 text-2xl">✨</span>
          </div>

          <div>
            <h3 className="text-white font-bold text-lg mb-1">You're all caught up</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              {typeof totalCount === "number" && totalCount > 0
                ? `You've watched all ${totalCount} reel${totalCount === 1 ? "" : "s"} in your feed.`
                : "You've reached the end of your feed."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="w-full py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform shadow-lg shadow-primary/30"
              >
                Check for new reels
              </button>
            )}
            <div className="flex gap-2">
              {onBackToTop && (
                <button
                  type="button"
                  onClick={onBackToTop}
                  className="flex-1 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white text-sm font-semibold active:scale-95 transition-transform"
                >
                  Back to top
                </button>
              )}
              {onSwitchMode && feedMode && (
                <button
                  type="button"
                  onClick={onSwitchMode}
                  className="flex-1 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white text-sm font-semibold active:scale-95 transition-transform"
                >
                  Try {feedMode === "foryou" ? "Following" : "For You"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MusicTicker({ name, avatarUrl, isPlaying, onClick }: { name: string; avatarUrl?: string | null; isPlaying?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="inline-flex min-h-[28px] max-w-full min-w-0 items-center gap-2 overflow-hidden active:opacity-70"
    >
      <div
        className={cn(
          "w-7 h-7 rounded-full overflow-hidden border-2 border-black bg-gradient-to-br from-zinc-700 via-zinc-900 to-black flex items-center justify-center shrink-0",
          isPlaying && "animate-[spin_5s_linear_infinite]",
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        )}
      </div>
      <div className="overflow-hidden flex-1 min-w-0">
        <div className="truncate whitespace-nowrap text-white text-xs font-medium drop-shadow">
          {name}
        </div>
      </div>
    </button>
  );
}

function looksPlayableVideoElement(video: HTMLVideoElement) {
  const hasDuration = Number.isFinite(video.duration) && video.duration > 0;
  const hasDimensions = video.videoWidth > 0 && video.videoHeight > 0;
  const hasDecodedFrame = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

  return hasDuration && hasDimensions && hasDecodedFrame;
}

// ── Individual reel card ──────────────────────────────────────────────────────

function ReelCard({
  post,
  isActive,
  globalMuted,
  onToggleMute,
  onNavigate,
  userId,
  userLikedPostIds,
  onToggleLike,
  onOpenComments,
  onOpenShare,
  onOpenSound,
  onOpenActions,
  onStartDuet,
  onStartStitch,
  onShareToStory,
  onGiftCreator,
  currentReaction,
  onSetReaction,
  onOpenRepost,
  isReposted,
  shouldPreload = false,
  onAutoSkip,
  initialSaved = false,
  initialIsFollowing = false,
  initialAuthorIsLive = false,
}: {
  post: FeedPost;
  isActive: boolean;
  globalMuted: boolean;
  onToggleMute: () => void;
  onNavigate: (slug: string) => void;
  userId: string | null;
  userLikedPostIds: Set<string>;
  onToggleLike: (postId: string, currentlyLiked: boolean) => void;
  onOpenComments: (target: CommentTarget) => void;
  onOpenShare: (postId: string) => void;
  onOpenSound: (soundName: string) => void;
  onOpenActions?: () => void;
  onStartDuet?: (post: FeedPost) => void;
  onStartStitch?: (post: FeedPost) => void;
  onShareToStory?: (post: FeedPost) => void;
  onGiftCreator?: (post: FeedPost) => void;
  currentReaction?: ReactionEmoji | null;
  onSetReaction?: (emoji: ReactionEmoji) => void;
  onOpenRepost?: () => void;
  isReposted?: boolean;
  /** True when this reel is the next one in the snap-scroller, so its
   *  video can begin loading before the user actually swipes. */
  shouldPreload?: boolean;
  /** Called when the reel has been in a playback-error state for 5+ s and
   *  the user hasn't tapped to retry — used by the parent to auto-scroll
   *  to the next reel rather than strand the user on a broken video. */
  onAutoSkip?: () => void;
  /** Pre-fetched bookmark state — avoids a per-card Supabase query on mount. */
  initialSaved?: boolean;
  /** Pre-fetched follow state — avoids a per-card RPC call on mount. */
  initialIsFollowing?: boolean;
  /** Pre-fetched live status — avoids a per-card live_streams query on activation. */
  initialAuthorIsLive?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const haptic = useHaptic();
  const sensitiveMediaPreference = useSensitiveMediaPreference(userId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaPerfLogged = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isBlobLoading, setIsBlobLoading] = useState(false);
  const [saved, setSaved] = useState(initialSaved);
  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved, post.id]);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  // Long-press → open reaction picker instead of plain like
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track view: counts after the post stays active in the viewport for 1.5s
  const rawPostId = getFeedPostRawId(post);
  const bookmarkSource = getFeedPostSource(post);
  const remixSourceType = post.shared_from_post_id
    ? post.caption?.trim().toLowerCase().startsWith("stitch with")
      ? "stitch"
      : post.caption?.trim().toLowerCase().startsWith("duet with")
        ? "duet"
        : "remix"
    : null;
  const remixSourceLabel = remixSourceType === "stitch"
    ? "Stitch source"
    : remixSourceType === "duet"
      ? "Duet source"
      : remixSourceType === "remix"
        ? "Original source"
        : null;
  usePostViewTracking(rawPostId, post.source ?? "store", isActive, userId);
  const [videoProgress, setVideoProgress] = useState(0); // 0..1
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isPipToggling, setIsPipToggling] = useState(false);
  const [isPinningProfile, setIsPinningProfile] = useState(false);
  const moreSheetDragControls = useDragControls();
  const speedSheetDragControls = useDragControls();
  const moreSheetPointerStartY = useRef<number | null>(null);
  const speedSheetPointerStartY = useRef<number | null>(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [translatedCaption, setTranslatedCaption] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Auto-translate: when this card becomes active and the caption is in a
  // non-Latin script that doesn't match the user's selected app language,
  // fetch the translation in the background and render it inline below the
  // original (TikTok / Reels behaviour).
  const cardI18n = useI18n();
  const targetLang = (cardI18n.locale || "en").split("-")[0].toLowerCase();
  useEffect(() => {
    if (!isActive) return;
    if (!post.caption || translatedCaption || isTranslating) return;
    const caption = post.caption;
    // eslint-disable-next-line no-misleading-character-class
    const hasNonLatin = /[؀-ۿ֐-׿ऀ-ॿ฀-๿຀-໿က-႟ក-៿぀-ゟ゠-ヿ一-鿿가-힯Ѐ-ӿ]/.test(caption);
    // Heuristic: if the caption already looks like the user's language, skip.
    // Khmer / Thai / Chinese / Korean / Japanese are detected by Unicode block.
    const looksKhmer = /[ក-៿]/.test(caption);
    const looksThai = /[฀-๿]/.test(caption);
    const looksChinese = /[一-鿿]/.test(caption);
    const looksJapanese = /[぀-ゟ゠-ヿ]/.test(caption);
    const looksKorean = /[가-힯]/.test(caption);
    const looksArabic = /[؀-ۿ]/.test(caption);
    const sourceMatchesTarget =
      (targetLang === "km" && looksKhmer) ||
      (targetLang === "th" && looksThai) ||
      (targetLang === "zh" && looksChinese) ||
      (targetLang === "ja" && looksJapanese) ||
      (targetLang === "ko" && looksKorean) ||
      (targetLang === "ar" && looksArabic);
    if (!hasNonLatin || sourceMatchesTarget) return;

    const cacheKey = `${targetLang}:${caption}`;
    const cached = translationCache.get(cacheKey);
    if (cached) { setTranslatedCaption(cached); return; }

    let cancelled = false;
    setIsTranslating(true);
    (async () => {
      try {
        const q = encodeURIComponent(caption);
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${q}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const text = (data[0] as [string, string][]).map((s) => s[0]).join("");
        translationCache.set(cacheKey, text);
        if (!cancelled) setTranslatedCaption(text);
      } catch {
        // Silent failure — original caption stays visible.
      } finally {
        if (!cancelled) setIsTranslating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isActive, post.caption, translatedCaption, isTranslating, targetLang]);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const [likedByOpen, setLikedByOpen] = useState(false);
  const [heartParticles, setHeartParticles] = useState<{ id: number; x: number; size: number; rotate: number; delay: number; emoji?: string }[]>([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [bufferedProgress, setBufferedProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  // Track connectivity inside the card so the buffering spinner can hide
  // when the page-level offline banner is already explaining the issue.
  const [cardIsOnline, setCardIsOnline] = useState<boolean>(() => typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const onOnline = () => setCardIsOnline(true);
    const onOffline = () => setCardIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Auto-resume on reconnect — when connectivity returns and this reel is
  // the active one, retry play() so users don't have to manually tap to
  // un-stall the video. Browsers may naturally resume buffering, but the
  // play() call ensures we don't sit on a frozen frame.
  const [authorIsLive, setAuthorIsLive] = useState(initialAuthorIsLive);
  const [liveAlertDismissed, setLiveAlertDismissed] = useState(false);
  const [isHoldingFastForward, setIsHoldingFastForward] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    // Persist user's chosen speed across reels/sessions. Bound to the four
    // values exposed in the picker so a malformed/stored string can't slip
    // through and break <video>.playbackRate.
    if (typeof window === "undefined") return 1.0;
    try {
      const stored = localStorage.getItem("zivo_reel_speed");
      const n = stored ? parseFloat(stored) : 1.0;
      return [0.5, 1.0, 1.5, 2.0].includes(n) ? n : 1.0;
    } catch { return 1.0; }
  });
  useEffect(() => {
    try { localStorage.setItem("zivo_reel_speed", String(playbackSpeed)); } catch {}
  }, [playbackSpeed]);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const fastForwardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextClickRef = useRef(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const wasPlayingBeforeScrub = useRef(false);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<number | null>(null);
  const doubleTapHeartTimerRef = useRef<number | null>(null);
  const doubleTapLikeLockRef = useRef(false);
  const [doubleTapPoint, setDoubleTapPoint] = useState<{ x: number; y: number } | null>(null);
  const savingBookmarkRef = useRef(false);

  const formatVideoTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [triedBlobFallback, setTriedBlobFallback] = useState(false);
  const [triedFFmpegRepair, setTriedFFmpegRepair] = useState(false);
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);

  // Follow state — seeded from parent's batch-fetched followingIds set
  const authorId = post.source === "user" ? post.author_id : null;
  const isSelf = !!userId && userId === authorId;
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followLoading, setFollowLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !authorId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("user_followers" as any).delete()
          .eq("follower_id", userId).eq("following_id", authorId);
        setIsFollowing(false);
      } else {
        await (supabase as any).from("user_followers").insert({
          follower_id: userId,
          following_id: authorId,
        });
        setIsFollowing(true);
        // Notify new follower (best-effort — failure here must not roll back the follow)
        try {
          const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", userId).single();
          await supabase.functions.invoke("send-push-notification", {
            body: { user_id: authorId, notification_type: "new_follower", title: "New Follower 🔔", body: `${sp?.full_name || "Someone"} started following you`, data: { type: "new_follower", follower_id: userId, avatar_url: sp?.avatar_url, action_url: `/user/${userId}` } },
          });
        } catch (notifyErr) {
          console.warn("[ReelCard] follow push notify failed", notifyErr);
        }
      }
    } catch (err) {
      console.error("[ReelCard] follow toggle failed", err);
      toast.error("Couldn't update follow. Try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  const liked = userLikedPostIds.has(post.id);

  const normalizedUrls = useMemo(
    () => (post.media_urls || []).map((u) =>
      normalizeSupabaseMediaUrl(
        u,
        { preferredBucket: post.source === "user" ? "user-posts" : "store-posts" },
      )
    ).filter(Boolean),
    [post.media_urls, post.source],
  );
  const firstUrl = normalizedUrls[0] || "";
  const detectedVideoUrl = normalizedUrls.find((url) => /\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i.test(url));
  const isVideoPost = post.media_type === "video" || Boolean(detectedVideoUrl);
  const sourceUrl = detectedVideoUrl || firstUrl;
  const sensitiveMediaMatch = useMemo(
    () => detectSensitiveContent(post.caption, {
      creatorMarked: Boolean(post.is_sensitive),
      reportMarked: Boolean(post.sensitive_reason && post.sensitive_reason !== "creator_marked"),
      reason: post.sensitive_reason,
    }),
    [post.caption, post.is_sensitive, post.sensitive_reason],
  );
  const shouldGateSensitiveMedia = Boolean(sourceUrl || firstUrl) && sensitiveMediaPreference.blurSensitiveMedia && sensitiveMediaMatch.isSensitive;
  const [sensitiveMediaRevealed, setSensitiveMediaRevealed] = useState(false);
  const sensitiveMediaLocked = shouldGateSensitiveMedia && !sensitiveMediaRevealed;

  useEffect(() => {
    setSensitiveMediaRevealed(false);
  }, [post.id, shouldGateSensitiveMedia]);

  // Must be defined before effects that reference it
  const currentSrc = blobSrc || sourceUrl;
  const renderSrc = blobSrc || (isBlobLoading ? "" : sourceUrl);

  useEffect(() => {
    if (!sensitiveMediaLocked) return;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
  }, [sensitiveMediaLocked]);

  useEffect(() => {
    if (sensitiveMediaLocked || !isActive || !isVideoPost || !currentSrc) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = globalMuted;
    void video.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [currentSrc, globalMuted, isActive, isVideoPost, sensitiveMediaLocked]);

  useEffect(() => {
    if (!cardIsOnline || !isActive || sensitiveMediaLocked) return;
    const v = videoRef.current;
    if (!v || !v.paused) return;
    void v.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [cardIsOnline, isActive, sensitiveMediaLocked]);

  // Auto-play / pause when active changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoPost || sensitiveMediaLocked) return;

    if (isActive) {
      video.muted = globalMuted;
      void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, isVideoPost, sensitiveMediaLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pause when the tab/window becomes hidden (Page Visibility API).
  // Without this, videos keep playing in background tabs and burn battery.
  // Only the active reel is touched — inactive ones are already paused.
  useEffect(() => {
    if (!isActive || !isVideoPost || sensitiveMediaLocked) return;
    const handleVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        if (!video.paused) {
          video.pause();
          setIsPlaying(false);
        }
      } else {
        // Tab back in focus — resume only if user hasn't manually paused.
        if (video.paused && !isScrubbing) {
          void video.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isActive, isVideoPost, isScrubbing, sensitiveMediaLocked]);

  // Re-attempt play whenever the video source changes (e.g. after blob/repair recovery).
  // When <video key={currentSrc}> remounts with a new src the isActive effect above
  // does NOT re-run (its deps are unchanged), so this dedicated effect fills that gap.
  // globalMuted is intentionally excluded — mute sync is handled by its own effect.
  useEffect(() => {
    if (!isActive || !isVideoPost || !currentSrc || sensitiveMediaLocked) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = globalMuted;
    void video.play().then(() => setIsPlaying(true)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSrc, sensitiveMediaLocked]);

  // Bridge the top-right Speed/PiP buttons (page-level) to the active reel
  // via window events. Only the active card listens, so multi-reel pages
  // don't fight over a single dispatch.
  useEffect(() => {
    if (!isActive) return;
    const onOpenSpeed = () => setShowSpeedPicker(true);
    const onTogglePip = async () => {
      const v = videoRef.current;
      if (!v) return;
      try {
        const doc = document as any;
        if (doc.pictureInPictureElement) await doc.exitPictureInPicture();
        else if ((v as any).requestPictureInPicture) await (v as any).requestPictureInPicture();
        else toast.error("Picture-in-picture isn't supported on this device");
      } catch { toast.error("Couldn't open picture-in-picture"); }
    };
    window.addEventListener("zivo-reel-open-speed", onOpenSpeed);
    window.addEventListener("zivo-reel-toggle-pip", onTogglePip);
    return () => {
      window.removeEventListener("zivo-reel-open-speed", onOpenSpeed);
      window.removeEventListener("zivo-reel-toggle-pip", onTogglePip);
    };
  }, [isActive]);

  // Auto-skip safety net — if a reel has been in a playback-error state
  // for 5+ seconds AND the user is the active viewer AND we haven't already
  // skipped this reel, advance to the next one. Once-per-card so a chain of
  // broken videos can't cause runaway scrolling.
  const autoSkippedRef = useRef(false);
  useEffect(() => {
    if (!isActive || !hasPlaybackError || !onAutoSkip) return;
    if (autoSkippedRef.current) return;
    const timer = window.setTimeout(() => {
      autoSkippedRef.current = true;
      toast("Skipped — that reel couldn't load");
      onAutoSkip();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isActive, hasPlaybackError, onAutoSkip]);

  // Cleanup: if the user unmounts mid-hold, kill the timer + reset speed.
  useEffect(() => {
    return () => {
      if (fastForwardTimerRef.current) clearTimeout(fastForwardTimerRef.current);
      const v = videoRef.current;
      if (v) { try { v.playbackRate = 1.0; } catch {} }
    };
  }, []);

  // Apply the user's chosen playback speed whenever it changes (and not
  // currently in a long-press fast-forward, which temporarily overrides).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isHoldingFastForward) return;
    try { v.playbackRate = playbackSpeed; } catch {}
  }, [playbackSpeed, isHoldingFastForward, currentSrc]);

  // Media Session metadata — when a reel becomes active, surface its
  // author + caption to the OS so lock screens, Bluetooth headphones, and
  // Control Center / Android media notification show the right thing
  // (and skip-track buttons advance through the feed).
  useEffect(() => {
    if (!isActive) return;
    const ms = (typeof navigator !== "undefined" ? navigator.mediaSession : undefined);
    if (!ms) return;
    try {
      const author = post.source === "user" ? post.author_name : post.store_name;
      const avatar = (post.source === "user" ? post.author_avatar : post.store_logo) || undefined;
      ms.metadata = new window.MediaMetadata({
        title: post.caption?.trim() || "ZIVO Reel",
        artist: author || "ZIVO",
        album: "ZIVO",
        artwork: avatar
          ? [
              { src: avatar, sizes: "96x96", type: "image/jpeg" },
              { src: avatar, sizes: "192x192", type: "image/jpeg" },
              { src: avatar, sizes: "512x512", type: "image/jpeg" },
            ]
          : [],
      });
      ms.setActionHandler("play", () => { void videoRef.current?.play().catch(() => {}); });
      ms.setActionHandler("pause", () => { videoRef.current?.pause(); });
      ms.setActionHandler("nexttrack", () => {
        window.dispatchEvent(new CustomEvent("zivo-reel-next"));
      });
      ms.setActionHandler("previoustrack", () => {
        window.dispatchEvent(new CustomEvent("zivo-reel-prev"));
      });
    } catch { /* MediaSession is best-effort */ }
    return () => {
      try {
        ms.setActionHandler("play", null);
        ms.setActionHandler("pause", null);
        ms.setActionHandler("nexttrack", null);
        ms.setActionHandler("previoustrack", null);
      } catch {}
    };
  }, [isActive, post.id, post.caption, post.author_name, post.store_name, post.author_avatar, post.store_logo, post.source]);

  // Live status is seeded from parent's batch query — no per-card DB call needed.

  // Realtime engagement bumps for the active reel. When other viewers like
  // or comment on the post you're watching, the right-column counters
  // animate up without requiring a refetch. Only subscribes for the active
  // reel so we don't open one channel per off-screen card.
  const [liveLikesCount, setLiveLikesCount] = useState(post.likes_count || 0);
  const [liveCommentsCount, setLiveCommentsCount] = useState(post.comments_count || 0);
  useEffect(() => {
    setLiveLikesCount(post.likes_count || 0);
    setLiveCommentsCount(post.comments_count || 0);
  }, [post.id, post.likes_count, post.comments_count]);
  useEffect(() => {
    if (!isActive) return;
    const isUser = post.source === "user";
    const rawId = post.id.startsWith("u-") ? post.id.slice(2) : post.id;
    const likesTable = isUser ? "post_likes" : "store_post_likes";
    const channel = supabase
      .channel(`reel-engagement-${post.id}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: likesTable, filter: `post_id=eq.${rawId}` },
        () => setLiveLikesCount((n) => n + 1),
      )
      .on(
        "postgres_changes" as any,
        { event: "DELETE", schema: "public", table: likesTable, filter: `post_id=eq.${rawId}` },
        () => setLiveLikesCount((n) => Math.max(0, n - 1)),
      )
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${rawId}` },
        () => setLiveCommentsCount((n) => n + 1),
      )
      .on(
        "postgres_changes" as any,
        { event: "DELETE", schema: "public", table: "post_comments", filter: `post_id=eq.${rawId}` },
        () => setLiveCommentsCount((n) => Math.max(0, n - 1)),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isActive, post.id, post.source]);

  // Bookmark state is seeded from parent's batch query (no per-card Supabase call needed)

  const handleSaveToggle = async () => {
    if (!userId) {
      toast.error("Please sign in to save reels");
      return;
    }
    if (savingBookmarkRef.current) return;
    savingBookmarkRef.current = true;
    const next = !saved;
    haptic(next ? "medium" : "light");
    setSaved(next);
    try {
      if (next) {
        const [modernBookmark, legacyBookmark] = await Promise.all([
          (supabase as any).from("post_bookmarks").upsert(
            {
              user_id: userId,
              post_id: rawPostId,
              source: bookmarkSource,
            },
            { onConflict: "user_id,post_id,source", ignoreDuplicates: true },
          ),
          (supabase as any).from("bookmarks").upsert(
            {
              user_id: userId,
              item_id: post.id,
              item_type: "post",
              collection_name: "Reels",
            },
            { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
          ),
        ]);
        const error = modernBookmark.error || legacyBookmark.error;
        if (error && !String(error.message || "").toLowerCase().includes("duplicate")) throw error;
        toast.success("Saved", {
          action: { label: "View", onClick: () => navigate("/saved") },
        });
      } else {
        const alternateIds = Array.from(new Set([post.id, rawPostId]));
        const [modernDelete, legacyDelete] = await Promise.all([
          (supabase as any)
            .from("post_bookmarks")
            .delete()
            .eq("user_id", userId)
            .eq("post_id", rawPostId)
            .eq("source", bookmarkSource),
          (supabase as any)
            .from("bookmarks")
            .delete()
            .eq("user_id", userId)
            .eq("item_type", "post")
            .in("item_id", alternateIds),
        ]);
        if (modernDelete.error || legacyDelete.error) throw modernDelete.error || legacyDelete.error;
        toast.success("Removed from saved");
      }
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-posts-count"] });
    } catch (e: any) {
      setSaved(!next);
      const reason = e?.message || e?.error_description || "unknown";
      console.error("[handleSaveToggle]", e);
      toast.error(`Couldn't update saved: ${reason}`);
    } finally {
      savingBookmarkRef.current = false;
    }
  };

  // Double-tap on the video to like — TikTok signature interaction.
  // Wraps the existing tap-to-toggle: if two taps land within 280ms,
  // we skip the play/pause and fire a like instead.
  // Spawn 6–8 floating particles that drift up and fade — fired whenever
  // the user likes / reacts to a post. Pass an emoji string to use that
  // instead of the default heart (e.g. "🔥" when the user picks the fire
  // reaction from the long-press picker).
  const spawnFloatingHearts = (emoji?: string) => {
    const count = 6 + Math.floor(Math.random() * 3);
    const now = Date.now();
    const next = Array.from({ length: count }).map((_, i) => ({
      id: now + i,
      x: 30 + Math.random() * 40, // 30–70% from left, clusters near center
      size: 22 + Math.random() * 20, // 22–42px (emoji needs a bit more room)
      rotate: -25 + Math.random() * 50,
      delay: Math.random() * 0.25,
      emoji,
    }));
    setHeartParticles((prev) => [...prev, ...next]);
    // Garbage-collect each batch after the longest possible animation finishes
    window.setTimeout(() => {
      setHeartParticles((prev) => prev.filter((h) => !next.some((n) => n.id === h.id)));
    }, 1900);
  };

  const particleTextSizeClass = (size: number) => {
    if (size < 28) return "text-2xl";
    if (size < 34) return "text-3xl";
    return "text-4xl";
  };

  const particleIconSizeClass = (size: number) => {
    if (size < 28) return "w-6 h-6";
    if (size < 34) return "w-8 h-8";
    return "w-10 h-10";
  };

  const handleVideoClick = (event?: React.MouseEvent<HTMLElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setDoubleTapPoint({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      } else {
        setDoubleTapPoint(null);
      }
      if (!liked && !doubleTapLikeLockRef.current) {
        doubleTapLikeLockRef.current = true;
        haptic("medium");
        onToggleLike(post.id, false);
        spawnFloatingHearts();
        window.setTimeout(() => {
          doubleTapLikeLockRef.current = false;
        }, 800);
      }
      setShowDoubleTapHeart(true);
      if (doubleTapHeartTimerRef.current) clearTimeout(doubleTapHeartTimerRef.current);
      doubleTapHeartTimerRef.current = window.setTimeout(() => setShowDoubleTapHeart(false), 520);
      return;
    }
    lastTapRef.current = now;
    if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = window.setTimeout(() => {
      singleTapTimerRef.current = null;
      togglePlay();
    }, 300);
  };

  // Reset per-post playback state when source changes
  useEffect(() => {
    setIsPlaying(false);
    setHasPlaybackError(false);
    setIsRepairing(false);
    setIsBlobLoading(false);
    setTriedBlobFallback(false);
    setTriedFFmpegRepair(false);
    setHasLoadedFrame(false);
    if (blobSrc) {
      URL.revokeObjectURL(blobSrc);
      setBlobSrc(null);
    }
  }, [post.id, sourceUrl]);

  // Sync global mute toggle
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = globalMuted;
  }, [globalMuted]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (blobSrc) URL.revokeObjectURL(blobSrc);
    };
  }, [blobSrc]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (doubleTapHeartTimerRef.current) clearTimeout(doubleTapHeartTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isVideoPost || blobSrc || triedBlobFallback || !sourceUrl) return;
    if (!/^https?:\/\//i.test(sourceUrl)) return;

    // Capacitor iOS WebView is more reliable with same-origin blob URLs for remote videos.
    void tryBlobFallback(sourceUrl);
  }, [blobSrc, isVideoPost, sourceUrl, triedBlobFallback]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    const nextMuted = !globalMuted;

    haptic("light");
    onToggleMute();

    if (!video) return;

    video.muted = nextMuted;
    video.defaultMuted = nextMuted;
    video.volume = 1;

    if (!nextMuted) {
      void video.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          toast.error("Tap video once to enable sound");
        });
    }
  };

  const capturePoster = (video: HTMLVideoElement) => {
    if (video.videoWidth === 0) return;
    // Skip the black frame that exists before the seek settles at a real position.
    if (video.currentTime < 0.5) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      setPosterUrl(canvas.toDataURL("image/jpeg", 0.8));
    } catch (err) {
      // On CORS canvas taint, fall back to blob so the next capture succeeds.
      if (err instanceof DOMException && err.name === "SecurityError") {
        void tryBlobFallback(blobSrc ?? sourceUrl ?? "");
      }
    }
  };

  const tryBlobFallback = async (url: string) => {
    if (triedBlobFallback) return;
    setTriedBlobFallback(true);
    setIsBlobLoading(true);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("fetch failed");
      const blob = await resp.blob();
      setBlobSrc(URL.createObjectURL(new Blob([blob], { type: blob.type || "video/mp4" })));
      setHasPlaybackError(false);
    } catch {
      // Keep quiet here; FFmpeg repair is attempted next.
    } finally {
      setIsBlobLoading(false);
    }
  };

  const tryFFmpegRepair = async (url: string) => {
    if (triedFFmpegRepair) return;
    setTriedFFmpegRepair(true);
    setIsRepairing(true);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("fetch failed");
      const blob = await resp.blob();
      const { repairVideoBlob } = await import("@/utils/videoRepair");
      const repairedUrl = await repairVideoBlob(blob);
      if (repairedUrl) {
        if (blobSrc) URL.revokeObjectURL(blobSrc);
        setBlobSrc(repairedUrl);
        setHasPlaybackError(false);
      } else {
        setHasPlaybackError(false);
      }
    } catch {
      setHasPlaybackError(false);
    } finally {
      setIsRepairing(false);
    }
  };

  const runRecovery = async () => {
    if (isBlobLoading) return;

    if (!sourceUrl) {
      setHasPlaybackError(true);
      return;
    }

    if (!triedBlobFallback) {
      await tryBlobFallback(sourceUrl);
      return;
    }

    if (!triedFFmpegRepair) {
      await tryFFmpegRepair(sourceUrl);
      return;
    }

    setHasPlaybackError(false);
  };

  // Stall detection: fires once after 6 s if the video has not shown a frame.
  // triedBlobFallback / triedFFmpegRepair are intentionally NOT in the dep array —
  // including them caused stacked timers that prematurely set hasPlaybackError=true
  // (as early as 5.4 s) before async recovery finished on slow connections.
  // The stall condition avoids false positives for videos that are merely buffering.
  useEffect(() => {
    if (!isActive || !isVideoPost || !currentSrc || hasLoadedFrame || isRepairing) return;

    const timeoutId = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;

      // Only recover when the network has truly stalled, or when metadata is loaded
      // but dimensions are zero (the iOS black-frame bug). Do NOT trigger while the
      // browser is still buffering normally (NETWORK_LOADING).
      const trulyStalled =
        video.networkState === 3 /* NETWORK_STALLED is not in all TS typings */ ||
        (video.readyState >= HTMLMediaElement.HAVE_METADATA &&
          (video.videoWidth === 0 || video.videoHeight === 0));

      if (trulyStalled) {
        void runRecovery();
      }
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isVideoPost, currentSrc, hasLoadedFrame, isRepairing, isBlobLoading]);

  return (
    <div
      className="zivo-reel-no-callout relative w-full h-[100dvh] lg:h-full bg-black overflow-hidden snap-start flex-shrink-0"
      onContextMenu={(e) => e.preventDefault()}
      translate="no"
    >

      {/* Live creator alert banner */}
      <AnimatePresence>
        {authorIsLive && isActive && !liveAlertDismissed && (
          <motion.div
            key="live-banner"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="absolute left-3 right-3 z-50 flex items-center gap-2.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2.5 shadow-xl"
            style={{ top: "calc(var(--zivo-safe-top,0px) + 56px)" }}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <p className="flex-1 text-white text-[13px] font-semibold truncate">
              {post.source === "user" ? post.author_name : post.store_name} is LIVE now
            </p>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/live/${post.author_id}`); }}
              className="shrink-0 px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-bold active:scale-95 transition-transform"
            >
              Join
            </button>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setLiveAlertDismissed(true); }}
              className="shrink-0 p-1"
              aria-label="Dismiss"
            >
              <XIcon className="h-3.5 w-3.5 text-white/60" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media */}
      <SensitiveMediaGate
        active={shouldGateSensitiveMedia}
        revealed={sensitiveMediaRevealed}
        onReveal={() => setSensitiveMediaRevealed(true)}
        reason={sensitiveMediaMatch.label}
        className="absolute inset-0"
      >
      {isVideoPost ? (
        <video
          ref={videoRef}
          key={currentSrc}
          src={renderSrc || undefined}
          poster={posterUrl ?? undefined}
          className="zivo-reel-no-callout absolute inset-0 w-full h-full object-cover"
          playsInline
          loop
          muted={globalMuted}
          preload={sensitiveMediaLocked ? "none" : isActive ? "auto" : shouldPreload ? "metadata" : "none"}
          onLoadedData={(e) => {
            if (!mediaPerfLogged.current && !firstMediaLogged.value) {
              mediaPerfLogged.current = true;
              firstMediaLogged.value = true;
              perfLog("fullscreen feed first media loaded", {
                postId: post.id,
                source: post.source ?? "store",
                isActive,
              });
            }
            setHasLoadedFrame(true);
            setHasPlaybackError(false);
            capturePoster(e.currentTarget);
            if (isActive && !sensitiveMediaLocked) {
              e.currentTarget.muted = globalMuted;
              void e.currentTarget.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          }}
          onCanPlay={(e) => {
            setIsBuffering(false);
            if (!looksPlayableVideoElement(e.currentTarget)) return;
            setHasLoadedFrame(true);
            setHasPlaybackError(false);
            if (isActive && !sensitiveMediaLocked) {
              e.currentTarget.muted = globalMuted;
              void e.currentTarget.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          }}
          onLoadedMetadata={(e) => {
            // Seek to 10% of duration, at least 1.5 s, capped at 3 s — skips dark iPhone intros.
            const dur = e.currentTarget.duration;
            if (Number.isFinite(dur) && dur > 0) {
              setVideoDuration(dur);
              const t = Math.min(3, Math.max(dur * 0.1, 1.5));
              try { e.currentTarget.currentTime = t; } catch { /* ignore */ }
            }
          }}
          onDurationChange={(e) => {
            // Some streams emit duration after metadata; pick it up here too.
            const dur = e.currentTarget.duration;
            if (Number.isFinite(dur) && dur > 0) setVideoDuration(dur);
          }}
          onSeeked={(e) => {
            capturePoster(e.currentTarget);
          }}
          onPlay={() => { setIsPlaying(true); setIsBuffering(false); }}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (Number.isFinite(v.duration) && v.duration > 0) {
              setVideoProgress(Math.min(1, v.currentTime / v.duration));
            }
          }}
          onProgress={(e) => {
            // Update buffered range whenever the browser reports progress.
            // We use the buffered range that contains the current playhead so
            // the indicator always reflects what's available "ahead" of the
            // user, not just the largest accidental island.
            const v = e.currentTarget;
            if (!Number.isFinite(v.duration) || v.duration <= 0) return;
            const buf = v.buffered;
            for (let i = 0; i < buf.length; i++) {
              if (buf.start(i) <= v.currentTime && v.currentTime <= buf.end(i)) {
                setBufferedProgress(Math.min(1, buf.end(i) / v.duration));
                return;
              }
            }
            // Fallback to the last buffered range
            if (buf.length > 0) {
              setBufferedProgress(Math.min(1, buf.end(buf.length - 1) / v.duration));
            }
          }}
          onError={async () => {
            setIsPlaying(false);
            if (isBlobLoading) return;
            await runRecovery();
          }}
        />
      ) : firstUrl && !hasImageError ? (
        <img
          src={firstUrl}
          alt=""
          className="zivo-reel-no-callout absolute inset-0 w-full h-full object-cover"
          loading={isActive ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => {
            if (mediaPerfLogged.current || firstMediaLogged.value) return;
            mediaPerfLogged.current = true;
            firstMediaLogged.value = true;
            perfLog("fullscreen feed first media loaded", {
              postId: post.id,
              source: post.source ?? "store",
              isActive,
            });
          }}
          onError={() => setHasImageError(true)}
        />
      ) : (
        /* Text-only post or broken image — readable gradient card */
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-5 backdrop-blur-sm border border-white/10">
            {hasImageError
              ? <ImageOff className="h-7 w-7 text-white/70" />
              : <FileText className="h-7 w-7 text-white/70" />
            }
          </div>
          {post.caption && (
            <p className="text-white text-center text-lg sm:text-xl font-semibold leading-snug line-clamp-6 drop-shadow-lg">
              {post.caption}
            </p>
          )}
          {hasImageError && (
            <p className="mt-3 text-white/50 text-xs">Image could not be loaded</p>
          )}
        </div>
      )}
      </SensitiveMediaGate>

      {/* Tap-to-play/pause · double-tap-to-like · long-press-to-2x.
          - Pointer down starts a 350ms timer that, on fire, kicks the
            video to 2× speed and shows the FF badge.
          - Pointer up before the timer fires falls through to the click
            handler (single/double-tap detection).
          - Pointer up after the timer fires resets to 1× and suppresses
            the click so we don't toggle play/pause on release. */}
      {isVideoPost && !hasPlaybackError && !isRepairing && !isBlobLoading && (
        <button
          type="button"
          onClick={(e) => {
            if (suppressNextClickRef.current) {
              suppressNextClickRef.current = false;
              return;
            }
            handleVideoClick(e);
          }}
          onPointerDown={() => {
            if (fastForwardTimerRef.current) clearTimeout(fastForwardTimerRef.current);
            fastForwardTimerRef.current = setTimeout(() => {
              const v = videoRef.current;
              if (!v) return;
              try { v.playbackRate = 2.0; } catch {}
              setIsHoldingFastForward(true);
              suppressNextClickRef.current = true;
              haptic("heavy"); // tactile cue that 2× kicked in
            }, 350);
          }}
          onPointerUp={() => {
            if (fastForwardTimerRef.current) {
              clearTimeout(fastForwardTimerRef.current);
              fastForwardTimerRef.current = null;
            }
            if (isHoldingFastForward) {
              const v = videoRef.current;
              if (v) { try { v.playbackRate = playbackSpeed; } catch {} }
              setIsHoldingFastForward(false);
            }
          }}
          onPointerCancel={() => {
            if (fastForwardTimerRef.current) {
              clearTimeout(fastForwardTimerRef.current);
              fastForwardTimerRef.current = null;
            }
            if (isHoldingFastForward) {
              const v = videoRef.current;
              if (v) { try { v.playbackRate = playbackSpeed; } catch {} }
              setIsHoldingFastForward(false);
            }
          }}
          onPointerLeave={() => {
            // If the user drags off the video while holding, treat as cancel.
            if (fastForwardTimerRef.current) {
              clearTimeout(fastForwardTimerRef.current);
              fastForwardTimerRef.current = null;
            }
            if (isHoldingFastForward) {
              const v = videoRef.current;
              if (v) { try { v.playbackRate = playbackSpeed; } catch {} }
              setIsHoldingFastForward(false);
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="zivo-reel-no-callout absolute inset-0 z-10 touch-manipulation"
          aria-label={isPlaying ? "Pause" : "Play"}
        />
      )}

      {/* 2× fast-forward badge — pulses while the user holds */}
      <AnimatePresence>
        {isHoldingFastForward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 top-[calc(var(--zivo-safe-top,0px)+84px)] -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md flex items-center gap-1.5 pointer-events-none"
          >
            <span className="text-white text-sm font-bold tabular-nums">2×</span>
            <span className="text-white text-xs">▶▶</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap heart burst */}
      <AnimatePresence>
        {showDoubleTapHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.08, 0.96], opacity: [0, 1, 0.92] }}
            exit={{ scale: 1.28, opacity: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="absolute z-30 pointer-events-none"
            style={doubleTapPoint
              ? { left: doubleTapPoint.x, top: doubleTapPoint.y, transform: "translate(-50%, -50%)" }
              : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
            }
          >
            <Heart className="w-20 h-20 text-white fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating reaction particles — spawns on like or reaction, drifts
          up + fades. Pointer-events disabled so it doesn't block anything.
          Particles render either the user's chosen emoji (when reacting)
          or a red Heart icon (default like). */}
      {heartParticles.length > 0 && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
          {heartParticles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0, y: 0, rotate: p.rotate }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0.6],
                y: [-20, -120 - Math.random() * 80, -200 - Math.random() * 120, -300 - Math.random() * 160],
                x: [0, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 60],
              }}
              transition={{ duration: 1.6, delay: p.delay, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                bottom: "30%",
              }}
            >
              {p.emoji ? (
                <span
                  className={cn("drop-shadow-lg leading-none", particleTextSizeClass(p.size))}
                  aria-hidden
                >
                  {p.emoji}
                </span>
              ) : (
                <Heart
                  className={cn("text-destructive fill-destructive drop-shadow-lg", particleIconSizeClass(p.size))}
                />
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Mid-playback buffering spinner — only shown when the user has
          actually started watching but the network stalled. Hidden during
          the initial-load and FFmpeg-repair flows (they have their own UI),
          and hidden when offline (the top banner already explains it). */}
      {isVideoPost && isBuffering && isActive && cardIsOnline && !hasPlaybackError && !isRepairing && !isBlobLoading && hasLoadedFrame && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
            <span className="text-white text-[11px] font-semibold">Buffering…</span>
          </div>
        </div>
      )}

      {/* Paused indicator */}
      {isVideoPost && !isPlaying && !hasPlaybackError && !isRepairing && !isBlobLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
            <Play className="w-7 h-7 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Converting overlay */}
      {(isRepairing || isBlobLoading) && !hasLoadedFrame && (
        <div className="absolute inset-x-0 top-[45%] z-30 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 backdrop-blur-md border border-white/10">
            <RefreshCw className="w-4 h-4 text-white animate-spin" />
            <p className="text-[11px] text-white/90 font-semibold">{isBlobLoading ? "Loading..." : "Preparing..."}</p>
          </div>
        </div>
      )}

      {/* Playback error */}
      {hasPlaybackError && !isRepairing && !isBlobLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/70 px-8 text-center">
          <p className="text-sm font-semibold text-white">Video is loading slowly</p>
          <p className="text-xs text-white/70">
            Tap once to retry playback.
          </p>
        </div>
      )}

      {/* Gradient for readability */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-black/65 via-transparent to-black/10" />

      {/* CC subtitle overlay — shows caption as bottom subtitle bar */}
      <AnimatePresence>
        {showCaptions && post.caption && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-4 right-16 bottom-[calc(var(--zivo-safe-bottom,0px)+160px)] z-25 pointer-events-none"
          >
            <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-white text-[13px] sm:text-sm font-medium leading-snug text-center">
                {post.caption}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom-left: store info + caption */}
      <div className="absolute bottom-0 left-0 right-[92px] z-30 px-4 pb-[calc(var(--zivo-safe-bottom,0px)+112px)]">
        {remixSourceLabel && post.shared_from_post_id && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/reels?post=${encodeURIComponent(post.shared_from_post_id || "")}`);
            }}
            className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
          >
            {remixSourceType === "stitch" ? (
              <Scissors className="w-3 h-3 text-white" />
            ) : (
              <Film className="w-3 h-3 text-white" />
            )}
            <span className="text-white text-[11px] font-semibold">{remixSourceLabel}</span>
          </button>
        )}

        {/* Owner-only insights pill — small "Your reel · X views" affordance
            that takes the creator to their post analytics on tap. */}
        {userId && post.author_id && userId === post.author_id && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const rawId = post.id.startsWith("u-") ? post.id.slice(2) : post.id;
              navigate(`/u/post/${rawId}/insights`);
            }}
            className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
          >
            <Eye className="w-3 h-3 text-white" />
            <span className="text-white text-[11px] font-semibold">
              Your reel · {(post.view_count || 0) > 999 ? `${((post.view_count || 0) / 1000).toFixed(1)}k` : (post.view_count || 0)} views
            </span>
          </button>
        )}

        <div className="flex items-center gap-2.5 mb-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (post.source === "user" && post.author_id) {
                onNavigate(`__user__${post.author_id}`);
              } else if (post.store_slug) {
                onNavigate(post.store_slug);
              }
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 active:opacity-70"
          >
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/80 bg-black/40">
                {(post.source === "user" ? post.author_avatar : post.store_logo) ? (
                  <img src={(post.source === "user" ? post.author_avatar : post.store_logo)!} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {post.source === "user"
                      ? <UserCircle className="w-5 h-5 text-white" />
                      : <Store className="w-5 h-5 text-white" />}
                  </div>
                )}
              </div>
              {/* TikTok-style + badge on avatar */}
              {authorId && !isSelf && !isFollowing && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-black">
                  <span className="text-primary-foreground text-[10px] font-bold leading-none">+</span>
                </div>
              )}
            </div>
            <span className="min-w-0 max-w-full text-white font-bold text-sm sm:text-[15px] lg:text-base drop-shadow-lg inline-flex items-center gap-1 truncate">
              <span className="truncate">{post.source === "user" ? post.author_name : post.store_name}</span>
              {(post.source === "user" ? isBlueVerified(post.author_is_verified) : isBlueVerified(post.store_is_verified)) && (
                <VerifiedBadge size={16} />
              )}
            </span>
          </button>

          {/* Trending badge — engagement signal blended with recency.
              Shown when (likes·1 + comments·2 + shares·3 + views·0.05) is
              high relative to age, capping at "very recent + very engaging". */}
          {(() => {
            const ageHours = Math.max(1, (Date.now() - new Date(post.created_at || Date.now()).getTime()) / 3_600_000);
            const score =
              (post.likes_count || 0)
              + (post.comments_count || 0) * 2
              + (post.view_count || 0) * 0.05;
            const trendingScore = score / Math.max(1, Math.log2(2 + ageHours));
            const isTrending = trendingScore >= 50;
            if (!isTrending) return null;
            return (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500/90 backdrop-blur-sm border border-white/20 shadow-lg">
                <Flame className="w-3 h-3 text-white" />
                <span className="text-white text-[10px] font-bold leading-none">Trending</span>
              </span>
            );
          })()}

          {/* Follow / Following button (user posts) */}
          {authorId && !isSelf && (
            <button
              type="button"
              onClick={handleFollow}
              disabled={followLoading}
              className={cn(
                "shrink-0 px-3 py-1 rounded-md text-xs font-bold transition-all active:scale-95 border backdrop-blur-sm hover:opacity-90",
                isFollowing
                  ? "bg-white/10 border-white/30 text-white"
                  : "bg-ig-gradient border-transparent text-white shadow-sm shadow-rose-500/25"
              )}
            >
              {followLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isFollowing ? (
                <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Following</span>
              ) : (
                "Follow"
              )}
            </button>
          )}
          {/* Visit shop CTA (store posts) — tap to open the merchant page */}
          {post.source === "store" && post.store_slug && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigate(post.store_slug!); }}
              className="shrink-0 px-3 py-1 rounded-md text-xs font-bold transition-all active:scale-95 border-transparent backdrop-blur-sm bg-ig-gradient text-white shadow-sm shadow-rose-500/25 hover:opacity-90 inline-flex items-center gap-1"
            >
              <Store className="w-3.5 h-3.5" />
              Visit shop
            </button>
          )}
        </div>
        {/* Location row only — TikTok-style: hide the post timestamp on the
            feed (it makes month-old reels feel stale). Time still shows on
            profile pages. */}
        {post.location && (
          <div className="flex items-center gap-2 mb-1.5 text-white/80 text-[11px] drop-shadow">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{post.location}</span>
            </span>
          </div>
        )}
        {post.caption && (() => {
          const isLong = post.caption.length > 90;
          // The auto-translate useEffect handles whether to fetch — the JSX
          // below just shows the translated text when it's available.
          return (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (isLong) setCaptionExpanded((v) => !v); }}
                className={cn(
                  "block min-h-[40px] w-full text-left text-white text-sm sm:text-[15px] lg:text-base drop-shadow leading-snug mb-1",
                  !captionExpanded && "line-clamp-2",
                  isLong ? "cursor-pointer" : "cursor-default",
                )}
              >
                <Suspense fallback={<span>{post.caption}</span>}>
                  <SafeCaption text={post.caption} />
                </Suspense>
                {isLong && (
                  <span className="text-white/70 ml-1 font-semibold">
                    {captionExpanded ? " less" : " …more"}
                  </span>
                )}
              </button>
              {/* Auto-translated caption — shown inline below the original
                  with a tiny "Translated" label, TikTok/Reels-style. The
                  fetch is triggered automatically by the useEffect above
                  when the card becomes active. */}
              {translatedCaption && (
                <div className="mt-1 mb-2 inline-flex items-start gap-1.5 text-[12px] text-white/85 leading-snug">
                  <Languages className="w-3 h-3 mt-0.5 shrink-0 text-white/60" />
                  <span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white/55 mr-1.5">Translated</span>
                    {translatedCaption}
                  </span>
                </div>
              )}
            </>
          );
        })()}

        {/* Hashtag chips — extracted from caption, rendered as primary-colored
            pills below the caption so they're easier to tap on a tall reel.
            Deduped + capped at 6 to avoid clutter. */}
        {post.caption && (() => {
          const matches = post.caption.match(/#[a-zA-Z0-9_]{2,30}/g);
          if (!matches || matches.length === 0) return null;
          const seen = new Set<string>();
          const tags = matches.filter((t) => {
            const k = t.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          }).slice(0, 6);
          const isChallenge = tags.some((t) => /challenge|duet|trend|viral/i.test(t));
          return (
            <>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <button type="button"
                    key={tag}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/explore?tag=${encodeURIComponent(tag.slice(1))}`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[11px] font-semibold active:scale-95 transition-transform"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {isChallenge && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const challengeTag = tags.find((t) => /challenge|duet|trend|viral/i.test(t));
                    navigate(`/explore?tag=${encodeURIComponent((challengeTag || tags[0]).slice(1))}`);
                    toast.success("Join the challenge — create your own video with this sound!");
                  }}
                  className="flex items-center gap-1.5 mb-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary text-white text-[11px] font-bold active:scale-95 transition-transform shadow-lg"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Join Challenge</span>
                </button>
              )}
            </>
          );
        })()}

        {/* Reaction summary + comment preview */}
        <div className="mb-2 flex items-start justify-between gap-3">
          <Suspense fallback={null}>
            <CommentPreview
              postId={rawPostId}
              source={post.source ?? "store"}
              totalCount={liveCommentsCount}
              onOpen={() => onOpenComments({
                postId: post.id,
                source: getFeedPostSource(post),
                initialCount: liveCommentsCount,
              })}
            />
          </Suspense>
          <Suspense fallback={null}>
            <ReactionSummary postId={rawPostId} source={post.source ?? "store"} />
          </Suspense>
        </div>

        {/* Liked-by inline link — opens the LikedByModal listing every account
            that liked this post. Hidden when nobody has liked yet. */}
        {liveLikesCount > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLikedByOpen(true); }}
            className="block text-white/85 text-xs font-medium drop-shadow mb-2 active:opacity-70"
            aria-label="View who liked this post"
          >
            Liked by{" "}
            <span className="font-bold underline decoration-white/40 underline-offset-2">
              {liveLikesCount > 999 ? `${(liveLikesCount / 1000).toFixed(1)}k` : liveLikesCount}{" "}
              {liveLikesCount === 1 ? "person" : "people"}
            </span>
          </button>
        )}
        {likedByOpen && (
          <Suspense fallback={null}>
            <LikedByModal
              open={likedByOpen}
              onOpenChange={setLikedByOpen}
              postId={rawPostId}
              source={(post.source ?? "store") as "user" | "store"}
              totalCount={liveLikesCount}
            />
          </Suspense>
        )}

        {/* Music ticker */}
        <MusicTicker
          name={post.audio_name || `Original Sound - ${post.source === "user" ? post.author_name || "ZIVO" : post.store_name || "ZIVO"}`}
          avatarUrl={post.source === "user" ? post.author_avatar : post.store_logo}
          isPlaying={isActive && isPlaying}
          onClick={() => {
            const soundLabel = post.audio_name || `Original Sound - ${post.source === "user" ? post.author_name || "ZIVO" : post.store_name || "ZIVO"}`;
            onOpenSound(soundLabel);
          }}
        />
      </div>

      {/* Right-side action buttons (TikTok-style) — responsive scale.
          - smallest (<sm, e.g. iPhone SE): tight gap, Views row hidden
            (it's display-only) so the column fits a 568-px-tall viewport
            without clipping the avatar off the top.
          - tablet/desktop: all items, still grouped tightly */}
      <div className="absolute right-5 sm:right-3 lg:right-4 bottom-[calc(var(--zivo-safe-bottom,0px)+128px)] z-30 flex flex-col items-center justify-end gap-1.5 sm:gap-2 lg:gap-2.5">
        {/* Like / Reaction (long-press for emoji picker) */}
        <div className="relative">
          {onSetReaction && (
            <Suspense fallback={null}>
              <ReactionPicker
                open={showReactionPicker}
                onClose={() => setShowReactionPicker(false)}
                onPick={(emoji) => {
                  haptic("medium");
                  onSetReaction(emoji);
                  spawnFloatingHearts(emoji);
                }}
              />
            </Suspense>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              haptic(liked ? "light" : "medium");
              // Burst only when transitioning unliked → liked (matches TikTok)
              if (!liked) {
                setShowLikeBurst(true);
                spawnFloatingHearts();
                window.setTimeout(() => setShowLikeBurst(false), 600);
              }
              onToggleLike(post.id, liked);
            }}
            onPointerDown={(e) => {
              if (!onSetReaction) return;
              e.stopPropagation();
              if (longPressTimer.current) clearTimeout(longPressTimer.current);
              longPressTimer.current = setTimeout(() => setShowReactionPicker(true), 350);
            }}
            onPointerUp={() => {
              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
            }}
            onPointerLeave={() => {
              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
            }}
            onContextMenu={(e) => { e.preventDefault(); if (onSetReaction) setShowReactionPicker(true); }}
            className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
            aria-label={currentReaction ? `Reacted ${currentReaction}` : "Like"}
            title="Like (L)"
          >
            <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition-transform active:scale-90">
              {currentReaction ? (
                <span className="text-2xl leading-none" aria-hidden>
                  {currentReaction}
                </span>
              ) : (
                <Heart
                  className={cn(
                    "w-6 h-6 lg:w-7 lg:h-7 transition-transform",
                    liked ? "text-destructive fill-destructive" : "text-white",
                  )}
                />
              )}
            </div>
            {liveLikesCount > 0 && (
              <motion.span
                key={liveLikesCount}
                initial={{ scale: 1.3, color: "#ef4444" }}
                animate={{ scale: 1, color: "#ffffff" }}
                transition={{ duration: 0.3 }}
                className="text-xs font-semibold drop-shadow tabular-nums"
              >
                {liveLikesCount > 999 ? `${(liveLikesCount / 1000).toFixed(1)}k` : liveLikesCount}
              </motion.span>
            )}
          </button>
        </div>

        {/* Comment */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments({
              postId: post.id,
              source: getFeedPostSource(post),
              initialCount: liveCommentsCount,
            });
          }}
          className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
          aria-label="Comment"
          title="Comments"
        >
          <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition-transform active:scale-90">
            <MessageCircle className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
          </div>
          {liveCommentsCount > 0 && (
            <motion.span
              key={liveCommentsCount}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-white text-xs font-semibold drop-shadow tabular-nums"
            >
              {liveCommentsCount > 999 ? `${(liveCommentsCount / 1000).toFixed(1)}k` : liveCommentsCount}
            </motion.span>
          )}
        </button>

        {/* Views — only render when there's a real count to show. Empty
            "0" labels make the video feel lifeless and clutter the rail. */}
        {(post.view_count || 0) > 0 && (
          <div className="hidden sm:flex flex-col items-center gap-0.5">
            <Eye className="w-9 h-9 lg:w-10 lg:h-10 text-white drop-shadow-lg" />
            <span className="text-white text-xs font-semibold drop-shadow">
              {post.view_count!}
            </span>
          </div>
        )}

        {/* Repost — hidden on small phones to keep the rail TikTok-lean
            (5 icons max). Still reachable on tablets/desktop and through the
            More menu / share sheet on mobile. */}
        {onOpenRepost && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenRepost(); }}
            className="hidden sm:flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
            aria-label={isReposted ? "Reposted" : "Repost"}
          >
            <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition-transform active:scale-90">
              <Repeat2 className={cn(
                "w-6 h-6 lg:w-7 lg:h-7",
                isReposted ? "text-emerald-400 fill-emerald-400/20" : "text-white",
              )} />
            </div>
            <span className="text-white text-[11px] sm:text-xs font-semibold drop-shadow min-h-[14px]">
              {(post.reposts_count || 0) > 0
                ? (post.reposts_count! > 999 ? `${(post.reposts_count! / 1000).toFixed(1)}k` : post.reposts_count)
                : isReposted ? "Done" : ""}
            </span>
          </button>
        )}

        {/* Share */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenShare(post.id); }}
          className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
          aria-label="Share"
          title="Share"
        >
          <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition-transform active:scale-90">
            <Send className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
          </div>
          {(post.shares_count || 0) > 0 && (
            <span className="text-white text-[11px] sm:text-xs font-semibold drop-shadow">
              {post.shares_count! > 999 ? `${(post.shares_count! / 1000).toFixed(1)}k` : post.shares_count}
            </span>
          )}
        </button>

        {/* Save / Bookmark */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleSaveToggle(); }}
          className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
          aria-label={saved ? "Remove from saved" : "Save reel"}
          title={saved ? "Saved" : "Save"}
        >
          <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition-transform active:scale-90">
            <Bookmark
              className={cn(
                "w-6 h-6 lg:w-7 lg:h-7 transition-transform",
                saved ? "text-amber-400 fill-amber-400" : "text-white",
              )}
            />
          </div>
          {saved && (
            <span className="text-white text-[11px] sm:text-xs font-semibold drop-shadow">Saved</span>
          )}
        </button>

        {/* Mute */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleMuteToggle(); }}
          className="hidden sm:flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
          aria-label={globalMuted ? "Unmute" : "Mute"}
          title={globalMuted ? "Tap to unmute" : "Tap to mute"}
        >
          <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] transition-transform active:scale-90">
            {globalMuted
              ? <VolumeX className="w-6 h-6 lg:w-7 lg:h-7 text-white/80" />
              : <Volume2 className="w-6 h-6 lg:w-7 lg:h-7 text-white" />}
          </div>
        </button>

        {/* CC / Subtitles toggle — hidden on small phones to keep the rail
            from running off-screen; reachable via the More menu. */}
        {post.caption && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowCaptions((v) => !v); }}
            className="hidden sm:flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
            aria-label={showCaptions ? "Hide captions" : "Show captions"}
            title="Captions"
          >
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center border transition-all",
              showCaptions
                ? "bg-white border-white"
                : "bg-black/40 backdrop-blur-sm border-white/10",
            )}>
              <span className={cn(
                "text-[11px] font-black tracking-tight leading-none",
                showCaptions ? "text-black" : "text-white",
              )}>CC</span>
            </div>
            <span className="text-white text-xs font-semibold drop-shadow">
              {showCaptions ? "On" : "Off"}
            </span>
          </button>
        )}

        {/* Duet quick button — video posts by others only */}
        {!isSelf && isVideoPost && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartDuet?.(post);
            }}
            className="hidden sm:flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
            aria-label="Duet this video"
            title="Duet"
          >
            <Scissors className="w-7 h-7 text-white drop-shadow-lg" />
            <span className="text-white text-xs font-semibold drop-shadow">Duet</span>
          </button>
        )}

        {/* Gift / Tip creator — non-own posts only */}
        {!isSelf && post.source === "user" && post.author_id && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onGiftCreator?.(post);
            }}
            className="hidden sm:flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
            aria-label="Send a gift to this creator"
            title="Gift creator"
          >
            <Gift className="w-7 h-7 text-amber-400 drop-shadow-lg" />
            <span className="text-white text-xs font-semibold drop-shadow">Gift</span>
          </button>
        )}

        {/* More options (3-dot) opens the reel action sheet.
            Visible on phones because Duet, Stitch, Gift, and Report live here.
            Most actions are also reachable from the Share sheet. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenActions) onOpenActions();
            else setShowMoreMenu(true);
          }}
          className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px]"
          aria-label="More options"
          title="More options"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <MoreHorizontal className="w-5 h-5 text-white" />
          </div>
        </button>

        {/* Sound disk moved inline into the MusicTicker (TikTok-style next to
            the caption) — keeps the right rail lean and avoids overlap with
            the music bar. */}
      </div>

      {/* Scrub timecode — appears in the center of the screen while dragging
          the progress bar so the user can land on a specific moment. */}
      <AnimatePresence>
        {isScrubbing && videoDuration > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-black/70 backdrop-blur-md flex items-baseline gap-1 pointer-events-none"
            style={{ top: "40%" }}
          >
            <span className="text-white text-2xl font-bold tabular-nums">
              {formatVideoTime(videoProgress * videoDuration)}
            </span>
            <span className="text-white/50 text-sm tabular-nums">
              / {formatVideoTime(videoDuration)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video progress bar — drag-to-seek (TikTok style).
          The wrapper is a tall invisible touch target so users can grab it
          easily, while the visible bar stays thin (or grows when scrubbing). */}
      {isVideoPost && !hasPlaybackError && (
        <div
          ref={progressBarRef}
          className="zivo-reel-no-callout absolute left-3 right-3 bottom-[calc(var(--zivo-safe-bottom,0px)+76px)] z-40 flex flex-col gap-1.5 touch-none select-none"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!progressBarRef.current || !videoRef.current) return;
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            const rect = progressBarRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            wasPlayingBeforeScrub.current = !videoRef.current.paused;
            videoRef.current.pause();
            setIsScrubbing(true);
            setVideoProgress(ratio);
            if (Number.isFinite(videoRef.current.duration)) {
              videoRef.current.currentTime = ratio * videoRef.current.duration;
            }
          }}
          onPointerMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isScrubbing || !progressBarRef.current || !videoRef.current) return;
            const rect = progressBarRef.current.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setVideoProgress(ratio);
            if (Number.isFinite(videoRef.current.duration)) {
              videoRef.current.currentTime = ratio * videoRef.current.duration;
            }
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
            setIsScrubbing(false);
            if (wasPlayingBeforeScrub.current) {
              void videoRef.current?.play().catch(() => {});
            }
          }}
          onPointerCancel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsScrubbing(false);
            if (wasPlayingBeforeScrub.current) {
              void videoRef.current?.play().catch(() => {});
            }
          }}
        >
          <div className="flex items-center justify-between px-0.5 text-[11px] font-semibold tabular-nums text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)]">
            <span>{formatVideoTime(videoProgress * videoDuration)}</span>
            <span className="text-white/65">{formatVideoTime(videoDuration)}</span>
          </div>
          <div
            className={cn(
              "relative w-full rounded-full bg-white/25 shadow-[0_1px_8px_rgba(0,0,0,0.35)] transition-[height] duration-150",
              isScrubbing ? "h-2" : "h-1.5",
            )}
          >
            {/* Buffered range — sits beneath the playhead fill so the user
                can see how much is ready ahead of where they're watching. */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-white/35"
              animate={{ width: `${bufferedProgress * 100}%` }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            {/* Played fill */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-white"
              animate={{ width: `${videoProgress * 100}%` }}
              transition={{ duration: 0.08, ease: "linear" }}
            />
            <motion.div
              className={cn(
                "absolute rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.4)] transition-[width,height,top] duration-150",
                isScrubbing ? "-top-1.5 h-5 w-5 -ml-2.5" : "-top-1 h-3.5 w-3.5 -ml-1.5",
              )}
              animate={{ left: `${videoProgress * 100}%` }}
              transition={{ duration: 0.08, ease: "linear" }}
            />
          </div>
        </div>
      )}

      {/* Like-tap heart burst — single-tap on the like button (right column).
          Distinct from the double-tap-on-video burst — this one is small + on
          the side. */}
      <AnimatePresence>
        {showLikeBurst && (
          <motion.div
            initial={{ scale: 0, opacity: 1, y: 0 }}
            animate={{ scale: 1.1, opacity: 0, y: -40 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute right-6 bottom-[calc(var(--zivo-safe-bottom,0px)+270px)] z-40 pointer-events-none"
          >
            <Heart className="w-12 h-12 text-destructive fill-destructive drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* More-options bottom sheet */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className="fixed inset-0 z-[1499] bg-black/60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              drag="y"
              dragControls={moreSheetDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.45 }}
              dragTransition={{ bounceStiffness: 380, bounceDamping: 28, power: 0.18, timeConstant: 220 }}
              onDragEnd={(_, info) => {
                if (shouldDismissBottomSheet(info)) setShowMoreMenu(false);
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Reel actions"
              className="fixed inset-x-0 bottom-0 z-[1500] max-h-[86dvh] bg-background rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div
                onPointerDown={(e) => {
                  moreSheetPointerStartY.current = e.clientY;
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                  moreSheetDragControls.start(e);
                }}
                onPointerUp={(e) => {
                  const startY = moreSheetPointerStartY.current;
                  moreSheetPointerStartY.current = null;
                  if (startY !== null && e.clientY - startY > 48) setShowMoreMenu(false);
                }}
                onPointerCancel={() => {
                  moreSheetPointerStartY.current = null;
                }}
                style={{ touchAction: "none" }}
                className="flex shrink-0 cursor-grab active:cursor-grabbing justify-center pt-2 pb-1"
              >
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="px-2 py-2 pb-[max(0.75rem,var(--zivo-safe-bottom,0px))] space-y-0.5 overflow-y-auto overscroll-contain">
                <button type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    const url = `${window.location.origin}/reels/${post.id}`;
                    try {
                      const ta = document.createElement("textarea");
                      ta.value = url;
                      ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                      toast.success("Link copied");
                    } catch { toast.info("Long-press URL bar to copy"); }
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl"
                >
                  <Link2 className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">Copy link</span>
                </button>
                <button type="button"
                  onClick={() => { setShowMoreMenu(false); setShowSpeedPicker(true); }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl"
                >
                  <Gauge className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground flex-1 text-left">Playback speed</span>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">{playbackSpeed}×</span>
                </button>
                <button type="button"
                  onClick={async () => {
                    if (isPipToggling) return;
                    setIsPipToggling(true);
                    setShowMoreMenu(false);
                    const v = videoRef.current;
                    if (!v) {
                      setIsPipToggling(false);
                      return;
                    }
                    try {
                      const doc = document as any;
                      if (doc.pictureInPictureElement) {
                        await doc.exitPictureInPicture();
                      } else if ((v as any).requestPictureInPicture) {
                        await (v as any).requestPictureInPicture();
                      } else {
                        toast.error("Picture-in-picture isn't supported on this device");
                      }
                    } catch {
                      toast.error("Couldn't open picture-in-picture");
                    } finally {
                      setIsPipToggling(false);
                    }
                  }}
                  disabled={isPipToggling}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl disabled:opacity-50"
                >
                  <PictureInPicture className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">{isPipToggling ? "Opening PiP..." : "Picture-in-picture"}</span>
                </button>
                <button type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleMuteToggle();
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl sm:hidden"
                >
                  {globalMuted ? (
                    <Volume2 className="h-5 w-5 text-foreground" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">{globalMuted ? "Unmute" : "Mute"}</span>
                </button>
                <button type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onGiftCreator?.(post);
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl"
                >
                  <Gift className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Tip Creator</span>
                </button>
                <button type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onStartDuet?.(post);
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl"
                >
                  <Film className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">Duet</span>
                </button>
                <button type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onStartStitch?.(post);
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl"
                >
                  <Scissors className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">Stitch</span>
                </button>
                <button type="button"
                  onClick={async () => {
                    setShowMoreMenu(false);
                    const mediaUrl = post.media_urls?.[0];
                    if (!mediaUrl) { toast.error("No media to download"); return; }
                    try {
                      const a = document.createElement("a");
                      a.href = mediaUrl;
                      a.download = `zivo-reel-${post.id}.${post.media_type === "video" ? "mp4" : "jpg"}`;
                      a.target = "_blank";
                      a.rel = "noopener noreferrer";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      toast.success("Download started");
                    } catch {
                      toast.error("Couldn't download — try saving from full-screen");
                    }
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl"
                >
                  <Download className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">Download</span>
                </button>
                <button type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onShareToStory?.(post);
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl"
                >
                  <Layers className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">Share to Story</span>
                </button>
                {userId && post.author_id && userId === post.author_id && (
                  <button type="button"
                    onClick={async () => {
                      if (isPinningProfile) return;
                      setIsPinningProfile(true);
                      setShowMoreMenu(false);
                      const rawId = post.id.startsWith("u-") ? post.id.slice(2) : post.id;
                      const table = post.source === "user" ? "user_posts" : "store_posts";
                      try {
                        const { error } = await (supabase as any).from(table).update({ is_pinned: true }).eq("id", rawId);
                        if (error) {
                          toast.error("Couldn't pin to profile");
                          return;
                        }
                        toast.success("Pinned to your profile");
                      } finally {
                        setIsPinningProfile(false);
                      }
                    }}
                    disabled={isPinningProfile}
                    className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl disabled:opacity-50"
                  >
                    <Pin className="h-5 w-5 text-foreground" />
                    <span className="text-sm font-medium text-foreground">{isPinningProfile ? "Pinning..." : "Pin to Profile"}</span>
                  </button>
                )}
                <button type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    window.dispatchEvent(new CustomEvent("zivo-reel-hide", { detail: { postId: post.id } }));
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl"
                >
                  <EyeOff className="h-5 w-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">Not interested</span>
                </button>
                <button type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    if (!userId) toast.info("Sign in to submit a report");
                    window.dispatchEvent(new CustomEvent("zivo-reel-report", { detail: { postId: post.id } }));
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl"
                >
                  <Flag className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Report</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Speed-picker bottom sheet */}
      <AnimatePresence>
        {showSpeedPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSpeedPicker(false)}
              className="fixed inset-0 z-[1499] bg-black/60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              drag="y"
              dragControls={speedSheetDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.45 }}
              dragTransition={{ bounceStiffness: 380, bounceDamping: 28, power: 0.18, timeConstant: 220 }}
              onDragEnd={(_, info) => {
                if (shouldDismissBottomSheet(info)) setShowSpeedPicker(false);
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Playback speed"
              className="fixed inset-x-0 bottom-0 z-[1500] max-h-[86dvh] bg-background rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div
                onPointerDown={(e) => {
                  speedSheetPointerStartY.current = e.clientY;
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                  speedSheetDragControls.start(e);
                }}
                onPointerUp={(e) => {
                  const startY = speedSheetPointerStartY.current;
                  speedSheetPointerStartY.current = null;
                  if (startY !== null && e.clientY - startY > 48) setShowSpeedPicker(false);
                }}
                onPointerCancel={() => {
                  speedSheetPointerStartY.current = null;
                }}
                style={{ touchAction: "none" }}
                className="flex shrink-0 cursor-grab active:cursor-grabbing justify-center pt-2 pb-1"
              >
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>
              <p className="shrink-0 px-5 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Playback speed</p>
              <div className="px-2 pb-2 grid grid-cols-4 gap-2 overflow-y-auto overscroll-contain">
                {[0.5, 1.0, 1.5, 2.0].map((rate) => {
                  const active = Math.abs(playbackSpeed - rate) < 0.01;
                  return (
                    <button type="button"
                      key={rate}
                      onClick={() => { haptic("selection"); setPlaybackSpeed(rate); setShowSpeedPicker(false); }}
                      className={cn(
                        "py-3 rounded-xl text-sm font-bold tabular-nums transition-all active:scale-95",
                        active ? "bg-primary text-primary-foreground" : "bg-muted/40 text-foreground hover:bg-muted",
                      )}
                    >
                      {rate}×
                    </button>
                  );
                })}
              </div>
              <p className="shrink-0 px-5 pb-[max(0.75rem,var(--zivo-safe-bottom,0px))] text-[11px] text-muted-foreground">
                Tip: tap and hold the video for a quick 2× boost.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Speed badge — tappable shortcut to the speed picker. Shown whenever
          playback isn't 1× and the user isn't long-pressing (FF badge wins). */}
      {playbackSpeed !== 1.0 && !isHoldingFastForward && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowSpeedPicker(true); }}
          aria-label="Change playback speed"
          title="Change playback speed"
          className="absolute right-3 top-[calc(var(--zivo-safe-top-overlay,80px)+0.25rem)] z-30 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 active:scale-95 transition-transform"
        >
          <span className="text-white text-[11px] font-bold tabular-nums">{playbackSpeed}×</span>
        </button>
      )}
    </div>
  );
}

// Memoized export — prevents off-screen reels from re-rendering when an
// unrelated parent state (mute, current speed, search overlay, etc.) flips.
// Custom comparator skips the heavy props that don't affect this card's
// output (e.g. `userLikedPostIds` only matters when it includes this post).
const MemoReelCard = memo(ReelCard, (prev, next) => {
  if (prev.post.id !== next.post.id) return false;
  if (prev.isActive !== next.isActive) return false;
  if (prev.shouldPreload !== next.shouldPreload) return false;
  if (prev.globalMuted !== next.globalMuted) return false;
  if (prev.userId !== next.userId) return false;
  if (prev.initialSaved !== next.initialSaved) return false;
  if (prev.initialIsFollowing !== next.initialIsFollowing) return false;
  if (prev.initialAuthorIsLive !== next.initialAuthorIsLive) return false;
  // Only re-render when our own like state changes, not when any user's does.
  const prevLiked = prev.userLikedPostIds.has(prev.post.id);
  const nextLiked = next.userLikedPostIds.has(next.post.id);
  if (prevLiked !== nextLiked) return false;
  // Counts/captions can update via the realtime channel inside the card —
  // no need to bust memo when post object reference changes if id is stable.
  return true;
});

// ── Comment Sheet ────────────────────────────────────────────────────────────

function CommentSheet({
  postId,
  source,
  initialCount = 0,
  userId,
  onClose,
}: {
  postId: string;
  source?: FeedPostSource;
  initialCount?: number;
  userId: string | null;
  onClose: () => void;
}) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  // Inline edit state for own comments
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<string>>(new Set());
  const [savingCommentIds, setSavingCommentIds] = useState<Set<string>>(new Set());
  const [pinningCommentIds, setPinningCommentIds] = useState<Set<string>>(new Set());
  // Reply state: when set, the next submitted comment is a reply to this id
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
  // Per-thread expand state: which top-level comments have their replies open
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  // Comment sort: "newest" (default) or "top" (by likes_count desc)
  const [commentSort, setCommentSort] = useState<"newest" | "top">("newest");
  // Caller owns the post? Drives the Pin / Unpin row visibility.
  const [isPostAuthor, setIsPostAuthor] = useState(false);
  const queryClient = useQueryClient();

  // Route comments to the same table used by the reel preview. Store posts can
  // arrive with ids that look just like user-post ids, so preserve the source.
  const isUserPost  = source ? source === "user" : postId.startsWith("u-");
  const rawPostId   = getFeedPostRawId(postId);
  const postSource = isUserPost ? "user" : "store";
  const targetTable = isUserPost ? "post_comments" : "store_post_comments";
  const commentLikeTargetTable = isUserPost ? "user_post_comments" : "store_post_comments";
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if user has a verified account (phone_verified)
  const { data: isVerified } = useQuery({
    queryKey: ["user-verified", userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from("profiles")
        .select("phone_verified")
        .eq("user_id", userId)
        .single();
      return data?.phone_verified ?? false;
    },
    enabled: !!userId,
  });

  // Page through comments in batches of 20. Avoids hauling 300 comments + 300
  // profile lookups on every sheet-open; "Load more" reveals older replies.
  const COMMENTS_PAGE_SIZE = 20;
  const [commentLimit, setCommentLimit] = useState(COMMENTS_PAGE_SIZE);
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["post-comments", targetTable, rawPostId, userId, commentLimit],
    queryFn: async () => {
      const selectColumns = isUserPost
        ? "id, post_id, user_id, content, created_at, parent_id, is_pinned, likes_count"
        : "id, post_id, user_id, content, created_at";
      let commentsQuery = (supabase as any)
        .from(targetTable)
        .select(selectColumns)
        .eq("post_id", rawPostId);
      if (isUserPost) commentsQuery = commentsQuery.eq("post_source", postSource);
      const { data: rawComments, error } = await commentsQuery
        .order("created_at", { ascending: true })
        .limit(commentLimit);
      if (error) throw error;
      if (!rawComments || rawComments.length === 0) return [];

      const userIds = [...new Set(rawComments.map((c: any) => c.user_id).filter(Boolean))];
      const commentIds = rawComments.map((c: any) => c.id);

      // Fetch profiles, all-comment like counts, and current-user likes in parallel.
      const [{ data: profiles }, { data: likeRows }, { data: userLikeRows }] = await Promise.all([
        supabase.from("public_profiles").select("id, full_name, avatar_url").in("id", userIds as string[]),
        commentIds.length > 0
          ? (supabase as any).from("comment_likes").select("comment_id").eq("target_table", commentLikeTargetTable).in("comment_id", commentIds)
          : Promise.resolve({ data: [] }),
        userId && commentIds.length > 0
          ? (supabase as any).from("comment_likes").select("comment_id").eq("user_id", userId).eq("target_table", commentLikeTargetTable).in("comment_id", commentIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const likeCounts = new Map<string, number>();
      for (const r of likeRows ?? []) {
        likeCounts.set(r.comment_id, (likeCounts.get(r.comment_id) ?? 0) + 1);
      }
      const likedByUser = new Set((userLikeRows ?? []).map((r: any) => r.comment_id));

      // Normalize text column — store_post_comments uses `content`, user_post_comments may use `comment`
      return rawComments.map((c: any) => ({
        ...c,
        content: c.content ?? c.comment ?? c.text ?? c.body ?? "",
        parent_id: c.parent_id ?? null,
        is_pinned: !!c.is_pinned,
        likes_count: c.likes_count ?? 0,
        profiles: profileMap.get(c.user_id) || null,
        like_count: likeCounts.get(c.id) ?? 0,
        liked_by_user: likedByUser.has(c.id),
      }));
    },
  });
  const displayCommentCount = Math.max(initialCount, comments.length);

  // Resolve "am I the post author?" so we can show Pin/Unpin on every comment
  useEffect(() => {
    if (!userId || !rawPostId) { setIsPostAuthor(false); return; }
    let cancelled = false;
    (async () => {
      if (isUserPost) {
        const { data } = await (supabase as any)
          .from("user_posts")
          .select("user_id")
          .eq("id", rawPostId)
          .maybeSingle();
        if (!cancelled) setIsPostAuthor(!!data && data.user_id === userId);
      } else {
        // Store post → caller must own the linked store
        const { data } = await (supabase as any)
          .from("store_posts")
          .select("store_id")
          .eq("id", rawPostId)
          .maybeSingle();
        if (!data?.store_id) { if (!cancelled) setIsPostAuthor(false); return; }
        const { data: store } = await (supabase as any)
          .from("store_profiles")
          .select("owner_id")
          .eq("id", data.store_id)
          .maybeSingle();
        if (!cancelled) setIsPostAuthor(!!store?.owner_id && store.owner_id === userId);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, rawPostId, isUserPost]);

  const handleTogglePin = async (commentId: string) => {
    if (!userId || pinningCommentIds.has(commentId)) return;
    setPinningCommentIds((prev) => new Set(prev).add(commentId));
    try {
      const { error } = isUserPost
        ? await (supabase as any).rpc("toggle_unified_comment_pin", {
            _comment_id: commentId,
          })
        : await (supabase as any).rpc("toggle_comment_pin", {
            _comment_id:   commentId,
            _target_table: commentLikeTargetTable,
          });
      if (error) {
        toast.error(/only the post author/i.test(error.message ?? "")
          ? "Only the post author can pin comments"
          : "Couldn't update pin");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["post-comments", targetTable, rawPostId] });
    } finally {
      setPinningCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (!commentText.trim() || !userId) {
      if (!userId) toast.error("Please sign in to comment");
      return;
    }
    if (!confirmContentSafe(commentText, "comment")) return;
    setSubmitting(true);
    const insertPayload: Record<string, unknown> = {
      post_id: rawPostId,
      user_id: userId,
      content: commentText.trim(),
    };
    if (isUserPost) insertPayload.post_source = postSource;
    if (replyTo && isUserPost) insertPayload.parent_id = replyTo.id;
    const { error } = await (supabase as any).from(targetTable).insert(insertPayload);
    if (error) {
      console.error("[CommentSheet] insert failed", error);
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("auth") || msg.includes("permission") || msg.includes("rls")) {
        toast.error("You need to be signed in to comment");
      } else if (msg.includes("network") || msg.includes("fetch")) {
        toast.error("Network error. Check your connection.");
      } else if (msg.includes("rate") || msg.includes("too many")) {
        toast.error("Too many comments — wait a moment and try again");
      } else {
        toast.error("Couldn't post comment. Try again.");
      }
    } else {
      setCommentText("");
      // Auto-expand the thread we just replied into so the new reply is visible
      if (replyTo) {
        setExpandedThreads((prev) => new Set(prev).add(replyTo.id));
      }
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["post-comments", targetTable, rawPostId] });
      queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
    }
    setSubmitting(false);
  };

  // Edit / delete handlers for own comments
  const handleEditComment = async (commentId: string, nextContent: string) => {
    if (!userId || !nextContent.trim() || savingCommentIds.has(commentId)) return;
    if (!confirmContentSafe(nextContent, "comment")) return;
    setSavingCommentIds((prev) => new Set(prev).add(commentId));
    try {
      const updatePayload: Record<string, unknown> = { content: nextContent.trim() };
      const { error } = await (supabase as any)
        .from(targetTable)
        .update(updatePayload)
        .eq("id", commentId)
        .eq("user_id", userId); // RLS-style guard
      if (error) {
        toast.error("Couldn't save edit");
        return;
      }
      setEditingId(null);
      setEditingText("");
      queryClient.invalidateQueries({ queryKey: ["post-comments", targetTable, rawPostId] });
    } finally {
      setSavingCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!userId || deletingCommentIds.has(commentId)) return;
    setDeletingCommentIds((prev) => new Set(prev).add(commentId));
    try {
      const { error } = await (supabase as any)
        .from(targetTable)
        .delete()
        .eq("id", commentId)
        .eq("user_id", userId);
      if (error) {
        toast.error("Couldn't delete comment");
        return;
      }
      toast.success("Comment deleted");
      queryClient.invalidateQueries({ queryKey: ["post-comments", targetTable, rawPostId] });
      queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
    } finally {
      setDeletingCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sheet = (
    <div
      className="fixed inset-0 z-[1500] flex flex-col justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <div
        className="relative bg-background rounded-t-3xl max-h-[72vh] flex flex-col animate-in slide-in-from-bottom duration-300 [padding-top:var(--zivo-safe-top-sheet)] [padding-bottom:var(--zivo-safe-bottom,0px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-border">
          <span className="font-semibold text-foreground">Comments ({displayCommentCount})</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            title="Close comments"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted"
          >
            <XIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Sort toggle (only shown when there are at least 2 top-level comments) */}
        {comments.filter((c: any) => !c.parent_id).length >= 2 && (
          <div className="px-4 pt-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Sort by:</span>
            <button
              type="button"
              onClick={() => setCommentSort("newest")}
              className={cn(
                "rounded-full px-3 py-1 font-semibold transition-colors active:scale-95",
                commentSort === "newest"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => setCommentSort("top")}
              className={cn(
                "rounded-full px-3 py-1 font-semibold transition-colors active:scale-95",
                commentSort === "top"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              Top
            </button>
          </div>
        )}

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
            </div>
          ) : (() => {
            // Group comments into top-level + replies-by-parent
            const topLevel: any[] = [];
            const replyMap = new Map<string, any[]>();
            for (const c of comments) {
              if (c.parent_id) {
                const arr = replyMap.get(c.parent_id) ?? [];
                arr.push(c);
                replyMap.set(c.parent_id, arr);
              } else {
                topLevel.push(c);
              }
            }
            // Sort top-level: pinned first, then by chosen sort.
            // Replies inside each thread always render oldest-first so the
            // conversation reads top-to-bottom.
            topLevel.sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              if (commentSort === "top") {
                // `like_count` is aggregated from comment_likes in the query above
                return (b.like_count ?? 0) - (a.like_count ?? 0)
                  || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              }
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            const renderRow = (c: any, isReply: boolean) => {
              const prof = c.profiles;
              const name = prof?.full_name || "User";
              const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
              const avatarSize = isReply ? "w-7 h-7" : "w-8 h-8";
              return (
                <div key={c.id} className={`flex gap-2 ${isReply ? "ml-9" : ""}`}>
                  <div className={`${avatarSize} rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden`}>
                    {prof?.avatar_url ? (
                      <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{initials}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-xs font-semibold text-foreground">{name}</p>
                      {c.is_pinned && !isReply && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                          📌 Pinned
                        </span>
                      )}
                    </div>
                    {editingId === c.id ? (
                      <div className="flex flex-col gap-1.5">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          autoFocus
                          rows={2}
                          aria-label="Edit comment"
                          placeholder="Edit your comment"
                          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setEditingText(""); }}
                            className="rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted active:scale-95"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditComment(c.id, editingText)}
                            disabled={!editingText.trim() || editingText.trim() === c.content || savingCommentIds.has(c.id)}
                            className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40 active:scale-95"
                          >
                            {savingCommentIds.has(c.id) ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-foreground">
                          <Suspense fallback={<span>{c.content}</span>}>
                            <SafeCaption text={c.content} />
                          </Suspense>
                        </p>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(c.created_at).toLocaleDateString()}</span>
                          {!isReply && userId && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTo({ id: c.id, authorName: name });
                                // eslint-disable-next-line react-hooks/refs
                                requestAnimationFrame(() => inputRef.current?.focus());
                              }}
                              className="font-semibold text-foreground/70 hover:text-foreground active:scale-95 transition-transform"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className={`flex items-start gap-1 ${editingId === c.id ? "hidden" : ""}`}>
                    <Suspense fallback={null}>
                      <CommentHeartButton
                        commentId={c.id}
                        targetTable={commentLikeTargetTable}
                        userId={userId}
                        variant="light"
                        initialCount={c.like_count ?? 0}
                        initialLiked={c.liked_by_user ?? false}
                      />
                    </Suspense>
                    <Suspense fallback={null}>
                      <CommentRowActions
                        canManage={!!userId && c.user_id === userId}
                        variant="light"
                        onEditStart={() => { setEditingId(c.id); setEditingText(c.content || ""); }}
                        onDelete={() => handleDeleteComment(c.id)}
                        deleting={deletingCommentIds.has(c.id)}
                        canPin={isPostAuthor && isUserPost && !isReply}
                        isPinned={!!c.is_pinned}
                        onTogglePin={() => handleTogglePin(c.id)}
                        pinning={pinningCommentIds.has(c.id)}
                      />
                    </Suspense>
                  </div>
                </div>
              );
            };

            return (
              <>
                {topLevel.map((c: any) => {
                  const replies = replyMap.get(c.id) ?? [];
                  const isExpanded = expandedThreads.has(c.id);
                  return (
                    <div key={c.id} className="flex flex-col gap-2">
                      {renderRow(c, false)}
                      {replies.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedThreads((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          })}
                          className="ml-9 self-start text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <span className="inline-block w-6 border-t border-muted-foreground/30" />
                          {isExpanded
                            ? `Hide replies`
                            : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                        </button>
                      )}
                      {isExpanded && replies.map((r: any) => renderRow(r, true))}
                    </div>
                  );
                })}
              </>
            );
          })()}
          {!isLoading && comments.length >= commentLimit && (
            <button
              type="button"
              onClick={() => setCommentLimit((n) => n + COMMENTS_PAGE_SIZE)}
              className="w-full mt-2 mb-1 h-9 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold transition-colors active:scale-[0.98]"
            >
              Load more comments
            </button>
          )}
        </div>

        {/* Input */}
        <div className="px-4 pt-3 pb-[calc(var(--zivo-safe-bottom,0px)+12px)] border-t border-border">
          {!userId ? (
            <p className="text-center text-sm text-muted-foreground py-1">Sign in to comment</p>
          ) : !isVerified ? (
            <div className="flex items-center gap-2 justify-center py-1">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Only verified accounts can comment</p>
            </div>
          ) : (
            <>
              {/* "Replying to @name" badge */}
              {replyTo && (
                <div className="mb-2 flex items-center justify-between rounded-full bg-primary/10 px-3 py-1.5">
                  <span className="text-xs text-primary">
                    Replying to <span className="font-semibold">@{replyTo.authorName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="rounded-full p-1 text-primary hover:bg-primary/20 active:scale-90 transition-transform"
                    aria-label="Cancel reply"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="relative flex gap-2">
              {/* @-mention autocomplete (anchors above the input) */}
              <Suspense fallback={null}>
                <MentionPicker
                  query={mentionQuery}
                  onSelect={(r) => {
                    if (!inputRef.current) return;
                    const caret = inputRef.current.selectionStart ?? commentText.length;
                    const handle = r.username || r.fullName || "";
                    if (!handle) return;
                    const next = applyMention(commentText, caret, handle);
                    setCommentText(next.value);
                    setMentionQuery(null);
                    requestAnimationFrame(() => {
                      inputRef.current?.focus();
                      inputRef.current?.setSelectionRange(next.caret, next.caret);
                    });
                  }}
                  onClose={() => setMentionQuery(null)}
                />
              </Suspense>
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value);
                  const caret = e.target.selectionStart ?? e.target.value.length;
                  setMentionQuery(detectMention(e.target.value, caret));
                }}
                onKeyDown={(e) => {
                  // Picker handles Enter while open; only submit when no picker
                  if (e.key === "Enter" && mentionQuery == null) handleSubmit();
                }}
                placeholder={replyTo ? `Reply to @${replyTo.authorName}…` : "Add a comment..."}
                className="flex-1 h-11 sm:h-10 rounded-full bg-muted px-4 text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!commentText.trim() || submitting}
                className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                aria-label="Send comment"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet;
}



// ── Feed Search Overlay ──────────────────────────────────────────────────────

type FeedQuickLaunch = {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  keywords: string[];
};

const FEED_QUICK_LAUNCHES: FeedQuickLaunch[] = [
  {
    label: "Social",
    description: "Posts and friends",
    href: "/feed",
    icon: MessageCircle,
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    keywords: ["facebook", "social", "post", "friends", "feed"],
  },
  {
    label: "Reels",
    description: "Short videos",
    href: "/reels",
    icon: Film,
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    keywords: ["tiktok", "reels", "video", "shorts"],
  },
  {
    label: "Chat",
    description: "Messages and groups",
    href: "/chat",
    icon: Send,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    keywords: ["telegram", "chat", "message", "dm", "group"],
  },
  {
    label: "Meet",
    description: "Calls and rooms",
    href: "/chat/contacts",
    icon: Tv2,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    keywords: ["meet", "google meet", "video call", "call", "room"],
  },
  {
    label: "Rides",
    description: "Book a car",
    href: "/rides/hub",
    icon: Car,
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    keywords: ["uber", "ride", "taxi", "car", "pickup"],
  },
  {
    label: "Eats",
    description: "Food delivery",
    href: "/eats",
    icon: UtensilsCrossed,
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
    keywords: ["uber eat", "ubereats", "food", "restaurant", "eats", "delivery"],
  },
  {
    label: "Hotels",
    description: "Book stays",
    href: "/hotels",
    icon: Building2,
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    keywords: ["booking", "booking.com", "hotel", "stay", "room"],
  },
  {
    label: "Flights",
    description: "Search trips",
    href: "/flights",
    icon: Plane,
    tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    keywords: ["flight", "travel", "trip", "ticket"],
  },
  {
    label: "Delivery",
    description: "Send packages",
    href: "/delivery",
    icon: ShoppingBag,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    keywords: ["delivery", "package", "courier", "send"],
  },
  {
    label: "Creators",
    description: "Subscriptions",
    href: "/creator-dashboard",
    icon: Briefcase,
    tone: "bg-pink-500/10 text-pink-600 dark:text-pink-300",
    keywords: ["onlyfans", "creator", "subscription", "fans", "tips"],
  },
  {
    label: "Shop",
    description: "Marketplace",
    href: "/marketplace",
    icon: Store,
    tone: "bg-lime-500/10 text-lime-700 dark:text-lime-300",
    keywords: ["shop", "marketplace", "store", "buy", "sell"],
  },
  {
    label: "Services",
    description: "Everything",
    href: "/services",
    icon: Layers,
    tone: "bg-foreground/10 text-foreground",
    keywords: ["all", "services", "apps", "more", "everything"],
  },
];

function FeedQuickLaunchButton({
  launch,
  onClose,
  onNavigate,
}: {
  launch: FeedQuickLaunch;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const Icon = launch.icon;
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate(launch.href);
        onClose();
      }}
      className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-3 text-left active:scale-[0.98] transition-transform"
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", launch.tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground truncate">{launch.label}</span>
        <span className="block text-[11px] text-muted-foreground truncate">{launch.description}</span>
      </span>
    </button>
  );
}

function FeedSearchOverlay({ onClose, onNavigate }: { onClose: () => void; onNavigate: (path: string) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Search stores
  const { data: storeResults = [], isLoading: storesLoading } = useQuery({
    queryKey: ["feed-search-stores", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const { data } = await supabase
        .from("store_profiles")
        .select("id, name, logo_url, slug, category")
        .ilike("name", `%${debouncedQuery}%`)
        .limit(10);
      return data || [];
    },
    enabled: debouncedQuery.length >= 1,
  });

  // Search people — split words so "chhorng kim" matches "kimlain Chhorng"
  const { data: profileResults = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["feed-search-profiles", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const words = debouncedQuery.split(/\s+/).filter(Boolean);
      let q = supabase
        .from("public_profiles")
        .select("id, full_name, avatar_url");
      for (const word of words) {
        q = q.ilike("full_name", `%${word}%`);
      }
      const { data } = await q.limit(10);
      return data || [];
    },
    enabled: debouncedQuery.length >= 1,
  });

  const isLoading = storesLoading || profilesLoading;
  const hasQuery = debouncedQuery.length >= 1;
  const quickLaunchResults = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return FEED_QUICK_LAUNCHES;
    return FEED_QUICK_LAUNCHES.filter((launch) =>
      [launch.label, launch.description, ...launch.keywords]
        .some((value) => value.toLowerCase().includes(q) || q.includes(value.toLowerCase())),
    );
  }, [debouncedQuery]);
  const hasResults = quickLaunchResults.length > 0 || storeResults.length > 0 || profileResults.length > 0;

  return (
    <div className="fixed inset-0 z-[1500] bg-background flex flex-col">
      {/* Search header */}
      <div className="safe-area-top pt-2 px-3 pb-2.5 flex items-center gap-2 border-b border-border/50">
        <button type="button" onClick={onClose} aria-label="Close search" title="Close search" className="p-2 rounded-full hover:bg-muted/50">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps, rides, food, hotels, people..."
            className="w-full h-11 pl-9 pr-9 rounded-full bg-muted/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
              <XIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-nav">
        {quickLaunchResults.length > 0 && (
          <div className="px-4 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {hasQuery ? "ZIVO apps" : "Jump in"}
              </p>
              {!hasQuery && (
                <button
                  type="button"
                  onClick={() => { onNavigate("/services"); onClose(); }}
                  className="text-[11px] font-semibold text-foreground"
                >
                  See all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickLaunchResults.map((launch) => (
                <FeedQuickLaunchButton
                  key={launch.href}
                  launch={launch}
                  onClose={onClose}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        )}

        {!hasQuery && (
          <div className="px-8 py-8 text-center">
            <Search className="mx-auto w-10 h-10 text-muted-foreground/25" />
            <p className="mt-3 text-sm text-muted-foreground">Search people, shops, restaurants, or any ZIVO app.</p>
          </div>
        )}

        {hasQuery && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {hasQuery && !isLoading && !hasResults && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Search className="w-10 h-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No results for "{debouncedQuery}"</p>
          </div>
        )}

        {storeResults.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Shops</p>
            {storeResults.map((store: any) => (
              <button type="button"
                key={store.id}
                onClick={() => { onNavigate(`/grocery/shop/${store.slug}`); onClose(); }}
                className="w-full flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-muted/30 border border-border/30 flex items-center justify-center overflow-hidden shrink-0">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <Store className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{store.name}</p>
                  {store.category && <p className="text-[11px] text-muted-foreground">{store.category}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {profileResults.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">People</p>
            {profileResults.map((person: any) => (
              <button type="button"
                key={person.id}
                onClick={() => { onNavigate(`/user/${person.id}`); onClose(); }}
                className="w-full flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-muted/30 border border-border/30 flex items-center justify-center overflow-hidden shrink-0">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <UserCircle className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{person.full_name || "User"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sound Overlay (bottom sheet over reels) ─────────────────── */
function SoundOverlay({
  soundName,
  onClose,
  onNavigateToReel,
  onUseSound,
  currentPosts,
}: {
  soundName: string;
  onClose: () => void;
  onNavigateToReel: (postId: string) => void;
  onUseSound: () => void;
  currentPosts: FeedPost[];
}) {
  // Check if this is a generated "Original Sound" name (not stored in DB)
  const isOriginalSound = soundName.startsWith("Original Sound - ");

  const { data: dbReels = [], isLoading } = useQuery({
    queryKey: ["sound-overlay-reels", soundName],
    queryFn: async () => {
      if (isOriginalSound) return []; // These aren't stored — we use currentPosts instead
      const db = supabase as any;
      const { data: storePosts } = await db
        .from("store_posts")
        .select("id, media_urls, media_type, view_count, store_profiles(name)")
        .eq("is_published", true)
        .eq("audio_name", soundName)
        .order("created_at", { ascending: false })
        .limit(30);

      const { data: userPosts } = await db
        .from("user_posts")
        .select("id, media_urls, media_type, profiles(full_name, username)")
        .eq("audio_name", soundName)
        .order("created_at", { ascending: false })
        .limit(30);

      return [
        ...(storePosts || []).map((p: any) => ({
          id: p.id, media_urls: p.media_urls || [], media_type: p.media_type,
          views: p.view_count || 0, author: p.store_profiles?.name || "Shop",
        })),
        ...(userPosts || []).map((p: any) => ({
          id: p.id, media_urls: p.media_urls || [], media_type: p.media_type,
          views: 0, author: p.profiles?.full_name || p.profiles?.username || "User",
        })),
      ];
    },
    enabled: !isOriginalSound,
  });

  // For "Original Sound" names, pull matching reels from the already-loaded feed
  const reels = isOriginalSound
    ? currentPosts
        .filter((p) => {
          const label = p.audio_name || `Original Sound - ${p.store_name || "ZIVO"}`;
          return label === soundName;
        })
        .map((p) => ({
          id: p.id, media_urls: p.media_urls, media_type: p.media_type,
          views: p.view_count || 0, author: p.store_name || "User",
        }))
    : dbReels;

  const reelCount = reels.length;

  return (
    <>
      <SEOHead
        title="ZIVO Feed – Short Videos, Reels & Stories"
        description="Watch and share short videos, reels, and stories from creators around the world. Like, comment, follow, and discover trending content on ZIVO."
        canonical="/feed"
      />
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-sm"
      />
      {/* Centered modal — responsive */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="fixed inset-0 z-[1501] flex items-center justify-center pointer-events-none p-4"
      >
        <div className="pointer-events-auto flex flex-col bg-background rounded-3xl overflow-hidden shadow-2xl border border-border/30 w-[94%] max-w-[480px] max-h-[75vh]">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Sound info header */}
          <div className="px-5 pt-2 pb-3 flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-primary">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </motion.div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground leading-tight line-clamp-2">{soundName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reelCount} reel{reelCount !== 1 ? "s" : ""} • Tap to watch
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close sound overlay" title="Close sound overlay" className="p-2 -mr-1 rounded-full hover:bg-muted/60 transition-colors">
              <XIcon className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Use this sound button */}
          <div className="px-5 pb-3">
            <button type="button"
              onClick={() => {
                onClose();
                onUseSound();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <Music className="h-4 w-4" />
              Use this sound
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40 mx-5" />

          {/* Reels grid */}
          <div className="flex-1 overflow-y-auto p-3 pb-safe">
            {isLoading && !isOriginalSound ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : reelCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                  <Play className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No reels with this sound yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reels.map((reel) => {
                  const thumb = (reel.media_urls || []).map((u: string) =>
                    normalizeSupabaseMediaUrl(
                      u,
                      { preferredBucket: reel.source === "user" ? "user-posts" : "store-posts" },
                    )
                  ).filter(Boolean)[0];
                  return (
                    <button type="button"
                      key={reel.id}
                      onClick={() => onNavigateToReel(reel.id)}
                      className="relative aspect-[9/16] bg-muted/80 overflow-hidden group rounded-xl"
                    >
                      {thumb ? (
                        <>
                          <img
                            src={thumb}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Play className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                      {/* Gradient overlay at bottom */}
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
                      {reel.views > 0 && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[11px] font-semibold drop-shadow-lg">
                          <Play className="h-3 w-3 fill-white" />
                          {reel.views > 1000 ? `${(reel.views / 1000).toFixed(1)}K` : reel.views}
                        </div>
                      )}
                      {reel.author && (
                        <div className="absolute bottom-2 right-2 text-white text-[9px] font-medium drop-shadow-lg truncate max-w-[60%] text-right">
                          @{reel.author}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Discover People Overlay ─────────────────────────────────────────────────
function DiscoverPeopleOverlay({ onClose, onNavigate }: { onClose: () => void; onNavigate: (path: string) => void }) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["discover-people-reel", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url, bio, is_verified")
        .neq("id", userId || "")
        .eq("is_of_creator", false)
        .limit(20);
      return (data || []).sort(() => Math.random() - 0.5);
    },
    enabled: !!userId,
  });

  const [followingLoadingIds, setFollowingLoadingIds] = useState<Set<string>>(new Set());

  const handleFollow = async (profileId: string) => {
    if (!userId || followingLoadingIds.has(profileId)) return;
    setFollowingLoadingIds((prev) => new Set([...prev, profileId]));
    try {
      const { error } = await (supabase as any).from("user_followers").insert({
        follower_id: userId,
        following_id: profileId,
      });
      if (error) throw error;
      setFollowingIds((prev) => new Set([...prev, profileId]));
    } catch (err) {
      console.warn("[DiscoverPeopleOverlay] follow failed", err);
      toast.error("Couldn't follow. Try again.");
    } finally {
      setFollowingLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1500] bg-background flex flex-col"
    >
      <div data-testid="feed-discover-header" className="safe-area-top zivo-mobile-header-row flex items-center gap-3 border-b border-border/30">
        <button type="button" onClick={onClose} aria-label="Close discover people" title="Close discover people" className="p-2 rounded-full hover:bg-muted/50">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Discover People</h2>
          <p className="text-xs text-muted-foreground">Find people to follow on ZIVO</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-nav">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {profiles.map((profile: any) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border/30 p-4 text-center"
              >
                <div onClick={() => { onClose(); onNavigate(`/user/${profile.id}`); }} className="cursor-pointer">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-muted ring-2 ring-primary/10">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl bg-primary/10">
                        {profile.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {profile.full_name || "ZIVO user"}
                  </h3>
                  {profile.bio && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{profile.bio}</p>
                  )}
                </div>
                <button type="button"
                  onClick={() => handleFollow(profile.id)}
                  disabled={followingIds.has(profile.id) || followingLoadingIds.has(profile.id)}
                  className={`w-full mt-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    followingIds.has(profile.id)
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {followingLoadingIds.has(profile.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                  ) : followingIds.has(profile.id) ? (
                    "Following"
                  ) : (
                    "Follow"
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Report Dialog ─────────────────────────────────────────────────────────────

const REPORT_REASONS = [
  "Spam or misleading",
  "Sexual content",
  "Hate speech or harassment",
  "Violence or dangerous acts",
  "Misinformation",
  "Intellectual property",
  "Other",
];

function ReelReportDialog({
  postId,
  reporterId,
  onClose,
  onReported,
}: {
  postId: string;
  reporterId: string | null;
  onClose: () => void;
  onReported: () => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason || submitting) return;
    if (!reporterId) {
      toast.error("Please sign in to report");
      return;
    }
    setSubmitting(true);
    try {
      const rawId = postId.startsWith("u-") ? postId.slice(2) : postId;
      const postSource = postId.startsWith("u-") ? "user" : "store";
      const sensitiveReport = isSensitiveReportReason(reason);
      const { error } = await (supabase as any).from("post_reports").insert({
        post_id: rawId,
        post_source: postSource,
        reporter_id: reporterId,
        reason,
      });
      if (error) throw error;
      toast.success(sensitiveReport ? "We hid it and sent it for safety review." : "Report submitted. Thank you.");
      onReported();
    } catch (err) {
      console.error("[ReelReportDialog] submit failed", err);
      toast.error("Couldn't submit report. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      className="fixed inset-0 z-[1500] flex items-end justify-center bg-black/60"
    >
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-background rounded-t-2xl border-t border-border/30"
        style={{ paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 16px)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-foreground">Report post</span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted"
            aria-label="Close report dialog"
          >
            <XIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          {reporterId ? "Why are you reporting this post?" : "Sign in to submit a report. You can still review the report reasons."}
        </p>
        <div className="px-2 py-2">
          {REPORT_REASONS.map((r) => (
            <button type="button"
              key={r}
              onClick={() => setReason(r)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-xl text-sm transition-colors",
                reason === r ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted/40",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="px-4 pt-2 pb-3">
          <button
            type="button"
            disabled={!reason || submitting || !reporterId}
            onClick={submit}
            className="w-full h-11 rounded-xl bg-destructive text-destructive-foreground font-semibold disabled:opacity-40"
          >
            {!reporterId ? "Sign in to report" : submitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


export default function FeedPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { postId: routePostId } = useParams<{ postId?: string }>();
  // True when we arrived via a deep link (path /reels/:postId OR ?post=)
  // so the resume-position effect can step aside and let the link win.
  const hasDeepLink = Boolean(routePostId) || Boolean(new URLSearchParams(location.search).get("post"));
  // On `/reels` we render the TikTok-style hero — hide the desktop side rails
  // so the video can fill the viewport. `/feed` keeps the 3-column layout.
  const isReelsRoute = location.pathname.startsWith("/reels");
  useEffect(() => {
    if (!isReelsRoute || typeof document === "undefined") return;
    document.body.classList.add("zivo-reels-active");

    const isEditableTarget = (target: EventTarget | null) => (
      target instanceof HTMLElement &&
      Boolean(target.closest("input, textarea, [contenteditable='true']"))
    );

    const blockNativeSelection = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const clearSelection = () => {
      const selection = window.getSelection?.();
      if (selection && !selection.isCollapsed) selection.removeAllRanges();
    };

    document.addEventListener("selectstart", blockNativeSelection);
    document.addEventListener("contextmenu", blockNativeSelection);
    document.addEventListener("selectionchange", clearSelection);

    return () => {
      document.body.classList.remove("zivo-reels-active");
      document.removeEventListener("selectstart", blockNativeSelection);
      document.removeEventListener("contextmenu", blockNativeSelection);
      document.removeEventListener("selectionchange", clearSelection);
    };
  }, [isReelsRoute]);
  const requestedReelId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const linkedId = routePostId || params.get("post");
    if (linkedId) return linkedId;
    try {
      return sessionStorage.getItem("zivo_reel_active_id");
    } catch {
      return null;
    }
  }, [location.search, routePostId]);
  const [globalMuted, setGlobalMuted] = useState<boolean>(() => {
    // Persist mute preference — autoplay policies require starting muted on
    // some browsers, but we still respect the user's last choice when they
    // explicitly unmuted (so they don't have to re-tap on every visit).
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem("zivo_reel_muted");
      return stored === null ? true : stored === "1";
    } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem("zivo_reel_muted", globalMuted ? "1" : "0"); } catch {}
  }, [globalMuted]);
  const [activeIndex, setActiveIndex] = useState(() => {
    // Resume the last-watched reel index from this session so navigating
    // away (e.g. into a profile) and coming back doesn't snap to the top.
    if (typeof window === "undefined") return 0;
    try {
      const stored = sessionStorage.getItem("zivo_reel_active_index");
      const n = stored ? parseInt(stored, 10) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch { return 0; }
  });
  // Persist activeIndex AND active post ID. Index is used as a fallback if
  // the post ID has dropped out of the feed (rare — would mean unpublished
  // or RLS visibility flipped).
  useEffect(() => {
    try { sessionStorage.setItem("zivo_reel_active_index", String(activeIndex)); } catch {}
  }, [activeIndex]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Horizontal swipe state — used to detect TikTok-style "swipe left to view
  // creator profile". Per-card state isn't needed because the user can only
  // swipe one card at a time.
  const swipeStartRef = useRef<{ x: number; y: number; t: number; pointerId: number } | null>(null);
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [soundOverlayName, setSoundOverlayName] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [reelComposerDraft, setReelComposerDraft] = useState<ReelComposerDraft | null>(null);
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string | null } | null>(null);
  const [userLikedPostIds, setUserLikedPostIds] = useState<Set<string>>(new Set());
  const [likePendingPostIds, setLikePendingPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [liveAuthorIds, setLiveAuthorIds] = useState<Set<string>>(new Set());
  const [feedMode, setFeedMode] = useState<"foryou" | "following" | "trending">(() => {
    // Persist tab preference — TikTok remembers For You vs Following, so
    // users who actively curate their following feed don't have to re-pick
    // it every time they enter Reels.
    if (typeof window === "undefined") return "foryou";
    try {
      const stored = localStorage.getItem("zivo_reel_mode");
      if (stored === "following") return "following";
      // "trending" tab was removed from the UI to match TikTok's lean two-tab
      // header. Users who had it persisted fall back to For You.
      return "foryou";
    } catch { return "foryou"; }
  });
  const [feedSource, setFeedSource] = useState<ReelSourceFilter>(() => {
    if (typeof window === "undefined") return "all";
    try {
      const stored = localStorage.getItem("zivo_reel_source");
      if (stored === "people" || stored === "shops" || stored === "all") return stored;
    } catch { /* ignore */ }
    return "all";
  });
  useEffect(() => {
    try { localStorage.setItem("zivo_reel_mode", feedMode); } catch {}
  }, [feedMode]);
  useEffect(() => {
    try { localStorage.setItem("zivo_reel_source", feedSource); } catch {}
  }, [feedSource]);
  const activeSourceFilter = REEL_SOURCE_FILTERS.find((option) => option.key === feedSource) ?? REEL_SOURCE_FILTERS[0];
  const cycleSourceFilter = useCallback(() => {
    setFeedSource((current) => {
      const index = REEL_SOURCE_FILTERS.findIndex((option) => option.key === current);
      return REEL_SOURCE_FILTERS[(index + 1) % REEL_SOURCE_FILTERS.length].key;
    });
    setActiveIndex(0);
    requestAnimationFrame(() => cardRefs.current[0]?.scrollIntoView({ block: "start" }));
  }, []);
  // Reset to For You when the user is logged out — "following" mode with no
  // userId shows a blank black screen since neither the empty state nor the
  // tab controls render without a user.
  useEffect(() => {
    if (!userId && feedMode === "following") setFeedMode("foryou");
  }, [userId, feedMode]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  // Twitter-style "double-tap active tab to refresh + scroll to top".
  const lastTabTapRef = useRef<{ mode: string; at: number }>({ mode: "", at: 0 });
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator === "undefined" ? true : navigator.onLine);
  // Listen for connectivity changes so we can show a banner when offline +
  // a brief toast when reconnecting. Useful on flaky cellular / subway wifi.
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      toast.success("Back online");
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  // Post actions (bookmark / mute / block / report) + 3-dot menu
  const postActions = usePostActions(userId);
  const [actionsTarget, setActionsTarget] = useState<{ target: PostActionTarget; authorName?: string; shareUrl?: string } | null>(null);
  // Realtime new-posts banner
  const [newPostsCount, setNewPostsCount] = useState(0);
  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const [pullDelta, setPullDelta] = useState(0);
  // Multi-emoji reactions
  const reactions = usePostReactions(userId);
  // Reposts
  const reposts = usePostReposts(userId);
  const [repostTarget, setRepostTarget] = useState<{
    postId: string; source: "store" | "user"; authorName?: string; preview?: string | null;
  } | null>(null);
  // Author-only insights drawer
  const [insightsTarget, setInsightsTarget] = useState<{
    postId: string; source: "store" | "user";
  } | null>(null);
  // Author-only caption editor
  const [editCaptionTarget, setEditCaptionTarget] = useState<{
    postId: string; initialCaption: string;
  } | null>(null);
  // Posts the user has deleted, removed from view immediately while DB catches up
  const [deletedPostIds, setDeletedPostIds] = useState<Set<string>>(new Set());
  const hiddenPosts = useHiddenPosts(userId);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  // Infinite scroll — multiplier on the base page size
  const [pageMultiplier, setPageMultiplier] = useState(1);
  // Posts the user just blocked, removed from view immediately
  const [hiddenAuthorIds, setHiddenAuthorIds] = useState<Set<string>>(new Set());
  // Active report dialog (set by `zivo-reel-report` event from a card's More menu)
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const { data: ownerStore } = useOwnerStoreProfile();
  const lodgingRooms = useLodgeRooms(ownerStore?.isLodging ? ownerStore.id : "");
  const lodgingProfile = useLodgePropertyProfile(ownerStore?.isLodging ? ownerStore.id : "");
  const lodgingCompletion = ownerStore?.isLodging ? getLodgingCompletion({ rooms: lodgingRooms.data || [], profile: lodgingProfile.data, addons: [], housekeepingCount: 0, maintenanceReady: true, reportsReady: Boolean((lodgingRooms.data || []).length) }) : null;

  const openReelComposer = useCallback((draft: ReelComposerDraft = { mode: "reel" }) => {
    if (!userId) {
      toast.error("Please sign in to create reels");
      return;
    }
    setReelComposerDraft(draft);
  }, [userId]);

  const startReelDuet = useCallback((post: FeedPost) => {
    const remixSource = getReelRemixSource(post);
    openReelComposer({
      mode: "reel",
      caption: `Duet with ${getReelAuthorLabel(post)}\n\n`,
      audioName: getReelSoundLabel(post),
      ...remixSource,
      remixType: "duet",
      successMessage: "Duet posted!",
    });
  }, [openReelComposer]);

  const startReelStitch = useCallback((post: FeedPost) => {
    const remixSource = getReelRemixSource(post);
    openReelComposer({
      mode: "reel",
      caption: `Stitch with ${getReelAuthorLabel(post)}\n\n`,
      audioName: getReelSoundLabel(post),
      ...remixSource,
      remixType: "stitch",
      successMessage: "Stitch posted!",
    });
  }, [openReelComposer]);

  const shareReelToStory = useCallback((post: FeedPost) => {
    const mediaUrl = post.media_urls?.[0];
    if (!mediaUrl) {
      toast.error("No media to share to your story");
      return;
    }
    openReelComposer({
      mode: "story",
      caption: `Shared from ${getReelAuthorLabel(post)}`,
      sharedMediaUrl: mediaUrl,
      sharedMediaType: getSharedMediaType(mediaUrl),
      successMessage: "Story shared!",
    });
  }, [openReelComposer]);

  const giftReelCreator = useCallback((post: FeedPost) => {
    if (!userId) {
      toast.error("Please sign in to send gifts");
      return;
    }
    if (post.source === "user" && post.author_id) {
      if (post.author_id === userId) {
        toast.info("You cannot gift your own reel");
        return;
      }
      navigate(`/chat?with=${encodeURIComponent(post.author_id)}&gift=1`);
      return;
    }
    if (post.store_slug) {
      navigate(`/grocery/shop/${post.store_slug}`);
      return;
    }
    toast.info("Open this creator's profile to support them");
  }, [navigate, userId]);

  const reelComposerModal = (
    <AnimatePresence>
      {reelComposerDraft && userId && (
        <CreatePostModal
          userId={userId}
          userProfile={userProfile}
          onClose={() => setReelComposerDraft(null)}
          onCreated={() => {
            const message = reelComposerDraft.successMessage ||
              (reelComposerDraft.mode === "story" ? "Story shared!" : "Reel posted!");
            setReelComposerDraft(null);
            toast.success(message);
            void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
          }}
          initialMode={reelComposerDraft.mode}
          initialCaption={reelComposerDraft.caption}
          initialAudioName={reelComposerDraft.audioName}
          sharedMediaUrl={reelComposerDraft.sharedMediaUrl}
          sharedMediaType={reelComposerDraft.sharedMediaType}
          sharedPostId={reelComposerDraft.sharedPostId}
          sharedPostAuthorId={reelComposerDraft.sharedPostAuthorId}
          sharedPostAuthorName={reelComposerDraft.sharedPostAuthorName}
          remixType={reelComposerDraft.remixType}
        />
      )}
    </AnimatePresence>
  );

  // Get current user + profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id || null;
      setUserId(uid);
      if (uid) {
        supabase.from("profiles").select("full_name, avatar_url").eq("id", uid).maybeSingle()
          .then(({ data: p }) => {
            if (p) setUserProfile({
              name: (p as any).full_name || "You",
              avatar: (p as any).avatar_url || null,
            });
          });
      }
    });
  }, []);

  // First-visit swipe-up hint — auto-dismisses after 3 s and on any user
  // interaction (scroll, key press, click). Persisted in localStorage so
  // returning users don't see it again.
  useEffect(() => {
    try {
      if (localStorage.getItem("zivo_reel_onboarded") === "1") return;
    } catch { /* private mode etc. — just show the hint */ }
    setShowSwipeHint(true);
    const dismiss = () => {
      setShowSwipeHint(false);
      try { localStorage.setItem("zivo_reel_onboarded", "1"); } catch {}
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("click", dismiss);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchstart", dismiss);
    };
    window.addEventListener("keydown", dismiss);
    window.addEventListener("click", dismiss);
    window.addEventListener("wheel", dismiss, { passive: true });
    window.addEventListener("touchstart", dismiss, { passive: true });
    const timer = window.setTimeout(dismiss, 3500);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("click", dismiss);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchstart", dismiss);
    };
  }, []);

  // Followed user IDs — drives the "Following" tab filter
  useEffect(() => {
    if (!userId) { setFollowingIds(new Set()); return; }
    let alive = true;
    (supabase as any)
      .from("user_followers")
      .select("following_id")
      .eq("follower_id", userId)
      .then(({ data }: any) => {
        if (!alive) return;
        setFollowingIds(new Set((data || []).map((r: any) => r.following_id)));
      });
    return () => { alive = false; };
  }, [userId]);

  const { data: posts = [], isLoading, isFetching, isError: hasCustomerFeedError, error: customerFeedError } = useQuery({
    queryKey: ["customer-feed", userId, pageMultiplier, requestedReelId],
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const feedStartedAt = perfNow();
      // Pull the muted/blocked author list first so we can filter the feed
      // server-side. Defence-in-depth: client also filters in case RLS isn't
      // wired for these tables yet (the migration is included in this branch).
      let mutedAuthorIds = new Set<string>();
      if (userId) {
        const { data: safety } = await withSupabaseAbortSignal((supabase as any)
          .from("user_safety_actions")
          .select("target_user_id, action")
          .eq("user_id", userId), signal);
        mutedAuthorIds = new Set((safety ?? []).map((s: any) => s.target_user_id));
      }

      // Fetch store posts and user media posts in parallel. Keep each source
      // independent so one bad table policy or media-type mismatch cannot
      // blank the whole reels screen.
      // Page size grows with `pageMultiplier` so "load more" reveals additional content.
      const STORE_PAGE = FEED_STORE_PAGE_SIZE;
      const USER_PAGE  = FEED_USER_PAGE_SIZE;
      // Reels is a videos-only surface. Filter media_type='video' server-side
      // so the empty state isn't misleadingly populated by photo-only posts.
      const [storePostsResult, userPostsResult] = await Promise.all([
        withSupabaseAbortSignal(supabase
          .from("store_posts")
          .select("id, store_id, caption, media_urls, media_type, is_published, created_at, likes_count, comments_count, shares_count, reposts_count, view_count, audio_name, location")
          .eq("is_published", true)
          .eq("media_type", "video")
          .order("created_at", { ascending: false })
          .limit(STORE_PAGE * pageMultiplier), signal),
        withSupabaseAbortSignal((supabase as any)
          .from("user_posts")
          .select(FEED_USER_REELS_SELECT)
          .eq("is_published", true)
          .eq("media_type", "video")
          .order("created_at", { ascending: false })
          .limit(USER_PAGE * pageMultiplier), signal),
      ]);
      let userPostsResultForFeed = userPostsResult;
      if (userPostsResultForFeed.error && isSensitiveSchemaDriftError(userPostsResultForFeed.error)) {
        userPostsResultForFeed = await withSupabaseAbortSignal((supabase as any)
          .from("user_posts")
          .select(FEED_USER_REELS_SELECT_FALLBACK)
          .eq("is_published", true)
          .eq("media_type", "video")
          .order("created_at", { ascending: false })
          .limit(USER_PAGE * pageMultiplier), signal);
      }

      if (storePostsResult.error && userPostsResultForFeed.error) throw storePostsResult.error;
      if (storePostsResult.error || userPostsResultForFeed.error) {
        console.warn("[FeedPage] Some reel sources failed", {
          store_posts: storePostsResult.error?.message,
          user_posts: userPostsResultForFeed.error?.message,
        });
      }

      let postsData = storePostsResult.error ? [] : [...(storePostsResult.data ?? [])];
      let userMedia = userPostsResultForFeed.error ? [] : [...(userPostsResultForFeed.data ?? [])];

      // When a customer opens media from /feed and then taps the Reels tab,
      // /reels should land on that same media even if the algorithmic first
      // page did not include it. Hydrate the remembered/deep-linked post as a
      // one-off before enrichment so the rest of the workflow stays unified.
      const requestedRawId = requestedReelId?.replace(/^u-/, "") || null;
      if (requestedRawId) {
        const hasStoreTarget = postsData.some((post: any) => post.id === requestedRawId);
        const hasUserTarget = userMedia.some((post: any) => post.id === requestedRawId);
        if (!hasStoreTarget && !hasUserTarget) {
          const shouldTryStore = !requestedReelId?.startsWith("u-");
          const [targetStoreResult, targetUserResult] = await Promise.all([
            shouldTryStore
              ? supabase
                  .from("store_posts")
                  .select("id, store_id, caption, media_urls, media_type, is_published, created_at, likes_count, comments_count, shares_count, reposts_count, view_count, audio_name, location")
                  .eq("id", requestedRawId)
                  .eq("is_published", true)
                  .eq("media_type", "video")
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null } as any),
            (supabase as any)
              .from("user_posts")
              .select(FEED_USER_REELS_SELECT)
              .eq("id", requestedRawId)
              .eq("is_published", true)
              .eq("media_type", "video")
              .maybeSingle(),
          ]);
          let targetUserResultForFeed = targetUserResult;
          if (targetUserResultForFeed.error && isSensitiveSchemaDriftError(targetUserResultForFeed.error)) {
            targetUserResultForFeed = await (supabase as any)
              .from("user_posts")
              .select(FEED_USER_REELS_SELECT_FALLBACK)
              .eq("id", requestedRawId)
              .eq("is_published", true)
              .eq("media_type", "video")
              .maybeSingle();
          }

          if (targetStoreResult.data) {
            postsData = [targetStoreResult.data, ...postsData];
          } else if (targetUserResultForFeed.data) {
            userMedia = [targetUserResultForFeed.data, ...userMedia];
          }
        }
      }

      // Strip muted/blocked authors from user media posts
      const filteredUserMedia = (userMedia ?? []).filter(
        (p: any) => !mutedAuthorIds.has(p.user_id)
      );

      const storeIds = [...new Set((postsData || []).map((p: any) => p.store_id))];
      const userIds = [...new Set(filteredUserMedia.map((p: any) => p.user_id))];

      const [{ data: stores }, { data: profiles }] = await Promise.all([
        storeIds.length
          ? supabase.from("store_profiles").select("id, name, logo_url, slug, is_verified").in("id", storeIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? supabase.from("profiles").select("id, user_id, full_name, username, avatar_url, is_verified").or(`user_id.in.(${(userIds as string[]).join(",")}),id.in.(${(userIds as string[]).join(",")})`)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const storeMap = new Map((stores || []).map((s: any) => [s.id, s]));
      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => {
        if (p.id) profileMap.set(p.id, p);
        if (p.user_id) profileMap.set(p.user_id, p);
      });

      const allPosts: FeedPost[] = [];

      // Store posts — Reels is a vertical media scroller, so drop text-only
      // store announcements (no media_urls). They have a home in /feed where
      // text cards render correctly; here they'd just produce empty slides.
      const seenStorePosts = new Set<string>();
      for (const post of ((postsData as any[]) || [])) {
        if (seenStorePosts.has(post.id)) continue;
        seenStorePosts.add(post.id);
        const hasMedia = Array.isArray(post.media_urls) && post.media_urls.length > 0;
        if (!hasMedia) continue;
        const store = storeMap.get(post.store_id);
        allPosts.push({
          ...(post as any),
          source: "store",
          store_name: store?.name || "Store",
          store_logo: store?.logo_url,
          store_slug: store?.slug,
          store_is_verified: (store as any)?.is_verified === true,
        });
      }

      // User media posts (already filtered for muted/blocked authors above)
      const seenUserPosts = new Set<string>();
      for (const post of filteredUserMedia) {
        if (seenUserPosts.has(post.id)) continue;
        seenUserPosts.add(post.id);
        const profile = profileMap.get(post.user_id);
        const urls: string[] = Array.isArray(post.media_urls) && post.media_urls.length > 0
          ? post.media_urls
          : post.media_url ? [post.media_url] : [];
        if (!urls.length) continue;
        allPosts.push({
          id: `u-${post.id}`,
          store_id: "",
          caption: post.caption,
          media_urls: urls,
          media_type: normalizeUserPostMediaType(post),
          is_published: true,
          created_at: post.created_at,
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          shares_count: post.shares_count || 0,
          view_count: post.views_count || 0,
          audio_name: post.audio_name || null,
          source: "user",
          author_id: post.user_id,
          author_name: profile?.full_name || profile?.username || "User",
          author_avatar: profile?.avatar_url || null,
          author_is_verified: !!profile?.is_verified,
          location: post.location || null,
          shared_from_post_id: post.shared_from_post_id || null,
          shared_from_user_id: post.shared_from_user_id || null,
          is_sensitive: !!post.is_sensitive,
          sensitive_reason: post.sensitive_reason || null,
        });
      }

      // Facebook-style algorithmic feed: blend engagement + recency + randomness
      const now = Date.now();
      const ONE_HOUR = 3_600_000;
      const seededRandom = (id: string) => {
        let h = 0;
        for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
        return ((h >>> 0) % 1000) / 1000;
      };
      const dayKey = Math.floor(now / 86_400_000);

      allPosts.forEach((item: any) => {
        const ageHours = (now - new Date(item.created_at).getTime()) / ONE_HOUR;
        const recencyScore = 1 / (1 + ageHours / 6);
        const totalEngagement = (item.likes_count || 0) + (item.comments_count || 0) * 2 + (item.view_count || 0) * 0.1;
        const engagementScore = Math.log2(1 + totalEngagement) / 10;
        const randomFactor = seededRandom(item.id + dayKey) * 0.15;
        const creatorBoost = item.source === "user" ? 0.12 : 0;
        item._feedScore = recencyScore * 0.45 + engagementScore * 0.3 + randomFactor + creatorBoost;
      });

      allPosts.sort((a: any, b: any) => (b._feedScore || 0) - (a._feedScore || 0));
      const blendedPosts = blendCreatorAndStoreReels(allPosts);
      perfMeasure("fullscreen feed query", feedStartedAt, {
        pageMultiplier,
        storeLimit: STORE_PAGE * pageMultiplier,
        userLimit: USER_PAGE * pageMultiplier,
        itemCount: blendedPosts.length,
      });
      return blendedPosts;
    },
  });

  const updatePostEngagementCount = useCallback((
    postId: string,
    source: FeedPostSource,
    field: EngagementCountField,
    nextValue: number | ((currentValue: number) => number),
  ) => {
    const targetRawId = getFeedPostRawId(postId);
    queryClient.setQueryData<FeedPost[]>(
      ["customer-feed", userId, pageMultiplier, requestedReelId],
      (current) => {
        if (!Array.isArray(current)) return current;
        let changed = false;
        const nextPosts = current.map((post) => {
          if (getFeedPostRawId(post) !== targetRawId || getFeedPostSource(post) !== source) return post;
          const currentValue = Number(post[field] || 0);
          const resolved = typeof nextValue === "function" ? nextValue(currentValue) : nextValue;
          const bounded = Math.max(0, resolved);
          if (bounded === currentValue) return post;
          changed = true;
          return { ...post, [field]: bounded };
        });
        return changed ? nextPosts : current;
      },
    );
  }, [pageMultiplier, queryClient, requestedReelId, userId]);

  useEffect(() => {
    if (!hasCustomerFeedError || !customerFeedError) return;
    reportFeedQueryError(
      {
        scope: "customer-feed",
        queryKey: "customer-feed",
        userId,
        pageMultiplier,
      },
      customerFeedError,
    );
  }, [customerFeedError, hasCustomerFeedError, pageMultiplier, userId]);

  // Posts shown in the snap-scroller — filtered by For You / Following / Trending + hashtag.
  // Memoized so cardRefs / activeIndex stay aligned with what's rendered.
  const visiblePosts = useMemo(() => {
    let list = posts;
    if (feedMode === "following" && userId) {
      list = list.filter((p) => p.author_id && followingIds.has(p.author_id));
    }
    if (feedSource === "people") {
      list = list.filter((p) => p.source === "user");
    } else if (feedSource === "shops") {
      list = list.filter((p) => p.source === "store");
    }
    if (hiddenAuthorIds.size > 0) {
      list = list.filter((p) => !p.author_id || !hiddenAuthorIds.has(p.author_id));
    }
    if (deletedPostIds.size > 0) {
      list = list.filter((p) => !deletedPostIds.has(p.id));
    }
    if (hiddenPosts.hidden.size > 0) {
      list = list.filter((p) => !hiddenPosts.isHidden(p.id, getFeedPostSource(p)));
    }
    if (selectedHashtag) {
      list = list.filter((p) => postHasHashtag(p.caption, selectedHashtag));
    }
    if (feedMode === "trending") {
      list = [...list].sort((a, b) => {
        const scoreA = (a.likes_count ?? 0) * 2 + (a.comments_count ?? 0) + (a.reposts_count ?? 0);
        const scoreB = (b.likes_count ?? 0) * 2 + (b.comments_count ?? 0) + (b.reposts_count ?? 0);
        return scoreB - scoreA;
      });
    }
    return list;
  }, [posts, feedMode, feedSource, userId, followingIds, hiddenAuthorIds, deletedPostIds, hiddenPosts, selectedHashtag]);

  useEffect(() => {
    if (visiblePosts.length === 0) return;
    if (activeIndex >= visiblePosts.length) {
      setActiveIndex(0);
      requestAnimationFrame(() => cardRefs.current[0]?.scrollIntoView({ block: "start" }));
    }
  }, [activeIndex, visiblePosts.length]);

  // Batch-fetch liked + saved post IDs for all visible posts in one round-trip each
  useEffect(() => {
    if (!userId || posts.length === 0) return;
    const storePostIds = posts.filter((p) => p.source !== "user").map((p) => p.id);
    const userPostIds = posts.filter((p) => p.source === "user").map((p) => p.id.replace(/^u-/, ""));
    // Likes
    Promise.all([
      storePostIds.length
        ? supabase
            .from("store_post_likes")
            .select("post_id")
            .eq("user_id", userId)
            .in("post_id", storePostIds)
        : Promise.resolve({ data: [] as any[] }),
      userPostIds.length
        ? (supabase as any)
            .from("post_likes")
            .select("post_id")
            .eq("user_id", userId)
            .in("post_id", userPostIds)
        : Promise.resolve({ data: [] as any[] }),
    ]).then(([storeLikes, userLikes]: any[]) => {
      const liked = new Set<string>();
      for (const row of storeLikes.data || []) liked.add(row.post_id);
      for (const row of userLikes.data || []) liked.add(`u-${row.post_id}`);
      setUserLikedPostIds(liked);
    });
    // Bookmarks — read both the modern post_bookmarks table and the older
    // general bookmarks table so Feed, Reels, and Saved stay in sync.
    const bookmarkIds = Array.from(new Set(posts.flatMap((p) => [p.id, getFeedPostRawId(p)])));
    const rawPostIds = Array.from(new Set(posts.map(getFeedPostRawId)));
    Promise.all([
      bookmarkIds.length
        ? (supabase as any)
            .from("bookmarks")
            .select("item_id")
            .eq("user_id", userId)
            .eq("item_type", "post")
            .in("item_id", bookmarkIds)
        : Promise.resolve({ data: [] as any[] }),
      rawPostIds.length
        ? (supabase as any)
            .from("post_bookmarks")
            .select("post_id, source")
            .eq("user_id", userId)
            .in("post_id", rawPostIds)
        : Promise.resolve({ data: [] as any[] }),
    ]).then(([legacyBookmarks, modernBookmarks]: any[]) => {
      const saved = new Set<string>();
      for (const row of legacyBookmarks.data || []) saved.add(row.item_id);
      for (const row of modernBookmarks.data || []) {
        saved.add(`${row.source}:${row.post_id}`);
        saved.add(row.source === "user" ? `u-${row.post_id}` : row.post_id);
      }
      setSavedPostIds(saved);
    });
  }, [userId, posts]);

  // Batch live-stream check — one query for all unique author IDs in the feed
  useEffect(() => {
    if (posts.length === 0) return;
    const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean))] as string[];
    if (!authorIds.length) return;
    (supabase as any)
      .from("live_streams")
      .select("user_id")
      .in("user_id", authorIds)
      .eq("status", "live")
      .then(({ data }: any) => {
        setLiveAuthorIds(new Set((data || []).map((r: any) => r.user_id)));
      });
  }, [posts]);

  // ── Realtime: count new posts that arrive while user is mid-feed ────────────
  // Channel name is opaque (per security guidance) — uses topicForUserSync so
  // the leaked topic-name metadata doesn't reveal the user ID.
  useEffect(() => {
    const channelName = userId ? topicForUserSync(userId, "feed-new-posts") : "feed-new-posts:anon";
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_posts" }, (payload: any) => {
        // Skip the user's own posts (they'll see them via the optimistic update)
        if (payload?.new?.user_id === userId) return;
        if (payload?.new?.is_published === false) return;
        setNewPostsCount((c) => c + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "store_posts" }, (payload: any) => {
        if (payload?.new?.is_published === false) return;
        setNewPostsCount((c) => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Tapping the pill: scroll to top, refetch, clear count
  const handleShowNewPosts = useCallback(() => {
    setNewPostsCount(0);
    queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
    cardRefs.current[0]?.scrollIntoView({ behavior: "smooth" });
    setActiveIndex(0);
  }, [queryClient]);

  // ── Pull-to-refresh: simple touch-driven swipe-down at the top ─────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only begin pull if we're already at the top of the scroll container
    const scroller = (e.currentTarget as HTMLDivElement);
    if (scroller.scrollTop > 0) return;
    pullStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current == null) return;
    const delta = e.touches[0].clientY - pullStartY.current;
    if (delta > 0) setPullDelta(Math.min(delta, 120));
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullStartY.current == null) return;
    const triggered = pullDelta > 70;
    pullStartY.current = null;
    setPullDelta(0);
    if (triggered && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
        setNewPostsCount(0);
        toast.success("Feed refreshed");
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [pullDelta, isRefreshing, queryClient]);

  const handleToggleLike = useCallback(async (postId: string, currentlyLiked: boolean) => {
    if (!userId) {
      toast.error("Please sign in to like posts");
      return;
    }
    if (likePendingPostIds.has(postId)) return;
    setLikePendingPostIds((prev) => new Set(prev).add(postId));
    setUserLikedPostIds((prev) => {
      const next = new Set(prev);
      if (currentlyLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });

    try {
      const post = posts.find(p => p.id === postId);
      const rawPostId = postId.replace(/^u-/, "");
      const likesTable = post?.source === "user" ? "post_likes" : "store_post_likes";
      if (currentlyLiked) {
        await (supabase as any).from(likesTable).delete().eq("post_id", rawPostId).eq("user_id", userId);
      } else {
        await (supabase as any).from(likesTable).insert({ post_id: rawPostId, user_id: userId });
        // Push notification to post author — once per post per session.
        const authorId = post?.author_id;
        if (authorId && authorId !== userId && shouldSendLikeNotification(postId)) {
          try {
            const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", userId).single();
            await supabase.functions.invoke("send-push-notification", {
              body: { user_id: authorId, notification_type: "post_liked", title: "New Like ❤️", body: `${sp?.full_name || "Someone"} liked your post`, data: { type: "post_liked", post_id: postId, liker_id: userId, action_url: `/feed?post=${postId}` } },
            });
          } catch (notifyErr) {
            console.warn("[FeedPage] like push notify failed", notifyErr);
          }
        }
      }
    } catch {
      setUserLikedPostIds((prev) => {
        const next = new Set(prev);
        if (currentlyLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      toast.error("Couldn't update like. Try again.");
    } finally {
      setLikePendingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
    }
  }, [userId, likePendingPostIds, queryClient, posts]);

  // Media Session bridge — the active ReelCard exposes nexttrack/previoustrack
  // handlers via window events so the OS-level skip buttons (Bluetooth,
  // lock screen, Control Center) navigate the feed.
  useEffect(() => {
    const onNext = () => {
      if (activeIndex < visiblePosts.length - 1) {
        cardRefs.current[activeIndex + 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    const onPrev = () => {
      if (activeIndex > 0) {
        cardRefs.current[activeIndex - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("zivo-reel-next", onNext);
    window.addEventListener("zivo-reel-prev", onPrev);
    return () => {
      window.removeEventListener("zivo-reel-next", onNext);
      window.removeEventListener("zivo-reel-prev", onPrev);
    };
  }, [activeIndex, visiblePosts.length]);

  // Reel-card overflow menu bridge: Not interested → hide locally;
  // Report → open the centralized report dialog.
  useEffect(() => {
    const onHide = (e: Event) => {
      const postId = (e as CustomEvent<{ postId: string }>).detail?.postId;
      if (!postId) return;
      setDeletedPostIds((prev) => {
        if (prev.has(postId)) return prev;
        const next = new Set(prev);
        next.add(postId);
        return next;
      });
      toast.success("We'll show fewer posts like this");
    };
    const onReport = (e: Event) => {
      const postId = (e as CustomEvent<{ postId: string }>).detail?.postId;
      if (!postId) return;
      setReportPostId(postId);
    };
    window.addEventListener("zivo-reel-hide", onHide);
    window.addEventListener("zivo-reel-report", onReport);
    return () => {
      window.removeEventListener("zivo-reel-hide", onHide);
      window.removeEventListener("zivo-reel-report", onReport);
    };
  }, []);

  // Keyboard shortcuts for the reel viewer (desktop power-user).
  // Skipped while typing in any input/textarea so we don't hijack typing.
  // - Space / K  → play / pause active reel
  // - M          → toggle mute
  // - L          → like / unlike active reel
  // - ↓ / J      → next reel
  // - ↑          → previous reel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const currentPost = visiblePosts[activeIndex];
      const currentCard = cardRefs.current[activeIndex];

      switch (e.key) {
        case " ":
        case "k":
        case "K": {
          e.preventDefault();
          const video = currentCard?.querySelector("video");
          if (video) {
            if (video.paused) void video.play().catch(() => {});
            else video.pause();
          }
          break;
        }
        case "m":
        case "M": {
          e.preventDefault();
          setGlobalMuted((m) => !m);
          break;
        }
        case "l":
        case "L": {
          if (!currentPost || !userId) return;
          e.preventDefault();
          handleToggleLike(currentPost.id, userLikedPostIds.has(currentPost.id));
          break;
        }
        case "ArrowDown":
        case "j":
        case "J": {
          if (activeIndex < visiblePosts.length - 1) {
            e.preventDefault();
            cardRefs.current[activeIndex + 1]?.scrollIntoView({ behavior: "smooth" });
          }
          break;
        }
        case "ArrowUp": {
          if (activeIndex > 0) {
            e.preventDefault();
            cardRefs.current[activeIndex - 1]?.scrollIntoView({ behavior: "smooth" });
          }
          break;
        }
        case "?": {
          e.preventDefault();
          setShowShortcutsHelp((v) => !v);
          break;
        }
        case "Escape": {
          if (showShortcutsHelp) {
            e.preventDefault();
            setShowShortcutsHelp(false);
          }
          break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, visiblePosts, userId, userLikedPostIds, showShortcutsHelp]); // eslint-disable-line react-hooks/exhaustive-deps

  const didRestorePosition = useRef(false);

  // Persist the active post's ID so resume survives feed re-shuffling
  // (the algorithmic feed reorders results; a stored index could land on
  // a different reel after a refresh).
  useEffect(() => {
    if (!didRestorePosition.current) return;
    if (visiblePosts.length === 0) return;
    const activePost = visiblePosts[activeIndex];
    if (!activePost) return;
    try { sessionStorage.setItem("zivo_reel_active_id", activePost.id); } catch {}
  }, [activeIndex, visiblePosts]);

  // On first paint after the visible list arrives, scroll to the resumed
  // reel. Prefer matching by stored post ID (survives reordering); fall
  // back to stored index if the post is no longer in the feed.
  // Skipped when arriving via a deep link — the link's target wins.
  useEffect(() => {
    if (didRestorePosition.current) return;
    if (visiblePosts.length === 0) return;
    if (hasDeepLink) {
      didRestorePosition.current = true;
      return;
    }

    let safeIndex = -1;
    try {
      const storedId = sessionStorage.getItem("zivo_reel_active_id");
      if (storedId) {
        safeIndex = visiblePosts.findIndex((p) => p.id === storedId);
      }
    } catch { /* ignore */ }
    if (safeIndex < 0) {
      // ID lookup failed — fall back to bounded index
      safeIndex = Math.min(activeIndex, visiblePosts.length - 1);
    } else if (safeIndex !== activeIndex) {
      // Sync the index state to the matched ID's position
      setActiveIndex(safeIndex);
    }

    if (safeIndex <= 0) {
      didRestorePosition.current = true;
      return;
    }
    didRestorePosition.current = true;
    requestAnimationFrame(() => {
      cardRefs.current[safeIndex]?.scrollIntoView({ block: "start" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePosts.length, hasDeepLink]);

  // IntersectionObserver — re-attach when the visible list changes (e.g.
  // toggling For You / Following) so we observe the freshly-rendered cards
  // instead of stale DOM nodes from the previous list.
  useEffect(() => {
    if (visiblePosts.length === 0) return;
    const observers: IntersectionObserver[] = [];

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActiveIndex(index);
          }
        },
        { threshold: 0.6 },
      );
      obs.observe(card);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [visiblePosts.length]);

  useEffect(() => {
    // Path param /reels/:postId takes priority; falls back to ?post= query.
    // Path postId is raw (no `u-` prefix) — match against either form.
    const params = new URLSearchParams(location.search);
    const sharedPostId = routePostId || params.get("post");
    if (!sharedPostId || visiblePosts.length === 0) return;

    // Try exact match, then `u-`-prefixed user-post id, then unprefixed id.
    let targetIndex = visiblePosts.findIndex((post) => post.id === sharedPostId);
    if (targetIndex < 0) targetIndex = visiblePosts.findIndex((post) => post.id === `u-${sharedPostId}`);
    if (targetIndex < 0) targetIndex = visiblePosts.findIndex((post) => post.id.replace(/^u-/, "") === sharedPostId);
    if (targetIndex < 0) return;

    setActiveIndex(targetIndex);
    const matchedPost = visiblePosts[targetIndex];
    requestAnimationFrame(() => {
      cardRefs.current[targetIndex]?.scrollIntoView({ block: "start" });
      // ?comments=1 (typically from a "new comment" notification tap) →
      // auto-open the comment sheet on the matched reel after the scroll.
      // Slight delay so the snap-scroll lands first.
      if (params.get("comments") === "1" && matchedPost) {
        window.setTimeout(() => {
          setCommentTarget({
            postId: matchedPost.id,
            source: getFeedPostSource(matchedPost),
            initialCount: matchedPost.comments_count || 0,
          });
        }, 250);
      }
    });
  }, [visiblePosts, location.search, routePostId]);

  if (isLoading) {
    // Inline skeleton — drawn from one tiny CSS animation rather than lazy-
    // loading a separate Skeleton bundle. Renders on first paint with no
    // network/JS waterfall. The IG-gradient pulse hints at the reels theme.
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col" aria-busy="true" aria-label="Loading reels">
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-pink-400/[0.05] via-violet-500/[0.04] to-transparent" />
          <div className="absolute bottom-32 left-4 right-16 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
              <div className="h-3 w-32 rounded-full bg-white/10 animate-pulse" />
            </div>
            <div className="h-3 w-3/4 rounded-full bg-white/10 animate-pulse" />
            <div className="h-3 w-1/2 rounded-full bg-white/10 animate-pulse" />
          </div>
          <div className="absolute right-3 bottom-32 flex flex-col gap-5 items-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasCustomerFeedError && posts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 z-50 px-8 text-center">
        <LoadFailureCard
          className="w-full max-w-xl"
          title="Feed is having trouble loading"
          description="We could not load reels right now. Your connection or a service may be temporarily unstable."
          onRetry={() => {
            void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
          }}
          onSecondary={() => navigate("/")}
          secondaryLabel="Go Home"
          trackingContext="reels_feed"
        />
        <ZivoMobileNav />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 z-50 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
          <Film className="h-8 w-8 text-white/80" />
        </div>
        <div>
          <p className="text-white font-semibold">No reels yet</p>
          <p className="mt-1 text-white/50 text-sm">
            Reels are videos from people and stores. Record one or check back after new videos publish.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {userId && (
            <button
              type="button"
              onClick={() => openReelComposer({ mode: "reel" })}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black active:scale-95"
            >
              Create reel
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFeedSource("all");
              void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
            }}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            Refresh
          </button>
          <button type="button" onClick={() => navigate("/trending")} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white active:scale-95">Trending</button>
          <button type="button" onClick={() => navigate("/audio-rooms")} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white active:scale-95">Live rooms</button>
          <button type="button" onClick={() => navigate("/feed")} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white active:scale-95">Browse feed</button>
        </div>
        <ZivoMobileNav />
        {reelComposerModal}
      </div>
    );
  }

  // Hashtag filter narrowed to zero — let the user clear it without leaving the page.
  if (selectedHashtag && visiblePosts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <EmptyState
          tone="muted"
          title={`No reels with #${selectedHashtag} yet`}
          description="Try a different tag, or clear the filter to see all reels."
          action={
            <button
              type="button"
              onClick={() => setSelectedHashtag(null)}
              className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold active:scale-95 transition-transform"
            >
              Clear filter
            </button>
          }
          className="text-white [&_h3]:text-white [&_p]:text-white/55"
        />
        <ZivoMobileNav />
      </div>
    );
  }

  // Following tab with no matching reels — distinct empty state.
  if (feedMode === "following" && visiblePosts.length === 0 && userId) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <EmptyState
          icon={UserPlus}
          tone="brand"
          title="No reels from people you follow"
          description="Follow creators to see their reels here, or jump back to For You to discover new ones."
          action={
            <button
              type="button"
              onClick={() => setFeedMode("foryou")}
              className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold active:scale-95 transition-transform"
            >
              Back to For You
            </button>
          }
          secondaryAction={
            <button
              type="button"
              onClick={() => setShowDiscover(true)}
              className="px-5 py-2 rounded-full bg-white/10 text-white text-sm font-semibold ring-1 ring-white/15 backdrop-blur-md active:scale-95 transition-transform"
            >
              Discover creators
            </button>
          }
          className="text-white [&_h3]:text-white [&_p]:text-white/55"
        />
        <ZivoMobileNav />
      </div>
    );
  }

  if (feedSource !== "all" && visiblePosts.length === 0) {
    const emptyTitle = feedSource === "people" ? "No people reels yet" : "No shop reels yet";
    const emptyDescription = feedSource === "people"
      ? "Videos from people will show here. Switch back to All to keep watching."
      : "Videos from stores will show here. Switch back to All to keep watching.";
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <EmptyState
          icon={feedSource === "people" ? UserCircle : Store}
          tone="brand"
          title={emptyTitle}
          description={emptyDescription}
          action={
            <button
              type="button"
              onClick={() => setFeedSource("all")}
              className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold active:scale-95 transition-transform"
            >
              Show all reels
            </button>
          }
          secondaryAction={
            <button
              type="button"
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
              }}
              className="px-5 py-2 rounded-full bg-white/10 text-white text-sm font-semibold ring-1 ring-white/15 backdrop-blur-md active:scale-95 transition-transform"
            >
              Refresh
            </button>
          }
          className="text-white [&_h3]:text-white [&_p]:text-white/55"
        />
        <ZivoMobileNav />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <SEOHead
      title={isReelsRoute ? "ZIVO Reels – Full-Screen Short Videos" : "ZIVO Feed – Short Videos, Reels & Stories"}
      description={isReelsRoute ? "Watch full-screen creator reels, trending videos, captions, reposts, comments, and shares on ZIVO." : "Watch and share short videos, reels, and stories from creators around the world on ZIVO."}
      canonical={isReelsRoute ? "/reels" : "/feed"}
    />
    <Suspense fallback={null}><ReelsCoachmarks /></Suspense>
    <div className="fixed inset-0 bg-black lg:flex lg:flex-col">
      {/* Desktop NavBar */}
      <div className="hidden lg:block relative z-[1200] shrink-0">
        <NavBar />
      </div>
      {/* Offline banner — slides down from the top when we lose connectivity.
          Wrapped in a centered max-w container so it aligns with the phone
          frame on iPad/desktop. */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="absolute inset-x-0 top-safe-overlay z-[55] mx-auto md:max-w-[420px] pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <div className="mx-3 px-4 py-2 rounded-full bg-zinc-900/95 backdrop-blur-md border border-white/15 shadow-xl flex items-center justify-center gap-2 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white text-xs font-semibold">You're offline — reels will resume when you reconnect</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasCustomerFeedError && posts.length > 0 && (
          <motion.div
            initial={{ y: -32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -32, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="absolute inset-x-0 top-safe-overlay z-[70] mx-auto pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <DegradedDataBanner
              className="mx-3 md:mx-auto md:max-w-[460px] pointer-events-auto"
              message="Using cached reels. Live refresh failed."
              onRetry={() => {
                void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
              }}
              trackingContext="reels_feed"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* For You / Following tabs — TikTok-style top center segmented control.
          On iPad+ the phone frame starts at 16px from the viewport top (md:my-4),
          so we max() the safe-area inset with 16px so the tabs sit inside the
          frame instead of floating above it on tablets without a notch. */}
      {userId && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50"
          style={{ top: "calc(var(--zivo-safe-top, 0px) + 8px)" }}
        >
          <div
            className="relative flex items-center gap-6 px-2"
            role="tablist"
            aria-label="Reel feed mode"
          >
            {feedMode === "following" ? (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected="true"
                  onClick={() => {
                    const now = Date.now();
                    if (
                      lastTabTapRef.current.mode === "following" &&
                      now - lastTabTapRef.current.at < 400
                    ) {
                      lastTabTapRef.current = { mode: "", at: 0 };
                      void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
                      cardRefs.current[0]?.scrollIntoView({ behavior: "smooth", block: "start" });
                      toast.success("Refreshing…");
                      return;
                    }
                    lastTabTapRef.current = { mode: "following", at: now };
                    setFeedMode("following");
                    setActiveIndex(0);
                    requestAnimationFrame(() => cardRefs.current[0]?.scrollIntoView({ block: "start" }));
                  }}
                  className="relative py-2 text-[15px] sm:text-base font-semibold tracking-tight whitespace-nowrap transition-colors duration-200 active:scale-[0.97] text-white"
                >
                  <span className="relative z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">Following</span>
                  <motion.span
                    layoutId="reel-tab-underline"
                    transition={{ type: "spring", damping: 28, stiffness: 380 }}
                    className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[3px] w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(255,255,255,0.5)]"
                  />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected="false"
                  onClick={() => {
                    const now = Date.now();
                    lastTabTapRef.current = { mode: "foryou", at: now };
                    setFeedMode("foryou");
                    setActiveIndex(0);
                    requestAnimationFrame(() => cardRefs.current[0]?.scrollIntoView({ block: "start" }));
                  }}
                  className="relative py-2 text-[15px] sm:text-base font-semibold tracking-tight whitespace-nowrap transition-colors duration-200 active:scale-[0.97] text-white/55 hover:text-white/80"
                >
                  <span className="relative z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">For You</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected="false"
                  onClick={() => {
                    const now = Date.now();
                    lastTabTapRef.current = { mode: "following", at: now };
                    setFeedMode("following");
                    setActiveIndex(0);
                    requestAnimationFrame(() => cardRefs.current[0]?.scrollIntoView({ block: "start" }));
                  }}
                  className="relative py-2 text-[15px] sm:text-base font-semibold tracking-tight whitespace-nowrap transition-colors duration-200 active:scale-[0.97] text-white/55 hover:text-white/80"
                >
                  <span className="relative z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">Following</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected="true"
                  onClick={() => {
                    const now = Date.now();
                    if (
                      lastTabTapRef.current.mode === "foryou" &&
                      now - lastTabTapRef.current.at < 400
                    ) {
                      lastTabTapRef.current = { mode: "", at: 0 };
                      void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
                      cardRefs.current[0]?.scrollIntoView({ behavior: "smooth", block: "start" });
                      toast.success("Refreshing…");
                      return;
                    }
                    lastTabTapRef.current = { mode: "foryou", at: now };
                    setFeedMode("foryou");
                    setActiveIndex(0);
                    requestAnimationFrame(() => cardRefs.current[0]?.scrollIntoView({ block: "start" }));
                  }}
                  className="relative py-2 text-[15px] sm:text-base font-semibold tracking-tight whitespace-nowrap transition-colors duration-200 active:scale-[0.97] text-white"
                >
                  <span className="relative z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">For You</span>
                  <motion.span
                    layoutId="reel-tab-underline"
                    transition={{ type: "spring", damping: 28, stiffness: 380 }}
                    className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[3px] w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(255,255,255,0.5)]"
                  />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className="absolute left-3 z-50 lg:left-4"
        style={{ top: "calc(var(--zivo-safe-top, 0px) + 8px)" }}
      >
        <button
          type="button"
          onClick={cycleSourceFilter}
          aria-label={`Showing ${activeSourceFilter.label}. Tap to change reel source.`}
          className="pointer-events-auto inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 text-xs font-bold text-white shadow-lg backdrop-blur-sm active:scale-95"
        >
          {feedSource === "people" ? (
            <UserCircle className="h-4 w-4" />
          ) : feedSource === "shops" ? (
            <Store className="h-4 w-4" />
          ) : (
            <Film className="h-4 w-4" />
          )}
          <span>{activeSourceFilter.shortLabel}</span>
        </button>
      </div>

      {/* Discover + Search + Live buttons — hide on desktop.
          Wrapped in a centered container so on iPad (md+), where the reel
          sits in a 420-px-wide phone frame, the buttons hug the right edge
          of the frame instead of floating in the black gutter outside it. */}
      <div
        className="absolute inset-x-0 z-50 mx-auto md:max-w-[420px] pointer-events-none lg:hidden"
        style={{ top: "calc(var(--zivo-safe-top, 0px) + 8px)" }}
      >
      <div data-testid="feed-floating-actions" className="flex justify-end gap-2 sm:gap-2.5 px-3 sm:px-4">
        {/* Live entry — also reachable via the bottom nav, so hide on the
            smallest phones (<sm) where the row would collide with center tabs. */}
        <button
          type="button"
          onClick={() => navigate("/live")}
          aria-label="Watch live"
          title="Live"
          className="pointer-events-auto hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center active:scale-95 transition-transform border border-white/10"
        >
          <Radio className="w-5 h-5 text-red-400" />
        </button>
        {/* Discover people — hidden on smallest phones to keep clearance for
            the centered tabs; reachable from the search overlay anyway. */}
        <button
          type="button"
          onClick={() => setShowDiscover(true)}
          aria-label="Discover people"
          title="Discover people"
          className="pointer-events-auto hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center active:scale-95 transition-transform border border-white/10"
        >
          <UserPlus className="w-5 h-5 text-white" />
        </button>
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          aria-label="Search"
          title="Search"
          className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform border border-white/10"
        >
          <Search className="w-5 h-5 text-white" />
        </button>
        {userId && (
          <button
            type="button"
            onClick={() => openReelComposer({ mode: "reel" })}
            aria-label="Create post"
            title="Create"
            className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform border border-primary/40 shadow-lg shadow-primary/30"
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        )}
        {/* Playback speed — bridges to the active ReelCard via window event.
            Hidden on the smallest phones (<sm) so the 5-button row doesn't
            collide with the centered For You / Following tabs at 320px. The
            speed badge in the corner remains tappable on those screens, and
            long-press on the video still gives a quick 2× boost. */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("zivo-reel-open-speed"))}
          aria-label="Playback speed"
          title="Playback speed"
          className="pointer-events-auto hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center active:scale-95 transition-transform border border-white/10"
        >
          <Gauge className="w-5 h-5 text-white" />
        </button>
        {/* Picture-in-picture — toggles native PiP on the active video.
            Hidden on smallest phones (PiP is unreliable on those anyway). */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("zivo-reel-toggle-pip"))}
          aria-label="Picture-in-picture"
          title="Picture-in-picture"
          className="hidden sm:flex w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 backdrop-blur-sm items-center justify-center active:scale-95 transition-transform border border-white/10"
        >
          <PictureInPicture className="w-5 h-5 text-white" />
        </button>
      </div>
      </div>

      {/* Search overlay */}
      {showSearch && (
        <FeedSearchOverlay onClose={() => setShowSearch(false)} onNavigate={navigate} />
      )}

      {/* Discover People overlay */}
      <AnimatePresence>
        {showDiscover && (
          <DiscoverPeopleOverlay onClose={() => setShowDiscover(false)} onNavigate={navigate} />
        )}
      </AnimatePresence>

      {/* Snap-scroll reel container */}
      <div
        className="relative w-full h-full md:flex md:items-stretch md:justify-center md:gap-6 lg:flex-1 lg:min-h-0 lg:h-0 lg:px-6 xl:px-10"
      >
        {/* Desktop LEFT rail — navigation + services.
            Hidden on `/reels` so the TikTok-style hero can fill the viewport. */}
        {!isReelsRoute && (
          <aside className="hidden lg:flex lg:flex-col lg:w-[260px] xl:w-[300px] shrink-0 h-full overflow-y-auto py-6 pr-2 bg-background/40 backdrop-blur-sm border-r border-border/20 rounded-r-2xl">
            <Suspense fallback={<div className="h-32" />}>
              <FeedSidebar />
            </Suspense>
          </aside>
        )}

        {/* Phone-frame on tablet, full-width on desktop.
            On `/reels` we widen the frame since the side rails are hidden. */}
        <div className={cn(
          "w-full h-full md:mx-auto md:rounded-2xl md:overflow-hidden md:shadow-2xl md:border md:border-white/10 md:h-[calc(100%-2rem)] md:w-auto md:aspect-[9/16] md:max-w-[420px] lg:my-4",
          isReelsRoute ? "lg:max-w-[520px] xl:max-w-[560px]" : "lg:max-w-[460px] xl:max-w-[500px]",
        )}>
          <motion.div
            className="reel-scroll-host w-full h-full overflow-y-scroll snap-y snap-mandatory relative"
            animate={{ y: pullDelta > 0 ? pullDelta : 0 }}
            transition={pullDelta === 0 ? { duration: 0.2, ease: "easeOut" } : { duration: 0 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Pull-to-refresh indicator */}
            {(pullDelta > 0 || isRefreshing) && (
              <motion.div
                className="pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 flex items-center justify-center"
                animate={{ y: Math.max(20, pullDelta - 30) }}
                transition={{ duration: 0.08, ease: "linear" }}
              >
                <motion.div
                  className={cn(
                    "rounded-full bg-white/15 backdrop-blur-md p-2 transition-transform",
                    isRefreshing && "animate-spin",
                  )}
                  animate={{ rotate: !isRefreshing ? pullDelta * 3 : 0 }}
                  transition={{ duration: 0.08, ease: "linear" }}
                >
                  <RefreshCw className="h-5 w-5 text-white" />
                </motion.div>
              </motion.div>
            )}

            {/* New posts pill */}
            <Suspense fallback={null}>
              <NewPostsPill count={newPostsCount} onClick={handleShowNewPosts} />
            </Suspense>

            {/* Empty state when Following tab returns no results */}
            {visiblePosts.length === 0 && feedMode === "following" && userId && (
              <div className="w-full h-full snap-start flex flex-col items-center justify-center px-8 text-center bg-black">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-white font-semibold text-lg mb-1">Your following feed is empty</p>
                <p className="text-white/60 text-sm max-w-xs">
                  Follow some creators or shops and their posts will show up here.
                </p>
                <button type="button"
                  onClick={() => setShowDiscover(true)}
                  className="mt-5 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white"
                >
                  Discover people
                </button>
              </div>
            )}

            {visiblePosts.map((post, index) => (
              <div key={post.id} className="contents">
                <div
                  ref={(el) => { cardRefs.current[index] = el; }}
                  className="w-full h-full snap-start"
                  onPointerDown={(e) => {
                    // Ignore swipes that begin on interactive descendants
                    // (action rail buttons, progress bar, follow button…).
                    // Without this the swipe gesture would steal taps.
                    const t = e.target as HTMLElement;
                    if (t.closest("button, a, [role='button'], input, textarea")) return;
                    swipeStartRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), pointerId: e.pointerId };
                  }}
                  onPointerUp={(e) => {
                    const start = swipeStartRef.current;
                    swipeStartRef.current = null;
                    if (!start || start.pointerId !== e.pointerId) return;
                    const dx = e.clientX - start.x;
                    const dy = e.clientY - start.y;
                    const dt = Date.now() - start.t;
                    // Swipe left → creator profile (TikTok pattern). Threshold:
                    // ≥80 px horizontal, ≤60 px vertical drift, and the gesture
                    // completes within 600 ms so slow scrolls don't trigger.
                    if (dt < 600 && dx <= -80 && Math.abs(dy) < 60) {
                      // Match the avatar-tap navigation in the same component
                      // (line 1477/1479) so swipe-left and avatar-tap land on
                      // the same destination for each post type.
                      if (post.source === "user" && post.author_id) {
                        navigate(`/user/${post.author_id}`);
                      } else if (post.store_slug) {
                        navigate(`/grocery/shop/${post.store_slug}`);
                      }
                    }
                  }}
                  onPointerCancel={() => { swipeStartRef.current = null; }}
                >
                  <ErrorBoundary
                    fallback={
                      <div className="w-full h-full bg-black flex items-center justify-center px-6">
                        <div className="text-center max-w-xs">
                          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/15">
                            <span className="text-2xl">⚠️</span>
                          </div>
                          <p className="text-white font-semibold mb-1">This reel couldn't load</p>
                          <p className="text-white/60 text-sm mb-4">Something went wrong rendering this reel. Swipe to keep watching.</p>
                          <button
                            type="button"
                            onClick={() => {
                              cardRefs.current[index + 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className="px-4 py-2 rounded-full bg-white text-black text-sm font-bold active:scale-95"
                          >
                            Skip to next
                          </button>
                        </div>
                      </div>
                    }
                  >
                    <MemoReelCard
                      post={post}
                      isActive={activeIndex === index}
                      shouldPreload={index === activeIndex + 1 || index === activeIndex - 1}
                      initialSaved={savedPostIds.has(post.id) || savedPostIds.has(getFeedPostBookmarkKey(post))}
                      initialIsFollowing={post.author_id ? followingIds.has(post.author_id) : false}
                      initialAuthorIsLive={post.author_id ? liveAuthorIds.has(post.author_id) : false}
                    globalMuted={globalMuted}
                    onToggleMute={() => setGlobalMuted((m) => !m)}
                    onNavigate={(slug) => slug.startsWith("__user__") ? navigate(`/user/${slug.replace("__user__", "")}`) : navigate(`/grocery/shop/${slug}`)}
                    userId={userId}
                    userLikedPostIds={userLikedPostIds}
                    onToggleLike={handleToggleLike}
                    onOpenComments={setCommentTarget}
                    onOpenShare={(id) => setSharePostId(id)}
                    onOpenSound={(name) => setSoundOverlayName(name)}
                    onStartDuet={startReelDuet}
                    onStartStitch={startReelStitch}
                    onShareToStory={shareReelToStory}
                    onGiftCreator={giftReelCreator}
                    currentReaction={(() => {
                      const rawId = post.id.startsWith("u-") ? post.id.slice(2) : post.id;
                      return reactions.reactionFor(rawId, post.source ?? "store");
                    })()}
                    onSetReaction={(emoji) => {
                      const rawId = post.id.startsWith("u-") ? post.id.slice(2) : post.id;
                      void reactions.setReaction(rawId, post.source ?? "store", emoji);
                    }}
                    onOpenRepost={() => {
                      const rawId = post.id.startsWith("u-") ? post.id.slice(2) : post.id;
                      setRepostTarget({
                        postId: rawId,
                        source: post.source ?? "store",
                        authorName: post.author_name ?? post.store_name,
                        preview: post.caption,
                      });
                    }}
                    isReposted={(() => {
                      const rawId = post.id.startsWith("u-") ? post.id.slice(2) : post.id;
                      return reposts.isReposted(rawId, post.source ?? "store");
                    })()}
                    onAutoSkip={() => {
                      // Snap to the next reel; if we're at the end, fall
                      // back to the InfiniteScrollSentinel which loads more.
                      const next = index + 1;
                      requestAnimationFrame(() => {
                        cardRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            ))}

            {/* Infinite-scroll sentinel: when the user reaches the last card,
                bump the page multiplier so the next refetch loads more.
                Also serves as the polished "you're all caught up" end-of-feed
                screen with refresh / back-to-top / mode-switch actions. */}
            {visiblePosts.length > 0 && (
              <InfiniteScrollSentinel
                isFetching={isFetching}
                onReachEnd={() => setPageMultiplier((m) => m + 1)}
                totalCount={visiblePosts.length}
                onRefresh={() => {
                  void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
                  requestAnimationFrame(() => cardRefs.current[0]?.scrollIntoView({ block: "start" }));
                }}
                onBackToTop={() => {
                  cardRefs.current[0]?.scrollIntoView({ block: "start", behavior: "smooth" });
                }}
                onSwitchMode={userId ? () => {
                  setFeedMode((m) => (m === "foryou" ? "following" : "foryou"));
                  requestAnimationFrame(() => cardRefs.current[0]?.scrollIntoView({ block: "start" }));
                } : undefined}
                feedMode={feedMode === "trending" ? "foryou" : feedMode}
              />
            )}
          </motion.div>
        </div>

        {/* Desktop RIGHT rail — suggested people + trending.
            Hidden on `/reels` so the TikTok-style hero can fill the viewport.
            Hotel Admin / Run QA are operator tools — never shown on the
            consumer reels page; on `/feed` they only render for lodging owners. */}
        {!isReelsRoute && (
          <aside className="hidden lg:flex lg:flex-col lg:w-[300px] xl:w-[340px] shrink-0 h-full overflow-y-auto py-6 px-3 bg-background/40 backdrop-blur-sm border-l border-border/20 rounded-l-2xl gap-4">
            {ownerStore?.isLodging && lodgingCompletion && (
              <div className="rounded-xl border border-primary/30 bg-card/70 p-3">
                <div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-foreground">Hotel / Resort Admin</h3><p className="mt-0.5 text-xs text-muted-foreground truncate">{ownerStore.name}</p></div><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{lodgingCompletion.percent}%</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${lodgingCompletion.percent}%` }} transition={{ duration: 0.25, ease: "easeOut" }} /></div>
                <p className="mt-2 text-[11px] text-muted-foreground">Next: {lodgingCompletion.nextBestAction.actionLabel}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><button type="button" onClick={() => navigate(`/admin/stores/${ownerStore.id}?tab=lodge-overview`)} className="rounded-lg bg-primary px-2 py-2 font-semibold text-primary-foreground">Open Hotel Admin</button><button type="button" onClick={() => navigate("/admin/lodging/qa-checklist")} className="rounded-lg bg-muted px-2 py-2 font-semibold text-foreground">Run QA</button><button type="button" onClick={() => navigate("/admin/lodging/qa-checklist")} className="col-span-2 rounded-lg bg-muted px-2 py-2 font-semibold text-foreground">View QA Report</button></div>
              </div>
            )}
            <div className="px-1">
              <h3 className="text-sm font-semibold text-foreground mb-2">Suggested for you</h3>
              <Suspense fallback={<div className="h-40" />}>
                <SuggestedUsersCarousel variant="inline" />
              </Suspense>
            </div>
            <div className="mt-2 rounded-xl border border-border/30 bg-card/40 p-3">
              <h3 className="text-sm font-semibold text-foreground mb-2">Quick links</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button type="button" onClick={() => navigate("/flights")} className="px-2 py-2 rounded-lg bg-muted/40 hover:bg-muted text-foreground text-left flex items-center gap-2"><Plane className="w-4 h-4 text-primary shrink-0" /> Flights</button>
                <button type="button" onClick={() => navigate("/hotels")} className="px-2 py-2 rounded-lg bg-muted/40 hover:bg-muted text-foreground text-left flex items-center gap-2"><Building2 className="w-4 h-4 text-primary shrink-0" /> Hotels</button>
                <button type="button" onClick={() => navigate("/eats")} className="px-2 py-2 rounded-lg bg-muted/40 hover:bg-muted text-foreground text-left flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-primary shrink-0" /> Eats</button>
                <button type="button" onClick={() => navigate("/rides/hub")} className="px-2 py-2 rounded-lg bg-muted/40 hover:bg-muted text-foreground text-left flex items-center gap-2"><Car className="w-4 h-4 text-primary shrink-0" /> Rides</button>
                <button type="button" onClick={() => navigate("/jobs")} className="px-2 py-2 rounded-lg bg-muted/40 hover:bg-muted text-foreground text-left flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary shrink-0" /> Jobs</button>
                <button type="button" onClick={() => navigate("/shop")} className="px-2 py-2 rounded-lg bg-muted/40 hover:bg-muted text-foreground text-left flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary shrink-0" /> Shop</button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-auto px-1 pt-4">© ZIVO LLC · hizivo.com</p>
          </aside>
        )}

        {/* Desktop up/down navigation buttons */}
        <div className="hidden md:flex flex-col gap-3 absolute right-8 top-1/2 -translate-y-1/2 z-50">
          <button type="button"
            onClick={() => {
              if (activeIndex > 0) {
                cardRefs.current[activeIndex - 1]?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            disabled={activeIndex === 0}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous reel"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <button type="button"
            onClick={() => {
              if (activeIndex < visiblePosts.length - 1) {
                cardRefs.current[activeIndex + 1]?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            disabled={activeIndex >= visiblePosts.length - 1}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next reel"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Comment sheet */}
      {commentTarget && (
        <Suspense fallback={null}>
          <CanonicalCommentsSheet
            open={!!commentTarget}
            postId={getFeedPostRawId(commentTarget.postId)}
            postSource={commentTarget.source}
            currentUserId={userId}
            commentsCount={commentTarget.initialCount}
            dark
            onClose={() => {
              setCommentTarget(null);
              void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
            }}
            onCommentsCountChange={(count) => {
              updatePostEngagementCount(commentTarget.postId, commentTarget.source, "comments_count", count);
            }}
          />
        </Suspense>
      )}

      {/* 3-dot post actions menu (save / mute / block / report / why) */}
      <Suspense fallback={null}>
        {actionsTarget && (
          <PostActionsMenu
            open={!!actionsTarget}
            onClose={() => setActionsTarget(null)}
            target={actionsTarget.target}
            authorName={actionsTarget.authorName}
            shareUrl={actionsTarget.shareUrl}
            isBookmarked={postActions.isBookmarked(actionsTarget.target)}
            onToggleBookmark={() => postActions.toggleBookmark(actionsTarget.target)}
            onMute={() => {
              if (actionsTarget.target.authorId) {
                setHiddenAuthorIds((prev) => new Set(prev).add(actionsTarget.target.authorId!));
              }
              postActions.muteAuthor(actionsTarget.target);
            }}
            onBlock={() => {
              if (actionsTarget.target.authorId) {
                setHiddenAuthorIds((prev) => new Set(prev).add(actionsTarget.target.authorId!));
              }
              postActions.blockAuthor(actionsTarget.target);
            }}
            onReport={(reason) => {
              void postActions.reportPost(actionsTarget.target, reason);
              if (isSensitiveReportReason(reason)) {
                const feedId = actionsTarget.target.source === "user"
                  ? `u-${actionsTarget.target.postId}`
                  : actionsTarget.target.postId;
                hiddenPosts.hide(feedId, actionsTarget.target.source);
              }
            }}
            onNotInterested={() => {
              const feedId = actionsTarget.target.source === "user"
                ? `u-${actionsTarget.target.postId}`
                : actionsTarget.target.postId;
              hiddenPosts.hide(feedId);
              toast.success("We'll show fewer like this");
            }}
            isOwnPost={!!userId && actionsTarget.target.source === "user" && actionsTarget.target.authorId === userId}
            onViewInsights={() => setInsightsTarget({ postId: actionsTarget.target.postId, source: actionsTarget.target.source })}
            onEditCaption={() => {
              // Find the prefixed feed id and the current caption
              const feedId = `u-${actionsTarget.target.postId}`;
              const post = posts.find((p) => p.id === feedId);
              setEditCaptionTarget({
                postId: actionsTarget.target.postId,
                initialCaption: post?.caption ?? "",
              });
            }}
            onDeletePost={async () => {
              if (!userId) return;
              const rawId = actionsTarget.target.postId;
              const feedId = `u-${rawId}`;
              // Optimistic remove from view
              setDeletedPostIds((prev) => new Set(prev).add(feedId));
              const { error } = await (supabase as any)
                .from("user_posts")
                .delete()
                .eq("id", rawId)
                .eq("user_id", userId);
              if (error) {
                // Roll back
                setDeletedPostIds((prev) => {
                  const next = new Set(prev);
                  next.delete(feedId);
                  return next;
                });
                toast.error("Couldn't delete post");
                return;
              }
              toast.success("Post deleted");
              queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
            }}
          />
        )}
      </Suspense>

      {/* Author-only insights drawer */}
      <Suspense fallback={null}>
        {insightsTarget && (
          <PostInsights
            open={!!insightsTarget}
            onClose={() => setInsightsTarget(null)}
            postId={insightsTarget.postId}
            source={insightsTarget.source}
          />
        )}
      </Suspense>

      {/* Caption editor (own user posts only) */}
      <Suspense fallback={null}>
        {editCaptionTarget && (
          <CaptionEditDialog
            open={!!editCaptionTarget}
            onClose={() => setEditCaptionTarget(null)}
            initialCaption={editCaptionTarget.initialCaption}
            onSave={async (next) => {
              if (!userId) return;
              const { error } = await (supabase as any)
                .from("user_posts")
                .update({ caption: next })
                .eq("id", editCaptionTarget.postId)
                .eq("user_id", userId);
              if (error) {
                toast.error("Couldn't save caption");
                throw error;
              }
              toast.success("Caption updated");
              queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
            }}
          />
        )}
      </Suspense>

      {/* Repost dialog */}
      <Suspense fallback={null}>
        {repostTarget && (
          <RepostDialog
            open={!!repostTarget}
            onClose={() => setRepostTarget(null)}
            authorName={repostTarget.authorName}
            postPreview={repostTarget.preview}
            alreadyReposted={reposts.isReposted(repostTarget.postId, repostTarget.source)}
            onConfirm={async (quoteText) => {
              const nowReposted = await reposts.toggleRepost(
                repostTarget.postId,
                repostTarget.source,
                quoteText,
              );
              if (nowReposted === null) {
                toast.error("Couldn't update repost. Try again.");
                throw new Error("repost_failed");
              }
              updatePostEngagementCount(
                repostTarget.postId,
                repostTarget.source,
                "reposts_count",
                (count) => count + (nowReposted ? 1 : -1),
              );
              void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
              toast.success(nowReposted ? "Reposted to your profile" : "Repost removed");
            }}
          />
        )}
      </Suspense>

      {/* Share sheet */}
      {sharePostId && (() => {
        const sharePost = posts.find((p) => p.id === sharePostId);
        return (
          <Suspense fallback={null}>
            <UnifiedShareSheet
              shareUrl={getPostShareUrl(sharePostId)}
              shareText={sharePost?.caption || "Check out this post!"}
              zIndex={9999}
              shareMediaUrl={sharePost?.media_urls?.[0]}
              shareMediaType={sharePost?.media_type === "video" ? "video" : "image"}
              sharePostId={sharePostId.startsWith("u-") ? sharePostId.slice(2) : sharePostId}
              postSource={sharePost ? getFeedPostSource(sharePost) : "store"}
              sharePostAuthorId={sharePost?.author_id}
              sharePostAuthorName={sharePost?.author_name ?? sharePost?.store_name}
              onShareRecorded={() => {
                if (!sharePost) return;
                updatePostEngagementCount(sharePost.id, getFeedPostSource(sharePost), "shares_count", (count) => count + 1);
                void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
              }}
              onClose={() => setSharePostId(null)}
            />
          </Suspense>
        );
      })()}

      {/* Report dialog (opened by `zivo-reel-report` event from a reel's overflow menu) */}
      <AnimatePresence>
        {reportPostId && (
          <ReelReportDialog
            postId={reportPostId}
            reporterId={userId}
            onClose={() => setReportPostId(null)}
            onReported={() => {
              const id = reportPostId;
              setReportPostId(null);
              if (id) {
                setDeletedPostIds((prev) => {
                  if (prev.has(id)) return prev;
                  const next = new Set(prev);
                  next.add(id);
                  return next;
                });
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Sound overlay */}
      <AnimatePresence>
        {soundOverlayName && (
          <SoundOverlay
            soundName={soundOverlayName}
            onClose={() => setSoundOverlayName(null)}
            onNavigateToReel={(postId) => {
              setSoundOverlayName(null);
              navigate(`/reels/${postId}`);
            }}
            onUseSound={() => {
              const name = soundOverlayName;
              setSoundOverlayName(null);
              openReelComposer({
                mode: "reel",
                audioName: name,
                successMessage: "Reel posted with sound!",
              });
            }}
            currentPosts={posts}
          />
        )}
      </AnimatePresence>

      {reelComposerModal}

      {/* First-visit swipe-up hint — animated chevron + label, dismisses on
          any interaction or after 3.5 s. */}
      <AnimatePresence>
        {showSwipeHint && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35 }}
            className="absolute left-1/2 -translate-x-1/2 z-[55] pointer-events-none flex flex-col items-center gap-2"
            style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 140px)" }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg"
            >
              <ChevronUp className="w-7 h-7 text-white" strokeWidth={2.5} />
            </motion.div>
            <span className="text-white text-xs font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              Swipe up for more
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts help overlay — desktop power-user feature.
          Triggered by `?` key, dismissed by `?` toggle, Escape, or click. */}
      <AnimatePresence>
        {showShortcutsHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShortcutsHelp(false)}
            className="fixed inset-0 z-[1500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
            role="dialog"
            aria-label="Keyboard shortcuts"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-background border border-border/30 shadow-2xl p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-base font-bold text-foreground">Keyboard shortcuts</h2>
                <button
                  type="button"
                  onClick={() => setShowShortcutsHelp(false)}
                  aria-label="Close"
                  className="text-muted-foreground hover:text-foreground -m-1 p-1"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  { keys: ["Space", "K"], action: "Play / pause" },
                  { keys: ["M"], action: "Toggle mute" },
                  { keys: ["L"], action: "Like / unlike" },
                  { keys: ["↓", "J"], action: "Next reel" },
                  { keys: ["↑"], action: "Previous reel" },
                  { keys: ["?"], action: "Toggle this help" },
                  { keys: ["Esc"], action: "Close overlays" },
                ].map((row) => (
                  <div key={row.action} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/20 last:border-b-0">
                    <span className="text-muted-foreground">{row.action}</span>
                    <div className="flex items-center gap-1.5">
                      {row.keys.map((k, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-muted border border-border/40 text-xs font-mono font-semibold text-foreground"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground/70">
                Press <span className="font-mono font-semibold">?</span> at any time to reopen this list.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* a11y live region — announces the active reel to screen readers
          without disrupting sighted users. polite tone so it queues with
          other announcements rather than interrupting. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {visiblePosts[activeIndex] && (
          <>
            Reel by {visiblePosts[activeIndex].source === "user"
              ? visiblePosts[activeIndex].author_name
              : visiblePosts[activeIndex].store_name}
            {visiblePosts[activeIndex].caption ? `: ${visiblePosts[activeIndex].caption.slice(0, 120)}` : ""}
          </>
        )}
      </div>

      {/* Bottom navigation overlaid on top — shown on both /feed and /reels so users always have a way back to other tabs. */}
      <ZivoMobileNav />
    </div>
    </MotionConfig>
  );
}
