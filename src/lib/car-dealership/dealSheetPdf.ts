/**
 * Buyer's Order / Deal Sheet PDF generator.
 * Uses jsPDF + jspdf-autotable.
 *
 * Usage:
 *   import { printDealSheet } from "@/lib/car-dealership/dealSheetPdf";
 *   printDealSheet(sale, "My Auto Group");
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DealershipSale } from "@/hooks/car-dealership/useDealershipSales";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ─── main export ─────────────────────────────────────────────────────────────

export function printDealSheet(sale: DealershipSale, storeName = "Auto Dealership") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageW, 68, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(storeName.toUpperCase(), margin, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("BUYER'S ORDER", margin, 48);

  // Deal # and date on the right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Deal #${sale.deal_number}`, pageW - margin, 30, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Date: ${fmtDate(sale.sold_at ?? sale.created_at)}`,
    pageW - margin,
    48,
    { align: "right" },
  );

  let y = 88;

  // ── Info columns ─────────────────────────────────────────────────────────────
  const colW = contentW / 2 - 8;

  // Customer box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, colW, 80, 4, 4, "F");
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, colW, 80, 4, 4, "S");

  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CUSTOMER", margin + 10, y + 14);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(sale.customer_name || "—", margin + 10, y + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // slate-700
  let cy = y + 43;
  if (sale.customer_phone) {
    doc.text(`Phone: ${sale.customer_phone}`, margin + 10, cy);
    cy += 13;
  }
  if (sale.customer_email) {
    doc.text(`Email: ${sale.customer_email}`, margin + 10, cy);
  }

  // Vehicle box
  const vx = margin + colW + 16;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(vx, y, colW, 80, 4, 4, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(vx, y, colW, 80, 4, 4, "S");

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("VEHICLE", vx + 10, y + 14);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  // Wrap long vehicle labels
  const vehicleLines = doc.splitTextToSize(sale.vehicle_label || "—", colW - 20);
  doc.text(vehicleLines[0] ?? "—", vx + 10, y + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  let vInfoY = y + 43;
  if (sale.vehicle_vin) {
    doc.text(`VIN: ${sale.vehicle_vin}`, vx + 10, vInfoY);
    vInfoY += 13;
  }
  if (sale.salesperson_name) {
    doc.text(`Salesperson: ${sale.salesperson_name}`, vx + 10, vInfoY);
    vInfoY += 13;
  }
  if (sale.payment_method) {
    const pm = sale.payment_method.replace(/_/g, " ");
    doc.text(`Payment: ${pm.charAt(0).toUpperCase() + pm.slice(1)}`, vx + 10, vInfoY);
  }

  y += 96;

  // ── Status badge ─────────────────────────────────────────────────────────────
  const statusLabel = sale.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, y, 80, 18, 3, 3, "F");
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Status: ${statusLabel}`, margin + 8, y + 12);

  y += 30;

  // ── Pricing breakdown table ───────────────────────────────────────────────────
  type PricingRow = [string, string];
  const pricingRows: PricingRow[] = [];

  if (sale.sale_price_cents > 0)
    pricingRows.push(["Vehicle sale price", fmt(sale.sale_price_cents)]);
  if (sale.discount_cents > 0)
    pricingRows.push([`  Discount`, `−${fmt(sale.discount_cents)}`]);
  if (sale.rebate_cents > 0)
    pricingRows.push([`  Rebate / incentive`, `−${fmt(sale.rebate_cents)}`]);
  if (sale.doc_fee_cents > 0)
    pricingRows.push(["Doc fee", fmt(sale.doc_fee_cents)]);
  if (sale.registration_fee_cents > 0)
    pricingRows.push(["Registration fee", fmt(sale.registration_fee_cents)]);
  if (sale.title_fee_cents > 0)
    pricingRows.push(["Title fee", fmt(sale.title_fee_cents)]);
  if (sale.other_fees_cents > 0)
    pricingRows.push(["Other fees", fmt(sale.other_fees_cents)]);
  if (sale.warranty_cents > 0)
    pricingRows.push(["Extended warranty", fmt(sale.warranty_cents)]);
  if (sale.gap_insurance_cents > 0)
    pricingRows.push(["GAP insurance", fmt(sale.gap_insurance_cents)]);
  if (sale.taxes_cents > 0)
    pricingRows.push(["Sales tax", fmt(sale.taxes_cents)]);
  if (sale.trade_in_value_cents > 0) {
    pricingRows.push([
      `  Trade-in credit (net of ${fmt(sale.trade_in_payoff_cents)} payoff)`,
      `−${fmt(Math.max(0, sale.trade_in_value_cents - sale.trade_in_payoff_cents))}`,
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [["Description", "Amount"]],
    body: pricingRows,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: { fontSize: 9, cellPadding: 5, textColor: [51, 65, 85] },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.72 },
      1: { cellWidth: contentW * 0.28, halign: "right" },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // @ts-expect-error jspdf-autotable adds lastAutoTable to the doc instance
  y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 8;

  // ── Totals block ─────────────────────────────────────────────────────────────
  const totalsX = margin + contentW * 0.52;
  const totalsW = contentW * 0.48;

  const totalsRows: PricingRow[] = [
    ["Subtotal", fmt(sale.subtotal_cents)],
    ["Total", fmt(sale.total_cents)],
  ];
  if (sale.deposit_cents > 0) totalsRows.push(["Deposit received", `−${fmt(sale.deposit_cents)}`]);
  if (sale.amount_paid_cents > 0) totalsRows.push(["Amount paid", `−${fmt(sale.amount_paid_cents)}`]);
  if (sale.balance_due_cents > 0) totalsRows.push(["Balance due", fmt(sale.balance_due_cents)]);

  autoTable(doc, {
    startY: y,
    body: totalsRows,
    margin: { left: totalsX, right: margin },
    tableWidth: totalsW,
    styles: { fontSize: 9, cellPadding: 5 },
    bodyStyles: { textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: totalsW * 0.55, fontStyle: "normal" },
      1: { cellWidth: totalsW * 0.45, halign: "right", fontStyle: "normal" },
    },
    // Bold the "Total" and "Balance due" rows
    didParseCell(data) {
      const label = (data.cell.raw as string) ?? "";
      if (label === "Total" || label === "Balance due") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 11;
        if (label === "Balance due") {
          data.cell.styles.textColor = [180, 60, 60];
        }
      }
    },
  });

  // @ts-expect-error
  y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 20;

  // ── Notes ─────────────────────────────────────────────────────────────────────
  const notesText = sale.customer_notes ?? "";
  if (notesText.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("NOTES", margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const noteLines = doc.splitTextToSize(notesText, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 12 + 16;
  }

  // ── Signature block ───────────────────────────────────────────────────────────
  // Keep sigs on same page if possible, else add page
  const sigBlockH = 80;
  if (y + sigBlockH > doc.internal.pageSize.getHeight() - margin) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);

  const sigColW = contentW / 3 - 8;

  const drawSigLine = (x: number, label: string) => {
    doc.line(x, y + 44, x + sigColW, y + 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, y + 56);
  };

  drawSigLine(margin, "Customer Signature");
  drawSigLine(margin + sigColW + 12, "Sales Representative");
  drawSigLine(margin + (sigColW + 12) * 2, "Date");

  y += 72;

  // ── Footer disclaimer ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  const disclaimer =
    "This buyer's order is subject to final approval. Prices, fees, and terms are estimates and may be subject to change. " +
    "All figures are in USD. Dealer is not responsible for typographical errors.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentW);
  doc.text(disclaimerLines, margin, y);

  // ── Page number ───────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US")} · ${storeName}`,
    pageW / 2,
    pageH - 20,
    { align: "center" },
  );

  // ── Save ──────────────────────────────────────────────────────────────────────
  const filename = `deal-${sale.deal_number}-${sale.customer_name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
}
