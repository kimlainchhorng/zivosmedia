/**
 * StoryViewer — Shared fullscreen story viewer (Facebook/TikTok-class).
 * Used by ChatStories, ProfileStories, and FeedStoryRing.
 *
 * Behavior:
 * - Auto-progressing 5s image / playback-driven video
 * - Tap left/right to navigate, hold to pause, swipe down to close
 * - Like, comment, send actions (right-side stack)
 * - Owner: viewers list + delete
 * - Records views in story_views; comments in story_comments
 */
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  invalidateAllStoryCaches,
  collectStoryStorageKeys,
  sweepStoryStoragePrefix,
  STORIES_BUCKET,
} from "@/lib/storiesCache";
import StoryForwardSheet from "@/components/stories/StoryForwardSheet";
import SensitiveMediaGate from "@/components/social/SensitiveMediaGate";
import X from "lucide-react/dist/esm/icons/x";
import Eye from "lucide-react/dist/esm/icons/eye";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Heart from "lucide-react/dist/esm/icons/heart";
import Send from "lucide-react/dist/esm/icons/send";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Pause from "lucide-react/dist/esm/icons/pause";
import Play from "lucide-react/dist/esm/icons/play";
import Volume2 from "lucide-react/dist/esm/icons/volume-2";
import VolumeX from "lucide-react/dist/esm/icons/volume-x";
import Music from "lucide-react/dist/esm/icons/music";
import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import AtSign from "lucide-react/dist/esm/icons/at-sign";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Download from "lucide-react/dist/esm/icons/download";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Plus from "lucide-react/dist/esm/icons/plus";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import CornerDownRight from "lucide-react/dist/esm/icons/corner-down-right";
import Flag from "lucide-react/dist/esm/icons/flag";
import { useNavigate } from "react-router-dom";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { useStoryRealtime } from "@/hooks/useStoryRealtime";
import { useSensitiveMediaPreference } from "@/hooks/useSensitiveMediaPreference";
import {
  detectSensitiveContent,
  isStoryCommentSafetySchemaDriftError,
  isStorySafetySchemaDriftError,
} from "@/lib/social/sensitiveContent";

export interface StoryItem {
  id: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string;
  audioUrl?: string;
  createdAt: string;
  viewsCount: number;
  isSensitive?: boolean;
  sensitiveReason?: string | null;
  hiddenAt?: string | null;
  hiddenReason?: string | null;
  sensitiveReportCount?: number | null;
}

export interface StoryGroup {
  userId: string;
  userName: string;
  avatarUrl?: string;
  stories: StoryItem[];
}

const STORY_DURATION = 5000;

type StoryTableName =
  | "story_views"
  | "story_reactions"
  | "story_comments"
  | "stories"
  | "public_profiles"
  | "direct_messages";

type LooseDbError = { message?: string };
type LooseDbResult = { data: unknown; error: LooseDbError | null };

type LooseDbQuery = PromiseLike<LooseDbResult> & {
  select: (columns?: string) => LooseDbQuery;
  eq: (column: string, value: unknown) => LooseDbQuery;
  in: (column: string, values: readonly unknown[]) => LooseDbQuery;
  order: (column: string, options?: unknown) => LooseDbQuery;
  maybeSingle: () => Promise<LooseDbResult>;
  delete: () => LooseDbQuery;
  update: (values: unknown) => LooseDbQuery;
  insert: (values: unknown) => LooseDbQuery;
  upsert: (values: unknown, options?: unknown) => LooseDbQuery;
};

const storyDb = supabase as unknown as {
  from: (table: StoryTableName) => LooseDbQuery;
};

type StoryViewRow = {
  viewer_id: string;
  viewed_at: string;
};

type PublicProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type StoryReactionRow = {
  id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

type StoryCommentRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  hidden_at?: string | null;
  hidden_reason?: string | null;
  sensitive_report_count?: number | null;
};

type StoryDbRow = {
  id: string;
  user_id: string | null;
  media_url: string | null;
  audio_url: string | null;
};

type ViewerListItem = StoryViewRow & {
  name: string;
  avatar: string | null;
};

type ReactionListItem = StoryReactionRow & {
  name: string;
  avatar: string | null;
};

type CommentListItem = StoryCommentRow & {
  name: string;
  avatar: string | null;
};

const asRows = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const asRow = <T,>(value: unknown): T | null => (value && typeof value === "object" ? (value as T) : null);
const errorMessage = (error: unknown, fallback: string) =>
  error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;

export interface StoryCloseMeta {
  story_id: string;
  segment_index: number;
  total_segments: number;
  completed: boolean;
}

interface Props {
  groups: StoryGroup[];
  startGroupIndex: number;
  startStoryIndex?: number;
  onClose: (meta?: StoryCloseMeta) => void;
  onStoryChange?: (storyId: string) => void;
  /** Which carousel opened the viewer — used for share analytics. */
  source?: "profile" | "feed" | "chat" | "shared-link";
}

