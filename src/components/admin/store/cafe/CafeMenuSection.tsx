/**
 * CafeMenuSection — manage categories + menu items in one screen.
 * Modifiers live in their own tab (CafeModifiersSection); items can be
 * linked to modifier groups inline from the row's expand panel.
 */
import { useMemo, useState } from "react";
import {
  BookOpen, Plus, Trash2, Loader2, Image as ImageIcon, Tag,
  Layers, X, ChevronDown, ChevronRight, Upload, Download, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeMenu, type CafeCategoryDraft, type CafeMenuItemDraft } from "@/hooks/cafe/useCafeMenu";
import { uploadStoreAsset } from "@/pages/admin/utils/uploadStoreAsset";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const blankCategory = (): CafeCategoryDraft => ({
  name: "", description: null, image_url: null, is_active: true,
});

const blankItem = (categoryId: string | null): CafeMenuItemDraft => ({
  category_id: categoryId,
  name: "", description: null,
  price_cents: 0, cost_cents: 0, prep_minutes: 5,
  image_url: null, is_active: true, is_featured: false,
  tags: [],
  is_vegetarian: false, is_vegan: false, is_gluten_free: false,
  caffeine_mg: null, calories: null,
});

// === CSV import helpers ===
interface ParsedRow {
  rowIndex: number;
  name: string;
  category: string;
  description: string | null;
  price_cents: number;
  cost_cents: number;
  prep_minutes: number;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_featured: boolean;
  error?: string;
  duplicate?: boolean;
}

const CSV_TEMPLATE_HEADER = "name,category,description,price,cost,prep_minutes,vegetarian,vegan,gluten_free,featured";
const CSV_TEMPLATE_SAMPLE = [
  "Latte,Coffee,Espresso with steamed milk,4.50,1.20,4,false,false,false,true",
  "Iced Americano,Coffee,Espresso over ice,3.75,0.80,3,true,true,true,false",
  "Croissant,Pastries,Buttery flaky,3.25,1.10,1,true,false,false,false",
].join("\n");

const truthy = (s: string) => /^(true|yes|y|1)$/i.test(s.trim());

// Tiny CSV parser supporting quoted cells with embedded commas + newlines.
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === "\"") {
        if (text[i + 1] === "\"") { cell += "\""; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cell += c; i++; continue;
    }
    if (c === "\"") { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(cell); cell = ""; i++; continue; }
    if (c === "\n" || c === "\r") {
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) out.push(row);
      row = [];
      if (c === "\r" && text[i + 1] === "\n") i += 2; else i++;
      continue;
    }
    cell += c; i++;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.some((v) => v.trim() !== "")) out.push(row);
  }
  return out;
}

