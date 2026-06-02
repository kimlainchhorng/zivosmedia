import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Brush,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  Hash,
  Heart,
  ImageIcon,
  Link as LinkIcon,
  Lock,
  MessageSquare,
  Mic,
  MinusCircle,
  MoreHorizontal,
  Music,
  Pin,
  Play,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  UserMinus,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Channel, ChannelPost } from "@/hooks/useChannel";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  buildChannelMediaBuckets,
  formatChannelMediaDuration,
  type ChannelMediaItem,
  type ChannelMediaTab,
} from "@/lib/channels/channelMedia";
import { cn } from "@/lib/utils";
import { stripImageMetadata } from "@/utils/stripImageMetadata";
import { CHANNEL_WALLPAPERS, normalizeChannelWallpaper, type ChannelWallpaperStyle } from "@/lib/channels/channelWallpaper";
import { copyText } from "@/lib/native/clipboard";
import { getChannelShareUrl } from "@/lib/getPublicOrigin";

type ChannelInfoSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  posts: ChannelPost[];
  isSubscribed: boolean;
  joinPending?: boolean;
  canManage: boolean;
  notificationsOn: boolean;
  onSubscribe: () => void | Promise<void>;
  onSetNotifications: (enabled: boolean) => void | Promise<void>;
  onShareToChat: () => void;
  onCopyLink: () => void | Promise<void>;
  onExternalShare: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
};

type InfoView =
  | "info"
  | "edit"
  | "groupType"
  | "reactions"
  | "appearance"
  | "topics"
  | "members"
  | "permissions"
  | "admins"
  | "removed"
  | "actions";
type ProfileInfoTab = "members" | "media" | "voice" | "links" | "gif";

type InfoMember = {
  user_id: string;
  role: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type InfoRemovedUser = {
  user_id: string;
  removed_by: string | null;
  removed_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  removed_by_name: string | null;
};

const TAB_META: Record<ChannelMediaTab, { label: string; icon: ComponentType<{ className?: string }>; empty: string }> = {
  media: { label: "Media", icon: ImageIcon, empty: "Photos and videos from this channel will show here." },
  files: { label: "Files", icon: FileText, empty: "Shared files will show here." },
  links: { label: "Links", icon: LinkIcon, empty: "Links from channel posts will show here." },
  music: { label: "Music", icon: Music, empty: "Music and audio links will show here." },
  gif: { label: "GIF", icon: Play, empty: "GIFs shared in this channel will show here." },
  voice: { label: "Voice", icon: Mic, empty: "Voice messages will show here." },
};

const PROFILE_INFO_TABS: Array<{ id: ProfileInfoTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "members", label: "Members", icon: Users },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "links", label: "Links", icon: LinkIcon },
  { id: "gif", label: "GIFs", icon: Play },
];

