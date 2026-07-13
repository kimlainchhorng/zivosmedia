/**
 * CommentsSheet — 2026 UX/UI redesign
 * TikTok/Instagram-inspired bottom sheet: bubble comments, overflow actions,
 * animated reactions, gradient empty state, and safe-area-aware composer.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Trash2, ChevronDown, ChevronUp, X,
  Pencil, Pin, PinOff, Flag, MessageCircle,
  Smile, MoreHorizontal, Heart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { usePostComments } from "@/hooks/usePostComments";
import type { PostComment } from "@/hooks/usePostComments";
import { useHaptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CommentRowsSkeleton } from "@/components/social/EngagementSkeleton";
import SwipeableSheet from "@/components/social/SwipeableSheet";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";

const REACTION_EMOJIS = ["😂", "😮", "😢", "🔥", "👏"];

const COMMENT_REPORT_REASONS = [
  { label: "Sexual/18+", reason: "Nudity or sexual content" },
  { label: "Exploitation", reason: "Content involving minors or exploitation" },
  { label: "Harassment", reason: "Harassment or abuse" },
] as const;

interface CommentsSheetProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  postSource: "user" | "store";
  currentUserId: string | null;
  commentsCount: number;
  onCommentsCountChange?: (count: number) => void;
  dark?: boolean;
  canComment?: boolean;
  disabledReason?: string;
}

export default function CommentsSheet({
  open, onClose, postId, postSource, currentUserId, commentsCount,
  onCommentsCountChange, dark = false, canComment = true, disabledReason,
}: CommentsSheetProps) {
  const {
    comments, loading, submitting,
    addComment, deleteComment, editComment, reportComment, toggleReaction, togglePin,
  } = usePostComments({ postId, postSource, currentUserId });

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [isPostAuthor, setIsPostAuthor] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUserId || !postId) { setIsPostAuthor(false); return; }
    let cancelled = false;
    (async () => {
      if (postSource === "user") {
        const { data } = await (supabase as any)
          .from("user_posts").select("user_id").eq("id", postId).maybeSingle();
        if (!cancelled) setIsPostAuthor(!!data && data.user_id === currentUserId);
      } else {
        const { data } = await (supabase as any)
          .from("store_posts").select("store_id").eq("id", postId).maybeSingle();
        if (!data?.store_id) { if (!cancelled) setIsPostAuthor(false); return; }
        const { data: store } = await (supabase as any)
          .from("store_profiles").select("owner_id").eq("id", data.store_id).maybeSingle();
        if (!cancelled) setIsPostAuthor(!!store?.owner_id && store.owner_id === currentUserId);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUserId, postId, postSource]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    if (!currentUserId) { toast.error("Please sign in to comment"); return; }
    if (!canComment) { toast.error(disabledReason || "You can't comment on this post"); return; }
    await addComment(text.trim(), replyTo?.id);
    setText("");
    setReplyTo(null);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
  };

  const totalComments = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);

  // Keep a stable ref so the effect below doesn't re-fire every time FeedPage
  // recreates the inline arrow function, which would loop via setQueryData.
  const onCountChangeRef = useRef(onCommentsCountChange);
  onCountChangeRef.current = onCommentsCountChange;
  useEffect(() => {
    if (open && !loading) onCountChangeRef.current?.(totalComments);
  }, [open, loading, totalComments]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleCommentCount = loading ? commentsCount : totalComments;
  const compactSheet = !dark && visibleCommentCount <= 3;
  const trimmedText = text.trim();
  const charCount = text.length;

  const sortedComments = useMemo(() => [...comments].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return sort === "top"
      ? ((b.reactions?.length || 0) + (b.replies?.length || 0)) - ((a.reactions?.length || 0) + (a.replies?.length || 0))
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [comments, sort]);

  return (
    <SwipeableSheet
      open={open}
      onClose={onClose}
      ariaLabel="Comments"
      hideCloseButton
      maxHeightVh={compactSheet ? 62 : 72}
      zIndex={1600}
      safeAreaTop={false}
      className={cn(!compactSheet && "h-[72dvh]", dark && "!bg-zinc-950 text-white")}
      headerClassName={cn("m-2 rounded-[1.25rem]", dark && "border-0")}
    >
      <div className={cn("flex flex-col h-full min-h-0", dark && "bg-zinc-950")}>

        {/* Sort tabs — only shown when there are 2+ top-level comments */}
        {comments.length >= 2 && (
          <div className={cn("shrink-0 px-3 pb-2 pt-0", dark && "border-b border-white/[0.05]")}>
            <div className={cn(
              "flex gap-1 rounded-full p-1",
              dark ? "bg-white/[0.04]" : "zivo-social-module-tile",
            )}>
              {(["recent", "top"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition-all active:scale-[0.97]",
                    sort === s
                      ? "bg-ig-gradient text-white shadow-sm"
                      : dark ? "text-white/40 hover:text-white/60" : "text-muted-foreground/70",
                  )}
                >
                  {s === "recent" ? "Newest" : "Top"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment list — the only scrollable region */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-1 scrollbar-none"
        >
          {loading ? (
            <CommentRowsSkeleton rows={compactSheet ? Math.max(1, visibleCommentCount) : 4} />
          ) : comments.length === 0 ? (
            /* ── 2026 empty state ── */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-14 px-6 text-center"
            >
              <div className={cn(
                "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 shadow-[0_4px_24px_rgba(236,72,153,0.12)]",
                dark
                  ? "bg-gradient-to-br from-orange-400/20 via-pink-500/20 to-purple-600/20 ring-white/10"
                  : "bg-gradient-to-br from-orange-400/10 via-pink-500/10 to-purple-600/10 ring-primary/15",
              )}>
                <MessageCircle className={cn("h-7 w-7", dark ? "text-white/50" : "text-primary/60")} />
              </div>
              <p className={cn("text-[15px] font-bold mb-1", dark ? "text-white" : "text-foreground")}>
                No comments yet
              </p>
              <p className={cn("text-[12px] mb-5 max-w-[200px]", dark ? "text-white/40" : "text-muted-foreground")}>
                Be the first to share your thoughts
              </p>
              {canComment && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => inputRef.current?.focus()}
                  className="rounded-full bg-ig-gradient px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(236,72,153,0.30)]"
                >
                  Start the conversation
                </motion.button>
              )}
            </motion.div>
          ) : (
            sortedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isPostAuthor={isPostAuthor}
                dark={dark}
                onReply={(id, name) => {
                  if (!canComment) { toast.error(disabledReason || "You can't comment on this post"); return; }
                  setReplyTo({ id, name });
                  inputRef.current?.focus();
                }}
                onDelete={deleteComment}
                onEdit={editComment}
                onReport={reportComment}
                onTogglePin={togglePin}
                onToggleReaction={toggleReaction}
                showReactionsFor={showReactionsFor}
                setShowReactionsFor={setShowReactionsFor}
              />
            ))
          )}
        </div>

        {/* ── Composer bar ── */}
        <div className={cn(
          "shrink-0",
          dark
            ? "bg-zinc-950/95 border-t border-white/[0.06]"
            : "bg-background border-t border-border/20",
        )}>
          {/* Reply indicator */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden px-3 pt-2"
              >
                <div className={cn(
                  "flex items-center justify-between rounded-2xl px-3 py-2",
                  dark
                    ? "bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10 border border-white/[0.07]"
                    : "bg-primary/5 border border-primary/15",
                )}>
                  <span className={cn("text-xs", dark ? "text-white/55" : "text-muted-foreground")}>
                    Replying to{" "}
                    <span className={cn("font-semibold", dark ? "text-white/90" : "text-foreground")}>
                      {replyTo.name}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    aria-label="Cancel reply"
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full",
                      dark ? "hover:bg-white/10" : "hover:bg-muted/50",
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="px-3 py-3"
            style={{ paddingBottom: "max(calc(var(--zivo-safe-bottom,0px) + 0.75rem), 0.75rem)" }}
          >
            <div className="flex items-center gap-2">
              {/* Input pill */}
              <div className={cn(
                "flex min-h-[44px] flex-1 items-center gap-2 rounded-full px-3",
                dark
                  ? "bg-white/[0.06] border border-white/[0.08]"
                  : "bg-muted/40",
              )}>
                <Smile className={cn("h-4 w-4 shrink-0", dark ? "text-white/25" : "text-muted-foreground/50")} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    !canComment
                      ? disabledReason || "Comments are limited"
                      : replyTo
                        ? `Reply to ${replyTo.name}…`
                        : "Add a comment…"
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    // Don't submit mid-IME-composition (Khmer/CJK candidate Enter)
                    // or on Shift+Enter; both should compose, not send.
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={!canComment}
                  maxLength={280}
                  className={cn(
                    "min-w-0 flex-1 bg-transparent py-2.5 text-[13px] outline-none disabled:cursor-not-allowed",
                    dark ? "text-white placeholder:text-white/25" : "text-foreground placeholder:text-muted-foreground",
                  )}
                />
                {charCount > 200 && (
                  <span className={cn(
                    "shrink-0 tabular-nums text-[10px] font-semibold",
                    charCount > 260
                      ? "text-red-400"
                      : dark ? "text-white/35" : "text-muted-foreground",
                  )}>
                    {280 - charCount}
                  </span>
                )}
              </div>

              {/* Send button — animates in when text is present */}
              <AnimatePresence>
                {trimmedText && (
                  <motion.button
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", damping: 18, stiffness: 340 }}
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !canComment}
                    aria-label={replyTo ? `Send reply to ${replyTo.name}` : "Send comment"}
                    className="h-11 w-11 shrink-0 rounded-full bg-ig-gradient flex items-center justify-center shadow-[0_4px_18px_rgba(236,72,153,0.35)] active:scale-90 transition-transform disabled:opacity-50"
                  >
                    <Send className="h-4 w-4 text-white" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </SwipeableSheet>
  );
}

