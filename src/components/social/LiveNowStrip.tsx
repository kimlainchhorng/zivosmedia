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
import { ChevronRight, Flame, Mic, MessageCircleQuestion, Radio, UsersRound, Video } from "lucide-react";

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

  const streamCount = items.filter((item) => item.kind === "stream").length;
  const roomCount = items.filter((item) => item.kind === "audio").length;
  const amaCount = items.filter((item) => item.kind === "ama").length;
  const totalAudience = items.reduce((sum, item) => sum + item.viewers, 0);
  const hottestItem = items.reduce<LiveItem | null>(
    (top, item) => (!top || item.viewers > top.viewers ? item : top),
    null,
  );
  const liveMixLabel = streamCount > 0 && roomCount + amaCount > 0
    ? "Video + talk"
    : streamCount > 0
      ? "Video heavy"
      : roomCount > 0
        ? "Audio rooms"
        : "AMA mode";
  const audiencePerSession = items.length > 0 ? Math.round(totalAudience / items.length) : 0;

  return (
    <section aria-label="Live now" className="zivo-social-module mx-2 my-3 overflow-hidden rounded-[1.25rem] px-3 py-3">
      <div className="zivo-social-header-glass mb-2.5 flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="zivo-social-share-orb relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
            <Radio className="h-4 w-4 text-rose-500" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.75)]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-bold text-foreground">Live Now</h3>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {items.length} live {items.length === 1 ? "session" : "sessions"} happening now
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/live")}
          aria-label="Open all live sessions"
          className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-primary active:scale-95"
        >
          See all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <Video className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{streamCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Streams</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mic className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{roomCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Rooms</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
            <MessageCircleQuestion className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{amaCount}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">AMAs</p>
          </div>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Radio className="h-3.5 w-3.5" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black leading-none text-foreground">{compactCount(totalAudience)}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Audience</p>
          </div>
        </div>
      </div>
      {hottestItem && (
        <div className="zivo-social-share-preview mb-2.5 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Happening now</p>
            <p className="truncate text-sm font-bold text-foreground">{hottestItem.name}</p>
          </div>
          <span className="zivo-social-chip shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black text-primary">
            {compactCount(hottestItem.viewers)} live
          </span>
        </div>
      )}
      <div className="zivo-social-module-tile mb-2.5 grid grid-cols-2 gap-2 rounded-2xl px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <Flame className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Live mix</p>
            <p className="truncate text-xs font-black text-foreground">{liveMixLabel}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Avg room</p>
            <p className="truncate text-xs font-black text-foreground">{compactCount(audiencePerSession)} people</p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {items.map((it) => {
          const isHottest = hottestItem?.id === it.id && hottestItem.kind === it.kind;
          const topic = it.kind === "stream" ? null : it.topic;
          return (
          <button
            key={`${it.kind}:${it.id}`}
            type="button"
            onClick={() => navigate(it.path)}
            aria-label={`${it.kind === "audio" ? "Join audio room" : it.kind === "ama" ? "Open AMA" : "Watch live"}: ${it.name}, ${compactCount(it.viewers)} ${it.kind === "audio" ? "listening" : "watching"}`}
            className="zivo-social-module-tile group relative flex w-[96px] shrink-0 flex-col items-center gap-1.5 overflow-hidden rounded-2xl px-2 py-2.5 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            <div className="relative">
              {it.kind === "stream" ? (
                <Avatar className="zivo-social-avatar-ring h-14 w-14 shadow-[0_10px_22px_hsl(210_28%_18%/0.14)] transition-transform group-hover:scale-105">
                  <AvatarImage src={it.avatar || undefined} alt="" />
                  <AvatarFallback className="text-white text-sm font-bold bg-foreground">{initialsOf(it.name)}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="zivo-social-avatar-ring flex h-14 w-14 items-center justify-center rounded-full bg-ig-gradient shadow-[0_10px_22px_hsl(210_28%_18%/0.14)] transition-transform group-hover:scale-105">
                  {it.kind === "audio" ? <Mic className="h-5 w-5 text-white" /> : <MessageCircleQuestion className="h-5 w-5 text-white" />}
                </div>
              )}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] font-bold leading-none text-white shadow-[0_6px_14px_rgba(244,63,94,0.35)]">
                {it.kind === "audio" ? "ROOM" : it.kind === "ama" ? "AMA" : "LIVE"}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-1 w-full">
              {it.name}
            </p>
            {topic && (
              <p className="w-full truncate text-center text-[9px] font-semibold text-muted-foreground">
                {topic}
              </p>
            )}
            <p className="zivo-social-chip rounded-full px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
              {compactCount(it.viewers)} {it.kind === "audio" ? "listening" : "watching"}
            </p>
            {isHottest && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white">
                Top
              </span>
            )}
          </button>
          );
        })}
      </div>
    </section>
  );
}
