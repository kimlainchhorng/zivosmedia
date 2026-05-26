/**
 * Auto Repair Finance — Income & Revenue
 * Reads from ar_invoices + ar_invoice_payments to show real revenue.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Receipt, AlertCircle, TrendingUp } from "lucide-react";

interface Props { storeId: string }

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const presetRange = (key: "today" | "week" | "month" | "ytd") => {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now);
  if (key === "today") {/* same */}
  else if (key === "week") from.setDate(from.getDate() - 6);
  else if (key === "month") from.setDate(from.getDate() - 29);
  else from.setMonth(0, 1);
  return { from: from.toISOString().slice(0, 10), to };
};

export default function FinanceIncomeSection({ storeId }: Props) {
  const [range, setRange] = useState(() => presetRange("month"));

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["ar-fin-income-invoices", storeId, range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices" as any)
        .select("id,number,total_cents,amount_paid_cents,status,created_at,customer_name,vehicle_label,items")
        .eq("store_id", storeId)
        .gte("created_at", range.from)
        .lte("created_at", `${range.to}T23:59:59`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((s, i) => s + (i.amount_paid_cents ?? 0), 0);
    const billed = invoices.reduce((s, i) => s + (i.total_cents ?? 0), 0);
    const outstanding = billed - totalRevenue;
    const paidCount = invoices.filter((i: any) => i.status === "paid").length;
    const avgTicket = paidCount ? totalRevenue / paidCount : 0;

    const serviceTotals: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      items.forEach((it: any) => {
        const key = (it.description || it.name || "Untitled").trim() || "Untitled";
        const amt =
          it.category === "labor" ? (Number(it.hours) || 0) * (Number(it.price) || 0) * 100 :
          it.category === "part" ? (Number(it.qty) || 0) * (Number(it.price) || 0) * 100 :
          (Number(it.price) || 0) * 100;
        serviceTotals[key] = (serviceTotals[key] || 0) + amt;
      });
    });
    const topServices = Object.entries(serviceTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return { totalRevenue, billed, outstanding, paidCount, avgTicket, topServices };
  }, [invoices]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Income & Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setRange(presetRange("today"))}>Today</Button>
            <Button size="sm" variant="outline" onClick={() => setRange(presetRange("week"))}>Last 7d</Button>
            <Button size="sm" variant="outline" onClick={() => setRange(presetRange("month"))}>Last 30d</Button>
            <Button size="sm" variant="outline" onClick={() => setRange(presetRange("ytd"))}>YTD</Button>
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-xs">From</Label>
              <Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="h-8 w-36" />
              <Label className="text-xs">To</Label>
              <Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="h-8 w-36" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<DollarSign className="w-4 h-4 text-emerald-600" />} label="Revenue (paid)" value={fmt(stats.totalRevenue)} />
        <StatCard icon={<Receipt className="w-4 h-4 text-blue-600" />} label="Billed" value={fmt(stats.billed)} />
        <StatCard icon={<AlertCircle className="w-4 h-4 text-amber-600" />} label="Outstanding" value={fmt(stats.outstanding)} />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-foreground" />} label="Avg ticket" value={fmt(stats.avgTicket)} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top services by revenue</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : stats.topServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenue in this period yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topServices.map(([name, amt]) => (
                <li key={name} className="flex justify-between text-sm">
                  <span className="truncate pr-3">{name}</span>
                  <span className="font-medium tabular-nums">{fmt(amt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent invoices in range</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet — create one in the Invoices tab.</p>
          ) : (
            <ul className="divide-y">
              {invoices.slice(0, 10).map((inv: any) => (
                <li key={inv.id} className="py-2 flex justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{inv.number}</div>
                    <div className="text-xs text-muted-foreground truncate">{inv.customer_name || "—"} · {inv.vehicle_label || "—"}</div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-medium">{fmt(inv.total_cents)}</div>
                    <div className="text-[11px] uppercase text-muted-foreground">{inv.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