// ─── Single Comment Item ─────────────────────────────────────────────────────
function CommentItem({
  comment, currentUserId, isPostAuthor = false, dark,
  onReply, onDelete, onEdit, onReport, onTogglePin, onToggleReaction,
  showReactionsFor, setShowReactionsFor, isReply = false,
}: {
  comment: PostComment;
  currentUserId: string | null;
  isPostAuthor?: boolean;
  dark: boolean;
  onReply: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, nextContent: string) => void | Promise<void>;
  onReport?: (comment: PostComment, reason: string) => Promise<boolean>;
  onTogglePin?: (id: string) => void | Promise<boolean | null>;
  onToggleReaction: (commentId: string, emoji: string) => void;
  showReactionsFor: string | null;
  setShowReactionsFor: (id: string | null) => void;
  isReply?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showReportChoices, setShowReportChoices] = useState(false);
  const [reporting, setReporting] = useState(false);
  const haptic = useHaptic();
  const isOwn = currentUserId === comment.user_id;

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(comment.created_at), { addSuffix: false }); }
    catch { return ""; }
  })();

  const mutedColor = dark ? "text-white/35" : "text-muted-foreground";
  const bubbleBg = cn(
    "rounded-2xl px-3 py-2.5",
    dark
      ? comment.is_pinned && !isReply
        ? "bg-primary/10 border border-primary/20"
        : "bg-white/[0.05]"
      : comment.is_pinned && !isReply
        ? "bg-primary/5 border border-primary/15"
        : "bg-muted/40",
  );

  return (
    <div className={cn("flex gap-2.5 py-1", isReply && "ml-10")}>
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={comment.author_avatar || undefined} />
        <AvatarFallback className={cn(
          "text-[11px] font-bold",
          dark ? "bg-white/10 text-white/70" : "",
        )}>
          {comment.author_name[0]}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Pinned label */}
        {comment.is_pinned && !isReply && (
          <div className="mb-1.5 flex items-center gap-1">
            <Pin className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Pinned</span>
          </div>
        )}

        {editing ? (
          /* ── Edit mode ── */
          <div className="flex flex-col gap-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              rows={2}
              className={cn(
                "w-full resize-none rounded-2xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary/30",
                dark ? "border border-white/15 bg-white/[0.06] text-white" : "bg-muted/50 text-foreground",
              )}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setEditText(comment.content); }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium",
                  dark ? "text-white/55 hover:bg-white/10" : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit || !editText.trim() || editText.trim() === comment.content}
                onClick={async () => {
                  if (!onEdit) return;
                  setSavingEdit(true);
                  try {
                    await onEdit(comment.id, editText.trim());
                    setEditing(false);
                    toast.success("Comment updated");
                  } finally {
                    setSavingEdit(false);
                  }
                }}
                className="rounded-full bg-ig-gradient px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          /* ── Content bubble ── */
          <div className={bubbleBg}>
            <p className="text-[13px] leading-snug">
              <span className={cn(
                "font-bold mr-1 inline-flex items-center gap-0.5 align-middle",
                dark ? "text-white" : "text-foreground",
              )}>
                {comment.author_name}
                {isBlueVerified(comment.author_is_verified) && <VerifiedBadge size={11} />}
              </span>
              <span className={dark ? "text-white/85" : "text-foreground/90"}>{comment.content}</span>
              {comment.edited_at && (
                <span className={cn("ml-1 text-[10px] italic", mutedColor)}>(edited)</span>
              )}
            </p>
          </div>
        )}

        {/* Meta row: time · reply · 😊 · · · [❤ N] [···] */}
        {!editing && (() => {
          const heartReaction = comment.reactions?.find((r) => r.emoji === "❤️");
          const heartCount = heartReaction?.count ?? 0;
          const hasLiked = heartReaction?.reacted ?? false;
          return (
            <div className="flex items-center gap-2.5 mt-1.5 px-1">
              <span className={cn("text-[11px]", mutedColor)}>{timeAgo}</span>
              <button
                type="button"
                onClick={() => onReply(comment.id, comment.author_name)}
                className={cn("text-[11px] font-semibold transition-colors", mutedColor, "hover:opacity-80")}
              >
                Reply
              </button>
              <button
                type="button"
                onClick={() => setShowReactionsFor(showReactionsFor === comment.id ? null : comment.id)}
                className={cn("text-[13px] transition-opacity", showReactionsFor === comment.id ? "opacity-100" : "opacity-40 hover:opacity-70")}
                aria-label="React"
              >
                😊
              </button>
              {/* Heart / like — Instagram-style */}
              <motion.button
                type="button"
                key={`heart-${hasLiked}`}
                initial={false}
                whileTap={{ scale: 1.5 }}
                animate={hasLiked ? { scale: [1, 1.4, 0.9, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                onClick={() => { haptic(hasLiked ? "light" : "medium"); onToggleReaction(comment.id, "❤️"); }}
                className="ml-auto flex items-center gap-1"
                aria-label={hasLiked ? "Unlike" : "Like"}
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-all duration-200",
                    hasLiked
                      ? "fill-red-500 text-red-500"
                      : dark ? "text-white/30" : "text-muted-foreground/40",
                  )}
                />
                {heartCount > 0 && (
                  <span className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    hasLiked ? "text-red-500" : mutedColor,
                  )}>
                    {heartCount}
                  </span>
                )}
              </motion.button>
              {/* Overflow actions */}
              <button
                type="button"
                onClick={() => { haptic("selection"); setShowMore(!showMore); setShowReportChoices(false); }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                  showMore
                    ? dark ? "bg-white/15" : "bg-muted"
                    : dark ? "hover:bg-white/10" : "hover:bg-muted/60",
                )}
                aria-label="More actions"
              >
                <MoreHorizontal className={cn("h-3.5 w-3.5", mutedColor)} />
              </button>
            </div>
          );
        })()}

        {/* Overflow action panel */}
        <AnimatePresence>
          {showMore && !editing && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "mt-1.5 flex flex-wrap gap-1.5 rounded-2xl p-2",
                dark
                  ? "bg-white/[0.04] border border-white/[0.07]"
                  : "bg-muted/30 border border-border/30",
              )}
            >
              {isOwn && onEdit && (
                <button
                  type="button"
                  onClick={() => { setEditText(comment.content); setEditing(true); setShowMore(false); haptic("selection"); }}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold",
                    dark ? "bg-white/[0.08] text-white/80" : "bg-muted text-foreground",
                  )}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              )}
              {isPostAuthor && onTogglePin && !isReply && (
                <button
                  type="button"
                  onClick={async () => {
                    haptic(comment.is_pinned ? "light" : "medium");
                    const next = await onTogglePin(comment.id);
                    if (next === null) toast.error("Couldn't update pin");
                    else toast.success(next ? "Pinned to top" : "Unpinned");
                    setShowMore(false);
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold",
                    dark ? "bg-white/[0.08] text-white/80" : "bg-muted text-foreground",
                  )}
                >
                  {comment.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                  {comment.is_pinned ? "Unpin" : "Pin"}
                </button>
              )}
              {isOwn && (
                <button
                  type="button"
                  onClick={() => { haptic("medium"); onDelete(comment.id); setShowMore(false); }}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold bg-red-500/15 text-red-400"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              )}
              {!isOwn && onReport && !showReportChoices && (
                <button
                  type="button"
                  onClick={() => setShowReportChoices(true)}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold",
                    dark ? "bg-white/[0.08] text-white/55" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Flag className="h-3 w-3" /> Report
                </button>
              )}
              {!isOwn && onReport && showReportChoices && COMMENT_REPORT_REASONS.map((item) => (
                <button
                  key={item.reason}
                  type="button"
                  disabled={reporting}
                  onClick={async () => {
                    setReporting(true);
                    try {
                      const reported = await onReport(comment, item.reason);
                      if (reported) { setShowReportChoices(false); setShowMore(false); }
                    } finally {
                      setReporting(false);
                    }
                  }}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50",
                    dark
                      ? "border border-white/15 bg-white/[0.08] text-white/80"
                      : "border border-border bg-muted text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction pills — ❤️ is the dedicated heart button, exclude it here */}
        {comment.reactions && comment.reactions.filter((r) => r.emoji !== "❤️").length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 px-1">
            {comment.reactions.filter((r) => r.emoji !== "❤️").map((r) => (
              <button
                type="button"
                key={r.emoji}
                onClick={() => onToggleReaction(comment.id, r.emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all active:scale-95",
                  r.reacted
                    ? "bg-ig-gradient text-white shadow-[0_2px_8px_rgba(236,72,153,0.22)]"
                    : dark
                      ? "bg-white/[0.06] border border-white/10 text-white/75"
                      : "bg-muted/60 border border-border/30 text-foreground/80",
                )}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactionsFor === comment.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.80, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.80, y: 6 }}
              transition={{ type: "spring", damping: 20, stiffness: 360 }}
              className={cn(
                "mt-2 flex w-fit gap-0.5 rounded-full p-1.5",
                dark
                  ? "bg-zinc-800/90 border border-white/10 backdrop-blur-sm"
                  : "bg-background border border-border/40 shadow-lg",
              )}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <motion.button
                  type="button"
                  key={emoji}
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.3, y: -4 }}
                  transition={{ type: "spring", damping: 14, stiffness: 400 }}
                  onClick={() => { onToggleReaction(comment.id, emoji); setShowReactionsFor(null); }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[18px]"
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies thread toggle */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 px-1">
            <button
              type="button"
              onClick={() => setShowReplies(!showReplies)}
              className={cn("flex items-center gap-1.5 text-[11px] font-semibold", mutedColor)}
            >
              <div className={cn("w-5 h-px", dark ? "bg-white/15" : "bg-border")} />
              {showReplies ? (
                <><ChevronUp className="h-3 w-3" /> Hide {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> View {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</>
              )}
            </button>
            <AnimatePresence>
              {showReplies && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-1 space-y-1"
                >
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={currentUserId}
                      isPostAuthor={isPostAuthor}
                      dark={dark}
                      onReply={onReply}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onReport={onReport}
                      onTogglePin={onTogglePin}
                      onToggleReaction={onToggleReaction}
                      showReactionsFor={showReactionsFor}
                      setShowReactionsFor={setShowReactionsFor}
                      isReply
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
