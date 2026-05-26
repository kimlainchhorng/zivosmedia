/**
 * Costco Product Search Edge Function
 * Proxies requests to RapidAPI Real-Time Costco Data endpoint
 * Includes image proxy for Costco CDN (fixes CSP/hotlink blocking)
 */
import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPID_API_HOST = "real-time-costco-data.p.rapidapi.com";

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
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("img");

    // ── Image proxy mode ──
    if (imageUrl) {
      let parsedImageUrl: URL;
      try {
        parsedImageUrl = new URL(imageUrl);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid image URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const host = parsedImageUrl.hostname.toLowerCase();
      const isAllowed =
        host === "costco-static.com" ||
        host.endsWith(".costco-static.com") ||
        host === "costco.com" ||
        host.endsWith(".costco.com");
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Image host not allowed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imageResponse = await fetch(parsedImageUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          Referer: "https://www.costco.com/",
        },
      });

      if (!imageResponse.ok) {
        return new Response(JSON.stringify({ error: "Image fetch failed" }), {
          status: imageResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(imageResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": imageResponse.headers.get("content-type") || "image/jpeg",
          "Cache-Control": imageResponse.headers.get("cache-control") || "public, max-age=86400",
        },
      });
    }

    // ── Product search mode ──
    const RAPID_API_KEY = Deno.env.get("RAPID_API_KEY");
    if (!RAPID_API_KEY) {
      throw new Error("RAPID_API_KEY is not configured");
    }

    const query = url.searchParams.get("q");
    const page = url.searchParams.get("page") || "1";

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Query parameter 'q' is required (min 2 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = `https://${RAPID_API_HOST}/search?query=${encodeURIComponent(query)}&page=${page}&country=us`;
    console.log("[costco-search] Query:", query, "| Page:", page);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPID_API_KEY,
        "X-RapidAPI-Host": RAPID_API_HOST,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[costco-search] API error [${response.status}]:`, body);
      throw new Error(`Costco API returned ${response.status}`);
    }

    const data = await response.json();
    const rawProducts = data.products || data.data?.products || data.data || [];
    console.log("[costco-search] Products found:", rawProducts.length);

    const parsePrice = (item: any): number => {
      const price =
        item.item_location_pricing_salePrice ??
        item.item_location_pricing_listPrice ??
        item.item_location_pricing_pricePerUnit_price ??
        item.minSalePrice ??
        item.maxSalePrice ??
        0;
      if (typeof price === "number") return price;
      if (typeof price === "string") return parseFloat(price.replace(/[^0-9.]/g, "")) || 0;
      return 0;
    };

    const decodeHtml = (str: string): string =>
      str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');

    // Build proxy URL for images
    const functionBaseUrl = `https://${url.hostname}/functions/v1/costco-search`;
    const toProxyImageUrl = (src: string): string =>
      src ? `${functionBaseUrl}?img=${encodeURIComponent(decodeHtml(src))}` : "";

    const items = rawProducts.map((item: any) => ({
      productId: item.item_number || item.group_id || item.id || crypto.randomUUID().slice(0, 12),
      name: item.item_product_name || item.name || item.description || "",
      price: parsePrice(item),
      image: toProxyImageUrl(item.image || item.item_collateral_primaryimage || item.item_product_primary_image || ""),
      brand: (item.Brand_attr && item.Brand_attr[0]) || "",
      rating: item.item_ratings ? +item.item_ratings.toFixed(1) : null,
      inStock: item.isItemInStock !== false && item.deliveryStatus !== "out of stock",
      store: "Costco",
    }));

    console.log("[costco-search] Mapped items:", items.length);

    return new Response(
      JSON.stringify({ products: items, totalCount: data.total_products || items.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[costco-search] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
