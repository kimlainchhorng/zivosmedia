/**
 * PointsHistoryPage — Loyalty points ledger with running balance.
 * Backed by `points_ledger` (orphan). RLS: users see own rows.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Coins, Sparkles, ArrowDownLeft, ArrowUpRight, Award, AlertCircle, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type LedgerType = "earn" | "redeem" | "bonus" | "adjust" | "expire";

interface LedgerRow {
  id: string;
  user_id: string;
  points_amount: number;
  balance_after: number;
  transaction_type: LedgerType;
  source: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

type Tab = "all" | "earn" | "redeem" | "bonus";

function formatCount(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TYPE_META: Record<LedgerType, { icon: typeof Award; label: string; tone: string; chipBg: string }> = {
  earn:   { icon: ArrowDownLeft, label: "Earned",  tone: "text-emerald-600 dark:text-emerald-400", chipBg: "bg-emerald-500/15" },
  bonus:  { icon: Award,         label: "Bonus",   tone: "text-amber-600 dark:text-amber-400",     chipBg: "bg-amber-500/15"   },
  redeem: { icon: ArrowUpRight,  label: "Redeemed",tone: "text-rose-600 dark:text-rose-400",       chipBg: "bg-rose-500/15"    },
  adjust: { icon: RotateCcw,     label: "Adjust",  tone: "text-blue-600 dark:text-blue-400",       chipBg: "bg-blue-500/15"    },
  expire: { icon: AlertCircle,   label: "Expired", tone: "text-muted-foreground",                  chipBg: "bg-secondary"      },
};

export default function PointsHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["points-ledger", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as LedgerRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: LedgerRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("points_ledger")
        .select("id, user_id, points_amount, balance_after, transaction_type, source, reference_id, description, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const currentBalance = rows[0]?.balance_after ?? 0;

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        if (r.transaction_type === "earn") acc.earned += r.points_amount;
        else if (r.transaction_type === "bonus") acc.bonus += r.points_amount;
        else if (r.transaction_type === "redeem") acc.redeemed += Math.abs(r.points_amount);
        else if (r.transaction_type === "expire") acc.expired += Math.abs(r.points_amount);
        return acc;
      },
      { earned: 0, bonus: 0, redeemed: 0, expired: 0 },
    );
  }, [rows]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "all", label: "All" },
    { id: "earn", label: "Earned" },
    { id: "redeem", label: "Redeemed" },
    { id: "bonus", label: "Bonus" },
  ];

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((r) => r.transaction_type === tab);
  }, [rows, tab]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Points · ZIVO" description="Your loyalty points history." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Points</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Balance</p>
          <p className="text-4xl font-extrabold leading-tight mt-1">{formatCount(currentBalance)} pts</p>
          <p className="text-sm text-white/80 mt-1">
            {rows.length} transaction{rows.length === 1 ? "" : "s"} on record
          </p>
        </motion.div>

        {/* 3-stat lifetime split */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Earned</p>
            </div>
            <p className="text-lg font-extrabold text-foreground">{formatCount(totals.earned)}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <Award className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bonus</p>
            </div>
            <p className="text-lg font-extrabold text-foreground">{formatCount(totals.bonus)}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Used</p>
            </div>
            <p className="text-lg font-extrabold text-foreground">{formatCount(totals.redeemed)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Coins className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No points activity yet</p>
            <p className="text-xs text-muted-foreground">Complete actions, post content, or check in daily to start earning points.</p>
          </div>
        )}

        {!isLoading && rows.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nothing in this tab.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((r, idx) => {
              const meta = TYPE_META[r.transaction_type] ?? TYPE_META.adjust;
              const Icon = meta.icon;
              const isDebit = r.transaction_type === "redeem" || r.transaction_type === "expire";
              const signed = isDebit ? -Math.abs(r.points_amount) : Math.abs(r.points_amount);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.chipBg)}>
                    <Icon className={cn("h-4 w-4", meta.tone)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", meta.chipBg, meta.tone)}>
                        {meta.label}
                      </span>
                      <p className="text-sm font-bold text-foreground line-clamp-1">
                        {r.description ?? r.source ?? meta.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{formatRelative(r.created_at)}</span>
                      {r.source && r.description && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{r.source.replace(/_/g, " ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-extrabold", meta.tone)}>
                      {signed > 0 ? "+" : ""}{formatCount(signed)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">bal {formatCount(r.balance_after)}</p>
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
