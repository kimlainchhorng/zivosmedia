/**
 * CarRentalFleetSection — manage vehicles.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Car, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertTriangle, Eye, Search, X, Wrench, Copy,
} from "lucide-react";
import CarRentalVehicleDetailDialog from "./CarRentalVehicleDetailDialog";
import { supabase } from "@/integrations/supabase/client";
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
  photo_urls: [],
  registration_expires_at: null,
  insurance_expires_at: null,
  inspection_due_at: null,
  registration_number: "",
  insurance_provider: "",
  insurance_policy_number: "",
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
  const [serviceMap, setServiceMap] = useState<Map<string, { next_due_date: string | null; next_due_odometer: number | null }>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "rented" | "maintenance" | "retired">("all");

  // Latest "next_service_due" per vehicle for service alert chips.
  useEffect(() => {
    if (vehicles.length === 0) { setServiceMap(new Map()); return; }
    let cancelled = false;
    (async () => {
      const ids = vehicles.map((v) => v.id);
      const { data } = await supabase
        .from("car_rental_maintenance")
        .select("vehicle_id, next_service_due_date, next_service_due_odometer, service_date")
        .in("vehicle_id", ids)
        .order("service_date", { ascending: false });
      if (cancelled) return;
      const map = new Map<string, { next_due_date: string | null; next_due_odometer: number | null }>();
      for (const m of (data ?? []) as any[]) {
        if (!map.has(m.vehicle_id)) {
          map.set(m.vehicle_id, { next_due_date: m.next_service_due_date, next_due_odometer: m.next_service_due_odometer });
        }
      }
      setServiceMap(map);
    })();
    return () => { cancelled = true; };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    let list = vehicles;
    if (statusFilter !== "all") list = list.filter((v) => v.status === statusFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((v) =>
        v.make.toLowerCase().includes(q)
        || v.model.toLowerCase().includes(q)
        || (v.license_plate ?? "").toLowerCase().includes(q)
        || (v.vin ?? "").toLowerCase().includes(q)
        || v.category.toLowerCase().includes(q)
        || (v.color ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [vehicles, searchQuery, statusFilter]);

  // Aggregate service-due count across the whole fleet (not just the filtered view) so the
  // banner can prompt the operator even when filters are hiding the affected vehicles.
  const serviceDueSummary = useMemo(() => {
    let due = 0;
    let overdue = 0;
    for (const v of vehicles) {
      const svc = serviceMap.get(v.id);
      const serviceDueAt = svc?.next_due_date ? new Date(svc.next_due_date).getTime() : null;
      const odoOverdue = svc?.next_due_odometer != null && v.current_odometer >= svc.next_due_odometer;
      const daysUntilService = serviceDueAt != null ? Math.floor((serviceDueAt - Date.now()) / (24 * 60 * 60 * 1000)) : null;
      if (odoOverdue || (daysUntilService !== null && daysUntilService < 0)) overdue++;
      else if (daysUntilService !== null && daysUntilService <= 14) due++;
    }
    return { due, overdue, total: due + overdue };
  }, [vehicles, serviceMap]);

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
      registration_expires_at: v.registration_expires_at,
      insurance_expires_at: v.insurance_expires_at,
      inspection_due_at: v.inspection_due_at,
      registration_number: v.registration_number,
      insurance_provider: v.insurance_provider,
      insurance_policy_number: v.insurance_policy_number,
    });
    setDialogOpen(true);
  };

  const openClone = (v: CarRentalVehicle) => {
    // Pre-fill from the source vehicle but DROP unique identifiers so create() doesn't
    // hit a uniqueness constraint, and append "(copy)" to the model for clarity.
    setEditing(null);
    setDraft({
      make: v.make,
      model: `${v.model} (copy)`,
      year: v.year,
      color: v.color,
      license_plate: null,
      vin: null,
      category: v.category,
      transmission: v.transmission,
      fuel_type: v.fuel_type,
      seats: v.seats,
      doors: v.doors,
      luggage_capacity: v.luggage_capacity,
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
      registration_expires_at: null,
      insurance_expires_at: null,
      inspection_due_at: null,
      registration_number: null,
      insurance_provider: v.insurance_provider,
      insurance_policy_number: null,
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
          {vehicles.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 pr-9 h-9"
                  placeholder="Search by make, model, plate, VIN, color, category…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(["all", "available", "rented", "maintenance", "retired"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider border transition-colors",
                    statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                  )}>
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    {s !== "all" && (
                      <span className="ml-1 opacity-60">
                        {vehicles.filter((v) => v.status === s).length}
                      </span>
                    )}
                  </button>
                ))}
                {(searchQuery || statusFilter !== "all") && (
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    Showing {filteredVehicles.length} of {vehicles.length}
                  </span>
                )}
              </div>
            </div>
          )}
          {serviceDueSummary.total > 0 && (
            <div className={cn(
              "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm",
              serviceDueSummary.overdue > 0
                ? "border-destructive/30 bg-destructive/8 text-destructive"
                : "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300"
            )}>
              <Wrench className="h-4 w-4 shrink-0" />
              <span className="font-semibold">
                {serviceDueSummary.overdue > 0 && (
                  <>{serviceDueSummary.overdue} vehicle{serviceDueSummary.overdue === 1 ? "" : "s"} overdue for service</>
                )}
                {serviceDueSummary.overdue > 0 && serviceDueSummary.due > 0 && " · "}
                {serviceDueSummary.due > 0 && (
                  <>{serviceDueSummary.due} due within 14 days</>
                )}
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter("maintenance")}
                className="ml-auto text-xs underline opacity-80 hover:opacity-100"
              >
                Filter to maintenance →
              </button>
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
          ) : filteredVehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No vehicles match those filters.
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVehicles.map((v) => {
                const svc = serviceMap.get(v.id);
                const serviceDueAt = svc?.next_due_date ? new Date(svc.next_due_date).getTime() : null;
                const odoOverdue = svc?.next_due_odometer != null && v.current_odometer >= svc.next_due_odometer;
                const daysUntilService = serviceDueAt != null ? Math.floor((serviceDueAt - Date.now()) / (24 * 60 * 60 * 1000)) : null;
                const showServiceAlert = (daysUntilService !== null && daysUntilService <= 14) || odoOverdue;
                return (
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
                  {showServiceAlert && (
                    <div className={cn(
                      "mt-2 flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold",
                      odoOverdue || (daysUntilService !== null && daysUntilService < 0)
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    )}>
                      <Wrench className="h-3 w-3" />
                      {odoOverdue
                        ? `Service overdue (odometer past ${svc!.next_due_odometer!.toLocaleString()} mi)`
                        : daysUntilService! < 0
                          ? `Service overdue ${Math.abs(daysUntilService!)} day${Math.abs(daysUntilService!) === 1 ? "" : "s"}`
                          : daysUntilService === 0
                            ? "Service due today"
                            : `Service due in ${daysUntilService} day${daysUntilService === 1 ? "" : "s"}`}
                    </div>
                  )}
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="text-lg font-bold text-foreground">${(v.daily_rate_cents / 100).toFixed(0)}<span className="text-xs font-medium text-muted-foreground">/day</span></p>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Details" onClick={() => setDetailVehicle(v)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(v)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicate vehicle" onClick={() => openClone(v)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => setDeleteId(v.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
                );
              })}
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

            <div className="sm:col-span-2 rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Compliance & paperwork
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Registration #">
                  <Input value={draft.registration_number ?? ""} onChange={(e) => setDraft({ ...draft, registration_number: e.target.value })} />
                </Field>
                <Field label="Registration expires">
                  <Input type="date" value={draft.registration_expires_at ?? ""} onChange={(e) => setDraft({ ...draft, registration_expires_at: e.target.value || null })} />
                </Field>
                <Field label="Inspection due">
                  <Input type="date" value={draft.inspection_due_at ?? ""} onChange={(e) => setDraft({ ...draft, inspection_due_at: e.target.value || null })} />
                </Field>
                <Field label="Insurance provider">
                  <Input value={draft.insurance_provider ?? ""} onChange={(e) => setDraft({ ...draft, insurance_provider: e.target.value })} />
                </Field>
                <Field label="Policy #">
                  <Input value={draft.insurance_policy_number ?? ""} onChange={(e) => setDraft({ ...draft, insurance_policy_number: e.target.value })} />
                </Field>
                <Field label="Insurance expires">
                  <Input type="date" value={draft.insurance_expires_at ?? ""} onChange={(e) => setDraft({ ...draft, insurance_expires_at: e.target.value || null })} />
                </Field>
              </div>
            </div>
            <Field label="Description" className="sm:col-span-2">
              <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Comfortable mid-size sedan with backup camera and cruise control…" rows={3} />
            </Field>
            <Field label="Features" className="sm:col-span-2">
              <FeaturesEditor
                features={draft.features ?? []}
                onChange={(f) => setDraft({ ...draft, features: f })}
              />
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

const FEATURE_PRESETS = [
  "Bluetooth", "GPS Navigation", "Backup Camera", "Apple CarPlay", "Android Auto",
  "Heated Seats", "Sunroof", "Cruise Control", "USB Charging", "Premium Audio",
  "All-Wheel Drive", "Leather Interior",
];

function FeaturesEditor({ features, onChange }: { features: string[]; onChange: (next: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = (val: string) => {
    const v = val.trim();
    if (!v) return;
    if (features.some((f) => f.toLowerCase() === v.toLowerCase())) return;
    onChange([...features, v]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      {features.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {features.map((f, i) => (
            <span key={`${f}-${i}`} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {f}
              <button
                type="button"
                onClick={() => onChange(features.filter((_, j) => j !== i))}
                aria-label={`Remove ${f}`}
                className="ml-0.5 -mr-1 rounded-full hover:bg-primary/20 px-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
          placeholder="Type a feature and press Enter"
        />
        <Button type="button" variant="outline" size="sm" disabled={!input.trim()} onClick={() => add(input)}>
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mr-1 self-center">Quick add:</span>
        {FEATURE_PRESETS.filter((p) => !features.some((f) => f.toLowerCase() === p.toLowerCase())).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => add(p)}
            className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            + {p}
          </button>
        ))}
      </div>
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
