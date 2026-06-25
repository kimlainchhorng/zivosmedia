import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Bell,
  BellOff,
  Brush,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  AlertTriangle,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  Hash,
  Heart,
  ImageIcon,
  Link as LinkIcon,
  Lock,
  LogOut,
  MessageSquare,
  Mic,
  MinusCircle,
  MoonStar,
  MoreHorizontal,
  Music,
  Pencil,
  Pin,
  Play,
  Search,
  Settings,
  Settings2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { ComponentType, ReactNode } from "react";
import type { Channel, ChannelPost, ChannelSubscriberPermissions } from "@/hooks/useChannel";
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
import { getChannelShareUrl, getPublicOrigin } from "@/lib/getPublicOrigin";
import { LOG_CATEGORY, logChannelAction, type ChannelLogAction } from "@/lib/channels/adminLog";
import GroupCallLauncher from "@/components/chat/call/GroupCallLauncher";

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
  | "actions"
  | "search";
type ProfileInfoTab = "members" | "media" | "voice" | "links" | "gif";

const DEFAULT_CHANNEL_SUBSCRIBER_PERMISSIONS: ChannelSubscriberPermissions = {
  sendMessages: true,
  sendMedia: true,
  addMembers: true,
  pinMessages: false,
  editOwnTags: true,
  changeInfo: false,
  chargeStars: false,
};

function normalizeSubscriberPermissions(value: unknown): ChannelSubscriberPermissions {
  const source = value && typeof value === "object" ? value as Partial<ChannelSubscriberPermissions> : {};
  return {
    sendMessages: source.sendMessages ?? DEFAULT_CHANNEL_SUBSCRIBER_PERMISSIONS.sendMessages,
    sendMedia: source.sendMedia ?? DEFAULT_CHANNEL_SUBSCRIBER_PERMISSIONS.sendMedia,
    addMembers: source.addMembers ?? DEFAULT_CHANNEL_SUBSCRIBER_PERMISSIONS.addMembers,
    pinMessages: source.pinMessages ?? DEFAULT_CHANNEL_SUBSCRIBER_PERMISSIONS.pinMessages,
    editOwnTags: source.editOwnTags ?? DEFAULT_CHANNEL_SUBSCRIBER_PERMISSIONS.editOwnTags,
    changeInfo: source.changeInfo ?? DEFAULT_CHANNEL_SUBSCRIBER_PERMISSIONS.changeInfo,
    chargeStars: source.chargeStars ?? DEFAULT_CHANNEL_SUBSCRIBER_PERMISSIONS.chargeStars,
  };
}

function getSubscriberPermissionsSummary(channel: Channel) {
  return getSubscriberPermissionsCount(normalizeSubscriberPermissions(channel.subscriber_permissions));
}

function getSubscriberPermissionsCount(permissions: ChannelSubscriberPermissions) {
  const enabled = Object.values(permissions).filter(Boolean).length;
  return `${enabled}/7`;
}

function getReactionPolicyLabel(policy: Channel["reaction_policy"] | null | undefined) {
  if (policy === "none") return "No Reactions";
  if (policy === "some") return "Some Reactions";
  return "All Reactions";
}

function channelSettingsArgs(channelId: string, updates: Record<string, unknown>) {
  return {
    p_channel_id: channelId,
    p_name: null,
    p_description: null,
    p_avatar_url: null,
    p_banner_url: null,
    p_is_public: null,
    p_channel_join_approval_required: null,
    p_restrict_saving_content: null,
    p_reaction_policy: null,
    p_slow_mode_seconds: null,
    p_hide_members: null,
    p_topics_enabled: null,
    p_wallpaper_style: null,
    p_subscriber_permissions: null,
    ...updates,
  };
}

const QR_THEME_CARDS = [
  { label: "Home", emoji: "🏠", bg: "from-emerald-200 via-teal-100 to-sky-100", qr: "#256f5f", panel: "#c8f3e5" },
  { label: "Duck", emoji: "🐥", bg: "from-lime-200 via-green-100 to-emerald-100", qr: "#68764c", panel: "#b7df9d" },
  { label: "Snow", emoji: "☃", bg: "from-sky-200 via-blue-100 to-indigo-100", qr: "#496b92", panel: "#bfdcff" },
  { label: "Gem", emoji: "💎", bg: "from-violet-200 via-sky-100 to-cyan-100", qr: "#6555a7", panel: "#d8d0ff" },
] as const;

function showManualCopyInvite(url: string) {
  toast.message("Clipboard is blocked", { description: url, duration: 8000 });
}

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

type MemberPickerMode = "members" | "exceptions";

type InfoActionRow = {
  id: string;
  actor_id: string;
  action: string;
  target_user_id: string | null;
  meta: Record<string, any> | null;
  created_at: string;
};

type InfoInviteLink = {
  id: string;
  code: string;
  created_at: string;
  revoked: boolean;
  uses: number;
};

