/**
 * VoicemailsPage — Visual voicemail inbox with playback + transcription.
 * Backed by `voicemails` (orphan). RLS: recipient can SELECT + UPDATE; caller
 * can INSERT. Joined with `public_profiles` for caller name + avatar.
 */
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Voicemail, Sparkles, Play, Pause, Clock, FileText, PhoneOutgoing, MessageSquare, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface VoicemailRow {
  id: string;
  caller_id: string;
  recipient_id: string;
  audio_url: string;
  duration_seconds: number | null;
  transcription: string | null;
  is_read: boolean | null;
  call_history_id: string | null;
  created_at: string;
}

interface CallerProfile {
  id: string;
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

type Tab = "all" | "unread";

function formatDuration(s: number | null): string {
  if (!s) return "0s";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function VoicemailsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expandedTranscript, setExpandedTranscript] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: voicemails = [], isLoading } = useQuery({
    queryKey: ["voicemails", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as VoicemailRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: VoicemailRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("voicemails")
        .select("id, caller_id, recipient_id, audio_url, duration_seconds, transcription, is_read, call_history_id, created_at")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(150);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const callerIds = useMemo(
    () => Array.from(new Set(voicemails.map((v) => v.caller_id).filter(Boolean))),
    [voicemails],
  );

  const { data: callers = [] } = useQuery({
    queryKey: ["voicemail-callers", callerIds.join(",")],
    queryFn: async () => {
      if (callerIds.length === 0) return [] as CallerProfile[];
      const ids = callerIds.join(",");
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (f: string) => Promise<{ data: CallerProfile[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("public_profiles")
        .select("id, user_id, full_name, avatar_url")
        .or(`id.in.(${ids}),user_id.in.(${ids})`);
      return data ?? [];
    },
    enabled: callerIds.length > 0,
    staleTime: 60_000,
  });

  const callerMap = useMemo(() => {
    const m = new Map<string, CallerProfile>();
    callers.forEach((p) => {
      if (p.id) m.set(p.id, p);
      if (p.user_id) m.set(p.user_id, p);
    });
    return m;
  }, [callers]);

  const stats = useMemo(() => ({
    total: voicemails.length,
    unread: voicemails.filter((v) => !v.is_read).length,
    duration: voicemails.reduce((s, v) => s + (v.duration_seconds ?? 0), 0),
  }), [voicemails]);

  const filtered = useMemo(() => {
    let list = voicemails;
    if (tab === "unread") list = list.filter((v) => !v.is_read);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((v) => {
        const caller = callerMap.get(v.caller_id);
        const name = (caller?.full_name ?? "").toLowerCase();
        const transcript = (v.transcription ?? "").toLowerCase();
        return name.includes(q) || transcript.includes(q);
      });
    }
    return list;
  }, [voicemails, tab, query, callerMap]);

  const markRead = async (id: string) => {
    qc.setQueryData<VoicemailRow[]>(["voicemails", user?.id], (old) =>
      (old ?? []).map((v) => (v.id === id ? { ...v, is_read: true } : v)),
    );
    const sb = supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (k: string, v: string) => Promise<{ error: unknown }>;
        };
      };
    };
    await sb.from("voicemails").update({ is_read: true }).eq("id", id);
  };

  const toggle = (v: VoicemailRow) => {
    if (playingId === v.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(v.audio_url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audioRef.current = audio;
    void audio.play().catch(() => setPlayingId(null));
    setPlayingId(v.id);
    if (!v.is_read) void markRead(v.id);
  };

  const toggleTranscript = (id: string) => {
    setExpandedTranscript((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all",    label: "All",    count: stats.total },
    { id: "unread", label: "Unread", count: stats.unread },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Voicemails · ZIVO" description="Visual voicemail inbox." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => { audioRef.current?.pause(); navigate(-1); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Voicemail className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Voicemails</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Inbox</p>
          <p className="text-3xl font-bold mt-1">
            {stats.total} {stats.total === 1 ? "message" : "messages"}
          </p>
          <p className="text-sm text-white/80 mt-1">
            {stats.unread} unread · {formatDuration(stats.duration)} total
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search caller or transcript"
            className="w-full h-11 pl-9 pr-9 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && voicemails.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Voicemail className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No voicemails</p>
            <p className="text-xs text-muted-foreground">Voice messages left when you miss a call will show up here.</p>
          </div>
        )}

        {!isLoading && voicemails.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {query ? "No matches." : "Nothing in this tab."}
          </p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((v, idx) => {
              const isPlaying = playingId === v.id;
              const caller = callerMap.get(v.caller_id);
              const name = caller?.full_name?.trim() || "Unknown";
              const avatar = caller?.avatar_url;
              const unread = !v.is_read;
              const transcriptOpen = expandedTranscript.has(v.id);
              const shortTranscript = v.transcription && v.transcription.length > 120;
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className={cn(
                    "rounded-2xl bg-card border p-3.5 transition-colors",
                    unread ? "border-rose-500/30 bg-rose-500/[0.02]" : "border-border",
                    isPlaying && "ring-1 ring-ig-gradient/40",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Play button */}
                    <button
                      type="button"
                      aria-label={isPlaying ? "Pause voicemail" : "Play voicemail"}
                      onClick={() => toggle(v)}
                      className={cn(
                        "shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all",
                        isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted",
                      )}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
                    </button>

                    {/* Caller avatar */}
                    <div className="relative shrink-0">
                      {avatar ? (
                        <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-ig-gradient flex items-center justify-center text-white text-xs font-extrabold">
                          {initials(name)}
                        </div>
                      )}
                      {unread && (
                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("text-sm line-clamp-1", unread ? "font-extrabold text-foreground" : "font-bold text-foreground")}>{name}</p>
                        {unread && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">New</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" /> {formatDuration(v.duration_seconds)}
                        </span>
                        <span>·</span>
                        <span>{formatRelative(v.created_at)}</span>
                      </div>
                    </div>

                    {/* Call back / open chat */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label="Call back"
                        onClick={() => navigate("/chat")}
                        className="h-8 w-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center active:scale-95 transition-all"
                      >
                        <PhoneOutgoing className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Message"
                        onClick={() => navigate("/chat")}
                        className="h-8 w-8 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center active:scale-95 transition-all"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Transcript */}
                  {v.transcription && (
                    <div className="mt-2.5 pl-14">
                      <button
                        type="button"
                        onClick={() => toggleTranscript(v.id)}
                        className="w-full text-left rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary/60 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Transcript</p>
                          {shortTranscript && (
                            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform ml-auto", transcriptOpen && "rotate-180")} />
                          )}
                        </div>
                        <AnimatePresence initial={false} mode="wait">
                          <motion.p
                            key={transcriptOpen ? "open" : "closed"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={cn(
                              "text-xs text-foreground/85 whitespace-pre-wrap",
                              !transcriptOpen && shortTranscript && "line-clamp-2",
                            )}
                          >
                            "{v.transcription}"
                          </motion.p>
                        </AnimatePresence>
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
