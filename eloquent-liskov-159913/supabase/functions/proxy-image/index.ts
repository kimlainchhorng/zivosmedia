import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOWED_DOMAINS = [
  "cf.bstatic.com",
  "t.bstatic.com",
  "q-xx.bstatic.com",
  "r-xx.bstatic.com",
];

const CACHE_CONTROL = "public, max-age=31536000"; // 1 year for images

serve(async (req) => {
  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Extract the image URL from query parameter
  const url = new URL(req.url);
  const imageUrl = url.searchParams.get("url");

  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Validate the URL
  try {
    const parsedUrl = new URL(imageUrl);
    
    // Whitelist allowed domains
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      parsedUrl.hostname.includes(domain)
    );

    if (!isAllowed) {
      return new Response("Domain not whitelisted", { status: 403 });
    }
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  try {
    // Fetch the image from the original source
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.booking.com/",
      },
    });

    if (!response.ok) {
      return new Response("Failed to fetch image", { status: response.status });
    }

    // Get content type
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Return the image with proper headers
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
