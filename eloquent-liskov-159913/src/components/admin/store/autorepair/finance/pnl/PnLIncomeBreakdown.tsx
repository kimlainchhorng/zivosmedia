/**
 * P&L Income breakdown — by payment method & top services (from invoice items).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Banknote } from "lucide-react";
import { fmtMoney, type PaymentRow, type InvoiceRow } from "@/lib/admin/pnlCalculations";
import { useMemo } from "react";

interface Props { payments: PaymentRow[]; invoices: InvoiceRow[] }

function Row({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <li>
      <div className="flex justify-between text-xs mb-1">
        <span className="capitalize truncate">{label}</span>
        <span className="tabular-nums text-muted-foreground">{fmtMoney(value)} · {pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

export default function PnLIncomeBreakdown({ payments, invoices }: Props) {
  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    payments.forEach((p) => { const k = (p.method || "Unknown").trim(); m[k] = (m[k] || 0) + (p.amount_cents ?? 0); });
    return Object.entries(m).sort(([, a], [, b]) => b - a);
  }, [payments]);

  const byService = useMemo(() => {
    const m: Record<string, number> = {};
    invoices.forEach((i) => {
      const items = Array.isArray(i.items) ? i.items : [];
      items.forEach((it: any) => {
        const name = String(it?.name ?? it?.description ?? "Service").slice(0, 40);
        const qty = Number(it?.quantity ?? it?.qty ?? 1) || 1;
        const price = Number(it?.unit_price_cents ?? it?.price_cents ?? it?.amount_cents ?? 0) || 0;
        m[name] = (m[name] || 0) + qty * price;
      });
    });
    return Object.entries(m).sort(([, a], [, b]) => b - a).slice(0, 8);
  }, [invoices]);

  const totalMethod = byMethod.reduce((s, [, v]) => s + v, 0);
  const totalService = byService.reduce((s, [, v]) => s + v, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Banknote className="w-4 h-4 text-emerald-600" /> Income breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="method">
          <TabsList className="h-8">
            <TabsTrigger value="method" className="text-xs h-7">By payment method</TabsTrigger>
            <TabsTrigger value="service" className="text-xs h-7">Top services</TabsTrigger>
          </TabsList>
          <TabsContent value="method" className="mt-3">
            {byMethod.length === 0 ? (
              <p className="text-xs text-muted-foreground">No payments in this period.</p>
            ) : (
              <ul className="space-y-2">{byMethod.map(([k, v]) => <Row key={k} label={k} value={v} total={totalMethod} />)}</ul>
            )}
          </TabsContent>
          <TabsContent value="service" className="mt-3">
            {byService.length === 0 ? (
              <p className="text-xs text-muted-foreground">No invoiced services in this period.</p>
            ) : (
              <ul className="space-y-2">{byService.map(([k, v]) => <Row key={k} label={k} value={v} total={totalService} />)}</ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
