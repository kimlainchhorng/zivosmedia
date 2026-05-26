/**
 * Test drives section — v2.
 *
 * New in v2:
 *  • Inline status-action buttons: Confirm → Start → Complete / No-show
 *  • Completion mini-dialog: odometer start/end + notes
 *  • Today's drives shown as a vertical timeline
 *  • Upcoming drives grouped by day
 *  • Header stats strip: today / this week / completed
 */
import { memo, useMemo, useState } from "react";
import {
  Plus, Calendar, Car, Loader2, Pencil, Trash2,
  CheckCircle, Play, CheckCheck, UserX, ChevronDown, ChevronUp,
  HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipTestDrives,
  type DealershipTestDrive,
  type DealershipTestDriveStatus,
  type DealershipTestDriveDraft,
} from "@/hooks/car-dealership/useDealershipTestDrives";
import { useDealershipSales, type DealershipSaleDraft } from "@/hooks/car-dealership/useDealershipSales";
import { useDealershipInventory } from "@/hooks/car-dealership/useDealershipInventory";
import VehiclePicker from "./VehiclePicker";
import CustomerPicker from "./CustomerPicker";
import QuickCreateDealDialog, { type QuickDealSeed } from "./QuickCreateDealDialog";

// ─── status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DealershipTestDriveStatus, string> = {
  scheduled:   "bg-blue-500/15 text-blue-700",
  confirmed:   "bg-emerald-500/15 text-emerald-700",
  in_progress: "bg-amber-500/15 text-amber-700",
  completed:   "bg-zinc-500/15 text-zinc-700",
  cancelled:   "bg-red-500/15 text-red-700",
  no_show:     "bg-orange-500/15 text-orange-700",
};

const STATUS_LABEL: Record<DealershipTestDriveStatus, string> = {
  scheduled:   "Scheduled",
  confirmed:   "Confirmed",
  in_progress: "In progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
  no_show:     "No-show",
};

// ─── formatters ───────────────────────────────────────────────────────────────

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

const fmtDateTimeShort = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

// ─── empty draft ──────────────────────────────────────────────────────────────

const emptyDraft = (): DealershipTestDriveDraft => ({
  lead_id: null,
  vehicle_id: null,
  customer_id: null,
  salesperson_user_id: null,
  customer_name: "",
  customer_phone: null,
  vehicle_label: "",
  scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  duration_minutes: 30,
  status: "scheduled",
  start_odometer: null,
  end_odometer: null,
  start_fuel_level: null,
  end_fuel_level: null,
  notes: null,
  cancellation_reason: null,
  completed_at: null,
});

// ─── completion dialog ────────────────────────────────────────────────────────

interface CompleteDialogProps {
  drive: DealershipTestDrive | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (patch: Partial<DealershipTestDriveDraft>) => void;
}

