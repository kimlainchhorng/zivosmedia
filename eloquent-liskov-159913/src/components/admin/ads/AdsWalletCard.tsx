/**
 * AdsWalletCard — compact wallet/billing surface above the onboarding checklist.
 * Shows balance, auto-recharge state, last 5 ledger entries, low-balance + pacing hints.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, AlertTriangle, TrendingDown, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WalletInfo, WalletLedgerEntry, AdsAggregateStats } from "@/hooks/useStoreAdsOverview";

interface Props {
  wallet: WalletInfo;
  ledger: WalletLedgerEntry[];
  stats: AdsAggregateStats;
  onAddFunds: () => void;
  onViewAll: () => void;
  onToggleAutoReload: () => void;
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdsWalletCard({
  wallet,
  ledger,
  stats,
  onAddFunds,
  onViewAll,
  onToggleAutoReload,
}: Props) {
  const lowBalance = wallet.balance_cents < wallet.threshold_cents;
  // Spend pacing: 7-day current spend → daily run-rate → days until empty
  const dailySpend = stats.spend.current / 7;
  const daysLeft = dailySpend > 0 ? Math.floor(wallet.balance_cents / dailySpend) : null;

  return (
    <Card className={cn("overflow-hidden", lowBalance && "border-amber-500/40")}>
      <CardContent className="p-3 space-y-3">
        {/* Top row: balance + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Wallet className="w-3 h-3" /> Ad wallet balance
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-semibold tabular-nums">
                {formatUsd(wallet.balance_cents)}
              </span>
              {lowBalance && wallet.balance_cents > 0 && (
                <Badge className="h-4 px-1.5 text-[9px] bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Low
                </Badge>
              )}
            </div>
          </div>
          <Button size="sm" className="h-8 shrink-0" onClick={onAddFunds}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add funds
          </Button>
        </div>

        {/* Pacing strip */}
        {daysLeft !== null && wallet.balance_cents > 0 && (
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px]",
              daysLeft <= 3
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            <TrendingDown className="w-3 h-3 shrink-0" />
            <span>
              At {formatUsd(Math.round(dailySpend))}/day, balance lasts{" "}
              <span className="font-semibold">~{daysLeft} day{daysLeft === 1 ? "" : "s"}</span>
            </span>
          </div>
        )}

        {/* Auto-reload toggle */}
        <button
          type="button"
          onClick={onToggleAutoReload}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-left transition",
            wallet.auto_recharge_enabled
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-border bg-card hover:bg-accent/50"
          )}
          aria-pressed={wallet.auto_recharge_enabled}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Zap
              className={cn(
                "w-3.5 h-3.5 shrink-0",
                wallet.auto_recharge_enabled ? "text-emerald-600" : "text-muted-foreground"
              )}
            />
            <div className="min-w-0">
              <div className="text-[11px] font-medium truncate">
                Auto-reload {wallet.auto_recharge_enabled ? "on" : "off"}
              </div>
              {wallet.auto_recharge_enabled && (
                <div className="text-[10px] text-muted-foreground truncate">
                  Add {formatUsd(wallet.recharge_amount_cents)} when below{" "}
                  {formatUsd(wallet.threshold_cents)}
                </div>
              )}
            </div>
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>

        {/* Recent transactions */}
        {ledger.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Recent activity
              </span>
              <button
                type="button"
                onClick={onViewAll}
                className="text-[10px] text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <div className="space-y-0.5">
              {ledger.map((e) => {
                const positive = e.amount_cents >= 0;
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-2 py-1 text-[11px] border-b border-border/40 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        {e.description || e.entry_type.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatRelative(e.created_at)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-semibold tabular-nums shrink-0",
                        positive ? "text-emerald-600" : "text-foreground"
                      )}
                    >
                      {positive ? "+" : ""}
                      {formatUsd(e.amount_cents)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : wallet.balance_cents === 0 ? (
          <div className="text-[11px] text-muted-foreground text-center py-1">
            No transactions yet — add funds to start running campaigns.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
