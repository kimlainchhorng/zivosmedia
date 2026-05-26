/**
 * PriceAlertsPage — Travel price alerts you've set (flights, hotels, etc.).
 * Backed by `price_alerts` (orphan).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BellRing, Sparkles, Plane, TrendingDown, TrendingUp, Clock, Trash2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AlertRow {
  id: string;
  user_id: string | null;
  email: string;
  origin_code: string;
  origin_name: string | null;
  destination_code: string;
  destination_name: string | null;
  target_price: number;
  current_price: number | null;
  historical_low: number | null;
  is_active: boolean | null;
  created_at: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PriceAlertsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["price-alerts-me", user?.id],
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
        .from("price_alerts")
        .select("id, user_id, email, origin_code, origin_name, destination_code, destination_name, target_price, current_price, historical_low, is_active, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: alerts.length,
    active: alerts.filter((a) => a.is_active !== false).length,
    triggered: alerts.filter((a) => typeof a.current_price === "number" && a.current_price <= Number(a.target_price)).length,
  }), [alerts]);

  const remove = async (id: string) => {
    qc.setQueryData<AlertRow[]>(["price-alerts-me", user?.id], (old) => (old ?? []).filter((a) => a.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("price_alerts").delete().eq("id", id);
    if (error) { toast.error("Couldn't remove"); qc.invalidateQueries({ queryKey: ["price-alerts-me", user?.id] }); }
    else toast.success("Alert removed");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Price Alerts · ZIVO" description="Your travel price alerts." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <BellRing className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Price Alerts</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Tracking</p>
          <p className="text-3xl font-bold mt-1">{stats.active} active</p>
          <p className="text-sm text-white/80 mt-1">{stats.triggered} hit target · {stats.total} total</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && alerts.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <BellRing className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No price alerts</p>
            <p className="text-xs text-muted-foreground mb-4">Set alerts on flight or hotel searches and we'll notify you when prices drop.</p>
            <Button onClick={() => navigate("/flights")} className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0">
              Search flights
            </Button>
          </div>
        )}

        {!isLoading && alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, idx) => {
              const target = Number(a.target_price);
              const cur = Number(a.current_price ?? 0);
              const low = Number(a.historical_low ?? 0);
              const hit = cur > 0 && cur <= target;
              const trend = cur && low ? (cur < low * 1.05 ? "down" : "up") : "neutral";
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className={cn("rounded-2xl bg-card border p-3.5", hit ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-border")}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", hit ? "bg-emerald-500/15" : "bg-ig-gradient/10")}>
                      {hit ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Plane className="h-4 w-4 text-ig-gradient" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap text-sm">
                        <span className="font-bold text-foreground">{a.origin_name || a.origin_code}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold text-foreground">{a.destination_name || a.destination_code}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(a.created_at)}</span>
                        <span>·</span>
                        <span>Target ${target.toFixed(0)}</span>
                        {a.is_active === false && (<><span>·</span><span className="text-rose-600 dark:text-rose-400">Paused</span></>)}
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
                  {(cur || low) > 0 && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-secondary/50 p-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current</p>
                        <p className={cn("text-base font-extrabold inline-flex items-center gap-1", hit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
                          ${cur.toFixed(0)}
                          {trend === "down" && <TrendingDown className="h-3 w-3" />}
                          {trend === "up" && <TrendingUp className="h-3 w-3" />}
                        </p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Historical low</p>
                        <p className="text-base font-extrabold text-foreground">${low.toFixed(0)}</p>
                      </div>
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
