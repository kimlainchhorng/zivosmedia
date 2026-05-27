/**
 * Walmart Product Search Edge Function
 * Proxies requests to RapidAPI Walmart endpoint (walmart-serp.php)
 * Never exposes API key to client
 */
import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPID_API_HOST = "walmart-api4.p.rapidapi.com";

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
    if (!RAPID_API_KEY) {
      throw new Error("RAPID_API_KEY is not configured");
    }

    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("img");

    // Image proxy mode (fixes CSP/hotlink blocking in web app)
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
      const isAllowedHost = host === "walmartimages.com" || host.endsWith(".walmartimages.com");
      if (!isAllowedHost) {
        return new Response(JSON.stringify({ error: "Image host not allowed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imageResponse = await fetch(parsedImageUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "Referer": "https://www.walmart.com/",
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

    const query = url.searchParams.get("q");
    const page = url.searchParams.get("page") || "1";

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Query parameter 'q' is required (min 2 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use simple search URL without affinityOverride to maximize product count
    const walmartUrl = `https://www.walmart.com/search?q=${encodeURIComponent(query)}&page=${page}`;
    const apiUrl = `https://${RAPID_API_HOST}/walmart-serp.php?url=${encodeURIComponent(walmartUrl)}`;

    console.log("[walmart-search] Query:", query, "| Page:", page);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPID_API_KEY,
        "X-RapidAPI-Host": RAPID_API_HOST,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[walmart-search] API error [${response.status}]:`, body);
      throw new Error(`Walmart API returned ${response.status}`);
    }

    const data = await response.json();

    // Debug: log structure
    const bodyProducts = data.body?.products || [];
    const topProducts = data.products || [];
    const searchResult = data.body?.searchResult?.items || [];
    const itemStacks = data.body?.searchResult?.itemStacks || [];
    
    console.log("[walmart-search] body.products:", bodyProducts.length,
      "| top.products:", topProducts.length,
      "| searchResult.items:", searchResult.length,
      "| itemStacks:", itemStacks.length,
      "| productsCount:", data.body?.productsCount);
    
    // Try multiple paths to find products
    let rawProducts: any[] = [];
    
    // Path 1: body.products (most common)
    if (bodyProducts.length > 0) {
      rawProducts = bodyProducts;
    }
    // Path 2: top-level products
    else if (topProducts.length > 0) {
      rawProducts = topProducts;
    }
    // Path 3: searchResult items
    else if (searchResult.length > 0) {
      rawProducts = searchResult;
    }
    // Path 4: itemStacks (newer API format)
    else if (itemStacks.length > 0) {
      for (const stack of itemStacks) {
        if (stack.items && Array.isArray(stack.items)) {
          rawProducts.push(...stack.items);
        }
      }
    }

    // Path 5: try to find any array in body that looks like products
    if (rawProducts.length === 0 && data.body) {
      for (const key of Object.keys(data.body)) {
        const val = data.body[key];
        if (Array.isArray(val) && val.length > 2 && val[0]?.title) {
          console.log("[walmart-search] Found products in body." + key);
          rawProducts = val;
          break;
        }
      }
    }

    console.log("[walmart-search] Final raw products count:", rawProducts.length);
    if (rawProducts.length > 0) {
      console.log("[walmart-search] Sample keys:", Object.keys(rawProducts[0]).join(","));
      console.log("[walmart-search] Sample:", JSON.stringify(rawProducts[0]).slice(0, 600));
    } else {
      // Log entire body structure for debugging
      console.log("[walmart-search] Full body structure:", JSON.stringify(data.body || data).slice(0, 2000));
    }

    // Parse price from various formats
    const parsePrice = (p: any): number => {
      if (typeof p === "number") return p;
      if (typeof p === "string") {
        const cleaned = p.replace(/[^0-9.]/g, "");
        return parseFloat(cleaned) || 0;
      }
      if (p && typeof p === "object") {
        return parsePrice(p.currentPrice || p.current || p.price || p.priceString || 0);
      }
      return 0;
    };

    // Try to extract price from title string (e.g., "Product Name $3.48 ...")
    const extractPriceFromTitle = (title: string): number => {
      const match = title.match(/\$(\d+(?:\.\d{1,2})?)/);
      return match ? parseFloat(match[1]) : 0;
    };

    // Extract product ID from link
    const extractId = (link: string): string => {
      if (!link) return crypto.randomUUID().slice(0, 12);
      const match = link.match(/\/(\d{5,})/);
      return match ? match[1] : crypto.randomUUID().slice(0, 12);
    };

    // Clean product name
    const cleanName = (name: string): string => {
      if (!name) return "";
      let cleaned = name.replace(/^(Best seller|Overall pick|Popular pick|Rollback|Clearance|Sponsored)\s+/i, "");
      // Remove everything from the first $ onward
      cleaned = cleaned.replace(/\s*\$[\d.,]+.*$/, "");
      // Remove unit-price patterns
      cleaned = cleaned.replace(/\s*[\d.]+\s*¢\/[a-z\s]+$/i, "");
      // Remove trailing quantity patterns
      cleaned = cleaned.replace(/\s*,?\s*\d+(\.\d+)?\s*(fl\s*oz|oz|gal|gallon|ct|count|pk|pack|lb|lbs|ml|l|kg|g|pt|qt|each)\s*$/i, "");
      cleaned = cleaned.replace(/([a-zA-Z])(\d{2,})\s*$/, "$1");
      cleaned = cleaned.replace(/[\s,\-|]+$/, "").trim();
      return cleaned;
    };

    // Extract brand
    const extractBrand = (item: any): string => {
      if (item.brand) return item.brand;
      if (item.brandName) return item.brandName;
      const title = item.title || item.name || "";
      const firstComma = title.indexOf(",");
      if (firstComma > 0 && firstComma < 40) {
        return title.slice(0, firstComma).trim();
      }
      return "";
    };

    // Always use HTTPS to avoid mixed-content blocking in browsers
    const functionBaseUrl = `${url.origin.replace('http://', 'https://')}/functions/v1/walmart-search`;
    const toProxyImageUrl = (src: string): string =>
      src ? `${functionBaseUrl}?img=${encodeURIComponent(src)}` : "";

    const items = rawProducts.map((item: any) => {
      const title = item.title || item.name || "";
      let price = parsePrice(item.price);
      // Fallback: extract price from title if price field is missing/zero
      if (price === 0) {
        price = extractPriceFromTitle(title);
      }
      // Also try priceInfo, salesPrice, currentPrice fields
      if (price === 0 && item.priceInfo) {
        price = parsePrice(item.priceInfo.currentPrice || item.priceInfo.linePrice || item.priceInfo);
      }
      if (price === 0 && item.salesPrice) price = parsePrice(item.salesPrice);
      if (price === 0 && item.currentPrice) price = parsePrice(item.currentPrice);

      return {
        productId: item.id || item.usItemId || item.product_id || extractId(item.link || item.canonicalUrl || ""),
        name: cleanName(title),
        price,
        image: toProxyImageUrl(item.image || item.thumbnailImage || item.largeFrontImage || item.imageUrl || ""),
        brand: extractBrand(item),
        rating: item.rating?.average ?? item.customerRating ?? item.ratings ?? item.averageRating ?? null,
        inStock: true,
        store: "Walmart",
      };
    });

    // Filter out items with no name or zero price
    const validItems = items.filter((i: any) => i.name.length > 2 && i.price > 0);

    console.log("[walmart-search] Valid items:", validItems.length, "of", items.length, "total");

    return new Response(
      JSON.stringify({ products: validItems, totalCount: data.body?.productsCount || validItems.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[walmart-search] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
