import { useEffect, useState, type ReactNode, type ComponentType } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useChannel } from "@/hooks/useChannel";
import { useSmartBack } from "@/lib/smartBack";
import { getChannelShareUrl } from "@/lib/getPublicOrigin";
import { shareContent } from "@/lib/native/share";
import { copyText } from "@/lib/native/clipboard";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChannelMemberRow, type MemberRow } from "@/components/channels/ChannelMemberRow";
import { cn } from "@/lib/utils";
import { logChannelAction } from "@/lib/channels/adminLog";
import { toast } from "sonner";
import { ChevronLeft, BadgeCheck, Loader2, Download, Link2, Share2, Forward, Users, Shield, Globe, Lock, Copy, CalendarClock, ChevronRight, SmilePlus, Palette, Timer, UserCheck, EyeOff, Hash, Check, UserMinus, History } from "lucide-react";

const SNAPSHOT_WIDTH = 1080;
const SNAPSHOT_HEIGHT = 1350;

type SnapshotInput = {
  name: string;
  description: string;
  handle: string;
  avatarUrl: string | null;
  subscribers: number;
  isPublic: boolean;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.length > 0) {
    const last = lines[maxLines - 1];
    const clipped = `${last.slice(0, Math.max(0, last.length - 1))}...`;
    lines[maxLines - 1] = clipped;
  }
  return lines;
}

async function buildChannelSetupSnapshot(input: SnapshotInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SNAPSHOT_WIDTH;
  canvas.height = SNAPSHOT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const bg = ctx.createLinearGradient(0, 0, SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT);
  bg.addColorStop(0, "#0b1220");
  bg.addColorStop(1, "#162237");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(900, 180, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "700 54px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Channel Setup Snapshot", 72, 100);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 30px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`@${input.handle}`, 72, 148);

  const cardX = 56;
  const cardY = 200;
  const cardW = SNAPSHOT_WIDTH - 112;
  const cardH = SNAPSHOT_HEIGHT - 286;
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 34);
  ctx.fill();

  const avatarSize = 200;
  const avatarX = cardX + 64;
  const avatarY = cardY + 64;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  let drewAvatar = false;
  if (input.avatarUrl) {
    try {
      const img = await loadImage(input.avatarUrl);
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
      drewAvatar = true;
    } catch {
      drewAvatar = false;
    }
  }
  if (!drewAvatar) {
    const initials = (input.name || "CH").slice(0, 2).toUpperCase();
    const grad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    grad.addColorStop(0, "#3b82f6");
    grad.addColorStop(1, "#14b8a6");
    ctx.fillStyle = grad;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 72px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
  }
  ctx.restore();

  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 58px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(input.name || "Untitled channel", avatarX + avatarSize + 44, avatarY + 92);

  ctx.fillStyle = "#475569";
  ctx.font = "500 34px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`@${input.handle}`, avatarX + avatarSize + 44, avatarY + 142);

  const badge = input.isPublic ? "Public" : "Private";
  const badgeTextW = ctx.measureText(badge).width;
  const badgeX = avatarX + avatarSize + 44;
  const badgeY = avatarY + 166;
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeTextW + 48, 52, 26);
  ctx.fill();
  ctx.fillStyle = "#334155";
  ctx.font = "600 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(badge, badgeX + 24, badgeY + 35);

  ctx.fillStyle = "#0f172a";
  ctx.font = "600 34px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`${input.subscribers.toLocaleString()} subscribers`, cardX + 64, cardY + 358);

  ctx.fillStyle = "#64748b";
  ctx.font = "500 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Description", cardX + 64, cardY + 430);

  ctx.fillStyle = "#1e293b";
  ctx.font = "500 32px system-ui, -apple-system, Segoe UI, sans-serif";
  const desc = input.description.trim() || "No description";
  const lines = wrapLines(ctx, desc, cardW - 128, 8);
  lines.forEach((line, i) => {
    ctx.fillText(line, cardX + 64, cardY + 484 + i * 46);
  });

  ctx.fillStyle = "#64748b";
  ctx.font = "500 24px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`Generated ${new Date().toLocaleString()}`, cardX + 64, cardY + cardH - 36);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to generate image"));
        return;
      }
      resolve(blob);
    }, "image/png", 0.95);
  });
}

