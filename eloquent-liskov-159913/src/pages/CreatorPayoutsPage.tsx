/**
 * CreatorPayoutsPage — Payout history for creators.
 * Backed by `creator_payouts` (orphan, creator-owned).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Banknote, Sparkles, Clock, DollarSign, CheckCircle2, Loader2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Tab = "all" | "paid" | "pending";

interface PayoutRow {
  id: string;
  creator_id: string;
  amount_cents: number;
  fee_cents: number | null;
  net_cents: number;
  method: string | null;
  reference_id: string | null;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

function statusMeta(s: string | null): { label: string; tone: string; bg: string; icon: typeof CheckCircle2 } {
  const lower = (s ?? "").toLowerCase();
  if (lower === "paid" || lower === "completed") return { label: "Paid",    tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", icon: CheckCircle2 };
  if (lower === "processing")                    return { label: "Sending", tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15",   icon: Loader2 };
  if (lower === "failed" || lower === "reversed")return { label: lower,    tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15",    icon: XCircle };
  return { label: "Pending", tone: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/15", icon: AlertCircle };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CreatorPayoutsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["creator-payouts-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as PayoutRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: PayoutRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb.from("creator_payouts").select("id, creator_id, amount_cents, fee_cents, net_cents, method, reference_id, status, period_start, period_end, paid_at, created_at").eq("creator_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    return payouts.reduce(
      (acc, p) => {
        const isPaid = (p.status ?? "").toLowerCase() === "paid" || (p.status ?? "").toLowerCase() === "completed";
        if (isPaid) { acc.paid += p.net_cents; acc.paidCount += 1; }
        else { acc.pending += p.net_cents; acc.pendingCount += 1; }
        return acc;
      },
      { paid: 0, pending: 0, paidCount: 0, pendingCount: 0 },
    );
  }, [payouts]);

  const filtered = useMemo(() => {
    if (tab === "paid") return payouts.filter((p) => ["paid", "completed"].includes((p.status ?? "").toLowerCase()));
    if (tab === "pending") return payouts.filter((p) => !["paid", "completed"].includes((p.status ?? "").toLowerCase()));
    return payouts;
  }, [payouts, tab]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Creator Payouts · ZIVO" description="Your payout history." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Banknote className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Creator Payouts</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Paid out</p>
              <p className="text-2xl font-extrabold leading-tight mt-0.5">${(stats.paid / 100).toFixed(2)}</p>
              <p className="text-[11px] text-white/70">{stats.paidCount} payouts</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Pending</p>
              <p className="text-2xl font-extrabold leading-tight mt-0.5">${(stats.pending / 100).toFixed(2)}</p>
              <p className="text-[11px] text-white/70">{stats.pendingCount} pending</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({payouts.length})</button>
          <button type="button" onClick={() => setTab("paid")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "paid" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Paid ({stats.paidCount})</button>
          <button type="button" onClick={() => setTab("pending")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "pending" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Pending ({stats.pendingCount})</button>
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Banknote className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">{payouts.length === 0 ? "No payouts yet" : "Nothing in this tab"}</p>
            {payouts.length === 0 && <p className="text-xs text-muted-foreground">Earnings will be paid out per your payout schedule and show up here.</p>}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((p, idx) => {
              const meta = statusMeta(p.status);
              const Icon = meta.icon;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.03 }} className="rounded-2xl bg-card border border-border p-3.5">
                  <div className="flex items-start gap-3">
                    <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                      <Icon className={cn("h-4 w-4", meta.tone, p.status?.toLowerCase() === "processing" && "animate-spin")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground inline-flex items-center gap-0.5"><DollarSign className="h-3 w-3" />{(p.net_cents / 100).toFixed(2)}</p>
                        <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full capitalize", meta.bg, meta.tone)}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        {p.period_start && p.period_end && <span>Period: {formatDate(p.period_start)} – {formatDate(p.period_end)}</span>}
                        {p.method && (<><span>·</span><span className="capitalize">{p.method.replace(/_/g, " ")}</span></>)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {p.paid_at ? `Paid ${formatDate(p.paid_at)}` : `Created ${formatDate(p.created_at)}`}</span>
                        {p.fee_cents != null && p.fee_cents > 0 && (<><span>·</span><span>Fee ${(p.fee_cents / 100).toFixed(2)}</span></>)}
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
