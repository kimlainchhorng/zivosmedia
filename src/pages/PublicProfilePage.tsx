/**
 * PublicProfilePage — View another user's public profile
 * Shows cover photo, avatar, name, posts/videos/reels, follow/friend/share actions
 * Respects profile_visibility privacy settings
 */
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import { getPublicOrigin, getProfileShareUrl } from "@/lib/getPublicOrigin";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import NavBar from "@/components/home/NavBar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { formatCount } from "@/lib/social/formatCount";
import { isBlueVerified } from "@/lib/verification";
import { MutualFollowsBadge } from "@/components/social/MutualFollowsBadge";
import { useMutualFollows } from "@/hooks/useMutualFollows";
import {
  ArrowLeft, Loader2, User, ImageIcon, Film, Grid3X3, UserPlus, UserCheck, UserX,
  Heart, MessageCircle, Lock, ShieldCheck, Users, Share2, Play, Eye, Bookmark, Globe, MoreHorizontal,
  Phone, Video, Gift, Camera,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PullToRefresh from "@/components/shared/PullToRefresh";
import CommentsSheet from "@/components/social/CommentsSheet";
import SafeCaption from "@/components/social/SafeCaption";
import ReelThumbnail from "@/components/social/ReelThumbnail";
import { resolveSharedOrigins, type SharedOriginInfo } from "@/lib/social/resolveSharedOrigins";
import { toUserPostInteractionId } from "@/lib/social/postInteraction";
import CreatorTiersSubscribe from "@/components/creator/CreatorTiersSubscribe";
import TopSupporters from "@/components/creator/TopSupporters";
import CreatorPPVStrip from "@/components/ppv/CreatorPPVStrip";
import { useAdultGate } from "@/hooks/useAdultGate";
import TipSheet from "@/components/social/TipSheet";
import { useSwipeDownClose } from "@/components/social/useSwipeDownClose";
import { SwipeGrabHandle } from "@/components/social/SwipeGrabHandle";
import { cn } from "@/lib/utils";
import { withRedirectParam } from "@/lib/authRedirect";
import { removePostBookmark, savePostBookmark } from "@/lib/social/postBookmarkManage";

const TopFans = lazy(() => import("@/components/social/TopFans"));
const ReportSheet = lazy(() => import("@/components/safety/ReportSheet"));

/** Fullscreen post overlay with swipe-down-to-close from header. */
function PublicPostOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: (startDrag: (e: React.PointerEvent) => void) => React.ReactNode;
}) {
  const { motionProps, startDrag } = useSwipeDownClose(onClose);
  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: "spring", damping: 30, stiffness: 320 }}
      {...motionProps}
      data-testid="public-post-overlay-body"
      className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col overflow-y-auto"
      style={{
        paddingTop: "max(var(--zivo-safe-top,0px), var(--zivo-safe-top-overlay, 60px))",
      }}
    >
      <SwipeGrabHandle
        onStartDrag={startDrag}
        onClose={onClose}
        tone="dark"
        testId="public-post-grab-handle"
      />
      {children(startDrag)}
    </motion.div>,
    document.body,
  );
}

type PostTab = "all" | "photos" | "videos";

type FullProfileCandidate = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cover_url: string | null;
  cover_position: number | null;
  profile_visibility: string | null;
  is_verified: boolean | null;
  share_code: string | null;
  is_of_creator?: boolean | null;
  updated_at: string | null;
};

type PublicProfileCandidate = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type ProfileCandidateBase = {
  id: string;
  user_id: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  updated_at?: string | null;
};

type LocalAdminCreatedAccount = {
  userId?: string;
  username?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  coverUrl?: string | null;
};

const ADMIN_CREATED_ACCOUNTS_STORAGE_KEY = "admin-user-accounts-session";

function rankProfileCandidate(candidate: ProfileCandidateBase, requestedId: string) {
  let score = 0;

  if (candidate.user_id === requestedId) score += 8;
  if (candidate.id === requestedId) score += 6;
  if (candidate.cover_url) score += 4;
  if (candidate.avatar_url) score += 2;
  if (candidate.full_name) score += 1;
  if (candidate.user_id) score += 1;

  return score;
}

function sortProfileCandidates<T extends ProfileCandidateBase>(candidates: T[], requestedId: string) {
  return [...candidates].sort((a, b) => {
    const scoreDiff = rankProfileCandidate(b, requestedId) - rankProfileCandidate(a, requestedId);
    if (scoreDiff !== 0) return scoreDiff;

    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTime - aTime;
  });
}

