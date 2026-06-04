/**
 * Shop-style PDF generator for auto-repair invoices and estimates.
 *
 * Renders the full repair-order layout: branded header with logo + barcode,
 * info / customer / vehicle bands, customer complaint, grouped parts & labor
 * with per-group subtotals, repairs-performed-by, diagnosis, tire inflation,
 * a totals box (parts / labor / sublet / fees / EPA / shop supplies / tax /
 * payments / balance due) and a terms + signature footer.
 *
 * Uses jsPDF + autoTable. Returns a Blob the caller can download or attach.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JsBarcode from "jsbarcode";
import { computeDocTotals, lineNet, sumExtraChargeCents } from "./taxCalc";

export type PdfDoc = {
  type: "invoice" | "estimate";
  number: string;
  customer: string;
  phone?: string;       // cell
  workPhone?: string;
  email?: string;
  address?: string;
  vehicle?: string;
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
  engine?: string;
  color?: string;
  licensePlate?: string;
  plateState?: string;
  unitNumber?: string;
  mileageIn?: string;
  mileageOut?: string;
  items: Array<{
    category: string;
    description: string;
    qty: number;
    price: number;
    hours?: number;
    discount?: number;
    discountType?: "pct" | "amt";
  }>;
  status: string;
  taxRate?: number; // flat sales-tax percentage
  createdAt: string;
  closedAt?: string;       // invoice closed / paid date
  promisedAt?: string;     // promised completion date
  estimateDate?: string;   // issue date (defaults to today)
  startDate?: string;      // planned work start date
  serviceWriter?: string;
  technician?: string;
  technicianCert?: string;
  estimateRef?: string;    // estimate number this invoice was created from
  keytag?: string;
  paymentMethod?: string;
  customerNotes?: string;   // shown as "Customer Complaint / Request"
  diagnosisNotes?: string;  // shown as "Diagnosis / Repair"
  tirePressures?: { fl?: number | null; fr?: number | null; rl?: number | null; rr?: number | null } | null;
  subletCents?: number | null;
  feesCents?: number | null;
  epaCents?: number | null;
  shopSuppliesCents?: number | null;
  amountPaidCents?: number | null;
};

const lineAmount = (i: PdfDoc["items"][number]) => lineNet(i);
const money = (n: number) => `$${(n || 0).toFixed(2)}`;

// Code128 barcode → PNG data URL via an off-screen canvas. Returns null when no
// DOM is available (SSR / tests) or the value can't be encoded.
function barcodeDataUrl(value: string): string | null {
  try {
    if (typeof document === "undefined" || !value) return null;
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, value, { format: "CODE128", displayValue: false, margin: 0, height: 36, width: 1.5 });
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function generateDocumentPdf(opts: {
  doc: PdfDoc;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storePhone2?: string;
  storeEmail?: string;
  storeStateReg?: string;
  storeLogo?: string;        // data URL
  storeTermsPolicy?: string;
}): Blob {
  const {
    doc,
    storeName = "Auto Repair Shop",
    storeAddress,
    storePhone,
    storePhone2,
    storeEmail,
    storeStateReg,
    storeLogo,
    storeTermsPolicy,
  } = opts;

  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 32;
  const contentW = pageW - margin * 2;
  const isInvoice = doc.type === "invoice";

  const dateOnly = (v?: string) => {
    if (!v) return "";
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-US");
  };
  const nowStr = new Date().toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // ---- small drawing helpers -------------------------------------------------
  const thinRule = (y: number, weight = 0.5, color = 200) => {
    pdf.setDrawColor(color);
    pdf.setLineWidth(weight);
    pdf.line(margin, y, pageW - margin, y);
  };
  // "Label : value" — label muted, value dark/bold; colon at a fixed column.
  const kv = (label: string, value: string | undefined, x: number, colonX: number, y: number) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(110);
    pdf.text(label, x, y);
    pdf.text(":", colonX, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(25);
    pdf.text(value ? String(value) : "", colonX + 6, y);
  };
  const sectionHeader = (title: string, y: number): number => {
    pdf.setFillColor(238, 238, 238);
    pdf.rect(margin, y, contentW, 15, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(30);
    pdf.text(title, margin + 6, y + 10.5);
    return y + 15;
  };
  const paragraph = (text: string, y: number, gap = 11): number => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(60);
    const lines = pdf.splitTextToSize(text, contentW - 8);
    pdf.text(lines, margin + 4, y + gap);
    return y + gap + lines.length * 10 + 4;
  };

  // ---- header ----------------------------------------------------------------
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.setTextColor(20);
  pdf.text(storeName, margin, 50);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(90);
  let hy = 64;
  if (storeAddress) { pdf.text(storeAddress, margin, hy); hy += 12; }
  const phones = [storePhone ? `PHONE L1: ${storePhone}` : "", storePhone2 ? `PHONE L2: ${storePhone2}` : ""].filter(Boolean).join("   |   ");
  if (phones) { pdf.text(phones, margin, hy); hy += 12; }
  const idLine = [storeEmail ? `EMAIL: ${storeEmail}` : "", storeStateReg ? `STATE REG. NO: ${storeStateReg}` : ""].filter(Boolean).join("   |   ");
  if (idLine) { pdf.text(idLine, margin, hy); hy += 12; }

  // logo (top right), aspect-preserved
  if (storeLogo) {
    try {
      const props = (pdf as any).getImageProperties(storeLogo);
      const h = 50;
      const w = Math.min(170, (props.width / props.height) * h);
      pdf.addImage(storeLogo, "PNG", pageW - margin - w, 30, w, h);
    } catch { /* skip logo on any decode error */ }
  }

  let y = Math.max(hy, 86) + 2;
  pdf.setDrawColor(30);
  pdf.setLineWidth(1.2);
  pdf.line(margin, y, pageW - margin, y);
  y += 12;

  // ---- info band -------------------------------------------------------------
  const L_LABEL = margin, L_COLON = 110;
  const M_LABEL = 232, M_COLON = 340;
  const bcX = 432, bcW = pageW - margin - bcX;

  const docNoLabel = isInvoice ? "INVOICE NO." : "ESTIMATE NO.";
  kv("Invoice Created", dateOnly(doc.createdAt), L_LABEL, L_COLON, y);
  kv(docNoLabel, doc.number, M_LABEL, M_COLON, y);
  kv("Invoice Closed", dateOnly(doc.closedAt), L_LABEL, L_COLON, y + 13);
  kv("ESTIMATE REF NO.", doc.estimateRef, M_LABEL, M_COLON, y + 13);
  kv("Promise Date", dateOnly(doc.promisedAt), L_LABEL, L_COLON, y + 26);
  kv("Technician", doc.technician, M_LABEL, M_COLON, y + 26);
  kv("Service Writer", doc.serviceWriter, L_LABEL, L_COLON, y + 39);
  kv("Technician Cert #", doc.technicianCert, M_LABEL, M_COLON, y + 39);
  kv("Date", dateOnly(doc.estimateDate), L_LABEL, L_COLON, y + 52);
  kv("Start Date", dateOnly(doc.startDate), M_LABEL, M_COLON, y + 52);

  const invBc = barcodeDataUrl(doc.number);
  if (invBc) {
    pdf.addImage(invBc, "PNG", bcX, y - 2, bcW, 30);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(60);
    pdf.text(`*${docNoLabel}${doc.number}*`, bcX + bcW / 2, y + 38, { align: "center" });
  }
  y += 58;
  thinRule(y); y += 12;

  // ---- customer band ---------------------------------------------------------
  const R_LABEL = 318, R_COLON = 348;
  kv("Customer", doc.customer, L_LABEL, L_COLON, y);
  kv("Cell", doc.phone, R_LABEL, R_COLON, y);
  kv("Work", doc.workPhone, R_LABEL + 130, R_COLON + 130, y);
  kv("Address", doc.address, L_LABEL, L_COLON, y + 13);
  kv("Email", doc.email, R_LABEL, R_COLON, y + 13);
  y += 22;
  thinRule(y); y += 12;

  // ---- vehicle band ----------------------------------------------------------
  const vehicleLabel = doc.vehicle || [doc.year, doc.make, doc.model].filter(Boolean).join(" ");
  const plate = [doc.licensePlate, doc.plateState].filter(Boolean).join(" ");
  kv("Vehicle", vehicleLabel, L_LABEL, L_COLON, y);
  kv("Color", doc.color, M_LABEL, M_COLON, y);
  kv("Engine", doc.engine, L_LABEL, L_COLON, y + 13);
  kv("License Plate", plate, M_LABEL, M_COLON, y + 13);
  kv("Unit #", doc.unitNumber, L_LABEL, L_COLON, y + 26);
  kv("Mileage In", doc.mileageIn ? Number(doc.mileageIn).toLocaleString() : "", M_LABEL, M_COLON, y + 26);
  kv("VIN", doc.vin, L_LABEL, L_COLON, y + 39);
  kv("Mileage Out", doc.mileageOut ? Number(doc.mileageOut).toLocaleString() : "", M_LABEL, M_COLON, y + 39);

  const last8 = (doc.vin || "").slice(-8);
  if (last8) {
    const vinBc = barcodeDataUrl(last8);
    if (vinBc) {
      pdf.addImage(vinBc, "PNG", bcX, y - 2, bcW, 30);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(60);
      pdf.text(`*Last 8 Digit of VIN: ${last8}*`, bcX + bcW / 2, y + 38, { align: "center" });
    }
  }
  y += 45;
  pdf.setDrawColor(30);
  pdf.setLineWidth(1.2);
  pdf.line(margin, y, pageW - margin, y);
  y += 12;

  // ---- customer complaint ----------------------------------------------------
  if (doc.customerNotes && doc.customerNotes.trim()) {
    y = sectionHeader("Customer Complaint / Request:", y);
    y = paragraph(doc.customerNotes.trim(), y);
    y += 4;
  }

  // ---- line items, grouped by category with per-group subtotals --------------
  const CATS: Array<{ key: string; label: string; prefix: string }> = [
    { key: "labor", label: "Labor", prefix: "Labor:" },
    { key: "part", label: "Parts", prefix: "Part:" },
    { key: "diagnosis", label: "Diagnosis", prefix: "Diag:" },
  ];
  const body: any[] = [];
  const subtotalRow = (amount: number) =>
    body.push([
      { content: "", colSpan: 3, styles: { fillColor: [255, 255, 255] } },
      { content: "SubTotal:", styles: { halign: "right", fontStyle: "bold", fillColor: [245, 245, 245] } },
      { content: money(amount), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 245, 245] } },
    ]);
  for (const { key, prefix } of CATS) {
    const group = doc.items.filter((i) => i.category === key);
    if (group.length === 0) continue;
    let groupTotal = 0;
    for (const it of group) {
      groupTotal += lineAmount(it);
      const qty = key === "labor" ? `${it.hours ?? 0}` : key === "part" ? `${it.qty ?? 0}` : "Fixed";
      const price = key === "diagnosis" ? money(it.price ?? 0) : money(it.price ?? 0);
      const dv = Math.max(0, it.discount ?? 0);
      const discTxt = !dv ? "_" : (it.discountType ?? "pct") === "amt" ? money(dv) : `${dv}%`;
      body.push([
        `${prefix}   ${it.description || ""}`,
        price,
        qty,
        discTxt,
        money(lineAmount(it)),
      ]);
    }
    subtotalRow(groupTotal);
  }

  autoTable(pdf, {
    startY: y,
    head: [["Description of Parts / Labor or Service", "Price", "QTY", "DISC", "Extended"]],
    body: body.length ? body : [[{ content: "No line items", colSpan: 5, styles: { halign: "center", textColor: [150, 150, 150] } }]],
    theme: "plain",
    headStyles: { fillColor: [255, 255, 255], textColor: [20, 20, 20], fontStyle: "bold", fontSize: 8.5, lineWidth: { bottom: 0.7 }, lineColor: [30, 30, 30] },
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: [40, 40, 40] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 62 },
      2: { halign: "right", cellWidth: 50 },
      3: { halign: "right", cellWidth: 50 },
      4: { halign: "right", cellWidth: 74 },
    },
    margin: { left: margin, right: margin },
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  pdf.setFont("helvetica", "bolditalic");
  pdf.setFontSize(8.5);
  pdf.setTextColor(60);
  pdf.text("All Parts are New Unless Shown as Used.", pageW / 2, y, { align: "center" });
  y += 12;

  // ---- repairs performed by --------------------------------------------------
  if (doc.technician || doc.technicianCert) {
    y = sectionHeader("Repairs Performed By:", y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(40);
    pdf.text([doc.technician, doc.technicianCert].filter(Boolean).join(" : "), margin + 4, y + 12);
    y += 20;
  }

  // ---- diagnosis / repair ----------------------------------------------------
  if (doc.diagnosisNotes && doc.diagnosisNotes.trim()) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(120);
    pdf.text("* ".repeat(36).trim(), pageW / 2, y + 6, { align: "center" });
    y += 12;
    y = sectionHeader("Diagnosis / Repair:", y);
    y = paragraph(doc.diagnosisNotes.trim(), y);
    y += 4;
  }

  // ---- tire inflation --------------------------------------------------------
  const tp = doc.tirePressures;
  const anyTire = tp && [tp.fl, tp.fr, tp.rl, tp.rr].some((v) => v != null && v !== ("" as any));
  if (anyTire) {
    y = sectionHeader("Tire Inflation Service:", y);
    const psi = (v?: number | null) => (v == null ? "—" : `${v} PSI`);
    const txt = `Tire Pressure Measurements: Front Left Tire: ${psi(tp!.fl)} , Front Right Tire: ${psi(tp!.fr)} , Rear Left Tire: ${psi(tp!.rl)} , Rear Right Tire: ${psi(tp!.rr)}`;
    y = paragraph(txt, y);
    y += 4;
  }

  // ---- bottom block: terms (left) + totals (right) ---------------------------
  const t = computeDocTotals(doc.items, doc.taxRate ?? 0);
  const partsAmt = doc.items.filter((i) => i.category === "part").reduce((s, i) => s + lineAmount(i), 0);
  const laborAmt = doc.items.filter((i) => i.category === "labor").reduce((s, i) => s + lineAmount(i), 0);
  const diagAmt = doc.items.filter((i) => i.category === "diagnosis").reduce((s, i) => s + lineAmount(i), 0);
  const sublet = (doc.subletCents ?? 0) / 100;
  const fees = (doc.feesCents ?? 0) / 100;
  const epa = (doc.epaCents ?? 0) / 100;
  const supplies = (doc.shopSuppliesCents ?? 0) / 100;
  const displaySubtotal = t.preTax + sublet;
  const grandTotal = t.total + sumExtraChargeCents(doc) / 100;
  const payments = (doc.amountPaidCents ?? 0) / 100;
  const balance = Math.max(0, grandTotal - payments);
  const change = Math.max(0, payments - grandTotal);

  const BOTTOM_H = 186;
  if (y + BOTTOM_H > pageH - margin) {
    pdf.addPage();
    y = margin;
  }
  // Flow the totals + terms right below the content (only page-break when they
  // won't fit) so a short repair order stays on a single page.
  const blockY = y + 10;

  // totals box (right)
  const boxW = 220;
  const boxX = pageW - margin - boxW;
  let ty = blockY;
  const totalRow = (label: string, value: string, opt: { bold?: boolean; size?: number; indent?: number } = {}) => {
    pdf.setFont("helvetica", opt.bold ? "bold" : "normal");
    pdf.setFontSize(opt.size ?? 9);
    pdf.setTextColor(opt.bold ? 20 : 70);
    pdf.text(label, boxX + (opt.indent ?? 0), ty);
    pdf.text(value, pageW - margin, ty, { align: "right" });
    ty += (opt.size ?? 9) + 4;
  };
  totalRow("PARTS AMOUNT:", money(partsAmt), { bold: true });
  totalRow("LABOR AMOUNT:", money(laborAmt), { bold: true });
  if (diagAmt > 0) totalRow("DIAGNOSIS:", money(diagAmt), { bold: true });
  totalRow("SUBLET AMOUNT:", money(sublet), { bold: true });
  totalRow("SUBTOTAL:", money(displaySubtotal), { bold: true, indent: 6 });
  totalRow("FEES:", money(fees), { indent: 6 });
  totalRow("EPA:", money(epa), { indent: 6 });
  totalRow("SHOP SUPPLIES:", money(supplies), { indent: 6 });
  totalRow("TAXES:", money(t.tax), { indent: 6 });
  totalRow("TOTAL:", money(grandTotal), { bold: true });
  if (isInvoice) totalRow("PAYMENTS:", money(payments), { bold: true });

  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.6);
  pdf.line(boxX, ty, pageW - margin, ty);
  pdf.setLineDashPattern([], 0);
  ty += 16;

  if (isInvoice) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(15);
    pdf.text("BALANCE DUE:", boxX, ty);
    pdf.text(money(balance), pageW - margin, ty, { align: "right" });
    ty += 16;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(40);
    const paidLine = `Paid By: ${doc.paymentMethod || "—"} <-> Change: ${change.toFixed(2)} On: ${nowStr}`;
    pdf.text(paidLine, boxX, ty);
  }

  // terms (left)
  const termsW = boxX - margin - 16;
  let ly = blockY - 6;
  const defaultTerms =
    "TERMS: I hereby authorize the repair work herein set forth to be done along with the necessary materials and agree that you are not responsible for loss or damage to vehicle or articles left in vehicle in case of fire, theft or any other cause beyond your control. I hereby grant you and/or your employees permission to operate the vehicle herein described on streets, highways, or elsewhere for the purpose of testing and/or inspection. An express mechanic's lien is acknowledged on above vehicle to secure the amount of repairs thereto.";
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(70);
  const termsLines = pdf.splitTextToSize(storeTermsPolicy || defaultTerms, termsW);
  pdf.text(termsLines, margin, ly);
  ly += termsLines.length * 7.2 + 8;

  pdf.setFontSize(7);
  pdf.setTextColor(40);
  pdf.text("ALL REPAIRS PROPERLY PERFORMED P.A. 300   X", margin, ly);
  pdf.setDrawColor(20); pdf.setLineWidth(0.7);
  pdf.line(margin + 168, ly + 1, boxX - 20, ly + 1);
  ly += 12;
  const completion = "COMPLETION STATEMENT: Replaced parts either were returned to me or i authorized repair facility to dispose them. Before removing vehicle from facility i have examined vehicle and its content and find them to be in the same condition as when vehicle arrived at facility.";
  pdf.setFontSize(6.5);
  pdf.setTextColor(70);
  const compLines = pdf.splitTextToSize(completion, termsW);
  pdf.text(compLines, margin, ly);
  ly += compLines.length * 7.2 + 14;

  pdf.setDrawColor(20); pdf.setLineWidth(0.8);
  pdf.text("X", margin, ly);
  pdf.line(margin + 12, ly, margin + termsW - 90, ly);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text(`Date: ${dateOnly(doc.closedAt) || dateOnly(doc.createdAt)}`, margin + termsW - 80, ly);

  // ---- footer ----------------------------------------------------------------
  const footY = pageH - 16;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(90);
  const footParts = [
    "Page: 1",
    doc.keytag ? `KEYTAG: ${doc.keytag}` : "",
    last8 ? `L8D: ${last8}` : "",
    `Printed On: ${nowStr}`,
  ].filter(Boolean).join("   |   ");
  pdf.text(footParts, margin, footY);

  return pdf.output("blob");
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
