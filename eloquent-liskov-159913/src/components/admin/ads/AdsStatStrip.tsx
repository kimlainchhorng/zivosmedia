/**
 * AdsStatStrip — 4-tile aggregate metric strip with 7-day deltas.
 * 2x2 on mobile, 4x1 on iPad+.
 */
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdsAggregateStats, AdsStatDelta } from "@/hooks/useStoreAdsOverview";

interface Props {
  stats: AdsAggregateStats;
}

interface Tile {
  key: keyof AdsAggregateStats;
  label: string;
  icon: LucideIcon;
  format: (n: number) => string;
}

const TILES: Tile[] = [
  { key: "spend", label: "Spend", icon: DollarSign, format: (n) => `$${(n / 100).toFixed(2)}` },
  { key: "impressions", label: "Impressions", icon: Eye, format: (n) => n.toLocaleString() },
  { key: "clicks", label: "Clicks", icon: MousePointerClick, format: (n) => n.toLocaleString() },
  { key: "conversions", label: "Conversions", icon: TrendingUp, format: (n) => n.toLocaleString() },
];

function DeltaPill({ delta }: { delta: AdsStatDelta }) {
  const pct = delta.deltaPct;
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  const tone =
    pct > 0
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
      : pct < 0
      ? "text-red-600 dark:text-red-400 bg-red-500/10"
      : "text-muted-foreground bg-muted/40";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        tone
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {Math.abs(pct)}%
    </span>
  );
}

export default function AdsStatStrip({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
      {TILES.map((t) => {
        const Icon = t.icon;
        const d = stats[t.key];
        return (
          <Card
            key={t.key}
            role="group"
            aria-label={`${t.label} last 7 days`}
            className="overflow-hidden"
          >
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex items-center justify-between mb-1">
                <Icon className="w-3.5 h-3.5 text-primary/80" />
                <DeltaPill delta={d} />
              </div>
              <p className="text-xl md:text-2xl font-semibold leading-tight tracking-tight">
                {t.format(d.current)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
                {t.label}
                <span className="hidden sm:inline"> · 7d</span>
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
