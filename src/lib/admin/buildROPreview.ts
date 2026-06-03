/**
 * buildROPreviewDoc — maps the Build R.O. editor state (header + R.O. lines +
 * add-on charges) into the PreviewDoc shape consumed by AutoRepairDocPreviewDialog
 * / generateDocumentPdf. The preview runs through the exact same PDF engine the
 * shop sends, so "what you see is what's sent".
 *
 * Line-kind mapping (the PDF only knows labor / part / diagnosis line items;
 * everything else is a flat add-on charge):
 *   labor          → labor item (hours = qty, price = rate)
 *   part / tire     → part item (qty, price = sell)
 *   diagnosis       → diagnosis item (flat price = qty × unit)
 *   sublet          → doc.sublet add-on
 *   fee             → folded into doc.fees add-on
 *   note / concern   → not billable; carried in the notes block
 * A global discount becomes a negative part line so the grand total tracks the
 * editor's Estimate Summary.
 */
import type { PreviewDoc, PreviewLineItem } from "@/components/admin/store/autorepair/AutoRepairDocPreviewDialog";

export type ROLineInput = {
  id: string;
  kind: string;
  description: string;
  qty: number;
  unit_cents: number;
  disc: number;
  disc_type: "%" | "$";
  declined: boolean;
};

export type ROHeaderInput = {
  number?: string;
  customer_name?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_street?: string;
  customer_city?: string;
  customer_state?: string;
  customer_zip?: string;
  vehicle_label?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_engine?: string;
  vehicle_color?: string;
  vin?: string;
  unit_number?: string;
  license_plate?: string;
  plate_state?: string;
  keytag?: string;
  mileage_in?: string;
  service_writer?: string;
  technician?: string;
  technician_cert?: string;
  payment_method?: string;
  promised_at?: string;
  customer_request?: string;
  diagnosis?: string;
};

export function buildROPreviewDoc(args: {
  header: ROHeaderInput;
  lines: ROLineInput[];
  createdAt?: string | null;
  status?: string;
  taxRate: number; // percent
  feesCents?: number;
  epaCents?: number;
  suppliesCents?: number;
  discountCents?: number;
  type?: "estimate" | "invoice";
}): PreviewDoc {
  const h = args.header || {};
  const dollars = (cents: number) => (cents || 0) / 100;
  const active = (args.lines || []).filter((l) => !l.declined);

  const items: PreviewLineItem[] = [];
  let subletCents = 0;
  let feeLineCents = 0;

  for (const l of active) {
    const price = dollars(l.unit_cents);
    const discountType: "pct" | "amt" = l.disc_type === "$" ? "amt" : "pct";
    const common = { id: l.id, description: l.description || "—", discount: l.disc || 0, discountType };
    switch (l.kind) {
      case "labor":
        items.push({ ...common, category: "labor", qty: 1, price, hours: l.qty });
        break;
      case "part":
      case "tire":
        items.push({ ...common, category: "part", qty: l.qty, price });
        break;
      case "diagnosis":
        items.push({ ...common, category: "diagnosis", qty: 1, price: dollars(l.unit_cents * l.qty) });
        break;
      case "sublet":
        subletCents += Math.max(0, l.qty * l.unit_cents);
        break;
      case "fee":
        feeLineCents += Math.max(0, l.qty * l.unit_cents);
        break;
      default:
        break; // note / concern — not billable
    }
  }

  if ((args.discountCents || 0) > 0) {
    items.push({ id: "global-discount", category: "part", description: "Discount", qty: 1, price: -dollars(args.discountCents || 0) });
  }

  const vehicle =
    (h.vehicle_label || "").trim() ||
    [h.vehicle_year, h.vehicle_make, h.vehicle_model].filter(Boolean).join(" ").trim();
  const customer =
    `${h.customer_first_name || ""} ${h.customer_last_name || ""}`.trim() || (h.customer_name || "");
  const address = [
    (h.customer_street || "").trim(),
    [h.customer_city, h.customer_state].filter(Boolean).join(", "),
    (h.customer_zip || "").trim(),
  ].filter(Boolean).join(" ");

  return {
    id: "build-ro-draft",
    type: args.type || "estimate",
    number: h.number || "DRAFT",
    customer,
    firstName: h.customer_first_name || "",
    lastName: h.customer_last_name || "",
    phone: h.customer_phone || "",
    email: h.customer_email || "",
    address,
    vin: h.vin || "",
    vehicle,
    year: h.vehicle_year || "",
    make: h.vehicle_make || "",
    model: h.vehicle_model || "",
    trim: "",
    engine: h.vehicle_engine || "",
    driveType: "",
    items,
    taxRate: args.taxRate || 0,
    status: args.status || "draft",
    createdAt: args.createdAt || new Date().toISOString(),
    color: h.vehicle_color || undefined,
    licensePlate: h.license_plate || undefined,
    plateState: h.plate_state || undefined,
    unitNumber: h.unit_number || undefined,
    mileageIn: h.mileage_in || undefined,
    promisedAt: h.promised_at || undefined,
    serviceWriter: h.service_writer || undefined,
    technician: h.technician || undefined,
    technicianCert: h.technician_cert || undefined,
    keytag: h.keytag || undefined,
    paymentMethod: h.payment_method || undefined,
    sublet: subletCents > 0 ? dollars(subletCents) : undefined,
    fees: (args.feesCents || 0) + feeLineCents > 0 ? dollars((args.feesCents || 0) + feeLineCents) : undefined,
    epa: (args.epaCents || 0) > 0 ? dollars(args.epaCents || 0) : undefined,
    shopSupplies: (args.suppliesCents || 0) > 0 ? dollars(args.suppliesCents || 0) : undefined,
    customerNotes: (h.customer_request || "").trim() || undefined,
    diagnosisNotes: (h.diagnosis || "").trim() || undefined,
  };
}
