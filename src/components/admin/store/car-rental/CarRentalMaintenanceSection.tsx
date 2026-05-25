/**
 * CarRentalMaintenanceSection — service log per vehicle.
 */
import { useMemo, useState } from "react";
import {
  Wrench, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertTriangle, Car, Ban, CalendarX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  useCarRentalMaintenance, type CarRentalMaintenance, type CarRentalMaintenanceDraft, type CarRentalMaintenanceServiceType,
} from "@/hooks/car-rental/useCarRentalMaintenance";
import { useCarRentalVehicles } from "@/hooks/car-rental/useCarRentalVehicles";
import {
  useCarRentalBlackouts, type CarRentalBlackoutCategory,
} from "@/hooks/car-rental/useCarRentalBlackouts";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const SERVICE_TYPES: { value: CarRentalMaintenanceServiceType; label: string }[] = [
  { value: "oil_change", label: "Oil change" },
  { value: "tire_rotation", label: "Tire rotation" },
  { value: "tire_replacement", label: "Tire replacement" },
  { value: "brake_service", label: "Brake service" },
  { value: "battery", label: "Battery" },
  { value: "inspection", label: "Safety inspection" },
  { value: "cleaning", label: "Cleaning" },
  { value: "detailing", label: "Detailing" },
  { value: "body_work", label: "Body work" },
  { value: "engine", label: "Engine" },
  { value: "transmission", label: "Transmission" },
  { value: "recall", label: "Recall" },
  { value: "other", label: "Other" },
];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const EMPTY = (vehicleId: string): CarRentalMaintenanceDraft => ({
  vehicle_id: vehicleId,
  service_type: "oil_change",
  description: "",
  cost_cents: 0,
  service_date: todayIso(),
  took_vehicle_offline: false,
});

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalMaintenanceSection({ storeId }: Props) {
  const { records, loading, saving, error, create, update, remove } = useCarRentalMaintenance(storeId);
  const { vehicles } = useCarRentalVehicles(storeId);
  const blackoutHook = useCarRentalBlackouts(storeId);
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalMaintenance | null>(null);
  const [draft, setDraft] = useState<CarRentalMaintenanceDraft>(EMPTY(vehicles[0]?.id ?? ""));
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (vehicleFilter === "all") return records;
    return records.filter((r) => r.vehicle_id === vehicleFilter);
  }, [records, vehicleFilter]);

  const totalCost = useMemo(() => filtered.reduce((s, r) => s + r.cost_cents, 0), [filtered]);

  const openCreate = () => {
    if (vehicles.length === 0) return;
    setEditing(null);
    setDraft(EMPTY(vehicleFilter === "all" ? vehicles[0].id : vehicleFilter));
    setDialogOpen(true);
  };
  const openEdit = (r: CarRentalMaintenance) => {
    setEditing(r);
    setDraft({
      vehicle_id: r.vehicle_id,
      service_type: r.service_type,
      description: r.description,
      notes: r.notes,
      cost_cents: r.cost_cents,
      shop: r.shop,
      odometer: r.odometer,
      service_date: r.service_date,
      next_service_due_date: r.next_service_due_date,
      next_service_due_odometer: r.next_service_due_odometer,
      took_vehicle_offline: r.took_vehicle_offline,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!draft.vehicle_id || !draft.description.trim()) return;
    if (editing) {
      await update(editing.id, draft);
    } else {
      const created = await create(draft);
      // If the user marked the vehicle offline, flip the vehicle status.
      if (created && draft.took_vehicle_offline) {
        await supabase.from("car_rental_vehicles").update({ status: "maintenance" } as never).eq("id", draft.vehicle_id);
      }
    }
    setDialogOpen(false);
  };

  const labelFor = (vid: string | null) => {
    if (!vid) return "—";
    const v = vehicles.find((x) => x.id === vid);
    return v ? `${v.year ? `${v.year} ` : ""}${v.make} ${v.model}` : "Unknown";
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-5 w-5 text-primary" /> Maintenance log
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {filtered.length}
            </span>
          </CardTitle>
          <Button size="sm" onClick={openCreate} disabled={vehicles.length === 0}>
            <Plus className="mr-1 h-4 w-4" /> Add record
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vehicles</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.year ? `${v.year} ` : ""}{v.make} {v.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm">
              <span className="text-muted-foreground">Total cost:</span>{" "}
              <span className="font-bold text-foreground">{formatMoney(totalCost)}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Wrench className="mx-auto mb-2 h-8 w-8 opacity-50" />
              {records.length === 0 ? "No maintenance records yet. Add one to start tracking service history." : "No records for this vehicle."}
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {filtered.map((r) => (
                <li key={r.id} className="group flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 sm:flex-1 sm:min-w-0">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground capitalize">
                        {r.service_type.replace(/_/g, " ")} — {r.description}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        <Car className="mr-1 inline-block h-3 w-3" />
                        {labelFor(r.vehicle_id)} · {new Date(r.service_date).toLocaleDateString()}
                        {r.odometer ? ` · ${r.odometer.toLocaleString()} mi` : ""}
                        {r.shop ? ` · ${r.shop}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <span className="text-sm font-bold text-foreground">{formatMoney(r.cost_cents)}</span>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit record" : "Add maintenance record"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <Field label="Vehicle *" className="sm:col-span-2">
              <Select value={draft.vehicle_id} onValueChange={(v) => setDraft({ ...draft, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.year ? `${v.year} ` : ""}{v.make} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Service type">
              <Select value={draft.service_type} onValueChange={(v) => setDraft({ ...draft, service_type: v as CarRentalMaintenanceServiceType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Service date">
              <Input type="date" value={draft.service_date} onChange={(e) => setDraft({ ...draft, service_date: e.target.value })} />
            </Field>
            <Field label="Description *" className="sm:col-span-2">
              <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What was done" />
            </Field>
            <Field label="Cost ($)">
              <Input type="number" step="0.01" min={0} value={draft.cost_cents / 100} onChange={(e) => setDraft({ ...draft, cost_cents: Math.round(Number(e.target.value || 0) * 100) })} />
            </Field>
            <Field label="Odometer (mi)">
              <Input type="number" min={0} value={draft.odometer ?? ""} onChange={(e) => setDraft({ ...draft, odometer: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="Shop / mechanic" className="sm:col-span-2">
              <Input value={draft.shop ?? ""} onChange={(e) => setDraft({ ...draft, shop: e.target.value })} />
            </Field>
            <Field label="Next service due date">
              <Input type="date" value={draft.next_service_due_date ?? ""} onChange={(e) => setDraft({ ...draft, next_service_due_date: e.target.value || null })} />
            </Field>
            <Field label="Next service due odometer">
              <Input type="number" min={0} value={draft.next_service_due_odometer ?? ""} onChange={(e) => setDraft({ ...draft, next_service_due_odometer: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5 sm:col-span-2">
              <Label className="text-sm">Take vehicle offline (status → maintenance)</Label>
              <Switch checked={draft.took_vehicle_offline ?? false} onCheckedChange={(c) => setDraft({ ...draft, took_vehicle_offline: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !draft.vehicle_id || !draft.description.trim()}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {editing ? "Save changes" : "Add record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete record?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This removes the maintenance entry permanently.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteId) { await remove(deleteId); setDeleteId(null); }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BlackoutsCard
        vehicles={vehicles}
        blackouts={blackoutHook.blackouts}
        loading={blackoutHook.loading}
        saving={blackoutHook.saving}
        error={blackoutHook.error}
        onCreate={blackoutHook.create}
        onDelete={blackoutHook.remove}
      />
    </div>
  );
}

function BlackoutsCard({ vehicles, blackouts, loading, saving, error, onCreate, onDelete }: {
  vehicles: ReturnType<typeof useCarRentalVehicles>["vehicles"];
  blackouts: ReturnType<typeof useCarRentalBlackouts>["blackouts"];
  loading: boolean;
  saving: boolean;
  error: string | null;
  onCreate: ReturnType<typeof useCarRentalBlackouts>["create"];
  onDelete: ReturnType<typeof useCarRentalBlackouts>["remove"];
}) {
  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<CarRentalBlackoutCategory>("maintenance");

  const openCreate = () => {
    if (vehicles.length === 0) return;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T09:00`;
    setVehicleId(vehicles[0].id);
    setStartsAt(iso);
    setEndsAt(iso.replace("T09:00", "T17:00"));
    setReason("");
    setCategory("maintenance");
    setOpen(true);
  };

  const save = async () => {
    if (!vehicleId || !startsAt || !endsAt) return;
    const created = await onCreate({
      vehicle_id: vehicleId,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      reason: reason || null,
      category,
    });
    if (created) setOpen(false);
  };

  const labelFor = (vid: string) => {
    const v = vehicles.find((x) => x.id === vid);
    return v ? `${v.year ? `${v.year} ` : ""}${v.make} ${v.model}` : "Unknown";
  };

  const upcoming = blackouts.filter((b) => new Date(b.ends_at).getTime() > Date.now());

  return (
    <>
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ban className="h-5 w-5 text-primary" /> Blackout windows
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {upcoming.length}
            </span>
          </CardTitle>
          <Button size="sm" onClick={openCreate} disabled={vehicles.length === 0}>
            <Plus className="mr-1 h-4 w-4" /> Block dates
          </Button>
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
          ) : upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <CalendarX className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No upcoming blackouts. Use this to block dates for maintenance, holidays, or owner use.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {upcoming.map((b) => (
                <li key={b.id} className="group flex items-center gap-3 p-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <CalendarX className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {labelFor(b.vehicle_id)}
                      <span className="ml-1.5 text-[11px] font-normal capitalize text-muted-foreground">· {b.category}</span>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {new Date(b.starts_at).toLocaleString()} → {new Date(b.ends_at).toLocaleString()}
                    </p>
                    {b.reason && <p className="truncate text-[11px] text-muted-foreground">{b.reason}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100" onClick={() => onDelete(b.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Block dates</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Vehicle">
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.year ? `${v.year} ` : ""}{v.make} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Starts">
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </Field>
              <Field label="Ends">
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </Field>
            </div>
            <Field label="Category">
              <Select value={category} onValueChange={(v) => setCategory(v as CarRentalBlackoutCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved (internal)</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="personal">Personal use</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reason (optional)">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brake job at City Auto" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !vehicleId || !startsAt || !endsAt}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Block dates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
