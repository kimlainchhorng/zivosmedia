/**
 * Window Sticker / Vehicle Listing PDF generator.
 * Produces a clean single-page letter-format PDF for a vehicle.
 * Suitable for printing and placing in the window of the car.
 *
 * Usage:
 *   import { printWindowSticker } from "@/lib/car-dealership/windowStickerPdf";
 *   printWindowSticker(vehicle, "My Auto Group");
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DealershipVehicle } from "@/hooks/car-dealership/useDealershipInventory";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const cap = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ─── main export ─────────────────────────────────────────────────────────────

export function printWindowSticker(
  vehicle: DealershipVehicle,
  storeName = "Auto Dealership",
) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentW = pageW - margin * 2;

  let y = 0;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageW, 56, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(storeName.toUpperCase(), margin, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("WINDOW STICKER / VEHICLE LISTING", margin, 42);

  if (vehicle.stock_number) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Stock #${vehicle.stock_number}`, pageW - margin, 26, { align: "right" });
  }
  if (vehicle.vin) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`VIN: ${vehicle.vin}`, pageW - margin, 42, { align: "right" });
  }

  y = 72;

  // ── Vehicle title ────────────────────────────────────────────────────────────
  const vehicleName = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean).join(" ");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(vehicleName, margin, y);
  y += 8;

  // Condition badge
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const condBadges = [cap(vehicle.condition)];
  if (vehicle.body_type) condBadges.push(cap(vehicle.body_type));
  doc.text(condBadges.join("  ·  "), margin, y + 12);
  y += 26;

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  // ── Specs grid (2-column via autoTable) ──────────────────────────────────────
  type SpecRow = [string, string, string, string];
  const specRows: SpecRow[] = [];

  const addSpec = (label: string, value: string | number | null | undefined) => {
    if (value == null || value === "") return;
    return String(value);
  };

  // Build pairs: [label, value, label, value] for 2-column layout
  const specs: Array<[string, string]> = [];
  if (vehicle.mileage != null) specs.push(["Mileage", `${vehicle.mileage.toLocaleString()} ${vehicle.mileage_unit}`]);
  if (vehicle.exterior_color) specs.push(["Exterior", vehicle.exterior_color]);
  if (vehicle.interior_color) specs.push(["Interior", vehicle.interior_color]);
  if (vehicle.transmission !== "automatic") specs.push(["Transmission", cap(vehicle.transmission)]);
  else specs.push(["Transmission", "Automatic"]);
  specs.push(["Fuel type", cap(vehicle.fuel_type)]);
  if (vehicle.drivetrain) specs.push(["Drivetrain", vehicle.drivetrain.toUpperCase()]);
  if (vehicle.engine) specs.push(["Engine", vehicle.engine]);
  if (vehicle.cylinders) specs.push(["Cylinders", String(vehicle.cylinders)]);
  if (vehicle.doors) specs.push(["Doors", String(vehicle.doors)]);
  if (vehicle.seats) specs.push(["Seats", String(vehicle.seats)]);

  // Pair them into rows of 4
  for (let i = 0; i < specs.length; i += 2) {
    const [l1, v1] = specs[i];
    const [l2, v2] = specs[i + 1] ?? ["", ""];
    specRows.push([l1, v1, l2, v2]);
  }

  if (specRows.length > 0) {
    autoTable(doc, {
      startY: y,
      body: specRows,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: contentW * 0.18, fontStyle: "bold", textColor: [100, 116, 139] },
        1: { cellWidth: contentW * 0.32 },
        2: { cellWidth: contentW * 0.18, fontStyle: "bold", textColor: [100, 116, 139] },
        3: { cellWidth: contentW * 0.32 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: "plain",
    });

    // @ts-expect-error jspdf-autotable augments the instance
    y = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 40;
    y += 10;
  }

  // ── Features ─────────────────────────────────────────────────────────────────
  if (vehicle.features.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("FEATURES & OPTIONS", margin, y);
    y += 12;

    // Render as 2-column bullet list
    const colW = contentW / 2 - 10;
    const half = Math.ceil(vehicle.features.length / 2);
    const col1 = vehicle.features.slice(0, half);
    const col2 = vehicle.features.slice(half);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const startY = y;
    for (let i = 0; i < Math.max(col1.length, col2.length); i++) {
      if (col1[i]) {
        doc.text(`• ${col1[i]}`, margin, y);
      }
      if (col2[i]) {
        doc.text(`• ${col2[i]}`, margin + colW + 10, y);
      }
      y += 12;
    }

    y += 8;
  }

  // ── Description ───────────────────────────────────────────────────────────────
  if (vehicle.description?.trim()) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(vehicle.description.trim(), contentW);
    doc.text(descLines, margin, y);
    y += descLines.length * 11 + 10;
  }

  // ── Pricing box ─────────────────────────────────────────────────────────────
  // Ensure pricing doesn't run off the bottom — skip to new page if close
  const pricingH = 80;
  if (y + pricingH > pageH - 60) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  // Price area: left = labels, right = prices
  const priceX = pageW - margin - 160;

  if (vehicle.msrp_cents > 0 && vehicle.msrp_cents !== vehicle.asking_price_cents) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("MSRP", margin, y);
    doc.text(fmt(vehicle.msrp_cents), pageW - margin, y, { align: "right" });
    y += 14;
  }

  // Asking price — large & prominent
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("ASKING PRICE", margin, y);

  doc.setFontSize(28);
  doc.setTextColor(30, 41, 59);
  doc.text(fmt(vehicle.asking_price_cents), pageW - margin, y + 6, { align: "right" });
  y += 36;

  // ── Footer ──────────────────────────────────────────────────────────────────
  const footY = pageH - 36;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footY - 10, pageW - margin, footY - 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const disclaimer =
    "Price and availability subject to change without notice. All figures are estimates. Dealer not responsible for typographical errors.";
  doc.text(disclaimer, pageW / 2, footY, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(storeName, pageW / 2, footY + 12, { align: "center" });

  // ── Save ─────────────────────────────────────────────────────────────────────
  const safeName = vehicleName.replace(/\s+/g, "-").toLowerCase();
  doc.save(`window-sticker-${safeName}.pdf`);
}
