/**
 * Cafe receipt page — printable order receipt at /cafe/receipt/:orderId.
 * Fetches via the cafe_public_order_receipt RPC (SECURITY DEFINER) so the
 * page works for both staff and customers without leaking internal notes.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Coffee, Loader2, Printer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ReceiptModifier {
  group_name: string;
  modifier_name: string;
  price_delta_cents: number;
}
interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  modifiers_total_cents: number;
  line_total_cents: number;
  notes: string | null;
  modifiers: ReceiptModifier[];
}
interface ReceiptPayment {
  method: string;
  status: string;
  amount_cents: number;
  tip_cents: number;
  refunded_cents: number;
  reference: string | null;
  created_at: string;
}
interface ReceiptData {
  store: {
    id: string; name: string; slug: string;
    logo_url: string | null; address: string | null; phone: string | null;
  };
  order: {
    id: string;
    ticket_number: number;
    status: string;
    channel: string;
    table_label: string | null;
    customer_name: string | null;
    placed_at: string;
    completed_at: string | null;
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    tip_cents: number;
    total_cents: number;
    paid_cents: number;
  };
  items: ReceiptItem[];
  payments: ReceiptPayment[];
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CafeReceiptPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await supabase.rpc("cafe_public_order_receipt" as never, { p_order_id: orderId } as never);
      if (cancelled) return;
      if (res.error) {
        console.error("[CafeReceiptPage] load", res.error);
        setError("Couldn't load receipt.");
        setLoading(false);
        return;
      }
      if (!res.data) {
        setError("Receipt not found.");
        setLoading(false);
        return;
      }
      setData(res.data as unknown as ReceiptData);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">{error || "Receipt unavailable."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { store, order, items, payments } = data;
  const balanceDue = Math.max(0, order.total_cents - order.paid_cents);

  return (
    <div className="min-h-screen bg-muted/40 py-8 px-4 print:bg-white print:py-0 print:px-0">
      <Helmet>
        <title>Receipt · {store.name} · #{order.ticket_number}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-sm mx-auto print:max-w-none">
        <div className="flex justify-end mb-3 print:hidden">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 print:border-0 print:shadow-none print:rounded-none print:p-0">
          <div className="text-center mb-4">
            {store.logo_url ? (
              <img src={store.logo_url} alt="" className="h-14 w-14 mx-auto rounded-lg object-cover" />
            ) : (
              <div className="h-14 w-14 mx-auto rounded-lg bg-amber-500/10 grid place-items-center">
                <Coffee className="h-7 w-7 text-amber-700" />
              </div>
            )}
            <h1 className="mt-2 text-lg font-bold">{store.name}</h1>
            {store.address && <p className="text-[11px] text-muted-foreground whitespace-pre-line">{store.address}</p>}
            {store.phone && <p className="text-[11px] text-muted-foreground">{store.phone}</p>}
          </div>

          <div className="border-t border-dashed border-border/80 pt-3 mb-3 text-[12px] tabular-nums space-y-0.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Ticket</span><span className="font-mono">#{order.ticket_number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Placed</span><span>{new Date(order.placed_at).toLocaleString()}</span></div>
            {order.completed_at && (
              <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span>{new Date(order.completed_at).toLocaleString()}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Channel</span><span className="capitalize">{order.channel.replace("_", " ")}</span></div>
            {order.table_label && <div className="flex justify-between"><span className="text-muted-foreground">Table</span><span>{order.table_label}</span></div>}
            {order.customer_name && <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{order.customer_name}</span></div>}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary" className="text-[10px] uppercase">{order.status}</Badge>
            </div>
          </div>

          <div className="border-t border-dashed border-border/80 pt-3 mb-3 space-y-2 text-sm">
            {items.map((it) => (
              <div key={it.id}>
                <div className="flex items-start justify-between">
                  <span className="flex-1 pr-2">
                    <span className="text-muted-foreground tabular-nums">{it.quantity}×</span>{" "}
                    <span className="font-medium">{it.name}</span>
                  </span>
                  <span className="tabular-nums">{fmt(it.line_total_cents)}</span>
                </div>
                {it.modifiers.length > 0 && (
                  <p className="text-[11px] text-muted-foreground pl-5">
                    {it.modifiers.map((m) => m.modifier_name).join(" · ")}
                  </p>
                )}
                {it.notes && <p className="text-[11px] italic text-muted-foreground pl-5">"{it.notes}"</p>}
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border/80 pt-3 space-y-0.5 text-sm tabular-nums">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(order.subtotal_cents)}</span></div>
            {order.discount_cents > 0 && (
              <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−{fmt(order.discount_cents)}</span></div>
            )}
            {order.tax_cents > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{fmt(order.tax_cents)}</span></div>
            )}
            {order.tip_cents > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Tip</span><span>{fmt(order.tip_cents)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border/60 mt-2">
              <span>Total</span><span>{fmt(order.total_cents)}</span>
            </div>
          </div>

          {payments.length > 0 && (
            <div className="border-t border-dashed border-border/80 pt-3 mt-3 text-[12px] tabular-nums space-y-0.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Payments</p>
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="capitalize">
                    {p.method.replace("_", " ")}
                    {p.reference && <span className="text-muted-foreground text-[10px]"> · {p.reference}</span>}
                  </span>
                  <span>
                    {fmt(p.amount_cents - p.refunded_cents)}
                    {p.tip_cents > 0 && <span className="text-muted-foreground text-[10px]"> + {fmt(p.tip_cents)} tip</span>}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-1 border-t border-border/40 mt-1">
                <span>Paid</span><span>{fmt(order.paid_cents)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-destructive font-semibold">
                  <span>Balance due</span><span>{fmt(balanceDue)}</span>
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Thanks for stopping by — see you soon ☕
          </p>
        </div>
      </div>
    </div>
  );
}
