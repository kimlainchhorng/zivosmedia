/**
 * ReelsFeedPage — Instagram / Facebook style social feed
 * Full-width cards with author info, media, captions, and engagement
 * Everyone can post photos/videos that show up here
 */
import { lazy, Suspense, useState, useRef, useCallback, useEffect, memo, useMemo, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSupabaseMediaUrl } from "@/utils/normalizeSupabaseMediaUrl";
import { withSupabaseAbortSignal } from "@/utils/withSupabaseAbortSignal";
import SEOHead from "@/components/SEOHead";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Heart from "lucide-react/dist/esm/icons/heart";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Eye from "lucide-react/dist/esm/icons/eye";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Play from "lucide-react/dist/esm/icons/play";
import Volume2 from "lucide-react/dist/esm/icons/volume-2";
import VolumeX from "lucide-react/dist/esm/icons/volume-x";
import Plus from "lucide-react/dist/esm/icons/plus";
import Camera from "lucide-react/dist/esm/icons/camera";
import XIcon from "lucide-react/dist/esm/icons/x";
import Send from "lucide-react/dist/esm/icons/send";
import Film from "lucide-react/dist/esm/icons/film";
import Radio from "lucide-react/dist/esm/icons/radio";
import Globe from "lucide-react/dist/esm/icons/globe";
import Users from "lucide-react/dist/esm/icons/users";
import Lock from "lucide-react/dist/esm/icons/lock";
import FolderPlus from "lucide-react/dist/esm/icons/folder-plus";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Hash from "lucide-react/dist/esm/icons/hash";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Flag from "lucide-react/dist/esm/icons/flag";
import Bell from "lucide-react/dist/esm/icons/bell";
import Menu from "lucide-react/dist/esm/icons/menu";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import UserX from "lucide-react/dist/esm/icons/user-x";
import Ban from "lucide-react/dist/esm/icons/ban";
import Skull from "lucide-react/dist/esm/icons/skull";
import HelpCircle from "lucide-react/dist/esm/icons/help-circle";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import MessageSquareOff from "lucide-react/dist/esm/icons/message-square-off";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Gift from "lucide-react/dist/esm/icons/gift";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Settings2 from "lucide-react/dist/esm/icons/settings-2";
import Search from "lucide-react/dist/esm/icons/search";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import History from "lucide-react/dist/esm/icons/history";
import Code2 from "lucide-react/dist/esm/icons/code-2";
import Pin from "lucide-react/dist/esm/icons/pin";
import Dumbbell from "lucide-react/dist/esm/icons/dumbbell";
import Monitor from "lucide-react/dist/esm/icons/monitor";
import Languages from "lucide-react/dist/esm/icons/languages";
import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import Zap from "lucide-react/dist/esm/icons/zap";
import QrCode from "lucide-react/dist/esm/icons/qr-code";
import Download from "lucide-react/dist/esm/icons/download";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import Mic2 from "lucide-react/dist/esm/icons/mic-2";
import Tv2 from "lucide-react/dist/esm/icons/tv-2";
import HandHeart from "lucide-react/dist/esm/icons/hand-heart";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Crown from "lucide-react/dist/esm/icons/crown";
import Package from "lucide-react/dist/esm/icons/package";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getPostShareUrl } from "@/lib/getPublicOrigin";
import { copyText } from "@/lib/native/clipboard";
import { shareContent } from "@/lib/native/share";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { useHiddenPosts, type FeedPreferenceSource } from "@/hooks/useHiddenPosts";
import { useSensitiveMediaPreference } from "@/hooks/useSensitiveMediaPreference";
import { useHaptic } from "@/hooks/useHaptic";
import { useNotifications } from "@/hooks/useNotifications";
import { useChatPrefs } from "@/hooks/useChatPrefs";
import { useAuth } from "@/contexts/AuthContext";
import RelativeTime from "@/components/social/RelativeTime";
import { topicForUserSync } from "@/lib/security/channelName";
import TrendingHashtags, { postHasHashtag } from "@/components/social/TrendingHashtags";
import CollapsibleCaption from "@/components/social/CollapsibleCaption";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { formatCount, commentsLinkLabel } from "@/lib/social/formatCount";
import { shouldSendLikeNotification } from "@/lib/social/likeNotificationGuard";
import { EngagementSkeleton } from "@/components/social/EngagementSkeleton";
import SwipeableSheet from "@/components/social/SwipeableSheet";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { useSwipeDownClose } from "@/components/social/useSwipeDownClose";
import { SwipeGrabHandle } from "@/components/social/SwipeGrabHandle";
import { perfLog, perfMeasure, perfNow } from "@/lib/perfTrace";
import { reportFeedQueryError } from "@/lib/feedQueryTelemetry";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import LoadFailureCard from "@/components/reliability/LoadFailureCard";
import SensitiveMediaGate from "@/components/social/SensitiveMediaGate";
import { detectSensitiveContent, isSensitiveReportReason, isSensitiveSchemaDriftError } from "@/lib/social/sensitiveContent";

const INITIAL_REELS_PAGE_SIZE = 18;
const REELS_PAGE_INCREMENT = 12;
const REELS_PAGE_MAX = 180;
const REEL_CLOSE_SWIPE_THRESHOLD = 92;
const REEL_CLOSE_SWIPE_MAX_OFFSET = 180;
let reelsFirstMediaMetadataLogged = false;
const REELS_USER_POSTS_SELECT =
  "id, media_url, media_urls, media_type, caption, likes_count, comments_count, shares_count, views_count, created_at, user_id, shared_from_post_id, shared_from_user_id, location, is_pinned, comments_enabled, sharing_enabled, is_sensitive, sensitive_reason";
const REELS_USER_POSTS_SELECT_FALLBACK =
  "id, media_url, media_urls, media_type, caption, likes_count, comments_count, shares_count, views_count, created_at, user_id, shared_from_post_id, shared_from_user_id, location, is_pinned, comments_enabled, sharing_enabled";

// ── Lazy components ──────────────────────────────────────────────────────────
// All lazy() calls are grouped AFTER imports. Interleaving them with imports
// can cause "Cannot access 'lazy' before initialization" TDZ errors under
// Vite + react-refresh dev-mode transforms.
const UnifiedShareSheet = lazy(() => import("@/components/shared/ShareSheet"));
const ZivoMobileNav = lazy(() => import("@/components/app/ZivoMobileNav"));
const NavBar = lazy(() => import("@/components/home/NavBar"));
const TipSheet = lazy(() => import("@/components/social/TipSheet"));
const AlertDialog = lazy(() => import("@/components/ui/alert-dialog").then(m => ({ default: m.AlertDialog })));
const AlertDialogAction = lazy(() => import("@/components/ui/alert-dialog").then(m => ({ default: m.AlertDialogAction })));
const AlertDialogCancel = lazy(() => import("@/components/ui/alert-dialog").then(m => ({ default: m.AlertDialogCancel })));
const AlertDialogContent = lazy(() => import("@/components/ui/alert-dialog").then(m => ({ default: m.AlertDialogContent })));
const AlertDialogDescription = lazy(() => import("@/components/ui/alert-dialog").then(m => ({ default: m.AlertDialogDescription })));
const AlertDialogFooter = lazy(() => import("@/components/ui/alert-dialog").then(m => ({ default: m.AlertDialogFooter })));
const AlertDialogHeader = lazy(() => import("@/components/ui/alert-dialog").then(m => ({ default: m.AlertDialogHeader })));
const AlertDialogTitle = lazy(() => import("@/components/ui/alert-dialog").then(m => ({ default: m.AlertDialogTitle })));
const NewPostsPill = lazy(() => import("@/components/social/NewPostsPill"));
const FeedGreeting = lazy(() => import("@/components/social/FeedGreeting"));
const ReelsPreviewRow = lazy(() => import("@/components/social/ReelsPreviewRow"));
const FeaturedCreatorsRow = lazy(() => import("@/components/social/FeaturedCreatorsRow"));
const FollowSuggestions = lazy(() => import("@/components/social/FollowSuggestions"));
const LiveNowStrip = lazy(() => import("@/components/social/LiveNowStrip"));
const FriendActivity = lazy(() => import("@/components/social/FriendActivity"));
const TrendingCreators = lazy(() => import("@/components/social/TrendingCreators"));
const SavedPostsLink = lazy(() => import("@/components/social/SavedPostsLink"));
const ProfileCompletionNudge = lazy(() => import("@/components/social/ProfileCompletionNudge"));
const FloatingProductCard = lazy(() => import("@/components/reels/FloatingProductCard"));
const CommentsSheet = lazy(() => import("@/components/social/CommentsSheet"));
const FeedStoryRing = lazy(() => import("@/components/social/FeedStoryRing"));
const OnThisDay = lazy(() => import("@/components/social/OnThisDay"));
const ScrollToTopFab = lazy(() => import("@/components/social/ScrollToTopFab"));
const SuggestedUsersCarousel = lazy(() => import("@/components/social/SuggestedUsersCarousel"));
const CreatePostModal = lazy(() => import("@/components/social/CreatePostModal"));
const PollPostCard = lazy(() => import("@/components/social/PollPostCard"));
const SafeCaption = lazy(() => import("@/components/social/SafeCaption"));
const FeedSidebar = lazy(() => import("@/components/social/FeedSidebar"));
const CommentPreview = lazy(() => import("@/components/social/CommentPreview"));

type FeedSuperAppTarget = {
  label: string;
  description: string;
  href: string;
  icon: typeof Search;
  tone: string;
  keywords: string[];
};

const FEED_SUPER_APP_TARGETS: FeedSuperAppTarget[] = [
  {
    label: "Social",
    description: "Facebook-style feed",
    href: "/feed",
    icon: MessageCircle,
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    keywords: ["facebook", "social", "post", "friends", "feed"],
  },
  {
    label: "Reels",
    description: "TikTok-style videos",
    href: "/reels",
    icon: Film,
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    keywords: ["tiktok", "reels", "video", "shorts"],
  },
  {
    label: "Chat",
    description: "Telegram-style messages",
    href: "/chat",
    icon: Send,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    keywords: ["telegram", "chat", "message", "dm", "group"],
  },
  {
    label: "Meet",
    description: "Video calls and rooms",
    href: "/chat/contacts",
    icon: Tv2,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    keywords: ["meet", "google meet", "video call", "call", "room"],
  },
  {
    label: "Rides",
    description: "Uber-style rides",
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
    description: "Booking-style stays",
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
    description: "Packages and courier",
    href: "/delivery",
    icon: Package,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    keywords: ["delivery", "package", "courier", "send"],
  },
  {
    label: "Creators",
    description: "Subscriptions and fans",
    href: "/creator-dashboard",
    icon: Briefcase,
    tone: "bg-pink-500/10 text-pink-600 dark:text-pink-300",
    keywords: ["onlyfans", "creator", "subscription", "fans", "tips"],
  },
  {
    label: "Shop",
    description: "Marketplace",
    href: "/marketplace",
    icon: ShoppingBag,
    tone: "bg-lime-500/10 text-lime-700 dark:text-lime-300",
    keywords: ["shop", "marketplace", "store", "buy", "sell"],
  },
  {
    label: "Services",
    description: "All ZIVO apps",
    href: "/services",
    icon: Sparkles,
    tone: "bg-foreground/10 text-foreground",
    keywords: ["all", "services", "apps", "more", "everything"],
  },
];

const trackInitiateCheckout = (input: Record<string, unknown>) =>
  import("@/services/metaConversion").then((m) => m.trackInitiateCheckout(input as any));

/**
 * Fullscreen post-detail overlay with swipe-down-to-close.
 * The render-prop child receives `startDrag` so the consumer can
 * attach it to a header / grab zone via onPointerDown. Scrollable
 * content beneath keeps native pan-y because dragListener is false.
 */
function PostDetailOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: (startDrag: (e: React.PointerEvent) => void) => React.ReactNode;
}) {
  const { motionProps, startDrag } = useSwipeDownClose(onClose);

  // Body scroll lock + Esc to close while overlay is mounted.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      {/* Solid backdrop — guarantees NavBar / sidebars are fully covered.
          z-[1500] sits above NavBar (z-50/1200) and the chat hub (z-[1401]). */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 z-[1490] bg-background lg:bg-black/85 lg:backdrop-blur-md"
        aria-hidden="true"
      />
      {/* Always-visible close button (desktop). Lives outside the draggable
          card so it's never clipped or hidden behind a header. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close post"
        title="Close post"
        className="hidden lg:flex fixed top-4 right-4 z-[1510] h-11 w-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-xl ring-1 ring-border/50 backdrop-blur-md hover:bg-background transition-colors"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        {...motionProps}
        className="fixed inset-0 z-[1500] flex flex-col overflow-hidden bg-background lg:bg-transparent lg:items-center lg:justify-center lg:p-6 pointer-events-none"
      >
        <div className="relative flex flex-col w-full h-full lg:h-auto lg:max-h-[calc(100vh-3rem)] lg:w-auto lg:max-w-[min(440px,calc((100vh-3rem)*9/16))] lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl lg:bg-background pointer-events-auto">
          {children(startDrag)}
        </div>
      </motion.div>
    </>,
    document.body,
  );
}

interface PollPayload {
  question: string;
  options: { text: string; votes: number }[];
  poll_type: "poll" | "quiz";
  correct_option_index?: number | null;
  total_votes: number;
  expires_at?: string | null;
}

interface FeedItem {
  id: string;
  source: "store" | "user" | "poll";
  poll?: PollPayload;
  media_urls: string[];
  media_type: "image" | "video";
  caption: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  author_name: string;
  author_avatar: string | null;
  author_id?: string;
  author_is_verified?: boolean;
  store_slug?: string;
  created_at: string;
  location?: string | null;
  is_pinned?: boolean;
  is_sensitive?: boolean | null;
  sensitive_reason?: string | null;
  // Share tracking
  shared_from_post_id?: string | null;
  shared_from_user_id?: string | null;
  shared_from_user_name?: string | null;
  shared_from_user_avatar?: string | null;
  shared_from_caption?: string | null;
  shared_from_source?: "user" | "store" | null;
  shared_from_store_slug?: string | null;
  // Interaction controls from profile
  comment_control?: "everyone" | "friends" | "off";
  hide_like_counts?: boolean;
  allow_sharing?: boolean;
  allow_mentions?: boolean;
  commerce_link?: {
    link_type: "store_product" | "truck_sale";
    store_id?: string | null;
    store_product_id?: string | null;
    truck_sale_id?: string | null;
    checkout_path?: string | null;
    map_lat?: number | null;
    map_lng?: number | null;
    map_label?: string | null;
  } | null;
}

const isFeedVideoMediaUrl = (url: string) => /\.(mp4|mov|webm|avi|mkv|m4v)(\?.*)?$/i.test(url);
const normalizeUserPostMediaType = (
  mediaType: string | null | undefined,
  mediaUrls: string[] = [],
): "image" | "video" =>
  mediaType === "video" || mediaType === "reel" || mediaUrls.some(isFeedVideoMediaUrl) ? "video" : "image";
const hasNonAsciiText = (text: string): boolean =>
  Array.from(text).some((char) => (char.codePointAt(0) ?? 0) > 0x7f);

const stripFeedUserPrefix = (postId: string): string => postId.replace(/^u-/, "");
const getReelsSharePostId = (item: FeedItem): string => stripFeedUserPrefix(item.id);
const getFeedInteractionPostId = (item: FeedItem): string => item.source === "user" ? stripFeedUserPrefix(item.id) : item.id;
const getFeedLikesTable = (item: FeedItem): "post_likes" | "store_post_likes" => item.source === "user" ? "post_likes" : "store_post_likes";
const getFeedPreferenceSource = (item: FeedItem): FeedPreferenceSource | null =>
  item.source === "store" || item.source === "user" ? item.source : null;
const getFeedAuthorSnoozeKey = (source: FeedPreferenceSource, authorId: string) => `${source}:${authorId}`;

const parseFeedPreferencePostKey = (postKey: string | null): { source: FeedPreferenceSource; postId: string } | null => {
  if (!postKey) return null;
  const separator = postKey.indexOf(":");
  if (separator <= 0) return null;
  const source = postKey.slice(0, separator);
  const postId = stripFeedUserPrefix(postKey.slice(separator + 1));
  if ((source !== "store" && source !== "user") || !postId) return null;
  return { source, postId };
};

const rememberReelForReelsTab = (postId: string) => {
  try {
    sessionStorage.setItem("zivo_reel_active_id", postId);
    localStorage.setItem("zivo_reel_source", "all");
  } catch { /* ignore private-mode storage failures */ }
};

// Per-session dedup set for FeedCard view tracking — one bump per post per
// session. Lives at module scope so navigating between feed tabs without a
// full reload doesn't double-count.
const recordedFeedViews = new Set<string>();
const POST_REACTIONS_ENABLED = import.meta.env.VITE_ENABLE_POST_REACTIONS === "true";

// Best-effort wrapper around the record_post_share RPC. The RPC logs the
// share + bumps shares_count atomically; failures are swallowed so a flaky
// network never blocks the UX or breaks the share itself.
type ShareChannel = "copy_link" | "native" | "email" | "sms" | "whatsapp" | "telegram" | "facebook" | "x" | "other";
const recordShareForFeedItem = async (item: FeedItem, channel: ShareChannel): Promise<boolean> => {
  if (item.source === "poll") return false; // post_shares.source CHECK only allows store/user
  const postId = getFeedInteractionPostId(item);
  const { error } = await (supabase as any).rpc("record_post_share", {
    _post_id: postId,
    _source: item.source,
    _channel: channel,
  });
  return !error;
};

const loginWithReturnTo = (path: string) => `/login?redirect=${encodeURIComponent(path)}`;

const showGuestActionPrompt = (message: string, returnTo = "/feed") => {
  toast(message, {
    description: "Create a free ZIVO account to like, comment, save, follow, and personalize your feed.",
    action: {
      label: "Log in",
      onClick: () => {
        window.location.assign(loginWithReturnTo(returnTo));
      },
    },
  });
};

const FEED_POST_NOTIFICATIONS_EVENT = "zivo:feed-post-notifications-changed";
const FEED_SNOOZED_AUTHORS_EVENT = "zivo:feed-snoozed-authors-changed";
const FEED_SNOOZE_DAYS = 30;

const scopedFeedStorageKey = (scope: "post-notifications" | "snoozed-authors", userId: string) =>
  `zivo:feed:${scope}:v1:${userId}`;

const readFeedStringSet = (storageKey: string): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed.filter((value) => typeof value === "string")) : new Set();
  } catch {
    return new Set();
  }
};

const writeFeedStringSet = (storageKey: string, values: Set<string>, eventName: string) => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...values]));
    window.dispatchEvent(new Event(eventName));
    return true;
  } catch {
    // Local preferences should never block the feed if storage is unavailable.
    return false;
  }
};

const readFeedSnoozeMap = (userId: string | null): Record<string, number> => {
  if (!userId || typeof window === "undefined") return {};
  const storageKey = scopedFeedStorageKey("snoozed-authors", userId);
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const now = Date.now();
    const active = Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([authorId, until]) => typeof authorId === "string" && typeof until === "number" && until > now,
      ),
    ) as Record<string, number>;

    if (Object.keys(active).length !== Object.keys(parsed as Record<string, unknown>).length) {
      window.localStorage.setItem(storageKey, JSON.stringify(active));
    }
    return active;
  } catch {
    return {};
  }
};

const snoozeFeedAuthor = async (
  userId: string,
  authorId: string,
  authorSource: FeedPreferenceSource,
  days = FEED_SNOOZE_DAYS,
) => {
  if (typeof window === "undefined") return false;
  try {
    const storageKey = scopedFeedStorageKey("snoozed-authors", userId);
    const current = readFeedSnoozeMap(userId);
    const snoozedUntilMs = Date.now() + days * 24 * 60 * 60 * 1000;
    current[getFeedAuthorSnoozeKey(authorSource, authorId)] = snoozedUntilMs;
    window.localStorage.setItem(storageKey, JSON.stringify(current));
    window.dispatchEvent(new Event(FEED_SNOOZED_AUTHORS_EVENT));
    await (supabase as any)
      .from("feed_snoozed_authors")
      .upsert(
        {
          user_id: userId,
          author_id: authorId,
          author_source: authorSource,
          snoozed_until: new Date(snoozedUntilMs).toISOString(),
        },
        { onConflict: "user_id,author_id,author_source" },
      );
    return true;
  } catch {
    return false;
  }
};

