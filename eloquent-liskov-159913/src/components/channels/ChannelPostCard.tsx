import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, X, ChevronLeft, ChevronRight, Pin, PinOff, Share2, MoreHorizontal, Pencil, Trash2, Link as LinkIcon, Check, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { ChannelPost } from "@/hooks/useChannel";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";

const ChannelPostComments = lazy(() => import("./ChannelPostComments"));
const ChannelPostInsights = lazy(() => import("./ChannelPostInsights"));
const ChatPollBubble = lazy(() => import("../chat/ChatPollBubble"));

const REACTIONS = ["👍", "❤️", "🔥", "🎉", "👏"];

interface Props {
  post: ChannelPost;
  /** True if the viewer can pin/delete posts on this channel. */
  canManage?: boolean;
  /** True if the viewer can comment (subscribed or manager). */
  canComment?: boolean;
  /** Best-effort client-side protection against simple save/download gestures. */
  protectContent?: boolean;
  /** Called after pin toggles so the parent can re-order the list. */
  onPinChanged?: () => void;
}

interface MediaItem {
  url: string;
  type?: string;
  duration_ms?: number;
  waveform?: number[];
}

export function ChannelPostCard({ post, canManage = false, canComment = true, protectContent = false, onPinChanged }: Props) {
  const [pinning, setPinning] = useState(false);
  // Admin "more" menu — open/close + edit/delete state.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body ?? "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Local copy of body so an edit shows immediately without a refetch.
  const [localBody, setLocalBody] = useState<string | null>(post.body ?? null);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function copyLink() {
    setMenuOpen(false);
    const handle = (post as any).channel_handle as string | undefined;
    const path = handle ? `/c/${handle}?post=${post.id}` : `/c/?post=${post.id}`;
    const url = `${getPublicOrigin()}${path}`;
    try {
      await navigator.clipboard?.writeText(url);
      toast.success("Post link copied");
    } catch {
      toast.message(url);
    }
  }

  async function saveEdit() {
    if (savingEdit) return;
    const next = editBody.trim();
    if (next === (post.body ?? "")) { setEditing(false); return; }
    setSavingEdit(true);
    try {
      const { error } = await (supabase as any)
        .from("channel_posts")
        .update({ body: next || null })
        .eq("id", post.id);
      if (error) throw error;
      setLocalBody(next || null);
      setEditing(false);
      toast.success("Post updated");
      onPinChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't save");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deletePost() {
    if (deleting) return;
    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from("channel_posts")
        .delete()
        .eq("id", post.id);
      if (error) throw error;
      setDeleted(true);
      toast.success("Post deleted");
      onPinChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't delete");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // Forward via ChatHub's built-in share flow so users can pick recipients in
  // one place (Telegram-style) instead of relying on clipboard handoff.
  async function forwardToDm() {
    const handle = (post as any).channel_handle as string | undefined;
    const path = handle ? `/c/${handle}?post=${post.id}` : `/c/?post=${post.id}`;
    const url = `${getPublicOrigin()}${path}`;
    const excerpt = (post.body ?? "").slice(0, 240);
    const previewImage =
      Array.isArray(post.media)
        ? post.media.find((m: any) => typeof m?.url === "string" && !String(m?.type ?? "").startsWith("video"))?.url ?? null
        : null;
    openShareToChat({
      kind: "activity",
      title: excerpt || `Post from ${handle ? `@${handle}` : "channel"}`,
      subtitle: handle ? `@${handle}` : "Channel",
      meta: "Forwarded from channel",
      image: previewImage,
      deepLink: path,
      badge: "CHANNEL",
    });
    toast.success("Choose chat recipients");
  }

  async function togglePin() {
    setPinning(true);
    try {
      const { error } = await (supabase as any).rpc("toggle_channel_post_pin", { p_post_id: post.id });
      if (error) throw error;
      onPinChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Could not pin");
    } finally {
      setPinning(false);
    }
  }

  const ref = useRef<HTMLDivElement>(null);
  const [counted, setCounted] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>(
    (post.reactions_count as Record<string, number>) ?? {}
  );
  // Viewer's own reaction (one per post, Telegram-style). null = none.
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const blockSaveGestures = (e: React.SyntheticEvent) => {
    if (!protectContent) return;
    e.preventDefault();
  };

  // Load the viewer's existing reaction on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await (supabase as any)
        .from("channel_post_reactions")
        .select("emoji")
        .eq("post_id", post.id)
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!cancelled && data?.emoji) setMyReaction(data.emoji);
    })();
    return () => { cancelled = true; };
  }, [post.id]);

  // Polls are inlined into post.media as `{ type: "poll", poll_id, ... }`
  // (no `url`). Voice notes use `{ type: "voice", url, duration_ms, ... }`.
  // Pull each out and render them with their own components; image/video
  // items go to the regular grid.
  const allMedia: any[] = Array.isArray(post.media) ? post.media : [];
  const pollAttachment = useMemo(
    () => allMedia.find((m) => m && m.type === "poll" && m.poll_id) ?? null,
    [allMedia],
  );
  const voiceItems: MediaItem[] = useMemo(
    () => allMedia.filter((m) => m?.url && m.type === "voice") as MediaItem[],
    [allMedia],
  );
  const media: MediaItem[] = useMemo(
    () => allMedia.filter((m) => m?.url && m.type !== "poll" && m.type !== "voice") as MediaItem[],
    [allMedia],
  );

  const isVideo = (m: MediaItem) =>
    (m.type && m.type.startsWith("video")) || /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(m.url);

  const fmtVoice = (ms?: number) => {
    if (!ms || ms <= 0) return "0:00";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (counted || !ref.current) return;
    const obs = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting) {
          setCounted(true);
          try {
            await supabase.rpc("record_channel_post_view" as any, { _post_id: post.id });
          } catch {}
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [counted, post.id]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i === null ? null : Math.max(0, i - 1)));
      if (e.key === "ArrowRight")
        setLightboxIdx((i) => (i === null ? null : Math.min(media.length - 1, i + 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, media.length]);

  // Telegram-style reaction toggle: tap once to react, tap again to remove,
  // tap a different emoji to swap. The previous handler unconditionally
  // incremented the local count on every tap, so the UI drifted from the
  // database (which only stores one reaction per user).
  const react = async (emoji: string) => {
    if (reacting) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in to react");
      return;
    }
    const previous = myReaction;
    const next = previous === emoji ? null : emoji;
    // Optimistic local update
    setMyReaction(next);
    setReactions((r) => {
      const out: Record<string, number> = { ...r };
      if (previous) out[previous] = Math.max(0, (out[previous] ?? 0) - 1);
      if (next) out[next] = (out[next] ?? 0) + 1;
      return out;
    });
    setReacting(true);
    try {
      if (next == null) {
        const { error } = await (supabase as any)
          .from("channel_post_reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("channel_post_reactions")
          .upsert(
            { post_id: post.id, user_id: u.user.id, emoji: next },
            { onConflict: "post_id,user_id" },
          );
        if (error) throw error;
      }
    } catch (e: any) {
      // Roll back on failure
      setMyReaction(previous);
      setReactions((r) => {
        const out: Record<string, number> = { ...r };
        if (next) out[next] = Math.max(0, (out[next] ?? 0) - 1);
        if (previous) out[previous] = (out[previous] ?? 0) + 1;
        return out;
      });
      toast.error(e?.message || "Couldn't update reaction");
    } finally {
      setReacting(false);
    }
  };

  // Pick a layout class based on count for a tight, IG-style grid.
  const gridClass = (() => {
    switch (media.length) {
      case 0:
        return "";
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-2"; // first spans 2 cols
      default:
        return "grid-cols-3";
    }
  })();

  if (deleted) return null;

  return (
    <>
      <div
        ref={ref}
        className={`rounded-2xl border p-4 shadow-sm ${
          post.is_pinned
            ? "border-primary/40 bg-primary/[0.07] ring-1 ring-primary/20"
            : "border-border/50 bg-card/95"
        }`}
      >
        {(post.is_pinned || canManage) && (
          <div className="mb-2 flex items-center justify-between gap-2">
            {post.is_pinned ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Pin className="w-3 h-3" /> Pinned
              </span>
            ) : <span />}
            {canManage && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePin}
                  disabled={pinning}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label={post.is_pinned ? "Unpin post" : "Pin post"}
                >
                  {post.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  {post.is_pinned ? "Unpin" : "Pin"}
                </button>
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="true"
                    aria-label="Post actions"
                    className="p-1 -mr-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 min-w-[170px] rounded-xl border border-border bg-card shadow-lg overflow-hidden text-sm">
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setEditBody(localBody ?? post.body ?? ""); setEditing(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit post
                      </button>
                      <button
                        type="button"
                        onClick={copyLink}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
                      >
                        <LinkIcon className="w-3.5 h-3.5" /> Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-rose-500 hover:bg-muted/50 border-t border-border/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              aria-label="Edit channel post text"
              rows={Math.min(8, Math.max(3, editBody.split("\n").length))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setEditBody(localBody ?? post.body ?? ""); }}
                disabled={savingEdit}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          (localBody ?? post.body) && (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/95">{localBody ?? post.body}</p>
          )
        )}

        {pollAttachment && (
          <div className="mt-3">
            <Suspense fallback={<div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />}>
              <ChatPollBubble
                pollId={pollAttachment.poll_id}
                question={pollAttachment.question || (localBody ?? post.body) || "Poll"}
                options={Array.isArray(pollAttachment.options) ? pollAttachment.options : []}
                isAnonymous={!!pollAttachment.is_anonymous}
                creatorName={pollAttachment.creator_name || "Channel"}
              />
            </Suspense>
          </div>
        )}

        {voiceItems.length > 0 && (
          <div className="mt-3 space-y-2">
            {voiceItems.map((v, i) => (
              <div key={`v-${i}`} className="rounded-2xl border border-border bg-muted/40 p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm5-3h-1a4 4 0 01-8 0H7a5 5 0 004 4.9V19h-2v2h6v-2h-2v-3.1A5 5 0 0017 11z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 mb-1">
                    Voice · {fmtVoice(v.duration_ms)}
                  </p>
                  <audio src={v.url} controls preload="metadata" className="w-full h-9" />
                </div>
              </div>
            ))}
          </div>
        )}

        {media.length > 0 && (
          <div className={`mt-3 grid gap-1.5 ${gridClass}`}>
            {media.slice(0, 6).map((m, i) => {
              const isFirstOfThree = media.length === 3 && i === 0;
              const isOverflow = media.length > 6 && i === 5;
              const video = isVideo(m);
              return (
                <button type="button"
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={`relative overflow-hidden rounded-xl bg-muted ${
                    isFirstOfThree ? "col-span-2 aspect-[2/1]" : "aspect-square"
                  }`}
                  aria-label={video ? `Play video ${i + 1}` : `Open image ${i + 1}`}
                  onContextMenu={blockSaveGestures}
                  onContextMenuCapture={blockSaveGestures}
                  onDragStartCapture={blockSaveGestures}
                >
                  {video ? (
                    <>
                      <video
                        src={m.url}
                        muted
                        playsInline
                        preload="metadata"
                        controlsList={protectContent ? "nodownload noplaybackrate noremoteplayback" : undefined}
                        disablePictureInPicture={protectContent}
                        className="h-full w-full object-cover"
                        onContextMenu={blockSaveGestures}
                        onContextMenuCapture={blockSaveGestures}
                        onDragStartCapture={blockSaveGestures}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                        <div className="h-9 w-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
	                      src={m.url}
	                      alt=""
	                      loading="lazy"
	                      decoding="async"
	                      draggable={false}
	                      className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                      onContextMenu={blockSaveGestures}
                      onContextMenuCapture={blockSaveGestures}
                      onDragStartCapture={blockSaveGestures}
                    />
                  )}
                  {isOverflow && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-lg font-semibold text-foreground">
                      +{media.length - 6}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {REACTIONS.map((e) => {
              const mine = myReaction === e;
              const count = reactions[e] ?? 0;
              return (
                <button type="button"
                  key={e}
                  onClick={() => react(e)}
                  disabled={reacting}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-60 ${
                    mine
                      ? "bg-primary/15 ring-1 ring-primary/40 text-foreground"
                      : "bg-muted/70 hover:bg-muted"
                  }`}
                >
                  {e}
                  {count > 0 && (
                    <span className={`ml-1 ${mine ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col items-end gap-1 text-[11px] text-muted-foreground min-w-[110px]">
            <button
              type="button"
              onClick={forwardToDm}
              className="inline-flex items-center gap-1 hover:text-foreground active:scale-95 transition"
              aria-label="Forward to chat"
              title="Forward to chat"
            >
              <Share2 className="h-3 w-3" /> Forward
            </button>
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" /> {post.view_count}
              </span>
              {post.published_at && (
                <span>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</span>
              )}
            </div>
          </div>
        </div>
        {protectContent && media.length > 0 && (
          <p className="mt-2 text-[10px] text-muted-foreground/80">Protected content: download/save is disabled.</p>
        )}

        {canManage && (
          <Suspense fallback={null}>
            <ChannelPostInsights post={post} />
          </Suspense>
        )}

        {(post.comments_enabled !== false) && (
          <Suspense fallback={null}>
            <ChannelPostComments
              postId={post.id}
              channelId={post.channel_id}
              initialCount={post.comments_count ?? 0}
              canComment={canComment}
              canModerate={canManage}
            />
          </Suspense>
        )}
      </div>

      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur"
          onClick={() => setLightboxIdx(null)}
        >
          <button type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(null);
            }}
            className="absolute right-4 top-[var(--zivo-safe-top-overlay)] rounded-full bg-card/80 p-2 text-foreground hover:bg-card"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxIdx > 0 && (
            <button type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx - 1);
              }}
              className="absolute left-4 rounded-full bg-card/80 p-2 text-foreground hover:bg-card"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {lightboxIdx < media.length - 1 && (
            <button type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 text-foreground hover:bg-card"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          {isVideo(media[lightboxIdx]) ? (
            <video
              src={media[lightboxIdx].url}
              autoPlay
	              controls
	              playsInline
	              preload="metadata"
	              controlsList={protectContent ? "nodownload noplaybackrate noremoteplayback" : undefined}
              disablePictureInPicture={protectContent}
              className="max-h-[90vh] max-w-[92vw] rounded-lg shadow-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={blockSaveGestures}
              onContextMenuCapture={blockSaveGestures}
              onDragStartCapture={blockSaveGestures}
            />
          ) : (
            <img
	              src={media[lightboxIdx].url}
	              alt=""
	              loading="eager"
	              decoding="async"
	              draggable={false}
              className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={blockSaveGestures}
              onContextMenuCapture={blockSaveGestures}
              onDragStartCapture={blockSaveGestures}
            />
          )}
          {media.length > 1 && (
            <div className="absolute bottom-6 rounded-full bg-card/80 px-3 py-1 text-xs text-foreground">
              {lightboxIdx + 1} / {media.length}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-5 space-y-3"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-bold">Delete this post?</h3>
            <p className="text-sm text-muted-foreground">
              Subscribers won't be able to see it any more. This can't be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deletePost}
                disabled={deleting}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
