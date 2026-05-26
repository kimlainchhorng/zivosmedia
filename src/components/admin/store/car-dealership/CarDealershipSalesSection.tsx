/**
 * Sales / deals section — list of deals + create / edit dialog.
 */
import { memo, useMemo, useState, useEffect, useRef } from "react";
import {
  Plus, FileSignature, Pencil, Trash2, Loader2, Printer,
  Users, Receipt, ClipboardList, Paperclip, Upload, FileText, Download,
  Image as ImageIcon, FileCheck, Banknote, ShieldCheck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipSales,
  type DealershipSale,
  type DealershipSaleStatus,
  type DealershipSaleDraft,
} from "@/hooks/car-dealership/useDealershipSales";
import VehiclePicker from "./VehiclePicker";
import CustomerPicker from "./CustomerPicker";
import { printDealSheet } from "@/lib/car-dealership/dealSheetPdf";
import {
  useDealershipDealDocuments,
  type DealDocumentType,
  type DealDocument,
} from "@/hooks/car-dealership/useDealershipDealDocuments";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  return Math.round(parseFloat(cleaned) * 100);
};
const toDollars = (cents: number) => (cents / 100).toString();

const statusStyles: Record<DealershipSaleStatus, string> = {
  quote: "bg-zinc-500/15 text-zinc-700",
  pending: "bg-blue-500/15 text-blue-700",
  deposit_paid: "bg-amber-500/15 text-amber-700",
  financing: "bg-violet-500/15 text-violet-700",
  completed: "bg-emerald-500/15 text-emerald-700",
  delivered: "bg-emerald-600/15 text-emerald-800",
  cancelled: "bg-red-500/15 text-red-700",
  refunded: "bg-orange-500/15 text-orange-700",
};

const emptyDraft = (): DealershipSaleDraft => ({
  vehicle_id: null,
  customer_id: null,
  lead_id: null,
  salesperson_user_id: null,
  vehicle_label: "",
  vehicle_vin: null,
  customer_name: "",
  customer_phone: null,
  customer_email: null,
  salesperson_name: null,
  sale_price_cents: 0,
  trade_in_value_cents: 0,
  trade_in_payoff_cents: 0,
  rebate_cents: 0,
  doc_fee_cents: 0,
  registration_fee_cents: 0,
  title_fee_cents: 0,
  other_fees_cents: 0,
  taxes_cents: 0,
  discount_cents: 0,
  warranty_cents: 0,
  gap_insurance_cents: 0,
  deposit_cents: 0,
  amount_paid_cents: 0,
  status: "quote",
  payment_method: null,
  sold_at: null,
  delivered_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  customer_notes: null,
  internal_notes: null,
});

// ─── Document attachments tab ────────────────────────────────────────────────

const DOC_TYPE_META: Record<DealDocumentType, { label: string; icon: typeof FileText; colour: string }> = {
  purchase_agreement:   { label: "Purchase agreement",  icon: FileCheck,    colour: "bg-emerald-500/10 text-emerald-700" },
  bill_of_sale:         { label: "Bill of sale",        icon: FileCheck,    colour: "bg-emerald-500/10 text-emerald-700" },
  title:                { label: "Title",               icon: FileText,     colour: "bg-blue-500/10 text-blue-700" },
  registration:         { label: "Registration",        icon: FileText,     colour: "bg-blue-500/10 text-blue-700" },
  financing_contract:   { label: "Financing contract",  icon: Banknote,     colour: "bg-violet-500/10 text-violet-700" },
  insurance:            { label: "Insurance",           icon: ShieldCheck,  colour: "bg-indigo-500/10 text-indigo-700" },
  license_copy:         { label: "License copy",        icon: FileText,     colour: "bg-amber-500/10 text-amber-700" },
  lemon_law_disclosure: { label: "Lemon-law disclosure",icon: FileText,     colour: "bg-amber-500/10 text-amber-700" },
  warranty:             { label: "Warranty",            icon: ShieldCheck,  colour: "bg-cyan-500/10 text-cyan-700" },
  inspection:           { label: "Inspection",          icon: FileCheck,    colour: "bg-orange-500/10 text-orange-700" },
  odometer_disclosure:  { label: "Odometer disclosure", icon: FileText,     colour: "bg-orange-500/10 text-orange-700" },
  photo:                { label: "Photo",               icon: ImageIcon,    colour: "bg-rose-500/10 text-rose-700" },
  other:                { label: "Other",               icon: Paperclip,    colour: "bg-zinc-500/10 text-zinc-700" },
};

