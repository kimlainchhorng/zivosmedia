/**
 * useGeoDetect — auto-detects country & language from IP on first visit.
 * Only runs once (when no stored preferences exist). User can always override manually.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const GEO_DETECTED_KEY = "zivo_geo_detected";
const COUNTRY_KEY = "zivo_country";
const LANG_KEY = "zivo_lang";

export function useGeoDetect() {
  const ran = useRef(false);

  useEffect(() => {
    // Only run once per app lifecycle, and only if not previously detected
    if (ran.current) return;
    if (localStorage.getItem(GEO_DETECTED_KEY)) return;
    ran.current = true;

    const detect = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("geo-detect");
        if (error || !data?.ok) return;

        // Only auto-set if user hasn't manually chosen yet
        if (!localStorage.getItem(COUNTRY_KEY)) {
          localStorage.setItem(COUNTRY_KEY, data.market);
          // Notify useCountry listeners
          window.dispatchEvent(new Event("zivo-country-change"));
        }

        if (!localStorage.getItem(LANG_KEY)) {
          localStorage.setItem(LANG_KEY, data.language);
          // Notify useI18n listeners
          window.dispatchEvent(new Event("zivo-lang-change"));
        }

        // Mark as detected so we don't call again
        localStorage.setItem(GEO_DETECTED_KEY, "1");
      } catch {
        // Silent fail — defaults will be used
      }
    };

    detect();
  }, []);
}
