/**
 * CarRentalReservationsSection — central reservation manager.
 */
import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange, Plus, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  KeyRound, ClipboardCheck, XCircle, CheckCircle2, List, LayoutGrid, Pencil, Printer, Send, Search, X, UserPlus,
} from "lucide-react";
import CarRentalFleetCalendar from "./CarRentalFleetCalendar";
import CarRentalWalkInDialog from "./CarRentalWalkInDialog";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  useCarRentalReservations, type CarRentalReservation, type CarRentalReservationStatus,
} from "@/hooks/car-rental/useCarRentalReservations";
import { useCarRentalVehicles } from "@/hooks/car-rental/useCarRentalVehicles";
import { useCarRentalCustomers } from "@/hooks/car-rental/useCarRentalCustomers";
import { useCarRentalLocations } from "@/hooks/car-rental/useCarRentalLocations";
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
const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function CarRentalReservationsSection({ storeId }: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [date, setDate] = useState(todayIso());
  const { reservations, loading, saving, error, create, update, changeStatus, remove } = useCarRentalReservations({ storeId, date });
  const { vehicles } = useCarRentalVehicles(storeId);
  const { customers } = useCarRentalCustomers(storeId);
  const { locations } = useCarRentalLocations(storeId);

  const [createOpen, setCreateOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalReservation | null>(null);
  const [cancelling, setCancelling] = useState<CarRentalReservation | null>(null);
  const [statusFilter, setStatusFilter] = useState<CarRentalReservationStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "walk_in" | "phone" | "app" | "admin">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let list = reservations;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (sourceFilter !== "all") list = list.filter((r) => r.source === sourceFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        r.customer_name.toLowerCase().includes(q)
        || r.vehicle_label.toLowerCase().includes(q)
        || r.confirmation_code.toLowerCase().includes(q)
        || (r.customer_phone ?? "").toLowerCase().includes(q)
        || (r.customer_email ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [reservations, statusFilter, sourceFilter, searchQuery]);

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-5 w-5 text-primary" />
            Reservations
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button type="button" onClick={() => setView("list")}
                className={cn("h-8 px-2.5 inline-flex items-center gap-1 text-xs font-semibold",
                  view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <List className="h-3.5 w-3.5" /> List
              </button>
              <button type="button" onClick={() => setView("calendar")}
                className={cn("h-8 px-2.5 inline-flex items-center gap-1 text-xs font-semibold border-l border-border",
                  view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                <LayoutGrid className="h-3.5 w-3.5" /> Calendar
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setWalkInOpen(true)} disabled={vehicles.length === 0}>
              <UserPlus className="mr-1 h-4 w-4" /> Walk-in
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={vehicles.length === 0}>
              <Plus className="mr-1 h-4 w-4" /> New reservation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {view === "calendar" ? null : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(addDays(date, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(addDays(date, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDate(todayIso())}>Today</Button>
              <div className="ml-auto">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CarRentalReservationStatus | "all")}>
                  <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="picked_up">Picked up</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No-show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 pr-9 h-9"
                placeholder="Search by customer name, vehicle, code, phone, or email…"
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Source:</span>
              {(["all", "app", "walk_in", "phone", "admin"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSourceFilter(s)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider border transition-colors",
                    sourceFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s === "all" ? "All" : s === "walk_in" ? "Walk-in" : s === "app" ? "Online" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {(searchQuery || statusFilter !== "all" || sourceFilter !== "all") && (
              <p className="text-[11px] text-muted-foreground">
                Showing {filtered.length} of {reservations.length} reservation{reservations.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          )}

          {view === "calendar" ? (
            <CarRentalFleetCalendar storeId={storeId} />
          ) : loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <CalendarRange className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No reservations for {formatDate(`${date}T00:00:00`)} {statusFilter !== "all" && `(${statusFilter})`}.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {filtered.map((r) => (
                <ReservationRow key={r.id} reservation={r}
                  storeId={storeId}
                  onChangeStatus={(s) => changeStatus(r.id, s)}
                  onEdit={() => setEditing(r)}
                  onCancel={() => setCancelling(r)}
                  onDelete={() => remove(r.id)}
                  saving={saving} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateReservationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        vehicles={vehicles}
        customers={customers}
        locations={locations}
        defaultDate={date}
        onCreate={create}
        saving={saving}
      />

      <CarRentalWalkInDialog
        storeId={storeId}
        vehicles={vehicles}
        defaultLocationId={(locations.find((l) => l.is_default) ?? locations[0])?.id ?? null}
        defaultLocationName={(locations.find((l) => l.is_default) ?? locations[0])?.name ?? null}
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        onSaved={() => {
          toast.success("Walk-in created");
          // The reservations realtime hook will refresh the list automatically.
        }}
      />

      {editing && (
        <EditReservationDialog
          reservation={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await update(editing.id, patch);
            setEditing(null);
          }}
          saving={saving}
          vehicles={vehicles}
          locations={locations}
        />
      )}

      {cancelling && (
        <CancelReservationDialog
          reservation={cancelling}
          onClose={() => setCancelling(null)}
          onConfirm={async (reason, noShowFeeCents) => {
            await changeStatus(cancelling.id, reason === "no_show" ? "no_show" : "cancelled", {
              cancellation_reason: reason === "no_show" ? null : reason,
              cancelled_at: reason === "no_show" ? null : new Date().toISOString(),
              fees_cents: noShowFeeCents ?? cancelling.fees_cents,
            });
            setCancelling(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

function CancelReservationDialog({
  reservation: r, onClose, onConfirm, saving,
}: {
  reservation: CarRentalReservation;
  onClose: () => void;
  onConfirm: (reason: string, noShowFeeCents?: number) => Promise<void>;
  saving: boolean;
}) {
  type ReasonKey = "customer_request" | "vehicle_issue" | "weather" | "duplicate" | "no_show" | "other";
  const [reasonKey, setReasonKey] = useState<ReasonKey>("customer_request");
  const [details, setDetails] = useState("");
  const [noShowFeeDollars, setNoShowFeeDollars] = useState<number>(Math.round(r.daily_rate_cents / 100));

  const isNoShow = reasonKey === "no_show";

  const submit = async () => {
    const reasonLabel =
      reasonKey === "customer_request" ? "Customer cancelled"
      : reasonKey === "vehicle_issue" ? "Vehicle issue"
      : reasonKey === "weather" ? "Weather"
      : reasonKey === "duplicate" ? "Duplicate booking"
      : reasonKey === "no_show" ? "No-show"
      : "Other";
    const reason = details.trim() ? `${reasonLabel} — ${details.trim()}` : reasonLabel;
    if (isNoShow) {
      await onConfirm("no_show", Math.round(noShowFeeDollars * 100));
    } else {
      await onConfirm(reason);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" /> Cancel reservation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-semibold text-foreground">{r.customer_name}</p>
            <p className="text-xs text-muted-foreground">
              {r.vehicle_label} · {new Date(r.pickup_at).toLocaleDateString()}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Reason</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { k: "customer_request" as const, label: "Customer cancelled" },
                { k: "vehicle_issue" as const, label: "Vehicle issue" },
                { k: "weather" as const, label: "Weather" },
                { k: "duplicate" as const, label: "Duplicate booking" },
                { k: "no_show" as const, label: "No-show" },
                { k: "other" as const, label: "Other" },
              ].map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setReasonKey(opt.k)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors",
                    reasonKey === opt.k
                      ? opt.k === "no_show"
                        ? "border-amber-500/50 bg-amber-500/12 text-amber-700 dark:text-amber-300"
                        : "border-primary/40 bg-primary/8 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {isNoShow ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">No-show fee ($)</Label>
              <Input type="number" min={0} step="0.01" value={noShowFeeDollars} onChange={(e) => setNoShowFeeDollars(Number(e.target.value || 0))} />
              <p className="text-[11px] text-muted-foreground">
                Default = daily rate ({formatMoney(r.daily_rate_cents)}). Refunds the deposit minus this fee.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">Details (optional)</Label>
              <Textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything to remember for analytics…" maxLength={250} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Keep reservation</Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
            {isNoShow ? "Mark no-show" : "Cancel reservation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReservationRow({ reservation: r, storeId, onChangeStatus, onEdit, onCancel, onDelete, saving }: {
  reservation: CarRentalReservation;
  storeId: string;
  onChangeStatus: (s: CarRentalReservationStatus) => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const copyReviewLink = () => {
    const link = `${window.location.origin}/car-rental-review/${r.id}`;
    void navigator.clipboard.writeText(link);
    toast.success("Review link copied", { description: "Send it to the renter — they can rate the rental." });
  };
  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 sm:flex-1 sm:min-w-0">
        <div className="grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
          {formatTime(r.pickup_at).replace(" ", "")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate text-sm font-semibold text-foreground">{r.customer_name}</p>
            <StatusBadge status={r.status} />
            <span className="font-mono text-[10px] text-muted-foreground">{r.confirmation_code}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {r.vehicle_label} · {r.rental_days} day{r.rental_days === 1 ? "" : "s"}
            {" · "}{formatDate(r.pickup_at)} → {formatDate(r.dropoff_at)}
          </p>
          {(r.pickup_location_name || r.dropoff_location_name) && (
            <p className="truncate text-[11px] text-muted-foreground">
              {r.pickup_location_name ?? "—"}
              {r.dropoff_location_name && r.dropoff_location_name !== r.pickup_location_name && ` → ${r.dropoff_location_name}`}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
        <span className="text-sm font-bold text-foreground">{formatMoney(r.total_cents)}</span>
        <div className="flex flex-wrap gap-1.5">
          {r.status === "pending" && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={saving} onClick={() => onChangeStatus("confirmed")}>
              <CheckCircle2 className="mr-1 h-3 w-3" /> Confirm
            </Button>
          )}
          {(r.status === "confirmed" || r.status === "pending") && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={saving} onClick={() => onChangeStatus("picked_up")}>
              <KeyRound className="mr-1 h-3 w-3" /> Check out
            </Button>
          )}
          {r.status === "picked_up" && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={saving} onClick={() => onChangeStatus("returned")}>
              <ClipboardCheck className="mr-1 h-3 w-3" /> Return
            </Button>
          )}
          {(r.status === "pending" || r.status === "confirmed") && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" disabled={saving} onClick={onCancel}>
              <XCircle className="mr-1 h-3 w-3" /> Cancel
            </Button>
          )}
          {(r.status === "cancelled" || r.status === "no_show") && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" disabled={saving} onClick={onDelete}>
              Delete
            </Button>
          )}
          {r.status === "returned" && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={copyReviewLink}>
              <Send className="mr-1 h-3 w-3" /> Review link
            </Button>
          )}
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <Link to={`/admin/stores/${storeId}/car-rental-receipt/${r.id}`} target="_blank" rel="noreferrer">
              <Printer className="mr-1 h-3 w-3" /> Receipt
            </Link>
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={onEdit}>
            <Pencil className="mr-1 h-3 w-3" /> Edit
          </Button>
        </div>
      </div>
    </li>
  );
}

function EditReservationDialog({
  reservation: r, onClose, onSave, saving, vehicles, locations,
}: {
  reservation: CarRentalReservation;
  onClose: () => void;
  onSave: (patch: Partial<CarRentalReservation>) => Promise<void>;
  saving: boolean;
  vehicles: ReturnType<typeof useCarRentalVehicles>["vehicles"];
  locations: ReturnType<typeof useCarRentalLocations>["locations"];
}) {
  const toLocal = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [vehicleId, setVehicleId] = useState<string | null>(r.vehicle_id);
  const [pickupLocationId, setPickupLocationId] = useState<string | null>(r.pickup_location_id);
  const [dropoffLocationId, setDropoffLocationId] = useState<string | null>(r.dropoff_location_id);
  const [customerName, setCustomerName] = useState(r.customer_name);
  const [customerPhone, setCustomerPhone] = useState(r.customer_phone ?? "");
  const [customerEmail, setCustomerEmail] = useState(r.customer_email ?? "");
  const [pickupAtLocal, setPickupAtLocal] = useState(toLocal(r.pickup_at));
  const [dropoffAtLocal, setDropoffAtLocal] = useState(toLocal(r.dropoff_at));
  const [internalNotes, setInternalNotes] = useState(r.internal_notes ?? "");
  const [customerNotes, setCustomerNotes] = useState(r.customer_notes ?? "");

  const pickupAt = new Date(pickupAtLocal);
  const dropoffAt = new Date(dropoffAtLocal);
  const validRange = dropoffAt.getTime() > pickupAt.getTime();
  const rentalDays = validRange ? Math.max(1, Math.ceil((dropoffAt.getTime() - pickupAt.getTime()) / (24 * 60 * 60 * 1000))) : r.rental_days;

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const dailyRate = selectedVehicle?.daily_rate_cents ?? r.daily_rate_cents;
  const baseTotal = dailyRate * rentalDays;
  const newTotal = baseTotal + r.addons_total_cents + r.insurance_total_cents + r.taxes_cents + r.fees_cents - r.discount_cents;

  const canSave = customerName.trim() && validRange;

  const submit = async () => {
    const pickupLoc = locations.find((l) => l.id === pickupLocationId);
    const dropoffLoc = locations.find((l) => l.id === dropoffLocationId);
    const patch: Partial<CarRentalReservation> = {
      vehicle_id: vehicleId,
      pickup_location_id: pickupLocationId,
      dropoff_location_id: dropoffLocationId,
      pickup_location_name: pickupLoc?.name ?? null,
      dropoff_location_name: dropoffLoc?.name ?? null,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      customer_email: customerEmail.trim() || null,
      pickup_at: pickupAt.toISOString(),
      dropoff_at: dropoffAt.toISOString(),
      rental_days: rentalDays,
      daily_rate_cents: dailyRate,
      base_total_cents: baseTotal,
      total_cents: newTotal,
      internal_notes: internalNotes.trim() || null,
      customer_notes: customerNotes.trim() || null,
    };
    if (selectedVehicle) {
      patch.vehicle_label = `${selectedVehicle.year ? `${selectedVehicle.year} ` : ""}${selectedVehicle.make} ${selectedVehicle.model}`;
      patch.vehicle_category = selectedVehicle.category;
    }
    await onSave(patch);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit reservation · <span className="font-mono">{r.confirmation_code}</span></DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold text-foreground/80">Vehicle</Label>
            <Select value={vehicleId ?? "none"} onValueChange={(v) => setVehicleId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Keep snapshot ({r.vehicle_label}) —</SelectItem>
                {vehicles.filter((v) => v.is_active).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.year ? `${v.year} ` : ""}{v.make} {v.model} — ${(v.daily_rate_cents / 100).toFixed(0)}/day
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <EditField label="Customer name">
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </EditField>
          <EditField label="Phone">
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </EditField>
          <EditField label="Email" className="sm:col-span-2">
            <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </EditField>
          <EditField label="Pickup">
            <Input type="datetime-local" value={pickupAtLocal} onChange={(e) => setPickupAtLocal(e.target.value)} />
          </EditField>
          <EditField label="Drop-off">
            <Input type="datetime-local" value={dropoffAtLocal} onChange={(e) => setDropoffAtLocal(e.target.value)} />
          </EditField>
          {locations.length > 0 && (
            <>
              <EditField label="Pickup location">
                <Select value={pickupLocationId ?? "none"} onValueChange={(v) => setPickupLocationId(v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </EditField>
              <EditField label="Drop-off location">
                <Select value={dropoffLocationId ?? "none"} onValueChange={(v) => setDropoffLocationId(v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </EditField>
            </>
          )}
          <EditField label="Customer notes" className="sm:col-span-2">
            <Textarea rows={2} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} />
          </EditField>
          <EditField label="Internal notes" className="sm:col-span-2">
            <Textarea rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
          </EditField>
          {validRange && (
            <div className="sm:col-span-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{rentalDays} day{rentalDays === 1 ? "" : "s"} × {formatMoney(dailyRate)}</span>
                <span className="font-semibold text-foreground">{formatMoney(baseTotal)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>New total</span>
                <span>{formatMoney(newTotal)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!canSave || saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: CarRentalReservationStatus }) {
  const tone =
    status === "pending" ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : status === "confirmed" ? "border-primary/30 bg-primary/10 text-primary"
    : status === "picked_up" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : status === "returned" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 opacity-75"
    : "border-muted bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", tone)}>
      {status === "no_show" ? "no-show" : status === "picked_up" ? "on rental" : status}
    </span>
  );
}

function CreateReservationDialog({
  open, onOpenChange, vehicles, customers, locations, defaultDate, onCreate, saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicles: ReturnType<typeof useCarRentalVehicles>["vehicles"];
  customers: ReturnType<typeof useCarRentalCustomers>["customers"];
  locations: ReturnType<typeof useCarRentalLocations>["locations"];
  defaultDate: string;
  onCreate: ReturnType<typeof useCarRentalReservations>["create"];
  saving: boolean;
}) {
  const defaultLocation = locations.find((l) => l.is_default) ?? locations[0];

  const [vehicleId, setVehicleId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("walkin");
  const [pickupLocationId, setPickupLocationId] = useState<string>(defaultLocation?.id ?? "none");
  const [dropoffLocationId, setDropoffLocationId] = useState<string>(defaultLocation?.id ?? "none");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [pickupDate, setPickupDate] = useState(defaultDate);
  const [pickupTime, setPickupTime] = useState("10:00");
  const [dropoffDate, setDropoffDate] = useState(addDays(defaultDate, 3));
  const [dropoffTime, setDropoffTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setVehicleId("");
      setCustomerId("walkin");
      setPickupLocationId(defaultLocation?.id ?? "none");
      setDropoffLocationId(defaultLocation?.id ?? "none");
      setWalkInName("");
      setWalkInPhone("");
      setWalkInEmail("");
      setPickupDate(defaultDate);
      setPickupTime("10:00");
      setDropoffDate(addDays(defaultDate, 3));
      setDropoffTime("10:00");
      setNotes("");
    }
  }, [open, defaultDate, defaultLocation?.id]);

  const pickupAt = new Date(`${pickupDate}T${pickupTime}:00`);
  const dropoffAt = new Date(`${dropoffDate}T${dropoffTime}:00`);
  const validRange = dropoffAt.getTime() > pickupAt.getTime();
  const rentalDays = validRange ? Math.max(1, Math.ceil((dropoffAt.getTime() - pickupAt.getTime()) / (24 * 60 * 60 * 1000))) : 0;

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const baseTotal = selectedVehicle ? selectedVehicle.daily_rate_cents * rentalDays : 0;
  const securityDeposit = selectedVehicle?.security_deposit_cents ?? 0;
  const total = baseTotal + securityDeposit;

  const customerName =
    customerId === "walkin"
      ? walkInName.trim()
      : customers.find((c) => c.id === customerId)?.display_name ?? "";
  const customerPhone =
    customerId === "walkin" ? walkInPhone.trim() : customers.find((c) => c.id === customerId)?.phone ?? null;
  const customerEmail =
    customerId === "walkin" ? walkInEmail.trim() : customers.find((c) => c.id === customerId)?.email ?? null;

  const canSubmit = Boolean(selectedVehicle) && Boolean(customerName) && validRange;

  const submit = async () => {
    if (!selectedVehicle || !canSubmit) return;
    const pickupLoc = locations.find((l) => l.id === pickupLocationId);
    const dropoffLoc = locations.find((l) => l.id === dropoffLocationId);
    await onCreate({
      vehicle_id: selectedVehicle.id,
      customer_id: customerId === "walkin" ? null : customerId,
      pickup_location_id: pickupLocationId === "none" ? null : pickupLocationId,
      dropoff_location_id: dropoffLocationId === "none" ? null : dropoffLocationId,
      vehicle_label: `${selectedVehicle.year ? `${selectedVehicle.year} ` : ""}${selectedVehicle.make} ${selectedVehicle.model}`,
      vehicle_category: selectedVehicle.category,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      pickup_location_name: pickupLoc?.name ?? null,
      dropoff_location_name: dropoffLoc?.name ?? null,
      pickup_at: pickupAt.toISOString(),
      dropoff_at: dropoffAt.toISOString(),
      rental_days: rentalDays,
      daily_rate_cents: selectedVehicle.daily_rate_cents,
      base_total_cents: baseTotal,
      security_deposit_cents: securityDeposit,
      total_cents: total,
      status: "confirmed",
      source: "admin",
      internal_notes: notes || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New reservation</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold text-foreground/80">Vehicle *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Select a vehicle…" /></SelectTrigger>
              <SelectContent>
                {vehicles.filter((v) => v.is_active && v.status !== "retired").map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.year ? `${v.year} ` : ""}{v.make} {v.model} — ${(v.daily_rate_cents / 100).toFixed(0)}/day
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold text-foreground/80">Renter</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walkin">— Walk-in (one-off) —</SelectItem>
                {customers.filter((c) => !c.is_blocked).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.display_name}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {customerId === "walkin" && (
            <>
              <Field label="Walk-in name *" className="sm:col-span-2">
                <Input value={walkInName} onChange={(e) => setWalkInName(e.target.value)} placeholder="Full name" />
              </Field>
              <Field label="Phone">
                <Input value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={walkInEmail} onChange={(e) => setWalkInEmail(e.target.value)} />
              </Field>
            </>
          )}

          <Field label="Pickup date">
            <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
          </Field>
          <Field label="Pickup time">
            <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
          </Field>
          <Field label="Dropoff date">
            <Input type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} />
          </Field>
          <Field label="Dropoff time">
            <Input type="time" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} />
          </Field>

          {locations.length > 0 && (
            <>
              <Field label="Pickup location">
                <Select value={pickupLocationId} onValueChange={setPickupLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Dropoff location">
                <Select value={dropoffLocationId} onValueChange={setDropoffLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          <Field label="Internal notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the team should know…" />
          </Field>

          {selectedVehicle && validRange && (
            <div className="sm:col-span-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{rentalDays} day{rentalDays === 1 ? "" : "s"} × {formatMoney(selectedVehicle.daily_rate_cents)}</span>
                <span className="font-semibold text-foreground">{formatMoney(baseTotal)}</span>
              </div>
              {securityDeposit > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Security deposit (refundable)</span>
                  <span className="font-semibold text-foreground">{formatMoney(securityDeposit)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit || saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            Create reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
