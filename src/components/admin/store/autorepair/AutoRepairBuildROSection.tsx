/**
 * Auto Repair — "Build R.O." console (VSM-style repair-order / estimate builder).
 *
 * Phase 1: the full single-screen builder shell.
 *   • Left rail   — item-type buttons (Labor / Part / Tire / Fee / Sublet / Note / Canned Job / Concern)
 *   • Center      — job-grouped line grid (Type · Description · Misc · Price · Qty · Disc · Tax · Total)
 *                   + customer / vehicle header + intake notes (Customer Request / Diagnosis / Recommendation
 *                   / Warranty / Internal)
 *   • Right       — Estimate Summary (Parts/Tires/Labor/Sublet → SubTotal → Fees/EPA/Shop Supplies/Discount/Tax
 *                   → Total), vehicle-data mini panel, and shortcuts into the existing AR sections.
 *   • Bottom bar  — service presets, Build R.O. (save), Print, New / Open.
 *
 * Persists to the existing `ar_estimates` table (line_items is free-form jsonb, so the extended per-line
 * fields ride along; the legacy {kind,name,qty,unit_cents} keys are kept so the simple Estimates list and
 * the print/share flows keep working). No database changes — clean note/PO round-tripping lands in Phase 2.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ServiceCatalogPickerDialog, { type ServiceCatalogPick } from "./ServiceCatalogPickerDialog";
import LaborGuidePickerDialog from "./LaborGuidePickerDialog";
import VehicleHistoryDialog from "./VehicleHistoryDialog";
import type { LaborGuideEntry } from "@/lib/laborGuide";
import {
  Wrench, Package, CircleDot, Receipt, Truck, StickyNote, BookOpen, AlertTriangle,
  Plus, Trash2, Search, Car, FileSignature, Printer, Save, FilePlus2, FolderOpen,
  History, ClipboardCheck, Activity, CreditCard, Gauge, ShieldCheck, ChevronDown,
  Link2, X, UserPlus,
} from "lucide-react";

type GarageVehicle = {
  id: string;
  store_id: string;
  owner_name: string;
  owner_phone?: string | null;
  owner_email?: string | null;
  year?: number | null;
  make: string;
  model: string;
  vin?: string | null;
  plate?: string | null;
  color?: string | null;
  mileage?: number | null;
  notes?: string | null;
  created_at: string;
};

interface Props {
  storeId: string;
  /** Jump to another AR tab (Service History, Inspections, Payments…). */
  onNavigate?: (tab: string) => void;
}

type LineKind = "labor" | "part" | "tire" | "fee" | "sublet" | "note" | "diagnosis" | "concern";

interface ROLine {
  id: string;
  job: number;
  kind: LineKind;
  /** Description shown in the grid. Mirrored to `name` on save for legacy readers. */
  description: string;
  misc: string;
  part_number: string;
  vendor: string;
  cost_cents: number;   // your cost (parts) — informational, drives margin
  unit_cents: number;   // sell price per unit (labor: rate × hours collapses into unit×qty)
  qty: number;
  disc: number;         // discount amount; interpreted by disc_type
  disc_type: "%" | "$";
  taxable: boolean;
}

const KIND_META: Record<LineKind, { label: string; icon: typeof Wrench }> = {
  labor: { label: "Labor", icon: Wrench },
  part: { label: "Part", icon: Package },
  tire: { label: "Tire", icon: CircleDot },
  fee: { label: "Fee", icon: Receipt },
  sublet: { label: "Sublet", icon: Truck },
  note: { label: "Note", icon: StickyNote },
  diagnosis: { label: "Diag", icon: Search },
  concern: { label: "Concern", icon: AlertTriangle },
};

const RAIL: LineKind[] = ["labor", "part", "tire", "fee", "sublet", "note", "diagnosis", "concern"];
const APPOINTMENT_TYPES = ["Stay With Vehicle", "Drop Off", "Waiter", "Pick-up & Delivery", "Towed In"];
const PAYMENT_METHODS = ["", "Cash", "Card", "Check", "Fleet / PO", "KHQR", "Other"];

