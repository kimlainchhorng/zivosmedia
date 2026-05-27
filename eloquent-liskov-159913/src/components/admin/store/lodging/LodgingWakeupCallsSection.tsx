/**
 * Lodging — Wake-up Calls.
 * Schedule, track, and manage wake-up call requests per room.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlarmClock, Plus, CheckCircle2, XCircle, AlertTriangle, Trash2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type CallStatus = "scheduled" | "completed" | "missed" | "cancelled";

interface WakeupCall {
  id: string;
  room_number: string;
  guest_name: string | null;
  call_date: string;
  call_time: string;
  repeat_daily: boolean;
  status: CallStatus;
  notes: string | null;
  created_at: string;
}

const STATUS_COLOR: Record<CallStatus, string> = {
  scheduled: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  missed: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const STATUS_ICON: Record<CallStatus, any> = {
  scheduled: Clock,
  completed: CheckCircle2,
  missed: AlertTriangle,
  cancelled: XCircle,
};

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

const BLANK = {
  room_number: "", guest_name: "", call_date: ymd(new Date()),
  call_time: "07:00", repeat_daily: false, notes: "",
};

export default function LodgingWakeupCallsSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const today = ymd(new Date());
  const [dateFilter, setDateFilter] = useState(today);
  const [filterStatus, setFilterStatus] = useState<CallStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(BLANK);

  const query = useQuery({
    queryKey: ["lodge_wakeup_calls", storeId, dateFilter],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_wakeup_calls")
        .select("*")
        .eq("store_id", storeId)
        .eq("call_date", dateFilter)
        .order("call_time", { ascending: true });
      if (error) throw error;
      return (data || []) as WakeupCall[];
    },
    refetchInterval: 60000,
  });

  const addCall = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("lodge_wakeup_calls").insert({
        store_id: storeId,
        room_number: form.room_number.trim(),
        guest_name: form.guest_name || null,
        call_date: form.call_date,
        call_time: form.call_time,
        repeat_daily: form.repeat_daily,
        notes: form.notes || null,
        status: "scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Wake-up call scheduled");
      qc.invalidateQueries({ queryKey: ["lodge_wakeup_calls", storeId] });
      setDialogOpen(false);
      setForm({ ...BLANK, call_date: dateFilter });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CallStatus }) => {
      const { error } = await (supabase as any).from("lodge_wakeup_calls").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge_wakeup_calls", storeId] }),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteCall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_wakeup_calls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["lodge_wakeup_calls", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = query.data || [];
  const filtered = filterStatus === "all" ? all : all.filter(c => c.status === filterStatus);
  const scheduledCount = all.filter(c => c.status === "scheduled").length;
  const missedCount = all.filter(c => c.status === "missed").length;

  const isValid = form.room_number.trim() && form.call_time && form.call_date;

  // Sort by time for the timeline view
  const sortedFiltered = [...filtered].sort((a, b) => a.call_time.localeCompare(b.call_time));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <AlarmClock className="h-5 w-5" /> Wake-up Calls
        </CardTitle>
        <Button size="sm" onClick={() => { setForm({ ...BLANK, call_date: dateFilter }); setDialogOpen(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Schedule
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-wakeup" />
        <LodgingSectionStatusBanner
          title="Wake-up Calls"
          icon={AlarmClock}
          countLabel="Scheduled today"
          countValue={scheduledCount}
          fixLabel="Open Front Desk"
          fixTab="lodge-frontdesk"
        />

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Scheduled", value: scheduledCount, icon: Clock },
            { label: "Completed", value: all.filter(c => c.status === "completed").length, icon: CheckCircle2 },
            { label: "Missed", value: missedCount, icon: AlertTriangle },
            { label: "Repeat daily", value: all.filter(c => c.repeat_daily && c.status === "scheduled").length, icon: AlarmClock },
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

        {/* Date + filter controls */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Date</Label>
            <div className="flex gap-1.5 items-center">
              <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-8 w-36 text-xs" />
              {dateFilter !== today && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDateFilter(today)}>Today</Button>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "scheduled", "completed", "missed", "cancelled"] as const).map(s => (
              <button type="button" key={s} onClick={() => setFilterStatus(s as any)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Missed alert */}
        {missedCount > 0 && (
          <div className="rounded-lg border border-border bg-secondary p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-foreground shrink-0" />
            <span className="text-foreground font-medium">{missedCount} missed wake-up call{missedCount > 1 ? "s" : ""} — follow up with guest{missedCount > 1 ? "s" : ""}.</span>
          </div>
        )}

        {/* Timeline list */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : sortedFiltered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? "No wake-up calls scheduled for this date. Use 'Schedule' to add one."
              : "No calls match this filter."}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedFiltered.map(call => {
              const Icon = STATUS_ICON[call.status];
              return (
                <div key={call.id} className={`rounded-lg border p-3 flex items-center gap-3 ${call.status === "missed" ? "border-rose-500/30 bg-rose-500/5" : ""}`}>
                  {/* Time column */}
                  <div className="shrink-0 text-center w-14">
                    <p className="text-base font-bold tabular-nums">{call.call_time.slice(0, 5)}</p>
                    {call.repeat_daily && <p className="text-[9px] text-muted-foreground">daily</p>}
                  </div>
                  <Icon className={`h-4 w-4 shrink-0 ${call.status === "missed" ? "text-rose-600" : call.status === "completed" ? "text-emerald-600" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">Room {call.room_number}</span>
                      {call.guest_name && <span className="text-xs text-muted-foreground">— {call.guest_name}</span>}
                      <Badge className={`text-[10px] border ml-auto ${STATUS_COLOR[call.status]}`}>{call.status}</Badge>
                    </div>
                    {call.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{call.notes}</p>}
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-1 shrink-0">
                    {call.status === "scheduled" && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1 text-emerald-700"
                          onClick={() => setStatus.mutate({ id: call.id, status: "completed" })}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Done
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1 text-foreground"
                          onClick={() => setStatus.mutate({ id: call.id, status: "missed" })}>
                          <AlertTriangle className="h-3.5 w-3.5" /> Missed
                        </Button>
                      </>
                    )}
                    {call.status === "missed" && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1 text-emerald-700"
                        onClick={() => setStatus.mutate({ id: call.id, status: "completed" })}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                      onClick={() => { if (confirm("Delete this wake-up call?")) deleteCall.mutate(call.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Schedule wake-up call</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Room number *</Label>
                <Input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} placeholder="e.g. 203" />
              </div>
              <div>
                <Label>Guest name</Label>
                <Input value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} />
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.call_date} onChange={e => setForm({ ...form, call_date: e.target.value })} />
              </div>
              <div>
                <Label>Time *</Label>
                <Input type="time" value={form.call_time} onChange={e => setForm({ ...form, call_time: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Gentle knock too, early flight" />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Switch checked={form.repeat_daily} onCheckedChange={v => setForm({ ...form, repeat_daily: v })} />
                <Label className="text-sm">Repeat every day of stay</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!isValid || addCall.isPending} onClick={() => addCall.mutate()}>
                {addCall.isPending ? "Scheduling…" : "Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
