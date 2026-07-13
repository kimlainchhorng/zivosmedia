/**
 * PerformanceKpiStrip — Spend, Revenue, ROAS, Conversions, CVR, CPA, AOV.
 */
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
}

interface Props {
  spendCents: number;
  revenueCents: number;
  roas: number;
  conversions: number;
  clicks: number;
  impressions: number;
}

const fmtMoney = (c: number) =>
  c >= 1_000_000 ? `$${(c / 100_000).toFixed(1)}k` : `$${(c / 100).toFixed(0)}`;
const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString());

export default function PerformanceKpiStrip({
  spendCents,
  revenueCents,
  roas,
  conversions,
  clicks,
  impressions,
}: Props) {
  const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const cpa = conversions > 0 ? spendCents / conversions : 0;
  const aov = conversions > 0 ? revenueCents / conversions : 0;

  const kpis: Kpi[] = [
    { label: "Spend", value: fmtMoney(spendCents) },
    { label: "Revenue", value: fmtMoney(revenueCents), positive: revenueCents > spendCents },
    { label: "ROAS", value: `${roas.toFixed(2)}x`, positive: roas >= 1 },
    { label: "Conversions", value: fmtNum(conversions) },
    { label: "CVR", value: `${cvr.toFixed(1)}%`, hint: "Click → Convert" },
    { label: "CPA", value: fmtMoney(cpa), hint: "Cost / Acq" },
    { label: "AOV", value: fmtMoney(aov), hint: "Avg order" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {kpis.map((k) => (
        <Card key={k.label} className="p-2.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
            {k.label}
          </div>
          <div
            className={cn(
              "text-base sm:text-lg font-bold tabular-nums",
              k.positive === true && "text-emerald-500",
              k.positive === false && "text-amber-500"
            )}
          >
            {k.value}
          </div>
          {k.hint && (
            <div className="text-[9px] text-muted-foreground/70 truncate">{k.hint}</div>
          )}
        </Card>
      ))}
    </div>
  );
}
