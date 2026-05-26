/**
 * TrustScorePage — Your community trust score with breakdown of signals.
 * Backed by `trust_scores` (orphan). RLS: user views own.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, Sparkles, Flag, AlertTriangle, ThumbsUp, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface TrustRow {
  id: string;
  user_id: string;
  score: number | null;
  factors: Record<string, unknown> | null;
  last_calculated_at: string | null;
  report_count: number | null;
  violation_count: number | null;
  positive_signals: number | null;
  created_at: string;
  updated_at: string;
}

function tier(score: number): { label: string; tone: string; bg: string } {
  if (score >= 85) return { label: "Excellent", tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" };
  if (score >= 65) return { label: "Good",      tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15"    };
  if (score >= 40) return { label: "Fair",      tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15"   };
  return { label: "Needs work", tone: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/15" };
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TrustScorePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: row, isLoading } = useQuery({
    queryKey: ["trust-score", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              maybeSingle: () => Promise<{ data: TrustRow | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("trust_scores")
        .select("id, user_id, score, factors, last_calculated_at, report_count, violation_count, positive_signals, created_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const score = Math.max(0, Math.min(100, Number(row?.score ?? 50)));
  const t = tier(score);
  const factors = useMemo(() => {
    if (!row?.factors || typeof row.factors !== "object") return [] as Array<{ key: string; value: unknown }>;
    return Object.entries(row.factors as Record<string, unknown>).map(([key, value]) => ({ key, value }));
  }, [row]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Trust Score · ZIVO" description="Your community trust score." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Trust Score</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your score</p>
          <p className="text-5xl font-extrabold mt-1">{score.toFixed(0)}<span className="text-2xl text-white/70">/100</span></p>
          <p className="text-sm text-white/90 mt-1 font-bold">{t.label}</p>
          <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${score}%` }} />
          </div>
          {row?.last_calculated_at && (
            <p className="text-[10px] text-white/70 mt-2 inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" /> Updated {formatRelative(row.last_calculated_at)}
            </p>
          )}
        </motion.div>

        {/* 3-stat split */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <ThumbsUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Positive</p>
            </div>
            <p className="text-lg font-extrabold text-foreground">{row?.positive_signals ?? 0}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <Flag className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reports</p>
            </div>
            <p className="text-lg font-extrabold text-foreground">{row?.report_count ?? 0}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Violations</p>
            </div>
            <p className="text-lg font-extrabold text-foreground">{row?.violation_count ?? 0}</p>
          </div>
        </div>

        {isLoading && <div className="h-24 bg-muted animate-pulse rounded-2xl" />}

        {!isLoading && factors.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              {score >= 65 ? <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
              <p className="text-sm font-bold text-foreground">Score factors</p>
            </div>
            <div className="space-y-2">
              {factors.map((f) => (
                <div key={f.key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{f.key.replace(/_/g, " ")}</span>
                  <span className="font-bold text-foreground">{String(f.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={cn("rounded-2xl p-4 border", t.bg)}>
          <p className="text-xs text-foreground/85">
            Your trust score reflects your activity on ZIVO — positive signals like helpful posts and accepted invites raise it; reports and violations lower it. Keep being awesome to climb tiers.
          </p>
        </div>
      </div>
    </SwipeBackContainer>
  );
}
