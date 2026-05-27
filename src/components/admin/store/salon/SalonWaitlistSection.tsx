/**
 * SalonWaitlistSection — clients hoping for a slot to open.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Timer, Plus, Loader2, AlertCircle, Trash2, BellRing, CalendarPlus, X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSalonServices } from "@/hooks/salon/useSalonServices";
import { useSalonStylists } from "@/hooks/salon/useSalonStylists";
import { useSalonClients } from "@/hooks/salon/useSalonClients";
import { cn } from "@/lib/utils";
import { writeBookingPreset } from "@/lib/salon/bookingPreset";

type WaitlistStatus = "waiting" | "notified" | "booked" | "cancelled";

interface WaitlistRow {
  id: string;
  store_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  requested_service_id: string | null;
  requested_service_name: string | null;
  requested_stylist_id: string | null;
  requested_stylist_name: string | null;
  preferred_window: string | null;
  notes: string | null;
  status: WaitlistStatus;
  created_at: string;
}

interface SalonWaitlistSectionProps {
  storeId: string;
  onJumpToTab?: (tab: string) => void;
}

const STATUS_META: Record<WaitlistStatus, { label: string; tone: string }> = {
  waiting: { label: "Waiting", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  notified: { label: "Notified", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  booked: { label: "Booked", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  cancelled: { label: "Cancelled", tone: "bg-muted text-muted-foreground border-border" },
};

const friendlyAge = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

interface DraftState {
  client_id: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  stylist_id: string;
  preferred_window: string;
  notes: string;
}

const EMPTY: DraftState = {
  client_id: "", client_name: "", client_phone: "",
  service_id: "", stylist_id: "", preferred_window: "", notes: "",
};

export default function SalonWaitlistSection({ storeId, onJumpToTab }: SalonWaitlistSectionProps) {
  const { services } = useSalonServices(storeId);
  const { stylists } = useSalonStylists(storeId);
  const { clients } = useSalonClients(storeId);
  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);
  const activeStylists = useMemo(() => stylists.filter((s) => s.is_active), [stylists]);

  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("salon_waitlist")
      .select("*")
      .eq("store_id", storeId)
      .in("status", ["waiting", "notified"])
      .order("created_at", { ascending: true });
    if (err) {
      console.error("[SalonWaitlist] load failed", err);
      setError("Couldn't load waitlist.");
      setLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as WaitlistRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const openAdd = () => { setDraft(EMPTY); setDialogOpen(true); };

  const pickClient = (id: string) => {
    if (!id) { setDraft((d) => ({ ...d, client_id: "" })); return; }
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setDraft((d) => ({ ...d, client_id: c.id, client_name: c.display_name, client_phone: c.phone ?? "" }));
  };

  const handleAdd = async () => {
    if (!draft.client_name.trim()) { toast.error("Client name is required."); return; }
    setSaving(true);
    const svc = activeServices.find((s) => s.id === draft.service_id);
    const stylist = activeStylists.find((s) => s.id === draft.stylist_id);
    const payload = {
      store_id: storeId,
      client_id: draft.client_id || null,
      client_name: draft.client_name.trim(),
      client_phone: draft.client_phone.trim() || null,
      requested_service_id: svc?.id ?? null,
      requested_service_name: svc?.name ?? null,
      requested_stylist_id: stylist?.id ?? null,
      requested_stylist_name: stylist?.display_name ?? null,
      preferred_window: draft.preferred_window.trim() || null,
      notes: draft.notes.trim() || null,
      status: "waiting" as const,
    };
    const { error: err } = await supabase.from("salon_waitlist").insert(payload as never);
    setSaving(false);
    if (err) { setError("Couldn't add to waitlist."); return; }
    toast.success("Added to waitlist.");
    setDialogOpen(false);
    await load();
  };

  const setStatus = async (id: string, status: WaitlistStatus) => {
    setSaving(true);
    const { error: err } = await supabase.from("salon_waitlist").update({ status } as never).eq("id", id);
    setSaving(false);
    if (err) { setError("Couldn't update status."); return; }
    toast.success(`Marked ${STATUS_META[status].label.toLowerCase()}.`);
    await load();
  };

  const removeRow = async (row: WaitlistRow) => {
    // Remove is a DB delete — irreversible. Cancel (status flip) sits right
    // next to it and the row disappears from the list either way (the load
    // query already filters status not-in ['waiting','notified']), so make
    // sure the owner knows which they're picking.
    if (!window.confirm(
      `Permanently remove ${row.client_name} from the waitlist?\n\nUse "Cancel" instead if you might want to look this up later — Remove can't be undone.`
    )) return;
    setSaving(true);
    const { error: err } = await supabase.from("salon_waitlist").delete().eq("id", row.id);
    setSaving(false);
    if (err) { setError("Couldn't remove."); return; }
    toast.success("Removed from waitlist.");
    await load();
  };

  const promoteToBooking = (r: WaitlistRow) => {
    writeBookingPreset({
      client_id: r.client_id,
      client_name: r.client_name,
      client_phone: r.client_phone ?? "",
      service_id: r.requested_service_id ?? undefined,
      stylist_id: r.requested_stylist_id ?? undefined,
      waitlist_id: r.id,
    });
    if (onJumpToTab) {
      onJumpToTab("salon-bookings");
    } else {
      // Fall back to event dispatch — AdminStoreEditPage listens for this.
      window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab: "salon-bookings" } }));
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-5 w-5 text-primary" /> Waitlist
            {rows.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{rows.length}</span>
            )}
          </CardTitle>
          <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" /> Add to waitlist</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Timer className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">Nobody's waiting</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add clients here when you're fully booked but want to call them if a slot opens.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {rows.map((r) => {
                const meta = STATUS_META[r.status];
                return (
                  <li key={r.id} className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{r.client_name}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", meta.tone)}>{meta.label}</span>
                      <span className="text-[11px] text-muted-foreground">· {friendlyAge(r.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.requested_service_name || "Any service"}{r.requested_stylist_name ? ` · with ${r.requested_stylist_name}` : ""}
                      {r.client_phone ? ` · ${r.client_phone}` : ""}
                    </p>
                    {r.preferred_window && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Window: {r.preferred_window}</p>
                    )}
                    {r.notes && <p className="mt-1 text-xs text-foreground/85">{r.notes}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.status === "waiting" && (
                        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-sky-700" onClick={() => setStatus(r.id, "notified")} disabled={saving}>
                          <BellRing className="h-3.5 w-3.5" /> Notified
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 gap-1.5 text-emerald-700" onClick={() => promoteToBooking(r)} disabled={saving}>
                        <CalendarPlus className="h-3.5 w-3.5" /> Book now
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => setStatus(r.id, "cancelled")} disabled={saving}>
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-destructive hover:text-destructive" onClick={() => removeRow(r)} disabled={saving}>
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add to waitlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wlClient">Existing client</Label>
              <select id="wlClient" value={draft.client_id} onChange={(e) => pickClient(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">— New / walk-in —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wlName">Name *</Label>
                <Input id="wlName" value={draft.client_name} onChange={(e) => setDraft({ ...draft, client_name: e.target.value, client_id: "" })} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wlPhone">Phone</Label>
                <Input id="wlPhone" type="tel" value={draft.client_phone} onChange={(e) => setDraft({ ...draft, client_phone: e.target.value })} maxLength={30} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wlService">Requested service</Label>
                <select id="wlService" value={draft.service_id} onChange={(e) => setDraft({ ...draft, service_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Any</option>
                  {activeServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wlStylist">Requested stylist</Label>
                <select id="wlStylist" value={draft.stylist_id} onChange={(e) => setDraft({ ...draft, stylist_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Anyone</option>
                  {activeStylists.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wlWindow">Preferred time window</Label>
              <Input id="wlWindow" value={draft.preferred_window} onChange={(e) => setDraft({ ...draft, preferred_window: e.target.value })} placeholder="e.g. Sat after 2pm" maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wlNotes">Notes</Label>
              <Textarea id="wlNotes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleAdd} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add to waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