export function ChannelInfoSheet({
  open,
  onOpenChange,
  channel,
  posts,
  isSubscribed,
  joinPending = false,
  canManage,
  notificationsOn,
  onSubscribe,
  onSetNotifications,
  onShareToChat,
  onCopyLink,
  onExternalShare,
  onRefresh,
}: ChannelInfoSheetProps) {
  const [view, setView] = useState<InfoView>("info");
  const [profileTab, setProfileTab] = useState<ProfileInfoTab>("members");
  const [members, setMembers] = useState<InfoMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersReloadKey, setMembersReloadKey] = useState(0);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [removedUsers, setRemovedUsers] = useState<InfoRemovedUser[]>([]);
  const [removedLoading, setRemovedLoading] = useState(false);
  const [removedReloadKey, setRemovedReloadKey] = useState(0);
  const [removedBusyId, setRemovedBusyId] = useState<string | null>(null);
  const buckets = useMemo(() => buildChannelMediaBuckets(posts), [posts]);
  const profileMediaItems = profileTab === "members" ? [] : buckets[profileTab];
  const initials = channel.name.slice(0, 2).toUpperCase();
  const pinnedCount = posts.filter((post) => post.is_pinned).length;
  const channelShareUrl = getChannelShareUrl(channel.handle);
  const postDates = posts
    .map((post) => post.published_at || post.created_at)
    .filter(Boolean)
    .sort();
  const latestPostDate = postDates[postDates.length - 1];
  const adminMembers = members.filter((member) => member.role === "owner" || member.role === "admin");

  useEffect(() => {
    if (!open) {
      setView("info");
      return;
    }
    if (!channel.id || (!canManage && view !== "members")) return;
    let cancelled = false;
    setMembersLoading(true);
    (async () => {
      if (!canManage && channel.hide_members) {
        const { data: ownerProfile } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .eq("user_id", channel.owner_id)
          .maybeSingle();
        if (!cancelled) {
          setMembers([
            {
              user_id: channel.owner_id,
              role: "owner",
              display_name: ownerProfile?.full_name ?? null,
              avatar_url: ownerProfile?.avatar_url ?? null,
            },
          ]);
          setMembersLoading(false);
        }
        return;
      }
      const { data } = await (supabase as any)
        .from("channel_subscribers")
        .select("user_id, role")
        .eq("channel_id", channel.id);
      const rows = (data ?? []) as Array<{ user_id: string; role: string | null }>;
      const ids = Array.from(new Set([channel.owner_id, ...rows.map((row) => row.user_id)].filter(Boolean)));
      const { data: profiles } = ids.length
        ? await (supabase as any)
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", ids)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
      if (!cancelled) {
        const ownerPresent = rows.some((row) => row.user_id === channel.owner_id);
        const normalizedRows = ownerPresent
          ? rows.map((row) => (row.user_id === channel.owner_id ? { ...row, role: "owner" } : row))
          : [{ user_id: channel.owner_id, role: "owner" }, ...rows];
        setMembers(
          normalizedRows.map((row) => ({
            user_id: row.user_id,
            role: row.role,
            display_name: profileMap.get(row.user_id)?.full_name ?? null,
            avatar_url: profileMap.get(row.user_id)?.avatar_url ?? null,
          })),
        );
      }
      if (!cancelled) setMembersLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage, channel.hide_members, channel.id, channel.owner_id, membersReloadKey, open, view]);

  const reloadMembers = () => setMembersReloadKey((key) => key + 1);
  const reloadRemovedUsers = () => setRemovedReloadKey((key) => key + 1);

  useEffect(() => {
    if (!open || !canManage || !channel.id) return;
    let cancelled = false;
    setRemovedLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("channel_removed_users")
        .select("user_id, removed_by, removed_at")
        .eq("channel_id", channel.id)
        .order("removed_at", { ascending: false });
      const rows = (data ?? []) as Array<{ user_id: string; removed_by: string | null; removed_at: string | null }>;
      const ids = Array.from(new Set(rows.flatMap((row) => [row.user_id, row.removed_by]).filter(Boolean)));
      const { data: profiles } = ids.length
        ? await (supabase as any)
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", ids)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
      if (!cancelled) {
        setRemovedUsers(rows.map((row) => ({
          user_id: row.user_id,
          removed_by: row.removed_by,
          removed_at: row.removed_at,
          display_name: profileMap.get(row.user_id)?.full_name ?? null,
          avatar_url: profileMap.get(row.user_id)?.avatar_url ?? null,
          removed_by_name: row.removed_by ? profileMap.get(row.removed_by)?.full_name ?? null : null,
        })));
        setRemovedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage, channel.id, open, removedReloadKey]);

  const updateMemberRole = async (member: InfoMember, role: "admin" | "sub") => {
    if (member.role === "owner" || memberBusyId) return;
    setMemberBusyId(member.user_id);
    try {
      const { error } = await (supabase as any)
        .from("channel_subscribers")
        .update({ role })
        .eq("channel_id", channel.id)
        .eq("user_id", member.user_id);
      if (error) throw error;
      toast.success(role === "admin" ? "Member promoted to admin" : "Admin role removed");
      reloadMembers();
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update member");
    } finally {
      setMemberBusyId(null);
    }
  };

  const removeMember = async (member: InfoMember) => {
    if (member.role === "owner" || memberBusyId) return;
    setMemberBusyId(member.user_id);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in required");
      const { error } = await (supabase as any)
        .from("channel_subscribers")
        .delete()
        .eq("channel_id", channel.id)
        .eq("user_id", member.user_id);
      if (error) throw error;
      const { error: removedError } = await (supabase as any)
        .from("channel_removed_users")
        .upsert({
          channel_id: channel.id,
          user_id: member.user_id,
          removed_by: u.user.id,
        }, { onConflict: "channel_id,user_id" });
      if (removedError) throw removedError;
      toast.success("Member removed");
      reloadMembers();
      reloadRemovedUsers();
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not remove member");
    } finally {
      setMemberBusyId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose className="w-full overflow-hidden px-0 py-0 sm:max-w-md">
        <SheetHeader className="sr-only">
          <SheetTitle>Channel info</SheetTitle>
          <SheetDescription>{channel.name} channel details and shared media.</SheetDescription>
        </SheetHeader>

        <div
          className="flex h-full flex-col"
          style={{
            backgroundColor: "#d8efd8",
            backgroundImage: [
              "radial-gradient(circle at 18px 18px, rgba(255,255,255,.34) 0 2px, transparent 2.5px)",
              "radial-gradient(circle at 40px 44px, rgba(64,122,96,.12) 0 3px, transparent 3.5px)",
              "linear-gradient(135deg, rgba(255,255,255,.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.2) 50%, rgba(255,255,255,.2) 75%, transparent 75%, transparent)",
            ].join(", "),
            backgroundSize: "72px 72px, 72px 72px, 34px 34px",
          }}
        >
          <SheetClose
            className="absolute right-3 top-[calc(var(--zivo-safe-top,0px)+0.75rem)] z-50 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/45 text-slate-500 outline-none backdrop-blur transition hover:bg-white/85 hover:text-slate-800 active:scale-95 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            style={{ outline: "none", boxShadow: "none" }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
          {view !== "info" && (
            <TelegramSubview
              view={view}
              channel={channel}
              members={members}
              membersLoading={membersLoading}
              memberBusyId={memberBusyId}
              adminMembers={adminMembers}
              removedUsers={removedUsers}
              removedLoading={removedLoading}
              removedBusyId={removedBusyId}
              posts={posts}
              onPromote={(member) => void updateMemberRole(member, "admin")}
              onDemote={(member) => void updateMemberRole(member, "sub")}
              onRemove={(member) => void removeMember(member)}
              onAllowRejoin={async (user) => {
                if (removedBusyId) return;
                setRemovedBusyId(user.user_id);
                try {
                  const { error } = await (supabase as any)
                    .from("channel_removed_users")
                    .delete()
                    .eq("channel_id", channel.id)
                    .eq("user_id", user.user_id);
                  if (error) throw error;
                  toast.success("User can rejoin");
                  reloadRemovedUsers();
                } catch (error: any) {
                  toast.error(error?.message || "Could not update removed user");
                } finally {
                  setRemovedBusyId(null);
                }
              }}
              onRefresh={onRefresh}
              onBack={() => setView("info")}
              onClose={() => onOpenChange(false)}
              onView={setView}
            />
          )}
          {view === "info" && (
            <>
          <div className="bg-white/82 px-4 pb-4 pr-14 pt-[calc(var(--zivo-safe-top,0px)+0.75rem)] shadow-sm ring-1 ring-white/70 backdrop-blur">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16 shrink-0 border-4 border-white shadow-md">
                <AvatarImage src={channel.avatar_url || undefined} alt={channel.name} />
                <AvatarFallback className="bg-sky-100 text-lg font-bold text-sky-700">{initials}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold leading-tight text-slate-950">{channel.name}</h2>
                <p className="mt-0.5 truncate text-sm text-slate-500">@{channel.handle}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    {channel.is_public ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {channel.is_public ? "Public" : "Private"}
                  </span>
                </div>
              </div>
            </div>

            {channel.description && <p className="mt-3 text-sm leading-5 text-slate-700">{channel.description}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              <InfoMetric label={channel.subscriber_count === 1 ? "Subscriber" : "Subscribers"} value={channel.subscriber_count.toLocaleString()} icon={Users} />
              <InfoMetric label="Posts" value={posts.length.toLocaleString()} icon={Hash} />
              <InfoMetric label="Pinned" value={pinnedCount.toLocaleString()} icon={Pin} />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-4 py-4">
              <InfoSection>
                <button
                  type="button"
                  onClick={() => {
                    if (joinPending) return;
                    if (!isSubscribed && !canManage) {
                      void onSubscribe();
                      return;
                    }
                    void onSetNotifications(!notificationsOn);
                  }}
                  disabled={joinPending}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/70 disabled:opacity-60"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                    {notificationsOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-slate-950">
                      {joinPending ? "Request pending" : !isSubscribed && !canManage ? "Join for notifications" : "Notifications"}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {joinPending
                        ? "Admin approval required."
                        : !isSubscribed && !canManage
                        ? "Subscribe to receive new posts."
                        : notificationsOn
                          ? "Alerts are on."
                          : "Alerts are muted."}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative h-7 w-12 rounded-full transition-colors",
                      notificationsOn && (isSubscribed || canManage) ? "bg-sky-500" : "bg-slate-200",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        notificationsOn && (isSubscribed || canManage) ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </span>
                </button>
              </InfoSection>

              <div className="grid grid-cols-4 gap-2">
                <QuickAction icon={Video} label="video chat" onClick={() => toast.message("Video chat is not available for this channel yet")} />
                <QuickAction
                  icon={notificationsOn ? Bell : BellOff}
                  label={notificationsOn ? "mute" : "unmute"}
                  onClick={() => {
                    if (!isSubscribed && !canManage) {
                      void onSubscribe();
                      return;
                    }
                    void onSetNotifications(!notificationsOn);
                  }}
                  disabled={joinPending}
                />
                <QuickAction icon={Search} label="search" onClick={() => toast.message("Channel search will use posted messages and shared media")} />
                <QuickAction icon={MoreHorizontal} label="more" onClick={canManage ? () => setView("edit") : () => void onExternalShare()} />
              </div>

              <button
                type="button"
                onClick={() => void onCopyLink()}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/86 px-4 py-3 text-left shadow-sm ring-1 ring-white/75 backdrop-blur"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-700">share link</span>
                  <span className="block truncate text-base font-medium text-sky-500">{channelShareUrl.replace(/^https?:\/\//, "")}</span>
                </span>
                <span className="grid h-9 w-9 shrink-0 grid-cols-2 gap-0.5 rounded-md text-sky-500">
                  <span className="rounded-sm border-2 border-current" />
                  <span className="rounded-sm border-2 border-current" />
                  <span className="rounded-sm border-2 border-current" />
                  <span className="rounded-sm border-2 border-current" />
                </span>
              </button>

              {canManage && (
                <div className="space-y-2">
                  <InfoSection>
                    <SettingsRow icon={Settings} label="Group Settings" onClick={() => setView("edit")} />
                  </InfoSection>
                  <SectionLabel>Admin</SectionLabel>
                  <InfoSection>
                    <SettingsRow icon={Settings} label="Settings" value="Edit" onClick={() => setView("edit")} />
                  </InfoSection>
                  <SectionLabel>Management</SectionLabel>
                  <InfoSection>
                    <SettingsRow icon={Users} label="Members" value={channel.subscriber_count.toLocaleString()} onClick={() => setView("members")} />
                    <SettingsRow icon={Shield} label="Permissions" value="12/15" onClick={() => setView("permissions")} />
                    <SettingsRow icon={Shield} label="Admins" value={Math.max(1, adminMembers.length).toLocaleString()} onClick={() => setView("admins")} />
                    <SettingsRow icon={UserMinus} label="Removed Users" value={removedUsers.length.toLocaleString()} onClick={() => setView("removed")} />
                    <SettingsRow icon={Eye} label="Recent Actions" onClick={() => setView("actions")} />
                  </InfoSection>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl bg-white/86 p-1 shadow-sm ring-1 ring-white/75 backdrop-blur scrollbar-hide">
                <div className="flex min-w-max gap-1">
                  {PROFILE_INFO_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = profileTab === tab.id;
                    const count = tab.id === "members" ? members.length : buckets[tab.id].length;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setProfileTab(tab.id)}
                        className={cn(
                          "flex h-11 min-w-24 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition",
                          active ? "bg-slate-100 text-slate-950 shadow-sm" : "text-slate-600 hover:bg-white/70",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                        {count > 0 && <span className="text-[11px] text-slate-400">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {profileTab === "members" ? (
                <InfoSection>
                  {canManage && (
                    <SettingsRow icon={UserPlus} label="Add Members" onClick={() => setView("members")} />
                  )}
                  {membersLoading ? (
                    <div className="px-4 py-4 text-sm text-slate-500">Loading members...</div>
                  ) : members.length > 0 ? (
                    members.slice(0, 8).map((member) => (
                      <MemberLine
                        key={member.user_id}
                        member={member}
                        fallbackName={member.role === "owner" ? "Owner" : "Subscriber"}
                        badge={member.role === "owner" ? "owner" : undefined}
                      />
                    ))
                  ) : (
                    <div className="px-4 py-4 text-sm text-slate-500">No visible members yet.</div>
                  )}
                  {members.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setView("members")}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-sky-500"
                    >
                      Show all members
                    </button>
                  )}
                </InfoSection>
              ) : (
                <InfoSection>
                  <div className="p-3">
                    {profileMediaItems.length > 0 ? (
                      profileTab === "media" || profileTab === "gif" ? (
                        <div className="grid grid-cols-3 gap-1.5">
                          {profileMediaItems.map((item) => (
                            <MediaTile key={item.id} item={item} />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {profileMediaItems.map((item) => (
                            <InfoItemRow key={item.id} item={item} />
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="flex min-h-28 flex-col items-center justify-center p-5 text-center">
                        {(() => {
                          const EmptyIcon = TAB_META[profileTab].icon;
                          return <EmptyIcon className="mb-2 h-6 w-6 text-slate-400" />;
                        })()}
                        <p className="text-sm font-semibold text-slate-950">No {TAB_META[profileTab].label.toLowerCase()} yet</p>
                        <p className="mt-1 max-w-56 text-xs leading-5 text-slate-500">{TAB_META[profileTab].empty}</p>
                      </div>
                    )}
                  </div>
                </InfoSection>
              )}

              {latestPostDate && (
                <p className="px-1 text-center text-[11px] text-muted-foreground">
                  Latest post {formatInfoDate(latestPostDate)}
                </p>
              )}
            </div>
          </ScrollArea>
            </>
          )}
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
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/78 px-3 py-1.5 text-xs shadow-sm ring-1 ring-white/80">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      <span className="font-bold text-slate-950">{value}</span>
      <span className="font-medium text-slate-500">{label}</span>
    </div>
  );
}

function TelegramSubview({
  view,
  channel,
  members,
  membersLoading,
  memberBusyId,
  adminMembers,
  removedUsers,
  removedLoading,
  removedBusyId,
  posts,
  onPromote,
  onDemote,
  onRemove,
  onAllowRejoin,
  onRefresh,
  onBack,
  onClose,
  onView,
}: {
  view: Exclude<InfoView, "info">;
  channel: Channel;
  members: InfoMember[];
  membersLoading: boolean;
  memberBusyId: string | null;
  adminMembers: InfoMember[];
  removedUsers: InfoRemovedUser[];
  removedLoading: boolean;
  removedBusyId: string | null;
  posts: ChannelPost[];
  onPromote: (member: InfoMember) => void;
  onDemote: (member: InfoMember) => void;
  onRemove: (member: InfoMember) => void;
  onAllowRejoin: (user: InfoRemovedUser) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  onBack: () => void;
  onClose: () => void;
  onView: (view: InfoView) => void;
}) {
  const [membersEditing, setMembersEditing] = useState(false);
  const titleMap: Record<Exclude<InfoView, "info">, string> = {
    edit: "Channel Settings",
    groupType: "Channel Type",
    reactions: "Reactions",
    appearance: "Appearance",
    topics: "Topics",
    members: "Members",
    permissions: "Permissions",
    admins: "Chat Admins",
    removed: "Removed Users",
    actions: "Recent Actions",
  };

  useEffect(() => {
    if (view !== "members") setMembersEditing(false);
  }, [view]);

  return (
    <div className="flex h-full flex-col bg-[#f1f1f6]">
      <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-[calc(var(--zivo-safe-top,0px)+0.75rem)]">
        <button type="button" onClick={onBack} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-900/10" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-center text-base font-bold text-slate-950">{titleMap[view]}</h2>
        {view === "edit" || view === "groupType" || view === "members" ? (
          <button
            type="button"
            onClick={view === "members" ? () => setMembersEditing((value) => !value) : view === "edit" ? onClose : onBack}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-slate-900/10"
          >
            {view === "members" ? membersEditing ? "Done" : "Edit" : "Done"}
          </button>
        ) : (
          <span className="h-11 w-11" />
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-4 pb-8">
          {view === "edit" && <EditSettingsView channel={channel} removedCount={removedUsers.length} onRefresh={onRefresh} onView={onView} />}
          {view === "groupType" && <GroupTypeView channel={channel} onRefresh={onRefresh} />}
          {view === "reactions" && <ReactionsView channel={channel} onRefresh={onRefresh} />}
          {view === "appearance" && <AppearanceView channel={channel} onRefresh={onRefresh} />}
          {view === "topics" && <TopicsView channel={channel} onRefresh={onRefresh} />}
          {view === "members" && (
            <MembersView
              channel={channel}
              members={members}
              membersLoading={membersLoading}
              memberBusyId={memberBusyId}
              canManage={canManage}
              editing={membersEditing}
              onRefresh={onRefresh}
              onPromote={onPromote}
              onDemote={onDemote}
              onRemove={onRemove}
            />
          )}
          {view === "permissions" && <PermissionsView channel={channel} removedCount={removedUsers.length} onRefresh={onRefresh} onView={onView} />}
          {view === "admins" && (
            <AdminsView
              members={adminMembers}
              allMembers={members}
              memberBusyId={memberBusyId}
              onPromote={onPromote}
              onDemote={onDemote}
              onRemove={onRemove}
            />
          )}
          {view === "removed" && <RemovedUsersView users={removedUsers} loading={removedLoading} busyId={removedBusyId} onAllowRejoin={onAllowRejoin} />}
          {view === "actions" && <RecentActionsView channel={channel} posts={posts} />}
        </div>
      </ScrollArea>
    </div>
  );
}

function EditSettingsView({
  channel,
  removedCount,
  onRefresh,
  onView,
}: {
  channel: Channel;
  removedCount: number;
  onRefresh?: () => void | Promise<void>;
  onView: (view: InfoView) => void;
}) {
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(channel.name);
    setDescription(channel.description ?? "");
  }, [channel.description, channel.name]);

  const save = async () => {
    const nextName = name.trim();
    if (!nextName) {
      toast.error("Channel name is required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("channels")
        .update({ name: nextName, description: description.trim() || null })
        .eq("id", channel.id);
      if (error) throw error;
      toast.success("Channel settings saved");
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not save channel settings");
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File | null | undefined) => {
    if (!file || uploadingPhoto) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be 10 MB or smaller");
      return;
    }
    setUploadingPhoto(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sign in required");
      const cleanFile = await stripImageMetadata(file, { maxDimension: 1024, quality: 0.9 });
      const ext = (cleanFile.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
      const path = `${userData.user.id}/${channel.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("channel-media").upload(path, cleanFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: cleanFile.type || "image/jpeg",
      });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("channel-media").getPublicUrl(path);
      const { error: updateError } = await (supabase as any)
        .from("channels")
        .update({ avatar_url: publicUrl.publicUrl })
        .eq("id", channel.id);
      if (updateError) throw updateError;
      toast.success("Channel photo updated");
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update channel photo");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="text-center">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void uploadPhoto(event.target.files?.[0])}
        />
        <Avatar className="mx-auto h-28 w-28 shadow-xl">
          <AvatarImage src={channel.avatar_url || undefined} alt={channel.name} />
          <AvatarFallback className="bg-sky-100 text-4xl font-bold text-sky-700">{channel.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="mt-3 text-sm font-semibold text-sky-500 disabled:opacity-60"
        >
          {uploadingPhoto ? "Uploading..." : "Set New Photo"}
        </button>
      </div>

      <InfoSection>
        <div className="px-4 py-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className="w-full bg-transparent text-base text-slate-950 outline-none"
            aria-label="Channel name"
          />
          <div className="my-3 h-px bg-slate-100" />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={240}
            rows={2}
            placeholder="Description"
            className="w-full resize-none bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
            aria-label="Channel description"
          />
        </div>
      </InfoSection>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="w-full rounded-full bg-sky-500 px-4 py-3 text-base font-bold text-white shadow-xl disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      <InfoSection>
        <SettingsRow icon={Users} label="Channel Type" value={channel.is_public ? "Public" : "Private"} onClick={() => onView("groupType")} />
      </InfoSection>

      <InfoSection>
        <SettingsRow icon={Heart} label="Reactions" value="All Reactions" onClick={() => onView("reactions")} />
        <SettingsRow icon={Brush} label="Appearance" onClick={() => onView("appearance")} />
        <SettingsRow icon={MessageSquare} label="Topics" value={channel.topics_enabled ? "Enabled" : "Disabled"} onClick={() => onView("topics")} />
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">The channel chat can be divided into topics created by admins or subscribers.</p>

      <InfoSection>
        <SettingsRow icon={Users} label="Members" value={channel.subscriber_count.toLocaleString()} onClick={() => onView("members")} />
        <SettingsRow icon={Shield} label="Permissions" value={channel.hide_members ? "Members hidden" : "12/15"} onClick={() => onView("permissions")} />
        <SettingsRow icon={Shield} label="Administrators" value="1" onClick={() => onView("admins")} />
        <SettingsRow icon={UserMinus} label="Removed Users" value={removedCount.toLocaleString()} onClick={() => onView("removed")} />
        <SettingsRow icon={Eye} label="Recent Actions" onClick={() => onView("actions")} />
      </InfoSection>

      <button
        type="button"
        onClick={() => toast.message("Delete channel confirmation is not enabled in this panel yet")}
        className="w-full rounded-2xl bg-white px-4 py-4 text-left text-base text-rose-500"
      >
        Delete Channel
      </button>
    </>
  );
}

function GroupTypeView({ channel, onRefresh }: { channel: Channel; onRefresh?: () => void | Promise<void> }) {
  const [saving, setSaving] = useState<"public" | "private" | null>(null);
  const [savingRestrict, setSavingRestrict] = useState(false);
  const [savingApproval, setSavingApproval] = useState(false);
  const shareUrl = getChannelShareUrl(channel.handle);
  const copyShareUrl = async () => {
    try {
      await copyText(shareUrl);
      toast.success("Invite link copied");
    } catch {
      toast.message("Copy this invite link", { description: shareUrl, duration: 10000 });
    }
  };

  const setPublic = async (next: boolean) => {
    if (next === channel.is_public || saving) return;
    setSaving(next ? "public" : "private");
    try {
      const { error } = await (supabase as any)
        .from("channels")
        .update({ is_public: next })
        .eq("id", channel.id);
      if (error) throw error;
      toast.success(next ? "Channel is public" : "Channel is private");
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update channel type");
    } finally {
      setSaving(null);
    }
  };

  const setRestrictSaving = async (next: boolean) => {
    if (next === (channel.restrict_saving_content !== false) || savingRestrict) return;
    setSavingRestrict(true);
    try {
      const { error } = await (supabase as any)
        .from("channels")
        .update({ restrict_saving_content: next })
        .eq("id", channel.id);
      if (error) throw error;
      toast.success(next ? "Saving is restricted" : "Saving is allowed");
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update saving restriction");
    } finally {
      setSavingRestrict(false);
    }
  };

  const setJoinApproval = async (next: boolean) => {
    if (next === !!channel.channel_join_approval_required || savingApproval) return;
    setSavingApproval(true);
    try {
      const { error } = await (supabase as any)
        .from("channels")
        .update({ channel_join_approval_required: next })
        .eq("id", channel.id);
      if (error) throw error;
      toast.success(next ? "Join approval enabled" : "Join approval disabled");
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update join approval");
    } finally {
      setSavingApproval(false);
    }
  };

  return (
    <>
      <SectionLabel>Channel Type</SectionLabel>
      <InfoSection>
        <ChoiceRow label={saving === "public" ? "Public..." : "Public"} selected={channel.is_public} onClick={() => void setPublic(true)} />
        <ChoiceRow label={saving === "private" ? "Private..." : "Private"} selected={!channel.is_public} onClick={() => void setPublic(false)} />
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">Public channels can be found in search and anyone can join.</p>
      <InfoSection>
        <button type="button" onClick={() => void copyShareUrl()} className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span className="min-w-0 truncate text-base text-slate-950">{shareUrl.replace(/^https?:\/\//, "")}</span>
          <X className="h-4 w-4 rounded-full bg-slate-300 p-0.5 text-white" />
        </button>
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">People can share this link with others and find your channel.</p>
      <InfoSection>
        <SettingsRow icon={LinkIcon} label="Manage Invite Links" onClick={() => void copyShareUrl()} />
      </InfoSection>
      <InfoSection>
        <SwitchRow
          label={savingApproval ? "Updating..." : "Approve New Members"}
          checked={!!channel.channel_join_approval_required}
          onClick={() => void setJoinApproval(!channel.channel_join_approval_required)}
        />
      </InfoSection>
      <SectionLabel>Forwarding From This Channel</SectionLabel>
      <InfoSection>
        <SwitchRow
          label={savingRestrict ? "Updating..." : "Restrict Saving Content"}
          checked={channel.restrict_saving_content !== false}
          onClick={() => void setRestrictSaving(!(channel.restrict_saving_content !== false))}
        />
      </InfoSection>
    </>
  );
}

function ReactionsView({ channel, onRefresh }: { channel: Channel; onRefresh?: () => void | Promise<void> }) {
  const [saving, setSaving] = useState<Channel["reaction_policy"] | null>(null);
  const current = channel.reaction_policy ?? "all";
  const setPolicy = async (next: NonNullable<Channel["reaction_policy"]>) => {
    if (next === current || saving) return;
    setSaving(next);
    try {
      const { error } = await (supabase as any)
        .from("channels")
        .update({ reaction_policy: next })
        .eq("id", channel.id);
      if (error) throw error;
      toast.success(next === "none" ? "Reactions disabled" : next === "some" ? "Limited reactions enabled" : "All reactions enabled");
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update reactions");
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <SectionLabel>Available Reactions</SectionLabel>
      <InfoSection>
        <ChoiceRow label={saving === "all" ? "All Reactions..." : "All Reactions"} selected={current === "all"} onClick={() => void setPolicy("all")} />
        <ChoiceRow label={saving === "some" ? "Some Reactions..." : "Some Reactions"} selected={current === "some"} onClick={() => void setPolicy("some")} />
        <ChoiceRow label={saving === "none" ? "No Reactions..." : "No Reactions"} selected={current === "none"} onClick={() => void setPolicy("none")} />
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">
        {current === "none"
          ? "Subscribers cannot react to channel messages."
          : current === "some"
          ? "Subscribers can use a limited reaction set on channel messages."
          : "Subscribers can use all supported emoji reactions on channel messages."}
      </p>
    </>
  );
}

function AppearanceView({ channel, onRefresh }: { channel: Channel; onRefresh?: () => void | Promise<void> }) {
  const colors = ["#3b9fe2", "#44b83f", "#e8862f", "#d95e5e", "#9b5de5", "#4fb3c8", "#cc5f93", "#8a98a6"];
  const [savingWallpaper, setSavingWallpaper] = useState<ChannelWallpaperStyle | null>(null);
  const currentWallpaper = normalizeChannelWallpaper(channel.wallpaper_style);
  const setWallpaper = async (next: ChannelWallpaperStyle) => {
    if (next === currentWallpaper || savingWallpaper) return;
    setSavingWallpaper(next);
    try {
      const { error } = await (supabase as any)
        .from("channels")
        .update({ wallpaper_style: next })
        .eq("id", channel.id);
      if (error) throw error;
      toast.success(`${CHANNEL_WALLPAPERS[next].label} wallpaper applied`);
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update wallpaper");
    } finally {
      setSavingWallpaper(null);
    }
  };

  return (
    <>
      <div className="text-center">
        <Avatar className="mx-auto h-28 w-28 shadow-xl">
          <AvatarImage src={channel.avatar_url || undefined} alt={channel.name} />
          <AvatarFallback className="bg-sky-100 text-4xl font-bold text-sky-700">{channel.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <h3 className="mt-4 text-2xl font-bold text-slate-950">{channel.name}</h3>
        <p className="text-sm text-slate-500">{channel.subscriber_count.toLocaleString()} subscribers</p>
      </div>
      <InfoSection>
        <div className="grid grid-cols-8 gap-3 p-4">
          {colors.concat(colors).map((color, index) => (
            <span key={`${color}-${index}`} className="h-9 w-9 rounded-full" style={{ background: index >= colors.length ? `linear-gradient(135deg, ${color} 50%, #f8d48b 50%)` : color }} />
          ))}
        </div>
        <SettingsRow icon={Brush} label="Profile Logo" value="Level 5" onClick={() => toast.message("Profile logo unlocks at Level 5")} />
      </InfoSection>
      <InfoSection>
        <SettingsRow icon={Sparkles} label="Channel Emoji Pack" value="Level 4" onClick={() => toast.message("Emoji packs unlock at Level 4")} />
      </InfoSection>
      <InfoSection>
        <SettingsRow icon={Sparkles} label="Channel Emoji Status" value="Level 8" onClick={() => toast.message("Emoji status unlocks at Level 8")} />
      </InfoSection>
      <InfoSection>
        <SettingsRow icon={ImageIcon} label="Channel Wallpaper" value="Choose" onClick={() => toast.message("Choose a wallpaper below")} />
        <div className="grid grid-cols-4 gap-2 p-3">
          {(Object.keys(CHANNEL_WALLPAPERS) as ChannelWallpaperStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => void setWallpaper(style)}
              disabled={!!savingWallpaper}
              className={cn(
                "relative aspect-[3/4] overflow-hidden rounded-xl border p-2 text-center text-[10px] font-semibold text-slate-600 transition disabled:opacity-60",
                currentWallpaper === style ? "border-sky-500 ring-2 ring-sky-200" : "border-slate-200",
              )}
              style={CHANNEL_WALLPAPERS[style].shell}
            >
              <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/80 px-1 py-0.5 shadow-sm">
                {savingWallpaper === style ? "Saving..." : CHANNEL_WALLPAPERS[style].label}
              </span>
              {currentWallpaper === style && (
                <span className="absolute right-2 top-2 rounded-full bg-sky-500 p-1 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      </InfoSection>
      <button
        type="button"
        onClick={() => toast.success("Appearance changes applied")}
        className="sticky bottom-4 w-full rounded-full bg-sky-500 px-4 py-3 text-base font-bold text-white shadow-xl"
      >
        Apply Changes
      </button>
    </>
  );
}

function TopicsView({ channel, onRefresh }: { channel: Channel; onRefresh?: () => void | Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const setTopicsEnabled = async (next: boolean) => {
    if (next === !!channel.topics_enabled || saving) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("channels")
        .update({ topics_enabled: next })
        .eq("id", channel.id);
      if (error) throw error;
      toast.success(next ? "Topics enabled" : "Topics disabled");
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update topics");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="py-8 text-center">
        <MessageSquare className="mx-auto h-20 w-20 text-sky-500" />
        <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-slate-500">The channel chat will be divided into topics created by admins or subscribers.</p>
      </div>
      <InfoSection>
        <SwitchRow label={saving ? "Updating Topics..." : "Enable Topics"} checked={!!channel.topics_enabled} onClick={() => void setTopicsEnabled(!channel.topics_enabled)} />
      </InfoSection>
    </>
  );
}

function MembersView({
  channel,
  members,
  membersLoading,
  memberBusyId,
  canManage,
  editing,
  onRefresh,
  onPromote,
  onDemote,
  onRemove,
}: {
  channel: Channel;
  members: InfoMember[];
  membersLoading: boolean;
  memberBusyId: string | null;
  canManage: boolean;
  editing: boolean;
  onRefresh?: () => void | Promise<void>;
  onPromote: (member: InfoMember) => void;
  onDemote: (member: InfoMember) => void;
  onRemove: (member: InfoMember) => void;
}) {
  const [savingHidden, setSavingHidden] = useState(false);
  const ownerLike = members.find((member) => member.role === "owner") ?? members[0];
  const rest = members.filter((member) => member.user_id !== ownerLike?.user_id);
  const canShowList = canManage || !channel.hide_members;
  const setHideMembers = async (next: boolean) => {
    if (next === !!channel.hide_members || savingHidden) return;
    setSavingHidden(true);
    try {
      const { error } = await (supabase as any)
        .from("channels")
        .update({ hide_members: next })
        .eq("id", channel.id);
      if (error) throw error;
      toast.success(next ? "Member list hidden" : "Member list visible");
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update member visibility");
    } finally {
      setSavingHidden(false);
    }
  };

  return (
    <>
      <InfoSection>
        <SwitchRow
          label={savingHidden ? "Updating..." : "Hide Members"}
          checked={!!channel.hide_members}
          onClick={canManage ? () => void setHideMembers(!channel.hide_members) : undefined}
        />
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">Switch this on to hide the list of subscribers in this channel. Admins will remain visible.</p>
      {canManage && (
        <InfoSection>
          <SettingsRow icon={UserPlus} label="Add Members" onClick={() => toast.message("Member picker will open from contacts when contacts are connected")} />
        </InfoSection>
      )}
      {membersLoading && <p className="px-4 text-sm text-slate-500">Loading members...</p>}
      {ownerLike && (
        <>
          <SectionLabel>Contacts In This Channel</SectionLabel>
          <InfoSection>
            <MemberLine member={ownerLike} fallbackName="Owner" badge="owner" />
          </InfoSection>
        </>
      )}
      <SectionLabel>Other Members</SectionLabel>
      <InfoSection>
        {!canShowList ? (
          <div className="px-4 py-4 text-sm text-slate-500">The subscriber list is hidden by channel admins.</div>
        ) : rest.length > 0 ? rest.map((member) => (
          <MemberLine
            key={member.user_id}
            member={member}
            busy={memberBusyId === member.user_id}
            leadingAction={
              canManage && editing ? (
                <button
                  type="button"
                  onClick={() => onRemove(member)}
                  disabled={memberBusyId === member.user_id}
                  className="mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-rose-500 transition active:scale-95 disabled:opacity-50"
                  aria-label={`Remove ${member.display_name || "member"}`}
                >
                  <MinusCircle className="h-6 w-6 fill-rose-500 text-white" />
                </button>
              ) : undefined
            }
            actions={
              !canManage || editing ? undefined :
              member.role === "pending"
                ? [
                    { label: "Approve", onClick: () => onDemote(member) },
                    { label: "Remove", destructive: true, onClick: () => onRemove(member) },
                  ]
                : member.role === "admin"
                ? [
                    { label: "Remove admin", onClick: () => onDemote(member) },
                    { label: "Remove", destructive: true, onClick: () => onRemove(member) },
                  ]
                : [
                    { label: "Make admin", onClick: () => onPromote(member) },
                    { label: "Remove", destructive: true, onClick: () => onRemove(member) },
                  ]
            }
          />
        )) : (
          <div className="px-4 py-4 text-sm text-slate-500">{channel.subscriber_count > 1 ? "Subscriber profiles are private." : "No other members yet."}</div>
        )}
      </InfoSection>
    </>
  );
}

const SLOW_MODE_OPTIONS = [
  { label: "Off", seconds: 0 },
  { label: "5s", seconds: 5 },
  { label: "10s", seconds: 10 },
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
  { label: "1h", seconds: 3600 },
] as const;

function PermissionsView({
  channel,
  removedCount,
  onRefresh,
  onView,
}: {
  channel: Channel;
  removedCount: number;
  onRefresh?: () => void | Promise<void>;
  onView: (view: InfoView) => void;
}) {
  const [savingSlowMode, setSavingSlowMode] = useState<number | null>(null);
  const [localPermissions, setLocalPermissions] = useState({
    sendMessages: true,
    sendMedia: true,
    addMembers: true,
    pinMessages: false,
    editOwnTags: true,
    changeInfo: false,
    chargeStars: false,
  });
  const currentSlowMode = SLOW_MODE_OPTIONS.some((option) => option.seconds === channel.slow_mode_seconds)
    ? channel.slow_mode_seconds ?? 0
    : 0;
  const selectedIndex = Math.max(0, SLOW_MODE_OPTIONS.findIndex((option) => option.seconds === currentSlowMode));
  const setSlowMode = async (seconds: number) => {
    if (seconds === currentSlowMode || savingSlowMode !== null) return;
    setSavingSlowMode(seconds);
    try {
      const { error } = await (supabase as any)
        .from("channels")
        .update({ slow_mode_seconds: seconds })
        .eq("id", channel.id);
      if (error) throw error;
      const label = SLOW_MODE_OPTIONS.find((option) => option.seconds === seconds)?.label ?? "Off";
      toast.success(seconds > 0 ? `Slow mode set to ${label}` : "Slow mode disabled");
      await onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message || "Could not update slow mode");
    } finally {
      setSavingSlowMode(null);
    }
  };
  const toggleLocalPermission = (key: keyof typeof localPermissions) => {
    setLocalPermissions((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <>
      <SectionLabel>What Can Subscribers Do?</SectionLabel>
      <InfoSection>
        <SwitchRow label="Send Messages" checked={localPermissions.sendMessages} onClick={() => toggleLocalPermission("sendMessages")} />
        <SwitchRow label="Send Media 10/10" checked={localPermissions.sendMedia} onClick={() => toggleLocalPermission("sendMedia")} />
        <SwitchRow label="Add Members" checked={localPermissions.addMembers} onClick={() => toggleLocalPermission("addMembers")} />
        <SwitchRow label="Pin Messages" checked={localPermissions.pinMessages} danger onClick={() => toggleLocalPermission("pinMessages")} />
        <SwitchRow label="Edit Own Tags" checked={localPermissions.editOwnTags} danger onClick={() => toggleLocalPermission("editOwnTags")} />
        <SwitchRow label="Change Channel Info" checked={localPermissions.changeInfo} danger onClick={() => toggleLocalPermission("changeInfo")} />
      </InfoSection>
      <InfoSection>
        <SwitchRow label="Charge Stars for Messages" checked={localPermissions.chargeStars} onClick={() => toggleLocalPermission("chargeStars")} />
      </InfoSection>
      <SectionLabel>Slow Mode</SectionLabel>
      <InfoSection>
        <div className="p-4">
          <div className="mb-3 grid grid-cols-8 text-center text-xs text-slate-500">
            {SLOW_MODE_OPTIONS.map((option) => (
              <button
                key={option.seconds}
                type="button"
                onClick={() => void setSlowMode(option.seconds)}
                disabled={savingSlowMode !== null}
                className={cn("rounded-full py-1 font-semibold transition disabled:opacity-60", currentSlowMode === option.seconds && "bg-sky-50 text-sky-600")}
              >
                {savingSlowMode === option.seconds ? "..." : option.label}
              </button>
            ))}
          </div>
          <div className="relative h-1 rounded-full bg-slate-200">
            <div
              className="absolute left-0 top-0 h-1 rounded-full bg-sky-400"
              style={{ width: `${(selectedIndex / (SLOW_MODE_OPTIONS.length - 1)) * 100}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-1 ring-sky-200"
              style={{ left: `${(selectedIndex / (SLOW_MODE_OPTIONS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">Choose how long each subscriber must wait before sending their next message.</p>
      <InfoSection>
        <SettingsRow icon={UserMinus} label="Removed Users" value={removedCount.toLocaleString()} onClick={() => onView("removed")} />
      </InfoSection>
      <SectionLabel>Exceptions</SectionLabel>
      <InfoSection>
        <SettingsRow icon={UserPlus} label="Add Exception" onClick={() => toast.message("Permission exceptions will use the member picker")} />
      </InfoSection>
    </>
  );
}

function AdminsView({
  members,
  allMembers,
  memberBusyId,
  onPromote,
  onDemote,
  onRemove,
}: {
  members: InfoMember[];
  allMembers: InfoMember[];
  memberBusyId: string | null;
  onPromote: (member: InfoMember) => void;
  onDemote: (member: InfoMember) => void;
  onRemove: (member: InfoMember) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const candidates = allMembers.filter((member) => member.role !== "owner" && member.role !== "admin" && member.role !== "pending");

  return (
    <>
      <SectionLabel>Channel Admins</SectionLabel>
      <InfoSection>
        <SettingsRow icon={UserPlus} label="Add Admin" onClick={() => setPickerOpen(true)} />
        {members.length > 0 ? members.map((member) => (
          <MemberLine
            key={member.user_id}
            member={member}
            badge={member.role === "owner" ? "owner" : "admin"}
            busy={memberBusyId === member.user_id}
            actions={
              member.role === "owner"
                ? undefined
                : [
                    { label: "Remove admin", onClick: () => onDemote(member) },
                    { label: "Remove", destructive: true, onClick: () => onRemove(member) },
                  ]
            }
          />
        )) : (
          <MemberLine member={{ user_id: "owner", role: "owner", display_name: "Owner", avatar_url: null }} badge="owner" />
        )}
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">You can add admins to help manage this channel.</p>
      {pickerOpen && (
        <div
          className="fixed inset-0 z-[1700] flex items-end justify-center bg-black/35 px-2 pb-2"
          role="dialog"
          aria-modal="true"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="max-h-[78dvh] w-full max-w-md overflow-hidden rounded-[2rem] bg-[#f1f1f6] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <button type="button" onClick={() => setPickerOpen(false)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow">
                Cancel
              </button>
              <h3 className="text-base font-bold text-slate-950">Members</h3>
              <span className="w-[76px]" />
            </div>
            <div className="px-5 pb-3">
              <div className="flex h-10 items-center gap-2 rounded-full bg-white px-3 text-slate-400">
                <Search className="h-4 w-4" />
                <span className="text-base">Search</span>
              </div>
            </div>
            <ScrollArea className="max-h-[calc(78dvh-7.5rem)]">
              <div className="pb-4">
                <SectionLabel>Group Members</SectionLabel>
                {candidates.length > 0 ? candidates.map((member) => (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => {
                      onPromote(member);
                      setPickerOpen(false);
                    }}
                    disabled={memberBusyId === member.user_id}
                    className="flex w-full items-center gap-3 border-b border-slate-200/70 bg-white px-5 py-3 text-left last:border-b-0 disabled:opacity-50"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={member.avatar_url || undefined} alt={member.display_name || "Member"} />
                      <AvatarFallback className="bg-sky-100 font-bold text-sky-700">{(member.display_name || "M").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-slate-950">{member.display_name || "Subscriber"}</span>
                      <span className="block truncate text-sm text-slate-500">last seen recently</span>
                    </span>
                  </button>
                )) : (
                  <div className="bg-white px-5 py-6 text-sm text-slate-500">No subscribers available to promote.</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
}

function RemovedUsersView({
  users,
  loading,
  busyId,
  onAllowRejoin,
}: {
  users: InfoRemovedUser[];
  loading: boolean;
  busyId: string | null;
  onAllowRejoin: (user: InfoRemovedUser) => void | Promise<void>;
}) {
  return (
    <>
      <InfoSection>
        <button type="button" onClick={() => toast.message("Choose a member from Members to remove them")} className="w-full px-4 py-4 text-left text-base text-sky-500">
          Remove User
        </button>
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">Users removed by admins cannot rejoin using invite links.</p>
      <SectionLabel>Removed Users</SectionLabel>
      <InfoSection>
        {loading ? (
          <div className="px-4 py-4 text-sm text-slate-500">Loading removed users...</div>
        ) : users.length > 0 ? users.map((user) => {
          const name = user.display_name || "Removed user";
          const removedBy = user.removed_by_name || "an admin";
          return (
            <div key={user.user_id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={user.avatar_url || undefined} alt={name} />
                  <AvatarFallback className="bg-rose-100 font-bold text-rose-700">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-slate-950">{name}</span>
                  <span className="block truncate text-sm text-slate-500">Removed by {removedBy}</span>
                </span>
              </div>
              <div className="mt-2 flex justify-end pl-14">
                <button
                  type="button"
                  onClick={() => void onAllowRejoin(user)}
                  disabled={busyId === user.user_id}
                  className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 disabled:opacity-50"
                >
                  {busyId === user.user_id ? "Updating..." : "Allow rejoin"}
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="px-4 py-4 text-sm text-slate-500">No removed users yet.</div>
        )}
      </InfoSection>
    </>
  );
}

function RecentActionsView({ channel, posts }: { channel: Channel; posts: ChannelPost[] }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    members: false,
    settings: false,
    messages: false,
  });
  const [checked, setChecked] = useState<Record<string, boolean>>({
    members: true,
    adminRights: true,
    exceptions: true,
    newMembers: true,
    leftMembers: true,
    settings: true,
    groupInfo: true,
    inviteLinks: true,
    videoChats: true,
    messages: true,
    deleted: true,
    edited: true,
    pinned: true,
    allAdmins: true,
    owner: true,
  });
  const recentPosts = posts.slice(0, 3);
  const toggleChecked = (key: string) => setChecked((current) => ({ ...current, [key]: !current[key] }));
  const toggleExpanded = (key: string) => setExpanded((current) => ({ ...current, [key]: !current[key] }));

  return (
    <>
      <div
        className="rounded-2xl p-4 text-center text-white"
        style={{
          backgroundColor: "#8fd59d",
          backgroundImage: "linear-gradient(135deg, rgba(255,255,255,.18) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.18) 50%, rgba(255,255,255,.18) 75%, transparent 75%, transparent)",
          backgroundSize: "32px 32px",
        }}
      >
        <p className="text-sm font-bold">{channel.name}</p>
        <p className="text-xs opacity-80">All Actions</p>
        <div className="mt-24 space-y-2">
          <ActionPill text="Today" />
          <ActionPill text="Channel settings were updated" />
          {recentPosts.map((post) => <ActionPill key={post.id} text={post.body ? `Post created: ${post.body.slice(0, 32)}` : "Media post created"} />)}
        </div>
      </div>
      <InfoSection>
        <SettingsRow icon={SlidersHorizontal} label="Filter Recent Actions" value="All" onClick={() => setFilterOpen(true)} />
      </InfoSection>
      {filterOpen && (
        <div
          className="fixed inset-0 z-[1700] flex items-end justify-center bg-black/35 px-2 pb-2"
          role="dialog"
          aria-modal="true"
          onClick={() => setFilterOpen(false)}
        >
          <div
            className="relative max-h-[82dvh] w-full max-w-md overflow-hidden rounded-[2rem] bg-[#f1f1f6] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="absolute left-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg"
              aria-label="Close filters"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="px-6 pb-5 pt-6">
              <h3 className="text-center text-base font-bold text-slate-950">Recent Actions</h3>
            </div>
            <ScrollArea className="max-h-[calc(82dvh-6.5rem)] px-5 pb-5">
              <div className="space-y-5 pb-20">
                <SectionLabel>Filter Actions By Type</SectionLabel>
                <InfoSection>
                  <ActionFilterGroup
                    label="Members and Admins"
                    count="4/4"
                    checked={checked.members}
                    expanded={expanded.members}
                    onToggleChecked={() => toggleChecked("members")}
                    onToggleExpanded={() => toggleExpanded("members")}
                  />
                  {expanded.members && (
                    <div className="pl-14">
                      <ActionFilterChild label="New Admin Rights" checked={checked.adminRights} onClick={() => toggleChecked("adminRights")} />
                      <ActionFilterChild label="New Exceptions" checked={checked.exceptions} onClick={() => toggleChecked("exceptions")} />
                      <ActionFilterChild label="New Members" checked={checked.newMembers} onClick={() => toggleChecked("newMembers")} />
                      <ActionFilterChild label="Members Left the Group" checked={checked.leftMembers} onClick={() => toggleChecked("leftMembers")} />
                    </div>
                  )}
                  <ActionFilterGroup
                    label="Group Settings"
                    count="3/3"
                    checked={checked.settings}
                    expanded={expanded.settings}
                    onToggleChecked={() => toggleChecked("settings")}
                    onToggleExpanded={() => toggleExpanded("settings")}
                  />
                  {expanded.settings && (
                    <div className="pl-14">
                      <ActionFilterChild label="Group Info" checked={checked.groupInfo} onClick={() => toggleChecked("groupInfo")} />
                      <ActionFilterChild label="Invite Links" checked={checked.inviteLinks} onClick={() => toggleChecked("inviteLinks")} />
                      <ActionFilterChild label="Video Chats" checked={checked.videoChats} onClick={() => toggleChecked("videoChats")} />
                    </div>
                  )}
                  <ActionFilterGroup
                    label="Messages"
                    count="3/3"
                    checked={checked.messages}
                    expanded={expanded.messages}
                    onToggleChecked={() => toggleChecked("messages")}
                    onToggleExpanded={() => toggleExpanded("messages")}
                  />
                  {expanded.messages && (
                    <div className="pl-14">
                      <ActionFilterChild label="Deleted Messages" checked={checked.deleted} onClick={() => toggleChecked("deleted")} />
                      <ActionFilterChild label="Edited Messages" checked={checked.edited} onClick={() => toggleChecked("edited")} />
                      <ActionFilterChild label="Pinned Messages" checked={checked.pinned} onClick={() => toggleChecked("pinned")} />
                    </div>
                  )}
                </InfoSection>

                <SectionLabel>Filter Actions By Admins</SectionLabel>
                <InfoSection>
                  <ActionFilterChild label="Show Actions by All Admins" checked={checked.allAdmins} onClick={() => toggleChecked("allAdmins")} />
                  <div className="pl-14">
                    <ActionFilterChild label="Kim" checked={checked.owner} onClick={() => toggleChecked("owner")} avatar="K" />
                  </div>
                </InfoSection>
              </div>
            </ScrollArea>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#f1f1f6] via-[#f1f1f6] to-transparent px-5 pb-5 pt-9">
              <button
                type="button"
                onClick={() => {
                  setFilterOpen(false);
                  toast.success("Recent action filter applied");
                }}
                className="pointer-events-auto w-full rounded-full bg-sky-500 px-4 py-3 text-base font-bold text-white shadow-xl"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActionCheck({ checked }: { checked: boolean }) {
  return (
    <span className={cn(
      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
      checked ? "bg-sky-500 text-white" : "bg-slate-200 text-transparent",
    )}>
      <Check className="h-4 w-4" />
    </span>
  );
}

function ActionFilterGroup({
  label,
  count,
  checked,
  expanded,
  onToggleChecked,
  onToggleExpanded,
}: {
  label: string;
  count: string;
  checked: boolean;
  expanded: boolean;
  onToggleChecked: () => void;
  onToggleExpanded: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <button type="button" onClick={onToggleChecked} aria-label={`Toggle ${label}`}>
        <ActionCheck checked={checked} />
      </button>
      <button type="button" onClick={onToggleExpanded} className="flex min-w-0 flex-1 items-center justify-between text-left">
        <span className="truncate text-base font-medium text-slate-950">{label}</span>
        <span className="ml-2 inline-flex items-center gap-1 text-sm font-bold text-slate-950">
          {count}
          <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
        </span>
      </button>
    </div>
  );
}

function ActionFilterChild({
  label,
  checked,
  onClick,
  avatar,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  avatar?: string;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0">
      <ActionCheck checked={checked} />
      {avatar && (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-400 text-sm font-bold text-white">
          {avatar}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-base font-medium text-slate-950">{label}</span>
    </button>
  );
}

function InfoSection({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl bg-white/88 shadow-sm ring-1 ring-white/70 backdrop-blur">{children}</div>;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</p>;
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/70">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-500"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-950">{label}</span>
      {value && <span className="shrink-0 text-sm text-slate-400">{value}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );
}

function SwitchRow({
  label,
  checked = false,
  danger = false,
  onClick,
}: {
  label: string;
  checked?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={cn("text-base", danger && !checked ? "text-slate-400" : "text-slate-950")}>{label}</span>
      <span className={cn("relative h-8 w-14 rounded-full transition", checked ? (danger ? "bg-red-600" : "bg-green-500") : danger ? "bg-red-200" : "bg-slate-300")}>
        <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow transition", checked ? "translate-x-7" : "translate-x-1")} />
      </span>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={checked}
        className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0"
      >
        {content}
      </button>
    );
  }
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0">
      {content}
    </div>
  );
}

function ChoiceRow({ label, selected = false, onClick }: { label: string; selected?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0">
      <span className="h-5 w-5 text-sky-500">{selected && <Check className="h-5 w-5" />}</span>
      <span className="text-base text-slate-950">{label}</span>
    </button>
  );
}

function MemberLine({
  member,
  fallbackName = "Subscriber",
  badge,
  busy = false,
  leadingAction,
  actions,
}: {
  member: InfoMember;
  fallbackName?: string;
  badge?: string;
  busy?: boolean;
  leadingAction?: ReactNode;
  actions?: Array<{ label: string; destructive?: boolean; onClick: () => void }>;
}) {
  const name = member.display_name || fallbackName;
  return (
    <div className="border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        {leadingAction}
        <Avatar className="h-11 w-11">
          <AvatarImage src={member.avatar_url || undefined} alt={name} />
          <AvatarFallback className="bg-sky-100 font-bold text-sky-700">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-slate-950">{name}</span>
          <span className="block truncate text-sm text-sky-500">
            {member.role === "owner" ? "online" : member.role === "admin" ? "admin" : member.role === "pending" ? "pending approval" : "last seen recently"}
          </span>
        </span>
        {badge && <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-500">{badge}</span>}
      </div>
      {actions && actions.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-end gap-2 pl-14">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={busy}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50",
                action.destructive ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-sky-50 text-sky-600 hover:bg-sky-100",
              )}
            >
              {busy ? "Working..." : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionPill({ text }: { text: string }) {
  return <div className="mx-auto w-fit max-w-full rounded-full bg-emerald-600/70 px-3 py-1 text-xs font-bold">{text}</div>;
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
    <button
      type="button"
      className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl bg-white/86 px-1 py-2 text-center text-[11px] font-semibold text-sky-600 shadow-sm ring-1 ring-white/75 transition hover:bg-white disabled:opacity-60"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sky-600">
        <Icon className="h-4 w-4" />
      </span>
      <span className="w-full truncate">{label}</span>
    </button>
  );
}

function MediaTile({ item }: { item: ChannelMediaItem }) {
  const isVideo = item.type.startsWith("video") || /\.(mp4|mov|m4v|webm)($|\?)/i.test(item.url);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group relative aspect-square overflow-hidden rounded-md bg-slate-100"
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
        <img src={item.url} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" decoding="async" />
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
      className="flex items-center gap-3 rounded-xl bg-white/70 p-3 transition-colors hover:bg-white"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-950">{item.label}</span>
        <span className="block truncate text-xs text-slate-500">
          {duration ? `${duration} · ` : ""}
          {formatInfoDate(item.createdAt)}
        </span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
    </a>
  );
}

function formatInfoDate(value: string | null | undefined): string {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}
