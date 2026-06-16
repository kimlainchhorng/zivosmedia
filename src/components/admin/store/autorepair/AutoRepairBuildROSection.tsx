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
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import BuildROSectionDialog from "./BuildROSectionDialog";
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
import BuildROSaveCannedDialog from "./BuildROSaveCannedDialog";
import BuildROPartsMatrixDialog from "./BuildROPartsMatrixDialog";
import BuildROImportPartsDialog, { type ImportedPart } from "./BuildROImportPartsDialog";
import BuildROIconToolbar from "./BuildROIconToolbar";
import BuildROProfitDialog from "./BuildROProfitDialog";
import AutoRepairDocPreviewDialog, { type PreviewDoc } from "./AutoRepairDocPreviewDialog";
import { useStorePdfHeader } from "@/lib/admin/useStorePdfHeader";
import { buildROPreviewDoc } from "@/lib/admin/buildROPreview";
import BuildROVoiceButton from "./BuildROVoiceButton";
import BuildROIntakeQueueDialog from "./BuildROIntakeQueueDialog";
import type { LaborGuideEntry } from "@/lib/laborGuide";
import { generateDocumentPdf, downloadPdf } from "@/lib/admin/invoicePdf";
import { assignDocNumber, assignWorkOrderNumber, peekDocNumber } from "@/lib/admin/invoiceActions";
import { copyText } from "@/lib/native/clipboard";
import { printOrShareHtml } from "@/lib/native/printDocument";
import { escapeHtml } from "@/lib/escapeHtml";
import { buildAutoRepairBookingUrl } from "@/lib/admin/autoRepairBookingUrl";
import { type MatrixTier, DEFAULT_PARTS_MATRIX, normalizeMatrix, sellFromCostCents } from "@/lib/admin/partsMatrix";
import {
  Wrench, Package, CircleDot, Receipt, Truck, StickyNote, BookOpen, AlertTriangle,
  Plus, Trash2, Search, Car, FileSignature, Printer, Save, FilePlus2, FolderOpen,
  History, ClipboardCheck, Activity, CreditCard, ShieldCheck, ChevronDown,
  Link2, X, UserPlus, Sparkles, Ban, ShoppingCart, Mail, MessageSquare, ArrowRightCircle,
  Download, Star, CheckCircle2, Send, PhoneCall, Home, Percent, Clock, Eye, Copy,
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
  isSoftwareDomain?: boolean;
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

// Per-type color accent for the line grid (VSM groups jobs and color-codes rows).
const KIND_ACCENT: Record<LineKind, { text: string; border: string }> = {
  labor: { text: "text-orange-600", border: "border-l-orange-400" },
  part: { text: "text-blue-600", border: "border-l-blue-400" },
  tire: { text: "text-cyan-600", border: "border-l-cyan-400" },
  fee: { text: "text-violet-600", border: "border-l-violet-400" },
  sublet: { text: "text-teal-600", border: "border-l-teal-400" },
  note: { text: "text-slate-500", border: "border-l-slate-300" },
  diagnosis: { text: "text-amber-600", border: "border-l-amber-400" },
  concern: { text: "text-rose-600", border: "border-l-rose-400" },
};

const RAIL: LineKind[] = ["labor", "part", "tire", "fee", "sublet", "note", "diagnosis", "concern"];
const APPOINTMENT_TYPES = ["Stay With Vehicle", "Drop Off", "Waiter", "Pick-up & Delivery", "Towed In"];
const PAYMENT_METHODS = ["", "Cash", "Card", "Check", "Fleet / PO", "KHQR", "Other"];
const BUILD_RO_POPUP_TABS = new Set([
  "settings",
  "customers",
  "customer-bookings",
  "ar-vehicles",
  "ar-dashboard",
  "ar-workorders",
  "ar-inspections",
  "ar-customer-notes",
  "ar-labor-time",
  "ar-parts",
  "ar-tires",
  "ar-parts-suppliers",
  "ar-fin-income",
  "ar-fin-expenses",
  "ar-fin-payments",
  "ar-fin-pnl",
  "ar-fin-tax",
  "ar-promos",
  "ar-campaigns",
  "ar-gift-cards",
  "ar-reports",
  "ar-estimates",
  "ar-invoices",
  "ar-warranty",
  "ar-booking-link",
  "ar-qr",
  "ar-reminders",
  "ar-reviews",
]);

const initialPopupTab = (): string | null => {
  if (typeof window === "undefined") return null;
  const requested = new URLSearchParams(window.location.search).get("section");
  return requested && BUILD_RO_POPUP_TABS.has(requested) ? requested : null;
};

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
// Only a real UUID may go into a Postgres uuid column; placeholder/seed ids (e.g. "test-veh-1")
// from handoffs become null so the save links by the denormalized vehicle fields instead of crashing.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v: unknown): string | null => (typeof v === "string" && UUID_RE.test(v) ? v : null);

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
  estimate_date: "",
  start_date: "",
  po_number: "",
  labor_rate: "100",
  customer_request: "",
  diagnosis: "",
  recommendation: "",
  warranty: "",
  extended_warranty: "",
  insurance: "",
  note: "",
  internal: "",
};
type HeaderForm = typeof blankHeader;

/** Local YYYY-MM-DD for <input type="date"> (avoids UTC off-by-one from toISOString). */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const NOTE_TABS = [
  { key: "customer_request", label: "Customer Request" },
  { key: "diagnosis", label: "Diagnosis" },
  { key: "recommendation", label: "Recommendation" },
  { key: "warranty", label: "Warranty" },
  { key: "extended_warranty", label: "Extend Warranty" },
  { key: "insurance", label: "Insurance" },
  { key: "note", label: "Note" },
  { key: "internal", label: "Internal Note" },
] as const;

