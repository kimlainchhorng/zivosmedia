/**
 * SplitBillsPage — Splitwise-style group expense tracker.
 * Backed by `group_expenses` + `group_expense_shares` (both orphan).
 *
 * Shows: who owes you, who you owe, recent group expenses, settlement
 * status. Pulls expenses where the signed-in user is either a payer or
 * has a share assigned.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt, TrendingUp, TrendingDown, Users, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ExpenseRow {
  id: string;
  group_id: string;
  title: string;
  total_cents: number;
  currency: string;
  paid_by: string;
  category: string | null;
  created_at: string;
}

interface ShareRow {
  expense_id: string;
  user_id: string;
  share_cents: number;
  settled_at: string | null;
}

function formatCents(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SplitBillsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // My shares — what I owe (or paid) across expenses.
  const { data: shares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ["my-expense-shares", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ShareRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => Promise<{ data: ShareRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("group_expense_shares")
        .select("expense_id, user_id, share_cents, settled_at")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const expenseIds = useMemo(() => shares.map((s) => s.expense_id), [shares]);

  // The actual expense rows for my shares + any I paid for.
  const { data: expenses = [] } = useQuery({
    queryKey: ["my-expenses", user?.id, expenseIds.join(",")],
    queryFn: async () => {
      if (!user?.id) return [] as ExpenseRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (cond: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: ExpenseRow[] | null }>;
              };
            };
          };
        };
      };
      // Expenses I paid OR have a share in.
      const inList = expenseIds.length > 0 ? `,id.in.(${expenseIds.join(",")})` : "";
      const { data } = await sb
        .from("group_expenses")
        .select("id, group_id, title, total_cents, currency, paid_by, category, created_at")
        .or(`paid_by.eq.${user.id}${inList}`)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Per-expense, sum all shares to compute who-owes-who totals.
  const { data: allSharesForExpenses = [] } = useQuery({
    queryKey: ["all-shares-for-expenses", expenses.map((e) => e.id).join(",")],
    queryFn: async () => {
      if (expenses.length === 0) return [] as ShareRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: ShareRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("group_expense_shares")
        .select("expense_id, user_id, share_cents, settled_at")
        .in("expense_id", expenses.map((e) => e.id));
      return data ?? [];
    },
    enabled: expenses.length > 0,
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    let youOwe = 0;
    let owedToYou = 0;
    if (!user?.id) return { youOwe, owedToYou, settled: 0, total: expenses.length };

    let settledCount = 0;
    for (const e of expenses) {
      const expShares = allSharesForExpenses.filter((s) => s.expense_id === e.id);
      const allSettled = expShares.length > 0 && expShares.every((s) => s.settled_at);
      if (allSettled) settledCount++;

      if (e.paid_by === user.id) {
        // Others owe you their shares (unsettled only).
        const owed = expShares
          .filter((s) => s.user_id !== user.id && !s.settled_at)
          .reduce((sum, s) => sum + s.share_cents, 0);
        owedToYou += owed;
      } else {
        // You owe your share (unsettled only).
        const myShare = expShares.find((s) => s.user_id === user.id && !s.settled_at);
        if (myShare) youOwe += myShare.share_cents;
      }
    }
    return { youOwe, owedToYou, settled: settledCount, total: expenses.length };
  }, [expenses, allSharesForExpenses, user?.id]);

  const net = stats.owedToYou - stats.youOwe;
  const displayCurrency = expenses[0]?.currency ?? "USD";

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Split Bills · ZIVO" description="Group expenses and who owes who." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Split Bills</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Net banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Net position</p>
          <p className="text-4xl font-extrabold leading-tight mt-1">
            {net >= 0 ? "+" : ""}{formatCents(net, displayCurrency)}
          </p>
          <p className="text-sm text-white/80 mt-1">
            {net >= 0 ? "Others owe you." : "You owe overall."}
          </p>
        </motion.div>

        {/* Stat split */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Owed to you</p>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{formatCents(stats.owedToYou, displayCurrency)}</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">You owe</p>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{formatCents(stats.youOwe, displayCurrency)}</p>
          </div>
        </div>

        {/* Expenses list */}
        {sharesLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!sharesLoading && expenses.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Receipt className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No shared bills yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Group expenses from trips will appear here as you and your friends log them.
            </p>
          </div>
        )}

        {!sharesLoading && expenses.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2 flex items-center gap-2">
              Recent
              <span className="inline-flex items-center gap-0.5 normal-case font-medium text-muted-foreground/70">
                <CheckCircle2 className="h-2.5 w-2.5" /> {stats.settled} of {stats.total} settled
              </span>
            </p>
            <div className="space-y-2">
              {expenses.map((e, idx) => {
                const expShares = allSharesForExpenses.filter((s) => s.expense_id === e.id);
                const allSettled = expShares.length > 0 && expShares.every((s) => s.settled_at);
                const isPayer = user?.id === e.paid_by;
                const myShare = expShares.find((s) => s.user_id === user?.id);
                const owedToMe = isPayer
                  ? expShares.filter((s) => s.user_id !== user?.id && !s.settled_at).reduce((sum, s) => sum + s.share_cents, 0)
                  : 0;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl bg-card border border-border",
                      allSettled && "opacity-60",
                    )}
                  >
                    <div className={cn(
                      "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                      allSettled ? "bg-secondary text-muted-foreground" : isPayer ? "bg-ig-gradient text-white" : "bg-foreground/10 text-foreground",
                    )}>
                      {allSettled ? <CheckCircle2 className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-foreground line-clamp-1">{e.title}</p>
                        {e.category && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">
                            {e.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 flex-wrap">
                        <Users className="h-2.5 w-2.5" /> {expShares.length} {expShares.length === 1 ? "person" : "people"} split
                        <span>·</span>
                        <Clock className="h-2.5 w-2.5" /> {formatRelative(e.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-foreground">{formatCents(e.total_cents, e.currency)}</p>
                      {isPayer && owedToMe > 0 && (
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCents(owedToMe, e.currency)} owed
                        </p>
                      )}
                      {!isPayer && myShare && !myShare.settled_at && (
                        <p className="text-[10px] font-bold text-destructive">
                          -{formatCents(myShare.share_cents, e.currency)}
                        </p>
                      )}
                      {allSettled && (
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Settled
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </SwipeBackContainer>
  );
}
