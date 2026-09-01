export type EatsPaymentRail = "cash" | "card" | "wallet" | "paypal" | "square";

const enabledByRelease = (value: unknown): boolean =>
  typeof value === "string" && value.trim().toLowerCase() === "true";

/**
 * External Eats rails stay hidden and fail closed until release owners prove
 * the matching live credentials, webhook destination/signature, and provider
 * mode. These flags are public capability switches, never credentials.
 */
export const EATS_PAYPAL_ENABLED = enabledByRelease(
  import.meta.env.VITE_EATS_PAYPAL_ENABLED,
);
export const EATS_SQUARE_ENABLED = enabledByRelease(
  import.meta.env.VITE_EATS_SQUARE_ENABLED,
);

/**
 * Keep checkout unavailable until the server-owned order/payment functions are
 * deployed and every active restaurant has a verified dispatch origin.
 * Browsing menus remains available while release owners finish those checks.
 */
export const EATS_ORDERING_ENABLED = enabledByRelease(
  import.meta.env.VITE_EATS_ORDERING_ENABLED,
);

export function isEatsPaymentRailEnabled(rail: EatsPaymentRail): boolean {
  if (rail === "paypal") return EATS_PAYPAL_ENABLED;
  if (rail === "square") return EATS_SQUARE_ENABLED;
  return true;
}
