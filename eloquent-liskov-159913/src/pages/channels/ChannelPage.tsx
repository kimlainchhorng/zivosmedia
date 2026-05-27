import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Hash, ImageIcon, Inbox, Link as LinkIcon, Users } from "lucide-react";
import { useChannel } from "@/hooks/useChannel";
import { ChannelHeader } from "@/components/channels/ChannelHeader";
import { ChannelPostCard } from "@/components/channels/ChannelPostCard";
import { ChannelPostComposer } from "@/components/channels/ChannelPostComposer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getChannelShareUrl } from "@/lib/getPublicOrigin";
import { shareContent } from "@/lib/native/share";
import { copyText } from "@/lib/native/clipboard";
import { toast } from "sonner";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";

type ViewTab = "posts" | "media" | "links";

export default function ChannelPage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ViewTab>("posts");
  const [controlOpen, setControlOpen] = useState(false);
  const { channel, posts, isSubscribed, notificationsOn, role, loading, userId, subscribe, unsubscribe, setNotifications, refresh } =
    useChannel(handle);

  const sortedPosts = [...posts].sort((a, b) => Number(!!b.is_pinned) - Number(!!a.is_pinned));

  const pinnedPost = sortedPosts.find((p) => p.is_pinned);

  const filteredPosts =
    activeTab === "posts"
      ? sortedPosts
      : activeTab === "media"
        ? sortedPosts.filter((p) =>
            Array.isArray(p.media) &&
            p.media.some((m: any) => {
              if (!m?.url) return false;
              const type = String(m?.type || "").toLowerCase();
              return type.startsWith("image") || type.startsWith("video");
            }),
          )
        : sortedPosts.filter((p) => /https?:\/\//i.test(p.body || ""));

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

  return (
    <div className="zivo-shell-mobile mx-auto max-w-2xl bg-background text-foreground pt-safe pb-20">
      <div className="zivo-sticky-mobile-header z-20 px-3 py-2">
        <div className="flex items-center gap-2">
        <button type="button"
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
        </div>

        <div className="mt-2 grid grid-cols-3 rounded-xl bg-muted/70 p-1 ring-1 ring-border/40">
          {([
            { id: "posts", label: "Posts", icon: Hash },
            { id: "media", label: "Media", icon: ImageIcon },
            { id: "links", label: "Links", icon: LinkIcon },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "h-8 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground/75 hover:text-foreground",
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", !active && "opacity-90")} /> {tab.label}
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
          const EmptyIcon = activeTab === "media" ? ImageIcon : activeTab === "links" ? LinkIcon : Inbox;
          const emptyTitle =
            activeTab === "posts" ? "No posts yet" : activeTab === "media" ? "No media shared yet" : "No links shared yet";
          const emptySubtitle =
            activeTab === "posts"
              ? canPost
                ? "Share something with your subscribers to get started."
                : "New posts from this channel will show up here."
              : activeTab === "media"
                ? "Photos and videos posted to this channel will appear here."
                : "Links shared in posts will appear here.";
          return (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <EmptyIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{emptySubtitle}</p>
              {activeTab === "posts" && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {canPost && (
                    <Button type="button" size="sm" onClick={() => setControlOpen(true)}>
                      Create first post
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={shareChannel}>
                    Share to a chat
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
    </div>
  );
}
