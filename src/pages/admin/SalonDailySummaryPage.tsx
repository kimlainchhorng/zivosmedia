/**
 * SalonDailySummaryPage — printable end-of-day close-out sheet at
 * /admin/salon-summary/:storeId/:date. Totals revenue + tips + tax, lists
 * per-stylist breakdown, counts walk-ins and no-shows. Owner-only via RLS.
 * Pass ?print=1 to auto-trigger the print dialog (same pattern as the daily
 * schedule page).
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Printer, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SummaryBooking {
  id: string;
  stylist_name: string | null;
  client_name: string;
  service_name: string;
  start_at: string;
  status: string;
  source: string;
  price_cents: number;
  addons_total_cents: number;
  tip_cents: number;
  tax_cents: number;
  deposit_paid_cents: number;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export default function SalonDailySummaryPage() {
  const { storeId = "", date = "" } = useParams<{ storeId: string; date: string }>();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";

  const [storeName, setStoreName] = useState("");
  const [rows, setRows] = useState<SummaryBooking[]>([]);
  const [retailByBooking, setRetailByBooking] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId || !date) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const dayStart = new Date(`${date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();
      const [storeRes, bookingsRes] = await Promise.all([
        supabase.from("store_profiles").select("name").eq("id", storeId).maybeSingle(),
        supabase.from("salon_bookings")
          .select("id, stylist_name, client_name, service_name, start_at, status, source, price_cents, addons_total_cents, tip_cents, tax_cents, deposit_paid_cents")
          .eq("store_id", storeId)
          .gte("start_at", dayStart).lte("start_at", dayEnd)
          .order("start_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (storeRes.error || !storeRes.data) {
        setError("Couldn't load store.");
        setLoading(false);
        return;
      }
      const bookings = (bookingsRes.data ?? []) as unknown as SummaryBooking[];
      setStoreName((storeRes.data as any).name);
      setRows(bookings);

      // Retail sold on today's completed bookings — every other revenue surface
      // in the salon (Dashboard, Income, Reports) includes retail in gross, so
      // omitting it here would silently underreport the end-of-day close-out.
      const completedIds = bookings.filter((b) => b.status === "completed").map((b) => b.id);
      if (completedIds.length > 0) {
        const { data: retail } = await supabase
          .from("salon_booking_retail_items")
          .select("booking_id, unit_price_cents, quantity")
          .in("booking_id", completedIds);
        if (cancelled) return;
        const map = new Map<string, number>();
        for (const r of (retail ?? []) as Array<{ booking_id: string; unit_price_cents: number; quantity: number }>) {
          map.set(r.booking_id, (map.get(r.booking_id) ?? 0) + r.unit_price_cents * r.quantity);
        }
        setRetailByBooking(map);
      } else {
        setRetailByBooking(new Map());
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, date]);

  useEffect(() => {
    if (autoPrint && !loading) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [autoPrint, loading]);

  const summary = useMemo(() => {
    let booked = 0, completed = 0, noShow = 0, cancelled = 0, walkIns = 0;
    let revenue = 0, retail = 0, tips = 0, tax = 0, depositsHeld = 0;
    const perStylist = new Map<string, { name: string; visits: number; revenue: number; tips: number }>();

    for (const b of rows) {
      booked += 1;
      if (b.source === "walk_in") walkIns += 1;
      if (b.status === "completed") {
        completed += 1;
        // Service revenue = base + add-ons (rolled up by the salon_booking_addons trigger).
        const lineService = b.price_cents + (b.addons_total_cents ?? 0);
        const lineRetail = retailByBooking.get(b.id) ?? 0;
        revenue += lineService;
        retail += lineRetail;
        tips += b.tip_cents;
        tax += b.tax_cents;
        depositsHeld += b.deposit_paid_cents;
        const key = b.stylist_name ?? "Unassigned";
        const entry = perStylist.get(key) ?? { name: key, visits: 0, revenue: 0, tips: 0 };
        entry.visits += 1;
        // Stylist-level revenue stays services+addons only — retail commission
        // policy varies and shouldn't be implicitly attributed to the stylist.
        entry.revenue += lineService;
        entry.tips += b.tip_cents;
        perStylist.set(key, entry);
      }
      if (b.status === "no_show") noShow += 1;
      if (b.status === "cancelled") cancelled += 1;
    }

    const stylists = Array.from(perStylist.values()).sort((a, b) => b.revenue - a.revenue);
    // Gross is the owner's take-home — services + add-ons + retail + tips.
    // Tax is pass-through (owed to the government) so it's reported separately.
    const gross = revenue + retail + tips;
    return { booked, completed, noShow, cancelled, walkIns, revenue, retail, tips, tax, depositsHeld, gross, stylists };
  }, [rows, retailByBooking]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-base font-semibold text-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 print:bg-white">
      <Helmet><title>Daily summary · {formatDay(date)} · {storeName}</title></Helmet>

      <style>{`
        @media print {
          @page { size: auto; margin: 12mm; }
          body { background: white !important; }
          .summary-noprint { display: none !important; }
          .summary-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-4 py-8 print:p-0">
        <div className="summary-noprint mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => {
            // Page is usually opened in a new tab (target="_blank") so
            // history.back() is a no-op. Try close → back → parent route.
            const before = window.history.length;
            window.close();
            window.history.back();
            setTimeout(() => {
              if (window.history.length === before) {
                window.location.href = `/admin/stores/${storeId}?tab=salon-bookings`;
              }
            }, 60);
          }} className="gap-1.5">
            <X className="h-4 w-4" /> Close
          </Button>
          <Button onClick={() => window.print()} size="sm" className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        <div className="summary-card rounded-2xl border border-border bg-card p-6 shadow-sm">
          <header className="border-b border-dashed border-border pb-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Daily summary</p>
            <h1 className="mt-0.5 text-2xl font-bold text-foreground">{storeName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatDay(date)}</p>
          </header>

          {/* Counters */}
          <section className="grid grid-cols-2 gap-3 border-b border-dashed border-border py-4 sm:grid-cols-5">
            <Stat label="Booked" value={String(summary.booked)} />
            <Stat label="Completed" value={String(summary.completed)} />
            <Stat label="Walk-ins" value={String(summary.walkIns)} />
            <Stat label="No-shows" value={String(summary.noShow)} tone={summary.noShow > 0 ? "warn" : "neutral"} />
            <Stat label="Cancelled" value={String(summary.cancelled)} />
          </section>

          {/* Money */}
          <section className="border-b border-dashed border-border py-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</p>
            <Row label="Services" value={formatMoney(summary.revenue)} />
            {summary.retail > 0 && <Row label="Retail" value={formatMoney(summary.retail)} />}
            {summary.tips > 0 && <Row label="Tips" value={formatMoney(summary.tips)} />}
            {summary.tax > 0 && <Row label="Tax collected" value={formatMoney(summary.tax)} />}
            {summary.depositsHeld > 0 && (
              <Row label="Deposits applied" value={formatMoney(summary.depositsHeld)} sub="(already collected prior to today)" />
            )}
            <div className="mt-3 flex items-baseline justify-between border-t-2 border-border pt-3">
              <span className="text-base font-bold text-foreground">Gross today</span>
              <span className="text-xl font-bold text-foreground">{formatMoney(summary.gross)}</span>
            </div>
          </section>

          {/* Per-stylist */}
          <section className="border-b border-dashed border-border py-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">By stylist</p>
            {summary.stylists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed services today.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pr-2">Stylist</th>
                    <th className="py-1.5 pr-2 text-right">Visits</th>
                    <th className="py-1.5 pr-2 text-right">Revenue</th>
                    <th className="py-1.5 text-right">Tips</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.stylists.map((s) => (
                    <tr key={s.name} className="border-b border-border/60">
                      <td className="py-1.5 pr-2 font-semibold text-foreground">{s.name}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{s.visits}</td>
                      <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatMoney(s.revenue)}</td>
                      <td className="py-1.5 text-right font-mono tabular-nums text-foreground/80">{formatMoney(s.tips)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Status logs */}
          {(summary.noShow > 0 || summary.cancelled > 0) && (
            <section className="border-b border-dashed border-border py-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status notes</p>
              <ul className="space-y-1 text-sm">
                {rows.filter((b) => b.status === "no_show" || b.status === "cancelled").map((b) => (
                  <li key={b.id} className="flex justify-between gap-2">
                    <span className="text-foreground/85">
                      <span className="font-mono text-xs text-muted-foreground">{new Date(b.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      {" · "}{b.client_name}{b.stylist_name ? ` (${b.stylist_name})` : ""}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {b.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="mt-6 pt-3 text-center text-[11px] text-muted-foreground">
            Printed from {storeName} · {new Date().toLocaleString()}
          </footer>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" | "neutral" }) {
  return (
    <div className={tone === "warn" ? "rounded-lg border border-amber-500/30 bg-amber-500/8 p-2 text-center" : "rounded-lg border border-border bg-card p-2 text-center"}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-muted-foreground">
        {label}
        {sub && <span className="ml-1 text-[10px]">{sub}</span>}
      </span>
      <span className="font-mono text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
