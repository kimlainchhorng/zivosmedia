/**
 * P&L Cash flow — cash in vs out and running balance line.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { fmtMoney, type PaymentRow, type ExpenseRow, type PayoutRow } from "@/lib/admin/pnlCalculations";
import { useMemo } from "react";

interface Props { payments: PaymentRow[]; expenses: ExpenseRow[]; payouts: PayoutRow[] }

export default function PnLCashFlow({ payments, expenses, payouts }: Props) {
  const { cashIn, cashOut, net, series } = useMemo(() => {
    const cashIn = payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
    const cashOut = expenses.reduce((s, e) => s + (e.amount_cents ?? 0), 0)
      + payouts.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
    const map: Record<string, { date: string; in: number; out: number }> = {};
    const ensure = (k: string) => (map[k] ||= { date: k, in: 0, out: 0 });
    payments.forEach((p) => { ensure(p.paid_at.slice(0, 10)).in += p.amount_cents ?? 0; });
    expenses.forEach((e) => { ensure(e.expense_date.slice(0, 10)).out += e.amount_cents ?? 0; });
    payouts.forEach((p) => { ensure(p.payout_date.slice(0, 10)).out += p.amount_cents ?? 0; });
    const arr = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const series = arr.map((p) => { running += (p.in - p.out); return { date: p.date, balance: +(running / 100).toFixed(2) }; });
    return { cashIn, cashOut, net: cashIn - cashOut, series };
  }, [payments, expenses, payouts]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Cash flow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border p-2.5">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="w-3 h-3 text-emerald-600" /> Cash in</div>
            <div className="text-base font-semibold text-emerald-600 tabular-nums">{fmtMoney(cashIn)}</div>
          </div>
          <div className="rounded-lg border p-2.5">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="w-3 h-3 text-foreground" /> Cash out</div>
            <div className="text-base font-semibold text-foreground tabular-nums">{fmtMoney(cashOut)}</div>
          </div>
          <div className="rounded-lg border p-2.5 bg-muted/30">
            <div className="text-[10px] text-muted-foreground">Net cash</div>
            <div className={`text-base font-bold tabular-nums ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmtMoney(net)}</div>
          </div>
        </div>
        {series.length > 1 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#bal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
