/**
 * Auto Repair — Part Shop (AutoZone-style)
 * Vehicle fitment lookup · rich catalog · stock alerts · sort/view toggle
 */
import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PARTS_SUPPLIERS, type PartsSupplier } from "@/config/partsSuppliers";
import PartsSupplierLogo from "./PartsSupplierLogo";
import SupplierBrowserModal from "./SupplierBrowserModal";
import Search from "lucide-react/dist/esm/icons/search";
import Package from "lucide-react/dist/esm/icons/package";
import Plus from "lucide-react/dist/esm/icons/plus";
import Wrench from "lucide-react/dist/esm/icons/wrench";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Store from "lucide-react/dist/esm/icons/store";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import KeyRound from "lucide-react/dist/esm/icons/key-round";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import List from "lucide-react/dist/esm/icons/list";
import ArrowUpDown from "lucide-react/dist/esm/icons/arrow-up-down";
import Car from "lucide-react/dist/esm/icons/car";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import Download from "lucide-react/dist/esm/icons/download";
import Upload from "lucide-react/dist/esm/icons/upload";
import X from "lucide-react/dist/esm/icons/x";
import Minus from "lucide-react/dist/esm/icons/minus";
import ImagePlus from "lucide-react/dist/esm/icons/image-plus";
import PackagePlus from "lucide-react/dist/esm/icons/package-plus";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

interface Props { storeId: string }

type Part = {
  id: string;
  store_id: string;
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  price_cents: number;
  stock: number;
  active: boolean;
  image_url: string | null;
  oem_number?: string | null;
  interchange_number?: string | null;
  condition?: string | null;
  warranty_months?: number | null;
  core_charge_cents?: number | null;
  fitment_notes?: string | null;
  location_in_store?: string | null;
  cost_cents?: number | null;
};

type SortKey = "name" | "price" | "stock" | "brand" | "created";
type ViewMode = "grid" | "list";

const CATS = [
  "All", "Brakes", "Engine", "Fluids", "Electrical", "Tires",
  "HVAC", "Suspension", "Exhaust", "Fuel System", "Transmission",
  "Steering", "Cooling", "Lighting", "Exterior", "Interior", "Other",
];

const JOBS: { label: string; cats: string[] }[] = [
  { label: "Air Conditioning",             cats: ["HVAC"] },
  { label: "Alternators / Belts",          cats: ["Electrical", "Engine"] },
  { label: "Batteries / Cables",           cats: ["Electrical"] },
  { label: "Belts / Pulleys",              cats: ["Engine"] },
  { label: "Brake Calipers / Hoses",       cats: ["Brakes"] },
  { label: "Brake Hardware",               cats: ["Brakes"] },
  { label: "Brake Pads / Shoes",           cats: ["Brakes"] },
  { label: "Brake Rotors / Drums",         cats: ["Brakes"] },
  { label: "Brakes Complete - Front & Rear", cats: ["Brakes"] },
  { label: "Control Arms / Ball Joints",   cats: ["Suspension"] },
  { label: "Cv Axles / U-Joints",          cats: ["Suspension"] },
  { label: "Exhaust",                      cats: ["Exhaust"] },
  { label: "Filters",                      cats: ["Engine", "HVAC", "Fluids"] },
  { label: "Fuel Pumps / Filters",         cats: ["Fuel System"] },
  { label: "Gaskets",                      cats: ["Engine"] },
  { label: "Heating",                      cats: ["HVAC", "Cooling"] },
  { label: "Motor / Transmission Mounts",  cats: ["Transmission", "Engine"] },
  { label: "Oxygen Sensors",               cats: ["Electrical", "Engine"] },
  { label: "Power Steering",               cats: ["Steering"] },
  { label: "Radiators / Thermostats",      cats: ["Cooling"] },
  { label: "Shocks / Struts",              cats: ["Suspension"] },
  { label: "Starters",                     cats: ["Electrical"] },
  { label: "Suspension",                   cats: ["Suspension"] },
  { label: "Tie Rods",                     cats: ["Steering"] },
  { label: "Tune Up",                      cats: ["Engine", "Electrical"] },
  { label: "Water Pumps / Belts",          cats: ["Cooling", "Engine"] },
  { label: "Wheel / Hub Bearings / Seals", cats: ["Suspension"] },
  { label: "Wiper Blades / Motors",        cats: ["Exterior"] },
];

const CONDITIONS = ["New", "OEM", "Remanufactured", "Aftermarket", "Used"];

