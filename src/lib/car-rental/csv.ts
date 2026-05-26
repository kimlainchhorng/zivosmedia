/**
 * CSV builder for car-rental reservations exports.
 * Quotes strings, escapes embedded quotes per RFC 4180.
 */

export interface CsvReservation {
  confirmation_code: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle_label: string;
  vehicle_category: string | null;
  pickup_at: string;
  dropoff_at: string;
  pickup_location_name: string | null;
  dropoff_location_name: string | null;
  rental_days: number;
  daily_rate_cents: number;
  base_total_cents: number;
  addons_total_cents: number;
  fees_cents: number;
  taxes_cents: number;
  discount_cents: number;
  security_deposit_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  status: string;
  source: string;
  cancellation_reason: string | null;
  created_at: string;
}

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const HEADERS = [
  "Confirmation Code",
  "Customer Name",
  "Customer Phone",
  "Customer Email",
  "Vehicle",
  "Category",
  "Pickup",
  "Dropoff",
  "Pickup Location",
  "Dropoff Location",
  "Rental Days",
  "Daily Rate",
  "Base Total",
  "Add-ons Total",
  "Extra Fees",
  "Taxes",
  "Discount",
  "Security Deposit",
  "Total",
  "Amount Paid",
  "Status",
  "Source",
  "Cancellation Reason",
  "Created At",
];

const dollars = (cents: number) => (cents / 100).toFixed(2);

export function buildReservationsCsv(rows: CsvReservation[]): string {
  const lines: string[] = [HEADERS.map(esc).join(",")];
  for (const r of rows) {
    lines.push([
      r.confirmation_code,
      r.customer_name,
      r.customer_phone ?? "",
      r.customer_email ?? "",
      r.vehicle_label,
      r.vehicle_category ?? "",
      r.pickup_at,
      r.dropoff_at,
      r.pickup_location_name ?? "",
      r.dropoff_location_name ?? "",
      r.rental_days,
      dollars(r.daily_rate_cents),
      dollars(r.base_total_cents),
      dollars(r.addons_total_cents),
      dollars(r.fees_cents),
      dollars(r.taxes_cents),
      dollars(r.discount_cents),
      dollars(r.security_deposit_cents),
      dollars(r.total_cents),
      dollars(r.amount_paid_cents),
      r.status,
      r.source,
      r.cancellation_reason ?? "",
      r.created_at,
    ].map(esc).join(","));
  }
  return lines.join("\r\n");
}

export function downloadCsv(filename: string, content: string) {
  // Prefix BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
