/**
 * Payments method breakdown — donut + table.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { fmtMoney, type MethodStat } from "@/lib/admin/paymentsCalculations";

interface Props { methods: MethodStat[] }

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142 70% 45%)",
  "hsl(38 92% 50%)",
  "hsl(217 91% 60%)",
  "hsl(280 60% 60%)",
  "hsl(0 70% 60%)",
];

export default function PaymentsMethodBreakdown({ methods }: Props) {
  const data = methods.map((m) => ({ name: m.method.toUpperCase(), value: m.amount / 100 }));
  const total = methods.reduce((s, m) => s + m.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" /> Method breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No payments yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => fmtMoney(Math.round((v as number) * 100))}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {methods.map((m, i) => (
                <div key={m.method} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="uppercase font-medium truncate">{m.method}</span>
                    <span className="text-muted-foreground">·{m.count}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{fmtMoney(m.amount)}</span>
                </div>
              ))}
              {total > 0 && (
                <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t mt-1">
                  <span>Total</span>
                  <span className="font-semibold text-foreground">{fmtMoney(total)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
