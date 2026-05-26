/**
 * Lodging — Parking Management.
 * Assign parking slots to guests, track vehicles and expected departure dates.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Car, Plus, Pencil, Trash2, ParkingCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type SlotStatus = "available" | "occupied" | "reserved" | "maintenance";
type SlotType = "standard" | "compact" | "disabled" | "valet" | "ev";

interface ParkingSlot {
  id: string;
  slot_number: string;
  slot_type: SlotType;
  status: SlotStatus;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  guest_name: string | null;
  parked_at: string | null;
  expected_out: string | null;
  fee_per_day_cents: number;
  notes: string | null;
}

const TYPE_LABEL: Record<SlotType, string> = {
  standard: "Standard",
  compact: "Compact",
  disabled: "Accessible",
  valet: "Valet",
  ev: "EV Charging",
};

const TYPE_ICON: Record<SlotType, any> = {
  standard: Car,
  compact: Car,
  disabled: ParkingCircle,
  valet: Car,
  ev: Zap,
};

const STATUS_COLOR: Record<SlotStatus, string> = {
  available: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  occupied: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  reserved: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  maintenance: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const BLANK: Partial<ParkingSlot> = {
  slot_number: "",
  slot_type: "standard",
  status: "available",
  vehicle_plate: "",
  vehicle_model: "",
  vehicle_color: "",
  guest_name: "",
  parked_at: null,
  expected_out: "",
  fee_per_day_cents: 0,
  notes: "",
};

export default function LodgingParkingSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<SlotStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ParkingSlot | null>(null);
  const [form, setForm] = useState<Partial<ParkingSlot>>(BLANK);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const query = useQuery({
    queryKey: ["lodge_parking_slots", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_parking_slots")
        .select("*")
        .eq("store_id", storeId)
        .order("slot_number", { ascending: true });
      if (error) throw error;
      return (data || []) as ParkingSlot[];
    },
  });

  const openCreate = () => { setEditing(null); setForm(BLANK); setDialogOpen(true); };
  const openEdit = (s: ParkingSlot) => { setEditing(s); setForm(s); setDialogOpen(true); };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        store_id: storeId,
        slot_number: form.slot_number?.trim(),
        slot_type: form.slot_type,
        status: form.status,
        vehicle_plate: form.vehicle_plate || null,
        vehicle_model: form.vehicle_model || null,
        vehicle_color: form.vehicle_color || null,
        guest_name: form.guest_name || null,
        parked_at: form.status === "occupied" && !form.parked_at ? new Date().toISOString() : (form.parked_at || null),
        expected_out: form.expected_out || null,
        fee_per_day_cents: form.fee_per_day_cents ?? 0,
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await (supabase as any).from("lodge_parking_slots").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("lodge_parking_slots").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Slot updated" : "Slot added");
      qc.invalidateQueries({ queryKey: ["lodge_parking_slots", storeId] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Failed — slot number may already exist"),
  });

  const release = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_parking_slots").update({
        status: "available",
        vehicle_plate: null, vehicle_model: null, vehicle_color: null,
        guest_name: null, parked_at: null, expected_out: null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot released");
      qc.invalidateQueries({ queryKey: ["lodge_parking_slots", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_parking_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot removed");
      qc.invalidateQueries({ queryKey: ["lodge_parking_slots", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = query.data || [];
  const filtered = filterStatus === "all" ? all : all.filter(s => s.status === filterStatus);

  const occupied = all.filter(s => s.status === "occupied");
  const available = all.filter(s => s.status === "available");
  const occupancyPct = all.length > 0 ? Math.round((occupied.length / all.length) * 100) : 0;

  const today = new Date().toISOString().slice(0, 10);
  const overdueOut = occupied.filter(s => s.expected_out && s.expected_out < today);

  const isValid = form.slot_number?.trim();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5" /> Parking Management</CardTitle>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["grid", "list"] as const).map(m => (
              <button type="button" key={m} onClick={() => setViewMode(m)}
                className={`px-2.5 py-1 text-[11px] font-medium capitalize ${viewMode === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
                {m}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add slot
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-parking" />
        <LodgingSectionStatusBanner
          title="Parking"
          icon={Car}
          countLabel="Occupancy"
          countValue={`${occupancyPct}%`}
          fixLabel="Open Front Desk"
          fixTab="lodge-frontdesk"
        />

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Total slots", value: all.length },
            { label: "Occupied", value: occupied.length },
            { label: "Available", value: available.length },
            { label: "Overdue", value: overdueOut.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
              <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Overdue alert */}
        {overdueOut.length > 0 && (
          <div className="rounded-lg border border-border bg-secondary p-3 text-xs">
            <p className="font-semibold text-foreground">Overdue vehicles</p>
            <p className="text-muted-foreground mt-0.5">{overdueOut.map(s => `Slot ${s.slot_number} (${s.vehicle_plate || "—"})`).join(", ")}</p>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "available", "occupied", "reserved", "maintenance"] as const).map(s => (
            <button type="button" key={s} onClick={() => setFilterStatus(s as any)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Grid or list view */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {all.length === 0 ? "No parking slots configured. Add your parking spaces to start tracking." : "No slots match this filter."}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {filtered.map(slot => {
              const Icon = TYPE_ICON[slot.slot_type];
              const isOccupied = slot.status === "occupied";
              const isOverdue = isOccupied && slot.expected_out && slot.expected_out < today;
              return (
                <button type="button"
                  key={slot.id}
                  onClick={() => openEdit(slot)}
                  className={`rounded-lg border p-2 text-center transition hover:scale-105 ${isOverdue ? "border-rose-500/50 bg-rose-500/10" : STATUS_COLOR[slot.status]}`}
                >
                  <Icon className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-[11px] font-bold">{slot.slot_number}</p>
                  {isOccupied && <p className="text-[9px] truncate">{slot.vehicle_plate || "—"}</p>}
                  <p className={`text-[9px] capitalize mt-0.5 ${isOverdue ? "text-rose-600 font-bold" : ""}`}>
                    {isOverdue ? "Overdue" : slot.status}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(slot => {
              const Icon = TYPE_ICON[slot.slot_type];
              const isOverdue = slot.status === "occupied" && slot.expected_out && slot.expected_out < today;
              return (
                <div key={slot.id} className={`rounded-lg border p-3 ${isOverdue ? "border-rose-500/30 bg-rose-500/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-sm">Slot {slot.slot_number}</span>
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[slot.slot_type]}</Badge>
                        <Badge className={`text-[10px] border ${STATUS_COLOR[slot.status]}`}>{slot.status}</Badge>
                        {isOverdue && <Badge className="text-[10px] border border-border bg-secondary text-foreground">Overdue</Badge>}
                      </div>
                      {slot.status === "occupied" && (
                        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-3">
                          {slot.vehicle_plate && <span className="font-medium text-foreground">{slot.vehicle_plate}</span>}
                          {slot.vehicle_color && slot.vehicle_model && <span>{slot.vehicle_color} {slot.vehicle_model}</span>}
                          {slot.guest_name && <span>Guest: {slot.guest_name}</span>}
                          {slot.expected_out && <span>Out: {slot.expected_out}</span>}
                          {slot.fee_per_day_cents > 0 && <span>{fmt(slot.fee_per_day_cents)}/day</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {slot.status === "occupied" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                          onClick={() => { if (confirm("Release this slot?")) release.mutate(slot.id); }}>
                          Release
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(slot)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {slot.status === "available" && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => { if (confirm("Remove this slot?")) deleteSlot.mutate(slot.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit slot ${editing.slot_number}` : "Add parking slot"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Slot number / label *</Label>
                <Input value={form.slot_number || ""} onChange={e => setForm({ ...form, slot_number: e.target.value })} placeholder="e.g. A-01, P3" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.slot_type} onValueChange={v => setForm({ ...form, slot_type: v as SlotType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABEL) as SlotType[]).map(k => (
                      <SelectItem key={k} value={k}>{TYPE_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as SlotStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Daily fee (USD)</Label>
                <Input type="number" min="0" step="0.01"
                  value={form.fee_per_day_cents ? (form.fee_per_day_cents / 100).toFixed(2) : ""}
                  onChange={e => setForm({ ...form, fee_per_day_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  placeholder="0.00" />
              </div>
              {form.status === "occupied" && <>
                <div>
                  <Label>Vehicle plate</Label>
                  <Input value={form.vehicle_plate || ""} onChange={e => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })} placeholder="ABC 1234" />
                </div>
                <div>
                  <Label>Guest name</Label>
                  <Input value={form.guest_name || ""} onChange={e => setForm({ ...form, guest_name: e.target.value })} />
                </div>
                <div>
                  <Label>Vehicle (color + model)</Label>
                  <Input value={form.vehicle_model || ""} onChange={e => setForm({ ...form, vehicle_model: e.target.value })} placeholder="e.g. Black Toyota Camry" />
                </div>
                <div>
                  <Label>Expected departure</Label>
                  <Input type="date" value={form.expected_out || ""} onChange={e => setForm({ ...form, expected_out: e.target.value })} />
                </div>
              </>}
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Special instructions…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!isValid || upsert.isPending} onClick={() => upsert.mutate()}>
                {upsert.isPending ? "Saving…" : editing ? "Update" : "Add slot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