function useFeedSnoozedAuthorIds(userId: string | null): Set<string> {
  const [snoozed, setSnoozed] = useState<Record<string, number>>(() => readFeedSnoozeMap(userId));

  useEffect(() => {
    let alive = true;
    const sync = () => setSnoozed(readFeedSnoozeMap(userId));
    const syncRemote = async () => {
      const local = readFeedSnoozeMap(userId);
      if (!userId) {
        if (alive) setSnoozed(local);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("feed_snoozed_authors")
        .select("author_id, author_source, snoozed_until")
        .eq("user_id", userId)
        .gt("snoozed_until", new Date().toISOString());

      if (error) {
        if (alive) setSnoozed(local);
        return;
      }

      const merged = { ...local };
      (data ?? []).forEach((row: { author_id: string; author_source: FeedPreferenceSource; snoozed_until: string }) => {
        if (!row?.author_id || (row.author_source !== "store" && row.author_source !== "user")) return;
        const until = Date.parse(row.snoozed_until);
        if (Number.isFinite(until) && until > Date.now()) {
          merged[getFeedAuthorSnoozeKey(row.author_source, row.author_id)] = until;
        }
      });

      try {
        window.localStorage.setItem(scopedFeedStorageKey("snoozed-authors", userId), JSON.stringify(merged));
      } catch {
        // Non-fatal; the remote value still drives this render.
      }
      if (alive) setSnoozed(merged);
    };
    sync();
    void syncRemote();
    window.addEventListener(FEED_SNOOZED_AUTHORS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      alive = false;
      window.removeEventListener(FEED_SNOOZED_AUTHORS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);

  return useMemo(() => new Set(Object.keys(snoozed)), [snoozed]);
}

function useFeedPostNotificationState(userId: string | null, postKey: string | null) {
  const read = useCallback(() => {
    if (!userId || !postKey) return false;
    return readFeedStringSet(scopedFeedStorageKey("post-notifications", userId)).has(postKey);
  }, [postKey, userId]);

  const [enabled, setEnabled] = useState(read);

  useEffect(() => {
    const sync = () => setEnabled(read());
    const syncRemote = async () => {
      const parsed = parseFeedPreferencePostKey(postKey);
      if (!userId || !postKey || !parsed) {
        setEnabled(false);
        return;
      }

      const localEnabled = read();
      const { data, error } = await (supabase as any)
        .from("feed_post_notification_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", parsed.postId)
        .eq("post_source", parsed.source)
        .maybeSingle();

      if (error) {
        setEnabled(localEnabled);
        return;
      }

      if (data) {
        const storageKey = scopedFeedStorageKey("post-notifications", userId);
        const next = readFeedStringSet(storageKey);
        next.add(postKey);
        writeFeedStringSet(storageKey, next, FEED_POST_NOTIFICATIONS_EVENT);
        setEnabled(true);
        return;
      }

      if (localEnabled) {
        await (supabase as any)
          .from("feed_post_notification_subscriptions")
          .upsert(
            {
              user_id: userId,
              post_id: parsed.postId,
              post_source: parsed.source,
            },
            { onConflict: "user_id,post_id,post_source", ignoreDuplicates: true },
          );
      }
      setEnabled(localEnabled);
    };
    sync();
    void syncRemote();
    window.addEventListener(FEED_POST_NOTIFICATIONS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FEED_POST_NOTIFICATIONS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [postKey, read, userId]);

  const setPersisted = useCallback(async (nextEnabled: boolean) => {
    const parsed = parseFeedPreferencePostKey(postKey);
    if (!userId || !postKey || !parsed) return false;
    const storageKey = scopedFeedStorageKey("post-notifications", userId);
    const next = readFeedStringSet(storageKey);
    if (nextEnabled) next.add(postKey);
    else next.delete(postKey);
    const savedLocal = writeFeedStringSet(storageKey, next, FEED_POST_NOTIFICATIONS_EVENT);
    setEnabled(nextEnabled);
    if (!savedLocal) return false;

    if (nextEnabled) {
      await (supabase as any)
        .from("feed_post_notification_subscriptions")
        .upsert(
          {
            user_id: userId,
            post_id: parsed.postId,
            post_source: parsed.source,
          },
          { onConflict: "user_id,post_id,post_source", ignoreDuplicates: true },
        );
    } else {
      await (supabase as any)
        .from("feed_post_notification_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", parsed.postId)
        .eq("post_source", parsed.source);
    }
    return true;
  }, [postKey, userId]);

  return [enabled, setPersisted] as const;
}

function GuestFeedCta({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <div className="mx-3 my-2 rounded-2xl border border-primary/15 bg-card px-3 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Join ZIVO to make this feed yours</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
            Log in to like, comment, save posts, and follow creators.
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onLogin}
            className="h-8 rounded-full border border-border bg-background px-3 text-[12px] font-semibold text-foreground active:scale-95"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={onSignup}
            className="h-8 rounded-full bg-ig-gradient px-3 text-[12px] font-bold text-white active:scale-95 shadow-sm hover:opacity-90 transition-opacity"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReelsFeedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"photo" | "reel" | "poll" | "story" | "shop" | "live" | undefined>(undefined);
  const [shareForPost, setShareForPost] = useState<{ shareUrl: string; shareText: string; shareMediaUrl?: string; shareMediaType?: "image" | "video"; sharePostId?: string; sharePostAuthorId?: string; sharePostAuthorName?: string } | null>(null);
  const [commerceDraft, setCommerceDraft] = useState<{
    linkType: "store_product" | "truck_sale";
    storeId?: string;
    storeProductId?: string;
    truckSaleId?: string;
    checkoutPath?: string;
    mapLat?: number;
    mapLng?: number;
    mapLabel?: string;
  } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const hiddenPosts = useHiddenPosts(userId);
  const snoozedAuthorIds = useFeedSnoozedAuthorIds(userId);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string | null } | null>(null);
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { unreadCount: notificationUnread } = useNotifications(20);
  const { prefs: chatPrefs } = useChatPrefs(userId ?? undefined);
  const { data: unreadChatSenders } = useQuery({
    queryKey: ["feed-header-chat-unread", userId],
    queryFn: async ({ signal }) => {
      const { data } = await withSupabaseAbortSignal(supabase
        .from("direct_messages")
        .select("sender_id")
        .eq("receiver_id", userId!)
        .eq("is_read", false), signal);
      return new Set((data ?? []).map((r: { sender_id: string }) => r.sender_id));
    },
    enabled: !!userId,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  const headerChatUnread = (() => {
    const real = unreadChatSenders ?? new Set<string>();
    let manualOnly = 0;
    for (const id of Object.keys(chatPrefs.unread)) {
      if (!real.has(id)) manualOnly++;
    }
    return real.size + manualOnly;
  })();

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const isEditable = (target: EventTarget | null) =>
      target instanceof HTMLElement && Boolean(target.closest("input, textarea, [contenteditable='true']"));
    const clearSelection = () => {
      const selection = window.getSelection?.();
      if (selection && !selection.isCollapsed) selection.removeAllRanges();
    };
    const preventNativeSelection = (event: Event) => {
      if (isEditable(event.target)) return;
      event.preventDefault();
      clearSelection();
    };

    document.body.classList.add("zivo-reels-active");
    document.addEventListener("selectstart", preventNativeSelection, true);
    document.addEventListener("contextmenu", preventNativeSelection, true);
    document.addEventListener("selectionchange", clearSelection, true);

    return () => {
      document.body.classList.remove("zivo-reels-active");
      document.removeEventListener("selectstart", preventNativeSelection, true);
      document.removeEventListener("contextmenu", preventNativeSelection, true);
      document.removeEventListener("selectionchange", clearSelection, true);
    };
  }, []);

  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [reelsStartIndex, setReelsStartIndex] = useState<number | null>(null);
  const reelsScrollRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [storeSearchResults, setStoreSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [feedTab, setFeedTab] = useState<"For You" | "Friends" | "Following">(() => {
    try {
      const v = localStorage.getItem("zivo:feed-tab-v1");
      if (v === "For You" || v === "Friends" || v === "Following") return v;
    } catch { /* ignore */ }
    return "For You";
  });
  useEffect(() => {
    try { localStorage.setItem("zivo:feed-tab-v1", feedTab); } catch { /* ignore */ }
  }, [feedTab]);
  // Scroll to top when the user actually switches tabs or hashtag scope — skip the
  // initial mount so a remembered tab from localStorage doesn't yank the page.
  const tabMountedRef = useRef(false);
  useEffect(() => {
    if (!tabMountedRef.current) {
      tabMountedRef.current = true;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [feedTab, selectedHashtag]);
  const [sidebarContacts, setSidebarContacts] = useState<Array<{ id: string; name: string; avatar: string | null }>>([]);
  const [trendingTags, setTrendingTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const PAGE_INCREMENT = REELS_PAGE_INCREMENT;
  const PAGE_MAX = REELS_PAGE_MAX;
  const [pageSize, setPageSize] = useState(INITIAL_REELS_PAGE_SIZE);
  const [sidebarDataReady, setSidebarDataReady] = useState(false);
  // Defensive: if the user is stuck on a Friends/Following tab but their social
  // graph is empty (new account, never followed anyone), the feed looks broken.
  const socialGraphLoadedRef = useRef(false);
  useEffect(() => {
    if (!sidebarDataReady) return;
    if (socialGraphLoadedRef.current) return;
    socialGraphLoadedRef.current = true;
    if ((feedTab === "Friends" || feedTab === "Following") && friendIds.size === 0 && followingIds.size === 0) {
      setFeedTab("For You");
    }
  }, [feedTab, friendIds, followingIds, sidebarDataReady]);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const feedPageTopRef = useRef<HTMLDivElement>(null);
  const feedTopRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const isFeedRoute = location.pathname.startsWith("/feed");
  const closeReelsViewer = useCallback(() => {
    setReelsStartIndex(null);

    const params = new URLSearchParams(location.search);
    if (!params.has("post")) return;

    params.delete("post");
    params.delete("src");
    params.delete("comments");
    navigate(
      {
        pathname: location.pathname,
        search: params.toString(),
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);
  const reliabilityTrackingContext = isFeedRoute ? "feed" : "reels";
  const feedSuperAppResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FEED_SUPER_APP_TARGETS;
    return FEED_SUPER_APP_TARGETS.filter((target) =>
      [target.label, target.description, ...target.keywords].some((value) => {
        const normalizedValue = value.toLowerCase();
        return normalizedValue.includes(q) || q.includes(normalizedValue);
      }),
    );
  }, [searchQuery]);
  const clearFeedSearch = useCallback(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    setSearchQuery("");
    setSearchResults([]);
    setStoreSearchResults([]);
    setSearchLoading(false);
  }, []);
  const closeFeedSearch = useCallback(() => {
    clearFeedSearch();
    setShowSearch(false);
  }, [clearFeedSearch]);
  const openFeedSuperAppTarget = useCallback((href: string) => {
    closeFeedSearch();
    navigate(href);
  }, [closeFeedSearch, navigate]);

  const goLogin = useCallback((returnTo = "/feed") => {
    navigate(loginWithReturnTo(returnTo));
  }, [navigate]);

  const goSignup = useCallback(() => {
    navigate("/signup");
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("search") === "1") {
      setShowSearch(true);
      params.delete("search");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const compose = params.get("compose");
    if (!compose || !authReady) return;

    const clearComposeParam = () => {
      params.delete("compose");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    };

    if (!userId) {
      goLogin(`/feed?compose=${encodeURIComponent(compose)}`);
      return;
    }

    if (compose === "live") {
      clearComposeParam();
      navigate("/live");
      return;
    }

    const modeByCompose: Record<string, "photo" | "reel" | "poll" | "story" | "shop"> = {
      post: "photo",
      photo: "photo",
      reel: "reel",
      story: "story",
      poll: "poll",
      shop: "shop",
      marketplace: "shop",
    };
    const mode = modeByCompose[compose];
    if (!mode) {
      clearComposeParam();
      return;
    }

    setCreateMode(mode);
    setShowCreate(true);
    clearComposeParam();
  }, [authReady, goLogin, location.pathname, location.search, navigate, userId]);

  useEffect(() => {
    const openSearch = () => setShowSearch(true);
    window.addEventListener("zivo-open-feed-search", openSearch);
    return () => window.removeEventListener("zivo-open-feed-search", openSearch);
  }, []);

  useEffect(() => {
    const markReady = () => setSidebarDataReady(true);
    if (window.requestIdleCallback) {
      const handle = window.requestIdleCallback(markReady, { timeout: 2600 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(markReady, 1800);
    return () => window.clearTimeout(timer);
  }, []);

  // Handle share-to-profile deep link
  useEffect(() => {
    const state = location.state as {
      shareToProfile?: boolean;
      openCreate?: boolean;
      shareUrl?: string;
      shareText?: string;
      shareMediaUrl?: string;
      shareMediaType?: "image" | "video";
      sharePostId?: string;
      sharePostAuthorId?: string;
      sharePostAuthorName?: string;
      commerceLinkDraft?: {
        linkType: "store_product" | "truck_sale";
        storeId?: string;
        storeProductId?: string;
        truckSaleId?: string;
        checkoutPath?: string;
        mapLat?: number;
        mapLng?: number;
        mapLabel?: string;
      };
    } | null;
    if (state?.shareToProfile && userId) {
      setShareForPost({ shareUrl: state.shareUrl || "", shareText: state.shareText || "", shareMediaUrl: state.shareMediaUrl, shareMediaType: state.shareMediaType, sharePostId: state.sharePostId, sharePostAuthorId: state.sharePostAuthorId, sharePostAuthorName: state.sharePostAuthorName });
      setCommerceDraft(state.commerceLinkDraft || null);
      setShowCreate(true);
      window.history.replaceState({}, document.title);
    } else if (state?.openCreate && userId) {
      setCommerceDraft(state.commerceLinkDraft || null);
      setShowCreate(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, userId]);

  useEffect(() => {
    const refreshFeed = () => {
      setPageSize(INITIAL_REELS_PAGE_SIZE);
      setNewPostsCount(0);
      queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
    };

    window.addEventListener("zivo-feed-refresh", refreshFeed);
    return () => window.removeEventListener("zivo-feed-refresh", refreshFeed);
  }, [queryClient]);

  useEffect(() => {
    if (authLoading) {
      setAuthReady(false);
      return;
    }

    const uid = authUser?.id || null;
    setUserId(uid);
    setAuthReady(true);

    if (!uid || !authUser) {
      setUserProfile(null);
      return;
    }

    const metaAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;
    const metaName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "You";
    setUserProfile({
      name: metaName,
      avatar: optimizeAvatar(metaAvatar, 96) || metaAvatar || null,
    });

    let cancelled = false;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .or(`id.eq.${uid},user_id.eq.${uid}`)
      .limit(1)
      .maybeSingle()
      .then(({ data: p }) => {
        if (cancelled || !p) return;
        setUserProfile({
          name: (p as any).full_name || metaName,
          avatar: optimizeAvatar((p as any).avatar_url, 96) || optimizeAvatar(metaAvatar, 96) || metaAvatar || null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, authUser]);

  // Sidebar contacts + trending tags
  useEffect(() => {
    if (!userId || !sidebarDataReady) return;
    (async () => {
      const { data: fships } = await (supabase as any)
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .limit(500);
      if (!fships?.length) return;
      const fIds = fships.map((r: any) => r.user_id === userId ? r.friend_id : r.user_id);
      setFriendIds(new Set(fIds));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", fIds.slice(0, 8))
        .limit(8);
      if (profs) setSidebarContacts(profs.map((p: any) => ({ id: p.user_id, name: p.full_name || "User", avatar: p.avatar_url || null })));
    })();
    (async () => {
      const { data: flData } = await (supabase as any)
        .from("user_followers")
        .select("following_id")
        .eq("follower_id", userId);
      if (flData) setFollowingIds(new Set(flData.map((r: any) => r.following_id)));
    })();
    (async () => {
      const { data: posts } = await (supabase as any)
        .from("user_posts")
        .select("caption")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!posts) return;
      const tagCounts: Record<string, number> = {};
      posts.forEach((p: any) => {
        const tags = (p.caption || "").match(/#[\w一-鿿؀-ۿ]+/g) || [];
        tags.forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
      });
      setTrendingTags(
        Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([tag, count]) => ({ tag, count }))
      );
    })();
  }, [userId, sidebarDataReady]);

  // Realtime: count new posts that arrive while the user is mid-feed.
  useEffect(() => {
    const channelName = userId ? topicForUserSync(userId, "reels-feed-new-posts") : "reels-feed-new-posts:anon";
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_posts" }, (payload: any) => {
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

  const handleShowNewPosts = useCallback(() => {
    setNewPostsCount(0);
    queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [queryClient]);

  // Active live-stream count — drives the visibility + label of the Live Now
  // banner so we don't promote a discovery surface that has nothing to show.
  const { data: liveStreamsCount = 0 } = useQuery({
    queryKey: ["feed-live-count"],
    queryFn: async ({ signal }) => {
      const { count } = await withSupabaseAbortSignal((supabase as any)
        .from("live_streams")
        .select("id", { count: "exact", head: true })
        .eq("status", "live"), signal);
      return count || 0;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    enabled: sidebarDataReady,
  });

  // User search with debounce
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); setStoreSearchResults([]); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const words = q.trim().toLowerCase().split(/\s+/);
        let profileQuery = supabase.from("public_profiles" as any).select("id, full_name, avatar_url").limit(15);
        words.forEach((w) => { profileQuery = profileQuery.ilike("full_name", `%${w}%`); });
        const [{ data: profileData }, { data: storeData }] = await Promise.all([
          profileQuery,
          supabase.from("store_profiles" as any).select("id, name, logo_url, slug, category").ilike("name", `%${q.trim()}%`).limit(10),
        ]);
        setSearchResults(profileData || []);
        setStoreSearchResults(storeData || []);
      } catch { setSearchResults([]); setStoreSearchResults([]); }
      setSearchLoading(false);
    }, 300);
  };

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  const { data: items = [], isLoading, isFetching, isError: hasGridError, error: gridError } = useQuery({
    queryKey: ["reels-feed-grid", pageSize],
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const feedStartedAt = perfNow();
      const allItems: FeedItem[] = [];

      // Fetch store posts
      const { data: storePosts } = await withSupabaseAbortSignal(supabase
        .from("store_posts")
        .select("id, media_urls, media_type, caption, likes_count, comments_count, shares_count, view_count, created_at, store_id")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(pageSize), signal);

      if (storePosts?.length) {
        const storeIds = [...new Set(storePosts.map((p: any) => p.store_id))];
        const { data: stores } = await withSupabaseAbortSignal(supabase
          .from("store_profiles")
          .select("id, name, logo_url, slug, is_verified")
          .in("id", storeIds), signal);
        const storeMap = new Map((stores || []).map((s: any) => [s.id, s]));

        for (const post of storePosts as any[]) {
          const store = storeMap.get(post.store_id);
          const urls: string[] = (post.media_urls || []).map((u: string) => normalizeSupabaseMediaUrl(u, { preferredBucket: "store-posts" }));
          // Allow text-only announcements through (matches the user_posts loop
          // below at line ~686). Previously we dropped any post without media,
          // so store text updates never reached the feed.
          if (!urls.length && !post.caption?.trim()) continue;

          allItems.push({
            id: post.id,
            source: "store",
            media_urls: urls,
            media_type: (urls.length === 0
              ? "image"
              : (post.media_type === "video" || urls[0]?.match(/\.(mp4|mov|webm)/i)) ? "video" : "image") as "image" | "video",
            caption: post.caption,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            shares_count: post.shares_count || 0,
            views_count: post.view_count || 0,
            author_name: store?.name || "Store",
            author_avatar: store?.logo_url || null,
            author_id: store?.id || post.store_id,
            author_is_verified: store?.is_verified === true,
            store_slug: store?.slug || null,
            created_at: post.created_at,
          });
        }
      }


      // Fetch user posts
      try {
        let { data: userPosts, error: userPostsError } = await withSupabaseAbortSignal((supabase as any)
          .from("user_posts")
          .select(REELS_USER_POSTS_SELECT)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(pageSize), signal);
        if (userPostsError && isSensitiveSchemaDriftError(userPostsError)) {
          const retry = await withSupabaseAbortSignal((supabase as any)
            .from("user_posts")
            .select(REELS_USER_POSTS_SELECT_FALLBACK)
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(pageSize), signal);
          userPosts = retry.data;
          userPostsError = retry.error;
        }

        // Diagnostic: surface RLS or query failures the outer catch{} swallows.
        // Open dev console to see how many user_posts the RLS policies returned
        // — "I don't see other users' posts" usually means RLS filtered them.
        if (typeof window !== "undefined") {
          console.info("[feed] user_posts →", { rows: userPosts?.length ?? 0, error: userPostsError ?? null });
        }

        if (userPosts?.length) {
          const userIds = [...new Set(userPosts.map((p: any) => p.user_id))] as string[];
          const sharedFromUserIds = [...new Set(userPosts.filter((p: any) => p.shared_from_user_id).map((p: any) => p.shared_from_user_id))] as string[];
          const sharedFromPostIds = [...new Set(userPosts.filter((p: any) => p.shared_from_post_id).map((p: any) => p.shared_from_post_id))] as string[];

          let originalUserPosts: Array<{ id: string; user_id: string; caption: string | null }> = [];
          let originalStorePosts: Array<{ id: string; store_id: string; caption: string | null }> = [];

          if (sharedFromPostIds.length) {
            const [{ data: sourceUserPosts }, { data: sourceStorePosts }] = await Promise.all([
              (supabase as any).from("user_posts").select("id, user_id, caption").in("id", sharedFromPostIds),
              supabase.from("store_posts").select("id, store_id, caption").in("id", sharedFromPostIds),
            ]);

            originalUserPosts = (sourceUserPosts ?? []) as Array<{ id: string; user_id: string; caption: string | null }>;
            originalStorePosts = (sourceStorePosts ?? []) as Array<{ id: string; store_id: string; caption: string | null }>;
          }

          const originalUserIds = [...new Set(originalUserPosts.map((p) => p.user_id))] as string[];
          const allProfileIds = [...new Set([...userIds, ...sharedFromUserIds, ...originalUserIds].filter(Boolean))] as string[];
          // Collapsed from 4 round-trips to 2: each profile table is hit once
          // with an OR matching either `id` or `user_id` against the same list.
          // Historical IDs can be either, so we match both in a single query.
          const profileIdsCsv = allProfileIds.join(",");
          const [
            { data: publicProfilesMerged },
            { data: profileSettingsMerged },
          ] = await Promise.all([
            allProfileIds.length
              ? (supabase as any)
                  .from("public_profiles")
                  .select("id, user_id, full_name, avatar_url")
                  .or(`id.in.(${profileIdsCsv}),user_id.in.(${profileIdsCsv})`)
              : Promise.resolve({ data: [] as any[] }),
            allProfileIds.length
              ? (supabase as any)
                  .from("profiles")
                  .select("id, user_id, comment_control, hide_like_counts, allow_sharing, allow_mentions, is_verified")
                  .or(`id.in.(${profileIdsCsv}),user_id.in.(${profileIdsCsv})`)
              : Promise.resolve({ data: [] as any[] }),
          ]);
          // Single-source arrays — downstream Map builders still set under both
          // keys (profile.id and profile.user_id), so one array is enough.
          const publicProfilesRows = publicProfilesMerged ?? [];
          const profileSettingsRows = profileSettingsMerged ?? [];

          let sharedStores: Array<{ id: string; name: string; logo_url: string | null; slug: string; is_verified?: boolean | null }> = [];
          const sharedStoreIds = [...new Set(originalStorePosts.map((p) => p.store_id))] as string[];
          if (sharedStoreIds.length) {
            const { data } = await supabase
              .from("store_profiles")
              .select("id, name, logo_url, slug, is_verified")
              .in("id", sharedStoreIds);
            sharedStores = (data ?? []) as Array<{ id: string; name: string; logo_url: string | null; slug: string; is_verified?: boolean | null }>;
          }

          const publicProfileMap = new Map<string, any>();
          publicProfilesRows.forEach((profile: any) => {
            if (profile?.id) publicProfileMap.set(profile.id, profile);
            if (profile?.user_id) publicProfileMap.set(profile.user_id, profile);
          });

          const profileSettingsMap = new Map<string, any>();
          profileSettingsRows.forEach((profile: any) => {
            if (profile?.id) profileSettingsMap.set(profile.id, profile);
            if (profile?.user_id) profileSettingsMap.set(profile.user_id, profile);
          });

          const originalUserPostMap = new Map(originalUserPosts.map((post) => [post.id, post]));
          const originalStorePostMap = new Map(originalStorePosts.map((post) => [post.id, post]));
          const sharedStoreMap = new Map(sharedStores.map((store) => [store.id, store]));

          for (const post of userPosts as any[]) {
            const profileDisplay = publicProfileMap.get(post.user_id);
            const profileSettings = profileSettingsMap.get(post.user_id);
            const postMediaUrls: string[] = Array.isArray(post.media_urls) && post.media_urls.length > 0
              ? post.media_urls.map((url: string) => normalizeSupabaseMediaUrl(url, { preferredBucket: "user-posts" }))
              : post.media_url ? [normalizeSupabaseMediaUrl(post.media_url, { preferredBucket: "user-posts" })] : [];
            if (!postMediaUrls.length && !post.caption?.trim()) continue;
            const normalizedMediaType = normalizeUserPostMediaType(post.media_type, postMediaUrls);

            const originalUserPost = post.shared_from_post_id ? originalUserPostMap.get(post.shared_from_post_id) : null;
            const originalStorePost = post.shared_from_post_id ? originalStorePostMap.get(post.shared_from_post_id) : null;

            let sharedFromSource: "user" | "store" | null = null;
            let sharedFromUserId: string | null = post.shared_from_user_id || null;
            let sharedFromUserName: string | null = null;
            let sharedFromUserAvatar: string | null = null;
            let sharedFromCaption: string | null = null;
            let sharedFromStoreSlug: string | null = null;

            if (originalStorePost) {
              const sharedStore = sharedStoreMap.get(originalStorePost.store_id);
              sharedFromSource = "store";
              sharedFromUserName = sharedStore?.name?.trim() || "Store";
              sharedFromUserAvatar = sharedStore?.logo_url || null;
              sharedFromCaption = originalStorePost.caption || null;
              sharedFromStoreSlug = sharedStore?.slug || null;
            } else if (originalUserPost) {
              const sharedProfile = publicProfileMap.get(originalUserPost.user_id);
              sharedFromSource = "user";
              sharedFromUserId = originalUserPost.user_id;
              sharedFromUserName = sharedProfile?.full_name?.trim() || "Someone";
              sharedFromUserAvatar = optimizeAvatar(sharedProfile?.avatar_url, 96) || sharedProfile?.avatar_url || null;
              sharedFromCaption = originalUserPost.caption || null;
            } else if (post.shared_from_user_id) {
              const sharedProfile = publicProfileMap.get(post.shared_from_user_id);
              sharedFromSource = "user";
              sharedFromUserName = sharedProfile?.full_name?.trim() || "Someone";
              sharedFromUserAvatar = optimizeAvatar(sharedProfile?.avatar_url, 96) || sharedProfile?.avatar_url || null;
            }

            allItems.push({
              id: `u-${post.id}`,
              source: "user",
              media_urls: postMediaUrls,
              media_type: normalizedMediaType,
              caption: post.caption,
              likes_count: post.likes_count || 0,
              comments_count: post.comments_count || 0,
              shares_count: post.shares_count || 0,
              views_count: post.views_count || 0,
              author_name: profileDisplay?.full_name?.trim() || "User",
              author_avatar: optimizeAvatar(profileDisplay?.avatar_url, 96) || profileDisplay?.avatar_url || null,
              author_id: post.user_id,
              author_is_verified: !!profileSettings?.is_verified,
              created_at: post.created_at,
              is_sensitive: !!post.is_sensitive,
              sensitive_reason: post.sensitive_reason || null,
              shared_from_post_id: post.shared_from_post_id || null,
              shared_from_user_id: sharedFromUserId,
              shared_from_user_name: sharedFromUserName,
              shared_from_user_avatar: sharedFromUserAvatar,
              shared_from_caption: sharedFromCaption,
              shared_from_source: sharedFromSource,
              shared_from_store_slug: sharedFromStoreSlug,
              comment_control: post.comments_enabled === false
                ? "off"
                : profileSettings?.comment_control ?? "everyone",
              hide_like_counts: profileSettings?.hide_like_counts ?? false,
              allow_sharing: post.sharing_enabled !== false && profileSettings?.allow_sharing !== false,
              allow_mentions: profileSettings?.allow_mentions ?? true,
              location: post.location || null,
              is_pinned: post.is_pinned || false,
            });
          }
        }

        // Enrich with post_media table for multi-image posts
        try {
          const userItemIds = allItems.filter((i) => i.source === "user" && i.media_urls.length <= 1).map((i) => i.id.replace(/^u-/, ""));
          if (userItemIds.length) {
            const { data: postMediaRows } = await (supabase as any)
              .from("post_media")
              .select("post_id, media_url, sort_order")
              .in("post_id", userItemIds);
            if (postMediaRows?.length) {
              const mediaMap = new Map<string, string[]>();
              (postMediaRows as any[])
                .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
                .forEach((row: any) => {
                  if (!mediaMap.has(row.post_id)) mediaMap.set(row.post_id, []);
                  if (row.media_url) mediaMap.get(row.post_id)!.push(normalizeSupabaseMediaUrl(row.media_url, { preferredBucket: "user-posts" }));
                });
              allItems.forEach((item) => {
                if (item.source !== "user") return;
                const rawId = item.id.replace(/^u-/, "");
                const extra = mediaMap.get(rawId);
                if (extra && extra.length > item.media_urls.length) {
                  item.media_urls = extra;
                }
              });
            }
          }
        } catch {}
      } catch {}

      try {
        const storePostIds = allItems.filter((i) => i.source === "store").map((i) => i.id);
        const userPostIds = allItems.filter((i) => i.source === "user").map((i) => i.id.replace(/^u-/, ""));

        // Single round-trip for both sources. Previous code hit the same table
        // (social_reel_links) twice — once per source — even though they're
        // already in Promise.all, that's 2 connections and 2 SQL plans.
        // OR'd predicate keeps the (post_source, post_id) index usable.
        const orParts: string[] = [];
        if (storePostIds.length) orParts.push(`and(post_source.eq.store,post_id.in.(${storePostIds.join(",")}))`);
        if (userPostIds.length)  orParts.push(`and(post_source.eq.user,post_id.in.(${userPostIds.join(",")}))`);

        const linksRes = orParts.length
          ? await (supabase as any)
              .from("social_reel_links")
              .select("post_id, post_source, link_type, store_id, store_product_id, truck_sale_id, checkout_path, map_lat, map_lng, map_label")
              .or(orParts.join(","))
          : { data: [] as any[] };

        const links = (linksRes.data || []) as any[];
        const linkMap = new Map(links.map((row) => [`${row.post_source}:${row.post_id}`, row]));

        allItems.forEach((item) => {
          const rawId = item.source === "user" ? item.id.replace(/^u-/, "") : item.id;
          const link = linkMap.get(`${item.source}:${rawId}`);
          if (!link) return;
          item.commerce_link = {
            link_type: link.link_type,
            store_id: link.store_id,
            store_product_id: link.store_product_id,
            truck_sale_id: link.truck_sale_id,
            checkout_path: link.checkout_path,
            map_lat: link.map_lat,
            map_lng: link.map_lng,
            map_label: link.map_label,
          };
        });
      } catch {
        // Keep feed rendering even if commerce links fail.
      }

      try {
        const userPostIds = [...new Set(
          allItems
            .filter((item) => item.source === "user")
            .map((item) => stripFeedUserPrefix(item.id))
            .filter(Boolean)
        )];

        if (userPostIds.length) {
          const [{ data: rawLikes }, { data: rawComments }] = await Promise.all([
            (supabase as any)
              .from("post_likes")
              .select("post_id")
              .in("post_id", userPostIds),
            (supabase as any)
              .from("post_comments")
              .select("post_id")
              .eq("post_source", "user")
              .in("post_id", userPostIds),
          ]);

          const likeCounts = new Map<string, number>();
          for (const row of rawLikes || []) {
            const postId = String((row as any).post_id || "");
            if (!postId) continue;
            likeCounts.set(postId, (likeCounts.get(postId) || 0) + 1);
          }

          const commentCounts = new Map<string, number>();
          for (const row of rawComments || []) {
            const postId = stripFeedUserPrefix(String((row as any).post_id || ""));
            if (!postId) continue;
            commentCounts.set(postId, (commentCounts.get(postId) || 0) + 1);
          }

          allItems.forEach((item) => {
            if (item.source !== "user") return;
            const rawId = stripFeedUserPrefix(item.id);
            item.likes_count = likeCounts.get(rawId) ?? item.likes_count ?? 0;
            item.comments_count = commentCounts.get(rawId) ?? item.comments_count ?? 0;
          });
        }
      } catch {
        // Fall back to denormalized counters if interaction tables are unavailable.
      }

      // Fetch poll posts and aggregate per-option vote counts so the
      // PollPostCard can render filled progress bars without re-querying.
      try {
        const { data: pollRows } = await (supabase as any)
          .from("poll_posts")
          .select("id, user_id, question, poll_type, options, correct_option_index, expires_at, total_votes, created_at")
          .order("created_at", { ascending: false })
          .limit(Math.max(20, Math.floor(pageSize / 2)));

        if (pollRows?.length) {
          const pollIds = pollRows.map((p: any) => p.id);
          const pollUserIds = [...new Set(pollRows.map((p: any) => p.user_id))] as string[];

          const [{ data: voteRows }, { data: pollProfiles }] = await Promise.all([
            (supabase as any).from("poll_votes").select("poll_id, option_index").in("poll_id", pollIds),
            (supabase as any).from("public_profiles").select("id, user_id, full_name, avatar_url").in("user_id", pollUserIds),
          ]);

          const pollProfileMap = new Map<string, any>();
          (pollProfiles || []).forEach((p: any) => {
            if (p?.id) pollProfileMap.set(p.id, p);
            if (p?.user_id) pollProfileMap.set(p.user_id, p);
          });

          // Aggregate vote counts: pollId -> optionIndex -> count
          const voteCounts = new Map<string, Map<number, number>>();
          for (const row of voteRows || []) {
            const pid = String((row as any).poll_id || "");
            const idx = Number((row as any).option_index ?? -1);
            if (!pid || idx < 0) continue;
            if (!voteCounts.has(pid)) voteCounts.set(pid, new Map());
            const inner = voteCounts.get(pid)!;
            inner.set(idx, (inner.get(idx) || 0) + 1);
          }

          for (const poll of pollRows as any[]) {
            const profile = pollProfileMap.get(poll.user_id);
            const rawOptions: { text: string; votes?: number }[] = Array.isArray(poll.options) ? poll.options : [];
            const counts = voteCounts.get(poll.id);
            const enrichedOptions = rawOptions.map((opt, i) => ({
              text: typeof opt === "string" ? opt : (opt?.text || ""),
              votes: counts?.get(i) ?? (typeof opt === "object" ? (opt as any).votes ?? 0 : 0),
            }));
            const totalVotes = enrichedOptions.reduce((s, o) => s + (o.votes || 0), 0) || (poll.total_votes || 0);

            allItems.push({
              id: `p-${poll.id}`,
              source: "poll",
              media_urls: [],
              media_type: "image",
              caption: null,
              likes_count: 0,
              comments_count: 0,
              shares_count: 0,
              views_count: 0,
              author_name: profile?.full_name?.trim() || "User",
              author_avatar: optimizeAvatar(profile?.avatar_url, 96) || profile?.avatar_url || null,
              author_id: poll.user_id,
              created_at: poll.created_at,
              poll: {
                question: poll.question,
                options: enrichedOptions,
                poll_type: poll.poll_type === "quiz" ? "quiz" : "poll",
                correct_option_index: poll.correct_option_index ?? null,
                total_votes: totalVotes,
                expires_at: poll.expires_at,
              },
            });
          }
        }
      } catch {
        // Polls are optional — if the table is missing in this environment, skip silently.
      }

      // Facebook-style algorithmic feed: blend engagement + recency + randomness
      const now = Date.now();
      const ONE_HOUR = 3_600_000;
      const seededRandom = (id: string) => {
        let h = 0;
        for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
        return ((h >>> 0) % 1000) / 1000;
      };

      allItems.forEach((item: any) => {
        const ageHours = (now - new Date(item.created_at).getTime()) / ONE_HOUR;
        // Recency decay: posts lose value over time (half-life ~6h)
        const recencyScore = 1 / (1 + ageHours / 6);
        // Engagement signal: normalized log of interactions.
        // Polls count each vote as 2× because casting a vote is higher-intent than a like.
        const pollVotes = item.source === "poll" ? (item.poll?.total_votes || 0) * 2 : 0;
        const totalEngagement = (item.likes_count || 0) + (item.comments_count || 0) * 2 + (item.shares_count || 0) * 3 + pollVotes;
        const engagementScore = Math.log2(1 + totalEngagement) / 10;
        // Boost videos slightly
        const mediaBoost = item.media_type === "video" ? 0.05 : 0;
        // Boost shared posts (social proof)
        const shareBoost = item.shared_from_post_id ? 0.03 : 0;
        // Random shuffle factor (changes daily per post)
        const dayKey = Math.floor(now / 86_400_000);
        const randomFactor = seededRandom(item.id + dayKey) * 0.15;

        item._feedScore = recencyScore * 0.45 + engagementScore * 0.3 + mediaBoost + shareBoost + randomFactor;
      });

      allItems.sort((a: any, b: any) => (b._feedScore || 0) - (a._feedScore || 0));
      perfMeasure("reels feed query", feedStartedAt, {
        pageSize,
        itemCount: allItems.length,
      });
      return allItems;
    },
    staleTime: 2 * 60_000, // 2 min — avoid refetching on every mount
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!hasGridError || !gridError) return;
    reportFeedQueryError(
      { scope: "reels-feed-grid", queryKey: "reels-feed-grid", userId, tab: feedTab, pageSize },
      gridError,
    );
  }, [feedTab, gridError, hasGridError, pageSize, userId]);



  useEffect(() => {
    const postId = new URLSearchParams(location.search).get("post");
    if (!postId || items.length === 0) return;

    const target = items.find((item) => item.id === postId || item.id === `u-${postId}`);
    if (!target) return;

    if (target.media_type === "video") {
      const videoItems = items.filter((item) => item.media_type === "video");
      const videoIndex = videoItems.findIndex((item) => item.id === target.id);
      if (videoIndex >= 0) {
        rememberReelForReelsTab(target.id);
        setReelsStartIndex(videoIndex);
      }
      return;
    }

    const itemIndex = items.findIndex((item) => item.id === target.id);
    if (itemIndex >= 0) {
      rememberReelForReelsTab(target.id);
      setFullscreenIndex(itemIndex);
    }
  }, [items, location.search]);

  useEffect(() => {
    if (reelsStartIndex === null) return;

    requestAnimationFrame(() => {
      const slide = reelsScrollRef.current?.children[reelsStartIndex] as HTMLElement | undefined;
      slide?.scrollIntoView({ block: "start" });
    });
  }, [reelsStartIndex]);

  const handlePullRefresh = useCallback(async () => {
    setPageSize(INITIAL_REELS_PAGE_SIZE);
    setNewPostsCount(0);
    await queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
  }, [queryClient]);

  const handleNewPostsTap = useCallback(() => {
    setNewPostsCount(0);
    setPageSize(INITIAL_REELS_PAGE_SIZE);
    queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
    feedTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [queryClient]);

  useEffect(() => {
    const handleFeedScrollTop = () => {
      feedPageTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.scrollingElement?.scrollTo?.({ top: 0, left: 0, behavior: "smooth" });

      requestAnimationFrame(() => {
        if ((window.scrollY || document.scrollingElement?.scrollTop || 0) < 4) return;
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        document.scrollingElement?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      });
    };

    window.addEventListener("zivo-feed-scroll-top", handleFeedScrollTop);
    return () => window.removeEventListener("zivo-feed-scroll-top", handleFeedScrollTop);
  }, []);

  // Infinite scroll — observe the sentinel and bump pageSize when reached.
  // Skips while a fetch is in flight to avoid flooding the server.
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    if (pageSize >= PAGE_MAX) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetching) {
          setPageSize((prev) => Math.min(prev + PAGE_INCREMENT, PAGE_MAX));
        }
      },
      { rootMargin: "400px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [pageSize, isFetching, items.length, PAGE_INCREMENT, PAGE_MAX]);

  // Listen for chat panel state to adjust layout
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    const handler = (e: any) => setChatOpen(!!e.detail?.open);
    window.addEventListener("zivo-chat-state", handler as EventListener);
    return () => window.removeEventListener("zivo-chat-state", handler as EventListener);
  }, []);

  // Facebook-style auto-hide header on scroll down, show on scroll up (mobile)
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  useEffect(() => {
    const SCROLL_THRESHOLD = 8; // ignore tiny jitter
    const TOP_SAFE_ZONE = 80;   // always show near the top
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const dy = y - lastScrollYRef.current;
      if (Math.abs(dy) < SCROLL_THRESHOLD) return;
      if (y < TOP_SAFE_ZONE) {
        setHeaderHidden(false);
      } else if (dy > 0) {
        setHeaderHidden(true);
      } else {
        setHeaderHidden(false);
      }
      lastScrollYRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <SEOHead
        title={isFeedRoute ? "ZIVO Feed – Social Posts, Reels & Creator Updates" : "ZIVO Reels – Trending Short Videos & Creator Posts"}
        description={isFeedRoute ? "Catch up on posts, reels, creators, stories, and community updates on ZIVO." : "Discover trending reels, follow your favorite creators, support them with tips, and shop products straight from videos on ZIVO."}
        canonical={isFeedRoute ? "/feed" : "/reels"}
      />
      {/* Desktop NavBar */}
      <div className="hidden lg:block relative z-[1200]">
        <Suspense fallback={null}><NavBar /></Suspense>
      </div>

      <div className={cn(
        "bg-background lg:flex lg:pt-[60px] transition-all duration-300",
        chatOpen && "lg:pr-[400px] xl:pr-[420px] 2xl:pr-[440px]"
      )}>
        {/* Desktop Sidebar */}
        <Suspense fallback={null}><FeedSidebar /></Suspense>

        {/* Main Feed Content */}
        <PullToRefresh onRefresh={handlePullRefresh} className="zivo-shell-mobile bg-background lg:pb-0 flex-1 w-full lg:max-w-[600px] lg:mx-auto">
          {/* Header — hidden on desktop since the global NavBar already provides search */}
          <div
            data-testid="feed-sticky-header"
            className="lg:hidden zivo-sticky-mobile-header"
          >
            <div style={{ paddingTop: "max(var(--zivo-safe-top, 0px), 8px)" }}>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-out",
                  "max-h-[128px] opacity-100",
                  headerHidden && "shadow-sm"
                )}
              >
                <div className="px-3 pt-1.5 pb-1 flex items-center gap-2">
                  {/* Hamburger menu — Facebook-style entry point for secondary
                      items (Complete profile, Saved posts, etc.) so the feed
                      scroll stays focused on actual posts. */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <button type="button"
                        className="shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-foreground hover:bg-muted/60 active:scale-95 transition"
                        aria-label="Open menu"
                        title="Open menu"
                      >
                        <Menu className="h-5 w-5" />
                      </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[88vw] sm:w-[400px] p-0 overflow-y-auto">
                      <SheetHeader className="px-4 py-3 border-b border-border/30">
                        <SheetTitle className="text-base font-bold">Menu</SheetTitle>
                        <SheetDescription className="sr-only">
                          Shortcuts for creating posts, navigating ZIVO, and opening saved or notification tools.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="p-3 space-y-3">
                        {sidebarDataReady && (
                          <>
                            <Suspense fallback={null}>
                              <ProfileCompletionNudge />
                            </Suspense>
                            <Suspense fallback={null}>
                              <SavedPostsLink />
                            </Suspense>
                          </>
                        )}

                        {/* Facebook-style Create section */}
                        {userId && (
                          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
                            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                              <h3 className="text-[15px] font-bold text-foreground">Create</h3>
                              <button type="button"
                                onClick={() => { setCreateMode("photo"); setShowCreate(true); }}
                                className="text-[12px] font-semibold text-primary hover:underline"
                              >
                                See all
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-px bg-border/30">
                              {[
                                { label: "Business", desc: "Page for your shop", icon: Building2, color: "text-emerald-500", route: "/business/new" },
                                { label: "Group", desc: "Build a community", icon: Users, color: "text-blue-500", route: "/communities" },
                                { label: "Event", desc: "Bring people together", icon: Calendar, color: "text-amber-500", route: "/explore" },
                                { label: "Reel", desc: "Short video", icon: Film, color: "text-fuchsia-500", route: "/feed?compose=reel" },
                                { label: "Story", desc: "Share for 24h", icon: Camera, color: "text-pink-500", route: "/feed?compose=story" },
                                { label: "Live", desc: "Go live now", icon: Radio, color: "text-red-500", route: "/feed?compose=live" },
                                { label: "Marketplace", desc: "Sell items", icon: ShoppingBag, color: "text-orange-500", route: "/feed?compose=shop" },
                                { label: "Job", desc: "Post a hiring", icon: Briefcase, color: "text-sky-500", route: "/personal/employer" },
                                { label: "Spaces", desc: "Audio room", icon: Mic2, color: "text-violet-500", route: "/spaces" },
                                { label: "Post", desc: "Photo, text, poll", icon: Plus, color: "text-foreground", action: "compose" as const },
                              ].map((item) => (
                                <button type="button"
                                  key={item.label}
                                  onClick={() => {
                                    // `item` is a heterogeneous union — some
                                    // entries carry `action: "compose"`, others
                                    // carry `route`. Use `in` narrowing so TS
                                    // resolves the right arm without picking
                                    // `never` and erroring on `.route`.
                                    if ("action" in item && item.action === "compose") {
                                      setCreateMode("photo");
                                      setShowCreate(true);
                                    } else if ("route" in item) {
                                      navigate(item.route);
                                    }
                                  }}
                                  className="flex items-start gap-3 p-3 bg-card hover:bg-muted/50 active:bg-muted transition-colors text-left"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                                    <item.icon className={`w-5 h-5 ${item.color}`} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-foreground leading-tight truncate">{item.label}</p>
                                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{item.desc}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quick links */}
                        {userId && (
                          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
                            <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Shortcuts</p>
                            {[
                              { label: "Saved", icon: Bookmark, route: "/saved" },
                              { label: "Notifications", icon: Bell, route: "/notifications" },
                              { label: "Messages", icon: MessageCircle, route: "/chat" },
                              { label: "Trending", icon: TrendingUp, route: "/trending" },
                              { label: "History", icon: History, route: "/history" },
                              { label: "Settings", icon: Settings2, route: "/settings" },
                            ].map((item) => (
                              <button type="button"
                                key={item.label}
                                onClick={() => navigate(item.route)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 active:bg-muted transition-colors"
                              >
                                <item.icon className="w-5 h-5 text-foreground" />
                                <span className="text-[14px] font-medium text-foreground">{item.label}</span>
                                <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                  <h1 className="text-base font-bold text-ig-gradient shrink-0 drop-shadow-sm">Feed</h1>
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => setShowSearch(true)}
                      placeholder="Search…"
                      className="h-11 w-full pl-8 pr-7 rounded-full bg-muted/40 border border-border/30 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); }} aria-label="Clear search" title="Clear search" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full">
                        <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <button type="button"
                    onClick={() => {
                      if (!userId) {
                        goLogin("/feed?compose=post");
                        return;
                      }
                      setCreateMode("photo");
                      setShowCreate(true);
                    }}
                    className="shrink-0 h-10 w-10 rounded-full bg-ig-gradient flex items-center justify-center text-white shadow-sm hover:opacity-90 active:scale-95 transition"
                    aria-label="Create post"
                    title="Create post"
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <button type="button"
                    onClick={() => userId ? navigate("/notifications") : goLogin("/notifications")}
                    className="shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-foreground hover:bg-muted/60 active:scale-95 transition relative"
                    aria-label={notificationUnread > 0 ? `Notifications, ${notificationUnread} unread` : "Notifications"}
                    title={notificationUnread > 0 ? `Notifications, ${notificationUnread} unread` : "Notifications"}
                  >
                    <Bell className="h-5 w-5" />
                    {notificationUnread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
                        {notificationUnread > 99 ? "99+" : notificationUnread}
                      </span>
                    )}
                  </button>
                  <button type="button"
                    onClick={() => userId ? navigate("/chat") : goLogin("/chat")}
                    className="shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-foreground hover:bg-muted/60 active:scale-95 transition relative"
                    aria-label={headerChatUnread > 0 ? `Messages, ${headerChatUnread} unread` : "Messages"}
                    title={headerChatUnread > 0 ? `Messages, ${headerChatUnread} unread` : "Messages"}
                  >
                    <MessageCircle className="h-5 w-5" />
                    {headerChatUnread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
                        {headerChatUnread > 99 ? "99+" : headerChatUnread}
                      </span>
                    )}
                  </button>
                </div>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    headerHidden ? "max-h-0 opacity-0" : "max-h-[48px] opacity-100"
                  )}
                >
                  {/* Tab strip — For You / Friends / Following (signed-in only) */}
                  {userId && (
                    <div className="flex justify-center gap-8 px-3 pt-1 pb-2">
                      {(["For You", "Friends", "Following"] as const).map((label) => (
                        <button type="button"
                          key={label}
                          onClick={() => setFeedTab(label)}
                          className={cn(
                            "relative py-1 text-[15px] font-semibold transition-colors",
                            feedTab === label ? "text-foreground drop-shadow-sm" : "text-muted-foreground/80"
                          )}
                        >
                          {label}
                          {feedTab === label && (
                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* Search overlay */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                className="fixed inset-0 z-50 bg-background flex flex-col"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div data-testid="search-overlay-header" className="zivo-pt-safe-sticky flex items-center gap-2 px-3 py-2 border-b border-border/30">
                  <button type="button" onClick={closeFeedSearch} aria-label="Close search" title="Close search" className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <ChevronLeft className="h-5 w-5 text-foreground" />
                  </button>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search apps, rides, food, hotels, people..."
                      className="w-full pl-9 pr-8 py-2.5 rounded-full bg-muted/50 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {searchQuery && (
                      <button type="button" onClick={clearFeedSearch} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
                        <XIcon className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-24">
                  {feedSuperAppResults.length > 0 && (
                    <div className="px-4 pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {searchQuery.trim() ? "ZIVO apps" : "Jump in"}
                        </p>
                        {!searchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => openFeedSuperAppTarget("/services")}
                            className="text-[11px] font-semibold text-foreground"
                          >
                            See all
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {feedSuperAppResults.map((target) => {
                          const Icon = target.icon;
                          return (
                            <button
                              key={target.href}
                              type="button"
                              onClick={() => openFeedSuperAppTarget(target.href)}
                              className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-3 text-left active:scale-[0.98] transition-transform"
                            >
                              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", target.tone)}>
                                <Icon className="h-5 w-5" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-foreground">{target.label}</span>
                                <span className="block truncate text-[11px] text-muted-foreground">{target.description}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {searchLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : !searchQuery.trim() ? (
                    <div className="flex flex-col items-center justify-center h-32 px-8 text-center text-muted-foreground/50">
                      <Search className="h-8 w-8 mb-2" />
                      <p className="text-sm">Search people, shops, restaurants, or any ZIVO app.</p>
                    </div>
                  ) : (feedSuperAppResults.length === 0 && searchResults.length === 0 && storeSearchResults.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/50">
                      <p className="text-sm">No results found</p>
                    </div>
                  ) : (
                    <div>
                      {storeSearchResults.length > 0 && (
                        <div>
                          <p className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30">Shops</p>
                          {storeSearchResults.map((s: any) => (
                            <button type="button"
                              key={s.id}
                              onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); setStoreSearchResults([]); navigate(`/grocery/shop/${s.slug}`); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/10"
                            >
                              <div className="h-11 w-11 rounded-full overflow-hidden bg-muted border border-border/30 shrink-0 flex items-center justify-center">
                                {s.logo_url ? (
                                  <img src={s.logo_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                  <span className="text-xs font-bold text-muted-foreground">{(s.name || "S")[0].toUpperCase()}</span>
                                )}
                              </div>
                              <div className="text-left min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                                {s.category && <p className="text-[11px] text-muted-foreground">{s.category}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.length > 0 && (
                        <div>
                          {storeSearchResults.length > 0 && (
                            <p className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30">People</p>
                          )}
                          {searchResults.map((p: any) => (
                            <button type="button"
                              key={p.id}
                              onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); setStoreSearchResults([]); navigate(`/user/${p.id}`); }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/10"
                            >
                              <Avatar className="h-11 w-11 border-2 border-border/30">
                                <AvatarImage src={p.avatar_url || undefined} />
                                <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                                  {(p.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-left min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{p.full_name || "Unknown"}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {feedSuperAppResults.length === 0 && searchResults.length === 0 && storeSearchResults.length === 0 && searchQuery.trim() && !searchLoading && (
                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/50">
                          <p className="text-sm">No results found</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={feedPageTopRef} data-feed-page-top aria-hidden="true" />

          {/* Anchor for scroll-to-top after tapping the new-posts banner */}
          <div ref={feedTopRef} aria-hidden="true" />

          {/* Story Rings */}
          <div className="hidden lg:block">
            <Suspense fallback={null}><FeedStoryRing /></Suspense>
          </div>

          {authReady && !userId && (
            <GuestFeedCta onLogin={() => goLogin("/feed")} onSignup={goSignup} />
          )}

          {/* Realtime new-posts banner */}
          <AnimatePresence>
            {newPostsCount > 0 && (
              <motion.button
                key="new-posts-banner"
                type="button"
                onClick={handleNewPostsTap}
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ type: "spring", damping: 24, stiffness: 320 }}
                className="sticky top-[52px] lg:top-3 z-30 mx-auto my-2 flex items-center gap-2 rounded-full bg-ig-gradient text-white px-4 py-1.5 text-xs font-bold shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-95 transition-opacity"
              >
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                {newPostsCount} new {newPostsCount === 1 ? "post" : "posts"} — tap to refresh
              </motion.button>
            )}
          </AnimatePresence>

          {/* Live Now Banner — only when there's actually something to watch */}
          {liveStreamsCount > 0 && (
            <button type="button"
              onClick={() => navigate("/live")}
              className="mx-3 mt-1.5 mb-0.5 flex w-[calc(100%-1.5rem)] items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-red-500/10 via-rose-500/5 to-amber-500/10 border border-red-500/20 hover:border-red-500/40 transition-colors"
            >
              <div className="relative">
                <Radio className="h-4 w-4 text-red-500" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[11px] font-bold text-foreground leading-tight flex items-center gap-1.5">
                  Live Now
                  <span className="px-1.5 py-px rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {liveStreamsCount}
                  </span>
                </p>
                <p className="text-[9px] text-muted-foreground leading-tight">
                  {liveStreamsCount === 1 ? "1 creator is live right now" : `${liveStreamsCount} creators are live right now`}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}

          {/* Personalized greeting removed — duplicated the AppHome greeting
              and pushed real feed posts further down the screen. The Feed page
              should land users in content, not in another greeting. */}

          {/* Active scope summary — shown when tab or hashtag narrows the feed */}
          {(selectedHashtag || feedTab !== "For You") && (
            <div className="mx-3 mt-2 mb-1 flex items-center justify-between gap-2 rounded-full bg-muted/60 px-3 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0 text-[12px] text-foreground">
                <span className="text-muted-foreground">Filtered:</span>
                {feedTab !== "For You" && (
                  <span className="font-semibold">{feedTab}</span>
                )}
                {selectedHashtag && (
                  <>
                    {feedTab !== "For You" && <span className="text-muted-foreground">·</span>}
                    <span className="font-semibold text-primary truncate">#{selectedHashtag}</span>
                  </>
                )}
              </div>
              <button type="button"
                onClick={() => {
                  setSelectedHashtag(null);
                  setFeedTab("For You");
                }}
                className="shrink-0 text-[11px] font-semibold text-primary active:opacity-70"
              >
                Clear all
              </button>
            </div>
          )}

          {/* ProfileCompletionNudge + SavedPostsLink moved to the hamburger
              menu in the feed header — they're secondary destinations that
              don't need to compete with actual posts for vertical real estate.
              Open the ≡ menu to access them. */}

          {/* On this day — Facebook-style memories */}
          {sidebarDataReady && <Suspense fallback={null}><OnThisDay /></Suspense>}

          {/* Scroll-to-top FAB (renders portal-ish via fixed positioning) */}
          <Suspense fallback={null}><ScrollToTopFab /></Suspense>

           {/* Facebook-style quick-link shortcut bar removed — Live / Map /
               Marketplace / Groups / Events / ZIVO+ are navigation shortcuts
               that belong on the Home tab and the More page. On the Feed they
               pushed actual posts ~250px below the fold. Real content-feed
               apps (IG, TikTok, X) put nothing between composer and first
               post. Reaches them via bottom tabs / Home / More. */}

           {/* Suggested Users — hidden on xl+ since the right sidebar already shows
               "Suggested for you" there. lg (1024–1279px) and mobile keep the
               in-feed carousel since the right rail is xl:flex only. */}
           {sidebarDataReady && <div className="xl:hidden">
             <Suspense fallback={null}><SuggestedUsersCarousel /></Suspense>
           </div>}

          {/* Feed mode tabs — desktop only (mobile uses the sticky header tabs) */}
          {userId && (
            <div className="hidden lg:flex justify-center sticky lg:top-[60px] z-20 bg-background/95 backdrop-blur-xl border-b border-border/20">
              <div className="flex gap-2">
                {(["For You", "Friends", "Following"] as const).map((label) => (
                  <button type="button"
                    key={label}
                    onClick={() => setFeedTab(label)}
                    className={cn(
                      "px-8 py-2.5 text-[13px] font-semibold transition-colors",
                      feedTab === label
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasGridError && items.length > 0 && (
            <DegradedDataBanner
              className="mx-3 mt-2 mb-1"
              message="Showing cached posts. Refresh failed."
              onRetry={() => void handlePullRefresh()}
              trackingContext={reliabilityTrackingContext}
            />
          )}

          {/* Posts */}
          {!authReady || isLoading ? (
            <div className="space-y-2 pb-4" aria-label="Loading posts" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-card border-b border-border/20">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="h-9 w-9 rounded-full bg-muted/80 ring-1 ring-border/40 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/3 bg-muted/80 rounded animate-pulse" />
                      <div className="h-2.5 w-1/4 bg-muted/60 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="aspect-[4/5] w-full bg-muted/70 animate-pulse border-y border-border/20 flex items-center justify-center">
                    <Film className="h-8 w-8 text-muted-foreground/35" />
                  </div>
                  <EngagementSkeleton />
                </div>
              ))}
            </div>
          ) : hasGridError && items.length === 0 ? (
            <LoadFailureCard
              className="px-6 py-4"
              title="Couldn&apos;t load posts"
              description="Please try again. We will keep your current tab and filters."
              onRetry={() => void handlePullRefresh()}
              trackingContext={reliabilityTrackingContext}
            />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-72 text-center px-6 py-8">
              <div className="h-16 w-16 rounded-2xl bg-ig-gradient/10 flex items-center justify-center mb-3 mx-auto">
                <Camera className="h-8 w-8 text-ig-gradient" />
              </div>
              <p className="text-base font-bold text-foreground mb-1">Quiet here for now</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">Post something or jump into one of these spots — the community is active right now.</p>
              <div className="flex flex-wrap gap-2 justify-center mb-3">
                {userId && (
                  <button type="button" onClick={() => { setCreateMode("photo"); setShowCreate(true); }} className="px-4 py-2 bg-ig-gradient text-white rounded-full text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all">
                    Create post
                  </button>
                )}
                <button type="button" onClick={() => navigate("/audio-rooms")} className="px-4 py-2 bg-secondary text-foreground rounded-full text-xs font-bold hover:bg-muted active:scale-95 transition-all">Live rooms</button>
                <button type="button" onClick={() => navigate("/ama")} className="px-4 py-2 bg-secondary text-foreground rounded-full text-xs font-bold hover:bg-muted active:scale-95 transition-all">AMA sessions</button>
                <button type="button" onClick={() => navigate("/trending")} className="px-4 py-2 bg-secondary text-foreground rounded-full text-xs font-bold hover:bg-muted active:scale-95 transition-all">Trending</button>
              </div>
            </div>
          ) : (() => {
            const hiddenFiltered = (hiddenPosts.hidden.size > 0 || snoozedAuthorIds.size > 0)
              ? items.filter((i) => {
                  const source = getFeedPreferenceSource(i);
                  const snoozedKey = source && i.author_id ? getFeedAuthorSnoozeKey(source, i.author_id) : null;
                  return (
                    !hiddenPosts.isHidden(i.id, source || undefined) &&
                    (!i.author_id || !snoozedKey || (!snoozedAuthorIds.has(snoozedKey) && !snoozedAuthorIds.has(i.author_id)))
                  );
                })
              : items;
            const baseItems = selectedHashtag
              ? hiddenFiltered.filter(i => postHasHashtag(i.caption, selectedHashtag))
              : hiddenFiltered;
            const tabItems = feedTab === "Friends"
              ? baseItems.filter(i => i.author_id && friendIds.has(i.author_id))
              : feedTab === "Following"
              ? baseItems.filter(i => i.author_id && followingIds.has(i.author_id))
              : baseItems;
            const filteredItems = tabItems;
            return filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 min-h-48 py-6 px-6 text-center">
                {selectedHashtag ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      No posts with <span className="font-semibold text-foreground">#{selectedHashtag}</span> yet
                    </p>
                    <button type="button"
                      onClick={() => setSelectedHashtag(null)}
                      className="rounded-full bg-ig-gradient text-white text-xs font-bold px-4 py-2 shadow-sm hover:opacity-90 active:scale-95 transition-all"
                    >
                      Clear filter
                    </button>
                  </>
                ) : feedTab === "Following" || feedTab === "Friends" ? (
                  <div className="w-full max-w-md">
                    <div className="flex flex-col items-center gap-2 text-center mb-3">
                      <p className="text-sm text-foreground font-medium">
                        Nothing in {feedTab} yet
                      </p>
                      <p className="text-xs text-muted-foreground max-w-[260px]">
                        {feedTab === "Following"
                          ? "Follow creators to see their posts here."
                          : "Add friends or follow more people to fill this tab."}
                      </p>
                      <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                        <button type="button" onClick={() => setFeedTab("For You")} className="rounded-full bg-ig-gradient text-white text-xs font-bold px-3.5 py-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all">Back to For You</button>
                        <button type="button" onClick={() => navigate("/friend-requests")} className="rounded-full bg-secondary text-foreground text-xs font-bold px-3.5 py-1.5 hover:bg-muted active:scale-95 transition-all">Pending requests</button>
                        <button type="button" onClick={() => navigate("/audio-rooms")} className="rounded-full bg-secondary text-foreground text-xs font-bold px-3.5 py-1.5 hover:bg-muted active:scale-95 transition-all">Live rooms</button>
                      </div>
                    </div>
                    {sidebarDataReady && (
                      <Suspense fallback={null}>
                        <FollowSuggestions />
                      </Suspense>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/70">No posts found</p>
                )}
              </div>
            ) : (
            <div className="divide-y divide-border/20">
              {filteredItems.map((item, idx) => (
                <div key={item.id} data-testid={`feed-post-card-${item.id}`}>
                  {item.source === "poll" && item.poll ? (
                    <div className="px-3 py-2">
                      <Suspense fallback={<div className="h-44 rounded-2xl bg-muted/30 animate-pulse" />}>
                        <PollPostCard
                          id={item.id.replace(/^p-/, "")}
                          question={item.poll.question}
                          options={item.poll.options}
                          pollType={item.poll.poll_type}
                          correctOptionIndex={item.poll.correct_option_index ?? undefined}
                          totalVotes={item.poll.total_votes}
                          expiresAt={item.poll.expires_at ?? null}
                          createdAt={item.created_at}
                          authorName={item.author_name}
                          authorAvatar={item.author_avatar}
                        />
                      </Suspense>
                    </div>
                  ) : (
                    <FeedCard item={item} currentUserId={userId} onOpenFullscreen={() => {
                      rememberReelForReelsTab(item.id);
                      if (item.media_type === 'video') {
                        // Match the portaled viewer's video-only list exactly.
                        const videoItems = items.filter(it => it.media_type === 'video');
                        const videoIdx = videoItems.findIndex(v => v.id === item.id);
                        setReelsStartIndex(videoIdx >= 0 ? videoIdx : 0);
                      } else {
                        setFullscreenIndex(idx);
                      }
                    }} />
                  )}
                  {/* Inject suggested users after 3rd post — hidden on xl+ where
                      the right sidebar shows the same content. */}
                  {sidebarDataReady && idx === 2 && (
                    <div className="xl:hidden">
                      <Suspense fallback={null}><SuggestedUsersCarousel variant="inline" /></Suspense>
                    </div>
                  )}
                  {/* Trending this week — real DB-backed leaderboard, self-hides if no signal. */}
                  {sidebarDataReady && idx === 3 && <Suspense fallback={null}><TrendingCreators /></Suspense>}
                  {/* Inject Communities card after 5th post */}
                  {idx === 4 && (
                    <div className="bg-card border-b border-border/10 px-3 py-3">
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-blue-500" />
                          Groups for you
                        </h3>
                        <button type="button" onClick={() => navigate("/communities")} className="text-[12px] font-semibold text-primary">See all</button>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                        {[
                          { name: "Travel Lovers", members: "12.4k", Icon: Plane, color: "from-sky-500/30 to-blue-500/20", iconColor: "text-sky-600" },
                          { name: "Foodies", members: "8.1k", Icon: UtensilsCrossed, color: "from-amber-500/30 to-orange-400/20", iconColor: "text-amber-600" },
                          { name: "Tech Hub", members: "22k", Icon: Monitor, color: "from-violet-500/30 to-purple-400/20", iconColor: "text-violet-600" },
                          { name: "Photography", members: "6.2k", Icon: Camera, color: "from-rose-500/30 to-pink-400/20", iconColor: "text-rose-600" },
                          { name: "Fitness", members: "15k", Icon: Dumbbell, color: "from-emerald-500/30 to-green-400/20", iconColor: "text-emerald-600" },
                        ].map((group) => (
                          <button type="button"
                            key={group.name}
                            onClick={() => navigate("/communities")}
                            className="shrink-0 flex flex-col items-center gap-1.5 w-[88px] p-2 rounded-xl bg-muted/30 border border-border/20 active:opacity-70"
                          >
                            <div className={`h-11 w-full rounded-lg bg-gradient-to-br ${group.color} flex items-center justify-center`}>
                              <group.Icon className={`h-5 w-5 ${group.iconColor}`} />
                            </div>
                            <p className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-2">{group.name}</p>
                            <p className="text-[9px] text-muted-foreground">{group.members} members</p>
                            <span className="w-full py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold text-center">
                              + Join
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Live Now strip — real DB-backed creators, self-hides if nobody is live. */}
                  {sidebarDataReady && idx === 6 && <Suspense fallback={null}><LiveNowStrip /></Suspense>}
                  {/* Interactive community poll after 9th post */}
                  {idx === 8 && <FeedPollCard />}
                  {/* Trending reels strip — TikTok cross-promotion within feed */}
                  {sidebarDataReady && idx === 5 && <Suspense fallback={null}><ReelsPreviewRow /></Suspense>}
                  {/* Featured creators row — Facebook-style discovery */}
                  {sidebarDataReady && idx === 10 && <Suspense fallback={null}><FeaturedCreatorsRow /></Suspense>}
                  {/* Inject Marketplace banner after 8th post */}
                  {idx === 7 && (
                    <button type="button"
                      onClick={() => navigate("/marketplace")}
                      className="block w-full bg-gradient-to-r from-amber-500/10 via-card to-primary/10 border-b border-border/10 px-3 py-3 text-left active:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                          <Package className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-foreground">Marketplace</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">Buy and sell near you — deals updated daily</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  )}
                  {/* People you may know — real DB-backed component, self-hides if empty.
                      Hidden on xl+ since the right sidebar shows "Suggested for you" there. */}
                  {sidebarDataReady && idx === 9 && (
                    <div className="xl:hidden">
                      <Suspense fallback={null}><FollowSuggestions /></Suspense>
                    </div>
                  )}
                  {/* Inject Events strip after 12th post */}
                  {idx === 11 && (
                    <button type="button"
                      onClick={() => navigate("/explore")}
                      className="block w-full bg-gradient-to-r from-emerald-500/10 via-card to-blue-500/10 border-b border-border/10 px-3 py-3 text-left active:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-foreground">Events Near You</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">Discover what's happening in your area</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  )}
                  {/* Fundraiser card after 14th post */}
                  {idx === 13 && (
                    <button type="button"
                      onClick={() => navigate("/explore")}
                      className="block w-full bg-gradient-to-r from-rose-500/10 via-card to-orange-500/10 border-b border-border/10 px-3 py-3 text-left active:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                          <HandHeart className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-foreground">Fundraisers</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">Support causes your community cares about</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  )}
                  {/* Friend Activity — real DB-backed. Self-hides when followed users
                      have no recent activity. "See all" links to /activity. */}
                  {sidebarDataReady && idx === 17 && <Suspense fallback={null}><FriendActivity /></Suspense>}
                  {/* Inject On This Day memory card after 16th post */}
                  {idx === 15 && (
                    <button type="button"
                      onClick={() => navigate("/saved")}
                      className="block w-full bg-gradient-to-r from-violet-500/10 via-card to-indigo-500/10 border-b border-border/10 px-3 py-3 text-left active:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                          <History className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-[13px] font-bold text-foreground">On This Day</p>
                            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-tight">See memories from this day in past years</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  )}
                </div>
              ))}
              {/* Load-more sentinel — observed to trigger infinite scroll */}
              {pageSize < PAGE_MAX && filteredItems.length >= 10 && (
                <div ref={loadMoreRef} className="py-6 flex justify-center" aria-hidden="true">
                  {isFetching && !isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading more posts…</span>
                    </div>
                  ) : (
                    <div className="h-6" />
                  )}
                </div>
              )}
              {pageSize >= PAGE_MAX && filteredItems.length >= 20 && (() => {
                const uniqueAuthors = new Set(
                  filteredItems
                    .map((p: any) => p.author_id || p.store_slug || p.author_name)
                    .filter(Boolean)
                ).size;
                const videoCount = filteredItems.filter((p: any) => p.media_type === "video").length;
                return (
                <div className="mx-3 my-4 rounded-2xl bg-muted/30 border border-border/20 px-4 py-5 flex flex-col items-center gap-2 text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">You're all caught up</p>
                  <p className="text-[12px] text-muted-foreground leading-snug">You've seen all new posts from the past 3 days.</p>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex flex-col items-center">
                      <span className="text-base font-bold text-foreground">{filteredItems.length}</span>
                      <span className="text-[10px] text-muted-foreground">Posts seen</span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex flex-col items-center">
                      <span className="text-base font-bold text-foreground">{uniqueAuthors}</span>
                      <span className="text-[10px] text-muted-foreground">{uniqueAuthors === 1 ? "Creator" : "Creators"}</span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex flex-col items-center">
                      <span className="text-base font-bold text-foreground">{videoCount}</span>
                      <span className="text-[10px] text-muted-foreground">{videoCount === 1 ? "Video" : "Videos"}</span>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => navigate("/explore")}
                    className="mt-2 px-5 py-2 rounded-full bg-ig-gradient text-white text-[12px] font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    Discover more
                  </button>
                </div>
                );
              })()}
              {/* Spacer so last post clears the fixed bottom nav */}
              <div className="md:hidden zivo-reels-bottom-spacer" aria-hidden="true" />
            </div>
            );
          })()}

          {/* Create Post Modal */}
          <Suspense fallback={null}>
          <AnimatePresence>
            {showCreate && userId && (
              <CreatePostModal
                userId={userId}
                userProfile={userProfile}
                initialCaption={shareForPost ? shareForPost.shareText : undefined}
                sharedMediaUrl={shareForPost?.shareMediaUrl}
                sharedMediaType={shareForPost?.shareMediaType}
                sharedPostId={shareForPost?.sharePostId}
                sharedPostAuthorId={shareForPost?.sharePostAuthorId}
                sharedPostAuthorName={shareForPost?.sharePostAuthorName}
                commerceLinkDraft={commerceDraft || undefined}
                initialMode={createMode}
                onClose={() => { setShowCreate(false); setShareForPost(null); setCommerceDraft(null); setCreateMode(undefined); }}
                onCreated={() => {
                  setShowCreate(false);
                  setShareForPost(null);
                  setCommerceDraft(null);
                  setCreateMode(undefined);
                  setPageSize(INITIAL_REELS_PAGE_SIZE);
                  setNewPostsCount(0);
                  queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
                  // Land the user at the top of the feed so they see the post
                  // they just published, not wherever they were scrolling.
                  requestAnimationFrame(() => {
                    feedTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }}
              />
            )}
          </AnimatePresence>
          </Suspense>

          {/* TikTok/Reels-style Fullscreen Video Viewer.
              Portaled to <body> so the `fixed` positioning escapes
              <PullToRefresh>'s transform (a transformed ancestor would
              otherwise become the containing block and collapse the viewer
              into the middle column on desktop).
              z-[1500] covers NavBar (z-50/1200) and chat hub (z-[1401]). */}
          {reelsStartIndex !== null && typeof document !== "undefined" &&
            createPortal(
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="zivo-reel-no-callout fixed inset-0 z-[1500] bg-black"
                >
                  {/* Snap-scroll container */}
                  <div ref={reelsScrollRef} className="zivo-reel-no-callout h-full w-full overflow-y-scroll snap-y snap-mandatory">
                    {items.filter((it) => it.media_type === 'video').map((item) => (
                      <ReelSlide
                        key={item.id}
                        item={item}
                        currentUserId={userId}
                        onClose={closeReelsViewer}
                      />
                    ))}
                  </div>
                  {/* Always-visible close button — desktop. */}
                  <button
                    type="button"
                    onClick={closeReelsViewer}
                    aria-label="Close reels viewer"
                    title="Close reels viewer"
                    className="hidden lg:flex fixed top-4 right-4 z-[1510] h-11 w-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-xl ring-1 ring-border/50 backdrop-blur-md hover:bg-background transition-colors"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </motion.div>
              </AnimatePresence>,
              document.body,
            )}

          {/* Post Detail Viewer */}
          <AnimatePresence>
            {fullscreenIndex !== null && (() => {
              const post = items[fullscreenIndex];
              if (!post) return null;
              return (
                <PostDetailOverlay onClose={() => setFullscreenIndex(null)}>
                  {(startDrag) => (
                    <>
                      <div
                        data-testid="post-detail-header"
                        className="zivo-pt-safe-overlay touch-none shrink-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 cursor-grab active:cursor-grabbing select-none"
                        onPointerDown={(e) => {
                          const target = e.target as HTMLElement | null;
                          // Don't start drag from interactive children (buttons, links)
                          if (target?.closest('button, a, input, textarea')) return;
                          startDrag(e);
                        }}
                      >
                        <SwipeGrabHandle
                          onStartDrag={startDrag}
                          onClose={() => setFullscreenIndex(null)}
                          tone="dark"
                          testId="post-detail-grab-handle"
                        />
                        <div className="flex items-center gap-3 px-3 pb-2.5">
                          <button type="button"
                            onClick={() => setFullscreenIndex(null)}
                            aria-label="Close post"
                            title="Close post"
                            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-muted/50 active:bg-muted transition-colors"
                          >
                            <XIcon className="h-5 w-5 text-foreground" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (post.source === "store" && post.store_slug) {
                                navigate(`/grocery/shop/${post.store_slug}`);
                              } else if (post.author_id) {
                                navigate(`/user/${post.author_id}`);
                              }
                            }}
                            className="flex-1 flex items-center gap-2.5 min-w-0 text-left rounded-lg px-1 py-0.5 hover:bg-muted/40 active:bg-muted/60 transition-colors"
                            aria-label={`View ${post.author_name}'s profile`}
                            title={`View ${post.author_name}'s profile`}
                          >
                            <div className="h-9 w-9 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border/40">
                              {post.author_avatar ? (
                                <img
                                  src={post.author_avatar}
                                  alt={post.author_name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                  {(post.author_name || "?").slice(0, 1).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 leading-tight">
                              <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                                <span className="truncate">{post.author_name}</span>
                                {isBlueVerified(post.author_is_verified) && <VerifiedBadge size={16} />}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {(() => {
                                  try {
                                    return formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
                                  } catch {
                                    return "recently";
                                  }
                                })()}
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                      <div
                        ref={fullscreenScrollRef}
                        className="zivo-pb-safe-inset touch-pan-y flex-1 min-h-0 overflow-y-auto"
                      >
                        <FeedCard key={post.id} item={post} currentUserId={userId} detailMode />
                      </div>
                    </>
                  )}
                </PostDetailOverlay>
              );
            })()}
          </AnimatePresence>

        </PullToRefresh>

        {/* Desktop RIGHT rail — hidden when chat panel is open to avoid overflow */}
        <aside className={cn(
          "hidden xl:flex flex-col w-[280px] shrink-0 sticky top-[4.5rem] h-[calc(100vh-4.5rem)] overflow-y-auto py-4 px-3 gap-4 border-l border-border/20 bg-background/95",
          chatOpen && "!hidden"
        )}>

          {/* Quick Access — service shortcuts */}
          <div className="shrink-0">
            <h3 className="text-[11px] font-bold text-foreground/55 uppercase tracking-[0.08em] px-1 mb-2.5">Quick Access</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Flights", icon: Plane, path: "/flights", color: "bg-sky-500/15 text-sky-600", ring: "group-hover:ring-sky-500/30" },
                { label: "Hotels", icon: Hotel, path: "/hotels", color: "bg-amber-500/15 text-amber-600", ring: "group-hover:ring-amber-500/30" },
                { label: "Rides", icon: Car, path: "/rides/hub", color: "bg-emerald-500/15 text-emerald-600", ring: "group-hover:ring-emerald-500/30" },
                { label: "Eats", icon: UtensilsCrossed, path: "/eats", color: "bg-orange-500/15 text-orange-600", ring: "group-hover:ring-orange-500/30" },
                { label: "Delivery", icon: Package, path: "/delivery", color: "bg-violet-500/15 text-violet-600", ring: "group-hover:ring-violet-500/30" },
                { label: "Explore", icon: Globe, path: "/explore", color: "bg-primary/15 text-primary", ring: "group-hover:ring-primary/30" },
              ].map(({ label, icon: Icon, path, color, ring }) => (
                <button type="button"
                  key={label}
                  onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-1.5 px-1 py-2.5 rounded-xl hover:bg-muted/50 active:scale-95 transition-all group"
                >
                  <div className={cn(
                    "h-11 w-11 rounded-2xl flex items-center justify-center ring-2 ring-transparent transition-all",
                    color,
                    ring
                  )}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground/75 group-hover:text-foreground transition-colors">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Suggested Users — carousel renders its own "Suggested for you"
              header and returns null when there are no suggestions, so the
              section self-hides on an empty result instead of leaving an
              orphaned heading in the right rail. */}
          {userId && sidebarDataReady && (
            <Suspense fallback={null}>
              <SuggestedUsersCarousel />
            </Suspense>
          )}

          {/* Contacts */}
          {sidebarContacts.length > 0 && (
            <div className="shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-semibold text-foreground">Contacts</h3>
                <button type="button" onClick={() => navigate("/chat/contacts")} className="text-[11px] text-primary hover:underline">See all</button>
              </div>
              <div className="space-y-0.5">
                {sidebarContacts.map((c) => (
                  <button type="button"
                    key={c.id}
                    onClick={() => navigate(`/user/${c.id}`)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative shrink-0">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-muted border border-border/30">
                        {c.avatar ? (
                          <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[11px] font-bold text-muted-foreground bg-primary/10 text-primary">
                            {c.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending */}
          {trendingTags.length > 0 && (
            <div className="shrink-0">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Trending</h3>
              </div>
              <div className="space-y-0.5">
                {trendingTags.map(({ tag, count }) => {
                  const cleanTag = tag.replace("#", "");
                  const active = selectedHashtag === cleanTag;
                  return (
                    <button type="button"
                      key={tag}
                      onClick={() => {
                        setSelectedHashtag(active ? null : cleanTag);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-left",
                        active && "bg-primary/10"
                      )}
                    >
                      <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{cleanTag}</span>
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0 tabular-nums">
                        {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ZIVO+ upgrade card */}
          {userId && (
            <div className="shrink-0 rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Crown className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">ZIVO+</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2.5 leading-relaxed">Unlock exclusive features, locked content, chat tools, and more.</p>
              <button type="button"
                onClick={() => navigate("/zivo-plus")}
                className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-primary text-white text-[12px] font-semibold hover:opacity-90 transition-opacity active:scale-95"
              >
                Upgrade to ZIVO+
              </button>
            </div>
          )}

          {/* Birthdays */}
          <button type="button"
            onClick={() => userId ? navigate("/friends") : goLogin("/friends")}
            className="shrink-0 text-left rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-card to-pink-500/5 p-3 hover:from-rose-500/15 hover:to-pink-500/10 active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-7 w-7 rounded-lg bg-rose-500/15 flex items-center justify-center">
                <Gift className="h-4 w-4 text-rose-500" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">Birthdays</h3>
            </div>
            <p className="text-[12px] text-muted-foreground mb-1.5 leading-snug">See which friends have birthdays today.</p>
            <span className="text-[12px] font-semibold text-rose-500 group-hover:translate-x-0.5 inline-block transition-transform">
              View birthdays →
            </span>
          </button>

          {/* Upcoming Events */}
          <button type="button"
            onClick={() => navigate("/explore")}
            className="shrink-0 text-left rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-sky-500/5 p-3 hover:from-blue-500/15 hover:to-sky-500/10 active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-7 w-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-500" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">Events</h3>
            </div>
            <p className="text-[12px] text-muted-foreground mb-1.5 leading-snug">Discover events happening near you.</p>
            <span className="text-[12px] font-semibold text-blue-500 group-hover:translate-x-0.5 inline-block transition-transform">
              Browse events →
            </span>
          </button>

          <p className="text-[10px] text-muted-foreground/60 mt-auto px-1 pt-2">© ZIVO LLC · hizivo.com</p>
        </aside>

      </div>

      {/* Bottom nav rendered outside PullToRefresh so its `transform` doesn't
          break `position: fixed` (transformed ancestors become the containing block). */}
      <Suspense fallback={null}><ZivoMobileNav /></Suspense>
    </>
  );
}

/* CreatePostModal is now imported from @/components/social/CreatePostModal */

/* ── Reel Slide (TikTok-style fullscreen video) ─────────────────── */

function ReelSlide({ item, currentUserId, onClose }: { item: FeedItem; currentUserId: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const haptic = useHaptic();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(item.likes_count);
  const [localComments, setLocalComments] = useState(item.comments_count);
  const [canCommentAsFriend, setCanCommentAsFriend] = useState(true);
  const [showCaption, setShowCaption] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [holdSpeedActive, setHoldSpeedActive] = useState(false);
  const [speedLocked, setSpeedLocked] = useState(false);
  const [speedHud, setSpeedHud] = useState<{ label: string; detail: string } | null>(null);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [closeSwipeOffset, setCloseSwipeOffset] = useState(0);
  const interactionPostId = getFeedInteractionPostId(item);
  const likesTable = getFeedLikesTable(item);
  const commentSetting = item.comment_control || "everyone";
  const isOwner = Boolean(currentUserId && item.author_id === currentUserId);
  const commentsLimitedToFriends = commentSetting === "friends" && !isOwner && !canCommentAsFriend;
  const canSubmitComment = commentSetting !== "off" && !commentsLimitedToFriends;
  const commentDisabledReason = commentSetting === "off"
    ? "Comments are turned off for this post"
    : commentsLimitedToFriends ? "Only friends can comment on this post" : undefined;
  const isSharedReel = Boolean(item.shared_from_post_id || item.shared_from_user_id);
  const followTargetSource = isSharedReel && item.shared_from_source ? item.shared_from_source : item.source;
  const followTargetUserId = followTargetSource === "user"
    ? ((isSharedReel && item.shared_from_user_id) ? item.shared_from_user_id : item.author_id) || null
    : null;

  // Check follow status on mount
  useEffect(() => {
    if (!currentUserId || !followTargetUserId || followTargetUserId === currentUserId) {
      setIsFollowing(false);
      return;
    }
    supabase.rpc("is_following", { target_user_id: followTargetUserId })
      .then(({ data }) => { if (typeof data === "boolean") setIsFollowing(data); });
  }, [currentUserId, followTargetUserId]);

  useEffect(() => {
    if (
      commentSetting !== "friends" ||
      !currentUserId ||
      !item.author_id ||
      isOwner ||
      item.source !== "user"
    ) {
      setCanCommentAsFriend(true);
      return;
    }

    let alive = true;
    (supabase as any)
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(`and(user_id.eq.${currentUserId},friend_id.eq.${item.author_id}),and(user_id.eq.${item.author_id},friend_id.eq.${currentUserId})`)
      .limit(1)
      .then(({ data, error }: any) => {
        if (!alive) return;
        setCanCommentAsFriend(!error && Boolean(data?.length));
      });

    return () => {
      alive = false;
    };
  }, [commentSetting, currentUserId, isOwner, item.author_id, item.source]);

  const handleReelFollow = async () => {
    if (!followTargetUserId || followLoading) return;
    if (!currentUserId) {
      showGuestActionPrompt("Log in to follow creators", "/feed");
      return;
    }
    if (followTargetUserId === currentUserId) return;
    if (isFollowing) {
      setShowUnfollowConfirm(true);
      return;
    }
    setFollowLoading(true);
    try {
      const { error } = await (supabase as any).from("user_followers").upsert(
        {
          follower_id: currentUserId,
          following_id: followTargetUserId,
        },
        { onConflict: "follower_id,following_id", ignoreDuplicates: true },
      );
      if (error) throw error;
      setIsFollowing(true);
      try {
        const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", currentUserId).single();
        await supabase.functions.invoke("send-push-notification", {
          body: { user_id: followTargetUserId, notification_type: "new_follower", title: "New Follower 🔔", body: `${sp?.full_name || "Someone"} started following you`, data: { type: "new_follower", follower_id: currentUserId, avatar_url: sp?.avatar_url, action_url: `/user/${currentUserId}` } },
        });
      } catch {}
    } catch {
      toast.error("Failed to update follow");
    } finally {
      setFollowLoading(false);
    }
  };

  const executeReelUnfollow = async () => {
    if (!currentUserId || !followTargetUserId) return;
    setFollowLoading(true);
    try {
      await (supabase as any).from("user_followers").delete()
        .eq("follower_id", currentUserId).eq("following_id", followTargetUserId);
      setIsFollowing(false);
    } catch { /* ignore */ } finally {
      setFollowLoading(false);
    }
  };

  const [showComments, setShowComments] = useState(false);
  const mediaPerfLogged = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const singleTapTimerRef = useRef<number | null>(null);
  const speedHudTimerRef = useRef<number | null>(null);
  const doubleTapHeartTimerRef = useRef<number | null>(null);
  const doubleTapLikeInFlightRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number; side: "left" | "right" } | null>(null);
  const gestureRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    moved: false,
    longPress: false,
  });

  useEffect(() => {
    setLocalLikes(item.likes_count);
  }, [item.likes_count]);

  useEffect(() => {
    setLocalComments(item.comments_count);
  }, [item.comments_count]);

  useEffect(() => {
    if (!currentUserId) {
      setLiked(false);
      return;
    }

    let alive = true;
    (supabase as any)
      .from(likesTable)
      .select("id")
      .eq("post_id", interactionPostId)
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (!alive || error) return;
        setLiked(Boolean(data));
      });

    return () => {
      alive = false;
    };
  }, [currentUserId, interactionPostId, likesTable]);

  const mediaUrl = item.media_urls[0];
  const viewTracked = useRef(false);

  // Auto-play when visible via IntersectionObserver.
  // Also fires a one-shot view-count bump the first time the slide becomes
  // visible (different RPC depending on whether it's a store or user post).
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          rememberReelForReelsTab(item.id);
          videoRef.current?.play().catch(() => {});
          setIsPlaying(true);
          if (
            !viewTracked.current &&
            item.source !== "poll" &&
            (item.source === "user" || Boolean(currentUserId))
          ) {
            viewTracked.current = true;
            const rawId = interactionPostId;
            const rpc = item.source === "user" ? "increment_user_post_view_count" : "increment_store_post_view_count";
            supabase.rpc(rpc as any, { p_post_id: rawId }).then(({ error }: any) => {
              if (error) viewTracked.current = false;
            });
          }
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.7 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [currentUserId, interactionPostId, item.id, item.source]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clearSingleTapTimer = useCallback(() => {
    if (singleTapTimerRef.current) {
      window.clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  }, []);

  const showReelHud = useCallback((label: string, detail: string, duration = 1200) => {
    setSpeedHud({ label, detail });
    if (speedHudTimerRef.current) {
      window.clearTimeout(speedHudTimerRef.current);
    }
    speedHudTimerRef.current = window.setTimeout(() => {
      setSpeedHud(null);
      speedHudTimerRef.current = null;
    }, duration);
  }, []);

  const showDoubleTapLikeBurst = useCallback(() => {
    setShowDoubleTapHeart(true);
    if (doubleTapHeartTimerRef.current) {
      window.clearTimeout(doubleTapHeartTimerRef.current);
    }
    doubleTapHeartTimerRef.current = window.setTimeout(() => {
      setShowDoubleTapHeart(false);
      doubleTapHeartTimerRef.current = null;
    }, 650);
  }, []);

  const likeReelFromDoubleTap = useCallback(async () => {
    showDoubleTapLikeBurst();
    haptic(liked ? "light" : "medium");

    if (!currentUserId) {
      showGuestActionPrompt("Log in to like posts", "/feed");
      return;
    }

    if (liked || doubleTapLikeInFlightRef.current) return;
    doubleTapLikeInFlightRef.current = true;
    setLiked(true);
    setLocalLikes((prev) => prev + 1);

    try {
      const { error } = await (supabase as any)
        .from(likesTable)
        .insert({ post_id: interactionPostId, user_id: currentUserId });
      if (error) throw error;

      if (item.author_id && item.author_id !== currentUserId && shouldSendLikeNotification(item.id)) {
        try {
          const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", currentUserId).single();
          await supabase.functions.invoke("send-push-notification", {
            body: { user_id: item.author_id, notification_type: "post_liked", title: "New Like ❤️", body: `${sp?.full_name || "Someone"} liked your post`, data: { type: "post_liked", post_id: item.id, liker_id: currentUserId, action_url: `/reels?post=${item.id}` } },
          });
        } catch {}
      }

      void queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
    } catch {
      setLiked(false);
      setLocalLikes((prev) => Math.max(0, prev - 1));
      toast.error("Failed to update like");
    } finally {
      doubleTapLikeInFlightRef.current = false;
    }
  }, [currentUserId, haptic, interactionPostId, item.author_id, item.id, liked, likesTable, queryClient, showDoubleTapLikeBurst]);

  const handleReelTap = useCallback((x: number, y: number) => {
    const now = Date.now();
    const side = x < window.innerWidth / 2 ? "left" : "right";
    const previous = lastTapRef.current;
    const isDoubleTap = previous
      && previous.side === side
      && now - previous.time < 320
      && Math.hypot(x - previous.x, y - previous.y) < 96;

    if (isDoubleTap) {
      clearSingleTapTimer();
      lastTapRef.current = null;
      void likeReelFromDoubleTap();
      return;
    }

    lastTapRef.current = { time: now, x, y, side };
    clearSingleTapTimer();
    singleTapTimerRef.current = window.setTimeout(() => {
      togglePlay();
      lastTapRef.current = null;
      singleTapTimerRef.current = null;
    }, 260);
  }, [clearSingleTapTimer, likeReelFromDoubleTap, togglePlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speedLocked || holdSpeedActive ? 2 : 1;
  }, [holdSpeedActive, speedLocked]);

  useEffect(() => () => {
    clearLongPressTimer();
    clearSingleTapTimer();
    if (speedHudTimerRef.current) {
      window.clearTimeout(speedHudTimerRef.current);
    }
    if (doubleTapHeartTimerRef.current) {
      window.clearTimeout(doubleTapHeartTimerRef.current);
    }
  }, [clearLongPressTimer, clearSingleTapTimer]);

  const handleGesturePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      longPress: false,
    };
    setCloseSwipeOffset(0);

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      if (gestureRef.current.pointerId !== event.pointerId) return;
      gestureRef.current.longPress = true;
      setHoldSpeedActive(true);
      videoRef.current?.play().catch(() => {});
      setIsPlaying(true);
      haptic("light");
      showReelHud(
        speedLocked ? "2x locked" : "2x",
        speedLocked ? "Swipe up for 1x" : "Hold speed - drag down to lock",
        1600
      );
    }, 240);
  }, [clearLongPressTimer, haptic, showReelHud, speedLocked]);

  const handleGesturePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const distance = Math.hypot(dx, dy);
    if (distance > 10) {
      gesture.moved = true;
    }

    if (!gesture.longPress) {
      const isRightCloseSwipe = dx > 18 && Math.abs(dx) > Math.abs(dy) * 1.2;
      if (distance > 14) clearLongPressTimer();
      if (isRightCloseSwipe) {
        event.preventDefault();
        setCloseSwipeOffset(Math.min(dx, REEL_CLOSE_SWIPE_MAX_OFFSET));
      } else if (closeSwipeOffset > 0) {
        setCloseSwipeOffset(0);
      }
      return;
    }

    event.preventDefault();

    if (dy > 58 && !speedLocked) {
      setSpeedLocked(true);
      setHoldSpeedActive(false);
      haptic("medium");
      showReelHud("2x locked", "Swipe up while holding for 1x", 1600);
      return;
    }

    if (dy < -58 && (speedLocked || holdSpeedActive)) {
      setSpeedLocked(false);
      setHoldSpeedActive(false);
      haptic("selection");
      showReelHud("1x", "Normal speed", 1000);
    }
  }, [clearLongPressTimer, closeSwipeOffset, haptic, holdSpeedActive, showReelHud, speedLocked]);

  const handleGesturePointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const isCloseSwipe = dx >= REEL_CLOSE_SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2;

    clearLongPressTimer();
    gestureRef.current.pointerId = -1;

    if (isCloseSwipe) {
      clearSingleTapTimer();
      setCloseSwipeOffset(0);
      haptic("light");
      onClose();
      return;
    }
    if (closeSwipeOffset > 0) {
      setCloseSwipeOffset(0);
    }

    if (gesture.longPress) {
      clearSingleTapTimer();
      if (!speedLocked) setHoldSpeedActive(false);
      return;
    }

    if (!gesture.moved) {
      handleReelTap(event.clientX, event.clientY);
    }
  }, [clearLongPressTimer, clearSingleTapTimer, closeSwipeOffset, handleReelTap, haptic, onClose, speedLocked]);

  const handleGesturePointerCancel = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== event.pointerId) return;

    clearLongPressTimer();
    clearSingleTapTimer();
    gestureRef.current.pointerId = -1;
    setCloseSwipeOffset(0);
    if (gesture.longPress && !speedLocked) {
      setHoldSpeedActive(false);
    }
  }, [clearLongPressTimer, clearSingleTapTimer, speedLocked]);

  const handleLike = async () => {
    if (!currentUserId) {
      showGuestActionPrompt("Log in to like posts", "/feed");
      return;
    }

    const newLiked = !liked;
    haptic(newLiked ? "medium" : "light");
    setLiked(newLiked);
    setLocalLikes((prev) => Math.max(0, prev + (newLiked ? 1 : -1)));

    try {
      if (newLiked) {
        const { error } = await (supabase as any)
          .from(likesTable)
          .insert({ post_id: interactionPostId, user_id: currentUserId });
        if (error) throw error;
        // Push notification to post author — once per post per session.
        if (item.author_id && item.author_id !== currentUserId && shouldSendLikeNotification(item.id)) {
          try {
            const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", currentUserId).single();
            await supabase.functions.invoke("send-push-notification", {
              body: { user_id: item.author_id, notification_type: "post_liked", title: "New Like ❤️", body: `${sp?.full_name || "Someone"} liked your post`, data: { type: "post_liked", post_id: item.id, liker_id: currentUserId, action_url: `/reels?post=${item.id}` } },
            });
          } catch {}
        }
      } else {
        const { error } = await (supabase as any)
          .from(likesTable)
          .delete()
          .eq("post_id", interactionPostId)
          .eq("user_id", currentUserId);
        if (error) throw error;
      }

      void queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
    } catch {
      setLiked(!newLiked);
      setLocalLikes((prev) => Math.max(0, prev - (newLiked ? 1 : -1)));
      toast.error("Failed to update like");
    }
  };

  // Comments are now handled by CommentsSheet


  const shareUrl = getPostShareUrl(getReelsSharePostId(item));
  const shareText = encodeURIComponent(item.caption || `Check out this post by ${item.author_name}`);
  const shareEncodedUrl = encodeURIComponent(shareUrl);

  const handleCopyLink = async () => {
    try {
      await copyText(shareUrl);
      toast.success("Link copied!");
      const recorded = await recordShareForFeedItem(item, "copy_link");
      if (recorded) void queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
    } catch {
      toast.info("Long-press URL bar to copy");
    }
    setShowShareSheet(false);
  };

  const handleBuyNow = async () => {
    const commerce = item.commerce_link;
    if (!commerce) return;

    const checkoutPath = commerce.checkout_path
      || (commerce.link_type === "store_product" && commerce.store_product_id
        ? `/grocery/shop/${item.store_slug || ""}?buy=${commerce.store_product_id}`
        : commerce.link_type === "truck_sale" && commerce.truck_sale_id
          ? `/marketplace?truckSale=${commerce.truck_sale_id}`
          : null);

    if (!checkoutPath) {
      toast.error("Checkout path is not configured for this reel");
      return;
    }

    await trackInitiateCheckout({
      eventId: `${item.id}-buy-now-${Date.now()}`,
      externalId: currentUserId || undefined,
      sourceType: commerce.link_type,
      sourceTable: "social_reel_links",
      sourceId: item.id,
      payload: {
        post_id: item.id,
        store_product_id: commerce.store_product_id,
        truck_sale_id: commerce.truck_sale_id,
      },
    });

    onClose();
    navigate(checkoutPath);
  };

  const shareOptions = [
    { label: "WhatsApp", color: "#25D366", svg: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.531 3.488 11.821 11.821 0 0012.05 0zm0 21.785a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.86 9.86 0 012.15 11.892C2.15 6.443 6.602 1.992 12.053 1.992a9.84 9.84 0 016.988 2.899 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.9-9.884 9.9z", url: `https://wa.me/?text=${shareText}%20${shareEncodedUrl}` },
    { label: "Telegram", color: "#0088CC", svg: "M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm5.091 8.104l-1.681 7.927c-.128.564-.46.701-.931.437l-2.57-1.894-1.24 1.193c-.137.137-.253.253-.519.253l.185-2.618 4.763-4.303c.207-.184-.045-.286-.321-.102l-5.889 3.71-2.537-.793c-.552-.172-.563-.552.115-.817l9.915-3.822c.459-.166.861.112.71.827z", url: `https://t.me/share/url?url=${shareEncodedUrl}&text=${shareText}` },
    { label: "Facebook", color: "#1877F2", svg: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z", url: `https://www.facebook.com/sharer/sharer.php?u=${shareEncodedUrl}` },
    { label: "X", color: "#000000", svg: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z", url: `https://x.com/intent/tweet?text=${shareText}&url=${shareEncodedUrl}` },
    { label: "Email", color: "#EA4335", svg: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z", url: `mailto:?subject=${shareText}&body=${shareEncodedUrl}` },
    { label: "SMS", color: "#34B7F1", svg: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z", url: `sms:?body=${shareText}%20${shareEncodedUrl}` },
  ];

  const moreShareOptions = [
    { label: "TikTok", color: "#000000", svg: "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z", url: "__copy__", copyMessage: "Link copied! Paste it in TikTok" },
    { label: "Instagram", color: "#E4405F", svg: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z", url: "__copy__", copyMessage: "Link copied! Paste it in Instagram" },
    { label: "Snapchat", color: "#FFFC00", svg: "M12 0c-1.62 0-3.066.612-4.152 1.612C6.726 2.726 6.12 4.26 6.12 5.88c0 .66.108 1.32.264 1.956-.132.024-.276.036-.42.036-.384 0-.756-.108-1.08-.3a.636.636 0 00-.336-.096c-.264 0-.492.168-.564.42-.06.204-.012.408.12.564.516.588 1.2.96 1.944 1.14-.06.36-.18.708-.36 1.02-.36.636-.924 1.128-1.608 1.404a.648.648 0 00-.384.588c0 .24.132.456.336.576.66.384 1.38.576 2.1.612.072.324.156.66.264.984.06.18.252.3.444.3h.06c.468-.072 1.008-.156 1.536-.156.396 0 .78.048 1.14.192.516.204 1.044.54 1.74.54h.048c.696 0 1.224-.336 1.74-.54.36-.144.744-.192 1.14-.192.528 0 1.068.084 1.536.156h.06c.192 0 .384-.12.444-.3.108-.324.192-.66.264-.984.72-.036 1.44-.228 2.1-.612a.648.648 0 00.336-.576.648.648 0 00-.384-.588c-.684-.276-1.248-.768-1.608-1.404a3.588 3.588 0 01-.36-1.02c.744-.18 1.428-.552 1.944-1.14a.636.636 0 00.12-.564.588.588 0 00-.564-.42.636.636 0 00-.336.096c-.324.192-.696.3-1.08.3-.144 0-.288-.012-.42-.036.156-.636.264-1.296.264-1.956 0-1.62-.612-3.156-1.728-4.272C15.066.612 13.62 0 12 0z", url: `https://www.snapchat.com/scan?attachmentUrl=${shareEncodedUrl}` },
    { label: "LinkedIn", color: "#0A66C2", svg: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z", url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareEncodedUrl}` },
  ];

  return (
    <div
      ref={containerRef}
      className="zivo-reel-no-callout relative h-[100dvh] lg:h-full w-full snap-start snap-always flex-shrink-0"
      onContextMenu={(event) => event.preventDefault()}
      style={{
        transform: closeSwipeOffset ? `translateX(${closeSwipeOffset}px)` : undefined,
        opacity: closeSwipeOffset ? Math.max(0.82, 1 - closeSwipeOffset / 520) : undefined,
        transition: closeSwipeOffset ? "none" : "transform 180ms ease-out, opacity 180ms ease-out",
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={mediaUrl}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={() => {
          if (mediaPerfLogged.current || reelsFirstMediaMetadataLogged) return;
          mediaPerfLogged.current = true;
          reelsFirstMediaMetadataLogged = true;
          perfLog("reels first media metadata", {
            postId: item.id,
            source: item.source,
          });
        }}
        className="h-full w-full object-cover bg-black"
      />

      <div
        aria-label="Reel playback gestures"
        className="absolute inset-0 cursor-pointer touch-manipulation"
        onPointerDown={handleGesturePointerDown}
        onPointerMove={handleGesturePointerMove}
        onPointerUp={handleGesturePointerEnd}
        onPointerCancel={handleGesturePointerCancel}
      />

      {/* Speed HUD */}
      <AnimatePresence>
        {(speedHud || holdSpeedActive || speedLocked) && (
          <motion.div
            key={`${speedHud?.label ?? (speedLocked ? "2x locked" : "2x")}-${speedHud?.detail ?? ""}`}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-none absolute left-1/2 top-[18%] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-white shadow-xl backdrop-blur-md"
          >
            {speedLocked ? <Lock className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            <span className="text-sm font-black tracking-wide">
              {speedHud?.label ?? (speedLocked ? "2x locked" : "2x")}
            </span>
            <span className="text-[11px] font-medium text-white/75">
              {speedHud?.detail ?? (speedLocked ? "Swipe up for 1x" : "Hold speed")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="h-20 w-20 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-10 w-10 text-white fill-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap like feedback */}
      <AnimatePresence>
        {showDoubleTapHeart && (
          <motion.div
            initial={{ opacity: 0, scale: 0.45 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.35 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <Heart className="h-24 w-24 fill-red-500 text-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close button - top left, safe-area aware */}
      <button type="button"
        onClick={onClose}
        aria-label="Close"
        title="Close"
        data-testid="reel-close-button"
        className="zivo-reel-close-offset absolute h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
      >
        <XIcon className="h-5 w-5 text-white" />
      </button>

      {/* Right side action buttons */}
      <div
        className="zivo-reel-actions-offset absolute right-3 flex flex-col items-center gap-4"
      >
        {/* Mute */}
        <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute reel" : "Mute reel"} title={muted ? "Unmute reel" : "Mute reel"} className="flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center">
          <div className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            {muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
          </div>
        </button>

        {/* Like */}
        <button type="button" onClick={handleLike} aria-label={liked ? "Unlike reel" : "Like reel"} title={liked ? "Unlike reel" : "Like reel"} className="flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center">
          <Heart className={cn("h-7 w-7 drop-shadow-lg transition-all", liked ? "text-red-500 fill-red-500 scale-110" : "text-white")} />
          {!item.hide_like_counts && (
            <span className="text-white text-[11px] font-semibold drop-shadow">
              {formatCount(localLikes) ?? "0"}
            </span>
          )}
        </button>

        {/* Comment */}
        <button type="button"
          onClick={() => {
            if (commentSetting === "off") { toast.error("Comments are turned off for this post"); return; }
            if (!currentUserId) { showGuestActionPrompt("Log in to comment", "/feed"); return; }
            if (commentsLimitedToFriends) { toast.error("Only friends can comment on this post"); return; }
            setShowComments(true);
          }}
          aria-label="Open comments"
          title="Open comments"
          className="flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
        >
          <MessageCircle className="h-7 w-7 text-white drop-shadow-lg" />
          <span className="text-white text-[11px] font-semibold drop-shadow">
            {localComments > 999 ? `${(localComments / 1000).toFixed(1)}k` : localComments}
          </span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1">
          <Eye className="h-6 w-6 text-white/70 drop-shadow-lg" />
          <span className="text-white/70 text-[11px] font-semibold drop-shadow">
            {item.views_count > 999 ? `${(item.views_count / 1000).toFixed(1)}k` : item.views_count}
          </span>
        </div>

        {/* Watch Party — video posts only */}
        {item.media_type === "video" && (
          <button type="button"
            onClick={async () => {
              try {
                await copyText(shareUrl);
              } catch {
                toast.info("Long-press URL bar to copy");
                return;
              }
              void recordShareForFeedItem(item, "copy_link").then((recorded) => {
                if (recorded) void queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
              });
              toast.success("Watch Party link copied — send it to friends");
            }}
            aria-label="Copy watch party link"
            title="Copy watch party link"
            className="flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
          >
            <Tv2 className="h-7 w-7 text-white drop-shadow-lg" />
            <span className="text-white text-[10px] font-medium drop-shadow">Party</span>
          </button>
        )}

        {/* Share */}
        <button type="button"
          onClick={async () => {
            const text = item.caption || `Check out this post by ${item.author_name}`;
            try {
              const result = await shareContent({ title: "ZIVO", text, url: shareUrl });
              if (result.cancelled) return;
              if (result.shared) {
                const recorded = await recordShareForFeedItem(item, "native");
                if (recorded) void queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
                return;
              }
            } catch (e: any) {
              if (e?.name === "AbortError") return;
            }
            setShowShareSheet(true);
          }}
          aria-label="Share reel"
          title="Share reel"
          className="flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
        >
          <Send className="h-7 w-7 text-white drop-shadow-lg" />
          <span className="text-white text-[10px] font-medium drop-shadow">Share</span>
        </button>

        {item.commerce_link && (
          <button type="button" onClick={handleBuyNow} className="flex flex-col items-center gap-1 min-h-[44px] min-w-[44px] justify-center" title="Buy now">
            <div className="px-2.5 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-lg">
              Buy Now
            </div>
          </button>
        )}

        {/* Author avatar with Follow badge — show original creator for shared posts */}
        {(() => {
          const isShared = Boolean(item.shared_from_post_id || item.shared_from_user_id);
          const displayAvatar = isShared && item.shared_from_user_avatar ? item.shared_from_user_avatar : item.author_avatar;
          const displayName = isShared && item.shared_from_user_name ? item.shared_from_user_name : item.author_name;
          const displayAuthorId = isShared && item.shared_from_user_id ? item.shared_from_user_id : item.author_id;
          const displayStoreSlug = isShared && item.shared_from_store_slug ? item.shared_from_store_slug : item.store_slug;
          const displaySource = isShared && item.shared_from_source ? item.shared_from_source : item.source;

          return (
            <div className="relative">
              <button type="button"
                onClick={() => {
                  onClose();
                  if (displaySource === "store" && displayStoreSlug) {
                    navigate(`/grocery/shop/${displayStoreSlug}`);
                  } else if (displayAuthorId) {
                    navigate(`/user/${displayAuthorId}`);
                  }
                }}
              >
                <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-white shrink-0">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-full w-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                      {displayName[0]}
                    </div>
                  )}
                </div>
              </button>
              {/* Follow button */}
              {displaySource === "user" && displayAuthorId && displayAuthorId !== currentUserId && (
                <button type="button"
                  onClick={handleReelFollow}
                  disabled={followLoading}
                  aria-label={isFollowing ? "Unfollow creator" : "Follow creator"}
                  title={isFollowing ? "Unfollow creator" : "Follow creator"}
                  className={cn(
                    "absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full flex items-center justify-center shadow-lg ring-2 ring-background",
                    isFollowing ? "bg-muted" : "bg-ig-gradient"
                  )}
                >
                  {followLoading ? (
                    <Loader2 className={cn("h-2.5 w-2.5 animate-spin", isFollowing ? "text-primary-foreground" : "text-white")} />
                  ) : isFollowing ? (
                    <UserCheck className="h-2.5 w-2.5 text-primary-foreground" />
                  ) : (
                    <Plus className="h-3 w-3 text-white" strokeWidth={3} />
                  )}
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Floating Product Card — "Buy from [Shop] - Xkm away" */}
      {item.commerce_link && (
        <div
          className="zivo-reel-product-offset absolute left-4 right-20"
        >
          <Suspense fallback={null}>
            <FloatingProductCard
              commerceLink={item.commerce_link}
              shopName={item.author_name}
              storeSlug={item.store_slug}
              postId={item.id}
              currentUserId={currentUserId}
              onNavigate={onClose}
            />
          </Suspense>
        </div>
      )}


      <div
        className="zivo-reel-caption-offset absolute left-0 right-16 bottom-0 px-4"
      >
        {/* Author info — show original creator for shared posts */}
        {(() => {
          const isShared = Boolean(item.shared_from_post_id || item.shared_from_user_id);
          const displayAvatar = isShared && item.shared_from_user_avatar ? item.shared_from_user_avatar : item.author_avatar;
          const displayName = isShared && item.shared_from_user_name ? item.shared_from_user_name : item.author_name;
          const displayAuthorId = isShared && item.shared_from_user_id ? item.shared_from_user_id : item.author_id;
          const displayStoreSlug = isShared && item.shared_from_store_slug ? item.shared_from_store_slug : item.store_slug;
          const displaySource = isShared && item.shared_from_source ? item.shared_from_source : item.source;

          return (
            <>
              <div className="mb-1 flex items-center gap-2">
                <button type="button"
                  onClick={() => {
                    onClose();
                    if (displaySource === "store" && displayStoreSlug) {
                      navigate(`/grocery/shop/${displayStoreSlug}`);
                    } else if (displayAuthorId) {
                      navigate(`/user/${displayAuthorId}`);
                    }
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                >
                  <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white/40 shrink-0">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="h-full w-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                        {displayName[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-white text-sm font-bold drop-shadow-lg">{displayName}</p>
                    <p className="text-white/60 text-[10px] drop-shadow"><RelativeTime date={item.created_at} /></p>
                  </div>
                </button>
                {/* Follow button next to author */}
                {displaySource === "user" && displayAuthorId && displayAuthorId !== currentUserId && (
                  <button type="button"
                    onClick={handleReelFollow}
                    disabled={followLoading}
                    aria-label={isFollowing ? "Unfollow creator" : "Follow creator"}
                    title={isFollowing ? "Unfollow creator" : "Follow creator"}
                    className={cn(
                      "shrink-0 px-4 py-1 rounded-md text-xs font-bold transition-all hover:opacity-90",
                      isFollowing
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-ig-gradient text-white shadow-sm"
                    )}
                  >
                    {followLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
              {/* "Shared by" indicator */}
              {isShared && (
                <p className="text-white/50 text-[11px] mb-1 drop-shadow flex items-center gap-1">
                  <Share2 className="h-3 w-3" />
                  Shared by {item.author_name}{isBlueVerified(item.author_is_verified) && <VerifiedBadge size={11} className="ml-0.5" interactive={false} />}
                </p>
              )}
            </>
          );
        })()}

        {/* Caption */}
        {item.caption && (
          <CollapsibleCaption
            text={item.caption}
            lines={2}
            variant="overlay"
            className="text-[13px]"
          >
            <Suspense fallback={<span>{item.caption}</span>}>
              <SafeCaption text={item.caption} />
            </Suspense>
          </CollapsibleCaption>
        )}

        {/* Sound ticker */}
        {item.media_type === "video" && (
          <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
            <div className="flex items-center justify-center h-4 w-4 shrink-0">
              <Radio className="h-3.5 w-3.5 text-white/70" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white/70 text-[11px] whitespace-nowrap">
                Original Sound - {item.author_name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Comments Bottom Sheet — only mount when open */}
      {showComments && (
        <Suspense fallback={null}>
          <CommentsSheet
            open
            onClose={() => {
              setShowComments(false);
              void queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
            }}
            postId={interactionPostId}
            postSource={item.source === "poll" ? "user" : item.source}
            currentUserId={currentUserId}
            commentsCount={localComments}
            onCommentsCountChange={setLocalComments}
            canComment={canSubmitComment}
            disabledReason={commentDisabledReason}
            dark
          />
        </Suspense>
      )}

      {/* Share Sheet */}
      <AnimatePresence>
        {showShareSheet && (
           <Suspense fallback={null}>
             <UnifiedShareSheet
              shareUrl={shareUrl}
              shareText={item.caption || `Check out this post by ${item.author_name}`}
              shareMediaUrl={mediaUrl}
              shareMediaType={item.media_type === "video" ? "video" : "image"}
              sharePostId={item.shared_from_post_id ? item.shared_from_post_id : item.id.replace(/^u-/, "")}
              postSource={item.shared_from_source ?? (item.source === "store" ? "store" : "user")}
              sharePostAuthorId={item.shared_from_user_id || item.author_id}
              sharePostAuthorName={item.shared_from_user_name || item.author_name}
              onClose={() => setShowShareSheet(false)}
              onShareRecorded={() => {
                void queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
              }}
              positioning="absolute"
              zIndex={80}
              onVisitProfile={() => {
                onClose();
                const isShared = !!item.shared_from_post_id;
                const profileSource = isShared && item.shared_from_source ? item.shared_from_source : item.source;
                const profileStoreSlug = isShared && item.shared_from_store_slug ? item.shared_from_store_slug : item.store_slug;
                const profileAuthorId = isShared && item.shared_from_user_id ? item.shared_from_user_id : item.author_id;

                if (profileSource === "store" && profileStoreSlug) {
                  navigate(`/grocery/shop/${profileStoreSlug}`);
                } else if (profileAuthorId) {
                  navigate(`/user/${profileAuthorId}`);
                }
              }}
              visitProfileLabel={(() => {
                const isShared = !!item.shared_from_post_id;
                const displayName = isShared && item.shared_from_user_name ? item.shared_from_user_name : item.author_name;
                return displayName || "Visit Profile";
              })()}
            />
           </Suspense>
        )}
      </AnimatePresence>
      {/* Unfollow confirm dialog */}
      {showUnfollowConfirm && (
        <Suspense fallback={null}>
          <AlertDialog open={showUnfollowConfirm} onOpenChange={setShowUnfollowConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unfollow?</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to unfollow {item.author_name}?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { executeReelUnfollow(); setShowUnfollowConfirm(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, unfollow</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Suspense>
      )}
    </div>
  );
}

/* ── Between-post interactive poll card ─────────────────────────── */
function FeedPollCard() {
  const [voted, setVoted] = useState<number | null>(null);
  const options = [
    { label: "Street food", votes: 1842 },
    { label: "Fine dining", votes: 976 },
  ];
  const total = options.reduce((s, o) => s + o.votes + (voted !== null ? 0 : 0), 0);
  return (
    <div className="bg-card border-b border-border/10 px-3 py-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0">
          <BarChart2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-foreground">Quick Poll</p>
          <p className="text-[10px] text-muted-foreground">ZIVO Community · {(total / 1000).toFixed(1)}k votes</p>
        </div>
      </div>
      <p className="text-[14px] font-semibold text-foreground mb-3">What's your go-to food experience?</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const pct = Math.round(((opt.votes + (voted === i ? 1 : 0)) / (total + (voted !== null ? 1 : 0))) * 100);
          return (
            <button type="button"
              key={opt.label}
              onClick={() => setVoted(i)}
              disabled={voted !== null}
              className={cn(
                "relative w-full text-left px-3 py-2.5 rounded-xl border overflow-hidden transition-all active:scale-[0.98]",
                voted === i ? "border-primary" : "border-border/40",
                voted !== null ? "cursor-default" : "hover:border-primary/50",
              )}
            >
              {voted !== null && (
                <motion.div
                  className={cn("absolute inset-y-0 left-0 right-0 origin-left rounded-xl", voted === i ? "bg-primary/15" : "bg-muted/40")}
                  initial={false}
                  animate={{ scaleX: pct / 100 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className={cn("text-[13px] font-semibold", voted === i ? "text-primary" : "text-foreground")}>{opt.label}</span>
                {voted !== null && <span className="text-[12px] font-bold text-muted-foreground">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
      {voted !== null && (
        <p className="text-[11px] text-muted-foreground mt-2 text-center">Thanks for voting!</p>
      )}
    </div>
  );
}

/* ── Individual Feed Card (IG/FB style) ──────────────────────────── */

// Memoized so tab switches / parent state changes don't re-render every visible
// card. Cards re-render only when their own item identity changes or when
// currentUserId / autoPlayVideo / detailMode flips.
const FeedCard = memo(function FeedCard({ item, currentUserId, onOpenFullscreen, autoPlayVideo, detailMode }: { item: FeedItem; currentUserId: string | null; onOpenFullscreen?: () => void; autoPlayVideo?: boolean; detailMode?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hiddenPosts = useHiddenPosts(currentUserId);
  const sensitiveMediaPreference = useSensitiveMediaPreference(currentUserId);
  const haptic = useHaptic();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportStep, setReportStep] = useState<"categories" | "sub" | "submitted">("categories");
  const [reportCategory, setReportCategory] = useState("");
  const [commentSetting, setCommentSetting] = useState<"everyone" | "friends" | "off">(item.comment_control || "everyone");
  const [showCommentSettings, setShowCommentSettings] = useState(false);
  const [localLikes, setLocalLikes] = useState(item.likes_count);
  const [localComments, setLocalComments] = useState(item.comments_count);
  const [localShares, setLocalShares] = useState(item.shares_count);
  const [canCommentAsFriend, setCanCommentAsFriend] = useState(true);
  // Real "Liked by [name]" social proof — loaded async per post. The previous
  // implementation seeded a name from a hardcoded ["Sarah K.", ...] mock, so
  // every post displayed a fake liker even when the actual liker was the
  // viewer themselves. We now look up the most recent real liker; falls back
  // to "Liked by N people" if no name resolves.
  const [topLikerName, setTopLikerName] = useState<string | null>(null);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [doubleTapPoint, setDoubleTapPoint] = useState<{ x: number; y: number } | null>(null);
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState(item.caption || "");
  const [editSaving, setEditSaving] = useState(false);
  const [tipTarget, setTipTarget] = useState<{ id: string; name: string } | null>(null);
  const [translatedCaption, setTranslatedCaption] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [isFollowingSharedAuthor, setIsFollowingSharedAuthor] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [showSharedUnfollowConfirm, setShowSharedUnfollowConfirm] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  // Natural video aspect ratio (W/H), populated from onLoadedMetadata so the
  // card's media well matches the video instead of forcing 9:16 — fixes
  // landscape/square clips showing huge black bars top/bottom.
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  // Long-press on Like opens the FB-style reaction picker; when it fires we
  // suppress the trailing click so the post doesn't also get a plain Like.
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const feedTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedHeartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedLikeInFlight = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const handleTouchEnd = () => {
    if (item.media_urls.length <= 1) return;
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current < 0 && currentMedia < item.media_urls.length - 1) {
        setCurrentMedia(currentMedia + 1);
      } else if (touchDeltaX.current > 0 && currentMedia > 0) {
        setCurrentMedia(currentMedia - 1);
      }
    }
    touchDeltaX.current = 0;
  };
  const lastTapRef = useRef(0);

  const isOwner = Boolean(currentUserId && item.author_id === currentUserId);
  const sharedAuthorId = item.shared_from_source === "user" ? item.shared_from_user_id || null : null;
  const sharedAuthorName = item.shared_from_user_name || "this creator";
  const isSharedAuthorOwner = Boolean(currentUserId && sharedAuthorId === currentUserId);
  const interactionPostId = getFeedInteractionPostId(item);
  const likesTable = getFeedLikesTable(item);
  const notificationKey = item.source === "poll" ? null : `${item.source}:${interactionPostId}`;
  const [notificationsOn, setNotificationsOnPersisted] = useFeedPostNotificationState(currentUserId, notificationKey);

  useEffect(() => {
    setLocalLikes(item.likes_count);
  }, [item.likes_count]);

  useEffect(() => {
    setLocalComments(item.comments_count);
  }, [item.comments_count]);

  useEffect(() => {
    setLocalShares(item.shares_count);
  }, [item.shares_count]);

  useEffect(() => {
    setCommentSetting(item.comment_control || "everyone");
  }, [item.comment_control]);

  useEffect(() => {
    if (
      commentSetting !== "friends" ||
      !currentUserId ||
      !item.author_id ||
      isOwner ||
      item.source !== "user"
    ) {
      setCanCommentAsFriend(true);
      return;
    }

    let alive = true;
    (supabase as any)
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(`and(user_id.eq.${currentUserId},friend_id.eq.${item.author_id}),and(user_id.eq.${item.author_id},friend_id.eq.${currentUserId})`)
      .limit(1)
      .then(({ data, error }: any) => {
        if (!alive) return;
        setCanCommentAsFriend(!error && Boolean(data?.length));
      });

    return () => {
      alive = false;
    };
  }, [commentSetting, currentUserId, isOwner, item.author_id, item.source]);

  useEffect(() => {
    if (!currentUserId) {
      setLiked(false);
      return;
    }

    let alive = true;
    (supabase as any)
      .from(likesTable)
      .select("id")
      .eq("post_id", interactionPostId)
      .eq("user_id", currentUserId)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (!alive || error) return;
        setLiked(Boolean(data));
      });

    return () => {
      alive = false;
    };
  }, [currentUserId, interactionPostId, likesTable]);

  // Load initial bookmark state from post_bookmarks (matches usePostActions hook).
  // Polls aren't bookmarkable yet — the table's source CHECK only allows store/user.
  useEffect(() => {
    if (!currentUserId || item.source === "poll") return;
    let alive = true;
    Promise.all([
      (supabase as any)
        .from("post_bookmarks")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("post_id", interactionPostId)
        .eq("source", item.source)
        .maybeSingle(),
      (supabase as any)
        .from("bookmarks")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("item_type", "post")
        .in("item_id", Array.from(new Set([item.id, interactionPostId])))
        .limit(1),
    ]).then(([modern, legacy]: any[]) => {
        if (alive) setSaved(Boolean(modern.data || legacy.data?.length));
      });
    return () => { alive = false; };
  }, [currentUserId, interactionPostId, item.id, item.source]);

  // Hydrate this user's existing emoji reaction for this post (post_reactions)
  useEffect(() => {
    if (!POST_REACTIONS_ENABLED) return;
    if (!currentUserId || item.source === "poll") return;
    let alive = true;
    (supabase as any)
      .from("post_reactions")
      .select("emoji")
      .eq("user_id", currentUserId)
      .eq("post_id", interactionPostId)
      .eq("source", item.source)
      .maybeSingle()
      .then(({ data }: any) => {
        if (alive && data?.emoji) setSelectedReaction(data.emoji);
      });
    return () => { alive = false; };
  }, [currentUserId, interactionPostId, item.source]);

  // Check follow status
  useEffect(() => {
    if (!currentUserId || !item.author_id || isOwner) return;
    supabase.rpc("is_following" as any, { target_user_id: item.author_id })
      .then(({ data }: any) => { if (typeof data === "boolean") setIsFollowingAuthor(data); });
  }, [currentUserId, item.author_id, isOwner]);

  useEffect(() => {
    if (!currentUserId || !sharedAuthorId || isSharedAuthorOwner) {
      setIsFollowingSharedAuthor(false);
      return;
    }
    supabase.rpc("is_following" as any, { target_user_id: sharedAuthorId })
      .then(({ data }: any) => { if (typeof data === "boolean") setIsFollowingSharedAuthor(data); });
  }, [currentUserId, sharedAuthorId, isSharedAuthorOwner]);

  const sendFollowNotification = async (targetUserId: string) => {
    try {
      const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", currentUserId).single();
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: targetUserId,
          notification_type: "new_follower",
          title: "New Follower 🔔",
          body: `${sp?.full_name || "Someone"} started following you`,
          data: {
            type: "new_follower",
            follower_id: currentUserId,
            avatar_url: sp?.avatar_url,
            action_url: `/user/${currentUserId}`,
          },
        },
      });
    } catch {
      // ignore notification failures
    }
  };

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.author_id || followLoading) return;
    if (!currentUserId) {
      showGuestActionPrompt("Log in to follow creators", "/feed");
      return;
    }
    if (isFollowingAuthor) {
      setShowUnfollowConfirm(true);
      return;
    }
    setFollowLoading(true);
    try {
      const { error } = await (supabase as any).from("user_followers").upsert(
        {
          follower_id: currentUserId,
          following_id: item.author_id,
        },
        { onConflict: "follower_id,following_id", ignoreDuplicates: true },
      );
      if (error) throw error;
      setIsFollowingAuthor(true);
      await sendFollowNotification(item.author_id);
    } catch {
      toast.error("Failed to update follow");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSharedAuthorFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sharedAuthorId || followLoading) return;
    if (!currentUserId) {
      showGuestActionPrompt("Log in to follow creators", "/feed");
      return;
    }
    if (sharedAuthorId === currentUserId) return;
    if (isFollowingSharedAuthor) {
      setShowSharedUnfollowConfirm(true);
      return;
    }
    setFollowLoading(true);
    try {
      const { error } = await (supabase as any).from("user_followers").upsert(
        {
          follower_id: currentUserId,
          following_id: sharedAuthorId,
        },
        { onConflict: "follower_id,following_id", ignoreDuplicates: true },
      );
      if (error) throw error;
      setIsFollowingSharedAuthor(true);
      await sendFollowNotification(sharedAuthorId);
    } catch {
      toast.error("Failed to update follow");
    } finally {
      setFollowLoading(false);
    }
  };

  const executeFeedUnfollow = async () => {
    if (!currentUserId || !item.author_id) return;
    setFollowLoading(true);
    try {
      await supabase.from("user_followers" as any).delete()
        .eq("follower_id", currentUserId).eq("following_id", item.author_id);
      setIsFollowingAuthor(false);
    } catch { /* ignore */ } finally {
      setFollowLoading(false);
    }
  };

  const executeSharedFeedUnfollow = async () => {
    if (!currentUserId || !sharedAuthorId) return;
    setFollowLoading(true);
    try {
      await supabase.from("user_followers" as any).delete()
        .eq("follower_id", currentUserId).eq("following_id", sharedAuthorId);
      setIsFollowingSharedAuthor(false);
    } catch { /* ignore */ } finally {
      setFollowLoading(false);
    }
  };


  // Auto-play videos when visible or when autoPlayVideo is set
  useEffect(() => {
    if (item.media_type !== "video") return;
    if (autoPlayVideo) {
      setTimeout(() => {
        videoRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }, 100);
      return;
    }
    if (!containerRef.current) return;
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
      { threshold: 0.6 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [item.media_type, autoPlayVideo]);

  // Record a view after 1.5s of continuous play (matches the SQL function's
  // expected dwell threshold). Per-session dedup via the module-level set so
  // scrolling away and back doesn't double-count.
  useEffect(() => {
    if (!isPlaying) return;
    if (item.media_type !== "video") return;
    if (item.source === "poll") return;
    if (item.source !== "user" && !currentUserId) return;
    if (recordedFeedViews.has(item.id)) return;

    const timer = setTimeout(() => {
      recordedFeedViews.add(item.id);
      const rpc = item.source === "user" ? "increment_user_post_view_count" : "increment_store_post_view_count";
      (supabase as any).rpc(rpc, { p_post_id: interactionPostId }).then(({ error }: any) => {
        if (error) recordedFeedViews.delete(item.id);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentUserId, isPlaying, item.id, item.media_type, item.source, interactionPostId]);

  // Load the actual most-recent liker's name so the "Liked by [name]" social
  // proof line shows real data instead of a deterministic fake. Skips when
  // there are no likes yet, when the only liker is the viewer themselves, or
  // when an in-flight optimistic update hasn't settled yet.
  useEffect(() => {
    if (localLikes <= 0) { setTopLikerName(null); return; }
    let cancelled = false;
    (async () => {
      // Pull the most recent likers; we'll skip the viewer's own row so the
      // line says "Liked by [someone else]" instead of "Liked by you".
      const { data: rows } = await (supabase as any)
        .from(likesTable)
        .select("user_id, created_at")
        .eq("post_id", interactionPostId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (cancelled) return;
      const others = (rows || []).filter((r: { user_id: string }) => r.user_id && r.user_id !== currentUserId);
      const winner = others[0]?.user_id;
      if (!winner) {
        // Only the viewer has liked — Instagram shows "1 like" in that case;
        // we just hide the [name] line by leaving it null.
        setTopLikerName(null);
        return;
      }
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
  }, [localLikes, likesTable, interactionPostId, currentUserId]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleLike = async () => {
    if (!currentUserId) {
      showGuestActionPrompt("Log in to like posts", "/feed");
      return;
    }

    const newLiked = !liked;
    haptic(newLiked ? "medium" : "light");
    setLiked(newLiked);
    setLocalLikes((prev) => Math.max(0, prev + (newLiked ? 1 : -1)));

    try {
      if (newLiked) {
        const { error } = await (supabase as any)
          .from(likesTable)
          .insert({ post_id: interactionPostId, user_id: currentUserId });
        if (error) throw error;
        // Push notification to post author — once per post per session.
        if (item.author_id && item.author_id !== currentUserId && shouldSendLikeNotification(item.id)) {
          try {
            const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", currentUserId).single();
            await supabase.functions.invoke("send-push-notification", {
              body: { user_id: item.author_id, notification_type: "post_liked", title: "New Like ❤️", body: `${sp?.full_name || "Someone"} liked your post`, data: { type: "post_liked", post_id: item.id, liker_id: currentUserId, action_url: `/reels?post=${item.id}` } },
            });
          } catch {}
        }
      } else {
        const { error } = await (supabase as any)
          .from(likesTable)
          .delete()
          .eq("post_id", interactionPostId)
          .eq("user_id", currentUserId);
        if (error) throw error;
      }
      // Local liked + likes-count are already updated optimistically above —
      // no need to invalidate the entire feed (which yanked every other reel
      // off-screen mid-scroll).
    } catch {
      setLiked(!newLiked);
      setLocalLikes((prev) => Math.max(0, prev - (newLiked ? 1 : -1)));
      toast.error("Failed to update like");
    }
  };

  const showFeedHeart = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setDoubleTapPoint({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setShowDoubleTapHeart(true);
    if (feedHeartTimer.current) clearTimeout(feedHeartTimer.current);
    feedHeartTimer.current = setTimeout(() => {
      setShowDoubleTapHeart(false);
      setDoubleTapPoint(null);
      feedHeartTimer.current = null;
    }, 560);
  };

  const likeFeedOnceFromDoubleTap = async () => {
    if (!currentUserId) {
      showGuestActionPrompt("Log in to like posts", "/feed");
      return;
    }
    if (liked || feedLikeInFlight.current) return;
    feedLikeInFlight.current = true;
    try {
      await handleLike();
    } finally {
      feedLikeInFlight.current = false;
    }
  };

  const handleFeedMediaDoubleTap = (event: React.MouseEvent<HTMLElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      showFeedHeart(event);
      void likeFeedOnceFromDoubleTap();
    }
    lastTapRef.current = now;
  };

  const handleFeedVideoTap = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (feedTapTimer.current) {
        clearTimeout(feedTapTimer.current);
        feedTapTimer.current = null;
      }
      lastTapRef.current = 0;
      showFeedHeart(event);
      void likeFeedOnceFromDoubleTap();
      return;
    }

    lastTapRef.current = now;
    if (feedTapTimer.current) clearTimeout(feedTapTimer.current);
    feedTapTimer.current = setTimeout(() => {
      togglePlay();
      feedTapTimer.current = null;
    }, 250);
  };

  useEffect(() => () => {
    if (feedTapTimer.current) clearTimeout(feedTapTimer.current);
    if (feedHeartTimer.current) clearTimeout(feedHeartTimer.current);
  }, []);

  // Emoji reactions — persisted to post_reactions (matches usePostReactions hook).
  // Emojis are constrained by the DB CHECK: ❤️ 😂 😮 😢 😡 🔥 (👏 is not allowed).
  const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "🔥"];
  const handleReaction = async (emoji: string) => {
    if (!POST_REACTIONS_ENABLED) {
      toast.error("Reactions are being upgraded");
      return;
    }
    if (!currentUserId) {
      showGuestActionPrompt("Log in to react to posts", "/feed");
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
          .eq("post_id", interactionPostId)
          .eq("source", item.source);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("post_reactions")
          .upsert(
            { user_id: currentUserId, post_id: interactionPostId, source: item.source, emoji: next },
            { onConflict: "user_id,post_id,source" },
          );
        if (error) throw error;
      }
    } catch {
      setSelectedReaction(previous);
      toast.error("Couldn't save reaction");
    }
  };

  const handleShare = async () => {
    haptic("selection");
    const text = item.caption || `Check out this post by ${item.author_name}`;
    try {
      const result = await shareContent({ title: "ZIVO", text, url: shareUrl });
      if (result.cancelled) return;
      if (result.shared) {
        const recorded = await recordShareForFeedItem(item, "native");
        if (recorded) setLocalShares((prev) => prev + 1);
        return;
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
    }
    setShowShareSheet(true);
  };

  const handleBuyNow = async () => {
    const commerce = item.commerce_link;
    if (!commerce) return;

    const checkoutPath = commerce.checkout_path
      || (commerce.link_type === "store_product" && commerce.store_product_id
        ? `/grocery/shop/${item.store_slug || ""}?buy=${commerce.store_product_id}`
        : commerce.link_type === "truck_sale" && commerce.truck_sale_id
          ? `/marketplace?truckSale=${commerce.truck_sale_id}`
          : null);

    if (!checkoutPath) {
      toast.error("Checkout path is not configured for this reel");
      return;
    }

    await trackInitiateCheckout({
      eventId: `${item.id}-buy-now-${Date.now()}`,
      externalId: currentUserId || undefined,
      sourceType: commerce.link_type,
      sourceTable: "social_reel_links",
      sourceId: item.id,
      payload: {
        post_id: item.id,
        store_product_id: commerce.store_product_id,
        truck_sale_id: commerce.truck_sale_id,
      },
    });

    navigate(checkoutPath);
  };

  const shareUrl = getPostShareUrl(getReelsSharePostId(item));
  const shareText = encodeURIComponent(item.caption || `Check out this post by ${item.author_name}`);
  const shareEncodedUrl = encodeURIComponent(shareUrl);
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}&color=000000&bgcolor=ffffff&margin=8`;

  const shareOptions = [
    { label: "WhatsApp", color: "#25D366", svg: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.531 3.488 11.821 11.821 0 0012.05 0zm0 21.785a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.86 9.86 0 012.15 11.892C2.15 6.443 6.602 1.992 12.053 1.992a9.84 9.84 0 016.988 2.899 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.9-9.884 9.9z", url: `https://wa.me/?text=${shareText}%20${shareEncodedUrl}` },
    { label: "Telegram", color: "#0088CC", svg: "M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm5.091 8.104l-1.681 7.927c-.128.564-.46.701-.931.437l-2.57-1.894-1.24 1.193c-.137.137-.253.253-.519.253l.185-2.618 4.763-4.303c.207-.184-.045-.286-.321-.102l-5.889 3.71-2.537-.793c-.552-.172-.563-.552.115-.817l9.915-3.822c.459-.166.861.112.71.827z", url: `https://t.me/share/url?url=${shareEncodedUrl}&text=${shareText}` },
    { label: "Facebook", color: "#1877F2", svg: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z", url: `https://www.facebook.com/sharer/sharer.php?u=${shareEncodedUrl}` },
    { label: "X", color: "#000000", svg: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z", url: `https://x.com/intent/tweet?text=${shareText}&url=${shareEncodedUrl}` },
    { label: "Email", color: "#EA4335", svg: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z", url: `mailto:?subject=${shareText}&body=${shareEncodedUrl}` },
    { label: "SMS", color: "#34B7F1", svg: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z", url: `sms:?body=${shareText}%20${shareEncodedUrl}` },
  ];

  const moreShareOptions = [
    { label: "TikTok", color: "#000000", svg: "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z", url: "__copy__", copyMessage: "Link copied! Paste it in TikTok" },
    { label: "Instagram", color: "#E4405F", svg: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z", url: "__copy__", copyMessage: "Link copied! Paste it in Instagram" },
    { label: "Snapchat", color: "#FFFC00", svg: "M12 0c-1.62 0-3.066.612-4.152 1.612C6.726 2.726 6.12 4.26 6.12 5.88c0 .66.108 1.32.264 1.956-.132.024-.276.036-.42.036-.384 0-.756-.108-1.08-.3a.636.636 0 00-.336-.096c-.264 0-.492.168-.564.42-.06.204-.012.408.12.564.516.588 1.2.96 1.944 1.14-.06.36-.18.708-.36 1.02-.36.636-.924 1.128-1.608 1.404a.648.648 0 00-.384.588c0 .24.132.456.336.576.66.384 1.38.576 2.1.612.072.324.156.66.264.984.06.18.252.3.444.3h.06c.468-.072 1.008-.156 1.536-.156.396 0 .78.048 1.14.192.516.204 1.044.54 1.74.54h.048c.696 0 1.224-.336 1.74-.54.36-.144.744-.192 1.14-.192.528 0 1.068.084 1.536.156h.06c.192 0 .384-.12.444-.3.108-.324.192-.66.264-.984.72-.036 1.44-.228 2.1-.612a.648.648 0 00.336-.576.648.648 0 00-.384-.588c-.684-.276-1.248-.768-1.608-1.404a3.588 3.588 0 01-.36-1.02c.744-.18 1.428-.552 1.944-1.14a.636.636 0 00.12-.564.588.588 0 00-.564-.42.636.636 0 00-.336.096c-.324.192-.696.3-1.08.3-.144 0-.288-.012-.42-.036.156-.636.264-1.296.264-1.956 0-1.62-.612-3.156-1.728-4.272C15.066.612 13.62 0 12 0z", url: `https://www.snapchat.com/scan?attachmentUrl=${shareEncodedUrl}` },
    { label: "LinkedIn", color: "#0A66C2", svg: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z", url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareEncodedUrl}` },
    { label: "Pinterest", color: "#E60023", svg: "M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z", url: `https://pinterest.com/pin/create/button/?url=${shareEncodedUrl}&description=${shareText}` },
    { label: "Reddit", color: "#FF4500", svg: "M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.462 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.205-.095z", url: `https://reddit.com/submit?url=${shareEncodedUrl}&title=${shareText}` },
  ];


  const handleCopyLink = async () => {
    try {
      await copyText(shareUrl);
      toast.success("Link copied!");
      const recorded = await recordShareForFeedItem(item, "copy_link");
      if (recorded) setLocalShares((prev) => prev + 1);
    } catch {
      toast.info("Long-press URL bar to copy");
    }
    setShowShareSheet(false);
  };

  const savingBookmark = useRef(false);
  const handleSave = async () => {
    if (!currentUserId) {
      showGuestActionPrompt("Log in to save posts", "/feed");
      return;
    }
    if (item.source === "poll") {
      toast.info("Polls can't be saved yet");
      return;
    }
    // Guard against missing post_id — without a UUID the insert would
    // throw an opaque "invalid input syntax for type uuid" error.
    if (!interactionPostId) {
      toast.error("Couldn't bookmark — post id missing");
      return;
    }
    haptic(saved ? "light" : "medium");
    // Prevent rapid double-tap from triggering two writes — the second
    // INSERT would 409 against the unique (user_id, post_id, source) constraint.
    if (savingBookmark.current) return;
    savingBookmark.current = true;
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      if (newSaved) {
        const [modernBookmark, legacyBookmark] = await Promise.all([
          (supabase as any).from("post_bookmarks").upsert(
            {
              user_id: currentUserId,
              post_id: interactionPostId,
              source: item.source,
            },
            { onConflict: "user_id,post_id,source", ignoreDuplicates: true },
          ),
          (supabase as any).from("bookmarks").upsert(
            {
              user_id: currentUserId,
              item_id: item.id,
              item_type: "post",
              collection_name: "Reels",
            },
            { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true },
          ),
        ]);
        const error = modernBookmark.error || legacyBookmark.error;
        if (error) {
          const msg = String(error.message || "").toLowerCase();
          // Already bookmarked is a no-op success — the local state already
          // reflects "saved". Don't surface that as an error.
          if (msg.includes("duplicate") || msg.includes("unique")) {
            toast.success("Already saved");
          } else {
            throw error;
          }
        } else {
          toast.success("Saved to bookmarks", {
            action: { label: "View", onClick: () => navigate("/saved") },
          });
        }
      } else {
        const [modernDelete, legacyDelete] = await Promise.all([
          (supabase as any).from("post_bookmarks").delete()
            .eq("user_id", currentUserId)
            .eq("post_id", interactionPostId)
            .eq("source", item.source),
          (supabase as any).from("bookmarks").delete()
            .eq("user_id", currentUserId)
            .eq("item_type", "post")
            .in("item_id", Array.from(new Set([item.id, interactionPostId]))),
        ]);
        const error = modernDelete.error || legacyDelete.error;
        if (error) throw error;
        toast.success("Removed from bookmarks");
      }
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-posts-count"] });
    } catch (e: any) {
      // Roll back optimistic toggle on real failure.
      setSaved(!newSaved);
      // Surface the actual reason — the previous "Couldn't update bookmark"
      // toast hid the underlying RLS / schema / type error and made the
      // failure undebuggable from the device.
      const reason = e?.message || e?.error_description || "unknown";
      console.error("[handleSave]", e);
      toast.error(`Couldn't update bookmark: ${reason}`);
    } finally {
      savingBookmark.current = false;
    }
  };

  const handleEditPost = async () => {
    if (!currentUserId || !isOwner) return;
    setEditSaving(true);
    try {
      const realId = item.id.replace(/^u-/, "");
      const table = item.source === "store" ? "store_posts" : "user_posts";
      const { error } = await (supabase as any).from(table).update({ caption: editCaptionText }).eq("id", realId);
      if (error) throw error;
      item.caption = editCaptionText;
      setShowEditCaption(false);
      toast.success("Post updated!");
      queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
    } catch {
      toast.error("Failed to update post");
    }
    setEditSaving(false);
  };

  const [searchParams, setSearchParams] = useSearchParams();

  // Open comments deep link: /feed?post=<id>&src=<src>&comments=1
  useEffect(() => {
    const wantComments = searchParams.get("comments") === "1";
    const targetId = searchParams.get("post");
    const targetSrc = searchParams.get("src");
    if (
      wantComments &&
      targetId === interactionPostId &&
      (!targetSrc || targetSrc === item.source)
    ) {
      setShowComments(true);
    }
    // Only react to URL changes, not local interactionPostId churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const openCommentsDeepLink = () => {
    const next = new URLSearchParams(searchParams);
    next.set("post", interactionPostId);
    next.set("src", item.source);
    next.set("comments", "1");
    setSearchParams(next, { replace: false });
  };

  const closeCommentsDeepLink = () => {
    const next = new URLSearchParams(searchParams);
    if (next.get("post") === interactionPostId) {
      next.delete("post");
      next.delete("src");
      next.delete("comments");
      setSearchParams(next, { replace: true });
    }
  };

  const persistCommentSetting = async (nextSetting: "everyone" | "friends" | "off") => {
    if (!currentUserId || !isOwner || item.source !== "user") {
      setCommentSetting(nextSetting);
      return;
    }

    const previousSetting = commentSetting;
    setCommentSetting(nextSetting);
    if (nextSetting === "off") setShowComments(false);

    try {
      const realId = stripFeedUserPrefix(item.id);
      const { error: postError } = await (supabase as any)
        .from("user_posts")
        .update({ comments_enabled: nextSetting !== "off" })
        .eq("id", realId)
        .eq("user_id", currentUserId);
      if (postError) throw postError;

      if (nextSetting !== "off") {
        const { data: existing, error: existingError } = await supabase
          .from("profiles")
          .select("id")
          .or(`user_id.eq.${currentUserId},id.eq.${currentUserId}`)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existing?.id) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ comment_control: nextSetting })
            .eq("id", existing.id);
          if (profileError) throw profileError;
        }
      }

      void queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
      toast.success(
        nextSetting === "everyone" ? "Comments open for everyone" :
        nextSetting === "friends" ? "Only friends can comment now" :
        "Comments turned off"
      );
    } catch {
      setCommentSetting(previousSetting);
      toast.error("Couldn't update comment settings");
    }
  };

  const handleComment = () => {
    if (commentSetting === "off") {
      toast.error("Comments are turned off for this post");
      return;
    }
    haptic("selection");
    if (!currentUserId) {
      showGuestActionPrompt("Log in to comment", "/feed");
      return;
    }
    if (commentSetting === "friends" && !isOwner && !canCommentAsFriend) {
      toast.error("Only friends can comment on this post");
      return;
    }
    if (showComments) {
      setShowComments(false);
      closeCommentsDeepLink();
    } else {
      setShowComments(true);
      openCommentsDeepLink();
    }
  };

  // Comments are now handled by CommentsSheet

  const mediaUrl = item.media_urls[currentMedia] || item.media_urls[0];
  const hasMedia = Boolean(mediaUrl);
  const sensitiveMediaMatch = useMemo(
    () => detectSensitiveContent(`${item.caption || ""}\n${item.shared_from_caption || ""}`, {
      creatorMarked: Boolean(item.is_sensitive),
      reportMarked: Boolean(item.sensitive_reason && item.sensitive_reason !== "creator_marked"),
      reason: item.sensitive_reason,
    }),
    [item.caption, item.is_sensitive, item.sensitive_reason, item.shared_from_caption],
  );
  const shouldGateSensitiveMedia = hasMedia && sensitiveMediaPreference.blurSensitiveMedia && sensitiveMediaMatch.isSensitive;
  const commentsLimitedToFriends = commentSetting === "friends" && !isOwner && !canCommentAsFriend;
  const canSubmitComment = commentSetting !== "off" && !commentsLimitedToFriends;
  const commentDisabledReason = commentSetting === "off"
    ? "Comments are turned off for this post"
    : commentsLimitedToFriends ? "Only friends can comment on this post" : undefined;
  const videoAspectClass = videoAspect
    ? (videoAspect >= 1.2 ? "aspect-video" : videoAspect >= 0.95 ? "aspect-square" : "aspect-[4/5]")
    : "aspect-[4/5]";

  const isSharedPost = Boolean(item.shared_from_post_id || item.shared_from_user_id);

  return (
    <div
      className={cn("bg-card", item.media_type === "video" && "zivo-reel-no-callout")}
      onContextMenu={item.media_type === "video" ? (event) => event.preventDefault() : undefined}
    >
      {isSharedPost ? (
        /* ── Facebook-style shared post layout ────────────────── */
        <>
          {/* Sharer header — hidden in detail overlay (overlay renders its own) */}
          {!detailMode && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => item.author_id && navigate(`/user/${item.author_id}`)}
                className="flex items-center gap-2.5 px-3 py-2 flex-1 min-w-0 active:opacity-70"
              >
                <div className="h-8 w-8 rounded-full overflow-hidden bg-muted border border-border/30 shrink-0">
                  {item.author_avatar ? (
                    <img src={item.author_avatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground/40 text-xs font-bold">
                      {item.author_name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-semibold text-foreground truncate flex items-center gap-1">
                    <span className="truncate">{item.author_name}</span>
                    {isBlueVerified(item.author_is_verified) && <VerifiedBadge size={13} />}
                  </p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <p className="text-[10px] text-muted-foreground"><RelativeTime date={item.created_at} /></p>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                    {item.is_pinned && (
                      <>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                          <Pin className="h-2.5 w-2.5" />
                          Pinned
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
              {/* Follow button */}
              {!isOwner && item.author_id && currentUserId && (
                <button type="button"
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  aria-label={isFollowingAuthor ? "Unfollow author" : "Follow author"}
                  title={isFollowingAuthor ? "Unfollow author" : "Follow author"}
                  className={cn(
                    "text-[12px] font-bold px-3 py-1 rounded-md transition-all active:scale-95",
                    isFollowingAuthor ? "text-muted-foreground" : "text-ig-gradient"
                  )}
                >
                  {followLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isFollowingAuthor ? "Following" : "Follow"}
                </button>
              )}
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setShowPostMenu(true); }}
                aria-label="Post actions"
                title="Post actions"
                className="p-1.5 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Sharer's own caption (not the original post's caption) */}
          {item.caption && item.caption !== item.shared_from_caption && (
            <div className="px-3 pb-2">
              <CollapsibleCaption text={item.caption} lines={3} className="text-[13px]">
                <Suspense fallback={<span>{item.caption}</span>}>
                  <SafeCaption text={item.caption} />
                </Suspense>
              </CollapsibleCaption>
            </div>
          )}

          {/* Embedded original post card */}
          <div className="mb-2 border-y border-border/50 overflow-hidden bg-card">
            {/* Original author header */}
            <div className="flex items-center px-3 py-2.5">
              <button
                type="button"
                onClick={() => {
                  if (item.shared_from_source === "store" && item.shared_from_store_slug) {
                    navigate(`/grocery/shop/${item.shared_from_store_slug}`);
                  } else if (item.shared_from_user_id) {
                    navigate(`/user/${item.shared_from_user_id}`);
                  }
                }}
                className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70"
              >
                <div className="h-9 w-9 rounded-full overflow-hidden bg-muted border border-border/30 shrink-0">
                  {item.shared_from_user_avatar ? (
                    <img src={item.shared_from_user_avatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground/40 text-xs font-bold">
                      {(item.shared_from_user_name || (item.shared_from_source === "store" ? "S" : "?"))[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {item.shared_from_user_name || (item.shared_from_source === "store" ? "Store" : "Someone")}
                  </p>
                  <div className="flex items-center gap-1">
                    <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </div>
              </button>
              {/* Follow button */}
              {sharedAuthorId && !isSharedAuthorOwner && (
                <button type="button"
                  onClick={handleSharedAuthorFollowToggle}
                  disabled={followLoading}
                  aria-label={isFollowingSharedAuthor ? "Unfollow author" : "Follow author"}
                  title={isFollowingSharedAuthor ? "Unfollow author" : "Follow author"}
                  className={cn(
                    "text-[12px] font-bold px-2 py-1 rounded-md transition-all active:scale-95",
                    isFollowingSharedAuthor ? "text-muted-foreground" : "text-ig-gradient"
                  )}
                >
                  {followLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isFollowingSharedAuthor ? "Following" : "Follow"}
                </button>
              )}
            </div>

            {/* Original post caption */}
            {item.shared_from_caption && (
              <div className="px-3 pb-2">
                <CollapsibleCaption text={item.shared_from_caption} lines={3} className="text-[13px]">
                  <Suspense fallback={<span>{item.shared_from_caption}</span>}>
                    <SafeCaption text={item.shared_from_caption} />
                  </Suspense>
                </CollapsibleCaption>
              </div>
            )}

            {/* Original post media */}
            <div
              ref={containerRef}
              className={cn(
                "relative overflow-hidden",
                hasMedia ? (item.media_type === "video" ? cn("max-h-[500px] lg:max-h-[500px] xl:max-h-[520px] w-full mx-auto bg-black rounded-xl", videoAspectClass, videoAspect && videoAspect < 1 && "max-w-[420px]") : "") : ""
              )}
            >
              {hasMedia ? (
                <SensitiveMediaGate active={shouldGateSensitiveMedia} reason={sensitiveMediaMatch.label} className="h-full w-full">
                {item.media_type === "video" ? (
                  <>
                    <video
                      ref={videoRef}
                      src={mediaUrl}
                      muted={muted}
                      loop
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        if (v.videoWidth > 0 && v.videoHeight > 0) {
                          setVideoAspect(v.videoWidth / v.videoHeight);
                        }
                      }}
                      onClick={handleFeedVideoTap}
                      className="h-full w-full object-contain cursor-pointer"
                    />
                    {!isPlaying && (
                      <button type="button" onClick={handleFeedVideoTap} aria-label="Play video" title="Play video" className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <Play className="h-14 w-14 text-white/80 fill-white/80 drop-shadow-lg" />
                      </button>
                    )}
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                      className="absolute bottom-3.5 right-3.5 h-9 w-9 rounded-full bg-black/45 backdrop-blur-md ring-1 ring-white/15 shadow-lg flex items-center justify-center min-h-[40px] min-w-[40px] active:scale-95 transition-transform"
                    >
                      {muted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
                    </button>
                  </>
                ) : item.media_urls.length === 1 ? (
                  <div className="relative w-full bg-black overflow-hidden flex items-center justify-center max-h-[80vh] lg:max-h-[700px]">
                    <img src={mediaUrl} alt={item.caption || "Shared post"} className="block w-full h-auto max-h-[80vh] lg:max-h-[700px] object-contain cursor-pointer" loading="lazy" decoding="async" onClick={() => onOpenFullscreen?.()} />
                  </div>
                ) : item.media_urls.length === 2 ? (
                  <div className="grid grid-cols-2 gap-0.5 w-full aspect-square md:aspect-[2/1]">
                    {item.media_urls.map((url, i) => (
                      <div key={i} className="relative bg-black overflow-hidden">
                        <img src={url} alt="" className="h-full w-full object-cover cursor-pointer" loading="lazy" decoding="async" onClick={() => { setCurrentMedia(i); onOpenFullscreen?.(); }} />
                      </div>
                    ))}
                  </div>
                ) : item.media_urls.length === 3 ? (
                  <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full aspect-square md:aspect-[3/2]">
                    <div className="relative row-span-2 bg-black overflow-hidden">
                      <img src={item.media_urls[0]} alt="" className="h-full w-full object-cover cursor-pointer" loading="lazy" decoding="async" onClick={() => { setCurrentMedia(0); onOpenFullscreen?.(); }} />
                    </div>
                    <div className="relative bg-black overflow-hidden">
                      <img src={item.media_urls[1]} alt="" className="h-full w-full object-cover cursor-pointer" loading="lazy" decoding="async" onClick={() => { setCurrentMedia(1); onOpenFullscreen?.(); }} />
                    </div>
                    <div className="relative bg-black overflow-hidden">
                      <img src={item.media_urls[2]} alt="" className="h-full w-full object-cover cursor-pointer" loading="lazy" decoding="async" onClick={() => { setCurrentMedia(2); onOpenFullscreen?.(); }} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-[3px] w-full aspect-square overflow-hidden rounded-lg">
                    {item.media_urls.slice(0, 4).map((url, i) => (
                      <div key={i} className="relative bg-muted overflow-hidden">
                        <img src={url} alt="" className="h-full w-full object-cover cursor-pointer" loading="lazy" decoding="async" onClick={() => { setCurrentMedia(i); onOpenFullscreen?.(); }} />
                        {i === 3 && item.media_urls.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer" onClick={() => { setCurrentMedia(3); onOpenFullscreen?.(); }}>
                            <span className="text-white text-2xl font-bold">+{item.media_urls.length - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                </SensitiveMediaGate>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        /* ── Normal post layout ────────────────────────────────── */
        <>
          {/* Author header — hidden in detail overlay (overlay renders its own) */}
          {!detailMode && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (item.source === "store" && item.store_slug) {
                    navigate(`/grocery/shop/${item.store_slug}`);
                  } else if (item.author_id) {
                    navigate(`/user/${item.author_id}`);
                  }
                }}
                className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0 active:opacity-70"
              >
                <div className="h-9 w-9 rounded-full overflow-hidden bg-muted border border-border/30 shrink-0">
                  {item.author_avatar ? (
                    <img src={item.author_avatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground/40 text-xs font-bold">
                      {item.author_name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-semibold text-foreground truncate flex items-center gap-1">
                    <span className="truncate">{item.author_name}</span>
                    {isBlueVerified(item.author_is_verified) && <VerifiedBadge size={13} />}
                    {item.location && (
                      <>
                        <span className="text-[10px] text-muted-foreground font-normal"> is in </span>
                        <span className="text-[12px] text-foreground font-semibold truncate">{item.location}</span>
                      </>
                    )}
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-muted-foreground"><RelativeTime date={item.created_at} /></p>
                    {item.source === "store" && (
                      <>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] font-semibold text-primary">Sponsored</span>
                      </>
                    )}
                    {item.location && (
                      <>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                      </>
                    )}
                  </div>
                </div>
              </button>
              {/* Follow button */}
              {!isOwner && item.author_id && currentUserId && (
                <button type="button"
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  aria-label={isFollowingAuthor ? "Unfollow author" : "Follow author"}
                  title={isFollowingAuthor ? "Unfollow author" : "Follow author"}
                  className={cn(
                    "mr-1 text-[12px] font-bold px-3 py-1 rounded-full transition-all active:scale-95",
                    isFollowingAuthor
                      ? "text-muted-foreground bg-muted/40"
                      : "text-white bg-ig-gradient shadow-sm hover:opacity-90"
                  )}
                >
                  {followLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isFollowingAuthor ? "Following" : "Follow"}
                </button>
              )}
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setShowPostMenu(true); }}
                aria-label="Post actions"
                title="Post actions"
                className="p-1 text-muted-foreground hover:text-foreground min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Caption before media for normal posts */}
          {item.caption && (
            <div className="px-3 pb-1.5">
              <CollapsibleCaption text={item.caption} lines={2} className="text-[13px] leading-snug">
                <Suspense fallback={<span>{item.caption}</span>}>
                  <SafeCaption text={item.caption} />
                </Suspense>
              </CollapsibleCaption>
              {/* Translation — only shown when caption has non-Latin characters */}
              {hasNonAsciiText(item.caption) && (
                <div className="mt-1">
                  {translatedCaption ? (
                    <div className="bg-muted/40 rounded-lg px-3 py-2 border border-border/20">
                      <p className="text-[11px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide">Translated</p>
                      <p className="text-[13px] text-foreground leading-snug">{translatedCaption}</p>
                      <button type="button"
                        onClick={() => setTranslatedCaption(null)}
                        className="text-[11px] text-primary mt-1 font-semibold"
                      >
                        Hide translation
                      </button>
                    </div>
                  ) : (
                    <button type="button"
                      onClick={async () => {
                        setIsTranslating(true);
                        try {
                          const q = encodeURIComponent(item.caption!);
                          const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${q}`);
                          const data = await res.json();
                          const text = (data[0] as [string, string][]).map((s) => s[0]).join("");
                          setTranslatedCaption(text);
                        } catch {
                          toast.error("Translation unavailable");
                        } finally {
                          setIsTranslating(false);
                        }
                      }}
                      disabled={isTranslating}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-2 -ml-2 text-[12px] text-primary font-semibold active:opacity-70 disabled:opacity-50"
                    >
                      <Languages className="h-3.5 w-3.5" />
                      {isTranslating ? "Translating..." : "See translation"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Location tag chip */}
          {item.location && (
            <div className="px-3 pb-2 -mt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/50 border border-border/20 text-[11px] text-muted-foreground font-medium">
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                {item.location}
              </span>
            </div>
          )}

           {/* Media */}
          <div
            ref={containerRef}
            onClick={item.media_type === "video" ? undefined : handleFeedMediaDoubleTap}
            onTouchStart={item.media_urls.length > 1 && item.media_type !== "video" ? undefined : (item.media_urls.length > 1 ? handleTouchStart : undefined)}
            onTouchMove={item.media_urls.length > 1 && item.media_type !== "video" ? undefined : (item.media_urls.length > 1 ? handleTouchMove : undefined)}
            onTouchEnd={item.media_urls.length > 1 && item.media_type !== "video" ? undefined : (item.media_urls.length > 1 ? handleTouchEnd : undefined)}
            className={cn(
              "relative overflow-hidden",
              hasMedia ? (item.media_type === "video" ? cn("max-h-[500px] lg:max-h-[500px] xl:max-h-[520px] w-full mx-auto bg-black rounded-xl", videoAspectClass, videoAspect && videoAspect < 1 && "max-w-[420px]") : "") : ""
            )}
          >
            {hasMedia ? (
              <SensitiveMediaGate active={shouldGateSensitiveMedia} reason={sensitiveMediaMatch.label} className="h-full w-full">
              {item.media_type === "video" ? (
                <>
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    muted={muted}
                    loop
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (v.videoWidth > 0 && v.videoHeight > 0) {
                        setVideoAspect(v.videoWidth / v.videoHeight);
                      }
                    }}
                    onClick={handleFeedVideoTap}
                    className="h-full w-full object-contain cursor-pointer"
                  />
                  {!isPlaying && (
                    <button type="button" onClick={handleFeedVideoTap} aria-label="Play video" title="Play video" className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <Play className="h-14 w-14 text-white/80 fill-white/80 drop-shadow-lg" />
                    </button>
                  )}
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                    aria-label={muted ? "Unmute video" : "Mute video"}
                    title={muted ? "Unmute video" : "Mute video"}
                    className="absolute bottom-3.5 right-3.5 h-9 w-9 rounded-full bg-black/45 backdrop-blur-md ring-1 ring-white/15 shadow-lg flex items-center justify-center min-h-[40px] min-w-[40px] active:scale-95 transition-transform"
                  >
                    {muted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
                  </button>
                  {item.commerce_link && (
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); handleBuyNow(); }}
                      className="absolute bottom-3 left-3 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg min-h-[44px]"
                    >
                      Buy Now
                    </button>
                  )}
                </>
              ) : detailMode ? (
                /* Detail mode — horizontal swipeable carousel with dots */
                <div className="relative w-full">
                  <div
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar w-full"
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const idx = Math.round(el.scrollLeft / el.clientWidth);
                      setCurrentMedia(idx);
                    }}
                  >
                    {item.media_urls.map((url, i) => (
                      <div key={i} className="flex-shrink-0 w-full snap-center bg-black aspect-square flex items-center justify-center">
                        <img
                          src={url}
                          alt={item.caption || "Post"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Dots indicator */}
                  {item.media_urls.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                      {item.media_urls.map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-full transition-all duration-200",
                            currentMedia === i ? "w-2 h-2 bg-primary" : "w-1.5 h-1.5 bg-white/50"
                          )}
                        />
                      ))}
                    </div>
                  )}
                  {/* Image count badge */}
                  {item.media_urls.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                      {currentMedia + 1}/{item.media_urls.length}
                    </div>
                  )}
                </div>
              ) : item.media_urls.length === 1 ? (
                /* Single image — full width, capped height (tap to expand) */
                <div className="relative w-full bg-black overflow-hidden flex items-center justify-center max-h-[80vh] lg:max-h-[700px]">
                  <img
                    src={mediaUrl}
                    alt={item.caption || "Post"}
                    className="block w-full h-auto max-h-[80vh] lg:max-h-[700px] object-contain cursor-pointer"
                    loading="lazy"
                    decoding="async"
                    onClick={() => onOpenFullscreen?.()}
                  />
                </div>
              ) : item.media_urls.length === 2 ? (
                /* 2 images — side by side */
                <div className="grid grid-cols-2 gap-0.5 w-full aspect-square md:aspect-[2/1]">
                  {item.media_urls.map((url, i) => (
                    <div key={i} className="relative bg-black overflow-hidden">
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover cursor-pointer"
                        loading="lazy"
                        decoding="async"
                        onClick={() => { setCurrentMedia(i); onOpenFullscreen?.(); }}
                      />
                    </div>
                  ))}
                </div>
              ) : item.media_urls.length === 3 ? (
                /* 3 images — 1 large left, 2 stacked right */
                <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full aspect-square md:aspect-[3/2]">
                  <div className="relative row-span-2 bg-black overflow-hidden">
                    <img
                      src={item.media_urls[0]}
                      alt=""
                      className="h-full w-full object-cover cursor-pointer"
                      loading="lazy"
                      decoding="async"
                      onClick={() => { setCurrentMedia(0); onOpenFullscreen?.(); }}
                    />
                  </div>
                  <div className="relative bg-black overflow-hidden">
	                    <img
	                      src={item.media_urls[1]}
	                      alt=""
	                      className="h-full w-full object-cover cursor-pointer"
	                      loading="lazy"
	                      decoding="async"
	                      onClick={() => { setCurrentMedia(1); onOpenFullscreen?.(); }}
	                    />
                  </div>
                  <div className="relative bg-black overflow-hidden">
                    <img
                      src={item.media_urls[2]}
                      alt=""
                      className="h-full w-full object-cover cursor-pointer"
                      loading="lazy"
                      decoding="async"
                      onClick={() => { setCurrentMedia(2); onOpenFullscreen?.(); }}
                    />
                  </div>
                </div>
              ) : (
                /* 4+ images — 2x2 grid with +N overlay */
                <div className="grid grid-cols-2 gap-[3px] w-full aspect-square overflow-hidden rounded-lg">
                  {item.media_urls.slice(0, 4).map((url, i) => (
                    <div key={i} className="relative bg-muted overflow-hidden">
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover cursor-pointer"
                        loading="lazy"
                        decoding="async"
                        onClick={() => { setCurrentMedia(i); onOpenFullscreen?.(); }}
                      />
                      {i === 3 && item.media_urls.length > 4 && (
                        <div
                          className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer"
                          onClick={() => { setCurrentMedia(3); onOpenFullscreen?.(); }}
                        >
                          <span className="text-white text-2xl font-bold">+{item.media_urls.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </SensitiveMediaGate>
            ) : null}

            {/* Double-tap heart animation */}
            <AnimatePresence>
              {showDoubleTapHeart && (
                <motion.div
                  initial={{ scale: 0.55, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 1.45, opacity: 0, y: -18 }}
                  transition={{ duration: 0.24 }}
                  className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: doubleTapPoint?.x ?? "50%",
                    top: doubleTapPoint?.y ?? "50%",
                  }}
                >
                  <Heart className="h-14 w-14 fill-red-500 text-red-500 drop-shadow-2xl" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Facebook-style engagement summary row */}
      {(localLikes > 0 || localComments > 0) && (
        <div className="px-3 pb-0.5 pt-1 space-y-0.5">
          {/* "Liked by [name] and X others" social proof line — real data
              from post_likes joined to profiles. We only show the name once
              we've actually resolved a non-self liker; otherwise we render
              a generic count phrase so the line never lies. */}
          {localLikes > 0 && (() => {
            const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
            const others = Math.max(0, localLikes - (topLikerName ? 1 : 0));
            if (topLikerName) {
              return (
                <p className="text-[11px] text-foreground leading-tight">
                  {others > 0 ? (
                    <span>Liked by <span className="font-semibold">{topLikerName}</span> and <span className="font-semibold">{fmt(others)} {others === 1 ? "other" : "others"}</span></span>
                  ) : (
                    <span>Liked by <span className="font-semibold">{topLikerName}</span></span>
                  )}
                </p>
              );
            }
            // No resolved name yet (loading, or only the viewer liked) — fall
            // back to a count phrase. Hide entirely if it's only the viewer.
            if (liked && localLikes === 1) return null;
            return (
              <p className="text-[11px] text-foreground leading-tight">
                Liked by <span className="font-semibold">{fmt(localLikes)} {localLikes === 1 ? "person" : "people"}</span>
              </p>
            );
          })()}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {localLikes > 0 && (
                <div className="flex items-center gap-1">
                  {selectedReaction
                    ? <span className="text-sm leading-none">{selectedReaction}</span>
                    : <Heart className="h-3.5 w-3.5 text-destructive fill-destructive" />
                  }
                  <span className="text-[12px] text-muted-foreground">{localLikes >= 1000 ? `${(localLikes / 1000).toFixed(1)}k` : localLikes}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 leading-tight">
              {localComments > 0 && (
                <button type="button" onClick={handleComment} className="text-[12px] text-muted-foreground hover:text-foreground hover:underline transition-colors" title="Action">
                  {localComments === 1 ? "1 comment" : `${localComments >= 1000 ? `${(localComments / 1000).toFixed(1)}k` : localComments} comments`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons — enhanced with counts */}
      <div className="flex items-center px-2.5 sm:px-3 py-1 border-t border-border/10">
        <div className="flex items-center gap-0.5 flex-1">
          <div className="relative">
            {/* FB-style reaction popover anchored above the Like button.
                Opens on long-press (touch) or right-click (desktop). */}
            <AnimatePresence>
              {showReactionPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.7 }}
                  transition={{ type: "spring", damping: 16, stiffness: 420, mass: 0.7 }}
                  className="absolute bottom-full left-0 mb-3 z-50 flex items-center gap-0.5 px-2.5 py-1.5 bg-card rounded-full shadow-2xl border border-border/40"
                >
                  {REACTIONS.map((emoji, i) => (
                    <motion.button
                      key={emoji}
                      initial={{ scale: 0, y: 16 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ delay: i * 0.04, type: "spring", damping: 14, stiffness: 500 }}
                      onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                      className={cn(
                        "text-3xl leading-none p-1.5 rounded-full transition-transform hover:scale-[1.35] active:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        selectedReaction === emoji && "bg-primary/10 ring-2 ring-primary/30"
                      )}
                      aria-label={emoji}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <button type="button"
              onClick={() => {
                if (longPressFired.current) { longPressFired.current = false; return; }
                handleLike();
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
              onPointerUp={() => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
              }}
              onPointerLeave={() => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
              }}
              onPointerCancel={() => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
              }}
              onContextMenu={(e) => { e.preventDefault(); setShowReactionPicker(!showReactionPicker); }}
              aria-label={liked ? `Unlike post${!item.hide_like_counts && formatCount(localLikes) ? `, ${formatCount(localLikes)} likes` : ""}` : `Like post${!item.hide_like_counts && formatCount(localLikes) ? `, ${formatCount(localLikes)} likes` : ""}`}
              title={liked ? "Unlike post" : "Like post"}
              className="zivo-touch-no-callout min-h-[44px] min-w-[44px] px-2 rounded-full flex items-center justify-center gap-1 group active:bg-muted/50"
            >
              {selectedReaction ? (
                <span className="text-lg" aria-hidden>{selectedReaction}</span>
              ) : (
                <Heart aria-hidden className={cn("h-[22px] w-[22px] transition-all", liked ? "text-destructive fill-destructive scale-110" : "text-foreground group-active:scale-125")} />
              )}
              {!item.hide_like_counts && formatCount(localLikes) && (
                <span aria-hidden className={cn("text-[12px] font-semibold whitespace-nowrap", liked || selectedReaction ? "text-destructive" : "text-muted-foreground")}>
                  {formatCount(localLikes)}
                </span>
              )}
            </button>
          </div>
          {commentSetting !== "off" && (
            <button type="button"
              onClick={handleComment}
              aria-label={`Open comments${formatCount(localComments) ? `, ${formatCount(localComments)} comments` : ""}`}
              className="min-h-[44px] min-w-[44px] px-2 rounded-full flex items-center justify-center text-foreground gap-1 active:bg-muted/50"
             title="Action">
              <MessageCircle aria-hidden className="h-[22px] w-[22px]" />
              {formatCount(localComments) && (
                <span aria-hidden className="text-[12px] text-muted-foreground font-semibold whitespace-nowrap">
                  {formatCount(localComments)}
                </span>
              )}
            </button>
          )}
          {item.allow_sharing !== false && (
            <button type="button"
              onClick={handleShare}
              aria-label={`Share post${formatCount(localShares) ? `, ${formatCount(localShares)} shares` : ""}`}
              className="min-h-[44px] min-w-[44px] px-2 rounded-full flex items-center justify-center text-foreground gap-1 active:bg-muted/50"
             title="Action">
              <Send aria-hidden className="h-[22px] w-[22px]" />
              {formatCount(localShares) && (
                <span aria-hidden className="text-[12px] text-muted-foreground font-semibold whitespace-nowrap">
                  {formatCount(localShares)}
                </span>
              )}
            </button>
          )}
        </div>
        <button type="button"
          onClick={handleSave}
          aria-label={saved ? "Remove bookmark" : "Save post"}
          title={saved ? "Remove bookmark" : "Save post"}
          className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center active:bg-muted/50"
        >
          <Bookmark aria-hidden className={cn("h-[22px] w-[22px] transition-all", saved ? "text-primary fill-primary" : "text-foreground")} />
        </button>
      </div>

      {/* Owner post insights — reach + engagement strip */}
      {isOwner && (item.views_count || 0) > 0 && (
        <div className="mx-3 mb-2 rounded-xl bg-muted/30 border border-border/20 px-3 py-2 flex items-center gap-3">
          <BarChart2 className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-foreground">
              {(item.views_count || 0) >= 1000
                ? `${((item.views_count || 0) / 1000).toFixed(1)}k`
                : item.views_count} views
              {(item.likes_count || 0) > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" "}· {Math.round(((item.likes_count || 0) / Math.max(1, item.views_count || 1)) * 100)}% engagement
                </span>
              )}
            </p>
          </div>
          <button type="button"
            onClick={() => navigate("/admin/marketing/campaigns")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-ig-gradient text-white text-[11px] font-bold shrink-0 shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Zap className="h-3 w-3" />
            Boost
          </button>
        </div>
      )}

      {item.commerce_link && (
        <div className="px-3 pb-2">
          <button type="button"
            onClick={handleBuyNow}
            className="w-full rounded-xl bg-ig-gradient text-white py-2.5 text-sm font-bold shadow-sm shadow-rose-500/25 hover:opacity-90 active:scale-[0.98] transition-all"
           title="Action">
            Buy Now
          </button>
        </div>
      )}

      {/* Caption for normal posts already shown above media; skip duplicate */}

      {/* Comments count or off indicator */}
      {commentSetting === "off" ? (
        <div className="px-3 pb-2 flex items-center gap-1.5">
          <MessageSquareOff aria-hidden className="h-3.5 w-3.5 text-muted-foreground/60" />
          <p className="text-[12px] text-muted-foreground/60">Comments are turned off</p>
        </div>
      ) : localComments > 0 ? (
        <>
          <div className="px-3 pb-1">
            <Suspense fallback={null}>
              <CommentPreview
                postId={interactionPostId}
                source={item.source === "store" ? "store" : "user"}
                totalCount={localComments}
                onOpen={handleComment}
              />
            </Suspense>
          </div>
          <a
            href={`?post=${encodeURIComponent(interactionPostId)}&src=${item.source}&comments=1`}
            onClick={(e) => { e.preventDefault(); handleComment(); }}
            aria-label={`View all ${formatCount(localComments) ?? localComments} comments on this post`}
            className="block px-3 pb-2 text-left active:opacity-70"
          >
            <p className="text-[13px] text-muted-foreground font-medium hover:text-foreground transition-colors">
              {commentsLinkLabel(localComments)}
            </p>
          </a>
        </>
      ) : null}

      {/* Comments Sheet — only mount when open */}
      {showComments && (
        <Suspense fallback={null}>
          <CommentsSheet
            open
            onClose={() => {
              setShowComments(false);
              closeCommentsDeepLink();
              void queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
            }}
            postId={interactionPostId}
            postSource={item.source === "poll" ? "user" : item.source}
            currentUserId={currentUserId}
            commentsCount={localComments}
            onCommentsCountChange={setLocalComments}
            canComment={canSubmitComment}
            disabledReason={commentDisabledReason}
          />
        </Suspense>
      )}

      {/* Views */}
      {item.media_type === "video" && item.views_count > 0 && (
        <div className="px-3 pb-2 flex items-center gap-1">
          <Eye className="h-3 w-3 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">{item.views_count.toLocaleString()} views</p>
        </div>
      )}

      {/* Share Sheet */}
      <AnimatePresence>
        {showShareSheet && (
          <Suspense fallback={null}>
            <UnifiedShareSheet
              shareUrl={shareUrl}
              shareText={item.caption || `Check out this post by ${item.author_name}`}
              shareMediaUrl={item.media_urls[0] || undefined}
              shareMediaType={item.media_type === "video" ? "video" : "image"}
              sharePostId={item.shared_from_post_id ? item.shared_from_post_id : item.id.replace(/^u-/, "")}
              postSource={item.shared_from_source ?? (item.source === "store" ? "store" : "user")}
              sharePostAuthorId={item.shared_from_user_id || item.author_id}
              sharePostAuthorName={item.shared_from_user_name || item.author_name}
              onClose={() => setShowShareSheet(false)}
              onShareRecorded={() => {
                setLocalShares((prev) => prev + 1);
              }}
              zIndex={70}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div
            key="qr-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
            onClick={() => setShowQrModal(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full sm:w-auto sm:min-w-[320px] px-6 pt-6 pb-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-foreground" />
                  <span className="text-base font-bold text-foreground">Share via QR</span>
                </div>
                <button type="button" onClick={() => setShowQrModal(false)} aria-label="Close QR modal" title="Close QR modal" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                  <XIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-border/20">
                  <img
                    src={qrImageUrl}
                    alt="QR code for this post"
                    className="w-[220px] h-[220px] block"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <p className="text-[12px] text-muted-foreground text-center px-4">Scan with any camera to open this post</p>
                <button type="button"
                  onClick={() => { void handleCopyLink(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold text-foreground transition-colors active:scale-95"
                >
                  <Link2 className="h-4 w-4" />
                  Copy link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Options Menu */}
      <SwipeableSheet
        open={showPostMenu}
        onClose={() => setShowPostMenu(false)}
        ariaLabel="Post options"
        zIndex={200}
        hideCloseButton
      >
        <div className="px-2 pb-4">
          {/* Owner-only actions surfaced at the TOP so they're visible without
              scrolling. Edit / Pin / Comment settings / Delete are the most
              relevant rows when viewing one's own post. */}
          {isOwner && (
            <>
              <button type="button"
                onClick={() => { setShowPostMenu(false); setEditCaptionText(item.caption || ""); setShowEditCaption(true); }}
                className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
              >
                <Pencil className="h-5 w-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">Edit caption</span>
              </button>
              <button type="button"
                onClick={async () => {
                  setShowPostMenu(false);
                  const realId = item.id.replace(/^u-/, "");
                  const table = item.source === "store" ? "store_posts" : "user_posts";
                  await (supabase as any).from(table).update({ is_pinned: true }).eq("id", realId);
                  toast.success("Post pinned to your profile");
                }}
                className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
              >
                <Pin className="h-5 w-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">Pin to profile</span>
              </button>
              <button type="button"
                onClick={() => { setShowPostMenu(false); setShowCommentSettings(true); }}
                className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
              >
                <Settings2 className="h-5 w-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">Comment settings</span>
              </button>
              <button type="button"
                onClick={async () => {
                  if (!confirm("Delete this post permanently? This cannot be undone.")) return;
                  setShowPostMenu(false);
                  const realId = item.id.replace(/^u-/, "");
                  const { error } = await supabase.from("user_posts").delete().eq("id", realId).eq("user_id", currentUserId);
                  if (error) {
                    toast.error("Failed to delete post");
                  } else {
                    toast.success("Post deleted");
                    queryClient.invalidateQueries({ queryKey: ["reels-feed-grid"] });
                    queryClient.invalidateQueries({ queryKey: ["customer-feed"] });
                  }
                }}
                className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-destructive/10 rounded-xl min-h-[48px]"
              >
                <Trash2 className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">Delete post</span>
              </button>
              <hr className="my-1 border-border/40" />
            </>
          )}
          <button type="button"
            onClick={() => { setShowPostMenu(false); setShowReportSheet(true); setReportStep("categories"); setReportCategory(""); }}
            className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
          >
            <Flag className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Report</span>
          </button>
          <button type="button"
            onClick={async () => {
              setShowPostMenu(false);
              if (!currentUserId) {
                showGuestActionPrompt("Log in to turn on post notifications", "/feed");
                return;
              }
              if (!notificationKey) {
                toast.info("Post notifications are available for photos and videos");
                return;
              }
              const nextNotificationsOn = !notificationsOn;
              const savedPreference = await setNotificationsOnPersisted(nextNotificationsOn);
              if (!savedPreference) {
                toast.error("Could not update notifications");
                return;
              }
              toast.success(nextNotificationsOn ? "Notifications turned on for this post" : "Notifications turned off");
            }}
            className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
          >
            {notificationsOn ? <BellOff className="h-5 w-5 text-foreground" /> : <Bell className="h-5 w-5 text-foreground" />}
            <span className="text-sm font-medium text-foreground">{notificationsOn ? "Turn off notifications" : "Turn on notifications"}</span>
          </button>
          <button type="button"
            onClick={() => { setShowPostMenu(false); void handleCopyLink(); }}
            className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
          >
            <Link2 className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Copy link</span>
          </button>
          <button type="button"
            onClick={() => {
              setShowPostMenu(false);
              hiddenPosts.hide(item.id, getFeedPreferenceSource(item) || undefined);
              toast.success("We'll show fewer like this");
            }}
            className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
          >
            <EyeOff className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Not interested</span>
          </button>

          {/* Sponsored-only: ad explanation */}
          {item.source === "store" && (
            <>
              <button type="button"
                onClick={() => {
                  setShowPostMenu(false);
                  toast.info("This is a sponsored post from a business on ZIVO. Ads are shown based on your activity and location.");
                }}
                className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
              >
                <HelpCircle className="h-5 w-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">Why am I seeing this?</span>
              </button>
              <button type="button"
                onClick={() => {
                  setShowPostMenu(false);
                  hiddenPosts.hide(item.id, getFeedPreferenceSource(item) || undefined);
                  toast.success("Ad hidden - you'll see fewer ads from this business");
                }}
                className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
              >
                <Ban className="h-5 w-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">Hide this ad</span>
              </button>
            </>
          )}
          {!isOwner && item.author_name && (
            <button type="button"
              onClick={async () => {
                setShowPostMenu(false);
                if (!currentUserId) {
                  showGuestActionPrompt("Log in to personalize your feed", "/feed");
                  return;
                }
                if (!item.author_id) {
                  toast.error("Could not snooze this creator");
                  return;
                }
                const authorSource = getFeedPreferenceSource(item);
                if (!authorSource) {
                  toast.info("Snooze is available for creators and stores");
                  return;
                }
                const savedSnooze = await snoozeFeedAuthor(currentUserId, item.author_id, authorSource, FEED_SNOOZE_DAYS);
                if (!savedSnooze) {
                  toast.error("Could not update feed preference");
                  return;
                }
                toast.success(`${item.author_name} snoozed for ${FEED_SNOOZE_DAYS} days`);
              }}
              className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
            >
              <BellOff className="h-5 w-5 text-foreground" />
              <span className="text-sm font-medium text-foreground">Snooze {item.author_name} for 30 days</span>
            </button>
          )}
          <button type="button"
            onClick={() => { setShowPostMenu(false); setShowShareSheet(true); }}
            className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
          >
            <Share2 className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Share</span>
          </button>

          {/* Save to device */}
          {item.media_urls.length > 0 && (
            <button type="button"
              onClick={async () => {
                setShowPostMenu(false);
                const url = item.media_urls[0];
                try {
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `zivo-post-${item.id}.${item.media_type === "video" ? "mp4" : "jpg"}`;
                  a.target = "_blank";
                  a.rel = "noopener noreferrer";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  toast.success("Download started");
                } catch {
                  toast.error("Could not download — try saving from gallery");
                }
              }}
              className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
            >
              <Download className="h-5 w-5 text-foreground" />
              <span className="text-sm font-medium text-foreground">Save to device</span>
            </button>
          )}

          {/* Embed post */}
          <button type="button"
            onClick={async () => {
              setShowPostMenu(false);
              const embedCode = `<iframe src="https://hizivo.com/embed/${item.id.replace(/^u-/, "")}" width="400" height="500" frameborder="0" allowfullscreen></iframe>`;
              try {
                await copyText(embedCode);
                void recordShareForFeedItem(item, "other").then((recorded) => {
                  if (recorded) setLocalShares((prev) => prev + 1);
                });
                toast.success("Embed code copied to clipboard");
              } catch {
                toast.info("Embed: " + embedCode.slice(0, 60) + "…");
              }
            }}
            className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
          >
            <Code2 className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Embed post</span>
          </button>

          {/* QR code share */}
          <button type="button"
            onClick={() => { setShowPostMenu(false); setShowQrModal(true); }}
            className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
          >
            <QrCode className="h-5 w-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">QR code</span>
          </button>

          {/* Tip creator */}
          {!isOwner && item.author_id && (
            <button type="button"
              onClick={() => { setShowPostMenu(false); setTipTarget({ id: item.author_id!, name: item.author_name }); }}
              className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
            >
              <Gift className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium text-foreground">Send Tip</span>
            </button>
          )}

        </div>
      </SwipeableSheet>

      {/* Report Sheet */}
      <SwipeableSheet
        open={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        ariaLabel="Report post"
        zIndex={210}
        hideCloseButton
        title={
          reportStep === "categories" ? (
            <h3 className="text-base font-bold text-foreground text-center">Report</h3>
          ) : reportStep === "sub" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReportStep("categories")}
                aria-label="Back"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center -ml-2"
              >
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
              <h3 className="text-base font-bold text-foreground truncate">{reportCategory}</h3>
            </div>
          ) : null
        }
      >
        {reportStep === "categories" ? (
          <>
            <p className="px-6 pb-4 text-xs text-muted-foreground">Why are you reporting this post? Your report is anonymous.</p>
            <div className="px-2 pb-6">
              {[
                { icon: AlertTriangle, label: "Spam" , desc: "Misleading or repetitive content" },
                { icon: ShieldAlert, label: "Scam or fraud", desc: "Trying to steal money or personal info" },
                { icon: UserX, label: "Fake account", desc: "Pretending to be someone else" },
                { icon: Ban, label: "Harassment or bullying", desc: "Targeting or intimidating someone" },
                { icon: Skull, label: "Violence or dangerous acts", desc: "Threatening or promoting violence" },
                { icon: EyeOff, label: "Nudity or sexual content", desc: "Inappropriate images or language" },
                { icon: Flag, label: "Hate speech", desc: "Attacking a group or individual" },
                { icon: ShieldAlert, label: "Intellectual property", desc: "Using content without permission" },
                { icon: HelpCircle, label: "Something else", desc: "Other issue not listed above" },
              ].map((r) => (
                <button type="button"
                  key={r.label}
                  onClick={() => { setReportCategory(r.label); setReportStep("sub"); }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px] text-left"
                >
                  <r.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.label}</p>
                    <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 shrink-0" />
                </button>
              ))}
            </div>
          </>
        ) : reportStep === "sub" ? (
          <>
            <p className="px-6 pb-4 text-xs text-muted-foreground">Select the option that best describes the issue.</p>
            <div className="px-2 pb-6">
              {((): { label: string }[] => {
                const subMap: Record<string, string[]> = {
                  "Spam": ["Promotional content", "Repetitive posts", "Bot activity", "Clickbait", "Misleading information"],
                  "Scam or fraud": ["Phishing attempt", "Financial scam", "Fake giveaway", "Identity theft", "Cryptocurrency scam", "Impersonating a business"],
                  "Fake account": ["Impersonating me", "Impersonating someone I know", "Impersonating a celebrity", "Impersonating a business or brand", "Bot or fake engagement"],
                  "Harassment or bullying": ["Threatening language", "Unwanted contact", "Intimidation", "Stalking behavior", "Revealing private info (doxxing)", "Encouraging self-harm"],
                  "Violence or dangerous acts": ["Graphic violence", "Threatening harm", "Glorifying violence", "Dangerous challenges", "Animal cruelty", "Terrorist content"],
                  "Nudity or sexual content": ["Nudity", "Sexual activity", "Sexual exploitation", "Non-consensual imagery", "Content involving minors"],
                  "Hate speech": ["Racism", "Religious discrimination", "Sexism or misogyny", "Homophobia or transphobia", "Disability discrimination", "Xenophobia"],
                  "Intellectual property": ["Copyright infringement", "Trademark violation", "Stolen content", "Unauthorized use of my work"],
                  "Something else": ["Misinformation", "Self-injury or suicide", "Drug sales", "Unauthorized sales", "Privacy violation", "Other"],
                };
                return (subMap[reportCategory] || ["Other"]).map((s) => ({ label: s }));
              })().map((sub) => (
                <button type="button"
                  key={sub.label}
                  onClick={async () => {
                    if (!currentUserId) {
                      showGuestActionPrompt("Log in to report posts", "/feed");
                      return;
                    }
                    // Step to the success screen first so the UI feels instant.
                    // The DB write is best-effort; failures only toast.
                    setReportStep("submitted");
                    if (item.source === "poll") {
                      // post_reports.post_source CHECK only allows store/user
                      return;
                    }
                    const sensitiveReport = isSensitiveReportReason(reportCategory, sub.label);
                    if (sensitiveReport) {
                      const preferenceSource = getFeedPreferenceSource(item);
                      if (preferenceSource) {
                        await hiddenPosts.hide(item.id, preferenceSource);
                      }
                    }
                    // Reason text is capped at 200 chars by the table CHECK constraint.
                    const reason = `${reportCategory}: ${sub.label}`.slice(0, 200);
                    const { error } = await (supabase as any).from("post_reports").insert({
                      reporter_id: currentUserId,
                      post_id: interactionPostId,
                      post_source: item.source,
                      reason,
                    });
                    if (error) toast.error("Couldn't submit report");
                    else if (sensitiveReport) toast.success("We hid this post and sent it for safety review");
                  }}
                  className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px] text-left"
                >
                  <span className="text-sm font-medium text-foreground">{sub.label}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 shrink-0" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Flag className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Thanks for reporting</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[260px]">
              We'll review this post and take action if it violates our community guidelines.
            </p>
            <button type="button"
              onClick={() => setShowReportSheet(false)}
              className="mt-4 px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm min-h-[48px]"
            >
              Done
            </button>
          </div>
        )}
      </SwipeableSheet>

      {/* Comment Settings Sheet (Owner only) */}
      <SwipeableSheet
        open={showCommentSettings}
        onClose={() => setShowCommentSettings(false)}
        ariaLabel="Comment settings"
        zIndex={220}
        title="Comment Settings"
      >
        <p className="px-6 pb-4 text-xs text-muted-foreground">
          Choose who can comment when comments are enabled. Turning comments off applies to this post.
        </p>
        <div className="px-2 pb-6 space-y-1">
          {([
            { value: "everyone" as const, icon: Globe, label: "Everyone", desc: "Anyone can comment on this post" },
            { value: "friends" as const, icon: UserCheck, label: "Friends only", desc: "Only your friends can comment" },
            { value: "off" as const, icon: MessageSquareOff, label: "Turn off comments", desc: "No one can comment on this post" },
          ] as const).map((opt) => (
            <button type="button"
              key={opt.value}
              onClick={() => {
                setShowCommentSettings(false);
                void persistCommentSetting(opt.value);
              }}
              className="flex items-center gap-4 w-full px-4 py-3.5 hover:bg-muted/50 rounded-xl min-h-[48px]"
            >
              <opt.icon className={cn("h-5 w-5", commentSetting === opt.value ? "text-primary" : "text-foreground")} />
              <div className="flex-1 text-left">
                <span className={cn("text-sm font-medium", commentSetting === opt.value ? "text-primary" : "text-foreground")}>{opt.label}</span>
                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
              </div>
              {commentSetting === opt.value && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </SwipeableSheet>

      {/* Edit Caption Sheet */}
      <SwipeableSheet
        open={showEditCaption}
        onClose={() => setShowEditCaption(false)}
        ariaLabel="Edit caption"
        zIndex={230}
        title="Edit Caption"
      >
        <div className="px-4 pb-6">
          <textarea
            value={editCaptionText}
            onChange={(e) => setEditCaptionText(e.target.value)}
            rows={4}
            maxLength={2200}
            className="w-full p-3 rounded-xl bg-muted/50 border border-border/40 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Write a caption..."
          />
          <p className="text-[10px] text-muted-foreground mt-1 mb-3">{editCaptionText.length}/2,200</p>
          <div className="flex gap-2">
            <button type="button"
              onClick={() => setShowEditCaption(false)}
              className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium"
            >
              Cancel
            </button>
            <button type="button"
              onClick={handleEditPost}
              disabled={editSaving}
              aria-label={editSaving ? "Saving post" : "Save post"}
              title={editSaving ? "Saving post" : "Save post"}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {editSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </SwipeableSheet>
      {/* Tip Sheet — only mount when needed to avoid loading Stripe.js */}
      {tipTarget && (
        <Suspense fallback={null}>
          <TipSheet
            open
            onClose={() => setTipTarget(null)}
            creatorId={tipTarget.id}
            creatorName={tipTarget.name}
          />
        </Suspense>
      )}

      {/* Unfollow confirm dialog */}
      {showUnfollowConfirm && (
        <Suspense fallback={null}>
          <AlertDialog open={showUnfollowConfirm} onOpenChange={setShowUnfollowConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unfollow?</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to unfollow {item.author_name}?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { executeFeedUnfollow(); setShowUnfollowConfirm(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, unfollow</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Suspense>
      )}
      {showSharedUnfollowConfirm && (
        <Suspense fallback={null}>
          <AlertDialog open={showSharedUnfollowConfirm} onOpenChange={setShowSharedUnfollowConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unfollow?</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to unfollow {sharedAuthorName}?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { executeSharedFeedUnfollow(); setShowSharedUnfollowConfirm(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, unfollow</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Suspense>
      )}
    </div>
  );
}, (prev, next) => {
  // Custom equality: only re-render when meaningful props change. The
  // onOpenFullscreen handler is recreated each parent render (closes over
  // filteredItems), so default Object.is would defeat the memo on every tab
  // click / state change.
  return (
    prev.item === next.item &&
    prev.currentUserId === next.currentUserId &&
    prev.autoPlayVideo === next.autoPlayVideo &&
    prev.detailMode === next.detailMode
  );
});