const fmtFileSize = (bytes: number | null) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const MAX_DOC_BYTES = 20 * 1024 * 1024; // 20 MB

interface DocsTabProps {
  storeId: string;
  dealId: string | null;
}

function DealDocumentsTab({ storeId, dealId }: DocsTabProps) {
  const { documents, loading, saving, upload, remove } =
    useDealershipDealDocuments(storeId, dealId);

  const [docType, setDocType] = useState<DealDocumentType>("purchase_agreement");
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!dealId) {
    return (
      <div className="rounded-lg border-2 border-dashed p-8 text-center">
        <Paperclip className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-3 font-medium">Save the deal first</p>
        <p className="text-sm text-muted-foreground mt-1">
          Documents are attached to an existing deal. Fill out Parties + Pricing
          first, save the deal, then come back here to upload paperwork.
        </p>
      </div>
    );
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    let success = 0;
    let skipped = 0;
    for (const file of Array.from(files)) {
      if (file.size > MAX_DOC_BYTES) {
        toast.error(`${file.name} is over 20 MB — skipped.`);
        skipped++;
        continue;
      }
      const ok = await upload({ file, doc_type: docType, notes: notes.trim() || null });
      if (ok) success++;
      else skipped++;
    }
    if (success > 0) {
      toast.success(`Uploaded ${success} document${success !== 1 ? "s" : ""}.`);
      setNotes("");
    }
    if (skipped > 0 && success === 0) {
      toast.error("Upload failed. See console for details.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (d: DealDocument) => {
    if (!window.confirm(`Remove "${d.file_name}"?`)) return;
    const ok = await remove(d);
    if (ok) toast.success("Removed.");
    else toast.error("Couldn't delete.");
  };

  return (
    <div className="space-y-4">
      {/* ── Upload bar ── */}
      <Card className="p-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <Label className="text-xs">Document type</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as DealDocumentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DOC_TYPE_META) as DealDocumentType[]).map((t) => {
                  const m = DOC_TYPE_META[t];
                  const Icon = m.icon;
                  return (
                    <SelectItem key={t} value={t}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />{m.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Page count, version, signer..."
              maxLength={500}
            />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,image/*,.doc,.docx,.txt"
          onChange={(e) => void handleFiles(e.target.files)}
        />

        <Button
          type="button"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
        >
          {saving
            ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Uploading...</>
            : <><Upload className="h-4 w-4 mr-1.5" />Choose file{documents.length === 0 ? "" : "s"} to upload</>}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          PDF, images, or Word docs · max 20 MB per file · multi-select supported
        </p>
      </Card>

      {/* ── List ── */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium">No documents yet</p>
          <p className="text-xs text-muted-foreground">
            Drop in signed paperwork as you collect it — purchase agreement, title, financing contract, etc.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {documents.map((d) => {
            const meta = DOC_TYPE_META[d.doc_type];
            const Icon = meta.icon;
            const isImage = d.mime_type?.startsWith("image/");
            return (
              <div key={d.id} className="group flex items-center gap-3 rounded-lg border p-2.5">
                <div className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                  meta.colour,
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
                      {meta.label}
                    </Badge>
                    <p className="text-sm font-medium truncate">{d.file_name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtFileSize(d.file_size_bytes)}
                    {" · "}
                    {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  {d.notes && (
                    <p className="text-xs text-muted-foreground italic truncate mt-0.5">"{d.notes}"</p>
                  )}
                </div>

                <a
                  href={d.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-muted transition-colors"
                  title={isImage ? "Open image" : "Download / open"}
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-destructive/10"
                  onClick={() => handleDelete(d)}
                  title="Remove document"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── main section ────────────────────────────────────────────────────────────

interface Props { storeId: string; storeName?: string; storeSlug?: string | null; }

function CarDealershipSalesSectionInner({ storeId, storeName = "Auto Dealership", storeSlug }: Props) {
  const { sales, loading, saving, create, update, remove } = useDealershipSales(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipSale | null>(null);
  const [draft, setDraft] = useState<DealershipSaleDraft>(emptyDraft());
  const [tab, setTab] = useState<"parties" | "pricing" | "status" | "docs">("parties");
  // vehicle cost for gross profit display — populated when vehicle selected from inventory
  const [vehicleCostCents, setVehicleCostCents] = useState(0);

  useEffect(() => {
    if (editing) {
      const { id, store_id, deal_number, subtotal_cents, total_cents, balance_due_cents, created_at, updated_at, ...rest } = editing;
      setDraft(rest);
    }
  }, [editing]);

  const computed = useMemo(() => {
    const subtotal = Math.max(0,
      draft.sale_price_cents + draft.doc_fee_cents + draft.registration_fee_cents
      + draft.title_fee_cents + draft.other_fees_cents + draft.warranty_cents + draft.gap_insurance_cents
      - draft.discount_cents - draft.rebate_cents);
    const total = Math.max(0, subtotal + draft.taxes_cents - (draft.trade_in_value_cents - draft.trade_in_payoff_cents));
    const balance = total - draft.amount_paid_cents;
    // Front-end gross = sale price − vehicle cost
    const frontGross = vehicleCostCents > 0
      ? draft.sale_price_cents - draft.discount_cents - draft.rebate_cents - vehicleCostCents
      : null;
    // Back-end gross = F&I products
    const backGross = draft.warranty_cents + draft.gap_insurance_cents;
    const totalGross = frontGross != null ? frontGross + backGross : null;
    return { subtotal, total, balance, frontGross, backGross, totalGross };
  }, [draft, vehicleCostCents]);

  const openAdd = () => {
    setEditing(null); setDraft(emptyDraft()); setVehicleCostCents(0);
    setTab("parties"); setDialogOpen(true);
  };
  const openEdit = (s: DealershipSale) => {
    setEditing(s); setVehicleCostCents(0);
    setTab("parties"); setDialogOpen(true);
  };

  const submit = async () => {
    if (!draft.customer_name.trim() || !draft.vehicle_label.trim()) {
      setTab("parties");
      return;
    }
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Deal updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Deal created."); setDialogOpen(false); }
      else toast.error("Couldn't create deal.");
    }
  };

  const handleDelete = async (s: DealershipSale) => {
    if (!window.confirm(`Delete deal #${s.deal_number}?`)) return;
    const ok = await remove(s.id);
    if (ok) toast.success("Deal removed.");
    else toast.error("Couldn't delete.");
  };

  const handleCopyReviewLink = async (s: DealershipSale) => {
    if (!storeSlug) {
      toast.error("This store doesn't have a public slug set up yet.");
      return;
    }
    const url = `${window.location.origin}/car-dealership/${storeSlug}/review/${s.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Review link copied — send it to your customer.");
    } catch (e) {
      console.error("[copy review link] clipboard failed", e);
      toast.error("Couldn't copy. The link is: " + url);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Sales & Deals</h2>
          <p className="text-sm text-muted-foreground">{sales.length} deals · {sales.filter((s) => ["completed", "delivered"].includes(s.status)).length} closed</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />New deal</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sales.length === 0 ? (
        <Card className="p-10 text-center">
          <FileSignature className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No deals yet</p>
          <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />New deal</Button>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {sales.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{s.customer_name}</p>
                    <Badge className={cn("border-0 text-[10px]", statusStyles[s.status])}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    #{s.deal_number} · {s.vehicle_label}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">{formatPrice(s.total_cents)}</p>
                  {s.balance_due_cents > 0 && (
                    <p className="text-xs text-amber-700">Balance: {formatPrice(s.balance_due_cents)}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {["completed", "delivered"].includes(s.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Copy public review link — send this to the customer to ask for a review"
                      onClick={() => handleCopyReviewLink(s)}
                    >
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" title="Print deal sheet" onClick={() => printDealSheet(s, storeName)}><Printer className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>{editing ? `Edit deal #${editing.deal_number}` : "New deal"}</DialogTitle>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-6 mt-3 w-auto shrink-0 self-start">
              <TabsTrigger value="parties" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />Parties
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-1.5">
                <Receipt className="h-3.5 w-3.5" />Pricing
              </TabsTrigger>
              <TabsTrigger value="status" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />Status
              </TabsTrigger>
              <TabsTrigger value="docs" className="gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />Docs
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1 · Parties ─────────────────────────────────────── */}
            <TabsContent value="parties" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
              <CustomerPicker
                storeId={storeId}
                customerId={draft.customer_id}
                customerName={draft.customer_name}
                required
                onSelect={(c) => setDraft({
                  ...draft,
                  customer_id: c?.id ?? null,
                  customer_name: c?.display_name ?? draft.customer_name,
                  customer_phone: c?.phone ?? draft.customer_phone,
                  customer_email: c?.email ?? draft.customer_email,
                })}
                onNameChange={(name) => setDraft({ ...draft, customer_name: name, customer_id: null })}
              />
              <VehiclePicker
                storeId={storeId}
                vehicleId={draft.vehicle_id}
                vehicleLabel={draft.vehicle_label}
                required
                onSelect={(v) => {
                  setVehicleCostCents(v?.cost_cents ?? 0);
                  setDraft({
                    ...draft,
                    vehicle_id: v?.id ?? null,
                    vehicle_label: v?.label ?? draft.vehicle_label,
                    vehicle_vin: v?.vin ?? draft.vehicle_vin,
                    sale_price_cents: v?.asking_price_cents ?? draft.sale_price_cents,
                  });
                }}
                onLabelChange={(label) => {
                  setVehicleCostCents(0);
                  setDraft({ ...draft, vehicle_label: label, vehicle_id: null });
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>VIN</Label>
                  <Input
                    className="font-mono uppercase"
                    maxLength={17}
                    value={draft.vehicle_vin ?? ""}
                    onChange={(e) => setDraft({ ...draft, vehicle_vin: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Salesperson</Label>
                  <Input
                    value={draft.salesperson_name ?? ""}
                    onChange={(e) => setDraft({ ...draft, salesperson_name: e.target.value || null })}
                    placeholder="Who closed the deal?"
                  />
                </div>
              </div>

              {vehicleCostCents > 0 && (
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Vehicle acquisition cost: <span className="font-bold text-foreground">{formatPrice(vehicleCostCents)}</span>
                  {" · "}front-end gross will be computed against this on the Pricing tab.
                </div>
              )}
            </TabsContent>

            {/* ── Tab 2 · Pricing ─────────────────────────────────────── */}
            <TabsContent value="pricing" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
              {/* Sale price prominent */}
              <div className="rounded-lg border bg-primary/5 p-3 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Sale price
                </Label>
                <Input
                  inputMode="decimal"
                  className="text-lg font-bold"
                  value={toDollars(draft.sale_price_cents)}
                  onChange={(e) => setDraft({ ...draft, sale_price_cents: fromDollars(e.target.value) })}
                />
              </div>

              {/* Trade-in */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Trade-in</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Trade-in value</Label>
                    <Input
                      inputMode="decimal"
                      value={toDollars(draft.trade_in_value_cents)}
                      onChange={(e) => setDraft({ ...draft, trade_in_value_cents: fromDollars(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Trade payoff</Label>
                    <Input
                      inputMode="decimal"
                      value={toDollars(draft.trade_in_payoff_cents)}
                      onChange={(e) => setDraft({ ...draft, trade_in_payoff_cents: fromDollars(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {/* Adjustments + Fees */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Adjustments & fees</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rebate</Label>
                    <Input inputMode="decimal" value={toDollars(draft.rebate_cents)} onChange={(e) => setDraft({ ...draft, rebate_cents: fromDollars(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Discount</Label>
                    <Input inputMode="decimal" value={toDollars(draft.discount_cents)} onChange={(e) => setDraft({ ...draft, discount_cents: fromDollars(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Doc fee</Label>
                    <Input inputMode="decimal" value={toDollars(draft.doc_fee_cents)} onChange={(e) => setDraft({ ...draft, doc_fee_cents: fromDollars(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Reg fee</Label>
                    <Input inputMode="decimal" value={toDollars(draft.registration_fee_cents)} onChange={(e) => setDraft({ ...draft, registration_fee_cents: fromDollars(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title fee</Label>
                    <Input inputMode="decimal" value={toDollars(draft.title_fee_cents)} onChange={(e) => setDraft({ ...draft, title_fee_cents: fromDollars(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Other fees</Label>
                    <Input inputMode="decimal" value={toDollars(draft.other_fees_cents)} onChange={(e) => setDraft({ ...draft, other_fees_cents: fromDollars(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* F&I */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">F&amp;I &amp; tax</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Warranty</Label>
                    <Input inputMode="decimal" value={toDollars(draft.warranty_cents)} onChange={(e) => setDraft({ ...draft, warranty_cents: fromDollars(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">GAP insurance</Label>
                    <Input inputMode="decimal" value={toDollars(draft.gap_insurance_cents)} onChange={(e) => setDraft({ ...draft, gap_insurance_cents: fromDollars(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sales tax</Label>
                    <Input inputMode="decimal" value={toDollars(draft.taxes_cents)} onChange={(e) => setDraft({ ...draft, taxes_cents: fromDollars(e.target.value) })} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Tab 3 · Status ──────────────────────────────────────── */}
            <TabsContent value="status" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as DealershipSaleStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quote">Quote</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="deposit_paid">Deposit paid</SelectItem>
                      <SelectItem value="financing">Financing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Payment method</Label>
                  <Select
                    value={draft.payment_method ?? "_none"}
                    onValueChange={(v) => setDraft({ ...draft, payment_method: v === "_none" ? null : (v as DealershipSaleDraft["payment_method"]) })}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">—</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="financing">Financing</SelectItem>
                      <SelectItem value="lease">Lease</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Deposit ($)</Label>
                  <Input inputMode="decimal" value={toDollars(draft.deposit_cents)} onChange={(e) => setDraft({ ...draft, deposit_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount paid ($)</Label>
                  <Input inputMode="decimal" value={toDollars(draft.amount_paid_cents)} onChange={(e) => setDraft({ ...draft, amount_paid_cents: fromDollars(e.target.value) })} />
                </div>
              </div>
              {computed.balance > 0 && (
                <p className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-800 font-medium">
                  Balance due: <span className="font-bold">{formatPrice(computed.balance)}</span>
                </p>
              )}

              <div className="space-y-1.5">
                <Label>Customer notes</Label>
                <Textarea
                  rows={2}
                  value={draft.customer_notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, customer_notes: e.target.value || null })}
                  placeholder="Customer-facing notes — appears on the deal sheet"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Internal notes</Label>
                <Textarea
                  rows={2}
                  value={draft.internal_notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value || null })}
                  placeholder="Internal-only notes"
                />
              </div>
            </TabsContent>

            {/* ── Tab 4 · Docs ────────────────────────────────────────── */}
            <TabsContent value="docs" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <DealDocumentsTab
                storeId={storeId}
                dealId={editing?.id ?? null}
              />
            </TabsContent>
          </Tabs>

          {/* ── Persistent totals strip ── */}
          <div className="px-6 py-2.5 border-t bg-muted/30 shrink-0 text-sm space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatPrice(computed.subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(computed.total)}</span>
            </div>
            {computed.totalGross != null && (
              <div className={cn(
                "flex justify-between text-xs pt-1",
                computed.totalGross >= 0 ? "text-emerald-700" : "text-red-600",
              )}>
                <span>
                  Est. gross
                  <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                    (front {formatPrice(computed.frontGross!)} · back {formatPrice(computed.backGross)})
                  </span>
                </span>
                <span className="font-bold tabular-nums">{formatPrice(computed.totalGross)}</span>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t shrink-0 flex-col-reverse sm:flex-row gap-2">
            <div className="flex-1 flex justify-start">
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => printDealSheet(editing, storeName)}
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                  Print deal sheet
                </Button>
              )}
            </div>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !draft.customer_name.trim() || !draft.vehicle_label.trim()}>
              {saving ? "Saving..." : editing ? "Save" : "Create deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarDealershipSalesSection = memo(CarDealershipSalesSectionInner);
export default CarDealershipSalesSection;
