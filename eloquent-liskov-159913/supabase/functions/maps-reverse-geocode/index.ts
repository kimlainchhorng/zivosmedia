import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: { user }, error: authErr } = await createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { lat, lng } = await req.json();

    // Input validation with range checks
    if (typeof lat !== "number" || typeof lng !== "number"
        || lat < -90 || lat > 90 || lng < -180 || lng > 180
        || !isFinite(lat) || !isFinite(lng)) {
      return new Response(JSON.stringify({ error: "Invalid coordinates" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) {
      console.error("[maps-reverse-geocode] GOOGLE_MAPS_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Maps service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(key)}`;

    console.log(`[maps-reverse-geocode] Reverse geocoding: ${lat}, ${lng}`);

    // Retry up to 2 times on transient Google errors (UNKNOWN_ERROR, OVER_QUERY_LIMIT)
    const RETRYABLE = new Set(["UNKNOWN_ERROR", "OVER_QUERY_LIMIT"]);
    let data: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt));
      const res = await fetch(url);
      data = await res.json();
      if (data.status === "OK" && data.results?.length) break;
      if (!RETRYABLE.has(data.status)) break;
      console.warn(`[maps-reverse-geocode] Retry ${attempt + 1}/2 for ${data.status}`);
    }

    if (data.status !== "OK" || !data.results?.length) {
      console.error("[maps-reverse-geocode] Google API error:", data.status, data.error_message);
      return new Response(JSON.stringify({ error: "No address found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPlusCodeAddress = (value: string) => /^[A-Z0-9]{4,}\+[A-Z0-9]{2,}/i.test(value.trim());

    const preferredTypeOrder = [
      "street_address",
      "premise",
      "subpremise",
      "route",
      "intersection",
      "neighborhood",
    ];

    const nonPlusCodeResults = data.results.filter((r: any) => !isPlusCodeAddress(r.formatted_address || ""));

    const bestMatch =
      preferredTypeOrder
        .map((type) => nonPlusCodeResults.find((r: any) => Array.isArray(r.types) && r.types.includes(type)))
        .find(Boolean) ||
      nonPlusCodeResults[0] ||
      data.results[0];

    const address = bestMatch.formatted_address;
    console.log(`[maps-reverse-geocode] Found: ${address}`);

    return new Response(JSON.stringify({ ok: true, address }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[maps-reverse-geocode] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
