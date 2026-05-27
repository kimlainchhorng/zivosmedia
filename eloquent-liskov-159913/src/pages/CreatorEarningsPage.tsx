/**
 * CreatorEarningsPage — Daily earnings breakdown for creators.
 * Backed by the real `creator_earnings` table with 4 revenue streams:
 * ads, content sales, subscriptions, tips.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, TrendingUp, Heart, Crown, ShoppingBag, Video, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface EarningsRow {
  id: string;
  date: string;
  ad_revenue_cents: number | null;
  content_sales_cents: number | null;
  subscriptions_cents: number | null;
  tips_cents: number | null;
  total_cents: number | null;
}

type Range = "7d" | "30d" | "90d" | "ytd";

function formatCents(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

function rangeStartIso(r: Range): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const map: Record<Range, Date> = {
    "7d": new Date(now.getTime() - 7 * 86400 * 1000),
    "30d": new Date(now.getTime() - 30 * 86400 * 1000),
    "90d": new Date(now.getTime() - 90 * 86400 * 1000),
    "ytd": startOfYear,
  };
  return map[r].toISOString().slice(0, 10);
}

export default function CreatorEarningsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("30d");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["creator-earnings", user?.id, range],
    queryFn: async () => {
      if (!user?.id) return [] as EarningsRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              gte: (k: string, v: string) => {
                order: (k: string, opts: { ascending: boolean }) => Promise<{ data: EarningsRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("creator_earnings")
        .select("id, date, ad_revenue_cents, content_sales_cents, subscriptions_cents, tips_cents, total_cents")
        .eq("creator_id", user.id)
        .gte("date", rangeStartIso(range))
        .order("date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        ad: acc.ad + (r.ad_revenue_cents ?? 0),
        content: acc.content + (r.content_sales_cents ?? 0),
        subs: acc.subs + (r.subscriptions_cents ?? 0),
        tips: acc.tips + (r.tips_cents ?? 0),
        total: acc.total + (r.total_cents ?? 0),
      }),
      { ad: 0, content: 0, subs: 0, tips: 0, total: 0 },
    );
  }, [rows]);

  const breakdown = [
    { key: "ad", label: "Ad revenue", icon: TrendingUp, value: totals.ad },
    { key: "content", label: "Content sales", icon: ShoppingBag, value: totals.content },
    { key: "subs", label: "Subscriptions", icon: Crown, value: totals.subs },
    { key: "tips", label: "Tips", icon: Heart, value: totals.tips },
  ];

  // Find the max daily total for the sparkline scale.
  const maxDaily = Math.max(1, ...rows.map((r) => r.total_cents ?? 0));

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Earnings · ZIVO" description="Your creator earnings breakdown." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Earnings</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Total</p>
          <p className="text-4xl font-extrabold leading-tight mt-1">{formatCents(totals.total)}</p>
          <p className="text-sm text-white/80 mt-1">
            {rows.length} earning day{rows.length === 1 ? "" : "s"} in this range
          </p>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {(["7d", "30d", "90d", "ytd"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
                range === r ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {r === "ytd" ? "Year to date" : `Last ${r.replace("d", " days")}`}
            </button>
          ))}
        </div>

        {/* Sparkline */}
        {rows.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Daily total</p>
            <div className="flex items-end gap-0.5 h-24">
              {[...rows].reverse().map((r, idx) => {
                const total = r.total_cents ?? 0;
                const h = Math.max(2, Math.round((total / maxDaily) * 100));
                return (
                  <motion.div
                    key={r.id}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: idx * 0.015, duration: 0.4, ease: "easeOut" }}
                    className="flex-1 rounded-t bg-ig-gradient min-h-[2px]"
                    title={`${r.date}: ${formatCents(total)}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Revenue breakdown</p>
          <div className="space-y-2.5">
            {breakdown.map((b, idx) => {
              const Icon = b.icon;
              const pct = totals.total > 0 ? Math.round((b.value / totals.total) * 100) : 0;
              return (
                <div key={b.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {b.label}
                    </span>
                    <span className="text-sm font-bold text-foreground">{formatCents(b.value)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      className="h-full bg-ig-gradient rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily rows */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No earnings in this range</p>
            <p className="text-xs text-muted-foreground">
              Earnings appear here as ad revenue, content sales, subscriptions, and tips post.
            </p>
          </div>
        )}

        {!isLoading && rows.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Daily detail</p>
            <div className="space-y-1.5">
              {rows.slice(0, 20).map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-card border border-border"
                >
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <span className="text-sm font-bold text-foreground">{formatCents(r.total_cents ?? 0)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/creator-live-earnings")}
          className="w-full h-12 rounded-2xl bg-ig-gradient text-white font-bold inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-rose-500/25"
        >
          <Video className="h-4 w-4" />
          Open live earnings & cash-out
        </button>
      </div>
    </SwipeBackContainer>
  );
}
