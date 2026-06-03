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
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import ServiceCatalogPickerDialog, { type ServiceCatalogPick } from "./ServiceCatalogPickerDialog";
import LaborGuidePickerDialog from "./LaborGuidePickerDialog";
import VehicleHistoryDialog from "./VehicleHistoryDialog";
import PartPickerDialog, { type PickedPart } from "./PartPickerDialog";
import BuildROCustomerDialog, { type CustomerDraft, blankCustomer } from "./BuildROCustomerDialog";
import BuildROVehicleDialog from "./BuildROVehicleDialog";
import BuildROCarfaxDialog from "./BuildROCarfaxDialog";
import BuildROStatusDialog from "./BuildROStatusDialog";
import BuildROLineComposer, { type ComposedLineDraft } from "./BuildROLineComposer";
import BuildROPartsCatalogDialog from "./BuildROPartsCatalogDialog";
import { listConnectedVendors } from "./AutoRepairPartSuppliersSection";
import BuildROHub from "./BuildROHub";
import BuildROExistingCustomerDialog from "./BuildROExistingCustomerDialog";
import BuildROBarcode from "./BuildROBarcode";
import BuildROSaveCannedDialog from "./BuildROSaveCannedDialog";
import BuildROPartsMatrixDialog from "./BuildROPartsMatrixDialog";
import BuildROImportPartsDialog, { type ImportedPart } from "./BuildROImportPartsDialog";
import type { LaborGuideEntry } from "@/lib/laborGuide";
import { generateDocumentPdf, downloadPdf } from "@/lib/admin/invoicePdf";
import { type MatrixTier, DEFAULT_PARTS_MATRIX, normalizeMatrix, sellFromCostCents } from "@/lib/admin/partsMatrix";
import {
  Wrench, Package, CircleDot, Receipt, Truck, StickyNote, BookOpen, AlertTriangle,
  Plus, Trash2, Search, Car, FileSignature, Printer, Save, FilePlus2, FolderOpen,
  History, ClipboardCheck, Activity, CreditCard, ShieldCheck, ChevronDown,
  Link2, X, UserPlus, Sparkles, Ban, ShoppingCart, Mail, MessageSquare, ArrowRightCircle,
  Download, Star, CheckCircle2, Send, PhoneCall, Home, Percent, Clock,
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
  declined: boolean;    // customer declined this work — excluded from totals
  ordered: boolean;     // part has been ordered from the vendor
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

// Shop-floor repair-order workflow stages, shown as a clickable chevron stepper.
// `value` is what's written to ar_estimates.status; `color` themes the chevron.
const WORK_STAGES = [
  { value: "awaiting",    label: "Awaiting Start", color: "#7c3aed" }, // purple
  { value: "in_progress", label: "In Progress",    color: "#2563eb" }, // blue
  { value: "ready",       label: "Ready",          color: "#16a34a" }, // green
  { value: "picked_up",   label: "Picked Up",      color: "#64748b" }, // slate
] as const;

/** Map any persisted status (draft/sent/approved/…) to a workflow stage index. */
const statusToStageIndex = (s: string): number => {
  const i = WORK_STAGES.findIndex((w) => w.value === s);
  if (i >= 0) return i;
  if (s === "done" || s === "invoiced") return 3;
  return 0; // draft / sent / approved / awaiting → first stage
};

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
  declined: false,
  ordered: false,
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
  customer_first_name: "",
  customer_last_name: "",
  customer_phone: "",
  customer_email: "",
  customer_street: "",
  customer_city: "",
  customer_state: "",
  customer_zip: "",
  vehicle_label: "",
  vehicle_year: "",
  vehicle_make: "",
  vehicle_model: "",
  vehicle_transmission: "",
  vehicle_engine: "",
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
  po_number: "",
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
    declined: raw?.declined ?? false,
    ordered: raw?.ordered ?? false,
  };
};

