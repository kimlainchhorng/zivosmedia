/**
 * Payments trend chart — bar (received) + line (cumulative).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { fmtMoney, type PaymentsSeriesPoint } from "@/lib/admin/paymentsCalculations";

interface Props { series: PaymentsSeriesPoint[] }

export default function PaymentsTrendChart({ series }: Props) {
  const data = series.map((s) => ({ ...s, receivedDollars: s.received / 100, cumulativeDollars: s.cumulative / 100 }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Receipts trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No payments in this period.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(v: number) => fmtMoney(Math.round((v as number) * 100))}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receivedDollars" name="Received" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="cumulativeDollars" name="Cumulative" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
