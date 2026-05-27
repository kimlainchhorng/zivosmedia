/**
 * ConsentLogPage — Audit trail of what you've consented to.
 * Backed by `user_consent_logs` (orphan).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileCheck, Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ConsentRow {
  id: string;
  user_id: string;
  policy_id: string | null;
  policy_type: string;
  policy_version: string;
  consent_given: boolean;
  consent_method: string;
  ip_address: string | null;
  created_at?: string;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ConsentLogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["user-consent-logs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ConsentRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: ConsentRow[] | null }> } } } };
      const { data } = await sb.from("user_consent_logs").select("id, user_id, policy_id, policy_type, policy_version, consent_given, consent_method, ip_address, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const stats = useMemo(() => ({
    total: logs.length,
    given: logs.filter((l) => l.consent_given).length,
    declined: logs.filter((l) => !l.consent_given).length,
  }), [logs]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Consent Log · ZIVO" description="Your consent audit trail." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><FileCheck className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Consent Log</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Records</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.given} accepted · {stats.declined} declined</p>
        </motion.div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && logs.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><FileCheck className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No consent records</p>
          </div>
        )}
        {!isLoading && logs.length > 0 && (
          <div className="space-y-2">
            {logs.map((l, idx) => (
              <motion.div key={l.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border">
                <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", l.consent_given ? "bg-emerald-500/15" : "bg-rose-500/15")}>
                  {l.consent_given ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-foreground capitalize">{l.policy_type.replace(/_/g, " ")}</p>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full font-mono">v{l.policy_version}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(l.created_at)}</span>
                    <span>·</span>
                    <span className="capitalize">{l.consent_method}</span>
                    {l.ip_address && (<><span>·</span><span className="font-mono">{l.ip_address}</span></>)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
