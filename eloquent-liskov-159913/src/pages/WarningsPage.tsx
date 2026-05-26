/**
 * WarningsPage — Account warnings with acknowledge action.
 * Backed by `user_warnings` (orphan). RLS: user SELECT + UPDATE own.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, Sparkles, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Severity = "mild" | "moderate" | "severe";

interface WarningRow {
  id: string;
  user_id: string;
  warned_by: string | null;
  warning_type: string;
  message: string;
  severity: Severity | string | null;
  is_acknowledged: boolean | null;
  acknowledged_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const SEVERITY_META: Record<string, { tone: string; bg: string; ring: string }> = {
  mild:     { tone: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/15",   ring: "ring-amber-500/30" },
  moderate: { tone: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/15",  ring: "ring-orange-500/40" },
  severe:   { tone: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-500/15",    ring: "ring-rose-500/50" },
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function WarningsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: warnings = [], isLoading } = useQuery({
    queryKey: ["user-warnings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as WarningRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: WarningRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("user_warnings")
        .select("id, user_id, warned_by, warning_type, message, severity, is_acknowledged, acknowledged_at, expires_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: warnings.length,
    unack: warnings.filter((w) => !w.is_acknowledged).length,
    active: warnings.filter((w) => !w.expires_at || new Date(w.expires_at).getTime() > Date.now()).length,
  }), [warnings]);

  const acknowledge = async (id: string) => {
    qc.setQueryData<WarningRow[]>(["user-warnings", user?.id], (old) =>
      (old ?? []).map((w) => (w.id === id ? { ...w, is_acknowledged: true, acknowledged_at: new Date().toISOString() } : w)),
    );
    const sb = supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (k: string, v: string) => Promise<{ error: unknown }>;
        };
      };
    };
    const { error } = await sb.from("user_warnings").update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast.error("Couldn't acknowledge");
      qc.invalidateQueries({ queryKey: ["user-warnings", user?.id] });
    } else {
      toast.success("Acknowledged");
    }
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Warnings · ZIVO" description="Warnings on your account." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Warnings</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Account warnings</p>
          <p className="text-3xl font-bold mt-1">{stats.total === 0 ? "All clear" : `${stats.total} on file`}</p>
          <p className="text-sm text-white/80 mt-1">{stats.unack} need acknowledgement · {stats.active} active</p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>
        )}

        {!isLoading && warnings.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No warnings on file</p>
            <p className="text-xs text-muted-foreground">Your account is in good standing.</p>
          </div>
        )}

        {!isLoading && warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w, idx) => {
              const meta = SEVERITY_META[w.severity ?? "mild"] ?? SEVERITY_META.mild;
              const expired = w.expires_at && new Date(w.expires_at).getTime() < Date.now();
              const ack = !!w.is_acknowledged;
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className={cn(
                    "rounded-2xl p-3.5 border bg-card",
                    !ack && !expired ? `ring-1 ${meta.ring} border-border` : "border-border",
                    expired && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                      <AlertTriangle className={cn("h-4 w-4", meta.tone)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground line-clamp-1 capitalize">{w.warning_type.replace(/_/g, " ")}</p>
                        <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full capitalize", meta.bg, meta.tone)}>
                          {w.severity ?? "mild"}
                        </span>
                        {expired && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">Expired</span>
                        )}
                        {ack && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Ack
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/85 mt-1">{w.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(w.created_at)}</span>
                        {w.expires_at && (
                          <>
                            <span>·</span>
                            <span>{expired ? "Expired" : `Expires ${formatRelative(w.expires_at)}`}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {!ack && !expired && (
                    <button
                      type="button"
                      onClick={() => acknowledge(w.id)}
                      className="mt-3 w-full h-9 rounded-xl bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge
                    </button>
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
