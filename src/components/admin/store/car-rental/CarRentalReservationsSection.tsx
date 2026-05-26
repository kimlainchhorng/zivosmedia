/**
 * CarRentalReservationsSection — central reservation manager.
 */
import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange, Plus, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  KeyRound, ClipboardCheck, XCircle, CheckCircle2, List, LayoutGrid, Pencil, Printer, Send, Search, X, UserPlus, Copy, DollarSign,
} from "lucide-react";
import CarRentalFleetCalendar from "./CarRentalFleetCalendar";
import CarRentalWalkInDialog from "./CarRentalWalkInDialog";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
import { useCarRentalSettings, type RefundTier } from "@/hooks/car-rental/useCarRentalSettings";
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
  const { settings } = useCarRentalSettings(storeId);

  const [createOpen, setCreateOpen] = useState(false);
  const [cloneSource, setCloneSource] = useState<CarRentalReservation | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalReservation | null>(null);
  const [cancelling, setCancelling] = useState<CarRentalReservation | null>(null);
  const [refunding, setRefunding] = useState<CarRentalReservation | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<CarRentalReservationStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "walk_in" | "phone" | "app" | "admin">("all");
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Build a lookup: customer_id → tags[] from the customers list (already loaded)
  const customerTagsMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of customers) {
      if ((c.tags?.length ?? 0) > 0) m.set(c.id, c.tags);
    }
    return m;
  }, [customers]);

  // Deduped sorted list of all tags in use across customers (for the filter chip row)
  const tagSet = useMemo(() => {
    const s = new Set<string>();
    for (const tags of customerTagsMap.values()) for (const t of tags) s.add(t);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [customerTagsMap]);

  const filtered = useMemo(() => {
    let list = reservations;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (sourceFilter !== "all") list = list.filter((r) => r.source === sourceFilter);
    if (tagFilter.size > 0) {
      list = list.filter((r) => {
        if (!r.customer_id) return false;
        const tags = customerTagsMap.get(r.customer_id);
        if (!tags || tags.length === 0) return false;
        return tags.some((t) => tagFilter.has(t));
      });
    }
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
  }, [reservations, statusFilter, sourceFilter, tagFilter, customerTagsMap, searchQuery]);

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
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Quick:</span>
              <button type="button" onClick={() => { setDate(todayIso()); setStatusFilter("all"); setSourceFilter("all"); setSearchQuery(""); }}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-border text-muted-foreground hover:text-foreground">
                Today
              </button>
              <button type="button" onClick={() => { setDate(addDays(todayIso(), 1)); setStatusFilter("all"); setSourceFilter("all"); setSearchQuery(""); }}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-border text-muted-foreground hover:text-foreground">
                Tomorrow
              </button>
              <button type="button" onClick={() => { setStatusFilter("pending"); setSourceFilter("all"); }}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300">
                Pending action
              </button>
              <button type="button" onClick={() => { setStatusFilter("picked_up"); setSourceFilter("all"); }}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300">
                On rental
              </button>
              <button type="button" onClick={() => { setStatusFilter("confirmed"); setSourceFilter("all"); setDate(todayIso()); }}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-primary/30 bg-primary/8 text-primary">
                Ready for pickup
              </button>
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
            {tagSet.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Tags:</span>
                {tagSet.map((t) => {
                  const active = tagFilter.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTagFilter((prev) => {
                        const next = new Set(prev);
                        if (next.has(t)) next.delete(t);
                        else next.add(t);
                        return next;
                      })}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors",
                        active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
                {tagFilter.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setTagFilter(new Set())}
                    className="text-[11px] underline text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {(searchQuery || statusFilter !== "all" || sourceFilter !== "all" || tagFilter.size > 0) && (
              <p className="text-[11px] text-muted-foreground">
                Showing {filtered.length} of {reservations.length} reservation{reservations.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          )}

          {selectedIds.size > 0 && view === "list" && (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
              <span className="font-bold text-foreground">
                {selectedIds.size} selected
              </span>
              <button type="button" onClick={() => setSelectedIds(new Set(filtered.map((r) => r.id)))} className="text-xs underline text-muted-foreground hover:text-foreground">
                Select all visible
              </button>
              <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs underline text-muted-foreground hover:text-foreground">
                Clear
              </button>
              <div className="ml-auto flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" disabled={saving} onClick={async () => {
                  for (const id of selectedIds) {
                    const r = reservations.find((x) => x.id === id);
                    if (r && (r.status === "pending")) await changeStatus(id, "confirmed");
                  }
                  setSelectedIds(new Set());
                }}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Confirm all
                </Button>
                <Button size="sm" variant="outline" disabled={saving} onClick={async () => {
                  for (const id of selectedIds) {
                    const r = reservations.find((x) => x.id === id);
                    if (r && (r.status === "pending" || r.status === "confirmed")) {
                      await changeStatus(id, "cancelled", { cancellation_reason: "Bulk cancellation", cancelled_at: new Date().toISOString() });
                    }
                  }
                  setSelectedIds(new Set());
                }} className="text-destructive">
                  <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel all
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const subset = reservations.filter((r) => selectedIds.has(r.id));
                  const lines = subset.map((r) =>
                    [r.confirmation_code, r.customer_name, r.vehicle_label, r.pickup_at, r.dropoff_at, r.status, (r.total_cents / 100).toFixed(2)].join("\t"),
                  );
                  void navigator.clipboard.writeText(["Code\tCustomer\tVehicle\tPickup\tDropoff\tStatus\tTotal", ...lines].join("\n"));
                  toast.success(`Copied ${subset.length} reservation${subset.length === 1 ? "" : "s"} to clipboard`);
                }}>
                  <Send className="mr-1 h-3.5 w-3.5" /> Copy as TSV
                </Button>
              </div>
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
                  customerTags={r.customer_id ? customerTagsMap.get(r.customer_id) : undefined}
                  selected={selectedIds.has(r.id)}
                  onToggleSelect={() => setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(r.id)) next.delete(r.id);
                    else next.add(r.id);
                    return next;
                  })}
                  onChangeStatus={(s) => changeStatus(r.id, s)}
                  onEdit={() => setEditing(r)}
                  onCancel={() => setCancelling(r)}
                  onDelete={() => remove(r.id)}
                  onDuplicate={() => { setCloneSource(r); setCreateOpen(true); }}
                  onRefund={() => setRefunding(r)}
                  saving={saving} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateReservationDialog
        open={createOpen}
        onOpenChange={(o) => { setCreateOpen(o); if (!o) setCloneSource(null); }}
        vehicles={vehicles}
        customers={customers}
        locations={locations}
        defaultDate={date}
        seed={cloneSource}
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
          refundTiers={settings?.refund_tiers ?? null}
          onClose={() => setCancelling(null)}
          onConfirm={async (reason, opts) => {
            const refund = opts?.refund_amount_cents ?? 0;
            await changeStatus(cancelling.id, reason === "no_show" ? "no_show" : "cancelled", {
              cancellation_reason: reason === "no_show" ? null : reason,
              cancelled_at: reason === "no_show" ? null : new Date().toISOString(),
              fees_cents: opts?.noShowFeeCents ?? cancelling.fees_cents,
              refund_amount_cents: refund,
              refund_at: refund > 0 ? new Date().toISOString() : null,
              refund_method: refund > 0 ? (opts?.refund_method ?? "original_payment") : null,
            });
            setCancelling(null);
          }}
          saving={saving}
        />
      )}

      {refunding && (
        <QuickRefundDialog
          reservation={refunding}
          onClose={() => setRefunding(null)}
          onConfirm={async (amountCents, method) => {
            await changeStatus(refunding.id, refunding.status as CarRentalReservationStatus, {
              refund_amount_cents: amountCents,
              refund_at: new Date().toISOString(),
              refund_method: method,
            });
            setRefunding(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

function QuickRefundDialog({
  reservation: r, onClose, onConfirm, saving,
}: {
  reservation: CarRentalReservation;
  onClose: () => void;
  onConfirm: (amountCents: number, method: "original_payment" | "cash" | "store_credit" | "other") => Promise<void>;
  saving: boolean;
}) {
  // Default to the full paid amount (deposit + amount_paid) if any was collected;
  // otherwise fall back to the base total. Operator can still override.
  const defaultDollars = (() => {
    const candidate = (r.amount_paid_cents ?? 0) + (r.deposit_paid_cents ?? 0);
    const fallback = r.total_cents;
    return ((candidate > 0 ? candidate : fallback) / 100).toFixed(2);
  })();
  const [amount, setAmount] = useState(defaultDollars);
  const [method, setMethod] = useState<"original_payment" | "cash" | "store_credit" | "other">("original_payment");
  const cents = Math.max(0, Math.round((parseFloat(amount) || 0) * 100));
  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Mark as refunded
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="font-semibold text-foreground">{r.customer_name} · <span className="font-mono text-xs">{r.confirmation_code}</span></p>
            <p className="text-xs text-muted-foreground">{r.vehicle_label} · status: <span className="font-semibold">{r.status}</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatMoney(r.total_cents)}
              {r.amount_paid_cents > 0 && ` · Paid: ${formatMoney(r.amount_paid_cents)}`}
              {r.deposit_paid_cents > 0 && ` · Deposit: ${formatMoney(r.deposit_paid_cents)}`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Refund amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="original_payment">Original payment</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="store_credit">Store credit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Records the refund against this reservation. Use this only after the refund has actually been issued through your payment system.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onConfirm(cents, method)} disabled={saving || cents <= 0}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
            Mark refunded
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelReservationDialog({
  reservation: r, refundTiers, onClose, onConfirm, saving,
}: {
  reservation: CarRentalReservation;
  refundTiers: RefundTier[] | null;
  onClose: () => void;
  onConfirm: (reason: string, opts?: {
    noShowFeeCents?: number;
    refund_amount_cents?: number;
    refund_method?: "original_payment" | "cash" | "store_credit" | "other";
  }) => Promise<void>;
  saving: boolean;
}) {
  type ReasonKey = "customer_request" | "vehicle_issue" | "weather" | "duplicate" | "no_show" | "other";
  const [reasonKey, setReasonKey] = useState<ReasonKey>("customer_request");
  const [details, setDetails] = useState("");
  const [noShowFeeDollars, setNoShowFeeDollars] = useState<number>(Math.round(r.daily_rate_cents / 100));
  const alreadyPaid = (r.amount_paid_cents ?? 0) + (r.deposit_paid_cents ?? 0);

  // Compute suggested refund from tiers
  const daysBeforePickup = Math.floor((new Date(r.pickup_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const sortedTiers = useMemo(() =>
    (refundTiers ?? []).slice().sort((a, b) => b.days_before - a.days_before)
  , [refundTiers]);
  const suggestedTier = useMemo(() => {
    if (!sortedTiers.length) return null;
    for (const t of sortedTiers) {
      if (daysBeforePickup >= t.days_before) return t;
    }
    return sortedTiers[sortedTiers.length - 1];
  }, [sortedTiers, daysBeforePickup]);
  const suggestedRefundCents = suggestedTier
    ? Math.round(alreadyPaid * (suggestedTier.percent / 100))
    : alreadyPaid;

  const [refundDollars, setRefundDollars] = useState<number>(suggestedRefundCents / 100);
  const [refundMethod, setRefundMethod] = useState<"original_payment" | "cash" | "store_credit" | "other">("original_payment");

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
      await onConfirm("no_show", { noShowFeeCents: Math.round(noShowFeeDollars * 100) });
    } else {
      await onConfirm(reason, {
        refund_amount_cents: Math.round(refundDollars * 100),
        refund_method: refundMethod,
      });
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
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/80">Details (optional)</Label>
                <Textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything to remember for analytics…" maxLength={250} />
              </div>
              {alreadyPaid > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Refund</p>
                  <p className="text-[11px] text-muted-foreground">
                    Customer paid {formatMoney(alreadyPaid)} ({formatMoney(r.amount_paid_cents)} amount + {formatMoney(r.deposit_paid_cents)} deposit)
                  </p>
                  {suggestedTier && (
                    <div className="flex items-center gap-2 rounded border border-primary/30 bg-primary/8 px-2 py-1.5 text-xs">
                      <span className="text-foreground">
                        Policy: <span className="font-bold">{suggestedTier.percent}%</span> refund
                        {" — "}
                        {daysBeforePickup >= 0
                          ? `cancelling ${daysBeforePickup} day${daysBeforePickup === 1 ? "" : "s"} before pickup`
                          : "same day / after pickup"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-6 px-2 text-[11px]"
                        onClick={() => setRefundDollars(suggestedRefundCents / 100)}
                      >
                        Use suggested ({formatMoney(suggestedRefundCents)})
                      </Button>
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Refund amount ($)</Label>
                      <Input type="number" min={0} max={alreadyPaid / 100} step="0.01" value={refundDollars} onChange={(e) => setRefundDollars(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Method</Label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value as typeof refundMethod)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="original_payment">Original payment method</option>
                        <option value="cash">Cash</option>
                        <option value="store_credit">Store credit</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-1.5 text-[11px]">
                    <button type="button" onClick={() => setRefundDollars(alreadyPaid / 100)} className="rounded border border-border px-2 py-0.5 hover:bg-muted">Full</button>
                    <button type="button" onClick={() => setRefundDollars(alreadyPaid / 200)} className="rounded border border-border px-2 py-0.5 hover:bg-muted">50%</button>
                    <button type="button" onClick={() => setRefundDollars(0)} className="rounded border border-border px-2 py-0.5 hover:bg-muted">None</button>
                  </div>
                </div>
              )}
            </>
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

function ReservationRow({ reservation: r, storeId, customerTags, selected, onToggleSelect, onChangeStatus, onEdit, onCancel, onDelete, onDuplicate, onRefund, saving }: {
  reservation: CarRentalReservation;
  storeId: string;
  customerTags?: string[];
  selected: boolean;
  onToggleSelect: () => void;
  onChangeStatus: (s: CarRentalReservationStatus) => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRefund: () => void;
  saving: boolean;
}) {
  const copyReviewLink = () => {
    const link = `${window.location.origin}/car-rental-review/${r.id}`;
    void navigator.clipboard.writeText(link);
    toast.success("Review link copied", { description: "Send it to the renter — they can rate the rental." });
  };

  const buildConfirmationMessage = () => {
    const lookupLink = `${window.location.origin}/car-rental-booking/${r.confirmation_code}`;
    const pickup = new Date(r.pickup_at).toLocaleString();
    const dropoff = new Date(r.dropoff_at).toLocaleString();
    const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    return [
      `Hi ${r.customer_name},`,
      ``,
      `Your booking is ${r.status === "confirmed" || r.status === "picked_up" ? "confirmed" : "received"}.`,
      ``,
      `Confirmation code: ${r.confirmation_code}`,
      `Vehicle: ${r.vehicle_label}`,
      `Pickup: ${pickup}${r.pickup_location_name ? ` · ${r.pickup_location_name}` : ""}`,
      `Drop-off: ${dropoff}${r.dropoff_location_name && r.dropoff_location_name !== r.pickup_location_name ? ` · ${r.dropoff_location_name}` : ""}`,
      `Total: ${formatMoney(r.total_cents)}`,
      ``,
      `View your booking: ${lookupLink}`,
      ``,
      `Please bring your driver's license at pickup. See you soon!`,
    ].join("\n");
  };

  const copyConfirmation = () => {
    void navigator.clipboard.writeText(buildConfirmationMessage());
    toast.success("Confirmation copied", { description: "Paste into SMS, email, or WhatsApp." });
  };
  const shareViaSms = () => {
    const body = encodeURIComponent(buildConfirmationMessage());
    const phone = r.customer_phone ?? "";
    window.open(`sms:${phone}?body=${body}`, "_blank");
  };
  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(buildConfirmationMessage());
    const phone = (r.customer_phone ?? "").replace(/[^\d+]/g, "");
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };
  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Your booking ${r.confirmation_code}`);
    const body = encodeURIComponent(buildConfirmationMessage());
    const to = r.customer_email ?? "";
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
  };
  return (
    <li className={cn(
      "flex flex-col gap-2 p-3 sm:flex-row sm:items-center transition-colors",
      selected && "bg-primary/5",
    )}>
      <div className="flex items-center gap-3 sm:flex-1 sm:min-w-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 shrink-0 accent-primary cursor-pointer"
          aria-label="Select reservation"
        />
        <div className="grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
          {formatTime(r.pickup_at).replace(" ", "")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="truncate text-sm font-semibold text-foreground">{r.customer_name}</p>
            <StatusBadge status={r.status} />
            {(() => {
              const now = Date.now();
              const pickupMs = new Date(r.pickup_at).getTime();
              const dropoffMs = new Date(r.dropoff_at).getTime();
              // Late pickup: confirmed but more than 30 min past pickup time
              if (r.status === "confirmed" && pickupMs < now - 30 * 60 * 1000) {
                const hoursLate = Math.floor((now - pickupMs) / (60 * 60 * 1000));
                return (
                  <span
                    title={`Pickup was ${new Date(r.pickup_at).toLocaleString()}`}
                    className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300"
                  >
                    Late pickup{hoursLate >= 1 ? ` · ${hoursLate}h` : ""}
                  </span>
                );
              }
              // Overdue return: picked_up but dropoff time is in the past
              if (r.status === "picked_up" && dropoffMs < now) {
                const hoursOver = Math.floor((now - dropoffMs) / (60 * 60 * 1000));
                return (
                  <span
                    title={`Drop-off was ${new Date(r.dropoff_at).toLocaleString()}`}
                    className="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-destructive"
                  >
                    Overdue{hoursOver >= 1 ? ` · ${hoursOver}h` : ""}
                  </span>
                );
              }
              return null;
            })()}
            {customerTags && customerTags.length > 0 && customerTags.slice(0, 3).map((t) => (
              <span key={t} className={cn(
                "rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                t === "VIP" ? "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300"
                  : t === "Caution" ? "border-destructive/40 bg-destructive/12 text-destructive"
                  : "border-primary/30 bg-primary/10 text-primary"
              )}>
                {t}
              </span>
            ))}
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
          {(r.status === "cancelled" || r.status === "no_show") && r.refund_amount_cents === 0 && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={saving} onClick={onRefund}>
              <DollarSign className="mr-1 h-3 w-3" /> Mark refunded
            </Button>
          )}
          {(r.status === "cancelled" || r.status === "no_show") && r.refund_amount_cents > 0 && (
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Refunded {formatMoney(r.refund_amount_cents)}
            </span>
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
          {(r.status === "pending" || r.status === "confirmed" || r.status === "picked_up") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                  <Send className="mr-1 h-3 w-3" /> Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={copyConfirmation}>
                  Copy to clipboard
                </DropdownMenuItem>
                {r.customer_phone && (
                  <>
                    <DropdownMenuItem onClick={shareViaSms}>
                      SMS to {r.customer_phone}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareViaWhatsApp}>
                      WhatsApp
                    </DropdownMenuItem>
                  </>
                )}
                {r.customer_email && (
                  <DropdownMenuItem onClick={shareViaEmail}>
                    Email
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <Link to={`/admin/stores/${storeId}/car-rental-receipt/${r.id}`} target="_blank" rel="noreferrer">
              <Printer className="mr-1 h-3 w-3" /> Receipt
            </Link>
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={saving} onClick={onDuplicate} title="Duplicate as new reservation">
            <Copy className="mr-1 h-3 w-3" /> Duplicate
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
  const [insuranceDollars, setInsuranceDollars] = useState(
    r.insurance_total_cents > 0 ? (r.insurance_total_cents / 100).toFixed(2) : "",
  );
  const [internalNotes, setInternalNotes] = useState(r.internal_notes ?? "");
  const [customerNotes, setCustomerNotes] = useState(r.customer_notes ?? "");

  const pickupAt = new Date(pickupAtLocal);
  const dropoffAt = new Date(dropoffAtLocal);
  const validRange = dropoffAt.getTime() > pickupAt.getTime();
  const rentalDays = validRange ? Math.max(1, Math.ceil((dropoffAt.getTime() - pickupAt.getTime()) / (24 * 60 * 60 * 1000))) : r.rental_days;

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const dailyRate = selectedVehicle?.daily_rate_cents ?? r.daily_rate_cents;
  const baseTotal = dailyRate * rentalDays;
  const insuranceCents = Math.max(0, Math.round((parseFloat(insuranceDollars) || 0) * 100));
  const newTotal = baseTotal + r.addons_total_cents + insuranceCents + r.taxes_cents + r.fees_cents - r.discount_cents;

  // Operating hours validation (soft warning) — mirrors the public booking flow
  const pickupLocObj = locations.find((l) => l.id === pickupLocationId);
  const dropoffLocObj = locations.find((l) => l.id === dropoffLocationId);
  const hoursWarning = (() => {
    if (!validRange) return null;
    const warnings: string[] = [];
    const checkAgainst = (kind: "Pickup" | "Drop-off", loc: typeof pickupLocObj, when: Date) => {
      if (!loc?.open_time || !loc?.close_time) return;
      const [oh, om] = loc.open_time.split(":").map((n: string) => parseInt(n, 10));
      const [ch, cm] = loc.close_time.split(":").map((n: string) => parseInt(n, 10));
      const mins = when.getHours() * 60 + when.getMinutes();
      const openMins = oh * 60 + om;
      const closeMins = ch * 60 + cm;
      if (mins < openMins || mins > closeMins) {
        warnings.push(`${kind} at ${loc.name} is outside operating hours (${loc.open_time.slice(0, 5)}–${loc.close_time.slice(0, 5)}).`);
      }
    };
    checkAgainst("Pickup", pickupLocObj, pickupAt);
    checkAgainst("Drop-off", dropoffLocObj, dropoffAt);
    return warnings.length > 0 ? warnings : null;
  })();

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
      insurance_total_cents: insuranceCents,
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
          {hoursWarning && (
            <div className="sm:col-span-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                {hoursWarning.map((w, i) => <p key={i}>{w}</p>)}
                <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70">You can still save — this is a soft warning.</p>
              </div>
            </div>
          )}
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
          <EditField label="Insurance ($)" className="sm:col-span-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={insuranceDollars}
              onChange={(e) => setInsuranceDollars(e.target.value)}
              placeholder="0.00"
            />
          </EditField>
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
              {r.addons_total_cents > 0 && (
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Add-ons</span>
                  <span className="font-semibold text-foreground">{formatMoney(r.addons_total_cents)}</span>
                </div>
              )}
              {insuranceCents > 0 && (
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Insurance</span>
                  <span className="font-semibold text-foreground">{formatMoney(insuranceCents)}</span>
                </div>
              )}
              {r.taxes_cents > 0 && (
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Taxes</span>
                  <span className="font-semibold text-foreground">{formatMoney(r.taxes_cents)}</span>
                </div>
              )}
              {r.fees_cents > 0 && (
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Fees</span>
                  <span className="font-semibold text-foreground">{formatMoney(r.fees_cents)}</span>
                </div>
              )}
              {r.discount_cents > 0 && (
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">−{formatMoney(r.discount_cents)}</span>
                </div>
              )}
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
  open, onOpenChange, vehicles, customers, locations, defaultDate, seed, onCreate, saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicles: ReturnType<typeof useCarRentalVehicles>["vehicles"];
  customers: ReturnType<typeof useCarRentalCustomers>["customers"];
  locations: ReturnType<typeof useCarRentalLocations>["locations"];
  defaultDate: string;
  seed?: CarRentalReservation | null;
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
  const [insuranceDollars, setInsuranceDollars] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (seed) {
      // Pre-fill from an existing reservation; advance dates by the original rental length so
      // the operator is editing a sensible "next time" booking.
      const origPickup = new Date(seed.pickup_at);
      const origDropoff = new Date(seed.dropoff_at);
      const ms = Math.max(24 * 60 * 60 * 1000, origDropoff.getTime() - origPickup.getTime());
      // Push pickup to "today at original time of day"
      const today = new Date(`${defaultDate}T00:00:00`);
      const newPickup = new Date(today);
      newPickup.setHours(origPickup.getHours(), origPickup.getMinutes(), 0, 0);
      const newDropoff = new Date(newPickup.getTime() + ms);
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setVehicleId(seed.vehicle_id ?? "");
      setCustomerId(seed.customer_id ?? "walkin");
      setPickupLocationId(seed.pickup_location_id ?? defaultLocation?.id ?? "none");
      setDropoffLocationId(seed.dropoff_location_id ?? defaultLocation?.id ?? "none");
      setWalkInName(seed.customer_id ? "" : seed.customer_name);
      setWalkInPhone(seed.customer_id ? "" : (seed.customer_phone ?? ""));
      setWalkInEmail(seed.customer_id ? "" : (seed.customer_email ?? ""));
      setPickupDate(dateStr(newPickup));
      setPickupTime(timeStr(newPickup));
      setDropoffDate(dateStr(newDropoff));
      setDropoffTime(timeStr(newDropoff));
      setInsuranceDollars(seed.insurance_total_cents > 0 ? (seed.insurance_total_cents / 100).toFixed(2) : "");
      setDiscountCents(0);
      setNotes(seed.internal_notes ?? "");
    } else {
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
      setInsuranceDollars("");
      setDiscountCents(0);
      setNotes("");
    }
  }, [open, defaultDate, defaultLocation?.id, seed]);

  // Reset loyalty discount when customer changes
  useEffect(() => { setDiscountCents(0); }, [customerId]);

  const pickupAt = new Date(`${pickupDate}T${pickupTime}:00`);
  const dropoffAt = new Date(`${dropoffDate}T${dropoffTime}:00`);
  const validRange = dropoffAt.getTime() > pickupAt.getTime();
  const rentalDays = validRange ? Math.max(1, Math.ceil((dropoffAt.getTime() - pickupAt.getTime()) / (24 * 60 * 60 * 1000))) : 0;

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedCustomer = customerId !== "walkin" ? customers.find((c) => c.id === customerId) : undefined;
  const isRepeatCustomer = (selectedCustomer?.total_rentals ?? 0) >= 3;
  const baseTotal = selectedVehicle ? selectedVehicle.daily_rate_cents * rentalDays : 0;
  const securityDeposit = selectedVehicle?.security_deposit_cents ?? 0;
  const insuranceCents = Math.max(0, Math.round((parseFloat(insuranceDollars) || 0) * 100));
  const loyaltyDiscountSuggestion = Math.round(baseTotal * 0.1);
  const total = Math.max(0, baseTotal + insuranceCents - discountCents) + securityDeposit;

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
      insurance_total_cents: insuranceCents,
      discount_cents: discountCents,
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
          <DialogTitle>
            {seed ? <>Duplicate reservation <span className="font-mono text-xs font-normal text-muted-foreground">from {seed.confirmation_code}</span></> : "New reservation"}
          </DialogTitle>
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
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} disabled={c.is_blocked}>
                    {c.display_name}{c.phone ? ` · ${c.phone}` : ""}
                    {c.is_blocked && " · 🚫 Blocked"}
                  </SelectItem>
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

          {isRepeatCustomer && selectedCustomer && validRange && baseTotal > 0 && (
            <div className="sm:col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Loyal customer
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                {selectedCustomer.display_name} has {selectedCustomer.total_rentals} prior rental{selectedCustomer.total_rentals === 1 ? "" : "s"}.
                {discountCents > 0
                  ? ` Loyalty discount of ${formatMoney(discountCents)} applied.`
                  : ` Consider applying a 10% loyalty discount (${formatMoney(loyaltyDiscountSuggestion)}).`}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {discountCents === 0 ? (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDiscountCents(loyaltyDiscountSuggestion)}>
                    Apply 10% off ({formatMoney(loyaltyDiscountSuggestion)})
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setDiscountCents(0)}>
                    Remove loyalty discount
                  </Button>
                )}
              </div>
            </div>
          )}

          <Field label="Insurance ($, optional)" className="sm:col-span-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={insuranceDollars}
              onChange={(e) => setInsuranceDollars(e.target.value)}
              placeholder="e.g. 25.00 per day × rental days"
            />
          </Field>

          <Field label="Internal notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the team should know…" />
          </Field>

          {selectedVehicle && validRange && (
            <div className="sm:col-span-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{rentalDays} day{rentalDays === 1 ? "" : "s"} × {formatMoney(selectedVehicle.daily_rate_cents)}</span>
                <span className="font-semibold text-foreground">{formatMoney(baseTotal)}</span>
              </div>
              {insuranceCents > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Insurance</span>
                  <span className="font-semibold text-foreground">{formatMoney(insuranceCents)}</span>
                </div>
              )}
              {discountCents > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Loyalty discount</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">−{formatMoney(discountCents)}</span>
                </div>
              )}
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
