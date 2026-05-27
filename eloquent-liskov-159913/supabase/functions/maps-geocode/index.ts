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
    const { address } = await req.json();

    if (!address || typeof address !== "string" || address.trim().length < 3 || address.length > 300) {
      return new Response(JSON.stringify({ error: "Address must be 3-300 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) {
      console.error("[maps-geocode] GOOGLE_MAPS_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Maps service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(address.trim())}` +
      `&key=${encodeURIComponent(key)}`;

    console.log(`[maps-geocode] Geocoding: "${address.trim()}"`);

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.length) {
      console.error("[maps-geocode] Google API error:", data.status, data.error_message);
      return new Response(JSON.stringify({ error: "Geocoding failed", google_status: data.status }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = data.results[0];
    const lat = result.geometry?.location?.lat;
    const lng = result.geometry?.location?.lng;

    if (lat == null || lng == null) {
      return new Response(JSON.stringify({ error: "No coordinates found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[maps-geocode] Found: ${result.formatted_address} (${lat}, ${lng})`);

    return new Response(JSON.stringify({
      ok: true,
      address: result.formatted_address,
      lat,
      lng,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[maps-geocode] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
