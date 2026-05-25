/**
 * CarRentalFleetSection — manage vehicles.
 */
import { useState } from "react";
import {
  Car, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertTriangle, Eye,
} from "lucide-react";
import CarRentalVehicleDetailDialog from "./CarRentalVehicleDetailDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useCarRentalVehicles, type CarRentalVehicle, type CarRentalVehicleDraft, type CarRentalCategory, type CarRentalTransmission, type CarRentalFuel, type CarRentalVehicleStatus } from "@/hooks/car-rental/useCarRentalVehicles";
import { useCarRentalLocations } from "@/hooks/car-rental/useCarRentalLocations";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const CATEGORIES: { value: CarRentalCategory; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "fullsize", label: "Full-size" },
  { value: "suv", label: "SUV" },
  { value: "minivan", label: "Minivan" },
  { value: "truck", label: "Truck" },
  { value: "luxury", label: "Luxury" },
  { value: "convertible", label: "Convertible" },
  { value: "sports", label: "Sports" },
];

const EMPTY_DRAFT: CarRentalVehicleDraft = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  color: "",
  license_plate: "",
  vin: "",
  category: "standard",
  transmission: "automatic",
  fuel_type: "gasoline",
  seats: 5,
  doors: 4,
  luggage_capacity: 2,
  air_conditioning: true,
  daily_rate_cents: 5000,
  weekly_rate_cents: 30000,
  monthly_rate_cents: 110000,
  hourly_rate_cents: 1500,
  mileage_limit_per_day: 200,
  extra_mile_cents: 25,
  security_deposit_cents: 20000,
  description: "",
  features: [],
  is_active: true,
};

