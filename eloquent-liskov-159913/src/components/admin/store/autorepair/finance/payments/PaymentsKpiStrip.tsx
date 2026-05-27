/**
 * Payments KPI strip — 6 cards w/ sparklines + delta.
 */
import { ArrowDown, ArrowUp, Minus, DollarSign, Hash, TrendingUp, Award, Users, RotateCcw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { fmtMoney, compareDelta, type PaymentsKpis, type PaymentsSeriesPoint } from "@/lib/admin/paymentsCalculations";

interface Props { kpis: PaymentsKpis; prev?: PaymentsKpis | null; series: PaymentsSeriesPoint[]; loading?: boolean }

interface KpiProps {
  label: string; value: string; sub?: string; spark?: { v: number }[];
  delta?: { pct: number; direction: "up" | "down" | "flat" };
  tone?: "default" | "good" | "bad"; Icon: any; invertDelta?: boolean;
}

function KpiCard({ label, value, sub, spark, delta, tone = "default", Icon, invertDelta }: KpiProps) {
  const toneCls = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "text-foreground";
  const sparkColor = tone === "bad" ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  const deltaCls = !delta || delta.direction === "flat" ? "text-muted-foreground"
    : delta.direction === "up" ? (invertDelta ? "text-rose-600" : "text-emerald-600")
    : (invertDelta ? "text-emerald-600" : "text-rose-600");
  const DeltaIcon = !delta || delta.direction === "flat" ? Minus : delta.direction === "up" ? ArrowUp : ArrowDown;
  return (
    <div className="rounded-xl border bg-card p-3 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Icon className="w-3 h-3" />{label}</div>
        {delta && (
          <span className={`text-[10px] font-medium inline-flex items-center gap-0.5 ${deltaCls}`}>
            <DeltaIcon className="w-3 h-3" />{Math.abs(delta.pct).toFixed(1)}%
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

export default function PaymentsKpiStrip({ kpis, prev, series, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-3 h-24 animate-pulse" />
        ))}
      </div>
    );
  }
  const spark = series.map((s) => ({ v: s.received }));
  const d = (cur: number, p?: number) => prev ? compareDelta(cur, p ?? 0) : undefined;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
      <KpiCard label="Total received" value={fmtMoney(kpis.totalReceived)} spark={spark} delta={d(kpis.totalReceived, prev?.totalReceived)} tone="good" Icon={DollarSign} />
      <KpiCard label="Payment count" value={String(kpis.count)} sub="In period" delta={d(kpis.count, prev?.count)} Icon={Hash} />
      <KpiCard label="Avg payment" value={fmtMoney(kpis.avg)} delta={d(kpis.avg, prev?.avg)} tone="good" Icon={TrendingUp} />
      <KpiCard label="Largest" value={fmtMoney(kpis.largest)} delta={d(kpis.largest, prev?.largest)} Icon={Award} />
      <KpiCard label="Customers paid" value={String(kpis.uniqueCustomers)} sub="Unique" delta={d(kpis.uniqueCustomers, prev?.uniqueCustomers)} Icon={Users} />
      <KpiCard label="Refunds issued" value={fmtMoney(kpis.refunds)} delta={d(kpis.refunds, prev?.refunds)} tone="bad" invertDelta Icon={RotateCcw} />
    </div>
  );
}
