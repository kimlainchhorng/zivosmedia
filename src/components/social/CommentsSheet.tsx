/**
 * CommentsSheet — Instagram-style bottom sheet for post comments
 * Supports reply threads, emoji reactions, and real-time updates
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, ChevronDown, ChevronUp, X, Pencil, Pin, PinOff, Flag, MessageCircle, Smile, Sparkles, ShieldCheck } from "lucide-react";
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

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥"];

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
  dark?: boolean; // for fullscreen reels mode
  canComment?: boolean;
  disabledReason?: string;
}

export default function CommentsSheet({
  open, onClose, postId, postSource, currentUserId, commentsCount, onCommentsCountChange, dark = false, canComment = true, disabledReason,
}: CommentsSheetProps) {
  const { comments, loading, submitting, addComment, deleteComment, editComment, reportComment, toggleReaction, togglePin } = usePostComments({
    postId, postSource, currentUserId,
  });
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [sort, setSort] = useState<"recent" | "top">("recent");
  // Track whether caller owns the post → controls Pin/Unpin visibility
  const [isPostAuthor, setIsPostAuthor] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUserId || !postId) { setIsPostAuthor(false); return; }
    let cancelled = false;
    (async () => {
      if (postSource === "user") {
        const { data } = await (supabase as any)
          .from("user_posts")
          .select("user_id")
          .eq("id", postId)
          .maybeSingle();
        if (!cancelled) setIsPostAuthor(!!data && data.user_id === currentUserId);
      } else {
        const { data } = await (supabase as any)
          .from("store_posts")
          .select("store_id")
          .eq("id", postId)
          .maybeSingle();
        if (!data?.store_id) { if (!cancelled) setIsPostAuthor(false); return; }
        const { data: store } = await (supabase as any)
          .from("store_profiles")
          .select("owner_id")
          .eq("id", data.store_id)
          .maybeSingle();
        if (!cancelled) setIsPostAuthor(!!store?.owner_id && store.owner_id === currentUserId);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUserId, postId, postSource]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    if (!currentUserId) { toast.error("Please sign in to comment"); return; }
    if (!canComment) {
      toast.error(disabledReason || "You can't comment on this post");
      return;
    }
    await addComment(text, replyTo?.id);
    setText("");
    setReplyTo(null);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
  };

  const totalComments = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
  const bg = dark ? "bg-black/95 text-white" : "bg-background text-foreground";
  const border = dark ? "border-white/10" : "border-border";
  const mutedText = dark ? "text-white/50" : "text-muted-foreground";
  const inputBg = dark ? "bg-white/10 text-white placeholder:text-white/40 border border-white/15" : "zivo-social-sheet-input text-foreground placeholder:text-muted-foreground";

  useEffect(() => {
    if (open && !loading) onCommentsCountChange?.(totalComments);
  }, [open, loading, totalComments, onCommentsCountChange]);

  const visibleCommentCount = loading ? commentsCount : totalComments;
  const compactSheet = !dark && visibleCommentCount <= 3;
  const topLevelCount = comments.length;
  const replyCount = comments.reduce((sum, comment) => sum + (comment.replies?.length || 0), 0);
  const pinnedCount = comments.filter((comment) => comment.is_pinned).length;
  const trimmedText = text.trim();
  const composerReady = canComment && trimmedText.length > 0;
  const composerMode = replyTo ? "Reply mode" : "Comment mode";
  const conversationSignal =
    pinnedCount > 0
      ? { label: "Pinned focus", detail: `${pinnedCount} comment${pinnedCount === 1 ? "" : "s"} anchored`, width: "100%" }
      : replyCount >= topLevelCount && topLevelCount > 0
        ? { label: "Threaded talk", detail: `${replyCount} repl${replyCount === 1 ? "y" : "ies"} in motion`, width: "76%" }
        : visibleCommentCount > 0
          ? { label: "Conversation live", detail: `${visibleCommentCount} comment${visibleCommentCount === 1 ? "" : "s"} loaded`, width: `${Math.min(88, Math.max(34, visibleCommentCount * 12))}%` }
          : { label: "Open floor", detail: "Be first to comment", width: "22%" };

  const headerTitle = (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
          dark ? "bg-white/10 text-white" : "zivo-social-share-orb text-primary",
        )}
      >
        <MessageCircle className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h3 className={cn("truncate text-[15px] font-semibold leading-tight", dark && "text-white")}>
          Comments {visibleCommentCount > 0 && `(${visibleCommentCount})`}
        </h3>
        <p className={cn("truncate text-[11px] font-medium", mutedText)}>
          {loading ? "Loading the conversation" : visibleCommentCount > 0 ? "Join the conversation" : "Start the conversation"}
        </p>
      </div>
    </div>
  );

  return (
    <SwipeableSheet
      open={open}
      onClose={onClose}
      title={headerTitle}
      ariaLabel="Comments"
      maxHeightVh={compactSheet ? 62 : 72}
      zIndex={1600}
      safeAreaTop={false}
      className={cn(!compactSheet && "h-[72dvh]", dark && "!bg-black/95 text-white")}
      headerClassName={cn(
        "m-2 rounded-[1.25rem]",
        dark ? "border border-white/10 bg-white/[0.06]" : "zivo-social-header-glass border-transparent",
      )}
    >
      {/* Wrap in a column so the comments list scrolls and the input bar
          (emoji + reply indicator + textbox) stays pinned at the bottom. */}
      <div className="flex flex-col h-full min-h-0">
        {!loading && comments.length > 0 && (
          <div className={cn("shrink-0 px-3 pb-2 pt-1", dark && "border-b border-white/10")}>
            <div className="grid grid-cols-3 gap-2">
              <div className={cn("flex items-center gap-2 rounded-2xl px-3 py-2", dark ? "bg-white/[0.06] border border-white/10" : "zivo-social-module-tile")}>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-xl", dark ? "bg-white/10 text-white" : "bg-primary/10 text-primary")}>
                  <MessageCircle className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className={cn("text-xs font-black leading-none", dark ? "text-white" : "text-foreground")}>{topLevelCount}</p>
                  <p className={cn("mt-1 truncate text-[10px] font-semibold", mutedText)}>Threads</p>
                </div>
              </div>
              <div className={cn("flex items-center gap-2 rounded-2xl px-3 py-2", dark ? "bg-white/[0.06] border border-white/10" : "zivo-social-module-tile")}>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-xl", dark ? "bg-white/10 text-white" : "bg-emerald-500/10 text-emerald-600")}>
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className={cn("text-xs font-black leading-none", dark ? "text-white" : "text-foreground")}>{replyCount}</p>
                  <p className={cn("mt-1 truncate text-[10px] font-semibold", mutedText)}>Replies</p>
                </div>
              </div>
              <div className={cn("flex items-center gap-2 rounded-2xl px-3 py-2", dark ? "bg-white/[0.06] border border-white/10" : "zivo-social-module-tile")}>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-xl", dark ? "bg-white/10 text-white" : "bg-amber-500/10 text-amber-600")}>
                  <Pin className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className={cn("text-xs font-black leading-none", dark ? "text-white" : "text-foreground")}>{pinnedCount}</p>
                  <p className={cn("mt-1 truncate text-[10px] font-semibold", mutedText)}>Pinned</p>
                </div>
              </div>
            </div>
            <div className={cn("mt-2 rounded-2xl px-3 py-2.5", dark ? "border border-white/10 bg-white/[0.06]" : "zivo-social-module-tile")}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl", dark ? "bg-white/10 text-white" : "zivo-social-share-orb text-primary")}>
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block truncate text-sm font-black", dark ? "text-white" : "text-foreground")}>{conversationSignal.label}</span>
                    <span className={cn("block truncate text-[11px] font-semibold", mutedText)}>{conversationSignal.detail}</span>
                  </span>
                </span>
                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-black uppercase", dark ? "border-white/10 bg-white/10 text-white" : "border-primary/15 bg-primary/10 text-primary")}>
                  Talk
                </span>
              </div>
              <div className={cn("mt-2 h-1.5 overflow-hidden rounded-full", dark ? "bg-white/10" : "zivo-social-chip p-0")}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-400 transition-[width] duration-300"
                  style={{ width: conversationSignal.width }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Sort tabs — only with 2+ top-level comments (no-op otherwise) */}
        {comments.length >= 2 && (
          <div className={cn("shrink-0 px-3 pb-2 pt-1", dark && "border-b border-white/10")}>
            <div className={cn("flex gap-1 rounded-full p-1", dark ? "bg-white/[0.06]" : "zivo-social-module-tile")}>
            {(["recent", "top"] as const).map((s) => (
              <button type="button"
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition-all active:scale-[0.98]",
                  sort === s
                    ? "zivo-social-chip-active"
                    : dark ? "bg-white/10 text-white/50 hover:text-white/80" : "zivo-social-chip"
                )}
              >
                {s === "recent" ? "Most Recent" : "Top Comments"}
              </button>
            ))}
            </div>
          </div>
        )}

        {/* Comments List — the only scroll region */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3 scrollbar-none">
          {loading ? (
            <CommentRowsSkeleton rows={compactSheet ? Math.max(1, visibleCommentCount) : 4} />
          ) : comments.length === 0 ? (
            <div className={cn("zivo-social-module mx-1 flex flex-col items-center rounded-[1.25rem] px-6 py-12 text-center", dark && "bg-white/5 border-white/10")}>
              <span className={cn("mb-3 flex h-12 w-12 items-center justify-center rounded-2xl", dark ? "bg-white/10" : "zivo-social-share-orb")}>
                <MessageCircle className={cn("h-5 w-5", dark ? "text-white" : "text-primary")} />
              </span>
              <p className={cn("text-sm font-semibold", dark ? "text-white" : "text-foreground")}>No comments yet</p>
              <p className={cn("mt-1 text-xs", mutedText)}>Be the first to add a thought.</p>
            </div>
          ) : (
            [...comments]
              .sort((a, b) => {
                // Pinned comments always float to the top.
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                return sort === "top"
                  ? ((b.reactions?.length || 0) + (b.replies?.length || 0)) - ((a.reactions?.length || 0) + (a.replies?.length || 0))
                  : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              })
              .map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isPostAuthor={isPostAuthor}
                dark={dark}
                onReply={(id, name) => {
                  if (!canComment) {
                    toast.error(disabledReason || "You can't comment on this post");
                    return;
                  }
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

        {/* Pinned footer: reply indicator, emoji bar, input */}
        <div className={cn("zivo-social-comment-footer shrink-0", dark && "bg-black/80 border-white/10")}>
          {replyTo && (
            <div className={cn("mx-3 mt-2 flex items-center justify-between rounded-2xl px-3 py-2", dark ? "bg-white/10" : "zivo-social-module-tile")}>
              <span className={cn("text-xs", mutedText)}>
                Replying to <span className="font-semibold">{replyTo.name}</span>
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted/50 active:scale-95">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
            {["😂", "❤️", "🔥", "👏", "😮", "😢"].map((e) => (
              <button type="button"
                key={e}
                onClick={() => {
                  if (!canComment) return;
                  setText((prev) => prev + e);
                  inputRef.current?.focus();
                }}
                disabled={!canComment}
                className={cn(
                  "zivo-social-emoji-chip h-9 w-9 shrink-0 rounded-full text-xl flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-90",
                  !canComment && "opacity-40 cursor-not-allowed",
                  dark && "bg-white/10 border-white/15",
                )}
                aria-label={`Insert ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          <div
            className="px-3 py-3"
            style={{ paddingBottom: "max(calc(var(--zivo-safe-bottom,0px) + 0.75rem), 0.75rem)" }}
          >
            <div className={cn("mb-2 flex items-center justify-between gap-2 rounded-2xl px-3 py-2", dark ? "bg-white/[0.06] border border-white/10" : "zivo-social-share-preview")}>
              <span className={cn("flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]", dark ? "text-white/65" : "text-primary")}>
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{composerMode}</span>
              </span>
              <span className={cn("shrink-0 text-[10px] font-black tabular-nums", composerReady ? (dark ? "text-white" : "text-primary") : mutedText)}>
                {trimmedText.length}/280
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("flex min-h-[44px] flex-1 items-center gap-2 rounded-full px-3", inputBg)}>
                <Smile className={cn("h-4 w-4 shrink-0", mutedText)} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={!canComment ? (disabledReason || "Comments are limited") : replyTo ? `Reply to ${replyTo.name}...` : "Add a comment..."}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  disabled={!canComment}
                  maxLength={280}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                />
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-1 text-[10px] font-black",
                  composerReady
                    ? dark ? "bg-white/15 text-white" : "zivo-social-chip-active"
                    : mutedText,
                )}>
                  {composerReady ? "Ready" : "Draft"}
                </span>
              </div>
              {trimmedText && (
                <button type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !canComment}
                  className="h-11 w-11 rounded-full bg-ig-gradient flex items-center justify-center shrink-0 shadow-[0_14px_28px_hsl(var(--primary)/0.24)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  aria-label={replyTo ? `Send reply to ${replyTo.name}` : "Send comment"}
                >
                  <Send className="h-4 w-4 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </SwipeableSheet>
  );
}

// ─── Single Comment Item ────────────────────────────────────────
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
  const [showReportChoices, setShowReportChoices] = useState(false);
  const [reporting, setReporting] = useState(false);
  const haptic = useHaptic();
  const mutedText = dark ? "text-white/50" : "text-muted-foreground";
  const isOwn = currentUserId === comment.user_id;

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(comment.created_at), { addSuffix: false }); }
    catch { return ""; }
  })();

  return (
    <div className={cn(
      "flex gap-2.5 rounded-[1.25rem] p-2.5 transition-all",
      !dark && "zivo-social-comment-row",
      dark && "bg-white/[0.04] border border-white/10",
      comment.is_pinned && !isReply && (dark ? "border-primary/30 bg-primary/10" : "ring-1 ring-primary/15"),
      isReply && "ml-8 mt-2",
    )}>
      <Avatar className="zivo-social-avatar-ring h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={comment.author_avatar || undefined} />
        <AvatarFallback className="text-[11px] font-bold">{comment.author_name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        {comment.is_pinned && !isReply && (
          <span className={cn(
            "mb-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide",
            dark ? "bg-primary/20 text-primary" : "bg-primary/15 text-primary"
          )}>
            <Pin className="h-3 w-3" /> Pinned
          </span>
        )}
        <div className="flex items-start gap-1.5">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  autoFocus
                  rows={2}
                  className={cn(
                    "w-full resize-none rounded-2xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary/40",
                    dark ? "border border-white/20 bg-white/10 text-white" : "zivo-social-sheet-input text-foreground"
                  )}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setEditText(comment.content); }}
                    className={cn("rounded-full px-3 py-1.5 text-xs font-medium active:scale-95", dark ? "text-white/70 hover:bg-white/10" : "zivo-social-chip")}
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
                    className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-40 active:scale-95"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] leading-snug">
                <span className="font-semibold mr-1.5 inline-flex items-center gap-0.5 align-middle">
                  {comment.author_name}
                  {isBlueVerified(comment.author_is_verified) && <VerifiedBadge size={12} />}
                </span>
                {comment.content}
                {comment.edited_at && (
                  <span className={cn("ml-1 text-[10px] italic", mutedText)}>(edited)</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Meta row: time, reply, reactions, edit, pin, delete */}
        {!editing && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("text-[11px]", mutedText)}>{timeAgo}</span>
            <button type="button"
              onClick={() => onReply(comment.id, comment.author_name)}
              className={cn("rounded-full px-2 py-1 text-[11px] font-semibold transition-colors", mutedText, !dark && "hover:bg-white/60")}
            >
              Reply
            </button>
            {/* Reaction picker toggle */}
            <button type="button"
              onClick={() => setShowReactionsFor(showReactionsFor === comment.id ? null : comment.id)}
              className={cn("rounded-full px-2 py-1 text-[11px] transition-colors", mutedText, !dark && "hover:bg-white/60")}
              aria-label="Add reaction"
            >
              😊
            </button>
            {!isOwn && onReport && (
              <button type="button"
                onClick={() => { haptic("selection"); setShowReportChoices((value) => !value); }}
                className={cn("flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors", mutedText, !dark && "hover:bg-white/60")}
                aria-label="Report comment"
              >
                <Flag className="h-3 w-3" /> Report
              </button>
            )}
            {isOwn && onEdit && (
              <button type="button"
                onClick={() => { haptic("selection"); setEditText(comment.content); setEditing(true); }}
                className={cn("flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors", mutedText, !dark && "hover:bg-white/60")}
                aria-label="Edit comment"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
            {isPostAuthor && onTogglePin && !isReply && (
              <button type="button"
                onClick={async () => {
                  haptic(comment.is_pinned ? "light" : "medium");
                  const next = await onTogglePin(comment.id);
                  if (next === null) toast.error("Couldn't update pin");
                  else if (next) toast.success("Pinned to top");
                  else toast.success("Unpinned");
                }}
                className={cn("flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors", mutedText, !dark && "hover:bg-white/60")}
                aria-label={comment.is_pinned ? "Unpin comment" : "Pin to top"}
              >
                {comment.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                {comment.is_pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {isOwn && (
              <button type="button"
                onClick={() => { haptic("medium"); onDelete(comment.id); toast.success("Comment deleted"); }}
                className={cn("flex h-6 w-6 items-center justify-center rounded-full transition-colors", !dark && "hover:bg-red-50")}
                aria-label="Delete comment"
              >
                <Trash2 className={cn("h-3 w-3", mutedText)} />
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {showReportChoices && !isOwn && onReport && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn("flex flex-wrap gap-1.5 mt-2", dark ? "text-white" : "text-foreground")}
            >
              {COMMENT_REPORT_REASONS.map((item) => (
                <button
                  key={item.reason}
                  type="button"
                  disabled={reporting}
                  onClick={async () => {
                    setReporting(true);
                    try {
                      const reported = await onReport(comment, item.reason);
                      if (reported) setShowReportChoices(false);
                    } finally {
                      setReporting(false);
                    }
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold active:scale-95 disabled:opacity-50",
                    dark
                      ? "border-white/15 bg-white/10 hover:bg-white/15"
                      : "zivo-social-chip",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction pills */}
        {comment.reactions && comment.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {comment.reactions.map((r) => (
              <button type="button"
                key={r.emoji}
                onClick={() => onToggleReaction(comment.id, r.emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition-all active:scale-95",
                  r.reacted
                    ? (dark ? "bg-primary/20 border-primary/40" : "bg-primary/10 border-primary/30")
                    : (dark ? "bg-white/5 border-white/10" : "zivo-social-chip")
                )}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}

        {/* Reaction picker popup */}
        <AnimatePresence>
          {showReactionsFor === comment.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                "mt-2 flex w-fit gap-1 rounded-full p-1.5",
                dark ? "bg-white/10 backdrop-blur-sm" : "zivo-social-reaction-dock"
              )}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button type="button"
                  key={emoji}
                  onClick={() => { onToggleReaction(comment.id, emoji); setShowReactionsFor(null); }}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-primary/10 transition-all text-base hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            <button type="button"
              onClick={() => setShowReplies(!showReplies)}
              className={cn("flex items-center gap-1 text-[11px] font-semibold", mutedText)}
            >
              <div className={cn("w-6 h-px", dark ? "bg-white/20" : "bg-border")} />
              {showReplies ? (
                <>Hide replies <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>View {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"} <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
            <AnimatePresence>
              {showReplies && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
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
