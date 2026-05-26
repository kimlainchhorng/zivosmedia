/**
 * Lodging — Revenue Management.
 * Yield metrics, occupancy trends, and rate optimization recommendations.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, BedDouble, DollarSign, BarChart3, ChevronRight,
  ArrowUp, ArrowDown, Minus, Target,
} from "lucide-react";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const pct = (n: number) => `${n.toFixed(1)}%`;

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: ymd(start), end: ymd(end), days: end.getDate() };
}

function nightsForRange(ci: string, co: string, rangeStart: string, rangeEnd: string): number {
  const start = Math.max(new Date(ci).getTime(), new Date(rangeStart).getTime());
  const end = Math.min(new Date(co).getTime(), new Date(rangeEnd).getTime());
  return Math.max(0, (end - start) / 86400000);
}

interface MonthStats {
  label: string;
  occupancy: number;
  adr: number;
  revpar: number;
  revenue: number;
  roomNights: number;
}

const ADVICE = [
  { minOcc: 0, maxOcc: 40, icon: ArrowDown, color: "text-rose-600", advice: "Occupancy is low — consider running a promotion or lowering rates for walk-ins." },
  { minOcc: 40, maxOcc: 70, icon: Minus, color: "text-amber-600", advice: "Healthy occupancy. Maintain current rates and monitor booking pace." },
  { minOcc: 70, maxOcc: 90, icon: ArrowUp, color: "text-emerald-600", advice: "Strong occupancy! Consider raising rates by 10–20% on remaining inventory." },
  { minOcc: 90, maxOcc: 101, icon: Target, color: "text-primary", advice: "Near sellout — maximise rate now. Consider overbooking 1–2 rooms based on historical no-shows." },
];

export default function LodgingRevenueSection({ storeId }: { storeId: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [targetOcc, setTargetOcc] = useState("70");
  const [targetAdr, setTargetAdr] = useState("");

  const { data: reservations = [] } = useLodgeReservations(storeId, "all");
  const { data: rooms = [] } = useLodgeRooms(storeId);

  const totalRooms = rooms.reduce((s, r) => s + (r.units_total || 1), 0);

  const months: MonthStats[] = useMemo(() => {
    if (totalRooms === 0) return [];
    return Array.from({ length: 12 }, (_, m) => {
      const { start, end, days } = getMonthRange(year, m);
      const label = new Date(year, m, 1).toLocaleString("default", { month: "short" });
      const capacity = totalRooms * days;

      let roomNights = 0;
      let revenue = 0;
      for (const r of reservations) {
        if (["cancelled", "no_show"].includes(r.status)) continue;
        const n = nightsForRange(r.check_in, r.check_out, start, end);
        if (n <= 0) continue;
        roomNights += n;
        revenue += (r.rate_cents || 0) * n;
      }

      const occupancy = capacity > 0 ? (roomNights / capacity) * 100 : 0;
      const adr = roomNights > 0 ? revenue / roomNights : 0;
      const revpar = capacity > 0 ? revenue / capacity : 0;

      return { label, occupancy, adr, revpar, revenue, roomNights };
    });
  }, [reservations, rooms, year, totalRooms]);

  const currentMonth = months[today.getMonth()];
  const ytdRevenue = months.slice(0, today.getMonth() + 1).reduce((s, m) => s + m.revenue, 0);
  const avgOcc = months.reduce((s, m) => s + m.occupancy, 0) / 12;
  const avgAdr = months.reduce((s, m) => s + m.adr, 0) / 12;

  const advice = ADVICE.find(a => (currentMonth?.occupancy || 0) >= a.minOcc && (currentMonth?.occupancy || 0) < a.maxOcc);

  const targetOccNum = parseFloat(targetOcc) || 0;
  const targetAdrNum = targetAdr ? Math.round(parseFloat(targetAdr) * 100) : 0;
  const targetRevParCents = totalRooms > 0 && targetAdrNum > 0
    ? (targetOccNum / 100) * targetAdrNum
    : 0;

  const maxRev = Math.max(...months.map(m => m.revenue), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Revenue Management</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setYear(y => y - 1)}>‹</Button>
          <span className="text-sm font-semibold w-12 text-center">{year}</span>
          <Button size="sm" variant="outline" onClick={() => setYear(y => y + 1)}>›</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-revenue" />
        <LodgingSectionStatusBanner
          title="Revenue Management"
          icon={TrendingUp}
          countLabel="YTD Revenue"
          countValue={fmt(ytdRevenue)}
          fixLabel="Open Reports"
          fixTab="lodge-reports"
        />

        {/* KPI strip */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Avg Occupancy", value: pct(avgOcc), icon: BedDouble },
            { label: "Avg ADR", value: fmt(avgAdr), icon: DollarSign },
            { label: "Avg RevPAR", value: fmt(months.reduce((s, m) => s + m.revpar, 0) / 12), icon: BarChart3 },
            { label: "YTD Revenue", value: fmt(ytdRevenue), icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Yield advisor */}
        {advice && currentMonth && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-start gap-3">
            <advice.icon className={`h-5 w-5 mt-0.5 shrink-0 ${advice.color}`} />
            <div>
              <p className="text-sm font-semibold">
                This month: {pct(currentMonth.occupancy)} occupancy · ADR {fmt(currentMonth.adr)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{advice.advice}</p>
            </div>
          </div>
        )}

        {/* Monthly bar chart */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Monthly performance — {year}</p>
          <div className="space-y-1.5">
            {months.map((m, i) => {
              const isCurrentMonth = i === today.getMonth() && year === today.getFullYear();
              return (
                <div key={m.label} className="flex items-center gap-2">
                  <span className={`text-[11px] w-8 text-right shrink-0 ${isCurrentMonth ? "font-bold text-primary" : "text-muted-foreground"}`}>{m.label}</span>
                  <div className="flex-1 h-5 rounded-full bg-muted/30 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all ${isCurrentMonth ? "bg-primary" : "bg-primary/50"}`}
                      style={{ width: `${(m.revenue / maxRev) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] w-24 text-right shrink-0 text-foreground font-medium">{fmt(m.revenue)}</span>
                  <span className={`text-[11px] w-12 text-right shrink-0 ${m.occupancy >= 80 ? "text-emerald-600" : m.occupancy >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                    {pct(m.occupancy)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RevPAR grid */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">ADR & RevPAR by month</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">Month</th>
                  <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Occ %</th>
                  <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">ADR</th>
                  <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">RevPAR</th>
                  <th className="text-right py-1.5 pl-2 text-muted-foreground font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => {
                  const isCurrent = i === today.getMonth() && year === today.getFullYear();
                  return (
                    <tr key={m.label} className={`border-b border-border/50 ${isCurrent ? "bg-primary/5 font-semibold" : ""}`}>
                      <td className="py-1.5 pr-3">{m.label}{isCurrent ? " ←" : ""}</td>
                      <td className={`text-right px-2 ${m.occupancy >= 80 ? "text-emerald-600" : m.occupancy >= 50 ? "text-amber-600" : m.revenue > 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                        {m.revenue > 0 ? pct(m.occupancy) : "—"}
                      </td>
                      <td className="text-right px-2">{m.adr > 0 ? fmt(m.adr) : "—"}</td>
                      <td className="text-right px-2">{m.revpar > 0 ? fmt(m.revpar) : "—"}</td>
                      <td className="text-right pl-2">{m.revenue > 0 ? fmt(m.revenue) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Target calculator */}
        <Card className="bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><Target className="h-4 w-4" /> Revenue target calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Target occupancy (%)</Label>
                <Input
                  type="number" min="0" max="100"
                  value={targetOcc}
                  onChange={e => setTargetOcc(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Target ADR (USD)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={targetAdr}
                  onChange={e => setTargetAdr(e.target.value)}
                  placeholder="e.g. 150.00"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex flex-col justify-end">
                <Label className="text-xs text-muted-foreground">Target RevPAR</Label>
                <p className="text-sm font-bold text-primary mt-1">
                  {targetRevParCents > 0 ? fmt(targetRevParCents) : "—"}
                </p>
              </div>
            </div>
            {targetOccNum > 0 && targetAdrNum > 0 && totalRooms > 0 && (
              <div className="rounded-lg bg-background border border-border p-3 text-xs space-y-1">
                <p className="font-semibold">Projected monthly ({totalRooms} rooms, 30 days):</p>
                <p className="text-muted-foreground">
                  Room nights needed: <strong className="text-foreground">{Math.round((targetOccNum / 100) * totalRooms * 30)}</strong>
                </p>
                <p className="text-muted-foreground">
                  Projected revenue: <strong className="text-foreground">{fmt(targetRevParCents * totalRooms * 30)}</strong>
                </p>
              </div>
            )}
            {totalRooms === 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ChevronRight className="h-3 w-3" /> Add rooms first to see projections.
              </p>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
