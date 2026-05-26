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
    const { error } = await dbFrom("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: partner.id });
    if (error) toast.error("Could not block");
    else { toast.success("User blocked"); onClose(); }
  };

  const QuickBtn = ({ icon: Icon, label, onClick, active }: QuickBtnProps) => (
    <button type="button"
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition-all"
    >
      <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-foreground"}`} />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );

  const StatRow = ({ icon: Icon, label, count }: StatRowProps) => (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{count}</span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[88vh] overflow-y-auto">
        <div className="flex flex-col items-center pt-2 pb-4">
          <Avatar className="w-20 h-20 mb-3">
            <AvatarImage src={partner.avatar || ""} />
            <AvatarFallback>{partner.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-semibold">{partner.name}</h2>
          {partner.username && (
            <div className="text-xs text-muted-foreground">@{partner.username}</div>
          )}
          {lastSeen && (
            <div className="text-[11px] text-muted-foreground mt-1">
              last seen {new Date(lastSeen).toLocaleString()}
            </div>
          )}
          {bio && (
            <p className="text-xs text-muted-foreground text-center mt-2 px-6 line-clamp-3">{bio}</p>
          )}
        </div>

        <div className="flex gap-2 px-3 mb-4">
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

        <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30">
          <StatRow icon={ImageIcon} label="Shared media" count={counts.media} />
          <StatRow icon={FileText} label="Shared files" count={counts.files} />
          <StatRow icon={LinkIcon} label="Shared links" count={counts.links} />
        </div>

        <div className="bg-card/60 rounded-xl mx-3 mt-3 divide-y divide-border/30">
          <button type="button" onClick={() => { onClose(); onClearHistory?.(); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
            <Eraser className="w-4 h-4" />
            <span className="text-sm font-medium">Clear history</span>
          </button>
          <div>
            <button type="button" onClick={() => { setShowReport(v => !v); setReportReason(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
              <Flag className="w-4 h-4" />
              <span className="text-sm font-medium">Report user</span>
            </button>
            <AnimatePresence>
              {showReport && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-4 pb-3">
                  <p className="text-xs text-muted-foreground mb-2">Select a reason:</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {REPORT_REASONS.map(r => (
                      <button type="button" key={r} onClick={() => setReportReason(r)} className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${reportReason === r ? "bg-destructive text-destructive-foreground border-destructive" : "bg-muted/40 border-border/30"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <button type="button"
                    disabled={!reportReason}
                    onClick={async () => {
                      if (user?.id) {
                        await dbFrom("user_reports").insert({ reporter_id: user.id, reported_id: partner.id, reason: reportReason });
                      }
                      toast.success("Report submitted. Our team will review it.");
                      setShowReport(false);
                      setReportReason(null);
                    }}
                    className="w-full py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold disabled:opacity-40 transition-opacity"
                  >
                    Submit Report
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button type="button" onClick={block} className="w-full flex items-center gap-3 px-4 py-3 text-left text-destructive hover:bg-destructive/10">
            <ShieldOff className="w-4 h-4" />
            <span className="text-sm font-medium">Block user</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
