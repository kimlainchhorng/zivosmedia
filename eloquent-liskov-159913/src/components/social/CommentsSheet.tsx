/**
 * CommentsSheet — Instagram-style bottom sheet for post comments
 * Supports reply threads, emoji reactions, and real-time updates
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, ChevronDown, ChevronUp, X, Pencil, Pin, PinOff } from "lucide-react";
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

interface CommentsSheetProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  postSource: "user" | "store";
  currentUserId: string | null;
  commentsCount: number;
  onCommentsCountChange?: (count: number) => void;
  dark?: boolean; // for fullscreen reels mode
}

export default function CommentsSheet({
  open, onClose, postId, postSource, currentUserId, commentsCount, onCommentsCountChange, dark = false,
}: CommentsSheetProps) {
  const { comments, loading, submitting, addComment, deleteComment, editComment, toggleReaction, togglePin } = usePostComments({
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
    await addComment(text, replyTo?.id);
    setText("");
    setReplyTo(null);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
  };

  const totalComments = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
  const bg = dark ? "bg-black/95 text-white" : "bg-background text-foreground";
  const border = dark ? "border-white/10" : "border-border";
  const mutedText = dark ? "text-white/50" : "text-muted-foreground";
  const inputBg = dark ? "bg-white/10 text-white placeholder:text-white/40" : "bg-muted text-foreground placeholder:text-muted-foreground";

  useEffect(() => {
    if (open && !loading) onCommentsCountChange?.(totalComments);
  }, [open, loading, totalComments, onCommentsCountChange]);

  const headerTitle = (
    <h3 className={cn("text-[15px] font-semibold", dark && "text-white")}>
      Comments {totalComments > 0 && `(${totalComments})`}
    </h3>
  );

  return (
    <SwipeableSheet
      open={open}
      onClose={onClose}
      title={headerTitle}
      ariaLabel="Comments"
      maxHeightVh={72}
      zIndex={1500}
      safeAreaTop
      className={cn("h-[72dvh]", dark && "bg-black/95 text-white")}
      headerClassName={cn("border-b", border)}
    >
      {/* Wrap in a column so the comments list scrolls and the input bar
          (emoji + reply indicator + textbox) stays pinned at the bottom. */}
      <div className="flex flex-col h-full min-h-0">
        {/* Sort tabs — only with 2+ top-level comments (no-op otherwise) */}
        {comments.length >= 2 && (
          <div className={cn("shrink-0 flex gap-1 px-4 pt-2 pb-1 border-b", border)}>
            {(["recent", "top"] as const).map((s) => (
              <button type="button"
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-semibold capitalize transition-colors",
                  sort === s
                    ? "bg-primary/10 text-primary"
                    : dark ? "text-white/50 hover:text-white/80" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "recent" ? "Most Recent" : "Top Comments"}
              </button>
            ))}
          </div>
        )}

        {/* Comments List — the only scroll region */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 scrollbar-none">
          {loading ? (
            <CommentRowsSkeleton rows={4} />
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <p className={cn("text-sm", mutedText)}>No comments yet</p>
              <p className={cn("text-xs mt-1", mutedText)}>Be the first to comment!</p>
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
                onReply={(id, name) => { setReplyTo({ id, name }); inputRef.current?.focus(); }}
                onDelete={deleteComment}
                onEdit={editComment}
                onTogglePin={togglePin}
                onToggleReaction={toggleReaction}
                showReactionsFor={showReactionsFor}
                setShowReactionsFor={setShowReactionsFor}
              />
            ))
          )}
        </div>

        {/* Pinned footer: reply indicator, emoji bar, input */}
        <div className="shrink-0">
          {replyTo && (
            <div className={cn("flex items-center justify-between px-4 py-2 border-t", border)}>
              <span className={cn("text-xs", mutedText)}>
                Replying to <span className="font-semibold">{replyTo.name}</span>
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 border-t overflow-x-auto scrollbar-none", border)}>
            {["😂", "❤️", "🔥", "👏", "😮", "😢"].map((e) => (
              <button type="button"
                key={e}
                onClick={() => {
                  setText((prev) => prev + e);
                  inputRef.current?.focus();
                }}
                className="h-9 w-9 shrink-0 rounded-full text-xl flex items-center justify-center hover:bg-muted/50 active:scale-90 transition-transform"
                aria-label={`Insert ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          <div
            className={cn("flex items-center gap-2 px-4 py-3 border-t", border)}
            style={{ paddingBottom: "max(calc(var(--zivo-safe-bottom,0px) + 0.75rem), 0.75rem)" }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Add a comment..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className={cn("flex-1 rounded-full px-4 py-2.5 text-[13px] outline-none", inputBg)}
            />
            {text.trim() && (
              <button type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center shrink-0 shadow-sm hover:opacity-90 active:scale-95 transition-all"
                aria-label="Send comment"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </SwipeableSheet>
  );
}

// ─── Single Comment Item ────────────────────────────────────────
function CommentItem({
  comment, currentUserId, isPostAuthor = false, dark,
  onReply, onDelete, onEdit, onTogglePin, onToggleReaction,
  showReactionsFor, setShowReactionsFor, isReply = false,
}: {
  comment: PostComment;
  currentUserId: string | null;
  isPostAuthor?: boolean;
  dark: boolean;
  onReply: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, nextContent: string) => void | Promise<void>;
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
  const haptic = useHaptic();
  const mutedText = dark ? "text-white/50" : "text-muted-foreground";
  const isOwn = currentUserId === comment.user_id;

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(comment.created_at), { addSuffix: false }); }
    catch { return ""; }
  })();

  return (
    <div className={cn("flex gap-2.5", isReply && "ml-8 mt-2")}>
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={comment.author_avatar || undefined} />
        <AvatarFallback className="text-[11px] font-bold">{comment.author_name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        {comment.is_pinned && !isReply && (
          <span className={cn(
            "inline-flex items-center gap-0.5 mb-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            dark ? "bg-primary/20 text-primary" : "bg-primary/15 text-primary"
          )}>
            📌 Pinned
          </span>
        )}
        <div className="flex items-start gap-1.5">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  autoFocus
                  rows={2}
                  className={cn(
                    "w-full rounded-lg border px-2 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-primary/40 resize-none",
                    dark ? "bg-white/10 border-white/20 text-white" : "bg-background border-border text-foreground"
                  )}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setEditText(comment.content); }}
                    className={cn("rounded-lg px-3 py-1 text-xs font-medium active:scale-95", dark ? "text-white/70 hover:bg-white/10" : "text-muted-foreground hover:bg-muted")}
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
                    className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40 active:scale-95"
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
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className={cn("text-[11px]", mutedText)}>{timeAgo}</span>
            <button type="button"
              onClick={() => onReply(comment.id, comment.author_name)}
              className={cn("text-[11px] font-semibold", mutedText)}
            >
              Reply
            </button>
            {/* Reaction picker toggle */}
            <button type="button"
              onClick={() => setShowReactionsFor(showReactionsFor === comment.id ? null : comment.id)}
              className={cn("text-[11px]", mutedText)}
              aria-label="Add reaction"
            >
              😊
            </button>
            {isOwn && onEdit && (
              <button type="button"
                onClick={() => { haptic("selection"); setEditText(comment.content); setEditing(true); }}
                className={cn("text-[11px] font-semibold flex items-center gap-0.5", mutedText)}
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
                className={cn("text-[11px] font-semibold flex items-center gap-0.5", mutedText)}
                aria-label={comment.is_pinned ? "Unpin comment" : "Pin to top"}
              >
                {comment.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                {comment.is_pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {isOwn && (
              <button type="button"
                onClick={() => { haptic("medium"); onDelete(comment.id); toast.success("Comment deleted"); }}
                aria-label="Delete comment"
              >
                <Trash2 className={cn("h-3 w-3", mutedText)} />
              </button>
            )}
          </div>
        )}

        {/* Reaction pills */}
        {comment.reactions && comment.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {comment.reactions.map((r) => (
              <button type="button"
                key={r.emoji}
                onClick={() => onToggleReaction(comment.id, r.emoji)}
                className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-all",
                  r.reacted
                    ? (dark ? "bg-primary/20 border-primary/40" : "bg-primary/10 border-primary/30")
                    : (dark ? "bg-white/5 border-white/10" : "bg-muted border-border")
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
                "flex gap-1 mt-1.5 p-1.5 rounded-full w-fit",
                dark ? "bg-white/10 backdrop-blur-sm" : "bg-muted shadow-lg"
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