const YEARS = Array.from({ length: 35 }, (_, i) => String(2024 - i));
const MAKES = ["Acura","BMW","Buick","Cadillac","Chevrolet","Chrysler","Dodge","Ford","GMC","Honda","Hyundai","Infiniti","Jeep","Kia","Lexus","Lincoln","Mazda","Mercedes-Benz","Mitsubishi","Nissan","Ram","Subaru","Tesla","Toyota","Volkswagen","Volvo"];

const blank: Omit<Part, "id" | "store_id" | "active" | "image_url"> & { price: string; cost: string; core: string } = {
  sku: "", name: "", brand: "", category: "Brakes", price_cents: 0, stock: 0,
  price: "0.00", cost: "0.00", core: "0.00",
  oem_number: "", interchange_number: "", condition: "New",
  warranty_months: 12, core_charge_cents: 0, fitment_notes: "", location_in_store: "", cost_cents: 0,
};

function stockBadge(stock: number) {
  if (stock === 0) return <Badge variant="destructive" className="text-[10px] px-1.5">Out of stock</Badge>;
  if (stock <= 5) return <Badge className="text-[10px] px-1.5 bg-amber-500 hover:bg-amber-500 text-white">{stock} low stock</Badge>;
  if (stock <= 10) return <Badge variant="outline" className="text-[10px] px-1.5 text-amber-600 border-amber-300">{stock} in stock</Badge>;
  return <Badge variant="secondary" className="text-[10px] px-1.5">{stock} in stock</Badge>;
}

