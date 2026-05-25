/**
 * Printable daily pickup & return sheet for the car-rental front desk.
 * Route: /admin/stores/:storeId/car-rental-daily-sheet?date=YYYY-MM-DD
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Car, KeyRound, ClipboardCheck, Loader2, Printer, ChevronLeft, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle_label: string;
  vehicle_category: string | null;
  pickup_at: string;
  dropoff_at: string;
  pickup_location_name: string | null;
  dropoff_location_name: string | null;
  rental_days: number;
  total_cents: number;
  security_deposit_cents: number;
  status: string;
  confirmation_code: string;
  customer_notes: string | null;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalDailySheetPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date") ?? todayIso();

  const [store, setStore] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [pickups, setPickups] = useState<Reservation[]>([]);
  const [returns, setReturns] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!storeId) return;
      setLoading(true);
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const [storeR, pickupsR, returnsR] = await Promise.all([
        supabase.from("store_profiles").select("name, logo_url").eq("id", storeId).maybeSingle(),
        supabase.from("car_rental_reservations").select("*")
          .eq("store_id", storeId)
          .in("status", ["pending", "confirmed"])
          .gte("pickup_at", dayStart.toISOString())
          .lt("pickup_at", dayEnd.toISOString())
          .order("pickup_at", { ascending: true }),
        supabase.from("car_rental_reservations").select("*")
          .eq("store_id", storeId)
          .eq("status", "picked_up")
          .gte("dropoff_at", dayStart.toISOString())
          .lt("dropoff_at", dayEnd.toISOString())
          .order("dropoff_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setStore(storeR.data as any ?? null);
      setPickups((pickupsR.data ?? []) as unknown as Reservation[]);
      setReturns((returnsR.data ?? []) as unknown as Reservation[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, date]);

  const totals = useMemo(() => {
    const pickupRevenue = pickups.reduce((s, r) => s + r.total_cents, 0);
    const depositsCollecting = pickups.reduce((s, r) => s + r.security_deposit_cents, 0);
    return { pickupRevenue, depositsCollecting };
  }, [pickups]);

  const setDate = (newDate: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("date", newDate);
    setSearchParams(params);
  };
  const addDay = (n: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + n);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <Helmet>
        <title>Daily sheet · {store?.name ?? "Car Rental"} · {date}</title>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            @page { margin: 12mm; size: portrait; }
          }
        `}</style>
      </Helmet>

      <header className="no-print sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to={storeId ? `/admin/stores/${storeId}?tab=car-rental-dashboard` : "/"} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => addDay(-1)}>Prev</Button>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm" />
            <Button variant="outline" size="sm" onClick={() => addDay(1)}>Next</Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 print:px-0 print:py-0">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Daily Pickup & Return Sheet</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{store?.name}</p>
            <p className="mt-0.5 text-base font-semibold text-foreground">{formatDate(`${date}T12:00:00`)}</p>
          </div>
          {store?.logo_url && <img src={store.logo_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Pickups" value={String(pickups.length)} icon={KeyRound} />
          <Stat label="Returns" value={String(returns.length)} icon={ClipboardCheck} />
          <Stat label="Revenue checking out" value={formatMoney(totals.pickupRevenue)} icon={Car} />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <section className="mb-6">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-foreground">
                <KeyRound className="h-5 w-5 text-primary" /> Pickups today ({pickups.length})
              </h2>
              {pickups.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No pickups scheduled.</p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border print:rounded-none">
                  {pickups.map((r) => (
                    <SheetRow key={r.id} r={r} variant="pickup" />
                  ))}
                </ul>
              )}
            </section>

            <section className="mb-6">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-foreground">
                <ClipboardCheck className="h-5 w-5 text-primary" /> Returns due today ({returns.length})
              </h2>
              {returns.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No returns due.</p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border print:rounded-none">
                  {returns.map((r) => (
                    <SheetRow key={r.id} r={r} variant="return" />
                  ))}
                </ul>
              )}
            </section>

            <div className="mt-8 border-t-2 border-foreground pt-3 text-[11px] text-muted-foreground">
              <p>Printed {new Date().toLocaleString()} · {store?.name}</p>
              <p>Verify driver license at pickup. Inspect vehicle for damage at both pickup and return.</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Car }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 print:bg-white">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function SheetRow({ r, variant }: { r: Reservation; variant: "pickup" | "return" }) {
  const time = variant === "pickup" ? r.pickup_at : r.dropoff_at;
  return (
    <li className="p-3 print:p-2 print:break-inside-avoid">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
          {formatTime(time).replace(" ", "")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{r.customer_name}</p>
            <span className="font-mono text-[10px] text-muted-foreground">{r.confirmation_code}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{r.vehicle_label}</p>
          <p className="text-[11px] text-muted-foreground">
            {r.customer_phone ?? "no phone"}{r.customer_email ? ` · ${r.customer_email}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {variant === "pickup"
              ? `Return ${new Date(r.dropoff_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} (${r.rental_days} day${r.rental_days === 1 ? "" : "s"})`
              : `Picked up ${new Date(r.pickup_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
            }
          </p>
          {((variant === "pickup" ? r.pickup_location_name : r.dropoff_location_name)) && (
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {variant === "pickup" ? r.pickup_location_name : r.dropoff_location_name}
            </p>
          )}
          {r.customer_notes && (
            <p className="mt-1 rounded border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-500/5 px-2 py-1 text-[11px] text-amber-900 dark:text-amber-200">
              <span className="font-semibold">Note: </span>{r.customer_notes}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">{formatMoney(r.total_cents)}</p>
          {r.security_deposit_cents > 0 && variant === "pickup" && (
            <p className="text-[10px] text-muted-foreground">+ {formatMoney(r.security_deposit_cents)} deposit</p>
          )}
        </div>
      </div>
      {/* Signature lines for printout */}
      {variant === "pickup" && (
        <div className="mt-3 hidden print:flex gap-6 text-[10px] text-muted-foreground">
          <div className="flex-1 border-t border-muted-foreground/40 pt-1">License verified</div>
          <div className="flex-1 border-t border-muted-foreground/40 pt-1">Start odometer</div>
          <div className="flex-1 border-t border-muted-foreground/40 pt-1">Fuel level</div>
          <div className="flex-1 border-t border-muted-foreground/40 pt-1">Renter signature</div>
        </div>
      )}
      {variant === "return" && (
        <div className={cn("mt-3 hidden print:flex gap-6 text-[10px] text-muted-foreground")}>
          <div className="flex-1 border-t border-muted-foreground/40 pt-1">End odometer</div>
          <div className="flex-1 border-t border-muted-foreground/40 pt-1">Fuel level</div>
          <div className="flex-1 border-t border-muted-foreground/40 pt-1">Damage / cleanliness</div>
          <div className="flex-1 border-t border-muted-foreground/40 pt-1">Staff signature</div>
        </div>
      )}
    </li>
  );
}
