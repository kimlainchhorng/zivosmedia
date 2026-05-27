/**
 * Branded PDF generator for invoices and estimates.
 * Uses jsPDF + autoTable. Returns a Blob the caller can download or attach.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  createdAt: string;
  customerNotes?: string;
};

const lineAmount = (i: PdfDoc["items"][number]) => {
  const gross =
    i.category === "labor" ? (i.hours ?? 0) * (i.price ?? 0) :
    i.category === "part" ? (i.qty ?? 0) * (i.price ?? 0) :
    (i.price ?? 0);
  const d = Math.max(0, i.discount ?? 0);
  if ((i.discountType ?? "pct") === "amt") return Math.max(0, gross - d);
  return gross * (1 - Math.min(100, d) / 100);
};

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
  if (storePhone) { pdf.text(storePhone, margin, y); y += 12; }

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

  const total = doc.items.reduce((s, i) => s + lineAmount(i), 0);
  // @ts-ignore — autoTable mutates internal state
  const afterY = (pdf as any).lastAutoTable.finalY + 20;

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Total", pageWidth - margin - 100, afterY);
  pdf.text(`$${total.toFixed(2)}`, pageWidth - margin, afterY, { align: "right" });

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