function conditionBadge(condition?: string | null) {
  if (!condition || condition === "New") return null;
  const colors: Record<string, string> = {
    OEM: "bg-blue-100 text-blue-700 border-blue-200",
    Remanufactured: "bg-purple-100 text-purple-700 border-purple-200",
    Aftermarket: "bg-green-100 text-green-700 border-green-200",
    Used: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${colors[condition] ?? "bg-muted"}`}>{condition}</span>;
}

export default function AutoRepairPartShopSection({ storeId }: Props) {
  const qc = useQueryClient();

  // Catalog state
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<ViewMode>("grid");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Vehicle fitment filter
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleExpanded, setVehicleExpanded] = useState(false);

  // Dialog
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [imgUploading, setImgUploading] = useState(false);

  // Stock adjust dialog
  const [adjustPart, setAdjustPart] = useState<Part | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("0");
  const [adjustMode, setAdjustMode] = useState<"receive" | "use" | "set">("receive");

  // CSV import
  const csvRef = useRef<HTMLInputElement>(null);

  // Jobs checklist
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const toggleJob = (label: string) =>
    setSelectedJobs(prev => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s; });
  const jobCats = useMemo(() => {
    const cats = new Set<string>();
    JOBS.filter(j => selectedJobs.has(j.label)).forEach(j => j.cats.forEach(c => cats.add(c)));
    return cats;
  }, [selectedJobs]);

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["ar-parts", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_parts")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Part[];
    },
  });

  const { data: recentInvoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ["ar-invoices-parts", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices")
        .select("id,number,status,created_at,vehicle_label,vehicle_year,vehicle_make,vehicle_model")
        .eq("store_id", storeId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const vehicleActive = !!(vehicleYear || vehicleMake || vehicleModel);
  const lowStock = parts.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStock = parts.filter(p => p.stock === 0).length;

  const filtered = useMemo(() => {
    let list = parts.filter(p =>
      (cat === "All" || p.category === cat) &&
      (jobCats.size === 0 || (p.category ? jobCats.has(p.category) : false)) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase())
        || p.sku.toLowerCase().includes(q.toLowerCase())
        || (p.brand ?? "").toLowerCase().includes(q.toLowerCase())
        || (p.oem_number ?? "").toLowerCase().includes(q.toLowerCase())
        || (p.interchange_number ?? "").toLowerCase().includes(q.toLowerCase())) &&
      (!lowStockOnly || p.stock <= 5) &&
      (!vehicleActive || (p.fitment_notes?.toLowerCase().includes(vehicleMake.toLowerCase()) ?? !vehicleMake))
    );
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sort === "name") cmp = a.name.localeCompare(b.name);
      else if (sort === "price") cmp = a.price_cents - b.price_cents;
      else if (sort === "stock") cmp = a.stock - b.stock;
      else if (sort === "brand") cmp = (a.brand ?? "").localeCompare(b.brand ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [parts, q, cat, sort, sortDir, lowStockOnly, vehicleActive, vehicleMake]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSort(key); setSortDir("asc"); }
  };

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.sku.trim() || !form.name.trim()) throw new Error("SKU and name are required");
      const payload = {
        store_id: storeId,
        sku: form.sku.trim(),
        name: form.name.trim(),
        brand: form.brand?.trim() || null,
        category: form.category,
        price_cents: Math.round((Number(form.price) || 0) * 100),
        cost_cents: Math.round((Number(form.cost) || 0) * 100),
        core_charge_cents: Math.round((Number(form.core) || 0) * 100),
        stock: form.stock,
        condition: form.condition || "New",
        oem_number: form.oem_number?.trim() || null,
        interchange_number: form.interchange_number?.trim() || null,
        warranty_months: form.warranty_months || null,
        fitment_notes: form.fitment_notes?.trim() || null,
        location_in_store: form.location_in_store?.trim() || null,
        image_url: (form as any).image_url ?? null,
        active: true,
      };
      if (editId) {
        const { error } = await supabase.from("ar_parts").update(payload as any).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ar_parts").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Part updated" : "Part added");
      qc.invalidateQueries({ queryKey: ["ar-parts", storeId] });
      setOpen(false); setEditId(null); setForm({ ...blank });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_parts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Part removed"); qc.invalidateQueries({ queryKey: ["ar-parts", storeId] }); },
  });

  const adjustStock = useMutation({
    mutationFn: async ({ id, newStock }: { id: string; newStock: number }) => {
      const { error } = await supabase.from("ar_parts").update({ stock: newStock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stock updated");
      qc.invalidateQueries({ queryKey: ["ar-parts", storeId] });
      setAdjustPart(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update stock"),
  });

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("CSV has no data rows");
      const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
      const idx = (name: string) => headers.findIndex(h => h.includes(name));
      const iSku = idx("sku"), iName = idx("name"), iBrand = idx("brand"), iCat = idx("categ");
      const iPrice = idx("price"), iCost = idx("cost"), iCore = idx("core"), iStock = idx("stock");
      const iOem = idx("oem"), iInter = idx("interchange"), iWarr = idx("warranty");
      const iLoc = idx("location"), iFit = idx("fitment"), iCond = idx("condition");
      if (iSku < 0 || iName < 0) throw new Error("CSV must have SKU and Name columns");
      const parseField = (row: string[], i: number) => i >= 0 ? (row[i] ?? "").replace(/^"|"$/g, "").trim() : "";
      const rows = lines.slice(1).map(line => {
        const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, "").replace(/""/g, '"')) ?? line.split(",");
        const price = parseFloat(cols[iPrice] ?? "0") || 0;
        const cost = parseFloat(cols[iCost] ?? "0") || 0;
        const core = parseFloat(cols[iCore] ?? "0") || 0;
        return {
          store_id: storeId,
          sku: parseField(cols, iSku),
          name: parseField(cols, iName),
          brand: parseField(cols, iBrand) || null,
          category: parseField(cols, iCat) || "Other",
          condition: parseField(cols, iCond) || "New",
          price_cents: Math.round(price * 100),
          cost_cents: Math.round(cost * 100),
          core_charge_cents: Math.round(core * 100),
          stock: parseInt(parseField(cols, iStock) || "0", 10) || 0,
          oem_number: parseField(cols, iOem) || null,
          interchange_number: parseField(cols, iInter) || null,
          warranty_months: parseInt(parseField(cols, iWarr) || "0", 10) || null,
          location_in_store: parseField(cols, iLoc) || null,
          fitment_notes: parseField(cols, iFit) || null,
          active: true,
        };
      }).filter(r => r.sku && r.name);
      if (rows.length === 0) throw new Error("No valid rows found");
      const { error } = await supabase.from("ar_parts").upsert(rows as any, { onConflict: "store_id,sku" });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} part${count !== 1 ? "s" : ""}`);
      qc.invalidateQueries({ queryKey: ["ar-parts", storeId] });
      if (csvRef.current) csvRef.current.value = "";
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Import failed");
      if (csvRef.current) csvRef.current.value = "";
    },
  });

  const startEdit = (p: Part) => {
    setEditId(p.id);
    setForm({
      sku: p.sku, name: p.name, brand: p.brand ?? "", category: p.category ?? "Other",
      price_cents: p.price_cents, stock: p.stock,
      price: (p.price_cents / 100).toFixed(2),
      cost: ((p.cost_cents ?? 0) / 100).toFixed(2),
      core: ((p.core_charge_cents ?? 0) / 100).toFixed(2),
      oem_number: p.oem_number ?? "", interchange_number: p.interchange_number ?? "",
      condition: p.condition ?? "New", warranty_months: p.warranty_months ?? 12,
      core_charge_cents: p.core_charge_cents ?? 0, cost_cents: p.cost_cents ?? 0,
      fitment_notes: p.fitment_notes ?? "", location_in_store: p.location_in_store ?? "",
      image_url: p.image_url ?? null,
    } as any);
    setOpen(true);
  };

  const startNew = () => { setEditId(null); setForm({ ...blank }); setOpen(true); };

  const uploadImage = async (file: File) => {
    setImgUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${storeId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("part-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("part-images").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: data.publicUrl } as any));
    } catch (e: any) {
      toast.error(e.message ?? "Image upload failed");
    } finally {
      setImgUploading(false);
    }
  };

  const exportCsv = useCallback(() => {
    const header = "SKU,Name,Brand,Category,Condition,Price,Cost,Core Charge,Stock,OEM#,Interchange#,Warranty(mo),Location,Fitment Notes";
    const rows = parts.map(p =>
      [p.sku, p.name, p.brand ?? "", p.category ?? "", p.condition ?? "New",
       (p.price_cents / 100).toFixed(2), ((p.cost_cents ?? 0) / 100).toFixed(2),
       ((p.core_charge_cents ?? 0) / 100).toFixed(2), p.stock,
       p.oem_number ?? "", p.interchange_number ?? "", p.warranty_months ?? "",
       p.location_in_store ?? "", p.fitment_notes ?? ""]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `parts-catalog-${storeId.slice(0, 8)}.csv`; a.click();
  }, [parts, storeId]);

  return (
    <div className="space-y-4">

      {/* ── FREQUENTLY ORDERED / JOBS ─────────────────────────── */}
      <Card>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold tracking-wide uppercase text-foreground">Frequently Ordered / Jobs</h3>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
            onClick={() => {
              if (selectedJobs.size === 0) return;
              const firstCat = JOBS.find(j => selectedJobs.has(j.label))?.cats[0];
              if (firstCat) setCat(firstCat);
              const el = document.getElementById("parts-catalog-card");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}>
            <Search className="w-3 h-3" /> Look Up Parts
          </Button>
        </div>
        <CardContent className="pt-0 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
            {JOBS.map(j => (
              <label key={j.label} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedJobs.has(j.label)}
                  onChange={() => toggleJob(j.label)}
                  className="rounded border-border accent-primary w-4 h-4 shrink-0"
                />
                <span className={`text-[12px] leading-tight select-none group-hover:text-primary transition-colors ${selectedJobs.has(j.label) ? "font-semibold text-primary" : "text-foreground"}`}>
                  {j.label}
                </span>
              </label>
            ))}
          </div>
          {selectedJobs.size > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border">
                {selectedJobs.size} job{selectedJobs.size > 1 ? "s" : ""} selected
              </Badge>
              <button type="button" onClick={() => setSelectedJobs(new Set())}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MY ORDER STATUS ────────────────────────────────────── */}
      <Card>
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <h3 className="text-sm font-bold tracking-wide uppercase text-foreground flex-1">My Order Status</h3>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => refetchInvoices()}>
            <RefreshCw className="w-3 h-3" /> Refresh List
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs">View All</Button>
        </div>
        <CardContent className="pt-0 pb-3">
          {recentInvoices.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No invoices yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {recentInvoices.map(inv => {
                const vehicle = inv.vehicle_label
                  || [inv.vehicle_year, inv.vehicle_make, inv.vehicle_model].filter(Boolean).join(" ")
                  || "—";
                const statusColor = inv.status === "paid"
                  ? "bg-emerald-500"
                  : inv.status === "sent"
                  ? "bg-blue-500"
                  : inv.status === "draft"
                  ? "bg-gray-400"
                  : "bg-amber-500";
                const statusLabel = inv.status === "paid" ? "Delivered"
                  : inv.status === "sent" ? "Sent"
                  : inv.status === "draft" ? "Draft"
                  : inv.status;
                const date = new Date(inv.created_at);
                const dateStr = date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })
                  + " " + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={inv.id} className="flex items-center gap-3 py-2.5 hover:bg-muted/20 transition-colors px-1 rounded">
                    <div className={`w-8 h-8 rounded-full ${statusColor} flex items-center justify-center shrink-0`}>
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold">{statusLabel}</p>
                      <p className="text-[10px] text-muted-foreground">Order Placed {dateStr}</p>
                    </div>
                    <div className="flex-1 min-w-0 text-center hidden sm:block">
                      <p className="text-[12px] font-medium truncate">{vehicle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-mono text-muted-foreground">Invoice {inv.number}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock alert banner */}
      {(lowStock > 0 || outOfStock > 0) && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            {outOfStock > 0 && <span><strong>{outOfStock}</strong> part{outOfStock > 1 ? "s" : ""} out of stock · </span>}
            {lowStock > 0 && <span><strong>{lowStock}</strong> part{lowStock > 1 ? "s" : ""} running low</span>}
          </p>
          <button type="button" onClick={() => setLowStockOnly(s => !s)} className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline-offset-2 hover:underline">
            {lowStockOnly ? "Show all" : "View low stock"}
          </button>
        </div>
      )}

      {/* Vehicle fitment selector */}
      <Card>
        <button type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          onClick={() => setVehicleExpanded(s => !s)}
        >
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Shop by Vehicle</span>
            {vehicleActive && (
              <Badge variant="secondary" className="text-[10px]">
                {[vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ")}
              </Badge>
            )}
          </div>
          {vehicleExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {vehicleExpanded && (
          <CardContent className="pt-0 pb-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px] mb-1 block">Year</Label>
                <select value={vehicleYear} onChange={e => setVehicleYear(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="">Any year</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[11px] mb-1 block">Make</Label>
                <select value={vehicleMake} onChange={e => setVehicleMake(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="">Any make</option>
                  {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[11px] mb-1 block">Model</Label>
                <Input placeholder="e.g. Camry" className="h-9" value={vehicleModel}
                  onChange={e => setVehicleModel(e.target.value)} />
              </div>
            </div>
            {vehicleActive && (
              <button type="button" onClick={() => { setVehicleYear(""); setVehicleMake(""); setVehicleModel(""); }}
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" /> Clear vehicle
              </button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Search + toolbar */}
      <Card id="parts-catalog-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Parts Catalog
            <Badge variant="secondary" className="ml-1">{parts.length}</Badge>
            {lowStockOnly && <Badge className="bg-amber-500 text-white hover:bg-amber-500 text-[10px]">Low stock filter</Badge>}
            {selectedJobs.size > 0 && <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px]">{selectedJobs.size} job{selectedJobs.size > 1 ? "s" : ""}</Badge>}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <input
              ref={csvRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) importCsv.mutate(f); }}
            />
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs hidden sm:flex" onClick={exportCsv} disabled={parts.length === 0}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs hidden sm:flex" onClick={() => csvRef.current?.click()} disabled={importCsv.isPending}>
              <Upload className="w-3.5 h-3.5" /> {importCsv.isPending ? "Importing…" : "Import CSV"}
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={startNew}>
              <Plus className="w-3.5 h-3.5" /> Add Part
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, brand, or OEM/interchange number..."
              className="pl-9"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATS.map(c => (
              <Button key={c} size="sm" variant={cat === c ? "default" : "outline"}
                onClick={() => setCat(c)} className="h-7 px-3 text-xs shrink-0">{c}</Button>
            ))}
          </div>

          {/* Sort + view */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Sort:</span>
              {(["name", "price", "stock", "brand"] as SortKey[]).map(k => (
                <button type="button" key={k} onClick={() => toggleSort(k)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors shrink-0 ${sort === k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                  {sort === k && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>
            <div className="flex border rounded-md overflow-hidden shrink-0">
              <button type="button" onClick={() => setView("grid")}
                className={`p-1.5 transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => setView("list")}
                className={`p-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parts */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[0,1,2,3,4,5].map(i => <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : parts.length === 0 ? (
        <Card><CardContent className="py-12 text-center space-y-3">
          <Package className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="font-semibold">Your parts catalog is empty</p>
          <p className="text-sm text-muted-foreground">Add parts manually or import a real CSV catalog to get going.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button size="sm" onClick={startNew} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add a part</Button>
            <Button size="sm" variant="outline" onClick={() => csvRef.current?.click()} disabled={importCsv.isPending} className="gap-1.5">
              <Upload className="w-3.5 h-3.5" /> {importCsv.isPending ? "Importing..." : "Import CSV"}
            </Button>
          </div>
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No parts match your filters.</div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(p => <PartCard key={p.id} part={p} onEdit={startEdit} onAdjust={p => { setAdjustPart(p); setAdjustDelta("0"); setAdjustMode("receive"); }} onRemove={(id) => { if (confirm(`Remove ${p.name}?`)) remove.mutate(id); }} />)}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-border/50">
            {/* List header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Part</span><span>Brand</span><span>Price</span><span>Stock</span><span></span>
            </div>
            {filtered.map(p => (
              <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 items-center hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium leading-tight">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.sku}{p.oem_number ? ` · OEM: ${p.oem_number}` : ""}</p>
                  <div className="flex gap-1 mt-0.5">{conditionBadge(p.condition)}</div>
                </div>
                <span className="text-sm">{p.brand ?? "—"}</span>
                <div>
                  <span className="text-sm font-bold">${(p.price_cents / 100).toFixed(2)}</span>
                  {p.core_charge_cents ? <p className="text-[10px] text-muted-foreground">+${(p.core_charge_cents / 100).toFixed(2)} core</p> : null}
                </div>
                {stockBadge(p.stock)}
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" title="Adjust stock" onClick={() => { setAdjustPart(p); setAdjustDelta("0"); setAdjustMode("receive"); }}><PackagePlus className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(`Remove ${p.name}?`)) remove.mutate(p.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Suppliers */}
      <SuppliersNetworkCard query={q} storeId={storeId} />

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Part" : "Add Part"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Row 1: SKU + Brand */}
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">SKU *</Label><Input className="mt-1" placeholder="SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label className="text-xs">Brand</Label><Input className="mt-1" placeholder="Akebono" value={form.brand ?? ""} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
            </div>
            {/* Row 2: Name */}
            <div><Label className="text-xs">Part Name *</Label><Input className="mt-1" placeholder="Ceramic Brake Pads (Front)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            {/* Row 3: Category + Condition */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  {CATS.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Condition</Label>
                <select value={form.condition ?? "New"} onChange={e => setForm({ ...form, condition: e.target.value })}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {/* Row 4: OEM + Interchange */}
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">OEM Part #</Label><Input className="mt-1" placeholder="D1275" value={form.oem_number ?? ""} onChange={e => setForm({ ...form, oem_number: e.target.value })} /></div>
              <div><Label className="text-xs">Interchange #</Label><Input className="mt-1" placeholder="Cross-ref number" value={form.interchange_number ?? ""} onChange={e => setForm({ ...form, interchange_number: e.target.value })} /></div>
            </div>
            {/* Row 5: Price + Cost + Core */}
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Retail Price ($)</Label><Input className="mt-1" inputMode="decimal" placeholder="89.99" value={form.price} onChange={e => setForm({ ...form, price: e.target.value.replace(/[^0-9.]/g, "") })} /></div>
              <div><Label className="text-xs">Your Cost ($)</Label><Input className="mt-1" inputMode="decimal" placeholder="55.00" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value.replace(/[^0-9.]/g, "") })} /></div>
              <div><Label className="text-xs">Core Charge ($)</Label><Input className="mt-1" inputMode="decimal" placeholder="0.00" value={form.core} onChange={e => setForm({ ...form, core: e.target.value.replace(/[^0-9.]/g, "") })} /></div>
            </div>
            {/* Row 6: Stock + Warranty + Location */}
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Stock Qty</Label><Input className="mt-1" inputMode="numeric" placeholder="0" value={String(form.stock)} onChange={e => setForm({ ...form, stock: parseInt(e.target.value.replace(/\D/g, "") || "0", 10) })} /></div>
              <div><Label className="text-xs">Warranty (months)</Label><Input className="mt-1" inputMode="numeric" placeholder="12" value={String(form.warranty_months ?? "")} onChange={e => setForm({ ...form, warranty_months: parseInt(e.target.value.replace(/\D/g, "") || "0", 10) })} /></div>
              <div><Label className="text-xs">Shelf / Location</Label><Input className="mt-1" placeholder="Aisle B-3" value={form.location_in_store ?? ""} onChange={e => setForm({ ...form, location_in_store: e.target.value })} /></div>
            </div>
            {/* Fitment notes */}
            <div>
              <Label className="text-xs">Fitment Notes</Label>
              <textarea
                rows={2}
                placeholder="Fits 2015-2023 Toyota Camry, Honda Accord..."
                value={form.fitment_notes ?? ""}
                onChange={e => setForm({ ...form, fitment_notes: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Image */}
            <div>
              <Label className="text-xs">Part Image</Label>
              <div className="mt-1 flex items-center gap-3">
                {(form as any).image_url
	                  ? (
	                    <img
	                      src={(form as any).image_url}
	                      alt="part"
	                      className="h-16 w-16 rounded-lg object-cover border"
	                      loading="lazy"
	                      decoding="async"
	                    />
	                  )
                  : <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/40">
                      <Package className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                }
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                  <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors ${imgUploading ? "opacity-50 pointer-events-none" : ""}`}>
                    <ImagePlus className="w-3.5 h-3.5" /> {imgUploading ? "Uploading…" : "Upload image"}
                  </span>
                </label>
                {(form as any).image_url && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, image_url: null } as any))}
                    className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                    <X className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending || imgUploading}>
              {upsert.isPending ? "Saving..." : editId ? "Save changes" : "Add part"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjust Dialog */}
      <Dialog open={!!adjustPart} onOpenChange={o => { if (!o) setAdjustPart(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PackagePlus className="w-4 h-4" /> Adjust Stock</DialogTitle></DialogHeader>
          {adjustPart && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{adjustPart.name}</p>
                <p className="text-xs text-muted-foreground">{adjustPart.sku} · Current stock: <strong>{adjustPart.stock}</strong></p>
              </div>
              {/* Mode tabs */}
              <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                {(["receive", "use", "set"] as const).map(m => (
                  <button type="button" key={m} onClick={() => setAdjustMode(m)}
                    className={`flex-1 py-1.5 font-medium transition-colors ${adjustMode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {m === "receive" ? "Receive" : m === "use" ? "Use / Consume" : "Set Exact"}
                  </button>
                ))}
              </div>
              {/* Quick buttons */}
              {adjustMode !== "set" && (
                <div className="flex gap-1.5">
                  {[1, 5, 10, 25].map(n => (
                    <button type="button" key={n} onClick={() => setAdjustDelta(String(n))}
                      className="flex-1 text-xs py-1.5 rounded-md border border-border hover:bg-muted transition-colors">
                      {adjustMode === "receive" ? `+${n}` : `-${n}`}
                    </button>
                  ))}
                </div>
              )}
              {/* Input */}
              <div>
                <Label className="text-xs">{adjustMode === "set" ? "New quantity" : adjustMode === "receive" ? "Quantity received" : "Quantity used"}</Label>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  placeholder="0"
                  value={adjustDelta}
                  onChange={e => setAdjustDelta(e.target.value.replace(/\D/g, ""))}
                />
                {adjustMode !== "set" && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    New stock: <strong>{Math.max(0, adjustPart.stock + (adjustMode === "receive" ? 1 : -1) * (parseInt(adjustDelta || "0", 10)))}</strong>
                  </p>
                )}
                {adjustMode === "set" && (
                  <p className="text-[11px] text-muted-foreground mt-1">Will set stock to exactly {adjustDelta || "0"}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustPart(null)}>Cancel</Button>
            <Button
              disabled={adjustStock.isPending}
              onClick={() => {
                if (!adjustPart) return;
                const n = parseInt(adjustDelta || "0", 10);
                const newStock = adjustMode === "set"
                  ? Math.max(0, n)
                  : adjustMode === "receive"
                  ? adjustPart.stock + n
                  : Math.max(0, adjustPart.stock - n);
                adjustStock.mutate({ id: adjustPart.id, newStock });
              }}>
              {adjustStock.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Part Card ─────────────────────────────────────────────── */
function PartCard({ part: p, onEdit, onAdjust, onRemove }: { part: Part; onEdit: (p: Part) => void; onAdjust: (p: Part) => void; onRemove: (id: string) => void }) {
  const margin = p.cost_cents && p.price_cents > p.cost_cents
    ? Math.round(((p.price_cents - p.cost_cents) / p.price_cents) * 100)
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      <CardContent className="p-0">
        {/* Image */}
        <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center relative">
          {p.image_url
	            ? (
	              <img
	                src={p.image_url}
	                alt={p.name}
	                className="w-full h-full object-cover"
	                loading="lazy"
	                decoding="async"
	              />
	            )
            : <Package className="w-10 h-10 text-muted-foreground/30" />}
          <div className="absolute top-1.5 left-1.5 flex gap-1 flex-wrap">
            {conditionBadge(p.condition)}
          </div>
          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="h-7 w-7 shadow-sm text-emerald-700" title="Adjust stock" onClick={() => onAdjust(p)}><PackagePlus className="w-3.5 h-3.5" /></Button>
            <Button size="icon" variant="secondary" className="h-7 w-7 shadow-sm" onClick={() => onEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button size="icon" variant="secondary" className="h-7 w-7 shadow-sm text-destructive" onClick={() => onRemove(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 space-y-1.5">
          <div>
            <p className="text-[11px] text-muted-foreground truncate">{p.brand || "—"} · <span className="font-mono">{p.sku}</span></p>
            <p className="text-sm font-semibold leading-tight line-clamp-2">{p.name}</p>
          </div>

          {p.oem_number && (
            <p className="text-[10px] text-muted-foreground">OEM: <span className="font-mono">{p.oem_number}</span></p>
          )}

          {p.fitment_notes && (
            <p className="text-[10px] text-muted-foreground line-clamp-1 italic">{p.fitment_notes}</p>
          )}

          <div className="flex items-end justify-between pt-0.5">
            <div>
              <span className="text-base font-bold">${(p.price_cents / 100).toFixed(2)}</span>
              {p.core_charge_cents ? (
                <p className="text-[10px] text-muted-foreground">+${(p.core_charge_cents / 100).toFixed(2)} core</p>
              ) : null}
              {margin !== null && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{margin}% margin</p>
              )}
            </div>
            <div className="text-right">
              {stockBadge(p.stock)}
              {p.warranty_months ? (
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.warranty_months}mo warranty</p>
              ) : null}
            </div>
          </div>

          {p.location_in_store && (
            <p className="text-[10px] text-muted-foreground/70">📍 {p.location_in_store}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Suppliers Network ──────────────────────────────────────── */
const SUPPLIER_CATEGORIES = ["All", "Retail Chain", "OE / Dealer", "Wholesale Distributor", "Online Marketplace", "Specialty"] as const;

function SuppliersNetworkCard({ query, storeId }: { query: string; storeId: string }) {
  const [supCat, setSupCat] = useState<(typeof SUPPLIER_CATEGORIES)[number]>("All");
  const [supQ, setSupQ] = useState("");
  const [activeSupplier, setActiveSupplier] = useState<PartsSupplier | null>(null);
  const [savedSupplierIds, setSavedSupplierIds] = useState<Set<string>>(() => new Set(
    PARTS_SUPPLIERS.filter(s => {
      try { return !!localStorage.getItem(`zivo.supplierCreds.${storeId}.${s.id}`); } catch { return false; }
    }).map(s => s.id)
  ));

  const refreshSaved = () => setSavedSupplierIds(new Set(
    PARTS_SUPPLIERS.filter(s => {
      try { return !!localStorage.getItem(`zivo.supplierCreds.${storeId}.${s.id}`); } catch { return false; }
    }).map(s => s.id)
  ));

  const list = useMemo(() => {
    const q = supQ.trim().toLowerCase();
    return PARTS_SUPPLIERS.filter(s =>
      (supCat === "All" || s.category === supCat) &&
      (!q || s.name.toLowerCase().includes(q) || (s.shortName?.toLowerCase().includes(q) ?? false))
    );
  }, [supCat, supQ]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Store className="w-4 h-4" /> Parts Suppliers
          <Badge variant="outline" className="ml-1 text-[10px]">{PARTS_SUPPLIERS.length}</Badge>
          {query && <Badge variant="secondary" className="ml-1 text-[10px]">Search: {query}</Badge>}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">Click a supplier to open their ordering portal. Credentials are saved on this device only.</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search suppliers (AutoZone, NAPA, RockAuto...)" value={supQ} onChange={e => setSupQ(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {SUPPLIER_CATEGORIES.map(c => (
            <Button key={c} size="sm" variant={supCat === c ? "default" : "outline"}
              onClick={() => setSupCat(c)} className="h-7 px-3 text-xs shrink-0">{c}</Button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1.5 max-h-[320px] overflow-auto">
          {list.map(s => (
            <button type="button" key={s.id} onClick={() => setActiveSupplier(s)}
              className="flex items-center gap-2.5 text-left text-[12px] border border-border rounded-lg px-2.5 py-2 hover:border-primary hover:bg-primary/5 transition-colors group">
              <PartsSupplierLogo supplier={s} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{s.shortName ?? s.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {savedSupplierIds.has(s.id) ? "✓ Account saved" : (s.description ?? s.category)}
                </p>
              </div>
              {savedSupplierIds.has(s.id)
                ? <KeyRound className="w-3 h-3 text-primary shrink-0" />
                : <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          ))}
          {list.length === 0 && <p className="text-xs text-muted-foreground col-span-full text-center py-4">No suppliers match.</p>}
        </div>
      </CardContent>

      <SupplierBrowserModal
        storeId={storeId}
        supplier={activeSupplier}
        query={query}
        open={!!activeSupplier}
        onOpenChange={o => { if (!o) { refreshSaved(); setActiveSupplier(null); } }}
      />
    </Card>
  );
}
