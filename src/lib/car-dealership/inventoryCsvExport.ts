/**
 * Exports the car dealership vehicle inventory to a CSV file.
 * Uses file-saver for the browser download trigger.
 *
 * Usage:
 *   import { exportInventoryCsv } from "@/lib/car-dealership/inventoryCsvExport";
 *   exportInventoryCsv(vehicles);          // exports full list
 *   exportInventoryCsv(filteredVehicles);  // exports whatever is currently shown
 */
import { saveAs } from "file-saver";
import type { DealershipVehicle } from "@/hooks/car-dealership/useDealershipInventory";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Escape a single CSV cell value (wraps in quotes, doubles internal quotes). */
function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmt(cents: number) {
  return (cents / 100).toFixed(2);
}

// ─── column definitions ───────────────────────────────────────────────────────

const COLUMNS: Array<{ header: string; value: (v: DealershipVehicle) => string | number | null }> = [
  { header: "Stock #",        value: (v) => v.stock_number ?? "" },
  { header: "Year",           value: (v) => v.year ?? "" },
  { header: "Make",           value: (v) => v.make },
  { header: "Model",          value: (v) => v.model },
  { header: "Trim",           value: (v) => v.trim ?? "" },
  { header: "VIN",            value: (v) => v.vin ?? "" },
  { header: "Condition",      value: (v) => v.condition.replace(/_/g, " ") },
  { header: "Body Type",      value: (v) => v.body_type ?? "" },
  { header: "Exterior Color", value: (v) => v.exterior_color ?? "" },
  { header: "Interior Color", value: (v) => v.interior_color ?? "" },
  { header: "Transmission",   value: (v) => v.transmission },
  { header: "Fuel Type",      value: (v) => v.fuel_type.replace(/_/g, " ") },
  { header: "Drivetrain",     value: (v) => v.drivetrain ?? "" },
  { header: "Engine",         value: (v) => v.engine ?? "" },
  { header: "Mileage",        value: (v) => v.mileage != null ? `${v.mileage} ${v.mileage_unit}` : "" },
  { header: "Status",         value: (v) => v.status.replace(/_/g, " ") },
  { header: "Asking Price",   value: (v) => fmt(v.asking_price_cents) },
  { header: "Cost",           value: (v) => v.cost_cents > 0 ? fmt(v.cost_cents) : "" },
  { header: "MSRP",           value: (v) => v.msrp_cents > 0 ? fmt(v.msrp_cents) : "" },
  { header: "Days on Lot",    value: (v) => v.days_on_lot },
  { header: "Featured",       value: (v) => v.is_featured ? "Yes" : "No" },
  { header: "Active",         value: (v) => v.is_active ? "Yes" : "No" },
  { header: "Acquired Date",  value: (v) => v.acquired_at ? new Date(v.acquired_at).toLocaleDateString("en-US") : "" },
  { header: "Acquired From",  value: (v) => v.acquired_from ?? "" },
  { header: "Location",       value: (v) => v.location_label ?? "" },
];

// ─── main export ─────────────────────────────────────────────────────────────

export function exportInventoryCsv(
  vehicles: DealershipVehicle[],
  filename?: string,
): void {
  const headerRow = COLUMNS.map((c) => csvCell(c.header)).join(",");
  const dataRows = vehicles.map((v) =>
    COLUMNS.map((c) => csvCell(c.value(v))).join(","),
  );

  const csv = [headerRow, ...dataRows].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }); // BOM for Excel

  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, filename ?? `inventory-${date}.csv`);
}
