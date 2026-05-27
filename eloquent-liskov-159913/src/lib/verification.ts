/**
 * Single source of truth for blue-verification across ZIVO.
 *
 * Rule: a verified state must be EXPLICITLY true. `undefined` / `null` /
 * any non-boolean value resolves to `false` so we never render an
 * incorrect badge from missing data.
 */

export type VerifiedSource = "user" | "store" | "platform";

export interface Verifiable {
  id?: string | null;
  is_verified?: boolean | null;
  source?: VerifiedSource;
}

/** Strictly returns true only when `is_verified === true`. */
export const isBlueVerified = (
  input?: Verifiable | boolean | null,
): boolean => {
  if (input === true) return true;
  if (input === false || input == null) return false;
  if (typeof input === "object") return input.is_verified === true;
  return false;
};

export const VERIFIED_LABEL = "Verified account";
export const VERIFIED_TOOLTIP =
  "ZIVO has confirmed this account is authentic.";
export const VERIFIED_TOOLTIP_BUSINESS =
  "ZIVO has confirmed this is an authentic business.";
export const VERIFIED_TOOLTIP_PLATFORM =
  "Official ZIVO account.";

export const tooltipForSource = (source?: VerifiedSource): string => {
  switch (source) {
    case "store":
      return VERIFIED_TOOLTIP_BUSINESS;
    case "platform":
      return VERIFIED_TOOLTIP_PLATFORM;
    case "user":
    default:
      return VERIFIED_TOOLTIP;
  }
};
