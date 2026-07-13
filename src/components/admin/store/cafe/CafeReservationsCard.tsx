/**
 * CafeReservationsCard — slot-in card showing upcoming reservations with
 * new + status-cycle actions. Lives inside CafeTablesSection because a
 * reservation always implies a table (even when unassigned at creation).
 */
import { useState, useMemo } from "react";
import { CalendarClock, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCafeReservations, type CafeReservationStatus, type CafeReservationDraft } from "@/hooks/cafe/useCafeReservations";
import { useCafeTables } from "@/hooks/cafe/useCafeTables";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const STATUS_LABEL: Record<CafeReservationStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", seated: "Seated", cancelled: "Cancelled", no_show: "No-show",
};
const STATUS_TONE: Record<CafeReservationStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  confirmed: "bg-blue-500/15 text-blue-700",
  seated: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-destructive/15 text-destructive",
};

const pad = (n: number) => n.toString().padStart(2, "0");
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const blankDraft = (): { table_id: string; customer_name: string; customer_phone: string; party_size: string; reserved_for: string; duration_minutes: string; notes: string } => {
  const t = new Date(Date.now() + 60 * 60 * 1000); // default to 1 hour from now
  t.setMinutes(0, 0, 0);
  return {
    table_id: "",
    customer_name: "",
    customer_phone: "",
    party_size: "2",
    reserved_for: toLocalInput(t),
    duration_minutes: "60",
    notes: "",
  };
};

export default function CafeReservationsCard({ storeId }: Props) {
  const { reservations, loading, saving, create, setStatus, remove } = useCafeReservations(storeId);
  const { tables } = useCafeTables(storeId);
  const [dialog, setDialog] = useState(false);
  const [draft, setDraft] = useState(blankDraft());

  const tableLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tables) m.set(t.id, t.label);
    return m;
  }, [tables]);

  const visible = useMemo(
    () => reservations.filter((r) => r.status !== "cancelled" && r.status !== "no_show"),
    [reservations],
  );

  const handleCreate = async () => {
    if (!draft.customer_name.trim()) { toast.error("Customer name required."); return; }
    if (!draft.reserved_for) { toast.error("Pick a date and time."); return; }
    const partySize = Math.max(1, parseInt(draft.party_size, 10) || 1);
    const dur = Math.max(1, parseInt(draft.duration_minutes, 10) || 60);
    const payload: CafeReservationDraft = {
      table_id: draft.table_id || null,
      customer_name: draft.customer_name.trim(),
      customer_phone: draft.customer_phone.trim() || null,
      party_size: partySize,
      reserved_for: new Date(draft.reserved_for).toISOString(),
      duration_minutes: dur,
      status: "confirmed",
      notes: draft.notes.trim() || null,
    };
    const ok = await create(payload);
    if (ok) { setDialog(false); setDraft(blankDraft()); toast.success("Reservation saved."); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-violet-600" /> Reservations</span>
          <Button size="sm" onClick={() => { setDraft(blankDraft()); setDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Reserve
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No upcoming reservations. Log one when a customer calls or messages.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {visible.map((r) => {
              const dt = new Date(r.reserved_for);
              const isToday = new Date().toDateString() === dt.toDateString();
              return (
                <li key={r.id} className="py-2 flex flex-wrap items-center gap-2">
                  <div className="flex flex-col shrink-0 w-28">
                    <span className="font-bold tabular-nums text-sm">
                      {dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {isToday ? "Today" : dt.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{r.customer_name}</span>
                      <span className={cn("text-[10px] uppercase tracking-wider font-semibold rounded px-1.5 py-0.5", STATUS_TONE[r.status])}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Party of {r.party_size}
                      {r.table_id && tableLabelById.get(r.table_id) ? ` · Table ${tableLabelById.get(r.table_id)}` : " · No table"}
                      {r.customer_phone ? ` · ${r.customer_phone}` : ""}
                      {" · "}
                      {r.duration_minutes}m
                    </p>
                    {r.notes && <p className="text-[11px] italic text-muted-foreground truncate">&ldquo;{r.notes}&rdquo;</p>}
                  </div>
                  <Select value={r.status} onValueChange={(v) => void setStatus(r.id, v as CafeReservationStatus)} disabled={saving}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as CafeReservationStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => { if (confirm(`Remove ${r.customer_name}'s reservation?`)) void remove(r.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New reservation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer name *</Label>
                <Input
                  autoFocus
                  value={draft.customer_name}
                  onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })}
                  placeholder="Pisey"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={draft.customer_phone}
                  onChange={(e) => setDraft({ ...draft, customer_phone: e.target.value })}
                  placeholder="+855 12 …"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Party size</Label>
                <Input
                  type="number" min="1" max="50"
                  value={draft.party_size}
                  onChange={(e) => setDraft({ ...draft, party_size: e.target.value })}
                />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number" min="15" step="15"
                  value={draft.duration_minutes}
                  onChange={(e) => setDraft({ ...draft, duration_minutes: e.target.value })}
                />
              </div>
              <div>
                <Label>Table</Label>
                <Select value={draft.table_id || "none"} onValueChange={(v) => setDraft({ ...draft, table_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Any table" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific table</SelectItem>
                    {tables.filter((t) => t.is_active).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reserved for *</Label>
              <Input
                type="datetime-local"
                value={draft.reserved_for}
                onChange={(e) => setDraft({ ...draft, reserved_for: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="e.g. Birthday — bring candles"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
