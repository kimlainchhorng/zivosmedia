/**
 * Branded PDF generator for invoices and estimates.
 * Uses jsPDF + autoTable. Returns a Blob the caller can download or attach.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { computeDocTotals, lineNet } from "./taxCalc";

export type PdfDoc = {
  type: "invoice" | "estimate";
  number: string;
  customer: string;
  phone?: string;
  email?: string;
  address?: string;
  vehicle?: string;
  vin?: string;
  licensePlate?: string;
  plateState?: string;
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
  customerNotes?: string;
};

const lineAmount = (i: PdfDoc["items"][number]) => lineNet(i);

export function generateDocumentPdf(opts: {
  doc: PdfDoc;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}): Blob {
  const { doc, storeName = "Auto Repair Shop", storeAddress, storePhone } = opts;
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 40;
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  // Header — store info
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(storeName, margin, 50);

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(110);
  let y = 66;
  if (storeAddress) { pdf.text(storeAddress, margin, y); y += 12; }
  if (storePhone) { pdf.text(storePhone, margin, y); }

  // Doc title — top right
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0);
  const title = doc.type === "invoice" ? "INVOICE" : "ESTIMATE";
  pdf.text(title, pageWidth - margin, 50, { align: "right" });

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80);
  pdf.text(`#${doc.number}`, pageWidth - margin, 66, { align: "right" });
  pdf.text(`${new Date(doc.createdAt).toLocaleDateString()}`, pageWidth - margin, 80, { align: "right" });

  // Bill-to + Vehicle blocks
  y = 130;
  pdf.setFontSize(9);
  pdf.setTextColor(110);
  pdf.text("BILL TO", margin, y);
  pdf.text("VEHICLE", pageWidth / 2, y);
  y += 14;
  pdf.setFontSize(11);
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "bold");
  pdf.text(doc.customer || "—", margin, y);
  pdf.text(doc.vehicle || "—", pageWidth / 2, y);
  y += 14;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80);
  const plateText = doc.licensePlate
    ? `Plate: ${doc.licensePlate}${doc.plateState ? ` (${doc.plateState})` : ""}`
    : "";
  let vy = y; // VEHICLE column advances independently of the BILL TO column
  if (doc.phone) { pdf.text(doc.phone, margin, y); }
  if (doc.vin) { pdf.text(`VIN: ${doc.vin}`, pageWidth / 2, vy); vy += 12; }
  if (plateText) { pdf.text(plateText, pageWidth / 2, vy); vy += 12; }
  y += 12;
  if (doc.email) { pdf.text(doc.email, margin, y); y += 12; }
  if (doc.address) {
    const wrapped = pdf.splitTextToSize(doc.address, pageWidth / 2 - margin);
    pdf.text(wrapped, margin, y);
  }

  // Line items — grouped by category to mirror the on-screen preview
  // (Labor → Parts & Materials → Diagnosis & Inspection), with a Discount column.
  const CATS: Array<{ key: string; label: string }> = [
    { key: "labor", label: "Labor" },
    { key: "part", label: "Parts & Materials" },
    { key: "diagnosis", label: "Diagnosis & Inspection" },
  ];
  const body: any[] = [];
  for (const { key, label } of CATS) {
    const group = doc.items.filter((i) => i.category === key);
    if (group.length === 0) continue;
    body.push([{ content: label, colSpan: 5, styles: { fontStyle: "bold", fillColor: [250, 250, 250], textColor: [85, 85, 85], fontSize: 8 } }]);
    for (const it of group) {
      const qtyHrs = key === "labor" ? `${it.hours ?? 0} hr` : key === "part" ? `${it.qty ?? 0}` : "—";
      const rate = key === "diagnosis" ? "—" : fmt(it.price ?? 0);
      const dv = Math.max(0, it.discount ?? 0);
      const discTxt = !dv ? "—" : (it.discountType ?? "pct") === "amt" ? fmt(dv) : `${dv}%`;
      body.push([it.description || "—", qtyHrs, rate, discTxt, fmt(lineAmount(it))]);
    }
  }

  autoTable(pdf, {
    startY: 210,
    head: [["Description", "Qty/Hrs", "Rate", "Discount", "Amount"]],
    body,
    headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 60 },
      2: { halign: "right", cellWidth: 70 },
      3: { halign: "right", cellWidth: 70 },
      4: { halign: "right", cellWidth: 80 },
    },
    margin: { left: margin, right: margin },
  });

  const t = computeDocTotals(doc.items, doc.taxRate ?? 0);
  // autoTable mutates internal state; lastAutoTable is untyped, hence the cast.
  let afterY = (pdf as any).lastAutoTable.finalY + 20;

  const labelX = pageWidth - margin - 140;
  const valX = pageWidth - margin;
  const row = (label: string, value: string, bold = false, size = 10) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setTextColor(bold ? 0 : 80);
    pdf.text(label, labelX, afterY);
    pdf.text(value, valX, afterY, { align: "right" });
    afterY += bold ? 18 : 14;
  };

  const laborTotal = doc.items.filter((i) => i.category === "labor").reduce((s, i) => s + lineAmount(i), 0);
  const partsTotal = doc.items.filter((i) => i.category === "part").reduce((s, i) => s + lineAmount(i), 0);
  const diagTotal = doc.items.filter((i) => i.category === "diagnosis").reduce((s, i) => s + lineAmount(i), 0);

  if (laborTotal > 0) row("Labor", fmt(laborTotal));
  if (partsTotal > 0) row("Parts", fmt(partsTotal));
  if (diagTotal > 0) row("Diagnosis", fmt(diagTotal));
  row("Subtotal", fmt(t.subtotal));
  if (t.discount > 0) row("Discount", `−${fmt(t.discount)}`);
  row(`Tax (${t.taxRate}%)`, fmt(t.tax));
  row("Total", fmt(t.total), true, 12);

  let notesY = afterY + 24;
  if (doc.customerNotes) {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(80);
    pdf.text("Notes", margin, notesY);
    notesY += 14;
    pdf.setFont("helvetica", "normal");
    const notes = pdf.splitTextToSize(doc.customerNotes, pageWidth - margin * 2);
    pdf.text(notes, margin, notesY);
    notesY += notes.length * 12 + 10;
  }

  // Disclaimer note — mirrors the on-screen preview.
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80);
  const disclaimer = doc.type === "estimate"
    ? "This is an estimate. Actual costs may vary based on inspection."
    : "Thank you for your business. Payment is due upon receipt unless otherwise agreed.";
  pdf.text(pdf.splitTextToSize(disclaimer, pageWidth - margin * 2), margin, notesY);

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(160);
  pdf.text(
    `${storeName} · Generated by ZIVO Partner`,
    pageWidth / 2,
    pdf.internal.pageSize.getHeight() - 20,
    { align: "center" }
  );

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
