/**
 * MarketingStatStrip — 6 KPI tiles with 7-day deltas, scrollable on mobile.
 */
import { Card } from "@/components/ui/card";
import { Send, CheckCheck, MailOpen, MousePointerClick, Target, DollarSign, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { MarketingStats } from "@/hooks/useStoreMarketingOverview";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  stats?: MarketingStats;
  isLoading: boolean;
}

function pct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function Tile({ label, value, delta, icon: Icon, tone }: { label: string; value: string; delta: number; icon: any; tone: string }) {
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <Card className="min-w-[140px] flex-shrink-0 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span
          className={`text-[10px] font-medium flex items-center gap-0.5 ${
            flat ? "text-muted-foreground" : up ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {flat ? <Minus className="w-3 h-3" /> : up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(delta)}%
        </span>
      </div>
      <div className="text-lg sm:text-xl font-bold leading-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </Card>
  );
}

export default function MarketingStatStrip({ stats, isLoading }: Props) {
  if (isLoading || !stats) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="min-w-[140px] h-[88px] rounded-xl" />
        ))}
      </div>
    );
  }
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
      <Tile label="Sent" value={fmt(stats.sent.current)} delta={pct(stats.sent.current, stats.sent.previous)} icon={Send} tone="bg-blue-500/10 text-blue-600" />
      <Tile label="Delivered" value={fmt(stats.delivered.current)} delta={pct(stats.delivered.current, stats.delivered.previous)} icon={CheckCheck} tone="bg-cyan-500/10 text-cyan-600" />
      <Tile label="Opened" value={fmt(stats.opened.current)} delta={pct(stats.opened.current, stats.opened.previous)} icon={MailOpen} tone="bg-violet-500/10 text-violet-600" />
      <Tile label="Clicked" value={fmt(stats.clicked.current)} delta={pct(stats.clicked.current, stats.clicked.previous)} icon={MousePointerClick} tone="bg-amber-500/10 text-amber-600" />
      <Tile label="Conversions" value={fmt(stats.conversions.current)} delta={pct(stats.conversions.current, stats.conversions.previous)} icon={Target} tone="bg-emerald-500/10 text-emerald-600" />
      <Tile label="Revenue" value={`$${fmt(Math.round(stats.revenue_cents.current / 100))}`} delta={pct(stats.revenue_cents.current, stats.revenue_cents.previous)} icon={DollarSign} tone="bg-rose-500/10 text-rose-600" />
    </div>
  );
}
