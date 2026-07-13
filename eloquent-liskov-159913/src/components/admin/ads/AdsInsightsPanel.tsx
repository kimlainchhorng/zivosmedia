/**
 * AdsInsightsPanel — client-side rules over overview data to surface
 * actionable recommendations. No backend.
 */
import { useMemo, useState } from "react";
import { Sparkles, X, ArrowRight, TrendingUp, Megaphone, Wallet, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdCampaign, AdAccount, AdsAggregateStats, WalletInfo } from "@/hooks/useStoreAdsOverview";

interface Insight {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "info" | "warn" | "success";
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}

interface Props {
  campaigns: AdCampaign[];
  accounts: AdAccount[];
  stats: AdsAggregateStats;
  wallet: WalletInfo;
  onCreateCampaign: () => void;
  onAddFunds: () => void;
  onConnectPlatform: () => void;
  onOpenCampaign: (c: AdCampaign) => void;
}

function buildInsights({
  campaigns,
  accounts,
  stats,
  wallet,
  onCreateCampaign,
  onAddFunds,
  onConnectPlatform,
  onOpenCampaign,
}: Props): Insight[] {
  const out: Insight[] = [];
  const active = campaigns.filter((c) => c.status === "active");
  const connected = accounts.filter((a) => a.status !== "disconnected");

  // 1. No active campaigns
  if (active.length === 0 && connected.length > 0) {
    out.push({
      id: "no-active",
      icon: Megaphone,
      tone: "info",
      title: "No active campaigns",
      body: "Stores in your category run an average of 2–3 active ads. Launch your first to start collecting data.",
      actionLabel: "Create campaign",
      onAction: onCreateCampaign,
    });
  }

  // 2. Low balance with active spend
  if (active.length > 0 && wallet.balance_cents < wallet.threshold_cents) {
    out.push({
      id: "low-balance",
      icon: Wallet,
      tone: "warn",
      title: "Wallet running low",
      body: `Balance is below your $${(wallet.threshold_cents / 100).toFixed(0)} threshold while ${active.length} campaign${active.length === 1 ? " is" : "s are"} active.`,
      actionLabel: "Add funds",
      onAction: onAddFunds,
    });
  }

  // 3. Spend trending up vs prior week
  if (stats.spend.current > 0 && stats.spend.deltaPct >= 25) {
    out.push({
      id: "spend-up",
      icon: TrendingUp,
      tone: "info",
      title: `Spend up ${stats.spend.deltaPct}% week-over-week`,
      body: "Watch CPA closely — review top campaigns to ensure ROI scales with budget.",
      actionLabel: "Review",
      onAction: () => {
        const top = [...campaigns].sort((a, b) => b.spend_cents - a.spend_cents)[0];
        if (top) onOpenCampaign(top);
      },
    });
  }

  // 4. Campaign nearly out of budget
  const burning = campaigns.find(
    (c) =>
      c.status === "active" &&
      c.total_budget_cents > 0 &&
      c.spend_cents / c.total_budget_cents >= 0.8
  );
  if (burning) {
    const pct = Math.round((burning.spend_cents / burning.total_budget_cents) * 100);
    out.push({
      id: `burn-${burning.id}`,
      icon: AlertTriangle,
      tone: "warn",
      title: `"${burning.name}" at ${pct}% budget`,
      body: "Extend the budget or duplicate this campaign before it stops delivering.",
      actionLabel: "Open",
      onAction: () => onOpenCampaign(burning),
    });
  }

  // 5. Single platform → diversify
  if (connected.length === 1 && campaigns.length > 0) {
    out.push({
      id: "diversify",
      icon: Zap,
      tone: "info",
      title: "Diversify your reach",
      body: `You're only running on ${connected[0].platform}. Add a second channel to reduce CPA volatility.`,
      actionLabel: "Connect more",
      onAction: onConnectPlatform,
    });
  }

  // 6. Auto-reload off + active campaigns
  if (active.length > 0 && !wallet.auto_recharge_enabled && wallet.has_payment_method) {
    out.push({
      id: "auto-reload",
      icon: Zap,
      tone: "info",
      title: "Enable auto-reload",
      body: "Avoid pauses by auto-topping up your wallet when it dips below your threshold.",
      actionLabel: "Turn on",
      onAction: onAddFunds,
    });
  }

  return out.slice(0, 3);
}

const TONE: Record<Insight["tone"], string> = {
  info: "border-primary/20 bg-primary/5",
  warn: "border-amber-500/30 bg-amber-500/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
};

const ICON_TONE: Record<Insight["tone"], string> = {
  info: "text-primary bg-primary/10",
  warn: "text-amber-600 bg-amber-500/15",
  success: "text-emerald-600 bg-emerald-500/15",
};

export default function AdsInsightsPanel(props: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const insights = useMemo(
    () => buildInsights(props).filter((i) => !dismissed.has(i.id)),
    [props, dismissed]
  );

  if (insights.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className="w-3 h-3 text-primary" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Smart suggestions
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {insights.map((i) => {
          const Icon = i.icon;
          return (
            <div
              key={i.id}
              className={cn(
                "relative p-2.5 rounded-lg border flex flex-col gap-1.5",
                TONE[i.tone]
              )}
            >
              <button
                type="button"
                onClick={() => setDismissed((s) => new Set(s).add(i.id))}
                className="absolute top-1 right-1 p-0.5 rounded hover:bg-foreground/10 text-muted-foreground"
                aria-label="Dismiss insight"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-1.5 pr-5">
                <div className={cn("p-1 rounded", ICON_TONE[i.tone])}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-[12px] font-semibold leading-tight">{i.title}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">{i.body}</p>
              <button
                type="button"
                onClick={i.onAction}
                className="self-start flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-0.5"
              >
                {i.actionLabel}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
