/**
 * CafeIncomeSection — daily revenue + tickets bars over the last 30 days,
 * plus channel split. Driven by useCafeAnalytics over completed orders.
 */
import { useMemo, useState } from "react";
import { DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCafeAnalytics } from "@/hooks/cafe/useCafeAnalytics";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const CHANNEL_LABEL: Record<string, string> = {
  qr_table: "QR Table", counter: "Counter", pickup: "Pickup", delivery: "Delivery", phone: "Phone",
};

export default function CafeIncomeSection({ storeId }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (c: number) => formatCafeMoney(c, currencyCode);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { dataset, loading } = useCafeAnalytics(storeId, days);

  const maxDaily = useMemo(() => Math.max(1, ...dataset.daily.map((d) => d.revenue_cents)), [dataset.daily]);
  const channelEntries = Object.entries(dataset.byChannel).sort((a, b) => b[1].revenue_cents - a[1].revenue_cents);
  const totalChannelRevenue = channelEntries.reduce((s, [, v]) => s + v.revenue_cents, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Revenue</h2>
        <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
          {([7, 30, 90] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={cn(
              "px-3 py-1 text-xs",
              days === d ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}>{d}d</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Revenue</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(dataset.totals.revenue_cents)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tickets</p>
          <p className="text-2xl font-bold tabular-nums">{dataset.totals.tickets}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg ticket</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(dataset.totals.avg_ticket_cents)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Net</p>
          <p className={cn("text-2xl font-bold tabular-nums", dataset.totals.net_cents < 0 && "text-destructive")}>
            {fmt(dataset.totals.net_cents)}
          </p>
          <p className="text-[10px] text-muted-foreground">after {fmt(dataset.totals.expenses_cents)} expenses</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Daily revenue</CardTitle></CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="flex items-end gap-0.5 h-32 overflow-x-auto">
              {dataset.daily.map((d) => {
                const h = Math.round((d.revenue_cents / maxDaily) * 100);
                return (
                  <div key={d.date} title={`${d.date} · ${fmt(d.revenue_cents)} · ${d.tickets} tickets`} className="group relative flex flex-col items-center w-3 shrink-0">
                    <div className="bg-emerald-500/60 group-hover:bg-emerald-500 transition-colors w-full rounded-sm" style={{ height: `${h}%` }} />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
            <span>{dataset.daily[0]?.date}</span>
            <span>{dataset.daily[dataset.daily.length - 1]?.date}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">By channel</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {channelEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No completed orders in this window.</p>
          ) : (
            <ul className="space-y-2">
              {channelEntries.map(([key, val]) => {
                const pct = totalChannelRevenue > 0 ? Math.round((val.revenue_cents / totalChannelRevenue) * 100) : 0;
                return (
                  <li key={key}>
                    <div className="flex items-center justify-between text-sm mb-0.5">
                      <span>{CHANNEL_LABEL[key] ?? key}</span>
                      <span className="tabular-nums text-muted-foreground">{fmt(val.revenue_cents)} <span className="text-[11px]">· {val.tickets} tx</span></span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
