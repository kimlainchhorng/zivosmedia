/**
 * Cafe daily Z-report at /admin/cafe-summary/:storeId/:date.
 * Owner-only via RLS on cafe_orders / cafe_payments / cafe_expenses /
 * cafe_time_entries. Aggregates the day's activity into a printable card:
 *   • revenue by tender + tips
 *   • completed / cancelled counts + average ticket
 *   • top items
 *   • labor (clocked hours + wages)
 *   • expenses logged today
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Coffee, Loader2, AlertCircle, Printer, ChevronLeft, ChevronRight, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface StoreLite { id: string; name: string; logo_url: string | null; address: string | null }
interface OrderRow {
  id: string; status: string; channel: string; placed_at: string;
  subtotal_cents: number; tax_cents: number; tip_cents: number;
  discount_cents: number; total_cents: number;
}
interface ItemRow { order_id: string; item_name: string; quantity: number; line_total_cents: number }
interface PaymentRow { order_id: string; method: string; status: string; amount_cents: number; tip_cents: number; refunded_cents: number }
interface ExpenseRow { category: string; amount_cents: number; vendor: string | null }
interface TimeEntryRow { barista_id: string; minutes_worked: number; hourly_rate_cents_snapshot: number }
interface BaristaRow { id: string; display_name: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const fmtHrs = (mins: number) => `${Math.floor(mins / 60)}h ${(mins % 60).toString().padStart(2, "0")}m`;

const TENDER_LABEL: Record<string, string> = {
  cash: "Cash", card: "Card", qr: "QR / KHQR",
  wallet: "Wallet", gift_card: "Gift card", other: "Other",
};

const shiftIso = (iso: string, deltaDays: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
};

export default function CafeDailySummaryPage() {
  const { storeId = "", date = "" } = useParams<{ storeId: string; date: string }>();
  const [store, setStore] = useState<StoreLite | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [baristas, setBaristas] = useState<BaristaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const dayStart = new Date(`${date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();

      const storeRes = await supabase
        .from("store_profiles")
        .select("id,name,logo_url,address")
        .eq("id", storeId)
        .maybeSingle();
      if (cancelled) return;
      if (storeRes.error || !storeRes.data) {
        setError("Couldn't load store.");
        setLoading(false);
        return;
      }
      setStore(storeRes.data as StoreLite);

      const [ordRes, expRes, teRes, bRes] = await Promise.all([
        supabase.from("cafe_orders" as never)
          .select("id,status,channel,placed_at,subtotal_cents,tax_cents,tip_cents,discount_cents,total_cents")
          .eq("store_id", storeId)
          .gte("placed_at", dayStart).lt("placed_at", dayEnd),
        supabase.from("cafe_expenses" as never)
          .select("category,amount_cents,vendor")
          .eq("store_id", storeId).eq("expense_date", date),
        supabase.from("cafe_time_entries" as never)
          .select("barista_id,minutes_worked,hourly_rate_cents_snapshot")
          .eq("store_id", storeId)
          .gte("clock_in", dayStart).lt("clock_in", dayEnd),
        supabase.from("cafe_baristas" as never)
          .select("id,display_name")
          .eq("store_id", storeId),
      ]);
      if (cancelled) return;
      if (ordRes.error || expRes.error || teRes.error || bRes.error) {
        console.error("[CafeDailySummary] load", ordRes.error || expRes.error || teRes.error || bRes.error);
        setError("Couldn't load summary.");
        setLoading(false);
        return;
      }
      const ordersRows = (ordRes.data ?? []) as unknown as OrderRow[];
      setOrders(ordersRows);
      setExpenses((expRes.data ?? []) as unknown as ExpenseRow[]);
      setEntries((teRes.data ?? []) as unknown as TimeEntryRow[]);
      setBaristas((bRes.data ?? []) as unknown as BaristaRow[]);

      const orderIds = ordersRows.map((o) => o.id);
      if (orderIds.length > 0) {
        const [itemRes, payRes] = await Promise.all([
          supabase.from("cafe_order_items" as never)
            .select("order_id,item_name,quantity,line_total_cents").in("order_id", orderIds),
          supabase.from("cafe_payments" as never)
            .select("order_id,method,status,amount_cents,tip_cents,refunded_cents").in("order_id", orderIds),
        ]);
        setItems((itemRes.data ?? []) as unknown as ItemRow[]);
        setPayments((payRes.data ?? []) as unknown as PaymentRow[]);
      } else {
        setItems([]);
        setPayments([]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, date]);

  const summary = useMemo(() => {
    let revenue = 0, tax = 0, tips = 0, discount = 0;
    let completed = 0, cancelled = 0, refunded = 0;
    const tenderMap = new Map<string, { gross: number; tip: number; refunded: number; count: number }>();
    const itemMap = new Map<string, { qty: number; revenue: number }>();
    const itemsByOrder = new Map<string, ItemRow[]>();

    for (const it of items) {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    }

    for (const o of orders) {
      if (o.status === "completed") {
        completed++;
        revenue += o.total_cents;
        tax += o.tax_cents;
        tips += o.tip_cents;
        discount += o.discount_cents;
        for (const it of itemsByOrder.get(o.id) ?? []) {
          const prev = itemMap.get(it.item_name) ?? { qty: 0, revenue: 0 };
          prev.qty += it.quantity;
          prev.revenue += it.line_total_cents;
          itemMap.set(it.item_name, prev);
        }
      } else if (o.status === "cancelled") cancelled++;
      else if (o.status === "refunded") refunded++;
    }

    for (const p of payments) {
      if (p.status !== "captured" && p.status !== "authorized") continue;
      const t = tenderMap.get(p.method) ?? { gross: 0, tip: 0, refunded: 0, count: 0 };
      t.gross += p.amount_cents;
      t.tip += p.tip_cents;
      t.refunded += p.refunded_cents;
      t.count++;
      tenderMap.set(p.method, t);
    }

    const topItems = Array.from(itemMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const expenseByCategory = new Map<string, number>();
    let expenseTotal = 0;
    for (const e of expenses) {
      expenseByCategory.set(e.category, (expenseByCategory.get(e.category) ?? 0) + e.amount_cents);
      expenseTotal += e.amount_cents;
    }

    const baristaName = new Map(baristas.map((b) => [b.id, b.display_name]));
    const laborByBarista = new Map<string, { minutes: number; wage: number }>();
    let laborMins = 0, laborWage = 0;
    for (const e of entries) {
      const prev = laborByBarista.get(e.barista_id) ?? { minutes: 0, wage: 0 };
      const wage = Math.round((e.minutes_worked / 60) * e.hourly_rate_cents_snapshot);
      prev.minutes += e.minutes_worked;
      prev.wage += wage;
      laborByBarista.set(e.barista_id, prev);
      laborMins += e.minutes_worked;
      laborWage += wage;
    }

    const avgTicket = completed > 0 ? Math.round(revenue / completed) : 0;
    const net = revenue - expenseTotal - laborWage;
    return {
      revenue, tax, tips, discount, completed, cancelled, refunded, avgTicket,
      tenderMap, topItems,
      expenseByCategory: Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1]),
      expenseTotal,
      laborByBarista: Array.from(laborByBarista.entries()).map(([id, v]) => ({ name: baristaName.get(id) ?? "—", ...v })).sort((a, b) => b.wage - a.wage),
      laborMins, laborWage, net,
    };
  }, [orders, items, payments, expenses, entries, baristas]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">{error || "Couldn't load."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const friendlyDate = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-muted/40 py-8 px-4 print:bg-white print:py-0">
      <Helmet>
        <title>{store.name} · Daily Summary · {date}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3 print:hidden flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/admin/stores/${storeId}?tab=cafe-dashboard`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/cafe-summary/${storeId}/${shiftIso(date, -1)}`}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev day
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/cafe-summary/${storeId}/${shiftIso(date, 1)}`}>
                Next day <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 print:border-0 print:shadow-none print:rounded-none print:p-0 space-y-5">
          <div className="flex items-start gap-4">
            {store.logo_url ? (
              <img src={store.logo_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-amber-500/10 grid place-items-center">
                <Coffee className="h-7 w-7 text-amber-700" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{store.name}</h1>
              <p className="text-sm text-muted-foreground">Daily summary · {friendlyDate}</p>
              {store.address && <p className="text-[11px] text-muted-foreground">{store.address}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Gross sales</p>
              <p className="text-2xl font-bold tabular-nums">{fmt(summary.revenue)}</p>
              <p className="text-[10px] text-muted-foreground">{summary.completed} ticket{summary.completed === 1 ? "" : "s"}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tips</p>
              <p className="text-2xl font-bold tabular-nums">{fmt(summary.tips)}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg ticket</p>
              <p className="text-2xl font-bold tabular-nums">{fmt(summary.avgTicket)}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Net</p>
              <p className={`text-2xl font-bold tabular-nums ${summary.net < 0 ? "text-destructive" : ""}`}>{fmt(summary.net)}</p>
              <p className="text-[10px] text-muted-foreground">after labor + expenses</p>
            </div>
          </div>

          <section>
            <h2 className="text-sm font-semibold mb-2">By tender</h2>
            {summary.tenderMap.size === 0 ? (
              <p className="text-sm text-muted-foreground">No payments captured today.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <tr><th className="text-left py-1">Method</th><th className="text-right py-1">Txns</th><th className="text-right py-1">Tips</th><th className="text-right py-1">Refunds</th><th className="text-right py-1">Net</th></tr>
                </thead>
                <tbody>
                  {Array.from(summary.tenderMap.entries()).map(([method, v]) => (
                    <tr key={method} className="border-b border-border/30 last:border-b-0">
                      <td className="py-1.5">{TENDER_LABEL[method] ?? method}</td>
                      <td className="py-1.5 text-right tabular-nums">{v.count}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(v.tip)}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmt(v.refunded)}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">{fmt(v.gross - v.refunded)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-2">Top items</h2>
            {summary.topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items sold today.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {summary.topItems.map((row, idx) => (
                  <li key={row.name} className="flex items-center justify-between">
                    <span><span className="text-muted-foreground tabular-nums mr-2">{idx + 1}.</span>{row.name}</span>
                    <span className="tabular-nums text-muted-foreground">{row.qty}× <span className="text-foreground font-medium">{fmt(row.revenue)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-2">Labor</h2>
            {summary.laborByBarista.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shifts clocked today.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {summary.laborByBarista.map((row) => (
                  <li key={row.name} className="flex items-center justify-between">
                    <span>{row.name}</span>
                    <span className="tabular-nums text-muted-foreground">{fmtHrs(row.minutes)} · <span className="text-foreground font-medium">{fmt(row.wage)}</span></span>
                  </li>
                ))}
                <li className="flex items-center justify-between border-t border-border/60 pt-1 font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{fmtHrs(summary.laborMins)} · {fmt(summary.laborWage)}</span>
                </li>
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-2">Expenses</h2>
            {summary.expenseByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses logged today.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {summary.expenseByCategory.map(([cat, amt]) => (
                  <li key={cat} className="flex items-center justify-between">
                    <span>{cat}</span>
                    <span className="tabular-nums">{fmt(amt)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between border-t border-border/60 pt-1 font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{fmt(summary.expenseTotal)}</span>
                </li>
              </ul>
            )}
          </section>

          <section className="border-t border-border/60 pt-3">
            <h2 className="text-sm font-semibold mb-2">Status counts</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <span>✅ Completed: <span className="font-semibold tabular-nums">{summary.completed}</span></span>
              <span>🚫 Cancelled: <span className="font-semibold tabular-nums">{summary.cancelled}</span></span>
              <span>↩ Refunded: <span className="font-semibold tabular-nums">{summary.refunded}</span></span>
              <span>💰 Discounts: <span className="font-semibold tabular-nums">{fmt(summary.discount)}</span></span>
              <span>🏛 Tax: <span className="font-semibold tabular-nums">{fmt(summary.tax)}</span></span>
            </div>
          </section>

          <p className="text-center text-[11px] text-muted-foreground border-t border-border/60 pt-3">
            Generated {new Date().toLocaleString()} · {store.name}
          </p>
        </div>
      </div>
    </div>
  );
}
