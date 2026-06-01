export const COOKIE_CONSENT_STORAGE_KEY = "zivo_cookie_consent";
export const COOKIE_CONSENT_UPDATED_EVENT = "zivo:cookie-consent-updated";

export interface StoredCookieConsent {
  necessary?: boolean;
  essential?: boolean;
  functional?: boolean;
  analytics?: boolean;
  marketing?: boolean;
  personalization?: boolean;
  updatedAt?: string;
}

function isLocalTrackingHost(): boolean {
  if (typeof window === "undefined") return true;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export function readCookieConsentPrefs(): StoredCookieConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCookieConsent;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function isAnalyticsConsentGranted(): boolean {
  if (isLocalTrackingHost()) return false;
  return readCookieConsentPrefs()?.analytics === true;
}

export function isMarketingConsentGranted(): boolean {
  if (isLocalTrackingHost()) return false;
  return readCookieConsentPrefs()?.marketing === true;
}

export function emitCookieConsentUpdated(detail?: StoredCookieConsent): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT, {
      detail: detail ?? readCookieConsentPrefs(),
    }),
  );
}
