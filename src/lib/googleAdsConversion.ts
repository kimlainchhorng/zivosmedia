/**
 * googleAdsConversion - Server-side Google Ads conversion upload.
 * Mirrors metaConversion.ts pattern. Reads Google click IDs from URL/localStorage if present.
 */
import { supabase } from "@/integrations/supabase/client";
import { isMarketingConsentGranted } from "@/lib/privacy/cookieConsent";

const GOOGLE_ADS_TAG_ID = "AW-18077605056";
const SIGNUP_CONVERSION_LABEL = "KlDqCK_noLccEMC5iaxD";
const GCLID_KEY = "zivo_gclid";
const GBRAID_KEY = "zivo_gbraid";
const WBRAID_KEY = "zivo_wbraid";
const CLICK_ID_TTL_MS = 30 * 24 * 60 * 60 * 1000;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __zivoLoadAnalytics?: () => void;
  }
}

export function clearGoogleAdsClickIds() {
  try {
    for (const key of [GCLID_KEY, GBRAID_KEY, WBRAID_KEY]) {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_ts`);
    }
  } catch {
    /* noop */
  }
}

export function captureGclidFromUrl() {
  try {
    if (!isMarketingConsentGranted()) {
      clearGoogleAdsClickIds();
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    const ids = [
      [GCLID_KEY, params.get("gclid")],
      [GBRAID_KEY, params.get("gbraid")],
      [WBRAID_KEY, params.get("wbraid")],
    ] as const;
    for (const [key, value] of ids) {
      if (!value) continue;
      localStorage.setItem(key, value);
      localStorage.setItem(`${key}_ts`, String(Date.now()));
    }
    return true;
  } catch {
    return false;
  }
}

function getStoredClickId(key: string): string | null {
  try {
    const ts = Number(localStorage.getItem(`${key}_ts`) ?? 0);
    // Google's default click-through window is 30 days
    if (Date.now() - ts > CLICK_ID_TTL_MS) return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getStoredGoogleClickIds() {
  if (!isMarketingConsentGranted()) {
    clearGoogleAdsClickIds();
    return { gclid: null, gbraid: null, wbraid: null };
  }

  return {
    gclid: getStoredClickId(GCLID_KEY),
    gbraid: getStoredClickId(GBRAID_KEY),
    wbraid: getStoredClickId(WBRAID_KEY),
  };
}

interface ConversionInput {
  conversion_action_id: string;
  event_name: string;
  value_cents?: number;
  currency?: string;
  order_id?: string;
}

export function trackGoogleAdsSignupConversion() {
  if (typeof window === "undefined" || !isMarketingConsentGranted()) return false;
  window.__zivoLoadAnalytics?.();
  window.gtag?.("event", "conversion", {
    send_to: `${GOOGLE_ADS_TAG_ID}/${SIGNUP_CONVERSION_LABEL}`,
    value: 1.0,
    currency: "USD",
  });
  return true;
}

export async function trackGoogleAdsConversion(input: ConversionInput) {
  if (!isMarketingConsentGranted()) {
    clearGoogleAdsClickIds();
    return { ok: false, skipped: true, reason: "marketing_consent_required" };
  }

  const clickIds = getStoredGoogleClickIds();
  if (!clickIds.gclid && !clickIds.gbraid && !clickIds.wbraid) {
    return { ok: false, skipped: true, reason: "missing_google_click_id" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("google-ads-conversion", {
      body: { ...input, ...clickIds, ad_user_data_consent: "GRANTED" },
    });
    if (error) {
      console.warn("[googleAdsConversion] failed", error);
      return { ok: false, error };
    }
    return data;
  } catch (e) {
    console.warn("[googleAdsConversion] threw", e);
    return { ok: false, error: e };
  }
}
