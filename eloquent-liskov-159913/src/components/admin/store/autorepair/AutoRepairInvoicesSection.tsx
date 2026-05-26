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
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, DollarSign, Trash2, Receipt, ClipboardList, ArrowLeft, ScanSearch, Loader2, Check, CloudUpload, Wrench, Package, Stethoscope, Truck, KeyRound, Car, LogOut, Eye, ArrowRightLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import AutoRepairDocPreviewDialog from "./AutoRepairDocPreviewDialog";
import PartPickerDialog, { type PickedPart } from "./PartPickerDialog";
import InvoiceKpiStrip from "./invoices/InvoiceKpiStrip";
import InvoiceFilterBar, { type StatusFilter, type SortKey } from "./invoices/InvoiceFilterBar";
import InvoiceListRow, { type RowDoc } from "./invoices/InvoiceListRow";
import RecordInvoicePaymentDialog from "./invoices/RecordInvoicePaymentDialog";
import SendDocumentSheet from "./invoices/SendDocumentSheet";
import DeleteConfirmDialog from "./invoices/DeleteConfirmDialog";
import { softDeleteDocument, updateDocument, nextDocNumber, type DocType } from "@/lib/admin/invoiceActions";
import type { PdfDoc } from "@/lib/admin/invoicePdf";

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
  address: string;
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
  vehicle: string;
  items: LineItem[];
  status: "draft" | "sent" | "paid" | "approved";
  createdAt: string;
};

const emptyDraft = (): Doc => ({
  id: "", type: "estimate", number: "", customer: "",
  firstName: "", lastName: "", phone: "", email: "", address: "",
  vin: "", year: "", make: "", model: "", trim: "", engine: "", transmission: "",
  driveType: "", bodyClass: "", doors: "", fuel: "", plant: "",
  vehicle: "",
  items: [{ id: crypto.randomUUID(), category: "labor", description: "", qty: 1, price: 0, hours: 1, discount: 0 }],
  status: "draft", createdAt: new Date().toISOString(),
});

// True if the id looks like a real Postgres uuid.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Compute the dollar amount for a single line item
const lineAmount = (i: LineItem): number => {
  const gross =
    i.category === "labor" ? (i.hours ?? 0) * (i.price ?? 0) :
    i.category === "part" ? (i.qty ?? 0) * (i.price ?? 0) :
    (i.price ?? 0); // diagnosis = flat fee
  const discVal = Math.max(0, i.discount ?? 0);
  if ((i.discountType ?? "pct") === "amt") {
    return Math.max(0, gross - discVal);
  }
  const pct = Math.min(100, discVal);
  return gross * (1 - pct / 100);
};

interface Props { storeId: string }