function pickFirstPresent<T>(candidates: T[], getter: (candidate: T) => unknown) {
  for (const candidate of candidates) {
    const value = getter(candidate);
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return null;
}

function resolveFullProfile(candidates: FullProfileCandidate[], requestedId: string) {
  if (!candidates.length) return null;

  const ranked = sortProfileCandidates(candidates, requestedId);
  const base = ranked[0];

  return {
    id: base.id,
    user_id: (pickFirstPresent(ranked, (candidate) => candidate.user_id) as string | null) ?? base.id,
    full_name: (pickFirstPresent(ranked, (candidate) => candidate.full_name) as string | null) ?? null,
    avatar_url: (pickFirstPresent(ranked, (candidate) => candidate.avatar_url) as string | null) ?? null,
    bio: (pickFirstPresent(ranked, (candidate) => candidate.bio) as string | null) ?? null,
    cover_url: (pickFirstPresent(ranked, (candidate) => candidate.cover_url) as string | null) ?? null,
    cover_position: (pickFirstPresent(ranked, (candidate) => candidate.cover_position) as number | null) ?? null,
    profile_visibility: (pickFirstPresent(ranked, (candidate) => candidate.profile_visibility) as string | null) ?? "public",
    is_verified: ranked.some((candidate) => candidate.is_verified === true)
      ? true
      : ((pickFirstPresent(ranked, (candidate) => candidate.is_verified) as boolean | null) ?? false),
    share_code: (pickFirstPresent(ranked, (candidate) => candidate.share_code) as string | null) ?? null,
    is_of_creator: ranked.some((candidate) => candidate.is_of_creator === true)
      ? true
      : ((pickFirstPresent(ranked, (candidate) => candidate.is_of_creator) as boolean | null) ?? false),
  };
}

function resolvePublicProfile(candidates: PublicProfileCandidate[], requestedId: string) {
  if (!candidates.length) return null;

  const ranked = sortProfileCandidates(candidates, requestedId);
  const base = ranked[0];

  return {
    id: base.id,
    user_id: (pickFirstPresent(ranked, (candidate) => candidate.user_id) as string | null) ?? base.id,
    full_name: (pickFirstPresent(ranked, (candidate) => candidate.full_name) as string | null) ?? null,
    avatar_url: (pickFirstPresent(ranked, (candidate) => candidate.avatar_url) as string | null) ?? null,
  };
}

function readLocalAdminCreatedAccount(userId: string) {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const stored =
      window.localStorage.getItem(ADMIN_CREATED_ACCOUNTS_STORAGE_KEY) ??
      window.sessionStorage.getItem(ADMIN_CREATED_ACCOUNTS_STORAGE_KEY);

    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return null;

    const account = (parsed as LocalAdminCreatedAccount[]).find(
      (candidate) => candidate?.userId === userId,
    );

    if (!account) return null;

    return {
      full_name: account.username?.trim() || null,
      avatar_url: account.avatarUrl?.trim() || null,
      bio: account.bio?.trim() || null,
      cover_url: account.coverUrl?.trim() || null,
    };
  } catch {
    return null;
  }
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const shareCodeFromUrl = searchParams.get("sc") || "";
  const postIdFromUrl = searchParams.get("post") || "";
  const source = (searchParams.get("from") || "").toLowerCase();
  const viewAs = (searchParams.get("as") || "").toLowerCase();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOFMode: zivoOFMode } = useZivoOFMode();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<null | { action: "cancel" | "unfriend" | "unfollow"; label: string }>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [postTab, setPostTab] = useState<PostTab>("all");
  const [commentPost, setCommentPost] = useState<any>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [blockingUser, setBlockingUser] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // OF creator age gate — persistent via useAdultGate (DB + localStorage)
  const adultGate = useAdultGate();
  const ofAgeConfirmed = adultGate.isConfirmed;

  const backTarget = useMemo(() => {
    if (source === "monetization") return "/monetization";
    if (source === "profile") return "/profile";
    return null;
  }, [source]);

  const handleBack = useCallback(() => {
    if (backTarget) {
      navigate(backTarget);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  }, [backTarget, navigate]);

  // Fetch profile with cover photo + bio
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const selectWithOfCreator =
        "id, user_id, full_name, avatar_url, bio, cover_url, cover_position, profile_visibility, is_verified, share_code, updated_at, is_of_creator";
      const selectWithoutOfCreator =
        "id, user_id, full_name, avatar_url, bio, cover_url, cover_position, profile_visibility, is_verified, share_code, updated_at";

      let { data, error } = await (supabase as any)
        .from("profiles")
        .select(selectWithOfCreator)
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .limit(10);

      const missingOfCreatorColumn =
        error?.code === "42703" ||
        String(error?.message || "").toLowerCase().includes("is_of_creator");

      if (missingOfCreatorColumn) {
        const retry = await (supabase as any)
          .from("profiles")
          .select(selectWithoutOfCreator)
          .or(`id.eq.${userId},user_id.eq.${userId}`)
          .limit(10);
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("Error loading public profile:", error);
      }

      const resolvedFullProfile = resolveFullProfile((data ?? []) as FullProfileCandidate[], userId);
      if (resolvedFullProfile) {
        return resolvedFullProfile;
      }

      // Fallback for logged-out viewers when profiles table is protected by RLS.
      const { data: publicProfiles, error: publicProfileError } = await (supabase as any)
        .from("public_profiles")
        .select("id, user_id, full_name, avatar_url")
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .limit(10);

      if (publicProfileError) {
        console.error("Error loading public profile fallback:", publicProfileError);
      }

      const publicProfile = resolvePublicProfile((publicProfiles ?? []) as PublicProfileCandidate[], userId);

      if (!publicProfile) return null;

      return {
        id: publicProfile.id,
        user_id: publicProfile.user_id || publicProfile.id,
        full_name: publicProfile.full_name,
        avatar_url: publicProfile.avatar_url,
        bio: null,
        cover_url: null,
        cover_position: null,
        profile_visibility: "public",
        is_verified: false,
        share_code: null,
        is_of_creator: false,
      };
    },
    enabled: !!userId,
  });

  // Fallback: resolve minimal profile via public view or edge function using share code.
  const { data: fallbackProfile, isLoading: fallbackProfileLoading } = useQuery({
    queryKey: ["public-profile-fallback", userId, shareCodeFromUrl],
    queryFn: async () => {
      if (!userId) return null;

      const { data: publicProfiles, error: publicProfileError } = await (supabase as any)
        .from("public_profiles")
        .select("id, user_id, full_name, avatar_url")
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .limit(10);

      if (publicProfileError) {
        console.error("Error loading public profile fallback cache:", publicProfileError);
      }

      const pub = resolvePublicProfile((publicProfiles ?? []) as PublicProfileCandidate[], userId);

      if (pub) {
        return {
          ...pub,
          bio: null,
          cover_url: null,
          cover_position: null,
          profile_visibility: "public",
          is_verified: false,
          share_code: shareCodeFromUrl || null,
          is_of_creator: false,
        };
      }

      if (!shareCodeFromUrl) return null;

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/profile-og?resolve=1&code=${encodeURIComponent(shareCodeFromUrl)}`);
        if (!res.ok) return null;
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return null;

        const json = await res.json();
        const fp = json?.profile;
        if (!fp) return null;

        return {
          ...fp,
          bio: fp?.bio ?? null,
          cover_position: null,
          profile_visibility: "public",
          is_verified: false,
        };
      } catch {
        return null;
      }
    },
    enabled: !!userId && !profile,
  });

  const localAdminCreatedAccount = useMemo(
    () => (userId ? readLocalAdminCreatedAccount(userId) : null),
    [userId],
  );

  const resolvedProfile: any = useMemo(() => {
    const baseProfile = profile || fallbackProfile;

    if (!baseProfile && !localAdminCreatedAccount) return null;

    return {
      id: baseProfile?.id || userId || "",
      user_id: baseProfile?.user_id || userId || "",
      full_name: baseProfile?.full_name || localAdminCreatedAccount?.full_name || "User",
      avatar_url: baseProfile?.avatar_url || localAdminCreatedAccount?.avatar_url || null,
      bio: baseProfile?.bio ?? localAdminCreatedAccount?.bio ?? null,
      cover_url: baseProfile?.cover_url || localAdminCreatedAccount?.cover_url || null,
      cover_position: baseProfile?.cover_position ?? 50,
      profile_visibility: baseProfile?.profile_visibility || "public",
      is_verified: baseProfile?.is_verified || false,
      share_code: baseProfile?.share_code || null,
    };
  }, [fallbackProfile, localAdminCreatedAccount, profile, userId]);

  const targetUserId = resolvedProfile?.user_id || resolvedProfile?.id || userId || "";
  const isSameAsSignedInUser = !!user?.id && !!targetUserId && user.id === targetUserId;
  const isVisitorPreview = isSameAsSignedInUser && viewAs === "visitor";
  const isOwnProfile = isSameAsSignedInUser && !isVisitorPreview;

  const { data: friendshipStatus = "none" } = useQuery({
    queryKey: ["friendship-status", targetUserId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_friendship_status", { target_user_id: targetUserId });
      return (data as string) || "none";
    },
    enabled: !!targetUserId && !!user && !isSameAsSignedInUser,
  });

  const visibility = resolvedProfile?.profile_visibility || "public";
  const isFriend = friendshipStatus === "friends";
  const isLocked = !isOwnProfile && (
    visibility === "private" || (visibility === "friends" && !isFriend)
  );

  // Fetch user posts with shared origin info
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["public-profile-posts", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data } = await (supabase as any)
        .from("user_posts")
        .select("id, media_url, media_urls, media_type, caption, likes_count, comments_count, views_count, shares_count, created_at, shared_from_post_id, shared_from_user_id")
        .eq("user_id", targetUserId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (!data) return [];

      const sharedPostIds = data
        .map((post: any) => post.shared_from_post_id)
        .filter(Boolean) as string[];
      const sharedUserIds = data
        .map((post: any) => post.shared_from_user_id)
        .filter(Boolean) as string[];
      const postIds = data.map((post: any) => post.id).filter(Boolean) as string[];

      const [
        { originByPostId, originByUserId },
        { data: postMediaRows },
      ] = await Promise.all([
        resolveSharedOrigins({
          sharedPostIds,
          sharedUserIds,
        }),
        postIds.length
          ? (supabase as any)
              .from("post_media")
              .select("post_id, media_url, sort_order")
              .in("post_id", postIds)
              .order("sort_order", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const postMediaMap = new Map<string, string[]>();
      (postMediaRows || []).forEach((row: any) => {
        if (!row?.post_id || !row?.media_url) return;
        const existing = postMediaMap.get(row.post_id) || [];
        existing.push(row.media_url);
        postMediaMap.set(row.post_id, existing);
      });

      return data.map((post: any) => ({
        ...post,
        media_urls: (postMediaMap.get(post.id)?.length ? postMediaMap.get(post.id) : null) ||
          (Array.isArray(post.media_urls) && post.media_urls.length > 0
            ? post.media_urls
            : post.media_url
              ? [post.media_url]
              : []),
        sharedOrigin: (post.shared_from_post_id ? originByPostId[post.shared_from_post_id] || null : null) ||
          (post.shared_from_user_id ? originByUserId[post.shared_from_user_id] || null : null) as SharedOriginInfo | null,
      }));
    },
    enabled: !!targetUserId && !isLocked,
  });

  // Counts
  const { data: followerCount = 0 } = useQuery({
    queryKey: ["follower-count", targetUserId],
    queryFn: async () => { const { data } = await supabase.rpc("get_follower_count", { target_user_id: targetUserId }); return data || 0; },
    enabled: !!targetUserId,
  });
  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following-count", targetUserId],
    queryFn: async () => { const { data } = await supabase.rpc("get_following_count", { target_user_id: targetUserId }); return data || 0; },
    enabled: !!targetUserId,
  });
  const { data: friendCount = 0 } = useQuery({
    queryKey: ["friend-count", targetUserId],
    queryFn: async () => { const { data } = await supabase.rpc("get_friend_count", { target_user_id: targetUserId }); return data || 0; },
    enabled: !!targetUserId,
  });
  const { data: isFollowing = false } = useQuery({
    queryKey: ["is-following", targetUserId],
    queryFn: async () => { const { data } = await supabase.rpc("is_following", { target_user_id: targetUserId }); return data || false; },
    enabled: !!targetUserId && !!user && !isSameAsSignedInUser,
  });

  // Mutual followers — "Followed by Alice + 3 others". Self-hides when
  // the visitor has no overlap, when this is their own profile, or when
  // the profile is locked.
  const mutualTargets = (!isSameAsSignedInUser && !isLocked && targetUserId) ? [targetUserId] : [];
  const { data: mutualMap } = useMutualFollows(mutualTargets);
  const mutual = mutualMap?.get(targetUserId);
  const canMessageProfile = friendshipStatus === "friends";

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user || !targetUserId || user.id === targetUserId) throw new Error("Invalid");
      if (isFollowing) {
        const { error } = await supabase.functions.invoke("follow-manage", {
          body: { action: "unfollow", following_id: targetUserId },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.functions.invoke("follow-manage", {
          body: { action: "follow", following_id: targetUserId },
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["follower-count", targetUserId] });
      toast.success(isFollowing ? "Unfollowed" : "Following!");
    },
    onError: (err: any) => toast.error(err?.message || "Something went wrong"),
  });

  // Friend mutation
  const friendMutation = useMutation({
    mutationFn: async (action: "add" | "cancel" | "accept" | "unfriend") => {
      if (!user || !targetUserId || user.id === targetUserId) throw new Error("Invalid");
      if (action === "add") {
        const { error } = await supabase.functions.invoke("friendship-manage", {
          body: { action: "send", friend_id: targetUserId },
        });
        if (error) throw error;
      } else if (action === "cancel" || action === "unfriend") {
        const { error } = await supabase.functions.invoke("friendship-manage", {
          body: { action, friend_id: targetUserId },
        });
        if (error) throw error;
      } else if (action === "accept") {
        const { error } = await supabase.functions.invoke("friendship-manage", {
          body: { action: "accept", friend_id: targetUserId },
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["friendship-status", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["friend-count", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["is-following", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["follower-count", targetUserId] });
      toast.success({ add: "Friend request sent!", cancel: "Request cancelled", accept: "Friend added!", unfriend: "Unfriended" }[action]);
    },
    onError: (err: any) => toast.error(err?.message || "Something went wrong"),
  });

  const isLoading = profileLoading || fallbackProfileLoading || (!isLocked && postsLoading);
  const initials = (resolvedProfile?.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const getFriendButton = () => {
    switch (friendshipStatus) {
      case "friends": return { label: "Friends", icon: UserCheck, action: "unfriend" as const };
      case "request_sent": return { label: "Requested", icon: UserX, action: "cancel" as const };
      case "request_received": return { label: "Accept", icon: UserPlus, action: "accept" as const };
      default: return { label: "Add Friend", icon: UserPlus, action: "add" as const };
    }
  };
  const friendBtn = getFriendButton();

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["public-profile", userId] }),
      queryClient.invalidateQueries({ queryKey: ["public-profile-posts", targetUserId] }),
    ]);
  }, [queryClient, targetUserId, userId]);

  const buildShareUrl = useCallback((postId?: string) => {
    const shareCode = resolvedProfile?.share_code || shareCodeFromUrl || "";
    const fallbackProfileId = targetUserId || userId;
    if (shareCode) {
      return postId
        ? `${getProfileShareUrl(shareCode)}&post=${encodeURIComponent(postId)}`
        : getProfileShareUrl(shareCode);
    }
    if (fallbackProfileId) {
      return postId
        ? `${getPublicOrigin()}/user/${fallbackProfileId}?post=${encodeURIComponent(postId)}`
        : `${getPublicOrigin()}/user/${fallbackProfileId}`;
    }
    return getPublicOrigin();
  }, [resolvedProfile?.share_code, shareCodeFromUrl, targetUserId, userId]);

  const handleShare = async () => {
    const url = buildShareUrl();
    const brand = zivoOFMode ? "ZIVO OF" : "ZIVO";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${resolvedProfile?.full_name || "User"} on ${brand}`, url });
        return;
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return; // user cancelled
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied!");
    } catch {
      // Final fallback for restricted contexts
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Profile link copied!");
    }
  };

  const handleReportProfile = () => {
    setShowProfileMenu(false);
    if (!user) {
      navigate(withRedirectParam("/login", window.location.pathname + window.location.search));
      return;
    }
    setReportOpen(true);
  };

  const handleBlockProfile = async () => {
    if (!user) {
      toast.error("Sign in to block users");
      navigate(withRedirectParam("/login", window.location.pathname + window.location.search));
      return;
    }
    if (!targetUserId || targetUserId === user.id) {
      toast.error("Cannot block this profile");
      return;
    }

    setBlockingUser(true);
    try {
      const { error } = await supabase.functions.invoke("block-user-manage", {
        body: { action: "block", blocked_id: targetUserId },
      });

      if (error) throw error;

      setShowProfileMenu(false);
      toast.success("User blocked");
      navigate("/chat/blocked");
    } catch (error: any) {
      toast.error(error?.message || "Could not block user");
    } finally {
      setBlockingUser(false);
    }
  };

  const handleSharePost = async (post: any) => {
    const url = buildShareUrl(post?.id);
    const brand = zivoOFMode ? "ZIVO OF" : "ZIVO";
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${resolvedProfile?.full_name || "User"} on ${brand}`,
          text: post?.caption || `Check out this post on ${brand}`,
          url,
        });
        return;
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Post link copied!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Post link copied!");
    }
  };

  const handleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  };

  useEffect(() => {
    let alive = true;

    const loadBookmarkedPosts = async () => {
      if (!user?.id) {
        if (alive) setBookmarkedPosts(new Set());
        return;
      }

      const interactionIds = posts.map((post: any) => toUserPostInteractionId(post.id));
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
  }, [posts, user?.id]);

  useEffect(() => {
    if (!postIdFromUrl || !posts.length) return;
    const matchedPost = posts.find((post: any) => post.id === postIdFromUrl);
    if (matchedPost) {
      setSelectedPost(matchedPost);
    }
  }, [postIdFromUrl, posts]);

  const handleBookmark = async (post: any) => {
    if (!user?.id) {
      toast.error("Please sign in to bookmark posts");
      return;
    }

    const interactionId = toUserPostInteractionId(post.id);
    const rawPostId = post.id.replace(/^u-/, "");
    const wasBookmarked = bookmarkedPosts.has(interactionId);

    setBookmarkedPosts((prev) => {
      const next = new Set(prev);
      if (wasBookmarked) next.delete(interactionId);
      else next.add(interactionId);
      return next;
    });

    try {
      if (wasBookmarked) {
        const { error } = await removePostBookmark({
          post_id: rawPostId,
          source: "user",
          sync_legacy: true,
          legacy_item_id: interactionId,
        });

        if (error) throw error;
        toast.success("Removed from bookmarks");
      } else {
        const { error } = await savePostBookmark({
          post_id: rawPostId,
          source: "user",
          sync_legacy: true,
          legacy_item_id: interactionId,
          collection_name: "Posts",
        });

        if (error) throw error;
        toast.success("Saved to bookmarks");
      }
    } catch (error: any) {
      setBookmarkedPosts((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.add(interactionId);
        else next.delete(interactionId);
        return next;
      });
      toast.error(error?.message || "Bookmark failed");
    }
  };

  // Filter posts
  const filteredPosts = posts.filter((post: any) => {
    if (postTab === "photos") return post.media_type === "image";
    if (postTab === "videos") return post.media_type === "video";
    return true;
  });
  const photoCount = posts.filter((p: any) => p.media_type === "image").length;
  const videoCount = posts.filter((p: any) => p.media_type === "video").length;

  const getPrivacyInfo = () => {
    if (visibility === "private") return { icon: Lock, title: "This Account is Private", description: "This user has set their profile to private.", showAddFriend: false };
    return { icon: Users, title: "Friends Only", description: `Only friends can see ${resolvedProfile?.full_name || "this user"}'s posts.`, showAddFriend: friendshipStatus === "none" || friendshipStatus === "request_received" };
  };

  const formatTime = (dateStr: string) => {
    try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); } catch { return ""; }
  };

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const renderImageGrid = (urlsInput: any, post: any) => {
    const urls: string[] = Array.isArray(urlsInput)
      ? urlsInput.filter(Boolean)
      : typeof urlsInput === "string" && urlsInput.trim()
        ? [urlsInput]
        : post?.media_url
          ? [post.media_url]
          : [];

    const openViewer = (idx: number) => {
      setSelectedImageIndex(idx);
      setSelectedPost(post);
    };

    if (urls.length === 0) return null;

    if (urls.length === 1) {
      return (
        <div className="relative w-full aspect-square cursor-pointer max-h-[70vh] mx-auto" onClick={() => openViewer(0)}>
          <img src={urls[0]} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        </div>
      );
    }

    if (urls.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-0.5 w-full aspect-[2/1] max-h-[60vh] mx-auto">
          {urls.map((u, i) => (
            <div key={i} className="relative bg-black overflow-hidden cursor-pointer" onClick={() => openViewer(i)}>
              <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      );
    }

    if (urls.length === 3) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full aspect-square md:aspect-[3/2]">
          <div className="relative row-span-2 bg-black overflow-hidden cursor-pointer" onClick={() => openViewer(0)}>
            <img src={urls[0]} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          </div>
          <div className="relative bg-black overflow-hidden cursor-pointer" onClick={() => openViewer(1)}>
            <img src={urls[1]} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          </div>
          <div className="relative bg-black overflow-hidden cursor-pointer" onClick={() => openViewer(2)}>
            <img src={urls[2]} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-[3px] w-full aspect-square overflow-hidden rounded-lg">
        {urls.slice(0, 4).map((u, i) => (
          <div key={i} className="relative bg-muted overflow-hidden cursor-pointer" onClick={() => openViewer(i)}>
            <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            {i === 3 && urls.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{urls.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const profileName = resolvedProfile?.full_name || resolvedProfile?.username || "Profile";
  const brand = zivoOFMode ? "ZIVO OF" : "ZIVO";
  const profileBio = resolvedProfile?.bio || (zivoOFMode
    ? `Subscribe to ${profileName} on ZIVO OF for exclusive content.`
    : `Follow ${profileName} on ZIVO for travel, lifestyle, and more.`);
  const profileAvatar = resolvedProfile?.avatar_url || undefined;
  const profileStats = [
    { label: "Followers", value: isLocked ? "—" : formatCount(followerCount) ?? "0" },
    { label: "Following", value: isLocked ? "—" : formatCount(followingCount) ?? "0" },
    { label: "Posts", value: isLocked ? "—" : formatCount(posts.length) ?? "0" },
    { label: "Friends", value: isLocked ? "—" : formatCount(friendCount) ?? "0" },
  ];
  const postTabs = [
    { key: "all" as PostTab, icon: Grid3X3, label: "Posts", count: posts.length },
    { key: "photos" as PostTab, icon: ImageIcon, label: "Photos", count: photoCount },
    { key: "videos" as PostTab, icon: Film, label: "Videos", count: videoCount },
  ];

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="zivo-shell-mobile bg-background pb-[calc(4.25rem+var(--zivo-safe-bottom,0px))]">
      <SEOHead
        title={`${profileName} – ${brand}`}
        description={profileBio}
        ogImage={profileAvatar}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "name": profileName,
          "description": profileBio,
        }}
      />
      {/* Desktop NavBar */}
      <div className="hidden lg:block sticky top-0 z-[1200]">
        <NavBar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-[1200] border-b border-border/60 bg-background/88 backdrop-blur-2xl">
        <div
          className="mx-auto flex max-w-3xl items-center gap-2 px-3 pb-2"
          style={{ paddingTop: "max(0.5rem, var(--zivo-safe-top, 0px))" }}
        >
          <button type="button" onClick={handleBack} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-card/90 shadow-sm active:scale-95 transition">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold text-foreground">{resolvedProfile?.full_name || "Profile"}</h1>
            <p className="truncate text-[11px] font-medium text-muted-foreground">Public profile</p>
          </div>
          <button type="button" onClick={handleShare} aria-label="Share profile" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-card/90 shadow-sm active:scale-95 transition">
            <Share2 className="h-5 w-5 text-foreground" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              aria-label="Profile actions"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/60 bg-card/90 shadow-sm active:scale-95 transition"
            >
              <MoreHorizontal className="h-5 w-5 text-foreground" />
            </button>
            {showProfileMenu && (
              <>
                <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                  <button type="button" onClick={handleShare} className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/60">Share profile</button>
                  {!isOwnProfile && (
                    <>
                      <button type="button" onClick={handleReportProfile} className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/60">Report profile</button>
                      <button
                        type="button"
                        onClick={() => void handleBlockProfile()}
                        disabled={blockingUser}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-destructive hover:bg-muted/60 disabled:opacity-60"
                      >
                        {blockingUser ? "Blocking..." : "Block user"}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-60"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !resolvedProfile ? (
        <div className="flex flex-col items-center justify-center h-60 text-muted-foreground"><User className="h-10 w-10 mb-2" /><p className="text-sm">Profile not found</p></div>
      ) : (
        <>
          {/* OF Creator Age Gate */}
          {(resolvedProfile as any).is_of_creator && !ofAgeConfirmed && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-card border border-rose-500/40 rounded-2xl max-w-sm w-full p-6 flex flex-col items-center gap-4 text-center shadow-2xl">
                <span className="text-5xl">🔞</span>
                <h2 className="text-xl font-bold text-foreground">18+ Content</h2>
                <p className="text-sm text-muted-foreground">This profile belongs to an OF Creator and may contain adult content. You must be 18 or older to view it.</p>
                <div className="flex gap-3 w-full mt-2">
                  <button onClick={() => navigate(-1)} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">Go back</button>
                  <button onClick={() => void adultGate.confirm()} className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors">I am 18+</button>
                </div>
              </div>
            </div>
          )}
          <div className="mx-auto max-w-3xl px-3 pt-3">
            <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <div className="relative h-44 overflow-hidden bg-[radial-gradient(circle_at_18%_15%,rgba(249,115,22,0.28),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(20,184,166,0.24),transparent_30%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))] sm:h-56">
                {resolvedProfile.cover_url ? (
                  <img
                    src={resolvedProfile.cover_url}
                    alt="Cover"
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: `center ${resolvedProfile.cover_position ?? 50}%` }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid h-24 w-24 place-items-center rounded-[2rem] border border-foreground/10 bg-background/55 shadow-inner backdrop-blur">
                      <Camera className="h-9 w-9 text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
                {isVisitorPreview && (
                  <div className="absolute left-3 top-3 rounded-full border border-white/30 bg-black/35 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                    Visitor preview
                  </div>
                )}
              </div>

              <div className="relative px-4 pb-4 pt-0">
                <Avatar className="-mt-14 h-28 w-28 border-[5px] border-card shadow-xl">
                  <AvatarImage src={resolvedProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-3xl font-extrabold text-muted-foreground">{initials}</AvatarFallback>
                </Avatar>

                <div className="mt-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-[30px] font-black leading-tight tracking-tight text-foreground sm:text-4xl">
                      <span className="min-w-0 truncate">{resolvedProfile.full_name}</span>
                      {isBlueVerified(resolvedProfile.is_verified) && <VerifiedBadge size={24} />}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {resolvedProfile.bio ? (
                        <span className="line-clamp-3 whitespace-pre-wrap break-words"><SafeCaption text={resolvedProfile.bio} /></span>
                      ) : (
                        `Public ${brand} profile`
                      )}
                    </p>
                  </div>
                </div>

                {!zivoOFMode && (
                  <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-2xl border border-border/70 bg-muted/25">
                    {profileStats.map((stat) => (
                      <div key={stat.label} className="border-r border-border/60 px-2 py-3 text-center last:border-r-0">
                        <p className="text-[17px] font-black leading-none text-foreground">{stat.value}</p>
                        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <MutualFollowsBadge mutual={mutual} className="mt-2 text-left text-[11px]" />

                {!isOwnProfile && user && (
                  <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
                    {!zivoOFMode && (
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => { if (isFollowing) { setConfirmAction({ action: "unfollow", label: `Unfollow ${resolvedProfile?.full_name}?` }); } else { followMutation.mutate(); } }} disabled={followMutation.isPending}
                        className={cn("flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-extrabold shadow-sm transition", isFollowing ? "border border-border bg-muted text-foreground" : "bg-ig-gradient text-white")}>
                        {followMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={cn("h-4 w-4", isFollowing && "fill-primary text-primary")} />}
                        <span className="truncate">{followMutation.isPending ? "Updating" : isFollowing ? "Following" : "Follow"}</span>
                      </motion.button>
                    )}
                    {!zivoOFMode && (
                      <motion.button whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          if (friendBtn.action === "cancel") setConfirmAction({ action: "cancel", label: "Cancel this friend request?" });
                          else if (friendBtn.action === "unfriend") setConfirmAction({ action: "unfriend", label: `Unfriend ${resolvedProfile?.full_name}?` });
                          else friendMutation.mutate(friendBtn.action);
                        }}
                        disabled={friendMutation.isPending}
                        className={cn(
                          "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2 text-sm font-extrabold transition",
                          friendshipStatus === "friends" ? "border-primary/30 bg-primary/10 text-primary"
                            : friendshipStatus === "request_sent" ? "border-border bg-muted text-muted-foreground"
                            : friendshipStatus === "request_received" ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground"
                        )}>
                        {friendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <friendBtn.icon className="h-4 w-4" />}
                        <span className="truncate">{friendMutation.isPending ? "Updating" : friendBtn.label}</span>
                      </motion.button>
                    )}
                    <motion.button whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        if (!user) { toast.error("Sign in to tip"); navigate(withRedirectParam("/login", window.location.pathname + window.location.search)); return; }
                        setTipOpen(true);
                      }}
                      aria-label={`Send a tip to ${resolvedProfile?.full_name || "this creator"}`}
                      className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md transition hover:opacity-95">
                      <Gift className="h-5 w-5" />
                    </motion.button>
                  </div>
                )}
                {!isOwnProfile && user && canMessageProfile && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/chat`, {
                      state: {
                        openChat: {
                          recipientId: targetUserId,
                          recipientName: resolvedProfile?.full_name || "User",
                          recipientAvatar: resolvedProfile?.avatar_url,
                        },
                      },
                    })}
                    className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-extrabold text-foreground"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </motion.button>
                )}
                {isOwnProfile && (
                  <div className="mt-4 grid grid-cols-[1fr_48px] gap-2">
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate("/account/profile-edit")} className="h-12 rounded-2xl border border-border bg-card text-sm font-extrabold text-foreground">Edit Profile</motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={handleShare} className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card text-foreground"><Share2 className="h-5 w-5" /></motion.button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Top fans — only on own profile, self-hides when no engagement signal. */}
          {isOwnProfile && targetUserId && (
            <div className="px-4 mt-4 max-w-3xl mx-auto w-full">
              <Suspense fallback={null}>
                <TopFans creatorId={targetUserId} />
              </Suspense>
            </div>
          )}

          {/* Locked */}
          {isLocked ? (
            <div className="px-4 mt-2 max-w-3xl mx-auto">
              <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl bg-muted/30 border border-border/40">
                {(() => { const p = getPrivacyInfo(); return (<>
                  <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center mb-4"><p.icon className="h-7 w-7 text-muted-foreground" /></div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">{p.title}</h3>
                  <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[260px]">{p.description}</p>
                  {p.showAddFriend && !isOwnProfile && user && (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => friendMutation.mutate(friendshipStatus === "request_received" ? "accept" : "add")} disabled={friendMutation.isPending}
                      className="mt-5 h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />{friendshipStatus === "request_received" ? "Accept Friend Request" : "Send Friend Request"}
                    </motion.button>
                  )}
                  {friendshipStatus === "request_sent" && <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Friend request sent</p>}
                </>); })()}
              </div>
            </div>
          ) : (
            <>
              {/* Top supporters strip */}
              {targetUserId && <TopSupporters creatorId={targetUserId} />}

              {/* Creator subscription tiers */}
              {targetUserId && (
                <CreatorTiersSubscribe
                  creatorId={targetUserId}
                  creatorName={resolvedProfile?.full_name || undefined}
                  isOwnProfile={isOwnProfile}
                />
              )}

              {/* PPV strip — locked content a creator has published */}
              {targetUserId && <CreatorPPVStrip creatorUserId={targetUserId} />}

              {/* Content Tabs */}
              <div className="mx-auto mt-4 max-w-3xl px-3">
                <div className="grid grid-cols-3 gap-1 rounded-[22px] border border-border/70 bg-card p-1 shadow-sm">
                  {postTabs.map((tab) => (
                    <button type="button" key={tab.key} onClick={() => setPostTab(tab.key)}
                      className={cn(
                        "relative flex h-12 items-center justify-center gap-1.5 rounded-2xl text-xs font-extrabold transition",
                        postTab === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}>
                      {postTab === tab.key && <motion.div layoutId="profile-tab-indicator" className="absolute inset-0 rounded-2xl bg-muted shadow-inner" />}
                      <tab.icon className="relative z-10 h-4 w-4" />
                      <span className="relative z-10">{tab.label}</span>
                      <span className={cn(
                        "relative z-10 rounded-full px-1.5 py-0.5 text-[10px]",
                        postTab === tab.key ? "bg-background text-foreground" : "bg-muted text-muted-foreground"
                      )}>{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Posts */}
              {filteredPosts.length === 0 ? (
                <div className="mx-auto mb-8 mt-3 max-w-3xl px-3">
                  <div className="overflow-hidden rounded-[28px] border border-border bg-card p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <div className="relative overflow-hidden rounded-[24px] bg-muted/45 px-4 py-5">
                      <div aria-hidden="true" className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
                      <div aria-hidden="true" className="absolute -bottom-14 -left-12 h-36 w-36 rounded-full bg-orange-500/10 blur-2xl" />
                      <div className="relative mx-auto mb-4 grid h-40 max-w-sm grid-cols-3 gap-2">
                        <div className="mt-8 h-24 rotate-[-7deg] rounded-3xl border border-border/60 bg-background shadow-sm" />
                        <div className="h-36 rounded-[2rem] border border-border/60 bg-background p-2 shadow-sm">
                          <div className="grid h-full place-items-center rounded-[1.5rem] bg-muted/65">
                            <ImageIcon className="h-7 w-7 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="mt-10 h-24 rotate-[7deg] rounded-3xl border border-border/60 bg-background shadow-sm" />
                        <div className="absolute bottom-2 left-1/2 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full border border-border bg-background shadow-lg">
                          <Play className="ml-0.5 h-6 w-6 fill-current text-foreground" />
                        </div>
                      </div>
                      <p className="relative text-center text-lg font-black text-foreground">No {postTab === "all" ? "posts" : postTab} yet</p>
                      <p className="relative mx-auto mt-1 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
                        New photos, videos, and updates from {resolvedProfile.full_name} will appear here.
                      </p>
                    </div>
                  </div>
                </div>
              ) : postTab === "all" ? (
                /* Feed-style view for "All" tab */
                <div className="divide-y divide-border/30 max-w-3xl mx-auto">
                  {filteredPosts.map((post: any) => (
                    <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card">
                      {post.sharedOrigin ? (
                        /* ── Facebook-style shared post layout ── */
                        <>
                          {/* Sharer header */}
                          <div className="flex items-center gap-2.5 px-3 py-2.5">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={resolvedProfile.avatar_url || undefined} />
                              <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground truncate">{resolvedProfile.full_name}</p>
                              <div className="flex items-center gap-1">
                                <p className="text-[10px] text-muted-foreground">{formatTime(post.created_at)}</p>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                              </div>
                            </div>
                          </div>

                          {/* Sharer's own caption */}
                          {post.caption && post.caption !== post.sharedOrigin.caption && (
                            <div className="px-3 pb-2">
                              <p className="text-[13px] text-foreground"><SafeCaption text={post.caption} /></p>
                            </div>
                          )}

                          {/* Embedded original post card */}
                          <div className="mx-3 mb-2 border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm">
                            {/* Original author header */}
                            <div className="flex items-center px-3 py-2.5">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <Avatar className="h-9 w-9 shrink-0">
                                  <AvatarImage src={post.sharedOrigin.avatar} />
                                  <AvatarFallback className="text-[10px]">{post.sharedOrigin.name?.[0] || "S"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-[13px] font-semibold text-foreground truncate">{post.sharedOrigin.name}</p>
                                  <div className="flex items-center gap-1">
                                    <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                              {post.sharedOrigin?.userId && post.sharedOrigin.userId !== user?.id && post.sharedOrigin.userId !== targetUserId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/user/${post.sharedOrigin.userId}`);
                                  }}
                                  className="text-primary text-[13px] font-semibold ml-2 shrink-0"
                                >
                                  Follow
                                </button>
                              )}
                            </div>

                            {/* Original post caption */}
                            {post.sharedOrigin.caption && (
                              <div className="px-3 pb-2">
                                <p className="text-[13px] text-foreground">{post.sharedOrigin.caption}</p>
                              </div>
                            )}

                            {/* Original post media */}
                            {(() => {
                              const urls = Array.isArray(post.media_urls) && post.media_urls.length > 0
                                ? post.media_urls
                                : post.media_url
                                  ? [post.media_url]
                                  : [];
                              if (!urls.length) return null;
                              if (post.media_type === "video") {
                                return (
                                  <div className="relative w-full flex justify-center bg-muted overflow-hidden" onClick={() => navigate(`/reels/${post.id}`)}>
                                    <div className="relative w-full max-w-md mx-auto aspect-[9/16] max-h-[500px] rounded-xl overflow-hidden bg-black">
                                      <ReelThumbnail url={urls[0]} />
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div className="w-full bg-muted overflow-hidden">
                                  {renderImageGrid(urls, post)}
                                </div>
                              );
                            })()}
                          </div>
                        </>
                      ) : (
                        /* ── Normal post layout ── */
                        <>
                          {/* Post header */}
                          <div className="flex items-center gap-2.5 px-3 py-2.5">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={resolvedProfile.avatar_url || undefined} />
                              <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground truncate">{resolvedProfile.full_name}</p>
                              <div className="flex items-center gap-1">
                                <p className="text-[10px] text-muted-foreground">{formatTime(post.created_at)}</p>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <Globe className="h-2.5 w-2.5 text-muted-foreground" />
                              </div>
                            </div>
                          </div>

                          {/* Caption */}
                          {post.caption && (
                            <div className="px-3 pb-2">
                              <p className="text-[13px] text-foreground">
                                <span className="font-semibold mr-1">{resolvedProfile.full_name}</span>
                                {post.caption}
                              </p>
                            </div>
                          )}

                          {/* Media */}
                          {(() => {
                            const urls = Array.isArray(post.media_urls) && post.media_urls.length > 0
                              ? post.media_urls
                              : post.media_url
                                ? [post.media_url]
                                : [];
                            if (!urls.length) return null;
                            if (post.media_type === "video") {
                              return (
                                <div className="relative w-full flex justify-center bg-muted overflow-hidden" onClick={() => navigate(`/reels/${post.id}`)}>
                                  <div className="relative w-full max-w-md mx-auto aspect-[9/16] max-h-[500px] rounded-xl overflow-hidden bg-black">
                                    <ReelThumbnail url={urls[0]} />
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="w-full bg-muted overflow-hidden">
                                {renderImageGrid(urls, post)}
                              </div>
                            );
                          })()}
                        </>
                      )}

                      {/* Interaction bar */}
                      <div className="flex items-center px-4 py-2.5">
                        <div className="flex items-center gap-4 flex-1">
                          <button type="button" aria-label="Like post" title="Like post" onClick={() => handleLike(post.id)} className="touch-manipulation active:scale-90 transition-transform">
                            <Heart className={`h-[22px] w-[22px] ${likedPosts.has(post.id) ? "fill-red-500 text-red-500" : "text-foreground"}`} strokeWidth={1.5} />
                          </button>
                          <button type="button" aria-label="Open comments" title="Open comments" onClick={() => setCommentPost(post)} className="touch-manipulation active:scale-90 transition-transform">
                            <MessageCircle className="h-[22px] w-[22px] text-foreground" strokeWidth={1.5} />
                          </button>
                          <button type="button" aria-label="Share post" title="Share post" onClick={() => void handleSharePost(post)} className="touch-manipulation active:scale-90 transition-transform">
                            <Share2 className="h-[22px] w-[22px] text-foreground" strokeWidth={1.5} />
                          </button>
                        </div>
                        <button type="button" aria-label="Bookmark post" title="Bookmark post" onClick={() => void handleBookmark(post)} className="touch-manipulation active:scale-90 transition-transform">
                          <Bookmark className={`h-[22px] w-[22px] ${bookmarkedPosts.has(toUserPostInteractionId(post.id)) ? "fill-foreground text-foreground" : "text-foreground"}`} strokeWidth={1.5} />
                        </button>
                      </div>

                      {/* Engagement counts */}
                      {(post.likes_count > 0 || post.comments_count > 0) && (
                        <div className="px-4 pb-3 flex items-center gap-3">
                          {post.likes_count > 0 && <span className="text-xs font-semibold text-foreground">{post.likes_count} {post.likes_count === 1 ? "like" : "likes"}</span>}
                          {post.comments_count > 0 && <span className="text-xs text-muted-foreground">{post.comments_count} {post.comments_count === 1 ? "comment" : "comments"}</span>}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* Grid view for Photos/Videos tabs */
                <div className={`grid gap-1 mt-0.5 px-1 max-w-3xl mx-auto ${postTab === "videos" ? "grid-cols-2" : "grid-cols-3"}`}>
                  {filteredPosts.map((post: any) => (
                    <motion.button
                      key={post.id}
                      data-testid={`public-post-thumb-${post.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => {
                        if (post.media_type === "video") {
                          navigate(`/reels/${post.id}`);
                        } else {
                          setSelectedPost(post);
                        }
                      }}
                      className={`relative overflow-hidden bg-muted group ${postTab === "videos" ? "aspect-[9/16] rounded-lg" : "aspect-square"}`}
                    >
                      {post.media_type === "video" ? (
                        <ReelThumbnail url={post.media_url} />
                      ) : (
                        <img src={(post.media_urls?.length ? post.media_urls[0] : post.media_url) || ""} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      )}
                      {post.media_urls?.length > 1 && post.media_type !== "video" && (
                        <div className="absolute top-1.5 right-1.5 bg-black/60 rounded px-1.5 py-0.5 z-10">
                          <span className="text-[10px] text-white font-semibold">{post.media_urls.length}</span>
                        </div>
                      )}
                      {post.views_count > 0 && (
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 z-10">
                          <Eye className="h-3 w-3 text-white drop-shadow" />
                          <span className="text-[10px] text-white font-semibold drop-shadow">{post.views_count}</span>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Post detail overlay — Instagram-style */}
              <AnimatePresence>
                {selectedPost && selectedPost.media_type !== "video" && (
                  <PublicPostOverlay onClose={() => setSelectedPost(null)}>
                    {(startDrag) => (
                      <>
                        {/* Header bar — relies on the overlay's outer paddingTop
                            for safe-area clearance instead of position:sticky,
                            which is brittle inside framer-motion transformed
                            ancestors. */}
                        <div
                          className="z-10 flex items-center gap-3 px-4 py-2 bg-background/80 backdrop-blur-lg border-b border-border cursor-grab active:cursor-grabbing select-none shrink-0 touch-none"
                          onPointerDown={(e) => {
                            const target = e.target as HTMLElement | null;
                            if (target?.closest("button, a, input, textarea")) return;
                            startDrag(e);
                          }}
                        >
                          <button type="button" aria-label="Close post" title="Close post" onClick={() => setSelectedPost(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2">
                            <ArrowLeft className="h-5 w-5 text-foreground" />
                          </button>
                          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                            <AvatarImage src={resolvedProfile.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{resolvedProfile.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">{formatTime(selectedPost.created_at)}</p>
                          </div>
                          <button type="button" aria-label="Share post" title="Share post" onClick={(e) => { e.stopPropagation(); void handleSharePost(selectedPost); }} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <Share2 className="h-5 w-5 text-foreground" />
                          </button>
                        </div>

                    {/* Media — constrained on larger screens */}
                    <div className="w-full max-w-3xl mx-auto bg-black">
                      {(() => {
                        const urls = selectedPost.media_urls?.length ? selectedPost.media_urls : selectedPost.media_url ? [selectedPost.media_url] : [];
                        if (selectedPost.media_type === "video") {
                          return <video src={urls[0]} controls autoPlay playsInline preload="metadata" className="w-full max-h-[75vh] object-contain" />;
                        }
                        if (urls.length <= 1) {
                          return <img src={urls[0] || ""} alt="" className="w-full max-h-[75vh] object-contain" loading="lazy" decoding="async" />;
                        }
                        return (
                          <div className="grid grid-cols-2 gap-0.5">
                            {urls.map((u: string, i: number) => (
                              <img key={i} src={u} alt="" className="w-full aspect-square object-cover" loading="lazy" decoding="async" />
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Action bar */}
                    <div className="flex items-center gap-5 px-4 py-3 border-b border-border">
                      <button type="button"
                        onClick={() => {
	                          const isLiked = likedPosts.has(selectedPost.id);
	                          setLikedPosts(prev => {
	                            const next = new Set(prev);
	                            if (isLiked) {
	                              next.delete(selectedPost.id);
	                            } else {
	                              next.add(selectedPost.id);
	                            }
	                            return next;
	                          });
	                        }}
                        className="flex items-center gap-1.5"
                      >
                        <Heart className={`h-6 w-6 transition-colors ${likedPosts.has(selectedPost.id) ? "fill-red-500 text-red-500" : "text-foreground"}`} />
                        <span className="text-sm font-medium text-foreground">{(selectedPost.likes_count || 0) + (likedPosts.has(selectedPost.id) ? 1 : 0)}</span>
                      </button>
                      <button type="button" onClick={() => setCommentPost(selectedPost)} className="flex items-center gap-1.5">
                        <MessageCircle className="h-6 w-6 text-foreground" />
                        <span className="text-sm font-medium text-foreground">{selectedPost.comments_count || 0}</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{selectedPost.views_count || 0}</span>
                      </div>
                      <div className="flex-1" />
                      <button type="button" aria-label="Share post" title="Share post" onClick={(e) => { e.stopPropagation(); void handleSharePost(selectedPost); }}>
                        <Share2 className="h-5 w-5 text-foreground" />
                      </button>
                    </div>

                    {/* Caption */}
                    {selectedPost.caption && (
                      <div className="px-4 py-3">
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="font-bold mr-1.5">{resolvedProfile.full_name}</span>
                          {selectedPost.caption}
                        </p>
                      </div>
                        )}
                      </>
                    )}
                  </PublicPostOverlay>
                )}
              </AnimatePresence>

              <CommentsSheet
                open={!!commentPost}
                onClose={() => setCommentPost(null)}
                postId={commentPost ? toUserPostInteractionId(commentPost.id) : ""}
                postSource="user"
                currentUserId={user?.id ?? null}
                commentsCount={commentPost?.comments_count ?? 0}
              />
            </>
          )}
        </>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "cancel" ? "Cancel Friend Request?" : confirmAction?.action === "unfollow" ? "Unfollow?" : "Unfriend?"}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.label}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmAction?.action === "unfollow") { followMutation.mutate(); }
              else if (confirmAction) { friendMutation.mutate(confirmAction.action as "cancel" | "unfriend"); }
              setConfirmAction(null);
            }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {confirmAction?.action === "cancel" ? "Yes, cancel" : confirmAction?.action === "unfollow" ? "Yes, unfollow" : "Yes, unfriend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {targetUserId && (
        <TipSheet
          open={tipOpen}
          onClose={() => setTipOpen(false)}
          creatorId={targetUserId}
          creatorName={resolvedProfile?.full_name || "Creator"}
          creatorAvatar={resolvedProfile?.avatar_url}
        />
      )}

      {targetUserId && reportOpen && (
        <Suspense fallback={null}>
          <ReportSheet
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            contentType="creator"
            contentId={targetUserId}
            reportedUserId={targetUserId}
          />
        </Suspense>
      )}

      <ZivoMobileNav />
    </PullToRefresh>
  );
}
