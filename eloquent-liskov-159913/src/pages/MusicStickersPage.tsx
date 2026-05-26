/**
 * MusicStickersPage — Browse music tracks for story stickers.
 * Backed by `shared_music_tracks` (orphan public catalog).
 */
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Music, Sparkles, Play, Pause, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TrackRow {
  id: string;
  title: string;
  artist: string;
  duration: string;
  cover_emoji: string;
  preview_url: string | null;
  external_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function MusicStickersPage() {
  const navigate = useNavigate();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["shared-music-tracks"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => { select: (s: string) => { eq: (k: string, v: boolean) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: TrackRow[] | null }> } } };
      };
      const { data } = await sb.from("shared_music_tracks").select("id, title, artist, duration, cover_emoji, preview_url, external_url, is_active, sort_order").eq("is_active", true).order("sort_order", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const togglePlay = (t: TrackRow) => {
    if (!t.preview_url) return;
    if (playingId === t.id) { audioRef.current?.pause(); setPlayingId(null); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(t.preview_url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audioRef.current = audio;
    void audio.play().catch(() => setPlayingId(null));
    setPlayingId(t.id);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Music Stickers · ZIVO" description="Music tracks for stories." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => { audioRef.current?.pause(); navigate(-1); }}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><Music className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Music Stickers</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Catalog</p>
          <p className="text-3xl font-bold mt-1">{tracks.length} tracks</p>
          <p className="text-sm text-white/80 mt-1">Tap any to preview · use in your stories</p>
        </motion.div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && tracks.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Music className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No tracks available</p>
          </div>
        )}
        {!isLoading && tracks.length > 0 && (
          <div className="space-y-2">
            {tracks.map((t, idx) => {
              const isPlaying = playingId === t.id;
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 20) * 0.015 }} className={cn("flex items-center gap-3 p-3 rounded-2xl bg-card border", isPlaying ? "border-ig-gradient/40" : "border-border")}>
                  <button type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={() => togglePlay(t)} disabled={!t.preview_url} className={cn("shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all disabled:opacity-40", isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted")}>
                    {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
                  </button>
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-ig-gradient/10 flex items-center justify-center text-2xl">{t.cover_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{t.artist} · {t.duration}</p>
                  </div>
                  {t.external_url && (
                    <a href={t.external_url} target="_blank" rel="noopener noreferrer" aria-label="Open in source" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex items-center justify-center transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
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
