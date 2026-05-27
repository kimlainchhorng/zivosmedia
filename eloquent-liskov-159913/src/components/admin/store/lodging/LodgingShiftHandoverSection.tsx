/**
 * Lodging — Shift Handover Notes.
 * Front desk staff leave notes, VIP alerts, and pending tasks for the incoming shift.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  FileText, Plus, Trash2, AlertTriangle, Star, Clock,
  CheckCircle2, Info,
} from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";

type Priority = "info" | "important" | "urgent" | "vip";
type Shift = "morning" | "afternoon" | "night";

interface HandoverNote {
  id: string;
  store_id: string;
  author_name: string | null;
  shift: Shift;
  note_date: string;
  priority: Priority;
  body: string;
  resolved: boolean;
  created_at: string;
}

const PRIORITY_LABEL: Record<Priority, string> = { info: "Info", important: "Important", urgent: "Urgent", vip: "VIP Alert" };
const PRIORITY_COLOR: Record<Priority, string> = {
  info: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  important: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  urgent: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  vip: "bg-purple-500/10 text-purple-700 border-purple-500/20",
};
const PRIORITY_ICON: Record<Priority, any> = { info: Info, important: AlertTriangle, urgent: AlertTriangle, vip: Star };
const SHIFT_LABEL: Record<Shift, string> = { morning: "Morning (6am–2pm)", afternoon: "Afternoon (2pm–10pm)", night: "Night (10pm–6am)" };

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
const currentShift = (): Shift => {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return "morning";
  if (h >= 14 && h < 22) return "afternoon";
  return "night";
};

export default function LodgingShiftHandoverSection({ storeId }: { storeId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = ymd(new Date());
  const [noteDate, setNoteDate] = useState(today);
  const [filterShift, setFilterShift] = useState<Shift | "all">("all");
  const [filterResolved, setFilterResolved] = useState<"open" | "resolved" | "all">("open");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<HandoverNote>>({
    shift: currentShift(), priority: "info", body: "", author_name: "",
  });

  const { data: reservations = [] } = useLodgeReservations(storeId, "all");

  const query = useQuery({
    queryKey: ["lodge_handover_notes", storeId, noteDate],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_handover_notes")
        .select("*")
        .eq("store_id", storeId)
        .eq("note_date", noteDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as HandoverNote[];
    },
  });

  const addNote = useMutation({
    mutationFn: async (note: Partial<HandoverNote>) => {
      const { error } = await (supabase as any).from("lodge_handover_notes").insert({
        store_id: storeId,
        author_name: note.author_name || (user as any)?.email || "Staff",
        shift: note.shift || currentShift(),
        note_date: noteDate,
        priority: note.priority || "info",
        body: note.body,
        resolved: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Handover note added");
      qc.invalidateQueries({ queryKey: ["lodge_handover_notes", storeId] });
      setDialogOpen(false);
      setForm({ shift: currentShift(), priority: "info", body: "", author_name: "" });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const toggleResolved = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await (supabase as any).from("lodge_handover_notes").update({ resolved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge_handover_notes", storeId] }),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_handover_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["lodge_handover_notes", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const notes = query.data || [];

  const filtered = useMemo(() => notes.filter(n => {
    const shiftMatch = filterShift === "all" || n.shift === filterShift;
    const resolvedMatch = filterResolved === "all" || (filterResolved === "open" ? !n.resolved : n.resolved);
    return shiftMatch && resolvedMatch;
  }), [notes, filterShift, filterResolved]);

  // VIP guests today
  const todayArrivals = reservations.filter(r => r.check_in === today && !["cancelled", "no_show"].includes(r.status));
  const todayDepartures = reservations.filter(r => r.check_out === today && r.status === "checked_in");
  const urgentCount = notes.filter(n => !n.resolved && n.priority === "urgent").length;
  const openCount = notes.filter(n => !n.resolved).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Shift Handover</CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add note
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-handover" />
        <LodgingSectionStatusBanner
          title="Shift Handover"
          icon={FileText}
          countLabel="Open notes"
          countValue={openCount}
          fixLabel="Open Front Desk"
          fixTab="lodge-frontdesk"
        />

        {/* Stats row */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Open notes", value: openCount, icon: FileText },
            { label: "Urgent", value: urgentCount, icon: AlertTriangle },
            { label: "Today arrivals", value: todayArrivals.length, icon: Clock },
            { label: "Today departures", value: todayDepartures.length, icon: CheckCircle2 },
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

        {/* Today's context briefing */}
        {(todayArrivals.length > 0 || todayDepartures.length > 0) && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
            <p className="font-semibold text-sm">Today's briefing</p>
            {todayArrivals.length > 0 && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{todayArrivals.length} arrival{todayArrivals.length > 1 ? "s" : ""}:</span>{" "}
                {todayArrivals.slice(0, 3).map(r => r.guest_name || "Guest").join(", ")}{todayArrivals.length > 3 ? ` +${todayArrivals.length - 3} more` : ""}
              </p>
            )}
            {todayDepartures.length > 0 && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{todayDepartures.length} departure{todayDepartures.length > 1 ? "s" : ""}:</span>{" "}
                {todayDepartures.slice(0, 3).map(r => r.guest_name || "Guest").join(", ")}{todayDepartures.length > 3 ? ` +${todayDepartures.length - 3} more` : ""}
              </p>
            )}
          </div>
        )}

        {/* Date + filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "morning", "afternoon", "night"] as const).map(s => (
              <button type="button" key={s} onClick={() => setFilterShift(s as any)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${filterShift === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {(["open", "resolved", "all"] as const).map(s => (
              <button type="button" key={s} onClick={() => setFilterResolved(s)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${filterResolved === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Notes list */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {notes.length === 0
              ? "No handover notes for this date. Use 'Add note' to leave a note for the incoming shift."
              : "No notes match this filter."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => {
              const Icon = PRIORITY_ICON[n.priority];
              return (
                <div key={n.id} className={`rounded-lg border p-3 ${n.resolved ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${n.priority === "urgent" || n.priority === "vip" ? "text-rose-600" : n.priority === "important" ? "text-amber-600" : "text-blue-600"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={`text-[10px] border ${PRIORITY_COLOR[n.priority]}`}>{PRIORITY_LABEL[n.priority]}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{SHIFT_LABEL[n.shift]}</Badge>
                        {n.resolved && <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-500/30">Resolved</Badge>}
                        <span className="text-[10px] text-muted-foreground ml-auto">{n.author_name || "Staff"} · {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={n.resolved ? "Mark open" : "Mark resolved"}
                        onClick={() => toggleResolved.mutate({ id: n.id, resolved: !n.resolved })}>
                        <CheckCircle2 className={`h-4 w-4 ${n.resolved ? "text-emerald-600" : "text-muted-foreground"}`} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" title="Delete"
                        onClick={() => { if (confirm("Delete this note?")) deleteNote.mutate(n.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add note dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add handover note</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Your name</Label>
                <Input value={form.author_name || ""} onChange={e => setForm({ ...form, author_name: e.target.value })} placeholder="Front desk officer name" />
              </div>
              <div>
                <Label>Shift</Label>
                <Select value={form.shift} onValueChange={v => setForm({ ...form, shift: v as Shift })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["morning", "afternoon", "night"] as Shift[]).map(s => <SelectItem key={s} value={s}>{SHIFT_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as Priority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["info", "important", "urgent", "vip"] as Priority[]).map(p => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Note</Label>
                <Textarea
                  rows={4}
                  placeholder="e.g. Guest in room 203 requested extra towels for 8pm. VIP in 401 — celebrate birthday. Elevator button stuck on 3rd floor."
                  value={form.body || ""}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!form.body?.trim() || addNote.isPending} onClick={() => addNote.mutate(form)}>
                {addNote.isPending ? "Saving…" : "Add note"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
