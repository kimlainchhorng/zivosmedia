/**
 * Auto Repair — Service Catalog / Price Book
 * Shop-defined standard services with labor + parts presets for quick estimate entry.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  BookOpen, Plus, Search, Pencil, Trash2, Loader2,
  Clock, Wrench, Package, DollarSign, X,
} from "lucide-react";
import { toast } from "sonner";

interface Props { storeId: string }

type Part = { name: string; price_cents: number };

interface Service {
  id: string;
  name: string;
  category: string;
  description: string | null;
  labor_hours: number;
  labor_rate_cents: number;
  parts: Part[];
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  { id: "all",          label: "All Services" },
  { id: "oil-change",   label: "Oil Change" },
  { id: "brakes",       label: "Brakes" },
  { id: "tires",        label: "Tires" },
  { id: "electrical",   label: "Electrical" },
  { id: "ac-heating",   label: "A/C & Heating" },
  { id: "engine",       label: "Engine" },
  { id: "transmission", label: "Transmission" },
  { id: "suspension",   label: "Suspension" },
  { id: "exhaust",      label: "Exhaust" },
  { id: "alignment",    label: "Alignment" },
  { id: "inspection",   label: "Inspection" },
  { id: "general",      label: "General" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "oil-change":   "bg-amber-500/15 text-amber-700 border-amber-500/30",
  "brakes":       "bg-red-500/15 text-red-700 border-red-500/30",
  "tires":        "bg-slate-500/15 text-slate-700 border-slate-500/30",
  "electrical":   "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  "ac-heating":   "bg-blue-500/15 text-blue-700 border-blue-500/30",
  "engine":       "bg-orange-500/15 text-orange-700 border-orange-500/30",
  "transmission": "bg-purple-500/15 text-purple-700 border-purple-500/30",
  "suspension":   "bg-green-500/15 text-green-700 border-green-500/30",
  "exhaust":      "bg-gray-500/15 text-gray-700 border-gray-500/30",
  "alignment":    "bg-teal-500/15 text-teal-700 border-teal-500/30",
  "inspection":   "bg-violet-500/15 text-violet-700 border-violet-500/30",
  "general":      "bg-primary/10 text-primary border-primary/20",
};

const blankForm = {
  name: "",
  category: "general",
  description: "",
  labor_hours: "1",
  labor_rate_cents_str: "0",
  is_active: true,
};

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function computeTotal(laborHours: number, laborRateCents: number, parts: Part[]): number {
  return Math.round(laborHours * laborRateCents) + parts.reduce((s, p) => s + (p.price_cents || 0), 0);
}

export default function AutoRepairServiceCatalogSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [formParts, setFormParts] = useState<Part[]>([]);
  const [newPartName, setNewPartName] = useState("");
  const [newPartPrice, setNewPartPrice] = useState("");

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["ar-service-catalog", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_service_catalog" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data as any[]).map((s) => ({
        ...s,
        parts: Array.isArray(s.parts) ? s.parts : [],
      })) as Service[];
    },
  });

  const filtered = useMemo(() => {
    let list = services;
    if (catFilter !== "all") list = list.filter((s) => s.category === catFilter);
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter((s) => `${s.name} ${s.description ?? ""}`.toLowerCase().includes(lq));
    }
    return list;
  }, [services, catFilter, q]);

  const openNew = () => {
    setEditId(null);
    setForm(blankForm);
    setFormParts([]);
    setNewPartName("");
    setNewPartPrice("");
    setDlgOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      category: s.category,
      description: s.description ?? "",
      labor_hours: String(s.labor_hours),
      labor_rate_cents_str: String((s.labor_rate_cents / 100).toFixed(2)),
      is_active: s.is_active,
    });
    setFormParts([...s.parts]);
    setNewPartName("");
    setNewPartPrice("");
    setDlgOpen(true);
  };

  const addPart = () => {
    if (!newPartName.trim()) return;
    const priceCents = Math.round(parseFloat(newPartPrice || "0") * 100);
    setFormParts((prev) => [...prev, { name: newPartName.trim(), price_cents: priceCents }]);
    setNewPartName("");
    setNewPartPrice("");
  };

  const removePart = (i: number) => setFormParts((prev) => prev.filter((_, idx) => idx !== i));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Service name is required");
      const laborHours = parseFloat(form.labor_hours) || 0;
      const laborRateCents = Math.round(parseFloat(form.labor_rate_cents_str || "0") * 100);
      const payload: any = {
        store_id: storeId,
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || null,
        labor_hours: laborHours,
        labor_rate_cents: laborRateCents,
        parts: formParts,
        is_active: form.is_active,
      };
      if (editId) {
        const { error } = await supabase.from("ar_service_catalog" as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ar_service_catalog" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Service updated" : "Service added to catalog");
      qc.invalidateQueries({ queryKey: ["ar-service-catalog", storeId] });
      setDlgOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_service_catalog" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service removed");
      qc.invalidateQueries({ queryKey: ["ar-service-catalog", storeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ar_service_catalog" as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-service-catalog", storeId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const previewTotal = computeTotal(
    parseFloat(form.labor_hours) || 0,
    Math.round(parseFloat(form.labor_rate_cents_str || "0") * 100),
    formParts,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Service Catalog
              <Badge variant="secondary" className="text-[10px]">{services.length}</Badge>
            </CardTitle>
            <Button size="sm" className="gap-1.5 h-8" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-lg font-bold text-primary">{services.length}</p>
              <p className="text-[11px] text-muted-foreground">Total Services</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{services.filter((s) => s.is_active).length}</p>
              <p className="text-[11px] text-muted-foreground">Active</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <p className="text-lg font-bold text-amber-600">
                {services.length > 0
                  ? fmt(Math.round(services.reduce((s, sv) => s + computeTotal(sv.labor_hours, sv.labor_rate_cents, sv.parts), 0) / Math.max(services.length, 1)))
                  : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">Avg Price</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search services…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          {/* Category filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((c) => (
              <button type="button"
                key={c.id}
                onClick={() => setCatFilter(c.id)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  catFilter === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{services.length === 0 ? "No services yet. Add your first service to the catalog." : "No services match your search."}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const total = computeTotal(s.labor_hours, s.labor_rate_cents, s.parts);
            const catLabel = CATEGORIES.find((c) => c.id === s.category)?.label ?? s.category;
            const catColor = CATEGORY_COLORS[s.category] ?? CATEGORY_COLORS.general;
            return (
              <Card key={s.id} className={`transition-opacity ${s.is_active ? "" : "opacity-50"}`}>
                <CardContent className="pt-4 pb-3 space-y-2.5">
                  {/* Name + category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{s.name}</p>
                      {s.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] border ${catColor}`}>{catLabel}</Badge>
                  </div>

                  {/* Labor */}
                  {s.labor_hours > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{s.labor_hours}h labor</span>
                      {s.labor_rate_cents > 0 && (
                        <span className="text-muted-foreground/60">× {fmt(s.labor_rate_cents)}/hr = {fmt(Math.round(s.labor_hours * s.labor_rate_cents))}</span>
                      )}
                    </div>
                  )}

                  {/* Parts */}
                  {s.parts.length > 0 && (
                    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <Package className="h-3 w-3 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        {s.parts.map((p, i) => (
                          <span key={i}>
                            {p.name} ({fmt(p.price_cents)}){i < s.parts.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total + actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      {fmt(total)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button"
                        onClick={() => toggleActive.mutate({ id: s.id, is_active: !s.is_active })}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          s.is_active
                            ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${s.name}"?`)) remove.mutate(s.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              {editId ? "Edit Service" : "Add Service"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Service Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Full Synthetic Oil Change"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of what's included…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Labor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Labor Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={form.labor_hours}
                  onChange={(e) => setForm((f) => ({ ...f, labor_hours: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Labor Rate ($/hr)</Label>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={form.labor_rate_cents_str}
                  onChange={(e) => setForm((f) => ({ ...f, labor_rate_cents_str: e.target.value }))}
                  className="h-9"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Parts */}
            <div className="space-y-2">
              <Label className="text-xs">Parts / Materials</Label>
              {formParts.length > 0 && (
                <div className="space-y-1.5">
                  {formParts.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-1.5">
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-muted-foreground shrink-0">{fmt(p.price_cents)}</span>
                      <button type="button" onClick={() => removePart(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="Part name"
                  className="h-8 text-sm flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPart(); } }}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPartPrice}
                  onChange={(e) => setNewPartPrice(e.target.value)}
                  placeholder="Price"
                  className="h-8 text-sm w-24"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPart(); } }}
                />
                <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={addPart}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Total preview */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
              <span className="text-sm text-muted-foreground">Estimated Total</span>
              <span className="text-base font-bold text-emerald-600">{fmt(previewTotal)}</span>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Active (visible in quick-add)</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {editId ? "Save Changes" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
