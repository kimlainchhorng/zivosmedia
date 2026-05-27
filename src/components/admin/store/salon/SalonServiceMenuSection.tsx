/**
 * SalonServiceMenuSection — manage the salon's bookable service menu.
 * Owner can add / edit / delete services, set duration & price, toggle active.
 * Built USD-first for the USA flow; tax & tip are configured in Payment & Payouts.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Plus, Edit, Trash2, Loader2, Clock, DollarSign, ChevronUp, ChevronDown,
  EyeOff, Eye, AlertCircle, Search,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useSalonServices,
  type SalonService,
  type SalonServiceDraft,
} from "@/hooks/salon/useSalonServices";
import { SERVICE_TEMPLATES } from "@/lib/salon/serviceTemplates";
import { uploadStoreAsset } from "@/pages/admin/utils/uploadStoreAsset";
import { useRef } from "react";

interface SalonServiceMenuSectionProps {
  storeId: string;
}

const SUGGESTED_CATEGORIES = ["Hair", "Nails", "Color", "Spa", "Waxing", "Brows & Lashes", "Barber", "Add-on"] as const;

const EMPTY_DRAFT: SalonServiceDraft = {
  name: "",
  description: "",
  category: "",
  duration_minutes: 30,
  price_cents: 0,
  image_url: null,
  is_active: true,
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
};

export default function SalonServiceMenuSection({ storeId }: SalonServiceMenuSectionProps) {
  const { services, loading, saving, error, create, update, remove } = useSalonServices(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalonServiceDraft>(EMPTY_DRAFT);
  const [priceDollars, setPriceDollars] = useState("0.00");
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Pending/confirmed bookings that reference the service being deleted.
  // FK is ON DELETE SET NULL, so they'd be orphaned without a warning.
  const [confirmDeleteUpcoming, setConfirmDeleteUpcoming] = useState<number | null>(null);
  useEffect(() => {
    if (!confirmDeleteId) { setConfirmDeleteUpcoming(null); return; }
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("salon_bookings")
        .select("id", { count: "exact", head: true })
        .eq("service_id", confirmDeleteId)
        .in("status", ["pending", "confirmed"])
        .gte("start_at", new Date().toISOString());
      if (!cancelled) setConfirmDeleteUpcoming(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [confirmDeleteId]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setPriceDollars("0.00");
    setDialogOpen(true);
  };

  const openEdit = (svc: SalonService) => {
    setEditingId(svc.id);
    setDraft({
      name: svc.name,
      description: svc.description ?? "",
      category: svc.category ?? "",
      duration_minutes: svc.duration_minutes,
      price_cents: svc.price_cents,
      image_url: svc.image_url,
      is_active: svc.is_active,
    });
    setPriceDollars((svc.price_cents / 100).toFixed(2));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const cleanName = draft.name.trim();
    if (cleanName.length < 1) {
      toast.error("Service name is required.");
      return;
    }
    const cents = Math.round(Number(priceDollars) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      toast.error("Price must be 0 or more.");
      return;
    }
    if (draft.duration_minutes < 5 || draft.duration_minutes > 480) {
      toast.error("Duration must be 5–480 minutes.");
      return;
    }

    const payload: SalonServiceDraft = { ...draft, price_cents: cents, name: cleanName };

    if (editingId) {
      // `update` returns false when the DB write fails — keep the dialog open
      // and skip the success toast so the error banner is the only signal.
      const ok = await update(editingId, payload);
      if (ok) {
        toast.success("Service updated.");
        setDialogOpen(false);
      }
    } else {
      const created = await create(payload);
      if (created) {
        toast.success("Service added.");
        setDialogOpen(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    const ok = await remove(confirmDeleteId);
    setConfirmDeleteId(null);
    if (ok) toast.success("Service removed.");
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB).");
      return;
    }
    setUploading(true);
    try {
      const { publicUrl } = await uploadStoreAsset({ storeId, file, surface: "room" });
      setDraft((d) => ({ ...d, image_url: publicUrl }));
      toast.success("Photo added.");
    } catch (e: any) {
      console.error("[SalonServiceMenu] upload failed", e);
      toast.error(e?.message ?? "Couldn't upload photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const seedFromTemplate = async (templateId: string) => {
    const tmpl = SERVICE_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    setSeeding(true);
    let okCount = 0;
    for (const item of tmpl.items) {
      const result = await create({
        name: item.name,
        description: item.description ?? "",
        category: item.category,
        duration_minutes: item.duration_minutes,
        price_cents: item.price_cents,
        image_url: null,
        is_active: true,
      });
      if (result) okCount++;
    }
    setSeeding(false);
    setTemplateDialogOpen(false);
    if (okCount === tmpl.items.length) {
      toast.success(`Added ${okCount} starter services from ${tmpl.label}.`);
    } else if (okCount > 0) {
      toast.warning(`Added ${okCount} of ${tmpl.items.length} services — some failed.`);
    } else {
      toast.error("Couldn't add starter services.");
    }
  };

  const filtered = services.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.category || "").toLowerCase().includes(search.toLowerCase())
  );

  // Group by category for display. Sort within each category by sort_order so
  // reorder arrows produce immediate visual feedback (hook only sorts on load).
  const grouped = filtered.reduce<Record<string, SalonService[]>>((acc, s) => {
    const key = s.category || "Other";
    (acc[key] ||= []).push(s);
    return acc;
  }, {});
  for (const list of Object.values(grouped)) {
    list.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
  }
  const groupedEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

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
            <BookOpen className="h-5 w-5 text-primary" />
            Service Menu
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setTemplateDialogOpen(true)} size="sm" variant="outline" className="gap-1.5">
              Templates
            </Button>
            <Button onClick={openAdd} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add service
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services or categories…"
                className="pl-9"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No services yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add the services you offer (haircut, manicure, etc.) so clients can book them.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button onClick={() => setTemplateDialogOpen(true)} size="sm" variant="outline" className="gap-1.5">
                  Use a template
                </Button>
                <Button onClick={openAdd} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add your first service
                </Button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services match "{search}".</p>
          ) : (
            <div className="space-y-5">
              {groupedEntries.map(([category, items]) => (
                <div key={category}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </p>
                  <div className="divide-y divide-border rounded-xl border border-border">
                    {items.map((svc, idx) => (
                      <div
                        key={svc.id}
                        className={cn(
                          "flex items-center gap-3 p-3",
                          !svc.is_active && "bg-muted/30"
                        )}
                      >
                        {svc.image_url ? (
                          <img
                            src={svc.image_url}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-border"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn("truncate text-sm font-semibold", !svc.is_active && "text-muted-foreground")}>
                              {svc.name}
                            </p>
                            {!svc.is_active && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Hidden
                              </span>
                            )}
                          </div>
                          {svc.description && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{svc.description}</p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatDuration(svc.duration_minutes)}
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                              <DollarSign className="h-3 w-3" /> {formatPrice(svc.price_cents).slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <div className="flex flex-col">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-7"
                              disabled={saving || idx === 0}
                              onClick={() => {
                                const above = items[idx - 1];
                                if (!above) return;
                                // Put this item just *before* the one above. Works even
                                // when adjacent rows have the same sort_order (common for
                                // seeded data) — repeated clicks keep decrementing.
                                void update(svc.id, { sort_order: above.sort_order - 1 });
                              }}
                              aria-label="Move up"
                              title="Move up in the menu"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-7"
                              disabled={saving || idx === items.length - 1}
                              onClick={() => {
                                const below = items[idx + 1];
                                if (!below) return;
                                void update(svc.id, { sort_order: below.sort_order + 1 });
                              }}
                              aria-label="Move down"
                              title="Move down in the menu"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => void update(svc.id, { is_active: !svc.is_active })}
                            disabled={saving}
                            aria-label={svc.is_active ? "Hide" : "Show"}
                            title={svc.is_active ? "Hide from clients" : "Show to clients"}
                          >
                            {/* Icon = action that'll happen on click, matching
                                the Reviews and Stylists conventions. */}
                            {svc.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(svc)}
                            disabled={saving}
                            aria-label="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDeleteId(svc.id)}
                            disabled={saving}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="svcName">Name *</Label>
              <Input
                id="svcName"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Gel Manicure"
                maxLength={80}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svcCategory">Category</Label>
              <Input
                id="svcCategory"
                value={draft.category ?? ""}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Hair, Nails, Spa, …"
                maxLength={40}
                list="salon-category-suggestions"
              />
              <datalist id="salon-category-suggestions">
                {SUGGESTED_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="svcDuration">Duration (min) *</Label>
                <Input
                  id="svcDuration"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={draft.duration_minutes}
                  onChange={(e) => setDraft({ ...draft, duration_minutes: Math.max(5, Math.min(480, Number(e.target.value) || 30)) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svcPrice">Price (USD) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="svcPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svcDescription">Description</Label>
              <Textarea
                id="svcDescription"
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What's included? Any prep or aftercare?"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Photo</Label>
              <div className="flex items-start gap-3 rounded-xl border border-border p-3">
                {draft.image_url ? (
                  <img
                    src={draft.image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-border"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <BookOpen className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleImageUpload(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {draft.image_url ? "Replace photo" : "Upload photo"}
                    </Button>
                    {draft.image_url && (
                      <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDraft({ ...draft, image_url: null })} disabled={uploading}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">JPG or PNG, up to 5MB. Square photos look best.</p>
                </div>
              </div>
            </div>

            <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Visible to clients</p>
                <p className="text-xs text-muted-foreground">Turn off to remove from the public menu without deleting.</p>
              </div>
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start with a template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Pick the type of salon you run and we'll create a starter menu you can edit, hide, or delete.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SERVICE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void seedFromTemplate(t.id)}
                  disabled={seeding}
                  className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 disabled:opacity-60"
                >
                  <div className="text-2xl">{t.emoji}</div>
                  <p className="mt-1 text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{t.items.length} starter services</p>
                </button>
              ))}
            </div>
            {seeding && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Adding services…
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTemplateDialogOpen(false)} disabled={seeding}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteUpcoming && confirmDeleteUpcoming > 0
                ? `${confirmDeleteUpcoming} upcoming booking${confirmDeleteUpcoming === 1 ? "" : "s"} ${confirmDeleteUpcoming === 1 ? "uses" : "use"} this service — ${confirmDeleteUpcoming === 1 ? "it" : "they"} will keep ${confirmDeleteUpcoming === 1 ? "its" : "their"} service-name snapshot but lose the catalog link. Past bookings also keep their records. This can't be undone.`
                : "Past bookings that reference it will keep their record, but it won't be bookable going forward. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep service</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