function triggerDownload(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

// ── Presentational helpers (Telegram-style settings, Service-Menu card look) ──
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function SettingRow({
  icon: Icon,
  tint,
  label,
  sublabel,
  right,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  tint?: string;
  label: string;
  sublabel?: string;
  right?: ReactNode;
  onClick?: () => void;
}) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button", onClick } : {})}
      className={cn(
        "flex w-full items-center gap-3 px-3.5 py-3 text-left",
        onClick && "transition-colors hover:bg-muted/50 active:bg-muted",
      )}
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tint ?? "bg-muted text-foreground")}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {sublabel && <div className="text-[11px] leading-snug text-muted-foreground">{sublabel}</div>}
      </div>
      {right}
    </Comp>
  );
}

function ActionPill({ icon: Icon, label, onClick }: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card py-2.5 text-primary transition-colors hover:bg-muted/50 active:scale-[0.98]"
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

const REACTION_OPTIONS: { value: "all" | "some" | "none"; label: string; desc: string }[] = [
  { value: "all", label: "All reactions", desc: "Subscribers can react with any emoji." },
  { value: "some", label: "Some reactions", desc: "Reactions are limited to a curated set." },
  { value: "none", label: "No reactions", desc: "Reactions are turned off for this channel." },
];

const WALLPAPER_OPTIONS: { value: "green" | "blue" | "pink" | "none"; label: string; swatch: string }[] = [
  { value: "green", label: "Green", swatch: "bg-emerald-300" },
  { value: "blue", label: "Blue", swatch: "bg-sky-300" },
  { value: "pink", label: "Pink", swatch: "bg-pink-300" },
  { value: "none", label: "None", swatch: "bg-muted-foreground/30" },
];

const SLOW_MODE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 10, label: "10 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 900, label: "15 minutes" },
];

const reactionShort = (v?: string) => (v === "none" ? "Off" : v === "some" ? "Some" : "All");
const slowModeShort = (s: number) => SLOW_MODE_OPTIONS.find((o) => o.value === s)?.label ?? `${s}s`;

