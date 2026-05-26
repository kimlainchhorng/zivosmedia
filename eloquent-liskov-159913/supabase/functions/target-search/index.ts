/**
 * Target Product Search Edge Function
 * Proxies requests to RapidAPI Target endpoint
 */
import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPID_API_HOST = "target-com-shopping-api.p.rapidapi.com";

serve(async (req) => {
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
    const RAPID_API_KEY = Deno.env.get("RAPID_API_KEY");
    if (!RAPID_API_KEY) throw new Error("RAPID_API_KEY is not configured");

    const url = new URL(req.url);
    const query = url.searchParams.get("q");
    const page = url.searchParams.get("page") || "1";

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Query parameter 'q' is required (min 2 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = `https://${RAPID_API_HOST}/product_search?store_id=3991&keyword=${encodeURIComponent(query)}&offset=${(parseInt(page) - 1) * 24}&count=24`;
    console.log("[target-search] Query:", query, "| API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPID_API_KEY,
        "X-RapidAPI-Host": RAPID_API_HOST,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[target-search] API error [${response.status}]:`, body);
      throw new Error(`Target API returned ${response.status}`);
    }

    const data = await response.json();
    console.log("[target-search] Raw response keys:", Object.keys(data));

    const rawProducts = data.data?.search?.products || data.products || data.data?.products || [];
    console.log("[target-search] Raw products count:", rawProducts.length);
    if (rawProducts.length > 0) {
      console.log("[target-search] Sample product:", JSON.stringify(rawProducts[0]).slice(0, 500));
    }

    const parsePrice = (p: any): number => {
      if (typeof p === "number") return p;
      if (typeof p === "string") return parseFloat(p.replace(/[^0-9.]/g, "")) || 0;
      if (p && typeof p === "object") return parsePrice(p.current_retail || p.reg_retail || p.formatted_current_price || 0);
      return 0;
    };

    const items = rawProducts.map((item: any) => ({
      productId: item.tcin || item.id || item.product_id || crypto.randomUUID().slice(0, 12),
      name: item.title || item.product_description?.title || item.name || "",
      price: parsePrice(item.price || item.current_retail),
      image: item.images?.primary_image_url || item.image || item.main_image || "",
      brand: item.brand?.name || item.brand || "",
      rating: item.ratings_and_reviews?.statistics?.rating?.average ?? item.rating ?? null,
      inStock: item.availability_status !== "OUT_OF_STOCK",
      store: "Target",
    }));

    console.log("[target-search] Mapped items count:", items.length);

    return new Response(
      JSON.stringify({ products: items, totalCount: items.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[target-search] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
