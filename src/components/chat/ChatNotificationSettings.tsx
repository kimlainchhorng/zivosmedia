/**
 * ChatNotificationSettings — Mute/unmute, custom tones, DND scheduling per conversation
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import Bell from "lucide-react/dist/esm/icons/bell";
import Volume2 from "lucide-react/dist/esm/icons/volume-2";
import Clock from "lucide-react/dist/esm/icons/clock";
import X from "lucide-react/dist/esm/icons/x";
import Check from "lucide-react/dist/esm/icons/check";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatNotificationSettingsProps {
  open: boolean;
  onClose: () => void;
  chatPartnerId: string;
  chatPartnerName: string;
}

interface ChatNotificationSettingsRow {
  is_muted: boolean | null;
  mute_until: string | null;
  notification_tone: string | null;
  dnd_start: string | null;
  dnd_end: string | null;
}

type ChatSettingsUpdate = {
  is_muted?: boolean;
  mute_until?: string | null;
  notification_tone?: string;
  dnd_start?: string | null;
  dnd_end?: string | null;
};

const NOTIFICATION_TONES = [
  { id: "default", label: "Default", emoji: "🔔" },
  { id: "chime", label: "Chime", emoji: "🎵" },
  { id: "ping", label: "Ping", emoji: "📢" },
  { id: "bubble", label: "Bubble", emoji: "💬" },
  { id: "silent", label: "Silent", emoji: "🔕" },
];

const MUTE_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "8 hours", hours: 8 },
  { label: "1 day", hours: 24 },
  { label: "1 week", hours: 168 },
  { label: "Forever", hours: 0 },
];

export default function ChatNotificationSettings({ open, onClose, chatPartnerId, chatPartnerName }: ChatNotificationSettingsProps) {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [muteUntil, setMuteUntil] = useState<string | null>(null);
  const [tone, setTone] = useState("default");
  const [dndStart, setDndStart] = useState("");
  const [dndEnd, setDndEnd] = useState("");
  const [showMuteOptions, setShowMuteOptions] = useState(false);

  useEffect(() => {
    if (!open || !user?.id) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("chat_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("chat_partner_id", chatPartnerId)
        .maybeSingle();
      if (data) {
        const settings = data as ChatNotificationSettingsRow;
        setIsMuted(settings.is_muted || false);
        setMuteUntil(settings.mute_until);
        setTone(settings.notification_tone || "default");
        setDndStart(settings.dnd_start || "");
        setDndEnd(settings.dnd_end || "");
      }
    };
    load();
  }, [open, user?.id, chatPartnerId]);

  const save = async (updates: ChatSettingsUpdate) => {
    if (!user?.id) return;
    const { error } = await (supabase as any)
      .from("chat_settings" as any)
      .upsert({
        user_id: user.id,
        chat_partner_id: chatPartnerId,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,chat_partner_id" });
    if (error) toast.error("Failed to save settings");
  };

  const handleMute = async (hours: number) => {
    const until = hours > 0 ? new Date(Date.now() + hours * 3600000).toISOString() : null;
    setIsMuted(true);
    setMuteUntil(until);
    setShowMuteOptions(false);
    await save({ is_muted: true, mute_until: until });
    toast.success(hours > 0 ? `Muted for ${MUTE_OPTIONS.find(o => o.hours === hours)?.label}` : "Muted forever");
  };

  const handleUnmute = async () => {
    setIsMuted(false);
    setMuteUntil(null);
    await save({ is_muted: false, mute_until: null });
    toast.success("Notifications unmuted");
  };

  const handleToneChange = async (newTone: string) => {
    setTone(newTone);
    await save({ notification_tone: newTone });
    // Play a preview sound effect
    if (newTone !== "silent") {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const freqMap: Record<string, number> = { default: 800, chime: 1200, ping: 600, bubble: 400 };
        osc.frequency.value = freqMap[newTone] || 800;
        gain.gain.value = 0.1;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        setTimeout(() => { osc.stop(); ctx.close(); }, 400);
      } catch { /* ignore */ }
    }
  };

  const handleDndSave = async () => {
    await save({ dnd_start: dndStart || null, dnd_end: dndEnd || null });
    toast.success("Do Not Disturb schedule saved");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end justify-center px-2 sm:px-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-md" />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="zivo-chat-popover-glass relative w-full max-w-md max-h-[82vh] overflow-y-auto rounded-t-[1.75rem] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="zivo-chat-header-glass sticky top-0 z-10 px-5 pt-5 pb-4 pt-safe">
            <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Sound & silence</p>
                <h3 className="truncate text-lg font-black text-foreground">Notification Settings</h3>
              </div>
              <button type="button" onClick={onClose} className="zivo-chat-icon-button h-9 w-9" aria-label="Close notification settings">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{chatPartnerName}</p>
          </div>

          <div className="p-5 space-y-6">
            {/* Mute/Unmute */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                {isMuted ? <BellOff className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4 text-primary" />}
                Mute Notifications
              </h4>
              {isMuted ? (
                <div className="space-y-2">
                  <div className="zivo-chat-card flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground">Muted</p>
                      <p className="truncate text-[10px] font-semibold text-muted-foreground">
                        {muteUntil ? `Until ${new Date(muteUntil).toLocaleString()}` : "Forever"}
                      </p>
                    </div>
                    <button type="button" onClick={handleUnmute} className="zivo-chat-chip-active shrink-0 px-4 py-2 text-xs font-black">
                      Unmute
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <button type="button"
                    onClick={() => setShowMuteOptions(!showMuteOptions)}
                    className="zivo-chat-row w-full justify-between p-4 text-left text-sm font-bold text-foreground"
                  >
                    <span>Tap to mute this chat</span>
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {showMuteOptions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {MUTE_OPTIONS.map((opt) => (
                            <button type="button"
                              key={opt.hours}
                              onClick={() => handleMute(opt.hours)}
                              className="zivo-chat-chip justify-center px-3 py-3 text-xs font-black text-foreground"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Notification Tone */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                Notification Sound
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {NOTIFICATION_TONES.map((t) => (
                  <button type="button"
                    key={t.id}
                    onClick={() => handleToneChange(t.id)}
                    className={`relative flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-all ${
                      tone === t.id ? "zivo-chat-row-unread border-primary/45 text-primary shadow-lg" : "border-border/40 bg-background/35 hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    <span className="text-[9px] font-black text-foreground">{t.label}</span>
                    {tone === t.id && <Check className="absolute right-2 top-2 h-3 w-3 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Do Not Disturb */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Do Not Disturb Schedule
              </h4>
              <div className="zivo-chat-card flex items-center gap-3 p-3">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground mb-1 block font-bold uppercase tracking-[0.14em]">Start</label>
                  <input
                    type="time"
                    value={dndStart}
                    onChange={(e) => setDndStart(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground"
                  />
                </div>
                <span className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">to</span>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground mb-1 block font-bold uppercase tracking-[0.14em]">End</label>
                  <input
                    type="time"
                    value={dndEnd}
                    onChange={(e) => setDndEnd(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground"
                  />
                </div>
              </div>
              {(dndStart || dndEnd) && (
                <button type="button" onClick={handleDndSave} className="zivo-chat-chip-active mt-3 h-11 w-full justify-center text-sm font-black">
                  Save Schedule
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
