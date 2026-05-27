/**
 * VoiceNotesPage — Your voice messages with transcripts + waveforms.
 * Backed by `voice_notes` (orphan).
 */
import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mic, Play, Pause, Clock, Sparkles, FileText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface VoiceNoteRow {
  id: string;
  audio_url: string;
  duration_seconds: number | null;
  transcript: string | null;
  transcript_lang: string | null;
  conversation_id: string | null;
  message_id: string | null;
  is_listened: boolean | null;
  waveform_data: number[] | null;
  created_at: string | null;
}

function formatDuration(s: number | null): string {
  if (!s) return "0s";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function waveformPath(data: number[] | null, bars = 32): number[] {
  if (!data || data.length === 0) {
    // Synthesize a gentle wave if no data attached.
    return Array.from({ length: bars }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 0.6)));
  }
  // Downsample / pad to `bars`.
  const step = Math.max(1, Math.floor(data.length / bars));
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const v = data[i * step] ?? data[data.length - 1] ?? 0.4;
    out.push(Math.max(0.08, Math.min(1, v)));
  }
  return out;
}

export default function VoiceNotesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["voice-notes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as VoiceNoteRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: VoiceNoteRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("voice_notes")
        .select("id, audio_url, duration_seconds, transcript, transcript_lang, conversation_id, message_id, is_listened, waveform_data, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.transcript?.toLowerCase().includes(q));
  }, [notes, query]);

  const totalDuration = notes.reduce((s, n) => s + (n.duration_seconds ?? 0), 0);
  const unlistened = notes.filter((n) => !n.is_listened).length;

  const toggle = (n: VoiceNoteRow) => {
    if (playingId === n.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(n.audio_url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audioRef.current = audio;
    void audio.play().catch(() => setPlayingId(null));
    setPlayingId(n.id);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Voice Notes · ZIVO" description="Your audio messages." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => { audioRef.current?.pause(); navigate(-1); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Voice Notes</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Library</p>
          <p className="text-3xl font-bold mt-1">{notes.length} {notes.length === 1 ? "note" : "notes"}</p>
          <p className="text-sm text-white/80 mt-1">
            {formatDuration(totalDuration)} total · {unlistened} unlistened
          </p>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search transcripts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Mic className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No voice notes yet</p>
            <p className="text-xs text-muted-foreground">Long-press the mic in chat to record a voice message — they show up here.</p>
          </div>
        )}

        {!isLoading && notes.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No transcripts match your search.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((n, idx) => {
              const isPlaying = playingId === n.id;
              const bars = waveformPath(n.waveform_data);
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl bg-card border transition-colors",
                    isPlaying ? "border-rose-500/30 bg-rose-500/[0.02]" : "border-border",
                  )}
                >
                  <button
                    type="button"
                    aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
                    onClick={() => toggle(n)}
                    className={cn(
                      "shrink-0 h-11 w-11 rounded-full flex items-center justify-center active:scale-95 transition-all",
                      isPlaying
                        ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30"
                        : "bg-secondary text-foreground hover:bg-muted",
                    )}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    {/* Waveform */}
                    <div className="flex items-center gap-0.5 h-7" aria-hidden>
                      {bars.map((v, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex-1 rounded-full",
                            isPlaying ? "bg-ig-gradient" : "bg-foreground/30",
                          )}
                          style={{ height: `${Math.round(v * 100)}%`, minHeight: 3 }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {formatDuration(n.duration_seconds)}
                      </span>
                      <span>·</span>
                      <span>{formatRelative(n.created_at)}</span>
                      {!n.is_listened && (
                        <>
                          <span>·</span>
                          <span className="text-ig-gradient font-bold">New</span>
                        </>
                      )}
                    </div>
                    {n.transcript && (
                      <p className="text-xs text-foreground/85 line-clamp-2 mt-1 inline-flex items-start gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{n.transcript}</span>
                      </p>
                    )}
                  </div>
                  {n.conversation_id && (
                    <button
                      type="button"
                      aria-label="Open conversation"
                      onClick={() => navigate(`/chat?conversation=${n.conversation_id}`)}
                      className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
                    >
                      <X className="h-4 w-4 rotate-45" />
                    </button>
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
