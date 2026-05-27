/**
 * Lodging — Guests CRM.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Search, Star, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLodgeGuests, type LodgeGuest } from "@/hooks/lodging/useLodgeGuests";
import LodgingNeedsSetupEmptyState from "./LodgingNeedsSetupEmptyState";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

export default function LodgingGuestsSection({ storeId }: { storeId: string }) {
  const { data: guests = [], isLoading, upsert, remove } = useLodgeGuests(storeId);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LodgeGuest> | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return guests;
    return guests.filter(g => g.name.toLowerCase().includes(t) || g.phone?.toLowerCase().includes(t) || g.email?.toLowerCase().includes(t));
  }, [guests, q]);

  const openNew = () => { setEditing({ store_id: storeId, name: "", vip: false }); setOpen(true); };
  const save = async () => {
    if (!editing?.name) { toast.error("Name required"); return; }
    try { await upsert.mutateAsync(editing as any); toast.success("Saved"); setOpen(false); }
    catch (e: any) { toast.error(e.message || "Failed"); }
  };

  return (
    <div className="space-y-3">
      <LodgingQuickJump active="lodge-guests" />
      <LodgingSectionStatusBanner title="Guests CRM" icon={Users} countLabel="Saved guests" countValue={guests.length} fixLabel="Open Front Desk" fixTab="lodge-frontdesk" />
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Guests</CardTitle>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Guest</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          : filtered.length === 0 ? <LodgingNeedsSetupEmptyState icon={Users} title="Guest CRM is ready" description="No live guest records yet. Add a guest manually or create reservations to build stay history, VIP flags, and notes." primaryAction={{ label: "Add Guest", onClick: openNew }} secondaryAction={{ label: "Open reservations", tab: "lodge-reservations" }} nextBestAction="Add a guest profile or create reservations to populate stay history." />
          : (
            <div className="space-y-2">
              {filtered.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="font-bold text-sm text-primary">{g.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{g.name}</p>
                      {g.vip && <Badge className="text-[10px] gap-0.5"><Star className="h-2.5 w-2.5" /> VIP</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{g.phone || g.email || g.country || "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">{g.total_stays} stays</p>
                    <p className="text-[10px] text-muted-foreground">${(g.lifetime_spend_cents / 100).toFixed(0)}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Edit guest" onClick={() => { setEditing(g); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Delete guest" onClick={() => { if (confirm("Delete?")) remove.mutate(g.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Guest" : "Add Guest"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={editing.phone || ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={editing.email || ""} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Country</Label><Input value={editing.country || ""} onChange={e => setEditing({ ...editing, country: e.target.value })} /></div>
                <div><Label>ID / Passport</Label><Input value={editing.id_number || ""} onChange={e => setEditing({ ...editing, id_number: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={3} /></div>
              <div className="flex items-center gap-3"><Switch checked={!!editing.vip} onCheckedChange={v => setEditing({ ...editing, vip: v })} /><Label>VIP</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}
