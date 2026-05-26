/**
 * RecommendationScoresPage — Transparency: what we recommend for you + scores.
 * Backed by `recommendation_scores` (orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Brain, Sparkles, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ScoreRow { id: string; user_id: string; item_kind: string; item_id: string; score: number; computed_at: string; }

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function RecommendationScoresPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<string>("all");

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ["recommendation-scores-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ScoreRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: ScoreRow[] | null }> } } } } };
      const { data } = await sb.from("recommendation_scores").select("id, user_id, item_kind, item_id, score, computed_at").eq("user_id", user.id).order("score", { ascending: false }).limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const kinds = useMemo(() => {
    const c = new Map<string, number>();
    scores.forEach((s) => c.set(s.item_kind, (c.get(s.item_kind) ?? 0) + 1));
    return Array.from(c.entries()).sort((a, b) => b[1] - a[1]);
  }, [scores]);

  const filtered = useMemo(() => tab === "all" ? scores : scores.filter((s) => s.item_kind === tab), [scores, tab]);

  const stats = useMemo(() => {
    if (scores.length === 0) return { avg: 0, max: 0 };
    const total = scores.reduce((s, x) => s + Number(x.score), 0);
    return { avg: total / scores.length, max: Math.max(...scores.map((s) => Number(s.score))) };
  }, [scores]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Recommendations · ZIVO" description="What we recommend for you." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><Brain className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Recommendations</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">For you</p>
          <p className="text-3xl font-bold mt-1">{scores.length}</p>
          <p className="text-sm text-white/80 mt-1">avg score {stats.avg.toFixed(2)} · top {stats.max.toFixed(2)}</p>
        </motion.div>
        {kinds.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button type="button" onClick={() => setTab("all")} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({scores.length})</button>
            {kinds.map(([k, n]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all", tab === k ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>{k.replace(/_/g, " ")} ({n})</button>
            ))}
          </div>
        )}
        {isLoading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && scores.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Brain className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No recommendations yet</p>
            <p className="text-xs text-muted-foreground">Use the app for a bit — we'll start personalizing your feed and search.</p>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-1.5">
            {filtered.map((s, idx) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 30) * 0.01 }} className="flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border">
                <div className="shrink-0 h-9 w-9 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-ig-gradient" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-secondary text-foreground px-1.5 py-0.5 rounded-full capitalize">{s.item_kind.replace(/_/g, " ")}</span>
                    <p className="text-xs font-mono text-muted-foreground line-clamp-1">{s.item_id.slice(0, 12)}…</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(s.computed_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-ig-gradient">{Number(s.score).toFixed(2)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
