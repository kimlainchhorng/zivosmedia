/**
 * Grocery pricing constants — single source of truth.
 * All components referencing delivery/service fees must import from here.
 */

import { remoteConfig } from "@/services/remoteConfigService";

function getRemoteNumber(key: string, fallback: number): number {
  const value = remoteConfig.get<unknown>(key, fallback);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

// ─── Markup tiers ───────────────────────────────────────────
/** Markup percentage for orders under the threshold */
export const MARKUP_UNDER_THRESHOLD_PCT = 5;
/** Markup percentage for orders at or above the threshold */
export const MARKUP_OVER_THRESHOLD_PCT = 3;
/** Threshold in dollars */
export const MARKUP_THRESHOLD = 50;

/** Calculate platform markup on a subtotal (in dollars) */
export function calcMarkup(subtotal: number): number {
  const threshold = getRemoteNumber("MARKUP_THRESHOLD", MARKUP_THRESHOLD);
  const underPct = getRemoteNumber("MARKUP_UNDER_THRESHOLD_PCT", MARKUP_UNDER_THRESHOLD_PCT);
  const overPct = getRemoteNumber("MARKUP_OVER_THRESHOLD_PCT", MARKUP_OVER_THRESHOLD_PCT);
  const pct = subtotal < threshold ? underPct : overPct;
  return Math.round(subtotal * pct) / 100; // rounds to nearest cent
}

/** Markup percentage label for display */
export function getMarkupPct(subtotal: number): number {
  const threshold = getRemoteNumber("MARKUP_THRESHOLD", MARKUP_THRESHOLD);
  const underPct = getRemoteNumber("MARKUP_UNDER_THRESHOLD_PCT", MARKUP_UNDER_THRESHOLD_PCT);
  const overPct = getRemoteNumber("MARKUP_OVER_THRESHOLD_PCT", MARKUP_OVER_THRESHOLD_PCT);
  return subtotal < threshold ? underPct : overPct;
}

// ─── Distance-based delivery fee (like ride pricing) ────────
/** Base delivery charge in dollars */
export const DELIVERY_BASE_FEE = 2.99;
/** Per-mile charge in dollars */
export const DELIVERY_PER_MILE = 0.60;
/** Per-minute charge in dollars (driver shopping + travel time) */
export const DELIVERY_PER_MIN = 0.10;
/** Minimum delivery fee in dollars */
export const DELIVERY_MIN_FEE = 3.99;
/** Maximum delivery fee cap in dollars */
export const DELIVERY_MAX_FEE = 14.99;

/** Calculate delivery fee based on distance & estimated time */
export function calcDeliveryFee(miles: number, minutes: number): number {
  const baseFee = getRemoteNumber("DELIVERY_BASE_FEE", DELIVERY_BASE_FEE);
  const perMile = getRemoteNumber("DELIVERY_PER_MILE", DELIVERY_PER_MILE);
  const perMin = getRemoteNumber("DELIVERY_PER_MIN", DELIVERY_PER_MIN);
  const minFee = getRemoteNumber("DELIVERY_MIN_FEE", DELIVERY_MIN_FEE);
  const maxFee = getRemoteNumber("DELIVERY_MAX_FEE", DELIVERY_MAX_FEE);
  const raw = baseFee + miles * perMile + minutes * perMin;
  return Math.round(Math.min(maxFee, Math.max(minFee, raw)) * 100) / 100;
}

/** Flat fallback when distance is unknown */
export const DELIVERY_FEE_FALLBACK = 5.99;

/** Service fee percentage */
export const SERVICE_FEE_PCT = 5;
/** Service fee minimum in dollars */
export const SERVICE_FEE_MIN = 2.50;
/** Service fee maximum in dollars */
export const SERVICE_FEE_MAX = 10.00;

/** Calculate service fee based on subtotal with min/max caps */
export function calcServiceFee(subtotal: number): number {
  const feePct = getRemoteNumber("SERVICE_FEE_PCT", SERVICE_FEE_PCT);
  const minFee = getRemoteNumber("SERVICE_FEE_MIN", SERVICE_FEE_MIN);
  const maxFee = getRemoteNumber("SERVICE_FEE_MAX", SERVICE_FEE_MAX);
  const raw = Math.round(subtotal * feePct) / 100;
  return Math.round(Math.min(maxFee, Math.max(minFee, raw)) * 100) / 100;
}

/** Priority delivery surcharge in dollars */
export const PRIORITY_FEE = 2.99;

/** Default tip options */
export const TIP_OPTIONS = [0, 2, 3, 5];

/** Cancellation fee schedule (percentage of order subtotal, excluding fees & tip) */
export const CANCELLATION_FEES = {
  beforeDriverAssigned: 0,      // Free
  driverAssignedNotStarted: 15, // 15%
  driverActivelyShopping: 25,   // 25%
  itemsPurchasedEnRoute: 50,    // 50%
};

/** Format fee for display */
export function formatFee(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
