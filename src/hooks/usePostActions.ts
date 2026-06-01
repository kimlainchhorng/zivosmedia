/**
 * usePostActions — bookmark, mute, block, report actions for a feed post.
 *
 * Bookmarks: persists to `post_bookmarks` (auto-creates the row server-side).
 * Mute/Block/Report: writes to `user_safety_actions` so the feed query can
 * filter them out next refetch.
 *
 * All operations are best-effort and toast on failure so the feed UX never
 * blocks on a network round-trip.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isSensitiveReportReason } from "@/lib/social/sensitiveContent";
import { submitSafetyReport } from "@/lib/social/safetyReport";
import { removePostBookmark, savePostBookmark } from "@/lib/social/postBookmarkManage";

export type PostSource = "store" | "user";

export interface PostActionTarget {
  postId: string;       // raw id (no "u-" prefix)
  source: PostSource;
  authorId?: string;    // user_id for "user" posts; store owner for "store" posts
}

export function usePostActions(userId: string | null) {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Hydrate the bookmark set on mount
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("post_bookmarks")
        .select("post_id, source")
        .eq("user_id", userId);
      if (cancelled || error || !data) return;
      const set = new Set<string>(data.map((r: any) => `${r.source}:${r.post_id}`));
      setBookmarkedIds(set);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const toggleBookmark = useCallback(async (target: PostActionTarget) => {
    if (!userId) {
      toast.error("Sign in to save posts");
      return;
    }
    const key = `${target.source}:${target.postId}`;
    const isBookmarked = bookmarkedIds.has(key);

    // Optimistic update
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      if (isBookmarked) {
        const { error } = await removePostBookmark({
          post_id: target.postId,
          source: target.source,
        });
        if (error) throw error;
        toast.success("Removed from saved");
      } else {
        const { error } = await savePostBookmark({
          post_id: target.postId,
          source: target.source,
        });
        if (error) {
          // Treat unique-key violations as already-saved success — the local
          // optimistic flip already reflects that.
          const msg = String(error.message || "").toLowerCase();
          if (!msg.includes("duplicate") && !msg.includes("unique")) throw error;
          toast.success("Already saved");
        } else {
          toast.success("Saved to your bookmarks");
        }
      }
    } catch (e: any) {
      // Roll back on failure
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (isBookmarked) next.add(key);
        else next.delete(key);
        return next;
      });
      const reason = e?.message || e?.error_description || "unknown";
      console.error("[toggleBookmark]", e);
      toast.error(`Couldn't update bookmark: ${reason}`);
    }
  }, [userId, bookmarkedIds]);

  const isBookmarked = useCallback(
    (target: PostActionTarget) => bookmarkedIds.has(`${target.source}:${target.postId}`),
    [bookmarkedIds]
  );

  const muteAuthor = useCallback(async (target: PostActionTarget) => {
    if (!userId || !target.authorId) {
      toast.error("Sign in to mute users");
      return;
    }
    try {
      await submitSafetyReport({
        type: "safety_action",
        target_user_id: target.authorId,
        action: "mute",
      });
      toast.success("Muted — you won't see their posts");
    } catch {
      toast.error("Couldn't mute");
    }
  }, [userId]);

  const blockAuthor = useCallback(async (target: PostActionTarget) => {
    if (!userId || !target.authorId) {
      toast.error("Sign in to block users");
      return;
    }
    try {
      await submitSafetyReport({
        type: "safety_action",
        target_user_id: target.authorId,
        action: "block",
      });
      toast.success("Blocked");
    } catch {
      toast.error("Couldn't block");
    }
  }, [userId]);

  const reportPost = useCallback(async (target: PostActionTarget, reason: string) => {
    if (!userId) {
      toast.error("Sign in to report content");
      return;
    }
    try {
      const sensitiveReport = isSensitiveReportReason(reason);
      await submitSafetyReport({
        type: "post",
        post_id: target.postId,
        post_source: target.source,
        reason,
        target_user_id: target.authorId,
        auto_block: sensitiveReport,
      });
      toast.success(sensitiveReport ? "We hid it, blocked this user, and sent it for safety review" : "Thanks — we'll review this post");
    } catch {
      toast.error("Couldn't submit report");
    }
  }, [userId]);

  return {
    isBookmarked,
    toggleBookmark,
    muteAuthor,
    blockAuthor,
    reportPost,
  };
}