export default function AutoRepairInvoicesSection({ storeId }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  // Authoritative DB rows for invoices and estimates (drives KPIs + status badges).
  const [dbInvoices, setDbInvoices] = useState<any[]>([]);
  const [dbEstimates, setDbEstimates] = useState<any[]>([]);
  const [tab, setTab] = useState<"estimate" | "invoice">("estimate");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = new doc
  const [draft, setDraft] = useState<Doc>(emptyDraft());
  const [vinLoading, setVinLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [storeInfo, setStoreInfo] = useState<{ name?: string; address?: string; phone?: string }>({});

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
        .select("name, address, phone")
        .eq("id", storeId)
        .maybeSingle();
      if (data) setStoreInfo({ name: data.name || undefined, address: data.address || undefined, phone: data.phone || undefined });
    })();
  }, [storeId]);

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
          address: row.customer_address || "",
          vin: row.vin || "",
          year: row.vehicle_year || "",
          make: row.vehicle_make || "",
          model: row.vehicle_model || "",
          trim: "", engine: "", transmission: "", driveType: "", bodyClass: "", doors: "", fuel: "", plant: "",
          vehicle: row.vehicle_label || "",
          items: Array.isArray(row.items) ? row.items : [],
          status: (row.status === "paid" ? "paid" : row.status === "sent" ? "sent" : "draft") as Doc["status"],
          createdAt: row.created_at,
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
          address: row.customer_address || "",
          vin: row.vin || "",
          year: row.vehicle_year || "",
          make: row.vehicle_make || "",
          model: row.vehicle_model || "",
          trim: "", engine: "", transmission: "", driveType: "", bodyClass: "", doors: "", fuel: "", plant: "",
          vehicle: row.vehicle_label || "",
          items: Array.isArray(row.items) ? row.items : Array.isArray(row.line_items) ? row.line_items : [],
          status: (row.status === "approved" ? "approved" : row.status === "sent" ? "sent" : "draft") as Doc["status"],
          createdAt: row.created_at,
        });
      }
    }
    setDocs(persisted);
  };

  useEffect(() => { reloadAll();   }, [storeId]);
  const draftKey = useMemo(() => `autorepair:invoice-draft:${storeId}`, [storeId]);
  const saveTimer = useRef<number | null>(null);
  const skipNextSave = useRef(true);

  const total = (items: LineItem[]) => items.reduce((s, i) => s + lineAmount(i), 0);
  const subtotalByCat = (items: LineItem[], cat: LineCategory) => items.filter(i => i.category === cat).reduce((s, i) => s + lineAmount(i), 0);

  // Autosave draft to localStorage (debounced) while creating
  useEffect(() => {
    if (!creating) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setLastSaved(new Date());
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 600);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [draft, creating, draftKey]);

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    setLastSaved(null);
    setSaveState("idle");
  };

  const startNew = (type: "estimate" | "invoice") => {
    // Try resume saved draft of same type
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as Doc;
        if (saved && saved.type === type) {
          skipNextSave.current = true;
          setEditingId(null);
          setDraft(saved);
          setLastSaved(new Date());
          setSaveState("saved");
          setCreating(true);
          toast.info("Resumed your saved draft");
          return;
        }
      }
    } catch {}
    skipNextSave.current = true;
    setEditingId(null);
    setDraft({ ...emptyDraft(), id: crypto.randomUUID(), type, number: nextDocNumber(type) });
    setLastSaved(null);
    setSaveState("idle");
    setCreating(true);
  };

  const startEdit = (doc: Doc) => {
    skipNextSave.current = true;
    setEditingId(doc.id);
    setDraft(doc);
    setLastSaved(null);
    setSaveState("idle");
    setCreating(true);
  };

  const startDuplicate = (doc: Doc) => {
    skipNextSave.current = true;
    setEditingId(null);
    setDraft({ ...doc, id: crypto.randomUUID(), number: nextDocNumber(doc.type), status: "draft", createdAt: new Date().toISOString() });
    setLastSaved(null);
    setSaveState("idle");
    setCreating(true);
    toast.info("Duplicated — review and save");
  };

  const discardDraft = () => {
    clearDraft();
    setCreating(false);
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

  const saveDraftNow = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSaved(new Date());
      setSaveState("saved");
      toast.success("Draft saved");
    } catch {
      toast.error("Could not save draft");
    }
  };

  const save = async () => {
    if (!draft.firstName || !draft.lastName || !draft.vehicle) { toast.error("First name, last name, and vehicle are required"); return; }
    const customer = `${draft.firstName} ${draft.lastName}`.trim();
    const subtotalCents = Math.round(total(draft.items) * 100);
    const tableName = draft.type === "invoice" ? "ar_invoices" : "ar_estimates";

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        store_id: storeId,
        number: draft.number,
        customer_name: customer,
        customer_phone: draft.phone || null,
        customer_email: draft.email || null,
        customer_address: draft.address || null,
        vehicle_label: draft.vehicle || null,
        vin: draft.vin || null,
        vehicle_year: draft.year || null,
        vehicle_make: draft.make || null,
        vehicle_model: draft.model || null,
        items: draft.items as any,
        subtotal_cents: subtotalCents,
        total_cents: subtotalCents,
        status: draft.status === "paid" ? "paid" : draft.status === "sent" ? "sent" : "draft",
      };

      // Only treat as update if we have a real DB uuid.
      const isRealId = !!editingId && UUID_RE.test(editingId);
      if (isRealId) {
        const { error } = await supabase.from(tableName as any).update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success(`${draft.type === "invoice" ? "Invoice" : "Estimate"} ${draft.number} updated`);
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from(tableName as any).insert(payload);
        if (error) throw error;
        toast.success(`${draft.type === "invoice" ? "Invoice" : "Estimate"} ${draft.number} saved`);
      }
      await reloadAll();
    } catch (e: any) {
      toast.error(`Could not save: ${e?.message || "unknown error"}`);
      return;
    }
    clearDraft();
    setEditingId(null);
    setCreating(false);
  };

  // Save the current estimate draft, then convert it into an invoice and open it for edit.
  const saveAndConvertToInvoice = async () => {
    if (draft.type !== "estimate") return;
    if (!draft.firstName || !draft.lastName || !draft.vehicle) {
      toast.error("First name, last name, and vehicle are required");
      return;
    }
    const customer = `${draft.firstName} ${draft.lastName}`.trim();
    const subtotalCents = Math.round(total(draft.items) * 100);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const basePayload: any = {
        store_id: storeId,
        customer_name: customer,
        customer_phone: draft.phone || null,
        customer_email: draft.email || null,
        customer_address: draft.address || null,
        vehicle_label: draft.vehicle || null,
        vin: draft.vin || null,
        vehicle_year: draft.year || null,
        vehicle_make: draft.make || null,
        vehicle_model: draft.model || null,
        items: draft.items as any,
        subtotal_cents: subtotalCents,
        total_cents: subtotalCents,
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
        const { data, error } = await supabase
          .from("ar_estimates" as any)
          .insert({ ...basePayload, number: draft.number, status: "approved", created_by: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        estimateId = (data as any).id;
      }

      // 2. Create the invoice from this estimate.
      const invoiceNumber = nextDocNumber("invoice");
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

  const addItem = (category: LineCategory = "labor") => setDraft(d => ({
    ...d,
    items: [
      ...d.items,
      category === "labor"
        ? { id: crypto.randomUUID(), category, description: "", qty: 1, price: 0, hours: 1, discount: 0 }
        : category === "part"
        ? { id: crypto.randomUUID(), category, description: "", qty: 1, price: 0, discount: 0 }
        : { id: crypto.randomUUID(), category, description: "", qty: 1, price: 0, discount: 0 },
    ],
  }));
  const removeItem = (id: string) => setDraft(d => ({ ...d, items: d.items.filter(i => i.id !== id) }));

  const addFromCatalog = (picked: PickedPart) => {
    setDraft(d => ({
      ...d,
      items: [
        ...d.items,
        {
          id: crypto.randomUUID(),
          category: "part" as LineCategory,
          description: picked.description,
          qty: picked.qty,
          price: picked.price,
          discount: 0,
          _partId: picked.partId,
        },
      ],
    }));
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
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCreating(false)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base flex items-center gap-2">
                {draft.type === "estimate" ? <ClipboardList className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                {draft.type === "estimate" ? "Create Estimate" : "Create Invoice"} · {draft.number}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mr-1">
                {saveState === "saving" && (<><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>)}
                {saveState === "saved" && (<><Check className="w-3 h-3 text-primary" /> Saved{lastSaved ? ` · ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</>)}
                {saveState === "idle" && (<><CloudUpload className="w-3 h-3" /> Autosave on</>)}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPreviewDoc({ ...draft, customer: `${draft.firstName} ${draft.lastName}`.trim() })} className="gap-1.5"><Eye className="w-3.5 h-3.5" /> Preview</Button>
              <Button variant="outline" size="sm" onClick={saveDraftNow}>Save draft</Button>
              <Button variant="ghost" size="sm" onClick={discardDraft} className="text-destructive hover:text-destructive">Discard</Button>
              {draft.type === "estimate" && (
                <Button variant="outline" size="sm" onClick={saveAndConvertToInvoice} className="gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Convert to Invoice
                </Button>
              )}
              <Button onClick={save} className="gap-1.5">
                {draft.type === "estimate" ? "Create Estimate" : "Create Invoice"}
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
                  <Input placeholder="Street, City, State" value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} />
                </div>
              </div>
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
                      <div className="flex gap-2">
                        {cat === "part" && (
                          <Button size="sm" variant="outline" onClick={() => setShowPartPicker(true)} className="h-8 gap-1 border-primary/50 text-primary hover:bg-primary/5">
                            <BookOpen className="w-3.5 h-3.5" /> Pick from catalog
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => addItem(cat)} className="h-8 gap-1">
                          <Plus className="w-3.5 h-3.5" /> Add {cat === "part" ? "part" : cat === "labor" ? "labor" : "diagnosis"}
                        </Button>
                      </div>
                    </div>

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
                          ? "grid-cols-[1fr_70px_90px_120px_90px_36px]"
                          : cat === "part"
                          ? "grid-cols-[1fr_70px_90px_120px_90px_36px]"
                          : "grid-cols-[1fr_110px_120px_90px_36px]"
                      }`}>
                        <span>Service detail</span>
                        {cat === "labor" && <><span>Hours</span><span>Hour rate</span><span>Discount</span><span className="text-right">Total</span></>}
                        {cat === "part" && <><span>Qty</span><span>Unit price</span><span>Discount</span><span className="text-right">Total</span></>}
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
                            ? "grid-cols-[1fr_70px_90px_120px_90px_36px]"
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
                            <Input type="number" inputMode="decimal" min={0} step={0.01} placeholder="0.00" value={it.price ? it.price : ""} onChange={e => updateItem(it.id, { price: e.target.value === "" ? 0 : Number(e.target.value) })} />
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

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold flex items-center"><DollarSign className="w-5 h-5" />{total(draft.items).toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 flex-wrap">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              {draft.type === "estimate" && (
                <Button variant="outline" onClick={saveAndConvertToInvoice} className="gap-1.5">
                  <ArrowRightLeft className="w-4 h-4" /> Convert to Invoice
                </Button>
              )}
              <Button onClick={save}>{draft.type === "estimate" ? "Create Estimate" : "Create Invoice"}</Button>
            </div>
          </CardContent>
        </Card>
        <AutoRepairDocPreviewDialog open={!!previewDoc} onOpenChange={(v) => !v && setPreviewDoc(null)} doc={previewDoc} storeName={storeInfo.name} storeAddress={storeInfo.address} storePhone={storeInfo.phone} />
        <PartPickerDialog
          open={showPartPicker}
          onOpenChange={setShowPartPicker}
          storeId={storeId}
          onPick={addFromCatalog}
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
    const pdfDoc: PdfDoc = {
      type: d.type, number: d.number, customer: d.customer, phone: d.phone, email: d.email,
      address: d.address, vehicle: d.vehicle, vin: d.vin, items: d.items as any, status: d.status,
      createdAt: d.createdAt,
    };
    const { generateDocumentPdf, downloadPdf } = await import("@/lib/admin/invoicePdf");
    const blob = generateDocumentPdf({ doc: pdfDoc, storeName: storeInfo.name, storeAddress: storeInfo.address, storePhone: storeInfo.phone });
    downloadPdf(blob, `${d.type}-${d.number}.pdf`);
  };

  const handleConvertEstimate = async (id: string) => {
    const est = findFullDoc(id);
    if (!est) return;
    try {
      const number = nextDocNumber("invoice");
      const subtotalCents = Math.round(total(est.items) * 100);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ar_invoices" as any).insert({
        store_id: storeId, number, estimate_id: est.id,
        customer_name: est.customer, customer_phone: est.phone || null, customer_email: est.email || null,
        customer_address: est.address || null, vehicle_label: est.vehicle || null, vin: est.vin || null,
        vehicle_year: est.year || null, vehicle_make: est.make || null, vehicle_model: est.model || null,
        items: est.items as any, subtotal_cents: subtotalCents, total_cents: subtotalCents,
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
                  onView={() => full && setPreviewDoc(full)}
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

      <AutoRepairDocPreviewDialog open={!!previewDoc} onOpenChange={(v) => !v && setPreviewDoc(null)} doc={previewDoc} storeName={storeInfo.name} storeAddress={storeInfo.address} storePhone={storeInfo.phone} />

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
