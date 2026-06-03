/**
 * Parts Matrix — cost-tiered markup used to derive a part's SELL price from its
 * COST (the VSM "Parts Matrix"). Each tier covers a cost band [start, end] (in
 * dollars; end=null means "and up") and applies a markup percentage.
 * Stored per shop at store_profiles.ar_settings.parts_matrix.
 */
export type MatrixTier = {
  /** band start in dollars (inclusive) */
  start: number;
  /** band end in dollars (inclusive); null = no upper bound (MAX) */
  end: number | null;
  /** markup percentage applied to cost (e.g. 50 => sell = cost * 1.5) */
  markup: number;
};

export const DEFAULT_PARTS_MATRIX: MatrixTier[] = [
  { start: 0, end: 5, markup: 400 },
  { start: 5.01, end: 20, markup: 200 },
  { start: 20.01, end: 50, markup: 80 },
  { start: 50.01, end: 100, markup: 50 },
  { start: 100.01, end: 250, markup: 30 },
  { start: 250.01, end: 500, markup: 30 },
  { start: 500.01, end: 1000, markup: 30 },
  { start: 1000.01, end: null, markup: 30 },
];

/** Multiplier shown in the editor (e.g. 1.50x for 50% markup). */
export const multiplierOf = (markup: number) => 1 + (Number(markup) || 0) / 100;

/** Coerce an arbitrary stored value into a usable matrix (falls back to default). */
export function normalizeMatrix(raw: unknown): MatrixTier[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_PARTS_MATRIX;
  const tiers = raw
    .map((t: any) => ({
      start: Number(t?.start) || 0,
      end: t?.end == null || t?.end === "" || String(t?.end).toUpperCase() === "MAX" ? null : Number(t.end),
      markup: Number(t?.markup) || 0,
    }))
    .filter((t) => !isNaN(t.start) && !isNaN(t.markup))
    .sort((a, b) => a.start - b.start);
  return tiers.length ? tiers : DEFAULT_PARTS_MATRIX;
}

/** Sell price (cents) for a given cost (cents), applying the matching tier's markup. */
export function sellFromCostCents(costCents: number, matrix: MatrixTier[] = DEFAULT_PARTS_MATRIX): number {
  const cost = (costCents || 0) / 100;
  if (cost <= 0) return 0;
  const tier =
    matrix.find((t) => cost >= t.start && (t.end == null || cost <= t.end)) ??
    matrix[matrix.length - 1];
  const markup = tier ? tier.markup : 0;
  return Math.round(costCents * multiplierOf(markup));
}
