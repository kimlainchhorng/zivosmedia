/**
 * Printable receipt + rental agreement for a single reservation.
 * Route: /admin/stores/:storeId/car-rental-receipt/:reservationId
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Car, Loader2, Printer, ChevronLeft, AlertTriangle, MapPin, Calendar, User, Phone, Mail, IdCard, KeyRound, ClipboardCheck, Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Reservation {
  id: string;
  store_id: string;
  vehicle_id: string | null;
  customer_id: string | null;
  vehicle_label: string;
  vehicle_category: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  pickup_location_name: string | null;
  dropoff_location_name: string | null;
  pickup_at: string;
  dropoff_at: string;
  picked_up_at: string | null;
  returned_at: string | null;
  rental_days: number;
  daily_rate_cents: number;
  base_total_cents: number;
  addons_total_cents: number;
  insurance_total_cents: number;
  taxes_cents: number;
  fees_cents: number;
  discount_cents: number;
  security_deposit_cents: number;
  total_cents: number;
  deposit_paid_cents: number;
  amount_paid_cents: number;
  pickup_odometer: number | null;
  dropoff_odometer: number | null;
  pickup_fuel_level: number | null;
  dropoff_fuel_level: number | null;
  damage_notes: string | null;
  damage_photos: string[];
  status: string;
  confirmation_code: string;
  customer_notes: string | null;
  created_at: string;
}

interface Customer {
  driver_license_number: string | null;
  driver_license_state: string | null;
  driver_license_country: string | null;
  driver_license_expiry: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}

interface ResAddon {
  id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  billing: string;
  total_cents: number;
}

interface Store {
  name: string;
  logo_url: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function CarRentalReceiptPage() {
  const { storeId, reservationId } = useParams<{ storeId: string; reservationId: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addons, setAddons] = useState<ResAddon[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!reservationId) return;
      setLoading(true);
      const [resR, addonsR] = await Promise.all([
        supabase.from("car_rental_reservations").select("*").eq("id", reservationId).maybeSingle(),
        supabase.from("car_rental_reservation_addons").select("id, name, quantity, unit_price_cents, billing, total_cents").eq("reservation_id", reservationId),
      ]);
      if (cancelled) return;
      if (resR.error || !resR.data) {
        setError("Reservation not found.");
        setLoading(false);
        return;
      }
      const r = resR.data as unknown as Reservation;
      setReservation(r);
      setAddons((addonsR.data ?? []) as unknown as ResAddon[]);

      const [storeR, custR] = await Promise.all([
        supabase.from("store_profiles").select("name, logo_url, address_line1, city, state, postal_code, phone, email").eq("id", r.store_id).maybeSingle(),
        r.customer_id ? supabase.from("car_rental_customers").select("driver_license_number, driver_license_state, driver_license_country, driver_license_expiry, address, city, state").eq("id", r.customer_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (storeR.data) setStore(storeR.data as any);
      if (custR.data) setCustomer(custR.data as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reservationId]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
          <h1 className="text-xl font-bold">Reservation not found</h1>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">Back to app</Link>
        </div>
      </div>
    );
  }

  const r = reservation;
  const subtotal = r.base_total_cents + r.addons_total_cents + r.insurance_total_cents + r.fees_cents - r.discount_cents;
  const grandTotal = subtotal + r.taxes_cents + r.security_deposit_cents;
  const balanceDue = Math.max(0, grandTotal - r.amount_paid_cents - r.deposit_paid_cents);

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <Helmet>
        <title>Receipt · {r.confirmation_code}</title>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            @page { margin: 12mm; size: portrait; }
          }
        `}</style>
      </Helmet>

      <header className="no-print sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to={storeId ? `/admin/stores/${storeId}?tab=car-rental-reservations` : "/"} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={async () => {
              // Dynamic import: jsPDF + jspdf-autotable bring ~150KB.
              const { jsPDF } = await import("jspdf");
              const doc = new jsPDF({ unit: "pt", format: "letter" });
              const m = 36;
              let y = m;
              doc.setFontSize(18); doc.setFont("helvetica", "bold");
              doc.text(store?.name ?? "Car Rental Receipt", m, y); y += 22;
              doc.setFontSize(10); doc.setFont("helvetica", "normal");
              if (store) {
                const addr = [store.address_line1, store.city, store.state, store.postal_code].filter(Boolean).join(", ");
                if (addr) { doc.text(addr, m, y); y += 14; }
              }
              y += 8;
              doc.setFontSize(11); doc.setFont("helvetica", "bold");
              doc.text(`Receipt ${r.confirmation_code}`, m, y);
              doc.setFont("helvetica", "normal");
              doc.text(`Status: ${r.status}`, 400, y);
              y += 18;
              doc.setLineWidth(0.5); doc.line(m, y, 576 - m, y); y += 14;

              doc.setFontSize(10); doc.setFont("helvetica", "bold");
              doc.text("Renter", m, y); doc.text("Vehicle", 300, y); y += 14;
              doc.setFont("helvetica", "normal");
              doc.text(r.customer_name, m, y);
              doc.text(r.vehicle_label, 300, y); y += 12;
              if (r.customer_phone) { doc.text(r.customer_phone, m, y); y += 12; }
              if (r.customer_email) { doc.text(r.customer_email, m, y); y += 12; }
              y += 8;

              doc.setFont("helvetica", "bold");
              doc.text("Pickup", m, y); doc.text("Drop-off", 300, y); y += 14;
              doc.setFont("helvetica", "normal");
              doc.text(new Date(r.pickup_at).toLocaleString(), m, y);
              doc.text(new Date(r.dropoff_at).toLocaleString(), 300, y); y += 12;
              if (r.pickup_location_name) doc.text(r.pickup_location_name, m, y);
              if (r.dropoff_location_name) doc.text(r.dropoff_location_name, 300, y);
              y += 18;
              doc.line(m, y, 576 - m, y); y += 14;

              doc.setFont("helvetica", "bold"); doc.text("Charges", m, y); y += 14;
              doc.setFont("helvetica", "normal");
              const lines: Array<[string, string]> = [
                [`${r.rental_days} day(s) × ${formatMoney(r.daily_rate_cents)}`, formatMoney(r.base_total_cents)],
              ];
              for (const a of addons) lines.push([a.name, formatMoney(a.total_cents)]);
              if (r.fees_cents > 0) lines.push(["Extra fees", formatMoney(r.fees_cents)]);
              if (r.discount_cents > 0) lines.push(["Discount", `-${formatMoney(r.discount_cents)}`]);
              if (r.taxes_cents > 0) lines.push(["Taxes", formatMoney(r.taxes_cents)]);
              if (r.security_deposit_cents > 0) lines.push(["Security deposit (refundable)", formatMoney(r.security_deposit_cents)]);
              for (const [label, value] of lines) {
                doc.text(label, m, y);
                doc.text(value, 576 - m, y, { align: "right" });
                y += 12;
              }
              y += 4;
              doc.setLineWidth(1); doc.line(m, y, 576 - m, y); y += 14;
              doc.setFont("helvetica", "bold"); doc.setFontSize(12);
              doc.text("Total", m, y);
              doc.text(formatMoney(grandTotal), 576 - m, y, { align: "right" });
              y += 24;

              doc.setFontSize(8); doc.setFont("helvetica", "italic");
              doc.text(`Generated by ZIVO Car Rental · ${new Date().toLocaleString()}`, m, 760);
              doc.save(`receipt-${r.confirmation_code}.pdf`);
            }}>
              <Download className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 print:px-0 print:py-0">
        {/* Store header */}
        <div className="mb-6 flex items-start justify-between gap-4 border-b-2 border-foreground pb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{store?.name ?? "Rental Receipt"}</h1>
            {store && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[store.address_line1, store.city, store.state, store.postal_code].filter(Boolean).join(", ")}
              </p>
            )}
            {store?.phone && <p className="text-xs text-muted-foreground">{store.phone}{store.email ? ` · ${store.email}` : ""}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rental Receipt</p>
            <p className="mt-0.5 font-mono text-lg font-bold tracking-wider text-foreground">{r.confirmation_code}</p>
            <p className="text-[11px] text-muted-foreground">Created {new Date(r.created_at).toLocaleDateString()}</p>
            <StatusPill status={r.status} />
            <div className="mt-2 inline-block rounded-md bg-white p-1 ring-1 ring-border print:ring-foreground/30">
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/car-rental-booking/${r.confirmation_code}`}
                size={72}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="mt-0.5 text-[9px] text-muted-foreground">Scan to view booking</p>
          </div>
        </div>

        {/* Renter + Vehicle */}
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <Block title="Renter">
            <Row icon={User} text={r.customer_name} />
            {r.customer_phone && <Row icon={Phone} text={r.customer_phone} />}
            {r.customer_email && <Row icon={Mail} text={r.customer_email} />}
            {customer?.driver_license_number && (
              <Row icon={IdCard} text={`License: ${customer.driver_license_number}${customer.driver_license_state ? ` (${customer.driver_license_state})` : ""}`} />
            )}
            {customer?.driver_license_expiry && (
              <p className="text-[11px] text-muted-foreground pl-6">Expires {new Date(customer.driver_license_expiry).toLocaleDateString()}</p>
            )}
            {(customer?.address || customer?.city) && (
              <p className="text-[11px] text-muted-foreground pl-6">
                {[customer.address, customer.city, customer.state].filter(Boolean).join(", ")}
              </p>
            )}
          </Block>
          <Block title="Vehicle">
            <Row icon={Car} text={r.vehicle_label} />
            {r.vehicle_category && <p className="text-[11px] text-muted-foreground pl-6 capitalize">{r.vehicle_category}</p>}
          </Block>
        </div>

        {/* Rental period */}
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <Block title="Pickup">
            <Row icon={Calendar} text={formatDate(r.pickup_at)} />
            {r.pickup_location_name && <Row icon={MapPin} text={r.pickup_location_name} />}
            {r.picked_up_at && (
              <p className="text-[11px] text-muted-foreground pl-6">
                Checked out: {formatDate(r.picked_up_at)}
                {r.pickup_odometer !== null && ` · ${r.pickup_odometer.toLocaleString()} mi`}
                {r.pickup_fuel_level !== null && ` · ${r.pickup_fuel_level}% fuel`}
              </p>
            )}
          </Block>
          <Block title="Drop-off">
            <Row icon={Calendar} text={formatDate(r.dropoff_at)} />
            {r.dropoff_location_name && <Row icon={MapPin} text={r.dropoff_location_name} />}
            {r.returned_at && (
              <p className="text-[11px] text-muted-foreground pl-6">
                Returned: {formatDate(r.returned_at)}
                {r.dropoff_odometer !== null && ` · ${r.dropoff_odometer.toLocaleString()} mi`}
                {r.dropoff_fuel_level !== null && ` · ${r.dropoff_fuel_level}% fuel`}
              </p>
            )}
          </Block>
        </div>

        {/* Charges */}
        <div className="mb-5 rounded-xl border border-border bg-card print:bg-white">
          <div className="border-b border-border px-4 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Charges</p>
          </div>
          <div className="divide-y divide-border">
            <Line label={`Daily rate × ${r.rental_days} day${r.rental_days === 1 ? "" : "s"}`} value={formatMoney(r.base_total_cents)} sub={`${formatMoney(r.daily_rate_cents)}/day`} />
            {addons.map((a) => (
              <Line key={a.id} label={a.name} value={formatMoney(a.total_cents)} sub={`${a.quantity} × ${formatMoney(a.unit_price_cents)}${a.billing === "per_day" ? " /day" : ""}`} />
            ))}
            {r.insurance_total_cents > 0 && <Line label="Insurance" value={formatMoney(r.insurance_total_cents)} />}
            {r.fees_cents > 0 && <Line label="Extra fees" value={formatMoney(r.fees_cents)} sub="Over-mileage, refuel, damage" />}
            {r.discount_cents > 0 && <Line label="Discount" value={`-${formatMoney(r.discount_cents)}`} />}
            <Line label="Subtotal" value={formatMoney(subtotal)} bold />
            {r.taxes_cents > 0 && <Line label="Taxes" value={formatMoney(r.taxes_cents)} />}
            {r.security_deposit_cents > 0 && <Line label="Security deposit (refundable)" value={formatMoney(r.security_deposit_cents)} />}
          </div>
          <div className="border-t-2 border-foreground bg-muted/30 print:bg-muted/30 px-4 py-2 flex items-baseline justify-between">
            <span className="text-base font-bold">Total</span>
            <span className="text-xl font-bold text-foreground">{formatMoney(grandTotal)}</span>
          </div>
          {(r.amount_paid_cents > 0 || r.deposit_paid_cents > 0) && (
            <div className="border-t border-border px-4 py-2">
              {r.amount_paid_cents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount paid</span>
                  <span className="font-semibold text-foreground">{formatMoney(r.amount_paid_cents)}</span>
                </div>
              )}
              {r.deposit_paid_cents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deposit on file</span>
                  <span className="font-semibold text-foreground">{formatMoney(r.deposit_paid_cents)}</span>
                </div>
              )}
              {balanceDue > 0 && (
                <div className="mt-1 flex justify-between text-sm font-bold">
                  <span>Balance due</span>
                  <span className="text-amber-700 dark:text-amber-300">{formatMoney(balanceDue)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Damage / notes */}
        {(r.damage_notes || r.customer_notes) && (
          <div className="mb-5 grid gap-3 md:grid-cols-2 print:break-inside-avoid">
            {r.customer_notes && (
              <Block title="Customer notes">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{r.customer_notes}</p>
              </Block>
            )}
            {r.damage_notes && (
              <Block title="Damage / condition notes">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{r.damage_notes}</p>
              </Block>
            )}
          </div>
        )}

        {(r.damage_photos?.length ?? 0) > 0 && (
          <div className="mb-5 rounded-xl border border-border bg-card p-3 print:bg-white print:break-inside-avoid">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Damage photos ({r.damage_photos.length})
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {r.damage_photos.map((u, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded border border-border">
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agreement & signatures */}
        <section className="mt-6 rounded-xl border-2 border-foreground p-4 print:break-inside-avoid">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Rental Agreement</p>
          <ul className="space-y-1 text-[11px] text-foreground/85 list-disc pl-4">
            <li>The Renter is responsible for the vehicle from pickup to return.</li>
            <li>Renter must hold a valid driver's license and proof of insurance.</li>
            <li>Vehicle must be returned with at least the same fuel level. A refuel charge applies otherwise.</li>
            <li>Renter accepts liability for damage caused during the rental period not covered by the elected insurance.</li>
            <li>Late returns may incur additional fees at the daily rate.</li>
            <li>Smoking is not permitted in any vehicle.</li>
            <li>Security deposit is refundable subject to the vehicle being returned in good condition.</li>
          </ul>

          <div className="mt-6 grid grid-cols-2 gap-8">
            <div>
              <div className="border-t border-foreground pt-1">
                <p className="text-[11px] font-bold">{r.customer_name}</p>
                <p className="text-[10px] text-muted-foreground">Renter signature · Date</p>
              </div>
            </div>
            <div>
              <div className="border-t border-foreground pt-1">
                <p className="text-[11px] font-bold">{store?.name ?? "Authorized representative"}</p>
                <p className="text-[10px] text-muted-foreground">Staff signature · Date</p>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          Thank you for renting with {store?.name ?? "us"} · Receipt printed {new Date().toLocaleString()}
        </p>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 print:bg-white">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, text }: { icon: typeof Car; text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-foreground">{text}</span>
    </p>
  );
}

function Line({ label, value, sub, bold }: { label: string; value: string; sub?: string; bold?: boolean }) {
  return (
    <div className={cn("px-4 py-2 flex items-baseline justify-between", bold && "bg-muted/20 font-semibold")}>
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
      <p className={cn("text-sm tabular-nums shrink-0 ml-3", bold ? "text-foreground" : "text-foreground")}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : status === "confirmed" ? "bg-primary/10 text-primary border-primary/30"
    : status === "picked_up" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : status === "returned" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", tone)}>
      {status === "no_show" ? "no-show" : status === "picked_up" ? "on rental" : status}
    </span>
  );
}
