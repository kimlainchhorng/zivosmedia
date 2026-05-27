/**
 * StreaksPage — Your streaks across activities (daily login, post, etc.).
 * Backed by `user_streaks` (orphan). RLS: user views own.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Flame, Sparkles, Trophy, Calendar, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface StreakRow {
  id: string;
  user_id: string;
  streak_type: string;
  current_streak: number | null;
  longest_streak: number | null;
  last_activity_date: string | null;
  started_at: string | null;
  updated_at: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function streakState(s: StreakRow): "active" | "at-risk" | "broken" {
  if (!s.last_activity_date) return "broken";
  const days = Math.floor((Date.now() - new Date(s.last_activity_date).getTime()) / 86_400_000);
  if (days <= 1) return "active";
  if (days <= 2) return "at-risk";
  return "broken";
}

const STATE_META: Record<string, { label: string; tone: string; bg: string }> = {
  active:   { label: "Hot",       tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15"    },
  "at-risk":{ label: "At risk",   tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15"   },
  broken:   { label: "Broken",    tone: "text-muted-foreground",                  bg: "bg-secondary"      },
};

export default function StreaksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: streaks = [], isLoading } = useQuery({
    queryKey: ["user-streaks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as StreakRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: StreakRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("user_streaks")
        .select("id, user_id, streak_type, current_streak, longest_streak, last_activity_date, started_at, updated_at")
        .eq("user_id", user.id)
        .order("current_streak", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const totals = useMemo(() => ({
    active: streaks.filter((s) => streakState(s) === "active").length,
    longest: Math.max(0, ...streaks.map((s) => s.longest_streak ?? 0)),
    sum: streaks.reduce((sum, s) => sum + (s.current_streak ?? 0), 0),
  }), [streaks]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Streaks · ZIVO" description="Your activity streaks." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Streaks</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Active streaks</p>
          <p className="text-5xl font-extrabold mt-1">{totals.active}</p>
          <p className="text-sm text-white/80 mt-1">Longest ever: {totals.longest} days · {totals.sum} total days going</p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>
        )}

        {!isLoading && streaks.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Flame className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No streaks yet</p>
            <p className="text-xs text-muted-foreground">Show up daily — chat, post, or check in — to start your first streak.</p>
          </div>
        )}

        {!isLoading && streaks.length > 0 && (
          <div className="space-y-2">
            {streaks.map((s, idx) => {
              const state = streakState(s);
              const meta = STATE_META[state];
              const current = s.current_streak ?? 0;
              const longest = s.longest_streak ?? 0;
              const pct = longest > 0 ? Math.min(100, (current / longest) * 100) : 0;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="rounded-2xl bg-card border border-border p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center", meta.bg)}>
                      <Flame className={cn("h-5 w-5", meta.tone, state === "active" && "animate-pulse")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground capitalize">{s.streak_type.replace(/_/g, " ")}</p>
                        <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", meta.bg, meta.tone)}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5"><Trophy className="h-2.5 w-2.5" /> Best {longest}d</span>
                        {s.last_activity_date && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> Last {formatDate(s.last_activity_date)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-extrabold text-ig-gradient inline-flex items-center gap-0.5">
                        <Zap className="h-4 w-4" />{current}
                      </p>
                      <p className="text-[10px] text-muted-foreground">days</p>
                    </div>
                  </div>
                  {longest > 0 && (
                    <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-ig-gradient transition-all" style={{ width: `${pct}%` }} />
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
