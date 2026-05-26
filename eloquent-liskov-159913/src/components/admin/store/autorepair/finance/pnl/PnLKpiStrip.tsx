/**
 * P&L KPI strip — 6 cards with sparklines & vs-previous deltas.
 */
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { fmtMoney, type PnLKpis, type SeriesPoint, compareDelta } from "@/lib/admin/pnlCalculations";

interface Props {
  kpis: PnLKpis;
  prev?: PnLKpis | null;
  series: SeriesPoint[];
  loading?: boolean;
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  spark?: { v: number }[];
  delta?: { pct: number; direction: "up" | "down" | "flat" };
  tone?: "default" | "good" | "bad";
  Icon?: LucideIcon;
}

function KpiCard({ label, value, sub, spark, delta, tone = "default", Icon }: CardProps) {
  const toneCls = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-foreground";
  const sparkColor = tone === "bad" ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  const deltaCls = !delta || delta.direction === "flat"
    ? "text-muted-foreground"
    : delta.direction === "up"
      ? (tone === "bad" ? "text-rose-600" : "text-emerald-600")
      : (tone === "bad" ? "text-emerald-600" : "text-rose-600");
  const DeltaIcon = !delta || delta.direction === "flat" ? Minus : delta.direction === "up" ? ArrowUp : ArrowDown;
  return (
    <div className="rounded-xl border bg-card p-3 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
          {Icon && <Icon className="w-3 h-3" />} {label}
        </div>
        {delta && (
          <span className={`text-[10px] font-medium inline-flex items-center gap-0.5 ${deltaCls}`}>
            <DeltaIcon className="w-3 h-3" />
            {Math.abs(delta.pct).toFixed(1)}%
          </span>
        )}
      </div>
      <div className={`text-xl font-bold tabular-nums truncate ${toneCls}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
      {spark && spark.length > 1 && (
        <div className="h-7 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark}>
              <Line type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function PnLKpiStrip({ kpis, prev, series, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const spark = (key: keyof SeriesPoint) => series.map((s) => ({ v: s[key] as number }));
  const d = (cur: number, p?: number) => prev ? compareDelta(cur, p ?? 0) : undefined;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
      <KpiCard label="Revenue (paid)" value={fmtMoney(kpis.revenue)} spark={spark("revenue")} delta={d(kpis.revenue, prev?.revenue)} tone="good" />
      <KpiCard label="Outstanding" value={fmtMoney(kpis.invoiced)} sub="Awaiting payment" delta={d(kpis.invoiced, prev?.invoiced)} />
      <KpiCard label="COGS" value={fmtMoney(kpis.cogs)} sub="Parts & supplies" delta={d(kpis.cogs, prev?.cogs)} tone="bad" />
      <KpiCard label="Gross profit" value={fmtMoney(kpis.grossProfit)} sub={`${kpis.grossMargin.toFixed(1)}% margin`} delta={d(kpis.grossProfit, prev?.grossProfit)} tone="good" />
      <KpiCard label="Operating exp." value={fmtMoney(kpis.opex)} sub="Rent, payroll, etc." spark={spark("expenses")} delta={d(kpis.opex, prev?.opex)} tone="bad" />
      <KpiCard label="Net profit" value={fmtMoney(kpis.net)} sub={`${kpis.netMargin.toFixed(1)}% margin`} spark={spark("net")} delta={d(kpis.net, prev?.net)} tone={kpis.net >= 0 ? "good" : "bad"} />
    </div>
  );
}
