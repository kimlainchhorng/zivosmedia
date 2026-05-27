import { serve, createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate Hotelbeds authentication signature
 * X-Signature = SHA256(apiKey + secret + unixTimestampSeconds)
 */
async function generateSignature(apiKey: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const data = `${apiKey}${secret}${timestamp}`;
  
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create authenticated headers for Hotelbeds API
 */
async function getAuthHeaders(apiKey: string, secret: string): Promise<Headers> {
  const signature = await generateSignature(apiKey, secret);
  
  return new Headers({
    "Api-key": apiKey,
    "X-Signature": signature,
    "Accept": "application/json",
    "Content-Type": "application/json",
  });
}

interface HotelSearchRequest {
  stay: {
    checkIn: string;
    checkOut: string;
  };
  occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{ type: string; age?: number }>;
  }>;
  destination?: {
    code: string;
  };
  geolocation?: {
    latitude: number;
    longitude: number;
    radius: number;
    unit: string;
  };
  filter?: {
    minRate?: number;
    maxRate?: number;
    minCategory?: number;
    maxCategory?: number;
  };
}

interface CheckRatesRequest {
  rooms: Array<{
    rateKey: string;
  }>;
}

interface BookingRequest {
  holder: {
    name: string;
    surname: string;
  };
  rooms: Array<{
    rateKey: string;
    paxes: Array<{
      roomId: number;
      type: string;
      name: string;
      surname: string;
      age?: number;
    }>;
  }>;
  clientReference: string;
  remark?: string;
  tolerance?: number;
}

serve(async (req) => {
  // Handle CORS preflight
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
  const rl = await rateLimitDb(user.id, "search");
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait before searching again." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "search") },
    });
  }

  try {
    const HOTELBEDS_API_KEY = Deno.env.get("HOTELBEDS_HOTEL_API_KEY");
    const HOTELBEDS_SECRET = Deno.env.get("HOTELBEDS_HOTEL_SECRET");
    const HOTELBEDS_BASE_URL = Deno.env.get("HOTELBEDS_BASE_URL") || "https://api.test.hotelbeds.com";

    if (!HOTELBEDS_API_KEY || !HOTELBEDS_SECRET) {
      throw new Error("Hotelbeds Hotels API credentials not configured");
    }

    const { action, ...payload } = await req.json();

    if (!action) {
      throw new Error("Action is required");
    }

    const authHeaders = await getAuthHeaders(HOTELBEDS_API_KEY, HOTELBEDS_SECRET);
    let response: Response;
    let endpoint: string;

    switch (action) {
      case "status": {
        endpoint = `${HOTELBEDS_BASE_URL}/hotel-api/1.0/status`;
        response = await fetch(endpoint, {
          method: "GET",
          headers: authHeaders,
        });
        break;
      }

      case "search": {
        endpoint = `${HOTELBEDS_BASE_URL}/hotel-api/1.0/hotels`;
        const searchPayload: HotelSearchRequest = payload;
        
        // Validate required fields
        if (!searchPayload.stay?.checkIn || !searchPayload.stay?.checkOut) {
          throw new Error("Check-in and check-out dates are required");
        }
        if (!searchPayload.occupancies?.length) {
          throw new Error("At least one occupancy is required");
        }
        if (!searchPayload.destination?.code && !searchPayload.geolocation) {
          throw new Error("Either destination code or geolocation is required");
        }

        response = await fetch(endpoint, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(searchPayload),
        });
        break;
      }

      case "checkrates": {
        endpoint = `${HOTELBEDS_BASE_URL}/hotel-api/1.0/checkrates`;
        const checkRatesPayload: CheckRatesRequest = payload;
        
        if (!checkRatesPayload.rooms?.length) {
          throw new Error("At least one room with rateKey is required");
        }

        response = await fetch(endpoint, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(checkRatesPayload),
        });
        break;
      }

      case "book": {
        endpoint = `${HOTELBEDS_BASE_URL}/hotel-api/1.0/bookings`;
        const bookingPayload: BookingRequest = payload;
        
        if (!bookingPayload.holder?.name || !bookingPayload.holder?.surname) {
          throw new Error("Holder name and surname are required");
        }
        if (!bookingPayload.rooms?.length) {
          throw new Error("At least one room is required");
        }
        if (!bookingPayload.clientReference) {
          throw new Error("Client reference is required");
        }

        response = await fetch(endpoint, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(bookingPayload),
        });
        break;
      }

      case "getBooking": {
        const { bookingId } = payload;
        if (!bookingId) {
          throw new Error("Booking ID is required");
        }
        endpoint = `${HOTELBEDS_BASE_URL}/hotel-api/1.0/bookings/${bookingId}`;
        response = await fetch(endpoint, {
          method: "GET",
          headers: authHeaders,
        });
        break;
      }

      case "cancelBooking": {
        const { bookingId } = payload;
        if (!bookingId) {
          throw new Error("Booking ID is required");
        }
        endpoint = `${HOTELBEDS_BASE_URL}/hotel-api/1.0/bookings/${bookingId}`;
        response = await fetch(endpoint, {
          method: "DELETE",
          headers: authHeaders,
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Handle rate limiting
    if (response.status === 429) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMITED",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        }
      );
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error("Hotelbeds auth error:", response.status);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication failed. Please try again.",
          code: "AUTH_FAILED",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("Hotelbeds API error:", data);
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error?.message || "Hotel API request failed",
          code: data.error?.code || "API_ERROR",
          details: data.error,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Hotelbeds Hotels error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
