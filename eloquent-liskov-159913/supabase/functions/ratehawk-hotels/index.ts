import { serve, createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  checkIn: string;
  checkOut: string;
  destination: string;
  regionId?: number;
  rooms: number;
  adults: number;
  children?: number;
  childAges?: number[];
  currency?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
  const rl = await rateLimitDb(user.id, "search");
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait before searching again." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "search") },
    });
  }

  try {
    const RATEHAWK_API_KEY = Deno.env.get("RATEHAWK_API_KEY");
    const RATEHAWK_AFFILIATE_ID = Deno.env.get("RATEHAWK_AFFILIATE_ID");
    
    if (!RATEHAWK_API_KEY) {
      console.log("RateHawk API not configured - returning empty results");
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          meta: {
            source: "ratehawk",
            configured: false,
            message: "RateHawk API not configured",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { 
      checkIn, 
      checkOut, 
      destination,
      regionId,
      rooms = 1, 
      adults = 2, 
      children = 0,
      childAges = [],
      currency = "USD",
    }: SearchRequest = await req.json();

    if (!checkIn || !checkOut || (!destination && !regionId)) {
      throw new Error("checkIn, checkOut, and destination or regionId are required");
    }

    // Build guests array
    const guests = [];
    for (let i = 0; i < rooms; i++) {
      const guestObj: { adults: number; children?: number[] } = {
        adults: Math.ceil(adults / rooms),
      };
      if (children > 0 && childAges.length > 0) {
        guestObj.children = childAges.slice(0, children);
      }
      guests.push(guestObj);
    }

    // RateHawk API call
    const searchPayload = {
      checkin: checkIn,
      checkout: checkOut,
      residency: "us",
      language: "en",
      guests,
      currency,
      ...(regionId ? { region_id: regionId } : {}),
    };

    // For now, return mock data structure until RateHawk is fully configured
    // This allows the frontend to be built without blocking on API credentials
    console.log("RateHawk search request:", JSON.stringify(searchPayload));

    // TODO: Implement actual RateHawk API call when credentials are available
    // const response = await fetch("https://api.worldota.net/api/b2b/v3/search/serp/hotels/", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Basic ${btoa(`${RATEHAWK_AFFILIATE_ID}:${RATEHAWK_API_KEY}`)}`,
    //   },
    //   body: JSON.stringify(searchPayload),
    // });

    return new Response(
      JSON.stringify({
        success: true,
        data: [],
        meta: {
          source: "ratehawk",
          destination,
          checkIn,
          checkOut,
          rooms,
          adults,
          searchPayload,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    console.error("RateHawk hotels error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
