import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, FileText, Hash, ImageIcon, Inbox, Info, Link as LinkIcon, Mic, Music, Play, Share2, Users } from "lucide-react";
import { useChannel } from "@/hooks/useChannel";
import { ChannelHeader } from "@/components/channels/ChannelHeader";
import { ChannelInfoSheet } from "@/components/channels/ChannelInfoSheet";
import { ChannelPostCard } from "@/components/channels/ChannelPostCard";
import { ChannelPostComposer } from "@/components/channels/ChannelPostComposer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildChannelMediaBuckets,
  channelPostMatchesTab,
  type ChannelMediaTab,
} from "@/lib/channels/channelMedia";
import { getChannelShareUrl } from "@/lib/getPublicOrigin";
import { shareContent } from "@/lib/native/share";
import { copyText } from "@/lib/native/clipboard";
import { toast } from "sonner";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";

type ViewTab = "posts" | ChannelMediaTab;

export default function ChannelPage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ViewTab>("posts");
  const [controlOpen, setControlOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const { channel, posts, isSubscribed, notificationsOn, role, loading, userId, subscribe, unsubscribe, setNotifications, refresh } =
    useChannel(handle);

  const sortedPosts = useMemo(() => [...posts].sort((a, b) => Number(!!b.is_pinned) - Number(!!a.is_pinned)), [posts]);
  const mediaBuckets = useMemo(() => buildChannelMediaBuckets(sortedPosts), [sortedPosts]);

  const pinnedPost = sortedPosts.find((p) => p.is_pinned);

  const filteredPosts = useMemo(
    () => (activeTab === "posts" ? sortedPosts : sortedPosts.filter((post) => channelPostMatchesTab(post, activeTab))),
    [activeTab, sortedPosts],
  );

  useEffect(() => {
    if (!channel?.id) return;
    try {
      setControlOpen(localStorage.getItem(`zivo:channel:control-open:${channel.id}`) === "1");
    } catch {
      setControlOpen(false);
    }
  }, [channel?.id]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!channel) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Channel not found.</div>;
  }

  const isOwner = userId === channel.owner_id;
  const canPost = isOwner || role === "admin" || role === "owner";
  const canViewComments = isSubscribed || canPost;
  const showInlineJoin = !isSubscribed && !canPost && filteredPosts.length === 0;

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

  const tabItems: { id: ViewTab; label: string; icon: typeof Hash; count: number }[] = [
    { id: "posts", label: "Posts", icon: Hash, count: sortedPosts.length },
    { id: "media", label: "Media", icon: ImageIcon, count: mediaBuckets.media.length },
    { id: "files", label: "Files", icon: FileText, count: mediaBuckets.files.length },
    { id: "links", label: "Links", icon: LinkIcon, count: mediaBuckets.links.length },
    { id: "music", label: "Music", icon: Music, count: mediaBuckets.music.length },
    { id: "gif", label: "GIF", icon: Play, count: mediaBuckets.gif.length },
    { id: "voice", label: "Voice", icon: Mic, count: mediaBuckets.voice.length },
  ];

  return (
    <div className="zivo-shell-mobile mx-auto max-w-2xl bg-background text-foreground pt-safe pb-20">
      <div className="zivo-sticky-mobile-header z-20 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/channels"))}
            className="p-2 -ml-2 rounded-full text-foreground hover:bg-muted"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{channel.name}</p>
            <p className="text-[11px] text-muted-foreground truncate inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {channel.subscriber_count.toLocaleString()} subscriber{channel.subscriber_count === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-muted"
            aria-label="Open channel info"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1 ring-1 ring-border/40">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "h-8 shrink-0 rounded-lg px-3 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground/75 hover:text-foreground",
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", !active && "opacity-90")} />
                {tab.label}
                {tab.count > 0 && <span className="text-[10px] opacity-70">{tab.count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <ChannelHeader
        channel={channel}
        isSubscribed={isSubscribed}
        isOwner={isOwner}
        notificationsOn={notificationsOn}
        onSubscribe={subscribe}
        onUnsubscribe={unsubscribe}
        onSetNotifications={setNotifications}
      />

      {pinnedPost && (
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className="w-full text-left border-b border-border/40 px-4 py-2.5 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Pinned message</p>
          <p className="text-[12px] text-foreground/90 truncate mt-0.5">{pinnedPost.body || "Pinned post"}</p>
        </button>
      )}

      <div className="space-y-3 p-4">
        {canPost && activeTab === "posts" && <ChannelPostComposer channelId={channel.id} onPosted={refresh} />}
        {filteredPosts.map((p) => (
            <ChannelPostCard
              key={p.id}
              post={p}
              canManage={canPost}
              canComment={canViewComments}
              protectContent={!canPost && !controlOpen}
              onPinChanged={refresh}
            />
          ))}
        {filteredPosts.length === 0 && (() => {
          const emptyState = getChannelEmptyState(activeTab, canPost);
          const EmptyIcon = emptyState.icon;
          const showSubscribedEmpty = activeTab === "posts" && isSubscribed && !canPost;
          return (
            <div className={cn(
              "rounded-2xl border bg-card p-8 text-center shadow-sm",
              showSubscribedEmpty ? "border-primary/20" : "border-dashed border-border",
            )}>
              <div className={cn(
                "mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full",
                showSubscribedEmpty ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground",
              )}>
                {showSubscribedEmpty ? <Bell className="h-5 w-5" /> : <EmptyIcon className="h-5 w-5" />}
              </div>
              <p className="text-sm font-semibold text-foreground">
                {showSubscribedEmpty ? "You're subscribed" : emptyState.title}
              </p>
              <p className="mx-auto mt-1 max-w-[280px] text-[12px] leading-5 text-muted-foreground">
                {showSubscribedEmpty
                  ? `New posts from @${channel.handle} will appear here, and notifications are ${notificationsOn ? "on" : "muted"}.`
                  : emptyState.subtitle}
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
              {activeTab === "posts" && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {canPost && (
                    <Button type="button" size="sm" onClick={() => setControlOpen(true)}>
                      Create first post
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={shareChannel}>
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    Send channel
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => void copyChannelLink()}>
                    Copy link
                  </Button>
                  {!isSubscribed && !canPost && !showInlineJoin && (
                    <Button type="button" size="sm" onClick={subscribe}>
                      Join Channel
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => navigate("/channels")}>
                    Discover channels
                  </Button>
                </div>
              )}
            </div>
          );
        })()}

        {showInlineJoin && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-background/95 backdrop-blur p-3 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold truncate">Join @{channel.handle}</p>
              <p className="text-[11px] text-muted-foreground truncate">Get new posts and channel updates.</p>
            </div>
            <Button onClick={subscribe} className="shrink-0">Join</Button>
          </div>
        )}
      </div>

      {!isSubscribed && !canPost && !showInlineJoin && (
        <div className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+4rem)] left-0 right-0 z-30 px-4 pb-3">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-background/95 backdrop-blur p-3 flex items-center justify-between gap-3 shadow-lg">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold truncate">Join @{channel.handle}</p>
              <p className="text-[11px] text-muted-foreground truncate">Get new posts and channel updates.</p>
            </div>
            <Button onClick={subscribe} className="shrink-0">Join</Button>
          </div>
        </div>
      )}

      <ChannelInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        channel={channel}
        posts={sortedPosts}
        isSubscribed={isSubscribed}
        canManage={canPost}
        notificationsOn={notificationsOn}
        onSubscribe={subscribe}
        onSetNotifications={setNotifications}
        onShareToChat={shareChannel}
        onCopyLink={copyChannelLink}
        onExternalShare={shareChannelExternal}
        onManage={() => navigate(`/c/${channel.handle}/manage`)}
      />
    </div>
  );
}

