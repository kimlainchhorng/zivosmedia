import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PostComment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  is_pinned?: boolean;
  edited_at?: string | null;
  author_name: string;
  author_avatar: string | null;
  author_is_verified?: boolean;
  replies?: PostComment[];
  reactions?: { emoji: string; count: number; reacted: boolean }[];
}

interface UsePostCommentsOptions {
  postId: string;
  postSource: "user" | "store";
  currentUserId: string | null;
}

export function usePostComments({ postId, postSource, currentUserId }: UsePostCommentsOptions) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data: rawComments } = await (supabase as any)
      .from("post_comments")
      .select("id, content, user_id, parent_id, likes_count, created_at, is_pinned, updated_at")
      .eq("post_id", postId)
      .eq("post_source", postSource)
      .order("created_at", { ascending: true });

    if (!rawComments || rawComments.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for all comment authors
    const userIds = [...new Set(rawComments.map((c: any) => c.user_id))] as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Fetch reactions for all comments
    const commentIds = rawComments.map((c: any) => c.id);
    const { data: reactions } = await (supabase as any)
      .from("comment_reactions")
      .select("comment_id, emoji, user_id")
      .in("comment_id", commentIds);

    // Group reactions by comment
    const reactionMap = new Map<string, { emoji: string; count: number; reacted: boolean }[]>();
    for (const r of reactions || []) {
      if (!reactionMap.has(r.comment_id)) reactionMap.set(r.comment_id, []);
      const arr = reactionMap.get(r.comment_id)!;
      const existing = arr.find((e) => e.emoji === r.emoji);
      if (existing) {
        existing.count++;
        if (r.user_id === currentUserId) existing.reacted = true;
      } else {
        arr.push({ emoji: r.emoji, count: 1, reacted: r.user_id === currentUserId });
      }
    }

    // Build comment objects
    const allComments: PostComment[] = rawComments.map((c: any) => {
      const profile = profileMap.get(c.user_id);
      return {
        id: c.id,
        content: c.content,
        user_id: c.user_id,
        parent_id: c.parent_id,
        likes_count: c.likes_count,
        created_at: c.created_at,
        is_pinned: !!c.is_pinned,
        // Surface "edited" indicator if updated_at differs from created_at by >2s
        edited_at: c.updated_at && new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 2000
          ? c.updated_at
          : null,
        author_name: (profile as any)?.full_name || "User",
        author_avatar: (profile as any)?.avatar_url || null,
        author_is_verified: !!(profile as any)?.is_verified,
        replies: [],
        reactions: reactionMap.get(c.id) || [],
      };
    });

    // Build tree: top-level + nested replies
    const topLevel: PostComment[] = [];
    const replyMap = new Map<string, PostComment[]>();
    for (const c of allComments) {
      if (!c.parent_id) {
        topLevel.push(c);
      } else {
        if (!replyMap.has(c.parent_id)) replyMap.set(c.parent_id, []);
        replyMap.get(c.parent_id)!.push(c);
      }
    }
    for (const c of topLevel) {
      c.replies = replyMap.get(c.id) || [];
    }

    setComments(topLevel);
    setLoading(false);
  }, [postId, postSource, currentUserId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Realtime: refetch when a new comment lands on this post.
  // Skips inserts authored by the current user since addComment() already
  // refetches synchronously after writing — avoids the visible double-flash.
  useEffect(() => {
    if (!postId) return;
    const channel = supabase
      .channel(`post-comments-${postSource}-${postId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        (payload: any) => {
          const row = payload?.new;
          if (!row) return;
          if (row.post_source && row.post_source !== postSource) return;
          if (row.user_id && row.user_id === currentUserId) return;
          fetchComments();
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [postId, postSource, currentUserId, fetchComments]);

  const addComment = async (content: string, parentId?: string) => {
    if (!currentUserId || !content.trim()) return;
    setSubmitting(true);

    // Optimistic insert — show the comment in the list immediately so the
    // user sees their submission without a network round-trip. We patch in
    // a temporary id; fetchComments() at the end replaces it with the real
    // row (including server-generated id, author profile, reactions).
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: PostComment = {
      id: tempId,
      content: content.trim(),
      user_id: currentUserId,
      parent_id: parentId || null,
      likes_count: 0,
      created_at: new Date().toISOString(),
      author_name: "You",
      author_avatar: null,
      replies: [],
      reactions: [],
    };
    setComments((prev) => {
      if (parentId) {
        // Reply — append to parent's replies
        return prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), optimistic] }
            : c,
        );
      }
      // Top-level — append at the end (matches order: created_at asc)
      return [...prev, optimistic];
    });

    const { error } = await (supabase as any).from("post_comments").insert({
      post_id: postId,
      post_source: postSource,
      user_id: currentUserId,
      content: content.trim(),
      parent_id: parentId || null,
    });

    if (error) {
      // Roll back the optimistic insert on failure
      setComments((prev) => {
        if (parentId) {
          return prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies || []).filter((r) => r.id !== tempId) }
              : c,
          );
        }
        return prev.filter((c) => c.id !== tempId);
      });
      setSubmitting(false);
      return;
    }

    // Push notification to post author
    try {
      // Look up the post author
      const table = postSource === "user" ? "user_posts" : "store_posts";
      const authorField = postSource === "user" ? "user_id" : "store_id";
      const { data: postData } = await (supabase as any).from(table).select(authorField).eq("id", postId).maybeSingle();
      const authorId = postData?.[authorField];
      if (authorId && authorId !== currentUserId) {
        const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", currentUserId).single();
        const preview = content.trim().length > 60 ? content.trim().slice(0, 60) + "…" : content.trim();
        await supabase.functions.invoke("send-push-notification", {
          body: { user_id: authorId, notification_type: "post_comment", title: "New Comment 💬", body: `${sp?.full_name || "Someone"}: ${preview}`, data: { type: "post_comment", post_id: postId, commenter_id: currentUserId, action_url: `/reels?post=${postId}` } },
        });
      }
    } catch {}

    // Replace the optimistic row with the real one (real id, author profile)
    await fetchComments();
    setSubmitting(false);
  };

  const deleteComment = async (commentId: string) => {
    // Optimistic remove — mirrors addComment / toggleReaction pattern.
    // The recursive filter handles both top-level comments and nested
    // replies (so deleting a reply doesn't leave it briefly visible).
    const removeFromList = (list: PostComment[]): PostComment[] =>
      list
        .filter((c) => c.id !== commentId)
        .map((c) =>
          c.replies && c.replies.length > 0
            ? { ...c, replies: removeFromList(c.replies) }
            : c,
        );

    const previous = comments;
    setComments((prev) => removeFromList(prev));

    try {
      const { error } = await (supabase as any).from("post_comments").delete().eq("id", commentId);
      if (error) throw error;
      await fetchComments();
    } catch {
      setComments(previous);
    }
  };

  const editComment = async (commentId: string, nextContent: string) => {
    if (!currentUserId || !nextContent.trim()) return;
    const trimmed = nextContent.trim();

    // Optimistic content update — same recursion to cover nested replies.
    const editInList = (list: PostComment[]): PostComment[] =>
      list.map((c) => {
        if (c.id === commentId) {
          return { ...c, content: trimmed, edited_at: new Date().toISOString() };
        }
        return c.replies && c.replies.length > 0
          ? { ...c, replies: editInList(c.replies) }
          : c;
      });

    const previous = comments;
    setComments((prev) => editInList(prev));

    try {
      const { error } = await (supabase as any)
        .from("post_comments")
        .update({ content: trimmed, updated_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("user_id", currentUserId);
      if (error) throw error;
      await fetchComments();
    } catch {
      setComments(previous);
    }
  };

  const togglePin = async (commentId: string): Promise<boolean | null> => {
    const { data, error } = await (supabase as any)
      .rpc("toggle_unified_comment_pin", { _comment_id: commentId });
    if (error) return null;
    await fetchComments();
    const row = Array.isArray(data) ? data[0] : data;
    return !!row?.pinned;
  };

  const toggleReaction = async (commentId: string, emoji: string) => {
    if (!currentUserId) return;

    // Optimistic flip — instantly toggle the local reaction so taps feel
    // snappy, then reconcile with the database. The previous flow waited
    // for an existence check + write + 3-table refetch (3 round-trips
    // serial) before the UI reflected the change.
    const flipReactionInList = (list: PostComment[]): PostComment[] =>
      list.map((c) => {
        if (c.id !== commentId) {
          // Recurse into replies in case the target is a nested comment
          return c.replies && c.replies.length > 0
            ? { ...c, replies: flipReactionInList(c.replies) }
            : c;
        }
        const reactions = c.reactions ? [...c.reactions] : [];
        const existing = reactions.find((r) => r.emoji === emoji);
        if (existing) {
          if (existing.reacted) {
            // We had reacted — remove our vote (count down, mark not reacted)
            const next = { ...existing, count: Math.max(0, existing.count - 1), reacted: false };
            const filtered = reactions
              .map((r) => (r.emoji === emoji ? next : r))
              .filter((r) => r.count > 0);
            return { ...c, reactions: filtered };
          } else {
            // Someone else had reacted — add our vote (count up, mark reacted)
            return {
              ...c,
              reactions: reactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r,
              ),
            };
          }
        }
        // No existing reaction for this emoji — add ours
        return { ...c, reactions: [...reactions, { emoji, count: 1, reacted: true }] };
      });

    const previousComments = comments;
    setComments((prev) => flipReactionInList(prev));

    try {
      // Check if already reacted (server-side source of truth)
      const { data: existing } = await (supabase as any)
        .from("comment_reactions")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji)
        .maybeSingle();

      if (existing) {
        await (supabase as any).from("comment_reactions").delete().eq("id", existing.id);
      } else {
        await (supabase as any).from("comment_reactions").insert({
          comment_id: commentId,
          user_id: currentUserId,
          emoji,
        });
      }
      // Reconcile with the server (catches drift if another client also
      // toggled at the same moment)
      await fetchComments();
    } catch {
      // Roll back on failure
      setComments(previousComments);
    }
  };

  return {
    comments,
    loading,
    submitting,
    addComment,
    deleteComment,
    editComment,
    toggleReaction,
    togglePin,
    refetch: fetchComments,
  };
}
