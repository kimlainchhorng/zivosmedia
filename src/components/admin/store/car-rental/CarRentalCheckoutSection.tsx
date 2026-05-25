/**
 * CarRentalCheckoutSection — process today's pickups.
 *
 * Lists pending/confirmed reservations whose pickup_at is today (or earlier
 * but not yet picked up). Hand keys: capture start odometer, fuel level,
 * verify license, then transition to 'picked_up'.
 */
import { useMemo, useState } from "react";
import {
  KeyRound, Loader2, AlertTriangle, ChevronLeft, ChevronRight, User, Calendar,
  CheckCircle2, Fuel, Gauge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCarRentalReservations, type CarRentalReservation } from "@/hooks/car-rental/useCarRentalReservations";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalCheckoutSection({ storeId }: Props) {
  const [date, setDate] = useState(todayIso());
  const { reservations, loading, saving, update } = useCarRentalReservations({ storeId, date });
  const [active, setActive] = useState<CarRentalReservation | null>(null);

  const eligible = useMemo(
    () => reservations.filter((r) => r.status === "pending" || r.status === "confirmed").sort((a, b) => a.pickup_at.localeCompare(b.pickup_at)),
    [reservations],
  );

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5 text-primary" /> Pickups due
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {eligible.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(addDays(date, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(addDays(date, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(todayIso())}>Today</Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : eligible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <KeyRound className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No pickups scheduled. Use the Reservations tab to add one.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {eligible.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 sm:flex-1 sm:min-w-0">
                    <div className="grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
                      {formatTime(r.pickup_at).replace(" ", "")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{r.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.vehicle_label} · {r.rental_days} day{r.rental_days === 1 ? "" : "s"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {r.customer_phone ?? "No phone on file"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <span className="text-sm font-bold text-foreground">{formatMoney(r.total_cents)}</span>
                    <Button size="sm" disabled={saving} onClick={() => setActive(r)}>
                      <KeyRound className="mr-1 h-3.5 w-3.5" /> Check out
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {active && (
        <CheckoutDialog
          reservation={active}
          onClose={() => setActive(null)}
          onConfirm={async (patch) => {
            await update(active.id, {
              ...patch,
              status: "picked_up",
              picked_up_at: new Date().toISOString(),
            });
            setActive(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

function CheckoutDialog({
  reservation: r, onClose, onConfirm, saving,
}: {
  reservation: CarRentalReservation;
  onClose: () => void;
  onConfirm: (patch: Partial<CarRentalReservation>) => Promise<void>;
  saving: boolean;
}) {
  const [odometer, setOdometer] = useState<string>("");
  const [fuelLevel, setFuelLevel] = useState<number>(100);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [depositCollected, setDepositCollected] = useState<number>(r.security_deposit_cents / 100);
  const [notes, setNotes] = useState<string>(r.internal_notes ?? "");
  const [vehicleStartOdometer, setVehicleStartOdometer] = useState<number | null>(null);

  // Pre-trip inspection — six-point walkthrough
  const [inspection, setInspection] = useState({
    exterior: false,
    interior: false,
    tires: false,
    fluids: false,
    lights: false,
    accessories: false,
  });
  const allInspected = Object.values(inspection).every(Boolean);
  const inspectionScore = Object.values(inspection).filter(Boolean).length;

  // Fetch the vehicle's current odometer for a sensible default.
  useState(() => {
    if (!r.vehicle_id) return;
    void (async () => {
      const { data } = await supabase
        .from("car_rental_vehicles")
        .select("current_odometer")
        .eq("id", r.vehicle_id!)
        .maybeSingle();
      if (data) {
        const cur = (data as any).current_odometer ?? 0;
        setVehicleStartOdometer(cur);
        setOdometer(String(cur));
      }
    })();
  });

  const odoNumber = odometer === "" ? null : Number(odometer);
  const canConfirm = licenseVerified && allInspected && odoNumber !== null && !Number.isNaN(odoNumber);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check out — {r.customer_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-semibold text-foreground">{r.vehicle_label}</p>
            <p className="text-xs text-muted-foreground">
              <Calendar className="mr-1 inline-block h-3 w-3" />
              {new Date(r.pickup_at).toLocaleString()} → {new Date(r.dropoff_at).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              <User className="mr-1 inline-block h-3 w-3" />
              {r.customer_phone ?? "no phone"}{r.customer_email ? ` · ${r.customer_email}` : ""}
            </p>
          </div>

          <label className={cn(
            "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",
            licenseVerified ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"
          )}>
            <div>
              <p className="text-sm font-semibold text-foreground">Driver license verified</p>
              <p className="text-[11px] text-muted-foreground">Check ID before handing over the keys.</p>
            </div>
            <input type="checkbox" checked={licenseVerified} onChange={(e) => setLicenseVerified(e.target.checked)} className="h-5 w-5 accent-primary" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start odometer (mi)">
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" type="number" min={0} value={odometer} onChange={(e) => setOdometer(e.target.value)} />
              </div>
              {vehicleStartOdometer !== null && (
                <p className="text-[11px] text-muted-foreground">Vehicle currently at {vehicleStartOdometer.toLocaleString()} mi</p>
              )}
            </Field>
            <Field label={`Start fuel level: ${fuelLevel}%`}>
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-muted-foreground" />
                <input type="range" min={0} max={100} step={5} value={fuelLevel} onChange={(e) => setFuelLevel(Number(e.target.value))} className="flex-1 accent-primary" />
              </div>
            </Field>
          </div>

          <Field label="Security deposit collected ($)">
            <Input type="number" min={0} step="0.01" value={depositCollected} onChange={(e) => setDepositCollected(Number(e.target.value || 0))} />
            <p className="text-[11px] text-muted-foreground">Refunded back when the vehicle is returned in good condition.</p>
          </Field>

          {/* Pre-trip inspection */}
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Pre-trip inspection</p>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                allInspected ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
              )}>
                {inspectionScore} / 6
              </span>
            </div>
            <p className="mb-2 text-[11px] text-muted-foreground">Walk around the vehicle and tick each item before handing keys.</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {[
                { key: "exterior", label: "Exterior (no new scratches/dents)" },
                { key: "interior", label: "Interior (clean, seats undamaged)" },
                { key: "tires", label: "Tires (pressure & tread)" },
                { key: "fluids", label: "Fluids (oil, washer, coolant)" },
                { key: "lights", label: "Lights & signals working" },
                { key: "accessories", label: "Accessories (manual, spare key, tools)" },
              ].map(({ key, label }) => {
                const checked = (inspection as any)[key] as boolean;
                return (
                  <label key={key} className={cn(
                    "flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors",
                    checked ? "border-emerald-500/30 bg-emerald-500/5" : "border-border hover:bg-muted/40"
                  )}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setInspection({ ...inspection, [key]: e.target.checked })}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span className="text-xs leading-tight text-foreground">{label}</span>
                  </label>
                );
              })}
            </ul>
          </div>

          <Field label="Internal notes">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember…" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!canConfirm || saving} onClick={() => onConfirm({
            pickup_odometer: odoNumber ?? undefined,
            pickup_fuel_level: fuelLevel,
            deposit_paid_cents: Math.round(depositCollected * 100),
            internal_notes: notes
              ? `${notes}\n\n[Pre-trip inspection: ${inspectionScore}/6 passed]`
              : `[Pre-trip inspection: ${inspectionScore}/6 passed]`,
          })}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            Hand over keys
          </Button>
        </DialogFooter>
        {!licenseVerified && (
          <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" /> Driver license must be verified before handing keys.
          </p>
        )}
        {!allInspected && licenseVerified && (
          <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" /> Complete all 6 inspection items before handing keys.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
