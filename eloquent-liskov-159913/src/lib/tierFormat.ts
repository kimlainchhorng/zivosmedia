/**
 * Helpers for displaying creator subscription tiers with flexible pricing.
 */

export type BillingInterval = "month" | "3_months" | "6_months" | "year" | "lifetime";

export const INTERVAL_MONTHS: Record<BillingInterval, number> = {
  month: 1,
  "3_months": 3,
  "6_months": 6,
  year: 12,
  lifetime: 0,
};

export const INTERVAL_LABEL: Record<BillingInterval, string> = {
  month: "month",
  "3_months": "3 months",
  "6_months": "6 months",
  year: "year",
  lifetime: "lifetime",
};

export const INTERVAL_SHORT: Record<BillingInterval, string> = {
  month: "/mo",
  "3_months": "/3mo",
  "6_months": "/6mo",
  year: "/yr",
  lifetime: " one-time",
};

export function formatTierPrice(tier: {
  price_cents?: number;
  billing_interval?: string | null;
  is_free?: boolean | null;
  is_custom_price?: boolean | null;
}) {
  if (tier.is_free) return "Free";
  const interval = (tier.billing_interval || "month") as BillingInterval;
  const dollars = ((tier.price_cents ?? 0) / 100).toFixed(2);
  const prefix = tier.is_custom_price ? "From $" : "$";
  return `${prefix}${dollars}${INTERVAL_SHORT[interval]}`;
}

export function monthlyEquivalent(price_cents: number, interval: BillingInterval): string | null {
  const months = INTERVAL_MONTHS[interval];
  if (!months || months <= 1) return null;
  const perMonth = price_cents / 100 / months;
  return `≈ $${perMonth.toFixed(2)}/mo`;
}