function parseMenuCsv(text: string, existingNamesByCat: Map<string, Set<string>>): { rows: ParsedRow[]; topLevelError?: string } {
  const cells = parseCsv(text);
  if (cells.length === 0) return { rows: [], topLevelError: "Empty file." };
  const headerRow = cells[0].map((h) => h.trim().toLowerCase());
  const idxOf = (name: string) => headerRow.indexOf(name);
  const idxName = idxOf("name");
  const idxCat = idxOf("category");
  if (idxName < 0 || idxCat < 0) {
    return { rows: [], topLevelError: "Required columns missing: name, category." };
  }
  const idxDesc = idxOf("description");
  const idxPrice = idxOf("price");
  const idxCost = idxOf("cost");
  const idxPrep = idxOf("prep_minutes");
  const idxVeg = idxOf("vegetarian");
  const idxVgn = idxOf("vegan");
  const idxGf = idxOf("gluten_free");
  const idxFeat = idxOf("featured");

  const rows: ParsedRow[] = [];
  const seenKeysInBatch = new Set<string>(); // prevent duplicates within the import too

  for (let r = 1; r < cells.length; r++) {
    const row = cells[r];
    const name = (row[idxName] ?? "").trim();
    const category = (row[idxCat] ?? "").trim();
    if (!name && !category) continue;
    const parsed: ParsedRow = {
      rowIndex: r,
      name,
      category,
      description: idxDesc >= 0 ? ((row[idxDesc] ?? "").trim() || null) : null,
      price_cents: Math.max(0, Math.round(parseFloat((idxPrice >= 0 ? row[idxPrice] : "0") || "0") * 100)),
      cost_cents: Math.max(0, Math.round(parseFloat((idxCost >= 0 ? row[idxCost] : "0") || "0") * 100)),
      prep_minutes: Math.max(0, Math.min(240, parseInt((idxPrep >= 0 ? row[idxPrep] : "5") || "5", 10) || 5)),
      is_vegetarian: idxVeg >= 0 ? truthy(row[idxVeg] ?? "") : false,
      is_vegan: idxVgn >= 0 ? truthy(row[idxVgn] ?? "") : false,
      is_gluten_free: idxGf >= 0 ? truthy(row[idxGf] ?? "") : false,
      is_featured: idxFeat >= 0 ? truthy(row[idxFeat] ?? "") : false,
    };
    if (!parsed.name) {
      parsed.error = "Name required.";
    } else if (!parsed.category) {
      parsed.error = "Category required.";
    } else {
      const key = `${parsed.category.toLowerCase()}::${parsed.name.toLowerCase()}`;
      const existingInCat = existingNamesByCat.get(parsed.category.toLowerCase());
      if (existingInCat?.has(parsed.name.toLowerCase()) || seenKeysInBatch.has(key)) {
        parsed.duplicate = true;
      }
      seenKeysInBatch.add(key);
    }
    rows.push(parsed);
  }
  return { rows };
}

