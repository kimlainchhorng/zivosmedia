/**
 * TwoStepAuthPage — Status + manage your 2-step verification.
 * Backed by `two_step_auth` (orphan, user-owned). Read-only view + toggle.
 * Hashes/secrets stay server-side; we only expose enabled/hint/recovery email.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, Sparkles, ShieldOff, Mail, Clock, ChevronRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TwoStepRow {
  user_id: string;
  hint: string | null;
  recovery_email: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TwoStepAuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [toggling, setToggling] = useState(false);

  const { data: row, isLoading } = useQuery({
    queryKey: ["two-step-auth", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              maybeSingle: () => Promise<{ data: TwoStepRow | null }>;
            };
          };
        };
      };
      const { data } = await sb.from("two_step_auth").select("user_id, hint, recovery_email, enabled, created_at, updated_at").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const toggle = async () => {
    if (!user?.id || !row) return;
    setToggling(true);
    const next = !row.enabled;
    qc.setQueryData<TwoStepRow | null>(["two-step-auth", user.id], (old) => old ? { ...old, enabled: next } : old);
    const sb = supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
      };
    };
    const { error } = await sb.from("two_step_auth").update({ enabled: next, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    setToggling(false);
    if (error) { toast.error("Couldn't update"); qc.invalidateQueries({ queryKey: ["two-step-auth", user.id] }); }
    else toast.success(next ? "2-step enabled" : "2-step disabled");
  };

  const configured = !!row;
  const enabled = !!row?.enabled;

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="2-Step Verification · ZIVO" description="Two-step verification status." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">2-Step Verification</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Status</p>
          <p className="text-3xl font-bold mt-1">{!configured ? "Not set up" : enabled ? "Enabled" : "Disabled"}</p>
          <p className="text-sm text-white/80 mt-1">Adds a second password on top of your normal sign-in</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && !configured && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Not yet configured</p>
                <p className="text-xs text-muted-foreground mt-0.5">Set up a 2-step password so a stolen account password alone isn't enough to sign in.</p>
              </div>
            </div>
            <Button onClick={() => navigate("/account/security")} className="w-full bg-ig-gradient text-white font-bold rounded-full h-10 hover:opacity-90 border-0">
              Set up 2-step
            </Button>
          </div>
        )}

        {!isLoading && configured && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", enabled ? "bg-emerald-500/15" : "bg-secondary")}>
                {enabled ? <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{enabled ? "Active" : "Configured but off"}</p>
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> Last updated {formatRelative(row?.updated_at ?? null)}</p>
              </div>
              <button
                type="button"
                onClick={toggle}
                disabled={toggling}
                className={cn("h-9 px-4 rounded-full text-xs font-bold inline-flex items-center transition-all disabled:opacity-50", enabled ? "bg-secondary hover:bg-muted text-foreground" : "bg-ig-gradient text-white shadow-sm")}
              >
                {toggling ? "…" : enabled ? "Disable" : "Enable"}
              </button>
            </div>

            {row?.hint && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Hint</p>
                  <p className="text-xs text-foreground mt-0.5">{row.hint}</p>
                </div>
              </div>
            )}

            {row?.recovery_email && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
                <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Recovery email</p>
                  <p className="text-xs font-mono text-foreground mt-0.5">{row.recovery_email}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate("/account/security")}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary text-foreground text-xs font-bold transition-colors"
            >
              <span>Change password or hint</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="rounded-2xl p-4 bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/85">2-step adds a memorable password layered on top of your account login. Both must be correct on a new device — your normal password alone won't get someone in if your email or device is compromised.</p>
        </div>
      </div>
    </SwipeBackContainer>
  );
}
