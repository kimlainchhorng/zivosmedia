/**
 * Lodging — Group & Event Bookings.
 * Manage room blocks for weddings, corporate stays, tour groups, conferences.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Plus, Pencil, Trash2, CalendarRange, Building2,
  Heart, Briefcase, Bus, GraduationCap, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type EventType = "wedding" | "corporate" | "tour" | "conference" | "school" | "other";
type Status = "tentative" | "confirmed" | "cancelled";

interface GroupBooking {
  id: string;
  store_id: string;
  group_name: string;
  organizer_name: string | null;
  organizer_email: string | null;
  organizer_phone: string | null;
  event_type: EventType;
  check_in: string;
  check_out: string;
  room_count: number;
  negotiated_rate_cents: number;
  deposit_cents: number;
  status: Status;
  notes: string | null;
  created_at: string;
}

const EVENT_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  corporate: "Corporate",
  tour: "Tour Group",
  conference: "Conference",
  school: "School / Educational",
  other: "Other",
};

const EVENT_ICON: Record<EventType, any> = {
  wedding: Heart,
  corporate: Briefcase,
  tour: Bus,
  conference: Building2,
  school: GraduationCap,
  other: MoreHorizontal,
};

const STATUS_COLOR: Record<Status, string> = {
  tentative: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const nightsBetween = (ci: string, co: string) => {
  if (!ci || !co) return 0;
  const d = (new Date(co).getTime() - new Date(ci).getTime()) / 86400000;
  return Math.max(0, d);
};

const BLANK: Partial<GroupBooking> = {
  group_name: "",
  organizer_name: "",
  organizer_email: "",
  organizer_phone: "",
  event_type: "corporate",
  check_in: "",
  check_out: "",
  room_count: 5,
  negotiated_rate_cents: 0,
  deposit_cents: 0,
  status: "tentative",
  notes: "",
};

export default function LodgingGroupBookingSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GroupBooking | null>(null);
  const [form, setForm] = useState<Partial<GroupBooking>>(BLANK);

  const query = useQuery({
    queryKey: ["lodge_group_bookings", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_group_bookings")
        .select("*")
        .eq("store_id", storeId)
        .order("check_in", { ascending: true });
      if (error) throw error;
      return (data || []) as GroupBooking[];
    },
  });

  const openCreate = () => { setEditing(null); setForm(BLANK); setDialogOpen(true); };
  const openEdit = (g: GroupBooking) => { setEditing(g); setForm(g); setDialogOpen(true); };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        store_id: storeId,
        group_name: form.group_name,
        organizer_name: form.organizer_name || null,
        organizer_email: form.organizer_email || null,
        organizer_phone: form.organizer_phone || null,
        event_type: form.event_type,
        check_in: form.check_in,
        check_out: form.check_out,
        room_count: form.room_count || 1,
        negotiated_rate_cents: form.negotiated_rate_cents || 0,
        deposit_cents: form.deposit_cents || 0,
        status: form.status,
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await (supabase as any).from("lodge_group_bookings").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("lodge_group_bookings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Group booking updated" : "Group booking created");
      qc.invalidateQueries({ queryKey: ["lodge_group_bookings", storeId] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_group_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["lodge_group_bookings", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = query.data || [];
  const filtered = filterStatus === "all" ? all : all.filter(g => g.status === filterStatus);

  const confirmedRooms = all.filter(g => g.status === "confirmed").reduce((s, g) => s + g.room_count, 0);
  const confirmedRevenue = all.filter(g => g.status === "confirmed").reduce((s, g) => {
    const nights = nightsBetween(g.check_in, g.check_out);
    return s + g.negotiated_rate_cents * g.room_count * nights;
  }, 0);
  const tentativeCount = all.filter(g => g.status === "tentative").length;

  const isValid = form.group_name?.trim() && form.check_in && form.check_out && (form.check_out! > form.check_in!);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Group & Event Bookings</CardTitle>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New group
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-groupbooking" />
        <LodgingSectionStatusBanner
          title="Group Bookings"
          icon={Users}
          countLabel="Tentative groups"
          countValue={tentativeCount}
          fixLabel="Open Reservations"
          fixTab="lodge-reservations"
        />

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Total groups", value: all.length, icon: Users },
            { label: "Tentative", value: tentativeCount, icon: CalendarRange },
            { label: "Confirmed rooms", value: confirmedRooms, icon: Building2 },
            { label: "Confirmed revenue", value: fmt(confirmedRevenue), icon: Briefcase },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "tentative", "confirmed", "cancelled"] as const).map(s => (
            <button type="button" key={s} onClick={() => setFilterStatus(s as any)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        {/* List */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? "No group bookings yet. Use 'New group' to create a room block for an event or tour."
              : "No bookings match this filter."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(g => {
              const Icon = EVENT_ICON[g.event_type];
              const nights = nightsBetween(g.check_in, g.check_out);
              const totalValue = g.negotiated_rate_cents * g.room_count * nights;
              return (
                <div key={g.id} className={`rounded-lg border p-3 ${g.status === "cancelled" ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{g.group_name}</span>
                        <Badge className={`text-[10px] border ${STATUS_COLOR[g.status]}`}>{g.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{EVENT_LABELS[g.event_type]}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span>{g.check_in} → {g.check_out} ({nights} nights)</span>
                        <span>{g.room_count} room{g.room_count > 1 ? "s" : ""}</span>
                        <span>{fmt(g.negotiated_rate_cents)}/room/night</span>
                        {totalValue > 0 && <span className="text-foreground font-medium">{fmt(totalValue)} total</span>}
                      </div>
                      {g.organizer_name && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Contact: {g.organizer_name}{g.organizer_email ? ` · ${g.organizer_email}` : ""}{g.organizer_phone ? ` · ${g.organizer_phone}` : ""}
                        </p>
                      )}
                      {g.notes && <p className="text-[11px] text-muted-foreground mt-1 italic">{g.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(g)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                        onClick={() => { if (confirm("Delete this group booking?")) deleteBooking.mutate(g.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit group booking" : "New group booking"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Group / Event name *</Label>
                <Input value={form.group_name || ""} onChange={e => setForm({ ...form, group_name: e.target.value })} placeholder="e.g. Smith Wedding, ACME Corp retreat" />
              </div>
              <div>
                <Label>Event type</Label>
                <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v as EventType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EVENT_LABELS) as EventType[]).map(k => (
                      <SelectItem key={k} value={k}>{EVENT_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tentative">Tentative</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Check-in *</Label>
                <Input type="date" value={form.check_in || ""} onChange={e => setForm({ ...form, check_in: e.target.value })} />
              </div>
              <div>
                <Label>Check-out *</Label>
                <Input type="date" value={form.check_out || ""} onChange={e => setForm({ ...form, check_out: e.target.value })} />
              </div>
              <div>
                <Label>Rooms blocked</Label>
                <Input type="number" min="1" value={form.room_count || ""} onChange={e => setForm({ ...form, room_count: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label>Rate per room/night (USD)</Label>
                <Input type="number" min="0" step="0.01"
                  value={form.negotiated_rate_cents ? (form.negotiated_rate_cents / 100).toFixed(2) : ""}
                  onChange={e => setForm({ ...form, negotiated_rate_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  placeholder="0.00" />
              </div>
              <div>
                <Label>Deposit received (USD)</Label>
                <Input type="number" min="0" step="0.01"
                  value={form.deposit_cents ? (form.deposit_cents / 100).toFixed(2) : ""}
                  onChange={e => setForm({ ...form, deposit_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  placeholder="0.00" />
              </div>
              <div>
                <Label>Organizer name</Label>
                <Input value={form.organizer_name || ""} onChange={e => setForm({ ...form, organizer_name: e.target.value })} />
              </div>
              <div>
                <Label>Organizer email</Label>
                <Input type="email" value={form.organizer_email || ""} onChange={e => setForm({ ...form, organizer_email: e.target.value })} />
              </div>
              <div>
                <Label>Organizer phone</Label>
                <Input value={form.organizer_phone || ""} onChange={e => setForm({ ...form, organizer_phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Special requirements, meal plan, event schedule notes…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!isValid || upsert.isPending} onClick={() => upsert.mutate()}>
                {upsert.isPending ? "Saving…" : editing ? "Update" : "Create booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
