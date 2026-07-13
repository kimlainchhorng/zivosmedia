import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelMemberRow, type MemberRow } from "@/components/channels/ChannelMemberRow";
import { toast } from "sonner";
import { ChevronLeft, BadgeCheck, Loader2, Download, Link2, Share2, Forward } from "lucide-react";

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

export default function ManageChannelPage() {
  const { handle } = useParams<{ handle: string }>();
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
  const [controlOpen, setControlOpen] = useState(false);
  const downloadsLocked = !controlOpen;

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
    try {
      const saved = localStorage.getItem(`zivo:channel:control-open:${channel.id}`);
      setControlOpen(saved === "1");
    } catch {
      setControlOpen(false);
    }
    loadMembers();
    loadScheduled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.id]);

  useEffect(() => {
    if (!channel?.id) return;
    try {
      localStorage.setItem(`zivo:channel:control-open:${channel.id}`, controlOpen ? "1" : "0");
    } catch {
      // Ignore storage errors in private mode.
    }
  }, [channel?.id, controlOpen]);

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

  const saveMeta = async (silent = false) => {
    if (!channel) return;
    const { error } = await supabase
      .from("channels")
      .update({ name: name.trim(), description: desc.trim() || null, is_public: isPublic })
      .eq("id", channel.id);
    if (error) {
      if (!silent) toast.error(error.message);
      return false;
    }
    if (!silent) toast.success("Saved");
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
    loadMembers();
  };

  const removeMember = async (uid: string) => {
    if (!channel) return;
    await supabase
      .from("channel_subscribers")
      .delete()
      .eq("channel_id", channel.id)
      .eq("user_id", uid);
    loadMembers();
  };

  const cancelScheduled = async (id: string) => {
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
      </header>
      <div className="mx-auto max-w-2xl p-4">

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Public</Label>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
            <div className="space-y-0.5">
              <Label>Content Control</Label>
              <p className="text-[11px] text-muted-foreground">
                {controlOpen ? "Open: users can download/save media." : "Close: users cannot download/save media."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{controlOpen ? "Open" : "Close"}</span>
              <Switch checked={controlOpen} onCheckedChange={setControlOpen} aria-label="Toggle content control open or close" />
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center justify-between rounded-md border border-sky-500/30 bg-sky-500/5 p-3">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-sky-500" />
                  Verified
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Platform admin only. Adds a blue checkmark next to the channel name.
                </p>
              </div>
              <Button
                onClick={toggleVerified}
                disabled={verifyBusy}
                size="sm"
                variant={(channel as any).is_verified ? "secondary" : "default"}
              >
                {verifyBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (channel as any).is_verified ? "Remove" : "Verify"}
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => void copyChannelLink()}>
              <Link2 className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={() => void shareChannelLink()}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" onClick={() => void forwardToChat()}>
              <Forward className="mr-2 h-4 w-4" />
              Forward to Chat
            </Button>
            <Button onClick={() => void saveMeta()}>Save</Button>
            {!downloadsLocked && (
              <Button variant="secondary" onClick={() => void saveAndDownload()} disabled={shotBusy}>
                {shotBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Save + Download
              </Button>
            )}
            {!downloadsLocked && (
              <Button variant="outline" onClick={() => void downloadSnapshot()} disabled={shotBusy}>
                {shotBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download PNG
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Download is locked by content-control policy for this setup.
          </p>
        </TabsContent>

        <TabsContent value="members" className="space-y-2">
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
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No members yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-2">
          {scheduled.map((p) => (
            <div key={p.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm">{p.body}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Scheduled for {new Date(p.scheduled_for).toLocaleString()}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => cancelScheduled(p.id)}>
                Cancel
              </Button>
            </div>
          ))}
          {scheduled.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing scheduled.
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
