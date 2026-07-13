/**
 * TransactionsPage — All financial activity (payments, payouts, refunds, tips, etc.).
 * Backed by `transactions` (orphan). User sees own.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt, Sparkles, ArrowDownLeft, ArrowUpRight, Clock, DollarSign, Gift, RefreshCw, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type TxType = "payment" | "payout" | "refund" | "commission" | "tip" | "bonus" | "adjustment";
type Tab = "all" | "in" | "out";

interface TxRow {
  id: string;
  user_id: string | null;
  type: TxType;
  amount: number;
  currency: string | null;
  status: string | null;
  payment_method: string | null;
  description: string | null;
  created_at: string;
}

const TYPE_META: Record<TxType, { label: string; icon: typeof DollarSign; tone: string; bg: string; out: boolean }> = {
  payment:    { label: "Payment",     icon: ArrowUpRight,  tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15",     out: true  },
  payout:     { label: "Payout",      icon: ArrowDownLeft, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15",  out: false },
  refund:     { label: "Refund",      icon: RefreshCw,     tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15",  out: false },
  commission: { label: "Commission",  icon: Percent,       tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15",    out: true  },
  tip:        { label: "Tip",         icon: Gift,          tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15",     out: false },
  bonus:      { label: "Bonus",       icon: Gift,          tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15",  out: false },
  adjustment: { label: "Adjustment",  icon: RefreshCw,     tone: "text-muted-foreground",                  bg: "bg-secondary",       out: false },
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["transactions-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as TxRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: TxRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("transactions")
        .select("id, user_id, type, amount, currency, status, payment_method, description, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const totals = useMemo(() => {
    return txs.reduce(
      (acc, t) => {
        const m = TYPE_META[t.type];
        const amt = Number(t.amount);
        if (m?.out) acc.out += amt; else acc.in += amt;
        return acc;
      },
      { in: 0, out: 0 },
    );
  }, [txs]);

  const filtered = useMemo(() => {
    if (tab === "in") return txs.filter((t) => !TYPE_META[t.type]?.out);
    if (tab === "out") return txs.filter((t) => TYPE_META[t.type]?.out);
    return txs;
  }, [txs, tab]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Transactions · ZIVO" description="All financial activity." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Transactions</h1>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 inline-flex items-center gap-0.5"><ArrowDownLeft className="h-3 w-3" /> Money in</p>
              <p className="text-2xl font-extrabold leading-tight mt-0.5">${totals.in.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 inline-flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" /> Money out</p>
              <p className="text-2xl font-extrabold leading-tight mt-0.5">${totals.out.toFixed(2)}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({txs.length})</button>
          <button type="button" onClick={() => setTab("in")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "in" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Money in</button>
          <button type="button" onClick={() => setTab("out")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "out" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Money out</button>
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Receipt className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No transactions</p>
            <p className="text-xs text-muted-foreground">Payments, refunds, payouts, tips, and bonuses will appear here.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((t, idx) => {
              const meta = TYPE_META[t.type] ?? TYPE_META.adjustment;
              const Icon = meta.icon;
              const amt = Number(t.amount);
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                    <Icon className={cn("h-4 w-4", meta.tone)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", meta.bg, meta.tone)}>{meta.label}</span>
                      {t.status && t.status !== "completed" && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full capitalize">{t.status}</span>
                      )}
                    </div>
                    {t.description && <p className="text-xs text-foreground/85 line-clamp-1 mt-0.5">{t.description}</p>}
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(t.created_at)}</span>
                      {t.payment_method && (<><span>·</span><span className="capitalize">{t.payment_method.replace(/_/g, " ")}</span></>)}
                    </div>
                  </div>
                  <p className={cn("text-sm font-extrabold shrink-0", meta.tone)}>
                    {meta.out ? "-" : "+"}${amt.toFixed(2)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