// Professional "ReWrite" for shop notes — expand common auto-repair shorthand,
// fix casing, and tidy spacing. Deterministic (no network) so it works offline.
const SHOP_ABBR: [RegExp, string][] = [
  [/\bcust\b/gi, "customer"],
  [/\bc\/o\b/gi, "complains of"],
  [/\bveh\b/gi, "vehicle"],
  [/\bw\//gi, "with"],
  [/\bb\/c\b/gi, "because"],
  [/\blf\b/gi, "left front"],
  [/\brf\b/gi, "right front"],
  [/\blr\b/gi, "left rear"],
  [/\brr\b/gi, "right rear"],
  [/\bbrk(s)?\b/gi, "brake$1"],
  [/\brotr(s)?\b/gi, "rotor$1"],
  [/\brepl\b/gi, "replace"],
  [/\breplcd\b/gi, "replaced"],
  [/\bdiag\b/gi, "diagnose"],
  [/\beng\b/gi, "engine"],
  [/\btrans\b/gi, "transmission"],
  [/\bsusp\b/gi, "suspension"],
  [/\balign\b/gi, "alignment"],
  [/\btemp\b/gi, "temperature"],
  [/\bfl\b/gi, "fluid"],
  [/\bmi\b/gi, "miles"],
];
const tidyNote = (raw: string): string => {
  let s = raw.replace(/\s+/g, " ").trim();
  if (!s) return s;
  for (const [re, rep] of SHOP_ABBR) s = s.replace(re, rep);
  // Capitalize the first letter of each sentence.
  s = s.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
  // Ensure terminal punctuation.
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
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
  const [openParts, setOpenParts] = useState(false);
  const [openLoad, setOpenLoad] = useState(false);

  const setH = (patch: Partial<HeaderForm>) => setHeader((h) => ({ ...h, ...patch }));

  // Add-on charge fields (feed the totals box).
  const [feesC, setFeesC] = useState(0);
  const [epaC, setEpaC] = useState(0);
  const [suppliesC, setSuppliesC] = useState(0);
  const [discountC, setDiscountC] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  // Once the user hand-edits EPA / Shop Supplies, stop auto-applying the shop default.
  const [epaTouched, setEpaTouched] = useState(false);
  const [suppliesTouched, setSuppliesTouched] = useState(false);
  const [droppedOff, setDroppedOff] = useState(false);
  const [status, setStatus] = useState<string>("draft");
  const [workflowStage, setWorkflowStage] = useState<string>("awaiting");

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
  const [carfaxOpen, setCarfaxOpen] = useState(false);
  const [statusDlgOpen, setStatusDlgOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printCopies, setPrintCopies] = useState(1);
  const [smsMenuOpen, setSmsMenuOpen] = useState(false);
  const [smsCustomMsg, setSmsCustomMsg] = useState("");
  const [placeOrderOpen, setPlaceOrderOpen] = useState(false);
  const [pendingVehicleAfterCustomer, setPendingVehicleAfterCustomer] = useState(false);
  const [openCustomer, setOpenCustomer] = useState(false);
  const [openVehicleDlg, setOpenVehicleDlg] = useState(false);
  const [openCatalog, setOpenCatalog] = useState(false);
  const [openExisting, setOpenExisting] = useState(false);
  const [openCanned, setOpenCanned] = useState(false);
  const [openMatrix, setOpenMatrix] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(blankCustomer);
  const [view, setView] = useState<"hub" | "builder">("hub");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  // Vendors the shop has connected in Parts Suppliers — surfaced in the part-line
  // vendor picker so ordering goes to a real account. Recomputed when the dialog
  // closes (a new connection may have been saved).
  const connectedVendors = useMemo(() => listConnectedVendors(storeId), [storeId, openCatalog]);

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

  // Shop's saved canned jobs (Price Book) — surfaced as quick presets.
  const { data: cannedJobs = [] } = useQuery({
    queryKey: ["ar-service-catalog", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_service_catalog" as any)
        .select("id, name, labor_hours, labor_rate_cents, parts")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Active technicians — feed the Technician picker (status dialog datalist).
  const { data: technicianNames = [] } = useQuery({
    queryKey: ["ar-build-ro-techs", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_technicians" as any)
        .select("name")
        .eq("store_id", storeId)
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((t) => t.name).filter(Boolean) as string[];
    },
  });

  // Shop-level defaults (labor rate, tax rate) from store_profiles.ar_settings — prefill new R.O.s.
  const { data: shopDefaults } = useQuery({
    queryKey: ["ar-build-ro-defaults", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("store_profiles").select("ar_settings").eq("id", storeId).maybeSingle();
      const s = ((data as any)?.ar_settings || {}) as Record<string, any>;
      const taxRaw = Number(s.tax_rate);
      const taxPct = !isNaN(taxRaw) && taxRaw > 0 ? (taxRaw <= 1 ? taxRaw * 100 : taxRaw) : 0;
      const labor = parseFloat(String(s.labor_rate ?? "")) || 0;
      const matrix = normalizeMatrix(s.parts_matrix);
      // Fees & Setup → EPA + Shop Supplies auto-apply config.
      const epa = s.epa_enabled
        ? { type: s.epa_type === "pct" ? "pct" : "amount", value: Number(s.epa_value) || 0, onParts: !!s.epa_on_parts, onLabor: !!s.epa_on_labor }
        : null;
      const supplies = s.shop_supplies_enabled
        ? { type: s.shop_supplies_type === "pct" ? "pct" : "amount", value: Number(s.shop_supplies_value) || 0, onParts: !!s.shop_supplies_on_parts, onLabor: !!s.shop_supplies_on_labor }
        : null;
      // Sales Tax "Apply Taxes On" matrix → which line kinds are taxable.
      // A category is taxable when its rate is R1/R2/R3 (not "N"). undefined = not configured.
      const at = (s.tax_applies_to || {}) as Record<string, string>;
      const taxableOf = (key: string): boolean | undefined =>
        at[key] == null ? undefined : at[key] !== "N";
      const taxableByKind: Partial<Record<LineKind, boolean>> = {
        part: taxableOf("parts"),
        tire: taxableOf("tires"),
        labor: taxableOf("labor"),
        sublet: taxableOf("subcontract"),
        fee: taxableOf("fees"),
      };
      return { taxPct, labor, matrix, epa, supplies, taxableByKind };
    },
  });
  const partsMatrix: MatrixTier[] = shopDefaults?.matrix ?? DEFAULT_PARTS_MATRIX;

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

  const bindVehicle = (v: GarageVehicle) => {
    setVehicleId(v.id);
    setBoundVehicle(v);
    setHeader((h) => ({
      ...h,
      customer_name: v.owner_name ?? "",
      customer_first_name: (v.owner_name ?? "").split(" ").slice(0, -1).join(" ") || (v.owner_name ?? ""),
      customer_last_name: (v.owner_name ?? "").includes(" ") ? (v.owner_name ?? "").split(" ").slice(-1)[0] : "",
      customer_phone: v.owner_phone ?? "",
      customer_email: v.owner_email ?? "",
      vehicle_label: [v.year, v.make, v.model].filter(Boolean).join(" "),
      vehicle_year: v.year ? String(v.year) : "",
      vehicle_make: v.make ?? "",
      vehicle_model: v.model ?? "",
      vehicle_transmission: "",
      vehicle_engine: v.notes?.match(/Engine:\s*([^·]+)/)?.[1]?.trim() ?? "",
      license_plate: v.plate ?? "",
      vehicle_color: v.color ?? "",
      mileage_in: v.mileage ? String(v.mileage) : h.mileage_in,
    }));
    setCustSearch("");
    setSearchOpen(false);
    toast.success(`Linked ${[v.year, v.make, v.model].filter(Boolean).join(" ")}`);
  };
  const unbind = () => { setVehicleId(null); setBoundVehicle(null); };

  // New Customer dialog → fill header customer fields; optionally chain to the vehicle dialog.
  const handleSaveCustomer = (c: CustomerDraft, addVehicle: boolean) => {
    setCustomerDraft(c);
    const nameParts = c.name.trim().split(" ");
    setHeader((h) => ({
      ...h,
      customer_name: c.name,
      customer_first_name: nameParts.slice(0, -1).join(" ") || c.name,
      customer_last_name: nameParts.length > 1 ? nameParts.slice(-1)[0] : "",
      customer_phone: c.cell || c.work,
      customer_email: c.email,
      customer_street: c.street || "",
      customer_city: c.city || "",
      customer_state: c.state || "",
      customer_zip: c.zip || "",
    }));
    setOpenCustomer(false);
    if (addVehicle || pendingVehicleAfterCustomer) {
      setPendingVehicleAfterCustomer(false);
      setOpenVehicleDlg(true);
    } else {
      toast.success("Customer added");
    }
  };
  const customerMemo = [
    customerDraft.street,
    [customerDraft.city, customerDraft.state, customerDraft.zip].filter(Boolean).join(" "),
    customerDraft.memo,
  ].filter((s) => s && s.trim()).join(" · ");

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
    const active = lines.filter((l) => !l.declined);
    const by = (k: LineKind) => active.filter((l) => l.kind === k).reduce((s, l) => s + lineTotalCents(l), 0);
    const parts = by("part");
    const tires = by("tire");
    const labor = by("labor");
    const sublet = by("sublet");
    const lineSubtotal = active.reduce((s, l) => s + lineTotalCents(l), 0);
    const taxableBase = active.filter((l) => l.taxable).reduce((s, l) => s + lineTotalCents(l), 0);
    const tax = Math.round((taxableBase * taxRate) / 100);
    const total = Math.max(0, lineSubtotal + feesC + epaC + suppliesC - discountC + tax);
    const cost = active.reduce((s, l) => s + l.cost_cents * l.qty, 0);
    const margin = lineSubtotal > 0 ? ((lineSubtotal - cost) / lineSubtotal) * 100 : 0;
    return { parts, tires, labor, sublet, lineSubtotal, taxableBase, tax, total, margin };
  }, [lines, feesC, epaC, suppliesC, discountC, taxRate]);

  const declinedCount = useMemo(() => lines.filter((l) => l.declined).length, [lines]);
  const toOrderCount = useMemo(() => lines.filter((l) => l.kind === "part" && !l.ordered && !l.declined).length, [lines]);

  // Compute an EPA/Shop-Supplies charge (in cents) from its shop-settings config
  // against the current parts/labor subtotals.
  const chargeFromConfig = (cfg: { type: string; value: number; onParts: boolean; onLabor: boolean } | null | undefined): number | null => {
    if (!cfg || cfg.value <= 0) return null;
    if (cfg.type === "pct") {
      const base = (cfg.onParts ? t.parts + t.tires : 0) + (cfg.onLabor ? t.labor : 0);
      return Math.round((base * cfg.value) / 100);
    }
    return Math.round(cfg.value * 100); // flat dollar amount → cents
  };

  // Whether a new line of this kind is taxable — follows the shop's "Apply Taxes
  // On" matrix when configured, else the sensible default (parts & tires taxable).
  const taxableFor = (kind: LineKind): boolean => {
    const m = shopDefaults?.taxableByKind?.[kind];
    return m === undefined ? (kind === "part" || kind === "tire") : m;
  };

  // Auto-apply the configured EPA + Shop Supplies until the user overrides them.
  useEffect(() => {
    if (!epaTouched) {
      const c = chargeFromConfig(shopDefaults?.epa);
      if (c != null) setEpaC(c);
    }
    if (!suppliesTouched) {
      const c = chargeFromConfig(shopDefaults?.supplies);
      if (c != null) setSuppliesC(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.parts, t.tires, t.labor, shopDefaults, epaTouched, suppliesTouched]);

  // ── Line ops ──
  const addLine = (kind: LineKind) => setLines((a) => [...a, { ...blankLine(activeJob, kind), taxable: taxableFor(kind) }]);
  const addComposedLine = (d: ComposedLineDraft) =>
    setLines((a) => [...a, { ...blankLine(activeJob, d.kind), ...d }]);
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

  const addPartFromCatalog = (p: PickedPart) => {
    setLines((a) => [
      ...a,
      {
        ...blankLine(activeJob, "part"),
        description: p.description,
        qty: p.qty || 1,
        unit_cents: Math.round((p.price || 0) * 100),
        part_number: p.sku || "",
        vendor: p.brand || "",
        misc: p.sku || "",
        taxable: taxableFor("part"),
      },
    ]);
    toast.success(`Added ${p.description}${p.brand ? ` (${p.brand})` : ""}`);
  };

  // Import pasted parts (AutoZone-transfer stand-in): cost -> matrix sell, vendor, Pending Order.
  const importParts = (parts: ImportedPart[], vendor: string) => {
    setLines((a) => [
      ...a,
      ...parts.map((p) => {
        const costCents = Math.round((p.cost || 0) * 100);
        return {
          ...blankLine(activeJob, "part"),
          description: p.description,
          qty: p.qty || 1,
          cost_cents: costCents,
          unit_cents: costCents > 0 ? sellFromCostCents(costCents, partsMatrix) : 0,
          part_number: p.sku || "",
          vendor,
          misc: p.sku || "",
          taxable: taxableFor("part"),
        };
      }),
    ]);
    toast.success(`Imported ${parts.length} part${parts.length === 1 ? "" : "s"} from ${vendor}`);
  };

  const rewriteNote = () => {
    const current = header[noteTab];
    if (!current.trim()) { toast.info("Nothing to rewrite yet"); return; }
    const tidied = tidyNote(current);
    setH({ [noteTab]: tidied } as Partial<HeaderForm>);
    if (tidied !== current) toast.success("Note rewritten");
  };

  // ── Presets (canned jobs). Phase 3 wires these to real templates; for now they seed sensible lines. ──
  const laborRateC = dollarsToCents(header.labor_rate);
  const applyPreset = (preset: string) => {
    const L = (description: string, hours: number): ROLine => ({ ...blankLine(activeJob, "labor"), description, qty: hours, unit_cents: laborRateC, taxable: taxableFor("labor") });
    const P = (description: string, sell: number): ROLine => ({ ...blankLine(activeJob, "part"), description, qty: 1, unit_cents: dollarsToCents(sell), taxable: taxableFor("part") });
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

  // Expand a saved canned job (ar_service_catalog row) into R.O. lines.
  const addCannedJob = (c: any) => {
    const out: ROLine[] = [];
    if (c.labor_hours > 0) {
      out.push({ ...blankLine(activeJob, "labor"), description: `${c.name} — labor`, qty: Number(c.labor_hours) || 1, unit_cents: Number(c.labor_rate_cents) || laborRateC, taxable: taxableFor("labor") });
    }
    for (const p of (Array.isArray(c.parts) ? c.parts : [])) {
      out.push({ ...blankLine(activeJob, "part"), description: p.name ?? "Part", qty: Number(p.qty) || 1, unit_cents: Number(p.unit_cents) || 0, taxable: taxableFor("part") });
    }
    if (out.length === 0) out.push({ ...blankLine(activeJob, "labor"), description: c.name, qty: 1, unit_cents: laborRateC });
    setLines((a) => [...a, ...out]);
    toast.success(`${c.name} added — ${out.length} line${out.length === 1 ? "" : "s"}`);
  };

  // ── New / Load ──
  const resetAll = () => {
    setEditId(null);
    // Prefill the shop's default labor rate (Auto Repair Settings) onto a fresh R.O.
    setHeader({ ...blankHeader, labor_rate: shopDefaults?.labor ? String(shopDefaults.labor) : blankHeader.labor_rate });
    setLines([]);
    setJobs([1]);
    setActiveJob(1);
    setFeesC(0); setEpaC(0); setSuppliesC(0); setDiscountC(0);
    setEpaTouched(false); setSuppliesTouched(false); // re-apply shop defaults on a fresh RO
    setTaxRate(shopDefaults?.taxPct ?? 0);
    setDroppedOff(false);
    setStatus("draft");
    setWorkflowStage("awaiting");
    setCreatedAt(null);
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
      customer_first_name: e.customer_first_name ?? ((e.customer_name ?? "").split(" ").slice(0, -1).join(" ") || (e.customer_name ?? "")),
      customer_last_name: e.customer_last_name ?? ((e.customer_name ?? "").includes(" ") ? (e.customer_name ?? "").split(" ").slice(-1)[0] : ""),
      customer_phone: e.customer_phone ?? "",
      customer_email: e.customer_email ?? "",
      customer_street: e.customer_street ?? "",
      customer_city: e.customer_city ?? "",
      customer_state: e.customer_state ?? "",
      customer_zip: e.customer_zip ?? "",
      vehicle_label: e.vehicle_label ?? "",
      vehicle_year: e.vehicle_year ?? ((e.vehicle_label ?? "").split(" ")[0] || ""),
      vehicle_make: e.vehicle_make ?? ((e.vehicle_label ?? "").split(" ")[1] || ""),
      vehicle_model: e.vehicle_model ?? ((e.vehicle_label ?? "").split(" ").slice(2).join(" ") || ""),
      vehicle_engine: e.vehicle_engine ?? "",
      vehicle_transmission: e.vehicle_transmission ?? "",
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
      po_number: e.po_number ?? "",
      labor_rate: shopDefaults?.labor ? String(shopDefaults.labor) : blankHeader.labor_rate,
      ...parseNotes(e.notes ?? null),
      // Prefer the dedicated note columns when present (fall back to parsed notes for older estimates).
      ...(e.customer_notes ? { customer_request: e.customer_notes } : {}),
      ...(e.diagnosis_notes ? { diagnosis: e.diagnosis_notes } : {}),
    });
    setCreatedAt(e.created_at ?? null);
    const ls = Array.isArray(e.line_items) ? e.line_items.map(coerceLine) : [];
    setLines(ls);
    const js = Array.from(new Set((ls as any[]).map((l: any) => Number(l.job) || 1))).sort((a, b) => a - b);
    setJobs(js.length ? js : [1]);
    setActiveJob(js[0] ?? 1);
    setFeesC(e.fees_cents ?? 0);
    setEpaC(e.epa_cents ?? 0);
    setSuppliesC(e.shop_supplies_cents ?? 0);
    setEpaTouched(true); setSuppliesTouched(true); // preserve the saved RO's charges, don't re-derive
    setDiscountC(e.discount_cents ?? 0);
    setTaxRate(e.tax_rate != null ? Number(e.tax_rate) : 0);
    setStatus(e.status ?? "draft");
    setWorkflowStage((e as any).workflow_stage ?? "awaiting");
    setOpenLoad(false);
    // Re-bind the saved garage vehicle so History / linked features work on load.
    if (e.vehicle_id) {
      const gv = garage.find((g) => g.id === e.vehicle_id);
      if (gv) { setVehicleId(gv.id); setBoundVehicle(gv); }
    }
    toast.success(`Loaded ${e.number ?? "estimate"}`);
  };

  // Handoff from another tab (Estimates list "Open / New in Build R.O."): a sessionStorage
  // key + the lodge-set-tab event bring us here; load the requested estimate or start fresh.
  useEffect(() => {
    const raw = sessionStorage.getItem("ar_buildro_open");
    if (!raw) return;
    sessionStorage.removeItem("ar_buildro_open");
    if (raw === "new") { resetAll(); setView("builder"); return; }
    (async () => {
      const { data, error } = await supabase.from("ar_estimates" as any).select("*").eq("id", raw).maybeSingle();
      if (!error && data) { loadEstimate(data); setView("builder"); }
      else { resetAll(); setView("builder"); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save ──
  const save = useMutation({
    mutationFn: async (authorize: boolean) => {
      const payload: any = {
        store_id: storeId,
        number: header.number || `EST-${Date.now().toString().slice(-6)}`,
        customer_name: header.customer_name || null,
        customer_phone: header.customer_phone || null,
        customer_email: header.customer_email || null,
        customer_street: header.customer_street || null,
        customer_city: header.customer_city || null,
        customer_state: header.customer_state || null,
        customer_zip: header.customer_zip || null,
        customer_address: [header.customer_street, header.customer_city, header.customer_state, header.customer_zip].filter(Boolean).join(", ") || null,
        vehicle_label: header.vehicle_label || null,
        vehicle_year: header.vehicle_year || null,
        vehicle_make: header.vehicle_make || null,
        vehicle_model: header.vehicle_model || null,
        vehicle_engine: header.vehicle_engine || null,
        vehicle_transmission: header.vehicle_transmission || null,
        vehicle_color: header.vehicle_color || null,
        vin: boundVehicle?.vin || null,
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
        po_number: header.po_number || null,
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
        // Persist the two main intake notes in their dedicated columns (clean
        // round-trip + they flow to the invoice and customer-facing views).
        customer_notes: header.customer_request || null,
        diagnosis_notes: header.diagnosis || null,
        // Link the bound garage vehicle by id for robust history matching.
        vehicle_id: vehicleId,
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
      if (authorize) setStatus("approved");
      qc.invalidateQueries({ queryKey: ["ar-build-ro-recent", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] });
      toast.success(authorize ? "Authorized & saved" : "Repair order saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  // ── Phase 4: orders, conversion, send ──
  // Parts still to order, grouped by their selected vendor (so each group can be
  // sent to / opened at the right supplier portal).
  const orderGroups = useMemo(() => {
    const toOrder = lines.filter((l) => l.kind === "part" && !l.ordered && !l.declined);
    const map = new Map<string, ROLine[]>();
    for (const l of toOrder) {
      const key = l.vendor?.trim() || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries()).map(([vendor, items]) => ({
      vendor,
      items,
      connected: connectedVendors.find((v) => v.name === vendor) ?? null,
    }));
  }, [lines, connectedVendors]);

  const placeOrder = () => {
    if (toOrderCount === 0) { toast.info("No parts to order"); return; }
    setPlaceOrderOpen(true);
  };

  // Mark a set of part lines ordered (by id), optionally opening the vendor portal.
  const markGroupOrdered = (ids: string[], portalUrl?: string) => {
    setLines((a) => a.map((l) => (ids.includes(l.id) ? { ...l, ordered: true } : l)));
    if (portalUrl) {
      const w = window.open(portalUrl, "_blank", "noopener,noreferrer");
      if (!w) toast.error("Pop-up blocked — allow pop-ups to open the portal");
    }
    toast.success(`${ids.length} part${ids.length === 1 ? "" : "s"} marked ordered`);
  };

  const ensureSavedId = async () => editId ?? (await save.mutateAsync(false));

  // Advance/set the shop-floor workflow stage. Auto-saves (creates) the RO if needed
  // so the status always persists to the backend on click.
  const setWorkStatus = async (value: string) => {
    setWorkflowStage(value);
    try {
      const id = await ensureSavedId();
      const { error } = await supabase.from("ar_estimates" as any).update({ workflow_stage: value }).eq("id", id);
      if (error) throw error;
    } catch {
      toast.error("Couldn't save status");
      return;
    }
    const label = WORK_STAGES.find((w) => w.value === value)?.label ?? value;
    toast.success(`Status: ${label}`);
  };

  // Persist the main technician immediately (auto-saving the RO first). Avoids
  // creating an RO just to store an empty technician.
  const persistTechnician = async (name: string) => {
    if (!editId && !name.trim()) return;
    try {
      const id = await ensureSavedId();
      const { error } = await supabase.from("ar_estimates" as any).update({ technician: name.trim() || null }).eq("id", id);
      if (error) throw error;
    } catch {
      toast.error("Couldn't save technician");
    }
  };

  const convertWO = useMutation({
    mutationFn: async () => {
      const id = await save.mutateAsync(true);
      const partsUsed = lines
        .filter((l) => l.kind === "part" && !l.declined)
        .map((l) => ({ name: l.description, qty: l.qty, unit_cents: l.unit_cents }));
      const { data, error } = await supabase.from("ar_work_orders" as any).insert({
        store_id: storeId,
        estimate_id: id,
        number: `WO-${Date.now().toString().slice(-6)}`,
        status: "awaiting",
        parts_used: partsUsed,
        total_cents: t.total,
        customer_name: header.customer_name || null,
        customer_phone: header.customer_phone || null,
        customer_email: header.customer_email || null,
        vehicle_label: header.vehicle_label || null,
        vehicle_id: vehicleId,
      }).select("id").single();
      if (error) throw error;
      await supabase.from("ar_estimates" as any)
        .update({ status: "approved", converted_workorder_id: (data as any).id }).eq("id", id);
      return data;
    },
    onSuccess: () => {
      setStatus("approved");
      qc.invalidateQueries({ queryKey: ["ar-work-orders", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-build-ro-recent", storeId] });
      toast.success("Converted to Work Order");
      onNavigate?.("ar-workorders");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to convert"),
  });

  const convertInvoice = useMutation({
    mutationFn: async () => {
      const id = await save.mutateAsync(true);
      // ar_invoices uses `items` (dollars) — map kind→category and cents→dollars.
      const items = lines.filter((l) => !l.declined).map((l) => ({
        category: l.kind, description: l.description, qty: l.qty, price: l.unit_cents / 100,
      }));
      const { error } = await supabase.from("ar_invoices" as any).insert({
        store_id: storeId,
        number: `INV-${Date.now().toString().slice(-6)}`,
        estimate_id: id,
        status: "draft",
        customer_name: header.customer_name || null,
        customer_phone: header.customer_phone || null,
        customer_email: header.customer_email || null,
        vehicle_label: header.vehicle_label || null,
        license_plate: header.license_plate || null,
        vehicle_color: header.vehicle_color || null,
        unit_number: header.unit_number || null,
        mileage_in: header.mileage_in ? Number(header.mileage_in) : null,
        service_writer: header.service_writer || null,
        technician: header.technician || null,
        keytag: header.keytag || null,
        promised_at: header.promised_at || null,
        po_number: header.po_number || null,
        payment_method: header.payment_method || null,
        items,
        subtotal_cents: t.lineSubtotal,
        sublet_cents: t.sublet,
        fees_cents: feesC,
        epa_cents: epaC,
        shop_supplies_cents: suppliesC,
        discount_cents: discountC,
        tax_rate: taxRate,
        tax_cents: t.tax,
        total_cents: t.total,
        amount_paid_cents: 0,
        customer_notes: header.customer_request || null,
        diagnosis_notes: [header.diagnosis, header.recommendation].filter(Boolean).join("\n") || null,
      });
      if (error) throw error;
      await supabase.from("ar_estimates" as any).update({ status: "approved" }).eq("id", id);
    },
    onSuccess: () => {
      setStatus("approved");
      qc.invalidateQueries({ queryKey: ["ar-invoices", storeId] });
      toast.success("Converted to Invoice");
      onNavigate?.("ar-invoices");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to convert"),
  });

  const copyApprovalLink = async () => {
    try {
      const id = await ensureSavedId();
      const { data } = await supabase.from("ar_estimates" as any).select("share_token").eq("id", id).single();
      let token = (data as any)?.share_token as string | undefined;
      if (!token) {
        token = crypto.randomUUID();
        await supabase.from("ar_estimates" as any).update({ share_token: token, status: "sent" }).eq("id", id);
      }
      await navigator.clipboard.writeText(`${window.location.origin}/estimate/${token}`);
      setStatus("sent");
      toast.success("Approval link copied");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const sendChannel = useMutation({
    mutationFn: async (channel: "email" | "sms") => {
      const id = await ensureSavedId();
      const { data, error } = await supabase.functions.invoke("ar-estimate-send", { body: { estimate_id: id, channel } });
      if (error) throw error;
      const r = (data ?? {}) as { ok?: boolean; error?: string };
      if (!r.ok) throw new Error(r.error || "Send failed");
    },
    onSuccess: (_d, channel) => { setStatus("sent"); toast.success(channel === "email" ? "Estimate emailed" : "Estimate texted"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
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

  // ── Hub workflow connectors ──
  const searchAndLoad = async (mode: "estimate" | "invoice", q: string) => {
    const term = q.trim();
    if (!term) { toast.info("Enter an estimate or invoice number"); return; }
    if (mode === "estimate") {
      const { data, error } = await supabase.from("ar_estimates" as any)
        .select("*").eq("store_id", storeId).ilike("number", `%${term}%`)
        .order("created_at", { ascending: false }).limit(1);
      if (error) { toast.error(error.message); return; }
      if (data?.[0]) { loadEstimate(data[0]); setView("builder"); }
      else toast.error(`No estimate matching "${term}"`);
    } else {
      const { data, error } = await supabase.from("ar_invoices" as any)
        .select("id, number, estimate_id").eq("store_id", storeId).ilike("number", `%${term}%`).limit(1);
      if (error) { toast.error(error.message); return; }
      const inv: any = data?.[0];
      if (inv?.estimate_id) {
        const { data: est } = await supabase.from("ar_estimates" as any).select("*").eq("id", inv.estimate_id).single();
        if (est) { loadEstimate(est); setView("builder"); return; }
      }
      if (inv) { toast.info(`Invoice ${inv.number} — opening Invoices`); onNavigate?.("ar-invoices"); }
      else toast.error(`No invoice matching "${term}"`);
    }
  };

  const requestInfoBySms = (phone: string) => {
    const msg = encodeURIComponent("Hi! Please reply with your name, vehicle (year/make/model) and the service you need so we can prepare your estimate. Thank you!");
    window.open(`sms:${phone}?body=${msg}`, "_blank");
    toast.success("Opening your text app…");
  };

  if (view === "hub") {
    return (
      <BuildROHub
        storeId={storeId}
        recent={recent}
        onCreateNew={() => { resetAll(); setView("builder"); }}
        onExistingCustomer={() => { resetAll(); setView("builder"); setOpenExisting(true); }}
        onNewCustomer={() => { resetAll(); setView("builder"); setOpenCustomer(true); }}
        onOpenTicket={(e) => { loadEstimate(e); setView("builder"); }}
        onRequestInfoSms={requestInfoBySms}
        onSearch={searchAndLoad}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* ── VSM header strip: created · last viewed · service writer · due date · PO# · EST# ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border bg-muted/30 px-3 py-1.5 text-xs">
        <span><span className="text-muted-foreground">Created:</span> <b className="ml-1">{createdAt ? new Date(createdAt).toLocaleDateString() : "New"}</b></span>
        <span className="hidden sm:inline"><span className="text-muted-foreground">Last viewed:</span> <b className="ml-1">{createdAt ? new Date().toLocaleDateString() : "—"}</b></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">S.W.:</span>
          <Input className="h-6 w-28 text-xs" placeholder="Service writer" value={header.service_writer} onChange={(e) => setH({ service_writer: e.target.value })} /></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">Due:</span>
          <Input type="date" className="h-6 w-[130px] text-xs" value={header.promised_at} onChange={(e) => setH({ promised_at: e.target.value })} /></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">PO #:</span>
          <Input className="h-6 w-24 text-xs" placeholder="PO number" value={header.po_number} onChange={(e) => setH({ po_number: e.target.value })} /></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">Rate $:</span>
          <Input className="h-6 w-16 text-xs" type="number" value={header.labor_rate} onChange={(e) => setH({ labor_rate: e.target.value })} /></span>
        <span className="ml-auto font-mono text-sm font-semibold">EST # {header.number || "NEW"}</span>
      </div>

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
          <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => setView("hub")} title="Back to start screen">
            <Home className="h-3.5 w-3.5" /> Start
          </Button>
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
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setPrintModalOpen(true)}>
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
            <div className="flex items-center gap-1.5">
              {boundVehicle && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  <Link2 className="h-3 w-3" /> Linked
                  <button type="button" className="ml-0.5 hover:text-foreground" onClick={unbind} title="Unlink"><X className="h-3 w-3" /></button>
                </span>
              )}
              <button type="button" onClick={() => setOpenCustomer(true)}
                className="flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90">
                <UserPlus className="h-3 w-3" /> Add New
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Input className={fieldCls} placeholder="First name" value={header.customer_first_name}
              onChange={(e) => setH({ customer_first_name: e.target.value, customer_name: [e.target.value, header.customer_last_name].filter(Boolean).join(" ") })} />
            <Input className={fieldCls} placeholder="Last name" value={header.customer_last_name}
              onChange={(e) => setH({ customer_last_name: e.target.value, customer_name: [header.customer_first_name, e.target.value].filter(Boolean).join(" ") })} />
            <Input className={fieldCls} placeholder="Phone" value={header.customer_phone} onChange={(e) => setH({ customer_phone: e.target.value })} />
            <Input className={fieldCls} placeholder="Email" type="email" autoComplete="email" value={header.customer_email} onChange={(e) => setH({ customer_email: e.target.value })} />
            <Input className={`${fieldCls} col-span-2`} placeholder="Street address" autoComplete="street-address"
              value={header.customer_street} onChange={(e) => setH({ customer_street: e.target.value })} />
            <Input className={fieldCls} placeholder="City" autoComplete="address-level2"
              value={header.customer_city} onChange={(e) => setH({ customer_city: e.target.value })} />
            <Input className={fieldCls} placeholder="State" autoComplete="address-level1"
              value={header.customer_state} onChange={(e) => setH({ customer_state: e.target.value })} />
            <Input className={fieldCls} placeholder="Zip code" autoComplete="postal-code"
              value={header.customer_zip} onChange={(e) => setH({ customer_zip: e.target.value })} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Car className="h-3 w-3" /> Vehicle
            </p>
            <div className="flex items-center gap-2">
              {boundVehicle ? (
                <>
                <button type="button" onClick={() => setHistoryOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline">
                  <History className="h-3 w-3" /> History
                </button>
                <button type="button" onClick={() => setCarfaxOpen(true)} title="Carfax service history"
                  className="flex items-center rounded border border-slate-800 bg-white px-1.5 py-0.5 text-[9px] font-black leading-none tracking-tight text-slate-900 hover:bg-slate-100">
                  CARFA<span className="text-sky-600">X</span>
                </button>
                </>
              ) : (
                <button type="button" disabled={saveToGarage.isPending} onClick={() => saveToGarage.mutate()}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline disabled:opacity-50">
                  <UserPlus className="h-3 w-3" /> Save to garage
                </button>
              )}
              <button type="button"
                onClick={() => setOpenVehicleDlg(true)}
                className="flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90">
                <Car className="h-3 w-3" /> Add New
              </button>
            </div>
          </div>
          {boundVehicle ? (
            <dl className="space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-medium text-muted-foreground">Vehicle</dt>
                <dd className="font-semibold">{header.vehicle_label || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-medium text-muted-foreground">Engine</dt>
                <dd>{[header.vehicle_engine, header.vehicle_transmission].filter(Boolean).join(" · ") || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-medium text-muted-foreground">VIN</dt>
                <dd className="font-mono">{boundVehicle.vin || "—"}</dd>
              </div>
              {header.license_plate && (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 font-medium text-muted-foreground">Plate</dt>
                  <dd className="font-mono uppercase">{header.license_plate}</dd>
                </div>
              )}
              <div className="flex items-center gap-2 pt-0.5">
                <dt className="w-16 shrink-0 font-medium text-muted-foreground">Mileage</dt>
                <Input className="h-7 w-24 text-xs" type="number" placeholder="Enter Mileage" value={header.mileage_in} onChange={(e) => setH({ mileage_in: e.target.value })} />
                <span className="shrink-0 font-medium text-muted-foreground">Key tag</span>
                <Input className="h-7 w-20 text-xs" placeholder="Key tag" value={header.keytag} onChange={(e) => setH({ keytag: e.target.value })} />
                <button type="button" onClick={unbind} className="ml-auto text-[10px] font-semibold text-primary hover:underline">EDIT</button>
              </div>
            </dl>
          ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <Input className={fieldCls} placeholder="Year" value={header.vehicle_year}
              onChange={(e) => setH({ vehicle_year: e.target.value, vehicle_label: [e.target.value, header.vehicle_make, header.vehicle_model].filter(Boolean).join(" ") })} />
            <Input className={fieldCls} placeholder="Make" value={header.vehicle_make}
              onChange={(e) => setH({ vehicle_make: e.target.value, vehicle_label: [header.vehicle_year, e.target.value, header.vehicle_model].filter(Boolean).join(" ") })} />
            <Input className={fieldCls} placeholder="Model" value={header.vehicle_model}
              onChange={(e) => setH({ vehicle_model: e.target.value, vehicle_label: [header.vehicle_year, header.vehicle_make, e.target.value].filter(Boolean).join(" ") })} />
            <Input className={fieldCls} placeholder="Engine (e.g. 5.0L V8)" value={header.vehicle_engine}
              onChange={(e) => setH({ vehicle_engine: e.target.value })} />
            <Input className={`${fieldCls} col-span-2`} placeholder="Transmission (e.g. 6-Speed Auto)" value={header.vehicle_transmission}
              onChange={(e) => setH({ vehicle_transmission: e.target.value })} />
            <Input className={fieldCls} placeholder="License plate" value={header.license_plate} onChange={(e) => setH({ license_plate: e.target.value })} />
            <Input className={fieldCls} type="number" placeholder="Mileage in" value={header.mileage_in} onChange={(e) => setH({ mileage_in: e.target.value })} />
            <Input className={fieldCls} placeholder="Key tag" value={header.keytag} onChange={(e) => setH({ keytag: e.target.value })} />
          </div>
          )}
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
            const onClick = k === "part" ? () => setOpenParts(true) : () => addLine(k);
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
            <span className="ml-auto flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setOpenCatalog(true)}>
                <Package className="h-3 w-3" /> Parts Catalog
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setOpenParts(true)}>
                <Package className="h-3 w-3" /> Inventory
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setOpenMatrix(true)} title="Cost → Sell markup tiers">
                <Percent className="h-3 w-3" /> Matrix
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setOpenImport(true)} title="Paste a supplier cart / spreadsheet">
                <ShoppingCart className="h-3 w-3" /> Import
              </Button>
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
                  <>
                  {lines
                    .filter((l) => l.job === activeJob)
                    .map((l) => {
                      const Icon = KIND_META[l.kind].icon;
                      return (
                        <tr key={l.id} className={`border-b last:border-0 hover:bg-muted/20 ${l.declined ? "opacity-40" : ""}`}>
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
                            {l.kind === "part" && (
                              <div className="mt-0.5 flex items-center gap-1 pl-1">
                                <select
                                  className="h-5 max-w-[150px] rounded border bg-background px-1 text-[10px] text-muted-foreground"
                                  value={l.vendor || ""}
                                  onChange={(e) => patchLine(l.id, { vendor: e.target.value })}
                                >
                                  <option value="">Vendor…</option>
                                  {connectedVendors.map((v) => (
                                    <option key={v.id} value={v.name}>{v.name}{v.account ? ` (#${v.account})` : ""}</option>
                                  ))}
                                  {/* keep a free-text/legacy vendor selected even if not connected */}
                                  {l.vendor && !connectedVendors.some((v) => v.name === l.vendor) && (
                                    <option value={l.vendor}>{l.vendor}</option>
                                  )}
                                </select>
                                {l.ordered ? (
                                  <span className="flex items-center gap-0.5 text-[9px] uppercase tracking-wide text-emerald-600">
                                    <CheckCircle2 className="h-3 w-3" /> Ordered
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-500">
                                    <Clock className="h-3 w-3" /> Pending Order
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1">
                            <Input className="h-7 w-[90px] text-xs" placeholder="Part #/note" value={l.misc}
                              onChange={(e) => patchLine(l.id, { misc: e.target.value })} />
                          </td>
                          <td className="px-2 py-1">
                            {(l.kind === "part" || l.kind === "tire") && (
                              <Input className="mb-0.5 h-6 w-[78px] text-right text-[10px] text-muted-foreground" type="number" placeholder="cost →"
                                title="Cost — auto-prices Sell from the Parts Matrix"
                                value={centsToDollars(l.cost_cents)}
                                onChange={(e) => { const c = dollarsToCents(e.target.value); patchLine(l.id, { cost_cents: c, unit_cents: sellFromCostCents(c, partsMatrix) }); }} />
                            )}
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
                            <button type="button"
                              title={l.taxable ? "Taxable (R1) — click to exempt" : "Tax-exempt — click to tax"}
                              onClick={() => patchLine(l.id, { taxable: !l.taxable })}
                              className={`h-6 w-7 rounded text-[11px] font-semibold transition ${
                                l.taxable ? "text-sky-500 hover:bg-sky-500/10" : "text-muted-foreground hover:bg-muted"
                              }`}>
                              {l.taxable ? "R1" : "N"}
                            </button>
                          </td>
                          <td className="px-2 py-1 text-right font-semibold tabular-nums">{money(lineTotalCents(l))}</td>
                          <td className="px-1 py-1">
                            <div className="flex items-center gap-0.5">
                              <button type="button" title={l.declined ? "Restore work" : "Mark declined"}
                                className={l.declined ? "text-destructive" : "text-muted-foreground hover:text-destructive"}
                                onClick={() => patchLine(l.id, { declined: !l.declined })}>
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removeLine(l.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {/* Job subtotal */}
                  <tr className="border-t bg-muted/30">
                    <td colSpan={7} className="px-3 py-1.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Job {activeJob} SubTotal
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums">
                      {money(lines.filter((l) => l.job === activeJob && !l.declined).reduce((s, l) => s + lineTotalCents(l), 0))}
                    </td>
                    <td />
                  </tr>
                  </>
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

          {/* VSM-style line composer (Part / Labor entry) */}
          <BuildROLineComposer
            job={activeJob}
            laborRateCents={laborRateC}
            storeId={storeId}
            onAdd={addComposedLine}
            onOpenCatalog={() => setOpenCatalog(true)}
          />

          {/* Status / orders strip */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-1.5 text-xs">
            <span className={`flex items-center gap-1 ${declinedCount ? "text-destructive" : "text-muted-foreground"}`}>
              <Ban className="h-3.5 w-3.5" /> Declined Jobs ({declinedCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Status:</span>
              <span className="flex items-center">
                {WORK_STAGES.map((stage, i) => {
                  const active = i <= statusToStageIndex(workflowStage);
                  const isCurrent = i === statusToStageIndex(workflowStage);
                  return (
                    <button
                      key={stage.value}
                      type="button"
                      onClick={() => setWorkStatus(stage.value)}
                      title={stage.label}
                      className={`relative flex h-6 items-center pl-3 pr-2.5 text-[10px] font-semibold transition-colors first:rounded-l-md last:rounded-r-md ${
                        active ? "text-white" : "text-muted-foreground"
                      } ${isCurrent ? "ring-1 ring-offset-1 ring-foreground/20" : ""}`}
                      style={{
                        backgroundColor: active ? stage.color : "hsl(var(--muted))",
                        // chevron notch
                        clipPath: i === 0
                          ? "polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)"
                          : i === WORK_STAGES.length - 1
                          ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 7px 50%)"
                          : "polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%, 7px 50%)",
                        marginLeft: i === 0 ? 0 : -4,
                      }}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Tech:</span>
              <button type="button" onClick={() => setStatusDlgOpen(true)} className="h-6 rounded border px-2 text-xs font-medium hover:bg-muted" title="Status & technician">{header.technician || "Select Technician"}</button>
            </span>
            <Select value={header.appointment_type} onValueChange={(v) => setH({ appointment_type: v })}>
              <SelectTrigger className="h-6 w-[150px] text-xs"><SelectValue placeholder="Appointment type" /></SelectTrigger>
              <SelectContent>{APPOINTMENT_TYPES.map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant={toOrderCount ? "default" : "outline"} className="ml-auto h-7 gap-1.5 text-xs" onClick={placeOrder}>
              <ShoppingCart className="h-3.5 w-3.5" /> Place Order ({toOrderCount})
            </Button>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-2.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-1">
              {NOTE_TABS.map((n) => (
                <button key={n.key} type="button" onClick={() => setNoteTab(n.key)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${noteTab === n.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                  {n.label}
                </button>
              ))}
              <button type="button" onClick={rewriteNote} title="Tidy shorthand, casing & punctuation"
                className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10">
                <Sparkles className="h-3 w-3" /> ReWrite
              </button>
            </div>
            <Textarea rows={2} className="text-xs" placeholder={NOTE_TABS.find((n) => n.key === noteTab)?.label}
              value={header[noteTab]} onChange={(e) => setH({ [noteTab]: e.target.value } as Partial<HeaderForm>)} />
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <Input className={fieldCls} placeholder="Warranty" value={header.warranty} onChange={(e) => setH({ warranty: e.target.value })} />
              <Input className={fieldCls} placeholder="Internal note" value={header.internal} onChange={(e) => setH({ internal: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Right: estimate summary */}
        <div className="space-y-2">
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
              {([
                ["Fees", feesC, setFeesC],
                ["EPA", epaC, (n: number) => { setEpaTouched(true); setEpaC(n); }],
                ["Shop Supplies", suppliesC, (n: number) => { setSuppliesTouched(true); setSuppliesC(n); }],
                ["Discount", discountC, setDiscountC],
              ] as [string, number, (n: number) => void][]).map(([label, val, setter]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>
                    <input className="h-6 w-16 rounded border border-input bg-background px-1.5 text-right text-xs tabular-nums" type="number"
                      value={centsToDollars(val as number)}
                      onChange={(e) => (setter as (n: number) => void)(dollarsToCents(e.target.value))}
                    />
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Tax %</dt>
                <dd className="flex items-center gap-1">
                  <input className="h-6 w-12 rounded border border-input bg-background px-1.5 text-right text-xs tabular-nums" type="number" value={taxRate || ""} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} />
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
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled={convertWO.isPending || !lines.length} onClick={() => convertWO.mutate()}>
                <ArrowRightCircle className="h-3.5 w-3.5" /> Work Order
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled={convertInvoice.isPending || !lines.length} onClick={() => convertInvoice.mutate()}>
                <Receipt className="h-3.5 w-3.5" /> Invoice
              </Button>
            </div>
            <div className="mt-1.5 flex items-center justify-center gap-1 border-t pt-1.5">
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={copyApprovalLink}>
                <Link2 className="h-3.5 w-3.5" /> Link
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" disabled={!header.customer_email || sendChannel.isPending}
                onClick={() => sendChannel.mutate("email")}>
                <Mail className="h-3.5 w-3.5" /> Email
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" disabled={!header.customer_phone}
                onClick={() => setSmsMenuOpen(true)}>
                <MessageSquare className="h-3.5 w-3.5" /> SMS
              </Button>
            </div>
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

      {/* ── EST barcode / keytag strip ── */}
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">EST # {header.number || "NEW"}</span>
        {header.number
          ? <BuildROBarcode value={header.number} className="h-10 w-auto max-w-[60%]" />
          : <span className="text-[11px] text-muted-foreground">Barcode appears once saved</span>}
        <span className="shrink-0 text-xs font-medium text-muted-foreground">KEYTAG: <b className="text-foreground">{header.keytag || "—"}</b></span>
      </div>

      {/* ── Bottom preset bar ── */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-card px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Presets:</span>
        {["Basic", "Full Service", "Premium", "Alignment", "Diagnosis", "Cert"].map((p) => (
          <Button key={p} size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyPreset(p)}>
            {p}
          </Button>
        ))}
        {cannedJobs.length > 0 && <span className="mx-0.5 self-center text-muted-foreground/40">|</span>}
        {cannedJobs.map((c: any) => (
          <Button key={c.id} size="sm" variant="outline" className="h-7 gap-1 text-xs border-primary/30 text-primary hover:bg-primary/5" onClick={() => addCannedJob(c)} title="Your saved canned job">
            <BookOpen className="h-3 w-3" /> {c.name}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 text-xs" disabled={!lines.some((l) => l.description.trim())} onClick={() => setOpenCanned(true)}>
          <BookOpen className="h-3.5 w-3.5" /> Save as Canned
        </Button>
        <Button size="sm" className="h-7 gap-1.5 text-xs" disabled={save.isPending} onClick={() => save.mutate(false)}>
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
      <BuildROCarfaxDialog
        open={carfaxOpen}
        onOpenChange={setCarfaxOpen}
        storeId={storeId}
        vehicle={boundVehicle}
      />
      <BuildROStatusDialog
        open={statusDlgOpen}
        onOpenChange={setStatusDlgOpen}
        roNumber={header.number || undefined}
        status={workflowStage}
        onSetStatus={setWorkStatus}
        technician={header.technician}
        onSetTechnician={(name) => setH({ technician: name })}
        onCommitTechnician={persistTechnician}
        technicians={technicianNames}
        soldHours={lines.filter((l) => l.kind === "labor" || l.kind === "diagnosis").reduce((s, l) => s + (Number(l.qty) || 0), 0)}
      />
      <PartPickerDialog
        open={openParts}
        onOpenChange={setOpenParts}
        storeId={storeId}
        onPick={addPartFromCatalog}
      />
      <BuildROCustomerDialog
        open={openCustomer}
        onOpenChange={setOpenCustomer}
        initial={customerDraft}
        onSave={handleSaveCustomer}
      />
      <BuildROVehicleDialog
        open={openVehicleDlg}
        onOpenChange={setOpenVehicleDlg}
        storeId={storeId}
        owner={{ name: header.customer_name, phone: header.customer_phone, email: header.customer_email }}
        ownerMemo={customerMemo}
        onSaved={(v) => bindVehicle(v as GarageVehicle)}
      />
      <BuildROPartsCatalogDialog
        open={openCatalog}
        onOpenChange={setOpenCatalog}
        storeId={storeId}
        vehicleLabel={header.vehicle_label || undefined}
        vin={boundVehicle?.vin || undefined}
        plate={header.license_plate || undefined}
      />
      <BuildROExistingCustomerDialog
        open={openExisting}
        onOpenChange={setOpenExisting}
        storeId={storeId}
        garage={garage}
        onPick={(v) => bindVehicle(v as GarageVehicle)}
      />
      <BuildROSaveCannedDialog
        open={openCanned}
        onOpenChange={setOpenCanned}
        storeId={storeId}
        lines={lines.map((l) => ({ kind: l.kind, description: l.description, qty: l.qty, unit_cents: l.unit_cents }))}
      />
      <BuildROPartsMatrixDialog
        open={openMatrix}
        onOpenChange={setOpenMatrix}
        storeId={storeId}
        initial={partsMatrix}
      />
      <BuildROImportPartsDialog
        open={openImport}
        onOpenChange={setOpenImport}
        onImport={importParts}
      />

      {/* ── Print / Review modal ── */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Print / Review</DialogTitle>
          </DialogHeader>
          <p className="text-center text-xs text-muted-foreground -mt-2">Default Printer: Browser Default</p>
          <div className="space-y-3 pt-2">
            {/* Review & Sign */}
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
              onClick={async () => { setPrintModalOpen(false); await copyApprovalLink(); }}>
              <FileSignature className="h-4 w-4" /> Review &amp; Sign
            </Button>
            {/* Print Estimate */}
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
              onClick={() => { setPrintModalOpen(false); for (let i = 0; i < printCopies; i++) printRO(); }}>
              <Printer className="h-4 w-4" /> Print Estimate
            </Button>
            {/* Copies */}
            <div className="flex items-center justify-end gap-2 text-xs">
              <span className="text-muted-foreground">Copies:</span>
              <Input type="number" min={1} max={10} className="h-7 w-16 text-center text-xs"
                value={printCopies}
                onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-xs">
              {/* Download Estimate */}
              <button className="flex items-center gap-1 text-primary hover:underline"
                onClick={async () => {
                  if (!lines.length) { toast.error("Add at least one line first"); return; }
                  try {
                    const blob = await generateDocumentPdf({
                      doc: {
                        type: "estimate", number: header.number || "EST",
                        customer: header.customer_name || "Customer",
                        phone: header.customer_phone || undefined,
                        email: header.customer_email || undefined,
                        vehicle: header.vehicle_label || undefined,
                        mileageIn: header.mileage_in ? String(header.mileage_in) : undefined,
                        items: lines.filter(l => l.kind !== "note").map(l => ({
                          category: l.kind === "labor" ? "labor" : l.kind === "part" ? "part" : "diagnosis",
                          description: l.description,
                          qty: l.qty, price: l.unit_cents / 100,
                          hours: l.kind === "labor" ? l.qty : undefined,
                        })),
                        status: status, createdAt: new Date().toISOString(),
                        taxRate: taxRate, epaCents: epaC * 100, shopSuppliesCents: suppliesC * 100,
                        feesCents: feesC * 100,
                      },
                    });
                    downloadPdf(blob, `estimate-${header.number || "draft"}.pdf`);
                  } catch (e: any) { toast.error(e?.message ?? "PDF error"); }
                  setPrintModalOpen(false);
                }}>
                <Download className="h-3.5 w-3.5" /> Download Estimate
              </button>
              {/* Print Tech Assignment */}
              <button className="flex items-center gap-1 text-primary hover:underline"
                onClick={() => {
                  const html = `<html><head><title>Tech Assignment</title><style>body{font-family:system-ui;padding:24px}h2{margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:6px 8px;border:1px solid #ddd;text-align:left}th{background:#f3f4f6;font-size:11px;text-transform:uppercase}</style></head><body>
                    <h2>Tech Assignment — RO ${header.number || ""}</h2>
                    <p><b>Vehicle:</b> ${header.vehicle_label || "—"} &nbsp;|&nbsp; <b>Plate:</b> ${header.license_plate || "—"}</p>
                    <p><b>Mileage In:</b> ${header.mileage_in || "—"}</p>
                    <table><tr><th>Type</th><th>Description</th><th>Qty</th></tr>
                    ${lines.filter(l => l.kind === "labor").map(l => `<tr><td>Labor</td><td>${l.description}</td><td>${l.qty} hr</td></tr>`).join("")}
                    </table></body></html>`;
                  const w = window.open("", "_blank");
                  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
                  setPrintModalOpen(false);
                }}>
                <PhoneCall className="h-3.5 w-3.5" /> Print Tech Assignment
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SMS Menu ── */}
      <Dialog open={smsMenuOpen} onOpenChange={setSmsMenuOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Text Message (SMS) Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {/* Req. Approval */}
            <Button className="w-full bg-red-700 hover:bg-red-800 text-white gap-2" disabled={sendChannel.isPending}
              onClick={async () => {
                setSmsMenuOpen(false);
                await sendChannel.mutateAsync("sms");
              }}>
              <CheckCircle2 className="h-4 w-4" /> Req. Approval
            </Button>
            {/* Ready */}
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={() => {
                const msg = encodeURIComponent(`Your vehicle is ready for pickup! Please call us to arrange. Thank you.`);
                window.open(`sms:${header.customer_phone}?body=${msg}`, "_blank");
                setSmsMenuOpen(false);
              }}>
              <CheckCircle2 className="h-4 w-4" /> Ready
            </Button>
            {/* Request a Review */}
            <Button variant="outline" className="w-full gap-2"
              onClick={() => {
                const msg = encodeURIComponent(`Thank you for choosing us! We'd love your feedback. Please leave us a review — it means a lot to our team.`);
                window.open(`sms:${header.customer_phone}?body=${msg}`, "_blank");
                setSmsMenuOpen(false);
              }}>
              <Star className="h-4 w-4" /> Request a Review
            </Button>
            {/* New Message */}
            <div className="space-y-2 border-t pt-2">
              <Textarea rows={3} placeholder="Type a custom message…"
                className="text-xs resize-none"
                value={smsCustomMsg}
                onChange={(e) => setSmsCustomMsg(e.target.value)} />
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
                disabled={!smsCustomMsg.trim()}
                onClick={() => {
                  window.open(`sms:${header.customer_phone}?body=${encodeURIComponent(smsCustomMsg)}`, "_blank");
                  setSmsCustomMsg("");
                  setSmsMenuOpen(false);
                }}>
                <Send className="h-4 w-4" /> New Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Place Order (by vendor) ── */}
      <Dialog open={placeOrderOpen} onOpenChange={setPlaceOrderOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Place Parts Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {orderGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All parts are ordered.</p>
            ) : (
              orderGroups.map((g, gi) => {
                const ids = g.items.map((i) => i.id);
                return (
                  <div key={g.vendor || `nv-${gi}`} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold truncate">
                          {g.vendor || "No vendor selected"}
                        </span>
                        {g.connected && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                            connected{g.connected.account ? ` · #${g.connected.account}` : ""}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">({g.items.length})</span>
                      </div>
                    </div>
                    {/* Parts in this group */}
                    <div className="space-y-1">
                      {g.items.map((i) => (
                        <div key={i.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate">
                            {i.misc ? <span className="font-mono text-muted-foreground">{i.misc} · </span> : null}
                            {i.description || "—"}
                          </span>
                          <span className="shrink-0 text-muted-foreground">×{i.qty || 1}</span>
                        </div>
                      ))}
                    </div>
                    {/* Order actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {g.connected ? (
                        <Button size="sm" className="h-7 gap-1.5 text-xs"
                          onClick={() => markGroupOrdered(ids, g.connected!.url)}>
                          <ShoppingCart className="h-3.5 w-3.5" /> Order at {g.connected.name} →
                        </Button>
                      ) : g.vendor ? (
                        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                          onClick={() => markGroupOrdered(ids)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark ordered
                        </Button>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Pick a vendor on these part lines to order electronically, or mark ordered for a manual/phone order.
                        </p>
                      )}
                      {!g.connected && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                          onClick={() => markGroupOrdered(ids)}>
                          Mark ordered
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlaceOrderOpen(false)}>Close</Button>
            {orderGroups.length > 0 && (
              <Button onClick={() => markGroupOrdered(orderGroups.flatMap((g) => g.items.map((i) => i.id)))}>
                Mark all ordered
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
