/**
 * FitnessActivitiesPage — Strava-style activity log.
 * Backed by the real `fitness_activities` table (orphan).
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Dumbbell, Footprints, Flame, Timer, Activity as ActivityIcon, MapPin, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ActivityRow {
  id: string;
  activity_type: string;
  calories: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  steps: number | null;
  source: string | null;
  recorded_at: string;
}

type Range = "7d" | "30d" | "90d";

function formatDistance(m: number | null): string {
  if (!m) return "—";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${m} m`;
}

function formatDuration(s: number | null): string {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function rangeStartMs(r: Range): number {
  const days = r === "7d" ? 7 : r === "30d" ? 30 : 90;
  return Date.now() - days * 86_400_000;
}

function activityIcon(t: string): typeof Footprints {
  const lower = (t ?? "").toLowerCase();
  if (lower.includes("run") || lower.includes("walk") || lower.includes("step")) return Footprints;
  if (lower.includes("workout") || lower.includes("strength") || lower.includes("gym")) return Dumbbell;
  return ActivityIcon;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FitnessActivitiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("30d");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["fitness-activities", user?.id, range],
    queryFn: async () => {
      if (!user?.id) return [] as ActivityRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              gte: (k: string, v: string) => {
                order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ActivityRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("fitness_activities")
        .select("id, activity_type, calories, distance_meters, duration_seconds, steps, source, recorded_at")
        .eq("user_id", user.id)
        .gte("recorded_at", new Date(rangeStartMs(range)).toISOString())
        .order("recorded_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const totals = useMemo(() => {
    return activities.reduce(
      (acc, a) => ({
        steps: acc.steps + (a.steps ?? 0),
        calories: acc.calories + (a.calories ?? 0),
        distance: acc.distance + (a.distance_meters ?? 0),
        duration: acc.duration + (a.duration_seconds ?? 0),
      }),
      { steps: 0, calories: 0, distance: 0, duration: 0 },
    );
  }, [activities]);

  // Group activities by recorded date.
  const byDate = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    activities.forEach((a) => {
      const key = new Date(a.recorded_at).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [activities]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Fitness · ZIVO" description="Your activity log." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Fitness</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Last {range}</p>
          <p className="text-3xl font-bold mt-1">{totals.steps.toLocaleString()} steps</p>
          <p className="text-sm text-white/80 mt-1">{activities.length} activities logged</p>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {(["7d", "30d", "90d"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
                range === r ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              Last {r.replace("d", " days")}
            </button>
          ))}
        </div>

        {/* Quad stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Footprints className="h-3.5 w-3.5 text-ig-gradient" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Steps</p>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{totals.steps.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="h-3.5 w-3.5 text-ig-gradient" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Calories</p>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{totals.calories.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="h-3.5 w-3.5 text-ig-gradient" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Distance</p>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{formatDistance(totals.distance)}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Timer className="h-3.5 w-3.5 text-ig-gradient" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active time</p>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{formatDuration(totals.duration)}</p>
          </div>
        </div>

        {/* Activity log */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && activities.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No activities yet</p>
            <p className="text-xs text-muted-foreground">Connect a fitness source or log workouts manually.</p>
          </div>
        )}

        {!isLoading && byDate.length > 0 && (
          <div className="space-y-4">
            {byDate.map(([dateKey, list]) => {
              const dayDate = new Date(dateKey);
              const dayLabel = dayDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
              const daySteps = list.reduce((s, a) => s + (a.steps ?? 0), 0);
              return (
                <section key={dateKey}>
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" /> {dayLabel}
                    </p>
                    {daySteps > 0 && (
                      <p className="text-[10px] font-bold text-ig-gradient">{daySteps.toLocaleString()} steps</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {list.map((a, idx) => {
                      const Icon = activityIcon(a.activity_type);
                      return (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                        >
                          <div className="shrink-0 h-9 w-9 rounded-lg bg-ig-gradient text-white flex items-center justify-center">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground capitalize line-clamp-1">{a.activity_type}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                              {a.steps != null && a.steps > 0 && (
                                <span className="inline-flex items-center gap-0.5"><Footprints className="h-2.5 w-2.5" /> {a.steps.toLocaleString()}</span>
                              )}
                              {a.distance_meters != null && a.distance_meters > 0 && (
                                <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {formatDistance(a.distance_meters)}</span>
                              )}
                              {a.duration_seconds != null && a.duration_seconds > 0 && (
                                <span className="inline-flex items-center gap-0.5"><Timer className="h-2.5 w-2.5" /> {formatDuration(a.duration_seconds)}</span>
                              )}
                              {a.calories != null && a.calories > 0 && (
                                <span className="inline-flex items-center gap-0.5"><Flame className="h-2.5 w-2.5" /> {a.calories}</span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground shrink-0">{formatRelative(a.recorded_at)}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