const money = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dollarsToCents = (v: string | number) => Math.round((Number(v) || 0) * 100);
const centsToDollars = (c: number) => (c ? (c / 100).toString() : "");
const uid = () => `${Date.now().toString(36)}${Math.floor(performance.now() % 1000).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const blankLine = (job: number, kind: LineKind): ROLine => ({
  id: uid(),
  job,
  kind,
  description: "",
  misc: "",
  part_number: "",
  vendor: "",
  cost_cents: 0,
  unit_cents: 0,
  qty: kind === "labor" ? 1 : kind === "note" || kind === "concern" ? 0 : 1,
  disc: 0,
  disc_type: "%",
  taxable: kind === "part" || kind === "tire",
});

/** Per-line discount in cents. */
const lineDiscountCents = (l: ROLine) => {
  const base = l.qty * l.unit_cents;
  return l.disc_type === "%" ? Math.round((base * (l.disc || 0)) / 100) : dollarsToCents(l.disc);
};
const lineTotalCents = (l: ROLine) => Math.max(0, l.qty * l.unit_cents - lineDiscountCents(l));

const blankHeader = {
  number: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  vehicle_label: "",
  vehicle_color: "",
  unit_number: "",
  license_plate: "",
  plate_state: "",
  keytag: "",
  mileage_in: "",
  service_writer: "",
  technician: "",
  technician_cert: "",
  appointment_type: "Stay With Vehicle",
  payment_method: "",
  promised_at: "",
  labor_rate: "100",
  customer_request: "",
  diagnosis: "",
  recommendation: "",
  warranty: "",
  internal: "",
};
type HeaderForm = typeof blankHeader;

const NOTE_TABS = [
  { key: "customer_request", label: "Customer Request" },
  { key: "diagnosis", label: "Diagnosis" },
  { key: "recommendation", label: "Recommendation" },
] as const;

/** Compose the structured intake notes into the single `ar_estimates.notes` column (Phase 1, no schema change). */
const composeNotes = (h: HeaderForm) => {
  const parts: string[] = [];
  if (h.customer_request.trim()) parts.push(`Customer Request: ${h.customer_request.trim()}`);
  if (h.diagnosis.trim()) parts.push(`Diagnosis: ${h.diagnosis.trim()}`);
  if (h.recommendation.trim()) parts.push(`Recommendation: ${h.recommendation.trim()}`);
  if (h.warranty.trim()) parts.push(`Warranty: ${h.warranty.trim()}`);
  if (h.internal.trim()) parts.push(`Internal: ${h.internal.trim()}`);
  return parts.join("\n\n");
};
/** Best-effort reverse of composeNotes when loading an estimate that was saved by this builder. */
const parseNotes = (notes: string | null): Partial<HeaderForm> => {
  const out: Partial<HeaderForm> = {};
  if (!notes) return out;
  const map: Record<string, keyof HeaderForm> = {
    "Customer Request": "customer_request", Diagnosis: "diagnosis",
    Recommendation: "recommendation", Warranty: "warranty", Internal: "internal",
  };
  const blocks = notes.split(/\n\n+/);
  let matchedAny = false;
  for (const b of blocks) {
    const m = b.match(/^([A-Za-z ]+):\s*([\s\S]*)$/);
    if (m && map[m[1].trim()]) { out[map[m[1].trim()]] = m[2].trim() as never; matchedAny = true; }
  }
  if (!matchedAny) out.customer_request = notes;
  return out;
};

/** Coerce a stored line (legacy or extended) into a full ROLine. */
const coerceLine = (raw: any, idx: number): ROLine => {
  const kind: LineKind = (["labor", "part", "tire", "fee", "sublet", "note", "diagnosis", "concern"] as LineKind[])
    .includes(raw?.kind) ? raw.kind : "labor";
  return {
    id: raw?.id ?? uid(),
    job: Number(raw?.job) || 1,
    kind,
    description: raw?.description ?? raw?.name ?? "",
    misc: raw?.misc ?? "",
    part_number: raw?.part_number ?? "",
    vendor: raw?.vendor ?? "",
    cost_cents: Number(raw?.cost_cents) || 0,
    unit_cents: Number(raw?.unit_cents) || 0,
    qty: raw?.qty != null ? Number(raw.qty) : 1,
    disc: Number(raw?.disc) || 0,
    disc_type: raw?.disc_type === "$" ? "$" : "%",
    taxable: raw?.taxable ?? (kind === "part" || kind === "tire"),
  };
};

export default function AutoRepairBuildROSection({ storeId, onNavigate }: Props) {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderForm>(blankHeader);
  const [lines, setLines] = useState<ROLine[]>([]);
  const [jobs, setJobs] = useState<number[]>([1]);
  const [noteTab, setNoteTab] = useState<(typeof NOTE_TABS)[number]["key"]>("customer_request");
  const [activeJob, setActiveJob] = useState(1);
  const [openPicker, setOpenPicker] = useState(false);
  const [openLabor, setOpenLabor] = useState(false);
  const [openLoad, setOpenLoad] = useState(false);

  const setH = (patch: Partial<HeaderForm>) => setHeader((h) => ({ ...h, ...patch }));

  // Add-on charge fields (feed the totals box).
  const [feesC, setFeesC] = useState(0);
  const [epaC, setEpaC] = useState(0);
  const [suppliesC, setSuppliesC] = useState(0);
  const [discountC, setDiscountC] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [droppedOff, setDroppedOff] = useState(false);

  // ── Recent estimates (for the Open dropdown) ──
  const { data: recent = [] } = useQuery({
    queryKey: ["ar-build-ro-recent", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_estimates" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // ── Customer / vehicle binding ──
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [boundVehicle, setBoundVehicle] = useState<GarageVehicle | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: garage = [] } = useQuery({
    queryKey: ["ar-build-ro-garage", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_customer_vehicles")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GarageVehicle[];
    },
  });

  const searchResults = useMemo(() => {
    const s = custSearch.trim().toLowerCase();
    if (!s) return [];
    return garage
      .filter((v) =>
        `${v.owner_name} ${v.owner_phone ?? ""} ${v.plate ?? ""} ${v.vin ?? ""} ${v.year ?? ""} ${v.make} ${v.model}`
          .toLowerCase()
          .includes(s),
      )
      .slice(0, 8);
  }, [garage, custSearch]);

  // Last-service summary for the bound/typed vehicle (matched by label across invoices + work orders).
  const vehLabel = header.vehicle_label.trim();
  const { data: lastService } = useQuery({
    queryKey: ["ar-build-ro-lastservice", storeId, vehLabel],
    enabled: !!vehLabel,
    queryFn: async () => {
      const [inv, wo] = await Promise.all([
        supabase.from("ar_invoices" as any).select("created_at, mileage_in, mileage_out")
          .eq("store_id", storeId).eq("vehicle_label", vehLabel).order("created_at", { ascending: false }).limit(1),
        supabase.from("ar_work_orders" as any).select("created_at")
          .eq("store_id", storeId).eq("vehicle_label", vehLabel).order("created_at", { ascending: false }).limit(1),
      ]);
      const invRow: any = inv.data?.[0];
      const woRow: any = wo.data?.[0];
      const dates = [invRow?.created_at, woRow?.created_at].filter(Boolean) as string[];
      const lastDate = dates.sort().slice(-1)[0] ?? null;
      const lastMileage = invRow?.mileage_out ?? invRow?.mileage_in ?? null;
      return { lastDate, lastMileage };
    },
  });

  const bindVehicle = (v: GarageVehicle) => {
    setVehicleId(v.id);
    setBoundVehicle(v);
    setHeader((h) => ({
      ...h,
      customer_name: v.owner_name ?? "",
      customer_phone: v.owner_phone ?? "",
      customer_email: v.owner_email ?? "",
      vehicle_label: [v.year, v.make, v.model].filter(Boolean).join(" "),
      license_plate: v.plate ?? "",
      vehicle_color: v.color ?? "",
      mileage_in: v.mileage ? String(v.mileage) : h.mileage_in,
    }));
    setCustSearch("");
    setSearchOpen(false);
    toast.success(`Linked ${[v.year, v.make, v.model].filter(Boolean).join(" ")}`);
  };
  const unbind = () => { setVehicleId(null); setBoundVehicle(null); };

  const saveToGarage = useMutation({
    mutationFn: async () => {
      if (!header.customer_name.trim()) throw new Error("Enter a customer name first");
      const label = header.vehicle_label.trim();
      if (!label) throw new Error("Enter the vehicle first");
      const parts = label.split(/\s+/);
      let year: number | null = null;
      let rest = parts;
      if (/^\d{4}$/.test(parts[0])) { year = parseInt(parts[0], 10); rest = parts.slice(1); }
      const make = rest[0] ?? label;
      const model = rest.slice(1).join(" ") || "—";
      const payload = {
        store_id: storeId,
        owner_name: header.customer_name.trim(),
        owner_phone: header.customer_phone.trim() || null,
        owner_email: header.customer_email.trim() || null,
        year, make, model,
        plate: header.license_plate.trim() || null,
        color: header.vehicle_color.trim().toLowerCase() || null,
        mileage: header.mileage_in ? parseInt(header.mileage_in, 10) : 0,
      };
      const { data, error } = await supabase.from("ar_customer_vehicles").insert(payload).select("*").single();
      if (error) throw error;
      return data as unknown as GarageVehicle;
    },
    onSuccess: (v) => {
      setVehicleId(v.id);
      setBoundVehicle(v);
      qc.invalidateQueries({ queryKey: ["ar-build-ro-garage", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-customer-vehicles", storeId] });
      toast.success("Saved to garage");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save vehicle"),
  });

  // ── Totals ──
  const t = useMemo(() => {
    const by = (k: LineKind) => lines.filter((l) => l.kind === k).reduce((s, l) => s + lineTotalCents(l), 0);
    const parts = by("part");
    const tires = by("tire");
    const labor = by("labor");
    const sublet = by("sublet");
    const lineSubtotal = lines.reduce((s, l) => s + lineTotalCents(l), 0);
    const taxableBase = lines.filter((l) => l.taxable).reduce((s, l) => s + lineTotalCents(l), 0);
    const tax = Math.round((taxableBase * taxRate) / 100);
    const total = Math.max(0, lineSubtotal + feesC + epaC + suppliesC - discountC + tax);
    const cost = lines.reduce((s, l) => s + l.cost_cents * l.qty, 0);
    const margin = lineSubtotal > 0 ? ((lineSubtotal - cost) / lineSubtotal) * 100 : 0;
    return { parts, tires, labor, sublet, lineSubtotal, taxableBase, tax, total, margin };
  }, [lines, feesC, epaC, suppliesC, discountC, taxRate]);

  // ── Line ops ──
  const addLine = (kind: LineKind) => setLines((a) => [...a, blankLine(activeJob, kind)]);
  const patchLine = (id: string, patch: Partial<ROLine>) =>
    setLines((a) => a.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) => setLines((a) => a.filter((l) => l.id !== id));
  const addJob = () => {
    const next = (jobs[jobs.length - 1] || 0) + 1;
    setJobs((j) => [...j, next]);
    setActiveJob(next);
  };

  const appendPicks = (picks: { kind: LineKind; name: string; qty: number; unit_cents: number }[]) => {
    setLines((a) => [
      ...a,
      ...picks.map((p) => ({ ...blankLine(activeJob, p.kind), description: p.name, qty: p.qty, unit_cents: p.unit_cents })),
    ]);
  };

  // ── Presets (canned jobs). Phase 3 wires these to real templates; for now they seed sensible lines. ──
  const laborRateC = dollarsToCents(header.labor_rate);
  const applyPreset = (preset: string) => {
    const L = (description: string, hours: number): ROLine => ({ ...blankLine(activeJob, "labor"), description, qty: hours, unit_cents: laborRateC });
    const P = (description: string, sell: number): ROLine => ({ ...blankLine(activeJob, "part"), description, qty: 1, unit_cents: dollarsToCents(sell), taxable: true });
    const seeds: Record<string, ROLine[]> = {
      Basic: [L("Lube, Oil & Filter — labor", 0.5), P("Engine oil (5 qt)", 32), P("Oil filter", 9)],
      "Full Service": [L("Full service inspection — labor", 1), L("Lube, Oil & Filter — labor", 0.5), P("Engine oil (5 qt)", 32), P("Oil filter", 9), P("Air filter", 18)],
      Premium: [L("Premium service — labor", 1.5), P("Synthetic oil (6 qt)", 58), P("Oil filter", 12), P("Cabin air filter", 24), L("Tire rotation — labor", 0.4)],
      Alignment: [L("4-wheel alignment — labor", 1)],
      Diagnosis: [{ ...blankLine(activeJob, "diagnosis"), description: "Diagnostic — scan & inspect", qty: 1, unit_cents: laborRateC }],
      Cert: [L("State / safety certification — labor", 0.5)],
    };
    const seed = seeds[preset];
    if (!seed) return;
    setLines((a) => [...a, ...seed]);
    toast.success(`${preset} added — ${seed.length} line${seed.length === 1 ? "" : "s"}`);
  };

  // ── New / Load ──
  const resetAll = () => {
    setEditId(null);
    setHeader(blankHeader);
    setLines([]);
    setJobs([1]);
    setActiveJob(1);
    setFeesC(0); setEpaC(0); setSuppliesC(0); setDiscountC(0); setTaxRate(0);
    setDroppedOff(false);
    unbind();
    setCustSearch("");
  };

  const loadEstimate = (e: any) => {
    setEditId(e.id);
    unbind();
    setHeader({
      ...blankHeader,
      number: e.number ?? "",
      customer_name: e.customer_name ?? "",
      customer_phone: e.customer_phone ?? "",
      customer_email: e.customer_email ?? "",
      vehicle_label: e.vehicle_label ?? "",
      vehicle_color: e.vehicle_color ?? "",
      unit_number: e.unit_number ?? "",
      license_plate: e.license_plate ?? "",
      plate_state: e.plate_state ?? "",
      keytag: e.keytag ?? "",
      mileage_in: e.mileage_in != null ? String(e.mileage_in) : "",
      service_writer: e.service_writer ?? "",
      technician: e.technician ?? "",
      technician_cert: e.technician_cert ?? "",
      payment_method: e.payment_method ?? "",
      promised_at: e.promised_at ?? "",
      labor_rate: blankHeader.labor_rate,
      ...parseNotes(e.notes ?? null),
    });
    const ls = Array.isArray(e.line_items) ? e.line_items.map(coerceLine) : [];
    setLines(ls);
    const js = Array.from(new Set(ls.map((l) => l.job))).sort((a, b) => a - b);
    setJobs(js.length ? js : [1]);
    setActiveJob(js[0] ?? 1);
    setFeesC(e.fees_cents ?? 0);
    setEpaC(e.epa_cents ?? 0);
    setSuppliesC(e.shop_supplies_cents ?? 0);
    setDiscountC(e.discount_cents ?? 0);
    setTaxRate(e.tax_rate != null ? Number(e.tax_rate) : 0);
    setOpenLoad(false);
    toast.success(`Loaded ${e.number ?? "estimate"}`);
  };

  // ── Save ──
  const save = useMutation({
    mutationFn: async (authorize: boolean) => {
      const payload: any = {
        store_id: storeId,
        number: header.number || `EST-${Date.now().toString().slice(-6)}`,
        customer_name: header.customer_name || null,
        customer_phone: header.customer_phone || null,
        customer_email: header.customer_email || null,
        vehicle_label: header.vehicle_label || null,
        vehicle_color: header.vehicle_color || null,
        unit_number: header.unit_number || null,
        license_plate: header.license_plate || null,
        plate_state: header.plate_state || null,
        keytag: header.keytag || null,
        mileage_in: header.mileage_in ? Number(header.mileage_in) : null,
        service_writer: header.service_writer || null,
        technician: header.technician || null,
        technician_cert: header.technician_cert || null,
        payment_method: header.payment_method || null,
        promised_at: header.promised_at || null,
        // line_items keep both the extended fields and the legacy {name} alias.
        line_items: lines.map((l) => ({ ...l, name: l.description })),
        subtotal_cents: t.lineSubtotal,
        sublet_cents: t.sublet,
        fees_cents: feesC,
        epa_cents: epaC,
        shop_supplies_cents: suppliesC,
        discount_cents: discountC,
        tax_rate: taxRate,
        tax_cents: t.tax,
        total_cents: t.total,
        notes: composeNotes(header) || null,
      };
      if (editId) {
        if (authorize) payload.status = "approved";
        const { error } = await supabase.from("ar_estimates" as any).update(payload).eq("id", editId);
        if (error) throw error;
        return editId;
      }
      payload.status = authorize ? "approved" : "draft";
      const { data, error } = await supabase.from("ar_estimates" as any).insert(payload).select("id, number").single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: (id, authorize) => {
      setEditId(id);
      qc.invalidateQueries({ queryKey: ["ar-build-ro-recent", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] });
      toast.success(authorize ? "Authorized & saved" : "Repair order saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const printRO = () => {
    if (!lines.length) { toast.error("Add at least one line first"); return; }
    const rows = lines
      .map(
        (l) =>
          `<tr><td>${KIND_META[l.kind].label}</td><td>${l.description || "—"}${l.misc ? ` <span style="color:#888">(${l.misc})</span>` : ""}</td><td class="r">${l.qty}</td><td class="r">${money(l.unit_cents)}</td><td class="r">${money(lineTotalCents(l))}</td></tr>`,
      )
      .join("");
    const html = `<html><head><title>RO ${header.number || ""}</title><style>
      body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0}
      table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left}
      th{font-size:11px;text-transform:uppercase;color:#666}.r{text-align:right}.tot{font-size:18px;font-weight:700}</style></head><body>
      <h1>Repair Order ${header.number || ""}</h1>
      <p><b>Customer:</b> ${header.customer_name || "—"} &nbsp;|&nbsp; <b>Vehicle:</b> ${header.vehicle_label || "—"}${header.license_plate ? ` (${header.license_plate})` : ""}</p>
      <table><tr><th>Type</th><th>Description</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr>${rows}</table>
      <div style="margin-top:16px;text-align:right">
        <p>Parts: ${money(t.parts)} &nbsp; Labor: ${money(t.labor)} &nbsp; Tires: ${money(t.tires)} &nbsp; Sublet: ${money(t.sublet)}</p>
        <p>SubTotal: ${money(t.lineSubtotal)} &nbsp; Fees: ${money(feesC)} &nbsp; EPA: ${money(epaC)} &nbsp; Supplies: ${money(suppliesC)}</p>
        <p>Discount: -${money(discountC)} &nbsp; Tax: ${money(t.tax)}</p>
        <p class="tot">Total: ${money(t.total)}</p>
      </div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Pop-up blocked"); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  const shortcuts: { label: string; icon: typeof Wrench; onClick?: () => void }[] = [
    { label: "Summary", icon: FileSignature },
    { label: "Service History", icon: History, onClick: () => boundVehicle ? setHistoryOpen(true) : onNavigate?.("ar-vehicles") },
    { label: "Vehicle Inspection", icon: ClipboardCheck, onClick: () => onNavigate?.("ar-inspections") },
    { label: "Activities", icon: Activity, onClick: () => onNavigate?.("ar-customer-notes") },
    { label: "Payments", icon: CreditCard, onClick: () => onNavigate?.("ar-fin-payments") },
  ];

  const fieldCls = "h-8 text-xs";

  return (
    <div className="space-y-3">
      {/* ── Top action bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Build R.O.</span>
          <Badge variant="outline" className="font-mono text-[11px]">
            EST # {header.number || "NEW"}
          </Badge>
          {editId && <Badge variant="secondary" className="text-[10px]">saved</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={resetAll}>
            <FilePlus2 className="h-3.5 w-3.5" /> New
          </Button>
          <div className="relative">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setOpenLoad((v) => !v)}>
              <FolderOpen className="h-3.5 w-3.5" /> Open <ChevronDown className="h-3 w-3" />
            </Button>
            {openLoad && (
              <div className="absolute right-0 z-30 mt-1 w-72 max-h-80 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
                {recent.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">No estimates yet</p>
                ) : (
                  recent.map((e: any) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => loadEstimate(e)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{e.number}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {e.customer_name || "No customer"}{e.vehicle_label ? ` · ${e.vehicle_label}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{money(e.total_cents)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={printRO}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" className="h-8 gap-1.5" disabled={save.isPending} onClick={() => save.mutate(false)}>
            <Save className="h-3.5 w-3.5" /> {save.isPending ? "Saving…" : "Build R.O."}
          </Button>
        </div>
      </div>

      {/* ── Customer / Vehicle header ── */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Search className="h-3 w-3" /> Customer
            </p>
            {boundVehicle && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                <Link2 className="h-3 w-3" /> Linked
                <button type="button" className="ml-0.5 hover:text-foreground" onClick={unbind} title="Unlink"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className={`${fieldCls} pl-7`}
              placeholder="Search garage by name, phone, plate, or VIN…"
              value={custSearch}
              onChange={(e) => { setCustSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
                {searchResults.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => bindVehicle(v)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{v.owner_name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {[v.year, v.make, v.model].filter(Boolean).join(" ")}{v.plate ? ` · ${v.plate}` : ""}
                      </span>
                    </span>
                    <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
            {searchOpen && custSearch.trim() && searchResults.length === 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-lg border bg-popover px-3 py-2 text-[11px] text-muted-foreground shadow-lg">
                No match in garage — fill the fields below, then “Save to garage”.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Input className={fieldCls} placeholder="Customer name" value={header.customer_name} onChange={(e) => setH({ customer_name: e.target.value })} />
            <Input className={fieldCls} placeholder="Phone" value={header.customer_phone} onChange={(e) => setH({ customer_phone: e.target.value })} />
            <Input className={`${fieldCls} col-span-2`} placeholder="Email" value={header.customer_email} onChange={(e) => setH({ customer_email: e.target.value })} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Car className="h-3 w-3" /> Vehicle
            </p>
            {boundVehicle ? (
              <button type="button" onClick={() => setHistoryOpen(true)}
                className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline">
                <History className="h-3 w-3" /> History
              </button>
            ) : (
              <button type="button" disabled={saveToGarage.isPending} onClick={() => saveToGarage.mutate()}
                className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline disabled:opacity-50">
                <UserPlus className="h-3 w-3" /> Save to garage
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Input className={`${fieldCls} col-span-2`} placeholder="Year / Make / Model (e.g. 2020 Toyota Camry)" value={header.vehicle_label} onChange={(e) => setH({ vehicle_label: e.target.value })} />
            <Input className={fieldCls} placeholder="License plate" value={header.license_plate} onChange={(e) => setH({ license_plate: e.target.value })} />
            <Input className={fieldCls} placeholder="Color" value={header.vehicle_color} onChange={(e) => setH({ vehicle_color: e.target.value })} />
            <Input className={fieldCls} type="number" placeholder="Mileage in" value={header.mileage_in} onChange={(e) => setH({ mileage_in: e.target.value })} />
            <Input className={fieldCls} placeholder="Key tag" value={header.keytag} onChange={(e) => setH({ keytag: e.target.value })} />
          </div>
        </div>
      </div>

      {/* ── Main 3-column workspace ── */}
      <div className="grid gap-2 lg:grid-cols-[64px_1fr_300px]">
        {/* Left item-type rail */}
        <div className="flex flex-row flex-wrap gap-1.5 rounded-xl border bg-card p-1.5 lg:flex-col">
          <div className="hidden rounded-lg bg-muted/60 px-1 py-1 text-center lg:block">
            <p className={`text-[11px] font-bold ${t.margin < 0 ? "text-destructive" : "text-emerald-500"}`}>{t.margin.toFixed(0)}%</p>
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">Margin</p>
          </div>
          {RAIL.map((k) => {
            const Icon = KIND_META[k].icon;
            const onClick = k === "part" ? () => { addLine("part"); }
              : () => addLine(k);
            return (
              <button
                key={k}
                type="button"
                onClick={onClick}
                title={`Add ${KIND_META[k].label}`}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-lg border border-transparent bg-muted/40 px-1 py-1.5 text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary lg:flex-none"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[9px] font-medium">{KIND_META[k].label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setOpenPicker(true)}
            title="Canned Job — from Price Book"
            className="flex flex-1 flex-col items-center gap-0.5 rounded-lg border border-primary/30 bg-primary/5 px-1 py-1.5 text-primary transition hover:bg-primary/15 lg:flex-none"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="text-[9px] font-medium">Canned</span>
          </button>
        </div>

        {/* Center: jobs + line grid + notes */}
        <div className="min-w-0 space-y-2">
          {/* Job tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {jobs.map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setActiveJob(j)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${activeJob === j ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
              >
                Job {j}
                <span className="ml-1 opacity-70">({lines.filter((l) => l.job === j).length})</span>
              </button>
            ))}
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={addJob}>
              <Plus className="h-3 w-3" /> Job
            </Button>
            <span className="ml-auto flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setOpenPicker(true)}>
                <BookOpen className="h-3 w-3" /> Price Book
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setOpenLabor(true)}>
                <BookOpen className="h-3 w-3" /> Labor Guide
              </Button>
            </span>
          </div>

          {/* Line grid */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[680px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-semibold">Type</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Misc.</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Price</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Disc</th>
                  <th className="px-2 py-1.5 text-center font-semibold">Tax</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                  <th className="px-1 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {lines.filter((l) => l.job === activeJob).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                      No lines in Job {activeJob}. Use the left rail or a preset below to add work.
                    </td>
                  </tr>
                ) : (
                  lines
                    .filter((l) => l.job === activeJob)
                    .map((l) => {
                      const Icon = KIND_META[l.kind].icon;
                      return (
                        <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-2 py-1">
                            <Select value={l.kind} onValueChange={(v: LineKind) => patchLine(l.id, { kind: v })}>
                              <SelectTrigger className="h-7 w-[84px] text-[11px]">
                                <span className="flex items-center gap-1"><Icon className="h-3 w-3" /><SelectValue /></span>
                              </SelectTrigger>
                              <SelectContent>
                                {RAIL.map((k) => <SelectItem key={k} value={k} className="text-xs">{KIND_META[k].label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1">
                            <Input className="h-7 min-w-[150px] text-xs" placeholder="Description" value={l.description}
                              onChange={(e) => patchLine(l.id, { description: e.target.value })} />
                          </td>
                          <td className="px-2 py-1">
                            <Input className="h-7 w-[90px] text-xs" placeholder="Part #/note" value={l.misc}
                              onChange={(e) => patchLine(l.id, { misc: e.target.value })} />
                          </td>
                          <td className="px-2 py-1">
                            <Input className="h-7 w-[78px] text-right text-xs" type="number" placeholder="0.00"
                              value={centsToDollars(l.unit_cents)} onChange={(e) => patchLine(l.id, { unit_cents: dollarsToCents(e.target.value) })} />
                          </td>
                          <td className="px-2 py-1">
                            <Input className="h-7 w-[56px] text-right text-xs" type="number" placeholder="1"
                              value={l.qty || ""} onChange={(e) => patchLine(l.id, { qty: Number(e.target.value) || 0 })} />
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-0.5">
                              <Input className="h-7 w-[48px] text-right text-xs" type="number" placeholder="0"
                                value={l.disc || ""} onChange={(e) => patchLine(l.id, { disc: Number(e.target.value) || 0 })} />
                              <button type="button" className="h-7 w-6 rounded border text-[11px] text-muted-foreground hover:bg-muted"
                                onClick={() => patchLine(l.id, { disc_type: l.disc_type === "%" ? "$" : "%" })}>
                                {l.disc_type}
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={l.taxable}
                              onChange={(e) => patchLine(l.id, { taxable: e.target.checked })} />
                          </td>
                          <td className="px-2 py-1 text-right font-semibold tabular-nums">{money(lineTotalCents(l))}</td>
                          <td className="px-1 py-1">
                            <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removeLine(l.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
            <div className="flex items-center gap-1.5 border-t bg-muted/20 px-2 py-1.5">
              {(["labor", "part", "tire", "fee"] as LineKind[]).map((k) => (
                <Button key={k} size="sm" variant="ghost" className="h-6 gap-1 text-[11px]" onClick={() => addLine(k)}>
                  <Plus className="h-3 w-3" /> {KIND_META[k].label}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-2.5">
            <div className="mb-1.5 flex flex-wrap gap-1">
              {NOTE_TABS.map((n) => (
                <button key={n.key} type="button" onClick={() => setNoteTab(n.key)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${noteTab === n.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                  {n.label}
                </button>
              ))}
            </div>
            <Textarea rows={2} className="text-xs" placeholder={NOTE_TABS.find((n) => n.key === noteTab)?.label}
              value={header[noteTab]} onChange={(e) => setH({ [noteTab]: e.target.value } as Partial<HeaderForm>)} />
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <Input className={fieldCls} placeholder="Warranty" value={header.warranty} onChange={(e) => setH({ warranty: e.target.value })} />
              <Input className={fieldCls} placeholder="Internal note" value={header.internal} onChange={(e) => setH({ internal: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Right: vehicle-data + summary */}
        <div className="space-y-2">
          {/* Service writer / tech / appointment */}
          <div className="rounded-xl border bg-card p-2.5 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Gauge className="h-3 w-3" /> Vehicle Data
            </p>
            <dl className="rounded-lg bg-muted/40 px-2 py-1.5 text-[11px]">
              {[
                ["Last serviced", lastService?.lastDate ? new Date(lastService.lastDate).toLocaleDateString() : "—"],
                ["Last mileage", lastService?.lastMileage != null ? `${Number(lastService.lastMileage).toLocaleString()} mi` : "—"],
                ["Oil capacity", "—"],
                ["Oil viscosity", "—"],
                ["Oil filter", "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between py-0.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <Input className={fieldCls} placeholder="Service writer" value={header.service_writer} onChange={(e) => setH({ service_writer: e.target.value })} />
            <Input className={fieldCls} placeholder="Technician" value={header.technician} onChange={(e) => setH({ technician: e.target.value })} />
            <Select value={header.appointment_type} onValueChange={(v) => setH({ appointment_type: v })}>
              <SelectTrigger className={fieldCls}><SelectValue placeholder="Appointment type" /></SelectTrigger>
              <SelectContent>{APPOINTMENT_TYPES.map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Labor rate $</span>
              <Input className={`${fieldCls} w-20`} type="number" value={header.labor_rate} onChange={(e) => setH({ labor_rate: e.target.value })} />
            </div>
            <Input className={fieldCls} type="date" value={header.promised_at} onChange={(e) => setH({ promised_at: e.target.value })} />
          </div>

          {/* Estimate Summary */}
          <div className="rounded-xl border bg-card p-2.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <FileSignature className="h-3 w-3" /> Estimate Summary
            </p>
            <dl className="space-y-1 text-xs">
              {[
                ["Parts", t.parts], ["Tires", t.tires], ["Labor", t.labor], ["Sublet", t.sublet],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular-nums">{money(v as number)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 font-medium">
                <dt>SubTotal</dt><dd className="tabular-nums">{money(t.lineSubtotal)}</dd>
              </div>
              {[
                ["Fees", feesC, setFeesC], ["EPA", epaC, setEpaC], ["Shop Supplies", suppliesC, setSuppliesC], ["Discount", discountC, setDiscountC],
              ].map(([label, val, setter]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>
                    <Input
                      className="h-6 w-20 text-right text-xs"
                      type="number"
                      value={centsToDollars(val as number)}
                      onChange={(e) => (setter as (n: number) => void)(dollarsToCents(e.target.value))}
                    />
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Tax %</dt>
                <dd className="flex items-center gap-1">
                  <Input className="h-6 w-14 text-right text-xs" type="number" value={taxRate || ""} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} />
                  <span className="tabular-nums text-muted-foreground">{money(t.tax)}</span>
                </dd>
              </div>
            </dl>
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold tabular-nums text-primary">{money(t.total)}</span>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={droppedOff} onChange={(e) => setDroppedOff(e.target.checked)} />
              Dropped off
            </label>
            <Button className="mt-2 w-full gap-1.5" disabled={save.isPending} onClick={() => save.mutate(true)}>
              <ShieldCheck className="h-4 w-4" /> Authorize
            </Button>
          </div>

          {/* Section shortcuts */}
          <div className="rounded-xl border bg-card p-1.5">
            {shortcuts.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={!s.onClick}
                onClick={s.onClick}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-muted disabled:opacity-40"
              >
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom preset bar ── */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-card px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Presets:</span>
        {["Basic", "Full Service", "Premium", "Alignment", "Diagnosis", "Cert"].map((p) => (
          <Button key={p} size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyPreset(p)}>
            {p}
          </Button>
        ))}
        <Button size="sm" className="ml-auto h-7 gap-1.5 text-xs" disabled={save.isPending} onClick={() => save.mutate(false)}>
          <Wrench className="h-3.5 w-3.5" /> + Build R.O.
        </Button>
      </div>

      {/* Pickers */}
      <ServiceCatalogPickerDialog
        open={openPicker}
        onOpenChange={setOpenPicker}
        storeId={storeId}
        title="Price Book — add to R.O."
        onPick={(picks: ServiceCatalogPick[], service) => {
          appendPicks(picks.map((p) => ({ kind: p.kind as LineKind, name: p.name, qty: p.qty, unit_cents: p.unit_cents })));
          toast.success(`Added "${service.name}" — ${picks.length} line${picks.length === 1 ? "" : "s"}`);
        }}
      />
      <LaborGuidePickerDialog
        open={openLabor}
        onOpenChange={setOpenLabor}
        title="Labor Guide — add to R.O."
        onSelect={(entry: LaborGuideEntry) => {
          appendPicks([{ kind: "labor", name: entry.service, qty: entry.baseHours, unit_cents: laborRateC }]);
          toast.success(`Added "${entry.service}" — ${entry.baseHours}h @ ${money(laborRateC)}`);
        }}
      />
      <VehicleHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        storeId={storeId}
        vehicle={boundVehicle}
      />
    </div>
  );
}