export default function StoryViewer({
  groups,
  startGroupIndex,
  startStoryIndex = 0,
  onClose,
  onStoryChange,
  source = "feed",
}: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { blurSensitiveMedia } = useSensitiveMediaPreference(user?.id);

  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [viewIdx, setViewIdx] = useState(startStoryIndex);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewersTab, setViewersTab] = useState<"viewers" | "reactions">("viewers");
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [muted, setMuted] = useState(true);
  const [reactionBurst, setReactionBurst] = useState<string | null>(null);
  const [showForward, setShowForward] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const [revealedSensitiveStories, setRevealedSensitiveStories] = useState<Set<string>>(() => new Set());
  const [reportedStoryIds, setReportedStoryIds] = useState<Set<string>>(() => new Set());
  const [reportedCommentIds, setReportedCommentIds] = useState<Set<string>>(() => new Set());
  // Quick-react picker (non-owner: tap "+" or long-press to open expanded grid)
  const [showQuickReact, setShowQuickReact] = useState(false);
  // Threaded reply UI inside the Reactions tab
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [threadDraft, setThreadDraft] = useState("");
  // Track which reaction is "mine" so we can render the × clear chip
  // (server already enforces uniqueness via reactToStory mutation)

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync audio element with current story / pause state / mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (paused || showViewers || showComments) {
      audio.pause();
    } else {
      audio.muted = muted;
      audio.play().catch(() => {/* autoplay blocked; user can unmute */});
    }
  }, [paused, showViewers, showComments, muted]);

  // While the fullscreen viewer is mounted, flag the document so the bottom
  // mobile nav (and any other UI keyed on this attribute) hides itself —
  // belt-and-suspenders alongside the z-[1600] layer. Use useLayoutEffect so
  // the flag is set on the SAME paint as the opaque overlay appears, leaving
  // no frame where the underlying nav is visible behind the entrance animation.
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    document.body.setAttribute("data-story-open", "true");
    return () => {
      document.body.removeAttribute("data-story-open");
    };
  }, []);

  const viewingGroup = groups[groupIdx] ?? null;
  const currentStory = viewingGroup?.stories[viewIdx] ?? null;
  const currentStoryId = currentStory?.id ?? null;
  const userId = user?.id ?? null;
  const isOwner = viewingGroup?.userId === user?.id;
  const storySensitiveMediaMatch = detectSensitiveContent(currentStory?.caption || "", {
    creatorMarked: Boolean(currentStory?.isSensitive),
    reportMarked: Boolean(currentStory?.hiddenAt || currentStory?.sensitiveReportCount),
    reason: currentStory?.sensitiveReason || currentStory?.hiddenReason,
  });
  const shouldGateSensitiveStory =
    Boolean(currentStory?.mediaUrl) &&
    !isOwner &&
    blurSensitiveMedia &&
    storySensitiveMediaMatch.isSensitive;
  const sensitiveStoryLocked =
    Boolean(currentStoryId) &&
    shouldGateSensitiveStory &&
    !revealedSensitiveStories.has(currentStoryId);

  // Live updates: subscribe to reactions / comments / views for the active story
  useStoryRealtime(currentStory?.id);

  // ---- Viewers (owner only) ----
  const { data: viewers = [] } = useQuery({
    queryKey: ["story-viewers", currentStory?.id],
    enabled: !!currentStory && isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("story_views")
        .select("viewer_id, viewed_at")
        .eq("story_id", currentStory!.id)
        .order("viewed_at", { ascending: false });
      if (!data || data.length === 0) return [];
      // Dedupe by viewer_id so React list keys stay unique
      const seen = new Set<string>();
      const uniqueViews = asRows<StoryViewRow>(data).filter((v) => {
        if (seen.has(v.viewer_id)) return false;
        seen.add(v.viewer_id);
        return true;
      });
      const viewerIds = uniqueViews.map((v) => v.viewer_id);
      const { data: profiles } = await storyDb
        .from("public_profiles")
        .select("id, full_name, avatar_url")
        .in("id", viewerIds);
      const profileMap = new Map(asRows<PublicProfileRow>(profiles).map((p) => [p.id, p]));
      return uniqueViews.map((v): ViewerListItem => ({
        ...v,
        name: profileMap.get(v.viewer_id)?.full_name || "User",
        avatar: profileMap.get(v.viewer_id)?.avatar_url || null,
      }));
    },
  });

  // ---- Reactions list (owner only) — who reacted with what emoji ----
  const { data: reactionList = [] } = useQuery({
    queryKey: ["story-reactions-list", currentStory?.id],
    enabled: !!currentStory && isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("story_reactions")
        .select("id, user_id, emoji, created_at")
        .eq("story_id", currentStory!.id)
        .order("created_at", { ascending: false });
      if (!data || data.length === 0) return [];
      const reactions = asRows<StoryReactionRow>(data);
      const reactorIds = [...new Set(reactions.map((r) => r.user_id))];
      const { data: profiles } = await storyDb
        .from("public_profiles")
        .select("id, full_name, avatar_url")
        .in("id", reactorIds);
      const profileMap = new Map(asRows<PublicProfileRow>(profiles).map((p) => [p.id, p]));
      return reactions.map((r): ReactionListItem => ({
        ...r,
        name: profileMap.get(r.user_id)?.full_name || "User",
        avatar: profileMap.get(r.user_id)?.avatar_url || null,
      }));
    },
  });
  const { data: commentRows = [] } = useQuery({
    queryKey: ["story-comments", currentStory?.id],
    enabled: !!currentStory,
    queryFn: async () => {
      const queryComments = (select: string, includeHiddenFilter: boolean) => {
        let query = (supabase as any)
          .from("story_comments")
          .select(select)
          .eq("story_id", currentStory!.id);
        if (includeHiddenFilter) query = query.is("hidden_at", null);
        return query.order("created_at", { ascending: true });
      };

      let { data, error } = await queryComments(
        "id, user_id, content, created_at, hidden_at, hidden_reason, sensitive_report_count",
        true,
      );

      if (error && isStoryCommentSafetySchemaDriftError(error)) {
        const fallback = await queryComments("id, user_id, content, created_at", false);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      if (!data || data.length === 0) return [];
      // Dedupe comments by id (defensive — duplicates would crash React lists)
      const seenC = new Set<string>();
      const uniqueComments = asRows<StoryCommentRow>(data).filter((c) => {
        if (seenC.has(c.id)) return false;
        seenC.add(c.id);
        return true;
      }).filter((c) => !c.hidden_at);
      const userIds = [...new Set(uniqueComments.map((c) => c.user_id))];
      const { data: profiles } = await storyDb
        .from("public_profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      const profileMap = new Map(asRows<PublicProfileRow>(profiles).map((p) => [p.id, p]));
      return uniqueComments.map((c): CommentListItem => ({
        ...c,
        name: profileMap.get(c.user_id)?.full_name || "User",
        avatar: profileMap.get(c.user_id)?.avatar_url || null,
      }));
    },
  });
  const comments = commentRows.filter((comment) => !reportedCommentIds.has(comment.id) && !comment.hidden_at);

  // Parse comments into threads keyed by reactionId.
  // Convention: content starting with "[react:<uuid>] body" belongs to that
  // reaction's thread. Plain comments (no prefix) go into the legacy bucket.
  const REACT_PREFIX = /^\[react:([0-9a-f-]{36})\]\s*/i;
  const commentsByReaction = new Map<string, CommentListItem[]>();
  const flatComments: CommentListItem[] = [];
  for (const c of comments) {
    const m = REACT_PREFIX.exec(c.content || "");
    if (m) {
      const reactionId = m[1];
      const cleaned = { ...c, content: c.content.replace(REACT_PREFIX, "") };
      if (!commentsByReaction.has(reactionId)) commentsByReaction.set(reactionId, []);
      commentsByReaction.get(reactionId)!.push(cleaned);
    } else {
      flatComments.push(c);
    }
  }

  // ---- My reaction on the current story (real persistence) ----
  const { data: myReaction } = useQuery({
    queryKey: ["story-my-reaction", currentStory?.id, user?.id],
    enabled: !!currentStory && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("story_reactions")
        .select("emoji")
        .eq("story_id", currentStory!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return asRow<Pick<StoryReactionRow, "emoji">>(data)?.emoji ?? null;
    },
  });

  const reactToStory = useMutation({
    mutationFn: async (emoji: string | null) => {
      if (!currentStory || !user) return;
      if (emoji === null) {
        const { error } = await supabase
          .from("story_reactions")
          .delete()
          .eq("story_id", currentStory.id)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }
      const { data: existing } = await supabase
        .from("story_reactions")
        .select("id")
        .eq("story_id", currentStory.id)
        .eq("user_id", user.id)
        .maybeSingle();
      const existingReaction = asRow<Pick<StoryReactionRow, "id">>(existing);
      if (existingReaction) {
        const { error } = await supabase
          .from("story_reactions")
          .update({ emoji })
          .eq("id", existingReaction?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("story_reactions")
          .insert({ story_id: currentStory.id, user_id: user.id, emoji });
        if (error) throw error;
      }
    },
    onSuccess: (_data, emoji) => {
      queryClient.invalidateQueries({
        queryKey: ["story-my-reaction", currentStory?.id, user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["story-reactions-list", currentStory?.id],
      });
      if (emoji) {
        setReactionBurst(emoji);
        window.setTimeout(() => setReactionBurst(null), 800);
      }
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Could not save reaction")),
  });

  const toggleLike = useCallback(() => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    reactToStory.mutate(myReaction === "❤️" ? null : "❤️");
  }, [myReaction, reactToStory, user]);


  useEffect(() => {
      if (!currentStoryId || !userId || isOwner) return;
      void supabase
      .from("story_views")
      .upsert({ story_id: currentStoryId, viewer_id: userId }, { onConflict: "story_id,viewer_id" })
      .then(({ error }) => {
        if (!error) {
          queryClient.invalidateQueries({ queryKey: ["my-story-views", userId], exact: true });
          queryClient.invalidateQueries({ queryKey: ["profile-story-rings", userId], exact: true });
          queryClient.invalidateQueries({ queryKey: ["feed-story-users"], exact: true });
        }
      });
  }, [currentStoryId, userId, isOwner, queryClient]);

  // ---- Sync URL deep-link with currently visible story ----
  useEffect(() => {
    if (currentStoryId && onStoryChange) onStoryChange(currentStoryId);
  }, [currentStoryId, onStoryChange]);

  // ---- Share story (opens Instagram-style "Send to" sheet) ----
  const handleShare = useCallback(() => {
    if (!currentStory) return;
    setPaused(true);
    setShowForward(true);
  }, [currentStory]);

  // ---- Post comment (used for threaded replies under reactions) ----
  const postComment = useMutation({
    mutationFn: async (content: string) => {
      const textSensitivity = detectSensitiveContent(content);
      if (textSensitivity.isSensitive) {
        throw new Error("explicit_story_comment_blocked");
      }
      const { error } = await supabase.from("story_comments").insert({
        story_id: currentStory!.id,
        user_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story-comments", currentStory?.id] });
      setCommentText("");
      setThreadDraft("");
    },
    onError: (err: unknown) => {
      const message = errorMessage(err, "");
      if (message.includes("explicit_story_comment_blocked")) {
        toast.error("This comment looks sexual or explicit. Story comments cannot contain 18+ text.");
      } else if (message.includes("violates row-level security")) {
        toast.error("Only the story owner or original reactor can reply here");
      } else {
        toast.error("Failed to post reply");
      }
    },
  });

  // ---- DM-style story reply (non-owner) — lands in the owner's chat inbox ----
  const sendDmReply = useMutation({
    mutationFn: async (text: string) => {
      if (!currentStory || !viewingGroup || !user) throw new Error("Not ready");
      const ownerId = viewingGroup.userId;
      if (ownerId === user.id) throw new Error("Cannot reply to your own story");
      const deepLink = `${getPublicOrigin()}/stories/${currentStory.id}`;
      const body = `💬 Replied to your story\n${text}\n${deepLink}`;
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: ownerId,
        message: body,
        message_type: "text",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText("");
      toast.success("Reply sent", {
        description: "Continue the conversation in chat.",
        action: {
          label: "Open chat",
          onClick: () => {
            closeWithMeta();
            navigate("/chat");
          },
        },
      });
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Could not send reply")),
  });

  // ---- Delete (owner) — also removes media + audio from storage ----
  const deleteStory = useMutation({
    mutationFn: async (storyId: string) => {
      // 1) Re-fetch the row to get the latest URLs (and confirm ownership exists).
      const { data: latest } = await supabase
        .from("stories")
        .select("id, user_id, media_url, audio_url")
        .eq("id", storyId)
        .maybeSingle();

      const latestStory = asRow<StoryDbRow>(latest);
      const cached = viewingGroup?.stories.find((s) => s.id === storyId);
      const ownerId = latestStory?.user_id ?? viewingGroup?.userId ?? user?.id;

      // 2) Collect every known storage key from cache + fresh row.
      const keys = Array.from(
        new Set([
          ...collectStoryStorageKeys(cached),
          ...collectStoryStorageKeys(latestStory),
        ])
      );

      // 3) Delete the DB row first so RLS-protected files become deletable.
      const { error } = await supabase.from("stories").delete().eq("id", storyId);
      if (error) throw error;

      // 4) Best-effort URL-key removal.
      if (keys.length > 0) {
        await supabase.storage.from(STORIES_BUCKET).remove(keys).catch(() => {});
      }

      // 5) Belt-and-suspenders: sweep any orphans under <user>/<story>/.
      if (ownerId) {
        await sweepStoryStoragePrefix(ownerId, storyId);
      }
    },
    onSuccess: () => {
      invalidateAllStoryCaches(queryClient, user?.id);
      toast.success("Story deleted");
    },
    onError: (err: unknown) => toast.error(errorMessage(err, "Could not delete story")),
  });

  // ---- Auto-progress ----
  const startTimer = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    startTimeRef.current = performance.now() - elapsedRef.current;
    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const pct = Math.min(elapsed / STORY_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) return;
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    elapsedRef.current = performance.now() - startTimeRef.current;
  }, []);

  const resetAndStart = useCallback(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setReactionBurst(null);
    startTimer();
  }, [startTimer]);

  // Close handler that always reports current segment metadata so the
  // story_deeplink_close analytics event can attribute drop-off accurately.
  const closeWithMeta = useCallback(
    (completedOverride?: boolean) => {
      if (!currentStory || !viewingGroup) {
        onClose();
        return;
      }
      const total = viewingGroup.stories.length;
      const completed =
        completedOverride !== undefined
          ? completedOverride
          : viewIdx === total - 1 && progress >= 1;
      onClose({
        story_id: currentStory.id,
        segment_index: viewIdx,
        total_segments: total,
        completed,
      });
    },
    [currentStory, viewingGroup, viewIdx, progress, onClose]
  );

  const goNext = useCallback(() => {
    if (!viewingGroup) return;
    if (viewIdx < viewingGroup.stories.length - 1) {
      setViewIdx((i) => i + 1);
      elapsedRef.current = 0;
    } else {
      const nextG = groupIdx + 1;
      if (nextG < groups.length) {
        setGroupIdx(nextG);
        setViewIdx(0);
        elapsedRef.current = 0;
      } else {
        closeWithMeta(true); // reached end of all stories
      }
    }
  }, [viewingGroup, viewIdx, groupIdx, groups.length, closeWithMeta]);

  const goPrev = useCallback(() => {
    if (viewIdx > 0) {
      setViewIdx((i) => i - 1);
      elapsedRef.current = 0;
    } else {
      const prevG = groupIdx - 1;
      if (prevG >= 0) {
        setGroupIdx(prevG);
        setViewIdx(groups[prevG].stories.length - 1);
        elapsedRef.current = 0;
      }
    }
  }, [viewIdx, groupIdx, groups]);

  const blockForReporter = useCallback(async (targetUserId: string) => {
    if (!user?.id || targetUserId === user.id) return;
    await (supabase as any).from("user_safety_actions").upsert(
      {
        user_id: user.id,
        target_user_id: targetUserId,
        action: "block",
      },
      { onConflict: "user_id,target_user_id,action", ignoreDuplicates: true },
    );
  }, [user?.id]);

  const handleReportStory = useCallback(async () => {
    if (!currentStory || !viewingGroup || !user?.id) {
      toast.error("Sign in to report stories");
      return;
    }
    if (isOwner) {
      toast.error("You can't report your own story");
      return;
    }

    const reason = "Nudity or sexual content";
    setReportedStoryIds((prev) => new Set(prev).add(currentStory.id));
    setShowMore(false);
    setPaused(false);

    try {
      const { error } = await (supabase as any).from("story_reports").insert({
        reporter_id: user.id,
        story_id: currentStory.id,
        owner_id: viewingGroup.userId,
        reason,
        description: (currentStory.caption || "").slice(0, 500),
      });
      if (error) throw error;
      await blockForReporter(viewingGroup.userId);
      invalidateAllStoryCaches(queryClient, user.id);
      toast.success("We hid it, blocked this user, and sent it for safety review");
      goNext();
    } catch (error) {
      if (isStorySafetySchemaDriftError(error)) {
        await blockForReporter(viewingGroup.userId).catch(() => {});
        toast.warning("Story hidden here. Deploy the story safety migration to send it for review.");
        goNext();
        return;
      }
      setReportedStoryIds((prev) => {
        const next = new Set(prev);
        next.delete(currentStory.id);
        return next;
      });
      toast.error("Couldn't submit story report");
    }
  }, [blockForReporter, currentStory, goNext, isOwner, queryClient, user?.id, viewingGroup]);

  const handleReportStoryComment = useCallback(async (comment: CommentListItem) => {
    if (!currentStory || !user?.id) {
      toast.error("Sign in to report comments");
      return;
    }
    if (comment.user_id === user.id) {
      toast.error("You can't report your own comment");
      return;
    }

    const reason = "Nudity or sexual content";
    setReportedCommentIds((prev) => new Set(prev).add(comment.id));

    try {
      const { error } = await (supabase as any).from("story_comment_reports").insert({
        reporter_id: user.id,
        comment_id: comment.id,
        story_id: currentStory.id,
        comment_author_id: comment.user_id,
        reason,
        description: (comment.content || "").slice(0, 500),
      });
      if (error) throw error;
      await blockForReporter(comment.user_id);
      queryClient.invalidateQueries({ queryKey: ["story-comments", currentStory.id] });
      toast.success("Comment hidden, user blocked, and report sent for review");
    } catch (error) {
      if (isStoryCommentSafetySchemaDriftError(error)) {
        await blockForReporter(comment.user_id).catch(() => {});
        toast.warning("Comment hidden here. Deploy the story safety migration to send it for review.");
        return;
      }
      setReportedCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
      toast.error("Couldn't submit comment report");
    }
  }, [blockForReporter, currentStory, queryClient, user?.id]);

  useEffect(() => {
    if (progress < 1 || !viewingGroup) return;
    const id = window.setTimeout(() => goNext(), 0);
    return () => window.clearTimeout(id);
  }, [progress, viewingGroup, goNext]);

  useEffect(() => {
    if (!viewingGroup || paused || sensitiveStoryLocked) {
      stopTimer();
      return () => stopTimer();
    }
    const id = window.setTimeout(() => resetAndStart(), 0);
    return () => {
      window.clearTimeout(id);
      stopTimer();
    };
  }, [viewingGroup, viewIdx, groupIdx, paused, sensitiveStoryLocked, resetAndStart, stopTimer]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWithMeta();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeWithMeta, goNext, goPrev]);

  // Swipe-down to close
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) closeWithMeta();
  };

  if (!viewingGroup || !currentStory || reportedStoryIds.has(currentStory.id)) return null;

  // SSR-safe portal guard — prevents runtime errors during prerender/build
  // pipelines that import this component without a real DOM.
  if (typeof document === "undefined" || !document.body) return null;

  // Portal to <body> so transformed ancestors (e.g. Profile's ParallaxSection)
  // can't trap our `position: fixed` viewer inside their bounding box.
  // Outer shell is opaque from frame 0 (no animation) so the underlying
  // Profile/Feed/Chat UI is fully covered AND non-interactive the instant
  // the viewer mounts — even before Framer's first animation tick.
  return createPortal(
    <div
      data-testid="story-viewer"
      className="fixed inset-0 z-[1600] bg-black pointer-events-auto touch-none overscroll-contain"
    >
    <AnimatePresence>
      <motion.div
        key={currentStory.id}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
        className="absolute inset-0 bg-black"
      >
        {/* Media */}
        <div className="absolute inset-0">
          <SensitiveMediaGate
            active={shouldGateSensitiveStory}
            revealed={currentStoryId ? revealedSensitiveStories.has(currentStoryId) : false}
            onReveal={() => {
              if (!currentStoryId) return;
              setRevealedSensitiveStories((prev) => new Set(prev).add(currentStoryId));
            }}
            reason={storySensitiveMediaMatch.label}
            className="h-full w-full"
            contentClassName="h-full w-full"
          >
            {currentStory.mediaType === "video" ? (
              <video
                key={currentStory.id}
                src={currentStory.mediaUrl}
                className="w-full h-full object-cover"
	                autoPlay
	                playsInline
	                loop
	                preload="metadata"
	                onPlay={() => { if (!paused && !sensitiveStoryLocked) startTimer(); }}
	              />
            ) : (
              <img
                key={currentStory.id}
                src={currentStory.mediaUrl}
	                alt=""
	                className="w-full h-full object-cover"
	                loading="lazy"
	                decoding="async"
	              />
            )}
          </SensitiveMediaGate>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />
        </div>

        {/* Progress bars — ZIVO Aurora gradient */}
        <div className="absolute top-[var(--zivo-safe-top,12px)] left-0 right-0 flex gap-1 px-3 pt-2 z-20">
          {viewingGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] bg-white/15 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  i === viewIdx
                    ? "bg-gradient-to-r from-[hsl(160_84%_55%)] via-[hsl(174_72%_60%)] to-[hsl(190_85%_65%)] shadow-[0_0_8px_hsl(160_84%_55%/0.7)]"
                    : "bg-white/90"
                )}
                style={{
                  width: i < viewIdx ? "100%" : i === viewIdx ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header — single ZIVO glass capsule */}
        <div data-testid="story-header" className="absolute top-[calc(var(--zivo-safe-top,12px)+20px)] left-0 right-0 flex items-center justify-between px-3 z-20 gap-2">
          <div className="flex items-center gap-2.5 rounded-full bg-black/35 backdrop-blur-xl border border-white/10 ring-1 ring-[hsl(160_84%_55%)/0.25] pl-1 pr-3.5 py-1 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.5)] min-w-0 flex-1 max-w-[68%]">
            <div className="w-9 h-9 rounded-full ring-2 ring-[hsl(160_84%_55%)/0.7] overflow-hidden shrink-0">
              {viewingGroup.avatarUrl ? (
	                <img src={viewingGroup.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[hsl(160_84%_45%)] to-[hsl(174_72%_40%)] flex items-center justify-center text-sm font-bold text-white">
                  {viewingGroup.userName.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-bold leading-tight truncate">{viewingGroup.userName}</p>
              <p className="text-white/70 text-[11px] flex items-center gap-1 leading-tight">
                <span className="truncate">
                  {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
                </span>
                {currentStory.audioUrl && (
                  <>
                    <span className="opacity-50">·</span>
                    <Music className="w-3 h-3 shrink-0" />
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {currentStory.audioUrl && (
              <button type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-xl border border-white/10 ring-1 ring-[hsl(160_84%_55%)/0.2] hover:ring-[hsl(160_84%_55%)/0.5] transition"
              >
                {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
              </button>
            )}
            <button type="button"
              data-testid="story-pause"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play" : "Pause"}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-xl border border-white/10 ring-1 ring-[hsl(160_84%_55%)/0.2] hover:ring-[hsl(160_84%_55%)/0.5] transition"
            >
              {paused ? <Play className="w-4 h-4 text-white" /> : <Pause className="w-4 h-4 text-white" />}
            </button>
            <button type="button"
              data-testid="story-close"
              onClick={() => closeWithMeta()}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-xl border border-white/10 ring-1 ring-[hsl(160_84%_55%)/0.2] hover:ring-[hsl(160_84%_55%)/0.5] transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Audio (background music) */}
        {currentStory.audioUrl && (
          <audio
            ref={audioRef}
            key={currentStory.id}
            src={currentStory.audioUrl}
            loop
            autoPlay
            muted={muted}
            playsInline
          />
        )}

        {/* Tap zones */}
        <div className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={goPrev} />
        <div className="absolute right-0 top-0 bottom-0 w-2/3 z-10" onClick={goNext} />

        {/* Right-side actions — only for non-owners (owners get the IG-style bottom toolbar) */}
        {!isOwner && (
          <div className="absolute right-4 bottom-[160px] flex flex-col items-center gap-4 z-20">
            <button type="button" onClick={toggleLike} className="flex flex-col items-center gap-1" aria-label="Like story">
              <motion.div
                key={myReaction || "none"}
                animate={myReaction === "❤️" ? { scale: [1, 1.3, 1] } : {}}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-all",
                  myReaction === "❤️" ? "bg-destructive/80" : "bg-white/10"
                )}
              >
                <Heart className={cn("w-5 h-5 transition-all", myReaction === "❤️" ? "text-white fill-white" : "text-white")} />
              </motion.div>
              <span className="text-white/80 text-[10px] font-medium">Like</span>
            </button>

            <button type="button"
              onClick={() => { setPaused(true); setShowComments(true); }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center relative">
                <MessageCircle className="w-5 h-5 text-white" />
                {comments.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {comments.length}
                  </span>
                )}
              </div>
              <span className="text-white/80 text-[10px] font-medium">Comment</span>
            </button>

            <button type="button" onClick={handleShare} className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/80 text-[10px] font-medium">Share</span>
            </button>

            <button type="button"
              onClick={() => { setPaused(true); setShowMore(true); }}
              className="flex flex-col items-center gap-1"
              aria-label="More options"
            >
              <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/80 text-[10px] font-medium">More</span>
            </button>
          </div>
        )}
        {/* Floating reaction burst */}
        <AnimatePresence>
          {reactionBurst && (
            <motion.div
              key={reactionBurst}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: 1, y: -120, scale: 1.6 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute bottom-[200px] left-1/2 -translate-x-1/2 z-30 text-6xl pointer-events-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            >
              {reactionBurst}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: caption + reactions + reply */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-[var(--zivo-safe-bottom,16px)]">
          {currentStory.caption && (
            <div className="px-5 pb-3">
              <p className="text-white text-sm font-medium drop-shadow-lg leading-relaxed">
                {currentStory.caption}
              </p>
            </div>
          )}

          {!isOwner && (
            <>
              <div className="px-4 pb-2 relative">
                <div className="flex items-center justify-center gap-2.5">
                  {["❤️", "😂", "😮", "🔥", "😢", "👏"].map((emoji) => {
                    const active = myReaction === emoji;
                    return (
                      <button type="button"
                        key={emoji}
                        onClick={() => reactToStory.mutate(active ? null : emoji)}
                        className={cn(
                          "relative text-2xl transition-transform active:scale-150",
                          active && "drop-shadow-[0_0_10px_rgba(255,255,255,0.65)] scale-125"
                        )}
                        aria-label={active ? `Remove ${emoji} reaction` : `React with ${emoji}`}
                      >
                        {emoji}
                        {active && (
                          <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-black/70 border border-white/40 flex items-center justify-center text-[10px] text-white">
                            ×
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <button type="button"
                    onClick={() => setShowQuickReact((v) => !v)}
                    className={cn(
                      "w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center transition active:scale-90",
                      showQuickReact && "bg-white/25 ring-2 ring-white/40"
                    )}
                    aria-label="More reactions"
                  >
                    <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Quick-react expanded picker */}
                <AnimatePresence>
                  {showQuickReact && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-3 right-3 bottom-full mb-2 z-30"
                    >
                      <div className="rounded-2xl bg-black/65 backdrop-blur-2xl border border-white/15 ring-1 ring-[hsl(160_84%_55%)/0.25] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] p-3">
                        <div className="grid grid-cols-8 gap-1.5">
                          {["😍","🥹","🤩","😎","😭","🤣","👏","🙌","💯","🔥","✨","💖","🥳","😱","😤","🫶","🤝","👀","🌟","⚡","🎉","🍿","🤔","🙏"].map((emoji) => {
                            const active = myReaction === emoji;
                            return (
                              <button type="button"
                                key={emoji}
                                onClick={() => {
                                  reactToStory.mutate(active ? null : emoji);
                                  setShowQuickReact(false);
                                }}
                                className={cn(
                                  "h-9 rounded-lg text-xl flex items-center justify-center transition active:scale-125",
                                  active ? "bg-white/25 ring-1 ring-white/50" : "hover:bg-white/10"
                                )}
                                aria-label={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/10">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commentText.trim()) sendDmReply.mutate(commentText.trim());
                    }}
                    placeholder={`Message ${viewingGroup.userName.split(" ")[0]}...`}
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/50"
                    onFocus={() => setPaused(true)}
                    onBlur={() => setPaused(false)}
                  />
                  <button type="button"
                    onClick={() => { if (commentText.trim()) sendDmReply.mutate(commentText.trim()); }}
                    disabled={sendDmReply.isPending || !commentText.trim()}
                    aria-label="Send reply via chat"
                    className="disabled:opacity-40"
                  >
                    <Send className="w-4 h-4 text-[hsl(160_84%_60%)]" />
                  </button>
                </div>
                <p className="text-[10px] text-white/45 text-center mt-1.5">Replies open in chat</p>
              </div>
            </>
          )}

          {/* Owner action bar — ZIVO Verdant (insights pill + hero Boost button) */}
          {isOwner && (
            <div className="px-3 pb-3 pt-2 flex items-center gap-2.5">
              {/* Insights pill — tap for viewers */}
              <button type="button"
                onClick={() => { setPaused(true); setShowViewers(true); }}
                className="group flex items-center gap-2 pl-3 pr-3.5 py-2.5 rounded-full bg-black/45 backdrop-blur-2xl border border-white/10 ring-1 ring-[hsl(160_84%_55%)/0.22] hover:ring-[hsl(160_84%_55%)/0.45] active:scale-[0.97] transition"
                aria-label="Story insights"
              >
                <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(160_84%_45%)] to-[hsl(190_85%_55%)] shadow-[0_0_10px_-2px_hsl(160_84%_45%/0.7)]">
                  <BarChart2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </span>
                <span className="flex flex-col items-start leading-none">
                  <span className="text-white text-[13px] font-bold">{currentStory.viewsCount || 0}</span>
                  <span className="text-white/55 text-[9px] font-medium tracking-wider uppercase mt-0.5">Views</span>
                </span>
              </button>

              {/* Hero Boost / Share button */}
              <button type="button"
                onClick={handleShare}
                className="flex-1 relative h-[46px] rounded-full overflow-hidden active:scale-[0.98] transition shadow-[0_8px_28px_-6px_hsl(160_84%_45%/0.65)]"
                aria-label="Boost story"
              >
                <span className="absolute inset-0 bg-[linear-gradient(135deg,hsl(160_84%_42%)_0%,hsl(174_72%_42%)_50%,hsl(190_85%_50%)_100%)]" />
                <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                <span className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-full" />
                <span className="relative flex items-center justify-center gap-2 h-full">
                  <Send className="w-4 h-4 text-white" strokeWidth={2.5} />
                  <span className="text-white text-[13px] font-bold tracking-wide">Boost story</span>
                </span>
              </button>

              {/* More — single subtle glass dot */}
              <button type="button"
                onClick={() => { setPaused(true); setShowMore(true); }}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-2xl border border-white/10 ring-1 ring-[hsl(160_84%_55%)/0.22] hover:ring-[hsl(160_84%_55%)/0.45] active:scale-[0.95] transition"
                aria-label="More options"
              >
                <MoreHorizontal className="w-[18px] h-[18px] text-white/90" strokeWidth={2} />
              </button>
            </div>
          )}

        </div>

        {/* Insights sheet — Viewers + Reactions tabs */}
        <AnimatePresence>
          {showViewers && isOwner && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-30 bg-card/95 backdrop-blur-xl rounded-t-2xl max-h-[65vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[hsl(160_84%_55%)] to-[hsl(190_85%_55%)]" />
                  <span className="text-sm font-bold text-foreground">Story insights</span>
                </div>
                <button type="button"
                  onClick={() => { setShowViewers(false); setPaused(false); }}
                  aria-label="Close insights"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              {/* Tabs */}
              <div className="flex items-center gap-1 px-3 pt-2 pb-1">
                <button type="button"
                  onClick={() => setViewersTab("viewers")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold transition",
                    viewersTab === "viewers"
                      ? "bg-gradient-to-r from-[hsl(160_84%_45%)]/15 to-[hsl(190_85%_55%)]/15 text-foreground ring-1 ring-[hsl(160_84%_45%)]/30"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Viewers
                  <span className="ml-0.5 text-[11px] opacity-70">{viewers.length}</span>
                </button>
                <button type="button"
                  onClick={() => setViewersTab("reactions")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold transition",
                    viewersTab === "reactions"
                      ? "bg-gradient-to-r from-[hsl(160_84%_45%)]/15 to-[hsl(190_85%_55%)]/15 text-foreground ring-1 ring-[hsl(160_84%_45%)]/30"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Heart className="w-3.5 h-3.5" />
                  Reactions
                  <span className="ml-0.5 text-[11px] opacity-70">{reactionList.length}</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {viewersTab === "viewers" ? (
                  viewers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No viewers yet</p>
                  ) : (
                    viewers.map((v) => (
                      <div key={v.viewer_id} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex-shrink-0">
                          {v.avatar ? (
                            <img src={v.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {v.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{v.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )
                ) : reactionList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No reactions yet</p>
                ) : (
                  reactionList.map((r, i) => {
                    const thread = commentsByReaction.get(r.id) || [];
                    const isOpen = openThreadId === r.id;
                    const canReplyHere = isOwner || user?.id === r.user_id;
                    return (
                      <div key={`${r.id}-${i}`} className="rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 shrink-0">
                            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden">
                              {r.avatar ? (
                                <img src={r.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                                  {r.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="absolute -bottom-1 -right-1 text-[15px] leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
                              {r.emoji}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Reacted {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <button type="button"
                            onClick={() => {
                              setOpenThreadId(isOpen ? null : r.id);
                              setThreadDraft("");
                            }}
                            className={cn(
                              "shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition",
                              isOpen
                                ? "bg-[hsl(160_84%_45%)/0.15] text-foreground ring-1 ring-[hsl(160_84%_45%)/0.4]"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                            aria-label={isOpen ? "Close thread" : "Open thread"}
                          >
                            <MessageCircle className="w-3 h-3" />
                            {thread.length > 0 && <span>{thread.length}</span>}
                            <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
                          </button>
                        </div>

                        {/* Thread body */}
                        {isOpen && (
                          <div className="mt-2 ml-12 pl-3 border-l-2 border-[hsl(160_84%_45%)/0.25] space-y-2">
                            {thread.length === 0 && (
                              <p className="text-[11px] text-muted-foreground italic py-1">
                                No replies yet{canReplyHere ? " — start the thread" : ""}.
                              </p>
                            )}
                            {thread.map((tc) => (
                              <div key={tc.id} className="flex gap-2 items-start">
                                <CornerDownRight className="w-3 h-3 text-muted-foreground/60 mt-1.5 shrink-0" />
                                <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex-shrink-0">
                                  {tc.avatar ? (
                                    <img src={tc.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                                      {tc.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-[11px] font-bold text-foreground">{tc.name}</span>
                                    <span className="text-[9px] text-muted-foreground">
                                      {formatDistanceToNow(new Date(tc.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-foreground leading-snug">{tc.content}</p>
                                </div>
                              </div>
                            ))}
                            {canReplyHere && (
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="text"
                                  value={threadDraft}
                                  onChange={(e) => setThreadDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && threadDraft.trim()) {
                                      postComment.mutate(`[react:${r.id}] ${threadDraft.trim()}`);
                                    }
                                  }}
                                  placeholder="Reply in thread..."
                                  className="flex-1 bg-muted rounded-full px-3 py-1.5 text-[12px] outline-none text-foreground placeholder:text-muted-foreground"
                                />
                                <button type="button"
                                  onClick={() => {
                                    if (threadDraft.trim()) {
                                      postComment.mutate(`[react:${r.id}] ${threadDraft.trim()}`);
                                    }
                                  }}
                                  disabled={postComment.isPending || !threadDraft.trim()}
                                  className="text-[hsl(160_84%_45%)] disabled:opacity-40"
                                  aria-label="Send thread reply"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments sheet */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-30 bg-card/95 backdrop-blur-xl rounded-t-2xl max-h-[65vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Comments ({comments.length})</span>
                </div>
                <button type="button" onClick={() => { setShowComments(false); setPaused(false); }} aria-label="Close comments">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No comments yet. Only friends can comment.
                  </p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {c.avatar ? (
                          <img src={c.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {c.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-foreground">{c.name}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-0.5">{c.content}</p>
                        {user?.id && c.user_id !== user.id && (
                          <button type="button"
                            onClick={() => void handleReportStoryComment(c)}
                            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-destructive hover:bg-destructive/10"
                          >
                            <Flag className="h-3 w-3" />
                            Report 18+
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-border/30">
                <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && commentText.trim()) postComment.mutate(commentText.trim());
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                  />
                  <button type="button"
                    onClick={() => { if (commentText.trim()) postComment.mutate(commentText.trim()); }}
                    disabled={postComment.isPending || !commentText.trim()}
                    className="text-primary disabled:opacity-40"
                    aria-label="Send comment"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground text-center mt-1">Only friends can comment</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story "More" action sheet */}
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/60 flex items-end"
              onClick={() => { setShowMore(false); setPaused(false); }}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="w-full bg-card rounded-t-2xl p-2 pb-[var(--zivo-safe-bottom,16px)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30 my-2" />
                {isOwner && (
                  <button type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(currentStory.mediaUrl, { mode: "cors" });
                        const blob = await res.blob();
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `story-${currentStory.id}.${(currentStory.mediaType === "video" ? "mp4" : "jpg")}`;
                        document.body.appendChild(a); a.click(); a.remove();
                        URL.revokeObjectURL(a.href);
                        toast.success("Saved");
                      } catch { toast.error("Couldn't save"); }
                      setShowMore(false); setPaused(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted text-left"
                  >
                    <Download className="w-5 h-5 text-foreground" />
                    <span className="text-sm font-medium text-foreground">Save to device</span>
                  </button>
                )}
                <button type="button"
                  onClick={() => {
                    const url = `${getPublicOrigin()}/stories/${currentStory.id}`;
                    if (navigator.share) navigator.share({ url }).catch(() => {});
                    else { navigator.clipboard?.writeText(url); toast.success("Link copied"); }
                    setShowMore(false); setPaused(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted text-left"
                >
                  <Share2 className="w-5 h-5 text-foreground" />
                  <span className="text-sm font-medium text-foreground">Share link</span>
                </button>
                {!isOwner && (
                  <button type="button"
                    onClick={() => void handleReportStory()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-left"
                  >
                    <Flag className="w-5 h-5 text-destructive" />
                    <span className="text-sm font-semibold text-destructive">Report 18+</span>
                  </button>
                )}
                {isOwner && (
                  <button type="button"
                    onClick={() => {
                      if (!currentStory) return;
                      const last = viewingGroup.stories.length <= 1;
                      deleteStory.mutate(currentStory.id);
                      setShowMore(false);
                      if (last) closeWithMeta(); else goNext();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-left"
                  >
                    <Trash2 className="w-5 h-5 text-destructive" />
                    <span className="text-sm font-semibold text-destructive">Delete story</span>
                  </button>
                )}
                <button type="button"
                  onClick={() => { setShowMore(false); setPaused(false); }}
                  className="w-full px-4 py-3 mt-1 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Owner: simple Mention sheet — posts an @mention as a story comment */}
        <AnimatePresence>
          {showMention && isOwner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/60 flex items-end"
              onClick={() => { setShowMention(false); setPaused(false); }}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="w-full bg-card rounded-t-2xl p-4 pb-[var(--zivo-safe-bottom,16px)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30 mb-3" />
                <p className="text-sm font-bold text-foreground mb-2">Mention someone</p>
                <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                  <AtSign className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="username"
                    className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <button type="button"
                    className="text-primary text-sm font-semibold disabled:opacity-40"
                    disabled={!commentText.trim() || postComment.isPending}
                    onClick={() => {
                      const handle = commentText.trim().replace(/^@/, "");
                      if (handle) postComment.mutate(`@${handle}`);
                      setShowMention(false); setPaused(false);
                    }}
                  >
                    Send
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Instagram-style "Send to" sheet */}
      {currentStory && (
        <StoryForwardSheet
          open={showForward}
          onClose={() => {
            setShowForward(false);
            setPaused(false);
          }}
          storyId={currentStory.id}
          storyOwnerName={viewingGroup?.userName}
          source={source}
        />
      )}
    </AnimatePresence>
    </div>,
    document.body
  );
}
