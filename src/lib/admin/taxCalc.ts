/**
 * Auto-repair document tax math — the single source of truth.
 *
 * Estimates, invoices, the print/PDF preview, and the public share view all
 * derive their numbers from here so a tax rate is computed identically
 * everywhere. Tax is a flat percentage applied to the post-discount subtotal
 * (labor + parts + diagnosis); there is no per-line taxable flag.
 */

export type TaxableItem = {
  category: string; // "labor" | "part" | "diagnosis"
  qty?: number;
  price?: number;
  hours?: number;
  discount?: number;
  discountType?: "pct" | "amt";
};

/** Gross (pre-discount) dollar amount for a single line item. */
export const lineGross = (i: TaxableItem): number =>
  i.category === "labor" ? (i.hours ?? 0) * (i.price ?? 0) :
  i.category === "part" ? (i.qty ?? 0) * (i.price ?? 0) :
  (i.price ?? 0); // diagnosis = flat fee

/** Discount portion (always >= 0) for a single line item. */
export const lineDiscount = (i: TaxableItem): number => {
  const gross = lineGross(i);
  const discVal = Math.max(0, i.discount ?? 0);
  if ((i.discountType ?? "pct") === "amt") return Math.min(discVal, gross);
  return gross * Math.min(100, discVal) / 100;
};

/** Net (post-discount) dollar amount for a single line item. */
export const lineNet = (i: TaxableItem): number => Math.max(0, lineGross(i) - lineDiscount(i));

/** Clamp a tax-rate input (string or number) to a sane 0–100 percentage. */
export const normalizeTaxRate = (rate: unknown): number => {
  const n = typeof rate === "number" ? rate : parseFloat(String(rate ?? "")) || 0;
  return Math.max(0, Math.min(100, n));
};

export type DocTotals = {
  subtotal: number; // sum of gross line amounts
  discount: number; // sum of line discounts
  preTax: number;   // subtotal - discount (the taxable base)
  taxRate: number;  // normalized percentage (0–100)
  tax: number;      // cent-aligned tax dollars
  total: number;    // preTax + tax
};

/**
 * Derive document totals from line items + a flat tax rate (percent).
 * All amounts are in dollars; `tax` is rounded to the nearest cent so it
 * reconciles with the cents columns persisted in the DB.
 */
export const computeDocTotals = (items: TaxableItem[], taxRatePct: unknown = 0): DocTotals => {
  const subtotal = items.reduce((s, i) => s + lineGross(i), 0);
  const discount = items.reduce((s, i) => s + lineDiscount(i), 0);
  const preTax = Math.max(0, subtotal - discount);
  const taxRate = normalizeTaxRate(taxRatePct);
  // taxCents = round(preTaxDollars * ratePct); tax dollars = taxCents / 100.
  const tax = Math.round(preTax * taxRate) / 100;
  const total = preTax + tax;
  return { subtotal, discount, preTax, taxRate, tax, total };
};

/**
 * Flat add-on charges that sit outside the line-item math on a shop invoice:
 * sublet work, shop fees, EPA/disposal, and shop supplies. Stored in cents.
 * They are added on top of the line-item total (after tax) to form the grand
 * total — the editor, PDF, and preview all run them through here so the
 * balance-due number is identical everywhere.
 */
export type ExtraCharges = {
  subletCents?: number | null;
  feesCents?: number | null;
  epaCents?: number | null;
  shopSuppliesCents?: number | null;
};

/** Sum of the add-on charges, in cents (negatives clamped to 0). */
export const sumExtraChargeCents = (e?: ExtraCharges | null): number =>
  Math.max(0, e?.subletCents ?? 0) +
  Math.max(0, e?.feesCents ?? 0) +
  Math.max(0, e?.epaCents ?? 0) +
  Math.max(0, e?.shopSuppliesCents ?? 0);

/** Grand total in dollars: line-item total (incl. tax) + add-on charges. */
export const grandTotalWithExtras = (lineTotal: number, e?: ExtraCharges | null): number =>
  lineTotal + sumExtraChargeCents(e) / 100;
