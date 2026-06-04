/**
 * Auto Repair — Invoices Section
 * Two views: Estimates and Invoices, with inline create flow.
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, DollarSign, Trash2, Receipt, ClipboardList, ArrowLeft, ScanSearch, Loader2, Check, CloudUpload, Wrench, Package, Stethoscope, Truck, KeyRound, Car, LogOut, Eye, ArrowRightLeft, BookOpen, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import AutoRepairDocPreviewDialog from "./AutoRepairDocPreviewDialog";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import PartPickerDialog, { type PickedPart } from "./PartPickerDialog";
import LaborGuidePickerDialog from "./LaborGuidePickerDialog";
import ServiceCatalogPickerDialog, { type ServiceCatalogPick } from "./ServiceCatalogPickerDialog";
import type { LaborGuideEntry } from "@/lib/laborGuide";
import InvoiceKpiStrip from "./invoices/InvoiceKpiStrip";
import InvoiceFilterBar, { type StatusFilter, type SortKey } from "./invoices/InvoiceFilterBar";
import InvoiceListRow, { type RowDoc } from "./invoices/InvoiceListRow";
import RecordInvoicePaymentDialog from "./invoices/RecordInvoicePaymentDialog";
import SendDocumentSheet from "./invoices/SendDocumentSheet";
import DeleteConfirmDialog from "./invoices/DeleteConfirmDialog";
import { softDeleteDocument, updateDocument, nextDocNumber, assignDocNumber, type DocType } from "@/lib/admin/invoiceActions";
import type { PdfDoc } from "@/lib/admin/invoicePdf";
import { computeDocTotals, normalizeTaxRate } from "@/lib/admin/taxCalc";

type LineCategory = "labor" | "part" | "diagnosis";
type LineItem = {
  id: string;
  category: LineCategory;
  description: string;
  qty: number;          // parts: quantity. labor/diagnosis: 1
  price: number;        // parts: unit price. labor: hourly rate. diagnosis: flat fee
  hours?: number;       // labor only
  discount?: number;    // discount value (% or $)
  discountType?: "pct" | "amt"; // % off or flat $ off
  originalPrice?: number; // parts: shop cost/original supplier price before markup
  markupPct?: number; // parts: markup applied to originalPrice
};
type Doc = {
  id: string;
  type: "estimate" | "invoice";
  number: string;
  customer: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;   // street line
  city: string;
  state: string;
  zip: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  engine: string;
  transmission: string;
  driveType: string;
  bodyClass: string;
  doors: string;
  fuel: string;
  plant: string;
  mileageIn: string;   // odometer when the vehicle arrives
  mileageOut: string;  // odometer when the vehicle leaves
  color: string;
  licensePlate: string;
  plateState: string;
  unitNumber: string;
  vehicle: string;
  // Service order header
  promisedAt: string;     // promised completion date (YYYY-MM-DD)
  serviceWriter: string;
  technician: string;
  technicianCert: string;
  keytag: string;
  paymentMethod: string;
  // Four-corner tire pressures (PSI), kept as strings for the inputs
  tireFL: string;
  tireFR: string;
  tireRL: string;
  tireRR: string;
  // Add-on charges, in dollars
  sublet: number;
  fees: number;
  epa: number;
  shopSupplies: number;
  amountPaidCents: number; // payments recorded against an invoice (read-only here)
  items: LineItem[];
  taxRate: number; // flat sales-tax percentage applied to the post-discount subtotal
  dueDate: string;   // invoices: payment due date (YYYY-MM-DD)
  expiresAt: string; // estimates: valid-until / expiration date (YYYY-MM-DD)
  status: "draft" | "sent" | "paid" | "partially_paid" | "approved";
  createdAt: string;
  // Fleet billing (invoices only — estimates ignore these)
  fleetAccountId: string | null;
  poNumber: string;
  // Service intake + notes (now persisted on both invoices and estimates)
  intakeMethod: string;       // 'drop-off' | 'towing' | 'in-shop' | 'pickup' | ''
  customerNotes: string;
  diagnosisNotes: string;
};

const emptyDraft = (): Doc => ({
  id: "", type: "estimate", number: "", customer: "",
  firstName: "", lastName: "", phone: "", email: "", address: "", city: "", state: "", zip: "",
  vin: "", year: "", make: "", model: "", trim: "", engine: "", transmission: "",
  driveType: "", bodyClass: "", doors: "", fuel: "", plant: "",
  mileageIn: "", mileageOut: "",
  color: "", licensePlate: "", plateState: "", unitNumber: "",
  vehicle: "",
  promisedAt: "", serviceWriter: "", technician: "", technicianCert: "", keytag: "", paymentMethod: "",
  tireFL: "", tireFR: "", tireRL: "", tireRR: "",
  sublet: 0, fees: 0, epa: 0, shopSupplies: 0, amountPaidCents: 0,
  items: [{ id: crypto.randomUUID(), category: "labor", description: "", qty: 1, price: 0, hours: 1, discount: 0 }],
  taxRate: 0,
  dueDate: "", expiresAt: "",
  status: "draft", createdAt: new Date().toISOString(),
  fleetAccountId: null, poNumber: "",
  intakeMethod: "", customerNotes: "", diagnosisNotes: "",
});

type FleetAccount = {
  id: string;
  name: string;
  credit_limit_cents: number;
  po_required: boolean;
};
// True if the id looks like a real Postgres uuid.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Gross (pre-discount) dollar amount for a single line item.
const lineGross = (i: LineItem): number =>
  i.category === "labor" ? (i.hours ?? 0) * (i.price ?? 0) :
  i.category === "part" ? (i.qty ?? 0) * (i.price ?? 0) :
  (i.price ?? 0); // diagnosis = flat fee

// Discount portion (always >= 0) for a single line item.
const lineDiscount = (i: LineItem): number => {
  const gross = lineGross(i);
  const discVal = Math.max(0, i.discount ?? 0);
  if ((i.discountType ?? "pct") === "amt") return Math.min(discVal, gross);
  return gross * Math.min(100, discVal) / 100;
};

// Net (post-discount) dollar amount for a single line item.
const lineAmount = (i: LineItem): number => Math.max(0, lineGross(i) - lineDiscount(i));

// Doc-level totals derived from items + a flat tax rate (percent). Delegates to
// the shared taxCalc so estimates, invoices, preview, PDF, and the public view
// all compute identical numbers.
const docTotals = (items: LineItem[], taxRate: number = 0) => computeDocTotals(items, taxRate);

// Split a one-line address (e.g. a Google formatted_address) into parts.
// Best-effort, US/Canada-oriented: "123 Main St, Denham Springs, LA 70726, USA".
function parseAddress(full: string): { address: string; city: string; state: string; zip: string } {
  const parts = (full || "").split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length && /^(usa|us|united states|canada)$/i.test(parts[parts.length - 1])) parts.pop();
  let city = "", state = "", zip = "";
  const last = parts[parts.length - 1] || "";
  const m = last.match(/^([A-Za-z]{2}|[A-Za-z .]+?)\s+(\d{5}(?:-\d{4})?|[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)$/);
  if (m) { state = m[1]; zip = m[2]; parts.pop(); }
  else if (/^\d{5}(?:-\d{4})?$/.test(last)) { zip = last; parts.pop(); }
  if (parts.length > 1) city = parts.pop() as string;
  return { address: parts.join(", "), city, state, zip };
}

// Recombine the split fields into a single display/storage line.
function combinedAddress(d: { address?: string; city?: string; state?: string; zip?: string }): string {
  const stateZip = [d.state, d.zip].filter(Boolean).join(" ").trim();
  return [d.address, d.city, stateZip].map(s => (s || "").trim()).filter(Boolean).join(", ");
}

// Parse a user-entered odometer string into a non-negative integer (or null
// when blank/invalid). Inputs are already digit-filtered in the UI.
const odoInt = (s: string): number | null => {
  const n = parseInt(String(s).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

// Dollar amount (number) → integer cents, or null when zero/blank.
const dollarsToCents = (v?: number | null): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

// Build the tire_pressures jsonb payload from the four PSI string inputs.
// Returns null when none are set so we don't persist an empty object.
const tirePressuresPayload = (
  d: { tireFL: string; tireFR: string; tireRL: string; tireRR: string }
): { fl: number | null; fr: number | null; rl: number | null; rr: number | null } | null => {
  const psi = (s: string) => { const n = parseInt(String(s).replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };
  const fl = psi(d.tireFL), fr = psi(d.tireFR), rl = psi(d.tireRL), rr = psi(d.tireRR);
  if (fl == null && fr == null && rl == null && rr == null) return null;
  return { fl, fr, rl, rr };
};

// Map an in-memory Doc to the PDF generator's shape. Shared by the download
// action and the preview dialog so both render an identical document.
export function docToPdfDoc(d: Doc): PdfDoc {
  return {
    type: d.type,
    number: d.number,
    customer: d.customer || `${d.firstName} ${d.lastName}`.trim(),
    phone: d.phone,
    email: d.email,
    address: combinedAddress(d),
    vehicle: d.vehicle || [d.year, d.make, d.model].filter(Boolean).join(" "),
    vin: d.vin,
    year: d.year, make: d.make, model: d.model, engine: d.engine,
    color: d.color, licensePlate: d.licensePlate, plateState: d.plateState, unitNumber: d.unitNumber,
    mileageIn: d.mileageIn, mileageOut: d.mileageOut,
    items: d.items as any,
    status: d.status,
    taxRate: d.taxRate,
    createdAt: d.createdAt,
    promisedAt: d.promisedAt,
    serviceWriter: d.serviceWriter,
    technician: d.technician,
    technicianCert: d.technicianCert,
    keytag: d.keytag,
    paymentMethod: d.paymentMethod,
    customerNotes: d.customerNotes,
    diagnosisNotes: d.diagnosisNotes,
    tirePressures: tirePressuresPayload(d),
    subletCents: dollarsToCents(d.sublet),
    feesCents: dollarsToCents(d.fees),
    epaCents: dollarsToCents(d.epa),
    shopSuppliesCents: dollarsToCents(d.shopSupplies),
    amountPaidCents: d.amountPaidCents,
  };
}

function parseSupplierPartText(text: string): PickedPart | null {
  const raw = text.trim();
  if (!raw) return null;

  const lines = raw
    .split(/\r?\n/)
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const moneyMatches: Array<{ value: number; line: string }> = [];
  for (const line of lines) {
    const matches = line.matchAll(/(?:\$|USD\s*)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/gi);
    for (const match of matches) {
      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0) moneyMatches.push({ value, line });
    }
  }

  const priceMatch =
    moneyMatches.find(m => /unit|each|your price|price/i.test(m.line) && !/subtotal|total|tax|core|shipping/i.test(m.line)) ||
    moneyMatches.find(m => !/subtotal|total|tax|core|shipping/i.test(m.line)) ||
    moneyMatches[0];

  const skuLine = lines.find(line => /(part|sku|item|mfr|manufacturer)\s*(?:#|number|no\.?)?/i.test(line));
  const skuFromLabel = skuLine?.match(/(?:part|sku|item|mfr|manufacturer)\s*(?:#|number|no\.?)?\s*[:-]?\s*([A-Z0-9][A-Z0-9._-]{2,})/i)?.[1];
  const skuFallback = lines
    .map(line => line.match(/\b[A-Z0-9]{2,}[-_][A-Z0-9._-]{2,}\b/i)?.[0])
    .find(Boolean);
  const sku = (skuFromLabel || skuFallback || "").replace(/[),.;:]$/, "");

  const ignored = /^(add to cart|cart|qty|quantity|in stock|pickup|delivery|ship|save|compare|fitment|vehicle|part\s*#|sku\s*#|item\s*#|your price|price|subtotal|total|tax|core|change|manage)$/i;
  const descriptionLine = lines.find(line =>
    line.length > 2 &&
    !ignored.test(line) &&
    !line.includes("$") &&
    !/(part|sku|item|mfr|manufacturer)\s*(?:#|number|no\.?)?\s*[:-]?/i.test(line)
  ) || lines.find(line => line.length > 2 && !line.includes("$")) || "";

  if (!descriptionLine && !sku && !priceMatch) return null;

  const qtyMatch = raw.match(/\b(?:qty|quantity)\s*[:x-]?\s*(\d{1,3})\b/i) || raw.match(/\b(\d{1,3})\s*x\s+\$?\d/i);
  const qty = Math.max(1, Number(qtyMatch?.[1] || 1));
  const description = [descriptionLine || "Supplier part", sku ? `SKU: ${sku}` : ""].filter(Boolean).join(" - ");

  return {
    description,
    sku,
    brand: "",
    price: priceMatch?.value ?? 0,
    qty,
  };
}

interface Props { storeId: string }

export default function AutoRepairInvoicesSection({ storeId }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  // Authoritative DB rows for invoices and estimates (drives KPIs + status badges).
  const [dbInvoices, setDbInvoices] = useState<any[]>([]);
  const [dbEstimates, setDbEstimates] = useState<any[]>([]);
  // This is the Invoices view — default to the Invoices sub-tab (estimates have
  // their own dedicated section). Prefill/draft flows below still switch as needed.
  const [tab, setTab] = useState<"estimate" | "invoice">("invoice");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = new doc
  const [resumedDraftActive, setResumedDraftActive] = useState(false);
  const [draft, setDraft] = useState<Doc>(emptyDraft());
  const [fleetAccounts, setFleetAccounts] = useState<FleetAccount[]>([]);
  const [vinLoading, setVinLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [storeInfo, setStoreInfo] = useState<{ name?: string; address?: string; phone?: string; phone2?: string; email?: string; stateReg?: string; logoUrl?: string; termsPolicy?: string }>({});
  // Shop logo converted to a PNG data URL for embedding in the PDF (CORS-permitting).
  const [storeLogoData, setStoreLogoData] = useState<string | undefined>(undefined);
  // Shop-level defaults read from Auto Repair Settings (store_profiles.ar_settings).
  // They prefill new estimates/invoices; each document can still override them.
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [defaultLaborRate, setDefaultLaborRate] = useState(0);
  const [defaultPartsMarkupPct, setDefaultPartsMarkupPct] = useState(0);

  // List filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // Action dialogs
  const [paymentDoc, setPaymentDoc] = useState<{ id: string; number: string; customer: string; totalCents: number; amountPaidCents: number } | null>(null);
  const [sendDoc, setSendDoc] = useState<{ id: string; type: DocType; number: string; customer: string; email?: string; phone?: string } | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<{ id: string; type: DocType; number: string } | null>(null);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("name, address, phone, logo_url, ar_settings")
        .eq("id", storeId)
        .maybeSingle();
      if (data) {
        // Defaults come from the shop's Auto Repair Settings
        // (store_profiles.ar_settings) — the single source of truth.
        const arSettings = (data as any).ar_settings || {};
        setStoreInfo({
          name: data.name || undefined,
          address: data.address || undefined,
          phone: data.phone || undefined,
          phone2: arSettings.phone_l2 || arSettings.phone2 || undefined,
          email: arSettings.invoice_email || arSettings.contact_email || arSettings.email || undefined,
          stateReg: arSettings.state_reg_no || arSettings.state_reg || undefined,
          logoUrl: (data as any).logo_url || undefined,
          termsPolicy: arSettings.terms_policy || undefined,
        });
        if (arSettings.tax_rate != null) setDefaultTaxRate(normalizeTaxRate(arSettings.tax_rate));
        const labor = parseFloat(String(arSettings.labor_rate ?? "")) || 0;
        if (labor > 0) setDefaultLaborRate(labor);
        const partsMarkup = parseFloat(String(arSettings.parts_markup_pct ?? "")) || 0;
        setDefaultPartsMarkupPct(Math.max(0, partsMarkup));
      }
    })();
  }, [storeId]);

  // Convert the shop logo to a PNG data URL so jsPDF can embed it. Requires the
  // image host (Supabase storage) to allow cross-origin reads; on any failure
  // we silently fall back to a text-only header.
  useEffect(() => {
    const url = storeInfo.logoUrl;
    if (!url || typeof document === "undefined") { setStoreLogoData(undefined); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        if (!cancelled) setStoreLogoData(c.toDataURL("image/png"));
      } catch { /* tainted canvas / decode error — skip logo */ }
    };
    img.src = url;
    return () => { cancelled = true; };
  }, [storeInfo.logoUrl]);

  // Load invoices + estimates from DB. Both filter out soft-deleted rows.
  const reloadAll = async () => {
    if (!storeId) return;
    const [invRes, estRes] = await Promise.all([
      supabase.from("ar_invoices" as any).select("*").eq("store_id", storeId).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("ar_estimates" as any).select("*").eq("store_id", storeId).is("deleted_at", null).order("created_at", { ascending: false }),
    ]);
    if (!invRes.error && invRes.data) setDbInvoices(invRes.data as any[]);
    if (!estRes.error && estRes.data) setDbEstimates(estRes.data as any[]);

    const persisted: Doc[] = [];
    if (!invRes.error && invRes.data) {
      for (const row of invRes.data as any[]) {
        persisted.push({
          id: row.id,
          type: "invoice",
          number: row.number || "",
          customer: row.customer_name || "",
          firstName: (row.customer_name || "").split(" ")[0] || "",
          lastName: (row.customer_name || "").split(" ").slice(1).join(" ") || "",
          phone: row.customer_phone || "",
          email: row.customer_email || "",
          ...parseAddress(row.customer_address || ""),
          vin: row.vin || "",
          year: row.vehicle_year || "",
          make: row.vehicle_make || "",
          model: row.vehicle_model || "",
          trim: "", engine: row.vehicle_engine || "", transmission: "", driveType: "", bodyClass: "", doors: "", fuel: "", plant: "",
          mileageIn: row.mileage_in != null ? String(row.mileage_in) : "",
          mileageOut: row.mileage_out != null ? String(row.mileage_out) : "",
          color: row.vehicle_color || "",
          licensePlate: row.license_plate || "",
          plateState: row.plate_state || "",
          unitNumber: row.unit_number || "",
          vehicle: row.vehicle_label || "",
          promisedAt: row.promised_at ? String(row.promised_at).slice(0, 10) : "",
          serviceWriter: row.service_writer || "",
          technician: row.technician || "",
          technicianCert: row.technician_cert || "",
          keytag: row.keytag || "",
          paymentMethod: row.payment_method || "",
          tireFL: row.tire_pressures?.fl != null ? String(row.tire_pressures.fl) : "",
          tireFR: row.tire_pressures?.fr != null ? String(row.tire_pressures.fr) : "",
          tireRL: row.tire_pressures?.rl != null ? String(row.tire_pressures.rl) : "",
          tireRR: row.tire_pressures?.rr != null ? String(row.tire_pressures.rr) : "",
          sublet: (row.sublet_cents || 0) / 100,
          fees: (row.fees_cents || 0) / 100,
          epa: (row.epa_cents || 0) / 100,
          shopSupplies: (row.shop_supplies_cents || 0) / 100,
          amountPaidCents: row.amount_paid_cents || 0,
          items: Array.isArray(row.items) ? row.items : [],
          taxRate: normalizeTaxRate(row.tax_rate),
          dueDate: row.due_at ? String(row.due_at).slice(0, 10) : "",
          expiresAt: "",
          status: (row.status === "paid" ? "paid" : row.status === "partially_paid" ? "partially_paid" : row.status === "sent" ? "sent" : "draft") as Doc["status"],
          createdAt: row.created_at,
          fleetAccountId: row.fleet_account_id ?? null,
          poNumber: row.po_number ?? "",
          intakeMethod: row.intake_method ?? "",
          customerNotes: row.customer_notes ?? "",
          diagnosisNotes: row.diagnosis_notes ?? "",
        });
      }
    }
    if (!estRes.error && estRes.data) {
      for (const row of estRes.data as any[]) {
        persisted.push({
          id: row.id,
          type: "estimate",
          number: row.number || "",
          customer: row.customer_name || "",
          firstName: (row.customer_name || "").split(" ")[0] || "",
          lastName: (row.customer_name || "").split(" ").slice(1).join(" ") || "",
          phone: row.customer_phone || "",
          email: row.customer_email || "",
          ...parseAddress(row.customer_address || ""),
          vin: row.vin || "",
          year: row.vehicle_year || "",
          make: row.vehicle_make || "",
          model: row.vehicle_model || "",
          trim: "", engine: row.vehicle_engine || "", transmission: "", driveType: "", bodyClass: "", doors: "", fuel: "", plant: "",
          mileageIn: row.mileage_in != null ? String(row.mileage_in) : "",
          mileageOut: row.mileage_out != null ? String(row.mileage_out) : "",
          color: row.vehicle_color || "",
          licensePlate: row.license_plate || "",
          plateState: row.plate_state || "",
          unitNumber: row.unit_number || "",
          vehicle: row.vehicle_label || "",
          promisedAt: row.promised_at ? String(row.promised_at).slice(0, 10) : "",
          serviceWriter: row.service_writer || "",
          technician: row.technician || "",
          technicianCert: row.technician_cert || "",
          keytag: row.keytag || "",
          paymentMethod: row.payment_method || "",
          tireFL: row.tire_pressures?.fl != null ? String(row.tire_pressures.fl) : "",
          tireFR: row.tire_pressures?.fr != null ? String(row.tire_pressures.fr) : "",
          tireRL: row.tire_pressures?.rl != null ? String(row.tire_pressures.rl) : "",
          tireRR: row.tire_pressures?.rr != null ? String(row.tire_pressures.rr) : "",
          sublet: (row.sublet_cents || 0) / 100,
          fees: (row.fees_cents || 0) / 100,
          epa: (row.epa_cents || 0) / 100,
          shopSupplies: (row.shop_supplies_cents || 0) / 100,
          amountPaidCents: row.amount_paid_cents || 0,
          items: Array.isArray(row.items) ? row.items : Array.isArray(row.line_items) ? row.line_items : [],
          taxRate: normalizeTaxRate(row.tax_rate),
          dueDate: "",
          expiresAt: row.expires_at ? String(row.expires_at).slice(0, 10) : "",
          status: (row.status === "approved" ? "approved" : row.status === "sent" ? "sent" : "draft") as Doc["status"],
          createdAt: row.created_at,
          fleetAccountId: null,
          poNumber: "",
          intakeMethod: row.intake_method ?? "",
          customerNotes: row.customer_notes ?? "",
          diagnosisNotes: row.diagnosis_notes ?? "",
        });
      }
    }
    setDocs(persisted);
  };

  useEffect(() => { reloadAll();   }, [storeId]);

  // Hand-off from Vehicles section: open a fresh invoice draft pre-filled with
  // the chosen vehicle + owner. Cleared after consumption so refreshes don't re-open it.
  useEffect(() => {
    const raw = sessionStorage.getItem("ar_invoice_prefill");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      skipNextSave.current = true;
      setEditingId(null);
      setDraft({
        ...emptyDraft(),
        id: crypto.randomUUID(),
        type: p.type === "estimate" ? "estimate" : "invoice",
        number: nextDocNumber(p.type === "estimate" ? "estimate" : "invoice"),
        taxRate: defaultTaxRate,
        items: [{ id: crypto.randomUUID(), category: "labor", description: "", qty: 1, price: defaultLaborRate, hours: 1, discount: 0 }],
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        customer: p.customer_name ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(),
        phone: p.phone ?? "",
        email: p.email ?? "",
        ...parseAddress(p.address ?? ""),
        vin: p.vin ?? "",
        year: p.year ?? "",
        make: p.make ?? "",
        model: p.model ?? "",
        vehicle: p.vehicle_label ?? [p.year, p.make, p.model].filter(Boolean).join(" "),
      });
      setTab(p.type === "estimate" ? "estimate" : "invoice");
      setCreating(true);
      toast.info(`Prefilled new ${p.type === "estimate" ? "estimate" : "invoice"} for ${p.vehicle_label || "customer"}`);
    } catch {
      // ignore malformed prefill
    }
    sessionStorage.removeItem("ar_invoice_prefill");
    // Intentionally not in deps — should run once on mount, matching the
    // workorder_search pattern in AutoRepairWorkOrdersSection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load fleet accounts for this store (used by the invoice form to pick a fleet billing target).
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("ar_fleet_accounts" as any)
        .select("id, name, credit_limit_cents, po_required")
        .eq("store_id", storeId)
        .order("name", { ascending: true });
      if (!error && data) setFleetAccounts(data as unknown as FleetAccount[]);
    })();
  }, [storeId]);

  const draftKey = useMemo(() => `autorepair:invoice-draft:${storeId}`, [storeId]);
  const saveTimer = useRef<number | null>(null);
  const skipNextSave = useRef(true);
  // "<draft.id>:<vin>" we've already run the "last visit" mileage lookup for, so
  // we hit the network once per VIN per document (re-runs for a different doc).
  const mileageLookupKey = useRef<string>("");

  const subtotalByCat = (items: LineItem[], cat: LineCategory) => items.filter(i => i.category === cat).reduce((s, i) => s + lineAmount(i), 0);

  // Apply the shop's default tax rate to the open document when it has none yet.
  // Covers every entry path — new doc, resumed draft, editing an older invoice
  // that predates tax, and the case where settings finish loading after the
  // form opens. Runs once per open (deps don't change mid-edit), so it never
  // clobbers a rate the user has typed.
  useEffect(() => {
    if (!creating || defaultTaxRate <= 0) return;
    setDraft(d => (d.taxRate && d.taxRate > 0) ? d : { ...d, taxRate: defaultTaxRate });
  }, [creating, defaultTaxRate]);

  // Auto-fill "Mileage in" for a returning vehicle. When the editor holds a full
  // 17-char VIN and the field is still empty, pull the most recent invoice's
  // mileage_out for the same store + VIN. Runs once per VIN per open and never
  // clobbers a value the user typed or a loaded doc already carries.
  useEffect(() => {
    if (!creating || draft.mileageIn) return;
    const clean = draft.vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (clean.length !== 17) return;
    const key = `${draft.id}:${clean}`;
    if (mileageLookupKey.current === key) return;
    mileageLookupKey.current = key;
    (async () => {
      const base = supabase
        .from("ar_invoices" as any)
        .select("id, mileage_out")
        .eq("store_id", storeId)
        .eq("vin", clean)
        .not("mileage_out", "is", null);
      const filtered = editingId && UUID_RE.test(editingId) ? base.neq("id", editingId) : base;
      const { data, error } = await filtered.order("created_at", { ascending: false }).limit(1);
      const last = !error && data && data.length ? (data[0] as any).mileage_out : null;
      if (last == null) return;
      setDraft(d => d.mileageIn ? d : { ...d, mileageIn: String(last) });
      toast.info(`Mileage in set to ${Number(last).toLocaleString()} from this vehicle's last visit`);
    })();
  }, [creating, draft.id, draft.vin, draft.mileageIn, storeId, editingId]);

  // Autosave draft to localStorage (debounced) while creating
  useEffect(() => {
    if (!creating) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ ...draft, _editingId: editingId }));
        setLastSaved(new Date());
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 600);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [draft, creating, draftKey, editingId]);

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    setLastSaved(null);
    setSaveState("idle");
    setResumedDraftActive(false);
  };

  const startNew = (type: "estimate" | "invoice") => {
    // Try resume saved draft of same type
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as Doc;
        if (saved && saved.type === type) {
          const savedEditingId = UUID_RE.test(String((saved as any)._editingId ?? "")) ? String((saved as any)._editingId) : null;
          skipNextSave.current = true;
          setEditingId(savedEditingId);
          setResumedDraftActive(!savedEditingId);
          // Merge over a fresh draft so older saved drafts (from before new
          // fields existed) still have every field defined — keeps all inputs
          // controlled and avoids React's uncontrolled→controlled warning.
          setDraft({ ...emptyDraft(), ...saved });
          setLastSaved(new Date());
          setSaveState("saved");
          setCreating(true);
          toast.info(savedEditingId ? "Resumed your invoice changes" : "Resumed your saved draft");
          return;
        }
      }
    } catch {}
    skipNextSave.current = true;
    setEditingId(null);
    setResumedDraftActive(false);
    setDraft({
      ...emptyDraft(),
      id: crypto.randomUUID(), type, number: nextDocNumber(type), taxRate: defaultTaxRate,
      items: [{ id: crypto.randomUUID(), category: "labor", description: "", qty: 1, price: defaultLaborRate, hours: 1, discount: 0 }],
    });
    setLastSaved(null);
    setSaveState("idle");
    setCreating(true);
  };

  const startEdit = (doc: Doc) => {
    // Lock invoices once they've left the shop: editing a sent/paid invoice
    // would break the customer's copy and finance reconciliation. The row menu's
    // Duplicate action is the supported way to revise a locked invoice.
    if (doc.type === "invoice" && (doc.status === "sent" || doc.status === "paid" || doc.status === "partially_paid")) {
      toast.error(`This invoice is ${doc.status.replace("_", " ")} and can't be edited. Duplicate it to make changes.`);
      return;
    }
    skipNextSave.current = true;
    setEditingId(doc.id);
    setResumedDraftActive(false);
    setDraft(doc);
    setLastSaved(null);
    setSaveState("idle");
    setCreating(true);
  };

  const startDuplicate = (doc: Doc) => {
    skipNextSave.current = true;
    setEditingId(null);
    setResumedDraftActive(false);
    setDraft({ ...doc, id: crypto.randomUUID(), number: nextDocNumber(doc.type), status: "draft", createdAt: new Date().toISOString() });
    setLastSaved(null);
    setSaveState("idle");
    setCreating(true);
    toast.info("Duplicated — review and save");
  };

  const discardDraft = () => {
    clearDraft();
    setCreating(false);
    setEditingId(null);
    setResumedDraftActive(false);
    toast.success("Draft discarded");
  };

  const lookupVin = async (vin: string) => {
    const clean = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (clean.length !== 17) { toast.error("VIN must be 17 characters (no I, O, Q)"); return; }
    setVinLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vin-decode", {
        body: { vin: clean },
      });
      if (error) throw new Error(error.message || "Function call failed");
      if (!data?.ok) throw new Error(data?.error || "No vehicle data found");

      setDraft(d => ({
        ...d,
        vin: data.vin || clean,
        year: data.year || "",
        make: data.make || "",
        model: data.model || "",
        trim: data.trim || "",
        engine: data.engine || "",
        transmission: data.transmission || "",
        driveType: data.driveType || "",
        bodyClass: data.bodyClass || "",
        doors: data.doors || "",
        fuel: data.fuel || "",
        plant: data.plant || "",
        vehicle: data.vehicle || [data.year, data.make, data.model].filter(Boolean).join(" "),
      }));

      toast.success(data.partial ? "Vehicle details auto-filled (partial)" : "Vehicle details auto-filled");
    } catch (e: any) {
      toast.error(`VIN lookup failed: ${e?.message || "network error"}`);
    } finally {
      setVinLoading(false);
    }
  };

  const saveDraftNow = (showToast = true) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ ...draft, _editingId: editingId }));
      setLastSaved(new Date());
      setSaveState("saved");
      if (showToast) toast.success("Draft saved");
    } catch {
      if (showToast) toast.error("Could not save draft");
    }
  };

  const closeEditor = () => {
    if (editingId && UUID_RE.test(editingId)) {
      void save();
      return;
    }
    saveDraftNow(false);
    setCreating(false);
  };

  const save = async (opts: { closeAfterSave?: boolean } = {}) => {
    const closeAfterSave = opts.closeAfterSave ?? true;
    if (!draft.firstName || !draft.lastName || !draft.vehicle) { toast.error("First name, last name, and vehicle are required"); return; }
    if (!draft.items.some(i => lineAmount(i) > 0)) { toast.error("Add at least one line item with an amount greater than $0"); return; }
    const customer = `${draft.firstName} ${draft.lastName}`.trim();
    const t = docTotals(draft.items, draft.taxRate);
    const subtotalCents = Math.round(t.subtotal * 100);
    const discountCents = Math.round(t.discount * 100);
    const taxCents = Math.round(t.tax * 100);
    const extraChargeCents = Math.round(((draft.sublet || 0) + (draft.fees || 0) + (draft.epa || 0) + (draft.shopSupplies || 0)) * 100);
    const totalCents = Math.round(t.total * 100) + extraChargeCents;
    const tableName = draft.type === "invoice" ? "ar_invoices" : "ar_estimates";

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        store_id: storeId,
        number: draft.number,
        customer_name: customer,
        customer_phone: draft.phone || null,
        customer_email: draft.email || null,
        customer_address: combinedAddress(draft) || null,
        vehicle_label: draft.vehicle || null,
        vin: draft.vin || null,
        vehicle_year: draft.year || null,
        vehicle_make: draft.make || null,
        vehicle_model: draft.model || null,
        vehicle_engine: draft.engine?.trim() || null,
        mileage_in: odoInt(draft.mileageIn),
        mileage_out: odoInt(draft.mileageOut),
        vehicle_color: draft.color?.trim() || null,
        license_plate: draft.licensePlate?.trim() || null,
        plate_state: draft.plateState?.trim() || null,
        unit_number: draft.unitNumber?.trim() || null,
        promised_at: draft.promisedAt || null,
        service_writer: draft.serviceWriter?.trim() || null,
        technician: draft.technician?.trim() || null,
        technician_cert: draft.technicianCert?.trim() || null,
        keytag: draft.keytag?.trim() || null,
        payment_method: draft.paymentMethod?.trim() || null,
        tire_pressures: tirePressuresPayload(draft),
        sublet_cents: dollarsToCents(draft.sublet),
        fees_cents: dollarsToCents(draft.fees),
        epa_cents: dollarsToCents(draft.epa),
        shop_supplies_cents: dollarsToCents(draft.shopSupplies),
        items: draft.items as any,
        subtotal_cents: subtotalCents,
        discount_cents: discountCents,
        tax_cents: taxCents,
        tax_rate: t.taxRate,
        total_cents: totalCents,
        status: draft.status === "paid" ? "paid" : draft.status === "sent" ? "sent" : "draft",
        intake_method: draft.intakeMethod || null,
        customer_notes: draft.customerNotes.trim() || null,
        diagnosis_notes: draft.diagnosisNotes.trim() || null,
      };

      // Fleet billing fields only apply to invoices (the columns don't exist on ar_estimates).
      if (draft.type === "invoice") {
        payload.fleet_account_id = draft.fleetAccountId || null;
        payload.po_number = draft.poNumber.trim() || null;
        payload.due_at = draft.dueDate || null;       // payment due date (overdue KPI)
      } else {
        payload.expires_at = draft.expiresAt || null; // estimate valid-until (auto-expire cron)
      }

      // Only treat as update if we have a real DB uuid.
      const isRealId = !!editingId && UUID_RE.test(editingId);
      if (isRealId) {
        const { error } = await supabase.from(tableName as any).update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success(`${draft.type === "invoice" ? "Invoice" : "Estimate"} ${draft.number} updated`);
      } else {
        payload.created_by = user?.id;
        // Assign the authoritative, guaranteed-unique sequential number at save.
        payload.number = await assignDocNumber(storeId, draft.type);
        const { error } = await supabase.from(tableName as any).insert(payload);
        if (error) throw error;
        toast.success(`${draft.type === "invoice" ? "Invoice" : "Estimate"} ${payload.number} saved`);
      }
      await reloadAll();
    } catch (e: any) {
      toast.error(`Could not save: ${e?.message || "unknown error"}`);
      return;
    }
    clearDraft();
    if (closeAfterSave) {
      setEditingId(null);
      setCreating(false);
    } else {
      setLastSaved(new Date());
      setSaveState("saved");
    }
  };

  // Save the current estimate draft, then convert it into an invoice and open it for edit.
  const saveAndConvertToInvoice = async () => {
    if (draft.type !== "estimate") return;
    if (!draft.firstName || !draft.lastName || !draft.vehicle) {
      toast.error("First name, last name, and vehicle are required");
      return;
    }
    const customer = `${draft.firstName} ${draft.lastName}`.trim();
    const t = docTotals(draft.items, draft.taxRate);
    const subtotalCents = Math.round(t.subtotal * 100);
    const discountCents = Math.round(t.discount * 100);
    const taxCents = Math.round(t.tax * 100);
    const extraChargeCents = Math.round(((draft.sublet || 0) + (draft.fees || 0) + (draft.epa || 0) + (draft.shopSupplies || 0)) * 100);
    const totalCents = Math.round(t.total * 100) + extraChargeCents;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const basePayload: any = {
        store_id: storeId,
        customer_name: customer,
        customer_phone: draft.phone || null,
        customer_email: draft.email || null,
        customer_address: combinedAddress(draft) || null,
        vehicle_label: draft.vehicle || null,
        vin: draft.vin || null,
        vehicle_year: draft.year || null,
        vehicle_make: draft.make || null,
        vehicle_model: draft.model || null,
        vehicle_engine: draft.engine?.trim() || null,
        mileage_in: odoInt(draft.mileageIn),
        mileage_out: odoInt(draft.mileageOut),
        vehicle_color: draft.color?.trim() || null,
        license_plate: draft.licensePlate?.trim() || null,
        plate_state: draft.plateState?.trim() || null,
        unit_number: draft.unitNumber?.trim() || null,
        promised_at: draft.promisedAt || null,
        service_writer: draft.serviceWriter?.trim() || null,
        technician: draft.technician?.trim() || null,
        technician_cert: draft.technicianCert?.trim() || null,
        keytag: draft.keytag?.trim() || null,
        payment_method: draft.paymentMethod?.trim() || null,
        tire_pressures: tirePressuresPayload(draft),
        sublet_cents: dollarsToCents(draft.sublet),
        fees_cents: dollarsToCents(draft.fees),
        epa_cents: dollarsToCents(draft.epa),
        shop_supplies_cents: dollarsToCents(draft.shopSupplies),
        items: draft.items as any,
        subtotal_cents: subtotalCents,
        discount_cents: discountCents,
        tax_cents: taxCents,
        tax_rate: t.taxRate,
        total_cents: totalCents,
        intake_method: draft.intakeMethod || null,
        customer_notes: draft.customerNotes.trim() || null,
        diagnosis_notes: draft.diagnosisNotes.trim() || null,
      };

      // 1. Persist the estimate (insert if new, update if editing a real DB row).
      let estimateId = editingId;
      const isRealEstimateId = !!estimateId && UUID_RE.test(estimateId);
      if (isRealEstimateId) {
        const { error } = await supabase
          .from("ar_estimates" as any)
          .update({ ...basePayload, number: draft.number, status: "approved" })
          .eq("id", estimateId);
        if (error) throw error;
      } else {
        const estimateNumber = await assignDocNumber(storeId, "estimate");
        const { data, error } = await supabase
          .from("ar_estimates" as any)
          .insert({ ...basePayload, number: estimateNumber, status: "approved", created_by: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        estimateId = (data as any).id;
      }

      // 2. Create the invoice from this estimate.
      const invoiceNumber = await assignDocNumber(storeId, "invoice");
      const { data: invRow, error: invErr } = await supabase
        .from("ar_invoices" as any)
        .insert({
          ...basePayload,
          number: invoiceNumber,
          status: "draft",
          estimate_id: estimateId,
          created_by: user?.id,
        })
        .select("id")
        .single();
      if (invErr) throw invErr;

      toast.success(`Converted to invoice ${invoiceNumber}`);
      clearDraft();
      await reloadAll();

      // 3. Open the newly created invoice so the user can review/send/charge.
      setTab("invoice");
      setEditingId((invRow as any).id);
      setDraft({
        ...draft,
        id: (invRow as any).id,
        type: "invoice",
        number: invoiceNumber,
        status: "draft",
      });
      setCreating(true);
    } catch (e: any) {
      toast.error(`Conversion failed: ${e?.message || "unknown error"}`);
    }
  };

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setDraft(d => ({ ...d, items: d.items.map(i => i.id === id ? { ...i, ...patch } : i) }));

  const [showPartPicker, setShowPartPicker] = useState(false);
  const [showLaborGuide, setShowLaborGuide] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showSupplierPaste, setShowSupplierPaste] = useState(false);
  const [supplierPasteText, setSupplierPasteText] = useState("");
  const supplierPastePreview = useMemo(() => parseSupplierPartText(supplierPasteText), [supplierPasteText]);
  const applyPartsMarkup = (price: number) => Number((price * (1 + defaultPartsMarkupPct / 100)).toFixed(2));
  const calculateMarkedUpPrice = (originalPrice: number, markupPct: number) =>
    Number((Math.max(0, originalPrice) * (1 + Math.max(0, markupPct) / 100)).toFixed(2));

  const addItem = (category: LineCategory = "labor") => setDraft(d => {
    const line = category === "labor"
      ? { id: crypto.randomUUID(), category, description: "", qty: 1, price: defaultLaborRate, hours: 1, discount: 0 }
        : category === "part"
        ? { id: crypto.randomUUID(), category, description: "", qty: 1, price: 0, originalPrice: 0, markupPct: defaultPartsMarkupPct, discount: 0 }
      : { id: crypto.randomUUID(), category, description: "", qty: 1, price: 0, discount: 0 };
    return { ...d, items: category === "part" ? [line, ...d.items] : [...d.items, line] };
  });
  const removeItem = (id: string) => setDraft(d => ({ ...d, items: d.items.filter(i => i.id !== id) }));

  const addFromCatalog = (picked: PickedPart & { originalPrice?: number; markupPct?: number }) => {
    const line = {
      id: crypto.randomUUID(),
      category: "part" as LineCategory,
      description: picked.description,
      qty: picked.qty,
      price: picked.price,
      originalPrice: picked.originalPrice,
      markupPct: picked.markupPct ?? (picked.originalPrice && picked.originalPrice > 0
        ? Number((((picked.price - picked.originalPrice) / picked.originalPrice) * 100).toFixed(2))
        : defaultPartsMarkupPct),
      discount: 0,
      _partId: picked.partId,
    };
    setDraft(d => ({
      ...d,
      items: [line, ...d.items],
    }));
  };

  const pasteSupplierClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error("Clipboard is empty");
        return;
      }
      setSupplierPasteText(text);
      toast.success("Clipboard pasted");
    } catch {
      toast.error("Paste permission blocked - use Ctrl+V in the box");
    }
  };

  const addFromSupplierPaste = () => {
    const parsed = parseSupplierPartText(supplierPasteText);
    if (!parsed || (!parsed.description.trim() && !parsed.sku.trim())) {
      toast.error("Paste item text from AutoZonePro first");
      return;
    }
    if (!parsed.price || parsed.price <= 0) {
      toast.error("I could not find a price. Add the part manually or include the price in the pasted text.");
      return;
    }
    addFromCatalog({ ...parsed, price: applyPartsMarkup(parsed.price), originalPrice: parsed.price, markupPct: defaultPartsMarkupPct });
    setSupplierPasteText("");
    setShowSupplierPaste(false);
    toast.success(defaultPartsMarkupPct > 0 ? `Supplier part added with ${defaultPartsMarkupPct}% markup` : "Supplier part added to invoice");
  };

  // Add a labor line from the standard Labor Guide (prefills the shop's $/hr rate).
  const addFromLaborGuide = (entry: LaborGuideEntry) => {
    setDraft(d => ({
      ...d,
      items: [
        ...d.items,
        { id: crypto.randomUUID(), category: "labor" as LineCategory, description: entry.service, qty: 1, price: defaultLaborRate, hours: entry.baseHours, discount: 0 },
      ],
    }));
    toast.success(`Added "${entry.service}" (${entry.baseHours}h)`);
  };

  // Expand a Price Book service into its labor + parts line items.
  const addFromServiceCatalog = (lines: ServiceCatalogPick[]) => {
    const mapped: LineItem[] = lines.map(l => {
      const price = (l.unit_cents ?? 0) / 100;
      if (l.kind === "labor") {
        return { id: crypto.randomUUID(), category: "labor", description: l.name, qty: 1, price: price > 0 ? price : defaultLaborRate, hours: l.qty || 1, discount: 0 };
      }
      if (l.kind === "part") {
        return { id: crypto.randomUUID(), category: "part", description: l.name, qty: l.qty || 1, price, originalPrice: price, markupPct: 0, discount: 0 };
      }
      return { id: crypto.randomUUID(), category: "diagnosis", description: l.name, qty: 1, price, discount: 0 };
    });
    if (mapped.length === 0) return;
    setDraft(d => ({ ...d, items: [...d.items, ...mapped] }));
    toast.success(`Added ${mapped.length} line${mapped.length === 1 ? "" : "s"} from Price Book`);
  };

  // ---- Hooks that must run on EVERY render (before any early return) ----
  // Build display rows from authoritative DB data for the active tab.
  const dbRowsForTab = tab === "invoice" ? dbInvoices : dbEstimates;

  const rows: RowDoc[] = useMemo(() => {
    const fromDb: RowDoc[] = dbRowsForTab.map((r: any) => {
      const due = r.due_at ? new Date(r.due_at) : null;
      const isOverdue = !!(due && r.status !== "paid" && due < new Date());
      return {
        id: r.id,
        type: tab,
        number: r.number || "",
        customer: r.customer_name || "",
        vehicle: r.vehicle_label || "",
        totalCents: r.total_cents ?? 0,
        amountPaidCents: r.amount_paid_cents ?? 0,
        status: r.status || "draft",
        isOverdue,
      };
    });
    let all = [...fromDb];

    // Dedupe by id (defensive) AND by number+customer to avoid visual duplicates
    const seenIds = new Set<string>();
    const seenKey = new Set<string>();
    all = all.filter((r) => {
      if (seenIds.has(r.id)) return false;
      const key = `${r.number}|${r.customer}`.toLowerCase();
      if (seenKey.has(key)) return false;
      seenIds.add(r.id);
      seenKey.add(key);
      return true;
    });

    if (query.trim()) {
      const q = query.toLowerCase();
      all = all.filter((r) =>
        r.number.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.vehicle.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      all = all.filter((r) => statusFilter === "overdue" ? r.isOverdue : r.status === statusFilter);
    }
    all.sort((a, b) => {
      if (sortKey === "amount_desc") return b.totalCents - a.totalCents;
      if (sortKey === "customer_asc") return a.customer.localeCompare(b.customer);
      const aRow = dbRowsForTab.find((r: any) => r.id === a.id);
      const bRow = dbRowsForTab.find((r: any) => r.id === b.id);
      const at = aRow ? new Date(aRow.created_at).getTime() : 0;
      const bt = bRow ? new Date(bRow.created_at).getTime() : 0;
      return sortKey === "oldest" ? at - bt : bt - at;
    });
    return all;
     
  }, [dbRowsForTab, tab, query, statusFilter, sortKey]);

  // Read persisted draft (if any) to surface a "Continue editing" banner
  let savedDraftPreview: Doc | null = null;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(draftKey) : null;
    if (raw) savedDraftPreview = JSON.parse(raw) as Doc;
  } catch { /* ignore */ }

  if (creating) {
    const isEditingExisting = !!editingId && UUID_RE.test(editingId);
    const docNoun = draft.type === "estimate" ? "Estimate" : "Invoice";
    const editorAction = isEditingExisting ? "Update" : resumedDraftActive ? "Continue" : "Create";
    const primaryAction = isEditingExisting ? `Update ${docNoun}` : resumedDraftActive ? `Save ${docNoun}` : `Create ${docNoun}`;
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={closeEditor}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base flex items-center gap-2">
                {draft.type === "estimate" ? <ClipboardList className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                {editorAction} {docNoun} · {draft.number}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-1">
                {saveState === "saving" && (<><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>)}
                {saveState === "saved" && (<><Check className="w-3 h-3 text-primary" /> Saved{lastSaved ? ` · ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</>)}
                {saveState === "idle" && (<><CloudUpload className="w-3 h-3" /> Autosave on</>)}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPreviewDoc({ ...draft, customer: `${draft.firstName} ${draft.lastName}`.trim(), address: combinedAddress(draft) })} className="gap-1.5"><Eye className="w-3.5 h-3.5" /> Preview</Button>
              <Button variant="outline" size="sm" onClick={() => isEditingExisting ? void save({ closeAfterSave: false }) : saveDraftNow()}>{isEditingExisting ? "Save changes" : "Save draft"}</Button>
              <Button variant="ghost" size="sm" onClick={discardDraft} className="text-destructive hover:text-destructive">Discard</Button>
              {draft.type === "estimate" && (
                <Button variant="outline" size="sm" onClick={saveAndConvertToInvoice} className="gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Convert to Invoice
                </Button>
              )}
              <Button onClick={() => save()} className="gap-1.5">
                {primaryAction}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Customer details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">First name</label>
                  <Input placeholder="First name" value={draft.firstName} onChange={e => setDraft({ ...draft, firstName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Last name</label>
                  <Input placeholder="Last name" value={draft.lastName} onChange={e => setDraft({ ...draft, lastName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <Input type="tel" placeholder="(555) 123-4567" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input type="email" placeholder="customer@example.com" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Address</label>
                  <AddressAutocomplete
                    placeholder="Street address"
                    value={draft.address || ""}
                    onInputChange={(v) => setDraft(d => ({ ...d, address: v }))}
                    onSelect={(place) => setDraft(d => ({ ...d, ...parseAddress(place.address) }))}
                    onClear={() => setDraft(d => ({ ...d, address: "", city: "", state: "", zip: "" }))}
                  />
                </div>
                <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">City</label>
                    <Input placeholder="City" value={draft.city || ""} onChange={e => setDraft({ ...draft, city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">State</label>
                    <Input placeholder="State" value={draft.state || ""} onChange={e => setDraft({ ...draft, state: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">ZIP code</label>
                    <Input placeholder="ZIP" value={draft.zip || ""} onChange={e => setDraft({ ...draft, zip: e.target.value })} />
                  </div>
                </div>
              </div>

              {draft.type === "invoice" && fleetAccounts.length > 0 && (() => {
                const selectedFleet = fleetAccounts.find(f => f.id === draft.fleetAccountId) ?? null;
                const FLEET_NONE = "__none__";
                return (
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Truck className="w-3.5 h-3.5" /> Fleet billing (optional)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Fleet account</label>
                        <Select
                          value={draft.fleetAccountId ?? FLEET_NONE}
                          onValueChange={(v) => setDraft({ ...draft, fleetAccountId: v === FLEET_NONE ? null : v })}
                        >
                          <SelectTrigger><SelectValue placeholder="None — bill customer directly" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={FLEET_NONE}>None — bill customer directly</SelectItem>
                            {fleetAccounts.map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}{f.po_required ? " · PO required" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedFleet && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">
                            PO number{selectedFleet.po_required ? " *" : ""}
                          </label>
                          <Input
                            placeholder={selectedFleet.po_required ? "Required by fleet" : "Optional"}
                            value={draft.poNumber}
                            onChange={e => setDraft({ ...draft, poNumber: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                    {selectedFleet && selectedFleet.credit_limit_cents > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Credit limit: ${(selectedFleet.credit_limit_cents / 100).toLocaleString()}. Outstanding balance + this invoice must stay under the limit.
                      </p>
                    )}
                    {selectedFleet?.po_required && !draft.poNumber.trim() && (
                      <p className="text-[11px] text-amber-600">PO number is required for this fleet account.</p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vehicle details</CardTitle>
              {draft.vin && draft.vin.length === 17 && (
                <span className="text-[10px] text-muted-foreground font-mono">VIN-decoded</span>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">VIN (auto-fills vehicle details)</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="17-character VIN"
                    maxLength={17}
                    value={draft.vin}
                    onChange={e => setDraft({ ...draft, vin: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => lookupVin(draft.vin)}
                    disabled={vinLoading || draft.vin.length !== 17}
                    className="gap-1.5 shrink-0"
                  >
                    {vinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
                    Decode
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Year</label>
                  <Input placeholder="2020" value={draft.year} onChange={e => setDraft({ ...draft, year: e.target.value, vehicle: [e.target.value, draft.make, draft.model].filter(Boolean).join(" ") })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Make</label>
                  <Input placeholder="Toyota" value={draft.make} onChange={e => setDraft({ ...draft, make: e.target.value, vehicle: [draft.year, e.target.value, draft.model].filter(Boolean).join(" ") })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Model</label>
                  <Input placeholder="Camry" value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value, vehicle: [draft.year, draft.make, e.target.value].filter(Boolean).join(" ") })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Trim</label>
                  <Input placeholder="LE" value={draft.trim} onChange={e => setDraft({ ...draft, trim: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Engine</label>
                  <Input placeholder="2.5L L4" value={draft.engine} onChange={e => setDraft({ ...draft, engine: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Drivetrain</label>
                  <select
                    value={draft.driveType}
                    onChange={e => setDraft({ ...draft, driveType: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select…</option>
                    <option value="FWD">FWD · Front-Wheel Drive</option>
                    <option value="RWD">RWD · Rear-Wheel Drive</option>
                    <option value="AWD">AWD · All-Wheel Drive</option>
                    <option value="4WD">4WD · 4x4 / Four-Wheel Drive</option>
                    <option value="2WD">2WD · Two-Wheel Drive</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Mileage in</label>
                  <Input
                    inputMode="numeric"
                    placeholder="e.g. 84120"
                    value={draft.mileageIn}
                    onChange={e => setDraft({ ...draft, mileageIn: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Mileage out</label>
                  <Input
                    inputMode="numeric"
                    placeholder="At pickup"
                    value={draft.mileageOut}
                    onChange={e => setDraft({ ...draft, mileageOut: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Color</label>
                  <Input placeholder="e.g. Red" value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">License plate</label>
                  <Input placeholder="Plate #" value={draft.licensePlate} onChange={e => setDraft({ ...draft, licensePlate: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Plate state</label>
                  <Input placeholder="MI" maxLength={2} value={draft.plateState} onChange={e => setDraft({ ...draft, plateState: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Unit #</label>
                  <Input placeholder="Fleet unit #" value={draft.unitNumber} onChange={e => setDraft({ ...draft, unitNumber: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Intake — how the vehicle arrives / leaves */}
        <Card>
          <CardContent className="py-3 px-3">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold">Service Intake</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { id: "drop-off", label: "Drop Off", icon: KeyRound },
                { id: "towing", label: "Towing", icon: Truck },
                { id: "in-shop", label: "In Shop", icon: Car },
                { id: "pickup", label: "Pickup", icon: LogOut },
              ] as const).map(opt => {
                const Icon = opt.icon;
                const active = (draft as any).intakeMethod === opt.id;
                return (
                  <button type="button"
                    key={opt.id}
                    onClick={() => setDraft(d => ({ ...d, intakeMethod: opt.id } as any))}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center transition-all hover:border-primary/60 hover:bg-primary/5 ${
                      active ? "border-primary bg-primary/10" : "border-border bg-card"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-[11px] font-medium leading-none ${active ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Service Order — writer / technician / promise / key tag / payment + tire pressures */}
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold">Service Order</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Service writer</label>
                <Input placeholder="Front desk" value={draft.serviceWriter} onChange={e => setDraft({ ...draft, serviceWriter: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Technician</label>
                <Input placeholder="Tech name" value={draft.technician} onChange={e => setDraft({ ...draft, technician: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Technician cert #</label>
                <Input placeholder="e.g. M262615" value={draft.technicianCert} onChange={e => setDraft({ ...draft, technicianCert: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Promise date</label>
                <Input type="date" value={draft.promisedAt} onChange={e => setDraft({ ...draft, promisedAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Key tag</label>
                <Input placeholder="e.g. 5145" value={draft.keytag} onChange={e => setDraft({ ...draft, keytag: e.target.value })} />
              </div>
              {draft.type === "invoice" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Payment method</label>
                  <select
                    value={draft.paymentMethod}
                    onChange={e => setDraft({ ...draft, paymentMethod: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select…</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Check">Check</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-border space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Tire pressure (PSI)</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([["tireFL", "Front left"], ["tireFR", "Front right"], ["tireRL", "Rear left"], ["tireRR", "Rear right"]] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <Input inputMode="numeric" placeholder="PSI" value={(draft as any)[key]} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value.replace(/\D/g, "") }))} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 pt-6">
            <Tabs defaultValue="labor" className="w-full">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                  <TabsTrigger value="labor" className="gap-1.5"><Wrench className="w-3.5 h-3.5" /> Labor</TabsTrigger>
                  <TabsTrigger value="part" className="gap-1.5"><Package className="w-3.5 h-3.5" /> Parts</TabsTrigger>
                  <TabsTrigger value="diagnosis" className="gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Diagnosis</TabsTrigger>
                </TabsList>
              </div>

              {(["labor", "part", "diagnosis"] as LineCategory[]).map(cat => {
                const rows = draft.items.filter(i => i.category === cat);
                const catSubtotal = subtotalByCat(draft.items, cat);
                return (
                  <TabsContent key={cat} value={cat} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize">
                        {cat === "labor" ? "Labor services" : cat === "part" ? "Parts & materials" : "Diagnosis & inspection"}
                      </span>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {cat === "labor" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setShowServicePicker(true)} className="h-8 gap-1 border-primary/50 text-primary hover:bg-primary/5">
                              <BookOpen className="w-3.5 h-3.5" /> Price Book
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowLaborGuide(true)} className="h-8 gap-1 border-primary/50 text-primary hover:bg-primary/5">
                              <BookOpen className="w-3.5 h-3.5" /> Labor guide
                            </Button>
                          </>
                        )}
                        {cat === "part" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setShowSupplierPaste(s => !s)} className="h-8 gap-1 border-primary/50 text-primary hover:bg-primary/5">
                              <ClipboardPaste className="w-3.5 h-3.5" /> Paste supplier item
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowPartPicker(true)} className="h-8 gap-1 border-primary/50 text-primary hover:bg-primary/5">
                              <BookOpen className="w-3.5 h-3.5" /> Pick from catalog
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => addItem(cat)} className="h-8 gap-1">
                          <Plus className="w-3.5 h-3.5" /> Add {cat === "part" ? "part" : cat === "labor" ? "labor" : "diagnosis"}
                        </Button>
                      </div>
                    </div>

                    {cat === "part" && showSupplierPaste && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold flex items-center gap-1.5">
                              <ClipboardPaste className="w-3.5 h-3.5" /> Paste from AutoZonePro
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Copy the product/cart row in AutoZonePro, come back here, paste it, then add it to this invoice.
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSupplierPaste(false)}>Close</Button>
                        </div>
                        <Textarea
                          value={supplierPasteText}
                          onChange={e => setSupplierPasteText(e.target.value)}
                          placeholder={"Paste copied supplier text here, for example:\nDuralast Gold Brake Pads\nPart # DG1363\nYour Price $49.99\nQty 1"}
                          className="min-h-[104px] text-sm"
                        />
                        {supplierPastePreview && (
                          <div className="rounded-lg border bg-background/80 px-3 py-2 text-xs">
                            <p className="font-semibold text-foreground truncate">{supplierPastePreview.description}</p>
                            <p className="text-muted-foreground">
                              {supplierPastePreview.sku ? `Part # ${supplierPastePreview.sku} · ` : ""}
                              Qty {supplierPastePreview.qty} · ${supplierPastePreview.price.toFixed(2)}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={pasteSupplierClipboard}>
                            <ClipboardPaste className="w-3.5 h-3.5" /> Paste clipboard
                          </Button>
                          <Button size="sm" className="h-8 gap-1.5" onClick={addFromSupplierPaste} disabled={!supplierPasteText.trim()}>
                            <Plus className="w-3.5 h-3.5" /> Add to invoice
                          </Button>
                        </div>
                      </div>
                    )}

                    {rows.length === 0 && (
                      <div className="text-center py-8 border border-dashed border-border rounded-lg space-y-2">
                        <p className="text-xs text-muted-foreground">
                          No {cat === "part" ? "parts" : cat === "labor" ? "labor lines" : "diagnosis fees"} yet.
                        </p>
                        {cat === "part" && (
                          <button type="button"
                            onClick={() => setShowPartPicker(true)}
                            className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Pick from your parts catalog
                          </button>
                        )}
                      </div>
                    )}

                    {/* Headers */}
                    {rows.length > 0 && (
                      <div className={`grid gap-2 px-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide ${
                        cat === "labor"
                          ? "grid-cols-[1fr_70px_90px_90px_90px_120px_90px_36px]"
                          : cat === "part"
                          ? "grid-cols-[1fr_70px_90px_120px_90px_36px]"
                          : "grid-cols-[1fr_110px_120px_90px_36px]"
                      }`}>
                        <span>Service detail</span>
                        {cat === "labor" && <><span>Hours</span><span>Hour rate</span><span>Discount</span><span className="text-right">Total</span></>}
                        {cat === "part" && <><span>Qty</span><span>Original</span><span>Markup %</span><span>Unit price</span><span>Discount</span><span className="text-right">Total</span></>}
                        {cat === "diagnosis" && <><span>Flat fee</span><span>Discount</span><span className="text-right">Total</span></>}
                        <span></span>
                      </div>
                    )}

                    {rows.map(it => {
                      const dType = it.discountType ?? "pct";
                      const discountField = (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={dType === "pct" ? 100 : undefined}
                            placeholder={dType === "pct" ? "0" : "0.00"}
                            value={it.discount ? it.discount : ""}
                            onChange={e => updateItem(it.id, { discount: e.target.value === "" ? 0 : Number(e.target.value) })}
                            className="flex-1 min-w-0"
                          />
                          <div className="flex rounded-md border border-input overflow-hidden shrink-0">
                            <button
                              type="button"
                              onClick={() => updateItem(it.id, { discountType: "pct" })}
                              className={`px-1.5 text-[11px] font-semibold ${dType === "pct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                              aria-label="Percent discount"
                            >%</button>
                            <button
                              type="button"
                              onClick={() => updateItem(it.id, { discountType: "amt" })}
                              className={`px-1.5 text-[11px] font-semibold border-l border-input ${dType === "amt" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                              aria-label="Flat amount discount"
                            >$</button>
                          </div>
                        </div>
                      );
                      return (
                      <div
                        key={it.id}
                        className={`grid gap-2 items-center ${
                          cat === "labor"
                            ? "grid-cols-[1fr_70px_90px_90px_90px_120px_90px_36px]"
                            : cat === "part"
                            ? "grid-cols-[1fr_70px_90px_120px_90px_36px]"
                            : "grid-cols-[1fr_110px_120px_90px_36px]"
                        }`}
                      >
                        <Input
                          placeholder={cat === "labor" ? "e.g. Front brake pad replacement" : cat === "part" ? "e.g. Front brake pads (set)" : "e.g. AC system diagnostic"}
                          value={it.description}
                          onChange={e => updateItem(it.id, { description: e.target.value })}
                        />

                        {cat === "labor" && (
                          <>
                            <Input type="number" inputMode="decimal" min={0} step={0.25} placeholder="0" value={it.hours ? it.hours : ""} onChange={e => updateItem(it.id, { hours: e.target.value === "" ? 0 : Number(e.target.value) })} />
                            <Input type="number" inputMode="decimal" min={0} step={0.01} placeholder="0.00" value={it.price ? it.price : ""} onChange={e => updateItem(it.id, { price: e.target.value === "" ? 0 : Number(e.target.value) })} />
                            {discountField}
                          </>
                        )}

                        {cat === "part" && (
                          <>
                            <Input type="number" inputMode="numeric" min={1} placeholder="1" value={it.qty ? it.qty : ""} onChange={e => updateItem(it.id, { qty: e.target.value === "" ? 1 : Number(e.target.value) })} />
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={it.originalPrice ? it.originalPrice : ""}
                              onChange={e => {
                                const originalPrice = e.target.value === "" ? 0 : Number(e.target.value);
                                const markupPct = it.markupPct ?? defaultPartsMarkupPct;
                                updateItem(it.id, { originalPrice, markupPct, price: calculateMarkedUpPrice(originalPrice, markupPct) });
                              }}
                            />
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step={0.1}
                              placeholder="0"
                              value={it.markupPct ? it.markupPct : ""}
                              onChange={e => {
                                const markupPct = e.target.value === "" ? 0 : Number(e.target.value);
                                const originalPrice = it.originalPrice ?? 0;
                                updateItem(it.id, { markupPct, price: originalPrice > 0 ? calculateMarkedUpPrice(originalPrice, markupPct) : it.price });
                              }}
                            />
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={it.price ? it.price : ""}
                              onChange={e => {
                                const price = e.target.value === "" ? 0 : Number(e.target.value);
                                const originalPrice = it.originalPrice ?? 0;
                                updateItem(it.id, {
                                  price,
                                  markupPct: originalPrice > 0 ? Number((((price - originalPrice) / originalPrice) * 100).toFixed(2)) : it.markupPct,
                                });
                              }}
                            />
                            {discountField}
                          </>
                        )}

                        {cat === "diagnosis" && (
                          <>
                            <Input type="number" inputMode="decimal" min={0} step={0.01} placeholder="0.00" value={it.price ? it.price : ""} onChange={e => updateItem(it.id, { price: e.target.value === "" ? 0 : Number(e.target.value) })} />
                            {discountField}
                          </>
                        )}

                        <span className="text-right text-sm font-semibold tabular-nums">${lineAmount(it).toFixed(2)}</span>
                        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => removeItem(it.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                      );
                    })}

                    {rows.length > 0 && (
                      <div className="flex items-center justify-end pt-2 text-sm">
                        <span className="text-muted-foreground mr-3 capitalize">{cat} subtotal</span>
                        <span className="font-semibold tabular-nums">${catSubtotal.toFixed(2)}</span>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-primary" />
                  Diagnosis Notes
                </label>
                <Textarea
                  placeholder="Technician findings, root cause, recommended repairs…"
                  rows={3}
                  value={(draft as any).diagnosisNotes || ""}
                  onChange={e => setDraft(d => ({ ...d, diagnosisNotes: e.target.value } as any))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Customer Notes
                </label>
                <Textarea
                  placeholder="Notes for the customer…"
                  rows={3}
                  value={(draft as any).customerNotes || ""}
                  onChange={e => setDraft(d => ({ ...d, customerNotes: e.target.value } as any))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border gap-3 flex-wrap">
              <label className="text-xs font-medium text-muted-foreground">
                {draft.type === "invoice" ? "Payment due date" : "Estimate valid until"}
              </label>
              <Input
                type="date"
                className="h-9 w-44"
                aria-label={draft.type === "invoice" ? "Payment due date" : "Estimate valid until"}
                value={draft.type === "invoice" ? draft.dueDate : draft.expiresAt}
                onChange={(e) => setDraft(d => d.type === "invoice"
                  ? { ...d, dueDate: e.target.value }
                  : { ...d, expiresAt: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
              {([["sublet", "Sublet"], ["fees", "Fees"], ["epa", "EPA"], ["shopSupplies", "Shop supplies"]] as const).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{label} ($)</label>
                  <Input
                    type="number" inputMode="decimal" min={0} step={0.01} placeholder="0.00"
                    value={(draft as any)[key] ? (draft as any)[key] : ""}
                    onChange={e => setDraft(d => ({ ...d, [key]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>

            {(() => {
              const t = docTotals(draft.items, draft.taxRate);
              const laborTotal = subtotalByCat(draft.items, "labor");
              const partsTotal = subtotalByCat(draft.items, "part");
              const diagTotal = subtotalByCat(draft.items, "diagnosis");
              const sublet = draft.sublet || 0, fees = draft.fees || 0, epa = draft.epa || 0, supplies = draft.shopSupplies || 0;
              const displaySubtotal = t.preTax + sublet;
              const grandTotal = t.total + sublet + fees + epa + supplies;
              const payments = (draft.amountPaidCents || 0) / 100;
              const balance = Math.max(0, grandTotal - payments);
              const catRow = (label: string, amount: number) => (
                <div className="flex items-center justify-end gap-3 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="w-28 text-right tabular-nums font-medium">${amount.toFixed(2)}</span>
                </div>
              );
              return (
                <div className="pt-3 border-t border-border space-y-2">
                  {laborTotal > 0 && catRow("Labor", laborTotal)}
                  {partsTotal > 0 && catRow("Parts", partsTotal)}
                  {diagTotal > 0 && catRow("Diagnosis", diagTotal)}
                  {sublet > 0 && catRow("Sublet", sublet)}
                  <div className="flex items-center justify-end gap-3 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="w-28 text-right tabular-nums font-medium">${displaySubtotal.toFixed(2)}</span>
                  </div>
                  {t.discount > 0 && (
                    <div className="flex items-center justify-end gap-3 text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="w-28 text-right tabular-nums font-medium text-emerald-600">−${t.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {fees > 0 && catRow("Fees", fees)}
                  {epa > 0 && catRow("EPA", epa)}
                  {supplies > 0 && catRow("Shop supplies", supplies)}
                  <div className="flex items-center justify-end gap-3 text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      Tax
                      <Input
                        type="number" min={0} max={100} step={0.001} inputMode="decimal"
                        aria-label="Tax rate percent"
                        className="h-7 w-20 text-right tabular-nums"
                        placeholder="0"
                        value={draft.taxRate ? String(draft.taxRate) : ""}
                        onChange={e => setDraft(d => ({ ...d, taxRate: normalizeTaxRate(e.target.value) }))}
                      />
                      <span className="text-muted-foreground">%</span>
                    </span>
                    <span className="w-28 text-right tabular-nums font-medium">${t.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold flex items-center justify-end w-40"><DollarSign className="w-5 h-5" />{grandTotal.toFixed(2)}</span>
                  </div>
                  {draft.type === "invoice" && payments > 0 && (
                    <>
                      {catRow("Payments", payments)}
                      <div className="flex items-center justify-end gap-3 pt-1">
                        <span className="text-sm font-semibold">Balance due</span>
                        <span className="w-40 text-right text-lg font-bold tabular-nums">${balance.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2 flex-wrap">
              <Button variant="outline" onClick={closeEditor}>Cancel</Button>
              {draft.type === "estimate" && (
                <Button variant="outline" onClick={saveAndConvertToInvoice} className="gap-1.5">
                  <ArrowRightLeft className="w-4 h-4" /> Convert to Invoice
                </Button>
              )}
              <Button onClick={() => save()}>{primaryAction}</Button>
            </div>
          </CardContent>
        </Card>
        <AutoRepairDocPreviewDialog open={!!previewDoc} onOpenChange={(v) => !v && setPreviewDoc(null)} doc={previewDoc} storeName={storeInfo.name} storeAddress={storeInfo.address} storePhone={storeInfo.phone} storePhone2={storeInfo.phone2} storeEmail={storeInfo.email} storeStateReg={storeInfo.stateReg} storeLogo={storeLogoData} storeTermsPolicy={storeInfo.termsPolicy} />
        <PartPickerDialog
          open={showPartPicker}
          onOpenChange={setShowPartPicker}
          storeId={storeId}
          onPick={addFromCatalog}
        />
        <LaborGuidePickerDialog
          open={showLaborGuide}
          onOpenChange={setShowLaborGuide}
          onSelect={addFromLaborGuide}
        />
        <ServiceCatalogPickerDialog
          open={showServicePicker}
          onOpenChange={setShowServicePicker}
          storeId={storeId}
          onPick={(lines) => addFromServiceCatalog(lines)}
        />
      </div>
    );
  }

  const continueDraft = () => {
    if (!savedDraftPreview) return;
    skipNextSave.current = true;
    setDraft(savedDraftPreview);
    setLastSaved(new Date());
    setSaveState("saved");
    setCreating(true);
  };

  const deleteSavedDraft = () => {
    clearDraft();
    toast.success("Saved draft removed");
    // force rerender
    setDocs(d => [...d]);
  };

  const findFullDoc = (id: string): Doc | undefined => docs.find((d) => d.id === id);

  const handleDownloadPdf = async (id: string) => {
    const d = findFullDoc(id);
    if (!d) return;
    const pdfDoc: PdfDoc = docToPdfDoc(d);
    const { generateDocumentPdf } = await import("@/lib/admin/invoicePdf");
    const { exportBlob } = await import("@/lib/native/exportFile");
    const blob = generateDocumentPdf({
      doc: pdfDoc,
      storeName: storeInfo.name, storeAddress: storeInfo.address, storePhone: storeInfo.phone,
      storePhone2: storeInfo.phone2, storeEmail: storeInfo.email, storeStateReg: storeInfo.stateReg,
      storeLogo: storeLogoData, storeTermsPolicy: storeInfo.termsPolicy,
    });
    await exportBlob(blob, `${d.type}-${d.number}.pdf`, `${d.type} ${d.number}`);
  };

  const handleConvertEstimate = async (id: string) => {
    const est = findFullDoc(id);
    if (!est) return;
    try {
      const number = await assignDocNumber(storeId, "invoice");
      const t = docTotals(est.items, est.taxRate);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ar_invoices" as any).insert({
        store_id: storeId, number, estimate_id: est.id,
        customer_name: est.customer, customer_phone: est.phone || null, customer_email: est.email || null,
        customer_address: combinedAddress(est) || null, vehicle_label: est.vehicle || null, vin: est.vin || null,
        vehicle_year: est.year || null, vehicle_make: est.make || null, vehicle_model: est.model || null,
        vehicle_engine: est.engine?.trim() || null,
        mileage_in: odoInt(est.mileageIn), mileage_out: odoInt(est.mileageOut),
        vehicle_color: est.color?.trim() || null, license_plate: est.licensePlate?.trim() || null,
        plate_state: est.plateState?.trim() || null, unit_number: est.unitNumber?.trim() || null,
        promised_at: est.promisedAt || null, service_writer: est.serviceWriter?.trim() || null,
        technician: est.technician?.trim() || null, technician_cert: est.technicianCert?.trim() || null,
        keytag: est.keytag?.trim() || null, payment_method: est.paymentMethod?.trim() || null,
        tire_pressures: tirePressuresPayload(est),
        sublet_cents: dollarsToCents(est.sublet), fees_cents: dollarsToCents(est.fees),
        epa_cents: dollarsToCents(est.epa), shop_supplies_cents: dollarsToCents(est.shopSupplies),
        items: est.items as any,
        subtotal_cents: Math.round(t.subtotal * 100),
        discount_cents: Math.round(t.discount * 100),
        tax_cents: Math.round(t.tax * 100),
        tax_rate: t.taxRate,
        total_cents: Math.round(t.total * 100) + Math.round(((est.sublet || 0) + (est.fees || 0) + (est.epa || 0) + (est.shopSupplies || 0)) * 100),
        intake_method: est.intakeMethod || null,
        customer_notes: est.customerNotes?.trim() || null,
        diagnosis_notes: est.diagnosisNotes?.trim() || null,
        status: "draft", created_by: user?.id,
      });
      if (error) throw error;
      await updateDocument("estimate", id, { status: "approved" });
      toast.success(`Converted to invoice ${number}`);
      setTab("invoice");
      reloadAll();
    } catch (e: any) {
      toast.error(`Conversion failed: ${e?.message || "unknown error"}`);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Estimates & Invoices</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => startNew("estimate")} className="gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> New Estimate</Button>
          <Button size="sm" onClick={() => startNew("invoice")} className="gap-1.5"><Receipt className="w-3.5 h-3.5" /> New Invoice</Button>
        </div>
      </CardHeader>
      <CardContent>
        {savedDraftPreview && (
          <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {savedDraftPreview.type === "estimate" ? <ClipboardList className="w-4 h-4 text-primary" /> : <Receipt className="w-4 h-4 text-primary" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Unsaved draft · {savedDraftPreview.number}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{savedDraftPreview.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[savedDraftPreview.firstName, savedDraftPreview.lastName].filter(Boolean).join(" ") || "No customer yet"}
                  {savedDraftPreview.vehicle ? ` · ${savedDraftPreview.vehicle}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={continueDraft}>Continue</Button>
              <Button size="sm" variant="ghost" onClick={deleteSavedDraft} className="text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {tab === "invoice" && <InvoiceKpiStrip invoices={dbInvoices} />}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full max-w-sm grid-cols-2 mb-3">
            <TabsTrigger value="estimate">Estimates</TabsTrigger>
            <TabsTrigger value="invoice">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-2">
            <InvoiceFilterBar
              query={query} onQuery={setQuery}
              status={statusFilter} onStatus={setStatusFilter}
              sort={sortKey} onSort={setSortKey}
              showOverdue={tab === "invoice"}
            />

            {rows.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No {tab}s match your filters</p>
              </div>
            )}

            {rows.map((r) => {
              const full = findFullDoc(r.id);
              return (
                <InvoiceListRow
                  key={r.id}
                  doc={r}
                  onView={() => full && setPreviewDoc({ ...full, address: combinedAddress(full) })}
                  onEdit={() => full && startEdit(full)}
                  onSend={() => setSendDoc({ id: r.id, type: r.type, number: r.number, customer: r.customer, email: full?.email, phone: full?.phone })}
                  onMarkPaid={r.type === "invoice" ? () => setPaymentDoc({ id: r.id, number: r.number, customer: r.customer, totalCents: r.totalCents, amountPaidCents: r.amountPaidCents }) : undefined}
                  onDuplicate={() => full && startDuplicate(full)}
                  onDownloadPdf={() => handleDownloadPdf(r.id)}
                  onDelete={() => setDeleteDoc({ id: r.id, type: r.type, number: r.number })}
                  onConvert={r.type === "estimate" ? () => handleConvertEstimate(r.id) : undefined}
                />
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>

      <AutoRepairDocPreviewDialog open={!!previewDoc} onOpenChange={(v) => !v && setPreviewDoc(null)} doc={previewDoc} storeName={storeInfo.name} storeAddress={storeInfo.address} storePhone={storeInfo.phone} storeTermsPolicy={storeInfo.termsPolicy} />

      <RecordInvoicePaymentDialog
        open={!!paymentDoc}
        onOpenChange={(v) => !v && setPaymentDoc(null)}
        storeId={storeId}
        invoice={paymentDoc}
        onSaved={reloadAll}
      />

      <SendDocumentSheet
        open={!!sendDoc}
        onOpenChange={(v) => !v && setSendDoc(null)}
        storeId={storeId}
        doc={sendDoc}
        onSent={reloadAll}
      />

      <DeleteConfirmDialog
        open={!!deleteDoc}
        onOpenChange={(v) => !v && setDeleteDoc(null)}
        title={`Delete ${deleteDoc?.number ?? ""}?`}
        onConfirm={async () => {
          if (!deleteDoc) return;
          try {
            await softDeleteDocument(deleteDoc.type, deleteDoc.id);
            toast.success("Deleted");
            setDeleteDoc(null);
            reloadAll();
          } catch (e: any) {
            toast.error(`Delete failed: ${e?.message || "unknown error"}`);
          }
        }}
      />
    </Card>
  );
}