function CompleteDialog({ drive, saving, onClose, onSubmit }: CompleteDialogProps) {
  const [startOdo, setStartOdo] = useState(drive?.start_odometer?.toString() ?? "");
  const [endOdo, setEndOdo] = useState(drive?.end_odometer?.toString() ?? "");
  const [notes, setNotes] = useState(drive?.notes ?? "");

  if (!drive) return null;

  const handleSubmit = () => {
    onSubmit({
      status: "completed",
      completed_at: new Date().toISOString(),
      start_odometer: startOdo ? parseInt(startOdo, 10) : null,
      end_odometer: endOdo ? parseInt(endOdo, 10) : null,
      notes: notes.trim() || null,
    });
  };

  const miles = startOdo && endOdo
    ? Math.max(0, parseInt(endOdo, 10) - parseInt(startOdo, 10))
    : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Complete test drive</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <p className="font-medium">{drive.customer_name}</p>
            <p className="text-xs text-muted-foreground">{drive.vehicle_label}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start odometer</Label>
              <Input
                type="number"
                min={0}
                value={startOdo}
                onChange={(e) => setStartOdo(e.target.value)}
                placeholder="e.g. 24350"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End odometer</Label>
              <Input
                type="number"
                min={0}
                value={endOdo}
                onChange={(e) => setEndOdo(e.target.value)}
                placeholder="e.g. 24368"
              />
            </div>
          </div>

          {miles !== null && (
            <p className="text-xs text-muted-foreground text-center">
              {miles} mile{miles !== 1 ? "s" : ""} driven
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Customer feedback, interest level..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Mark complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── action buttons ───────────────────────────────────────────────────────────

interface ActionProps {
  drive: DealershipTestDrive;
  saving: boolean;
  onConfirm: () => void;
  onStart: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onConvertToDeal: () => void;
}

function DriveActions({ drive, saving, onConfirm, onStart, onComplete, onNoShow, onConvertToDeal }: ActionProps) {
  switch (drive.status) {
    case "scheduled":
      return (
        <Button
          size="sm"
          variant="outline"
          className="text-blue-700 border-blue-300 hover:bg-blue-50"
          onClick={onConfirm}
          disabled={saving}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1" />Confirm
        </Button>
      );
    case "confirmed":
      return (
        <Button
          size="sm"
          variant="outline"
          className="text-amber-700 border-amber-300 hover:bg-amber-50"
          onClick={onStart}
          disabled={saving}
        >
          <Play className="h-3.5 w-3.5 mr-1" />Start
        </Button>
      );
    case "in_progress":
      return (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7"
            onClick={onComplete}
            disabled={saving}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-orange-700 border-orange-300 hover:bg-orange-50 h-7"
            onClick={onNoShow}
            disabled={saving}
          >
            <UserX className="h-3.5 w-3.5 mr-1" />No-show
          </Button>
        </div>
      );
    case "completed":
      return (
        <Button
          size="sm"
          variant="outline"
          className="text-primary border-primary/40 hover:bg-primary/5 h-7"
          onClick={onConvertToDeal}
          disabled={saving}
        >
          <HandCoins className="h-3.5 w-3.5 mr-1" />Convert to deal
        </Button>
      );
    default:
      return null;
  }
}

// ─── drive card ───────────────────────────────────────────────────────────────

interface DriveCardProps {
  drive: DealershipTestDrive;
  saving: boolean;
  showDate?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, status: DealershipTestDriveStatus, extra?: Partial<DealershipTestDriveDraft>) => void;
  onOpenComplete: (drive: DealershipTestDrive) => void;
  onConvertToDeal: (drive: DealershipTestDrive) => void;
}

function DriveCard({ drive, saving, showDate = false, onEdit, onDelete, onStatusChange, onOpenComplete, onConvertToDeal }: DriveCardProps) {
  const isActive = ["scheduled", "confirmed", "in_progress"].includes(drive.status);

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border bg-card p-3 transition-colors",
      drive.status === "in_progress" && "border-amber-300 bg-amber-500/5",
      drive.status === "completed" && "opacity-70",
    )}>
      {/* Time block */}
      <div className="shrink-0 text-center w-14">
        <p className="text-sm font-bold tabular-nums">{fmtTime(drive.scheduled_at)}</p>
        <p className="text-[10px] text-muted-foreground">{drive.duration_minutes}m</p>
      </div>

      <Separator orientation="vertical" className="h-auto self-stretch" />

      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{drive.customer_name}</p>
            <p className="text-xs text-muted-foreground truncate">{drive.vehicle_label}</p>
            {showDate && (
              <p className="text-[10px] text-muted-foreground">{fmtDateShort(drive.scheduled_at)}</p>
            )}
          </div>
          <Badge className={cn("border-0 text-[10px] shrink-0", STATUS_STYLES[drive.status])}>
            {STATUS_LABEL[drive.status]}
          </Badge>
        </div>

        {drive.notes && !isActive && (
          <p className="text-xs text-muted-foreground italic truncate">"{drive.notes}"</p>
        )}

        {(drive.end_odometer != null && drive.start_odometer != null) && (
          <p className="text-[10px] text-muted-foreground">
            {(drive.end_odometer - drive.start_odometer).toLocaleString()} mi driven
          </p>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between pt-1">
          <DriveActions
            drive={drive}
            saving={saving}
            onConfirm={() => onStatusChange(drive.id, "confirmed")}
            onStart={() => onStatusChange(drive.id, "in_progress")}
            onComplete={() => onOpenComplete(drive)}
            onNoShow={() => onStatusChange(drive.id, "no_show")}
            onConvertToDeal={() => onConvertToDeal(drive)}
          />
          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main section ─────────────────────────────────────────────────────────────

interface Props { storeId: string; }

function CarDealershipTestDrivesSectionInner({ storeId }: Props) {
  const { drives, loading, saving, create, update, remove } = useDealershipTestDrives(storeId);
  const { create: createSale, saving: savingSale } = useDealershipSales(storeId);
  const { vehicles } = useDealershipInventory(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipTestDrive | null>(null);
  const [draft, setDraft] = useState<DealershipTestDriveDraft>(emptyDraft());
  const [completeTarget, setCompleteTarget] = useState<DealershipTestDrive | null>(null);
  const [convertTarget, setConvertTarget] = useState<DealershipTestDrive | null>(null);
  const [showPast, setShowPast] = useState(false);

  // Vehicle lookup for seeding deal sale_price from the linked vehicle's asking price.
  const vehicleMap = useMemo(() => {
    const m = new Map<string, { asking_price_cents: number; vin: string | null }>();
    for (const v of vehicles) m.set(v.id, { asking_price_cents: v.asking_price_cents, vin: v.vin });
    return m;
  }, [vehicles]);

  // ── grouping ──────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
    const in14 = new Date(now); in14.setDate(in14.getDate() + 14);

    const sorted = [...drives].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    );

    const today: DealershipTestDrive[] = [];
    const upcoming: DealershipTestDrive[] = [];
    const past: DealershipTestDrive[] = [];

    for (const d of sorted) {
      const t = new Date(d.scheduled_at).getTime();
      if (t >= startOfDay.getTime() && t <= endOfDay.getTime()) today.push(d);
      else if (t > endOfDay.getTime() && t <= in14.getTime()) upcoming.push(d);
      else if (t > endOfDay.getTime()) upcoming.push(d); // beyond 14d still upcoming
      else past.push(d);
    }

    // Group upcoming by date string
    const upcomingByDay = new Map<string, DealershipTestDrive[]>();
    for (const d of upcoming) {
      const key = new Date(d.scheduled_at).toDateString();
      const arr = upcomingByDay.get(key) ?? [];
      arr.push(d);
      upcomingByDay.set(key, arr);
    }

    return { today, upcomingByDay, past };
  }, [drives]);

  const stats = useMemo(() => {
    const startOfWeek = new Date(); startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
    const thisWeek = drives.filter((d) => new Date(d.scheduled_at) >= startOfWeek).length;
    const completed = drives.filter((d) => d.status === "completed").length;
    const noShows = drives.filter((d) => d.status === "no_show").length;
    return { thisWeek, completed, noShows, total: drives.length };
  }, [drives]);

  // ── status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (
    id: string,
    status: DealershipTestDriveStatus,
    extra?: Partial<DealershipTestDriveDraft>,
  ) => {
    const patch: Partial<DealershipTestDriveDraft> = { status, ...extra };
    const ok = await update(id, patch);
    if (!ok) toast.error("Couldn't update status.");
  };

  const handleComplete = async (patch: Partial<DealershipTestDriveDraft>) => {
    if (!completeTarget) return;
    const ok = await update(completeTarget.id, patch);
    if (ok) { toast.success("Test drive completed."); setCompleteTarget(null); }
    else toast.error("Couldn't save.");
  };

  // ── edit / delete ──────────────────────────────────────────────────────────
  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (d: DealershipTestDrive) => {
    setEditing(d);
    const { id, store_id, created_at, updated_at, ...rest } = d;
    setDraft(rest);
    setDialogOpen(true);
  };
  const handleDelete = async (d: DealershipTestDrive) => {
    if (!window.confirm("Delete this test drive?")) return;
    const ok = await remove(d.id);
    if (ok) toast.success("Removed.");
    else toast.error("Couldn't delete.");
  };
  const submit = async () => {
    if (!draft.customer_name.trim() || !draft.vehicle_label.trim()) return;
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Test drive scheduled."); setDialogOpen(false); }
      else toast.error("Couldn't schedule.");
    }
  };

  // ── Conversion: completed drive → deal ────────────────────────────────────
  const buildDealSeed = (d: DealershipTestDrive): QuickDealSeed => {
    const v = d.vehicle_id ? vehicleMap.get(d.vehicle_id) : null;
    return {
      lead_id: d.lead_id,
      customer_id: d.customer_id,
      customer_name: d.customer_name,
      customer_phone: d.customer_phone,
      customer_email: null,
      vehicle_id: d.vehicle_id,
      vehicle_label: d.vehicle_label,
      vehicle_vin: v?.vin ?? null,
      sale_price_cents: v?.asking_price_cents ?? 0,
      salesperson_user_id: d.salesperson_user_id,
    };
  };

  const handleDealSubmit = async (dealDraft: DealershipSaleDraft) => {
    if (!convertTarget) return;
    const deal = await createSale(dealDraft);
    if (deal) { toast.success("Deal created from test drive."); setConvertTarget(null); }
    else toast.error("Couldn't create deal.");
  };

  const driveCardProps = (d: DealershipTestDrive, extra?: { showDate?: boolean }) => ({
    drive: d,
    saving,
    showDate: extra?.showDate,
    onEdit: () => openEdit(d),
    onDelete: () => void handleDelete(d),
    onStatusChange: (id: string, status: DealershipTestDriveStatus, patch?: Partial<DealershipTestDriveDraft>) =>
      void handleStatusChange(id, status, patch),
    onOpenComplete: setCompleteTarget,
    onConvertToDeal: setConvertTarget,
  });

  return (
    <div className="space-y-5">
      {/* ── header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Test Drives</h2>
          {drives.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-1">
              {[
                { label: "Today", value: grouped.today.length, color: "text-blue-700" },
                { label: "This week", value: stats.thisWeek },
                { label: "Completed", value: stats.completed, color: "text-emerald-700" },
                ...(stats.noShows > 0
                  ? [{ label: "No-shows", value: stats.noShows, color: "text-orange-700" }]
                  : []),
              ].map((s) => (
                <span key={s.label} className={cn("text-sm", s.color ?? "text-muted-foreground")}>
                  <span className="font-bold">{s.value}</span> {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Schedule</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : drives.length === 0 ? (
        <Card className="p-10 text-center">
          <Car className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No test drives yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Schedule your first test drive to get started.</p>
          <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />Schedule first</Button>
        </Card>
      ) : (
        <div className="space-y-6">

          {/* ── Today ── */}
          {grouped.today.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">
                  Today — {fmtDate(grouped.today[0].scheduled_at)}
                </p>
                <Badge className="border-0 bg-primary/10 text-primary text-[10px]">
                  {grouped.today.length} drive{grouped.today.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="space-y-2">
                {grouped.today.map((d) => (
                  <DriveCard key={d.id} {...driveCardProps(d)} />
                ))}
              </div>
            </div>
          )}

          {/* ── Upcoming — grouped by day ── */}
          {grouped.upcomingByDay.size > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Upcoming</p>
              <div className="space-y-4">
                {Array.from(grouped.upcomingByDay.entries()).map(([dateStr, list]) => (
                  <div key={dateStr}>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {fmtDate(list[0].scheduled_at)}
                    </p>
                    <div className="space-y-2">
                      {list.map((d) => (
                        <DriveCard key={d.id} {...driveCardProps(d)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Past ── */}
          {grouped.past.length > 0 && (
            <div>
              <button
                type="button"
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPast((p) => !p)}
              >
                {showPast ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Past ({grouped.past.length})
              </button>
              {showPast && (
                <div className="mt-3 space-y-2">
                  {grouped.past.slice(0, 30).reverse().map((d) => (
                    <DriveCard key={d.id} {...driveCardProps(d, { showDate: true })} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Completion dialog ── */}
      {completeTarget && (
        <CompleteDialog
          drive={completeTarget}
          saving={saving}
          onClose={() => setCompleteTarget(null)}
          onSubmit={handleComplete}
        />
      )}

      {/* ── Convert-to-deal dialog ── */}
      <QuickCreateDealDialog
        open={!!convertTarget}
        onOpenChange={(o) => { if (!o) setConvertTarget(null); }}
        seed={convertTarget ? buildDealSeed(convertTarget) : null}
        saving={savingSale}
        onSubmit={handleDealSubmit}
      />

      {/* ── Schedule / edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit test drive" : "Schedule test drive"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <CustomerPicker
              storeId={storeId}
              customerId={draft.customer_id}
              customerName={draft.customer_name}
              required
              onSelect={(c) => setDraft({
                ...draft,
                customer_id: c?.id ?? null,
                customer_name: c?.display_name ?? draft.customer_name,
                customer_phone: c?.phone ?? draft.customer_phone,
              })}
              onNameChange={(name) => setDraft({ ...draft, customer_name: name, customer_id: null })}
            />
            <VehiclePicker
              storeId={storeId}
              vehicleId={draft.vehicle_id}
              vehicleLabel={draft.vehicle_label}
              required
              onSelect={(v) => setDraft({
                ...draft,
                vehicle_id: v?.id ?? null,
                vehicle_label: v?.label ?? draft.vehicle_label,
              })}
              onLabelChange={(label) => setDraft({ ...draft, vehicle_label: label, vehicle_id: null })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>When</Label>
                <Input
                  type="datetime-local"
                  value={draft.scheduled_at.slice(0, 16)}
                  onChange={(e) => setDraft({ ...draft, scheduled_at: new Date(e.target.value).toISOString() })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={draft.duration_minutes}
                  onChange={(e) => setDraft({ ...draft, duration_minutes: parseInt(e.target.value, 10) || 30 })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as DealershipTestDriveStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No-show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Odometer — show when editing completed drives */}
            {(editing || draft.status === "completed") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start odometer</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.start_odometer ?? ""}
                    onChange={(e) => setDraft({ ...draft, start_odometer: e.target.value ? parseInt(e.target.value, 10) : null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End odometer</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.end_odometer ?? ""}
                    onChange={(e) => setDraft({ ...draft, end_odometer: e.target.value ? parseInt(e.target.value, 10) : null })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
                placeholder="Customer feedback, interest level..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={saving || !draft.customer_name.trim() || !draft.vehicle_label.trim()}
            >
              {saving ? "Saving..." : editing ? "Save" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarDealershipTestDrivesSection = memo(CarDealershipTestDrivesSectionInner);
export default CarDealershipTestDrivesSection;
