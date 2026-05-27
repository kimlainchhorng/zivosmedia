import { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Hash,
  ImageIcon,
  Link as LinkIcon,
  Lock,
  Mic,
  Music,
  Play,
  Settings,
  Share2,
  Users,
  Video,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Channel, ChannelPost } from "@/hooks/useChannel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  CHANNEL_MEDIA_TABS,
  buildChannelMediaBuckets,
  formatChannelMediaDuration,
  type ChannelMediaItem,
  type ChannelMediaTab,
} from "@/lib/channels/channelMedia";
import { cn } from "@/lib/utils";

type ChannelInfoSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  posts: ChannelPost[];
  isSubscribed: boolean;
  canManage: boolean;
  notificationsOn: boolean;
  onSubscribe: () => void | Promise<void>;
  onSetNotifications: (enabled: boolean) => void | Promise<void>;
  onShareToChat: () => void;
  onCopyLink: () => void | Promise<void>;
  onExternalShare: () => void | Promise<void>;
  onManage?: () => void;
};

const TAB_META: Record<ChannelMediaTab, { label: string; icon: ComponentType<{ className?: string }>; empty: string }> = {
  media: { label: "Media", icon: ImageIcon, empty: "Photos and videos from this channel will show here." },
  files: { label: "Files", icon: FileText, empty: "Shared files will show here." },
  links: { label: "Links", icon: LinkIcon, empty: "Links from channel posts will show here." },
  music: { label: "Music", icon: Music, empty: "Music and audio links will show here." },
  gif: { label: "GIF", icon: Play, empty: "GIFs shared in this channel will show here." },
  voice: { label: "Voice", icon: Mic, empty: "Voice messages will show here." },
};

export function ChannelInfoSheet({
  open,
  onOpenChange,
  channel,
  posts,
  isSubscribed,
  canManage,
  notificationsOn,
  onSubscribe,
  onSetNotifications,
  onShareToChat,
  onCopyLink,
  onExternalShare,
  onManage,
}: ChannelInfoSheetProps) {
  const [activeTab, setActiveTab] = useState<ChannelMediaTab>("media");
  const buckets = useMemo(() => buildChannelMediaBuckets(posts), [posts]);
  const activeItems = buckets[activeTab];
  const initials = channel.name.slice(0, 2).toUpperCase();
  const pinnedCount = posts.filter((post) => post.is_pinned).length;
  const postDates = posts
    .map((post) => post.published_at || post.created_at)
    .filter(Boolean)
    .sort();
  const latestPostDate = postDates[postDates.length - 1];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-hidden px-0 py-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>Channel info</SheetTitle>
          <SheetDescription>{channel.name} channel details and shared media.</SheetDescription>
        </SheetHeader>

        <div className="flex h-full flex-col bg-background">
          <div className="border-b border-border/50 bg-muted/25">
            <div className="h-28 overflow-hidden bg-muted">
              {channel.banner_url ? (
                <img src={channel.banner_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-background to-muted">
                  <Hash className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="-mt-12 px-5 pb-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={channel.avatar_url || undefined} alt={channel.name} />
                <AvatarFallback className="text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>

              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-foreground">{channel.name}</h2>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">@{channel.handle}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {channel.is_public ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {channel.is_public ? "Public" : "Private"}
                </span>
              </div>

              {channel.description && <p className="mt-2 text-sm leading-5 text-foreground/80">{channel.description}</p>}

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <InfoMetric label="Subscribers" value={channel.subscriber_count.toLocaleString()} icon={Users} />
                <InfoMetric label="Posts" value={posts.length.toLocaleString()} icon={Hash} />
                <InfoMetric label="Pinned" value={pinnedCount.toLocaleString()} icon={Play} />
              </div>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-4 py-4">
              <button
                type="button"
                onClick={() => {
                  if (!isSubscribed && !canManage) {
                    void onSubscribe();
                    return;
                  }
                  void onSetNotifications(!notificationsOn);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  {notificationsOn ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {!isSubscribed && !canManage ? "Join for notifications" : "Notifications"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {!isSubscribed && !canManage
                      ? "Subscribe to receive new channel posts."
                      : notificationsOn
                        ? "New post alerts are on."
                        : "New post alerts are muted."}
                  </span>
                </span>
                <span
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    notificationsOn && (isSubscribed || canManage) ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-4 w-4 rounded-full bg-background shadow transition-transform",
                      notificationsOn && (isSubscribed || canManage) ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </span>
              </button>

              <div className="grid grid-cols-4 gap-2">
                <QuickAction icon={Share2} label="Chat" onClick={onShareToChat} />
                <QuickAction icon={Copy} label="Copy" onClick={() => void onCopyLink()} />
                <QuickAction icon={ExternalLink} label="Share" onClick={() => void onExternalShare()} />
                {canManage ? (
                  <QuickAction icon={Settings} label="Manage" onClick={onManage} />
                ) : isSubscribed ? (
                  <QuickAction icon={Users} label="Joined" disabled />
                ) : (
                  <QuickAction icon={Users} label="Join" onClick={() => void onSubscribe()} />
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex gap-1 overflow-x-auto border-b border-border/70 p-2">
                  {CHANNEL_MEDIA_TABS.map((tab) => {
                    const meta = TAB_META[tab];
                    const Icon = meta.icon;
                    const active = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                        <span className={cn("text-[10px]", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {buckets[tab].length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3">
                  {activeItems.length > 0 ? (
                    activeTab === "media" || activeTab === "gif" ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {activeItems.map((item) => (
                          <MediaTile key={item.id} item={item} />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeItems.map((item) => (
                          <InfoItemRow key={item.id} item={item} />
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                      {(() => {
                        const EmptyIcon = TAB_META[activeTab].icon;
                        return <EmptyIcon className="mb-3 h-8 w-8 text-muted-foreground" />;
                      })()}
                      <p className="text-sm font-semibold text-foreground">No {TAB_META[activeTab].label.toLowerCase()} yet</p>
                      <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">{TAB_META[activeTab].empty}</p>
                    </div>
                  )}
                </div>
              </div>

              {latestPostDate && (
                <p className="px-1 text-center text-[11px] text-muted-foreground">
                  Latest post {formatInfoDate(latestPostDate)}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-2 py-2 shadow-sm">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button type="button" variant="outline" className="h-16 flex-col gap-1 rounded-xl px-2 text-xs" onClick={onClick} disabled={disabled}>
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

function MediaTile({ item }: { item: ChannelMediaItem }) {
  const isVideo = item.type.startsWith("video") || /\.(mp4|mov|m4v|webm)($|\?)/i.test(item.url);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
      aria-label={`Open ${item.label}`}
    >
      {isVideo ? (
        <>
          <video src={item.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
            <Video className="h-6 w-6 drop-shadow" />
          </span>
        </>
      ) : (
        <img src={item.url} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
      )}
      {item.tab === "gif" && (
        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">GIF</span>
      )}
    </a>
  );
}

function InfoItemRow({ item }: { item: ChannelMediaItem }) {
  const Icon = item.tab === "files" ? FileText : item.tab === "music" ? Music : item.tab === "voice" ? Mic : LinkIcon;
  const duration = formatChannelMediaDuration(item.durationMs);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:bg-muted/45"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{item.label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {duration ? `${duration} · ` : ""}
          {formatInfoDate(item.createdAt)}
        </span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}

function formatInfoDate(value: string | null | undefined): string {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}
