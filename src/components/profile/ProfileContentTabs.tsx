import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ProfileFeedCard from "./ProfileFeedCard";
import UnifiedShareSheet from "@/components/shared/ShareSheet";
import { openPostShareSheet } from "@/lib/social/postShareSheet";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import CreatePostModal from "@/components/social/CreatePostModal";
import CommentsSheet from "@/components/social/CommentsSheet";
import SafeCaption from "@/components/social/SafeCaption";
import { stripImageMetadata } from "@/utils/stripImageMetadata";
import ReelThumbnail from "@/components/social/ReelThumbnail";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Heart, MessageCircle, Eye, X, SwitchCamera, Mic, MicOff, Sparkles, Loader2,
  Share2, Play, Radio, ChevronDown, Globe, Users, Lock, Link2, MoreHorizontal,
  MapPin, Image, Film, Grid3X3, Clapperboard, Camera, Trash2, Pencil, MoreVertical, Bookmark,
  Flag, Bell, EyeOff, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPublicOrigin, getProfileShareUrl } from "@/lib/getPublicOrigin";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { resolveSharedOrigins, type SharedOriginInfo } from "@/lib/social/resolveSharedOrigins";
import { isLocalDraftPostId, toUserPostInteractionId } from "@/lib/social/postInteraction";
import { useSwipeDownClose } from "@/components/social/useSwipeDownClose";
import { SwipeGrabHandle } from "@/components/social/SwipeGrabHandle";
import { logProfileActionError } from "@/lib/security/errorReporting";
import { getE2ESeedPosts } from "@/lib/testing/e2eSeed";
import { track } from "@/lib/analytics";
import { useHiddenPosts } from "@/hooks/useHiddenPosts";
import { copyText } from "@/lib/native/clipboard";

/**
 * Fullscreen post viewer wrapper with drag-down-to-close.
 * Drag is initiated from a child element marked
 * `data-profile-post-drag-handle`, so scrollable content beneath
 * keeps native pan-y behavior.
 */
function ProfilePostViewerOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { motionProps, startDrag } = useSwipeDownClose(onClose);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: "spring", damping: 30, stiffness: 320 }}
      {...motionProps}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest("[data-swipe-grab], [data-profile-post-drag-handle]")) {
          startDrag(e);
        }
      }}
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      style={{ paddingTop: "var(--zivo-safe-top-overlay)" }}
    >
      <SwipeGrabHandle
        onStartDrag={startDrag}
        onClose={onClose}
        tone="light"
        testId="profile-post-grab-handle"
      />
      {children}
    </motion.div>
  );
}

/**
 * AccessibleMenuSheet — wraps the post-actions bottom sheet so it is
 * keyboard- and screen-reader-friendly:
 *   - Acts as a `dialog`/menu region with `aria-modal`.
 *   - Focuses the first enabled menuitem on open and restores focus on close.
 *   - Escape closes the sheet.
 *   - Arrow keys move focus between visible menuitems (roving tabindex).
 */
function AccessibleMenuSheet({
  onClose,
  labelledById,
  children,
  className,
  testId,
}: {
  onClose: () => void;
  labelledById?: string;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = (document.activeElement as HTMLElement) || null;
    const root = ref.current;
    if (root) {
      const first = root.querySelector<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      );
      first?.focus();
    }
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (
      e.key !== "ArrowDown" &&
      e.key !== "ArrowUp" &&
      e.key !== "Home" &&
      e.key !== "End"
    ) {
      return;
    }
    const root = ref.current;
    if (!root) return;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    const enabled = items.filter(
      (el) => el.getAttribute("aria-disabled") !== "true",
    );
    if (enabled.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? enabled.indexOf(current) : -1;
    e.preventDefault();
    let next = idx;
    if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % enabled.length;
    else if (e.key === "ArrowUp")
      next = idx <= 0 ? enabled.length - 1 : idx - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    enabled[next]?.focus();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-modal="true"
      aria-labelledby={labelledById}
      data-testid={testId}
      onKeyDown={handleKeyDown}
      className={className}
    >
      {children}
    </div>
  );
}

type FeedItem = {
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
  sharedOrigin?: SharedOriginInfo | null;
  createdAt?: string;
  location?: string | null;
};

type NewPostPayload = {
  type: "photo" | "reel";
  caption: string;
  url: string;
  filterCss: string;
  file?: File | null;
};

type FilterGroup = "all" | "trending" | "new" | "pro";

const LOCAL_POSTS_KEY = "zivo_social_posts_v1";

const getLocalPostsKey = (ownerId?: string | null) =>
  ownerId ? `${LOCAL_POSTS_KEY}:${ownerId}` : null;

const readLocalPosts = (storageKey: string | null): FeedItem[] => {
  if (!storageKey) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as FeedItem[]) : [];
  } catch {
    return [];
  }
};

const writeLocalPosts = (storageKey: string | null, posts: FeedItem[]) => {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(posts));
  } catch {
    // Local persistence is best effort.
  }
};

type UserPostRow = {
  id: string;
  user_id: string;
  media_type: string;
  media_url: string | null;
  caption: string | null;
  filter_css: string | null;
  likes_count: number | null;
  comments_count: number | null;
  views_count: number | null;
  created_at: string;
  is_published: boolean;
  shared_from_post_id: string | null;
  shared_from_user_id: string | null;
  location: string | null;
};

const normalizeFeedItemType = (mediaType: string | null | undefined): "photo" | "reel" =>
  mediaType === "reel" || mediaType === "video" ? "reel" : "photo";

const demoFeed: FeedItem[] = [];

type TabFilter = "all" | "photo" | "reel";

const TABS: { id: TabFilter; label: string; icon: typeof Grid3X3 }[] = [
  { id: "all", label: "All", icon: Grid3X3 },
  { id: "photo", label: "Photos", icon: Image },
  { id: "reel", label: "Reels", icon: Clapperboard },
];

type ProfileShareChannel =
  | "copy_link" | "native" | "email" | "sms"
  | "whatsapp" | "telegram" | "facebook" | "x" | "other";

const profileNotificationStorageKey = (userId: string) => `zivo:feed:post-notifications:v1:${userId}`;
const PROFILE_POST_NOTIFICATIONS_EVENT = "zivo:feed-post-notifications-changed";

const profileNotificationPostKey = (postId: string) => `user:${postId.replace(/^u-/, "")}`;
const profileNotificationPostId = (postId: string) => postId.replace(/^u-/, "");

const readProfileNotificationSet = (userId: string | undefined): Set<string> => {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(profileNotificationStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed.filter((value) => typeof value === "string")) : new Set();
  } catch {
    return new Set();
  }
};

const normalizeProfileShareChannel = (channel: string): ProfileShareChannel => {
  const normalized = channel.toLowerCase();
  if (normalized === "clipboard") return "copy_link";
  if (normalized === "messages") return "sms";
  if (
    normalized === "copy_link" ||
    normalized === "native" ||
    normalized === "email" ||
    normalized === "sms" ||
    normalized === "whatsapp" ||
    normalized === "telegram" ||
    normalized === "facebook" ||
    normalized === "x"
  ) {
    return normalized;
  }
  return "other";
};

