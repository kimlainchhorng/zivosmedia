/**
 * CarRentalLocationsSection — pickup / dropoff branches.
 */
import { useState } from "react";
import {
  Building2, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertTriangle, MapPin, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useCarRentalLocations, type CarRentalLocation, type CarRentalLocationDraft } from "@/hooks/car-rental/useCarRentalLocations";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const EMPTY: CarRentalLocationDraft = {
  name: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  phone: "",
  open_time: "08:00",
  close_time: "20:00",
  is_default: false,
  is_active: true,
};

export default function CarRentalLocationsSection({ storeId }: Props) {
  const { locations, loading, saving, error, create, update, remove } = useCarRentalLocations(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalLocation | null>(null);
  const [draft, setDraft] = useState<CarRentalLocationDraft>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...EMPTY, is_default: locations.length === 0 });
    setDialogOpen(true);
  };
  const openEdit = (l: CarRentalLocation) => {
    setEditing(l);
    setDraft({
      name: l.name, address: l.address, city: l.city, state: l.state,
      postal_code: l.postal_code, country: l.country, phone: l.phone,
      open_time: l.open_time, close_time: l.close_time,
      is_default: l.is_default, is_active: l.is_active,
    });
    setDialogOpen(true);
  };
  const save = async () => {
    if (!draft.name.trim()) return;
    if (editing) await update(editing.id, draft);
    else await create(draft);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Pickup locations
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {locations.length}
            </span>
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add location
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : locations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Building2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Add your first pickup location. Most operators start with one main branch.
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {locations.map((l) => (
                <li key={l.id} className="group rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{l.name}</p>
                        {l.is_default && (
                          <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            Default
                          </span>
                        )}
                        {!l.is_active && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </div>
                      {(l.address || l.city) && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[l.address, l.city, l.state, l.postal_code].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {(l.open_time && l.close_time) && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {l.open_time.slice(0, 5)} – {l.close_time.slice(0, 5)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit location" : "Add location"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <Field label="Name *" className="sm:col-span-2">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Main Branch — Downtown" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="123 Main St" />
            </Field>
            <Field label="City">
              <Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </Field>
            <Field label="State / Province">
              <Input value={draft.state ?? ""} onChange={(e) => setDraft({ ...draft, state: e.target.value })} />
            </Field>
            <Field label="Postal code">
              <Input value={draft.postal_code ?? ""} onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })} />
            </Field>
            <Field label="Country">
              <Input value={draft.country ?? ""} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+1 555 123 4567" />
            </Field>
            <Field label="Opens">
              <Input type="time" value={draft.open_time ?? ""} onChange={(e) => setDraft({ ...draft, open_time: e.target.value })} />
            </Field>
            <Field label="Closes">
              <Input type="time" value={draft.close_time ?? ""} onChange={(e) => setDraft({ ...draft, close_time: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5 sm:col-span-2">
              <Label className="text-sm">Default location for new reservations</Label>
              <Switch checked={draft.is_default ?? false} onCheckedChange={(c) => setDraft({ ...draft, is_default: c })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5 sm:col-span-2">
              <Label className="text-sm">Active (accepts reservations)</Label>
              <Switch checked={draft.is_active ?? true} onCheckedChange={(c) => setDraft({ ...draft, is_active: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !draft.name.trim()}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {editing ? "Save changes" : "Add location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete location?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Past reservations keep their pickup/dropoff location snapshot. Vehicles set to this location lose their home.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteId) { await remove(deleteId); setDeleteId(null); }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
