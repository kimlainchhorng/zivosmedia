/**
 * CafeReportsSection — deeper analytics: top items, hour-of-day heatmap,
 * and a CSV export of completed orders for the chosen window.
 */
import { useState } from "react";
import { BarChart3, Download, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCafeAnalytics } from "@/hooks/cafe/useCafeAnalytics";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CafeReportsSection({ storeId }: Props) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { dataset, loading } = useCafeAnalytics(storeId, days);
  const maxHour = Math.max(1, ...dataset.byHour);

  const exportCsv = () => {
    const rows = [
      ["date", "revenue_cents", "tickets", "expenses_cents"],
      ...dataset.daily.map((d) => [d.date, String(d.revenue_cents), String(d.tickets), String(d.expenses_cents)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cafe-daily-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Reports & analytics</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
            {([7, 30, 90] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} className={cn(
                "px-3 py-1 text-xs",
                days === d ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}>{d}d</button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv} className="h-7 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Profit & loss</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(() => {
            const t = dataset.totals;
            const marginPct = (t.gross_margin_bp / 100).toFixed(1);
            const netColor = t.net_cents > 0 ? "text-emerald-600" : t.net_cents < 0 ? "text-destructive" : "";
            return (
              <ul className="text-sm divide-y divide-border/60">
                <li className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-bold tabular-nums">{fmt(t.revenue_cents)}</span>
                </li>
                <li className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">COGS<span className="text-[11px] ml-1">(ingredient cost)</span></span>
                  <span className="tabular-nums text-destructive">−{fmt(t.cogs_cents)}</span>
                </li>
                <li className="flex items-center justify-between py-2 bg-muted/30 px-2 -mx-2 rounded">
                  <span>Gross profit <span className="text-[11px] text-muted-foreground">({marginPct}% margin)</span></span>
                  <span className="font-bold tabular-nums text-emerald-600">{fmt(t.gross_profit_cents)}</span>
                </li>
                <li className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Operating expenses</span>
                  <span className="tabular-nums text-destructive">−{fmt(t.expenses_cents)}</span>
                </li>
                <li className="flex items-center justify-between py-2 border-t-2 border-border">
                  <span className="font-semibold">Net profit</span>
                  <span className={cn("font-bold text-lg tabular-nums", netColor)}>{fmt(t.net_cents)}</span>
                </li>
              </ul>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Top items</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {dataset.topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{loading ? "Loading…" : "No completed orders in this window."}</p>
          ) : (
            <ul className="space-y-2">
              {dataset.topItems.map((item, idx) => {
                const max = dataset.topItems[0]?.qty || 1;
                const pct = Math.round((item.qty / max) * 100);
                return (
                  <li key={item.name}>
                    <div className="flex items-center justify-between text-sm mb-0.5">
                      <span className="truncate"><span className="text-muted-foreground tabular-nums mr-2">{idx + 1}.</span>{item.name}</span>
                      <span className="tabular-nums text-muted-foreground">{item.qty}× · {fmt(item.revenue_cents)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Revenue by category</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {dataset.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{loading ? "Loading…" : "No completed orders in this window."}</p>
          ) : (
            <ul className="space-y-2">
              {dataset.byCategory.map((row) => {
                const max = dataset.byCategory[0]?.revenue_cents || 1;
                const pct = Math.round((row.revenue_cents / max) * 100);
                const share = dataset.totals.revenue_cents > 0
                  ? Math.round((row.revenue_cents / dataset.totals.revenue_cents) * 100)
                  : 0;
                return (
                  <li key={row.name}>
                    <div className="flex items-center justify-between text-sm mb-0.5">
                      <span className="truncate">{row.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {fmt(row.revenue_cents)} · {share}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Revenue by hour</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-12 gap-1">
            {HOURS.map((h) => {
              const v = dataset.byHour[h] || 0;
              const intensity = v === 0 ? 0 : Math.max(0.08, v / maxHour);
              return (
                <div key={h} title={`${h}:00 — ${fmt(v)}`} className="flex flex-col items-center gap-0.5">
                  <div className="h-8 w-full rounded" style={{ backgroundColor: `rgba(245, 158, 11, ${intensity})` }} />
                  <span className="text-[9px] text-muted-foreground tabular-nums">{h}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Darker = more revenue. Use this to schedule extra hands.</p>
        </CardContent>
      </Card>
    </div>
  );
}
