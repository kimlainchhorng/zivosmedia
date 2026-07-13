/**
 * ChannelPostComments
 * -------------------
 * Telegram-style discussion thread under a channel post. Inline expandable
 * sheet — tap "View N comments" to load + reply.
 *
 * Reads from `channel_post_comments`. Writes are RLS-gated to subscribers and
 * channel managers. The post's `comments_count` is kept in sync by the
 * `tg_channel_post_comments_count` trigger so the parent card can show the
 * count without an extra query.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  author?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface Props {
  postId: string;
  channelId: string;
  /** Render as collapsed link first, expand on tap. Default true. */
  collapsed?: boolean;
  initialCount?: number;
  /** True when the viewer is allowed to comment (subscribed or manager). */
  canComment?: boolean;
  /** True when the viewer is a manager — exposes delete on others' comments. */
  canModerate?: boolean;
}

export default function ChannelPostComments({
  postId,
  channelId,
  collapsed = true,
  initialCount = 0,
  canComment = true,
  canModerate = false,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(!collapsed);
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [replyTo, setReplyTo] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => { setCount(initialCount); }, [initialCount]);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("channel_post_comments")
        .select("id, user_id, body, created_at, edited_at, deleted_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      const list = (data ?? []) as CommentRow[];
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      if (ids.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("public_profiles")
          .select("user_id, full_name, username, avatar_url")
          .in("user_id", ids);
        const map = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));
        list.forEach((r) => { r.author = map.get(r.user_id) ?? undefined; });
      }
      setRows(list);
      setCount(list.length);
    } catch (e) {
      console.error("[ChannelPostComments] load failed", e);
      toast.error("Could not load comments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    load();
    const ch = (supabase as any)
      .channel(`ch_post_comments_${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channel_post_comments", filter: `post_id=eq.${postId}` },
        load
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  async function send() {
    if (!user?.id) {
      toast.error("Sign in to comment");
      return;
    }
    const body = draft.trim();
    if (!body) return;
    const payload = replyTo ? `@${replyTo.label} ${body}` : body;
    setSending(true);
    try {
      const { error } = await (supabase as any)
        .from("channel_post_comments")
        .insert({ post_id: postId, channel_id: channelId, user_id: user.id, body: payload });
      if (error) throw error;
      setDraft("");
      setReplyTo(null);
    } catch (e: any) {
      // RLS rejects when the user isn't subscribed or comments are disabled.
      const msg =
        e?.message?.includes("row-level security")
          ? "Subscribe to this channel to comment."
          : (e?.message || "Could not send comment");
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    try {
      await (supabase as any).from("channel_post_comments").delete().eq("id", id);
    } catch {
      toast.error("Could not delete");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {count > 0
          ? `View ${count === 1 ? "1 comment" : `all ${count} comments`}`
          : "Add a comment"}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          Discussion {count > 0 && <span className="text-muted-foreground font-normal">· {count}</span>}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Hide
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">Be the first to comment.</p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {rows.map((r) => {
            const isMine = user?.id === r.user_id;
            const canDelete = isMine || canModerate;
            const isDeleted = !!r.deleted_at;
            return (
              <li key={r.id} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/u/${r.author?.username ?? r.user_id}`)}
                  className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 active:opacity-70"
                >
                  {r.author?.avatar_url ? (
	                    <img
	                      src={r.author.avatar_url}
	                      alt=""
	                      className="w-full h-full object-cover"
	                      loading="lazy"
	                      decoding="async"
	                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                      {(r.author?.full_name ?? r.author?.username ?? "?")[0]?.toUpperCase()}
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-semibold mr-1">
                      {r.author?.full_name ?? r.author?.username ?? "User"}
                    </span>
                    <span className="text-muted-foreground/80 text-[10px]">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      {r.edited_at && " · edited"}
                    </span>
                  </p>
                  <p className={`text-xs leading-snug mt-0.5 ${isDeleted ? "italic text-muted-foreground" : ""}`}>
                    {isDeleted ? "Comment deleted" : r.body}
                  </p>
                  {!isDeleted && (
                    <button
                      type="button"
                      onClick={() => {
                        const label = r.author?.username || r.author?.full_name || "user";
                        setReplyTo({ id: r.id, label: label.replace(/^@+/, "").replace(/\s+/g, "") });
                      }}
                      className="mt-1 text-[10px] font-semibold text-primary/90 hover:text-primary"
                    >
                      Reply
                    </button>
                  )}
                </div>
                {canDelete && !isDeleted && (
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground/60 hover:text-destructive shrink-0"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canComment && (
        <div className="space-y-2 pt-1">
          {replyTo && (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5">
              <p className="text-[11px] text-primary/90">
                Replying to <span className="font-semibold">@{replyTo.label}</span>
              </p>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={replyTo ? `Reply to @${replyTo.label}...` : "Write a comment..."}
            rows={1}
            maxLength={2000}
            className="flex-1 min-h-[36px] max-h-32 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || draft.trim().length === 0}
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
            aria-label="Send comment"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
          </div>
        </div>
      )}
    </div>
  );
}