function getChannelEmptyState(tab: ViewTab, canPost: boolean): { title: string; subtitle: string; icon: typeof Hash } {
  switch (tab) {
    case "posts":
      return {
        title: "No posts yet",
        subtitle: canPost ? "Share something with your subscribers to get started." : "New posts from this channel will show up here.",
        icon: Inbox,
      };
    case "media":
      return {
        title: "No media shared yet",
        subtitle: "Photos and videos posted to this channel will appear here.",
        icon: ImageIcon,
      };
    case "files":
      return {
        title: "No files shared yet",
        subtitle: "Documents and downloads posted to this channel will appear here.",
        icon: FileText,
      };
    case "links":
      return {
        title: "No links shared yet",
        subtitle: "Links shared in posts will appear here.",
        icon: LinkIcon,
      };
    case "music":
      return {
        title: "No music shared yet",
        subtitle: "Audio and music links shared in posts will appear here.",
        icon: Music,
      };
    case "gif":
      return {
        title: "No GIFs shared yet",
        subtitle: "Animated GIFs posted to this channel will appear here.",
        icon: Play,
      };
    case "voice":
      return {
        title: "No voice messages yet",
        subtitle: "Voice notes posted to this channel will appear here.",
        icon: Mic,
      };
  }
  return {
    title: "Nothing here yet",
    subtitle: "Shared channel items will appear here.",
    icon: Inbox,
  };
}
