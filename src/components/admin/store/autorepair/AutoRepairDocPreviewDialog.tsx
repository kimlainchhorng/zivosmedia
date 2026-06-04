/**
 * Auto Repair — Document Preview Dialog
 * Renders the generated shop-style invoice/estimate PDF inline. Preview, Print
 * and Download all use the same PDF, so what you see is exactly what is sent.
 */
import { useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Mail, MessageSquare, Download } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { generateDocumentPdf, type PdfDoc } from "@/lib/admin/invoicePdf";
import { exportBlob } from "@/lib/native/exportFile";
import { openSystemUrl } from "@/lib/openExternalUrl";
import { computeDocTotals, sumExtraChargeCents } from "@/lib/admin/taxCalc";

type LineCategory = "labor" | "part" | "diagnosis";
export type PreviewLineItem = {
  id: string;
  category: LineCategory;
  description: string;
  qty: number;
  price: number;
  hours?: number;
  discount?: number;
  discountType?: "pct" | "amt";
};
export type PreviewDoc = {
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
  vehicle: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  engine: string;
  driveType: string;
  items: PreviewLineItem[];
  taxRate: number; // flat sales-tax percentage
  status: string;
  createdAt: string;
  // Shop-style additions — present when opened from the editor draft.
  color?: string;
  licensePlate?: string;
  plateState?: string;
  unitNumber?: string;
  mileageIn?: string;
  mileageOut?: string;
  promisedAt?: string;
  estimateDate?: string;
  startDate?: string;
  serviceWriter?: string;
  technician?: string;
  technicianCert?: string;
  keytag?: string;
  paymentMethod?: string;
  tireFL?: string;
  tireFR?: string;
  tireRL?: string;
  tireRR?: string;
  sublet?: number;
  fees?: number;
  epa?: number;
  shopSupplies?: number;
  amountPaidCents?: number;
  customerNotes?: string;
  diagnosisNotes?: string;
};

