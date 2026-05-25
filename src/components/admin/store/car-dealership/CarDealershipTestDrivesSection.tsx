/**
 * Test drives section — schedule, confirm, run, complete.
 */
import { memo, useMemo, useState } from "react";
import { Plus, Calendar, Car, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipTestDrives,
  type DealershipTestDrive,
  type DealershipTestDriveStatus,
  type DealershipTestDriveDraft,
} from "@/hooks/car-dealership/useDealershipTestDrives";

const statusStyles: Record<DealershipTestDriveStatus, string> = {
  scheduled: "bg-blue-500/15 text-blue-700",
  confirmed: "bg-emerald-500/15 text-emerald-700",
  in_progress: "bg-amber-500/15 text-amber-700",
  completed: "bg-zinc-500/15 text-zinc-700",
  cancelled: "bg-red-500/15 text-red-700",
  no_show: "bg-orange-500/15 text-orange-700",
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

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

interface Props { storeId: string; }

function CarDealershipTestDrivesSectionInner({ storeId }: Props) {
  const { drives, loading, saving, create, update, remove } = useDealershipTestDrives(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipTestDrive | null>(null);
  const [draft, setDraft] = useState<DealershipTestDriveDraft>(emptyDraft());

  const grouped = useMemo(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const today: DealershipTestDrive[] = [];
    const upcoming: DealershipTestDrive[] = [];
    const past: DealershipTestDrive[] = [];
    for (const d of drives) {
      const t = new Date(d.scheduled_at).getTime();
      if (t >= startOfDay.getTime() && t <= endOfDay.getTime()) today.push(d);
      else if (t > endOfDay.getTime()) upcoming.push(d);
      else past.push(d);
    }
    return { today, upcoming, past };
  }, [drives]);

  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (d: DealershipTestDrive) => {
    setEditing(d);
    const { id, store_id, created_at, updated_at, ...rest } = d;
    setDraft(rest);
    setDialogOpen(true);
  };
  const submit = async () => {
    if (!draft.customer_name.trim() || !draft.vehicle_label.trim()) return;
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Test drive updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Test drive scheduled."); setDialogOpen(false); }
      else toast.error("Couldn't schedule.");
    }
  };
  const handleDelete = async (d: DealershipTestDrive) => {
    if (!window.confirm(`Delete this test drive?`)) return;
    const ok = await remove(d.id);
    if (ok) toast.success("Removed.");
    else toast.error("Couldn't delete.");
  };

  const renderList = (label: string, list: DealershipTestDrive[]) => (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
        {label} ({list.length})
      </p>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">None.</p>
      ) : (
        <div className="space-y-2">
          {list.map((d) => (
            <Card key={d.id} className="p-3 flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Car className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{d.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate">{d.vehicle_label}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDateTime(d.scheduled_at)}</span>
                  <span>· {d.duration_minutes} min</span>
                </div>
              </div>
              <Badge className={cn("border-0 text-[10px]", statusStyles[d.status])}>{d.status.replace(/_/g, " ")}</Badge>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(d)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Test Drives</h2>
          <p className="text-sm text-muted-foreground">{drives.length} total</p>
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
          <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />Schedule first</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {renderList("Today", grouped.today)}
          {renderList("Upcoming", grouped.upcoming)}
          {renderList("Past", grouped.past.slice(0, 20))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit test drive" : "Schedule test drive"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Customer name *</Label>
              <Input value={draft.customer_name} onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Customer phone</Label>
              <Input value={draft.customer_phone ?? ""} onChange={(e) => setDraft({ ...draft, customer_phone: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle *</Label>
              <Input value={draft.vehicle_label} onChange={(e) => setDraft({ ...draft, vehicle_label: e.target.value })} placeholder="2023 Toyota Camry SE" />
            </div>
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
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as DealershipTestDriveStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !draft.customer_name.trim() || !draft.vehicle_label.trim()}>
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