export default function ManageChannelPage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { channel, userId, refresh, loading } = useChannel(handle);
  const goBack = useSmartBack(handle ? `/c/${handle}` : "/channels");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [shotBusy, setShotBusy] = useState(false);
  const [restrictSaving, setRestrictSaving] = useState(true);
  const [reactionPolicy, setReactionPolicy] = useState<"all" | "some" | "none">("all");
  const [wallpaperStyle, setWallpaperStyle] = useState<"green" | "blue" | "pink" | "none">("green");
  const [approveRequired, setApproveRequired] = useState(false);
  const [hideMembers, setHideMembers] = useState(false);
  const [topicsEnabled, setTopicsEnabled] = useState(false);
  const [slowMode, setSlowMode] = useState(0);
  const [removed, setRemoved] = useState<Array<MemberRow & { removedByName?: string }>>([]);
  const [ownerProfile, setOwnerProfile] = useState<{ name?: string | null; avatar?: string | null }>({});
  const [sheet, setSheet] = useState<null | "reactions" | "appearance" | "slowmode" | "removed" | "admins">(null);
  const downloadsLocked = restrictSaving;

  // Check if the signed-in user is a platform admin (controls visibility of
  // the "Verified" toggle below). The set_channel_verified RPC also enforces
  // this server-side, so this is purely a UX gate.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await (supabase as any).rpc("is_admin", { _user_id: userId });
        if (alive) setIsAdmin(Boolean(data));
      } catch {
        // Fallback to user_roles lookup if is_admin signature differs
        try {
          const { data: rows } = await (supabase as any)
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();
          if (alive) setIsAdmin(!!rows);
        } catch {
          if (alive) setIsAdmin(false);
        }
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const toggleVerified = async () => {
    if (!channel) return;
    setVerifyBusy(true);
    try {
      const next = !(channel as any).is_verified;
      const { error } = await (supabase as any).rpc("set_channel_verified", {
        p_channel_id: channel.id,
        p_verified: next,
      });
      if (error) throw error;
      toast.success(next ? "Channel marked verified" : "Verified badge removed");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Could not update verified state");
    } finally {
      setVerifyBusy(false);
    }
  };


  useEffect(() => {
    if (!channel) return;
    setName(channel.name);
    setDesc(channel.description ?? "");
    setIsPublic(channel.is_public);
    setRestrictSaving(channel.restrict_saving_content !== false);
    setReactionPolicy(channel.reaction_policy ?? "all");
    setWallpaperStyle(channel.wallpaper_style ?? "green");
    setApproveRequired(!!channel.channel_join_approval_required);
    setHideMembers(!!channel.hide_members);
    setTopicsEnabled(!!channel.topics_enabled);
    setSlowMode(channel.slow_mode_seconds ?? 0);
    loadMembers();
    loadScheduled();
    loadRemoved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.id]);

  // Settings toggles/pickers apply instantly (Telegram-style). Optimistic state
  // is already set by the caller; we just persist + refresh, rolling back on error.
  const patch = async (fields: Record<string, unknown>, rollback?: () => void) => {
    if (!channel) return;
    const { error } = await (supabase as any).from("channels").update(fields).eq("id", channel.id);
    if (error) {
      rollback?.();
      toast.error(error.message || "Couldn't update setting");
      return;
    }
    void logChannelAction(channel.id, userId, "settings_changed", { meta: fields });
    refresh();
  };

  const loadMembers = async () => {
    if (!channel) return;
    const { data } = await supabase
      .from("channel_subscribers")
      .select("user_id, role")
      .eq("channel_id", channel.id);
    if (!data) return;
    const ids = data.map((r) => r.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    setMembers(
      data.map((r: any) => ({
        user_id: r.user_id,
        role: r.role,
        display_name: map.get(r.user_id)?.full_name,
        avatar_url: map.get(r.user_id)?.avatar_url,
      }))
    );
    const op = map.get(channel.owner_id);
    setOwnerProfile({ name: op?.full_name, avatar: op?.avatar_url });
  };

  const loadScheduled = async () => {
    if (!channel) return;
    const { data } = await supabase
      .from("channel_posts")
      .select("*")
      .eq("channel_id", channel.id)
      .is("published_at", null)
      .not("scheduled_for", "is", null)
      .order("scheduled_for", { ascending: true });
    setScheduled(data ?? []);
  };

  const loadRemoved = async () => {
    if (!channel) return;
    const { data } = await (supabase as any)
      .from("channel_removed_users")
      .select("user_id, removed_by, removed_at")
      .eq("channel_id", channel.id)
      .order("removed_at", { ascending: false });
    if (!data) { setRemoved([]); return; }
    const ids = [...new Set(data.flatMap((r: any) => [r.user_id, r.removed_by]).filter(Boolean))] as string[];
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    setRemoved(
      data.map((r: any) => ({
        user_id: r.user_id,
        role: "removed",
        display_name: map.get(r.user_id)?.full_name,
        avatar_url: map.get(r.user_id)?.avatar_url,
        removedByName: map.get(r.removed_by)?.full_name,
      })),
    );
  };

  const saveMeta = async (silent = false) => {
    if (!channel) return;
    const { error } = await supabase
      .from("channels")
      .update({ name: name.trim(), description: desc.trim() || null, is_public: isPublic, restrict_saving_content: restrictSaving })
      .eq("id", channel.id);
    if (error) {
      if (!silent) toast.error(error.message);
      return false;
    }
    if (!silent) toast.success("Saved");
    void logChannelAction(channel.id, userId, "info_changed", { meta: { name: name.trim() } });
    refresh();
    return true;
  };

  const buildSnapshotInput = (): SnapshotInput => ({
    name: name.trim() || channel.name,
    description: desc,
    handle: channel.handle,
    avatarUrl: channel.avatar_url,
    subscribers: channel.subscriber_count,
    isPublic,
  });

  const channelShareUrl = channel ? getChannelShareUrl(channel.handle) : "";

  const copyChannelLink = async () => {
    try {
      await copyText(channelShareUrl);
      toast.success("Channel link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const shareChannelLink = async () => {
    try {
      const result = await shareContent({
        title: name.trim() || channel.name,
        text: desc.trim() || `Join @${channel.handle} on ZIVO`,
        url: channelShareUrl,
        dialogTitle: "Share channel",
      });
      if (result.shared || result.cancelled) return;
      await copyChannelLink();
    } catch {
      // User cancel on share sheet should not show an error.
    }
  };

  const forwardToChat = () => {
    openShareToChat({
      kind: "activity",
      title: name.trim() || channel.name,
      subtitle: `@${channel.handle}`,
      meta: `${channel.subscriber_count.toLocaleString()} subscribers`,
      image: channel.avatar_url,
      deepLink: `/c/${channel.handle}`,
      badge: "CHANNEL",
    });
    toast.success("Pick chat recipients");
  };

  const downloadSnapshot = async () => {
    if (!channel || shotBusy) return;
    setShotBusy(true);
    try {
      const blob = await buildChannelSetupSnapshot(buildSnapshotInput());
      triggerDownload(blob, `${channel.handle}-setup-snapshot.png`);
      toast.success("Screenshot downloaded");
    } catch {
      toast.error("Could not download screenshot");
    } finally {
      setShotBusy(false);
    }
  };

  const saveAndDownload = async () => {
    if (!channel || shotBusy) return;
    setShotBusy(true);
    try {
      const ok = await saveMeta(true);
      if (!ok) {
        toast.error("Save failed");
        return;
      }
      const blob = await buildChannelSetupSnapshot(buildSnapshotInput());
      triggerDownload(blob, `${channel.handle}-setup-snapshot.png`);
      toast.success("Saved and downloaded");
    } catch {
      toast.error("Could not complete save + download");
    } finally {
      setShotBusy(false);
    }
  };

  const setRole = async (uid: string, role: string) => {
    if (!channel) return;
    await supabase
      .from("channel_subscribers")
      .update({ role: role as any })
      .eq("channel_id", channel.id)
      .eq("user_id", uid);
    void logChannelAction(channel.id, userId, "role_changed", { targetUserId: uid, meta: { role } });
    loadMembers();
  };

  const removeMember = async (uid: string) => {
    if (!channel) return;
    await supabase
      .from("channel_subscribers")
      .delete()
      .eq("channel_id", channel.id)
      .eq("user_id", uid);
    // Record the removal so the user shows under "Removed users" and can't
    // re-subscribe (enforced by the channel_subscribers insert RLS policy).
    if (userId) {
      await (supabase as any)
        .from("channel_removed_users")
        .upsert({ channel_id: channel.id, user_id: uid, removed_by: userId }, { onConflict: "channel_id,user_id" });
    }
    void logChannelAction(channel.id, userId, "member_removed", { targetUserId: uid });
    loadMembers();
    loadRemoved();
  };

  const unbanMember = async (uid: string) => {
    if (!channel) return;
    const { error } = await (supabase as any)
      .from("channel_removed_users")
      .delete()
      .eq("channel_id", channel.id)
      .eq("user_id", uid);
    if (error) { toast.error("Couldn't remove the ban"); return; }
    toast.success("User can rejoin now");
    void logChannelAction(channel.id, userId, "member_unbanned", { targetUserId: uid });
    loadRemoved();
  };

  const cancelScheduled = async (id: string) => {
    if (channel) void logChannelAction(channel.id, userId, "post_canceled", { meta: { post_id: id } });
    await supabase.from("channel_posts").delete().eq("id", id);
    loadScheduled();
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!channel) return <div className="p-8 text-center text-sm text-muted-foreground">Not found.</div>;
  if (userId !== channel.owner_id) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Only the owner can manage this channel.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1 truncate">Manage @{channel.handle}</h1>
        <Button size="sm" onClick={() => void saveMeta()} className="rounded-full font-bold">Save</Button>
      </header>
      <div className="mx-auto max-w-2xl p-4 space-y-5">

        {/* Profile header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="h-24 w-24 shadow-md ring-4 ring-background">
            <AvatarImage src={channel.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-2xl font-black">
              {(name || channel.name).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-xl font-black leading-tight">{name || channel.name}</h2>
              {(channel as any).is_verified && <BadgeCheck className="h-5 w-5 text-sky-500" />}
            </div>
            <p className="text-sm text-muted-foreground">@{channel.handle}</p>
            <p className="text-xs font-medium text-muted-foreground">
              {channel.subscriber_count.toLocaleString()} subscriber{channel.subscriber_count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="mt-1 grid w-full max-w-xs grid-cols-3 gap-2">
            <ActionPill icon={Copy} label="Copy link" onClick={() => void copyChannelLink()} />
            <ActionPill icon={Share2} label="Share" onClick={() => void shareChannelLink()} />
            <ActionPill icon={Forward} label="Forward" onClick={() => void forwardToChat()} />
          </div>
        </div>

        {/* Share link */}
        <section>
          <SectionLabel>Share link</SectionLabel>
          <button
            type="button"
            onClick={() => void copyChannelLink()}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Link2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{channelShareUrl}</span>
            <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </section>

        {/* Channel info */}
        <section>
          <SectionLabel>Channel</SectionLabel>
          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
            <div className="px-3.5 py-3">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-auto border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="px-3.5 py-3">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</Label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder="What's your channel about?"
                className="mt-1 resize-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        </section>

        {/* Settings */}
        <section>
          <SectionLabel>Settings</SectionLabel>
          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
            <SettingRow
              icon={isPublic ? Globe : Lock}
              tint="bg-sky-500/10 text-sky-600"
              label="Channel type"
              sublabel={isPublic ? "Public — anyone can find and subscribe" : "Private — invite only"}
              right={<Switch checked={isPublic} onCheckedChange={(v) => { setIsPublic(v); void patch({ is_public: v }, () => setIsPublic(!v)); }} aria-label="Toggle public" />}
            />
            <SettingRow
              icon={UserCheck}
              tint="bg-indigo-500/10 text-indigo-600"
              label="Approve new members"
              sublabel="New subscribers need approval before they can join"
              right={<Switch checked={approveRequired} onCheckedChange={(v) => { setApproveRequired(v); void patch({ channel_join_approval_required: v }, () => setApproveRequired(!v)); }} aria-label="Toggle approval" />}
            />
            <SettingRow
              icon={restrictSaving ? Lock : Download}
              tint="bg-amber-500/10 text-amber-600"
              label="Content control"
              sublabel={restrictSaving ? "Restricted — members can't save media" : "Open — members can save media"}
              right={<Switch checked={restrictSaving} onCheckedChange={(v) => { setRestrictSaving(v); void patch({ restrict_saving_content: v }, () => setRestrictSaving(!v)); }} aria-label="Toggle saving restriction" />}
            />
            <SettingRow
              icon={SmilePlus}
              tint="bg-fuchsia-500/10 text-fuchsia-600"
              label="Reactions"
              sublabel="Which reactions subscribers can use"
              onClick={() => setSheet("reactions")}
              right={<span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">{reactionShort(reactionPolicy)}<ChevronRight className="h-4 w-4" /></span>}
            />
            <SettingRow
              icon={Palette}
              tint="bg-rose-500/10 text-rose-600"
              label="Appearance"
              sublabel="Channel wallpaper"
              onClick={() => setSheet("appearance")}
              right={
                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className={cn("h-4 w-4 rounded-full", WALLPAPER_OPTIONS.find((w) => w.value === wallpaperStyle)?.swatch)} />
                  {WALLPAPER_OPTIONS.find((w) => w.value === wallpaperStyle)?.label}
                  <ChevronRight className="h-4 w-4" />
                </span>
              }
            />
            <SettingRow
              icon={Timer}
              tint="bg-teal-500/10 text-teal-600"
              label="Slow mode"
              sublabel="Limit how often subscribers can post"
              onClick={() => setSheet("slowmode")}
              right={<span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">{slowModeShort(slowMode)}<ChevronRight className="h-4 w-4" /></span>}
            />
            <SettingRow
              icon={Hash}
              tint="bg-violet-500/10 text-violet-600"
              label="Topics"
              sublabel="Organize posts into topics"
              right={<Switch checked={topicsEnabled} onCheckedChange={(v) => { setTopicsEnabled(v); void patch({ topics_enabled: v }, () => setTopicsEnabled(!v)); }} aria-label="Toggle topics" />}
            />
            {isAdmin && (
              <SettingRow
                icon={BadgeCheck}
                tint="bg-sky-500/10 text-sky-600"
                label="Verified"
                sublabel="Platform admin only · adds a blue checkmark"
                right={
                  <Button
                    onClick={toggleVerified}
                    disabled={verifyBusy}
                    size="sm"
                    variant={(channel as any).is_verified ? "secondary" : "default"}
                  >
                    {verifyBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (channel as any).is_verified ? "Remove" : "Verify"}
                  </Button>
                }
              />
            )}
          </div>
        </section>

        {/* People */}
        <section>
          <SectionLabel>People</SectionLabel>
          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
            <SettingRow
              icon={Users}
              tint="bg-violet-500/10 text-violet-600"
              label="Members"
              right={<span className="text-sm font-bold text-muted-foreground">{members.length}</span>}
            />
            <SettingRow
              icon={Shield}
              tint="bg-emerald-500/10 text-emerald-600"
              label="Administrators"
              onClick={() => setSheet("admins")}
              right={<span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">{members.filter((m) => m.role === "admin").length + 1}<ChevronRight className="h-4 w-4" /></span>}
            />
            <SettingRow
              icon={EyeOff}
              tint="bg-slate-500/10 text-slate-600"
              label="Hide members"
              sublabel="Only admins can see the full member list"
              right={<Switch checked={hideMembers} onCheckedChange={(v) => { setHideMembers(v); void patch({ hide_members: v }, () => setHideMembers(!v)); }} aria-label="Toggle hide members" />}
            />
            <SettingRow
              icon={UserMinus}
              tint="bg-rose-500/10 text-rose-600"
              label="Removed users"
              sublabel="Banned from rejoining the channel"
              onClick={() => setSheet("removed")}
              right={<span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">{removed.length}<ChevronRight className="h-4 w-4" /></span>}
            />
          </div>
          <div className="mt-2 space-y-2">
            {members.map((m) => (
              <ChannelMemberRow
                key={m.user_id}
                member={m}
                isOwnerView
                onPromote={() => setRole(m.user_id, "admin")}
                onDemote={() => setRole(m.user_id, "sub")}
                onRemove={() => removeMember(m.user_id)}
              />
            ))}
            {members.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No members yet.
              </div>
            )}
          </div>
        </section>

        {/* Activity */}
        <section>
          <SectionLabel>Activity</SectionLabel>
          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
            <SettingRow
              icon={History}
              tint="bg-blue-500/10 text-blue-600"
              label="Recent actions"
              sublabel="Admin audit log"
              onClick={() => navigate(`/c/${channel.handle}/log`)}
              right={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        </section>

        {/* Scheduled */}
        <section>
          <SectionLabel>Scheduled ({scheduled.length})</SectionLabel>
          <div className="space-y-2">
            {scheduled.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-2 rounded-2xl border border-border bg-card p-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm">{p.body}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(p.scheduled_for).toLocaleString()}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => cancelScheduled(p.id)}>Cancel</Button>
              </div>
            ))}
            {scheduled.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nothing scheduled.
              </div>
            )}
          </div>
        </section>

        {/* Export */}
        {!downloadsLocked ? (
          <section>
            <SectionLabel>Export</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => void saveAndDownload()} disabled={shotBusy}>
                {shotBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Save + Download
              </Button>
              <Button variant="outline" onClick={() => void downloadSnapshot()} disabled={shotBusy}>
                {shotBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download PNG
              </Button>
            </div>
          </section>
        ) : (
          <p className="px-1 text-[11px] text-muted-foreground">
            Snapshot download is locked by the content-control policy for this channel.
          </p>
        )}

        {/* Reactions picker */}
        <Sheet open={sheet === "reactions"} onOpenChange={(o) => !o && setSheet(null)}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader><SheetTitle>Reactions</SheetTitle></SheetHeader>
            <div className="mt-3 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border">
              {REACTION_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { setReactionPolicy(o.value); setSheet(null); void patch({ reaction_policy: o.value }); }}
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{o.label}</div>
                    <div className="text-[11px] text-muted-foreground">{o.desc}</div>
                  </div>
                  {reactionPolicy === o.value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Appearance / wallpaper picker */}
        <Sheet open={sheet === "appearance"} onOpenChange={(o) => !o && setSheet(null)}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader><SheetTitle>Appearance</SheetTitle></SheetHeader>
            <p className="mt-1 text-xs text-muted-foreground">Wallpaper shown behind posts on your channel.</p>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {WALLPAPER_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => { setWallpaperStyle(w.value); setSheet(null); void patch({ wallpaper_style: w.value }); }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors",
                    wallpaperStyle === w.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  )}
                >
                  <span className={cn("h-10 w-10 rounded-full", w.swatch)} />
                  <span className="text-xs font-semibold">{w.label}</span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Slow mode picker */}
        <Sheet open={sheet === "slowmode"} onOpenChange={(o) => !o && setSheet(null)}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader><SheetTitle>Slow mode</SheetTitle></SheetHeader>
            <p className="mt-1 text-xs text-muted-foreground">Subscribers can post once per chosen interval.</p>
            <div className="mt-3 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border">
              {SLOW_MODE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { setSlowMode(o.value); setSheet(null); void patch({ slow_mode_seconds: o.value }); }}
                  className="flex w-full items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="text-sm font-semibold">{o.label}</span>
                  {slowMode === o.value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Removed users */}
        <Sheet open={sheet === "removed"} onOpenChange={(o) => !o && setSheet(null)}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader><SheetTitle>Removed users</SheetTitle></SheetHeader>
            <p className="mt-1 text-xs text-muted-foreground">Removed users can't rejoin until you add them back.</p>
            <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto">
              {removed.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback>{(m.display_name ?? "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{m.display_name ?? "User"}</span>
                      {m.removedByName && <span className="truncate text-[11px] text-muted-foreground">Removed by {m.removedByName}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void unbanMember(m.user_id)}>Add back</Button>
                </div>
              ))}
              {removed.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No removed users.
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Administrators */}
        <Sheet open={sheet === "admins"} onOpenChange={(o) => !o && setSheet(null)}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader><SheetTitle>Administrators</SheetTitle></SheetHeader>
            <p className="mt-1 text-xs text-muted-foreground">Admins help manage the channel. Promote a subscriber from the member list below to add one.</p>
            <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto">
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={ownerProfile.avatar ?? undefined} />
                    <AvatarFallback>{(ownerProfile.name ?? "You").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium">{ownerProfile.name ?? "You"}</span>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">owner</span>
              </div>
              {members.filter((m) => m.role === "admin").map((m) => (
                <div key={m.user_id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.avatar_url ?? undefined} />
                      <AvatarFallback>{(m.display_name ?? "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{m.display_name ?? "Subscriber"}</span>
                      <span className="text-[11px] text-muted-foreground">admin</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setRole(m.user_id, "sub")}>Remove admin</Button>
                </div>
              ))}
              {members.filter((m) => m.role === "admin").length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No other admins yet.
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
