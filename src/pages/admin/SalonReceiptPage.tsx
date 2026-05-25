/**
 * SalonReceiptPage — print-friendly receipt for a completed booking.
 * Requires owner auth (uses RLS, no public RPC needed). Renders the salon
 * header, service line, retail items, tip/tax breakdown, grand total, and
 * a thank-you. "Print" button calls window.print(); @media print rules
 * strip the page chrome so a normal print outputs just the receipt.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Printer, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ReceiptBooking {
  id: string;
  client_name: string;
  service_name: string;
  stylist_name: string | null;
  price_cents: number;
  tip_cents: number;
  tax_cents: number;
  deposit_paid_cents: number;
  duration_minutes: number;
  start_at: string;
  status: string;
}

interface ReceiptRetailItem {
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

interface ReceiptStore {
  name: string;
  address: string | null;
  phone: string | null;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function SalonReceiptPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<ReceiptBooking | null>(null);
  const [items, setItems] = useState<ReceiptRetailItem[]>([]);
  const [store, setStore] = useState<ReceiptStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const { data: b, error: bErr } = await supabase
        .from("salon_bookings")
        .select("id, store_id, client_name, service_name, stylist_name, price_cents, tip_cents, tax_cents, deposit_paid_cents, duration_minutes, start_at, status")
        .eq("id", bookingId)
        .maybeSingle();
      if (cancelled) return;
      if (bErr || !b) {
        setError("Couldn't load this receipt.");
        setLoading(false);
        return;
      }
      const [itemsRes, storeRes] = await Promise.all([
        supabase.from("salon_booking_retail_items")
          .select("product_name, unit_price_cents, quantity")
          .eq("booking_id", bookingId),
        supabase.from("store_profiles")
          .select("name, address, phone")
          .eq("id", (b as any).store_id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setBooking(b as unknown as ReceiptBooking);
      setItems((itemsRes.data ?? []) as unknown as ReceiptRetailItem[]);
      setStore(storeRes.data as unknown as ReceiptStore);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !booking || !store) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-base font-semibold text-foreground">{error ?? "Receipt not found."}</p>
        </div>
      </div>
    );
  }

  const retailTotal = items.reduce((s, r) => s + r.unit_price_cents * r.quantity, 0);
  const grossTotal = booking.price_cents + retailTotal + booking.tip_cents + booking.tax_cents;
  const depositPaid = booking.deposit_paid_cents ?? 0;
  const grandTotal = Math.max(0, grossTotal - depositPaid);

  return (
    <div className="min-h-screen bg-muted/20 print:bg-white">
      <Helmet><title>Receipt · {store.name}</title></Helmet>

      {/* Print-only styling: strip page padding, hide controls. */}
      <style>{`
        @media print {
          @page { size: auto; margin: 12mm; }
          body { background: white !important; }
          .receipt-noprint { display: none !important; }
          .receipt-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-md px-4 py-8 print:p-0">
        <div className="receipt-noprint mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-1.5">
            <X className="h-4 w-4" /> Close
          </Button>
          <Button onClick={() => window.print()} size="sm" className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        <div className="receipt-card rounded-2xl border border-border bg-card p-6 shadow-sm">
          <header className="border-b border-dashed border-border pb-4 text-center">
            <h1 className="text-xl font-bold text-foreground">{store.name}</h1>
            {store.address && <p className="mt-1 text-xs text-muted-foreground">{store.address}</p>}
            {store.phone && <p className="text-xs text-muted-foreground">{store.phone}</p>}
            <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">Receipt</p>
            <p className="text-xs font-mono text-foreground/80">#{booking.id.slice(0, 8).toUpperCase()}</p>
          </header>

          <section className="space-y-1 py-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Client</span><span className="text-foreground">{booking.client_name}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Date</span><span className="text-foreground">{formatDateTime(booking.start_at)}</span>
            </div>
            {booking.stylist_name && (
              <div className="flex justify-between text-muted-foreground">
                <span>Stylist</span><span className="text-foreground">{booking.stylist_name}</span>
              </div>
            )}
          </section>

          <section className="border-t border-dashed border-border py-3">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">{booking.service_name}</span>
              <span className="font-medium text-foreground">{formatPrice(booking.price_cents)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{booking.duration_minutes} min</p>
          </section>

          {items.length > 0 && (
            <section className="border-t border-dashed border-border py-3 text-sm">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Retail</p>
              <ul className="space-y-1">
                {items.map((r, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-foreground">{r.quantity}× {r.product_name}</span>
                    <span className="font-medium text-foreground">{formatPrice(r.unit_price_cents * r.quantity)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="border-t border-dashed border-border py-3 text-sm">
            <Row label="Subtotal" value={formatPrice(booking.price_cents + retailTotal)} />
            {booking.tip_cents > 0 && <Row label="Tip" value={formatPrice(booking.tip_cents)} />}
            {booking.tax_cents > 0 && <Row label="Tax" value={formatPrice(booking.tax_cents)} />}
            {depositPaid > 0 && (
              <Row
                label="Deposit on file"
                value={`− ${formatPrice(depositPaid)}`}
                valueClassName="text-emerald-700 dark:text-emerald-300"
              />
            )}
          </section>

          <section className="border-t-2 border-border pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-foreground">{depositPaid > 0 ? "Balance due" : "Total"}</span>
              <span className="text-xl font-bold text-foreground">{formatPrice(grandTotal)}</span>
            </div>
            {depositPaid > 0 && (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                ({formatPrice(grossTotal)} total · {formatPrice(depositPaid)} prepaid)
              </p>
            )}
          </section>

          <footer className="mt-6 border-t border-dashed border-border pt-4 text-center">
            <p className="text-sm font-semibold text-foreground">Thank you!</p>
            <p className="mt-1 text-[11px] text-muted-foreground">We hope to see you again.</p>
          </footer>
        </div>

        <p className="receipt-noprint mt-3 text-center text-[11px] text-muted-foreground">
          Tip: use Print → "Save as PDF" to email a copy to the client.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClassName ?? "text-foreground"}>{value}</span>
    </div>
  );
}
