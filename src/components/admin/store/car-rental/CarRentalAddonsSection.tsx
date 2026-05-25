/**
 * CarRentalAddonsSection — manage rental add-ons (insurance, GPS, child seat, etc.).
 */
import { useState } from "react";
import {
  PackagePlus, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCarRentalAddons, type CarRentalAddon, type CarRentalAddonDraft } from "@/hooks/car-rental/useCarRentalAddons";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const EMPTY: CarRentalAddonDraft = {
  name: "",
  description: "",
  price_cents: 1000,
  billing: "per_day",
  is_active: true,
  sort_order: 0,
};

const TEMPLATES: { name: string; description: string; price: number; billing: "per_day" | "per_rental" }[] = [
  { name: "Full insurance coverage", description: "Comprehensive damage waiver — zero deductible.", price: 1500, billing: "per_day" },
  { name: "GPS navigation", description: "Pre-loaded device with local maps.", price: 800, billing: "per_day" },
  { name: "Child car seat", description: "Forward-facing seat for ages 3+", price: 1000, billing: "per_rental" },
  { name: "Additional driver", description: "Extra authorized driver.", price: 1200, billing: "per_rental" },
  { name: "Prepaid fuel", description: "Return empty — no refuel needed.", price: 5000, billing: "per_rental" },
  { name: "Roadside assistance", description: "24/7 emergency support.", price: 600, billing: "per_day" },
];

export default function CarRentalAddonsSection({ storeId }: Props) {
  const { addons, loading, saving, error, create, update, remove } = useCarRentalAddons(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalAddon | null>(null);
  const [draft, setDraft] = useState<CarRentalAddonDraft>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setDraft(EMPTY); setDialogOpen(true); };
  const openEdit = (a: CarRentalAddon) => {
    setEditing(a);
    setDraft({
      name: a.name, description: a.description, price_cents: a.price_cents,
      billing: a.billing, is_active: a.is_active, sort_order: a.sort_order,
    });
    setDialogOpen(true);
  };
  const save = async () => {
    if (!draft.name.trim()) return;
    if (editing) await update(editing.id, draft);
    else await create(draft);
    setDialogOpen(false);
  };
  const addTemplate = async (t: typeof TEMPLATES[number]) => {
    await create({ name: t.name, description: t.description, price_cents: t.price, billing: t.billing, is_active: true, sort_order: addons.length });
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="h-5 w-5 text-primary" />
            Add-ons & extras
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {addons.length}
            </span>
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add extra
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
          ) : addons.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                <PackagePlus className="mx-auto mb-2 h-8 w-8 opacity-50" />
                No extras yet. Add the common ones below in one click, or create your own.
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {TEMPLATES.map((t) => (
                  <button key={t.name} type="button" onClick={() => addTemplate(t)} className="rounded-xl border border-dashed border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{t.description}</p>
                    <p className="mt-1.5 text-xs font-bold text-primary">${(t.price / 100).toFixed(2)} {t.billing === "per_day" ? "/ day" : "/ rental"}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {addons.map((a) => (
                <li key={a.id} className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{a.name}</p>
                      {!a.is_active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Off
                        </span>
                      )}
                    </div>
                    {a.description && <p className="line-clamp-1 text-[11px] text-muted-foreground">{a.description}</p>}
                    <p className="mt-1 text-xs font-bold text-foreground">
                      ${(a.price_cents / 100).toFixed(2)}
                      <span className="ml-1 font-normal text-muted-foreground">{a.billing === "per_day" ? "/ day" : "/ rental"}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit add-on" : "Add an extra"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Name *">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Insurance, GPS, child seat…" />
            </Field>
            <Field label="Description">
              <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price ($)">
                <Input type="number" step="0.01" min={0} value={draft.price_cents / 100} onChange={(e) => setDraft({ ...draft, price_cents: Math.round(Number(e.target.value || 0) * 100) })} />
              </Field>
              <Field label="Billing">
                <Select value={draft.billing} onValueChange={(v) => setDraft({ ...draft, billing: v as "per_day" | "per_rental" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_day">Per day</SelectItem>
                    <SelectItem value="per_rental">Per rental (flat)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5">
              <Label className="text-sm">Active (visible on the booking page)</Label>
              <Switch checked={draft.is_active ?? true} onCheckedChange={(c) => setDraft({ ...draft, is_active: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !draft.name.trim()}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {editing ? "Save changes" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete add-on?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Reservations that already included this add-on keep their snapshot.</p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5")}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
