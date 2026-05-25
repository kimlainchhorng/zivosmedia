/**
 * SalonPackagesSection — multi-service bundles with bundled pricing.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Gift, Plus, Edit, Trash2, Loader2, AlertCircle, Tag, Calendar as CalendarIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSalonServices } from "@/hooks/salon/useSalonServices";

interface SalonPackagesSectionProps { storeId: string; }

interface Pkg {
  id: string;
  name: string;
  description: string | null;
  bundle_price_cents: number;
  validity_days: number | null;
  is_active: boolean;
  service_quantities: Record<string, number>;
}

interface DraftState {
  name: string;
  description: string;
  bundle_price_dollars: string;
  validity_days: string;
  is_active: boolean;
  service_quantities: Record<string, number>;
}

const EMPTY: DraftState = {
  name: "", description: "", bundle_price_dollars: "", validity_days: "",
  is_active: true, service_quantities: {},
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function SalonPackagesSection({ storeId }: SalonPackagesSectionProps) {
  const { services } = useSalonServices(storeId);
  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);
  const serviceById = useMemo(() => {
    const m: Record<string, typeof services[number]> = {};
    services.forEach((s) => { m[s.id] = s; });
    return m;
  }, [services]);

  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("salon_packages")
      .select("*, salon_package_services(service_id, quantity)")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true });
    if (err) { console.error(err); setError("Couldn't load packages."); setLoading(false); return; }
    const rows: Pkg[] = (data ?? []).map((row: any) => ({
      id: row.id, name: row.name, description: row.description,
      bundle_price_cents: row.bundle_price_cents, validity_days: row.validity_days,
      is_active: row.is_active,
      service_quantities: Object.fromEntries((row.salon_package_services ?? []).map((j: any) => [j.service_id, j.quantity])),
    }));
    setPkgs(rows); setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const openAdd = () => { setEditingId(null); setDraft(EMPTY); setDialogOpen(true); };
  const openEdit = (p: Pkg) => {
    setEditingId(p.id);
    setDraft({
      name: p.name, description: p.description ?? "",
      bundle_price_dollars: (p.bundle_price_cents / 100).toFixed(2),
      validity_days: p.validity_days?.toString() ?? "",
      is_active: p.is_active,
      service_quantities: { ...p.service_quantities },
    });
    setDialogOpen(true);
  };

  const setQty = (serviceId: string, qty: number) => {
    setDraft((d) => {
      const next = { ...d.service_quantities };
      if (qty <= 0) delete next[serviceId]; else next[serviceId] = Math.min(99, qty);
      return { ...d, service_quantities: next };
    });
  };

  const handleSave = async () => {
    if (!draft.name.trim()) { toast.error("Package name is required."); return; }
    const cents = Math.round(Number(draft.bundle_price_dollars) * 100);
    if (!Number.isFinite(cents) || cents < 0) { toast.error("Price must be 0 or more."); return; }
    if (Object.keys(draft.service_quantities).length === 0) { toast.error("Add at least one service."); return; }
    setSaving(true);
    const pkgPayload: Record<string, unknown> = {
      store_id: storeId,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      bundle_price_cents: cents,
      validity_days: draft.validity_days ? Math.max(1, Math.min(730, Number(draft.validity_days) || 0)) : null,
      is_active: draft.is_active,
    };
    let pkgId = editingId;
    if (editingId) {
      const { error: err } = await supabase.from("salon_packages").update(pkgPayload as never).eq("id", editingId);
      if (err) { setError("Couldn't save package."); setSaving(false); return; }
    } else {
      const { data, error: err } = await supabase.from("salon_packages").insert(pkgPayload as never).select("id").single();
      if (err || !data) { setError("Couldn't create package."); setSaving(false); return; }
      pkgId = (data as any).id;
    }
    // Sync junction
    if (pkgId) {
      await supabase.from("salon_package_services").delete().eq("package_id", pkgId);
      const inserts = Object.entries(draft.service_quantities).map(([service_id, quantity]) => ({ package_id: pkgId, service_id, quantity }));
      if (inserts.length > 0) {
        const { error: jErr } = await supabase.from("salon_package_services").insert(inserts as never);
        if (jErr) console.error("[SalonPackages] junction insert failed", jErr);
      }
    }
    setSaving(false);
    toast.success(editingId ? "Package updated." : "Package created.");
    setDialogOpen(false);
    await load();
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setSaving(true);
    const { error: err } = await supabase.from("salon_packages").delete().eq("id", confirmDeleteId);
    setSaving(false);
    if (err) { setError("Couldn't delete."); return; }
    setConfirmDeleteId(null);
    toast.success("Package removed.");
    await load();
  };

  return (
    <div className="space-y-4">
      {error && <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><Gift className="h-5 w-5 text-primary" /> Packages & Bundles</CardTitle>
          <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" /> Add package</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : pkgs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Gift className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No packages yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Group services into bundles (e.g. Bridal Package) at a discounted price.</p>
              <Button onClick={openAdd} size="sm" className="mt-4 gap-1.5"><Plus className="h-4 w-4" /> Add your first package</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pkgs.map((p) => {
                const itemsTotal = Object.entries(p.service_quantities).reduce((sum, [sid, qty]) => sum + (serviceById[sid]?.price_cents ?? 0) * qty, 0);
                const savings = itemsTotal - p.bundle_price_cents;
                return (
                  <div key={p.id} className={cn("rounded-xl border p-3", p.is_active ? "border-border bg-card" : "border-border/60 bg-muted/30")}>
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Gift className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-semibold", !p.is_active && "text-muted-foreground")}>{p.name}</p>
                        {p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                        <p className="mt-1 text-sm font-bold text-foreground">{formatPrice(p.bundle_price_cents)}{savings > 0 && <span className="ml-2 text-[11px] font-normal text-emerald-700 dark:text-emerald-300">save {formatPrice(savings)}</span>}</p>
                        {p.validity_days && <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> valid {p.validity_days}d</p>}
                      </div>
                      <div className="flex gap-0.5">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    {Object.keys(p.service_quantities).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {Object.entries(p.service_quantities).map(([sid, qty]) => (
                          <span key={sid} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80">{qty}× {serviceById[sid]?.name ?? "?"}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit package" : "Add package"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pkName">Name *</Label>
              <Input id="pkName" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Bridal Package" maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkDesc">Description</Label>
              <Textarea id="pkDesc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pkPrice">Bundle price *</Label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input id="pkPrice" type="number" min={0} step="0.01" value={draft.bundle_price_dollars} onChange={(e) => setDraft({ ...draft, bundle_price_dollars: e.target.value })} className="pl-7" /></div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pkValid">Validity (days)</Label>
                <Input id="pkValid" type="number" min={1} max={730} value={draft.validity_days} onChange={(e) => setDraft({ ...draft, validity_days: e.target.value })} placeholder="No expiry" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Services included *</Label>
              <div className="rounded-xl border border-border divide-y divide-border max-h-48 overflow-y-auto">
                {activeServices.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">Add services in the Service Menu first.</p>
                ) : activeServices.map((s) => {
                  const qty = draft.service_quantities[s.id] ?? 0;
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatPrice(s.price_cents)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(s.id, qty - 1)} disabled={qty === 0}>−</Button>
                        <span className="w-6 text-center text-sm font-bold">{qty}</span>
                        <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(s.id, qty + 1)}>+</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
              <div className="min-w-0"><p className="text-sm font-semibold text-foreground">Visible to clients</p></div>
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{editingId ? "Save changes" : "Add package"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this package?</AlertDialogTitle><AlertDialogDescription>This can't be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep package</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
