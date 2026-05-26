/**
 * LiveNowStrip — horizontal strip of live activity surfaced inline in the
 * feed. Aggregates 3 sources so the strip stays useful when any one is
 * quiet: live_streams (video), audio_rooms (Clubhouse-style), and
 * ama_sessions (Q&A). Self-hides when all three are empty.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MessageCircleQuestion } from "lucide-react";

interface LiveStreamRow {
  id: string;
  user_id: string | null;
  title: string | null;
  host_name: string | null;
  host_avatar: string | null;
  viewer_count: number | null;
}

interface AudioRoomRow {
  id: string;
  host_id: string;
  title: string;
  topic: string | null;
  listener_count: number | null;
}

interface AmaSessionRow {
  id: string;
  host_id: string;
  title: string;
  topic: string | null;
  viewer_count: number | null;
}

type LiveItem =
  | { kind: "stream"; id: string; name: string; avatar: string | null; viewers: number; path: string }
  | { kind: "audio";  id: string; name: string; topic: string | null; viewers: number; path: string }
  | { kind: "ama";    id: string; name: string; topic: string | null; viewers: number; path: string };

function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
}

function initialsOf(name: string | null | undefined): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function LiveNowStrip() {
  const navigate = useNavigate();

  const { data: items = [] } = useQuery<LiveItem[]>({
    queryKey: ["feed-live-now-strip-v2"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string | boolean) => {
              is?: (k: string, v: null) => {
                order: (k: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null }> };
              };
              order?: (k: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null }> };
            };
          };
        };
      };

      // 3 queries in parallel — one per live source.
      const [streamsRes, roomsRes, amasRes] = await Promise.all([
        (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { is: (k: string, v: null) => { order: (k: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: LiveStreamRow[] | null }> } } } } } })
          .from("live_streams").select("id, user_id, title, host_name, host_avatar, viewer_count")
          .eq("status", "live").is("ended_at", null)
          .order("viewer_count", { ascending: false }).limit(6),
        (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { is: (k: string, v: null) => { order: (k: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: AudioRoomRow[] | null }> } } } } } })
          .from("audio_rooms").select("id, host_id, title, topic, listener_count")
          .eq("status", "live").is("ended_at", null)
          .order("listener_count", { ascending: false }).limit(4),
        (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: AmaSessionRow[] | null }> } } } } })
          .from("ama_sessions").select("id, host_id, title, topic, viewer_count")
          .eq("status", "live")
          .order("viewer_count", { ascending: false }).limit(3),
      ]);

      const out: LiveItem[] = [];
      (streamsRes.data ?? []).forEach((s) => out.push({
        kind: "stream", id: s.id,
        name: s.host_name || s.title || "Live",
        avatar: s.host_avatar,
        viewers: s.viewer_count ?? 0,
        path: s.user_id ? `/user/${s.user_id}` : "/live",
      }));
      (roomsRes.data ?? []).forEach((r) => out.push({
        kind: "audio", id: r.id,
        name: r.title, topic: r.topic,
        viewers: r.listener_count ?? 0,
        path: "/audio-rooms",
      }));
      (amasRes.data ?? []).forEach((a) => out.push({
        kind: "ama", id: a.id,
        name: a.title, topic: a.topic,
        viewers: a.viewer_count ?? 0,
        path: "/ama",
      }));
      // Streams first (highest engagement), then rooms, then AMAs.
      return out;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });

  if (items.length === 0) return null;

  return (
    <section aria-label="Live now" className="bg-card border-b border-border/10 px-3 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />
          Live Now
        </h3>
        <button type="button" onClick={() => navigate("/live")} className="text-[12px] font-semibold text-primary active:opacity-70">See all</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {items.map((it) => (
          <button
            key={`${it.kind}:${it.id}`}
            type="button"
            onClick={() => navigate(it.path)}
            aria-label={`${it.kind === "audio" ? "Join audio room" : it.kind === "ama" ? "Open AMA" : "Watch live"}: ${it.name}, ${compactCount(it.viewers)} ${it.kind === "audio" ? "listening" : "watching"}`}
            className="shrink-0 flex flex-col items-center gap-1.5 w-[80px] active:opacity-70 transition-opacity"
          >
            <div className="relative">
              {it.kind === "stream" ? (
                <Avatar className="h-14 w-14 border-2 border-border">
                  <AvatarImage src={it.avatar || undefined} alt="" />
                  <AvatarFallback className="text-white text-sm font-bold bg-foreground">{initialsOf(it.name)}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-14 w-14 rounded-full bg-ig-gradient flex items-center justify-center border-2 border-border">
                  {it.kind === "audio" ? <Mic className="h-5 w-5 text-white" /> : <MessageCircleQuestion className="h-5 w-5 text-white" />}
                </div>
              )}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-bold px-1 rounded-full leading-none py-0.5">
                {it.kind === "audio" ? "ROOM" : it.kind === "ama" ? "AMA" : "LIVE"}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-1 w-full">
              {it.name}
            </p>
            <p className="text-[9px] text-muted-foreground">
              {compactCount(it.viewers)} {it.kind === "audio" ? "listening" : "watching"}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
