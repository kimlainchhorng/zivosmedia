/**
 * PublicProfilePage — View another user's public profile
 * Shows cover photo, avatar, name, posts/videos/reels, follow/friend/share actions
 * Respects profile_visibility privacy settings
 */
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import { getPublicOrigin, getProfileShareUrl } from "@/lib/getPublicOrigin";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import NavBar from "@/components/home/NavBar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { formatCount } from "@/lib/social/formatCount";
import { isBlueVerified } from "@/lib/verification";
import { MutualFollowsBadge, useMutualFollows } from "@/components/social/MutualFollowsBadge";
import {
  ArrowLeft, Loader2, User, ImageIcon, Film, Grid3X3, UserPlus, UserCheck, UserX,
  Heart, MessageCircle, Lock, ShieldCheck, Users, Share2, Play, Eye, Bookmark, Globe, MoreHorizontal,
  Phone, Video, Gift,
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
import TipSheet from "@/components/social/TipSheet";
import { useSwipeDownClose } from "@/components/social/useSwipeDownClose";
import { SwipeGrabHandle } from "@/components/social/SwipeGrabHandle";

const TopFans = lazy(() => import("@/components/social/TopFans"));

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
  // OF creator age gate — confirmed once per session
  const [ofAgeConfirmed, setOfAgeConfirmed] = useState(false);

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
        const res = await fetch(`https://slirphzzwcogdbkeicff.supabase.co/functions/v1/profile-og?resolve=1&code=${encodeURIComponent(shareCodeFromUrl)}`);
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
        await (supabase as any).from("user_followers").delete().eq("follower_id", user.id).eq("following_id", targetUserId).throwOnError();
      } else {
        await (supabase as any).from("user_followers").insert({ follower_id: user.id, following_id: targetUserId }).throwOnError();
        // Notify the user they got a new follower
        try {
          const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single();
          await supabase.functions.invoke("send-push-notification", {
            body: { user_id: targetUserId, notification_type: "new_follower", title: "New Follower 🔔", body: `${sp?.full_name || "Someone"} started following you`, data: { type: "new_follower", follower_id: user.id, avatar_url: sp?.avatar_url, action_url: `/user/${user.id}` } },
          });
        } catch {}
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
        if (!isFollowing) {
          await (supabase as any)
            .from("user_followers")
            .upsert({ follower_id: user.id, following_id: targetUserId }, { onConflict: "follower_id,following_id", ignoreDuplicates: true })
            .throwOnError();
        }

        const { error: friendshipInsertError } = await supabase
          .from("friendships")
          .insert({ user_id: user.id, friend_id: targetUserId, status: "pending" });

        if (friendshipInsertError && friendshipInsertError.code !== "23505") {
          throw friendshipInsertError;
        }
        try {
          const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single();
          await supabase.functions.invoke("send-push-notification", {
            body: { user_id: targetUserId, notification_type: "friend_request_received", title: `${sp?.full_name || "Someone"} · Following`, body: `${sp?.full_name || "Someone"} sent you a friend request`, data: { type: "friend_request", sender_id: user.id, avatar_url: sp?.avatar_url, action_url: `/user/${user.id}` } },
          });
        } catch {}
      } else if (action === "cancel" || action === "unfriend") {
        await supabase.from("friendships").delete().or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`).throwOnError();
      } else if (action === "accept") {
        if (!isFollowing) {
          await (supabase as any)
            .from("user_followers")
            .upsert({ follower_id: user.id, following_id: targetUserId }, { onConflict: "follower_id,following_id", ignoreDuplicates: true })
            .throwOnError();
        }
        await supabase.from("friendships").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("user_id", targetUserId).eq("friend_id", user.id).throwOnError();
        // Notify the requester
        try {
          const { data: sp } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single();
          await supabase.functions.invoke("send-push-notification", {
            body: { user_id: targetUserId, notification_type: "friend_request_accepted", title: "Friend Request Accepted 🎉", body: `${sp?.full_name || "Someone"} accepted your friend request`, data: { type: "friend_accepted", sender_id: user.id, avatar_url: sp?.avatar_url, action_url: `/user/${user.id}` } },
          });
        } catch {}
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
    navigate(`/feedback?type=profile&target=${encodeURIComponent(targetUserId || "")}`);
  };

  const handleBlockProfile = async () => {
    if (!user) {
      toast.error("Sign in to block users");
      navigate("/auth");
      return;
    }
    if (!targetUserId || targetUserId === user.id) {
      toast.error("Cannot block this profile");
      return;
    }

    setBlockingUser(true);
    try {
      const { error } = await (supabase as any)
        .from("blocked_users")
        .upsert({ blocker_id: user.id, blocked_id: targetUserId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });

      if (error) throw error;

      // Best-effort cleanup so blocked users are detached from social graph.
      await Promise.all([
        (supabase as any).from("user_followers").delete().eq("follower_id", user.id).eq("following_id", targetUserId),
        (supabase as any).from("user_followers").delete().eq("follower_id", targetUserId).eq("following_id", user.id),
        (supabase as any).from("friendships").delete().or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`),
      ]);

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
        toast.success("Removed from bookmarks");
      } else {
        const { error } = await (supabase as any).from("bookmarks").insert({
          user_id: user.id,
          item_id: interactionId,
          item_type: "post",
          title: post.caption || `Post by ${resolvedProfile?.full_name || "User"}`,
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
          <img src={urls[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      );
    }

    if (urls.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-0.5 w-full aspect-[2/1] max-h-[60vh] mx-auto">
          {urls.map((u, i) => (
            <div key={i} className="relative bg-black overflow-hidden cursor-pointer" onClick={() => openViewer(i)}>
              <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      );
    }

    if (urls.length === 3) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full aspect-square md:aspect-[3/2]">
          <div className="relative row-span-2 bg-black overflow-hidden cursor-pointer" onClick={() => openViewer(0)}>
            <img src={urls[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="relative bg-black overflow-hidden cursor-pointer" onClick={() => openViewer(1)}>
            <img src={urls[1]} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="relative bg-black overflow-hidden cursor-pointer" onClick={() => openViewer(2)}>
            <img src={urls[2]} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-[3px] w-full aspect-square overflow-hidden rounded-lg">
        {urls.slice(0, 4).map((u, i) => (
          <div key={i} className="relative bg-muted overflow-hidden cursor-pointer" onClick={() => openViewer(i)}>
            <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
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
      <div className="lg:hidden zivo-sticky-mobile-header safe-area-top">
        <div className="max-w-3xl mx-auto zivo-mobile-header-row flex items-center gap-2.5">
          <button type="button" onClick={handleBack} aria-label="Back" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-ig-gradient truncate flex-1">{resolvedProfile?.full_name || "Profile"}</h1>
          <button type="button" onClick={handleShare} aria-label="Share profile" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <Share2 className="h-5 w-5 text-foreground" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              aria-label="Profile actions"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="h-5 w-5 text-foreground" />
            </button>
            {showProfileMenu && (
              <>
                <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                  <button type="button" onClick={handleShare} className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/60">Share profile</button>
                  {!isOwnProfile && (
                    <>
                      <button type="button" onClick={handleReportProfile} className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/60">Report profile</button>
                      <button
                        type="button"
                        onClick={() => void handleBlockProfile()}
                        disabled={blockingUser}
                        className="w-full px-3 py-2.5 text-left text-sm text-destructive hover:bg-muted/60 disabled:opacity-60"
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
                  <button onClick={() => setOfAgeConfirmed(true)} className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors">I am 18+</button>
                </div>
              </div>
            </div>
          )}
          {/* Cover + Avatar */}
          <div className="relative max-w-3xl mx-auto">
            <div className="w-full h-32 sm:h-48 md:h-56 bg-gradient-to-br from-primary/20 via-primary/10 to-muted overflow-hidden">
              {resolvedProfile.cover_url && (
                <img src={resolvedProfile.cover_url} alt="Cover" className="w-full h-full object-cover object-center" />
              )}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-12 sm:-bottom-16">
              <div className="relative">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={resolvedProfile.avatar_url || undefined} />
                  <AvatarFallback className="text-3xl sm:text-4xl font-bold bg-muted text-muted-foreground">{initials}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex flex-col items-center pt-14 sm:pt-20 pb-4 px-4 max-w-3xl mx-auto">
            <h2 className="text-[28px] sm:text-2xl font-bold tracking-tight text-foreground inline-flex items-center gap-2">
              <span>{resolvedProfile.full_name}</span>
              {isBlueVerified(resolvedProfile.is_verified) && <VerifiedBadge size={28} />}
            </h2>
            {isVisitorPreview && (
              <p className="mt-2 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                Visitor preview mode
              </p>
            )}
            {resolvedProfile.bio && (
              <p className="mt-2 max-w-md text-center text-[13px] sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                <SafeCaption text={resolvedProfile.bio} />
              </p>
            )}

            {!zivoOFMode && (!isLocked ? (
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm">
                <span className="inline-flex items-baseline gap-1">
                  <span className="font-bold text-foreground">{formatCount(followerCount) ?? "0"}</span>
                  <span className="font-medium text-foreground/75">followers</span>
                </span>
                <span aria-hidden="true" className="text-muted-foreground/70">·</span>
                <span className="inline-flex items-baseline gap-1">
                  <span className="font-bold text-foreground">{formatCount(followingCount) ?? "0"}</span>
                  <span className="font-medium text-foreground/75">following</span>
                </span>
                <span aria-hidden="true" className="text-muted-foreground/70">·</span>
                <span className="inline-flex items-baseline gap-1">
                  <span className="font-bold text-foreground">{formatCount(posts.length) ?? "0"}</span>
                  <span className="font-medium text-foreground/75">posts</span>
                </span>
                <span aria-hidden="true" className="text-muted-foreground/70">·</span>
                <span className="inline-flex items-baseline gap-1">
                  <span className="font-bold text-foreground">{formatCount(friendCount) ?? "0"}</span>
                  <span className="font-medium text-foreground/75">friends</span>
                </span>
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">— followers · — following · — posts</div>
            ))}

            {/* Social proof: mutual followers between visitor and this profile. */}
            <MutualFollowsBadge mutual={mutual} className="mt-1.5 text-center text-[11px]" />

            {/* Actions */}
            {!isOwnProfile && user && (
              <div className="flex gap-2 mt-4.5 w-full max-w-sm px-2">
                {!zivoOFMode && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => { if (isFollowing) { setConfirmAction({ action: "unfollow", label: `Unfollow ${resolvedProfile?.full_name}?` }); } else { followMutation.mutate(); } }} disabled={followMutation.isPending}
                    className={`flex-1 h-10 sm:h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${isFollowing ? "bg-muted text-foreground border border-border" : "bg-ig-gradient text-white hover:opacity-90 shadow-sm"}`}>
                    {followMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${isFollowing ? "fill-primary text-primary" : ""}`} />}
                    {followMutation.isPending ? "Updating" : isFollowing ? "Following" : "Follow"}
                  </motion.button>
                )}
                {!zivoOFMode && (
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (friendBtn.action === "cancel") setConfirmAction({ action: "cancel", label: "Cancel this friend request?" });
                      else if (friendBtn.action === "unfriend") setConfirmAction({ action: "unfriend", label: `Unfriend ${resolvedProfile?.full_name}?` });
                      else friendMutation.mutate(friendBtn.action);
                    }}
                    disabled={friendMutation.isPending}
                    className={`flex-1 h-10 sm:h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      friendshipStatus === "friends" ? "bg-primary/10 text-primary border border-primary/30"
                        : friendshipStatus === "request_sent" ? "bg-muted text-muted-foreground border border-border"
                        : friendshipStatus === "request_received" ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground border border-border"
                    }`}>
                    {friendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <friendBtn.icon className="h-4 w-4" />}
                    {friendMutation.isPending ? "Updating" : friendBtn.label}
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (canMessageProfile) {
                      navigate(`/chat`, {
                        state: {
                          openChat: {
                            recipientId: targetUserId,
                            recipientName: resolvedProfile?.full_name || "User",
                            recipientAvatar: resolvedProfile?.avatar_url,
                          },
                        },
                      });
                    } else {
                      toast("Add as friend to message");
                    }
                  }}
                  disabled={!canMessageProfile}
                  title={canMessageProfile ? "Message" : "Add as friend to message"}
                  className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${canMessageProfile ? "bg-primary text-primary-foreground" : "bg-muted border border-border text-muted-foreground opacity-60"}`}>
                  <MessageCircle className="h-4 w-4" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (!user) { toast.error("Sign in to tip"); navigate("/auth"); return; }
                    setTipOpen(true);
                  }}
                  aria-label={`Send a tip to ${resolvedProfile?.full_name || "this creator"}`}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md hover:opacity-95 active:scale-95 transition-all">
                  <Gift className="h-4 w-4" />
                </motion.button>
              </div>
            )}
            {isOwnProfile && (
              <div className="flex gap-3 mt-5">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/account/profile-edit")} className="h-11 px-8 rounded-xl bg-muted text-foreground text-sm font-semibold border border-border">Edit Profile</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleShare} className="h-11 w-11 rounded-xl bg-muted text-foreground flex items-center justify-center border border-border"><Share2 className="h-4 w-4" /></motion.button>
              </div>
            )}
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

              {/* Content Tabs */}
              <div className="border-b border-border/30 max-w-3xl mx-auto">
                <div className="flex">
                  {([
                    { key: "all" as PostTab, icon: Grid3X3, label: "Posts", count: posts.length },
                    { key: "photos" as PostTab, icon: ImageIcon, label: "Photos", count: photoCount },
                    { key: "videos" as PostTab, icon: Film, label: "Videos", count: videoCount },
                  ]).map((tab) => (
                    <button type="button" key={tab.key} onClick={() => setPostTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs uppercase tracking-wider transition-colors relative ${postTab === tab.key ? "text-foreground font-bold" : "text-muted-foreground font-semibold"}`}>
                      <tab.icon className="h-4 w-4" /><span>{tab.label}</span>
                      {postTab === tab.key && <motion.div layoutId="profile-tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-foreground rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Posts */}
              {filteredPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/50">
                  <ImageIcon className="h-8 w-8 mb-2" /><p className="text-sm">No {postTab === "all" ? "posts" : postTab} yet</p>
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
                        <img src={(post.media_urls?.length ? post.media_urls[0] : post.media_url) || ""} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                          return <video src={urls[0]} controls autoPlay playsInline className="w-full max-h-[75vh] object-contain" />;
                        }
                        if (urls.length <= 1) {
                          return <img src={urls[0] || ""} alt="" className="w-full max-h-[75vh] object-contain" />;
                        }
                        return (
                          <div className="grid grid-cols-2 gap-0.5">
                            {urls.map((u: string, i: number) => (
                              <img key={i} src={u} alt="" className="w-full aspect-square object-cover" loading="lazy" />
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
                            isLiked ? next.delete(selectedPost.id) : next.add(selectedPost.id);
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

      <ZivoMobileNav />
    </PullToRefresh>
  );
}