export default function ProfileContentTabs({
  userId,
  profileDisplayName,
  profileAvatarUrl,
  onPostsChanged,
}: {
  userId?: string;
  profileDisplayName?: string | null;
  profileAvatarUrl?: string | null;
  onPostsChanged?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const profileOwnerId = userId || user?.id;
  const localPostsKey = useMemo(() => getLocalPostsKey(profileOwnerId), [profileOwnerId]);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [composerType, setComposerType] = useState<"photo" | "reel" | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileShareCode, setProfileShareCode] = useState<string | null>(null);
  const [profilePublicId, setProfilePublicId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<FeedItem | null>(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editCaptionValue, setEditCaptionValue] = useState("");
  const [showLive, setShowLive] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>(() => {
    const seeded = getE2ESeedPosts();
    return seeded && seeded.length > 0 ? (seeded as FeedItem[]) : demoFeed;
  });
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedReloadKey, setFeedReloadKey] = useState(0);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [commentPost, setCommentPost] = useState<FeedItem | null>(null);
  const [showProfileMoreShare, setShowProfileMoreShare] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [notifPosts, setNotifPosts] = useState<Set<string>>(new Set());
  const profileHiddenPosts = useHiddenPosts(user?.id);
  const currentProfileName = profileDisplayName || profileName;
  const currentProfileAvatar = profileAvatarUrl || profileAvatar;
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportStep, setReportStep] = useState<"categories" | "sub" | "submitted">("categories");
  const [reportCategory, setReportCategory] = useState("");
  const [showCommentSettingsSheet, setShowCommentSettingsSheet] = useState(false);
  const [commentControl, setCommentControl] = useState<"everyone" | "followers" | "off">("everyone");
  const [reportedPosts, setReportedPosts] = useState<Set<string>>(new Set());
  // 10s undo window for the most-recently submitted report.
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const [undoPostId, setUndoPostId] = useState<string | null>(null);
  const undoTargetRef = useRef<{ postId: string; expiresAt: number } | null>(null);
  const undoTickerRef = useRef<number | null>(null);

  // Restore "Reported" status from localStorage (per-user, survives reloads).
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`zivo_reported_posts:${user.id}`);
      if (raw) setReportedPosts(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore corrupt cache */
    }
  }, [user?.id]);

  const persistReported = useCallback(
    (next: Set<string>) => {
      if (!user?.id) return;
      try {
        localStorage.setItem(
          `zivo_reported_posts:${user.id}`,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        /* quota exceeded — non-fatal */
      }
    },
    [user?.id],
  );

  // --- Report undo (10s window) -------------------------------------------
  const stopUndoTicker = useCallback(() => {
    if (undoTickerRef.current !== null) {
      window.clearInterval(undoTickerRef.current);
      undoTickerRef.current = null;
    }
  }, []);

  const performUndo = useCallback(
    async (postId: string) => {
      setReportedPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        persistReported(next);
        return next;
      });
      undoTargetRef.current = null;
      stopUndoTicker();
      setUndoSecondsLeft(0);
      setUndoPostId(null);
      try {
        if (user?.id) {
          await (supabase as any)
            .from("post_reports")
            .delete()
            .eq("post_id", toUserPostInteractionId(postId))
            .eq("reporter_id", user.id);
        }
      } catch (err) {
        logProfileActionError("report.undo", { postId, userId: user?.id }, err);
      }
      toast.success("Report undone");
    },
    [persistReported, stopUndoTicker, user?.id],
  );

  const startUndoWindow = useCallback(
    (postId: string) => {
      stopUndoTicker();
      undoTargetRef.current = { postId, expiresAt: Date.now() + 10_000 };
      setUndoPostId(postId);
      setUndoSecondsLeft(10);
      undoTickerRef.current = window.setInterval(() => {
        const target = undoTargetRef.current;
        if (!target) {
          stopUndoTicker();
          setUndoSecondsLeft(0);
          setUndoPostId(null);
          return;
        }
        const remaining = Math.max(0, Math.ceil((target.expiresAt - Date.now()) / 1000));
        setUndoSecondsLeft(remaining);
        if (remaining <= 0) {
          undoTargetRef.current = null;
          stopUndoTicker();
          setUndoPostId(null);
        }
      }, 250) as unknown as number;

      // Global toast affordance — survives the user dismissing the sheet.
      toast.success("Report submitted", {
        description: "You have 10 seconds to undo.",
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: () => {
            const t = undoTargetRef.current;
            if (t && t.postId === postId && Date.now() <= t.expiresAt) {
              void performUndo(postId);
            }
          },
        },
      });
    },
    [performUndo, stopUndoTicker],
  );

  useEffect(() => () => stopUndoTicker(), [stopUndoTicker]);

  useEffect(() => {
    const sync = () => setNotifPosts(readProfileNotificationSet(user?.id));
    const syncRemote = async () => {
      if (!user?.id) {
        setNotifPosts(new Set());
        return;
      }

      const local = readProfileNotificationSet(user.id);
      const { data, error } = await (supabase as any)
        .from("feed_post_notification_subscriptions")
        .select("post_id")
        .eq("user_id", user.id)
        .eq("post_source", "user");

      if (error) {
        setNotifPosts(local);
        return;
      }

      const merged = new Set(local);
      (data ?? []).forEach((row: { post_id: string }) => {
        if (row?.post_id) merged.add(profileNotificationPostKey(row.post_id));
      });

      const localOnlyKeys = [...local].filter((key) => key.startsWith("user:"));
      await Promise.allSettled(
        localOnlyKeys.map((key) =>
          (supabase as any)
            .from("feed_post_notification_subscriptions")
            .upsert(
              {
                user_id: user.id,
                post_id: key.replace(/^user:/, ""),
                post_source: "user",
              },
              { onConflict: "user_id,post_id,post_source", ignoreDuplicates: true },
            ),
        ),
      );

      try {
        localStorage.setItem(profileNotificationStorageKey(user.id), JSON.stringify(Array.from(merged)));
      } catch {
        /* non-fatal */
      }
      setNotifPosts(merged);
    };
    sync();
    void syncRemote();
    window.addEventListener(PROFILE_POST_NOTIFICATIONS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROFILE_POST_NOTIFICATIONS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [user?.id]);

  useEffect(() => {
    const nextName = currentProfileName?.trim();
    const nextAvatar = currentProfileAvatar || "";
    if (!nextName && !nextAvatar) return;

    setFeed((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const userPatch = { ...item.user };
        let itemChanged = false;
        if (nextName && userPatch.name !== nextName) {
          userPatch.name = nextName;
          changed = true;
          itemChanged = true;
        }
        if (nextAvatar && userPatch.avatar !== nextAvatar) {
          userPatch.avatar = nextAvatar;
          changed = true;
          itemChanged = true;
        }
        return itemChanged ? { ...item, user: userPatch } : item;
      });
      return changed ? next : prev;
    });
  }, [currentProfileAvatar, currentProfileName]);

  const persistProfileNotifications = useCallback(
    (next: Set<string>) => {
      if (!user?.id) return false;
      try {
        localStorage.setItem(profileNotificationStorageKey(user.id), JSON.stringify(Array.from(next)));
        window.dispatchEvent(new Event(PROFILE_POST_NOTIFICATIONS_EVENT));
        return true;
      } catch {
        /* non-fatal */
        return false;
      }
    },
    [user?.id],
  );

  const togglePostNotifications = useCallback(
    async (postId: string) => {
      if (!user?.id) {
        toast.error("Please sign in to turn on notifications");
        return;
      }
      const key = profileNotificationPostKey(postId);
      const remotePostId = profileNotificationPostId(postId);
      const isOn = notifPosts.has(key);
      const next = new Set(notifPosts);
      if (isOn) next.delete(key);
      else next.add(key);
      setNotifPosts(next);
      const savedLocal = persistProfileNotifications(next);
      if (!savedLocal) {
        toast.error("Could not update notifications");
        return;
      }

      try {
        if (isOn) {
          await (supabase as any)
            .from("feed_post_notification_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("post_id", remotePostId)
            .eq("post_source", "user");
        } else {
          await (supabase as any)
            .from("feed_post_notification_subscriptions")
            .upsert(
              {
                user_id: user.id,
                post_id: remotePostId,
                post_source: "user",
              },
              { onConflict: "user_id,post_id,post_source", ignoreDuplicates: true },
            );
        }
      } catch (err) {
        logProfileActionError("notifications.update", { postId: remotePostId, userId: user.id }, err);
      }
      toast.success(isOn ? "Notifications turned off" : "Notifications turned on for this post");
    },
    [notifPosts, persistProfileNotifications, user?.id],
  );

  const recordProfilePostShare = useCallback(
    async (postId: string, channel: ProfileShareChannel) => {
      if (isLocalDraftPostId(postId)) return;
      try {
        await (supabase as any).rpc("record_post_share", {
          _post_id: postId.replace(/^u-/, ""),
          _source: "user",
          _channel: channel,
        });
        track("share_completed", { post_id: postId, author_id: profileOwnerId, channel, surface: "profile_feed" });
      } catch (err) {
        logProfileActionError("share.record", { postId, channel, profileOwnerId }, err);
      }
    },
    [profileOwnerId],
  );

  const visibleFeed = feed.filter((i) => (
    !profileHiddenPosts.isHidden(i.id, "user") &&
    !profileHiddenPosts.isHidden(toUserPostInteractionId(i.id), "user")
  ));
  const filtered = activeTab === "all" ? visibleFeed : visibleFeed.filter((i) => i.type === activeTab);
  const refreshFeed = useCallback(() => {
    setFeedReloadKey((key) => key + 1);
  }, []);
  const openCreatePost = useCallback((type: "photo" | "reel" | null = null) => {
    if (!user?.id) {
      toast.info("Sign in to create a post");
      navigate("/login?redirect=/profile");
      return;
    }
    setComposerType(type);
    setShowCreatePost(true);
  }, [navigate, user?.id]);
  const openLiveBroadcast = useCallback(() => {
    if (!user?.id) {
      toast.info("Sign in to go live");
      navigate("/login?redirect=/profile");
      return;
    }
    setShowLive(true);
  }, [navigate, user?.id]);
  const closeCreatePost = useCallback(() => {
    setShowCreatePost(false);
    setComposerType(null);
  }, []);
  const emptyState = useMemo(() => {
    if (activeTab === "photo") {
      return {
        title: "No photos yet",
        description: "Add a photo to start building your profile gallery.",
        action: "Add photo",
        mode: "photo" as const,
        icon: Image,
      };
    }
    if (activeTab === "reel") {
      return {
        title: "No reels yet",
        description: "Create a reel when you are ready to share motion.",
        action: "Create reel",
        mode: "reel" as const,
        icon: Clapperboard,
      };
    }
    return {
      title: "No posts yet",
      description: "Share your first update, photo, or reel from here.",
      action: "Create post",
      mode: null,
      icon: Plus,
    };
  }, [activeTab]);
  const EmptyStateIcon = emptyState.icon;

  useEffect(() => {
    let alive = true;

    // Reset feed when profile owner changes — but keep E2E seed posts so
    // tests don't lose their fixture data after the first effect tick.
    const seeded = getE2ESeedPosts();
    setFeed(seeded && seeded.length > 0 ? (seeded as FeedItem[]) : []);

    const mergeFeed = (incoming: FeedItem[]) => {
      setFeed((prev) => {
        const deduped = new Map<string, FeedItem>();
        [...incoming, ...prev].forEach((item) => {
          deduped.set(item.id, item);
        });
        return Array.from(deduped.values());
      });
    };

    const DEMO_IDS = new Set(["p1","p2","p3","p4","p5","p6","v1","v2","v3"]);

    const loadPersisted = async () => {
      setFeedLoading(true);
      setFeedError(null);

      // Fetch the profile avatar
      if (profileOwnerId) {
        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, user_id, avatar_url, full_name, share_code")
            .eq("user_id", profileOwnerId)
            .maybeSingle();
          if (alive && profileData?.avatar_url) {
            setProfileAvatar(profileData.avatar_url);
          }
          if (alive && profileData?.full_name) {
            setProfileName(profileData.full_name);
          }
          if (alive) {
            setProfileShareCode((profileData as any)?.share_code || null);
            setProfilePublicId((profileData as any)?.id || profileOwnerId || null);
          }
        } catch {}
      }

      try {
        const cachedPosts = readLocalPosts(localPostsKey);
        const localPosts = cachedPosts.filter((p) => !DEMO_IDS.has(p.id));
        if (cachedPosts.length !== localPosts.length) {
          writeLocalPosts(localPostsKey, localPosts);
        }
        if (localPosts.length > 0) {
          if (alive) {
            mergeFeed(localPosts);
          }
        }
      } catch {
      }

      try {
        const query = (supabase as any)
          .from("user_posts")
          .select("id, user_id, media_type, media_url, caption, filter_css, likes_count, comments_count, views_count, created_at, is_published, shared_from_post_id, shared_from_user_id, location")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(50);

        if (profileOwnerId) {
          query.eq("user_id", profileOwnerId);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!alive || !data) return;

        // Fetch avatars for all unique user IDs
        const userIds = [...new Set((data as UserPostRow[]).map((r) => r.user_id))];
        const avatarMap: Record<string, { avatar_url: string | null; full_name: string | null; is_verified: boolean }> = {};
        if (userIds.length > 0) {
          try {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, avatar_url, full_name, is_verified")
              .in("user_id", userIds);
            if (profiles) {
              for (const p of profiles as any[]) {
                avatarMap[p.user_id] = { avatar_url: p.avatar_url, full_name: p.full_name, is_verified: p.is_verified === true };
              }
            }
          } catch {}
        }

        const sharedPostIds = (data as UserPostRow[])
          .map((row) => row.shared_from_post_id)
          .filter(Boolean) as string[];
        const sharedUserIds = (data as UserPostRow[])
          .map((row) => row.shared_from_user_id)
          .filter(Boolean) as string[];

        const { originByPostId, originByUserId } = await resolveSharedOrigins({
          sharedPostIds,
          sharedUserIds,
        });

        const remotePosts: FeedItem[] = (data as UserPostRow[])
          .map((row) => {
            const normalizedType = normalizeFeedItemType(row.media_type);
            const prof = avatarMap[row.user_id];
            const displayName = prof?.full_name || (row.user_id === user?.id ? (user?.email?.split("@")[0] || "You") : "Zivo User");
            const sharedOrigin =
              (row.shared_from_post_id ? originByPostId[row.shared_from_post_id] || null : null) ||
              (row.shared_from_user_id ? originByUserId[row.shared_from_user_id] || null : null);

            return {
              id: row.id,
              type: normalizedType,
              likes: Number(row.likes_count ?? 0),
              comments: Number(row.comments_count ?? 0),
              caption: row.caption || "",
              time: row.created_at ? "recent" : "now",
              url: row.media_url || null,
              filterCss: row.filter_css || undefined,
              views: normalizedType === "reel" ? Number(row.views_count ?? 0) : undefined,
              user: {
                name: displayName,
                avatar: prof?.avatar_url || "",
                isVerified: prof?.is_verified === true,
              },
              isShared: Boolean(row.shared_from_post_id || row.shared_from_user_id),
              sharedOrigin,
              createdAt: row.created_at,
              location: row.location ?? null,
            };
          })
          .filter((item) => Boolean(item.url) || Boolean(item.caption.trim()));

        if (remotePosts.length > 0) mergeFeed(remotePosts);
      } catch (err) {
        if (!alive) return;
        console.error("[ProfileContentTabs] failed to load posts", err);
        setFeedError(err instanceof Error ? err.message : "Posts could not load");
      } finally {
        if (alive) setFeedLoading(false);
      }
    };

    void loadPersisted();
    return () => {
      alive = false;
    };
  }, [localPostsKey, profileOwnerId, feedReloadKey, user?.email, user?.id]);

  const buildPublicPostShareUrl = useCallback((postId: string) => {
    if (profileShareCode) {
      return `${getProfileShareUrl(profileShareCode)}&post=${encodeURIComponent(postId)}`;
    }

    const publicId = profilePublicId || profileOwnerId || user?.id || "";
    if (!publicId) return getPublicOrigin();

    return `${getPublicOrigin()}/user/${encodeURIComponent(publicId)}?post=${encodeURIComponent(postId)}`;
  }, [profileOwnerId, profilePublicId, profileShareCode, user?.id]);

  useEffect(() => {
    let alive = true;

    const loadBookmarkedPosts = async () => {
      if (!user?.id) {
        if (alive) setBookmarkedPosts(new Set());
        return;
      }

      const interactionIds = feed
        .map((item) => item.id)
        .filter((postId) => !isLocalDraftPostId(postId))
        .map(toUserPostInteractionId);

      if (!interactionIds.length) {
        if (alive) setBookmarkedPosts(new Set());
        return;
      }

      const { data } = await (supabase as any)
        .from("bookmarks")
        .select("item_id")
        .eq("user_id", user.id)
        .eq("item_type", "post")
        .in("item_id", interactionIds);

      if (!alive) return;
      setBookmarkedPosts(new Set((data ?? []).map((row: any) => row.item_id)));
    };

    void loadBookmarkedPosts();

    return () => {
      alive = false;
    };
  }, [feed, user?.id]);

  // Hydrate likedPosts from post_likes for current user
  useEffect(() => {
    let alive = true;
    const loadLiked = async () => {
      if (!user?.id) {
        if (alive) setLikedPosts(new Set());
        return;
      }
      const postIds = feed
        .map((item) => item.id)
        .filter((id) => !isLocalDraftPostId(id));
      if (!postIds.length) {
        if (alive) setLikedPosts(new Set());
        return;
      }
      try {
        const { data } = await (supabase as any)
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);
        if (!alive) return;
        setLikedPosts(new Set((data ?? []).map((r: any) => String(r.post_id))));
      } catch {
        /* non-fatal */
      }
    };
    void loadLiked();
    return () => {
      alive = false;
    };
  }, [feed, user?.id]);

  const handleLikeToggle = useCallback(async (item: FeedItem) => {
    if (!user?.id) {
      toast.error("Please sign in to like posts");
      return;
    }
    if (isLocalDraftPostId(item.id)) {
      toast.info("This post is still syncing. Try again in a moment.");
      return;
    }

    const wasLiked = likedPosts.has(item.id);
    // optimistic
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setFeed((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, likes: Math.max(0, p.likes + (wasLiked ? -1 : 1)) } : p,
      ),
    );

    try {
      if (wasLiked) {
        const { error } = await (supabase as any)
          .from("post_likes")
          .delete()
          .eq("post_id", item.id)
          .eq("user_id", user.id);
        if (error) throw error;
        track("post_unliked", { post_id: item.id, author_id: profileOwnerId, surface: "profile_feed" });
      } else {
        // Idempotent insert — duplicate (23505) means the row already exists,
        // which is the desired end state, so treat as success.
        const { error } = await (supabase as any)
          .from("post_likes")
          .insert({ post_id: item.id, user_id: user.id });
        const dupKey = (error as any)?.code === "23505";
        if (error && !dupKey) throw error;
        track("post_liked", { post_id: item.id, author_id: profileOwnerId, surface: "profile_feed", deduped: dupKey });
        // notify author (best-effort) — only on a real new like
        if (!error && profileOwnerId && profileOwnerId !== user.id) {
          try {
            const { data: sp } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", user.id)
              .single();
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_id: profileOwnerId,
                notification_type: "post_liked",
                title: "New Like ❤️",
                body: `${(sp as any)?.full_name || "Someone"} liked your post`,
                data: {
                  type: "post_liked",
                  post_id: item.id,
                  liker_id: user.id,
                  action_url: `/profile?post=${item.id}`,
                },
              },
            });
          } catch {
            /* push failures are non-fatal */
          }
        }
      }
    } catch (error: any) {
      // rollback
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      setFeed((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, likes: Math.max(0, p.likes + (wasLiked ? 1 : -1)) } : p,
        ),
      );
      logProfileActionError(
        "like.toggle",
        { postId: item.id, op: wasLiked ? "delete" : "insert", userId: user?.id },
        error,
      );
      toast.error(error?.message || "Failed to update like");
    }
  }, [likedPosts, user?.id, profileOwnerId]);

  const uploadMediaToSupabase = useCallback(async (file?: File | null) => {
    if (!file) return null;
    const safe = await stripImageMetadata(file);
    const extension = safe.name.split(".").pop() || (safe.type.startsWith("video/") ? "webm" : "jpg");
    const objectPath = `${user?.id || "guest"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    try {
      const { error } = await supabase.storage.from("user-posts").upload(objectPath, safe, {
        upsert: false,
        contentType: safe.type || undefined,
      });
      if (error) return null;
      const { data } = supabase.storage.from("user-posts").getPublicUrl(objectPath);
      return data.publicUrl;
    } catch {
      return null;
    }
  }, [user?.id]);

  const persistLocalPost = useCallback((post: FeedItem) => {
    if (!post.url || post.url.startsWith("blob:")) return;
    const existing = readLocalPosts(localPostsKey);
    const next = [post, ...existing.filter((item) => item.id !== post.id)].slice(0, 100);
    writeLocalPosts(localPostsKey, next);
  }, [localPostsKey]);

  const handleCreatePost = useCallback(async (payload: NewPostPayload) => {
    const authorName = user?.email?.split("@")[0] || "You";
    const uploadedUrl = await uploadMediaToSupabase(payload.file);
    const mediaUrl = uploadedUrl || payload.url;

    const createdPost: FeedItem = {
      id: `post-${Date.now()}`,
      type: payload.type,
      likes: 0,
      comments: 0,
      caption: payload.caption,
      time: "now",
      url: mediaUrl,
      filterCss: payload.filterCss,
      views: payload.type === "reel" ? 0 : undefined,
      user: { name: authorName, avatar: currentProfileAvatar || "" },
    };

    setFeed((prev) => [createdPost, ...prev]);
    persistLocalPost(createdPost);

    if (user?.id) {
      try {
        await (supabase as any).from("user_posts").insert({
          user_id: user.id,
          media_type: createdPost.type,
          media_url: createdPost.url,
          caption: createdPost.caption,
          filter_css: createdPost.filterCss || null,
          is_published: true,
        });
      } catch {
        // Ignore remote write issues; local feed already updated.
      }
    }
    onPostsChanged?.();
  }, [currentProfileAvatar, onPostsChanged, persistLocalPost, uploadMediaToSupabase, user?.email, user?.id]);

  const handleDeletePost = useCallback(async (postId: string) => {
    setFeed((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPost(null);
    setShowPostMenu(false);
    writeLocalPosts(localPostsKey, readLocalPosts(localPostsKey).filter((p) => p.id !== postId));
    if (user?.id) {
      try { await (supabase as any).from("user_posts").delete().eq("id", postId); } catch {}
    }
    onPostsChanged?.();
    toast.success("Post deleted");
  }, [localPostsKey, onPostsChanged, user?.id]);

  const handleEditCaption = useCallback(async (postId: string, newCaption: string) => {
    setFeed((prev) => prev.map((p) => p.id === postId ? { ...p, caption: newCaption } : p));
    setSelectedPost((prev) => prev ? { ...prev, caption: newCaption } : null);
    setEditingCaption(false);
    setShowPostMenu(false);
    writeLocalPosts(localPostsKey, readLocalPosts(localPostsKey).map((p) => p.id === postId ? { ...p, caption: newCaption } : p));
    if (user?.id) {
      try { await (supabase as any).from("user_posts").update({ caption: newCaption }).eq("id", postId); } catch {}
    }
    toast.success("Caption updated");
  }, [localPostsKey, user?.id]);

  const openComments = useCallback((item: FeedItem) => {
    if (isLocalDraftPostId(item.id)) {
      toast.info("This post is still syncing. Refresh in a moment to comment.");
      return;
    }

    track("post_comment_opened", { post_id: item.id, author_id: profileOwnerId, surface: "profile_feed" });
    setCommentPost(item);
  }, [profileOwnerId]);

  const handleBookmarkToggle = useCallback(async (item: FeedItem) => {
    if (!user?.id) {
      toast.error("Please sign in to bookmark posts");
      return;
    }

    if (isLocalDraftPostId(item.id)) {
      toast.info("This post is still syncing. Refresh in a moment to save it.");
      return;
    }

    const interactionId = toUserPostInteractionId(item.id);
    const wasBookmarked = bookmarkedPosts.has(interactionId);

    setBookmarkedPosts((prev) => {
      const next = new Set(prev);
      if (wasBookmarked) next.delete(interactionId);
      else next.add(interactionId);
      return next;
    });

    try {
      if (wasBookmarked) {
        const { error } = await (supabase as any)
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", "post")
          .eq("item_id", interactionId);

        if (error) throw error;
        track("post_unbookmarked", { post_id: item.id, author_id: profileOwnerId, surface: "profile_feed" });
        toast.success("Removed from bookmarks");
      } else {
        const { error } = await (supabase as any).from("bookmarks").insert({
          user_id: user.id,
          item_id: interactionId,
          item_type: "post",
        });

        const dupKey = (error as any)?.code === "23505";
        if (error && !dupKey) throw error;
        track("post_bookmarked", { post_id: item.id, author_id: profileOwnerId, surface: "profile_feed", deduped: dupKey });
        toast.success("Saved to bookmarks");
      }
    } catch (error: any) {
      setBookmarkedPosts((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.add(interactionId);
        else next.delete(interactionId);
        return next;
      });
      logProfileActionError(
        "bookmark.toggle",
        { postId: interactionId, op: wasBookmarked ? "delete" : "insert", userId: user?.id },
        error,
      );
      toast.error(error?.message || "Bookmark failed");
    }
  }, [bookmarkedPosts, profileOwnerId, user?.id]);


  return (
    <div className="space-y-4">
      {/* Create Post Bar */}
      <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/10 bg-card rounded-2xl">
        <button
          type="button"
          onClick={() => openCreatePost()}
          className="min-w-0 flex flex-1 items-center gap-3 rounded-xl text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border-2 border-primary/20 shrink-0">
            {currentProfileAvatar ? (
              <img src={currentProfileAvatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground/50">
                <Camera className="h-4 w-4" />
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground flex-1 truncate">What's on your mind?</span>
        </button>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            aria-label="Create photo post"
            title="Photo"
            onClick={() => openCreatePost("photo")}
            className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center transition hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            <Image className="h-3.5 w-3.5 text-emerald-600" />
          </button>
          <button
            type="button"
            aria-label="Create reel"
            title="Reel"
            onClick={() => openCreatePost("reel")}
            className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center transition hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            <Film className="h-3.5 w-3.5 text-blue-600" />
          </button>
          <button
            type="button"
            aria-label="Go live from camera"
            title="Live camera"
            onClick={openLiveBroadcast}
            className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center transition hover:bg-orange-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
          >
            <Camera className="h-3.5 w-3.5 text-orange-600" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button type="button"
              key={tab.id}
              data-testid={`profile-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Feed - conditional layout */}
      {feedLoading && filtered.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl bg-card text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Loading posts...</span>
        </div>
      ) : feedError && filtered.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-card px-4 text-center">
          <p className="text-sm font-semibold text-foreground">Posts could not load</p>
          <p className="max-w-xs text-xs text-muted-foreground">{feedError}</p>
          <button
            type="button"
            onClick={refreshFeed}
            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:scale-[0.98]"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card px-5 py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <EmptyStateIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-foreground">{emptyState.title}</p>
          <p className="mt-1 max-w-[260px] text-xs leading-5 text-muted-foreground">{emptyState.description}</p>
          <button
            type="button"
            onClick={() => openCreatePost(emptyState.mode)}
            className="mt-4 inline-flex min-h-[38px] items-center justify-center rounded-full bg-foreground px-4 text-xs font-bold text-background transition active:scale-[0.98]"
          >
            {emptyState.action}
          </button>
        </div>
      ) : activeTab === "all" ? (
        /* Feed-style view for "All" tab — full parity with main feed */
        <div className="divide-y divide-border/30">
          {filtered.map((item) => (
            <ProfileFeedCard
              key={item.id}
              testId={`profile-post-thumb-${item.id}`}
              item={{
                ...item,
                userId: profileOwnerId,
              }}
              currentUserId={user?.id}
              profileOwnerId={profileOwnerId}
              isLiked={likedPosts.has(item.id)}
              isBookmarked={bookmarkedPosts.has(toUserPostInteractionId(item.id))}
              onToggleLike={(feedItem) => void handleLikeToggle(feedItem as any)}
              onToggleBookmark={(feedItem) => void handleBookmarkToggle(feedItem as any)}
              onOpenMenu={(feedItem) => { setSelectedPost(feedItem as any); setShowPostMenu(true); }}
              onShare={(postId) => {
                track("share_button_tapped", { post_id: postId, author_id: profileOwnerId, surface: "profile_feed" });
                const p = feed.find((x) => x.id === postId);
                openPostShareSheet({
                  postId,
                  url: buildPublicPostShareUrl(postId),
                  title: p?.user?.name ? `${p.user.name} on ZIVO` : "ZIVO post",
                  text: p?.caption || "Check out this post on ZIVO",
                  imageUrl: p?.url ?? null,
                  onSendToFriend: () => openShareToChat({
                    kind: "post" as never,
                    title: p?.user?.name ? `${p.user.name} on ZIVO` : "ZIVO post",
                    subtitle: p?.caption?.slice(0, 80),
                    image: p?.url ?? null,
                    deepLink: buildPublicPostShareUrl(postId),
                  }),
                  onShared: (channel) => {
                    void recordProfilePostShare(postId, normalizeProfileShareChannel(channel));
                  },
                });
              }}
              onSelectPost={(feedItem) => setSelectedPost(feedItem as any)}
            />
          ))}
        </div>
      ) : (
        /* Grid view for Photos/Reels tabs or empty state */
        <div className={cn(
          "grid gap-0.5 rounded-2xl overflow-hidden",
          activeTab === "reel" ? "grid-cols-2" : "grid-cols-3"
        )}>
          {filtered.map((item) => {
            const hasMedia = Boolean(item.url);
            return (
              <motion.div
                key={item.id}
                data-testid={`profile-post-thumb-${item.id}`}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedPost(item)}
                className={cn(
                  "relative bg-muted/40 group cursor-pointer overflow-hidden",
                  item.type === "reel" ? "aspect-[9/14]" : "aspect-square"
                )}
              >
                {hasMedia ? (
                  item.type === "reel" ? (
                    <ReelThumbnail url={item.url!} filterCss={item.filterCss} />
                  ) : (
	                    <img src={item.url || undefined} alt={item.caption || "Post"} className="absolute inset-0 w-full h-full object-cover" style={{ filter: item.filterCss || "none" }} loading="lazy" decoding="async" />
                  )
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-card to-muted/30 p-2.5 flex flex-col">
                    <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center mb-auto">
                      <Share2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-[10px] font-medium text-foreground/80 line-clamp-4 whitespace-pre-wrap break-words leading-tight mt-auto">{item.caption || "Shared post"}</p>
                  </div>
                )}
                {item.isShared && hasMedia && (
                  <div className="absolute top-1.5 left-1.5 z-10 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                    <Share2 className="w-2.5 h-2.5 text-white" />
                    <span className="text-[9px] text-white font-bold">Shared</span>
                  </div>
                )}
                {item.type === "reel" && hasMedia && (
                  <div className="absolute top-1.5 right-1.5 z-10"><Play className="w-4 h-4 text-white fill-white drop-shadow-lg" /></div>
                )}
                {item.type === "reel" && hasMedia && item.views && (
                  <div className="absolute bottom-1.5 left-1.5 z-10 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5 text-white" /><span className="text-[9px] text-white font-bold">{item.views > 1000 ? `${(item.views / 1000).toFixed(1)}k` : item.views}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="flex items-center gap-0.5 text-white text-[10px] font-bold"><Heart className="w-3 h-3 fill-white" /> {item.likes}</span>
                  <span className="flex items-center gap-0.5 text-white text-[10px] font-bold"><MessageCircle className="w-3 h-3 fill-white" /> {item.comments}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Post Detail Viewer */}
      {createPortal(
        <AnimatePresence>
          {selectedPost && (
            <ProfilePostViewerOverlay
              onClose={() => { setSelectedPost(null); setShowPostMenu(false); setEditingCaption(false); }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-3 pb-3 pt-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
                style={{ touchAction: "none" }}
                data-profile-post-drag-handle
              >
                <button type="button" data-testid="profile-post-close" aria-label="Close post" onClick={() => { setSelectedPost(null); setShowPostMenu(false); setEditingCaption(false); }} className="text-white/80 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="w-6 h-6" />
                </button>
                {selectedPost.user.avatar ? (
	                  <img src={selectedPost.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/20" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border-2 border-white/20 text-white text-xs font-bold">
                    {selectedPost.user.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{selectedPost.user.name}</p>
                  {/* Timestamp hidden on the feed view — TikTok pattern, keeps
                      older content from feeling stale. */}
                </div>
                {profileOwnerId === user?.id && (
                  <button type="button"
                    aria-label="Post options"
                    onClick={() => setShowPostMenu(!showPostMenu)}
                    className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
                {selectedPost.url ? (
                  selectedPost.type === "reel" ? (
                    <video
                      src={selectedPost.url}
                      className="w-full h-full object-contain"
                      style={{ filter: selectedPost.filterCss || "none" }}
                      controls
	                      playsInline
	                      autoPlay
	                      loop
	                      preload="metadata"
	                    />
                  ) : (
                    <img
                      src={selectedPost.url}
	                      alt={selectedPost.caption || "Shared post"}
	                      className="w-full h-full object-contain"
	                      loading="eager"
	                      decoding="async"
	                      style={{ filter: selectedPost.filterCss || "none" }}
	                    />
                  )
                ) : (
                  <div className="w-full max-w-md rounded-2xl bg-card/90 border border-border/20 p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Share2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-semibold text-white/60">Shared post</span>
                    </div>
                    <p className="text-sm leading-relaxed text-white whitespace-pre-wrap break-words">
                      {selectedPost.caption || "Shared post"}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="p-4 space-y-3 shrink-0 bg-gradient-to-t from-black/80 to-transparent" style={{ paddingBottom: "max(calc(var(--zivo-safe-bottom,0px) + 1rem), 1rem)" }}>
                {editingCaption ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editCaptionValue}
                      onChange={(e) => setEditCaptionValue(e.target.value)}
                      className="flex-1 bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/20 outline-none focus:border-primary"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditCaption(selectedPost.id, editCaptionValue);
                        if (e.key === "Escape") setEditingCaption(false);
                      }}
                    />
                    <button type="button"
                      onClick={() => handleEditCaption(selectedPost.id, editCaptionValue)}
                      className="px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg"
                    >
                      Save
                    </button>
                    <button type="button"
                      onClick={() => setEditingCaption(false)}
                      className="px-3 py-2 text-white/60 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-white/90 text-sm"><SafeCaption text={selectedPost.caption} /></p>
                )}
                <div className="flex items-center gap-5">
                  <button type="button"
                    className="flex items-center gap-1.5 transition-colors"
                    onClick={() => {
                      const postId = selectedPost.id;
                      const isLiked = likedPosts.has(postId);
                      setLikedPosts((prev) => {
                        const next = new Set(prev);
                        if (isLiked) next.delete(postId); else next.add(postId);
                        return next;
                      });
                      setFeed((prev) => prev.map((p) => p.id === postId ? { ...p, likes: p.likes + (isLiked ? -1 : 1) } : p));
                      setSelectedPost((prev) => prev ? { ...prev, likes: prev.likes + (isLiked ? -1 : 1) } : prev);
                      // Update DB
                      supabase.from("user_posts").update({ likes_count: selectedPost.likes + (isLiked ? -1 : 1) }).eq("id", postId).then(() => {});
                    }}
                  >
                    <Heart className={cn("w-6 h-6", likedPosts.has(selectedPost.id) ? "fill-red-500 text-red-500" : "text-white/70 hover:text-white")} />
                    {selectedPost.likes > 0 && (
                      <span className="text-sm font-medium text-white/90">{selectedPost.likes}</span>
                    )}
                  </button>
                  <button type="button" onClick={() => openComments(selectedPost)} className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors">
                    <MessageCircle className="w-6 h-6" />
                    {selectedPost.comments > 0 && (
                      <span className="text-sm font-medium">{selectedPost.comments}</span>
                    )}
                  </button>
                  {(selectedPost.views || 0) > 0 && (
                    <span className="flex items-center gap-1.5 text-white/50">
                      <Eye className="w-5 h-5" />
                      <span className="text-sm">{(selectedPost.views || 0) > 1000 ? `${((selectedPost.views || 0) / 1000).toFixed(1)}k` : selectedPost.views}</span>
                    </span>
                  )}
                  <button type="button"
                    className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors ml-auto"
                    onClick={() => openPostShareSheet({
                      postId: selectedPost.id,
                      url: buildPublicPostShareUrl(selectedPost.id),
                      title: selectedPost.user?.name ? `${selectedPost.user.name} on ZIVO` : "ZIVO post",
                      text: selectedPost.caption || "Check out this post on ZIVO",
                      imageUrl: selectedPost.url ?? null,
                      onSendToFriend: () => openShareToChat({
                        kind: "post" as never,
                        title: selectedPost.user?.name ? `${selectedPost.user.name} on ZIVO` : "ZIVO post",
                        subtitle: selectedPost.caption?.slice(0, 80),
                        image: selectedPost.url ?? null,
                        deepLink: buildPublicPostShareUrl(selectedPost.id),
                      }),
                      onShared: (channel) => {
                        void recordProfilePostShare(selectedPost.id, normalizeProfileShareChannel(channel));
                      },
                    })}
                  >
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </ProfilePostViewerOverlay>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Create Post Modal */}
      {createPortal(
        <AnimatePresence>
          {showCreatePost && user?.id && (
            <CreatePostModal
              userId={user.id}
              userProfile={{
                name: currentProfileName || user?.email?.split("@")[0] || "You",
                avatar: currentProfileAvatar,
              }}
              initialMode={composerType === "photo" ? "photo" : composerType === "reel" ? "reel" : undefined}
              onClose={closeCreatePost}
              onCreated={() => {
                closeCreatePost();
                refreshFeed();
                onPostsChanged?.();
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Live Broadcast Overlay */}
      {createPortal(
        <AnimatePresence>
          {showLive && <LiveBroadcast onClose={() => setShowLive(false)} onPublishClip={handleCreatePost} />}
        </AnimatePresence>,
        document.body
      )}

      {/* Share Sheet */}
      {/* Post Menu Bottom Sheet */}
      {createPortal(
        <AnimatePresence>
          {showPostMenu && selectedPost && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[9998]"
                onClick={() => setShowPostMenu(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[9999] bg-card rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto safe-area-bottom"
              >
                {/* Post preview header */}
                <div className="px-4 pt-4 pb-2">
                  {/* Author row */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={selectedPost.user.avatar} />
                      <AvatarFallback className="text-xs bg-muted">{selectedPost.user.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p id="profile-post-menu-title" className="text-sm font-semibold text-foreground leading-tight">{selectedPost.user.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedPost.createdAt
                          ? formatDistanceToNow(new Date(selectedPost.createdAt), { addSuffix: false }) + " ago"
                          : selectedPost.time}
                        {" · "}
                        <Globe className="inline w-3 h-3 -mt-0.5" />
                      </p>
                    </div>
                  </div>

                  {/* Shared content preview if repost */}
                  {selectedPost.isShared && selectedPost.sharedOrigin && (
                    <div className="rounded-xl border border-border/50 p-2.5 mb-2 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={selectedPost.sharedOrigin.avatar || ""} />
                          <AvatarFallback className="text-[10px] bg-muted">{selectedPost.sharedOrigin.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-semibold text-foreground">{selectedPost.sharedOrigin.name}</p>
                      </div>
                      {selectedPost.caption && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2"><SafeCaption text={selectedPost.caption} /></p>
                      )}
                    </div>
                  )}

                  {/* Media thumbnail */}
                  {selectedPost.url && (
                    <div className="rounded-xl overflow-hidden max-h-48 mb-1">
                      {selectedPost.type === "reel" ? (
	                        <video src={selectedPost.url} className="w-full h-full object-cover max-h-48" muted preload="metadata" />
	                      ) : (
	                        <img src={selectedPost.url} alt="" className="w-full h-full object-cover max-h-48" loading="lazy" decoding="async" style={selectedPost.filterCss ? { filter: selectedPost.filterCss } : undefined} />
                      )}
                    </div>
                  )}
                </div>

                <AccessibleMenuSheet
                  onClose={() => setShowPostMenu(false)}
                  labelledById="profile-post-menu-title"
                  testId="profile-post-menu-sheet"
                  className="py-2"
                >
                  {(() => {
                    const alreadyReported = reportedPosts.has(selectedPost.id);
                    return (
                      <button type="button"
                        data-testid="profile-menu-report"
                        role="menuitem"
                        aria-disabled={alreadyReported}
                        aria-label={
                          alreadyReported
                            ? "Report this post — already reported"
                            : "Report this post"
                        }
                        disabled={alreadyReported}
                        onClick={() => {
                          if (alreadyReported) return;
                          setShowPostMenu(false);
                          setReportStep("categories");
                          setReportCategory("");
                          setShowReportSheet(true);
                        }}
                        className="w-full flex items-center gap-4 px-5 py-3.5 min-h-[48px] text-sm text-destructive hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Flag className="w-5 h-5" aria-hidden="true" />
                        <span className="flex-1 text-left">Report</span>
                        {alreadyReported && (
                          <span
                            data-testid="profile-menu-report-status"
                            className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                          >
                            Reported
                          </span>
                        )}
                      </button>
                    );
                  })()}
                  <button type="button"
                    role="menuitem"
                    aria-label={
                      notifPosts.has(profileNotificationPostKey(selectedPost.id))
                        ? "Turn off notifications for this post"
                        : "Turn on notifications for this post"
                    }
                    onClick={() => {
                      void togglePostNotifications(selectedPost.id);
                      setShowPostMenu(false);
                    }}
                    data-testid="profile-menu-notifications"
                    className="w-full flex items-center gap-4 px-5 py-3.5 min-h-[48px] text-sm text-foreground hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none transition-colors"
                  >
                    <Bell className="w-5 h-5" aria-hidden="true" />
                    {notifPosts.has(profileNotificationPostKey(selectedPost.id)) ? "Turn off notifications" : "Turn on notifications"}
                  </button>
                  <button type="button"
                    role="menuitem"
                    aria-label="Copy link to this post"
                    onClick={() => {
                      const url = buildPublicPostShareUrl(selectedPost.id);
                      copyText(url).then(() => toast.success("Link copied!")).catch(() => toast.info("Could not copy link"));
                      void recordProfilePostShare(selectedPost.id, "copy_link");
                      setShowPostMenu(false);
                    }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 min-h-[48px] text-sm text-foreground hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none transition-colors"
                  >
                    <Link2 className="w-5 h-5" aria-hidden="true" />
                    Copy link
                  </button>
                  <button type="button"
                    role="menuitem"
                    aria-label="Hide this post — not interested"
                    onClick={() => {
                      const id = selectedPost.id;
                      profileHiddenPosts.hide(id, "user");
                      profileHiddenPosts.hide(toUserPostInteractionId(id), "user");
                      setShowPostMenu(false);
                      setSelectedPost(null);
                      toast.success("You won't see this post anymore");
                    }}
                    data-testid="profile-menu-not-interested"
                    className="w-full flex items-center gap-4 px-5 py-3.5 min-h-[48px] text-sm text-foreground hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none transition-colors"
                  >
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                    Not interested
                  </button>
                  <button type="button"
                    role="menuitem"
                    aria-label="Share this post"
                    onClick={() => {
                      setShowPostMenu(false);
                      openPostShareSheet({
                        postId: selectedPost.id,
                        url: buildPublicPostShareUrl(selectedPost.id),
                        title: selectedPost.user?.name ? `${selectedPost.user.name} on ZIVO` : "ZIVO post",
                        text: selectedPost.caption || "Check out this post on ZIVO",
                        imageUrl: selectedPost.url ?? null,
                        onSendToFriend: () => openShareToChat({
                          kind: "post" as never,
                          title: selectedPost.user?.name ? `${selectedPost.user.name} on ZIVO` : "ZIVO post",
                          subtitle: selectedPost.caption?.slice(0, 80),
                          image: selectedPost.url ?? null,
                          deepLink: buildPublicPostShareUrl(selectedPost.id),
                        }),
                        onShared: (channel) => {
                          void recordProfilePostShare(selectedPost.id, normalizeProfileShareChannel(channel));
                        },
                      });
                    }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 min-h-[48px] text-sm text-foreground hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none transition-colors"
                  >
                    <Share2 className="w-5 h-5" aria-hidden="true" />
                    Share
                  </button>
                  {profileOwnerId === user?.id && (
                    <button type="button"
                      role="menuitem"
                      aria-label="Comment settings"
                      onClick={() => { setShowPostMenu(false); setShowCommentSettingsSheet(true); }}
                      data-testid="profile-menu-comment-settings"
                      className="w-full flex items-center gap-4 px-5 py-3.5 min-h-[48px] text-sm text-foreground hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none transition-colors"
                    >
                      <Settings2 className="w-5 h-5" aria-hidden="true" />
                      Comment settings
                    </button>
                  )}
                  {profileOwnerId === user?.id && (
                    <>
                      <button type="button"
                        role="menuitem"
                        aria-label="Edit caption"
                        onClick={() => {
                          setEditCaptionValue(selectedPost.caption);
                          setEditingCaption(true);
                          setShowPostMenu(false);
                        }}
                        className="w-full flex items-center gap-4 px-5 py-3.5 min-h-[48px] text-sm text-foreground hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none transition-colors"
                      >
                        <Settings2 className="w-5 h-5" aria-hidden="true" />
                        Edit caption
                      </button>
                      <button type="button"
                        role="menuitem"
                        aria-label="Delete this post"
                        onClick={() => {
                          toast("Delete this post?", {
                            description: "This can't be undone.",
                            action: { label: "Delete", onClick: () => handleDeletePost(selectedPost.id) },
                            cancel: { label: "Cancel", onClick: () => {} },
                          });
                        }}
                        className="w-full flex items-center gap-4 px-5 py-3.5 min-h-[48px] text-sm text-destructive hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete post
                      </button>
                    </>
                  )}
                </AccessibleMenuSheet>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      <CommentsSheet
        open={!!commentPost}
        onClose={() => setCommentPost(null)}
        postId={commentPost ? toUserPostInteractionId(commentPost.id) : ""}
        postSource="user"
        currentUserId={user?.id ?? null}
        commentsCount={commentPost?.comments ?? 0}
        onCommentsCountChange={(count) => {
          if (!commentPost) return;
          const targetId = commentPost.id;
          setFeed((prev) => {
            const prevItem = prev.find((p) => p.id === targetId);
            if (prevItem && count > prevItem.comments) {
              track("post_comment_added", { post_id: targetId, author_id: profileOwnerId, total: count, surface: "profile_feed" });
            }
            return prev.map((p) => (p.id === targetId ? { ...p, comments: count } : p));
          });
        }}
      />

      {createPortal(
        <AnimatePresence>
          {sharePostId && (
            <UnifiedShareSheet
              shareUrl={buildPublicPostShareUrl(sharePostId)}
              shareText={feed.find((p) => p.id === sharePostId)?.caption || "Check out this post!"}
              shareMediaUrl={feed.find((p) => p.id === sharePostId)?.url || undefined}
              shareMediaType={feed.find((p) => p.id === sharePostId)?.type === "reel" ? "video" : "image"}
              sharePostId={sharePostId}
              sharePostAuthorId={profileOwnerId}
              sharePostAuthorName={feed.find((p) => p.id === sharePostId)?.user?.name}
              onClose={() => setSharePostId(null)}
              zIndex={9999}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Report Sheet */}
      {createPortal(
        <AnimatePresence>
          {showReportSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[9998]"
                onClick={() => setShowReportSheet(false)}
              />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[9999] bg-card rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto safe-area-bottom"
              >
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <h3 className="text-base font-bold text-foreground text-center pb-2">Report</h3>
                {reportStep === "categories" && (
                  <div className="px-2 pb-4">
                    {[
                      "I just don't like it",
                      "Bullying or unwanted contact",
                      "Suicide, self-injury or eating disorders",
                      "Violence, hate or exploitation",
                      "Selling or promoting restricted items",
                      "Nudity or sexual activity",
                      "Scam, fraud or false information",
                      "Intellectual property",
                      "Something else",
                    ].map((label) => (
                      <button type="button"
                        key={label}
                        onClick={() => { setReportCategory(label); setReportStep("sub"); }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/50 rounded-xl text-sm text-foreground"
                      >
                        <span className="text-left">{label}</span>
                        <span className="text-muted-foreground">›</span>
                      </button>
                    ))}
                  </div>
                )}
                {reportStep === "sub" && (
                  <div className="px-4 pb-6">
                    <p className="text-xs text-muted-foreground mb-3">{reportCategory}</p>
                    <p className="text-sm text-foreground mb-4">
                      Thanks for letting us know. Your report is anonymous and our team will review this content.
                    </p>
                    <button type="button"
                      data-testid="profile-report-submit"
                      onClick={async () => {
                        const targetId = selectedPost?.id;
                        try {
                          if (selectedPost) {
                            const { error } = await (supabase as any).from("post_reports").insert({
                              post_id: toUserPostInteractionId(selectedPost.id),
                              reporter_id: user?.id,
                              category: reportCategory,
                            });
                            if (error) throw error;
                          }
                        } catch (err) {
                          logProfileActionError(
                            "report.submit",
                            { postId: targetId, category: reportCategory, userId: user?.id },
                            err,
                          );
                          // Still show the user a confirmation — the report is queued client-side.
                        }
                        if (targetId) {
                          setReportedPosts((prev) => {
                            const next = new Set(prev);
                            next.add(targetId);
                            persistReported(next);
                            return next;
                          });
                          startUndoWindow(targetId);
                        }
                        setReportStep("submitted");
                      }}
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 min-h-[44px] text-sm font-semibold"
                    >
                      Submit report
                    </button>
                  </div>
                )}
                {reportStep === "submitted" && (
                  <div className="px-6 pb-8 text-center" data-testid="profile-report-submitted">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <svg className="h-9 w-9 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-foreground mb-2">Report submitted</p>
                    <p className="text-sm text-muted-foreground mb-5">
                      Thanks for helping keep ZIVO safe. Our team will review this post. You can see its status as <span className="font-medium text-foreground">Reported</span> in the post menu.
                    </p>
                    {undoSecondsLeft > 0 && undoPostId && (
                      <button type="button"
                        data-testid="profile-report-undo"
                        onClick={() => {
                          void performUndo(undoPostId);
                          setShowReportSheet(false);
                        }}
                        className="w-full mb-2 border border-border bg-background text-foreground rounded-xl py-3 min-h-[44px] text-sm font-semibold hover:bg-muted/40 transition-colors"
                      >
                        Undo report ({undoSecondsLeft}s)
                      </button>
                    )}
                    <button type="button"
                      onClick={() => setShowReportSheet(false)}
                      className="w-full bg-primary text-primary-foreground rounded-xl py-3 min-h-[44px] text-sm font-semibold"
                    >
                      Done
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Comment settings sheet (owner) */}
      {createPortal(
        <AnimatePresence>
          {showCommentSettingsSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[9998]"
                onClick={() => setShowCommentSettingsSheet(false)}
              />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[9999] bg-card rounded-t-2xl shadow-2xl safe-area-bottom"
              >
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <h3 className="text-base font-bold text-foreground text-center pb-3">Who can comment</h3>
                <div className="px-2 pb-4">
                  {([
                    { key: "everyone", label: "Everyone" },
                    { key: "followers", label: "Followers only" },
                    { key: "off", label: "Turn off comments" },
                  ] as const).map((opt) => (
                    <button type="button"
                      key={opt.key}
                      onClick={() => {
                        setCommentControl(opt.key);
                        toast.success(`Comments: ${opt.label}`);
                        setShowCommentSettingsSheet(false);
                      }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/50 rounded-xl text-sm text-foreground"
                    >
                      <span>{opt.label}</span>
                      {commentControl === opt.key && <span className="text-primary">✓</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

type Visibility = "everyone" | "friends" | "only_me";
const VISIBILITY_OPTIONS: { id: Visibility; label: string; icon: typeof Globe }[] = [
  { id: "everyone", label: "Everyone", icon: Globe },
  { id: "friends", label: "Friends Only", icon: Users },
  { id: "only_me", label: "Only Me", icon: Lock },
];

const COMPOSER_FILTERS = [
  { name: "Original", css: "none" },
  { name: "Warm", css: "sepia(0.3) saturate(1.35) brightness(1.04)" },
  { name: "Cool", css: "saturate(0.85) hue-rotate(18deg) brightness(1.06)" },
  { name: "Vivid", css: "saturate(1.75) contrast(1.08)" },
  { name: "Glow", css: "brightness(1.18) saturate(1.2) contrast(0.92)" },
  { name: "Noir", css: "grayscale(0.9) contrast(1.35) brightness(0.88)" },
  { name: "Film", css: "sepia(0.18) contrast(1.1) saturate(0.9) brightness(0.96)" },
  { name: "Dreamy", css: "brightness(1.15) saturate(0.72) contrast(0.84)" },
  { name: "Cyber", css: "saturate(2.1) hue-rotate(-26deg) contrast(1.22) brightness(0.92)" },
  { name: "Clean", css: "brightness(1.08) contrast(1.03) saturate(1.02)" },
  { name: "Mocha", css: "sepia(0.36) brightness(1.05) contrast(0.93) saturate(1.15)" },
  { name: "Candy", css: "saturate(1.9) brightness(1.12) contrast(0.9) hue-rotate(-10deg)" },
  { name: "Aqua", css: "saturate(0.78) hue-rotate(34deg) brightness(1.14) contrast(0.95)" },
  { name: "Crisp", css: "contrast(1.2) saturate(1.18) brightness(1.04)" },
  { name: "Night Pop", css: "brightness(0.86) contrast(1.4) saturate(1.35)" },
  { name: "Retro", css: "sepia(0.28) saturate(1.08) contrast(0.94) brightness(1.08)" },
  { name: "Coral", css: "saturate(1.35) hue-rotate(-8deg) brightness(1.1) contrast(0.95)" },
  { name: "Skyline", css: "saturate(0.82) hue-rotate(26deg) brightness(1.12) contrast(0.92)" },
  { name: "Punch", css: "contrast(1.26) saturate(1.32) brightness(1.02)" },
  { name: "Muted", css: "saturate(0.55) contrast(0.92) brightness(1.1)" },
  { name: "Wine", css: "sepia(0.12) hue-rotate(-22deg) saturate(1.3) brightness(0.98)" },
  { name: "Lime", css: "hue-rotate(62deg) saturate(1.8) contrast(1.12) brightness(0.96)" },
  { name: "Paper", css: "sepia(0.22) brightness(1.16) contrast(0.86) saturate(0.88)" },
  { name: "Monochrome+", css: "grayscale(1) contrast(1.45) brightness(0.92)" },
  { name: "UV", css: "hue-rotate(120deg) saturate(2.2) contrast(1.22) brightness(0.9)" },
  { name: "Mint", css: "saturate(0.95) hue-rotate(44deg) brightness(1.09) contrast(0.96)" },
  { name: "Glow Film", css: "sepia(0.14) brightness(1.18) contrast(0.9) saturate(1.1)" },
  { name: "Bloom", css: "brightness(1.2) contrast(0.88) saturate(1.15)" },
  { name: "Tokyo", css: "hue-rotate(-18deg) saturate(1.6) contrast(1.15) brightness(0.96)" },
  { name: "Prism", css: "hue-rotate(88deg) saturate(1.9) contrast(1.08) brightness(0.94)" },
  { name: "Smoke", css: "grayscale(0.35) contrast(1.2) brightness(0.9)" },
  { name: "Cocoa", css: "sepia(0.4) saturate(1.05) contrast(0.92) brightness(1.02)" },
  { name: "Pop Art", css: "contrast(1.35) saturate(1.6) brightness(1.05)" },
  { name: "Haze", css: "brightness(1.15) contrast(0.8) saturate(0.78)" },
  { name: "Soft Cyan", css: "hue-rotate(34deg) saturate(1.08) brightness(1.09) contrast(0.94)" },
  { name: "Deep Contrast", css: "contrast(1.42) brightness(0.86) saturate(1.2)" },
  { name: "Portra", css: "sepia(0.16) contrast(1.02) saturate(0.94) brightness(1.06)" },
  { name: "Analog", css: "sepia(0.24) saturate(1.15) contrast(0.9) brightness(1.1)" },
  { name: "Miami", css: "hue-rotate(-30deg) saturate(1.85) brightness(1.08) contrast(1.04)" },
  { name: "Solar", css: "sepia(0.2) saturate(1.45) brightness(1.12) contrast(0.94)" },
  { name: "Graphite", css: "grayscale(0.78) contrast(1.28) brightness(0.9)" },
  { name: "Azure", css: "hue-rotate(30deg) saturate(1.22) brightness(1.12) contrast(0.96)" },
  { name: "Candy Pink", css: "hue-rotate(-12deg) saturate(1.7) brightness(1.1) contrast(0.92)" },
  { name: "Denim", css: "hue-rotate(14deg) saturate(1.1) brightness(1.02) contrast(1.08)" },
  { name: "Washed", css: "saturate(0.62) brightness(1.2) contrast(0.82)" },
  { name: "Ink", css: "contrast(1.36) brightness(0.84) saturate(1.02)" },
  { name: "Fresh Pop", css: "brightness(1.16) contrast(1.02) saturate(1.28)" },
  { name: "Cinema Warm", css: "sepia(0.2) contrast(1.06) saturate(1.02) brightness(0.98)" },
  { name: "Moonlight", css: "hue-rotate(20deg) saturate(0.78) brightness(1.06) contrast(1.04)" },
  { name: "Silvertone", css: "grayscale(0.92) brightness(1.03) contrast(1.12)" },
  { name: "Punch Blue", css: "hue-rotate(42deg) saturate(1.6) contrast(1.14) brightness(0.96)" },
  { name: "Mellow", css: "saturate(0.72) contrast(0.9) brightness(1.12)" },
  { name: "Teal Pop", css: "hue-rotate(36deg) saturate(1.4) contrast(1.08) brightness(1.02)" },
  { name: "Amber Film", css: "sepia(0.32) saturate(1.16) contrast(0.94) brightness(1.08)" },
  { name: "Graph Pop", css: "grayscale(0.5) contrast(1.35) brightness(0.92)" },
  { name: "Dream Pink", css: "hue-rotate(-10deg) saturate(1.32) brightness(1.16) contrast(0.9)" },
  { name: "Cold Steel", css: "hue-rotate(22deg) saturate(0.82) contrast(1.24) brightness(0.9)" },
];

function ComposerForm({
  type,
  onCreatePost,
  onClose,
  onBack,
}: {
  type: "photo" | "reel";
  onCreatePost: (payload: NewPostPayload) => Promise<void>;
  onClose: () => void;
  onBack: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("everyone");
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  const [activeFilter, setActiveFilter] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const previousPreviewRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const nextUrl = URL.createObjectURL(file);
    if (previousPreviewRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previousPreviewRef.current);
    }
    previousPreviewRef.current = nextUrl;
    setMediaPreview(nextUrl);
  };

  useEffect(() => {
    return () => {
      if (previousPreviewRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previousPreviewRef.current);
      }
    };
  }, []);

  const handlePost = async () => {
    if (!mediaPreview) { toast.error("Add media first!"); return; }
    if (isPosting) return;
    setIsPosting(true);
    try {
      await onCreatePost({
        type,
        caption: caption.trim(),
        url: mediaPreview,
        file: selectedFile,
        filterCss: COMPOSER_FILTERS[activeFilter]?.css || "none",
      });
      toast.success("Posted successfully! 🎉");
      onClose();
    } catch {
      toast.error("Could not publish post right now");
    } finally {
      setIsPosting(false);
    }
  };

  const clearMediaPreview = () => {
    if (previousPreviewRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previousPreviewRef.current);
      previousPreviewRef.current = null;
    }
    setSelectedFile(null);
    setMediaPreview(null);
  };

  const isReel = type === "reel";
  const TypeIcon = isReel ? Clapperboard : Image;
  const label = isReel ? "Reel" : "Photo";
  const currentVis = VISIBILITY_OPTIONS.find((v) => v.id === visibility)!;
  const VisIcon = currentVis.icon;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-primary font-medium">← Back</button>
        <h3 className="text-base font-bold text-foreground">New {label}</h3>
        <motion.button whileTap={{ scale: 0.95 }} disabled={isPosting} onClick={handlePost} className="bg-primary text-primary-foreground text-sm font-bold px-4 py-1.5 rounded-full disabled:opacity-70">
          {isPosting ? "Posting..." : "Post"}
        </motion.button>
      </div>

      {mediaPreview ? (
        <div className="relative rounded-2xl overflow-hidden">
          {isReel ? (
            <video
              src={mediaPreview}
	              className="w-full max-h-[40vh] object-cover rounded-2xl"
	              style={{ filter: COMPOSER_FILTERS[activeFilter]?.css || "none" }}
	              controls
	              preload="metadata"
	            />
          ) : (
            <img
              src={mediaPreview}
	              alt=""
	              className="w-full max-h-[40vh] object-cover rounded-2xl"
	              loading="lazy"
	              decoding="async"
	              style={{ filter: COMPOSER_FILTERS[activeFilter]?.css || "none" }}
	            />
          )}
            <button type="button" onClick={clearMediaPreview} aria-label="Remove media" className="absolute top-2 right-2 min-w-[44px] min-h-[44px] -m-2 rounded-full bg-black/60 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => fileRef.current?.click()}
          className="w-full aspect-video rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2"
        >
          <TypeIcon className="w-8 h-8 text-primary/40" />
          <span className="text-sm text-muted-foreground">Tap to add {label.toLowerCase()}</span>
        </motion.button>
      )}
      <input ref={fileRef} type="file" accept={isReel ? "video/*" : "image/*"} className="hidden" onChange={handleFile} />

      {mediaPreview && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Choose filter style</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {COMPOSER_FILTERS.map((filter, index) => (
              <button type="button"
                key={filter.name}
                onClick={() => setActiveFilter(index)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  activeFilter === index
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/30 bg-muted/40 text-muted-foreground"
                )}
              >
                {filter.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Write a caption..."
        rows={2}
        className="w-full bg-muted/30 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none border border-border/20 focus:border-primary/30 transition-colors"
      />

      {/* Privacy & extras row */}
      <div className="flex items-center gap-3 text-muted-foreground">
        {/* Visibility picker */}
        <div className="relative">
          <button type="button"
            onClick={() => setShowVisibilityPicker(!showVisibilityPicker)}
            className="flex items-center gap-1.5 text-xs font-medium hover:text-foreground transition-colors bg-muted/40 rounded-lg px-2.5 py-1.5 border border-border/20"
          >
            <VisIcon className="w-3.5 h-3.5" />
            {currentVis.label}
            <ChevronDown className={cn("w-3 h-3 transition-transform", showVisibilityPicker && "rotate-180")} />
          </button>
          <AnimatePresence>
            {showVisibilityPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute bottom-full left-0 mb-1 bg-card border border-border/40 rounded-xl shadow-lg overflow-hidden z-20 min-w-[160px]"
              >
                {VISIBILITY_OPTIONS.map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <button type="button"
                      key={opt.id}
                      onClick={() => { setVisibility(opt.id); setShowVisibilityPicker(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors",
                        visibility === opt.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                      )}
                    >
                      <OptIcon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button type="button" className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors">
          <MapPin className="w-4 h-4" /> Location
        </button>
      </div>
    </div>
  );
}

// AI face edit modes
const AI_MODES = [
  { id: "beauty", name: "AI Beauty", emoji: "✨", gradient: "linear-gradient(135deg, #FFB7C5, #FFC0CB)", desc: "Auto enhance" },
  { id: "swap_male", name: "Male Model", emoji: "🧔", gradient: "linear-gradient(135deg, #4A90D9, #357ABD)", desc: "Face swap" },
  { id: "swap_female", name: "Female Model", emoji: "👩", gradient: "linear-gradient(135deg, #FF69B4, #FF1493)", desc: "Face swap" },
  { id: "swap_anime", name: "Anime", emoji: "🎌", gradient: "linear-gradient(135deg, #A29BFE, #6C5CE7)", desc: "Style transfer" },
  { id: "swap_old", name: "Age Up", emoji: "👴", gradient: "linear-gradient(135deg, #95A5A6, #7F8C8D)", desc: "Face swap" },
  { id: "swap_young", name: "Youth", emoji: "👶", gradient: "linear-gradient(135deg, #FFEAA7, #FDCB6E)", desc: "Face swap" },
  { id: "bg_beach", name: "Beach", emoji: "🏖️", gradient: "linear-gradient(135deg, #00CEC9, #0984E3)", desc: "Background" },
  { id: "bg_city", name: "City Night", emoji: "🌃", gradient: "linear-gradient(135deg, #2D3436, #636E72)", desc: "Background" },
  { id: "bg_space", name: "Space", emoji: "🚀", gradient: "linear-gradient(135deg, #0C0C2D, #4A148C)", desc: "Background" },
  { id: "bg_nature", name: "Forest", emoji: "🌲", gradient: "linear-gradient(135deg, #00B894, #00CEC9)", desc: "Background" },
  { id: "bg_studio", name: "Studio", emoji: "📸", gradient: "linear-gradient(135deg, #636E72, #2D3436)", desc: "Background" },
];

// AR effect categories for TikTok-style tabs
const AR_CATEGORIES = ["All", "Trending", "Beauty", "Fun", "Animals", "Fantasy", "Art"] as const;
type ARCategory = typeof AR_CATEGORIES[number];

// AR filter overlays - face-tracked like TikTok
const AR_STICKERS = [
  { name: "None", emoji: "⭕", sticker: null },
  { name: "Cat Ears", emoji: "🐱", sticker: "cat" },
  { name: "Dog", emoji: "🐶", sticker: "dog" },
  { name: "Bunny", emoji: "🐰", sticker: "bunny" },
  { name: "Crown", emoji: "👑", sticker: "crown" },
  { name: "Hearts", emoji: "💕", sticker: "hearts" },
  { name: "Stars", emoji: "⭐", sticker: "stars" },
  { name: "Glasses", emoji: "🕶️", sticker: "glasses" },
  { name: "Blush", emoji: "😊", sticker: "blush" },
  { name: "Freckles", emoji: "🌟", sticker: "freckles" },
  { name: "Liner", emoji: "🖤", sticker: "liner" },
  { name: "Gloss", emoji: "💄", sticker: "gloss" },
  { name: "Contour", emoji: "🪄", sticker: "contour" },
  { name: "Anime Eyes", emoji: "👁️", sticker: "anime" },
  { name: "Devil", emoji: "😈", sticker: "devil" },
  { name: "Angel", emoji: "😇", sticker: "angel" },
  { name: "Flowers", emoji: "🌸", sticker: "flowers" },
  { name: "Fire", emoji: "🔥", sticker: "fire" },
  { name: "Butterfly", emoji: "🦋", sticker: "butterfly" },
  { name: "Rainbow", emoji: "🌈", sticker: "rainbow" },
  { name: "Sparkles", emoji: "✨", sticker: "sparkles" },
  { name: "Snow", emoji: "❄️", sticker: "snow" },
  { name: "Halo", emoji: "🪽", sticker: "halo" },
  { name: "Neon", emoji: "🪩", sticker: "neon" },
  { name: "Pixel", emoji: "🕹️", sticker: "pixel" },
  { name: "Comic", emoji: "💥", sticker: "comic" },
  { name: "Mask", emoji: "🎭", sticker: "mask" },
  { name: "Aura", emoji: "🔮", sticker: "aura" },
  { name: "Laser Eyes", emoji: "🔴", sticker: "laser" },
  { name: "Tears", emoji: "🥹", sticker: "tears" },
  { name: "Glitch", emoji: "📺", sticker: "glitch" },
  { name: "Scanline", emoji: "🛰️", sticker: "scanline" },
  { name: "Pixel Hearts", emoji: "💗", sticker: "pixelhearts" },
  { name: "Frost", emoji: "🥶", sticker: "frost" },
  { name: "Lightning", emoji: "⚡", sticker: "lightning" },
  { name: "Confetti", emoji: "🎉", sticker: "confetti" },
  { name: "Beauty Lift", emoji: "💎", sticker: "beautylift" },
  { name: "Lip Red", emoji: "💋", sticker: "lipred" },
  { name: "Lip Nude", emoji: "👄", sticker: "lipnude" },
  { name: "Lip Plum", emoji: "🫦", sticker: "lipplum" },
  { name: "Eye Shadow", emoji: "🎨", sticker: "shadow" },
  { name: "Lashes", emoji: "🪶", sticker: "lashes" },
  { name: "Brows", emoji: "🖌️", sticker: "brows" },
  { name: "Nose Slim", emoji: "🪞", sticker: "noseslim" },
  { name: "Jaw Snatch", emoji: "🗿", sticker: "jawsnatch" },
  { name: "Highlight", emoji: "✨", sticker: "highlighter" },
  { name: "Teeth White", emoji: "😁", sticker: "teethwhite" },
  { name: "Lip Coral", emoji: "🌺", sticker: "lipcoral" },
  { name: "Lip Glossy", emoji: "💄", sticker: "lipglossy" },
  { name: "Wing Liner", emoji: "🪽", sticker: "linerwing" },
  { name: "Smokey Eye", emoji: "🌫️", sticker: "smokey" },
  { name: "Blush Max", emoji: "🩷", sticker: "blushmax" },
  { name: "Contour Pro", emoji: "🗽", sticker: "contourpro" },
  { name: "Brow Lift", emoji: "📈", sticker: "browlift" },
  { name: "Big Eyes", emoji: "👀", sticker: "bigeyes" },
  { name: "V Face", emoji: "🧿", sticker: "vface" },
  { name: "Nose Highlight", emoji: "💫", sticker: "nosehighlight" },
  { name: "Lip Tint", emoji: "💗", sticker: "liptint" },
  { name: "Glass Lips", emoji: "🪩", sticker: "glasslips" },
  { name: "Wing Cat", emoji: "🐈", sticker: "catliner" },
  { name: "Soft Blush", emoji: "🌸", sticker: "softblush" },
  { name: "Contour X", emoji: "🗡️", sticker: "contourx" },
  { name: "Dolly Eyes", emoji: "🧸", sticker: "dollyeyes" },
  { name: "Cheek Hearts", emoji: "💖", sticker: "cheekhearts" },
  { name: "Golden Glow", emoji: "🌟", sticker: "goldglow" },
  { name: "Sunglasses", emoji: "😎", sticker: "sunglasses" },
  { name: "Diamonds", emoji: "💎", sticker: "diamonds" },
  { name: "Smoke", emoji: "💨", sticker: "smoke" },
  { name: "Vampire", emoji: "🧛", sticker: "vampire" },
  { name: "Alien", emoji: "👽", sticker: "alien" },
  { name: "Panda", emoji: "🐼", sticker: "panda" },
  { name: "Tiger Stripes", emoji: "🐯", sticker: "tiger" },
  { name: "Aurora", emoji: "🌌", sticker: "aurora" },
  { name: "Glitter Bomb", emoji: "🪩", sticker: "glitterbomb" },
  { name: "Flower Field", emoji: "🌷", sticker: "flowerfield" },
  { name: "Star Field", emoji: "🌠", sticker: "starfield" },
  { name: "Face Gem", emoji: "💠", sticker: "facegem" },
  { name: "Lip Spark", emoji: "🌹", sticker: "lipspark" },
  { name: "Nose Ring", emoji: "💫", sticker: "nosering" },
  { name: "Eye Flare", emoji: "🔆", sticker: "eyeflare" },
  { name: "Magic Wand", emoji: "🪄", sticker: "magicwand" },
  { name: "Bliss Blush", emoji: "🩷", sticker: "blissblush" },
  { name: "Cat Makeup", emoji: "🐱", sticker: "catmakeup" },
  { name: "Lip Berry", emoji: "🫐", sticker: "lipberry" },
  { name: "Pixel Art", emoji: "🕹️", sticker: "pixelart" },
  { name: "Mermaid", emoji: "🧜", sticker: "mermaid" },
  { name: "Zombie", emoji: "🧟", sticker: "zombie" },
  { name: "Robot", emoji: "🤖", sticker: "robot" },
  { name: "Witch Hat", emoji: "🧙", sticker: "witchhat" },
  { name: "Dragon", emoji: "🐉", sticker: "dragon" },
  { name: "Beauty Mark", emoji: "✦", sticker: "beautymark" },
  { name: "Bindi", emoji: "🔴", sticker: "bindi" },
  { name: "Ear Rings", emoji: "💍", sticker: "earrings" },
  { name: "Rainbow Tears", emoji: "🌈", sticker: "rainbowtears" },
  { name: "Money Eyes", emoji: "🤑", sticker: "moneyeyes" },
  { name: "Crown of Stars", emoji: "👑", sticker: "crownstars" },
  { name: "Sakura Shower", emoji: "🌸", sticker: "sakura" },
  { name: "Face Paint", emoji: "🎨", sticker: "facepaint" },
  { name: "Hologram", emoji: "🌐", sticker: "hologram" },
  { name: "Oil Paint", emoji: "🖼️", sticker: "oilpaint" },
  { name: "Sketch", emoji: "✏️", sticker: "sketch" },
  { name: "Disco Ball", emoji: "🪩", sticker: "discoball" },
  { name: "Neon Glow", emoji: "💜", sticker: "neonglow" },
  { name: "Ice Queen", emoji: "🧊", sticker: "icequeen" },
  { name: "Fire Crown", emoji: "🔥", sticker: "firecrown" },
  { name: "Bubble Wrap", emoji: "🫧", sticker: "bubblewrap" },
  { name: "Kaleidoscope", emoji: "🔮", sticker: "kaleidoscope" },
  { name: "Comic Pop", emoji: "💥", sticker: "comicpop" },
  { name: "Lash Bar", emoji: "👁️", sticker: "lashbar" },
  { name: "Golden Hour", emoji: "🌟", sticker: "goldenhour" },
  { name: "Cyber Mask", emoji: "🕶️", sticker: "cybermask" },
  { name: "Angel Halo", emoji: "😇", sticker: "angelhalo" },
  { name: "Devil Horns", emoji: "😈", sticker: "devilhorns" },
  { name: "Butterfly", emoji: "🦋", sticker: "butterfly" },
  { name: "Snow Globe", emoji: "☃️", sticker: "snowglobe" },
  { name: "Lightning", emoji: "⚡", sticker: "lightning" },
  { name: "Glitter Tears", emoji: "💎", sticker: "glittertears" },
  { name: "Pearl Veil", emoji: "🫧", sticker: "pearlveil" },
  { name: "Clown Pop", emoji: "🤡", sticker: "clownpop" },
  { name: "Pirate", emoji: "🏴‍☠️", sticker: "pirate" },
  { name: "Astronaut", emoji: "👨‍🚀", sticker: "astronaut" },
  { name: "Galaxy Face", emoji: "🌌", sticker: "galaxyface" },
  { name: "Comic Lines", emoji: "🗯️", sticker: "comiclines" },
  { name: "Butterfly Kiss", emoji: "🧚", sticker: "butterflykiss" },
  { name: "Rose Crown", emoji: "🌹", sticker: "rosecrown" },
  { name: "Sunbeam", emoji: "🌞", sticker: "sunbeam" },
  { name: "Laser Eyes", emoji: "🔴", sticker: "lasereyes" },
  { name: "Heart Spark", emoji: "💖", sticker: "heartspark" },
  { name: "Venom", emoji: "🕷️", sticker: "venom" },
  { name: "Royal Makeup", emoji: "👸", sticker: "royalmakeup" },
  { name: "Cupid", emoji: "🏹", sticker: "cupid" },
  { name: "Phoenix", emoji: "🕊️", sticker: "phoenix" },
  { name: "Cyber Crown", emoji: "🛸", sticker: "cybercrown" },
  { name: "Glitch Face", emoji: "📺", sticker: "glitchface" },
  { name: "Moon Priestess", emoji: "🌙", sticker: "moonpriestess" },
  { name: "Storm Queen", emoji: "⛈️", sticker: "stormqueen" },
  { name: "Jelly Pop", emoji: "🍬", sticker: "jellypop" },
  { name: "Rose Tears", emoji: "🥀", sticker: "rosetears" },
  { name: "Metallic", emoji: "🪙", sticker: "metallic" },
  { name: "Hyper Bloom", emoji: "🌺", sticker: "hyperbloom" },
  { name: "Cloud Ring", emoji: "☁️", sticker: "cloudring" },
  { name: "Cheetah", emoji: "🐆", sticker: "cheetah" },
  { name: "Demon Wings", emoji: "🦇", sticker: "demonwings" },
  { name: "Star Dust", emoji: "✨", sticker: "stardust" },
  { name: "Frost Bite", emoji: "🥶", sticker: "frostbite" },
];

interface FaceBox {
  x: number; y: number; width: number; height: number;
  eyeLeft: { x: number; y: number };
  eyeRight: { x: number; y: number };
}

// Heart shape helper
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const topY = y - size * 0.5;
  ctx.moveTo(x, y + size * 0.7);
  ctx.bezierCurveTo(x - size * 1.2, y - size * 0.3, x - size * 0.6, topY - size * 0.5, x, topY + size * 0.2);
  ctx.bezierCurveTo(x + size * 0.6, topY - size * 0.5, x + size * 1.2, y - size * 0.3, x, y + size * 0.7);
  ctx.fill();
  ctx.restore();
}

// Star shape helper
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.4;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Sparkle shape
function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 220, 0.9)";
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.15, y - size * 0.15);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.15, y + size * 0.15);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.15, y + size * 0.15);
  ctx.lineTo(x - size, y);
  ctx.lineTo(x - size * 0.15, y - size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Flower shape
function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  const colors = ["rgba(255,180,200,0.75)", "rgba(255,150,180,0.7)", "rgba(255,130,170,0.65)"];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.5, r * 0.28, a, 0, Math.PI * 2);
    ctx.fillStyle = colors[i % 3];
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 220, 50, 0.85)";
  ctx.fill();
  ctx.restore();
}

// Flame shape
function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  const grd = ctx.createRadialGradient(x, y, 0, x, y - size, size * 2.5);
  grd.addColorStop(0, "rgba(255, 255, 100, 0.8)");
  grd.addColorStop(0.4, "rgba(255, 150, 0, 0.7)");
  grd.addColorStop(1, "rgba(255, 50, 0, 0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - size, y - size, x, y - size * 2.5);
  ctx.quadraticCurveTo(x + size, y - size, x, y);
  ctx.fill();
  ctx.restore();
}

// Butterfly shape
function drawButterfly(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, wingAngle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.save();
  ctx.scale(1 - wingAngle, 1);
  ctx.beginPath();
  ctx.ellipse(-size * 0.5, -size * 0.2, size, size * 0.6, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(150, 100, 255, 0.6)";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.scale(1 + wingAngle, 1);
  ctx.beginPath();
  ctx.ellipse(size * 0.5, -size * 0.2, size, size * 0.6, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 100, 200, 0.6)";
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.07, size * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(60, 40, 40, 0.7)";
  ctx.fill();
  ctx.restore();
}

// Main face-tracked drawing function
function drawFaceFilter(
  ctx: CanvasRenderingContext2D, sticker: string,
  face: FaceBox, cw: number, ch: number, t: number
) {
  const { x, y, width: fw, height: fh } = face;
  const cx = x + fw / 2;
  const top = y;
  const eyeY = y + fh * 0.35;
  const noseY = y + fh * 0.55;
  const mouthY = y + fh * 0.72;
  const eyeL = face.eyeLeft;
  const eyeR = face.eyeRight;
  const cy = y + fh / 2;
  const eyeLX = eyeL.x;
  const eyeRX = eyeR.x;

  ctx.save();

  switch (sticker) {
    case "cat": {
      // Triangular cat ears
      const earSize = fw * 0.3;
      const earY = top - earSize * 0.4;
      for (const side of [-1, 1]) {
        const ecx = cx + side * fw * 0.22;
        ctx.beginPath();
        ctx.moveTo(ecx - earSize * 0.35, earY + earSize);
        ctx.lineTo(ecx, earY - earSize * 0.3);
        ctx.lineTo(ecx + earSize * 0.35, earY + earSize);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 180, 200, 0.88)";
        ctx.fill();
        ctx.strokeStyle = "rgba(80, 40, 40, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Inner ear
        ctx.beginPath();
        ctx.moveTo(ecx - earSize * 0.2, earY + earSize * 0.7);
        ctx.lineTo(ecx, earY + earSize * 0.05);
        ctx.lineTo(ecx + earSize * 0.2, earY + earSize * 0.7);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 130, 160, 0.7)";
        ctx.fill();
      }
      // Cat nose
      ctx.beginPath();
      ctx.ellipse(cx, noseY, fw * 0.04, fw * 0.03, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(50, 30, 30, 0.75)";
      ctx.fill();
      // Whiskers
      ctx.strokeStyle = "rgba(80, 60, 60, 0.5)";
      ctx.lineWidth = 1.5;
      for (const s of [-1, 1]) {
        for (const a of [-0.12, 0, 0.12]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * fw * 0.06, noseY + fw * 0.02);
          ctx.lineTo(cx + s * fw * 0.35, noseY + a * fw);
          ctx.stroke();
        }
      }
      break;
    }

    case "dog": {
      // Floppy ears
      const earW = fw * 0.22;
      const earH = fw * 0.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + s * fw * 0.38, top + fh * 0.18, earW, earH, s * -0.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160, 100, 60, 0.82)";
        ctx.fill();
        ctx.strokeStyle = "rgba(100, 60, 30, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Dog nose
      ctx.beginPath();
      ctx.ellipse(cx, noseY, fw * 0.07, fw * 0.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(30, 20, 20, 0.82)";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.02, noseY - fw * 0.015, fw * 0.02, fw * 0.01, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fill();
      // Tongue
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + fw * 0.08, fw * 0.06, fw * 0.1, 0, 0, Math.PI);
      ctx.fillStyle = "rgba(255, 120, 140, 0.82)";
      ctx.fill();
      break;
    }

    case "bunny": {
      const earW = fw * 0.12;
      const earH = fw * 0.55;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + s * fw * 0.15, top - earH * 0.5, earW, earH, s * -0.1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(240, 230, 230, 0.92)";
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 160, 160, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + s * fw * 0.15, top - earH * 0.45, earW * 0.5, earH * 0.7, s * -0.1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 180, 190, 0.6)";
        ctx.fill();
      }
      // Nose
      ctx.beginPath();
      ctx.ellipse(cx, noseY, fw * 0.03, fw * 0.025, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 150, 170, 0.82)";
      ctx.fill();
      break;
    }

    case "crown": {
      const crownW = fw * 0.7;
      const crownH = fw * 0.35;
      const crownTop = top - crownH * 1.2;
      const grd = ctx.createLinearGradient(cx - crownW / 2, crownTop, cx + crownW / 2, crownTop + crownH);
      grd.addColorStop(0, "rgba(255, 215, 0, 0.92)");
      grd.addColorStop(1, "rgba(255, 180, 0, 0.92)");
      ctx.beginPath();
      ctx.moveTo(cx - crownW / 2, crownTop + crownH);
      ctx.lineTo(cx - crownW / 2, crownTop + crownH * 0.4);
      ctx.lineTo(cx - crownW * 0.25, crownTop + crownH * 0.7);
      ctx.lineTo(cx - crownW * 0.1, crownTop);
      ctx.lineTo(cx, crownTop + crownH * 0.5);
      ctx.lineTo(cx + crownW * 0.1, crownTop);
      ctx.lineTo(cx + crownW * 0.25, crownTop + crownH * 0.7);
      ctx.lineTo(cx + crownW / 2, crownTop + crownH * 0.4);
      ctx.lineTo(cx + crownW / 2, crownTop + crownH);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.strokeStyle = "rgba(200, 150, 0, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Gems
      const gems = ["#ff4444", "#4488ff", "#44ff44"];
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cx + (i - 1) * crownW * 0.2, crownTop + crownH * 0.6, fw * 0.025, 0, Math.PI * 2);
        ctx.fillStyle = gems[i];
        ctx.fill();
      }
      break;
    }

    case "glasses": {
      const glassR = fw * 0.14;
      ctx.lineWidth = Math.max(3, fw * 0.02);
      ctx.strokeStyle = "rgba(30, 30, 30, 0.85)";
      // Left lens
      ctx.beginPath();
      ctx.arc(eyeL.x, eyeL.y, glassR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20, 20, 50, 0.45)";
      ctx.fill();
      ctx.stroke();
      // Right lens
      ctx.beginPath();
      ctx.arc(eyeR.x, eyeR.y, glassR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Bridge
      ctx.beginPath();
      ctx.moveTo(eyeL.x + glassR, eyeL.y);
      ctx.lineTo(eyeR.x - glassR, eyeR.y);
      ctx.stroke();
      // Arms
      ctx.beginPath();
      ctx.moveTo(eyeL.x - glassR, eyeL.y);
      ctx.lineTo(x, eyeL.y + fw * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(eyeR.x + glassR, eyeR.y);
      ctx.lineTo(x + fw, eyeR.y + fw * 0.02);
      ctx.stroke();
      break;
    }

    case "devil": {
      const hornH = fw * 0.4;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * fw * 0.25, top);
        ctx.quadraticCurveTo(cx + s * fw * 0.35, top - hornH, cx + s * fw * 0.15, top - hornH * 0.8);
        ctx.lineTo(cx + s * fw * 0.2, top + fw * 0.05);
        ctx.closePath();
        ctx.fillStyle = "rgba(200, 30, 30, 0.88)";
        ctx.fill();
      }
      break;
    }

    case "angel": {
      ctx.beginPath();
      ctx.ellipse(cx, top - fw * 0.18, fw * 0.28, fw * 0.06, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 215, 0, 0.85)";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.shadowColor = "rgba(255, 215, 0, 0.5)";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx, top - fw * 0.18, fw * 0.28, fw * 0.06, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 225, 100, 0.6)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }

    case "blush": {
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.2, mouthY - fh * 0.08, fw * 0.1, fw * 0.065, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + fw * 0.2, mouthY - fh * 0.08, fw * 0.1, fw * 0.065, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 120, 160, 0.28)";
      ctx.fill();
      break;
    }

    case "freckles": {
      ctx.fillStyle = "rgba(120, 80, 60, 0.45)";
      for (let i = 0; i < 16; i++) {
        const sx = cx + (Math.random() - 0.5) * fw * 0.42;
        const sy = noseY + (Math.random() - 0.2) * fh * 0.22;
        const sr = fw * (0.006 + Math.random() * 0.01);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "liner": {
      ctx.strokeStyle = "rgba(30, 20, 30, 0.88)";
      ctx.lineWidth = Math.max(2, fw * 0.016);
      for (const eye of [eyeL, eyeR]) {
        ctx.beginPath();
        ctx.moveTo(eye.x - fw * 0.09, eye.y);
        ctx.quadraticCurveTo(eye.x, eye.y - fw * 0.05, eye.x + fw * 0.11, eye.y + fw * 0.01);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(eye.x + fw * 0.1, eye.y + fw * 0.005);
        ctx.lineTo(eye.x + fw * 0.15, eye.y - fw * 0.03);
        ctx.stroke();
      }
      break;
    }

    case "gloss": {
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + fh * 0.02, fw * 0.14, fh * 0.05, 0, 0, Math.PI * 2);
      const lipGrad = ctx.createLinearGradient(cx, mouthY - fh * 0.03, cx, mouthY + fh * 0.08);
      lipGrad.addColorStop(0, "rgba(255, 130, 170, 0.72)");
      lipGrad.addColorStop(1, "rgba(215, 40, 90, 0.68)");
      ctx.fillStyle = lipGrad;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.04, mouthY - fh * 0.002, fw * 0.03, fh * 0.01, -0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fill();
      break;
    }

    case "contour": {
      ctx.fillStyle = "rgba(110, 70, 40, 0.16)";
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.3, y + fh * 0.58, fw * 0.1, fh * 0.2, 0.25, 0, Math.PI * 2);
      ctx.ellipse(cx + fw * 0.3, y + fh * 0.58, fw * 0.1, fh * 0.2, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 245, 210, 0.16)";
      ctx.beginPath();
      ctx.ellipse(cx, y + fh * 0.48, fw * 0.08, fh * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "anime": {
      for (const eye of [eyeL, eyeR]) {
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y, fw * 0.12, fw * 0.085, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y + fw * 0.01, fw * 0.07, fw * 0.055, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(40, 130, 255, 0.72)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye.x, eye.y + fw * 0.012, fw * 0.032, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(20, 20, 30, 0.85)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye.x - fw * 0.013, eye.y - fw * 0.01, fw * 0.01, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
        ctx.fill();
      }
      break;
    }

    case "beautylift": {
      const skinGrad = ctx.createRadialGradient(cx, y + fh * 0.5, fw * 0.05, cx, y + fh * 0.5, fw * 0.55);
      skinGrad.addColorStop(0, "rgba(255, 220, 235, 0.12)");
      skinGrad.addColorStop(1, "rgba(255, 220, 235, 0)");
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.ellipse(cx, y + fh * 0.5, fw * 0.55, fh * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 120, 160, 0.22)";
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.2, mouthY - fh * 0.1, fw * 0.11, fh * 0.06, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + fw * 0.2, mouthY - fh * 0.1, fw * 0.11, fh * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(110, 70, 45, 0.13)";
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.3, y + fh * 0.6, fw * 0.08, fh * 0.2, 0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + fw * 0.3, y + fh * 0.6, fw * 0.08, fh * 0.2, -0.2, 0, Math.PI * 2);
      ctx.fill();

      const shine = ctx.createLinearGradient(cx, y + fh * 0.2, cx, y + fh * 0.8);
      shine.addColorStop(0, "rgba(255, 255, 255, 0.2)");
      shine.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.ellipse(cx, y + fh * 0.5, fw * 0.08, fh * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "lipred": {
      const grad = ctx.createLinearGradient(cx, mouthY - fh * 0.04, cx, mouthY + fh * 0.08);
      grad.addColorStop(0, "rgba(255, 95, 120, 0.85)");
      grad.addColorStop(1, "rgba(185, 10, 45, 0.82)");
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + fh * 0.02, fw * 0.15, fh * 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      break;
    }

    case "lipnude": {
      const grad = ctx.createLinearGradient(cx, mouthY - fh * 0.03, cx, mouthY + fh * 0.08);
      grad.addColorStop(0, "rgba(230, 170, 145, 0.78)");
      grad.addColorStop(1, "rgba(168, 108, 90, 0.75)");
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + fh * 0.02, fw * 0.145, fh * 0.055, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      break;
    }

    case "lipplum": {
      const grad = ctx.createLinearGradient(cx, mouthY - fh * 0.04, cx, mouthY + fh * 0.08);
      grad.addColorStop(0, "rgba(200, 85, 160, 0.82)");
      grad.addColorStop(1, "rgba(110, 35, 95, 0.85)");
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + fh * 0.02, fw * 0.15, fh * 0.058, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      break;
    }

    case "shadow": {
      for (const eye of [eyeL, eyeR]) {
        const g = ctx.createLinearGradient(eye.x, eye.y - fh * 0.08, eye.x, eye.y + fh * 0.03);
        g.addColorStop(0, "rgba(180, 80, 180, 0.42)");
        g.addColorStop(1, "rgba(255, 160, 200, 0.06)");
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y - fh * 0.03, fw * 0.11, fh * 0.05, 0, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
      break;
    }

    case "lashes": {
      ctx.strokeStyle = "rgba(20, 15, 20, 0.78)";
      ctx.lineWidth = Math.max(2, fw * 0.012);
      for (const eye of [eyeL, eyeR]) {
        for (let i = 0; i < 6; i++) {
          const p = -0.08 + i * 0.03;
          ctx.beginPath();
          ctx.moveTo(eye.x + fw * p, eye.y - fh * 0.01);
          ctx.lineTo(eye.x + fw * (p + 0.01), eye.y - fh * (0.05 + Math.abs(2 - i) * 0.003));
          ctx.stroke();
        }
      }
      break;
    }

    case "brows": {
      ctx.strokeStyle = "rgba(65, 45, 35, 0.85)";
      ctx.lineWidth = Math.max(3, fw * 0.014);
      ctx.beginPath();
      ctx.moveTo(eyeL.x - fw * 0.11, eyeL.y - fh * 0.12);
      ctx.quadraticCurveTo(eyeL.x, eyeL.y - fh * 0.16, eyeL.x + fw * 0.12, eyeL.y - fh * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(eyeR.x - fw * 0.12, eyeR.y - fh * 0.1);
      ctx.quadraticCurveTo(eyeR.x, eyeR.y - fh * 0.16, eyeR.x + fw * 0.11, eyeR.y - fh * 0.12);
      ctx.stroke();
      break;
    }

    case "noseslim": {
      ctx.strokeStyle = "rgba(120, 80, 60, 0.28)";
      ctx.lineWidth = Math.max(2, fw * 0.01);
      ctx.beginPath();
      ctx.moveTo(cx - fw * 0.045, eyeY + fh * 0.03);
      ctx.lineTo(cx - fw * 0.03, noseY + fh * 0.07);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + fw * 0.045, eyeY + fh * 0.03);
      ctx.lineTo(cx + fw * 0.03, noseY + fh * 0.07);
      ctx.stroke();
      break;
    }

    case "jawsnatch": {
      ctx.strokeStyle = "rgba(90, 60, 45, 0.24)";
      ctx.lineWidth = Math.max(4, fw * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx - fw * 0.44, y + fh * 0.78);
      ctx.quadraticCurveTo(cx - fw * 0.25, y + fh * 0.96, cx, y + fh * 0.98);
      ctx.quadraticCurveTo(cx + fw * 0.25, y + fh * 0.96, cx + fw * 0.44, y + fh * 0.78);
      ctx.stroke();
      break;
    }

    case "highlighter": {
      ctx.fillStyle = "rgba(255, 250, 220, 0.22)";
      ctx.beginPath();
      ctx.ellipse(cx, y + fh * 0.28, fw * 0.08, fh * 0.12, 0, 0, Math.PI * 2);
      ctx.ellipse(cx, y + fh * 0.5, fw * 0.06, fh * 0.2, 0, 0, Math.PI * 2);
      ctx.ellipse(cx, y + fh * 0.78, fw * 0.1, fh * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "teethwhite": {
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.beginPath();
      ctx.roundRect(cx - fw * 0.1, mouthY + fh * 0.005, fw * 0.2, fh * 0.035, fh * 0.015);
      ctx.fill();
      break;
    }

    case "lipcoral": {
      const grad = ctx.createLinearGradient(cx, mouthY - fh * 0.04, cx, mouthY + fh * 0.08);
      grad.addColorStop(0, "rgba(255, 145, 125, 0.82)");
      grad.addColorStop(1, "rgba(235, 90, 85, 0.8)");
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + fh * 0.02, fw * 0.15, fh * 0.058, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      break;
    }

    case "lipglossy": {
      const grad = ctx.createLinearGradient(cx, mouthY - fh * 0.04, cx, mouthY + fh * 0.08);
      grad.addColorStop(0, "rgba(255, 110, 165, 0.78)");
      grad.addColorStop(1, "rgba(198, 40, 120, 0.76)");
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + fh * 0.02, fw * 0.152, fh * 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.03, mouthY - fh * 0.003, fw * 0.05, fh * 0.012, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
      ctx.fill();
      break;
    }

    case "linerwing": {
      ctx.strokeStyle = "rgba(15, 10, 20, 0.92)";
      ctx.lineWidth = Math.max(2, fw * 0.014);
      for (const eye of [eyeL, eyeR]) {
        ctx.beginPath();
        ctx.moveTo(eye.x - fw * 0.1, eye.y);
        ctx.quadraticCurveTo(eye.x, eye.y - fw * 0.055, eye.x + fw * 0.12, eye.y + fw * 0.01);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(eye.x + fw * 0.11, eye.y + fw * 0.005);
        ctx.lineTo(eye.x + fw * 0.18, eye.y - fw * 0.045);
        ctx.stroke();
      }
      break;
    }

    case "smokey": {
      for (const eye of [eyeL, eyeR]) {
        const g = ctx.createLinearGradient(eye.x, eye.y - fh * 0.09, eye.x, eye.y + fh * 0.04);
        g.addColorStop(0, "rgba(55, 45, 70, 0.55)");
        g.addColorStop(1, "rgba(25, 20, 35, 0.05)");
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y - fh * 0.03, fw * 0.12, fh * 0.055, 0, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
      break;
    }

    case "blushmax": {
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.21, mouthY - fh * 0.09, fw * 0.12, fw * 0.075, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + fw * 0.21, mouthY - fh * 0.09, fw * 0.12, fw * 0.075, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 95, 150, 0.36)";
      ctx.fill();
      break;
    }

    case "contourpro": {
      ctx.fillStyle = "rgba(95, 60, 38, 0.2)";
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.31, y + fh * 0.6, fw * 0.11, fh * 0.22, 0.25, 0, Math.PI * 2);
      ctx.ellipse(cx + fw * 0.31, y + fh * 0.6, fw * 0.11, fh * 0.22, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 246, 210, 0.2)";
      ctx.beginPath();
      ctx.ellipse(cx, y + fh * 0.5, fw * 0.08, fh * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "browlift": {
      ctx.strokeStyle = "rgba(55, 35, 28, 0.9)";
      ctx.lineWidth = Math.max(3, fw * 0.015);
      ctx.beginPath();
      ctx.moveTo(eyeL.x - fw * 0.12, eyeL.y - fh * 0.14);
      ctx.quadraticCurveTo(eyeL.x, eyeL.y - fh * 0.2, eyeL.x + fw * 0.13, eyeL.y - fh * 0.11);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(eyeR.x - fw * 0.13, eyeR.y - fh * 0.11);
      ctx.quadraticCurveTo(eyeR.x, eyeR.y - fh * 0.2, eyeR.x + fw * 0.12, eyeR.y - fh * 0.14);
      ctx.stroke();
      break;
    }

    case "bigeyes": {
      for (const eye of [eyeL, eyeR]) {
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y, fw * 0.14, fw * 0.095, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye.x, eye.y + fw * 0.005, fw * 0.045, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(30, 30, 40, 0.72)";
        ctx.fill();
      }
      break;
    }

    case "vface": {
      ctx.strokeStyle = "rgba(90, 58, 45, 0.26)";
      ctx.lineWidth = Math.max(5, fw * 0.021);
      ctx.beginPath();
      ctx.moveTo(cx - fw * 0.46, y + fh * 0.72);
      ctx.quadraticCurveTo(cx - fw * 0.23, y + fh * 1.01, cx, y + fh * 1.02);
      ctx.quadraticCurveTo(cx + fw * 0.23, y + fh * 1.01, cx + fw * 0.46, y + fh * 0.72);
      ctx.stroke();
      break;
    }

    case "nosehighlight": {
      ctx.strokeStyle = "rgba(255, 248, 225, 0.4)";
      ctx.lineWidth = Math.max(2, fw * 0.01);
      ctx.beginPath();
      ctx.moveTo(cx, eyeY + fh * 0.05);
      ctx.lineTo(cx, noseY + fh * 0.06);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, noseY + fh * 0.08, fw * 0.035, fh * 0.02, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 250, 225, 0.33)";
      ctx.fill();
      break;
    }

    case "liptint": {
      const grad = ctx.createLinearGradient(cx, mouthY - fh * 0.04, cx, mouthY + fh * 0.08);
      grad.addColorStop(0, "rgba(255, 130, 155, 0.72)");
      grad.addColorStop(1, "rgba(210, 72, 118, 0.7)");
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + fh * 0.02, fw * 0.145, fh * 0.055, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      break;
    }

    case "glasslips": {
      const grad = ctx.createLinearGradient(cx, mouthY - fh * 0.04, cx, mouthY + fh * 0.08);
      grad.addColorStop(0, "rgba(255, 115, 170, 0.7)");
      grad.addColorStop(1, "rgba(190, 52, 130, 0.68)");
      ctx.beginPath();
      ctx.ellipse(cx, mouthY + fh * 0.02, fw * 0.15, fh * 0.058, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.02, mouthY - fh * 0.004, fw * 0.06, fh * 0.012, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
      ctx.fill();
      break;
    }

    case "catliner": {
      ctx.strokeStyle = "rgba(12, 10, 18, 0.94)";
      ctx.lineWidth = Math.max(2, fw * 0.014);
      for (const eye of [eyeL, eyeR]) {
        ctx.beginPath();
        ctx.moveTo(eye.x - fw * 0.1, eye.y);
        ctx.quadraticCurveTo(eye.x, eye.y - fw * 0.058, eye.x + fw * 0.12, eye.y + fw * 0.008);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(eye.x + fw * 0.11, eye.y + fw * 0.003);
        ctx.lineTo(eye.x + fw * 0.2, eye.y - fw * 0.055);
        ctx.stroke();
      }
      break;
    }

    case "softblush": {
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.2, mouthY - fh * 0.09, fw * 0.1, fw * 0.065, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + fw * 0.2, mouthY - fh * 0.09, fw * 0.1, fw * 0.065, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 135, 175, 0.24)";
      ctx.fill();
      break;
    }

    case "contourx": {
      ctx.fillStyle = "rgba(96, 62, 42, 0.18)";
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.31, y + fh * 0.6, fw * 0.105, fh * 0.22, 0.25, 0, Math.PI * 2);
      ctx.ellipse(cx + fw * 0.31, y + fh * 0.6, fw * 0.105, fh * 0.22, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 244, 215, 0.2)";
      ctx.beginPath();
      ctx.ellipse(cx, y + fh * 0.5, fw * 0.075, fh * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "dollyeyes": {
      for (const eye of [eyeL, eyeR]) {
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y, fw * 0.15, fw * 0.1, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y + fw * 0.006, fw * 0.085, fw * 0.06, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(90, 120, 210, 0.62)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye.x, eye.y + fw * 0.01, fw * 0.038, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(22, 22, 30, 0.82)";
        ctx.fill();
      }
      break;
    }

    case "cheekhearts": {
      drawHeart(ctx, cx - fw * 0.22, mouthY - fh * 0.08, fw * 0.05, "rgba(255, 95, 145, 0.86)");
      drawHeart(ctx, cx + fw * 0.22, mouthY - fh * 0.08, fw * 0.05, "rgba(255, 95, 145, 0.86)");
      break;
    }

    case "goldglow": {
      const glow = ctx.createRadialGradient(cx, y + fh * 0.5, fw * 0.12, cx, y + fh * 0.5, fw * 0.7);
      glow.addColorStop(0, "rgba(255, 215, 120, 0.14)");
      glow.addColorStop(1, "rgba(255, 215, 120, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(cx, y + fh * 0.5, fw * 0.7, fh * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "hearts": {
      for (let i = 0; i < 8; i++) {
        const hx = cx + Math.sin(t * 0.002 + i * 1.2) * fw * 0.6;
        const baseY = top - fh * 0.1;
        const hy = baseY + Math.cos(t * 0.003 + i * 0.8) * fh * 0.3 - (t * 0.05 + i * 20) % (fh * 0.5);
        const hs = fw * 0.04 + Math.sin(i) * fw * 0.02;
        const ha = Math.max(0, 1 - ((t * 0.05 + i * 20) % (fh * 0.5)) / (fh * 0.5));
        if (ha <= 0) continue;
        ctx.globalAlpha = ha * 0.85;
        drawHeart(ctx, hx, hy, hs, "rgba(255, 60, 100, 0.9)");
      }
      ctx.globalAlpha = 1;
      break;
    }

    case "stars": {
      for (let i = 0; i < 10; i++) {
        const sx = cx + Math.sin(t * 0.001 + i * 2) * fw * 0.8;
        const sy = top + Math.cos(t * 0.002 + i * 1.5) * fh * 0.4;
        const ss = fw * 0.035 + Math.sin(t * 0.005 + i) * fw * 0.01;
        ctx.globalAlpha = 0.6 + Math.sin(t * 0.005 + i) * 0.3;
        drawStar(ctx, sx, sy, ss, "rgba(255, 215, 0, 0.9)");
      }
      ctx.globalAlpha = 1;
      break;
    }

    case "flowers": {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.001;
        const r = fw * 0.5;
        drawFlower(ctx, cx + Math.cos(a) * r, top + fh * 0.3 + Math.sin(a) * r * 0.3, fw * 0.06);
      }
      break;
    }

    case "fire": {
      for (let i = 0; i < 5; i++) {
        const fx = x + fw * 0.1 + i * fw * 0.2;
        const fy = y + fh - fw * 0.05 + Math.sin(t * 0.01 + i * 2) * fw * 0.02;
        drawFlame(ctx, fx, fy, fw * 0.08);
      }
      break;
    }

    case "butterfly": {
      for (let i = 0; i < 3; i++) {
        const bx = cx + Math.sin(t * 0.002 + i * 3) * fw * 0.5;
        const by = top - fw * 0.1 + Math.cos(t * 0.003 + i * 2) * fh * 0.2;
        drawButterfly(ctx, bx, by, fw * 0.08, Math.sin(t * 0.008 + i) * 0.3);
      }
      break;
    }

    case "rainbow": {
      const colors = ["#ff000080", "#ff880080", "#ffff0080", "#00cc0080", "#0000ff80", "#4b008280", "#ee82ee80"];
      for (let i = 0; i < colors.length; i++) {
        ctx.beginPath();
        ctx.arc(cx, top + fh * 0.3, fw * 0.65 - i * fw * 0.03, Math.PI, 0);
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = fw * 0.025;
        ctx.stroke();
      }
      break;
    }

    case "sparkles": {
      for (let i = 0; i < 15; i++) {
        const sx = cx + Math.sin(t * 0.003 + i * 1.7) * cw * 0.35;
        const sy = ch * 0.1 + Math.cos(t * 0.002 + i * 2.3) * ch * 0.4;
        ctx.globalAlpha = Math.max(0, 0.4 + Math.sin(t * 0.008 + i * 3) * 0.5);
        drawSparkle(ctx, sx, sy, fw * 0.035);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case "snow": {
      for (let i = 0; i < 25; i++) {
        const sx = (Math.sin(i * 7.3) * 0.5 + 0.5) * cw;
        const sy = ((t * 0.03 + i * ch * 0.04) % ch);
        const ss = fw * 0.012 + (i % 3) * fw * 0.005;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(sx + Math.sin(t * 0.002 + i) * 10, sy, ss, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }

    case "halo": {
      const pulse = 1 + Math.sin(t * 0.006) * 0.04;
      const haloY = top - fw * 0.18;
      ctx.beginPath();
      ctx.ellipse(cx, haloY, fw * 0.3 * pulse, fw * 0.08 * pulse, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 220, 120, 0.95)";
      ctx.lineWidth = Math.max(3, fw * 0.026);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, haloY, fw * 0.35 * pulse, fw * 0.1 * pulse, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 240, 180, 0.45)";
      ctx.lineWidth = Math.max(2, fw * 0.014);
      ctx.stroke();
      break;
    }

    case "neon": {
      const ringR = fw * 0.62 + Math.sin(t * 0.004) * fw * 0.03;
      const neonColors = ["rgba(255, 0, 140, 0.7)", "rgba(0, 230, 255, 0.7)", "rgba(130, 255, 70, 0.7)"];
      for (let i = 0; i < neonColors.length; i++) {
        ctx.beginPath();
        ctx.arc(cx, y + fh * 0.48, ringR - i * fw * 0.05, 0, Math.PI * 2);
        ctx.strokeStyle = neonColors[i];
        ctx.lineWidth = fw * 0.02;
        ctx.stroke();
      }
      break;
    }

    case "pixel": {
      const cell = Math.max(4, Math.round(fw * 0.04));
      for (let py = -3; py <= 3; py++) {
        for (let px = -5; px <= 5; px++) {
          if (Math.abs(px) + Math.abs(py) > 7) continue;
          const alpha = 0.18 + ((px + py + 12) % 4) * 0.1;
          ctx.fillStyle = `rgba(80, 255, 180, ${alpha})`;
          ctx.fillRect(cx + px * cell, noseY + py * cell, cell - 1, cell - 1);
        }
      }
      break;
    }

    case "comic": {
      const burst = fw * (0.45 + Math.sin(t * 0.01) * 0.05);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r1 = burst * 0.5;
        const r2 = burst;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, eyeY + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a + 0.08) * r2, eyeY + Math.sin(a + 0.08) * r2);
        ctx.lineTo(cx + Math.cos(a + 0.16) * r1, eyeY + Math.sin(a + 0.16) * r1);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? "rgba(255, 240, 90, 0.4)" : "rgba(255, 70, 70, 0.35)";
        ctx.fill();
      }
      break;
    }

    case "mask": {
      const maskY = eyeY - fh * 0.03;
      const maskW = fw * 0.78;
      const maskH = fh * 0.34;
      const grad = ctx.createLinearGradient(cx - maskW / 2, maskY, cx + maskW / 2, maskY + maskH);
      grad.addColorStop(0, "rgba(30, 30, 40, 0.55)");
      grad.addColorStop(1, "rgba(10, 10, 20, 0.78)");
      ctx.beginPath();
      ctx.roundRect(cx - maskW / 2, maskY, maskW, maskH, maskH * 0.45);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(eyeL.x, eyeL.y, fw * 0.11, fw * 0.08, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeR.x, eyeR.y, fw * 0.11, fw * 0.08, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120, 210, 255, 0.28)";
      ctx.fill();
      break;
    }

    case "aura": {
      const auraR = fw * 0.75;
      const grad = ctx.createRadialGradient(cx, y + fh * 0.45, fw * 0.1, cx, y + fh * 0.45, auraR);
      grad.addColorStop(0, "rgba(255, 120, 220, 0.05)");
      grad.addColorStop(0.5, "rgba(120, 190, 255, 0.18)");
      grad.addColorStop(1, "rgba(120, 120, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, y + fh * 0.45, auraR, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "laser": {
      const pulse = 0.2 + Math.abs(Math.sin(t * 0.02)) * 0.45;
      for (const eye of [eyeL, eyeR]) {
        const beamY = eye.y + Math.sin(t * 0.014) * 2;
        const beamLen = cw - eye.x;
        const beamGrad = ctx.createLinearGradient(eye.x, beamY, eye.x + beamLen, beamY);
        beamGrad.addColorStop(0, `rgba(255, 0, 40, ${0.85 + pulse})`);
        beamGrad.addColorStop(1, "rgba(255, 0, 40, 0)");
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = fw * 0.04;
        ctx.beginPath();
        ctx.moveTo(eye.x, beamY);
        ctx.lineTo(cw, beamY + Math.sin(t * 0.01) * 3);
        ctx.stroke();
      }
      break;
    }

    case "tears": {
      const dropOffset = (Math.sin(t * 0.01) + 1) * fh * 0.08;
      for (const eye of [eyeL, eyeR]) {
        const dx = eye.x;
        const dy = eye.y + fh * 0.08 + dropOffset;
        ctx.beginPath();
        ctx.moveTo(dx, dy - fw * 0.04);
        ctx.quadraticCurveTo(dx - fw * 0.03, dy + fw * 0.015, dx, dy + fw * 0.08);
        ctx.quadraticCurveTo(dx + fw * 0.03, dy + fw * 0.015, dx, dy - fw * 0.04);
        ctx.closePath();
        const tearGrad = ctx.createLinearGradient(dx, dy - fw * 0.04, dx, dy + fw * 0.08);
        tearGrad.addColorStop(0, "rgba(180, 230, 255, 0.8)");
        tearGrad.addColorStop(1, "rgba(80, 170, 255, 0.25)");
        ctx.fillStyle = tearGrad;
        ctx.fill();
      }
      break;
    }

    case "glitch": {
      for (let i = 0; i < 12; i++) {
        const gy = y + ((i + (t * 0.02) % 1) / 12) * fh;
        const offset = Math.sin(t * 0.02 + i) * fw * 0.06;
        ctx.fillStyle = i % 3 === 0 ? "rgba(255, 60, 120, 0.25)" : i % 3 === 1 ? "rgba(80, 220, 255, 0.22)" : "rgba(255, 255, 255, 0.12)";
        ctx.fillRect(x + offset, gy, fw, fh * 0.03);
      }
      break;
    }

    case "scanline": {
      ctx.strokeStyle = "rgba(160, 255, 180, 0.18)";
      ctx.lineWidth = 1;
      for (let sy = Math.floor(y); sy < y + fh; sy += 4) {
        ctx.beginPath();
        ctx.moveTo(x, sy);
        ctx.lineTo(x + fw, sy);
        ctx.stroke();
      }
      const barY = y + ((t * 0.06) % fh);
      const barGrad = ctx.createLinearGradient(x, barY, x + fw, barY);
      barGrad.addColorStop(0, "rgba(120, 255, 190, 0)");
      barGrad.addColorStop(0.5, "rgba(120, 255, 190, 0.45)");
      barGrad.addColorStop(1, "rgba(120, 255, 190, 0)");
      ctx.fillStyle = barGrad;
      ctx.fillRect(x, barY - fh * 0.03, fw, fh * 0.06);
      break;
    }

    case "pixelhearts": {
      const size = Math.max(4, fw * 0.02);
      for (let i = 0; i < 10; i++) {
        const px = x + ((i * 53 + t * 0.03) % fw);
        const py = y + fh - ((i * 37 + t * 0.05) % (fh * 1.2));
        ctx.fillStyle = "rgba(255, 90, 150, 0.8)";
        ctx.fillRect(px, py, size, size);
        ctx.fillRect(px + size * 2, py, size, size);
        ctx.fillRect(px - size, py + size, size * 5, size);
        ctx.fillRect(px, py + size * 2, size * 3, size);
        ctx.fillRect(px + size, py + size * 3, size, size);
      }
      break;
    }

    case "frost": {
      const frostGrad = ctx.createRadialGradient(cx, y + fh * 0.5, fw * 0.1, cx, y + fh * 0.5, fw * 0.8);
      frostGrad.addColorStop(0, "rgba(220, 245, 255, 0)");
      frostGrad.addColorStop(1, "rgba(200, 235, 255, 0.28)");
      ctx.fillStyle = frostGrad;
      ctx.fillRect(x - fw * 0.1, y - fh * 0.1, fw * 1.2, fh * 1.2);
      for (let i = 0; i < 18; i++) {
        const sx = x + (i / 18) * fw;
        const sy = y + ((Math.sin(i * 2.4 + t * 0.004) * 0.5 + 0.5) * fh);
        drawSparkle(ctx, sx, sy, fw * 0.02);
      }
      break;
    }

    case "lightning": {
      ctx.strokeStyle = "rgba(255, 240, 110, 0.9)";
      ctx.lineWidth = fw * 0.018;
      for (const side of [-1, 1]) {
        const lx = cx + side * fw * 0.32;
        ctx.beginPath();
        ctx.moveTo(lx, top - fh * 0.25);
        ctx.lineTo(lx + side * fw * 0.06, top - fh * 0.02);
        ctx.lineTo(lx - side * fw * 0.02, top + fh * 0.02);
        ctx.lineTo(lx + side * fw * 0.08, top + fh * 0.26);
        ctx.stroke();
      }
      break;
    }

    case "confetti": {
      for (let i = 0; i < 36; i++) {
        const cxp = (i * 67 + t * 0.04) % cw;
        const cyp = (i * 41 + t * 0.06) % ch;
        const w = fw * 0.018;
        const h = fw * 0.05;
        ctx.save();
        ctx.translate(cxp, cyp);
        ctx.rotate((i * 0.7 + t * 0.002) % (Math.PI * 2));
        ctx.fillStyle = i % 4 === 0 ? "rgba(255, 90, 120, 0.8)" : i % 4 === 1 ? "rgba(80, 220, 255, 0.8)" : i % 4 === 2 ? "rgba(255, 230, 90, 0.8)" : "rgba(140, 255, 120, 0.8)";
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
      break;
    }

    case "sunglasses": {
      const lensW = fw * 0.22;
      const lensH = fw * 0.12;
      const bridgeY = eyeY;
      for (const eye of [eyeL, eyeR]) {
        const grad = ctx.createLinearGradient(eye.x - lensW, bridgeY - lensH, eye.x + lensW, bridgeY + lensH);
        grad.addColorStop(0, "rgba(10, 10, 30, 0.82)");
        grad.addColorStop(1, "rgba(30, 30, 60, 0.68)");
        ctx.beginPath();
        ctx.ellipse(eye.x, bridgeY, lensW, lensH, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 180, 200, 0.9)";
        ctx.lineWidth = fw * 0.012;
        ctx.stroke();
        // lens glare
        ctx.beginPath();
        ctx.ellipse(eye.x - lensW * 0.3, bridgeY - lensH * 0.3, lensW * 0.18, lensH * 0.1, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fill();
      }
      // bridge
      ctx.beginPath();
      ctx.moveTo(eyeL.x + lensW, bridgeY);
      ctx.lineTo(eyeR.x - lensW, bridgeY);
      ctx.strokeStyle = "rgba(180,180,200,0.9)";
      ctx.lineWidth = fw * 0.01;
      ctx.stroke();
      break;
    }

    case "diamonds": {
      for (let i = 0; i < 8; i++) {
        const dx = cx + Math.sin(t * 0.002 + i * 1.4) * fw * 0.55;
        const baseY2 = top - fh * 0.2;
        const dy = baseY2 - ((t * 0.04 + i * 28) % (fh * 0.7));
        const ds = fw * 0.038 + Math.sin(i * 1.1) * fw * 0.012;
        const alpha2 = Math.max(0, 1 - ((t * 0.04 + i * 28) % (fh * 0.7)) / (fh * 0.7));
        ctx.globalAlpha = alpha2 * 0.9;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(t * 0.005 + i);
        ctx.beginPath();
        ctx.moveTo(0, -ds);
        ctx.lineTo(ds * 0.6, 0);
        ctx.lineTo(0, ds * 1.2);
        ctx.lineTo(-ds * 0.6, 0);
        ctx.closePath();
        const dg = ctx.createLinearGradient(-ds, -ds, ds, ds);
        dg.addColorStop(0, "rgba(180,240,255,0.95)");
        dg.addColorStop(0.5, "rgba(100,200,255,0.8)");
        dg.addColorStop(1, "rgba(200,255,255,0.9)");
        ctx.fillStyle = dg;
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      break;
    }

    case "smoke": {
      for (let i = 0; i < 6; i++) {
        const offset2 = (t * 0.025 + i * 20) % (fh * 0.6);
        const alpha3 = Math.max(0, 0.35 - offset2 / (fh * 0.6) * 0.35);
        ctx.globalAlpha = alpha3;
        const sr = fw * 0.06 + offset2 * 0.2;
        for (const nx of [cx - fw * 0.08, cx + fw * 0.08]) {
          ctx.beginPath();
          ctx.arc(nx + Math.sin(offset2 * 0.05 + i) * fw * 0.04, noseY - offset2, sr, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(200,200,220,0.6)";
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      break;
    }

    case "vampire": {
      // pale skin overlay
      const paleGrad = ctx.createRadialGradient(cx, y + fh * 0.45, 0, cx, y + fh * 0.45, fw * 0.7);
      paleGrad.addColorStop(0, "rgba(220,235,230,0.18)");
      paleGrad.addColorStop(1, "rgba(220,235,230,0)");
      ctx.fillStyle = paleGrad;
      ctx.beginPath();
      ctx.ellipse(cx, y + fh * 0.45, fw * 0.65, fh * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // red eyes
      for (const eye of [eyeL, eyeR]) {
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y, fw * 0.07, fw * 0.04, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(220,20,60,0.7)";
        ctx.fill();
      }
      // fangs
      const fangY = y + fh * 0.84;
      for (const fx2 of [cx - fw * 0.06, cx + fw * 0.06]) {
        ctx.beginPath();
        ctx.moveTo(fx2 - fw * 0.025, fangY);
        ctx.lineTo(fx2 + fw * 0.025, fangY);
        ctx.lineTo(fx2, fangY + fh * 0.1);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fill();
      }
      break;
    }

    case "alien": {
      // big almond eyes
      for (const eye of [eyeL, eyeR]) {
        const alienGrad = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, fw * 0.14);
        alienGrad.addColorStop(0, "rgba(120,255,200,0.95)");
        alienGrad.addColorStop(0.5, "rgba(0,180,120,0.8)");
        alienGrad.addColorStop(1, "rgba(0,60,40,0)");
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y, fw * 0.16, fw * 0.09, 0, 0, Math.PI * 2);
        ctx.fillStyle = alienGrad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, fw * 0.04, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.9)";
        ctx.fill();
      }
      // green skin tint
      const alienSkin = ctx.createRadialGradient(cx, y + fh * 0.4, 0, cx, y + fh * 0.4, fw * 0.7);
      alienSkin.addColorStop(0, "rgba(100,220,160,0.12)");
      alienSkin.addColorStop(1, "rgba(100,220,160,0)");
      ctx.fillStyle = alienSkin;
      ctx.beginPath();
      ctx.ellipse(cx, y + fh * 0.4, fw * 0.7, fh * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "panda": {
      // black eye patches
      for (const eye of [eyeL, eyeR]) {
        ctx.beginPath();
        ctx.ellipse(eye.x, eye.y + fw * 0.02, fw * 0.12, fw * 0.1, eye === eyeL ? -0.3 : 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(30,30,30,0.88)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, fw * 0.04, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(80,80,80,0.6)";
        ctx.fill();
      }
      // nose tip
      ctx.beginPath();
      ctx.ellipse(cx, noseY, fw * 0.055, fw * 0.038, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20,20,20,0.85)";
      ctx.fill();
      break;
    }

    case "tiger": {
      // stripes on cheeks
      ctx.strokeStyle = "rgba(180,90,10,0.75)";
      ctx.lineWidth = fw * 0.022;
      ctx.lineCap = "round";
      const stripes = [
        [cx - fw * 0.35, eyeY + fw * 0.04, cx - fw * 0.15, eyeY + fw * 0.16],
        [cx - fw * 0.38, eyeY + fw * 0.22, cx - fw * 0.12, eyeY + fw * 0.3],
        [cx - fw * 0.36, eyeY + fw * 0.38, cx - fw * 0.1, eyeY + fw * 0.44],
        [cx + fw * 0.35, eyeY + fw * 0.04, cx + fw * 0.15, eyeY + fw * 0.16],
        [cx + fw * 0.38, eyeY + fw * 0.22, cx + fw * 0.12, eyeY + fw * 0.3],
        [cx + fw * 0.36, eyeY + fw * 0.38, cx + fw * 0.1, eyeY + fw * 0.44],
      ] as [number, number, number, number][];
      for (const [x1, y1, x2, y2] of stripes) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      // nose
      ctx.beginPath();
      ctx.moveTo(cx, noseY - fw * 0.02);
      ctx.lineTo(cx - fw * 0.04, noseY + fw * 0.03);
      ctx.lineTo(cx + fw * 0.04, noseY + fw * 0.03);
      ctx.closePath();
      ctx.fillStyle = "rgba(180,80,40,0.85)";
      ctx.fill();
      break;
    }

    case "aurora": {
      for (let i = 0; i < 4; i++) {
        const ay = top - fh * (0.2 + i * 0.12);
        const aw = cw;
        const ah = fh * 0.18;
        const aGrad = ctx.createLinearGradient(0, ay, 0, ay + ah);
        const aColors = [
          ["rgba(0,255,180,0.18)", "rgba(0,255,180,0)"],
          ["rgba(80,200,255,0.14)", "rgba(80,200,255,0)"],
          ["rgba(200,100,255,0.12)", "rgba(200,100,255,0)"],
          ["rgba(0,255,120,0.1)", "rgba(0,255,120,0)"],
        ];
        aGrad.addColorStop(0, aColors[i][0]);
        aGrad.addColorStop(1, aColors[i][1]);
        ctx.fillStyle = aGrad;
        ctx.beginPath();
        ctx.ellipse(cx + Math.sin(t * 0.002 + i) * aw * 0.1, ay + ah * 0.5, aw * 0.62 + i * fw * 0.08, ah, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "glitterbomb": {
      for (let i = 0; i < 40; i++) {
        const gx = (Math.sin(i * 4.7 + t * 0.003) * 0.5 + 0.5) * cw;
        const gy = (Math.cos(i * 3.1 + t * 0.005) * 0.5 + 0.5) * ch;
        const gr = fw * 0.008 + Math.sin(t * 0.01 + i) * fw * 0.003;
        const hue = (i * 25 + t * 0.2) % 360;
        ctx.globalAlpha = 0.5 + Math.sin(t * 0.01 + i * 2) * 0.4;
        ctx.beginPath();
        ctx.arc(gx, gy, Math.max(1, gr), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},100%,75%,1)`;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }

    case "flowerfield": {
      for (let i = 0; i < 9; i++) {
        const ffx = x + (i / 8) * fw;
        const ffy = y + fh + Math.sin(t * 0.002 + i) * fh * 0.05;
        drawFlower(ctx, ffx, ffy, fw * 0.055);
      }
      break;
    }

    case "starfield": {
      for (let i = 0; i < 30; i++) {
        const sfx = (Math.sin(i * 5.3) * 0.5 + 0.5) * cw;
        const sfy = (Math.cos(i * 4.1) * 0.5 + 0.5) * ch;
        const sfr = fw * 0.008 + Math.sin(t * 0.008 + i) * fw * 0.004;
        ctx.globalAlpha = 0.4 + Math.sin(t * 0.01 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(sfx, sfy, Math.max(1, sfr), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,220,0.9)";
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }

    case "facegem": {
      const gemY = top - fh * 0.06;
      const gemSize = fw * 0.06;
      const gemGrad = ctx.createLinearGradient(cx - gemSize, gemY - gemSize, cx + gemSize, gemY + gemSize);
      gemGrad.addColorStop(0, "rgba(180,120,255,0.95)");
      gemGrad.addColorStop(0.5, "rgba(100,200,255,0.9)");
      gemGrad.addColorStop(1, "rgba(220,180,255,0.95)");
      ctx.beginPath();
      ctx.moveTo(cx, gemY - gemSize);
      ctx.lineTo(cx + gemSize, gemY);
      ctx.lineTo(cx + gemSize * 0.6, gemY + gemSize);
      ctx.lineTo(cx - gemSize * 0.6, gemY + gemSize);
      ctx.lineTo(cx - gemSize, gemY);
      ctx.closePath();
      ctx.fillStyle = gemGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = fw * 0.008;
      ctx.stroke();
      // gem shine
      ctx.beginPath();
      ctx.moveTo(cx - gemSize * 0.3, gemY - gemSize * 0.6);
      ctx.lineTo(cx + gemSize * 0.1, gemY - gemSize * 0.2);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = fw * 0.012;
      ctx.stroke();
      break;
    }

    case "lipspark": {
      const lipCenterY = y + fh * 0.82;
      for (let i = 0; i < 10; i++) {
        const lsx = cx + Math.sin(t * 0.01 + i * 0.6) * fw * 0.22;
        const lsy = lipCenterY - ((t * 0.05 + i * 14) % (fh * 0.35));
        ctx.globalAlpha = Math.max(0, 0.9 - ((t * 0.05 + i * 14) % (fh * 0.35)) / (fh * 0.35));
        drawSparkle(ctx, lsx, lsy, fw * 0.03);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case "nosering": {
      const nrX = cx;
      const nrY = noseY + fw * 0.04;
      const nrR = fw * 0.038;
      ctx.beginPath();
      ctx.arc(nrX, nrY, nrR, 0.15, Math.PI - 0.15);
      ctx.strokeStyle = "rgba(210,180,60,0.95)";
      ctx.lineWidth = fw * 0.02;
      ctx.stroke();
      break;
    }

    case "eyeflare": {
      for (const eye of [eyeL, eyeR]) {
        const flare = 0.6 + Math.sin(t * 0.008) * 0.3;
        const flareg = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, fw * 0.28);
        flareg.addColorStop(0, `rgba(255,250,200,${flare})`);
        flareg.addColorStop(0.2, `rgba(255,220,100,${flare * 0.5})`);
        flareg.addColorStop(1, "rgba(255,180,50,0)");
        ctx.fillStyle = flareg;
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, fw * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "magicwand": {
      const wandAngle = Math.sin(t * 0.003) * 0.3 + 0.8;
      const wandTip = { x: cx + Math.cos(wandAngle) * fw * 0.5, y: top - fh * 0.1 + Math.sin(wandAngle) * fw * 0.2 };
      ctx.save();
      ctx.strokeStyle = "rgba(255,240,120,0.9)";
      ctx.lineWidth = fw * 0.015;
      ctx.beginPath();
      ctx.moveTo(cx, top + fh * 0.2);
      ctx.lineTo(wandTip.x, wandTip.y);
      ctx.stroke();
      drawStar(ctx, wandTip.x, wandTip.y, fw * 0.06, "rgba(255,240,100,0.95)");
      for (let i = 0; i < 6; i++) {
        const sparkA = (t * 0.008 + i * 1.05) % (Math.PI * 2);
        const sparkR = fw * 0.1 + i * fw * 0.01;
        const sparkX = wandTip.x + Math.cos(sparkA) * sparkR;
        const sparkY = wandTip.y + Math.sin(sparkA) * sparkR;
        ctx.globalAlpha = 0.6 + Math.sin(t * 0.015 + i) * 0.3;
        drawSparkle(ctx, sparkX, sparkY, fw * 0.022);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      break;
    }

    case "blissblush": {
      for (const side of [-1, 1]) {
        const bx = cx + side * fw * 0.3;
        const by = eyeY + fh * 0.22;
        // 3 overlapping blush dots
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(bx + i * fw * 0.04 * side, by + i * fw * 0.02, fw * 0.055 - i * fw * 0.01, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,140,170,${0.35 - i * 0.08})`;
          ctx.fill();
        }
      }
      break;
    }

    case "catmakeup": {
      // cat eye liner flick
      for (const eye of [eyeL, eyeR]) {
        const flip = eye === eyeL ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(eye.x - fw * 0.12, eye.y + fw * 0.025);
        ctx.quadraticCurveTo(eye.x, eye.y - fw * 0.045, eye.x + fw * 0.12, eye.y + fw * 0.025);
        ctx.lineTo(eye.x + flip * fw * 0.22, eye.y - fw * 0.08);
        ctx.lineTo(eye.x + flip * fw * 0.16, eye.y + fw * 0.015);
        ctx.closePath();
        ctx.fillStyle = "rgba(20,10,20,0.88)";
        ctx.fill();
      }
      // pink blush
      for (const side2 of [-1, 1]) {
        const bx2 = cx + side2 * fw * 0.28;
        const by2 = eyeY + fh * 0.24;
        ctx.beginPath();
        ctx.ellipse(bx2, by2, fw * 0.1, fw * 0.065, side2 * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,130,180,0.3)";
        ctx.fill();
      }
      break;
    }

    case "lipberry": {
      const lbMouthY = y + fh * 0.82;
      const lbW = fw * 0.28;
      const lbH = fw * 0.07;
      const lbGrad = ctx.createLinearGradient(cx - lbW, lbMouthY, cx + lbW, lbMouthY + lbH);
      lbGrad.addColorStop(0, "rgba(100,20,80,0.88)");
      lbGrad.addColorStop(0.5, "rgba(160,50,120,0.92)");
      lbGrad.addColorStop(1, "rgba(100,20,80,0.88)");
      ctx.beginPath();
      ctx.ellipse(cx, lbMouthY, lbW, lbH, 0, 0, Math.PI);
      ctx.fillStyle = lbGrad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - lbW, lbMouthY);
      ctx.quadraticCurveTo(cx - lbW * 0.5, lbMouthY - lbH * 1.6, cx, lbMouthY - lbH * 0.2);
      ctx.quadraticCurveTo(cx + lbW * 0.5, lbMouthY - lbH * 1.6, cx + lbW, lbMouthY);
      ctx.fillStyle = lbGrad;
      ctx.fill();
      break;
    }

    case "pixelart": {
      const cell2 = Math.max(6, Math.round(fw * 0.055));
      const palettes = ["rgba(255,100,100,0.4)", "rgba(100,220,255,0.4)", "rgba(255,220,80,0.4)", "rgba(180,100,255,0.4)"];
      for (let py2 = 0; py2 < 7; py2++) {
        for (let px2 = 0; px2 < 7; px2++) {
          if (Math.random() < 0.35) continue;
          ctx.fillStyle = palettes[(px2 + py2 + Math.floor(t * 0.002)) % palettes.length];
          ctx.fillRect(
            cx - 3.5 * cell2 + px2 * cell2,
            eyeY - cell2 * 0.5 + py2 * cell2 - cell2 * 3,
            cell2 - 1, cell2 - 1
          );
        }
      }
      break;
    }
    case "mermaid": {
      // Iridescent scales on forehead and cheeks
      const scaleR = fw * 0.045;
      const scalePositions = [
        { x: cx - fw * 0.35, y: eyeY + fh * 0.05 }, { x: cx - fw * 0.25, y: eyeY - fh * 0.02 },
        { x: cx - fw * 0.38, y: eyeY + fh * 0.15 }, { x: cx + fw * 0.35, y: eyeY + fh * 0.05 },
        { x: cx + fw * 0.25, y: eyeY - fh * 0.02 }, { x: cx + fw * 0.38, y: eyeY + fh * 0.15 },
        { x: cx - fw * 0.1, y: eyeY - fh * 0.28 }, { x: cx, y: eyeY - fh * 0.32 }, { x: cx + fw * 0.1, y: eyeY - fh * 0.28 },
      ];
      scalePositions.forEach((p, i) => {
        const hue = (i * 36 + t * 0.05) % 360;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, scaleR, scaleR * 0.65, Math.PI / 6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 90%, 65%, 0.75)`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue + 30}, 80%, 80%, 0.5)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      break;
    }
    case "zombie": {
      // Green skin tint + dark eye rings
      ctx.fillStyle = "rgba(80,160,60,0.28)";
      ctx.beginPath();
      ctx.ellipse(cx, cy, fw * 0.55, fh * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      [eyeLX, eyeRX].forEach(ex => {
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, fw * 0.12, fh * 0.07, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(30,0,0,0.55)";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, fw * 0.04, fh * 0.04, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,20,20,0.85)";
        ctx.fill();
      });
      // Stitches
      ctx.strokeStyle = "rgba(0,80,0,0.7)"; ctx.lineWidth = 2;
      for (let s = 0; s < 5; s++) {
        const sx = cx - fw * 0.1 + s * fw * 0.05;
        ctx.beginPath(); ctx.moveTo(sx, mouthY - fh * 0.01); ctx.lineTo(sx, mouthY + fh * 0.04); ctx.stroke();
      }
      break;
    }
    case "robot": {
      // Silver face plate + LED eyes
      ctx.strokeStyle = "rgba(180,200,220,0.7)"; ctx.lineWidth = 3;
      ctx.strokeRect(cx - fw * 0.42, eyeY - fh * 0.22, fw * 0.84, fh * 0.65);
      [eyeLX, eyeRX].forEach(ex => {
        ctx.fillStyle = `rgba(0,${180 + Math.sin(t * 0.01) * 50},${220 + Math.cos(t * 0.008) * 30},0.9)`;
        ctx.fillRect(ex - fw * 0.08, eyeY - fh * 0.06, fw * 0.16, fh * 0.09);
        ctx.strokeStyle = "rgba(100,200,255,0.5)"; ctx.lineWidth = 1;
        ctx.strokeRect(ex - fw * 0.08, eyeY - fh * 0.06, fw * 0.16, fh * 0.09);
      });
      // Mouth grid
      ctx.strokeStyle = "rgba(150,200,220,0.6)"; ctx.lineWidth = 1.5;
      for (let g = 0; g < 5; g++) {
        ctx.beginPath(); ctx.moveTo(cx - fw * 0.18 + g * fw * 0.09, mouthY - fh * 0.02);
        ctx.lineTo(cx - fw * 0.18 + g * fw * 0.09, mouthY + fh * 0.05); ctx.stroke();
      }
      break;
    }
    case "witchhat": {
      // Big pointed witch hat above head
      const hatBase = eyeY - fh * 0.52;
      const hatW = fw * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - hatW / 2, hatBase);
      ctx.lineTo(cx + hatW / 2, hatBase);
      ctx.lineTo(cx, hatBase - fh * 0.9);
      ctx.closePath();
      ctx.fillStyle = "rgba(20,0,40,0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(150,80,220,0.7)"; ctx.lineWidth = 2; ctx.stroke();
      // Brim
      ctx.beginPath();
      ctx.ellipse(cx, hatBase, hatW * 0.62, fh * 0.07, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(30,0,55,0.9)"; ctx.fill();
      // Stars on hat
      const starPts = [{ x: cx - fw * 0.12, y: hatBase - fh * 0.3 }, { x: cx + fw * 0.08, y: hatBase - fh * 0.55 }];
      starPts.forEach(sp => {
        ctx.fillStyle = `rgba(255,220,80,${0.7 + Math.sin(t * 0.01) * 0.2})`;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, fw * 0.025, 0, Math.PI * 2); ctx.fill();
      });
      break;
    }
    case "dragon": {
      // Dragon horns + scales + fire breath
      [{ x: cx - fw * 0.22, dir: -1 }, { x: cx + fw * 0.22, dir: 1 }].forEach(h => {
        ctx.beginPath();
        ctx.moveTo(h.x, eyeY - fh * 0.35);
        ctx.lineTo(h.x + h.dir * fw * 0.08, eyeY - fh * 0.7);
        ctx.lineTo(h.x + h.dir * fw * 0.18, eyeY - fh * 0.32);
        ctx.closePath();
        ctx.fillStyle = "rgba(180,30,30,0.88)"; ctx.fill();
        ctx.strokeStyle = "rgba(220,120,40,0.7)"; ctx.lineWidth = 2; ctx.stroke();
      });
      // Scale dots
      for (let dr = 0; dr < 12; dr++) {
        const angle = (dr / 12) * Math.PI * 2 + t * 0.005;
        const rx = cx + Math.cos(angle) * fw * 0.32;
        const ry = cy + Math.sin(angle) * fh * 0.28;
        ctx.beginPath(); ctx.ellipse(rx, ry, fw * 0.035, fw * 0.025, angle, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${180 + dr * 5},${30 + dr * 4},30,0.65)`; ctx.fill();
      }
      // Fire breath
      const flames = 5;
      for (let f = 0; f < flames; f++) {
        ctx.beginPath();
        ctx.moveTo(cx + (f - 2) * fw * 0.06, mouthY);
        ctx.quadraticCurveTo(cx + (f - 2) * fw * 0.09, mouthY + fh * 0.22 + Math.sin(t * 0.02 + f) * fh * 0.06, cx + (f - 2) * fw * 0.04, mouthY + fh * 0.38);
        ctx.strokeStyle = `rgba(255,${80 + f * 28},0,${0.75 - f * 0.05})`;
        ctx.lineWidth = 4 - f * 0.4; ctx.stroke();
      }
      break;
    }
    case "beautymark": {
      // Classic beauty mark mole near lip
      ctx.beginPath();
      ctx.arc(cx + fw * 0.18, mouthY - fh * 0.06, fw * 0.022, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(40,20,10,0.92)"; ctx.fill();
      break;
    }
    case "bindi": {
      // Forehead bindi gem
      const bY = eyeY - fh * 0.28;
      const pulse = 0.85 + Math.sin(t * 0.015) * 0.1;
      ctx.beginPath(); ctx.arc(cx, bY, fw * 0.042 * pulse, 0, Math.PI * 2);
      const bindiG = ctx.createRadialGradient(cx, bY, 0, cx, bY, fw * 0.042);
      bindiG.addColorStop(0, "rgba(255,100,100,0.95)");
      bindiG.addColorStop(0.5, "rgba(200,20,60,0.9)");
      bindiG.addColorStop(1, "rgba(120,0,20,0.7)");
      ctx.fillStyle = bindiG; ctx.fill();
      ctx.strokeStyle = "rgba(255,180,180,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
      break;
    }
    case "earrings": {
      // Dangling gem earrings
      [{ x: cx - fw * 0.5, y: eyeY + fh * 0.02 }, { x: cx + fw * 0.5, y: eyeY + fh * 0.02 }].forEach((ep, i) => {
        const swing = Math.sin(t * 0.012 + i) * fw * 0.025;
        ctx.beginPath(); ctx.arc(ep.x + swing, ep.y, fw * 0.032, 0, Math.PI * 2);
        const ringG = ctx.createRadialGradient(ep.x + swing, ep.y, 0, ep.x + swing, ep.y, fw * 0.032);
        ringG.addColorStop(0, "rgba(255,240,120,1)"); ringG.addColorStop(1, "rgba(200,140,20,0.8)");
        ctx.fillStyle = ringG; ctx.fill();
        ctx.beginPath(); ctx.arc(ep.x + swing, ep.y + fh * 0.07, fw * 0.024, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100,200,255,0.9)"; ctx.fill();
      });
      break;
    }
    case "rainbowtears": {
      // Rainbow tear streaks from eyes
      const tearColors = ["rgba(255,80,80,0.55)", "rgba(255,180,40,0.55)", "rgba(80,220,80,0.55)", "rgba(60,140,255,0.55)", "rgba(200,80,255,0.55)"];
      [eyeLX, eyeRX].forEach(ex => {
        for (let tc = 0; tc < 5; tc++) {
          ctx.beginPath();
          ctx.moveTo(ex + (tc - 2) * fw * 0.022, eyeY + fh * 0.05);
          ctx.lineTo(ex + (tc - 2) * fw * 0.022 + Math.sin(t * 0.01 + tc) * fw * 0.04, eyeY + fh * (0.25 + tc * 0.05));
          ctx.strokeStyle = tearColors[tc]; ctx.lineWidth = 3.5; ctx.stroke();
        }
      });
      break;
    }
    case "moneyeyes": {
      // $ signs replacing pupils
      [eyeLX, eyeRX].forEach(ex => {
        ctx.beginPath(); ctx.ellipse(ex, eyeY, fw * 0.11, fh * 0.075, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(60,200,80,0.85)"; ctx.fill();
        ctx.font = `bold ${Math.round(fw * 0.12)}px serif`;
        ctx.fillStyle = "rgba(0,80,0,0.95)";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("$", ex, eyeY);
      });
      break;
    }
    case "crownstars": {
      // Crown of twinkling stars above head
      const crownY = eyeY - fh * 0.42;
      for (let cs = 0; cs < 9; cs++) {
        const angle = (cs / 9) * Math.PI * 2;
        const rx = cx + Math.cos(angle) * fw * 0.38;
        const ry = crownY + Math.sin(angle) * fh * 0.12;
        const pulse2 = 0.7 + Math.sin(t * 0.018 + cs) * 0.3;
        ctx.beginPath(); ctx.arc(rx, ry, fw * 0.022 * pulse2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${200 + cs * 6},60,${pulse2 * 0.9})`; ctx.fill();
      }
      break;
    }
    case "sakura": {
      // Falling cherry blossom petals
      for (let sp = 0; sp < 20; sp++) {
        const angle2 = ((sp * 137.5) % 360) * Math.PI / 180;
        const rad = fw * 0.1 + ((sp * 31 + Math.floor(t * 0.02)) % (fw * 0.9));
        const px3 = (cx - fw * 0.4 + ((sp * 47 + t * 0.04) % (fw * 0.8)));
        const py3 = (eyeY - fh * 0.5 + ((sp * 59 + t * 0.06) % (fh * 1.4)));
        ctx.save();
        ctx.translate(px3, py3);
        ctx.rotate(angle2 + t * 0.003);
        ctx.beginPath();
        ctx.ellipse(0, 0, fw * 0.028, fw * 0.016, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${170 + (sp % 5) * 14},${180 + (sp % 3) * 12},0.7)`;
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "facepaint": {
      // Tribal / festival face paint lines
      const lines = [
        { x1: cx - fw * 0.46, y1: eyeY - fh * 0.08, x2: cx - fw * 0.1, y2: eyeY + fh * 0.02 },
        { x1: cx + fw * 0.46, y1: eyeY - fh * 0.08, x2: cx + fw * 0.1, y2: eyeY + fh * 0.02 },
        { x1: cx - fw * 0.2, y1: noseY + fh * 0.08, x2: cx + fw * 0.2, y2: noseY + fh * 0.08 },
      ];
      lines.forEach((ln, i) => {
        ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.lineTo(ln.x2, ln.y2);
        ctx.strokeStyle = `rgba(${[220, 80, 255][i]},${[80, 220, 80][i]},${[80, 255, 80][i]},0.72)`;
        ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.stroke();
      });
      break;
    }
    case "hologram": {
      // Holographic scan lines across face
      const scanSpeed = (t * 0.8) % (fh * 1.2);
      for (let sl = 0; sl < 8; sl++) {
        const sy = eyeY - fh * 0.4 + sl * fh * 0.14 + (scanSpeed * 0.1);
        ctx.beginPath(); ctx.moveTo(cx - fw * 0.5, sy); ctx.lineTo(cx + fw * 0.5, sy);
        ctx.strokeStyle = `rgba(0,${200 + sl * 8},${255 - sl * 10},${0.12 + Math.sin(sl + t * 0.01) * 0.06})`;
        ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.strokeStyle = `rgba(80,255,220,${0.35 + Math.sin(t * 0.008) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - fw * 0.44, eyeY - fh * 0.42, fw * 0.88, fh * 0.84);
      [eyeLX, eyeRX].forEach(ex => {
        ctx.beginPath(); ctx.arc(ex, eyeY, fw * 0.1, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,240,255,${0.5 + Math.sin(t * 0.01) * 0.2})`; ctx.lineWidth = 1.5; ctx.stroke();
      });
      break;
    }
    case "oilpaint": {
      // Painterly swirl strokes on face area
      for (let op = 0; op < 18; op++) {
        const ox = cx + Math.cos(op * 40 * Math.PI / 180) * fw * (0.1 + (op % 4) * 0.08);
        const oy = cy + Math.sin(op * 40 * Math.PI / 180) * fh * (0.08 + (op % 3) * 0.1);
        ctx.beginPath();
        ctx.ellipse(ox, oy, fw * 0.06, fw * 0.018, op * 22 * Math.PI / 180, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(op * 19 + t * 0.02) % 360}, 60%, 60%, 0.22)`;
        ctx.fill();
      }
      break;
    }
    case "sketch": {
      // Comic-style sketch lines around face
      ctx.strokeStyle = "rgba(30,20,10,0.45)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.ellipse(cx, cy, fw * 0.52, fh * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      [eyeLX, eyeRX].forEach(ex => {
        ctx.beginPath(); ctx.ellipse(ex, eyeY, fw * 0.13, fh * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(cx, noseY, fw * 0.07, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "discoball": {
      // Reflected disco light dots dancing on face
      for (let db = 0; db < 24; db++) {
        const angle3 = (db / 24) * Math.PI * 2 + t * 0.015;
        const rx2 = cx + Math.cos(angle3) * fw * 0.35;
        const ry2 = cy + Math.sin(angle3) * fh * 0.3;
        ctx.beginPath(); ctx.arc(rx2, ry2, fw * 0.018, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(db * 15 + t * 0.1) % 360}, 100%, 70%, 0.65)`; ctx.fill();
      }
      break;
    }
    case "neonglow": {
      // Neon outline around face + eyes
      const neonC = `hsla(${(t * 0.05) % 360}, 100%, 65%, 0.7)`;
      ctx.shadowColor = neonC; ctx.shadowBlur = 18;
      ctx.strokeStyle = neonC; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(cx, cy, fw * 0.5, fh * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
      [eyeLX, eyeRX].forEach(ex => {
        ctx.beginPath(); ctx.ellipse(ex, eyeY, fw * 0.12, fh * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.shadowBlur = 0;
      break;
    }
    case "icequeen": {
      // Ice/frost crystals scattered on face & hair area
      for (let ic = 0; ic < 14; ic++) {
        const ix = cx + (ic % 5 - 2) * fw * 0.2 + Math.sin(ic) * fw * 0.06;
        const iy = eyeY - fh * 0.5 + ic * fh * 0.08;
        const arms = 6;
        for (let ia = 0; ia < arms; ia++) {
          const ang = (ia / arms) * Math.PI * 2 + t * 0.002;
          ctx.beginPath();
          ctx.moveTo(ix, iy);
          ctx.lineTo(ix + Math.cos(ang) * fw * 0.038, iy + Math.sin(ang) * fw * 0.038);
          ctx.strokeStyle = `rgba(180,235,255,${0.55 + Math.sin(ic * 0.8) * 0.2})`;
          ctx.lineWidth = 1.5; ctx.stroke();
        }
      }
      break;
    }
    case "firecrown": {
      // Flaming fire crown above head
      const fireBase2 = eyeY - fh * 0.38;
      for (let fc = 0; fc < 7; fc++) {
        const fx = cx - fw * 0.3 + fc * fw * 0.1;
        const fh2 = fh * (0.3 + Math.sin(t * 0.018 + fc * 0.8) * 0.12);
        ctx.beginPath();
        ctx.moveTo(fx - fw * 0.04, fireBase2);
        ctx.quadraticCurveTo(fx, fireBase2 - fh2, fx + fw * 0.04, fireBase2);
        const fg = ctx.createLinearGradient(fx, fireBase2, fx, fireBase2 - fh2);
        fg.addColorStop(0, "rgba(255,60,0,0.85)");
        fg.addColorStop(0.5, "rgba(255,160,0,0.65)");
        fg.addColorStop(1, "rgba(255,240,80,0.0)");
        ctx.fillStyle = fg; ctx.fill();
      }
      break;
    }
    case "bubblewrap": {
      // Shiny bubbles floating across face
      for (let bw = 0; bw < 16; bw++) {
        const bx = cx + (bw % 5 - 2) * fw * 0.18 + Math.sin(bw * 1.3 + t * 0.01) * fw * 0.04;
        const by = eyeY - fh * 0.35 + Math.floor(bw / 5) * fh * 0.28 + Math.cos(bw + t * 0.008) * fh * 0.04;
        const br = fw * 0.045;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
        const bg = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 0, bx, by, br);
        bg.addColorStop(0, "rgba(255,255,255,0.7)");
        bg.addColorStop(0.4, "rgba(180,230,255,0.3)");
        bg.addColorStop(1, "rgba(100,180,255,0.12)");
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = "rgba(160,210,255,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      }
      break;
    }
    case "kaleidoscope": {
      // Mirrored geometric patterns around face center
      const segs = 8;
      for (let ks = 0; ks < segs; ks++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((ks / segs) * Math.PI * 2 + t * 0.004);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(fw * 0.28, fh * 0.08);
        ctx.lineTo(fw * 0.22, fh * 0.22);
        ctx.closePath();
        ctx.fillStyle = `hsla(${(ks * 45 + t * 0.04) % 360}, 80%, 65%, 0.22)`;
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "comicpop": {
      // Comic halftone dots + BOOM text
      for (let cp = 0; cp < 30; cp++) {
        const cpx = cx - fw * 0.48 + (cp % 6) * fw * 0.17;
        const cpy = eyeY - fh * 0.38 + Math.floor(cp / 6) * fh * 0.16;
        ctx.beginPath(); ctx.arc(cpx, cpy, fw * 0.025, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fill();
      }
      ctx.font = `bold ${Math.round(fw * 0.22)}px Impact, sans-serif`;
      ctx.fillStyle = "rgba(255,60,0,0.88)";
      ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 4;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.strokeText("POW!", cx, eyeY - fh * 0.4);
      ctx.fillText("POW!", cx, eyeY - fh * 0.4);
      break;
    }
    case "lashbar": {
      // Bold dramatic lashes on both eyes
      [eyeLX, eyeRX].forEach((ex, side) => {
        const lashCount = 9;
        for (let l = 0; l < lashCount; l++) {
          const lx = ex + (l - 4) * fw * 0.022;
          const angle4 = (side === 0 ? -1 : 1) * (0.3 + (Math.abs(l - 4) / 4) * 0.5);
          ctx.beginPath();
          ctx.moveTo(lx, eyeY - fh * 0.055);
          ctx.lineTo(lx + Math.sin(angle4) * fw * 0.04, eyeY - fh * 0.055 - fh * 0.07);
          ctx.strokeStyle = "rgba(10,10,10,0.88)"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(ex, eyeY - fh * 0.035, fw * 0.12, fh * 0.022, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(10,10,10,0.7)"; ctx.fill();
      });
      break;
    }
    case "goldenhour": {
      // Warm golden glow aura + sun flares
      const ghG = ctx.createRadialGradient(cx, eyeY - fh * 0.1, 0, cx, eyeY - fh * 0.1, fw * 0.7);
      ghG.addColorStop(0, "rgba(255,220,80,0.0)");
      ghG.addColorStop(0.5, "rgba(255,160,40,0.22)");
      ghG.addColorStop(1, "rgba(255,100,20,0.0)");
      ctx.beginPath(); ctx.ellipse(cx, eyeY - fh * 0.1, fw * 0.7, fh * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = ghG; ctx.fill();
      // Lens flare streaks
      for (let gf = 0; gf < 6; gf++) {
        const gfA = (gf / 6) * Math.PI * 2 + t * 0.003;
        ctx.beginPath();
        ctx.moveTo(cx + fw * 0.08, eyeY - fh * 0.28);
        ctx.lineTo(cx + Math.cos(gfA) * fw * (0.3 + gf * 0.05), eyeY - fh * 0.28 + Math.sin(gfA) * fh * 0.25);
        ctx.strokeStyle = `rgba(255,${200 - gf * 10},40,0.18)`;
        ctx.lineWidth = 2 + gf * 0.4; ctx.stroke();
      }
      break;
    }
    case "cybermask": {
      ctx.strokeStyle = "rgba(0,255,220,0.8)"; ctx.lineWidth = 3;
      ctx.strokeRect(cx - fw * 0.45, eyeY - fh * 0.2, fw * 0.9, fh * 0.48);
      [eyeLX, eyeRX].forEach(ex => {
        ctx.beginPath(); ctx.ellipse(ex, eyeY, fw * 0.12, fh * 0.07, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,255,240,${0.5 + Math.sin(t * 0.01) * 0.3})`;
        ctx.lineWidth = 2; ctx.stroke();
      });
      break;
    }
    case "angelhalo": {
      const hy = eyeY - fh * 0.58;
      ctx.beginPath();
      ctx.ellipse(cx, hy, fw * 0.28, fh * 0.06, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,230,130,${0.7 + Math.sin(t * 0.01) * 0.2})`;
      ctx.lineWidth = 5; ctx.stroke();
      break;
    }
    case "devilhorns": {
      [{ x: cx - fw * 0.18, d: -1 }, { x: cx + fw * 0.18, d: 1 }].forEach(h => {
        ctx.beginPath();
        ctx.moveTo(h.x, eyeY - fh * 0.3);
        ctx.lineTo(h.x + h.d * fw * 0.08, eyeY - fh * 0.55);
        ctx.lineTo(h.x + h.d * fw * 0.15, eyeY - fh * 0.26);
        ctx.closePath();
        ctx.fillStyle = "rgba(200,30,40,0.85)"; ctx.fill();
      });
      break;
    }
    case "snowglobe": {
      for (let s = 0; s < 28; s++) {
        const x = cx - fw * 0.48 + ((s * 37 + t * 0.06) % (fw * 0.96));
        const y = eyeY - fh * 0.5 + ((s * 61 + t * 0.08) % (fh * 1.3));
        ctx.beginPath(); ctx.arc(x, y, fw * 0.012, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(235,245,255,0.75)"; ctx.fill();
      }
      break;
    }
    case "glittertears": {
      [eyeLX, eyeRX].forEach(ex => {
        for (let g = 0; g < 8; g++) {
          ctx.beginPath();
          ctx.arc(ex + (Math.random() - 0.5) * fw * 0.07, eyeY + fh * (0.08 + g * 0.045), fw * 0.012, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(g * 35 + t * 0.05) % 360}, 90%, 72%, 0.72)`;
          ctx.fill();
        }
      });
      break;
    }
    case "pearlveil": {
      for (let p = 0; p < 18; p++) {
        const x = cx - fw * 0.45 + (p % 6) * fw * 0.18;
        const y = eyeY - fh * 0.45 + Math.floor(p / 6) * fh * 0.26;
        ctx.beginPath(); ctx.arc(x, y, fw * 0.03, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();
        ctx.strokeStyle = "rgba(220,230,255,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      }
      break;
    }
    case "clownpop": {
      ctx.beginPath(); ctx.arc(cx - fw * 0.2, eyeY + fh * 0.16, fw * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,60,60,0.45)"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + fw * 0.2, eyeY + fh * 0.16, fw * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath(); ctx.arc(cx, noseY, fw * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,0,0,0.85)"; ctx.fill();
      break;
    }
    case "pirate": {
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(eyeLX - fw * 0.14, eyeY - fh * 0.08, fw * 0.22, fh * 0.15);
      ctx.beginPath(); ctx.moveTo(eyeLX + fw * 0.08, eyeY); ctx.lineTo(eyeRX - fw * 0.18, eyeY + fh * 0.02);
      ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4; ctx.stroke();
      break;
    }
    case "astronaut": {
      ctx.beginPath();
      ctx.ellipse(cx, cy, fw * 0.58, fh * 0.72, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(220,230,240,0.8)"; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = "rgba(180,220,255,0.12)"; ctx.fill();
      break;
    }
    case "galaxyface": {
      ctx.beginPath(); ctx.ellipse(cx, cy, fw * 0.54, fh * 0.64, 0, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, fw * 0.56);
      g.addColorStop(0, "rgba(140,60,255,0.35)"); g.addColorStop(0.5, "rgba(40,30,120,0.28)"); g.addColorStop(1, "rgba(0,0,20,0.0)");
      ctx.fillStyle = g; ctx.fill();
      for (let st = 0; st < 16; st++) {
        ctx.beginPath(); ctx.arc(cx - fw * 0.4 + (st * fw * 0.05), eyeY - fh * 0.4 + ((st * 19) % (fh * 0.8)), fw * 0.008, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill();
      }
      break;
    }
    case "comiclines": {
      for (let c = 0; c < 10; c++) {
        const a = (c / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * fw * 0.25, cy + Math.sin(a) * fh * 0.25);
        ctx.lineTo(cx + Math.cos(a) * fw * 0.7, cy + Math.sin(a) * fh * 0.75);
        ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 2; ctx.stroke();
      }
      break;
    }
    case "butterflykiss": {
      [eyeLX, eyeRX].forEach(ex => {
        ctx.beginPath(); ctx.ellipse(ex - fw * 0.06, eyeY - fh * 0.02, fw * 0.06, fh * 0.03, -0.7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,120,190,0.5)"; ctx.fill();
        ctx.beginPath(); ctx.ellipse(ex + fw * 0.06, eyeY - fh * 0.02, fw * 0.06, fh * 0.03, 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case "rosecrown": {
      for (let r = 0; r < 7; r++) {
        const x = cx - fw * 0.32 + r * fw * 0.11;
        const y = eyeY - fh * 0.44 + Math.sin(r) * fh * 0.03;
        ctx.beginPath(); ctx.arc(x, y, fw * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(230,30,80,0.72)"; ctx.fill();
      }
      break;
    }
    case "sunbeam": {
      for (let r = 0; r < 12; r++) {
        const a = (r / 12) * Math.PI * 2 + t * 0.003;
        ctx.beginPath();
        ctx.moveTo(cx, eyeY - fh * 0.2);
        ctx.lineTo(cx + Math.cos(a) * fw * 0.75, eyeY - fh * 0.2 + Math.sin(a) * fh * 0.75);
        ctx.strokeStyle = "rgba(255,220,90,0.14)"; ctx.lineWidth = 3; ctx.stroke();
      }
      break;
    }
    case "lasereyes": {
      [eyeLX, eyeRX].forEach(ex => {
        ctx.beginPath();
        ctx.moveTo(ex, eyeY);
        ctx.lineTo(ex + fw * 0.8, eyeY - fh * 0.1 + Math.sin(t * 0.01) * fh * 0.06);
        ctx.strokeStyle = "rgba(255,0,0,0.68)"; ctx.lineWidth = 4; ctx.stroke();
      });
      break;
    }
    case "heartspark": {
      for (let h = 0; h < 10; h++) {
        const hx = cx - fw * 0.42 + (h * fw * 0.09);
        const hy = eyeY - fh * 0.5 + ((h * 37 + t * 0.04) % (fh * 1.2));
        drawHeart(ctx, hx, hy, fw * 0.04, "rgba(255,80,140,0.55)");
      }
      break;
    }
    case "venom": {
      ctx.strokeStyle = "rgba(20,20,20,0.85)"; ctx.lineWidth = 4;
      for (let v = 0; v < 6; v++) {
        const startX = cx - fw * 0.5 + v * fw * 0.2;
        ctx.beginPath();
        ctx.moveTo(startX, eyeY - fh * 0.35);
        ctx.quadraticCurveTo(startX + fw * 0.05, cy, startX - fw * 0.03, eyeY + fh * 0.45);
        ctx.stroke();
      }
      break;
    }
    case "royalmakeup": {
      ctx.beginPath();
      ctx.ellipse(cx, mouthY, fw * 0.2, fh * 0.06, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(190,20,70,0.62)"; ctx.fill();
      [eyeLX, eyeRX].forEach(ex => {
        ctx.beginPath(); ctx.ellipse(ex, eyeY, fw * 0.14, fh * 0.06, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(120,20,90,0.36)"; ctx.fill();
      });
      ctx.beginPath();
      ctx.ellipse(cx, eyeY - fh * 0.3, fw * 0.05, fh * 0.03, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,220,100,0.75)"; ctx.fill();
      break;
    }
    case "cupid": {
      drawHeart(ctx, cx, eyeY - fh * 0.5, fw * 0.08, "rgba(255,80,140,0.8)");
      ctx.beginPath();
      ctx.moveTo(cx - fw * 0.35, eyeY - fh * 0.45);
      ctx.lineTo(cx + fw * 0.35, eyeY - fh * 0.58);
      ctx.strokeStyle = "rgba(255,220,120,0.7)"; ctx.lineWidth = 3; ctx.stroke();
      break;
    }
    case "phoenix": {
      for (let p = 0; p < 12; p++) {
        const a = (p / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, eyeY - fh * 0.2);
        ctx.lineTo(cx + Math.cos(a) * fw * 0.55, eyeY - fh * 0.2 + Math.sin(a) * fh * 0.45);
        ctx.strokeStyle = `rgba(255,${120 + p * 8},20,0.35)`; ctx.lineWidth = 4; ctx.stroke();
      }
      break;
    }
    case "cybercrown": {
      for (let i = 0; i < 7; i++) {
        const x = cx - fw * 0.3 + i * fw * 0.1;
        const y = eyeY - fh * 0.42;
        ctx.strokeStyle = "rgba(0,255,220,0.8)"; ctx.lineWidth = 2;
        ctx.strokeRect(x - fw * 0.03, y - fh * 0.06, fw * 0.06, fh * 0.12);
      }
      break;
    }
    case "glitchface": {
      for (let g = 0; g < 10; g++) {
        const y = eyeY - fh * 0.35 + g * fh * 0.09;
        const off = Math.sin(t * 0.02 + g) * fw * 0.08;
        ctx.beginPath();
        ctx.moveTo(cx - fw * 0.45 + off, y);
        ctx.lineTo(cx + fw * 0.45 - off, y);
        ctx.strokeStyle = `rgba(${g % 2 ? 255 : 80},${g % 2 ? 80 : 255},255,0.35)`;
        ctx.lineWidth = 2; ctx.stroke();
      }
      break;
    }
    case "moonpriestess": {
      ctx.beginPath();
      ctx.arc(cx, eyeY - fh * 0.5, fw * 0.13, Math.PI * 0.2, Math.PI * 1.8);
      ctx.strokeStyle = "rgba(230,230,255,0.8)"; ctx.lineWidth = 5; ctx.stroke();
      break;
    }
    case "stormqueen": {
      for (let l = 0; l < 3; l++) {
        const x = cx - fw * 0.25 + l * fw * 0.25;
        ctx.beginPath();
        ctx.moveTo(x, eyeY - fh * 0.48);
        ctx.lineTo(x - fw * 0.05, eyeY - fh * 0.2);
        ctx.lineTo(x + fw * 0.03, eyeY - fh * 0.2);
        ctx.lineTo(x - fw * 0.06, eyeY + fh * 0.05);
        ctx.strokeStyle = "rgba(170,210,255,0.85)"; ctx.lineWidth = 3; ctx.stroke();
      }
      break;
    }
    case "jellypop": {
      ctx.beginPath();
      ctx.ellipse(cx, cy, fw * 0.52, fh * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,120,200,0.18)"; ctx.fill();
      break;
    }
    case "rosetears": {
      [eyeLX, eyeRX].forEach(ex => {
        for (let i = 0; i < 6; i++) {
          drawHeart(ctx, ex + (Math.random() - 0.5) * fw * 0.04, eyeY + fh * (0.08 + i * 0.06), fw * 0.018, "rgba(220,40,90,0.6)");
        }
      });
      break;
    }
    case "metallic": {
      const mg = ctx.createLinearGradient(cx - fw * 0.5, cy, cx + fw * 0.5, cy);
      mg.addColorStop(0, "rgba(180,180,190,0.24)");
      mg.addColorStop(0.5, "rgba(240,240,250,0.32)");
      mg.addColorStop(1, "rgba(120,120,130,0.24)");
      ctx.beginPath();
      ctx.ellipse(cx, cy, fw * 0.54, fh * 0.64, 0, 0, Math.PI * 2);
      ctx.fillStyle = mg; ctx.fill();
      break;
    }
    case "hyperbloom": {
      for (let i = 0; i < 9; i++) {
        const x = cx - fw * 0.35 + i * fw * 0.09;
        drawHeart(ctx, x, eyeY - fh * 0.45 + Math.sin(i) * fh * 0.04, fw * 0.03, "rgba(255,100,180,0.5)");
      }
      break;
    }
    case "cloudring": {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * fw * 0.35, eyeY - fh * 0.45 + Math.sin(a) * fh * 0.12, fw * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(240,245,255,0.5)"; ctx.fill();
      }
      break;
    }
    case "cheetah": {
      for (let i = 0; i < 26; i++) {
        const x = cx - fw * 0.45 + (Math.random() * fw * 0.9);
        const y = eyeY - fh * 0.3 + (Math.random() * fh * 0.9);
        ctx.beginPath(); ctx.ellipse(x, y, fw * 0.025, fw * 0.016, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(35,20,10,0.52)"; ctx.fill();
      }
      break;
    }
    case "demonwings": {
      ctx.beginPath();
      ctx.ellipse(cx - fw * 0.55, eyeY - fh * 0.25, fw * 0.22, fh * 0.35, -0.5, 0, Math.PI * 2);
      ctx.ellipse(cx + fw * 0.55, eyeY - fh * 0.25, fw * 0.22, fh * 0.35, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(40,0,40,0.4)"; ctx.fill();
      break;
    }
    case "stardust": {
      for (let i = 0; i < 34; i++) {
        const x = cx - fw * 0.48 + ((i * 29 + t * 0.08) % (fw * 0.96));
        const y = eyeY - fh * 0.55 + ((i * 47 + t * 0.06) % (fh * 1.4));
        ctx.beginPath(); ctx.arc(x, y, fw * 0.01, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,220,0.7)"; ctx.fill();
      }
      break;
    }
    case "frostbite": {
      ctx.beginPath();
      ctx.ellipse(cx, cy, fw * 0.55, fh * 0.66, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(160,220,255,0.16)"; ctx.fill();
      ctx.strokeStyle = "rgba(220,245,255,0.5)"; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

const DEFAULT_CAMERA_FACING_MODE = "user" as const;

function LiveBroadcast({
  onClose,
  onPublishClip,
}: {
  onClose: () => void;
  onPublishClip: (payload: NewPostPayload) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(undefined);
  const [isLive, setIsLive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(DEFAULT_CAMERA_FACING_MODE);
  const [elapsed, setElapsed] = useState(0);
  const [viewers] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [comments, setComments] = useState<{ id: number; user: string; text: string }[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [activeFilter, setActiveFilter] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filterTab, setFilterTab] = useState<"ar" | "ai">("ar");
  const [filterGroup, setFilterGroup] = useState<FilterGroup>("all");
  const [activeSticker, setActiveSticker] = useState(0);
  const [arCategory, setArCategory] = useState<ARCategory>("All");
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isPublishingClip, setIsPublishingClip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const recordTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeAnimRef = useRef<number>(undefined);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResultOverlay, setAiResultOverlay] = useState<string | null>(null);
  const [aiSelectedMode, setAiSelectedMode] = useState<string | null>(null);
  const [aiOverlayMode, setAiOverlayMode] = useState<"fullscreen" | "card">("card");
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const COLOR_FILTERS = [
    { name: "Original", css: "none", emoji: "✨" },
    { name: "Warm", css: "sepia(0.3) saturate(1.4) brightness(1.05)", emoji: "🌅" },
    { name: "Cool", css: "saturate(0.8) hue-rotate(20deg) brightness(1.05)", emoji: "❄️" },
    { name: "B&W", css: "grayscale(1) contrast(1.1)", emoji: "🖤" },
    { name: "Vintage", css: "sepia(0.5) contrast(0.9) brightness(1.1)", emoji: "📷" },
    { name: "Vivid", css: "saturate(2) contrast(1.15)", emoji: "🎨" },
    { name: "Fade", css: "saturate(0.5) brightness(1.2) contrast(0.8)", emoji: "🌫️" },
    { name: "Drama", css: "contrast(1.5) brightness(0.85) saturate(1.3)", emoji: "🎭" },
    { name: "Glow", css: "brightness(1.25) saturate(1.4)", emoji: "💫" },
    { name: "Noir", css: "grayscale(0.8) contrast(1.4) brightness(0.85)", emoji: "🕶️" },
    { name: "Sunset", css: "sepia(0.2) saturate(1.6) hue-rotate(-10deg) brightness(1.05)", emoji: "🌇" },
    { name: "Ocean", css: "saturate(0.9) hue-rotate(30deg) brightness(1.1)", emoji: "🌊" },
    { name: "Rose", css: "saturate(1.3) hue-rotate(-15deg) brightness(1.1)", emoji: "🌹" },
    { name: "Neon", css: "saturate(2.5) contrast(1.2) brightness(1.1)", emoji: "💜" },
    { name: "Film", css: "sepia(0.15) contrast(1.1) saturate(0.9) brightness(0.95)", emoji: "🎬" },
    { name: "Pop", css: "saturate(1.8) brightness(1.1) contrast(1.05)", emoji: "🍭" },
    { name: "Dreamy", css: "brightness(1.15) saturate(0.7) contrast(0.85)", emoji: "☁️" },
    { name: "Chrome", css: "saturate(0.4) contrast(1.3) brightness(1.05)", emoji: "⚡" },
    { name: "Ember", css: "sepia(0.4) saturate(1.8) hue-rotate(-20deg) brightness(0.95)", emoji: "🔥" },
    { name: "Arctic", css: "saturate(0.6) hue-rotate(40deg) brightness(1.15) contrast(0.9)", emoji: "🧊" },
    { name: "Cyberpunk", css: "saturate(2.2) hue-rotate(-30deg) contrast(1.3) brightness(0.9)", emoji: "🤖" },
    { name: "Pastel", css: "saturate(0.6) brightness(1.25) contrast(0.75)", emoji: "🎀" },
    { name: "Moody", css: "contrast(1.3) brightness(0.75) saturate(1.1) sepia(0.1)", emoji: "🌑" },
    { name: "Golden", css: "sepia(0.4) saturate(1.3) brightness(1.15) hue-rotate(-5deg)", emoji: "👑" },
    { name: "X-Ray", css: "invert(1) hue-rotate(180deg) contrast(1.2)", emoji: "💀" },
    { name: "Thermal", css: "hue-rotate(90deg) saturate(2) contrast(1.3) brightness(0.9)", emoji: "🌡️" },
    { name: "Toxic", css: "hue-rotate(100deg) saturate(2.5) contrast(1.2) brightness(0.9)", emoji: "☢️" },
    { name: "Polaroid", css: "sepia(0.3) saturate(1.1) contrast(0.95) brightness(1.15)", emoji: "🖼️" },
    { name: "Velvet", css: "brightness(0.94) contrast(1.22) saturate(1.08) sepia(0.08)", emoji: "🧵" },
    { name: "Candy Pop", css: "saturate(2) brightness(1.14) contrast(0.88) hue-rotate(-12deg)", emoji: "🍬" },
    { name: "Blue Mist", css: "saturate(0.72) hue-rotate(34deg) brightness(1.16) contrast(0.88)", emoji: "🌫️" },
    { name: "Amber", css: "sepia(0.44) brightness(1.08) saturate(1.26) hue-rotate(-6deg)", emoji: "🟠" },
    { name: "Night Vision", css: "grayscale(0.2) hue-rotate(60deg) saturate(2.3) brightness(0.95)", emoji: "🟢" },
    { name: "Infra", css: "hue-rotate(132deg) saturate(2.4) contrast(1.35) brightness(0.86)", emoji: "📡" },
    { name: "Clean Pro", css: "brightness(1.07) contrast(1.08) saturate(1.05)", emoji: "🧼" },
    { name: "Street", css: "contrast(1.26) brightness(0.88) saturate(1.32)", emoji: "🚦" },
    { name: "Retro VHS", css: "sepia(0.24) contrast(0.92) saturate(1.08) brightness(1.12)", emoji: "📼" },
    { name: "Crimson", css: "hue-rotate(-18deg) saturate(1.55) contrast(1.08) brightness(0.98)", emoji: "🟥" },
    { name: "Emerald", css: "hue-rotate(54deg) saturate(1.7) contrast(1.05) brightness(0.97)", emoji: "💚" },
    { name: "Sapphire", css: "hue-rotate(24deg) saturate(1.45) brightness(1.03) contrast(1.02)", emoji: "💙" },
    { name: "Dusty", css: "saturate(0.58) contrast(0.9) brightness(1.14)", emoji: "🪨" },
    { name: "Punchy", css: "saturate(2.2) contrast(1.24) brightness(1.03)", emoji: "🥊" },
    { name: "Sepia Pro", css: "sepia(0.46) saturate(1.2) brightness(1.08) contrast(0.91)", emoji: "🟤" },
    { name: "Aster", css: "hue-rotate(-36deg) saturate(1.62) brightness(1.06) contrast(0.94)", emoji: "🪻" },
    { name: "Lunar", css: "grayscale(0.62) contrast(1.32) brightness(0.9)", emoji: "🌙" },
    { name: "Matrix", css: "hue-rotate(76deg) saturate(2.6) brightness(0.92) contrast(1.3)", emoji: "🧬" },
    { name: "Glam Light", css: "brightness(1.2) contrast(0.96) saturate(1.18)", emoji: "💡" },
    { name: "Clay", css: "sepia(0.18) saturate(0.88) brightness(1.03) contrast(0.98)", emoji: "🏺" },
    { name: "Bloom Pro", css: "brightness(1.24) contrast(0.9) saturate(1.16)", emoji: "🌼" },
    { name: "Ruby", css: "hue-rotate(-24deg) saturate(1.65) contrast(1.1) brightness(0.98)", emoji: "♦️" },
    { name: "Jade", css: "hue-rotate(62deg) saturate(1.86) contrast(1.08) brightness(0.95)", emoji: "🍃" },
    { name: "Indigo", css: "hue-rotate(18deg) saturate(1.5) contrast(1.08) brightness(0.96)", emoji: "🔵" },
    { name: "Old Cam", css: "sepia(0.32) contrast(0.88) brightness(1.12) saturate(0.92)", emoji: "📹" },
    { name: "Urban", css: "contrast(1.34) brightness(0.86) saturate(1.24)", emoji: "🏙️" },
    { name: "Mango", css: "sepia(0.22) hue-rotate(-8deg) saturate(1.32) brightness(1.08)", emoji: "🥭" },
    { name: "Mint Ice", css: "hue-rotate(42deg) saturate(1.14) brightness(1.14) contrast(0.94)", emoji: "🧊" },
    { name: "Mono Soft", css: "grayscale(0.92) contrast(1.16) brightness(1.02)", emoji: "⬜" },
    { name: "Halation", css: "brightness(1.3) contrast(0.82) saturate(1.05)", emoji: "🌟" },
    { name: "Night City", css: "brightness(0.82) contrast(1.44) saturate(1.32) hue-rotate(-8deg)", emoji: "🌃" },
    { name: "TV", css: "contrast(1.22) saturate(1.08) brightness(0.94) sepia(0.08)", emoji: "📺" },
    { name: "Pearl Light", css: "brightness(1.26) contrast(0.9) saturate(1.08)", emoji: "🫧" },
    { name: "Scarlet", css: "hue-rotate(-26deg) saturate(1.72) contrast(1.12) brightness(0.97)", emoji: "🔺" },
    { name: "Lagoon", css: "hue-rotate(38deg) saturate(1.34) contrast(1.04) brightness(1.04)", emoji: "🏝️" },
    { name: "Steel", css: "grayscale(0.55) contrast(1.26) brightness(0.9)", emoji: "⚙️" },
    { name: "Citrus", css: "sepia(0.18) hue-rotate(8deg) saturate(1.44) brightness(1.1)", emoji: "🍋" },
    { name: "Berry", css: "hue-rotate(-14deg) saturate(1.5) brightness(1.04) contrast(1.02)", emoji: "🫐" },
    { name: "Cloud Fade", css: "saturate(0.7) brightness(1.2) contrast(0.84)", emoji: "☁️" },
    { name: "Obsidian", css: "contrast(1.5) brightness(0.78) saturate(1.14)", emoji: "🪨" },
    { name: "Sunbeam", css: "brightness(1.3) contrast(0.88) sepia(0.14) saturate(1.16)", emoji: "🌞" },
    { name: "Mint Pop", css: "hue-rotate(50deg) saturate(1.28) brightness(1.12) contrast(0.95)", emoji: "🍃" },
    { name: "Tape", css: "sepia(0.3) contrast(0.9) brightness(1.13) saturate(0.9)", emoji: "📻" },
    { name: "After Dark", css: "brightness(0.74) contrast(1.5) saturate(1.35) hue-rotate(-4deg)", emoji: "🌌" },
    { name: "Clean Glass", css: "brightness(1.12) contrast(1.08) saturate(1.03)", emoji: "🪟" },
    { name: "Rose Film", css: "hue-rotate(-12deg) sepia(0.14) saturate(1.24) brightness(1.08)", emoji: "🌹" },
    { name: "Arctic Blue", css: "hue-rotate(30deg) saturate(1.2) brightness(1.12) contrast(0.96)", emoji: "❄️" },
    { name: "Coal", css: "grayscale(0.7) contrast(1.38) brightness(0.82)", emoji: "🪨" },
    { name: "Summer Pop", css: "sepia(0.12) saturate(1.4) brightness(1.16) contrast(0.92)", emoji: "🏖️" },
    { name: "Hyper", css: "saturate(2.4) contrast(1.28) brightness(1.02)", emoji: "🚀" },
    { name: "Candy Heat", css: "hue-rotate(-14deg) saturate(1.82) brightness(1.1) contrast(0.92)", emoji: "🍭" },
    { name: "Aqua Film", css: "hue-rotate(34deg) saturate(1.22) brightness(1.08) contrast(0.96)", emoji: "🧃" },
    { name: "Cine Noir", css: "grayscale(0.94) contrast(1.42) brightness(0.82)", emoji: "🎥" },
    { name: "Rose Dust", css: "hue-rotate(-9deg) saturate(1.18) brightness(1.14) contrast(0.9)", emoji: "🌷" },
    { name: "Oceanic", css: "hue-rotate(28deg) saturate(1.34) brightness(1.05) contrast(1.02)", emoji: "🌊" },
    { name: "Electric", css: "hue-rotate(84deg) saturate(2.2) contrast(1.24) brightness(0.96)", emoji: "⚡" },
    { name: "Holographic", css: "hue-rotate(120deg) saturate(2.8) contrast(1.1) brightness(1.08)", emoji: "🌈" },
    { name: "Washed", css: "saturate(0.3) brightness(1.35) contrast(0.78)", emoji: "🫧" },
    { name: "Lush", css: "saturate(1.9) brightness(1.06) contrast(1.08) hue-rotate(12deg)", emoji: "🌿" },
    { name: "Blaze", css: "hue-rotate(-22deg) saturate(2.1) contrast(1.26) brightness(0.94)", emoji: "🔥" },
    { name: "Frost Pro", css: "hue-rotate(36deg) saturate(1.1) brightness(1.18) contrast(0.92)", emoji: "❄️" },
    { name: "Teal Sea", css: "hue-rotate(46deg) saturate(1.4) brightness(1.06) contrast(1.04)", emoji: "🌊" },
    { name: "Peach Fuzz", css: "sepia(0.18) hue-rotate(-6deg) saturate(1.28) brightness(1.12)", emoji: "🍑" },
    { name: "Ultra Noir", css: "grayscale(1) contrast(1.6) brightness(0.78)", emoji: "🕶️" },
    { name: "Lilac", css: "hue-rotate(-200deg) saturate(1.4) brightness(1.12) contrast(0.94)", emoji: "💜" },
    { name: "Wildfire", css: "hue-rotate(-28deg) saturate(2.4) contrast(1.3) brightness(0.9)", emoji: "🌋" },
    { name: "Mermaid", css: "hue-rotate(44deg) saturate(1.6) brightness(1.06) contrast(1.02)", emoji: "🧜" },
    { name: "Caramel", css: "sepia(0.3) saturate(1.2) brightness(1.06) hue-rotate(-4deg)", emoji: "🍮" },
    { name: "Electric Blue", css: "hue-rotate(16deg) saturate(2.4) contrast(1.22) brightness(0.92)", emoji: "🔵" },
    { name: "Sunset Strip", css: "hue-rotate(-8deg) sepia(0.2) saturate(1.7) brightness(1.04)", emoji: "🌆" },
    { name: "Plum", css: "hue-rotate(-178deg) saturate(1.3) brightness(0.96) contrast(1.1)", emoji: "🍇" },
    { name: "Overexpose", css: "brightness(1.55) contrast(0.7) saturate(0.8)", emoji: "💡" },
    { name: "Underexpose", css: "brightness(0.6) contrast(1.4) saturate(1.2)", emoji: "🌑" },
    { name: "Smoke Screen", css: "saturate(0.4) brightness(1.15) contrast(0.88) blur(0.4px)", emoji: "🌫️" },
    { name: "Inferno", css: "hue-rotate(-16deg) saturate(2.8) contrast(1.35) brightness(0.88)", emoji: "😤" },
    { name: "Pacific", css: "hue-rotate(26deg) saturate(1.5) brightness(1.08) contrast(0.98)", emoji: "🐋" },
    { name: "Soft Amber", css: "sepia(0.36) brightness(1.12) saturate(1.1) contrast(0.92)", emoji: "🧡" },
    { name: "Moss", css: "hue-rotate(58deg) saturate(1.2) brightness(0.94) contrast(1.06)", emoji: "🌱" },
    { name: "Dusty Rose", css: "hue-rotate(-18deg) saturate(1.1) brightness(1.12) contrast(0.9) sepia(0.1)", emoji: "🌸" },
    { name: "Glacier", css: "hue-rotate(32deg) saturate(0.9) brightness(1.22) contrast(0.9)", emoji: "🧊" },
    { name: "Neon Pink", css: "hue-rotate(-40deg) saturate(2.8) contrast(1.3) brightness(1.05)", emoji: "🩷" },
    { name: "Acid Green", css: "hue-rotate(58deg) saturate(3.0) contrast(1.35) brightness(0.95)", emoji: "🟢" },
    { name: "Retro TV", css: "saturate(0) contrast(1.6) brightness(1.1) sepia(0.05)", emoji: "📺" },
    { name: "Coral Reef", css: "hue-rotate(-22deg) saturate(1.8) brightness(1.1) contrast(1.04)", emoji: "🪸" },
    { name: "Digital Cyan", css: "hue-rotate(22deg) saturate(2.2) contrast(1.18) brightness(0.97)", emoji: "🔵" },
    { name: "Rose Film", css: "sepia(0.22) hue-rotate(-14deg) saturate(1.4) brightness(1.1) contrast(0.92)", emoji: "🌹" },
    { name: "Night Mode", css: "brightness(0.55) contrast(1.5) saturate(0.7) hue-rotate(4deg)", emoji: "🌙" },
    { name: "Sunshine", css: "sepia(0.18) saturate(1.8) brightness(1.22) contrast(1.0) hue-rotate(-6deg)", emoji: "☀️" },
    { name: "Pop Art", css: "saturate(3.5) contrast(1.6) brightness(1.05) hue-rotate(0deg)", emoji: "🎨" },
    { name: "Forest", css: "hue-rotate(54deg) saturate(1.4) brightness(0.88) contrast(1.1)", emoji: "🌲" },
    { name: "Ruby", css: "hue-rotate(-10deg) saturate(2.2) contrast(1.25) brightness(0.95) sepia(0.1)", emoji: "❤️" },
    { name: "Lavender Haze", css: "hue-rotate(-180deg) saturate(1.35) brightness(1.15) contrast(0.88)", emoji: "💜" },
    { name: "Neon Orange", css: "hue-rotate(-28deg) saturate(3.2) contrast(1.38) brightness(1.02)", emoji: "🟠" },
    { name: "Matrix", css: "hue-rotate(80deg) saturate(2.6) contrast(1.5) brightness(0.8) sepia(0.1)", emoji: "💚" },
    { name: "Faded Film", css: "sepia(0.45) saturate(0.85) brightness(1.18) contrast(0.82)", emoji: "🎞️" },
    { name: "Crimson", css: "hue-rotate(-6deg) saturate(2.0) contrast(1.28) brightness(0.9)", emoji: "🔴" },
    { name: "Arctic", css: "hue-rotate(18deg) saturate(0.7) brightness(1.35) contrast(0.86)", emoji: "❄️" },
    { name: "Velvet Night", css: "hue-rotate(-160deg) saturate(1.6) brightness(0.72) contrast(1.2)", emoji: "🌌" },
    { name: "Butter", css: "sepia(0.28) brightness(1.2) saturate(1.3) hue-rotate(-10deg) contrast(0.9)", emoji: "🧈" },
    { name: "Polaroid", css: "sepia(0.12) brightness(1.16) contrast(0.88) saturate(1.18)", emoji: "📷" },
    { name: "Terracotta", css: "sepia(0.38) hue-rotate(-12deg) saturate(1.5) brightness(1.0) contrast(1.06)", emoji: "🏺" },
    { name: "Grape", css: "hue-rotate(-195deg) saturate(1.7) brightness(0.9) contrast(1.15)", emoji: "🍇" },
    { name: "Mint", css: "hue-rotate(62deg) saturate(1.3) brightness(1.16) contrast(0.92)", emoji: "🌿" },
    { name: "Deep Sea", css: "hue-rotate(34deg) saturate(1.8) brightness(0.78) contrast(1.22)", emoji: "🌊" },
    { name: "Pearl", css: "saturate(0.6) brightness(1.38) contrast(0.82) sepia(0.06)", emoji: "🤍" },
    { name: "Blaze Orange", css: "hue-rotate(-32deg) saturate(2.5) contrast(1.32) brightness(1.0)", emoji: "🔶" },
    { name: "Tundra", css: "saturate(0.55) brightness(1.25) contrast(0.9) hue-rotate(12deg)", emoji: "🌨️" },
    { name: "Amber", css: "sepia(0.5) saturate(1.6) brightness(1.08) hue-rotate(-8deg)", emoji: "🟡" },
    { name: "Cosmic", css: "hue-rotate(-145deg) saturate(2.0) brightness(0.82) contrast(1.28)", emoji: "🚀" },
    { name: "Gold Rush", css: "sepia(0.4) saturate(2.0) brightness(1.12) contrast(1.08) hue-rotate(-14deg)", emoji: "🏆" },
    { name: "Candy Pop", css: "hue-rotate(-18deg) saturate(2.6) brightness(1.16) contrast(1.1)", emoji: "🍬" },
    { name: "Sky Punch", css: "hue-rotate(18deg) saturate(2.1) brightness(1.08) contrast(1.18)", emoji: "🌤️" },
    { name: "Aqua Ice", css: "hue-rotate(34deg) saturate(1.3) brightness(1.3) contrast(0.9)", emoji: "🧊" },
    { name: "Dark Cherry", css: "hue-rotate(-8deg) saturate(1.9) brightness(0.82) contrast(1.24)", emoji: "🍒" },
    { name: "Sepia Dream", css: "sepia(0.55) saturate(1.2) brightness(1.14) contrast(0.88)", emoji: "🟤" },
    { name: "Ocean Pop", css: "hue-rotate(28deg) saturate(2.0) brightness(0.95) contrast(1.16)", emoji: "🐬" },
    { name: "Cyber Lime", css: "hue-rotate(72deg) saturate(3.1) brightness(0.9) contrast(1.34)", emoji: "🟩" },
    { name: "Candy Blue", css: "hue-rotate(12deg) saturate(2.2) brightness(1.1) contrast(1.1)", emoji: "🔷" },
    { name: "Rose Gold", css: "sepia(0.22) hue-rotate(-12deg) saturate(1.45) brightness(1.14) contrast(0.92)", emoji: "🪙" },
    { name: "Dust Storm", css: "sepia(0.28) saturate(0.8) brightness(0.92) contrast(1.15)", emoji: "🌫️" },
    { name: "Mono Punch", css: "grayscale(1) contrast(1.48) brightness(1.05)", emoji: "⚪" },
    { name: "Mint Punch", css: "hue-rotate(60deg) saturate(1.55) brightness(1.18) contrast(0.96)", emoji: "🍃" },
    { name: "Punch Red", css: "hue-rotate(-14deg) saturate(2.7) brightness(0.94) contrast(1.28)", emoji: "🥊" },
    { name: "Club Night", css: "hue-rotate(-165deg) saturate(1.8) brightness(0.68) contrast(1.32)", emoji: "🌃" },
    { name: "Snow Fade", css: "saturate(0.52) brightness(1.34) contrast(0.86) sepia(0.04)", emoji: "☁️" },
    { name: "Jungle", css: "hue-rotate(52deg) saturate(1.7) brightness(0.9) contrast(1.14)", emoji: "🌴" },
    { name: "Copper", css: "sepia(0.48) saturate(1.5) brightness(1.0) hue-rotate(-10deg) contrast(1.06)", emoji: "🧡" },
    { name: "Pearl Pink", css: "hue-rotate(-14deg) saturate(1.25) brightness(1.28) contrast(0.86)", emoji: "🩰" },
    { name: "Voltage", css: "hue-rotate(8deg) saturate(3.0) brightness(0.92) contrast(1.4)", emoji: "⚡" },
    { name: "Silver Film", css: "grayscale(0.55) contrast(1.22) brightness(1.16) saturate(0.7)", emoji: "🥈" },
    { name: "Crush Pink", css: "hue-rotate(-20deg) saturate(2.2) brightness(1.12) contrast(1.08)", emoji: "💘" },
    { name: "Blueberry Ice", css: "hue-rotate(-190deg) saturate(1.6) brightness(1.16) contrast(0.94)", emoji: "🫐" },
    { name: "Sandstone", css: "sepia(0.34) saturate(1.08) brightness(1.08) contrast(0.92)", emoji: "🏜️" },
    { name: "Infrared", css: "hue-rotate(-42deg) saturate(3.3) brightness(0.86) contrast(1.42)", emoji: "📡" },
    { name: "Cerulean", css: "hue-rotate(20deg) saturate(1.9) brightness(1.08) contrast(1.02)", emoji: "🩵" },
    { name: "Moody Violet", css: "hue-rotate(-170deg) saturate(1.7) brightness(0.78) contrast(1.22)", emoji: "🟣" },
    { name: "Lemon Pop", css: "sepia(0.26) saturate(2.4) brightness(1.22) contrast(1.04)", emoji: "🍋" },
    { name: "Deep Matte", css: "saturate(0.7) brightness(0.72) contrast(1.36)", emoji: "⚫" },
    { name: "Sun Kiss", css: "sepia(0.18) saturate(1.46) brightness(1.18) contrast(0.96)", emoji: "🌤️" },
    { name: "Mango", css: "hue-rotate(-16deg) saturate(1.9) brightness(1.12) contrast(1.02)", emoji: "🥭" },
    { name: "Emerald", css: "hue-rotate(66deg) saturate(2.0) brightness(0.92) contrast(1.14)", emoji: "💚" },
    { name: "Slate", css: "saturate(0.62) brightness(0.9) contrast(1.2) hue-rotate(10deg)", emoji: "🪨" },
    { name: "Candy Peach", css: "hue-rotate(-10deg) saturate(1.75) brightness(1.2) contrast(0.96)", emoji: "🍑" },
    { name: "Darkroom", css: "brightness(0.62) contrast(1.42) saturate(0.86)", emoji: "🛑" },
    { name: "Aurora Borealis", css: "hue-rotate(46deg) saturate(1.95) brightness(1.02) contrast(1.08)", emoji: "🌌" },
  ];

  const FACE_FILTERS = [
    { name: "Natural", css: "blur(0.2px) brightness(1.08) contrast(0.95) saturate(1.1)", emoji: "🌿" },
    { name: "Smooth", css: "blur(0.6px) brightness(1.12) contrast(0.9) saturate(1.1)", emoji: "🧴" },
    { name: "HD Smooth", css: "blur(0.8px) brightness(1.18) contrast(0.84) saturate(1.08)", emoji: "📸" },
    { name: "Ultra Smooth", css: "blur(1px) brightness(1.2) contrast(0.82) saturate(1.05)", emoji: "🫧" },
    { name: "TikTok Soft", css: "blur(0.9px) brightness(1.22) contrast(0.86) saturate(1.12)", emoji: "🎵" },
    { name: "TikTok Glow", css: "blur(0.7px) brightness(1.3) contrast(0.83) saturate(1.22) sepia(0.04)", emoji: "✨" },
    { name: "Cute", css: "blur(0.4px) brightness(1.2) saturate(1.4) contrast(0.86) sepia(0.05)", emoji: "🥰" },
    { name: "Baby Face", css: "blur(0.8px) brightness(1.22) contrast(0.8) saturate(1.15)", emoji: "👶" },
    { name: "Glow Up", css: "blur(0.4px) brightness(1.3) saturate(1.4) contrast(0.88)", emoji: "💎" },
    { name: "Glass Skin", css: "blur(0.5px) brightness(1.32) contrast(0.76) saturate(1.0)", emoji: "🪞" },
    { name: "Doll Skin", css: "blur(1.05px) brightness(1.28) contrast(0.78) saturate(1.08) sepia(0.04)", emoji: "🪄" },
    { name: "Peachy", css: "blur(0.45px) brightness(1.2) contrast(0.87) saturate(1.38) hue-rotate(-8deg)", emoji: "🍑" },
    { name: "K-Beauty", css: "blur(0.5px) brightness(1.25) contrast(0.82) saturate(0.92) sepia(0.06)", emoji: "🇰🇷" },
    { name: "Porcelain", css: "blur(0.5px) brightness(1.25) contrast(0.8) saturate(0.85) sepia(0.1)", emoji: "🪆" },
    { name: "Studio", css: "blur(0.3px) brightness(1.16) contrast(1.05) saturate(1.22)", emoji: "🎬" },
    { name: "Angelic", css: "blur(0.8px) brightness(1.35) contrast(0.76) saturate(0.85) sepia(0.1)", emoji: "😇" },
    { name: "Full Glam", css: "blur(1px) brightness(1.35) contrast(0.78) saturate(1.4) sepia(0.06)", emoji: "👑" },
    { name: "Airbrushed", css: "blur(1.5px) brightness(1.3) contrast(0.78) saturate(1.1)", emoji: "🖌️" },
    { name: "Rosy", css: "blur(0.4px) brightness(1.15) saturate(1.5) contrast(0.88) hue-rotate(-15deg)", emoji: "🌸" },
    { name: "Sun-kissed", css: "blur(0.3px) brightness(1.2) saturate(1.35) contrast(0.92) sepia(0.18)", emoji: "☀️" },
    { name: "Face Pop", css: "blur(0.55px) brightness(1.24) contrast(1.02) saturate(1.28)", emoji: "💥" },
    { name: "Filter Max", css: "blur(1.2px) brightness(1.4) contrast(0.75) saturate(1.3)", emoji: "⭐" },
    { name: "Peony", css: "blur(0.45px) brightness(1.22) contrast(0.88) saturate(1.22) hue-rotate(-6deg)", emoji: "🌺" },
    { name: "Cloud Skin", css: "blur(1.1px) brightness(1.33) contrast(0.74) saturate(0.92)", emoji: "☁️" },
    { name: "Latte", css: "blur(0.5px) brightness(1.15) contrast(0.9) saturate(1.1) sepia(0.12)", emoji: "☕" },
    { name: "Cherry", css: "blur(0.35px) brightness(1.18) contrast(0.9) saturate(1.48) hue-rotate(-14deg)", emoji: "🍒" },
    { name: "Ice Doll", css: "blur(0.9px) brightness(1.34) contrast(0.74) saturate(0.86) hue-rotate(10deg)", emoji: "🧊" },
    { name: "Runway", css: "blur(0.28px) brightness(1.12) contrast(1.14) saturate(1.25)", emoji: "🛫" },
    { name: "Soft Matte", css: "blur(0.7px) brightness(1.18) contrast(0.83) saturate(0.95)", emoji: "🪶" },
    { name: "Blossom", css: "blur(0.45px) brightness(1.24) contrast(0.82) saturate(1.2) sepia(0.08)", emoji: "🌼" },
    { name: "Milk Skin", css: "blur(0.95px) brightness(1.3) contrast(0.76) saturate(0.9)", emoji: "🥛" },
    { name: "Soft Peach", css: "blur(0.5px) brightness(1.22) contrast(0.84) saturate(1.24) hue-rotate(-7deg)", emoji: "🍯" },
    { name: "Fresh", css: "blur(0.3px) brightness(1.16) contrast(0.94) saturate(1.1)", emoji: "🌱" },
    { name: "Cloudy", css: "blur(1.2px) brightness(1.36) contrast(0.72) saturate(0.88)", emoji: "🌥️" },
    { name: "Warm Matte", css: "blur(0.75px) brightness(1.18) contrast(0.84) saturate(1.02) sepia(0.09)", emoji: "🧡" },
    { name: "Velour", css: "blur(0.62px) brightness(1.2) contrast(0.86) saturate(1.08)", emoji: "🧶" },
    { name: "Honey Glow", css: "blur(0.42px) brightness(1.26) contrast(0.82) saturate(1.18) sepia(0.1)", emoji: "🍯" },
    { name: "Studio Max", css: "blur(0.24px) brightness(1.14) contrast(1.18) saturate(1.22)", emoji: "🎛️" },
    { name: "Cute Pop", css: "blur(0.56px) brightness(1.24) contrast(0.84) saturate(1.3)", emoji: "🩷" },
    { name: "Ivory", css: "blur(0.62px) brightness(1.28) contrast(0.78) saturate(0.82)", emoji: "🤍" },
    { name: "Silk", css: "blur(0.68px) brightness(1.21) contrast(0.85) saturate(0.98)", emoji: "🪷" },
    { name: "Ultra Doll", css: "blur(1.18px) brightness(1.37) contrast(0.72) saturate(1.02)", emoji: "🎀" },
    { name: "Pearl", css: "blur(0.74px) brightness(1.29) contrast(0.79) saturate(0.9)", emoji: "🫧" },
    { name: "Velvet Skin", css: "blur(0.84px) brightness(1.24) contrast(0.81) saturate(1.04)", emoji: "🧴" },
    { name: "Cinematic", css: "blur(0.34px) brightness(1.1) contrast(1.16) saturate(1.18)", emoji: "🎞️" },
    { name: "Blush Pop", css: "blur(0.52px) brightness(1.23) contrast(0.84) saturate(1.34) hue-rotate(-10deg)", emoji: "💞" },
    { name: "Glossy Skin", css: "blur(0.62px) brightness(1.31) contrast(0.77) saturate(1.02)", emoji: "💦" },
    { name: "Honey Matte", css: "blur(0.76px) brightness(1.22) contrast(0.82) saturate(1.08) sepia(0.1)", emoji: "🍯" },
    { name: "Lily", css: "blur(0.48px) brightness(1.25) contrast(0.8) saturate(1.06)", emoji: "🪻" },
    { name: "Satin", css: "blur(0.66px) brightness(1.2) contrast(0.84) saturate(0.96)", emoji: "🎗️" },
    { name: "Ultra Glow", css: "blur(1.06px) brightness(1.4) contrast(0.7) saturate(1.1)", emoji: "✨" },
    { name: "Natural Plus", css: "blur(0.26px) brightness(1.1) contrast(0.96) saturate(1.04)", emoji: "🍀" },
    { name: "Soft Focus", css: "blur(1.02px) brightness(1.27) contrast(0.76) saturate(0.94)", emoji: "🎯" },
    { name: "Aura Skin", css: "blur(0.88px) brightness(1.3) contrast(0.74) saturate(1.0)", emoji: "🔮" },
    { name: "Cream", css: "blur(0.78px) brightness(1.3) contrast(0.77) saturate(0.92)", emoji: "🥥" },
    { name: "Rose Glow", css: "blur(0.5px) brightness(1.24) contrast(0.82) saturate(1.28) hue-rotate(-12deg)", emoji: "🌹" },
    { name: "Neutral", css: "blur(0.34px) brightness(1.12) contrast(0.92) saturate(1.02)", emoji: "🪵" },
    { name: "Soft Sun", css: "blur(0.64px) brightness(1.22) contrast(0.82) saturate(1.08) sepia(0.08)", emoji: "🌤️" },
    { name: "Pillow", css: "blur(1.12px) brightness(1.33) contrast(0.72) saturate(0.9)", emoji: "🛏️" },
    { name: "Pure Skin", css: "blur(0.28px) brightness(1.14) contrast(0.95) saturate(1.03)", emoji: "💧" },
    { name: "Runway Glow", css: "blur(0.42px) brightness(1.2) contrast(1.08) saturate(1.2)", emoji: "🕶️" },
    { name: "Pink Soft", css: "blur(0.58px) brightness(1.25) contrast(0.81) saturate(1.22) hue-rotate(-8deg)", emoji: "🎀" },
    { name: "Velvet Matte", css: "blur(0.86px) brightness(1.22) contrast(0.8) saturate(0.98)", emoji: "🧵" },
    { name: "Light Edit", css: "blur(0.36px) brightness(1.16) contrast(0.9) saturate(1.08)", emoji: "🛠️" },
    { name: "Porcelain Plus", css: "blur(0.92px) brightness(1.31) contrast(0.74) saturate(0.86)", emoji: "🏺" },
    { name: "Glow Prime", css: "blur(0.96px) brightness(1.37) contrast(0.7) saturate(1.06)", emoji: "💫" },
    { name: "Airy", css: "blur(0.9px) brightness(1.32) contrast(0.74) saturate(0.92)", emoji: "🌬️" },
    { name: "Natural Soft", css: "blur(0.42px) brightness(1.16) contrast(0.9) saturate(1.06)", emoji: "🌿" },
    { name: "Coral Glow", css: "blur(0.56px) brightness(1.24) contrast(0.82) saturate(1.26) hue-rotate(-9deg)", emoji: "🪸" },
    { name: "Smooth Pro", css: "blur(1.12px) brightness(1.34) contrast(0.72) saturate(0.98)", emoji: "🧴" },
    { name: "Studio Clear", css: "blur(0.3px) brightness(1.14) contrast(1.1) saturate(1.18)", emoji: "📷" },
    { name: "Skin Glow+", css: "blur(0.78px) brightness(1.29) contrast(0.76) saturate(1.02)", emoji: "🌟" },
    { name: "TikTok Snatch", css: "blur(0.9px) brightness(1.34) contrast(0.72) saturate(1.06)", emoji: "🎯" },
    { name: "Lip Focus", css: "blur(0.52px) brightness(1.2) contrast(0.86) saturate(1.34) hue-rotate(-8deg)", emoji: "💋" },
    { name: "Face Lift", css: "blur(0.74px) brightness(1.26) contrast(0.78) saturate(1.04)", emoji: "🪄" },
    { name: "Smooth Max", css: "blur(1.28px) brightness(1.38) contrast(0.68) saturate(0.98)", emoji: "🧴" },
    { name: "Glam Cam", css: "blur(0.42px) brightness(1.18) contrast(1.08) saturate(1.24)", emoji: "📸" },
    { name: "Baby Smooth", css: "blur(1.08px) brightness(1.33) contrast(0.7) saturate(1.02)", emoji: "👶" },
    { name: "K-Glow Max", css: "blur(0.82px) brightness(1.34) contrast(0.72) saturate(0.92)", emoji: "🇰🇷" },
    { name: "Skin Filter 100", css: "blur(1.42px) brightness(1.4) contrast(0.65) saturate(0.96)", emoji: "💯" },
    { name: "Sculpted", css: "blur(0.8px) brightness(1.27) contrast(0.76) saturate(1.05)", emoji: "🗿" },
    { name: "Lip Beauty", css: "blur(0.48px) brightness(1.22) contrast(0.84) saturate(1.36) hue-rotate(-10deg)", emoji: "💄" },
    { name: "Cheek Pop", css: "blur(0.58px) brightness(1.24) contrast(0.8) saturate(1.22)", emoji: "😊" },
    { name: "V-Line", css: "blur(0.72px) brightness(1.24) contrast(0.78) saturate(1.02)", emoji: "🔻" },
    { name: "Eye Bright", css: "blur(0.36px) brightness(1.18) contrast(0.9) saturate(1.16)", emoji: "👀" },
    { name: "Soft Glow Pro", css: "blur(1.2px) brightness(1.36) contrast(0.68) saturate(0.98)", emoji: "🫧" },
    { name: "Contour Skin", css: "blur(0.66px) brightness(1.2) contrast(0.84) saturate(1.04)", emoji: "🖌️" },
    { name: "Ultra Pretty", css: "blur(1.3px) brightness(1.39) contrast(0.66) saturate(1.0)", emoji: "👑" },
    { name: "Lip Sculpt", css: "blur(0.54px) brightness(1.22) contrast(0.84) saturate(1.34) hue-rotate(-9deg)", emoji: "💋" },
    { name: "Brow Pro", css: "blur(0.44px) brightness(1.17) contrast(0.9) saturate(1.14)", emoji: "🖌️" },
    { name: "Cheek Lift", css: "blur(0.68px) brightness(1.24) contrast(0.78) saturate(1.08)", emoji: "😊" },
    { name: "Doll Max", css: "blur(1.34px) brightness(1.4) contrast(0.64) saturate(1.02)", emoji: "🧸" },
    { name: "K-Smooth Pro", css: "blur(1.06px) brightness(1.35) contrast(0.7) saturate(0.92)", emoji: "🇰🇷" },
    { name: "S-Line", css: "blur(0.76px) brightness(1.25) contrast(0.76) saturate(1.02)", emoji: "🔻" },
    { name: "Idol Skin", css: "blur(0.62px) brightness(1.28) contrast(0.74) saturate(0.96)", emoji: "🌟" },
    { name: "Feather", css: "blur(1.3px) brightness(1.36) contrast(0.68) saturate(0.92)", emoji: "🪶" },
    { name: "Tulle", css: "blur(0.72px) brightness(1.32) contrast(0.72) saturate(0.88)", emoji: "🎀" },
    { name: "Gossamer", css: "blur(1.0px) brightness(1.3) contrast(0.74) saturate(0.9)", emoji: "🕸️" },
    { name: "Mirror Skin", css: "blur(0.54px) brightness(1.36) contrast(0.72) saturate(0.96)", emoji: "🪞" },
    { name: "Snow White", css: "blur(0.82px) brightness(1.38) contrast(0.66) saturate(0.84)", emoji: "🤍" },
    { name: "Luminous", css: "blur(0.46px) brightness(1.3) contrast(0.78) saturate(1.04)", emoji: "✨" },
    { name: "Soft Haze", css: "blur(1.18px) brightness(1.32) contrast(0.7) saturate(0.92)", emoji: "🌤️" },
    { name: "Skin Blur+", css: "blur(1.5px) brightness(1.32) contrast(0.7) saturate(0.96)", emoji: "🧴" },
    { name: "Celestial", css: "blur(0.78px) brightness(1.32) contrast(0.72) saturate(1.06) sepia(0.04)", emoji: "🌙" },
    { name: "Mocha Skin", css: "blur(0.58px) brightness(1.14) contrast(0.9) saturate(1.06) sepia(0.14)", emoji: "☕" },
    { name: "Quartz", css: "blur(0.64px) brightness(1.3) contrast(0.76) saturate(0.94)", emoji: "🔮" },
    { name: "Petal", css: "blur(0.5px) brightness(1.24) contrast(0.8) saturate(1.16) hue-rotate(-6deg)", emoji: "🌺" },
    { name: "Haze Pro", css: "blur(1.22px) brightness(1.34) contrast(0.7) saturate(0.94)", emoji: "🌫️" },
    { name: "Gloss Pro", css: "blur(0.58px) brightness(1.35) contrast(0.74) saturate(1.0)", emoji: "💧" },
    { name: "Lush Skin", css: "blur(0.42px) brightness(1.18) contrast(0.88) saturate(1.12)", emoji: "🌿" },
    { name: "Powder", css: "blur(0.94px) brightness(1.25) contrast(0.78) saturate(0.88)", emoji: "🌸" },
    { name: "Velvet Pro", css: "blur(0.78px) brightness(1.22) contrast(0.82) saturate(1.02)", emoji: "🧵" },
    { name: "Alabaster", css: "blur(0.86px) brightness(1.34) contrast(0.68) saturate(0.88)", emoji: "🪨" },
    { name: "HD Glow", css: "blur(0.36px) brightness(1.24) contrast(0.9) saturate(1.14)", emoji: "📸" },
    { name: "Dew Drop", css: "blur(0.62px) brightness(1.28) contrast(0.76) saturate(1.0)", emoji: "💦" },
    { name: "Crystal Skin", css: "blur(0.48px) brightness(1.34) contrast(0.72) saturate(0.94)", emoji: "🔷" },
    { name: "Peach Blur", css: "blur(0.76px) brightness(1.24) contrast(0.8) saturate(1.18) hue-rotate(-9deg)", emoji: "🍑" },
    { name: "Soft Cinema", css: "blur(0.32px) brightness(1.12) contrast(1.08) saturate(1.12) sepia(0.06)", emoji: "🎬" },
    { name: "Airbrush", css: "blur(1.1px) brightness(1.24) contrast(0.78) saturate(1.06)", emoji: "🖌️" },
    { name: "Porcelain", css: "blur(1.3px) brightness(1.36) contrast(0.7) saturate(0.82)", emoji: "🪷" },
    { name: "Studio Light", css: "blur(0.38px) brightness(1.32) contrast(0.84) saturate(1.18)", emoji: "💡" },
    { name: "Rose Matte", css: "blur(0.62px) brightness(1.2) contrast(0.86) saturate(1.28) hue-rotate(-12deg) sepia(0.08)", emoji: "🌹" },
    { name: "Skin Silk", css: "blur(0.88px) brightness(1.22) contrast(0.76) saturate(0.98)", emoji: "🧣" },
    { name: "Moonlit", css: "blur(0.72px) brightness(1.42) contrast(0.72) saturate(0.78) sepia(0.04)", emoji: "🌙" },
    { name: "Dewy", css: "blur(0.42px) brightness(1.3) contrast(0.8) saturate(1.12)", emoji: "💧" },
    { name: "Champagne", css: "blur(0.56px) brightness(1.26) contrast(0.82) saturate(1.08) sepia(0.1)", emoji: "🥂" },
    { name: "Ethereal", css: "blur(1.4px) brightness(1.44) contrast(0.68) saturate(0.9)", emoji: "🕊️" },
    { name: "Radiant", css: "blur(0.28px) brightness(1.36) contrast(0.86) saturate(1.24)", emoji: "⚡" },
    { name: "Soft Focus", css: "blur(1.6px) brightness(1.22) contrast(0.74) saturate(1.02)", emoji: "🔍" },
    { name: "Golden Skin", css: "blur(0.44px) brightness(1.22) contrast(0.88) saturate(1.36) sepia(0.14) hue-rotate(-10deg)", emoji: "✨" },
    { name: "Velour", css: "blur(0.94px) brightness(1.18) contrast(0.8) saturate(1.04)", emoji: "🫧" },
    { name: "Flawless", css: "blur(1.05px) brightness(1.32) contrast(0.72) saturate(0.96)", emoji: "💎" },
    { name: "Blush Tone", css: "blur(0.52px) brightness(1.24) contrast(0.84) saturate(1.4) hue-rotate(-16deg)", emoji: "🩷" },
    { name: "Matte Glow", css: "blur(0.66px) brightness(1.2) contrast(0.92) saturate(1.08)", emoji: "🌟" },
    { name: "Milk Skin", css: "blur(1.15px) brightness(1.38) contrast(0.68) saturate(0.85)", emoji: "🥛" },
    { name: "Honey Glaze", css: "blur(0.48px) brightness(1.26) contrast(0.86) saturate(1.44) sepia(0.12) hue-rotate(-8deg)", emoji: "🍯" },
    { name: "Soft Tan", css: "blur(0.54px) brightness(1.14) contrast(0.9) saturate(1.32) sepia(0.18) hue-rotate(-14deg)", emoji: "🏖️" },
    { name: "Ice Glow", css: "blur(0.78px) brightness(1.46) contrast(0.7) saturate(0.76)", emoji: "🧊" },
    { name: "Sunrise Skin", css: "blur(0.36px) brightness(1.28) contrast(0.86) saturate(1.32) hue-rotate(-6deg) sepia(0.1)", emoji: "🌅" },
    { name: "Ultra Matte", css: "blur(0.82px) brightness(1.18) contrast(0.88) saturate(0.88)", emoji: "🪞" },
    { name: "Filter Off+", css: "blur(0.18px) brightness(1.06) contrast(1.0) saturate(1.0)", emoji: "💫" },
    { name: "Bloom", css: "blur(1.2px) brightness(1.38) contrast(0.72) saturate(1.14)", emoji: "🌺" },
    { name: "Caramel Skin", css: "blur(0.58px) brightness(1.14) contrast(0.9) saturate(1.38) sepia(0.22) hue-rotate(-12deg)", emoji: "🍮" },
    { name: "TikTok Pro", css: "blur(1.0px) brightness(1.28) contrast(0.82) saturate(1.16)", emoji: "🎵" },
    { name: "Celeb Glow", css: "blur(0.68px) brightness(1.36) contrast(0.76) saturate(1.2)", emoji: "⭐" },
    { name: "Berry Tone", css: "blur(0.72px) brightness(1.18) contrast(0.86) saturate(1.3) hue-rotate(-24deg)", emoji: "🫐" },
    { name: "Pure White", css: "blur(1.0px) brightness(1.52) contrast(0.64) saturate(0.72)", emoji: "🤍" },
    { name: "Soft Glam", css: "blur(0.84px) brightness(1.26) contrast(0.8) saturate(1.22) sepia(0.06)", emoji: "💄" },
    { name: "Velvet Blur", css: "blur(1.04px) brightness(1.22) contrast(0.78) saturate(1.0)", emoji: "🧵" },
    { name: "Halo Skin", css: "blur(0.56px) brightness(1.34) contrast(0.76) saturate(1.06)", emoji: "😇" },
    { name: "Cloud Skin", css: "blur(1.28px) brightness(1.4) contrast(0.66) saturate(0.84)", emoji: "☁️" },
    { name: "Tea Rose", css: "blur(0.62px) brightness(1.2) contrast(0.84) saturate(1.26) hue-rotate(-12deg)", emoji: "🌷" },
    { name: "HD Porcelain", css: "blur(0.9px) brightness(1.38) contrast(0.68) saturate(0.82)", emoji: "🏺" },
    { name: "Creamy", css: "blur(0.72px) brightness(1.26) contrast(0.8) saturate(0.98) sepia(0.08)", emoji: "🍦" },
    { name: "Ice Silk", css: "blur(0.86px) brightness(1.44) contrast(0.7) saturate(0.78)", emoji: "🧊" },
    { name: "Warm Matte", css: "blur(0.68px) brightness(1.16) contrast(0.92) saturate(1.16) sepia(0.08)", emoji: "🔥" },
    { name: "Rosy Glow", css: "blur(0.5px) brightness(1.26) contrast(0.84) saturate(1.36) hue-rotate(-14deg)", emoji: "🌹" },
    { name: "Cloud Nine", css: "blur(1.42px) brightness(1.46) contrast(0.64) saturate(0.88)", emoji: "9️⃣" },
    { name: "Silk Matte", css: "blur(0.82px) brightness(1.2) contrast(0.88) saturate(0.94)", emoji: "🪡" },
    { name: "Studio Pro", css: "blur(0.42px) brightness(1.3) contrast(0.88) saturate(1.18)", emoji: "🎥" },
    { name: "Nude Skin", css: "blur(0.64px) brightness(1.18) contrast(0.88) saturate(1.08) sepia(0.1)", emoji: "🤎" },
    { name: "Baby Glow", css: "blur(1.12px) brightness(1.34) contrast(0.7) saturate(1.02)", emoji: "🍼" },
    { name: "High Beam", css: "blur(0.34px) brightness(1.4) contrast(0.86) saturate(1.22)", emoji: "🔦" },
    { name: "Pure Peach", css: "blur(0.66px) brightness(1.24) contrast(0.82) saturate(1.28) hue-rotate(-10deg)", emoji: "🍑" },
    { name: "Smooth Pro+", css: "blur(1.18px) brightness(1.28) contrast(0.76) saturate(1.06)", emoji: "➕" },
    { name: "Diamond Skin", css: "blur(0.52px) brightness(1.36) contrast(0.78) saturate(1.1)", emoji: "💠" },
    { name: "Pearl Tone", css: "blur(0.74px) brightness(1.3) contrast(0.76) saturate(0.92)", emoji: "⚪" },
    { name: "Ultra Idol", css: "blur(1.08px) brightness(1.38) contrast(0.7) saturate(1.0)", emoji: "🎤" },
    { name: "Aura Skin", css: "blur(0.7px) brightness(1.32) contrast(0.76) saturate(1.08)", emoji: "🪄" },
    { name: "Porcelain Pro", css: "blur(1.22px) brightness(1.4) contrast(0.66) saturate(0.8)", emoji: "🏺" },
    { name: "Glow Candy", css: "blur(0.62px) brightness(1.3) contrast(0.8) saturate(1.28) hue-rotate(-10deg)", emoji: "🍭" },
    { name: "Velvet Air", css: "blur(1.0px) brightness(1.22) contrast(0.78) saturate(1.0)", emoji: "🌬️" },
    { name: "Angel Light", css: "blur(0.54px) brightness(1.38) contrast(0.74) saturate(0.96)", emoji: "😇" },
    { name: "Cocoa Smooth", css: "blur(0.66px) brightness(1.12) contrast(0.9) saturate(1.22) sepia(0.14)", emoji: "🍫" },
    { name: "Cool Tone", css: "blur(0.78px) brightness(1.26) contrast(0.8) saturate(0.86) hue-rotate(8deg)", emoji: "🧊" },
    { name: "Pillow Skin", css: "blur(1.34px) brightness(1.36) contrast(0.66) saturate(0.92)", emoji: "🛏️" },
    { name: "Gloss Skin", css: "blur(0.44px) brightness(1.32) contrast(0.84) saturate(1.14)", emoji: "💦" },
    { name: "Honey Matte", css: "blur(0.58px) brightness(1.18) contrast(0.9) saturate(1.28) sepia(0.12)", emoji: "🍯" },
    { name: "Glass Blur", css: "blur(1.48px) brightness(1.34) contrast(0.64) saturate(0.88)", emoji: "🪟" },
    { name: "Silky Pro", css: "blur(0.92px) brightness(1.24) contrast(0.8) saturate(1.02)", emoji: "🧵" },
    { name: "Ice Petal", css: "blur(0.84px) brightness(1.44) contrast(0.68) saturate(0.78) hue-rotate(-6deg)", emoji: "🪷" },
    { name: "Nude Glow", css: "blur(0.64px) brightness(1.22) contrast(0.84) saturate(1.12) sepia(0.08)", emoji: "🤎" },
    { name: "Dream Skin", css: "blur(1.38px) brightness(1.42) contrast(0.62) saturate(0.9)", emoji: "💭" },
  ];

  const totalFilterCount = filterTab === "ar" ? AR_STICKERS.length : AI_MODES.length;
  const selectedFilterName = filterTab === "ar"
    ? AR_STICKERS[activeSticker]?.name || "None"
    : (aiSelectedMode ? AI_MODES.find(m => m.id === aiSelectedMode)?.name : "None") || "None";
  const visibleFilterIndexes = useMemo(() => {
    if (filterTab === "ar") {
      return AR_STICKERS.map((_, i) => i).filter(i => 
        arCategory === "All" || (AR_STICKERS[i] as any).category?.includes(arCategory)
      );
    }
    return [];
  }, [filterTab, arCategory]);

  const randomizeCurrentTabFilter = () => {
    if (filterTab === "ar") {
      if (AR_STICKERS.length <= 1) return;
      const candidateIndexes = visibleFilterIndexes.filter((idx) => idx > 0);
      const pool = candidateIndexes.length ? candidateIndexes : AR_STICKERS.map((_v, idx) => idx).filter((idx) => idx > 0);
      const next = pool[Math.floor(Math.random() * pool.length)];
      setActiveSticker(next);
      return;
    }
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // AI_MODES moved outside component


  const runAiFaceEdit = async (mode: string) => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    
    setAiProcessing(true);
    setAiSelectedMode(mode);
    setAiResultOverlay(null);

    try {
      // Capture current frame
      const c = document.createElement("canvas");
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      const ctx2 = c.getContext("2d");
      if (!ctx2) throw new Error("Canvas failed");
      ctx2.drawImage(video, 0, 0);
      const imageBase64 = c.toDataURL("image/jpeg", 0.85);

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-face-edit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64, mode }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      if (data.imageUrl) {
        setAiResultOverlay(data.imageUrl);
        setAiOverlayMode("card");
      }
    } catch (err) {
      console.error("AI face edit failed:", err);
      const { toast } = await import("sonner");
      toast.error(err instanceof Error ? err.message : "AI processing failed");
    } finally {
      setAiProcessing(false);
    }
  };

  // No auto-shrink needed — AI result always shows as card to keep camera visible

  useEffect(() => {
    const currentSticker = AR_STICKERS[activeSticker]?.sticker;
    if (!currentSticker) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Try to use browser FaceDetector API (Chrome/Edge)
    let faceDetector: any = null;
    try {
      if ("FaceDetector" in window) {
        faceDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      }
    } catch { /* not supported */ }

    let running = true;
    let lastFace: FaceBox | null = null;
    let frameCount = 0;

    const detectAndDraw = async () => {
      if (!running) return;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const video = videoRef.current;
      const cw = canvas.width;
      const ch = canvas.height;

      // Detect face every 5 frames for performance
      if (video && faceDetector && video.readyState >= 2 && frameCount % 5 === 0) {
        try {
          const faces = await faceDetector.detect(video);
          if (faces.length > 0) {
            const f = faces[0];
            const bb = f.boundingBox;
            const scaleX = cw / video.videoWidth;
            const scaleY = ch / video.videoHeight;
            const eyeL = f.landmarks?.find((l: any) => l.type === "eye")?.locations?.[0];
            const eyeR = f.landmarks?.filter((l: any) => l.type === "eye")?.[1]?.locations?.[0];
            lastFace = {
              x: bb.x * scaleX,
              y: bb.y * scaleY,
              width: bb.width * scaleX,
              height: bb.height * scaleY,
              eyeLeft: eyeL
                ? { x: eyeL.x * scaleX, y: eyeL.y * scaleY }
                : { x: (bb.x + bb.width * 0.32) * scaleX, y: (bb.y + bb.height * 0.35) * scaleY },
              eyeRight: eyeR
                ? { x: eyeR.x * scaleX, y: eyeR.y * scaleY }
                : { x: (bb.x + bb.width * 0.68) * scaleX, y: (bb.y + bb.height * 0.35) * scaleY },
            };
          }
        } catch { /* detection failed, use last known */ }
      }

      const face: FaceBox = lastFace || {
        x: cw * 0.25, y: ch * 0.15,
        width: cw * 0.5, height: ch * 0.5,
        eyeLeft: { x: cw * 0.38, y: ch * 0.32 },
        eyeRight: { x: cw * 0.62, y: ch * 0.32 },
      };

      drawFaceFilter(ctx, currentSticker, face, cw, ch, performance.now());
      frameCount++;
      animFrameRef.current = requestAnimationFrame(detectAndDraw);
    };

    detectAndDraw();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeSticker, facingMode]);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      toast.error("Camera access denied");
      onCloseRef.current();
    }
  }, []);

  useEffect(() => {
    startCamera(DEFAULT_CAMERA_FACING_MODE);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
    };
  }, [startCamera]);

  const goLive = () => {
    setIsLive(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    toast.success("You're LIVE! 🔴");
  };

  const endLive = () => {
    setIsLive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    toast.info(`Live ended • ${formatTime(elapsed)}`);
    onClose();
  };

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  };

  const toggleMic = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMuted(!audioTrack.enabled);
    }
  };

  const sendComment = () => {
    if (!commentInput.trim()) return;
    setComments((prev) => [...prev, { id: Date.now(), user: "You", text: commentInput.trim() }]);
    setCommentInput("");
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startClipRecording = () => {
    if (isPublishingClip) return;
    const stream = streamRef.current;
    if (!stream) {
      toast.error("Camera stream is not ready");
      return;
    }
    if (!(window as any).MediaRecorder) {
      toast.error("Recording is not supported on this device");
      return;
    }

    const mimeCandidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const supported = mimeCandidates.find((type) => (window as any).MediaRecorder.isTypeSupported?.(type));

    try {
      chunksRef.current = [];

      // If AI overlay is active, composite AI image onto a canvas and record that
      let recordStream: MediaStream;
      if (aiResultOverlay) {
        const compCanvas = document.createElement("canvas");
        compCanvas.width = 720;
        compCanvas.height = 1280;
        compositeCanvasRef.current = compCanvas;
        const compCtx = compCanvas.getContext("2d")!;
        
        // Load AI image
        const aiImg = document.createElement("img");
        aiImg.crossOrigin = "anonymous";
        aiImg.src = aiResultOverlay;

        // Draw AI image on loop
        const drawFrame = () => {
          compCtx.drawImage(aiImg, 0, 0, compCanvas.width, compCanvas.height);
          compositeAnimRef.current = requestAnimationFrame(drawFrame);
        };
        aiImg.onload = () => drawFrame();
        // Start immediately even if image isn't loaded yet (will be black briefly)
        if (aiImg.complete) drawFrame();

        const canvasStream = compCanvas.captureStream(30);
        // Add audio from camera
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach(t => canvasStream.addTrack(t));
        recordStream = canvasStream;
      } else {
        recordStream = stream;
      }

      const recorder = supported
        ? new MediaRecorder(recordStream, { mimeType: supported })
        : new MediaRecorder(recordStream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        // Stop composite loop
        if (compositeAnimRef.current) {
          cancelAnimationFrame(compositeAnimRef.current);
          compositeAnimRef.current = undefined;
        }
        compositeCanvasRef.current = null;

        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const clipUrl = URL.createObjectURL(blob);
        const clipFile = new File([blob], `zivo-clip-${Date.now()}.webm`, { type: blob.type || "video/webm" });

        setIsPublishingClip(true);
        try {
          await onPublishClip({
            type: "reel",
            caption: "New live clip",
            url: clipUrl,
            file: clipFile,
            filterCss: "none",
          });
          toast.success("Clip published to your feed");
        } catch {
          toast.error("Failed to publish clip");
        } finally {
          setIsPublishingClip(false);
        }
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecordingClip(true);
      setRecordSeconds(0);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => setRecordSeconds((sec) => sec + 1), 1000);
      toast.success("Recording started");
    } catch {
      toast.error("Could not start recording");
    }
  };

  const stopClipRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    mediaRecorderRef.current.stop();
    setIsRecordingClip(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      style={{ paddingTop: "var(--zivo-safe-top-overlay)" }}
    >
      {/* Camera feed */}
      <video
        ref={videoRef}
	        autoPlay
	        playsInline
	        muted
	        preload="none"
	        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
          filter: "none",
        }}
      />
      {/* AR sticker canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
      />

      {/* AI result: always shown as mini card so camera stays visible */}
      {aiResultOverlay && (
        <div className="absolute bottom-32 left-3 z-[4] w-[132px] h-[184px] rounded-2xl overflow-hidden shadow-2xl border border-white/30 bg-black/20 backdrop-blur-sm">
	          <img src={aiResultOverlay} alt="AI result preview" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          <button type="button"
            onClick={() => { setAiResultOverlay(null); setAiSelectedMode(null); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="absolute bottom-1.5 left-1.5 bg-black/55 backdrop-blur-sm rounded-full px-2 py-0.5">
            <span className="text-white text-[10px] font-medium">🤖 AI</span>
          </div>
        </div>
      )}

      {/* AI processing overlay */}
      {aiProcessing && (
        <div className="absolute inset-0 z-[12] bg-black/40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white text-sm font-medium">AI processing...</span>
          </div>
        </div>
      )}


      <div className="relative z-10 flex items-center justify-between p-4 pt-12">
          <div className="flex items-center gap-2">
            {isLive && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center gap-1.5 bg-destructive px-3 py-1 rounded-full"
              >
                <div className="w-2 h-2 rounded-full bg-white" />
                <span className="text-white text-xs font-bold">LIVE</span>
              </motion.div>
            )}
            {isLive && (
              <span className="text-white/80 text-xs font-mono bg-black/40 px-2 py-1 rounded-full">
                {formatTime(elapsed)}
              </span>
            )}
            {isRecordingClip && (
              <span className="text-white/90 text-xs font-mono bg-red-600/80 px-2 py-1 rounded-full">
                REC {formatTime(recordSeconds)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full">
                <Eye className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-bold">{viewers}</span>
              </div>
            )}
            <button type="button" onClick={isLive ? endLive : onClose} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

      {/* Spacer + Comments overlay */}
      {isLive ? (
        <div className="relative z-10 flex-1 flex flex-col justify-end px-4 pb-2">
          <div className="max-h-[30vh] overflow-y-auto space-y-1.5 mb-3 scrollbar-none">
            {comments.map((c) => (
              <div key={c.id} className="bg-black/30 backdrop-blur-sm rounded-xl px-3 py-1.5 max-w-[80%]">
                <span className="text-white text-xs font-bold mr-1.5">{c.user}</span>
                <span className="text-white/90 text-xs">{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* TikTok-style bottom filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 200 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 200 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="absolute left-0 right-0 bottom-0 z-20"
          >
            <div className="bg-black/70 backdrop-blur-xl pt-3 pb-6 rounded-t-3xl">
              {/* Category tabs */}
              <div className="flex items-center gap-1 px-4 mb-3 overflow-x-auto scrollbar-none">
                <button type="button"
                  onClick={() => setShowFilters(false)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
                {(["ar", "ai"] as const).map((tab) => (
                  <button type="button"
                    key={tab}
                    onClick={() => { setFilterTab(tab); setFilterGroup("all"); setActiveFilter(0); if (tab !== "ar") setActiveSticker(0); }}
                    className={cn(
                      "flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
                      filterTab === tab
                        ? "text-white border-b-2 border-white"
                        : "text-white/40"
                    )}
                  >
                    {tab === "ar" ? "🎭 Effects" : "🤖 AI"}
                  </button>
                ))}
              </div>
              <div className="px-4 mb-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {([
                  { id: "all", label: "All" },
                  { id: "trending", label: "Trending" },
                  { id: "new", label: "New" },
                  { id: "pro", label: "Pro" },
                ] as const).map((group) => (
                  <button type="button"
                    key={group.id}
                    onClick={() => setFilterGroup(group.id)}
                    className={cn(
                      "flex-shrink-0 px-3 py-1 rounded-full text-[11px] border transition-colors",
                      filterGroup === group.id
                        ? "bg-white/20 border-white/50 text-white"
                        : "bg-white/5 border-white/15 text-white/60"
                    )}
                  >
                    {group.label}
                  </button>
                ))}
                <button type="button"
                  onClick={randomizeCurrentTabFilter}
                  className="ml-auto flex-shrink-0 px-3 py-1 rounded-full text-[11px] bg-primary/75 text-primary-foreground"
                >
                  Random
                </button>
              </div>
              <div className="px-4 mb-2 text-[10px] text-white/45">Swipe up to see more options</div>
              {/* AR Category tabs - TikTok style */}
              {filterTab === "ar" && (
                <div className="flex items-center gap-1 px-4 mb-3 overflow-x-auto scrollbar-none">
                  {AR_CATEGORIES.map(cat => (
                    <button type="button"
                      key={cat}
                      onClick={() => setArCategory(cat)}
                      className={cn(
                        "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        arCategory === cat
                          ? "bg-white text-black"
                          : "bg-white/10 text-white/60 hover:bg-white/20"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              {/* Filter/Sticker/AI grid */}
              <div className="grid grid-cols-4 gap-3 px-4 pr-5 max-h-[48vh] overflow-y-auto">
                {filterTab === "ai" ? (
                  AI_MODES.map((m) => (
                    <button type="button"
                      key={m.id}
                      onClick={() => runAiFaceEdit(m.id)}
                      disabled={aiProcessing}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={cn(
                          "w-[72px] h-[72px] rounded-2xl overflow-hidden relative transition-all",
                          aiSelectedMode === m.id && aiResultOverlay
                            ? "ring-2 ring-white scale-105 shadow-lg shadow-white/20"
                            : aiProcessing && aiSelectedMode === m.id
                            ? "ring-2 ring-primary animate-pulse"
                            : "opacity-80"
                        )}
                        style={{ background: m.gradient }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-3xl drop-shadow-lg">
                          {aiProcessing && aiSelectedMode === m.id ? (
                            <div className="w-6 h-6 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                          ) : (
                            m.emoji
                          )}
                        </div>
                        <div className="absolute bottom-1 left-1 right-1">
                          <span className="text-[8px] text-white/70 font-medium bg-black/30 px-1 rounded">
                            {m.desc}
                          </span>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium leading-tight text-center w-[72px] truncate",
                        aiSelectedMode === m.id ? "text-white" : "text-white/55"
                      )}>{m.name}</span>
                    </button>
                  ))
                ) : (
                  visibleFilterIndexes.map((i) => {
                    const s = AR_STICKERS[i];
                    return (
                    <button type="button"
                      key={`${s.name}-${i}`}
                      onClick={() => setActiveSticker(i)}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={cn(
                          "w-[72px] h-[72px] rounded-2xl overflow-hidden relative transition-all",
                          activeSticker === i
                            ? "ring-2 ring-white scale-105 shadow-lg shadow-white/20"
                            : "opacity-80"
                        )}
                        style={{ background: (s as any).gradient || "linear-gradient(135deg, #333, #555)" }}
                      >
                        {s.sticker ? (
                          <div className="absolute inset-0 flex items-center justify-center text-3xl drop-shadow-lg">
                            {s.emoji}
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-white/60 flex items-center justify-center">
                              <div className="w-0.5 h-6 bg-white/60 rotate-45" />
                            </div>
                          </div>
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium leading-tight text-center w-[72px] truncate",
                        activeSticker === i ? "text-white" : "text-white/55"
                      )}>{s.name}</span>
                    </button>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="relative z-10 p-4 pb-8 bg-gradient-to-t from-black/60 to-transparent">
        {isLive ? (
          <div className="flex items-center gap-2">
            <input
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
              placeholder="Say something..."
              className="flex-1 bg-white/15 backdrop-blur-sm text-white text-sm rounded-full px-4 py-2.5 placeholder:text-white/50 outline-none border border-white/10"
            />
            <button type="button" onClick={toggleFilters} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </button>
            <button type="button"
              onClick={isRecordingClip ? stopClipRecording : startClipRecording}
              disabled={isPublishingClip}
              className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center disabled:opacity-60"
            >
              <Film className={cn("w-5 h-5", isRecordingClip ? "text-red-400" : "text-white")} />
            </button>
            <button type="button" onClick={toggleMic} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
              {muted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
            </button>
            <button type="button" onClick={endLive} className="px-4 py-2.5 bg-destructive rounded-full">
              <span className="text-white text-sm font-bold">End</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button type="button"
              onClick={toggleFilters}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-1",
                showFilters ? "bg-primary text-primary-foreground" : "bg-white/15 text-white/70"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" /> Filters
            </button>
            <div className="flex items-center gap-5">
              <button type="button" onClick={flipCamera} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                <SwitchCamera className="w-5 h-5 text-white" />
              </button>
              <button type="button"
                onClick={isRecordingClip ? stopClipRecording : startClipRecording}
                disabled={isPublishingClip}
                className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center disabled:opacity-60"
              >
                <Film className={cn("w-5 h-5", isRecordingClip ? "text-red-400" : "text-white")} />
              </button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={goLive}
                className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center shadow-lg shadow-destructive/40"
              >
                <Camera className="w-6 h-6 text-white" />
              </motion.button>
              <button type="button" onClick={toggleMic} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                {muted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
              </button>
            </div>
            <span className="text-white/60 text-xs font-medium">Tap to Go Live or record short clips</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