type InfoActorProfile = {
  name?: string | null;
  avatar?: string | null;
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
  { id: "links", label: "Links", icon: LinkIcon },
  { id: "voice", label: "Voice", icon: Mic },
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
  const [channelCallOpen, setChannelCallOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [subscriberPermissions, setSubscriberPermissions] = useState(() => normalizeSubscriberPermissions(channel.subscriber_permissions));
  const [permissionExceptions, setPermissionExceptions] = useState<InfoMember[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [memberPickerMode, setMemberPickerMode] = useState<MemberPickerMode | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<InfoMember[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [memberAddingId, setMemberAddingId] = useState<string | null>(null);
  const [actionRows, setActionRows] = useState<InfoActionRow[]>([]);
  const [actionProfiles, setActionProfiles] = useState<Map<string, InfoActorProfile>>(new Map());
  const [actionsLoading, setActionsLoading] = useState(false);
  const [inviteLinksOpen, setInviteLinksOpen] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<InfoInviteLink[]>([]);
  const [inviteLinksLoading, setInviteLinksLoading] = useState(false);
  const [inviteCreating, setInviteCreating] = useState(false);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
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
  const getInviteUrl = useCallback((code: string) => `${getPublicOrigin()}/c/${channel.handle}?invite=${code}`, [channel.handle]);

  useEffect(() => {
    setSubscriberPermissions(normalizeSubscriberPermissions(channel.subscriber_permissions));
  }, [channel.id, channel.subscriber_permissions]);

  const startVideoChat = () => {
    if (!isSubscribed && !canManage) {
      void onSubscribe();
      return;
    }
    onOpenChange(false);
    window.setTimeout(() => setChannelCallOpen(true), 180);
  };
  const copyQrInvite = async () => {
    try {
      await copyText(channelShareUrl);
      toast.success("QR invite copied");
    } catch {
      showManualCopyInvite(channelShareUrl);
    }
  };

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
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>(
        (profiles ?? []).map((profile: any) => [profile.user_id, profile]),
      );
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

  const loadInviteLinks = useCallback(async () => {
    if (!canManage || !channel.id) return;
    setInviteLinksLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("channel_invite_links")
        .select("id, code, created_at, revoked, uses")
        .eq("channel_id", channel.id)
        .eq("revoked", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInviteLinks((data ?? []) as InfoInviteLink[]);
    } catch (error: any) {
      toast.error(error?.message || "Could not load invite links");
      setInviteLinks([]);
    } finally {
      setInviteLinksLoading(false);
    }
  }, [canManage, channel.id]);

  useEffect(() => {
    if (!inviteLinksOpen) return;
    void loadInviteLinks();
  }, [inviteLinksOpen, loadInviteLinks]);

  const openInviteLinks = () => {
    setInviteLinksOpen(true);
  };

  const createInviteLink = async () => {
    if (inviteCreating) return;
    setInviteCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sign in required");
      const random = typeof crypto !== "undefined" && "getRandomValues" in crypto
        ? Array.from(crypto.getRandomValues(new Uint8Array(9)), (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 12)
        : `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
      const code = random.toLowerCase();
      const { data, error } = await (supabase as any)
        .from("channel_invite_links")
        .insert({ channel_id: channel.id, code, created_by: userData.user.id })
        .select("id, code, created_at, revoked, uses")
        .single();
      if (error) throw error;
      setInviteLinks((current) => [data as InfoInviteLink, ...current]);
      toast.success("Invite link created");
      void logChannelAction(channel.id, userData.user.id, "settings_changed", { meta: { invite_link: "created" } });
    } catch (error: any) {
      toast.error(error?.message || "Could not create invite link");
    } finally {
      setInviteCreating(false);
    }
  };

  const copyInviteLink = async (code: string) => {
    const url = getInviteUrl(code);
    try {
      await copyText(url);
      toast.success("Invite link copied");
    } catch {
      showManualCopyInvite(url);
    }
  };

  const revokeInviteLink = async (id: string) => {
    if (inviteBusyId) return;
    setInviteBusyId(id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("channel_invite_links")
        .update({ revoked: true })
        .eq("id", id)
        .eq("channel_id", channel.id);
      if (error) throw error;
      setInviteLinks((current) => current.filter((link) => link.id !== id));
      toast.success("Invite link revoked");
      void logChannelAction(channel.id, userData.user?.id, "settings_changed", { meta: { invite_link: "revoked" } });
    } catch (error: any) {
      toast.error(error?.message || "Could not revoke invite link");
    } finally {
      setInviteBusyId(null);
    }
  };

  const loadPermissionExceptions = useCallback(async () => {
    if (!canManage || !channel.id) return;
    setExceptionsLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("channel_permission_exceptions")
        .select("user_id")
        .eq("channel_id", channel.id)
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set(((data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id).filter(Boolean)));
      const { data: profiles } = ids.length
        ? await (supabase as any)
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", ids)
        : { data: [] };
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>(
        (profiles ?? []).map((profile: any) => [profile.user_id, profile]),
      );
      setPermissionExceptions(ids.map((id) => ({
        user_id: id,
        role: "exception",
        display_name: profileMap.get(id)?.full_name ?? null,
        avatar_url: profileMap.get(id)?.avatar_url ?? null,
      })));
    } catch {
      setPermissionExceptions([]);
    } finally {
      setExceptionsLoading(false);
    }
  }, [canManage, channel.id]);

  useEffect(() => {
    if (!open || !canManage || view !== "permissions") return;
    void loadPermissionExceptions();
  }, [canManage, loadPermissionExceptions, open, view]);

  useEffect(() => {
    if (!open || !canManage || view !== "actions" || !channel.id) return;
    let cancelled = false;
    setActionsLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("channel_admin_log")
        .select("id, actor_id, action, target_user_id, meta, created_at")
        .eq("channel_id", channel.id)
        .order("created_at", { ascending: false })
        .limit(120);
      if (cancelled) return;
      const rows = (data ?? []) as InfoActionRow[];
      setActionRows(rows);
      const ids = Array.from(new Set(rows.flatMap((row) => [row.actor_id, row.target_user_id]).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        if (cancelled) return;
        setActionProfiles(new Map((profiles ?? []).map((profile: any) => [
          profile.user_id,
          { name: profile.full_name, avatar: profile.avatar_url },
        ])));
      } else {
        setActionProfiles(new Map());
      }
      setActionsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage, channel.id, open, view]);

  const openMemberPicker = (mode: MemberPickerMode) => {
    setMemberPickerMode(mode);
    setMemberQuery("");
    setMemberResults([]);
  };

  const searchAddableMembers = async (query: string) => {
    setMemberQuery(query);
    const normalized = query.trim();
    if (normalized.length < 2) {
      setMemberResults([]);
      return;
    }
    setMemberSearching(true);
    try {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .ilike("full_name", `%${normalized}%`)
        .limit(20);
      const existingMembers = new Set(members.map((member) => member.user_id));
      const existingExceptions = new Set(permissionExceptions.map((member) => member.user_id));
      setMemberResults(
        ((data ?? []) as Array<{ user_id: string; full_name: string | null; avatar_url: string | null }>)
          .filter((profile) => profile.user_id !== channel.owner_id)
          .filter((profile) => memberPickerMode === "members" ? !existingMembers.has(profile.user_id) : !existingExceptions.has(profile.user_id))
          .map((profile) => ({
            user_id: profile.user_id,
            role: existingMembers.has(profile.user_id) ? "sub" : "candidate",
            display_name: profile.full_name,
            avatar_url: profile.avatar_url,
          })),
      );
    } catch (error: any) {
      toast.error(error?.message || "Could not search members");
    } finally {
      setMemberSearching(false);
    }
  };

  const addPickedMember = async (member: InfoMember) => {
    if (!memberPickerMode || memberAddingId) return;
    setMemberAddingId(member.user_id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sign in required");
      const alreadyMember = members.some((row) => row.user_id === member.user_id);
      if (!alreadyMember) {
        const { error: addError } = await (supabase as any).rpc("channel_add_member", {
          p_channel_id: channel.id,
          p_user_id: member.user_id,
        });
        if (addError) throw addError;
        if (memberPickerMode !== "exceptions") {
          void logChannelAction(channel.id, userData.user.id, "member_added", { targetUserId: member.user_id });
        }
      }
      if (memberPickerMode === "exceptions") {
        const { error: exceptionError } = await (supabase as any).rpc("channel_set_permission_exception", {
          p_channel_id: channel.id,
          p_user_id: member.user_id,
          p_enabled: true,
        });
        if (exceptionError) throw exceptionError;
        setPermissionExceptions((current) => [member, ...current.filter((row) => row.user_id !== member.user_id)]);
        toast.success("Permission exception added");
      } else {
        toast.success("Member added");
      }
      setMemberResults((current) => current.filter((row) => row.user_id !== member.user_id));
      reloadMembers();
      await onRefresh?.();
      if (memberPickerMode === "exceptions") void loadPermissionExceptions();
    } catch (error: any) {
      toast.error(error?.message || "Could not add member");
    } finally {
      setMemberAddingId(null);
    }
  };

  const removePermissionException = async (member: InfoMember) => {
    if (memberBusyId) return;
    setMemberBusyId(member.user_id);
    try {
      const { error } = await (supabase as any).rpc("channel_set_permission_exception", {
        p_channel_id: channel.id,
        p_user_id: member.user_id,
        p_enabled: false,
      });
      if (error) throw error;
      setPermissionExceptions((current) => current.filter((row) => row.user_id !== member.user_id));
      toast.success("Exception removed");
    } catch (error: any) {
      toast.error(error?.message || "Could not remove exception");
    } finally {
      setMemberBusyId(null);
    }
  };

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
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>(
        (profiles ?? []).map((profile: any) => [profile.user_id, profile]),
      );
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
      const { error } = await (supabase as any).rpc("channel_set_member_role", {
        p_channel_id: channel.id,
        p_user_id: member.user_id,
        p_role: role,
      });
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
      const { error } = await (supabase as any).rpc("channel_remove_member", {
        p_channel_id: channel.id,
        p_user_id: member.user_id,
      });
      if (error) throw error;
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
    <>
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
          {view !== "info" && (
            <TelegramSubview
              view={view}
              channel={channel}
              canManage={canManage}
              members={members}
              membersLoading={membersLoading}
              memberBusyId={memberBusyId}
              adminMembers={adminMembers}
              removedUsers={removedUsers}
              removedLoading={removedLoading}
              removedBusyId={removedBusyId}
              actionRows={actionRows}
              actionProfiles={actionProfiles}
              actionsLoading={actionsLoading}
              posts={posts}
              onPromote={(member) => void updateMemberRole(member, "admin")}
              onDemote={(member) => void updateMemberRole(member, "sub")}
              onRemove={(member) => void removeMember(member)}
              onOpenMemberPicker={openMemberPicker}
              onAllowRejoin={async (user) => {
                if (removedBusyId) return;
                setRemovedBusyId(user.user_id);
                try {
                  const { error } = await (supabase as any).rpc("channel_allow_rejoin", {
                    p_channel_id: channel.id,
                    p_user_id: user.user_id,
                  });
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
              onBack={() => setView(view === "edit" ? "info" : "edit")}
              onClose={() => onOpenChange(false)}
              onView={setView}
              subscriberPermissions={subscriberPermissions}
              setSubscriberPermissions={setSubscriberPermissions}
              permissionExceptions={permissionExceptions}
              exceptionsLoading={exceptionsLoading}
              onRemovePermissionException={(member) => void removePermissionException(member)}
              onOpenInviteLinks={openInviteLinks}
            />
          )}
          {view === "info" && (
            <>
          <ScrollArea className="min-h-0 flex-1 bg-[#f4f4f4]">
            <div className="pb-5">
          <div className="sticky top-0 z-30 bg-[#cfe4fb]/95 px-4 pb-3 pt-[calc(var(--zivo-safe-top,0px)+0.75rem)] shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <SheetClose
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 outline-none transition hover:bg-white/45 hover:text-slate-800 active:scale-95 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                style={{ outline: "none", boxShadow: "none" }}
              >
                <X className="h-7 w-7" />
                <span className="sr-only">Close</span>
              </SheetClose>
              <p className="min-w-0 flex-1 truncate px-3 text-center text-[22px] font-bold leading-tight text-slate-950">Channel Info</p>
              <button
                type="button"
                onClick={() => (canManage ? setView("edit") : onExternalShare())}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/45 hover:text-slate-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={canManage ? "Edit channel info" : "Share channel"}
              >
                <Pencil className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="bg-[#cfe4fb] px-4 pb-7 pt-4">
            <Avatar className="mx-auto mt-5 h-32 w-32 border-0 shadow-none">
              <AvatarImage src={channel.avatar_url || undefined} alt={channel.name} />
              <AvatarFallback className="bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-400 text-[5rem] font-black text-white">
                {channel.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="mx-auto mt-5 max-w-[21rem] truncate text-center text-[27px] font-bold leading-tight text-slate-950">{channel.name}</h2>
            <p className="mt-1 truncate text-center text-[17px] leading-tight text-slate-500">
              {channel.subscriber_count.toLocaleString()} subscriber{channel.subscriber_count === 1 ? "" : "s"}
            </p>
          </div>

            <div className="space-y-6 px-4 py-5">
              <div className="-mx-4 -mt-5 space-y-3 bg-[#f4f4f4] px-4 pb-4 pt-5">
              <InfoSection className="rounded-[1.7rem] bg-white shadow-sm ring-1 ring-black/5">
                <div
                  className="flex w-full items-center gap-4 border-b border-slate-100 px-5 py-4 text-left transition-colors hover:bg-slate-50/70 active:bg-sky-50/70"
                >
                  <button
                    type="button"
                    onClick={() => void onCopyLink()}
                    className="flex min-w-0 flex-1 items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                    aria-label="Copy channel invite link"
                  >
                    <LinkIcon className="h-7 w-7 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[18px] font-medium leading-tight text-slate-950">{channelShareUrl.replace(/^https?:\/\//, "")}</span>
                      <span className="mt-1 block text-[15px] leading-tight text-slate-500">Tap to copy invite link</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQrOpen(true);
                    }}
                    className="grid h-10 w-10 shrink-0 grid-cols-2 gap-1 rounded-full p-1.5 text-slate-500 transition hover:bg-sky-50 hover:text-sky-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label="Open channel QR code"
                  >
                    <span className="rounded-[3px] border-2 border-current" />
                    <span className="rounded-[3px] border-2 border-current" />
                    <span className="rounded-[3px] border-2 border-current" />
                    <span className="rounded-[3px] border-2 border-current" />
                  </button>
                </div>
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
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/70 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                >
                  {notificationsOn ? <Bell className="h-7 w-7 shrink-0 text-slate-500" /> : <BellOff className="h-7 w-7 shrink-0 text-slate-500" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[18px] font-medium leading-tight text-slate-950">
                      {joinPending ? "Request pending" : !isSubscribed && !canManage ? "Join for notifications" : "Notifications"}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative h-8 w-14 rounded-full transition-colors",
                      notificationsOn && (isSubscribed || canManage) ? "bg-sky-500" : "bg-slate-200",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
                        notificationsOn && (isSubscribed || canManage) ? "translate-x-7" : "translate-x-1",
                      )}
                    />
                  </span>
                </button>
              </InfoSection>

              <div className="overflow-hidden rounded-[1.7rem] bg-white p-1 shadow-sm ring-1 ring-black/5">
                <div className="grid grid-cols-4 gap-1">
                  {PROFILE_INFO_TABS.map((tab) => {
                    const active = profileTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setProfileTab(tab.id)}
                        className={cn(
                          "flex h-12 min-w-0 items-center justify-center rounded-[1.35rem] px-1.5 text-[15px] font-semibold transition min-[380px]:text-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
                          active ? "bg-sky-50 text-sky-500" : "text-slate-500 hover:bg-slate-50",
                        )}
                      >
                        <span className="min-w-0 whitespace-nowrap">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              </div>

              {profileTab === "members" ? (
                <>
                  {channel.description && <p className="px-2 text-sm leading-5 text-slate-600">{channel.description}</p>}

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <QuickAction icon={Video} label="video chat" onClick={startVideoChat} />
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
                    <QuickAction icon={Search} label="search" onClick={() => setView("search")} />
                    <QuickAction icon={MoreHorizontal} label="more" onClick={canManage ? () => setView("edit") : () => void onExternalShare()} />
                  </div>

                  <InfoSection>
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Members</span>
                      <span className="text-sm font-semibold text-slate-400">{channel.subscriber_count.toLocaleString()}</span>
                    </div>
                    {canManage && (
                      <SettingsRow icon={UserPlus} label="Add Members" onClick={() => openMemberPicker("members")} />
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
                    {(members.length > 8 || canManage) && (
                      <button
                        type="button"
                        onClick={() => setView("members")}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                      >
                        Manage members
                      </button>
                    )}
                  </InfoSection>
                </>
              ) : (
                <InfoSection>
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-500">{TAB_META[profileTab].label}</span>
                    <span className="text-sm font-semibold text-slate-400">{profileMediaItems.length.toLocaleString()}</span>
                  </div>
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
            </div>
          </ScrollArea>
            </>
          )}
        </div>
        {qrOpen && (
          <ChannelQrPreview
            channel={channel}
            shareUrl={channelShareUrl}
            onClose={() => setQrOpen(false)}
            onCopy={() => void copyQrInvite()}
          />
        )}
      </SheetContent>
    </Sheet>
    {memberPickerMode && (
      <MemberPickerSheet
        mode={memberPickerMode}
        query={memberQuery}
        results={memberResults}
        searching={memberSearching}
        addingId={memberAddingId}
        onQueryChange={(query) => void searchAddableMembers(query)}
        onPick={(member) => void addPickedMember(member)}
        onClose={() => setMemberPickerMode(null)}
      />
    )}
    {inviteLinksOpen && (
      <InviteLinksSheet
        channel={channel}
        links={inviteLinks}
        loading={inviteLinksLoading}
        creating={inviteCreating}
        busyId={inviteBusyId}
        getInviteUrl={getInviteUrl}
        onCreate={() => void createInviteLink()}
        onCopy={(code) => void copyInviteLink(code)}
        onRevoke={(id) => void revokeInviteLink(id)}
        onClose={() => setInviteLinksOpen(false)}
      />
    )}
    {channelCallOpen && (
      <GroupCallLauncher
        roomName={`channel-${channel.id}`}
        callType="video"
        meetingLabel={channel.name}
        onEnded={() => setChannelCallOpen(false)}
      />
    )}
    </>
  );
}

function ChannelQrPreview({
  channel,
  shareUrl,
  onClose,
  onCopy,
}: {
  channel: Channel;
  shareUrl: string;
  onClose: () => void;
  onCopy: () => void;
}) {
  const themeStorageKey = `zivo.channelQrTheme.${channel.id}`;
  const [activeThemeLabel, setActiveThemeLabel] = useState<(typeof QR_THEME_CARDS)[number]["label"]>(() => {
    if (typeof window === "undefined") return "Duck";
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return QR_THEME_CARDS.some((theme) => theme.label === storedTheme) ? (storedTheme as (typeof QR_THEME_CARDS)[number]["label"]) : "Duck";
  });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragEnabledRef = useRef(false);
  const suppressClickRef = useRef(false);
  const qrCardRef = useRef<HTMLButtonElement | null>(null);
  const activeTheme = QR_THEME_CARDS.find((theme) => theme.label === activeThemeLabel) ?? QR_THEME_CARDS[1];
  const cycleTheme = () => {
    const currentIndex = QR_THEME_CARDS.findIndex((theme) => theme.label === activeThemeLabel);
    const nextTheme = QR_THEME_CARDS[(currentIndex + 1) % QR_THEME_CARDS.length];
    setActiveThemeLabel(nextTheme.label);
  };
  useEffect(() => {
    window.localStorage.setItem(themeStorageKey, activeThemeLabel);
  }, [activeThemeLabel, themeStorageKey]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  const runTapAction = (action: () => void) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    action();
  };
  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: channel.name, text: `Join ${channel.name} on ZIVO`, url: shareUrl });
        return;
      } catch (error: any) {
        if (error?.name === "AbortError") return;
      }
    }
    onCopy();
  };
  const saveQrSvg = () => {
    const svg = qrCardRef.current?.querySelector("svg");
    if (!svg) {
      onCopy();
      return;
    }
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${channel.handle || "channel"}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    toast.success("QR code saved");
  };
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    const isControl = Boolean(target?.closest("button, a, input, textarea, select"));
    dragEnabledRef.current = !isControl;
    if (isControl) return;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
    setDragOffset({ x: 0, y: 0 });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragEnabledRef.current || !dragStartRef.current) return;
    const next = {
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    };
    if (Math.abs(next.x) > 7 || Math.abs(next.y) > 7) suppressClickRef.current = true;
    setDragOffset(next);
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = dragOffset;
    dragStartRef.current = null;
    setDragging(false);
    dragEnabledRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const shouldClose = Math.abs(current.x) > 95 || Math.abs(current.y) > 105;
    if (shouldClose) {
      onClose();
      return;
    }
    setDragOffset({ x: 0, y: 0 });
  };
  const cancelDrag = () => {
    dragStartRef.current = null;
    setDragging(false);
    dragEnabledRef.current = false;
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[2000] flex items-end justify-center bg-black/45 px-4 pb-4 pt-[calc(var(--zivo-safe-top,0px)+4.5rem)] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="QR Code"
      onClick={onClose}
    >
      <div
        className="pointer-events-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[21rem] touch-none overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl shadow-slate-950/30 ring-1 ring-black/10 scrollbar-hide"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x / 42}deg)`,
          transition: dragging ? "none" : "transform 180ms ease",
        }}
      >
        <div
          className="relative px-4 pb-5 pt-5"
          style={{
            backgroundColor: activeTheme.panel,
            backgroundImage: [
              "radial-gradient(circle at 22px 22px, rgba(255,255,255,.22) 0 2px, transparent 2.5px)",
              "radial-gradient(circle at 46px 48px, rgba(67,112,86,.16) 0 3px, transparent 3.5px)",
              "linear-gradient(135deg, rgba(255,244,134,.28) 0%, rgba(164,225,129,.35) 44%, rgba(112,206,184,.38) 100%)",
            ].join(", "),
            backgroundSize: "72px 72px, 72px 72px, 34px 34px",
          }}
        >
          <div className="relative mx-auto mt-6 rounded-[1.65rem] bg-white px-4 pb-4 pt-9 shadow-xl shadow-teal-900/10">
            <Avatar className="absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 -translate-y-1/2 border-[3px] border-white bg-white shadow-lg">
              <AvatarImage src={channel.avatar_url || undefined} alt={channel.name} />
              <AvatarFallback className="bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-400 text-3xl font-black text-white">
                {channel.name.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              ref={qrCardRef}
              type="button"
              onClick={() => runTapAction(onCopy)}
              className="pointer-events-auto relative mx-auto flex aspect-square w-full max-w-[11.5rem] items-center justify-center rounded-[1.35rem] bg-white transition active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
              aria-label="Copy invite link from QR code"
            >
              <QRCodeSVG
                value={shareUrl}
                size={208}
                level="H"
                includeMargin={false}
                fgColor={activeTheme.qr}
                bgColor="#ffffff"
                className="h-full w-full"
              />
              <span
                className="absolute left-1/2 top-1/2 inline-flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-md"
                style={{ backgroundColor: activeTheme.qr }}
              >
                <span className="-ml-0.5 mt-0.5 block h-0 w-0 border-y-[7px] border-l-[13px] border-y-transparent border-l-white" />
              </span>
            </button>
            <p className="mt-2 truncate text-center text-[18px] font-bold leading-none" style={{ color: activeTheme.qr }}>
              @{channel.handle.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="-mt-1 border-t border-sky-200 bg-gradient-to-b from-[#dceeff] to-[#f5fbff] px-4 pb-3 pt-2.5">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300/80" aria-hidden />
          <div className="mb-3 grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2">
            <button
              type="button"
              onClick={() => runTapAction(onClose)}
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/55 hover:text-slate-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Close QR code"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="min-w-0 text-center">
              <h2 className="text-[19px] font-bold leading-none text-slate-950">QR Code</h2>
              <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">Swipe to dismiss</p>
            </div>
            <button
              type="button"
              onClick={() => runTapAction(cycleTheme)}
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/55 hover:text-slate-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Change QR theme"
            >
              <MoonStar className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => runTapAction(onCopy)}
              aria-label="Copy invite link"
              className="pointer-events-auto flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] bg-white/85 px-2 py-2 text-sky-700 shadow-sm ring-1 ring-sky-100 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Copy className="h-4 w-4" />
              <span className="max-w-full truncate text-[11px] font-bold">Copy</span>
            </button>
            <button
              type="button"
              onClick={() => runTapAction(shareInvite)}
              aria-label="Share invite link"
              className="pointer-events-auto flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] bg-white/85 px-2 py-2 text-sky-700 shadow-sm ring-1 ring-sky-100 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="max-w-full truncate text-[11px] font-bold">Share</span>
            </button>
            <button
              type="button"
              onClick={() => runTapAction(saveQrSvg)}
              aria-label="Save QR code"
              className="pointer-events-auto flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] bg-white/85 px-2 py-2 text-sky-700 shadow-sm ring-1 ring-sky-100 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Download className="h-4 w-4" />
              <span className="max-w-full truncate text-[11px] font-bold">Save</span>
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Theme</span>
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-sky-100">{activeTheme.label}</span>
          </div>
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1.5 scrollbar-hide">
            {QR_THEME_CARDS.map((theme) => (
              <button
                key={theme.label}
                type="button"
                onClick={() => runTapAction(() => setActiveThemeLabel(theme.label))}
                className={cn(
                  "pointer-events-auto relative h-[4.35rem] w-[4.35rem] shrink-0 snap-start overflow-hidden rounded-[1.05rem] bg-gradient-to-br p-2 text-left shadow-sm ring-1 ring-white/80 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  theme.bg,
                  activeThemeLabel === theme.label && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#edf7ff]",
                )}
                aria-label={`${theme.label} QR theme`}
                aria-pressed={activeThemeLabel === theme.label}
              >
                {activeThemeLabel === theme.label && (
                  <span className="absolute right-1.5 top-1.5 flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <span className="block h-3.5 w-8 rounded-full bg-white/55" />
                <span className="mt-2 block h-3.5 w-10 rounded-full bg-white/70" />
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-lg">{theme.emoji}</span>
                <span className="absolute inset-x-1.5 bottom-1.5 truncate text-center text-[10px] font-bold text-slate-700">{theme.label}</span>
              </button>
            ))}
          </div>

        </div>

        <div className="bg-white px-4 pb-3 pt-2.5">
          <button
            type="button"
            onClick={() => runTapAction(onCopy)}
            aria-label="Copy channel invite link"
            className="pointer-events-auto flex h-11 w-full min-w-0 items-center gap-3 rounded-2xl bg-slate-50 px-3 text-left text-slate-700 ring-1 ring-slate-200 transition hover:bg-sky-50 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Copy className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Invite link</span>
              <span className="block truncate text-sm font-bold text-slate-800">{shareUrl.replace(/^https?:\/\//, "")}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
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

function MemberPickerSheet({
  mode,
  query,
  results,
  searching,
  addingId,
  onQueryChange,
  onPick,
  onClose,
}: {
  mode: MemberPickerMode;
  query: string;
  results: InfoMember[];
  searching: boolean;
  addingId: string | null;
  onQueryChange: (query: string) => void;
  onPick: (member: InfoMember) => void;
  onClose: () => void;
}) {
  const title = mode === "exceptions" ? "Add Exception" : "Add Members";
  return (
    <div
      className="fixed inset-0 z-[1800] flex items-end justify-center bg-black/35 px-2 pb-2"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="max-h-[78dvh] w-full max-w-md overflow-hidden rounded-[2rem] bg-[#f1f1f6] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            Cancel
          </button>
          <h3 className="text-base font-bold text-slate-950">{title}</h3>
          <span className="w-[76px]" />
        </div>
        <div className="px-5 pb-3">
          <label className="flex h-10 items-center gap-2 rounded-full bg-white px-3 text-slate-400">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              autoFocus
              placeholder="Search people"
              className="min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </label>
        </div>
        <ScrollArea className="max-h-[calc(78dvh-7.5rem)]">
          <div className="pb-5">
            <SectionLabel>{mode === "exceptions" ? "Choose User" : "People"}</SectionLabel>
            <InfoSection className="mx-5">
              {query.trim().length < 2 ? (
                <div className="px-4 py-6 text-sm leading-5 text-slate-500">
                  Type at least 2 letters to search profiles.
                </div>
              ) : searching ? (
                <div className="px-4 py-6 text-sm text-slate-500">Searching...</div>
              ) : results.length > 0 ? (
                results.map((member) => (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => onPick(member)}
                    disabled={addingId === member.user_id}
                    className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={member.avatar_url || undefined} alt={member.display_name || "Profile"} />
                      <AvatarFallback className="bg-sky-100 font-bold text-sky-700">{(member.display_name || "P").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-slate-950">{member.display_name || "ZIVO user"}</span>
                      <span className="block truncate text-sm text-slate-500">
                        {addingId === member.user_id ? "Adding..." : mode === "exceptions" ? "Add permission exception" : "Add to channel"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">No matching profiles found.</div>
              )}
            </InfoSection>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function InviteLinksSheet({
  channel,
  links,
  loading,
  creating,
  busyId,
  getInviteUrl,
  onCreate,
  onCopy,
  onRevoke,
  onClose,
}: {
  channel: Channel;
  links: InfoInviteLink[];
  loading: boolean;
  creating: boolean;
  busyId: string | null;
  getInviteUrl: (code: string) => string;
  onCreate: () => void;
  onCopy: (code: string) => void;
  onRevoke: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1800] flex items-end justify-center bg-black/35 px-2 pb-2"
      role="dialog"
      aria-modal="true"
      aria-label="Invite links"
      onClick={onClose}
    >
      <div
        className="max-h-[82dvh] w-full max-w-md overflow-hidden rounded-[2rem] bg-[#f1f1f6] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            Done
          </button>
          <h3 className="text-base font-bold text-slate-950">Invite Links</h3>
          <span className="w-[66px]" />
        </div>
        <div className="px-5 pb-3">
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 text-sm font-bold text-white shadow-lg shadow-sky-500/20 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <LinkIcon className="h-5 w-5" />
            {creating ? "Creating..." : "Create Invite Link"}
          </button>
        </div>
        <ScrollArea className="max-h-[calc(82dvh-8rem)]">
          <div className="pb-5">
            <SectionLabel>Active Links</SectionLabel>
            <InfoSection className="mx-5">
              {loading ? (
                <div className="px-4 py-6 text-sm text-slate-500">Loading invite links...</div>
              ) : links.length > 0 ? (
                links.map((link) => {
                  const url = getInviteUrl(link.code);
                  return (
                    <div key={link.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                      <button type="button" onClick={() => onCopy(link.code)} className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset">
                        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                          <LinkIcon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-sky-600">{url.replace(/^https?:\/\//, "")}</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {link.uses.toLocaleString()} use{link.uses === 1 ? "" : "s"} · Created {formatInfoDate(link.created_at)}
                          </span>
                        </span>
                        <Copy className="mt-2 h-4 w-4 shrink-0 text-slate-300" />
                      </button>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onRevoke(link.id)}
                          disabled={busyId === link.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-rose-50 px-3 text-xs font-bold text-rose-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
                        >
                          <Trash2 className="h-4 w-4" />
                          {busyId === link.id ? "Revoking..." : "Revoke"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-7 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                    <LinkIcon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-950">No active invite links</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Create one for {channel.name}, then copy or revoke it here.</p>
                </div>
              )}
            </InfoSection>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function TelegramSubview({
  view,
  channel,
  canManage,
  members,
  membersLoading,
  memberBusyId,
  adminMembers,
  removedUsers,
  removedLoading,
  removedBusyId,
  actionRows,
  actionProfiles,
  actionsLoading,
  posts,
  onPromote,
  onDemote,
  onRemove,
  onOpenMemberPicker,
  onAllowRejoin,
  onRefresh,
  onBack,
  onClose,
  onView,
  subscriberPermissions,
  setSubscriberPermissions,
  permissionExceptions,
  exceptionsLoading,
  onRemovePermissionException,
  onOpenInviteLinks,
}: {
  view: Exclude<InfoView, "info">;
  channel: Channel;
  canManage: boolean;
  members: InfoMember[];
  membersLoading: boolean;
  memberBusyId: string | null;
  adminMembers: InfoMember[];
  removedUsers: InfoRemovedUser[];
  removedLoading: boolean;
  removedBusyId: string | null;
  actionRows: InfoActionRow[];
  actionProfiles: Map<string, InfoActorProfile>;
  actionsLoading: boolean;
  posts: ChannelPost[];
  onPromote: (member: InfoMember) => void;
  onDemote: (member: InfoMember) => void;
  onRemove: (member: InfoMember) => void;
  onOpenMemberPicker: (mode: MemberPickerMode) => void;
  onAllowRejoin: (user: InfoRemovedUser) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  onBack: () => void;
  onClose: () => void;
  onView: (view: InfoView) => void;
  subscriberPermissions: ChannelSubscriberPermissions;
  setSubscriberPermissions: (permissions: ChannelSubscriberPermissions) => void;
  permissionExceptions: InfoMember[];
  exceptionsLoading: boolean;
  onRemovePermissionException: (member: InfoMember) => void;
  onOpenInviteLinks: () => void;
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
    search: "Search",
  };

  useEffect(() => {
    if (view !== "members") setMembersEditing(false);
  }, [view]);

  return (
    <div className="flex h-full flex-col bg-[#f1f1f6]">
      <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-[calc(var(--zivo-safe-top,0px)+0.75rem)]">
        <button type="button" onClick={onBack} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-center text-base font-bold text-slate-950">{titleMap[view]}</h2>
        {view === "edit" || view === "groupType" || view === "members" ? (
          <button
            type="button"
            onClick={view === "members" ? () => setMembersEditing((value) => !value) : view === "edit" ? onClose : onBack}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {view === "members" ? membersEditing ? "Done" : "Edit" : "Done"}
          </button>
        ) : (
          <span className="h-11 w-11" />
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-4 pb-8">
          {view === "edit" && (
            <EditSettingsView
              channel={channel}
              removedCount={removedUsers.length}
              adminCount={adminMembers.length || 1}
              subscriberPermissions={subscriberPermissions}
              onRefresh={onRefresh}
              onView={onView}
            />
          )}
          {view === "groupType" && <GroupTypeView channel={channel} onRefresh={onRefresh} onOpenInviteLinks={onOpenInviteLinks} />}
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
              onAddMembers={() => onOpenMemberPicker("members")}
            />
          )}
          {view === "permissions" && (
            <PermissionsView
              channel={channel}
              removedCount={removedUsers.length}
              permissions={subscriberPermissions}
              onPermissionsChange={setSubscriberPermissions}
              onView={onView}
              exceptions={permissionExceptions}
              exceptionsLoading={exceptionsLoading}
              onAddException={() => onOpenMemberPicker("exceptions")}
              onRemoveException={onRemovePermissionException}
            />
          )}
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
          {view === "actions" && (
            <RecentActionsView
              channel={channel}
              posts={posts}
              rows={actionRows}
              profiles={actionProfiles}
              loading={actionsLoading}
            />
          )}
          {view === "search" && <ChannelSearchView posts={posts} />}
        </div>
      </ScrollArea>
    </div>
  );
}

function EditSettingsView({
  channel,
  removedCount,
  adminCount,
  subscriberPermissions,
  onRefresh,
  onView,
}: {
  channel: Channel;
  removedCount: number;
  adminCount: number;
  subscriberPermissions: ChannelSubscriberPermissions;
  onRefresh?: () => void | Promise<void>;
  onView: (view: InfoView) => void;
}) {
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const channelShareUrl = getChannelShareUrl(channel.handle);
  const hasProfileChanges = name.trim() !== channel.name || description.trim() !== (channel.description ?? "");

  useEffect(() => {
    setName(channel.name);
    setDescription(channel.description ?? "");
  }, [channel.description, channel.name]);

  const copyChannelLink = async () => {
    try {
      await copyText(channelShareUrl);
      toast.success("Channel link copied");
    } catch {
      showManualCopyInvite(channelShareUrl);
    }
  };

  const save = async () => {
    const nextName = name.trim();
    if (!nextName) {
      toast.error("Channel name is required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_name: nextName,
        p_description: description.trim(),
      }));
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
      const { error: updateError } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_avatar_url: publicUrl.publicUrl,
      }));
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

  const deleteChannel = async () => {
    if (deleteConfirm.trim() !== channel.name) {
      toast.error(`Type "${channel.name}" to delete this channel`);
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.from("channels").delete().eq("id", channel.id);
      if (error) throw error;
      toast.success("Channel deleted");
      window.location.assign("/channels");
    } catch (error: any) {
      toast.error(error?.message || "Could not delete channel");
    } finally {
      setDeleting(false);
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
          className="mt-3 text-sm font-semibold text-sky-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
            className="w-full bg-transparent text-base text-slate-950 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Channel name"
          />
          <div className="my-3 h-px bg-slate-100" />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={240}
            rows={2}
            placeholder="Description"
            className="w-full resize-none bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Channel description"
          />
        </div>
      </InfoSection>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !hasProfileChanges}
        className="w-full rounded-full bg-sky-500 px-4 py-3 text-base font-bold text-white shadow-xl transition active:scale-[0.98] disabled:bg-sky-300 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {saving ? "Saving..." : hasProfileChanges ? "Save Changes" : "Saved"}
      </button>

      <InfoSection>
        <button type="button" onClick={() => void copyChannelLink()} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset">
          <span className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              <LinkIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-medium text-slate-950">Channel Link</span>
              <span className="block truncate text-sm text-sky-500">@{channel.handle}</span>
            </span>
          </span>
          <Copy className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <SettingsRow icon={Users} label="Channel Type" value={channel.is_public ? "Public" : "Private"} onClick={() => onView("groupType")} />
      </InfoSection>

      <InfoSection>
        <SettingsRow icon={Heart} label="Reactions" value={getReactionPolicyLabel(channel.reaction_policy)} onClick={() => onView("reactions")} />
        <SettingsRow icon={Brush} label="Appearance" onClick={() => onView("appearance")} />
        <SettingsRow icon={MessageSquare} label="Topics" value={channel.topics_enabled ? "Enabled" : "Disabled"} onClick={() => onView("topics")} />
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">The channel chat can be divided into topics created by admins or subscribers.</p>

      <InfoSection>
        <SettingsRow icon={Users} label="Members" value={channel.subscriber_count.toLocaleString()} onClick={() => onView("members")} />
        <SettingsRow icon={Shield} label="Permissions" value={getSubscriberPermissionsCount(subscriberPermissions)} onClick={() => onView("permissions")} />
        <SettingsRow icon={Shield} label="Administrators" value={adminCount.toLocaleString()} onClick={() => onView("admins")} />
        <SettingsRow icon={UserMinus} label="Removed Users" value={removedCount.toLocaleString()} onClick={() => onView("removed")} />
        <SettingsRow icon={Eye} label="Recent Actions" onClick={() => onView("actions")} />
      </InfoSection>

      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className="w-full rounded-2xl bg-white px-4 py-4 text-left text-base text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-inset"
      >
        Delete Channel
      </button>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[1700] flex items-end justify-center bg-black/35 px-3 pb-3"
          role="dialog"
          aria-modal="true"
          aria-label="Delete channel confirmation"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 pb-5 pt-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-center text-lg font-bold text-slate-950">Delete {channel.name}?</h3>
              <p className="mt-2 text-center text-sm leading-5 text-slate-500">
                This removes the channel, posts, members, invite links, and settings. Type the channel name to confirm.
              </p>
              <input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder={channel.name}
                className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-base font-semibold text-slate-950 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                aria-label="Type channel name to confirm delete"
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  className="h-12 rounded-full bg-slate-100 text-sm font-bold text-slate-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void deleteChannel()}
                  disabled={deleting || deleteConfirm.trim() !== channel.name}
                  className="h-12 rounded-full bg-rose-500 text-sm font-bold text-white shadow-lg shadow-rose-500/20 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GroupTypeView({
  channel,
  onRefresh,
  onOpenInviteLinks,
}: {
  channel: Channel;
  onRefresh?: () => void | Promise<void>;
  onOpenInviteLinks: () => void;
}) {
  const [saving, setSaving] = useState<"public" | "private" | null>(null);
  const [savingRestrict, setSavingRestrict] = useState(false);
  const [savingApproval, setSavingApproval] = useState(false);
  const shareUrl = getChannelShareUrl(channel.handle);
  const copyShareUrl = async () => {
    try {
      await copyText(shareUrl);
      toast.success("Invite link copied");
    } catch {
      showManualCopyInvite(shareUrl);
    }
  };

  const setPublic = async (next: boolean) => {
    if (next === channel.is_public || saving) return;
    setSaving(next ? "public" : "private");
    try {
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_is_public: next,
      }));
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
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_restrict_saving_content: next,
      }));
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
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_channel_join_approval_required: next,
      }));
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
        <button type="button" onClick={() => void copyShareUrl()} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset">
          <span className="min-w-0 truncate text-base text-slate-950">{shareUrl.replace(/^https?:\/\//, "")}</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-sky-500">
            <Copy className="h-4 w-4" />
            Copy
          </span>
        </button>
      </InfoSection>
      <p className="-mt-3 px-4 text-xs leading-5 text-slate-500">People can share this link with others and find your channel.</p>
      <InfoSection>
        <SettingsRow icon={LinkIcon} label="Manage Invite Links" onClick={onOpenInviteLinks} />
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
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_reaction_policy: next,
      }));
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
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_wallpaper_style: next,
      }));
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
        <SettingsRow icon={ImageIcon} label="Channel Wallpaper" value={CHANNEL_WALLPAPERS[currentWallpaper].label} onClick={() => toast.message("Choose a wallpaper below")} />
        <div className="grid grid-cols-4 gap-2 p-3">
          {(Object.keys(CHANNEL_WALLPAPERS) as ChannelWallpaperStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => void setWallpaper(style)}
              disabled={!!savingWallpaper}
              className={cn(
                "relative aspect-[3/4] overflow-hidden rounded-xl border p-2 text-center text-[10px] font-semibold text-slate-600 transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
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
        <p className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500">Wallpaper changes save automatically when selected.</p>
      </InfoSection>
    </>
  );
}

function TopicsView({ channel, onRefresh }: { channel: Channel; onRefresh?: () => void | Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const setTopicsEnabled = async (next: boolean) => {
    if (next === !!channel.topics_enabled || saving) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_topics_enabled: next,
      }));
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
  onAddMembers,
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
  onAddMembers: () => void;
}) {
  const [savingHidden, setSavingHidden] = useState(false);
  const ownerLike = members.find((member) => member.role === "owner") ?? members[0];
  const rest = members.filter((member) => member.user_id !== ownerLike?.user_id);
  const canShowList = canManage || !channel.hide_members;
  const setHideMembers = async (next: boolean) => {
    if (next === !!channel.hide_members || savingHidden) return;
    setSavingHidden(true);
    try {
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_hide_members: next,
      }));
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
          <SettingsRow icon={UserPlus} label="Add Members" onClick={onAddMembers} />
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
                  className="mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-rose-500 transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
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
  permissions,
  onPermissionsChange,
  onView,
  exceptions,
  exceptionsLoading,
  onAddException,
  onRemoveException,
}: {
  channel: Channel;
  removedCount: number;
  permissions: ChannelSubscriberPermissions;
  onPermissionsChange: (permissions: ChannelSubscriberPermissions) => void;
  onView: (view: InfoView) => void;
  exceptions: InfoMember[];
  exceptionsLoading: boolean;
  onAddException: () => void;
  onRemoveException: (member: InfoMember) => void;
}) {
  const [savingSlowMode, setSavingSlowMode] = useState<number | null>(null);
  const [savingPermission, setSavingPermission] = useState<keyof ChannelSubscriberPermissions | null>(null);
  const [currentSlowMode, setCurrentSlowMode] = useState(() => (
    SLOW_MODE_OPTIONS.some((option) => option.seconds === channel.slow_mode_seconds)
      ? channel.slow_mode_seconds ?? 0
      : 0
  ));
  const selectedIndex = Math.max(0, SLOW_MODE_OPTIONS.findIndex((option) => option.seconds === currentSlowMode));
  useEffect(() => {
    setCurrentSlowMode(
      SLOW_MODE_OPTIONS.some((option) => option.seconds === channel.slow_mode_seconds)
        ? channel.slow_mode_seconds ?? 0
        : 0,
    );
  }, [channel.slow_mode_seconds]);
  const setSlowMode = async (seconds: number) => {
    if (seconds === currentSlowMode || savingSlowMode !== null) return;
    setSavingSlowMode(seconds);
    try {
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_slow_mode_seconds: seconds,
      }));
      if (error) throw error;
      const label = SLOW_MODE_OPTIONS.find((option) => option.seconds === seconds)?.label ?? "Off";
      setCurrentSlowMode(seconds);
      toast.success(seconds > 0 ? `Slow mode set to ${label}` : "Slow mode disabled");
    } catch (error: any) {
      toast.error(error?.message || "Could not update slow mode");
    } finally {
      setSavingSlowMode(null);
    }
  };
  const togglePermission = async (key: keyof ChannelSubscriberPermissions) => {
    if (savingPermission) return;
    const next = { ...permissions, [key]: !permissions[key] };
    onPermissionsChange(next);
    setSavingPermission(key);
    try {
      const { error } = await (supabase as any).rpc("channel_update_settings", channelSettingsArgs(channel.id, {
        p_subscriber_permissions: next,
      }));
      if (error) throw error;
      toast.success("Permission updated");
    } catch (error: any) {
      onPermissionsChange(permissions);
      toast.error(error?.message || "Could not update permission");
    } finally {
      setSavingPermission(null);
    }
  };

  return (
    <>
      <SectionLabel>What Can Subscribers Do?</SectionLabel>
      <InfoSection>
        <SwitchRow label={savingPermission === "sendMessages" ? "Saving Messages..." : "Send Messages"} checked={permissions.sendMessages} onClick={() => void togglePermission("sendMessages")} />
        <SwitchRow label={savingPermission === "sendMedia" ? "Saving Media..." : "Send Media 10/10"} checked={permissions.sendMedia} onClick={() => void togglePermission("sendMedia")} />
        <SwitchRow label={savingPermission === "addMembers" ? "Saving Members..." : "Add Members"} checked={permissions.addMembers} onClick={() => void togglePermission("addMembers")} />
        <SwitchRow label={savingPermission === "pinMessages" ? "Saving Pins..." : "Pin Messages"} checked={permissions.pinMessages} danger onClick={() => void togglePermission("pinMessages")} />
        <SwitchRow label={savingPermission === "editOwnTags" ? "Saving Tags..." : "Edit Own Tags"} checked={permissions.editOwnTags} danger onClick={() => void togglePermission("editOwnTags")} />
        <SwitchRow label={savingPermission === "changeInfo" ? "Saving Info..." : "Change Channel Info"} checked={permissions.changeInfo} danger onClick={() => void togglePermission("changeInfo")} />
      </InfoSection>
      <InfoSection>
        <SwitchRow label={savingPermission === "chargeStars" ? "Saving Stars..." : "Charge Stars for Messages"} checked={permissions.chargeStars} onClick={() => void togglePermission("chargeStars")} />
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
                className={cn("rounded-full py-1 font-semibold transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40", currentSlowMode === option.seconds && "bg-sky-50 text-sky-600")}
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
        <SettingsRow icon={UserPlus} label="Add Exception" onClick={onAddException} />
        {exceptionsLoading ? (
          <div className="px-4 py-4 text-sm text-slate-500">Loading exceptions...</div>
        ) : exceptions.length > 0 ? exceptions.map((member) => (
          <MemberLine
            key={member.user_id}
            member={member}
            fallbackName="Exception"
            badge="exception"
            actions={[
              { label: "Remove exception", destructive: true, onClick: () => onRemoveException(member) },
            ]}
          />
        )) : (
          <div className="px-4 py-4 text-sm text-slate-500">No permission exceptions yet.</div>
        )}
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
  const [query, setQuery] = useState("");
  const candidates = allMembers.filter((member) => member.role !== "owner" && member.role !== "admin" && member.role !== "pending");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCandidates = normalizedQuery
    ? candidates.filter((member) => (member.display_name || "Subscriber").toLowerCase().includes(normalizedQuery))
    : candidates;

  return (
    <>
      <SectionLabel>Channel Admins</SectionLabel>
      <InfoSection>
        <SettingsRow
          icon={UserPlus}
          label="Add Admin"
          onClick={() => {
            setQuery("");
            setPickerOpen(true);
          }}
        />
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
              <button type="button" onClick={() => setPickerOpen(false)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                Cancel
              </button>
              <h3 className="text-base font-bold text-slate-950">Members</h3>
              <span className="w-[76px]" />
            </div>
            <div className="px-5 pb-3">
              <label className="flex h-10 items-center gap-2 rounded-full bg-white px-3 text-slate-400 ring-1 ring-slate-200/70 focus-within:ring-2 focus-within:ring-sky-200">
                <Search className="h-4 w-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                  placeholder="Search members"
                  className="min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>
            <ScrollArea className="max-h-[calc(78dvh-7.5rem)]">
              <div className="pb-4">
                <SectionLabel>Channel Members</SectionLabel>
                {filteredCandidates.length > 0 ? filteredCandidates.map((member) => (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => {
                      onPromote(member);
                      setPickerOpen(false);
                    }}
                    disabled={memberBusyId === member.user_id}
                    className="flex w-full items-center gap-3 border-b border-slate-200/70 bg-white px-5 py-3 text-left last:border-b-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
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
                  <div className="bg-white px-5 py-6 text-sm text-slate-500">
                    {normalizedQuery ? "No matching members." : "No subscribers available to promote."}
                  </div>
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
        <button type="button" onClick={() => toast.message("Choose a member from Members to remove them")} className="w-full px-4 py-4 text-left text-base text-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset">
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
                  className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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

function ChannelSearchView({ posts }: { posts: ChannelPost[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    const searchablePosts = posts.map((post) => {
      const mediaText = Array.isArray(post.media)
        ? post.media
            .map((item: any) => [item?.name, item?.filename, item?.file_name, item?.title, item?.caption, item?.url].filter(Boolean).join(" "))
            .join(" ")
        : "";
      return {
        post,
        text: [post.body, mediaText].filter(Boolean).join(" ").toLowerCase(),
      };
    });
    if (!normalizedQuery) return searchablePosts.slice(0, 12).map((item) => item.post);
    return searchablePosts
      .filter((item) => item.text.includes(normalizedQuery))
      .map((item) => item.post)
      .slice(0, 30);
  }, [normalizedQuery, posts]);

  return (
    <>
      <InfoSection>
        <label className="flex items-center gap-3 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Search messages"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </label>
      </InfoSection>

      <InfoSection>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-sm font-bold uppercase tracking-wider text-slate-500">{normalizedQuery ? "Results" : "Recent Posts"}</span>
          <span className="text-sm font-semibold text-slate-400">{results.length.toLocaleString()}</span>
        </div>
        {results.length > 0 ? (
          results.map((post) => <SearchResultRow key={post.id} post={post} query={normalizedQuery} />)
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center px-5 py-8 text-center">
            <Search className="mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm font-semibold text-slate-950">No results found</p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-slate-500">Try another word from a channel post, link, file, or media caption.</p>
          </div>
        )}
      </InfoSection>
    </>
  );
}

function SearchResultRow({ post, query }: { post: ChannelPost; query: string }) {
  const mediaCount = Array.isArray(post.media) ? post.media.filter(Boolean).length : 0;
  const body = post.body?.trim() || (mediaCount > 0 ? `${mediaCount} attachment${mediaCount === 1 ? "" : "s"}` : "Channel post");
  const preview = query ? highlightQueryPreview(body, query) : body;
  return (
    <a
      href={`#channel-post-${post.id}`}
      className="block border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
    >
      <span className="block line-clamp-2 text-base font-semibold text-slate-950">{preview}</span>
      <span className="mt-1 block text-sm text-slate-500">{formatInfoDate(post.published_at || post.created_at)}</span>
    </a>
  );
}

function highlightQueryPreview(value: string, query: string): string {
  if (!query) return value;
  const index = value.toLowerCase().indexOf(query);
  if (index < 0) return value;
  const start = Math.max(0, index - 28);
  const end = Math.min(value.length, index + query.length + 46);
  return `${start > 0 ? "... " : ""}${value.slice(start, end)}${end < value.length ? " ..." : ""}`;
}

const ACTION_ICON: Record<string, ComponentType<{ className?: string }>> = {
  member_joined: UserPlus,
  member_left: LogOut,
  member_added: UserPlus,
  member_removed: UserMinus,
  member_unbanned: UserPlus,
  role_changed: Shield,
  settings_changed: Settings2,
  info_changed: Pencil,
  post_canceled: Trash2,
};

function actionTimeLabel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatInfoDate(iso);
}

function describeAction(row: InfoActionRow, nameOf: (id?: string | null) => string) {
  const actor = nameOf(row.actor_id);
  const target = row.target_user_id ? nameOf(row.target_user_id) : "";
  switch (row.action) {
    case "member_joined": return `${actor} joined the channel`;
    case "member_left": return `${actor} left the channel`;
    case "member_added": return `${actor} added ${target}`;
    case "member_removed": return `${actor} removed ${target}`;
    case "member_unbanned": return `${actor} allowed ${target} to rejoin`;
    case "role_changed": return `${actor} changed ${target}'s role`;
    case "settings_changed": {
      const keys = row.meta ? Object.keys(row.meta) : [];
      const pretty = keys.map((key) => key.replace(/_/g, " ")).join(", ");
      return `${actor} changed ${pretty || "channel settings"}`;
    }
    case "info_changed": return `${actor} updated channel info`;
    case "post_canceled": return `${actor} canceled a scheduled post`;
    default: return `${actor} · ${row.action.replace(/_/g, " ")}`;
  }
}

function actionFilterKeys(row: InfoActionRow): string[] {
  switch (row.action) {
    case "role_changed":
      return ["adminRights"];
    case "member_unbanned":
      return ["exceptions"];
    case "member_joined":
    case "member_added":
      return ["newMembers"];
    case "member_left":
    case "member_removed":
      return ["leftMembers"];
    case "info_changed":
      return ["groupInfo"];
    case "settings_changed": {
      const metaKeys = row.meta ? Object.keys(row.meta) : [];
      const keys: string[] = [];
      if (metaKeys.some((key) => key.includes("invite"))) keys.push("inviteLinks");
      if (metaKeys.some((key) => key.includes("video") || key.includes("call"))) keys.push("videoChats");
      if (metaKeys.some((key) => !key.includes("invite") && !key.includes("video") && !key.includes("call"))) keys.push("groupInfo");
      return keys.length ? keys : ["groupInfo"];
    }
    case "post_canceled":
      return ["deleted"];
    default:
      return [];
  }
}

function RecentActionsView({
  channel,
  posts,
  rows,
  profiles,
  loading,
}: {
  channel: Channel;
  posts: ChannelPost[];
  rows: InfoActionRow[];
  profiles: Map<string, InfoActorProfile>;
  loading: boolean;
}) {
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
  const toggleChecked = (key: string) => setChecked((current) => ({ ...current, [key]: !current[key] }));
  const toggleGroup = (groupKey: string, childKeys: string[]) => setChecked((current) => {
    const nextValue = !current[groupKey];
    return {
      ...current,
      [groupKey]: nextValue,
      ...Object.fromEntries(childKeys.map((key) => [key, nextValue])),
    };
  });
  const toggleActor = (actorId: string) => setChecked((current) => ({
    ...current,
    allAdmins: false,
    [`actor:${actorId}`]: !current[`actor:${actorId}`],
  }));
  const toggleExpanded = (key: string) => setExpanded((current) => ({ ...current, [key]: !current[key] }));
  const nameOf = (id?: string | null) => (id ? profiles.get(id)?.name || "Someone" : "Someone");
  const actorIds = Array.from(new Set(rows.map((row) => row.actor_id).filter(Boolean)));
  const memberFilterKeys = ["adminRights", "exceptions", "newMembers", "leftMembers"];
  const settingsFilterKeys = ["groupInfo", "inviteLinks", "videoChats"];
  const messageFilterKeys = ["deleted", "edited", "pinned"];
  const activeTypeFilters = new Set([
    ...memberFilterKeys.filter((key) => checked.members && checked[key]),
    ...settingsFilterKeys.filter((key) => checked.settings && checked[key]),
    ...messageFilterKeys.filter((key) => checked.messages && checked[key]),
  ]);
  const enabledCategories = new Set([
    checked.members && "members",
    checked.settings && "settings",
    checked.messages && "messages",
  ].filter(Boolean));
  const filteredRows = rows.filter((row) => {
    const category = LOG_CATEGORY[row.action as ChannelLogAction] ?? "settings";
    if (!enabledCategories.has(category)) return false;
    const rowFilterKeys = actionFilterKeys(row);
    if (rowFilterKeys.length > 0 && !rowFilterKeys.some((key) => activeTypeFilters.has(key))) return false;
    if (!checked.allAdmins && !checked[`actor:${row.actor_id}`]) return false;
    return true;
  });
  const previewRows = filteredRows.slice(0, 5);
  const selectedMemberFilters = memberFilterKeys.filter((key) => checked.members && checked[key]).length;
  const selectedSettingsFilters = settingsFilterKeys.filter((key) => checked.settings && checked[key]).length;
  const selectedMessageFilters = messageFilterKeys.filter((key) => checked.messages && checked[key]).length;
  const selectedActorCount = actorIds.filter((actorId) => checked[`actor:${actorId}`]).length;
  const filterLabel = enabledCategories.size === 3 ? "All" : `${enabledCategories.size}/3`;

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
        <p className="text-xs opacity-80">{filterLabel === "All" ? "All Actions" : "Filtered Actions"}</p>
        <div className="mt-20 space-y-2">
          {loading ? (
            <>
              <ActionPill text="Loading actions..." />
              <ActionPill text="Checking admin log" />
            </>
          ) : previewRows.length > 0 ? (
            previewRows.map((row) => <ActionPill key={row.id} text={describeAction(row, nameOf)} />)
          ) : (
            <>
              <ActionPill text="No recent actions" />
              {posts[0] && <ActionPill text={`Latest post ${formatInfoDate(posts[0].published_at || posts[0].created_at)}`} />}
            </>
          )}
        </div>
      </div>
      <InfoSection>
        <SettingsRow icon={SlidersHorizontal} label="Filter Recent Actions" value={filterLabel} onClick={() => setFilterOpen(true)} />
      </InfoSection>
      <InfoSection>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-sm font-bold uppercase tracking-wider text-slate-500">Admin Log</span>
          <span className="text-sm font-semibold text-slate-400">{filteredRows.length.toLocaleString()}</span>
        </div>
        {loading ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((index) => <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : filteredRows.length > 0 ? (
          filteredRows.slice(0, 30).map((row) => {
            const Icon = ACTION_ICON[row.action] ?? Settings2;
            const profile = profiles.get(row.actor_id);
            return (
              <div key={row.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar || undefined} alt={nameOf(row.actor_id)} />
                  <AvatarFallback className="bg-sky-100 text-sm font-bold text-sky-700">{nameOf(row.actor_id).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block line-clamp-2 text-[15px] font-semibold leading-snug text-slate-950">{describeAction(row, nameOf)}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{actionTimeLabel(row.created_at)}</span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center px-5 py-8 text-center">
            <Settings2 className="mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm font-semibold text-slate-950">No recent actions</p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-slate-500">Admin activity in this channel will show here.</p>
          </div>
        )}
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
              className="absolute left-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                    count={`${selectedMemberFilters}/4`}
                    checked={checked.members}
                    expanded={expanded.members}
                    onToggleChecked={() => toggleGroup("members", memberFilterKeys)}
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
                    label="Channel Settings"
                    count={`${selectedSettingsFilters}/3`}
                    checked={checked.settings}
                    expanded={expanded.settings}
                    onToggleChecked={() => toggleGroup("settings", settingsFilterKeys)}
                    onToggleExpanded={() => toggleExpanded("settings")}
                  />
                  {expanded.settings && (
                    <div className="pl-14">
                      <ActionFilterChild label="Channel Info" checked={checked.groupInfo} onClick={() => toggleChecked("groupInfo")} />
                      <ActionFilterChild label="Invite Links" checked={checked.inviteLinks} onClick={() => toggleChecked("inviteLinks")} />
                      <ActionFilterChild label="Video Chats" checked={checked.videoChats} onClick={() => toggleChecked("videoChats")} />
                    </div>
                  )}
                  <ActionFilterGroup
                    label="Messages"
                    count={`${selectedMessageFilters}/3`}
                    checked={checked.messages}
                    expanded={expanded.messages}
                    onToggleChecked={() => toggleGroup("messages", messageFilterKeys)}
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
                  <ActionFilterChild
                    label="Show Actions by All Admins"
                    checked={checked.allAdmins}
                    onClick={() => setChecked((current) => ({ ...current, allAdmins: !current.allAdmins }))}
                  />
                  {actorIds.slice(0, 6).map((actorId) => (
                    <div key={actorId} className="pl-14">
                      <ActionFilterChild
                        label={nameOf(actorId)}
                        checked={checked.allAdmins || !!checked[`actor:${actorId}`]}
                        onClick={() => toggleActor(actorId)}
                        avatar={nameOf(actorId).slice(0, 1).toUpperCase()}
                      />
                    </div>
                  ))}
                  {!checked.allAdmins && actorIds.length > 0 && (
                    <div className="px-4 py-3 text-xs leading-5 text-slate-500">
                      Showing {selectedActorCount || "no"} selected admin{selectedActorCount === 1 ? "" : "s"}.
                    </div>
                  )}
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
                className="pointer-events-auto w-full rounded-full bg-sky-500 px-4 py-3 text-base font-bold text-white shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
      <button type="button" onClick={onToggleChecked} aria-label={`Toggle ${label}`} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <ActionCheck checked={checked} />
      </button>
      <button type="button" onClick={onToggleExpanded} className="flex min-w-0 flex-1 items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset">
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
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset">
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

function InfoSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-white/88 shadow-sm ring-1 ring-white/70 backdrop-blur", className)}>
      {children}
    </div>
  );
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
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset">
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
        className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
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
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset">
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
                "rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2",
                action.destructive ? "bg-rose-50 text-rose-600 hover:bg-rose-100 focus-visible:ring-destructive/50" : "bg-sky-50 text-sky-600 hover:bg-sky-100 focus-visible:ring-primary/40",
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
      className="inline-flex h-11 min-w-max items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white/86 px-3 text-[11px] font-semibold text-sky-600 shadow-sm ring-1 ring-white/75 transition hover:bg-white active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sky-600">
        <Icon className="h-4 w-4" />
      </span>
      <span>{label}</span>
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
      className="group relative aspect-square overflow-hidden rounded-md bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
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
      className="flex items-center gap-3 rounded-xl bg-white/70 p-3 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
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
