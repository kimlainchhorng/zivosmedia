/**
 * CafeShiftsSection — 7-day shift calendar. Click a day×barista cell to add
 * a shift; shifts show as bars with start/end labels. Distinct from the
 * Time Clock tab (which tracks the actuals).
 */
import { useMemo, useState } from "react";
import { Calendar, Plus, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeBaristas } from "@/hooks/cafe/useCafeBaristas";
import { useCafeShifts, type CafeShift, type CafeShiftStatus } from "@/hooks/cafe/useCafeShifts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfWeek = (d = new Date()) => {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
};
const fmtTimeRange = (s: string, e: string) => {
  const a = new Date(s), b = new Date(e);
  return `${a.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–${b.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
};
const isoLocal = (d: Date) => {
  // YYYY-MM-DDTHH:mm — what <input type="datetime-local"> expects.
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const STATUS_COLOR: Record<CafeShiftStatus, string> = {
  scheduled: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  no_show: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function CafeShiftsSection({ storeId }: Props) {
  const { baristas, loading: bLoading } = useCafeBaristas(storeId);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek());
  const weekFrom = useMemo(() => weekStart.toISOString(), [weekStart]);
  const weekTo = useMemo(() => new Date(weekStart.getTime() + 7 * 86_400_000).toISOString(), [weekStart]);
  const { shifts, loading: sLoading, saving, create, remove, setStatus } = useCafeShifts(storeId, { from: weekFrom, to: weekTo });

  const [dialog, setDialog] = useState(false);
  const [draftBaristaId, setDraftBaristaId] = useState<string>("");
  const [draftStarts, setDraftStarts] = useState<string>("");
  const [draftEnds, setDraftEnds] = useState<string>("");
  const [draftRole, setDraftRole] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  const [detail, setDetail] = useState<CafeShift | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86_400_000)), [weekStart]);

  const shiftsByDayBarista = useMemo(() => {
    const m = new Map<string, CafeShift[]>();
    for (const s of shifts) {
      const day = startOfDay(new Date(s.starts_at));
      const key = `${s.barista_id}:${day.toISOString()}`;
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    return m;
  }, [shifts]);

  const openNew = (baristaId: string, day: Date) => {
    setDraftBaristaId(baristaId);
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(day);
    end.setHours(17, 0, 0, 0);
    setDraftStarts(isoLocal(start));
    setDraftEnds(isoLocal(end));
    setDraftRole(""); setDraftNotes("");
    setDialog(true);
  };

  const submitDraft = async () => {
    if (!draftBaristaId || !draftStarts || !draftEnds) { toast.error("Pick barista + times."); return; }
    const c = await create({
      barista_id: draftBaristaId,
      starts_at: new Date(draftStarts).toISOString(),
      ends_at: new Date(draftEnds).toISOString(),
      role: draftRole.trim() || null,
      notes: draftNotes.trim() || null,
    });
    if (c) {
      toast.success("Scheduled.");
      setDialog(false);
    }
  };

  if (bLoading || sLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const activeBaristas = baristas.filter((b) => b.is_active);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base flex-wrap gap-2">
            <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Week of {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setWeekStart((w) => new Date(w.getTime() - 7 * 86_400_000))}>‹ Prev</Button>
              <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek())}>This week</Button>
              <Button size="sm" variant="outline" onClick={() => setWeekStart((w) => new Date(w.getTime() + 7 * 86_400_000))}>Next ›</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {activeBaristas.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No baristas yet — add staff in the Baristas & Team tab first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold w-32 p-2">Barista</th>
                    {days.map((d) => (
                      <th key={d.toISOString()} className="text-center text-[11px] text-muted-foreground font-semibold p-2 min-w-[110px]">
                        <div>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                        <div className="font-bold text-foreground">{d.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeBaristas.map((b) => (
                    <tr key={b.id} className="border-t border-border/40">
                      <td className="p-2 align-top">
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-700 font-bold uppercase text-xs">
                            {b.display_name.slice(0, 1)}
                          </div>
                          <span className="font-medium text-sm truncate">{b.display_name}</span>
                        </div>
                      </td>
                      {days.map((d) => {
                        const key = `${b.id}:${startOfDay(d).toISOString()}`;
                        const cellShifts = shiftsByDayBarista.get(key) ?? [];
                        return (
                          <td key={d.toISOString()} className="p-1 align-top">
                            <button
                              type="button"
                              onClick={() => openNew(b.id, d)}
                              className="w-full min-h-[60px] rounded-md border border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/50 transition-colors p-1 text-left"
                            >
                              {cellShifts.length === 0 ? (
                                <span className="block text-[10px] text-muted-foreground/60 text-center pt-3">+</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {cellShifts.map((s) => (
                                    <button
                                      key={s.id} type="button"
                                      onClick={(e) => { e.stopPropagation(); setDetail(s); }}
                                      className={cn(
                                        "block w-full rounded text-[10px] px-1 py-0.5 border text-left",
                                        STATUS_COLOR[s.status],
                                      )}
                                    >
                                      {fmtTimeRange(s.starts_at, s.ends_at)}
                                      {s.role && <span className="ml-1 opacity-70">· {s.role}</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New shift dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Barista</Label>
              <Select value={draftBaristaId} onValueChange={setDraftBaristaId}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  {activeBaristas.map((b) => <SelectItem key={b.id} value={b.id}>{b.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts</Label>
                <Input type="datetime-local" value={draftStarts} onChange={(e) => setDraftStarts(e.target.value)} />
              </div>
              <div>
                <Label>Ends</Label>
                <Input type="datetime-local" value={draftEnds} onChange={(e) => setDraftEnds(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Role (optional)</Label>
              <Input value={draftRole} onChange={(e) => setDraftRole(e.target.value)} placeholder="Bar, kitchen…" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={submitDraft} disabled={saving}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent>
          {detail && (() => {
            const b = baristas.find((x) => x.id === detail.barista_id);
            return (
              <>
                <DialogHeader><DialogTitle>{b?.display_name} · {new Date(detail.starts_at).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</DialogTitle></DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("uppercase text-[10px]", STATUS_COLOR[detail.status])}>{detail.status}</Badge>
                    <span className="tabular-nums">{fmtTimeRange(detail.starts_at, detail.ends_at)}</span>
                    {detail.role && <Badge variant="outline" className="text-[10px]">{detail.role}</Badge>}
                  </div>
                  {detail.notes && <p className="text-muted-foreground">{detail.notes}</p>}
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={detail.status} onValueChange={(v) => { void setStatus(detail.id, v as CafeShiftStatus); setDetail({ ...detail, status: v as CafeShiftStatus }); }}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="no_show">No show</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex items-center justify-between">
                  <Button variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete this shift?")) { void remove(detail.id); setDetail(null); } }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                  <Button onClick={() => setDetail(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
