/**
 * AudioRoomsPage — Browse live audio rooms (Clubhouse-style).
 * Backed by `audio_rooms` (orphan, public SELECT). Joined w/ public_profiles.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Radio, Sparkles, Users, Mic, Clock, Hash, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RoomRow {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  topic: string | null;
  cover_url: string | null;
  status: string | null;
  max_speakers: number | null;
  listener_count: number | null;
  is_recording: boolean | null;
  started_at: string | null;
  ended_at: string | null;
}

interface HostProfile { id: string; user_id: string | null; full_name: string | null; avatar_url: string | null; }

type Tab = "live" | "ended";

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function AudioRoomsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("live");

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["audio-rooms"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: RoomRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("audio_rooms")
        .select("id, host_id, title, description, topic, cover_url, status, max_speakers, listener_count, is_recording, started_at, ended_at")
        .order("started_at", { ascending: false })
        .limit(60);
      return data ?? [];
    },
    staleTime: 15_000,
  });

  const hostIds = useMemo(() => Array.from(new Set(rooms.map((r) => r.host_id))), [rooms]);

  const { data: hosts = [] } = useQuery({
    queryKey: ["audio-rooms-hosts", hostIds.join(",")],
    queryFn: async () => {
      if (hostIds.length === 0) return [] as HostProfile[];
      const ids = hostIds.join(",");
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (f: string) => Promise<{ data: HostProfile[] | null }>;
          };
        };
      };
      const { data } = await sb.from("public_profiles").select("id, user_id, full_name, avatar_url").or(`id.in.(${ids}),user_id.in.(${ids})`);
      return data ?? [];
    },
    enabled: hostIds.length > 0,
    staleTime: 60_000,
  });

  const hostMap = useMemo(() => {
    const m = new Map<string, HostProfile>();
    hosts.forEach((p) => { if (p.id) m.set(p.id, p); if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [hosts]);

  const filtered = useMemo(() => {
    if (tab === "live") return rooms.filter((r) => r.status === "live" || !r.ended_at);
    return rooms.filter((r) => r.status !== "live" && r.ended_at);
  }, [rooms, tab]);

  const liveCount = rooms.filter((r) => r.status === "live" || !r.ended_at).length;

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Audio Rooms · ZIVO" description="Live audio rooms." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Radio className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Audio Rooms</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Live now</p>
          <p className="text-3xl font-bold mt-1">{liveCount} {liveCount === 1 ? "room" : "rooms"}</p>
          <p className="text-sm text-white/80 mt-1">Drop in, listen, raise your hand to speak</p>
        </motion.div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("live")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5", tab === "live" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
            <span>Live</span>
            <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === "live" ? "bg-white/20" : "bg-background/60")}>{liveCount}</span>
          </button>
          <button type="button" onClick={() => setTab("ended")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "ended" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Past</button>
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Headphones className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">{tab === "live" ? "No rooms live" : "No past rooms"}</p>
            <p className="text-xs text-muted-foreground">{tab === "live" ? "Be the first to host a room — tap below to start." : "Past rooms with recordings will appear here."}</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((r, idx) => {
              const host = hostMap.get(r.host_id);
              const isLive = r.status === "live" || !r.ended_at;
              return (
                <motion.button
                  key={r.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate(`/voice-rooms/${r.id}`)}
                  className={cn("w-full text-left rounded-2xl bg-card border p-3.5 hover:bg-secondary/40 transition-colors", isLive ? "border-rose-500/30" : "border-border")}
                >
                  <div className="flex items-start gap-3">
                    {r.cover_url ? (
	                      <img src={r.cover_url} alt="" className="shrink-0 h-12 w-12 rounded-xl object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="shrink-0 h-12 w-12 rounded-xl bg-ig-gradient flex items-center justify-center">
                        <Mic className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isLive && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400"><span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />Live</span>}
                        <p className="text-sm font-bold text-foreground line-clamp-1">{r.title}</p>
                      </div>
                      {r.topic && <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-0.5"><Hash className="h-2.5 w-2.5" /> {r.topic}</p>}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                        <span>by {host?.full_name?.trim() || "Host"}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {r.listener_count ?? 0}</span>
                        {r.started_at && (<><span>·</span><span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(r.started_at)}</span></>)}
                        {r.is_recording && (<><span>·</span><span className="text-rose-600 dark:text-rose-400 font-bold">REC</span></>)}
                      </div>
                      {r.description && <p className="text-xs text-foreground/85 line-clamp-2 mt-1.5">{r.description}</p>}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
