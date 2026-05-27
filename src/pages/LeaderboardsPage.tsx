/**
 * LeaderboardsPage — Browse global leaderboards with my rank.
 * Backed by `leaderboards` + `leaderboard_entries` (both orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Sparkles, Crown, Medal, Award, Clock, Calendar, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface LeaderboardRow {
  id: string;
  name: string;
  type: string | null;
  game_id: string | null;
  period: string | null;
  reset_at: string | null;
  is_active: boolean | null;
}

interface EntryRow { id: string; leaderboard_id: string; user_id: string; score: number; rank: number | null; }
interface UserProfile { id: string; user_id: string | null; full_name: string | null; avatar_url: string | null; }

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  if (abs < 86_400_000) return ms > 0 ? "today" : "today";
  if (abs < 86_400_000 * 7) return `${ms > 0 ? "in " : ""}${Math.floor(abs / 86_400_000)}d${ms < 0 ? " ago" : ""}`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function rankIcon(r: number): { icon: typeof Crown; color: string } {
  if (r === 1) return { icon: Crown, color: "text-amber-500" };
  if (r === 2) return { icon: Medal, color: "text-slate-400" };
  if (r === 3) return { icon: Award, color: "text-orange-500" };
  return { icon: Trophy, color: "text-muted-foreground" };
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function LeaderboardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: boards = [], isLoading: boardsLoading } = useQuery({
    queryKey: ["leaderboards"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: boolean) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: LeaderboardRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb.from("leaderboards").select("id, name, type, game_id, period, reset_at, is_active").eq("is_active", true).order("name", { ascending: true });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const activeBoardId = selectedId ?? boards[0]?.id ?? null;
  const activeBoard = useMemo(() => boards.find((b) => b.id === activeBoardId), [boards, activeBoardId]);

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["leaderboard-entries", activeBoardId],
    queryFn: async () => {
      if (!activeBoardId) return [] as EntryRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: EntryRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb.from("leaderboard_entries").select("id, leaderboard_id, user_id, score, rank").eq("leaderboard_id", activeBoardId).order("score", { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!activeBoardId,
    staleTime: 30_000,
  });

  const userIds = useMemo(() => Array.from(new Set(entries.map((e) => e.user_id))), [entries]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["leaderboard-profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [] as UserProfile[];
      const csv = userIds.join(",");
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { or: (f: string) => Promise<{ data: UserProfile[] | null }> } } };
      const { data } = await sb.from("public_profiles").select("id, user_id, full_name, avatar_url").or(`id.in.(${csv}),user_id.in.(${csv})`);
      return data ?? [];
    },
    enabled: userIds.length > 0,
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    profiles.forEach((p) => { if (p.id) m.set(p.id, p); if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [profiles]);

  const myEntry = useMemo(() => entries.find((e) => e.user_id === user?.id), [entries, user?.id]);
  const fallbackRank = entries.findIndex((e) => e.user_id === user?.id) + 1;
  const myRank = myEntry?.rank ?? (fallbackRank > 0 ? fallbackRank : null);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Leaderboards · ZIVO" description="Global leaderboards." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Leaderboards</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your rank</p>
          <p className="text-4xl font-extrabold mt-1">{myRank ? `#${myRank}` : "—"}</p>
          <p className="text-sm text-white/80 mt-1">{activeBoard?.name ?? "Pick a board"}{myEntry && ` · ${myEntry.score.toLocaleString()} pts`}</p>
        </motion.div>

        {boardsLoading && <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!boardsLoading && boards.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {boards.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5", b.id === activeBoardId ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}
              >
                {b.type === "global" && <Globe2 className="h-3 w-3" />}
                <span>{b.name}</span>
              </button>
            ))}
          </div>
        )}

        {activeBoard && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="capitalize">{activeBoard.period ?? "all time"}</span>
            {activeBoard.reset_at && (<><span>·</span><span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> Resets {formatRelative(activeBoard.reset_at)}</span></>)}
          </div>
        )}

        {entriesLoading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!entriesLoading && entries.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No entries yet</p>
            <p className="text-xs text-muted-foreground">Be the first to put yourself on this leaderboard.</p>
          </div>
        )}

        {!entriesLoading && entries.length > 0 && (
          <div className="space-y-1.5">
            {entries.map((e, idx) => {
              const rank = e.rank ?? idx + 1;
              const ri = rankIcon(rank);
              const RankIcon = ri.icon;
              const p = profileMap.get(e.user_id);
              const name = p?.full_name?.trim() || "Player";
              const isMe = e.user_id === user?.id;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 20) * 0.015 }}
                  className={cn("flex items-center gap-3 p-2.5 rounded-2xl border", isMe ? "border-ig-gradient/40 bg-ig-gradient/[0.04]" : "border-border bg-card", rank <= 3 && "ring-1 ring-amber-500/20")}
                >
                  <div className="shrink-0 w-8 text-center">
                    {rank <= 3 ? <RankIcon className={cn("h-5 w-5 mx-auto", ri.color)} /> : <span className="text-sm font-extrabold text-muted-foreground">#{rank}</span>}
                  </div>
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="shrink-0 h-9 w-9 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white text-xs font-extrabold">{initials(name)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn("text-sm font-bold line-clamp-1", isMe ? "text-ig-gradient" : "text-foreground")}>{name}</p>
                      {isMe && <span className="text-[9px] font-extrabold uppercase tracking-wider bg-ig-gradient/15 text-ig-gradient px-1.5 py-0.5 rounded-full">You</span>}
                    </div>
                  </div>
                  <p className="text-sm font-extrabold text-foreground tabular-nums">{e.score.toLocaleString()}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
