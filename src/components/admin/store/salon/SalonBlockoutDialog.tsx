/**
 * SalonBlockoutDialog — lets the owner reserve time for a stylist (lunch,
 * cleanup, training, time off). Saves to salon_blockouts; the cross-table
 * trigger prevents bookings from being created in that window.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarX, Loader2, Plus, Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSalonStylists } from "@/hooks/salon/useSalonStylists";

interface Blockout {
  id: string;
  stylist_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
}

interface SalonBlockoutDialogProps {
  storeId: string;
  open: boolean;
  defaultDate: string; // YYYY-MM-DD
  onClose: () => void;
  onChanged: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function SalonBlockoutDialog({ storeId, open, defaultDate, onClose, onChanged }: SalonBlockoutDialogProps) {
  const { stylists } = useSalonStylists(storeId);
  const activeStylists = useMemo(() => stylists.filter((s) => s.is_active), [stylists]);

  const [stylistId, setStylistId] = useState("");
  const [date, setDate] = useState(defaultDate || todayIso());
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");
  const [existing, setExisting] = useState<Blockout[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDate(defaultDate || todayIso());
  }, [open, defaultDate]);

  useEffect(() => {
    if (activeStylists.length > 0 && !stylistId) setStylistId(activeStylists[0].id);
  }, [activeStylists, stylistId]);

  const loadDay = async () => {
    if (!open || !stylistId || !date) return;
    setLoading(true);
    const dayStart = new Date(`${date}T00:00:00`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();
    const { data, error } = await supabase
      .from("salon_blockouts")
      .select("id, stylist_id, start_at, end_at, reason")
      .eq("stylist_id", stylistId)
      .gte("start_at", dayStart).lte("start_at", dayEnd)
      .order("start_at", { ascending: true });
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setExisting((data ?? []) as unknown as Blockout[]);
  };

  useEffect(() => { void loadDay(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, stylistId, date]);

  const handleCreate = async () => {
    if (!stylistId) { toast.error("Pick a stylist."); return; }
    const startIso = new Date(`${date}T${startTime}:00`).toISOString();
    const endIso = new Date(`${date}T${endTime}:00`).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error("End time must be after start.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("salon_blockouts").insert({
      store_id: storeId,
      stylist_id: stylistId,
      start_at: startIso,
      end_at: endIso,
      reason: reason.trim() || null,
    } as never);
    setSaving(false);
    if (error) {
      console.error(error);
      if ((error as any).code === "23P01") {
        toast.error("That overlaps an existing block-off for this stylist.");
      } else {
        toast.error("Couldn't save block-off.");
      }
      return;
    }
    toast.success("Block-off added.");
    setReason("");
    await loadDay();
    onChanged();
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("salon_blockouts").delete().eq("id", id);
    setSaving(false);
    if (error) { toast.error("Couldn't delete."); return; }
    await loadDay();
    onChanged();
  };

  const formatRange = (s: string, e: string) => {
    const f = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${f(new Date(s))} – ${f(new Date(e))}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarX className="h-5 w-5 text-primary" /> Block off time</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="boStylist">Stylist</Label>
              <select id="boStylist" value={stylistId} onChange={(e) => setStylistId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {activeStylists.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="boDate">Date</Label>
              <Input id="boDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="boStart">Start</Label>
              <Input id="boStart" type="time" step={300} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="boEnd">End</Label>
              <Input id="boEnd" type="time" step={300} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="boReason">Reason (optional)</Label>
            <Input id="boReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lunch, training, vacation…" maxLength={120} />
          </div>
          <Button onClick={handleCreate} disabled={saving || !stylistId} className="w-full gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add block-off
          </Button>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Existing on this day</p>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>
            ) : existing.length === 0 ? (
              <p className="text-xs text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {existing.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{formatRange(b.start_at, b.end_at)}</p>
                      {b.reason && <p className="truncate text-xs text-muted-foreground">{b.reason}</p>}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)} disabled={saving}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
