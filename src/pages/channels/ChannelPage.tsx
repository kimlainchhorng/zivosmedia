import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type TouchEvent } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Bell, ChevronDown, ChevronLeft, Compass, Copy, Info, Pin, Share2, Users } from "lucide-react";
import { useChannel, type ChannelPost } from "@/hooks/useChannel";
import { ChannelInfoSheet } from "@/components/channels/ChannelInfoSheet";
import { ChannelPostCard } from "@/components/channels/ChannelPostCard";
import { ChannelPostComposer } from "@/components/channels/ChannelPostComposer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getChannelShareUrl } from "@/lib/getPublicOrigin";
import { shareContent } from "@/lib/native/share";
import { copyText } from "@/lib/native/clipboard";
import { toast } from "sonner";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { CHANNEL_WALLPAPERS, normalizeChannelWallpaper } from "@/lib/channels/channelWallpaper";

function getPostTimestamp(post: ChannelPost): number {
  const value = new Date(post.published_at ?? post.created_at).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function getPostDayKey(post: ChannelPost): string {
  const date = new Date(post.published_at ?? post.created_at);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatPostDay(post: ChannelPost): string {
  const date = new Date(post.published_at ?? post.created_at);
  if (Number.isNaN(date.getTime())) return "Recent";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startPost = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startPost) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export default function ChannelPage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [infoOpen, setInfoOpen] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const mouseSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const timelineEndRef = useRef<HTMLDivElement>(null);
  const { channel, posts, isSubscribed, notificationsOn, role, loading, userId, subscribe, unsubscribe, setNotifications, refresh } =
    useChannel(handle);

  const timelinePosts = useMemo(() => [...posts].sort((a, b) => getPostTimestamp(a) - getPostTimestamp(b)), [posts]);
  const timelineItems = useMemo(() => {
    const items: Array<
      | { type: "day"; key: string; label: string }
      | { type: "post"; post: ChannelPost }
    > = [];
    let lastDay = "";
    for (const post of timelinePosts) {
      const key = getPostDayKey(post);
      if (key !== lastDay) {
        items.push({ type: "day", key, label: formatPostDay(post) });
        lastDay = key;
      }
      items.push({ type: "post", post });
    }
    return items;
  }, [timelinePosts]);

  const pinnedPost = useMemo(
    () => [...timelinePosts].filter((p) => p.is_pinned).sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))[0],
    [timelinePosts],
  );
  const targetPostId = searchParams.get("post");

  useEffect(() => {
    if (!targetPostId || timelinePosts.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`channel-post-${targetPostId}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [timelinePosts.length, targetPostId]);

  useEffect(() => {
    if (targetPostId || timelinePosts.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      timelineEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [targetPostId, timelinePosts.length]);

  useEffect(() => {
    const update = () => {
      const distanceFromBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      setShowJumpToBottom(timelinePosts.length > 0 && distanceFromBottom > 360);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [timelinePosts.length]);

  useEffect(() => {
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

  const scrollToPost = (postId: string) => {
    window.setTimeout(() => {
      document.getElementById(`channel-post-${postId}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 80);
  };
  const scrollToLatest = () => {
    timelineEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!channel) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Channel not found.</div>;
  }

  const isOwner = userId === channel.owner_id;
  const canPost = isOwner || role === "admin" || role === "owner";
  const joinPending = role === "pending";
  const canViewComments = isSubscribed || canPost;
  const showInlineJoin = !isSubscribed && !canPost && timelinePosts.length === 0;
  const wallpaper = CHANNEL_WALLPAPERS[normalizeChannelWallpaper(channel.wallpaper_style)];

  // Primary share path — opens the in-app picker so the channel card lands
  // in a friend's ZIVO chat with the proper preview (handle, subscribers,
  // banner image, deep-link back into this channel). Keeps the experience
  // inside the app, same pattern as hotels/stores share.
  const shareChannel = () => {
    const subtitle = `@${channel.handle}` +
      (channel.subscriber_count > 0
        ? ` · ${channel.subscriber_count.toLocaleString()} subscriber${channel.subscriber_count === 1 ? "" : "s"}`
        : "");
    openShareToChat({
      kind: "channel",
      title: channel.name,
      subtitle,
      meta: channel.description?.slice(0, 80) || undefined,
      image: channel.banner_url || channel.avatar_url || null,
      deepLink: `/c/${channel.handle}`,
    });
  };

  // Copy the channel URL straight to the clipboard. The helper has a
  // three-tier fallback (legacy execCommand → Capacitor → Async Clipboard
  // API) so this works on every supported platform. If all three fail
  // (e.g. very strict permissions in a webview), surface the URL in a
  // long-lived toast so the user can still long-press to copy it manually.
  const copyChannelLink = async () => {
    const url = getChannelShareUrl(channel.handle);
    try {
      await copyText(url);
      toast.success("Channel link copied", { description: url, duration: 4000 });
    } catch {
      toast.message("Copy this channel link", {
        description: url,
        duration: 12000,
      });
    }
  };

  // System share sheet (WhatsApp, Telegram, mail, etc.) — kept available
  // for any future entry that wants OS-wide reach. Falls back to clipboard
  // when native share is unavailable or the user dismisses without
  // sharing.
  const shareChannelExternal = async () => {
    const url = getChannelShareUrl(channel.handle);
    try {
      const result = await shareContent({
        title: `${channel.name} on ZIVO`,
        text: `Join @${channel.handle} on ZIVO`,
        url,
        dialogTitle: "Share channel",
      });
      if (result.shared || result.cancelled) return;
    } catch {
      // fall through to clipboard fallback
    }
    await copyChannelLink();
  };

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/channels"));
  const updateSwipeProgress = (start: { x: number; y: number } | null, x: number, y: number) => {
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (dx <= 0 || Math.abs(dy) > Math.abs(dx) * 0.9) {
      setSwipeProgress(0);
      return;
    }
    setSwipeProgress(Math.min(1, dx / 96));
  };
  const finishSwipe = (start: { x: number; y: number } | null, x: number, y: number) => {
    setSwipeProgress(0);
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (dx > 78 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      goBack();
    }
  };
  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch || touch.clientX > 28) {
      swipeStartRef.current = null;
      setSwipeProgress(0);
      return;
    }
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    updateSwipeProgress(start, touch.clientX, touch.clientY);
  };
  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    finishSwipe(start, touch.clientX, touch.clientY);
  };
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.clientX > 28) {
      pointerSwipeStartRef.current = null;
      return;
    }
    pointerSwipeStartRef.current = { x: event.clientX, y: event.clientY };
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    updateSwipeProgress(pointerSwipeStartRef.current, event.clientX, event.clientY);
  };
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const start = pointerSwipeStartRef.current;
    pointerSwipeStartRef.current = null;
    finishSwipe(start, event.clientX, event.clientY);
  };
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.clientX > 28) {
      mouseSwipeStartRef.current = null;
      return;
    }
    mouseSwipeStartRef.current = { x: event.clientX, y: event.clientY };
  };
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    updateSwipeProgress(mouseSwipeStartRef.current, event.clientX, event.clientY);
  };
  const handleMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    const start = mouseSwipeStartRef.current;
    mouseSwipeStartRef.current = null;
    finishSwipe(start, event.clientX, event.clientY);
  };

  return (
    <div
      className={cn(
        "zivo-shell-mobile mx-auto max-w-2xl scroll-smooth overscroll-contain scrollbar-hide text-foreground touch-pan-y pt-safe [-webkit-overflow-scrolling:touch]",
        canPost ? "pb-44" : "pb-20",
        swipeProgress > 0 && "cursor-grabbing select-none",
      )}
      style={{
        ...wallpaper.shell,
        scrollPaddingTop: "5.25rem",
        scrollPaddingBottom: canPost ? "11rem" : "5rem",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        swipeStartRef.current = null;
        setSwipeProgress(0);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerSwipeStartRef.current = null;
        setSwipeProgress(0);
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        mouseSwipeStartRef.current = null;
        setSwipeProgress(0);
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 z-40 w-16 bg-gradient-to-r from-white/55 to-transparent transition-opacity duration-150 ease-out"
        style={{ opacity: swipeProgress * 0.8 }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-3 top-1/2 z-50 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow-lg ring-1 ring-white/80 backdrop-blur transition-[opacity,transform] duration-150 ease-out will-change-transform"
        style={{
          opacity: swipeProgress,
          transform: `translate3d(${Math.round(swipeProgress * 18)}px, -50%, 0) scale(${0.82 + swipeProgress * 0.18})`,
        }}
      >
        <ChevronLeft className="h-5 w-5" />
      </div>
      <div
        className="zivo-sticky-mobile-header z-20 border-b-0 px-3 pb-2 pt-3 shadow-none"
        style={{ background: wallpaper.header }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow-sm ring-1 ring-white/80 backdrop-blur transition hover:bg-white"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="min-w-0 flex-1 rounded-full bg-white/80 py-1.5 pl-4 pr-1.5 shadow-sm ring-1 ring-white/80 backdrop-blur transition hover:bg-white"
            aria-label="Open channel info"
          >
            <span className="flex items-center gap-3">
              <span className="min-w-0 flex-1 text-center">
                <span className="block truncate text-[15px] font-bold leading-tight text-slate-950">{channel.name}</span>
                <span className="block truncate text-[11px] leading-tight text-slate-500">
                  {channel.subscriber_count.toLocaleString()} subscriber{channel.subscriber_count === 1 ? "" : "s"}
                </span>
              </span>
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white text-xs font-bold text-sky-700 ring-2 ring-white">
                {channel.avatar_url ? (
                  <img src={channel.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-sky-100">{channel.name.slice(0, 2).toUpperCase()}</span>
                )}
                <span className="absolute bottom-0 right-0 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200">
                  <Info className="h-2.5 w-2.5" />
                </span>
              </span>
            </span>
          </button>
        </div>

      </div>

      {pinnedPost && (
        <button
          type="button"
          onClick={() => scrollToPost(pinnedPost.id)}
          className="sticky top-[calc(var(--zivo-safe-top,0px)+4.75rem)] z-10 mx-3 mt-2 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-left shadow-sm ring-1 ring-white/70 backdrop-blur transition-colors hover:bg-white/95 dark:bg-zinc-900/80 dark:ring-zinc-800"
        >
          <span className="h-9 w-1 rounded-full border-l-2 border-dashed border-sky-500" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-bold text-slate-900 dark:text-zinc-50">Pinned Message</span>
            <span className="block truncate text-[12px] text-slate-700 dark:text-zinc-300">{pinnedPost.body || "Pinned post"}</span>
          </span>
          <Pin className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      )}

      <div
        className={cn(
          "space-y-3 p-3",
          timelinePosts.length === 0 && canPost && "flex min-h-[calc(100dvh-15rem)] items-center justify-center pb-36",
        )}
      >
        {timelinePosts.length > 0 && (
          <div className="flex justify-center py-1">
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-white/70 backdrop-blur">
              Channel created
            </span>
          </div>
        )}
        {timelineItems.map((item) => item.type === "day" ? (
          <div key={`day-${item.key}`} className="flex justify-center py-1">
            <span className="rounded-full bg-emerald-700/45 px-3 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur">
              {item.label}
            </span>
          </div>
        ) : (
            <ChannelPostCard
              key={item.post.id}
              post={item.post}
              canManage={canPost}
              canComment={canViewComments}
              protectContent={!canPost && channel.restrict_saving_content !== false}
              reactionPolicy={channel.reaction_policy ?? "all"}
              onPinChanged={refresh}
              highlight={item.post.id === targetPostId}
            />
          ))}
        {timelinePosts.length > 0 && <div ref={timelineEndRef} className="h-1" aria-hidden />}
        {timelinePosts.length === 0 && (() => {
          const showSubscribedEmpty = isSubscribed && !canPost;
          const showOwnerPostsEmpty = canPost;
          return (
            <div className={cn(
              "mx-auto max-w-md rounded-2xl border bg-white/75 p-6 text-center shadow-sm backdrop-blur dark:bg-zinc-900/70",
              showOwnerPostsEmpty && "border-0 bg-transparent p-3 shadow-none backdrop-blur-0 dark:bg-transparent",
              showSubscribedEmpty ? "border-sky-200 dark:border-sky-900" : "border-dashed border-slate-300 dark:border-zinc-700",
            )}>
              {!showOwnerPostsEmpty && (
                <div className={cn(
                  "mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full",
                  showSubscribedEmpty ? "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300" : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400",
                )}>
                  <Bell className="h-5 w-5" />
                </div>
              )}
              {showOwnerPostsEmpty && (
                <div className="mx-auto mb-3 inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-900/80 dark:text-zinc-400 dark:ring-zinc-800">
                  Channel created
                </div>
              )}
              <p className="text-[15px] font-semibold text-slate-950">
                  {joinPending ? "Request sent" : showSubscribedEmpty ? "You're subscribed" : showOwnerPostsEmpty ? "No messages yet" : "No posts yet"}
              </p>
              <p className="mx-auto mt-1 max-w-[240px] text-[12px] leading-5 text-slate-600">
                {joinPending
                  ? "Waiting for admin approval."
                  : showSubscribedEmpty
                  ? notificationsOn ? "New posts will appear here." : "New posts will appear here. Alerts are muted."
                  : showOwnerPostsEmpty
                  ? "Broadcast messages will appear here."
                  : "New posts will appear here."}
              </p>
              {showSubscribedEmpty && (
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                    <Bell className="h-3 w-3" />
                    {notificationsOn ? "Alerts on" : "Alerts muted"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {channel.subscriber_count.toLocaleString()} subscriber{channel.subscriber_count === 1 ? "" : "s"}
                  </span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={shareChannel} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/55 px-3 text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-white/70 backdrop-blur transition hover:bg-white/75">
                  <Share2 className="h-3.5 w-3.5" />
                  Send channel
                </button>
                <button type="button" onClick={() => void copyChannelLink()} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/35 px-3 text-sm font-semibold text-slate-950 ring-1 ring-white/45 backdrop-blur transition hover:bg-white/60">
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </button>
                {!isSubscribed && !canPost && !showInlineJoin && (
                  <button type="button" onClick={subscribe} disabled={joinPending} className="inline-flex h-9 items-center rounded-full bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-60">
                    {joinPending ? "Request sent" : channel.channel_join_approval_required ? "Request to join" : "Join Channel"}
                  </button>
                )}
                <button type="button" onClick={() => navigate("/channels")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/35 px-3 text-sm font-semibold text-slate-950 ring-1 ring-white/45 backdrop-blur transition hover:bg-white/60">
                  <Compass className="h-3.5 w-3.5" />
                  Discover
                </button>
              </div>
            </div>
          );
        })()}

        {showInlineJoin && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-background/95 backdrop-blur p-3 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold truncate">{joinPending ? "Request pending" : `Join @${channel.handle}`}</p>
              <p className="text-[11px] text-muted-foreground truncate">{joinPending ? "Waiting for admin approval." : "Get new posts and channel updates."}</p>
            </div>
            <Button onClick={subscribe} disabled={joinPending} className="shrink-0">
              {joinPending ? "Sent" : channel.channel_join_approval_required ? "Request" : "Join"}
            </Button>
          </div>
        )}
      </div>

      {!isSubscribed && !canPost && !showInlineJoin && (
        <div className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+4rem)] left-0 right-0 z-30 px-4 pb-3">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-background/95 backdrop-blur p-3 flex items-center justify-between gap-3 shadow-lg">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold truncate">{joinPending ? "Request pending" : `Join @${channel.handle}`}</p>
              <p className="text-[11px] text-muted-foreground truncate">{joinPending ? "Waiting for admin approval." : "Get new posts and channel updates."}</p>
            </div>
            <Button onClick={subscribe} disabled={joinPending} className="shrink-0">
              {joinPending ? "Sent" : channel.channel_join_approval_required ? "Request" : "Join"}
            </Button>
          </div>
        </div>
      )}

      {canPost && (
        <div className="fixed inset-x-0 bottom-[var(--zivo-safe-bottom,0px)] z-40 px-3 pb-3">
          <div className="mx-auto max-w-2xl">
            <ChannelPostComposer channelId={channel.id} onPosted={refresh} />
          </div>
        </div>
      )}

      {showJumpToBottom && (
        <button
          type="button"
          onClick={scrollToLatest}
          className={cn(
            "fixed right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg ring-1 ring-white/80 backdrop-blur transition hover:bg-white active:scale-95",
            canPost ? "bottom-[calc(var(--zivo-safe-bottom,0px)+9.5rem)]" : "bottom-[calc(var(--zivo-safe-bottom,0px)+5.5rem)]",
          )}
          aria-label="Jump to latest message"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      <ChannelInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        channel={channel}
        posts={timelinePosts}
        isSubscribed={isSubscribed}
        joinPending={joinPending}
        canManage={canPost}
        notificationsOn={notificationsOn}
        onSubscribe={subscribe}
        onSetNotifications={setNotifications}
        onShareToChat={shareChannel}
        onCopyLink={copyChannelLink}
        onExternalShare={shareChannelExternal}
        onRefresh={refresh}
      />
    </div>
  );
}