const fmt = (n: number) => `$${n.toFixed(2)}`;
const dollarsToCents = (v?: number | null): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};
const tirePressures = (d: PreviewDoc) => {
  const psi = (s?: string) => { const n = parseInt(String(s ?? "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };
  const fl = psi(d.tireFL), fr = psi(d.tireFR), rl = psi(d.tireRL), rr = psi(d.tireRR);
  if (fl == null && fr == null && rl == null && rr == null) return null;
  return { fl, fr, rl, rr };
};

const toPdfDoc = (doc: PreviewDoc): PdfDoc => ({
  type: doc.type,
  number: doc.number,
  customer: doc.customer || `${doc.firstName} ${doc.lastName}`.trim() || "—",
  phone: doc.phone,
  email: doc.email,
  address: doc.address,
  vehicle: doc.vehicle || `${doc.year} ${doc.make} ${doc.model}`.trim() || "—",
  vin: doc.vin,
  year: doc.year, make: doc.make, model: doc.model, engine: doc.engine,
  color: doc.color, licensePlate: doc.licensePlate, plateState: doc.plateState, unitNumber: doc.unitNumber,
  mileageIn: doc.mileageIn, mileageOut: doc.mileageOut,
  items: doc.items.map((i) => ({
    category: i.category, description: i.description, qty: i.qty, price: i.price,
    hours: i.hours, discount: i.discount, discountType: i.discountType,
  })),
  status: doc.status,
  taxRate: doc.taxRate,
  createdAt: doc.createdAt,
  promisedAt: doc.promisedAt, estimateDate: doc.estimateDate, startDate: doc.startDate, serviceWriter: doc.serviceWriter,
  technician: doc.technician, technicianCert: doc.technicianCert,
  keytag: doc.keytag, paymentMethod: doc.paymentMethod,
  customerNotes: doc.customerNotes, diagnosisNotes: doc.diagnosisNotes,
  tirePressures: tirePressures(doc),
  subletCents: dollarsToCents(doc.sublet), feesCents: dollarsToCents(doc.fees),
  epaCents: dollarsToCents(doc.epa), shopSuppliesCents: dollarsToCents(doc.shopSupplies),
  amountPaidCents: doc.amountPaidCents,
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: PreviewDoc | null;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storePhone2?: string;
  storeEmail?: string;
  storeStateReg?: string;
  storeLogo?: string;
  storeTermsPolicy?: string;
}

export default function AutoRepairDocPreviewDialog({
  open, onOpenChange, doc,
  storeName, storeAddress, storePhone, storePhone2, storeEmail, storeStateReg, storeLogo, storeTermsPolicy,
}: Props) {
  const buildBlob = () => generateDocumentPdf({
    doc: toPdfDoc(doc as PreviewDoc),
    storeName, storeAddress, storePhone, storePhone2, storeEmail, storeStateReg, storeLogo, storeTermsPolicy,
  });

  // Build a blob URL for the inline PDF preview; rebuilt whenever the doc or
  // shop header changes, revoked on cleanup to avoid leaking object URLs.
  const pdfUrl = useMemo(() => {
    if (!doc) return null;
    try { return URL.createObjectURL(buildBlob()); } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, storeName, storeAddress, storePhone, storePhone2, storeEmail, storeStateReg, storeLogo, storeTermsPolicy]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  if (!doc) return null;

  const docTypeLabel = doc.type === "estimate" ? "ESTIMATE" : "INVOICE";
  const totals = computeDocTotals(doc.items, doc.taxRate);
  const grandTotal = totals.total + sumExtraChargeCents({
    subletCents: dollarsToCents(doc.sublet), feesCents: dollarsToCents(doc.fees),
    epaCents: dollarsToCents(doc.epa), shopSuppliesCents: dollarsToCents(doc.shopSupplies),
  }) / 100;
  const pdfFilename = `${docTypeLabel}-${doc.number}.pdf`;

  const handlePrint = async () => {
    if (Capacitor.isNativePlatform()) {
      try { await exportBlob(buildBlob(), pdfFilename, "Print or share"); }
      catch (e: any) { toast.error(e?.message ?? "Failed to prepare document"); }
      return;
    }
    if (pdfUrl) {
      const w = window.open(pdfUrl, "_blank");
      if (!w) toast.error("Pop-up blocked. Allow pop-ups to print.");
    }
  };

  const handleDownload = async () => {
    try {
      const shared = await exportBlob(buildBlob(), pdfFilename, `${docTypeLabel} ${doc.number}`);
      if (!shared) toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate PDF");
    }
  };

  const handleEmail = () => {
    if (!doc.email) { toast.error("No customer email on file"); return; }
    const subject = encodeURIComponent(`${docTypeLabel} ${doc.number}${storeName ? ` from ${storeName}` : ""}`);
    const body = encodeURIComponent(
      `Hello ${doc.firstName || doc.customer || ""},\n\n` +
      `Please find your ${docTypeLabel.toLowerCase()} ${doc.number} for ${doc.vehicle || "your vehicle"}.\n\n` +
      `Total: ${fmt(grandTotal)}\n\n` +
      `Thank you,\n${storeName || ""}`
    );
    openSystemUrl(`mailto:${doc.email}?subject=${subject}&body=${body}`);
  };

  const handleSms = () => {
    if (!doc.phone) { toast.error("No customer phone on file"); return; }
    const body = encodeURIComponent(
      `${storeName || "Your shop"}: ${docTypeLabel.toLowerCase()} ${doc.number} for ${doc.vehicle || "your vehicle"} — Total ${fmt(grandTotal)}.`
    );
    const tel = doc.phone.replace(/[^\d+]/g, "");
    openSystemUrl(`sms:${tel}?body=${body}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3 pr-12 border-b border-border flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-semibold">Preview · {doc.number}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5"><Printer className="w-3.5 h-3.5" /> Print</Button>
            <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5"><Download className="w-3.5 h-3.5" /> Download</Button>
            <Button size="sm" variant="outline" onClick={handleEmail} className="gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Button>
            <Button size="sm" variant="outline" onClick={handleSms} className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> SMS</Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          {pdfUrl ? (
            <iframe
              title="document-preview"
              src={pdfUrl}
              className="w-full h-[75vh] bg-white rounded-lg shadow-md border border-border"
            />
          ) : (
            <div className="h-[75vh] flex items-center justify-center text-sm text-muted-foreground">Preparing preview…</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
