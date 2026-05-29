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
  pdf.text(`Date: ${new Date(doc.createdAt).toLocaleDateString()}`, pageWidth - margin, 80, { align: "right" });
  pdf.text(`Status: ${doc.status.toUpperCase()}`, pageWidth - margin, 94, { align: "right" });

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
  if (doc.phone) { pdf.text(doc.phone, margin, y); }
  if (doc.vin) { pdf.text(`VIN: ${doc.vin}`, pageWidth / 2, y); }
  y += 12;
  if (doc.email) { pdf.text(doc.email, margin, y); y += 12; }
  if (doc.address) {
    const wrapped = pdf.splitTextToSize(doc.address, pageWidth / 2 - margin);
    pdf.text(wrapped, margin, y);
  }

  // Line items table
  const rows = doc.items.map((i) => {
    const qtyOrHrs = i.category === "labor" ? `${i.hours ?? 0} hr` : `${i.qty}`;
    return [
      i.category.charAt(0).toUpperCase() + i.category.slice(1),
      i.description || "—",
      qtyOrHrs,
      `$${(i.price ?? 0).toFixed(2)}`,
      `$${lineAmount(i).toFixed(2)}`,
    ];
  });

  autoTable(pdf, {
    startY: 220,
    head: [["Type", "Description", "Qty/Hrs", "Rate", "Amount"]],
    body: rows,
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 60 },
      2: { halign: "right", cellWidth: 60 },
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

  row("Subtotal", `$${t.subtotal.toFixed(2)}`);
  if (t.discount > 0) row("Discount", `-$${t.discount.toFixed(2)}`);
  row(`Tax (${t.taxRate}%)`, `$${t.tax.toFixed(2)}`);
  row("Total", `$${t.total.toFixed(2)}`, true, 12);

  if (doc.customerNotes) {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80);
    pdf.text("Notes", margin, afterY + 30);
    const notes = pdf.splitTextToSize(doc.customerNotes, pageWidth - margin * 2);
    pdf.text(notes, margin, afterY + 44);
  }

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(160);
  pdf.text(
    `Generated ${new Date().toLocaleString()}`,
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
