/**
 * GameScoresPage — Your mini-game scores and best runs.
 * Backed by the real `game_scores` table.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gamepad2, Trophy, Clock, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ScoreRow {
  id: string;
  game_id: string;
  score: number;
  level: number | null;
  played_at: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface GameStat {
  gameId: string;
  best: number;
  bestLevel: number | null;
  plays: number;
  lastPlayed: string | null;
}

export default function GameScoresPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ["game-scores", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ScoreRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: ScoreRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("game_scores")
        .select("id, game_id, score, level, played_at")
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const stats = useMemo<GameStat[]>(() => {
    const map = new Map<string, GameStat>();
    for (const s of scores) {
      const cur = map.get(s.game_id);
      if (!cur) {
        map.set(s.game_id, {
          gameId: s.game_id,
          best: s.score,
          bestLevel: s.level,
          plays: 1,
          lastPlayed: s.played_at,
        });
      } else {
        cur.plays++;
        if (s.score > cur.best) {
          cur.best = s.score;
          cur.bestLevel = s.level;
        }
        if (s.played_at && (!cur.lastPlayed || new Date(s.played_at) > new Date(cur.lastPlayed))) {
          cur.lastPlayed = s.played_at;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.best - a.best);
  }, [scores]);

  const grandTotal = scores.reduce((s, x) => s + x.score, 0);
  const personalBest = scores[0]?.score ?? 0;

  // Recent plays (chronological)
  const recent = useMemo(() =>
    [...scores]
      .sort((a, b) => (b.played_at ? new Date(b.played_at).getTime() : 0) - (a.played_at ? new Date(a.played_at).getTime() : 0))
      .slice(0, 10),
    [scores],
  );

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Game Scores · ZIVO" description="Your personal best mini-game scores." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Gamepad2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Game Scores</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Personal best</p>
          <p className="text-3xl font-bold mt-1">{personalBest.toLocaleString()}</p>
          <p className="text-sm text-white/80 mt-1">
            {scores.length} {scores.length === 1 ? "play" : "plays"} · {grandTotal.toLocaleString()} total points
          </p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && scores.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Gamepad2 className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No game scores yet</p>
            <p className="text-xs text-muted-foreground">
              Play any mini-game on ZIVO and your scores show up here.
            </p>
          </div>
        )}

        {!isLoading && stats.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5">
              <Trophy className="h-3 w-3" /> Top scores by game
            </p>
            <div className="space-y-2">
              {stats.map((g, idx) => (
                <motion.div
                  key={g.gameId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className={cn(
                    "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm",
                    idx < 3 ? "bg-ig-gradient text-white" : "bg-secondary text-foreground",
                  )}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{g.gameId}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.plays} {g.plays === 1 ? "play" : "plays"}
                      {g.bestLevel != null && <> · level {g.bestLevel}</>}
                      {g.lastPlayed && <> · {formatRelative(g.lastPlayed)}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-extrabold text-foreground">{g.best.toLocaleString()}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">best</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {!isLoading && recent.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> Recent plays
            </p>
            <div className="space-y-1.5">
              {recent.map((s, idx) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.game_id}</p>
                    {s.level != null && <span className="text-[10px] text-muted-foreground">lv. {s.level}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-foreground">{s.score.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />{formatRelative(s.played_at)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </SwipeBackContainer>
  );
}
