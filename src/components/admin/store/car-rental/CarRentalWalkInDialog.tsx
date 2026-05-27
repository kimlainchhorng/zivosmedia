/**
 * Single-screen walk-in booking for counter staff.
 *
 * One screen captures: vehicle, customer name + phone, license #, days, and
 * creates the reservation + optionally jumps it straight to picked_up so the
 * renter can drive off immediately.
 */
import { useEffect, useMemo, useState } from "react";
import {
  UserPlus, Car, Loader2, CheckCircle2, AlertTriangle, KeyRound,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { CarRentalVehicle } from "@/hooks/car-rental/useCarRentalVehicles";
import { cn } from "@/lib/utils";

interface Props {
  storeId: string;
  vehicles: CarRentalVehicle[];
  defaultLocationId?: string | null;
  defaultLocationName?: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalWalkInDialog({
  storeId, vehicles, defaultLocationId, defaultLocationName, open, onOpenChange, onSaved,
}: Props) {
  const [vehicleId, setVehicleId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [rentalDays, setRentalDays] = useState<number>(1);
  const [pickupTime, setPickupTime] = useState<string>("");
  const [handKeysImmediately, setHandKeysImmediately] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.is_active && v.status === "available"),
    [vehicles]
  );

  useEffect(() => {
    if (!open) return;
    setVehicleId(activeVehicles[0]?.id ?? "");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setLicenseNumber("");
    setRentalDays(1);
    const now = new Date();
    setPickupTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setHandKeysImmediately(true);
    setError(null);
  }, [open, activeVehicles]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const pickupAt = useMemo(() => {
    const d = new Date();
    if (pickupTime) {
      const [h, m] = pickupTime.split(":").map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d;
  }, [pickupTime]);
  const dropoffAt = useMemo(() => {
    const d = new Date(pickupAt.getTime() + rentalDays * 24 * 60 * 60 * 1000);
    return d;
  }, [pickupAt, rentalDays]);

  const baseTotal = selectedVehicle ? selectedVehicle.daily_rate_cents * rentalDays : 0;
  const securityDeposit = selectedVehicle?.security_deposit_cents ?? 0;
  const total = baseTotal + securityDeposit;
  const canSubmit = Boolean(selectedVehicle) && customerName.trim() && customerPhone.trim() && rentalDays >= 1;

  const submit = async () => {
    if (!selectedVehicle || !canSubmit) return;
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      store_id: storeId,
      vehicle_id: selectedVehicle.id,
      pickup_location_id: defaultLocationId ?? null,
      dropoff_location_id: defaultLocationId ?? null,
      vehicle_label: `${selectedVehicle.year ? `${selectedVehicle.year} ` : ""}${selectedVehicle.make} ${selectedVehicle.model}`,
      vehicle_category: selectedVehicle.category,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim() || null,
      pickup_location_name: defaultLocationName ?? null,
      dropoff_location_name: defaultLocationName ?? null,
      pickup_at: pickupAt.toISOString(),
      dropoff_at: dropoffAt.toISOString(),
      rental_days: rentalDays,
      daily_rate_cents: selectedVehicle.daily_rate_cents,
      base_total_cents: baseTotal,
      security_deposit_cents: securityDeposit,
      total_cents: total,
      status: handKeysImmediately ? "picked_up" : "confirmed",
      source: "walk_in",
      picked_up_at: handKeysImmediately ? new Date().toISOString() : null,
      pickup_odometer: handKeysImmediately ? selectedVehicle.current_odometer : null,
      pickup_fuel_level: handKeysImmediately ? 100 : null,
      deposit_paid_cents: securityDeposit,
      internal_notes: licenseNumber ? `Walk-in · License: ${licenseNumber.trim()}` : "Walk-in",
      created_by_user_id: user?.id ?? null,
    };
    const { error: err } = await supabase
      .from("car_rental_reservations")
      .insert(payload as never);
    if (err) {
      console.error(err);
      if ((err as any).code === "23P01") {
        setError("That vehicle has an overlapping reservation. Pick another.");
      } else {
        setError("Couldn't create walk-in. Please try again.");
      }
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Walk-in rental
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {activeVehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <Car className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No available vehicles to rent right now.
            </div>
          ) : (
            <>
              <Field label="Available vehicle">
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.year ? `${v.year} ` : ""}{v.make} {v.model} — {formatMoney(v.daily_rate_cents)}/day
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Customer name *">
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full name" />
                </Field>
                <Field label="Phone *">
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+1 555 …" />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email (optional)">
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </Field>
                <Field label="Driver license #">
                  <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pickup time (today)">
                  <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
                </Field>
                <Field label="Days">
                  <Input type="number" min={1} max={365} value={rentalDays} onChange={(e) => setRentalDays(Math.max(1, Number(e.target.value || 1)))} />
                </Field>
              </div>

              <label className={cn(
                "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",
                handKeysImmediately ? "border-primary/30 bg-primary/5" : "border-border"
              )}>
                <div>
                  <p className="text-sm font-semibold text-foreground">Hand over keys now</p>
                  <p className="text-[11px] text-muted-foreground">
                    Skip the confirmed/picked-up flow — mark as on-rental immediately.
                  </p>
                </div>
                <input type="checkbox" checked={handKeysImmediately} onChange={(e) => setHandKeysImmediately(e.target.checked)} className="h-5 w-5 accent-primary" />
              </label>

              {selectedVehicle && (
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {rentalDays} day{rentalDays === 1 ? "" : "s"} × {formatMoney(selectedVehicle.daily_rate_cents)}
                    </span>
                    <span className="font-semibold text-foreground">{formatMoney(baseTotal)}</span>
                  </div>
                  {securityDeposit > 0 && (
                    <div className="mt-1 flex justify-between">
                      <span className="text-muted-foreground">Security deposit (refundable)</span>
                      <span className="font-semibold text-foreground">{formatMoney(securityDeposit)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
                    <span>Collect now</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit || saving || activeVehicles.length === 0}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> :
              handKeysImmediately ? <KeyRound className="mr-1 h-4 w-4" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            {handKeysImmediately ? "Hand over keys" : "Create reservation"}
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
