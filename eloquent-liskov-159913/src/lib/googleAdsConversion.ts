/**
 * googleAdsConversion - Server-side Google Ads conversion upload.
 * Mirrors metaConversion.ts pattern. Reads gclid from URL/localStorage if present.
 */
import { supabase } from "@/integrations/supabase/client";

const GCLID_KEY = "zivo_gclid";

export function captureGclidFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get("gclid");
    if (gclid) {
      localStorage.setItem(GCLID_KEY, gclid);
      localStorage.setItem(`${GCLID_KEY}_ts`, String(Date.now()));
    }
  } catch {
    /* noop */
  }
}

function getStoredGclid(): string | null {
  try {
    const ts = Number(localStorage.getItem(`${GCLID_KEY}_ts`) ?? 0);
    // Google's default click-through window is 30 days
    if (Date.now() - ts > 30 * 24 * 60 * 60 * 1000) return null;
    return localStorage.getItem(GCLID_KEY);
  } catch {
    return null;
  }
}

interface ConversionInput {
  conversion_action_id: string;
  event_name: string;
  value_cents?: number;
  currency?: string;
  order_id?: string;
}

export async function trackGoogleAdsConversion(input: ConversionInput) {
  const gclid = getStoredGclid();
  try {
    const { data, error } = await supabase.functions.invoke("google-ads-conversion", {
      body: { ...input, gclid },
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
