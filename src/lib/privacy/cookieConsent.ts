/**
 * Cookie consent helpers shared by ads/marketing components.
 * Reads the same storage key used by CookieConsent banner / useCookiePrefs.
 */
import { COOKIE_CONSENT_STORAGE_KEY } from "@/hooks/useCookiePrefs";

export const COOKIE_CONSENT_UPDATED_EVENT = "zivo:cookie-consent-updated";

export function isMarketingConsentGranted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const prefs = JSON.parse(raw) as { marketing?: boolean };
    return Boolean(prefs?.marketing);
  } catch {
    return false;
  }
}
