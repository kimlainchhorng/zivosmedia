import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Country code → suggested language mapping
const COUNTRY_LANG_MAP: Record<string, string> = {
  KH: "km",
  US: "en",
  GB: "en",
  CN: "zh",
  TW: "zh",
  KR: "ko",
  JP: "ja",
  VN: "vi",
  TH: "th",
  ES: "es",
  MX: "es",
};

// Countries we support as market selections
const SUPPORTED_COUNTRIES = ["US", "KH"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try multiple free IP geolocation services
    let countryCode = "US";

    try {
      // ip-api.com (free, no key needed, 45 req/min)
      const res = await fetch("http://ip-api.com/json/?fields=countryCode", {
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (data.countryCode) {
        countryCode = data.countryCode;
      }
    } catch {
      // Fallback: try to detect from Cloudflare headers (Supabase runs on CF)
      const cfCountry = req.headers.get("cf-ipcountry");
      if (cfCountry && cfCountry !== "XX") {
        countryCode = cfCountry;
      }
    }

    // Map to supported country (default US if not supported)
    const market = SUPPORTED_COUNTRIES.includes(countryCode) ? countryCode : "US";
    const language = COUNTRY_LANG_MAP[countryCode] || "en";

    return new Response(JSON.stringify({
      ok: true,
      detected_country: countryCode,
      market,
      language,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[geo-detect] Error:", e);
    return new Response(JSON.stringify({
      ok: true,
      detected_country: "US",
      market: "US",
      language: "en",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
