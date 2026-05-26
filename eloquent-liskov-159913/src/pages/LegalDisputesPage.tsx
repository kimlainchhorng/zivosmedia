/**
 * LegalDisputesPage — Legal disputes you've filed or are involved in.
 * Backed by `legal_disputes` (orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Scale, Sparkles, Clock, ArrowDownLeft, ArrowUpRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Tab = "all" | "filed" | "against";

interface DisputeRow {
  id: string;
  dispute_type: string;
  service_type: string;
  complainant_id: string | null;
  respondent_id: string | null;
  amount_disputed: number | null;
  currency: string | null;
  description: string | null;
  status: string;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LegalDisputesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["legal-disputes-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as DisputeRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { or: (f: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: DisputeRow[] | null }> } } } };
      const { data } = await sb.from("legal_disputes").select("id, dispute_type, service_type, complainant_id, respondent_id, amount_disputed, currency, description, status, resolution, resolved_at, created_at").or(`complainant_id.eq.${user.id},respondent_id.eq.${user.id}`).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: disputes.length,
    filed: disputes.filter((d) => d.complainant_id === user?.id).length,
    against: disputes.filter((d) => d.respondent_id === user?.id).length,
    resolved: disputes.filter((d) => d.resolved_at).length,
  }), [disputes, user?.id]);

  const filtered = useMemo(() => {
    if (tab === "filed") return disputes.filter((d) => d.complainant_id === user?.id);
    if (tab === "against") return disputes.filter((d) => d.respondent_id === user?.id);
    return disputes;
  }, [disputes, tab, user?.id]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Legal Disputes · ZIVO" description="Disputes you're involved in." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><Scale className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Legal Disputes</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Disputes</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.filed} filed · {stats.against} against you · {stats.resolved} resolved</p>
        </motion.div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
          <button type="button" onClick={() => setTab("filed")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "filed" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Filed ({stats.filed})</button>
          <button type="button" onClick={() => setTab("against")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "against" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Against ({stats.against})</button>
        </div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Scale className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">{disputes.length === 0 ? "No disputes" : "Nothing in this tab"}</p>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((d, idx) => {
              const isFiled = d.complainant_id === user?.id;
              const resolved = !!d.resolved_at;
              return (
                <motion.div key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.03 }} className="rounded-2xl bg-card border border-border p-3.5">
                  <div className="flex items-start gap-3">
                    <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", resolved ? "bg-emerald-500/15" : "bg-amber-500/15")}>
                      {resolved ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground capitalize">{d.dispute_type.replace(/_/g, " ")}</p>
                        <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", isFiled ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400")}>
                          {isFiled ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownLeft className="h-2.5 w-2.5" />}
                          {isFiled ? "Filed" : "Against"}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider bg-secondary text-foreground px-1.5 py-0.5 rounded-full">{d.service_type}</span>
                      </div>
                      {d.description && <p className="text-xs text-foreground/85 line-clamp-2 mt-1">{d.description}</p>}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(d.created_at)}</span>
                        {d.amount_disputed && <><span>·</span><span>${Number(d.amount_disputed).toFixed(2)} {d.currency}</span></>}
                        <span>·</span>
                        <span className="capitalize">{d.status}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
