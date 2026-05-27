/**
 * CallHistoryPage — Premium 2026-style call log
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video,
  Play, Pause, Trash2, Voicemail, ArrowLeft, Loader2,
  Clock, Search, MoreVertical
} from "lucide-react";
import { motion } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ProfileInfo {
  full_name: string | null;
  avatar_url: string | null;
}

interface CallRecord {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: string;
  status: string;
  duration_seconds: number;
  created_at: string;
}

interface VoicemailRecord {
  id: string;
  caller_id: string;
  audio_url: string;
  duration_seconds: number;
  transcription: string | null;
  is_read: boolean;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

function formatCallTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function formatDuration(s: number) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getDateGroup(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

interface CallHistoryPageProps {
  onClose: () => void;
  onCallUser?: (userId: string, type: "voice" | "video") => void;
}

type TabType = "all" | "missed" | "voicemail";

export default function CallHistoryPage({ onClose, onCallUser }: CallHistoryPageProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>("all");
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [voicemails, setVoicemails] = useState<VoicemailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVm, setPlayingVm] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const [callsRes, vmRes] = await Promise.all([
        (supabase as any)
          .from("call_history" as any)
          .select("*")
          .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("voicemails" as any)
          .select("*")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      const callsData: CallRecord[] = callsRes.data || [];
      const vmData: VoicemailRecord[] = vmRes.data || [];
      setCalls(callsData);
      setVoicemails(vmData);

      // Collect unique user IDs to fetch profiles
      const userIds = new Set<string>();
      callsData.forEach((c) => {
        if (c.caller_id !== user.id) userIds.add(c.caller_id);
        if (c.callee_id !== user.id) userIds.add(c.callee_id);
      });
      vmData.forEach((v) => { if (v.caller_id !== user.id) userIds.add(v.caller_id); });

      if (userIds.size > 0) {
        const { data: profilesData } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", Array.from(userIds));
        if (profilesData) {
          const map: Record<string, ProfileInfo> = {};
          (profilesData as ProfileRow[]).forEach((p) => {
            map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
          });
          setProfiles(map);
        }
      }

      setLoading(false);
    };
    load();
  }, [user?.id]);

  const getDisplayName = (userId: string) => {
    return profiles[userId]?.full_name || userId.slice(0, 8) + "...";
  };

  const getInitials = (userId: string) => {
    const name = profiles[userId]?.full_name;
    if (name) {
      const parts = name.trim().split(/\s+/);
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return userId.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (userId: string) => profiles[userId]?.avatar_url || null;

  const deleteVoicemail = async (id: string) => {
    setVoicemails((prev) => prev.filter((v) => v.id !== id));
    await (supabase as any).from("voicemails").delete().eq("id", id);
    toast.success("Voicemail deleted");
  };

  const isMissed = (call: CallRecord) =>
    call.status === "missed" || call.status === "no_answer" || call.status === "declined";

  const filteredCalls = tab === "missed" ? calls.filter(isMissed) : calls;
  const missedCount = calls.filter(isMissed).length;
  const unreadVm = voicemails.filter((v) => !v.is_read).length;

  const getCallMeta = (call: CallRecord) => {
    const isOutgoing = call.caller_id === user?.id;
    const isVideo = call.call_type === "video";

    if (call.status === "missed" || call.status === "no_answer") {
      return {
        icon: <PhoneMissed className="w-[18px] h-[18px]" />,
        label: isOutgoing ? "No Answer" : "Missed Call",
        sublabel: isVideo ? "Video" : "Voice",
        color: "text-red-500",
        bgColor: "bg-red-500/8",
      };
    }
    if (call.status === "declined") {
      return {
        icon: <PhoneMissed className="w-[18px] h-[18px]" />,
        label: "Declined",
        sublabel: isVideo ? "Video" : "Voice",
        color: "text-red-400",
        bgColor: "bg-red-500/8",
      };
    }
    if (isOutgoing) {
      return {
        icon: <PhoneOutgoing className="w-[18px] h-[18px]" />,
        label: isVideo ? "Video Call" : "Voice Call",
        sublabel: "Outgoing",
        color: "text-sky-500",
        bgColor: "bg-sky-500/8",
      };
    }
    return {
      icon: <PhoneIncoming className="w-[18px] h-[18px]" />,
      label: isVideo ? "Video Call" : "Voice Call",
      sublabel: "Incoming",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/8",
    };
  };

  // Group calls by date
  const groupedCalls: Record<string, CallRecord[]> = {};
  filteredCalls.forEach((call) => {
    const group = getDateGroup(call.created_at);
    if (!groupedCalls[group]) groupedCalls[group] = [];
    groupedCalls[group].push(call);
  });

  const tabs: { key: TabType; label: string; badge?: number }[] = [
    { key: "all", label: "All" },
    { key: "missed", label: "Missed", badge: missedCount },
    { key: "voicemail", label: "Voicemail", badge: unreadVm },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl safe-area-top">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 rounded-full hover:bg-muted/50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground flex-1">Calls</h1>
          <button type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-2"
          >
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search calls..."
              className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-3">
          {tabs.map((t) => (
            <button type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {t.label}
              {t.badge && t.badge > 0 ? (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  tab === t.key ? "bg-background text-primary" : "bg-destructive text-white"
                }`}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="h-px bg-border/30" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-52 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading calls...</p>
          </div>
        ) : tab !== "voicemail" ? (
          /* Calls List */
          filteredCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/40 px-8">
              <div className="w-20 h-20 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
                {tab === "missed" ? <PhoneMissed className="h-9 w-9" /> : <Phone className="h-9 w-9" />}
              </div>
              <p className="text-base font-semibold text-muted-foreground/60">
                {tab === "missed" ? "No missed calls" : "No calls yet"}
              </p>
              <p className="text-xs mt-1.5 text-center text-muted-foreground/40">
                {tab === "missed"
                  ? "You haven't missed any calls recently"
                  : "Start a conversation by calling someone"}
              </p>
            </div>
          ) : (
            <div className="pb-6">
              {Object.entries(groupedCalls).map(([group, groupCalls]) => (
                <div key={group}>
                  {/* Date group header */}
                  <div className="px-5 pt-4 pb-2">
                    <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                      {group}
                    </p>
                  </div>

                  {groupCalls.map((call, i) => {
                    const meta = getCallMeta(call);
                    const otherUserId = call.caller_id === user?.id ? call.callee_id : call.caller_id;
                    const isVideo = call.call_type === "video";
                    const missed = isMissed(call);

                    return (
                      <motion.button
                        key={call.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.25 }}
                        onClick={() => onCallUser?.(otherUserId, call.call_type as "voice" | "video")}
                        className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-muted/20 active:bg-muted/40 transition-colors text-left"
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <Avatar className={`h-[52px] w-[52px] ${missed ? "ring-2 ring-red-500/20" : "ring-1 ring-border/10"}`}>
                            {getAvatarUrl(otherUserId) && (
                              <AvatarImage src={getAvatarUrl(otherUserId)!} alt={getDisplayName(otherUserId)} />
                            )}
                            <AvatarFallback className={`text-sm font-bold ${
                              missed ? "bg-red-50 text-red-400 dark:bg-red-500/10" : "bg-muted/60 text-muted-foreground"
                            }`}>
                              {getInitials(otherUserId)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Call type badge */}
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ring-[2.5px] ring-background ${meta.color} ${meta.bgColor}`}>
                            {isVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[15px] font-semibold truncate ${
                            missed ? "text-red-500" : "text-foreground"
                          }`}>
                            {getDisplayName(otherUserId)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`${meta.color}`}>{meta.icon}</span>
                            <span className={`text-[13px] font-medium ${meta.color}`}>{meta.sublabel}</span>
                            <span className="text-muted-foreground/20 text-xs">•</span>
                            <span className="text-[13px] text-muted-foreground/70">{meta.label}</span>
                            {call.duration_seconds > 0 && (
                              <>
                                <span className="text-muted-foreground/20 text-xs">•</span>
                                <span className="text-[12px] text-muted-foreground/60 tabular-nums">
                                  {formatDuration(call.duration_seconds)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Time + callback button */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <p className={`text-[11px] font-medium tabular-nums ${
                            missed ? "text-red-400" : "text-muted-foreground/60"
                          }`}>
                            {format(new Date(call.created_at), "h:mm a")}
                          </p>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            missed
                              ? "bg-red-500/8 text-red-500"
                              : "bg-primary/8 text-primary"
                          }`}>
                            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          )
        ) : (
          /* Voicemail tab */
          voicemails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/40 px-8">
              <div className="w-20 h-20 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
                <Voicemail className="h-9 w-9" />
              </div>
              <p className="text-base font-semibold text-muted-foreground/60">No voicemails</p>
              <p className="text-xs mt-1.5 text-center text-muted-foreground/40">
                When someone leaves you a voicemail, it will appear here
              </p>
            </div>
          ) : (
            <div className="py-2 pb-6">
              {voicemails.map((vm, i) => (
                <motion.div
                  key={vm.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="px-4 py-3.5 flex items-center gap-3.5 hover:bg-muted/20 transition-colors"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-[52px] w-[52px] ring-1 ring-border/10">
                      {getAvatarUrl(vm.caller_id) && (
                        <AvatarImage src={getAvatarUrl(vm.caller_id)!} alt={getDisplayName(vm.caller_id)} />
                      )}
                      <AvatarFallback className="text-sm font-bold bg-amber-50 text-amber-500 dark:bg-amber-500/10">
                        {getInitials(vm.caller_id)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500/10 ring-[2.5px] ring-background flex items-center justify-center text-amber-500">
                      <Voicemail className="w-3 h-3" />
                    </div>
                    {!vm.is_read && (
                      <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-primary ring-[2.5px] ring-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] font-semibold ${!vm.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                      {getDisplayName(vm.caller_id)}
                    </p>
                    {vm.transcription && (
                      <p className="text-[13px] text-muted-foreground/60 truncate mt-0.5">{vm.transcription}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 text-[12px] text-muted-foreground/50">
                      <span>{formatCallTime(vm.created_at)}</span>
                      <span className="text-muted-foreground/20">•</span>
                      <span className="tabular-nums">{formatDuration(vm.duration_seconds)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button"
                      onClick={() => {
                        if (playingVm === vm.id) {
                          setPlayingVm(null);
                        } else {
                          setPlayingVm(vm.id);
                          const audio = new Audio(vm.audio_url);
                          audio.play();
                          audio.onended = () => setPlayingVm(null);
                          if (!vm.is_read) {
                            (supabase as any).from("voicemails").update({ is_read: true }).eq("id", vm.id);
                            setVoicemails((prev) => prev.map((v) => v.id === vm.id ? { ...v, is_read: true } : v));
                          }
                        }
                      }}
                      className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-95 transition-transform"
                    >
                      {playingVm === vm.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                    <button type="button"
                      onClick={() => deleteVoicemail(vm.id)}
                      className="h-10 w-10 rounded-full bg-destructive/8 text-destructive flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}
