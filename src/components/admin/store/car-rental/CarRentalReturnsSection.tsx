/**
 * CarRentalReturnsSection — process returns / check-in.
 *
 * Lists all 'picked_up' reservations regardless of date. Click one to record
 * end odometer + fuel + damage notes, compute over-mileage and refuel
 * charges, and transition to 'returned'.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck, Loader2, AlertTriangle, Fuel, Gauge, DollarSign, CheckCircle2, Car, AlertCircle, Camera, Plus, X,
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
import { cn } from "@/lib/utils";
import CarRentalDamageDiagram, { type DamageMark } from "./CarRentalDamageDiagram";

interface Props { storeId: string }

interface ActiveRental {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  vehicle_id: string | null;
  vehicle_label: string;
  pickup_at: string;
  dropoff_at: string;
  rental_days: number;
  pickup_odometer: number | null;
  pickup_fuel_level: number | null;
  base_total_cents: number;
  addons_total_cents: number;
  daily_rate_cents: number;
  security_deposit_cents: number;
  deposit_paid_cents: number;
  total_cents: number;
  amount_paid_cents: number;
}

interface VehiclePricing {
  mileage_limit_per_day: number | null;
  extra_mile_cents: number;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function CarRentalReturnsSection({ storeId }: Props) {
  const [rentals, setRentals] = useState<ActiveRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveRental | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_rental_reservations")
      .select("id, customer_name, customer_phone, vehicle_id, vehicle_label, pickup_at, dropoff_at, rental_days, pickup_odometer, pickup_fuel_level, base_total_cents, addons_total_cents, daily_rate_cents, security_deposit_cents, deposit_paid_cents, total_cents, amount_paid_cents")
      .eq("store_id", storeId)
      .eq("status", "picked_up")
      .order("dropoff_at", { ascending: true });
    if (err) {
      console.error(err);
      setError("Couldn't load active rentals.");
      setLoading(false);
      return;
    }
    setRentals((data ?? []) as unknown as ActiveRental[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [storeId]);

  useEffect(() => {
    const ch = supabase
      .channel(`car-rental-returns:${storeId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "car_rental_reservations", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [storeId]);

  const now = Date.now();
  const overdue = useMemo(() => rentals.filter((r) => new Date(r.dropoff_at).getTime() < now).length, [rentals, now]);

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-primary" /> On the road
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {rentals.length}
            </span>
            {overdue > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                {overdue} overdue
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rentals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Car className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No active rentals. Returns show up here once you check out a vehicle.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {rentals.map((r) => {
                const isOverdue = new Date(r.dropoff_at).getTime() < now;
                return (
                  <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3 sm:flex-1 sm:min-w-0">
                      <div className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                        isOverdue ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary"
                      )}>
                        {isOverdue ? <AlertCircle className="h-4 w-4" /> : <Car className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{r.customer_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.vehicle_label}</p>
                        <p className={cn("truncate text-[11px]", isOverdue ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-muted-foreground")}>
                          Due {formatDate(r.dropoff_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <Button size="sm" onClick={() => setActive(r)}>
                        <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> Process return
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {active && (
        <ReturnDialog
          rental={active}
          onClose={() => setActive(null)}
          saving={saving}
          onProcess={async (settle) => {
            setSaving(true);
            const { error: err } = await supabase
              .from("car_rental_reservations")
              .update({
                status: "returned",
                returned_at: new Date().toISOString(),
                dropoff_odometer: settle.dropoff_odometer,
                dropoff_fuel_level: settle.dropoff_fuel_level,
                damage_notes: settle.damage_notes,
                damage_photos: settle.damage_photos,
                damage_marks: settle.damage_marks,
                fees_cents: settle.extra_fees_cents,
                total_cents: settle.new_total_cents,
                amount_paid_cents: settle.amount_paid_cents,
              } as never)
              .eq("id", active.id);
            setSaving(false);
            if (err) {
              console.error(err);
              return;
            }
            setActive(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ReturnDialog({
  rental, onClose, onProcess, saving,
}: {
  rental: ActiveRental;
  onClose: () => void;
  onProcess: (settle: {
    dropoff_odometer: number;
    dropoff_fuel_level: number;
    damage_notes: string | null;
    damage_photos: string[];
    damage_marks: DamageMark[];
    extra_fees_cents: number;
    new_total_cents: number;
    amount_paid_cents: number;
  }) => Promise<void>;
  saving: boolean;
}) {
  const [endOdometer, setEndOdometer] = useState<string>(String(rental.pickup_odometer ?? ""));
  const [endFuel, setEndFuel] = useState<number>(rental.pickup_fuel_level ?? 100);
  const [damageNotes, setDamageNotes] = useState<string>("");
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState<string>("");
  const [damageMarks, setDamageMarks] = useState<DamageMark[]>([]);
  const [refuelChargeDollars, setRefuelChargeDollars] = useState<number>(0);
  const [damageChargeDollars, setDamageChargeDollars] = useState<number>(0);
  const [lateFeeDollars, setLateFeeDollars] = useState<number>(0);
  const [refundDeposit, setRefundDeposit] = useState<boolean>(true);
  const [vehicle, setVehicle] = useState<VehiclePricing | null>(null);

  // Late return detection — suggest a fee based on extra days × daily rate.
  const dropoffDue = new Date(rental.dropoff_at).getTime();
  const nowMs = Date.now();
  const lateMs = Math.max(0, nowMs - dropoffDue);
  const lateHours = lateMs / (60 * 60 * 1000);
  // Half-day grace, then charge per started day at daily rate.
  const extraDays = lateHours > 12 ? Math.ceil((lateHours - 12) / 24) : 0;
  const suggestedLateCents = extraDays * rental.daily_rate_cents;
  const isLate = lateHours > 0;

  useEffect(() => {
    if (suggestedLateCents > 0 && lateFeeDollars === 0) {
      setLateFeeDollars(suggestedLateCents / 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedLateCents]);

  useEffect(() => {
    if (!rental.vehicle_id) return;
    void (async () => {
      const { data } = await supabase
        .from("car_rental_vehicles")
        .select("mileage_limit_per_day, extra_mile_cents")
        .eq("id", rental.vehicle_id!)
        .maybeSingle();
      if (data) setVehicle(data as unknown as VehiclePricing);
    })();
  }, [rental.vehicle_id]);

  const startOdo = rental.pickup_odometer ?? 0;
  const endOdoNum = endOdometer === "" ? null : Number(endOdometer);
  const milesDriven = endOdoNum !== null && endOdoNum >= startOdo ? endOdoNum - startOdo : 0;

  const includedMiles = vehicle?.mileage_limit_per_day ? vehicle.mileage_limit_per_day * rental.rental_days : null;
  const extraMiles = includedMiles !== null ? Math.max(0, milesDriven - includedMiles) : 0;
  const extraMileageCents = vehicle && includedMiles !== null ? extraMiles * (vehicle.extra_mile_cents ?? 0) : 0;

  const refuelCents = Math.round(refuelChargeDollars * 100);
  const damageCents = Math.round(damageChargeDollars * 100);
  const lateFeeCents = Math.round(lateFeeDollars * 100);
  const extraFeesTotal = extraMileageCents + refuelCents + damageCents + lateFeeCents;
  const originalBase = rental.base_total_cents + rental.addons_total_cents;
  const newTotal = originalBase + extraFeesTotal + (refundDeposit ? 0 : rental.security_deposit_cents);
  const depositReturned = refundDeposit ? rental.deposit_paid_cents : 0;
  const stillOwed = Math.max(0, newTotal - (rental.amount_paid_cents + (rental.deposit_paid_cents - depositReturned)));

  const canSubmit = endOdoNum !== null && endOdoNum >= startOdo;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process return — {rental.customer_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-semibold text-foreground">{rental.vehicle_label}</p>
            <p className="text-xs text-muted-foreground">
              Picked up at {startOdo.toLocaleString()} mi · {rental.pickup_fuel_level ?? "—"}% fuel · {rental.rental_days} day{rental.rental_days === 1 ? "" : "s"}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="End odometer (mi)">
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" type="number" min={startOdo} value={endOdometer} onChange={(e) => setEndOdometer(e.target.value)} />
              </div>
              <p className="text-[11px] text-muted-foreground">{milesDriven.toLocaleString()} miles driven</p>
            </Field>
            <Field label={`End fuel level: ${endFuel}%`}>
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-muted-foreground" />
                <input type="range" min={0} max={100} step={5} value={endFuel} onChange={(e) => setEndFuel(Number(e.target.value))} className="flex-1 accent-primary" />
              </div>
            </Field>
          </div>

          {includedMiles !== null && extraMiles > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold">Over mileage allowance</p>
              <p className="text-xs">
                {extraMiles.toLocaleString()} mi × {formatMoney(vehicle?.extra_mile_cents ?? 0)}/mi = {formatMoney(extraMileageCents)}
              </p>
            </div>
          )}

          {isLate && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold">
                Late return — {lateHours < 24 ? `${Math.round(lateHours)}h late` : `${Math.floor(lateHours / 24)}d ${Math.round(lateHours % 24)}h late`}
              </p>
              <p className="text-xs">
                Suggested: {extraDays} extra day{extraDays === 1 ? "" : "s"} × {formatMoney(rental.daily_rate_cents)} = {formatMoney(suggestedLateCents)}
                {extraDays === 0 && " (within 12h grace — no charge)"}
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Refuel charge ($)">
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" type="number" min={0} step="0.01" value={refuelChargeDollars} onChange={(e) => setRefuelChargeDollars(Number(e.target.value || 0))} />
              </div>
            </Field>
            <Field label="Damage charge ($)">
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" type="number" min={0} step="0.01" value={damageChargeDollars} onChange={(e) => setDamageChargeDollars(Number(e.target.value || 0))} />
              </div>
            </Field>
            <Field label="Late return fee ($)">
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" type="number" min={0} step="0.01" value={lateFeeDollars} onChange={(e) => setLateFeeDollars(Number(e.target.value || 0))} />
              </div>
            </Field>
            <div /> {/* spacer */}
          </div>

          <CarRentalDamageDiagram marks={damageMarks} onChange={setDamageMarks} />

          <Field label="Damage / condition notes">
            <Textarea rows={2} value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="Scratches, dents, missing items, cleanliness…" />
          </Field>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80 inline-flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Damage photos ({damagePhotos.length}/6)
            </Label>
            <div className="flex gap-1.5">
              <Input
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                placeholder="https://example.com/damage.jpg"
                disabled={damagePhotos.length >= 6}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && photoInput.trim() && damagePhotos.length < 6) {
                    e.preventDefault();
                    setDamagePhotos([...damagePhotos, photoInput.trim()]);
                    setPhotoInput("");
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" disabled={!photoInput.trim() || damagePhotos.length >= 6}
                onClick={() => { setDamagePhotos([...damagePhotos, photoInput.trim()]); setPhotoInput(""); }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {damagePhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {damagePhotos.map((u, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded border border-border">
                    <img src={u} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                    <button type="button"
                      className="absolute inset-0 grid place-items-center bg-destructive/70 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => setDamagePhotos(damagePhotos.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Add image URLs — used as evidence on the receipt. Press Enter to add.
            </p>
          </div>

          <label className={cn(
            "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",
            refundDeposit ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30"
          )}>
            <div>
              <p className="text-sm font-semibold text-foreground">Refund security deposit ({formatMoney(rental.deposit_paid_cents)})</p>
              <p className="text-[11px] text-muted-foreground">Uncheck if the deposit is being kept to cover damages.</p>
            </div>
            <input type="checkbox" checked={refundDeposit} onChange={(e) => setRefundDeposit(e.target.checked)} className="h-5 w-5 accent-primary" />
          </label>

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <Row label="Original total" value={formatMoney(originalBase)} />
            {extraMileageCents > 0 && <Row label="Over mileage" value={formatMoney(extraMileageCents)} />}
            {refuelCents > 0 && <Row label="Refuel" value={formatMoney(refuelCents)} />}
            {damageCents > 0 && <Row label="Damage" value={formatMoney(damageCents)} />}
            {lateFeeCents > 0 && <Row label="Late return fee" value={formatMoney(lateFeeCents)} />}
            {!refundDeposit && rental.security_deposit_cents > 0 && (
              <Row label="Deposit kept" value={formatMoney(rental.security_deposit_cents)} />
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>New total</span>
              <span>{formatMoney(newTotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Already paid</span>
              <span>{formatMoney(rental.amount_paid_cents + (rental.deposit_paid_cents - depositReturned))}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm font-bold text-foreground">
              <span>Still owed</span>
              <span className={stillOwed > 0 ? "text-amber-700 dark:text-amber-300" : ""}>{formatMoney(stillOwed)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSubmit || saving} onClick={() => onProcess({
            dropoff_odometer: endOdoNum!,
            dropoff_fuel_level: endFuel,
            damage_notes: damageNotes.trim() || null,
            damage_photos: damagePhotos,
            damage_marks: damageMarks,
            extra_fees_cents: extraFeesTotal,
            new_total_cents: newTotal,
            amount_paid_cents: rental.amount_paid_cents + stillOwed,
          })}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            Close rental
          </Button>
        </DialogFooter>
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
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
