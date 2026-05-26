/**
 * FlightPriceAlertsPage — Flight-specific price watchers.
 * Backed by `flight_price_alerts` (orphan). RLS: user manages own.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plane, Sparkles, Calendar, Users, Clock, Trash2, TrendingDown, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AlertRow {
  id: string;
  user_id: string;
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  return_date: string | null;
  passengers: number;
  cabin_class: string;
  target_price: number | null;
  lowest_seen_price: number | null;
  current_price: number | null;
  last_checked_at: string | null;
  alert_triggered: boolean | null;
  is_active: boolean | null;
  created_at: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function FlightPriceAlertsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["flight-price-alerts-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as AlertRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: AlertRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("flight_price_alerts")
        .select("id, user_id, origin_iata, destination_iata, departure_date, return_date, passengers, cabin_class, target_price, lowest_seen_price, current_price, last_checked_at, alert_triggered, is_active, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: alerts.length,
    active: alerts.filter((a) => a.is_active).length,
    triggered: alerts.filter((a) => a.alert_triggered).length,
  }), [alerts]);

  const remove = async (id: string) => {
    qc.setQueryData<AlertRow[]>(["flight-price-alerts-me", user?.id], (old) => (old ?? []).filter((a) => a.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("flight_price_alerts").delete().eq("id", id);
    if (error) { toast.error("Couldn't remove"); qc.invalidateQueries({ queryKey: ["flight-price-alerts-me", user?.id] }); }
    else toast.success("Alert removed");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Flight Price Alerts · ZIVO" description="Your flight price watchers." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Plane className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Flight Price Alerts</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Watching</p>
          <p className="text-3xl font-bold mt-1">{stats.active} flights</p>
          <p className="text-sm text-white/80 mt-1">{stats.triggered} hit your target · {stats.total} total</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && alerts.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Plane className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No flight alerts</p>
            <p className="text-xs text-muted-foreground mb-4">Set a target price on any flight search and we'll watch for drops.</p>
            <Button onClick={() => navigate("/flights")} className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0">
              Search flights
            </Button>
          </div>
        )}

        {!isLoading && alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, idx) => {
              const target = Number(a.target_price ?? 0);
              const cur = Number(a.current_price ?? 0);
              const low = Number(a.lowest_seen_price ?? 0);
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className={cn("rounded-2xl bg-card border p-3.5", a.alert_triggered ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-border")}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", a.alert_triggered ? "bg-emerald-500/15" : "bg-ig-gradient/10")}>
                      {a.alert_triggered ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Plane className="h-4 w-4 text-ig-gradient" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-base font-bold text-foreground">
                        <span>{a.origin_iata}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{a.destination_iata}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> {formatDate(a.departure_date)}{a.return_date && ` – ${formatDate(a.return_date)}`}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {a.passengers}</span>
                        <span>·</span>
                        <span className="capitalize">{a.cabin_class}</span>
                        {a.alert_triggered && (<><span>·</span><span className="text-emerald-600 dark:text-emerald-400 font-bold">Triggered</span></>)}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => remove(a.id)}
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {(target || cur || low) > 0 && (
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-secondary/50 p-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target</p>
                        <p className="text-sm font-extrabold text-foreground">${target.toFixed(0)}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Now</p>
                        <p className={cn("text-sm font-extrabold", cur > 0 && cur <= target ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>${cur.toFixed(0)}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-0.5">
                          <TrendingDown className="h-2.5 w-2.5" /> Lowest
                        </p>
                        <p className="text-sm font-extrabold text-foreground">${low.toFixed(0)}</p>
                      </div>
                    </div>
                  )}
                  {a.last_checked_at && (
                    <p className="text-[10px] text-muted-foreground mt-2 inline-flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> Last checked {formatRelative(a.last_checked_at)}
                    </p>
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