export default function CarRentalFleetSection({ storeId }: Props) {
  const { vehicles, loading, saving, error, create, update, remove } = useCarRentalVehicles(storeId);
  const { locations } = useCarRentalLocations(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalVehicle | null>(null);
  const [draft, setDraft] = useState<CarRentalVehicleDraft>(EMPTY_DRAFT);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<CarRentalVehicle | null>(null);

  const openCreate = () => { setEditing(null); setDraft(EMPTY_DRAFT); setDialogOpen(true); };
  const openEdit = (v: CarRentalVehicle) => {
    setEditing(v);
    setDraft({
      make: v.make, model: v.model, year: v.year, color: v.color,
      license_plate: v.license_plate, vin: v.vin,
      category: v.category, transmission: v.transmission, fuel_type: v.fuel_type,
      seats: v.seats, doors: v.doors, luggage_capacity: v.luggage_capacity,
      air_conditioning: v.air_conditioning,
      daily_rate_cents: v.daily_rate_cents,
      weekly_rate_cents: v.weekly_rate_cents,
      monthly_rate_cents: v.monthly_rate_cents,
      hourly_rate_cents: v.hourly_rate_cents,
      mileage_limit_per_day: v.mileage_limit_per_day,
      extra_mile_cents: v.extra_mile_cents,
      security_deposit_cents: v.security_deposit_cents,
      home_location_id: v.home_location_id,
      description: v.description,
      features: v.features,
      photo_url: v.photo_url,
      photo_urls: v.photo_urls,
      is_active: v.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!draft.make.trim() || !draft.model.trim()) return;
    if (editing) {
      await update(editing.id, draft);
    } else {
      await create(draft);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-5 w-5 text-primary" />
            Fleet
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {vehicles.length}
            </span>
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add vehicle
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
          ) : vehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Car className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No vehicles yet. Add your first one to start taking reservations.
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v) => (
                <li key={v.id} className="group flex flex-col rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {v.year ? `${v.year} ` : ""}{v.make} {v.model}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground capitalize">
                        {v.category} · {v.transmission} · {v.fuel_type} · {v.seats} seats
                      </p>
                      {v.license_plate && (
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{v.license_plate}</p>
                      )}
                    </div>
                    <StatusPill status={v.status} />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="text-lg font-bold text-foreground">${(v.daily_rate_cents / 100).toFixed(0)}<span className="text-xs font-medium text-muted-foreground">/day</span></p>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Details" onClick={() => setDetailVehicle(v)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(v)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => setDeleteId(v.id)}>
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
        <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <Field label="Make *">
              <Input value={draft.make} onChange={(e) => setDraft({ ...draft, make: e.target.value })} placeholder="Toyota" />
            </Field>
            <Field label="Model *">
              <Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="Camry" />
            </Field>
            <Field label="Year">
              <Input type="number" value={draft.year ?? ""} onChange={(e) => setDraft({ ...draft, year: e.target.value ? Number(e.target.value) : null })} placeholder="2024" />
            </Field>
            <Field label="Color">
              <Input value={draft.color ?? ""} onChange={(e) => setDraft({ ...draft, color: e.target.value })} placeholder="Silver" />
            </Field>
            <Field label="License plate">
              <Input value={draft.license_plate ?? ""} onChange={(e) => setDraft({ ...draft, license_plate: e.target.value })} placeholder="ABC-1234" />
            </Field>
            <Field label="VIN">
              <Input value={draft.vin ?? ""} onChange={(e) => setDraft({ ...draft, vin: e.target.value })} placeholder="17 chars" />
            </Field>
            <Field label="Category">
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as CarRentalCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Home location">
              <Select value={draft.home_location_id ?? "none"} onValueChange={(v) => setDraft({ ...draft, home_location_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Transmission">
              <Select value={draft.transmission} onValueChange={(v) => setDraft({ ...draft, transmission: v as CarRentalTransmission })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fuel">
              <Select value={draft.fuel_type} onValueChange={(v) => setDraft({ ...draft, fuel_type: v as CarRentalFuel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Seats">
              <Input type="number" min={1} max={20} value={draft.seats} onChange={(e) => setDraft({ ...draft, seats: Number(e.target.value || 1) })} />
            </Field>
            <Field label="Doors">
              <Input type="number" min={1} max={10} value={draft.doors} onChange={(e) => setDraft({ ...draft, doors: Number(e.target.value || 1) })} />
            </Field>
            <Field label="Daily rate ($)">
              <Input type="number" min={0} value={draft.daily_rate_cents / 100} onChange={(e) => setDraft({ ...draft, daily_rate_cents: Math.round(Number(e.target.value || 0) * 100) })} />
            </Field>
            <Field label="Weekly rate ($)">
              <Input type="number" min={0} value={(draft.weekly_rate_cents ?? 0) / 100} onChange={(e) => setDraft({ ...draft, weekly_rate_cents: Math.round(Number(e.target.value || 0) * 100) })} />
            </Field>
            <Field label="Mileage limit / day">
              <Input type="number" min={0} value={draft.mileage_limit_per_day ?? ""} onChange={(e) => setDraft({ ...draft, mileage_limit_per_day: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" />
            </Field>
            <Field label="Extra mile ($)">
              <Input type="number" step="0.01" min={0} value={(draft.extra_mile_cents ?? 0) / 100} onChange={(e) => setDraft({ ...draft, extra_mile_cents: Math.round(Number(e.target.value || 0) * 100) })} />
            </Field>
            <Field label="Security deposit ($)">
              <Input type="number" min={0} value={(draft.security_deposit_cents ?? 0) / 100} onChange={(e) => setDraft({ ...draft, security_deposit_cents: Math.round(Number(e.target.value || 0) * 100) })} />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5 sm:col-span-2">
              <Label className="text-sm">Active (visible to renters)</Label>
              <Switch checked={draft.is_active ?? true} onCheckedChange={(c) => setDraft({ ...draft, is_active: c })} />
            </div>
            <Field label="Primary photo URL" className="sm:col-span-2">
              <Input
                value={draft.photo_url ?? ""}
                onChange={(e) => setDraft({ ...draft, photo_url: e.target.value || null })}
                placeholder="https://example.com/photo.jpg"
              />
              {draft.photo_url && (
                <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2">
                  <img
                    src={draft.photo_url}
                    alt="Vehicle preview"
                    className="h-32 w-full rounded object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground text-center">Primary photo · shown as the storefront thumbnail</p>
                </div>
              )}
            </Field>
            <Field label="Additional photos (gallery, up to 8)" className="sm:col-span-2">
              <ExtraPhotosEditor
                urls={draft.photo_urls ?? []}
                onChange={(urls) => setDraft({ ...draft, photo_urls: urls })}
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Comfortable mid-size sedan with backup camera and cruise control…" rows={3} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !draft.make.trim() || !draft.model.trim()}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {editing ? "Save changes" : "Add vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CarRentalVehicleDetailDialog
        vehicle={detailVehicle}
        onClose={() => setDetailVehicle(null)}
      />

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete vehicle?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes the vehicle from the fleet. Past reservations remain (their vehicle label is snapshotted).
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteId) { await remove(deleteId); setDeleteId(null); }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

function ExtraPhotosEditor({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
  const [input, setInput] = useState("");
  const max = 8;
  const remaining = max - urls.length;
  const add = () => {
    const v = input.trim();
    if (!v || urls.length >= max) return;
    onChange([...urls, v]);
    setInput("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          disabled={remaining <= 0}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="outline" size="sm" disabled={!input.trim() || remaining <= 0} onClick={add}>
          Add
        </Button>
      </div>
      {urls.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {urls.map((u, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded border border-border">
              <img src={u} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
              <button
                type="button"
                className="absolute inset-0 grid place-items-center bg-destructive/70 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onChange(urls.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        {urls.length} / {max} photos · shown as gallery thumbnails on the storefront
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: CarRentalVehicleStatus }) {
  const tone =
    status === "available" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : status === "rented" ? "border-primary/30 bg-primary/10 text-primary"
    : status === "maintenance" ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : "border-muted bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", tone)}>
      {status}
    </span>
  );
}
