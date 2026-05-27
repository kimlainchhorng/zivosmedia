/**
 * CoinWalletPage — Your coin balance + transactions.
 * Backed by `coin_transactions` (ledger) + `coin_purchases` (Stripe history).
 * Both orphan schemas — no UI before this.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Coins, TrendingUp, TrendingDown, ShoppingBag, Gift, Sparkles, ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface CoinTxnRow {
  id: string;
  delta: number;
  kind: string;
  reference_id: string | null;
  created_at: string;
}

interface CoinPurchaseRow {
  id: string;
  amount_cents: number;
  coins: number;
  currency: string;
  status: string;
  package_id: string;
  created_at: string;
  credited_at: string | null;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function kindLabel(k: string): string {
  return k.replace(/_/g, " ");
}

export default function CoinWalletPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["coin-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CoinTxnRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: CoinTxnRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("coin_transactions")
        .select("id, delta, kind, reference_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["coin-purchases", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CoinPurchaseRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: CoinPurchaseRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("coin_purchases")
        .select("id, amount_cents, coins, currency, status, package_id, created_at, credited_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const balance = txns.reduce((s, t) => s + (t.delta ?? 0), 0);
    const earned = txns.filter((t) => t.delta > 0).reduce((s, t) => s + t.delta, 0);
    const spent = txns.filter((t) => t.delta < 0).reduce((s, t) => s + Math.abs(t.delta), 0);
    return { balance, earned, spent };
  }, [txns]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Coin Wallet · ZIVO" description="Your coin balance and transactions." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Coin Wallet</h1>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/coin-purchase-success")}
            className="bg-ig-gradient text-white font-bold rounded-full h-9 px-3 hover:opacity-90 border-0"
          >
            <ShoppingBag className="h-4 w-4 mr-1" />
            Buy
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Balance</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <Coins className="h-7 w-7 text-white" />
            <p className="text-4xl font-extrabold leading-none">{stats.balance.toLocaleString()}</p>
            <p className="text-base font-medium text-white/80">coins</p>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>+{stats.earned.toLocaleString()} earned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4" />
              <span>-{stats.spent.toLocaleString()} spent</span>
            </div>
          </div>
        </motion.div>

        {/* Transactions */}
        <section>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Recent activity</p>
          {isLoading && (
            <div className="space-y-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && txns.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
                <Coins className="h-7 w-7 text-white" />
              </div>
              <p className="text-base font-bold text-foreground mb-1">No coin activity yet</p>
              <p className="text-xs text-muted-foreground mb-4">Earn coins from tips, gifts, and creator activities — or buy a starter pack.</p>
              <Button
                onClick={() => navigate("/coin-purchase-success")}
                className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
              >
                Buy your first coins
              </Button>
            </div>
          )}

          {!isLoading && txns.length > 0 && (
            <div className="space-y-1.5">
              {txns.map((t, idx) => {
                const isEarn = t.delta > 0;
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 12) * 0.02 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border"
                  >
                    <div className={cn(
                      "shrink-0 h-9 w-9 rounded-full flex items-center justify-center",
                      isEarn ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground",
                    )}>
                      {isEarn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground capitalize line-clamp-1">{kindLabel(t.kind)}</p>
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {formatRelative(t.created_at)}
                      </p>
                    </div>
                    <p className={cn(
                      "text-sm font-extrabold shrink-0",
                      isEarn ? "text-ig-gradient" : "text-muted-foreground",
                    )}>
                      {isEarn ? "+" : ""}{t.delta.toLocaleString()}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Purchases */}
        {purchases.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Purchases</p>
            <div className="space-y-1.5">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border"
                >
                  <div className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground inline-flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {p.coins.toLocaleString()} coins
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      ${(p.amount_cents / 100).toFixed(2)} {p.currency.toUpperCase()} · {p.status} · {formatRelative(p.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </SwipeBackContainer>
  );
}
