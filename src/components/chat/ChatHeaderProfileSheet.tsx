/**
 * ChatHeaderProfileSheet — Tap chat header → bottom sheet with profile,
 * quick actions, shared media counts, and danger actions.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Phone from "lucide-react/dist/esm/icons/phone";
import Video from "lucide-react/dist/esm/icons/video";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import Bell from "lucide-react/dist/esm/icons/bell";
import Search from "lucide-react/dist/esm/icons/search";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import LinkIcon from "lucide-react/dist/esm/icons/link";
import FileText from "lucide-react/dist/esm/icons/file-text";
import ShieldOff from "lucide-react/dist/esm/icons/shield-off";
import Flag from "lucide-react/dist/esm/icons/flag";
import Eraser from "lucide-react/dist/esm/icons/eraser";
import { toast } from "sonner";
import { useChatPrefs } from "@/hooks/useChatPrefs";

interface Props {
  open: boolean;
  onClose: () => void;
  partner: { id: string; name: string; avatar?: string | null; username?: string | null };
  onOpenSearch?: () => void;
  onCall?: (kind: "audio" | "video") => void;
  onClearHistory?: () => void;
}

type ProfileMetaRow = {
  bio: string | null;
  last_seen_at: string | null;
};

type CountResult = {
  count: number | null;
};

type QuickBtnProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
};

type StatRowProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
};

const dbFrom = (table: string): any => (supabase as any).from(table);

export default function ChatHeaderProfileSheet({
  open, onClose, partner, onOpenSearch, onCall, onClearHistory,
}: Props) {
  const nav = useNavigate();
  const { user } = useAuth();
  const { isMuted, toggleMute } = useChatPrefs(user?.id);
  const muted = isMuted(partner.id);

  const [bio, setBio] = useState<string | null>(null);
  const [counts, setCounts] = useState({ media: 0, files: 0, links: 0 });
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  const REPORT_REASONS = ["Spam", "Harassment", "Fake profile", "Inappropriate content", "Scam", "Other"];

  useEffect(() => {
    if (!open || !partner.id || !user?.id) return;
    let alive = true;
    (async () => {
      const { data } = await dbFrom("profiles")
        .select("bio, last_seen_at")
        .eq("user_id", partner.id)
        .maybeSingle();
      const prof = data as ProfileMetaRow | null;
      if (alive && prof) {
        setBio(prof.bio || null);
        setLastSeen(prof.last_seen_at || null);
      }
      const [mediaRes, filesRes, linksRes] = await Promise.all([
        dbFrom("direct_messages").select("id", { count: "exact", head: true })
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .or(`sender_id.eq.${partner.id},receiver_id.eq.${partner.id}`)
          .or("image_url.not.is.null,video_url.not.is.null"),
        dbFrom("direct_messages").select("id", { count: "exact", head: true })
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .or(`sender_id.eq.${partner.id},receiver_id.eq.${partner.id}`)
          .eq("message_type", "file"),
        dbFrom("direct_messages").select("id", { count: "exact", head: true })
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .or(`sender_id.eq.${partner.id},receiver_id.eq.${partner.id}`)
          .ilike("message", "%http%"),
      ]);
      const media = (mediaRes as CountResult).count || 0;
      const files = (filesRes as CountResult).count || 0;
      const links = (linksRes as CountResult).count || 0;
      if (alive) setCounts({ media: media || 0, files: files || 0, links: links || 0 });
    })();
    return () => { alive = false; };
  }, [open, partner.id, user?.id]);

  const block = async () => {
    if (!user?.id) return;
    const { error } = await supabase.functions.invoke("block-user-manage", {
      body: { action: "block", blocked_id: partner.id },
    });
    if (error) toast.error("Could not block");
    else { toast.success("User blocked"); onClose(); }
  };

  const submitReport = async () => {
    if (!user?.id || !reportReason || submittingReport) return;
    setSubmittingReport(true);
    const { error } = await dbFrom("user_reports").insert({
      reporter_id: user.id,
      reported_id: partner.id,
      reason: reportReason,
    });
    setSubmittingReport(false);
    if (error) {
      console.error("[ChatHeaderProfileSheet] report submit failed", error);
      toast.error("Couldn't submit report — please try again.");
      return;
    }
    toast.success("Report submitted. Our team will review it.");
    setShowReport(false);
    setReportReason(null);
  };

  // last_seen_at can be missing or malformed; only show the line for a valid
  // date so we never render "last seen Invalid Date" to the user.
  const lastSeenLabel = (() => {
    if (!lastSeen) return null;
    const d = new Date(lastSeen);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
  })();

  const QuickBtn = ({ icon: Icon, label, onClick, active }: QuickBtnProps) => (
    <button type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 active:scale-95 transition-all ${
        active ? "border-primary/35 bg-primary/10 shadow-sm" : "border-white/10 bg-background/45 hover:bg-muted/30"
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-foreground"}`} />
      <span className="text-[11px] font-black">{label}</span>
    </button>
  );

  const StatRow = ({ icon: Icon, label, count }: StatRowProps) => (
    <div className="flex items-center justify-between rounded-2xl px-4 py-3 transition-colors hover:bg-muted/20">
      <div className="flex items-center gap-3">
        <div className="zivo-chat-avatar-ring w-9 h-9 rounded-full flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-bold">{label}</span>
      </div>
      <span className="zivo-chat-chip px-2.5 py-1 text-xs font-black text-muted-foreground">{count}</span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="zivo-chat-popover-glass max-h-[88vh] overflow-y-auto rounded-t-[1.75rem] border-white/10 px-0 pb-8 shadow-2xl">
        <div className="zivo-chat-header-glass sticky top-0 z-10 px-5 pt-3 pb-4">
          <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Quick profile</p>
          <p className="text-lg font-black text-foreground">Chat Details</p>
        </div>

        <div className="mx-4 mt-4 flex flex-col items-center rounded-[1.75rem] border border-white/10 bg-background/45 px-5 py-6 shadow-xl backdrop-blur-2xl">
          <div className="zivo-chat-avatar-ring mb-3 rounded-full p-[4px]">
            <Avatar className="h-24 w-24 ring-[3px] ring-background/80">
              <AvatarImage src={partner.avatar || ""} />
              <AvatarFallback className="bg-primary/10 text-2xl font-black text-primary">{partner.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
          </div>
          <h2 className="text-xl font-black leading-tight text-foreground">{partner.name}</h2>
          {partner.username && (
            <div className="mt-1 text-xs font-semibold text-muted-foreground">@{partner.username}</div>
          )}
          {lastSeenLabel && (
            <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
              last seen {lastSeenLabel}
            </div>
          )}
          {bio && (
            <p className="mt-3 line-clamp-3 text-center text-xs leading-relaxed text-muted-foreground">{bio}</p>
          )}
        </div>

        <div className="flex gap-2 px-4 py-4">
          <QuickBtn icon={Phone} label="Audio" onClick={() => onCall?.("audio")} />
          <QuickBtn icon={Video} label="Video" onClick={() => onCall?.("video")} />
          <QuickBtn
            icon={muted ? Bell : BellOff}
            label={muted ? "Unmute" : "Mute"}
            onClick={() => { toggleMute(partner.id); toast.success(muted ? "Unmuted" : "Muted"); }}
            active={muted}
          />
          <QuickBtn icon={Search} label="Search" onClick={() => { onClose(); onOpenSearch?.(); }} />
          <QuickBtn icon={MoreHorizontal} label="More" onClick={() => nav(`/profile/${partner.id}`)} />
        </div>

        <div className="mx-4 rounded-3xl border border-white/10 bg-background/40 p-1 shadow-sm backdrop-blur-xl">
          <StatRow icon={ImageIcon} label="Shared media" count={counts.media} />
          <StatRow icon={FileText} label="Shared files" count={counts.files} />
          <StatRow icon={LinkIcon} label="Shared links" count={counts.links} />
        </div>

        <div className="mx-4 mt-3 rounded-3xl border border-white/10 bg-background/40 p-1 shadow-sm backdrop-blur-xl">
          <button type="button" onClick={() => { onClose(); onClearHistory?.(); }} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-muted/20">
            <span className="zivo-chat-avatar-ring flex h-9 w-9 items-center justify-center rounded-full">
              <Eraser className="w-4 h-4 text-muted-foreground" />
            </span>
            <span className="text-sm font-bold">Clear history</span>
          </button>
          <div>
            <button type="button" onClick={() => { setShowReport(v => !v); setReportReason(null); }} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-muted/20">
              <span className="zivo-chat-avatar-ring flex h-9 w-9 items-center justify-center rounded-full">
                <Flag className="w-4 h-4 text-muted-foreground" />
              </span>
              <span className="text-sm font-bold">Report user</span>
            </button>
            <AnimatePresence>
              {showReport && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-4 pb-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Select a reason:</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {REPORT_REASONS.map(r => (
                      <button type="button" key={r} onClick={() => setReportReason(r)} className={`rounded-full border px-2.5 py-1 text-xs font-black transition-all ${reportReason === r ? "border-destructive bg-destructive text-destructive-foreground" : "border-border/30 bg-background/45 text-muted-foreground"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <button type="button"
                    disabled={!reportReason || submittingReport}
                    onClick={() => { void submitReport(); }}
                    className="w-full rounded-2xl bg-destructive py-2.5 text-xs font-black text-destructive-foreground transition-opacity disabled:opacity-40"
                  >
                    {submittingReport ? "Submitting…" : "Submit Report"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button type="button" onClick={block} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-destructive transition-colors hover:bg-destructive/10">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
              <ShieldOff className="w-4 h-4" />
            </span>
            <span className="text-sm font-black">Block user</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