export default function CafeMenuSection({ storeId }: Props) {
  const menu = useCafeMenu(storeId);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catDraft, setCatDraft] = useState<CafeCategoryDraft>(blankCategory());
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDraft, setItemDraft] = useState<CafeMenuItemDraft>(blankItem(null));
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // CSV import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const itemsByCategory = useMemo(() => {
    const map = new Map<string | null, typeof menu.items>();
    for (const i of menu.items) {
      const k = i.category_id ?? null;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    }
    return map;
  }, [menu.items]);

  const visibleCategoryId = activeCategoryId ?? menu.categories[0]?.id ?? null;
  const visibleItems = itemsByCategory.get(visibleCategoryId) ?? [];

  // === CSV import handlers ===
  const existingNamesByCat = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of menu.categories) {
      const itemsInCat = menu.items.filter((i) => i.category_id === c.id);
      map.set(c.name.toLowerCase(), new Set(itemsInCat.map((i) => i.name.toLowerCase())));
    }
    return map;
  }, [menu.categories, menu.items]);

  const openImportDialog = () => {
    setImportRows([]);
    setImportError(null);
    setImportDialogOpen(true);
  };

  const handleCsvFile = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const { rows, topLevelError } = parseMenuCsv(text, existingNamesByCat);
      if (topLevelError) {
        setImportError(topLevelError);
        setImportRows([]);
        return;
      }
      if (rows.length === 0) {
        setImportError("No rows found.");
        setImportRows([]);
        return;
      }
      setImportRows(rows);
    } catch (err) {
      console.error("[CafeMenuSection] CSV parse", err);
      setImportError("Couldn't read this file. Make sure it's a CSV.");
    }
  };

  const downloadTemplate = () => {
    const text = `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_SAMPLE}\n`;
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cafe-menu-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitImport = async () => {
    const valid = importRows.filter((r) => !r.error && !r.duplicate);
    if (valid.length === 0) {
      toast.error("Nothing to import.");
      return;
    }
    setImporting(true);

    // Group rows by category name; auto-create any missing categories first.
    const categoryByName = new Map<string, string>(); // lowercase → id
    for (const c of menu.categories) categoryByName.set(c.name.toLowerCase(), c.id);
    const uniqueCats = Array.from(new Set(valid.map((r) => r.category)));
    for (const catName of uniqueCats) {
      if (categoryByName.has(catName.toLowerCase())) continue;
      const created = await menu.createCategory({ name: catName, description: null, image_url: null, is_active: true });
      if (created) categoryByName.set(catName.toLowerCase(), created.id);
    }

    let createdCount = 0;
    for (const row of valid) {
      const categoryId = categoryByName.get(row.category.toLowerCase()) ?? null;
      const draft: CafeMenuItemDraft = {
        category_id: categoryId,
        name: row.name,
        description: row.description,
        price_cents: row.price_cents,
        cost_cents: row.cost_cents,
        prep_minutes: row.prep_minutes,
        image_url: null,
        is_active: true,
        is_featured: row.is_featured,
        tags: [],
        is_vegetarian: row.is_vegetarian,
        is_vegan: row.is_vegan,
        is_gluten_free: row.is_gluten_free,
        caffeine_mg: null,
        calories: null,
      };
      const created = await menu.createItem(draft);
      if (created) createdCount++;
    }
    setImporting(false);
    toast.success(`Imported ${createdCount} item${createdCount === 1 ? "" : "s"}.`);
    setImportDialogOpen(false);
    setImportRows([]);
  };

  // === Bulk actions ===
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((i) => selectedIds.has(i.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const i of visibleItems) next.delete(i.id);
        return next;
      }
      const next = new Set(prev);
      for (const i of visibleItems) next.add(i.id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const applyToSelected = async (patch: Partial<{ is_active: boolean; is_featured: boolean }>) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await menu.updateItem(id, patch);
    }
    const verb = patch.is_active === false ? "hidden" :
                 patch.is_active === true ? "activated" :
                 patch.is_featured === true ? "featured" :
                 patch.is_featured === false ? "unfeatured" : "updated";
    toast.success(`${ids.length} item${ids.length === 1 ? "" : "s"} ${verb}.`);
    clearSelection();
  };
  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Delete ${ids.length} item${ids.length === 1 ? "" : "s"}? This can't be undone.`)) return;
    for (const id of ids) await menu.removeItem(id);
    toast.success(`Deleted ${ids.length} item${ids.length === 1 ? "" : "s"}.`);
    clearSelection();
  };

  const handleItemImageUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5MB)."); return; }
    if (!file.type.startsWith("image/")) { toast.error("Pick an image file."); return; }
    setUploadingImage(true);
    try {
      const { publicUrl } = await uploadStoreAsset({ storeId, file, surface: "room" });
      setItemDraft((d) => ({ ...d, image_url: publicUrl }));
      toast.success("Photo added.");
    } catch (e) {
      console.error("[CafeMenu] image upload", e);
      toast.error((e as Error)?.message ?? "Couldn't upload photo.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!catDraft.name.trim()) { toast.error("Category needs a name."); return; }
    const created = await menu.createCategory(catDraft);
    if (created) {
      toast.success(`Added "${created.name}".`);
      setCatDraft(blankCategory());
      setCatDialogOpen(false);
      setActiveCategoryId(created.id);
    }
  };

  const handleSaveItem = async () => {
    if (!itemDraft.name.trim()) { toast.error("Item needs a name."); return; }
    if (editingItemId) {
      await menu.updateItem(editingItemId, itemDraft);
      toast.success("Updated.");
    } else {
      const created = await menu.createItem(itemDraft);
      if (created) toast.success(`Added "${created.name}".`);
    }
    setItemDialogOpen(false);
    setEditingItemId(null);
    setItemDraft(blankItem(visibleCategoryId));
  };

  const openItemForEdit = (item: typeof menu.items[number]) => {
    setEditingItemId(item.id);
    setItemDraft({
      category_id: item.category_id, name: item.name, description: item.description,
      price_cents: item.price_cents, cost_cents: item.cost_cents, prep_minutes: item.prep_minutes,
      image_url: item.image_url, is_active: item.is_active, is_featured: item.is_featured,
      tags: item.tags, is_vegetarian: item.is_vegetarian, is_vegan: item.is_vegan,
      is_gluten_free: item.is_gluten_free, caffeine_mg: item.caffeine_mg, calories: item.calories,
    });
    setItemDialogOpen(true);
  };

  const openItemForCreate = () => {
    setEditingItemId(null);
    setItemDraft(blankItem(visibleCategoryId));
    setItemDialogOpen(true);
  };

  if (menu.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Categories</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openImportDialog}>
                <Upload className="h-4 w-4 mr-1" /> Import CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setCatDraft(blankCategory()); setCatDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Category
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {menu.categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Add your first category, e.g. <em>Coffee</em>, <em>Tea</em>, <em>Pastries</em>.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {menu.categories.map((c) => {
                const active = visibleCategoryId === c.id;
                return (
                  <button
                    key={c.id} type="button" onClick={() => setActiveCategoryId(c.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm border transition-colors",
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"
                    )}
                  >
                    {c.name}
                    <span className={cn("ml-2 text-[11px] tabular-nums", active ? "opacity-70" : "text-muted-foreground")}>
                      {(itemsByCategory.get(c.id) ?? []).length}
                    </span>
                  </button>
                );
              })}
              {(itemsByCategory.get(null) ?? []).length > 0 && (
                <button
                  type="button" onClick={() => setActiveCategoryId(null)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm border transition-colors",
                    visibleCategoryId === null ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"
                  )}
                >
                  Uncategorized
                  <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
                    {(itemsByCategory.get(null) ?? []).length}
                  </span>
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Menu items</span>
            <Button size="sm" onClick={openItemForCreate} disabled={menu.categories.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {selectedIds.size > 0 && (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{selectedIds.size} selected</span>
              <span className="text-muted-foreground">·</span>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => applyToSelected({ is_active: true })}>Activate</Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => applyToSelected({ is_active: false })}>Hide</Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => applyToSelected({ is_featured: true })}>Feature</Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => applyToSelected({ is_featured: false })}>Unfeature</Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px] text-destructive ml-auto" onClick={deleteSelected}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={clearSelection}>Clear</Button>
            </div>
          )}
          {menu.categories.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">Add a category first.</div>
          ) : visibleItems.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">No items yet in this category.</div>
          ) : (
            <>
              <label className="flex items-center gap-2 py-1 mb-1 text-[11px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-primary"
                />
                Select all visible
              </label>
              <ul className="divide-y divide-border/60">
              {visibleItems.map((item) => {
                const isOpen = expandedItem === item.id;
                const linkedGroupIds = menu.links.filter((l) => l.item_id === item.id).map((l) => l.group_id);
                return (
                  <li key={item.id} className="py-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="h-4 w-4 accent-primary"
                        aria-label={`Select ${item.name}`}
                      />
                      <button
                        type="button"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                        onClick={() => setExpandedItem(isOpen ? null : item.id)}
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.name}</span>
                          {!item.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                          {item.is_sold_out && <Badge variant="destructive" className="text-[10px]">86&apos;d</Badge>}
                          {item.is_featured && <Badge className="text-[10px] bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">Featured</Badge>}
                        </div>
                        {item.description && (
                          <p className="text-[12px] text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0 leading-tight">
                        <span className="tabular-nums font-medium">{fmt(item.price_cents)}</span>
                        {item.cost_cents > 0 && (() => {
                          const margin = item.price_cents - item.cost_cents;
                          const marginPct = item.price_cents > 0 ? Math.round((margin / item.price_cents) * 100) : 0;
                          const tone = marginPct < 0 ? "text-destructive" : marginPct < 30 ? "text-amber-600" : "text-emerald-600";
                          return (
                            <span className={cn("text-[10px] tabular-nums", tone)} title={`Cost ${fmt(item.cost_cents)}`}>
                              {marginPct}% margin
                            </span>
                          );
                        })()}
                      </div>
                      <Button
                        size="sm"
                        variant={item.is_sold_out ? "destructive" : "outline"}
                        className="h-7 px-2 text-[11px] shrink-0"
                        title={item.is_sold_out ? "Bring it back" : "Mark sold out for today"}
                        onClick={() => { void menu.updateItem(item.id, { is_sold_out: !item.is_sold_out }); }}
                      >
                        86
                      </Button>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={(v) => { void menu.updateItem(item.id, { is_active: v }); }}
                      />
                      <Button size="sm" variant="ghost" onClick={() => openItemForEdit(item)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Delete "${item.name}"?`)) void menu.removeItem(item.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {isOpen && (
                      <div className="ml-12 mt-2 rounded-lg border border-border bg-muted/20 p-3">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                          <Layers className="h-3 w-3" /> Modifier groups
                        </p>
                        {menu.groups.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No modifier groups yet. Create them in the Modifiers tab.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {menu.groups.map((g) => {
                              const linked = linkedGroupIds.includes(g.id);
                              return (
                                <button
                                  key={g.id} type="button"
                                  onClick={() => linked ? menu.detachGroupFromItem(item.id, g.id) : menu.attachGroupToItem(item.id, g.id)}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                                    linked ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-foreground hover:bg-muted"
                                  )}
                                >
                                  {g.name}
                                  {linked && <X className="h-3 w-3" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Category dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={catDraft.name} onChange={(e) => setCatDraft({ ...catDraft, name: e.target.value })} placeholder="Coffee" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={catDraft.description ?? ""} onChange={(e) => setCatDraft({ ...catDraft, description: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={catDraft.is_active} onCheckedChange={(v) => setCatDraft({ ...catDraft, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={menu.saving}>Save category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingItemId ? "Edit item" : "New item"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={itemDraft.name} onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })} placeholder="Latte" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={itemDraft.category_id ?? ""} onValueChange={(v) => setItemDraft({ ...itemDraft, category_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Uncategorized" /></SelectTrigger>
                  <SelectContent>
                    {menu.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={itemDraft.description ?? ""} onChange={(e) => setItemDraft({ ...itemDraft, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Photo</Label>
              <div className="mt-1 flex items-start gap-3">
                <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted/30">
                  {itemDraft.image_url ? (
                    <img src={itemDraft.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 grid place-items-center bg-background/70">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
                      <Upload className="h-3.5 w-3.5" />
                      {itemDraft.image_url ? "Replace" : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          void handleItemImageUpload(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {itemDraft.image_url && (
                      <Button size="sm" variant="ghost" className="h-8 text-destructive"
                        onClick={() => setItemDraft({ ...itemDraft, image_url: null })}>
                        <X className="h-3.5 w-3.5 mr-1" /> Clear
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">JPG or PNG, up to 5MB. Square crops look best.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" min="0" value={(itemDraft.price_cents / 100).toString()}
                  onChange={(e) => setItemDraft({ ...itemDraft, price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                />
              </div>
              <div>
                <Label>Cost ($)</Label>
                <Input type="number" step="0.01" min="0" value={(itemDraft.cost_cents / 100).toString()}
                  onChange={(e) => setItemDraft({ ...itemDraft, cost_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                />
              </div>
              <div>
                <Label>Prep (min)</Label>
                <Input type="number" min="0" max="240" value={String(itemDraft.prep_minutes)}
                  onChange={(e) => setItemDraft({ ...itemDraft, prep_minutes: Math.max(0, Math.min(240, parseInt(e.target.value || "0", 10))) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center justify-between rounded-lg border border-border p-2">
                <span className="text-sm">Vegetarian</span>
                <Switch checked={itemDraft.is_vegetarian} onCheckedChange={(v) => setItemDraft({ ...itemDraft, is_vegetarian: v })} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border p-2">
                <span className="text-sm">Vegan</span>
                <Switch checked={itemDraft.is_vegan} onCheckedChange={(v) => setItemDraft({ ...itemDraft, is_vegan: v })} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border p-2">
                <span className="text-sm">Gluten-free</span>
                <Switch checked={itemDraft.is_gluten_free} onCheckedChange={(v) => setItemDraft({ ...itemDraft, is_gluten_free: v })} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between rounded-lg border border-border p-2">
                <span className="text-sm">Featured</span>
                <Switch checked={itemDraft.is_featured} onCheckedChange={(v) => setItemDraft({ ...itemDraft, is_featured: v })} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border p-2">
                <span className="text-sm">Active</span>
                <Switch checked={itemDraft.is_active} onCheckedChange={(v) => setItemDraft({ ...itemDraft, is_active: v })} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={menu.saving}>{editingItemId ? "Save changes" : "Add item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV import dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Import menu from CSV</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm">
              <p className="text-foreground/85">
                Upload a CSV with columns: <span className="font-mono text-xs">name, category, description, price, cost, prep_minutes, vegetarian, vegan, gluten_free, featured</span>.
                Missing categories will be created automatically. Items whose name already exists in their category will be skipped.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={downloadTemplate}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Template
                </Button>
                <label className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" /> Choose file
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleCsvFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            {importError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {importError}
              </div>
            )}

            {importRows.length > 0 && (() => {
              const okCount = importRows.filter((r) => !r.error && !r.duplicate).length;
              const dupCount = importRows.filter((r) => r.duplicate).length;
              const errCount = importRows.filter((r) => r.error).length;
              return (
                <>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{okCount} ready to create</span>
                    {dupCount > 0 && <Badge variant="secondary" className="text-[10px]">{dupCount} duplicate{dupCount === 1 ? "" : "s"} skipped</Badge>}
                    {errCount > 0 && <Badge variant="secondary" className="text-[10px] bg-destructive/15 text-destructive">{errCount} error{errCount === 1 ? "" : "s"}</Badge>}
                  </div>
                  <div className="rounded-md border border-border overflow-hidden">
                    <div className="grid grid-cols-12 gap-1 px-2 py-1.5 bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <span className="col-span-3">Name</span>
                      <span className="col-span-3">Category</span>
                      <span className="col-span-2 text-right">Price</span>
                      <span className="col-span-1 text-right">Prep</span>
                      <span className="col-span-3">Status</span>
                    </div>
                    <ul className="divide-y divide-border/40 max-h-[40vh] overflow-y-auto text-sm">
                      {importRows.map((r) => (
                        <li key={r.rowIndex} className="grid grid-cols-12 gap-1 px-2 py-1.5 items-center">
                          <span className="col-span-3 truncate font-medium">{r.name || <span className="text-muted-foreground italic">(blank)</span>}</span>
                          <span className="col-span-3 truncate">{r.category || <span className="text-muted-foreground italic">(blank)</span>}</span>
                          <span className="col-span-2 text-right tabular-nums">{fmt(r.price_cents)}</span>
                          <span className="col-span-1 text-right tabular-nums">{r.prep_minutes}m</span>
                          <span className="col-span-3 text-[11px] truncate">
                            {r.error
                              ? <span className="text-destructive">{r.error}</span>
                              : r.duplicate
                                ? <span className="text-muted-foreground">Skipped (exists)</span>
                                : <span className="text-emerald-700 dark:text-emerald-300">Will create</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitImport} disabled={importing || importRows.filter((r) => !r.error && !r.duplicate).length === 0}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create {importRows.filter((r) => !r.error && !r.duplicate).length} item{importRows.filter((r) => !r.error && !r.duplicate).length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