/** Compose the structured intake notes into the single `ar_estimates.notes` column (Phase 1, no schema change). */
const composeNotes = (h: HeaderForm) => {
  const parts: string[] = [];
  if (h.customer_request.trim()) parts.push(`Customer Request: ${h.customer_request.trim()}`);
  if (h.diagnosis.trim()) parts.push(`Diagnosis: ${h.diagnosis.trim()}`);
  if (h.recommendation.trim()) parts.push(`Recommendation: ${h.recommendation.trim()}`);
  if (h.warranty.trim()) parts.push(`Warranty: ${h.warranty.trim()}`);
  if (h.extended_warranty.trim()) parts.push(`Extended Warranty: ${h.extended_warranty.trim()}`);
  if (h.insurance.trim()) parts.push(`Insurance: ${h.insurance.trim()}`);
  if (h.note.trim()) parts.push(`Note: ${h.note.trim()}`);
  if (h.internal.trim()) parts.push(`Internal: ${h.internal.trim()}`);
  return parts.join("\n\n");
};
/** Best-effort reverse of composeNotes when loading an estimate that was saved by this builder. */
const parseNotes = (notes: string | null): Partial<HeaderForm> => {
  const out: Partial<HeaderForm> = {};
  if (!notes) return out;
  const map: Record<string, keyof HeaderForm> = {
    "Customer Request": "customer_request", Diagnosis: "diagnosis",
    Recommendation: "recommendation", Warranty: "warranty", Note: "note", Internal: "internal",
    "Extended Warranty": "extended_warranty", Insurance: "insurance",
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

export default function AutoRepairBuildROSection({ storeId, onNavigate, isSoftwareDomain = false }: Props) {
  const qc = useQueryClient();
  (window as any).__arc = (window as any).__arc || { r: 0, e1: 0, e2: 0, e3: 0, e4: 0 };
  (window as any).__arc.r++;
  const suppliesLabel = isSoftwareDomain ? "Supply Charge" : "Shop Supplies";
  const [editId, setEditId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderForm>(() => ({ ...blankHeader, estimate_date: todayStr() }));
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
        .is("deleted_at", null)
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
  const [custEdit, setCustEdit] = useState(true); // Customer card: form always expanded by default
  const [vehEdit, setVehEdit] = useState(false); // Vehicle card: form (adding/editing) vs summary/prompt
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printCopies, setPrintCopies] = useState(1);
  const [smsMenuOpen, setSmsMenuOpen] = useState(false);
  const [smsCustomMsg, setSmsCustomMsg] = useState("");
  const [placeOrderOpen, setPlaceOrderOpen] = useState(false);
  const [pendingVehicleAfterCustomer, setPendingVehicleAfterCustomer] = useState(false);
  const [openCustomer, setOpenCustomer] = useState(false);
  const [openVehicleDlg, setOpenVehicleDlg] = useState(false);
  const [openCatalog, setOpenCatalog] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [openExisting, setOpenExisting] = useState(false);
  const [openCanned, setOpenCanned] = useState(false);
  const [openMatrix, setOpenMatrix] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openGP, setOpenGP] = useState(false);
  const [openQueue, setOpenQueue] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  const handlePrintModalOpenChange = (open: boolean) => {
    setPrintModalOpen(open);
    if (!open) setPrintCopies(1);
  };
  const handleSmsMenuOpenChange = (open: boolean) => {
    setSmsMenuOpen(open);
    if (!open) setSmsCustomMsg("");
  };
  const { storeInfo, storeLogoData } = useStorePdfHeader(storeId);
  const { data: bookingStoreSlug } = useQuery({
    queryKey: ["ar-build-ro-booking-store-slug", storeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_profiles").select("slug").eq("id", storeId).maybeSingle();
      if (error) throw error;
      return (data as any)?.slug as string | null;
    },
    enabled: !!storeId,
  });
  // The nav group of the toolbar is portaled into the shared page header; grab
  // that slot once the surrounding layout has mounted.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById("store-owner-header-actions"));
    const frame = window.requestAnimationFrame(() => {
      setHeaderSlot(document.getElementById("store-owner-header-actions"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  // Cross-section toolbar icon → open that section as a popup over Build R.O.
  const [sectionTab, setSectionTab] = useState<string | null>(() => initialPopupTab());
  const setSectionParam = useCallback((nextTab: string | null, mode: "push" | "replace" = "replace") => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (nextTab) url.searchParams.set("section", nextTab);
    else url.searchParams.delete("section");
    if (mode === "push" && url.toString() !== window.location.href) {
      window.history.pushState(window.history.state, "", url);
    } else {
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);
  const openSectionTab = useCallback((nextTab: string) => {
    if (!BUILD_RO_POPUP_TABS.has(nextTab)) return;
    setSectionTab(nextTab);
    setSectionParam(nextTab, sectionTab === nextTab ? "replace" : "push");
  }, [sectionTab, setSectionParam]);
  const handleSectionOpenChange = useCallback((open: boolean) => {
    if (open) return;
    setSectionTab(null);
    setSectionParam(null);
  }, [setSectionParam]);
  useEffect(() => {
    const syncSectionFromUrl = () => {
      const requested = initialPopupTab();
      setSectionTab((current) => (current === requested ? current : requested));
    };
    syncSectionFromUrl();
    window.addEventListener("popstate", syncSectionFromUrl);
    return () => window.removeEventListener("popstate", syncSectionFromUrl);
  }, []);
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(blankCustomer);
  const [view, setView] = useState<"hub" | "builder">("hub");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  // Vendors the shop has connected in Parts Suppliers — surfaced in the part-line
  // vendor picker so ordering goes to a real account. Recomputed when the dialog
  // closes (a new connection may have been saved).
  const connectedVendors = useMemo(() => listConnectedVendors(storeId), [storeId, catalogVersion]);

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
  useEffect(() => {
    if (!vehicleId || boundVehicle || garage.length === 0) return;
    const gv = garage.find((g) => g.id === vehicleId);
    if (gv) setBoundVehicle(gv);
  }, [boundVehicle, garage, vehicleId]);

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

  // Recent PO numbers used on invoices — autocomplete the header PO field.
  const { data: poNumbers = [] } = useQuery({
    queryKey: ["ar-build-ro-pos", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices" as any)
        .select("po_number")
        .eq("store_id", storeId)
        .not("po_number", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return Array.from(new Set(((data ?? []) as any[]).map((r) => r.po_number).filter(Boolean))) as string[];
    },
  });

  // Preview the EST # a brand-new repair order will receive (display-only — the
  // real number is still allocated atomically at save). Only runs for a fresh,
  // unsaved R.O.; once saved, header.number takes over.
  const { data: previewNumber } = useQuery({
    queryKey: ["ar-build-ro-peek", storeId],
    queryFn: () => peekDocNumber(storeId, "estimate"),
    enabled: view === "builder" && !editId && !header.number,
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
    const nextVehicleId = asUuid(v.id);
    setVehicleId(nextVehicleId);
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
    void persistVehicleLink(nextVehicleId);
  };
  const persistVehicleLink = async (nextVehicleId: string | null) => {
    if (!editId) return;
    try {
      const { error } = await supabase.from("ar_estimates" as any).update({ vehicle_id: nextVehicleId }).eq("id", editId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["ar-build-ro-recent", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save vehicle link");
    }
  };
  const clearBoundVehicle = () => {
    setVehicleId(null);
    setBoundVehicle(null);
  };
  const unbind = () => {
    clearBoundVehicle();
    void persistVehicleLink(null);
  };
  const openBlankCustomerDialog = () => {
    setCustomerDraft(blankCustomer);
    setPendingVehicleAfterCustomer(false);
    setOpenCustomer(true);
  };

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
    customerDraft.rating ? `Customer rating: ${customerDraft.rating}/5` : "",
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
      const nextVehicleId = asUuid(v.id);
      setVehicleId(nextVehicleId);
      setBoundVehicle(v);
      void persistVehicleLink(nextVehicleId);
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
      if (c != null) setEpaC((current) => (current === c ? current : c));
    }
    if (!suppliesTouched) {
      const c = chargeFromConfig(shopDefaults?.supplies);
      if (c != null) setSuppliesC((current) => (current === c ? current : c));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.parts, t.tires, t.labor, shopDefaults?.epa, shopDefaults?.supplies, epaTouched, suppliesTouched]);

  // ── Line ops ──
  const addLine = (kind: LineKind) => setLines((a) => [...a, { ...blankLine(activeJob, kind), taxable: taxableFor(kind) }]);
  const addComposedLine = (d: ComposedLineDraft) =>
    setLines((a) => [...a, { ...blankLine(activeJob, d.kind), ...d }]);
  const patchLine = (id: string, patch: Partial<ROLine>) =>
    setLines((a) => a.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const changeLineKind = (id: string, kind: LineKind) =>
    setLines((a) => a.map((l) => {
      if (l.id !== id) return l;
      return {
        ...blankLine(l.job, kind),
        id: l.id,
        description: l.description,
        ordered: kind === "part" || kind === "tire" ? false : l.ordered,
        declined: l.declined,
        taxable: taxableFor(kind),
      };
    }));
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
  const closeTransientBuildROUi = () => {
    setOpenLoad(false);
    setOpenPicker(false);
    setOpenLabor(false);
    setOpenParts(false);
    setOpenCustomer(false);
    setOpenVehicleDlg(false);
    setOpenCatalog(false);
    setOpenExisting(false);
    setOpenCanned(false);
    setOpenMatrix(false);
    setOpenImport(false);
    setOpenGP(false);
    setOpenQueue(false);
    handlePrintModalOpenChange(false);
    handleSmsMenuOpenChange(false);
    setPlaceOrderOpen(false);
    setPreviewDoc(null);
  };

  const resetAll = () => {
    closeTransientBuildROUi();
    setEditId(null);
    // Prefill the shop's default labor rate (Auto Repair Settings) onto a fresh R.O.
    setHeader({ ...blankHeader, estimate_date: todayStr(), labor_rate: shopDefaults?.labor ? String(shopDefaults.labor) : blankHeader.labor_rate });
    setLines([]);
    setJobs([1]);
    setActiveJob(1);
    setFeesC(0); setEpaC(0); setSuppliesC(0); setDiscountC(0);
    setEpaTouched(false); setSuppliesTouched(false); // re-apply shop defaults on a fresh RO
    setTaxRate(shopDefaults?.taxPct ?? 0);
    setStatus("draft");
    setWorkflowStage("awaiting");
    setCustEdit(true);
    setVehEdit(false);
    setCreatedAt(null);
    clearBoundVehicle();
    setCustSearch("");
    setCustomerDraft(blankCustomer);
    setPendingVehicleAfterCustomer(false);
  };

  const loadEstimate = (e: any) => {
    setEditId(e.id);
    clearBoundVehicle();
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
      estimate_date: e.estimate_date ?? "",
      start_date: e.start_date ?? "",
      po_number: e.po_number ?? "",
      labor_rate: (e as any).labor_rate_cents != null ? String((e as any).labor_rate_cents / 100) : (shopDefaults?.labor ? String(shopDefaults.labor) : blankHeader.labor_rate),
      appointment_type: (e as any).appointment_type ?? blankHeader.appointment_type,
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
    setCustEdit(true);
    setVehEdit(false);
    setOpenLoad(false);
    // Re-bind the saved garage vehicle so History / linked features work on load.
    if (e.vehicle_id) {
      setVehicleId(e.vehicle_id);
      const gv = garage.find((g) => g.id === e.vehicle_id);
      if (gv) { setVehicleId(gv.id); setBoundVehicle(gv); }
    }
    toast.success(`Loaded ${e.number ?? "estimate"}`);
  };

  // Handoff from another tab (Estimates list "Open / New in Build R.O."): a sessionStorage
  // key + the lodge-set-tab event bring us here; load the requested estimate or start fresh.
  const consumeBuildROOpen = useCallback(() => {
    const raw = sessionStorage.getItem("ar_buildro_open");
    if (!raw) return;
    sessionStorage.removeItem("ar_buildro_open");
    if (raw === "new") { resetAll(); setView("builder"); return; }
    (async () => {
      const { data, error } = await supabase.from("ar_estimates" as any).select("*")
        .eq("id", raw)
        .eq("store_id", storeId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!error && data) { loadEstimate(data); setView("builder"); }
      else { resetAll(); setView("builder"); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handoff from the Vehicles list ("Estimate" / "Invoice" on a vehicle card):
  // open a fresh R.O. here, pre-bound to that vehicle + its customer. The same
  // builder backs both — an estimate is saved with "Build R.O.", and the
  // "Invoice" button converts it, so both buttons land in the one workflow.
  const consumeBuildROPrefill = useCallback(() => {
    const raw = sessionStorage.getItem("ar_buildro_prefill");
    if (!raw) return;
    sessionStorage.removeItem("ar_buildro_prefill");
    try {
      const p = JSON.parse(raw);
      resetAll();
      // From the Customers list ("New R.O." on a customer): prefill the header with
      // that person (and their first vehicle, if we can parse a "YYYY Make Model" label).
      if (p.customer) {
        const cu = p.customer;
        const nm = String(cu.name || "").trim();
        const parts = nm.split(/\s+/).filter(Boolean);
        const label = String(cu.vehicleLabel || "").trim();
        const toks = label.split(/\s+/).filter(Boolean);
        const year = toks[0] && /^\d{4}$/.test(toks[0]) ? toks[0] : "";
        const make = year ? (toks[1] ?? "") : (toks[0] ?? "");
        const model = year ? toks.slice(2).join(" ") : toks.slice(1).join(" ");
        setH({
          customer_name: nm,
          customer_first_name: parts.length > 1 ? parts.slice(0, -1).join(" ") : nm,
          customer_last_name: parts.length > 1 ? parts[parts.length - 1] : "",
          customer_phone: String(cu.phone || ""),
          customer_email: String(cu.email || ""),
          customer_street: String(cu.street || ""),
          customer_city: String(cu.city || ""),
          customer_state: String(cu.state || ""),
          customer_zip: String(cu.zip || ""),
          ...(label ? { vehicle_label: label, vehicle_year: year, vehicle_make: make, vehicle_model: model } : {}),
        } as Partial<HeaderForm>);
      }
      if (p.vehicle) bindVehicle(p.vehicle as GarageVehicle);
      setView("builder");
    } catch { /* ignore malformed prefill */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const consumeBuildROIntakeType = useCallback(() => {
    const type = sessionStorage.getItem("ar_buildro_intake_type");
    if (!type) return;
    sessionStorage.removeItem("ar_buildro_intake_type");
    resetAll();
    setH({ appointment_type: type });
    setView("builder");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Consume the handoff on mount, and again when a Build R.O. popup (Vehicles /
  // Customers / Estimates) hands off while this page is already mounted — in that
  // case the mount read can't re-fire, so BuildROSectionDialog nudges us via this
  // event. Handles both "open an existing estimate" and "prefill a new R.O.".
  useEffect(() => {
    const consumeAll = () => { consumeBuildROOpen(); consumeBuildROPrefill(); consumeBuildROIntakeType(); };
    consumeAll();
    window.addEventListener("ar-buildro-consume-prefill", consumeAll);
    return () => window.removeEventListener("ar-buildro-consume-prefill", consumeAll);
  }, [consumeBuildROOpen, consumeBuildROPrefill, consumeBuildROIntakeType]);

  // ── Save ──
  const save = useMutation({
    mutationFn: async (authorize: boolean) => {
      // Reuse the existing number on update; allocate an authoritative sequential
      // EST-#### for a brand-new estimate (shared counter with the Estimates list).
      const docNumber = header.number?.trim() || (editId ? "" : await assignDocNumber(storeId, "estimate"));
      const payload: any = {
        store_id: storeId,
        number: docNumber || `EST-${Date.now().toString().slice(-6)}`,
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
        estimate_date: header.estimate_date || null,
        start_date: header.start_date || null,
        po_number: header.po_number || null,
        labor_rate_cents: header.labor_rate ? dollarsToCents(header.labor_rate) : null,
        appointment_type: header.appointment_type || null,
        workflow_stage: workflowStage,
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
        diagnosis_notes: [header.diagnosis, header.recommendation].filter(Boolean).join("\n") || null,
        // Link the bound garage vehicle by id for robust history matching.
        vehicle_id: asUuid(vehicleId),
      };
      if (editId) {
        if (authorize) payload.status = "approved";
        const { error } = await supabase.from("ar_estimates" as any).update(payload).eq("id", editId);
        if (error) throw error;
        return { id: editId, number: payload.number as string };
      }
      payload.status = authorize ? "approved" : "draft";
      const { data, error } = await supabase.from("ar_estimates" as any).insert(payload).select("id, number").single();
      if (error) throw error;
      return { id: (data as any).id as string, number: (data as any).number as string };
    },
    onSuccess: (res, authorize) => {
      setEditId(res.id);
      // Surface the authoritative EST # right away (was only visible after reload).
      if (res.number) setH({ number: res.number });
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
  const hasActiveWorkLines = useMemo(() => lines.some((l) => !l.declined), [lines]);

  const placeOrder = () => {
    if (toOrderCount === 0) { toast.info("No parts to order"); return; }
    setPlaceOrderOpen(true);
  };

  // Mark a set of part lines ordered (by id), optionally opening the vendor portal.
  const persistOrderedLines = async (nextLines: ROLine[]) => {
    try {
      const id = editId ?? (await save.mutateAsync(false)).id;
      const nextActive = nextLines.filter((l) => !l.declined);
      const nextLineSubtotal = nextActive.reduce((s, l) => s + lineTotalCents(l), 0);
      const nextTaxableBase = nextActive.filter((l) => l.taxable).reduce((s, l) => s + lineTotalCents(l), 0);
      const nextTax = Math.round((nextTaxableBase * taxRate) / 100);
      const nextTotal = Math.max(0, nextLineSubtotal + feesC + epaC + suppliesC - discountC + nextTax);
      const { error } = await supabase.from("ar_estimates" as any).update({
        line_items: nextLines.map((l) => ({ ...l, name: l.description })),
        subtotal_cents: nextLineSubtotal,
        sublet_cents: nextActive.filter((l) => l.kind === "sublet").reduce((s, l) => s + lineTotalCents(l), 0),
        tax_cents: nextTax,
        total_cents: nextTotal,
      }).eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["ar-build-ro-recent", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Parts marked locally, but couldn't save the ordered status");
    }
  };

  const markGroupOrdered = (ids: string[], portalUrl?: string) => {
    const nextLines = lines.map((l) => (ids.includes(l.id) ? { ...l, ordered: true } : l));
    setLines(nextLines);
    if (portalUrl) {
      const w = window.open(portalUrl, "_blank", "noopener,noreferrer");
      if (!w) toast.error("Pop-up blocked — allow pop-ups to open the portal");
    }
    void persistOrderedLines(nextLines);
    if (nextLines.every((l) => l.kind !== "part" || l.declined || l.ordered)) setPlaceOrderOpen(false);
    toast.success(`${ids.length} part${ids.length === 1 ? "" : "s"} marked ordered`);
  };

  const ensureSavedId = async () => editId ?? (await save.mutateAsync(false)).id;

  // Idempotent work-order creation, driven by the status stepper. Reuses any
  // existing linked WO (no duplicates) and skips empty ROs so advancing a blank
  // stage doesn't spawn a blank work order. vehicle_id links it to the garage
  // vehicle so it shows in that vehicle's service history.
  const ensureWorkOrder = async (estimateId: string): Promise<string | null> => {
    const { data: est } = await supabase.from("ar_estimates" as any)
      .select("converted_workorder_id").eq("id", estimateId).maybeSingle();
    const existing = (est as any)?.converted_workorder_id as string | null;
    if (existing) return existing;
    if (!lines.length) return null;
    const partsUsed = lines.filter((l) => l.kind === "part" && !l.declined)
      .map((l) => ({ name: l.description, qty: l.qty, unit_cents: l.unit_cents }));
    const laborUsed = lines.filter((l) => l.kind === "labor" && !l.declined)
      .map((l) => ({ name: l.description, qty: l.qty, unit_cents: l.unit_cents }));
    const { data, error } = await supabase.from("ar_work_orders" as any).insert({
      store_id: storeId,
      estimate_id: estimateId,
      number: await assignWorkOrderNumber(storeId),
      status: "in_progress",
      workflow_stage: "in_progress",
      parts_used: partsUsed,
      parts: partsUsed,
      labor: laborUsed,
      subtotal_cents: t.lineSubtotal,
      sublet_cents: t.sublet,
      fees_cents: feesC,
      epa_cents: epaC,
      shop_supplies_cents: suppliesC,
      discount_cents: discountC,
      tax_rate: taxRate,
      tax_cents: t.tax,
      total_cents: t.total,
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
      vehicle_vin: boundVehicle?.vin || null,
      vehicle_plate: header.license_plate || null,
      plate_state: header.plate_state || null,
      unit_number: header.unit_number || null,
      keytag: header.keytag || null,
      mileage: header.mileage_in ? Number(header.mileage_in) : null,
      service_writer: header.service_writer || null,
      technician: header.technician || null,
      technician_cert: header.technician_cert || null,
      promised_at: header.promised_at || null,
      estimate_date: header.estimate_date || null,
      start_date: header.start_date || null,
      po_number: header.po_number || null,
      payment_method: header.payment_method || null,
      labor_rate_cents: header.labor_rate ? dollarsToCents(header.labor_rate) : null,
      complaint: header.customer_request || null,
      diagnosis: header.diagnosis || null,
      notes: header.recommendation || null,
      customer_notes: header.customer_request || null,
      diagnosis_notes: [header.diagnosis, header.recommendation].filter(Boolean).join("\n") || null,
      vehicle_id: asUuid(vehicleId),
    }).select("id").single();
    if (error) throw error;
    const woId = (data as any).id as string;
    await supabase.from("ar_estimates" as any).update({ converted_workorder_id: woId }).eq("id", estimateId);
    qc.invalidateQueries({ queryKey: ["ar-work-orders", storeId] });
    qc.invalidateQueries({ queryKey: ["ar-build-ro-recent", storeId] });
    return woId;
  };

  // Idempotent invoice creation, driven by the status stepper. Links back to the
  // estimate (converted_invoice_id) and carries VIN/label so it lands in the
  // Invoices list and the vehicle's service history.
  const ensureInvoice = async (estimateId: string): Promise<string | null> => {
    const { data: est } = await supabase.from("ar_estimates" as any)
      .select("converted_invoice_id").eq("id", estimateId).maybeSingle();
    const existing = (est as any)?.converted_invoice_id as string | null;
    if (existing) return existing;
    if (!lines.length) return null;
    const items = lines.filter((l) => !l.declined).map((l) => ({
      category: l.kind, description: l.description, qty: l.qty, price: l.unit_cents / 100,
    }));
    const invNumber = await assignDocNumber(storeId, "invoice");
    const { data, error } = await supabase.from("ar_invoices" as any).insert({
      store_id: storeId,
      number: invNumber,
      estimate_id: estimateId,
      status: "draft",
      customer_name: header.customer_name || null,
      customer_phone: header.customer_phone || null,
      customer_email: header.customer_email || null,
      vehicle_label: header.vehicle_label || null,
      vin: boundVehicle?.vin || null,
      license_plate: header.license_plate || null,
      vehicle_color: header.vehicle_color || null,
      unit_number: header.unit_number || null,
      mileage_in: header.mileage_in ? Number(header.mileage_in) : null,
      service_writer: header.service_writer || null,
      technician: header.technician || null,
      keytag: header.keytag || null,
      promised_at: header.promised_at || null,
      estimate_date: header.estimate_date || null,
      start_date: header.start_date || null,
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
    }).select("id").single();
    if (error) throw error;
    const invId = (data as any).id as string;
    await supabase.from("ar_estimates" as any).update({ converted_invoice_id: invId }).eq("id", estimateId);
    qc.invalidateQueries({ queryKey: ["ar-invoices", storeId] });
    qc.invalidateQueries({ queryKey: ["ar-build-ro-recent", storeId] });
    return invId;
  };

  // Advance/set the shop-floor workflow stage. Auto-saves (creates) the RO if needed
  // so the status always persists to the backend on click, then drives the workflow:
  // starting work spins up a work order; reaching Ready / Picked-up bills it out.
  const setWorkStatus = async (value: string) => {
    setWorkflowStage(value);
    let id: string;
    try {
      id = await ensureSavedId();
      const { error } = await supabase.from("ar_estimates" as any).update({ workflow_stage: value }).eq("id", id);
      if (error) throw error;
    } catch {
      toast.error("Couldn't save status");
      return;
    }
    const label = WORK_STAGES.find((w) => w.value === value)?.label ?? value;
    toast.success(`Status: ${label}`);
    // Drive backend workflow records off the stage (idempotent; only when there are lines).
    try {
      if (value === "in_progress") {
        if (await ensureWorkOrder(id)) toast.success("Work order created");
      } else if (value === "ready" || value === "picked_up") {
        await ensureWorkOrder(id); // ensure a WO exists for history even if In Progress was skipped
        if (await ensureInvoice(id)) toast.success("Invoice created");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update workflow records");
    }
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

  // Persist one or more header columns immediately (auto-saving the RO first).
  // Skips creating an RO just to store empty values.
  const persistHeader = async (patch: Record<string, any>) => {
    const hasValue = Object.values(patch).some((v) => v !== "" && v != null);
    if (!editId && !hasValue) return;
    try {
      const id = await ensureSavedId();
      const { error } = await supabase.from("ar_estimates" as any).update(patch).eq("id", id);
      if (error) throw error;
    } catch {
      toast.error("Couldn't save change");
    }
  };

  // Catalog part capture → append a line and persist it so it survives reloads
  // and flows into the estimate → work order → invoice. A flag + effect persists
  // the committed lines (with fresh totals) rather than a stale snapshot.
  const pendingPartPersist = useRef(false);
  const addPartFromCatalogAndPersist = (p: PickedPart) => {
    addPartFromCatalog(p);
    pendingPartPersist.current = true;
  };
  useEffect(() => {
    if (!pendingPartPersist.current) return;
    pendingPartPersist.current = false;
    (async () => {
      try {
        if (!editId) { await ensureSavedId(); return; } // creates the RO including the new line
        const { error } = await supabase.from("ar_estimates" as any).update({
          line_items: lines.map((l) => ({ ...l, name: l.description })),
          subtotal_cents: t.lineSubtotal,
          sublet_cents: t.sublet,
          tax_cents: t.tax,
          total_cents: t.total,
        }).eq("id", editId);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["ar-build-ro-recent", storeId] });
        qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] });
      } catch { /* will persist on the next manual save */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const convertWO = useMutation({
    mutationFn: async () => {
      const id = (await save.mutateAsync(true)).id;
      const partsUsed = lines
        .filter((l) => l.kind === "part" && !l.declined)
        .map((l) => ({ name: l.description, qty: l.qty, unit_cents: l.unit_cents }));
      const laborUsed = lines
        .filter((l) => l.kind === "labor" && !l.declined)
        .map((l) => ({ name: l.description, qty: l.qty, unit_cents: l.unit_cents }));
      const { data, error } = await supabase.from("ar_work_orders" as any).insert({
        store_id: storeId,
        estimate_id: id,
        number: await assignWorkOrderNumber(storeId),
        status: "awaiting",
        workflow_stage: "awaiting",
        parts_used: partsUsed,
        parts: partsUsed,
        labor: laborUsed,
        subtotal_cents: t.lineSubtotal,
        sublet_cents: t.sublet,
        fees_cents: feesC,
        epa_cents: epaC,
        shop_supplies_cents: suppliesC,
        discount_cents: discountC,
        tax_rate: taxRate,
        tax_cents: t.tax,
        total_cents: t.total,
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
        vehicle_vin: boundVehicle?.vin || null,
        vehicle_plate: header.license_plate || null,
        plate_state: header.plate_state || null,
        unit_number: header.unit_number || null,
        keytag: header.keytag || null,
        mileage: header.mileage_in ? Number(header.mileage_in) : null,
        service_writer: header.service_writer || null,
        technician: header.technician || null,
        technician_cert: header.technician_cert || null,
        promised_at: header.promised_at || null,
        estimate_date: header.estimate_date || null,
        start_date: header.start_date || null,
        po_number: header.po_number || null,
        payment_method: header.payment_method || null,
        labor_rate_cents: header.labor_rate ? dollarsToCents(header.labor_rate) : null,
        complaint: header.customer_request || null,
        diagnosis: header.diagnosis || null,
        notes: header.recommendation || null,
        customer_notes: header.customer_request || null,
        diagnosis_notes: [header.diagnosis, header.recommendation].filter(Boolean).join("\n") || null,
        vehicle_id: asUuid(vehicleId),
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
      openSectionTab("ar-workorders");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to convert"),
  });

  const convertInvoice = useMutation({
    mutationFn: async () => {
      const id = (await save.mutateAsync(true)).id;
      // ar_invoices uses `items` (dollars) — map kind→category and cents→dollars.
      const items = lines.filter((l) => !l.declined).map((l) => ({
        category: l.kind, description: l.description, qty: l.qty, price: l.unit_cents / 100,
      }));
      const invNumber = await assignDocNumber(storeId, "invoice");
      const { data: invRow, error } = await supabase.from("ar_invoices" as any).insert({
        store_id: storeId,
        number: invNumber,
        estimate_id: id,
        status: "draft",
        customer_name: header.customer_name || null,
        customer_phone: header.customer_phone || null,
        customer_email: header.customer_email || null,
        vehicle_label: header.vehicle_label || null,
        vin: boundVehicle?.vin || null,
        license_plate: header.license_plate || null,
        vehicle_color: header.vehicle_color || null,
        unit_number: header.unit_number || null,
        mileage_in: header.mileage_in ? Number(header.mileage_in) : null,
        service_writer: header.service_writer || null,
        technician: header.technician || null,
        keytag: header.keytag || null,
        promised_at: header.promised_at || null,
        estimate_date: header.estimate_date || null,
        start_date: header.start_date || null,
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
      }).select("id").single();
      if (error) throw error;
      await supabase.from("ar_estimates" as any)
        .update({ status: "approved", converted_invoice_id: (invRow as any)?.id ?? null }).eq("id", id);
      return invNumber;
    },
    onSuccess: (invNumber) => {
      setStatus("approved");
      qc.invalidateQueries({ queryKey: ["ar-invoices", storeId] });
      toast.success(`Converted to Invoice ${invNumber}`);
      openSectionTab("ar-invoices");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to convert"),
  });

  const copyApprovalLink = async () => {
    if (!hasActiveWorkLines) {
      toast.error("Add at least one active line before sharing");
      return;
    }
    try {
      const id = await ensureSavedId();
      const { data } = await supabase.from("ar_estimates" as any).select("share_token").eq("id", id).single();
      let token = (data as any)?.share_token as string | undefined;
      if (!token) {
        token = crypto.randomUUID();
        // A Supabase update resolves even when the DB rejects (RLS / offline), so an
        // unchecked write let a failed token-save fall through to "Approval link copied"
        // while the public /estimate/:token page (resolved via ar_get_estimate_by_share_token)
        // had no row to find — a dead customer link. Throw into the outer catch instead.
        const { error } = await supabase.from("ar_estimates" as any).update({ share_token: token, status: "sent" }).eq("id", id);
        if (error) throw error;
      }
      const url = `${window.location.origin}/estimate/${token}`;
      setStatus("sent");
      try {
        // copyText tries the synchronous execCommand path first, then the async
        // Clipboard API. We've awaited DB calls above, so the click's user-gesture
        // window may be gone — if every path is blocked, fall back to a dialog.
        await copyText(url);
        toast.success("Approval link copied");
      } catch {
        setShareLink(url);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const sendChannel = useMutation({
    mutationFn: async (channel: "email" | "sms") => {
      if (!hasActiveWorkLines) throw new Error("Add at least one active line before sending");
      const id = await ensureSavedId();
      const { data, error } = await supabase.functions.invoke("ar-estimate-send", { body: { estimate_id: id, channel } });
      if (error) throw error;
      const r = (data ?? {}) as { ok?: boolean; error?: string };
      if (!r.ok) throw new Error(r.error || "Send failed");
    },
    onSuccess: (_d, channel) => { setStatus("sent"); toast.success(channel === "email" ? "Estimate emailed" : "Estimate texted"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
  });

  // Save a branded PDF copy of the RO to storage + log it. Best-effort: it runs
  // in the background and never blocks (or fails) the actual print.
  const archiveRO = async () => {
    try {
      const blob = generateDocumentPdf({
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
          taxRate: taxRate, epaCents: epaC, shopSuppliesCents: suppliesC,
          feesCents: feesC,
        },
        storeName: storeInfo.name,
        storeAddress: storeInfo.address,
        storePhone: storeInfo.phone,
        storePhone2: storeInfo.phone2,
        storeEmail: storeInfo.email,
        storeStateReg: storeInfo.stateReg,
        storeLogo: storeLogoData,
        storeTermsPolicy: storeInfo.termsPolicy,
      });
      const pdf_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read PDF"));
        reader.readAsDataURL(blob);
      });
      await supabase.functions.invoke("ar-ro-archive", {
        body: {
          store_id: storeId,
          ro_number: header.number || null,
          doc_type: "repair_order",
          customer_name: header.customer_name || null,
          vehicle_label: header.vehicle_label || null,
          total_cents: Math.round(t.total),
          pdf_base64,
        },
      });
    } catch (e) {
      console.warn("RO archive failed", e);
    }
  };

  const printRO = async () => {
    if (!lines.length) { toast.error("Add at least one line first"); return; }
    const rows = lines
      .map(
        (l) =>
          `<tr><td>${KIND_META[l.kind].label}</td><td>${escapeHtml(l.description || "—")}${l.misc ? ` <span style="color:#888">(${escapeHtml(l.misc)})</span>` : ""}</td><td class="r">${l.qty}</td><td class="r">${money(l.unit_cents)}</td><td class="r">${money(lineTotalCents(l))}</td></tr>`,
      )
      .join("");
    const html = `<html><head><title>RO ${escapeHtml(header.number || "")}</title><style>
      body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0}
      table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left}
      th{font-size:11px;text-transform:uppercase;color:#666}.r{text-align:right}.tot{font-size:18px;font-weight:700}</style></head><body>
      <h1>Repair Order ${escapeHtml(header.number || "")}</h1>
      <p><b>Customer:</b> ${escapeHtml(header.customer_name || "—")} &nbsp;|&nbsp; <b>Vehicle:</b> ${escapeHtml(header.vehicle_label || "—")}${header.license_plate ? ` (${escapeHtml(header.license_plate)})` : ""}</p>
      <table><tr><th>Type</th><th>Description</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr>${rows}</table>
      <div style="margin-top:16px;text-align:right">
        <p>Parts: ${money(t.parts)} &nbsp; Labor: ${money(t.labor)} &nbsp; Tires: ${money(t.tires)} &nbsp; Sublet: ${money(t.sublet)}</p>
        <p>SubTotal: ${money(t.lineSubtotal)} &nbsp; Fees: ${money(feesC)} &nbsp; EPA: ${money(epaC)} &nbsp; Supplies: ${money(suppliesC)}</p>
        <p>Discount: -${money(discountC)} &nbsp; Tax: ${money(t.tax)}</p>
        <p class="tot">Total: ${money(t.total)}</p>
      </div></body></html>`;
    // Cross-platform: web opens the OS print dialog (any printer / Save as PDF);
    // the mobile app renders a PDF to the system share sheet (AirPrint, Save to
    // Files, Mail). Either way the device's own printers are reachable.
    await printOrShareHtml(html, `RO-${header.number || "draft"}.pdf`, `Print RO ${header.number || ""}`);
    void archiveRO();
  };

  const scrollToEstimateSummary = () => {
    document.getElementById("ar-estimate-summary")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const shortcuts: { label: string; icon: typeof Wrench; onClick: () => void }[] = [
    { label: "Summary", icon: FileSignature, onClick: scrollToEstimateSummary },
    { label: "Service History", icon: History, onClick: () => boundVehicle ? setHistoryOpen(true) : openSectionTab("ar-vehicles") },
    { label: "Vehicle Inspection", icon: ClipboardCheck, onClick: () => openSectionTab("ar-inspections") },
    { label: "Activities", icon: Activity, onClick: () => openSectionTab("ar-customer-notes") },
    { label: "Payments", icon: CreditCard, onClick: () => openSectionTab("ar-fin-payments") },
  ];

  const fieldCls = "h-6 px-2 text-[11px]";

  // ── Hub workflow connectors ──
  const searchAndLoad = async (mode: "estimate" | "invoice", q: string) => {
    const term = q.trim();
    if (!term) { toast.info("Enter an estimate or invoice number"); return; }
    if (mode === "estimate") {
      const { data, error } = await supabase.from("ar_estimates" as any)
        .select("*").eq("store_id", storeId).ilike("number", `%${term}%`)
        .is("deleted_at", null)
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
        const { data: est } = await supabase.from("ar_estimates" as any).select("*")
          .eq("id", inv.estimate_id)
          .eq("store_id", storeId)
          .is("deleted_at", null)
          .single();
        if (est) { loadEstimate(est); setView("builder"); return; }
      }
      if (inv) { toast.info(`Invoice ${inv.number} — opening Invoices`); openSectionTab("ar-invoices"); }
      else toast.error(`No invoice matching "${term}"`);
    }
  };

  const requestInfoBySms = (phone: string) => {
    const bookingUrl = buildAutoRepairBookingUrl({
      origin: window.location.origin,
      storeId,
      slug: bookingStoreSlug,
      params: { source: "build-ro-sms", phone },
    });
    const msg = encodeURIComponent(`Hi! Please complete your customer and vehicle details here so we can prepare your estimate: ${bookingUrl}`);
    window.open(`sms:${phone}?body=${msg}`, "_blank");
    toast.success("Opening your text app with the customer info link…");
  };

  // Quick-nav toolbar (portaled into the page header) + the section popup dialog,
  // shared by BOTH the hub (start screen) and the builder view so the toolbar is
  // present on every Build R.O. screen.
  const toolbarHandlers = {
    onNew: () => { resetAll(); setView("builder"); },
    onHub: () => { closeTransientBuildROUi(); setView("hub"); },
    onPrint: printRO,
    onNavigate: openSectionTab,
    onNavigateMain: onNavigate, // client-side switch the main window (e.g. open the Settings page)
    onProfit: () => setOpenGP(true),
    onNewIntake: (type: string) => { resetAll(); setH({ appointment_type: type }); setView("builder"); },
  };
  // The nav icons live in the page header (portal); the five document / intake
  // actions (Estimates, Invoices, Drop off, Towing, Warranty Networks) stay in
  // the Build R.O. content.
  const headerToolbar = (
    <>
      {headerSlot && createPortal(<BuildROIconToolbar group="nav" isSoftwareDomain={isSoftwareDomain} {...toolbarHandlers} />, headerSlot)}
      <BuildROIconToolbar group="docs" isSoftwareDomain={isSoftwareDomain} {...toolbarHandlers} />
      <BuildROSectionDialog storeId={storeId} tab={sectionTab} onOpenChange={handleSectionOpenChange} onNavigate={onNavigate} isSoftwareDomain={isSoftwareDomain} />
    </>
  );

  if (view === "hub") {
    return (
      <>
        {headerToolbar}
        <BuildROHub
          storeId={storeId}
          recent={recent}
          onCreateNew={() => { resetAll(); setView("builder"); }}
          onExistingCustomer={() => { resetAll(); setView("builder"); setOpenExisting(true); }}
          onNewCustomer={() => { resetAll(); setView("builder"); openBlankCustomerDialog(); }}
          onOpenTicket={(e) => { loadEstimate(e); setView("builder"); }}
          onRequestInfoSms={requestInfoBySms}
          onSearch={searchAndLoad}
          onNavigate={openSectionTab}
        />
      </>
    );
  }

  return (
    <div className="space-y-2">
      {/* Quick-nav toolbar (header) + section popup dialog — shared headerToolbar. */}
      {headerToolbar}

      {/* ── VSM header strip: created · last viewed · service writer · due date · PO# · EST# ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border bg-muted/30 px-3 py-1.5 text-xs">
        <span><span className="text-muted-foreground">Created:</span> <b className="ml-1">{createdAt ? new Date(createdAt).toLocaleDateString() : "New"}</b></span>
        <span className="hidden sm:inline"><span className="text-muted-foreground">Last viewed:</span> <b className="ml-1">{createdAt ? new Date().toLocaleDateString() : "—"}</b></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">S.W.:</span>
          <Input className="h-6 w-28 text-xs" placeholder="Service writer" value={header.service_writer} onChange={(e) => setH({ service_writer: e.target.value })} onBlur={() => persistHeader({ service_writer: header.service_writer || null })} /></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">Date:</span>
          <Input type="date" className="h-6 w-[130px] text-xs" value={header.estimate_date} onChange={(e) => setH({ estimate_date: e.target.value })} onBlur={() => persistHeader({ estimate_date: header.estimate_date || null })} /></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">Start:</span>
          <Input type="date" className="h-6 w-[130px] text-xs" value={header.start_date} onChange={(e) => setH({ start_date: e.target.value })} onBlur={() => persistHeader({ start_date: header.start_date || null })} /></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">Due:</span>
          <Input type="date" className="h-6 w-[130px] text-xs" value={header.promised_at} onChange={(e) => setH({ promised_at: e.target.value })} onBlur={() => persistHeader({ promised_at: header.promised_at || null })} /></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">PO #:</span>
          <Input list="ar-ro-pos" className="h-6 w-24 text-xs" placeholder="PO number" value={header.po_number} onChange={(e) => setH({ po_number: e.target.value })} onBlur={() => persistHeader({ po_number: header.po_number || null })} />
          <datalist id="ar-ro-pos">{poNumbers.map((p) => <option key={p} value={p} />)}</datalist></span>
        <span className="flex items-center gap-1.5"><span className="text-muted-foreground">Rate $:</span>
          <Input className="h-6 w-16 text-xs" type="number" value={header.labor_rate} onChange={(e) => setH({ labor_rate: e.target.value })} onBlur={() => persistHeader({ labor_rate_cents: header.labor_rate ? dollarsToCents(header.labor_rate) : null })} /></span>
        <span className="ml-auto font-mono text-sm font-semibold">EST # {header.number || previewNumber || "NEW"}</span>
      </div>

      {/* ── Top action bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Build R.O.</span>
          <Badge variant="outline" className="font-mono text-[11px]">
            EST # {header.number || previewNumber || "NEW"}
          </Badge>
          {editId && <Badge variant="secondary" className="text-[10px]">saved</Badge>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => { closeTransientBuildROUi(); setView("hub"); }} title="Back to start screen">
            <Home className="h-3.5 w-3.5" /> Start
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={save.isPending} onClick={resetAll}>
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
                      onClick={() => { loadEstimate(e); setOpenLoad(false); }}
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
          <Button size="sm" variant="outline" className="h-8 gap-1.5" title="See the finished invoice / estimate"
            onClick={() => setPreviewDoc(buildROPreviewDoc({
              header, lines, createdAt, status,
              taxRate, feesCents: feesC, epaCents: epaC, suppliesCents: suppliesC, discountCents: discountC,
            }))}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={save.isPending} onClick={() => setPrintModalOpen(true)}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" className="h-8 gap-1.5" disabled={save.isPending} onClick={() => save.mutate(false)}>
            <Save className="h-3.5 w-3.5" /> {save.isPending ? "Saving…" : "Build R.O."}
          </Button>
        </div>
      </div>

      {/* ── Customer / Vehicle header ── */}
      <div className="grid gap-1.5 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-1.5">
          <div className="mb-1 flex items-center justify-between">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Search className="h-3 w-3" /> Customer
            </p>
            <div className="flex items-center gap-1.5">
              {boundVehicle && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  <Link2 className="h-3 w-3" /> Linked
                  <button type="button" className="ml-0.5 hover:text-foreground" onClick={unbind} title="Unlink"><X className="h-3 w-3" /></button>
                </span>
              )}
              <button type="button" onClick={openBlankCustomerDialog}
                className="flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90">
                <UserPlus className="h-3 w-3" /> Add New
              </button>
            </div>
          </div>
          {custEdit ? (
            <div className="grid grid-cols-2 gap-1">
              <Input className={fieldCls} placeholder="First name" value={header.customer_first_name}
                onChange={(e) => setH({ customer_first_name: e.target.value, customer_name: [e.target.value, header.customer_last_name].filter(Boolean).join(" ") })} />
              <Input className={fieldCls} placeholder="Last name" value={header.customer_last_name}
                onChange={(e) => setH({ customer_last_name: e.target.value, customer_name: [header.customer_first_name, e.target.value].filter(Boolean).join(" ") })} />
              <Input className={fieldCls} placeholder="Phone" value={header.customer_phone} onChange={(e) => setH({ customer_phone: e.target.value })} />
              <Input className={fieldCls} placeholder="Email" type="email" autoComplete="email" value={header.customer_email} onChange={(e) => setH({ customer_email: e.target.value })} />
              <Input className={fieldCls} placeholder="Street address" autoComplete="street-address"
                value={header.customer_street} onChange={(e) => setH({ customer_street: e.target.value })} />
              <Input className={fieldCls} placeholder="City" autoComplete="address-level2"
                value={header.customer_city} onChange={(e) => setH({ customer_city: e.target.value })} />
              <Input className={fieldCls} placeholder="State" autoComplete="address-level1"
                value={header.customer_state} onChange={(e) => setH({ customer_state: e.target.value })} />
              <Input className={fieldCls} placeholder="Zip code" autoComplete="postal-code"
                value={header.customer_zip} onChange={(e) => setH({ customer_zip: e.target.value })} />
              <button type="button" onClick={() => setCustEdit(false)} className="col-span-2 mt-0.5 text-left text-[10px] font-semibold text-primary hover:underline">▴ Done</button>
            </div>
          ) : header.customer_name.trim() ? (
            <div className="flex items-start justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="font-semibold">{header.customer_name}</p>
                <p className="text-muted-foreground">{[header.customer_phone, header.customer_email].filter(Boolean).join(" · ") || "—"}</p>
                {[header.customer_street, header.customer_city, header.customer_state, header.customer_zip].some(Boolean) && (
                  <p className="truncate text-muted-foreground">{[header.customer_street, [header.customer_city, header.customer_state, header.customer_zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>
                )}
              </div>
              <button type="button" onClick={() => setCustEdit(true)} className="ml-2 shrink-0 text-[10px] font-semibold text-primary hover:underline">EDIT</button>
            </div>
          ) : (
            <button type="button" onClick={() => setCustEdit(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary">
              <UserPlus className="h-3.5 w-3.5" /> Add customer details
            </button>
          )}
        </div>
        <div className="rounded-lg border bg-card p-1.5">
          <div className="mb-1 flex items-center justify-between">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
          {vehEdit ? (
            <div className="grid grid-cols-2 gap-1">
              <Input className={fieldCls} placeholder="Year" value={header.vehicle_year}
                onChange={(e) => setH({ vehicle_year: e.target.value, vehicle_label: [e.target.value, header.vehicle_make, header.vehicle_model].filter(Boolean).join(" ") })} />
              <Input className={fieldCls} placeholder="Make" value={header.vehicle_make}
                onChange={(e) => setH({ vehicle_make: e.target.value, vehicle_label: [header.vehicle_year, e.target.value, header.vehicle_model].filter(Boolean).join(" ") })} />
              <Input className={fieldCls} placeholder="Model" value={header.vehicle_model}
                onChange={(e) => setH({ vehicle_model: e.target.value, vehicle_label: [header.vehicle_year, header.vehicle_make, e.target.value].filter(Boolean).join(" ") })} />
              <Input className={fieldCls} placeholder="Engine (e.g. 5.0L V8)" value={header.vehicle_engine}
                onChange={(e) => setH({ vehicle_engine: e.target.value })} />
              <Input className={fieldCls} placeholder="Transmission (e.g. 6-Speed Auto)" value={header.vehicle_transmission}
                onChange={(e) => setH({ vehicle_transmission: e.target.value })} />
              <Input className={fieldCls} placeholder="License plate" value={header.license_plate} onChange={(e) => setH({ license_plate: e.target.value })} />
              <Input className={fieldCls} type="number" placeholder="Mileage in" value={header.mileage_in} onChange={(e) => setH({ mileage_in: e.target.value })} />
              <Input className={fieldCls} placeholder="Key tag" value={header.keytag} onChange={(e) => setH({ keytag: e.target.value })} />
              <button type="button" onClick={() => setVehEdit(false)} className="col-span-2 mt-0.5 text-left text-[10px] font-semibold text-primary hover:underline">▴ Done</button>
            </div>
          ) : (boundVehicle || header.vehicle_label.trim()) ? (
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
                <dd className="font-mono">{boundVehicle?.vin || "—"}</dd>
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
                <button type="button" onClick={() => { unbind(); setVehEdit(true); }} className="ml-auto text-[10px] font-semibold text-primary hover:underline">EDIT</button>
              </div>
            </dl>
          ) : (
            <button type="button" onClick={() => setVehEdit(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary">
              <Car className="h-3.5 w-3.5" /> Add vehicle details
            </button>
          )}
        </div>
      </div>

      {/* ── Main 3-column workspace ── */}
      <div className="grid gap-2 lg:grid-cols-[1fr_300px]">
        {/* Center: jobs + line grid + notes */}
        <div className="min-w-0 space-y-2">
          {/* Job tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {jobs.map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setActiveJob(j)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${activeJob === j ? "bg-ig-gradient text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
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
          <div className="min-h-[260px] overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[680px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-semibold">Type</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Vendor</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Price</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Disc</th>
                  <th className="px-2 py-1.5 text-center font-semibold">Tax</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                  <th className="px-1 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-24 text-center text-muted-foreground">
                      No lines yet — pick a type in the composer below and Add, or use a preset.
                    </td>
                  </tr>
                ) : (
                  jobs.flatMap((j) => {
                    const jobLines = lines.filter((l) => l.job === j);
                    const jobSubtotal = jobLines.filter((l) => !l.declined).reduce((s, l) => s + lineTotalCents(l), 0);
                    const jobHours = jobLines.filter((l) => (l.kind === "labor" || l.kind === "diagnosis") && !l.declined).reduce((s, l) => s + (Number(l.qty) || 0), 0);
                    return [
                      <tr key={`job-${j}`} className="bg-primary/5">
                        <td colSpan={9} className="px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                          Job {j}
                          {jobHours > 0 && <span className="ml-2 font-medium normal-case text-muted-foreground">· {jobHours.toFixed(1)} hrs labor</span>}
                        </td>
                      </tr>,
                      ...(jobLines.length === 0
                        ? [<tr key={`empty-${j}`}><td colSpan={9} className="px-3 py-3 text-center text-[11px] text-muted-foreground">No lines in this job yet — set Job {j} active and Add below.</td></tr>]
                        : jobLines.map((l) => {
                      const Icon = KIND_META[l.kind].icon;
                      const accent = KIND_ACCENT[l.kind];
                      return (
                        <tr key={l.id} className={`group border-b border-l-2 last:border-b-0 hover:bg-muted/20 ${accent.border} ${l.declined ? "opacity-40" : ""}`}>
                          <td className="px-2 py-1 align-middle">
                            <Select value={l.kind} onValueChange={(v: LineKind) => changeLineKind(l.id, v)}>
                              <SelectTrigger className={`h-7 w-[84px] border-transparent bg-transparent px-1.5 text-[11px] font-semibold shadow-none hover:border-border hover:bg-background ${accent.text}`}>
                                <span className="flex items-center gap-1"><Icon className="h-3 w-3" /><SelectValue /></span>
                              </SelectTrigger>
                              <SelectContent>
                                {RAIL.map((k) => <SelectItem key={k} value={k} className="text-xs">{KIND_META[k].label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1 align-middle">
                            <div className="flex min-w-[260px] items-center gap-1.5">
                              <Input className="h-7 min-w-[170px] flex-1 border-transparent bg-transparent px-1.5 text-xs font-semibold shadow-none hover:border-border hover:bg-background focus:bg-background" placeholder="Description" value={l.description}
                                onChange={(e) => patchLine(l.id, { description: e.target.value })} />
                              {(l.kind === "part" || l.kind === "tire") && (
                                <label className="flex h-7 w-[112px] shrink-0 items-center gap-1 rounded border border-transparent bg-transparent px-1.5 text-[10px] font-semibold text-muted-foreground hover:border-border hover:bg-background">
                                  <span>P/N</span>
                                  <input
                                    className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-foreground outline-none"
                                    placeholder="#"
                                    value={l.part_number || l.misc}
                                    onChange={(e) => patchLine(l.id, { part_number: e.target.value, misc: e.target.value })}
                                  />
                                </label>
                              )}
                            </div>
                            {l.kind === "part" && (
                              <div className="mt-0.5 flex items-center gap-1 pl-1">
                                <select
                                  className="hidden"
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
                                  <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" /> Ordered
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600">
                                    <Clock className="h-3 w-3" /> Pending Order
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1 align-middle">
                            {l.kind === "part" || l.kind === "tire" ? (
                              <select
                                className="h-7 w-[112px] rounded border border-transparent bg-transparent px-1.5 text-xs font-medium text-muted-foreground hover:border-border hover:bg-background"
                                value={l.vendor || ""}
                                onChange={(e) => patchLine(l.id, { vendor: e.target.value })}
                              >
                                <option value="">Vendor...</option>
                                {connectedVendors.map((v) => (
                                  <option key={v.id} value={v.name}>{v.name}{v.account ? ` (#${v.account})` : ""}</option>
                                ))}
                                {l.vendor && !connectedVendors.some((v) => v.name === l.vendor) && (
                                  <option value={l.vendor}>{l.vendor}</option>
                                )}
                              </select>
                            ) : (
                              <Input className="h-7 w-[96px] border-transparent bg-transparent px-1.5 text-xs font-medium shadow-none hover:border-border hover:bg-background focus:bg-background" placeholder="Note" value={l.misc}
                                onChange={(e) => patchLine(l.id, { misc: e.target.value })} />
                            )}
                          </td>
                          <td className="px-2 py-1 text-right align-middle">
                            {(l.kind === "part" || l.kind === "tire") && l.cost_cents > 0 && (
                              <div className="text-[10px] font-medium tabular-nums text-muted-foreground">
                                Cost {money(l.cost_cents)}
                              </div>
                            )}
                            {l.kind === "labor" || l.kind === "diagnosis" ? (
                              <div className="flex items-center justify-end gap-0.5" title="Labor rate (per hour)">
                                <span className="text-[9px] text-muted-foreground">$</span>
                                <Input className="h-7 w-[58px] border-transparent bg-transparent px-1 text-right text-xs font-semibold shadow-none hover:border-border hover:bg-background focus:bg-background" type="number" placeholder="0"
                                  value={l.unit_cents ? l.unit_cents / 100 : ""} onChange={(e) => patchLine(l.id, { unit_cents: dollarsToCents(e.target.value) })} />
                                <span className="text-[9px] text-muted-foreground">/hr</span>
                              </div>
                            ) : (
                              <div className="text-xs font-semibold tabular-nums">
                                {money(l.unit_cents)}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1 align-middle">
                            <div className="flex items-center justify-end gap-0.5" title={l.kind === "labor" || l.kind === "diagnosis" ? "Labor hours" : "Quantity"}>
                              <Input className="h-7 w-[52px] border-transparent bg-transparent px-1.5 text-right text-xs shadow-none hover:border-border hover:bg-background focus:bg-background" type="number" placeholder={l.kind === "labor" || l.kind === "diagnosis" ? "0" : "1"}
                                value={l.qty || ""} onChange={(e) => patchLine(l.id, { qty: Number(e.target.value) || 0 })} />
                              {(l.kind === "labor" || l.kind === "diagnosis") && <span className="text-[9px] text-muted-foreground">hrs</span>}
                            </div>
                          </td>
                          <td className="px-2 py-1 align-middle">
                            <div className="flex items-center gap-0.5">
                              <Input className="h-7 w-[44px] border-transparent bg-transparent px-1.5 text-right text-xs shadow-none hover:border-border hover:bg-background focus:bg-background" type="number" placeholder="0"
                                value={l.disc || ""} onChange={(e) => patchLine(l.id, { disc: Number(e.target.value) || 0 })} />
                              <button type="button" className="h-7 w-6 rounded border border-transparent text-[11px] text-muted-foreground hover:border-border hover:bg-muted"
                                onClick={() => patchLine(l.id, { disc_type: l.disc_type === "%" ? "$" : "%" })}>
                                {l.disc_type}
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-center align-middle">
                            <button type="button"
                              title={l.taxable ? "Taxable (R1) — click to exempt" : "Tax-exempt — click to tax"}
                              onClick={() => patchLine(l.id, { taxable: !l.taxable })}
                              className={`h-6 w-7 rounded text-[11px] font-semibold transition ${
                                l.taxable ? "text-sky-500 hover:bg-sky-500/10" : "text-muted-foreground hover:bg-muted"
                              }`}>
                              {l.taxable ? "R1" : "N"}
                            </button>
                          </td>
                          <td className={`px-2 py-1 text-right align-middle font-bold tabular-nums ${accent.text}`}>{money(lineTotalCents(l))}</td>
                          <td className="px-1 py-1 align-middle">
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
                    })),
                      <tr key={`sub-${j}`} className="border-t-2 bg-muted/40">
                        <td colSpan={7} className="px-3 py-1.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Job {j} SubTotal
                        </td>
                        <td className="px-2 py-1.5 text-right font-bold tabular-nums">
                          {money(jobSubtotal)}
                        </td>
                        <td />
                      </tr>,
                    ];
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* VSM-style line composer (Part / Labor entry) */}
          <BuildROLineComposer
            job={activeJob}
            laborRateCents={laborRateC}
            partsMatrix={partsMatrix}
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
                      disabled={save.isPending}
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
            <Select value={header.appointment_type} onValueChange={(v) => { setH({ appointment_type: v }); persistHeader({ appointment_type: v }); }}>
              <SelectTrigger className="h-6 w-[150px] text-xs"><SelectValue placeholder="Appointment type" /></SelectTrigger>
              <SelectContent>{APPOINTMENT_TYPES.map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant={toOrderCount ? "default" : "outline"} className="ml-auto h-7 gap-1.5 text-xs" disabled={save.isPending} onClick={placeOrder}>
              <ShoppingCart className="h-3.5 w-3.5" /> Place Order ({toOrderCount})
            </Button>
          </div>

          {/* Notes — VSM-style: six categories, AI ReWrite + voice dictation */}
          <div id="ar-estimate-summary" className="rounded-xl border bg-card p-2">
            <div className="mb-1.5 flex flex-wrap items-center gap-1">
              {NOTE_TABS.map((n) => (
                <button key={n.key} type="button" onClick={() => setNoteTab(n.key)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${noteTab === n.key ? "bg-ig-gradient text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                  {n.label}
                </button>
              ))}
            </div>
            <Textarea rows={3} className="text-xs" placeholder={NOTE_TABS.find((n) => n.key === noteTab)?.label}
              value={header[noteTab]} onChange={(e) => setH({ [noteTab]: e.target.value } as Partial<HeaderForm>)} />
            <div className="mt-1 flex items-center justify-end gap-1">
              <BuildROVoiceButton onTranscript={(t) => setH({ [noteTab]: (header[noteTab].trim() ? header[noteTab].trim() + " " : "") + t } as Partial<HeaderForm>)} />
              <button type="button" onClick={rewriteNote} title="Tidy shorthand, casing & punctuation"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10">
                <Sparkles className="h-3 w-3" /> AI ReWrite
              </button>
            </div>
          </div>
        </div>

        {/* Right: estimate summary */}
        <div className="space-y-2">
          {/* Estimate Summary */}
          <div className="rounded-xl border bg-card p-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <FileSignature className="h-3 w-3" /> Estimate Summary
            </p>
            <dl className="space-y-1 text-xs">
              {[
                ["Parts", t.parts], ["Tires", t.tires], ["Labor", t.labor], ["Sublet", t.sublet],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between gap-2">
                  <dt className="min-w-0 truncate text-muted-foreground">{k}</dt>
                  <dd className="shrink-0 tabular-nums">{money(v as number)}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 border-t pt-1 font-medium">
                <dt className="min-w-0 truncate">SubTotal</dt><dd className="shrink-0 tabular-nums">{money(t.lineSubtotal)}</dd>
              </div>
              {([
                ["Fees", feesC, setFeesC],
                ["EPA", epaC, (n: number) => { setEpaTouched(true); setEpaC(n); }],
                [suppliesLabel, suppliesC, (n: number) => { setSuppliesTouched(true); setSuppliesC(n); }],
                ["Discount", discountC, setDiscountC],
              ] as [string, number, (n: number) => void][]).map(([label, val, setter]) => (
                <div key={label as string} className="flex items-center justify-between gap-2">
                  <dt className="min-w-0 truncate text-muted-foreground">{label}</dt>
                  <dd className="flex shrink-0 items-center justify-end gap-0.5"><span className="text-[10px] text-muted-foreground">$</span><input className="h-6 w-16 rounded border border-input bg-background px-1.5 text-right text-xs tabular-nums" type="number"
                      value={centsToDollars(val as number)}
                      onChange={(e) => (setter as (n: number) => void)(dollarsToCents(e.target.value))}
                    />
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2">
                <dt className="min-w-0 truncate text-muted-foreground">Tax %</dt>
                <dd className="flex shrink-0 items-center gap-1">
                  <input className="h-6 w-12 rounded border border-input bg-background px-1.5 text-right text-xs tabular-nums" type="number" value={taxRate || ""} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} /><span className="text-[10px] text-muted-foreground">%</span>
                  <span className="tabular-nums text-muted-foreground">{money(t.tax)}</span>
                </dd>
              </div>
            </dl>
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold tabular-nums text-primary">{money(t.total)}</span>
            </div>
            {t.lineSubtotal > 0 && (
              <button type="button" onClick={() => setOpenGP(true)} title="View profit breakdown"
                className="mt-1.5 flex w-full items-center justify-between rounded-md bg-emerald-50 px-2 py-1 text-[11px] transition hover:bg-emerald-100">
                <span className="font-medium text-emerald-700">Gross profit</span>
                <span className="shrink-0 font-semibold tabular-nums text-emerald-700">{money(Math.round((t.lineSubtotal * t.margin) / 100))} · {Math.round(t.margin)}%</span>
              </button>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Intake:</span>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" className="h-3.5 w-3.5 accent-primary"
                  checked={header.appointment_type === "Drop Off"}
                  onChange={(e) => { const v = e.target.checked ? "Drop Off" : "Stay With Vehicle"; setH({ appointment_type: v }); persistHeader({ appointment_type: v }); }} />
                Dropped off
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" className="h-3.5 w-3.5 accent-primary"
                  checked={header.appointment_type === "Towed In"}
                  onChange={(e) => { const v = e.target.checked ? "Towed In" : "Stay With Vehicle"; setH({ appointment_type: v }); persistHeader({ appointment_type: v }); }} />
                Towed in
              </label>
              <button type="button" onClick={() => setOpenQueue(true)} title="See all dropped-off & towed-in vehicles"
                className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10">
                Queue →
              </button>
            </div>
            <Button className="mt-2 w-full gap-1.5" disabled={convertInvoice.isPending || save.isPending || !lines.length} onClick={() => convertInvoice.mutate()}>
              <ShieldCheck className="h-4 w-4" /> {convertInvoice.isPending ? "Authorizing…" : "Authorize & Invoice"}
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
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" disabled={!hasActiveWorkLines} onClick={copyApprovalLink}>
                <Link2 className="h-3.5 w-3.5" /> Link
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" disabled={!hasActiveWorkLines || !header.customer_email || sendChannel.isPending}
                onClick={() => sendChannel.mutate("email")}>
                <Mail className="h-3.5 w-3.5" /> Email
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" disabled={!hasActiveWorkLines || !header.customer_phone}
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
                onClick={s.onClick}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-muted"
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
        onOpenChange={(open) => {
          setOpenCatalog(open);
          if (!open) setCatalogVersion((v) => v + 1);
        }}
        storeId={storeId}
        vehicleLabel={header.vehicle_label || undefined}
        vin={boundVehicle?.vin || undefined}
        plate={header.license_plate || undefined}
        isSoftwareDomain={isSoftwareDomain}
        onAddPart={addPartFromCatalogAndPersist}
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
        matrix={partsMatrix}
      />

      <BuildROProfitDialog open={openGP} onOpenChange={setOpenGP} lines={lines} />

      {/* Fallback when the clipboard is blocked (focus/permission) — show the link to copy manually. */}
      <Dialog open={!!shareLink} onOpenChange={(o) => !o && setShareLink(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" /> Customer approval link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Your browser blocked automatic copying. Copy this link and send it to your customer to approve the estimate.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareLink ?? ""}
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={async () => {
                  if (!shareLink) return;
                  try { await copyText(shareLink); toast.success("Link copied"); setShareLink(null); }
                  catch { toast.error("Select the link and press Ctrl/Cmd + C"); }
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BuildROIntakeQueueDialog
        open={openQueue}
        onOpenChange={setOpenQueue}
        storeId={storeId}
        onPick={(e) => { loadEstimate(e); setView("builder"); }}
      />

      <AutoRepairDocPreviewDialog
        open={!!previewDoc}
        onOpenChange={(v) => !v && setPreviewDoc(null)}
        doc={previewDoc}
        storeName={storeInfo.name}
        storeAddress={storeInfo.address}
        storePhone={storeInfo.phone}
        storePhone2={storeInfo.phone2}
        storeEmail={storeInfo.email}
        storeStateReg={storeInfo.stateReg}
        storeLogo={storeLogoData}
        storeTermsPolicy={storeInfo.termsPolicy}
        isSoftwareDomain={isSoftwareDomain}
      />

      {/* ── Print / Review modal ── */}
      <Dialog open={printModalOpen} onOpenChange={handlePrintModalOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Print / Review</DialogTitle>
          </DialogHeader>
          <p className="text-center text-xs text-muted-foreground -mt-2">Default Printer: Browser Default</p>
          <div className="space-y-3 pt-2">
            {/* Review & Sign */}
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
              onClick={async () => { handlePrintModalOpenChange(false); await copyApprovalLink(); }}>
              <FileSignature className="h-4 w-4" /> Review &amp; Sign
            </Button>
            {/* Print Estimate */}
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
              onClick={() => { const copies = printCopies; handlePrintModalOpenChange(false); for (let i = 0; i < copies; i++) printRO(); }}>
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
                        taxRate: taxRate, epaCents: epaC, shopSuppliesCents: suppliesC,
                        feesCents: feesC,
                      },
                    });
                    downloadPdf(blob, `estimate-${header.number || "draft"}.pdf`);
                  } catch (e: any) { toast.error(e?.message ?? "PDF error"); }
                  handlePrintModalOpenChange(false);
                }}>
                <Download className="h-3.5 w-3.5" /> Download Estimate
              </button>
              {/* Print Tech Assignment */}
              <button className="flex items-center gap-1 text-primary hover:underline"
                onClick={() => {
                  const html = `<html><head><title>Tech Assignment</title><style>body{font-family:system-ui;padding:24px}h2{margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:6px 8px;border:1px solid #ddd;text-align:left}th{background:#f3f4f6;font-size:11px;text-transform:uppercase}</style></head><body>
                    <h2>Tech Assignment — RO ${escapeHtml(header.number || "")}</h2>
                    <p><b>Vehicle:</b> ${escapeHtml(header.vehicle_label || "—")} &nbsp;|&nbsp; <b>Plate:</b> ${escapeHtml(header.license_plate || "—")}</p>
                    <p><b>Mileage In:</b> ${escapeHtml(header.mileage_in || "—")}</p>
                    <table><tr><th>Type</th><th>Description</th><th>Qty</th></tr>
                    ${lines.filter(l => l.kind === "labor").map(l => `<tr><td>Labor</td><td>${escapeHtml(l.description)}</td><td>${l.qty} hr</td></tr>`).join("")}
                    </table></body></html>`;
                  const w = window.open("", "_blank");
                  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
                  handlePrintModalOpenChange(false);
                }}>
                <PhoneCall className="h-3.5 w-3.5" /> Print Tech Assignment
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SMS Menu ── */}
      <Dialog open={smsMenuOpen} onOpenChange={handleSmsMenuOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Text Message (SMS) Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {/* Req. Approval */}
            <Button className="w-full bg-red-700 hover:bg-red-800 text-white gap-2" disabled={sendChannel.isPending}
              onClick={async () => {
                handleSmsMenuOpenChange(false);
                await sendChannel.mutateAsync("sms");
              }}>
              <CheckCircle2 className="h-4 w-4" /> Req. Approval
            </Button>
            {/* Ready */}
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={() => {
                const msg = encodeURIComponent(`Your vehicle is ready for pickup! Please call us to arrange. Thank you.`);
                window.open(`sms:${header.customer_phone}?body=${msg}`, "_blank");
                handleSmsMenuOpenChange(false);
              }}>
              <CheckCircle2 className="h-4 w-4" /> Ready
            </Button>
            {/* Request a Review */}
            <Button variant="outline" className="w-full gap-2"
              onClick={() => {
                const msg = encodeURIComponent(`Thank you for choosing us! We'd love your feedback. Please leave us a review — it means a lot to our team.`);
                window.open(`sms:${header.customer_phone}?body=${msg}`, "_blank");
                handleSmsMenuOpenChange(false);
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
                  const msg = smsCustomMsg;
                  window.open(`sms:${header.customer_phone}?body=${encodeURIComponent(msg)}`, "_blank");
                  handleSmsMenuOpenChange(false);
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
