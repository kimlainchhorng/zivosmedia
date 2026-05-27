import { serve, createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Duffel Destination Prices Edge Function
 * Fetches lowest one-way fares from a user's nearest airport to popular destinations.
 * Results cached in-memory for 6 hours.
 */

const DUFFEL_API_URL = 'https://api.duffel.com';

// In-memory cache
const priceCache = new Map<string, { data: Record<string, number | null>; expires: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Destination IATA codes
const DESTINATION_CODES: Record<string, string> = {
  miami: 'MIA',
  'las-vegas': 'LAS',
  'new-york': 'JFK',
  cancun: 'CUN',
  'los-angeles': 'LAX',
  orlando: 'MCO',
  'san-francisco': 'SFO',
  chicago: 'ORD',
  barcelona: 'BCN',
  paris: 'CDG',
  'san-diego': 'SAN',
  dallas: 'DFW',
  atlanta: 'ATL',
  phoenix: 'PHX',
  honolulu: 'HNL',
  nashville: 'BNA',
  denver: 'DEN',
  seattle: 'SEA',
  boston: 'BOS',
  'san-juan': 'SJU',
  tampa: 'TPA',
  charlotte: 'CLT',
  minneapolis: 'MSP',
  portland: 'PDX',
  austin: 'AUS',
  'fort-lauderdale': 'FLL',
  'new-orleans': 'MSY',
  washington: 'DCA',
  // Cambodia destinations
  'siem-reap': 'REP',
  sihanoukville: 'KOS',
  kampot: 'PNH',
  'phnom-penh': 'PNH',
  battambang: 'BBM',
  kep: 'PNH',
  // Asia destinations
  bangkok: 'BKK',
  'ho-chi-minh': 'SGN',
};

const FETCH_TIMEOUT_MS = 10_000;

async function fetchLowestFare(
  origin: string,
  destination: string,
  departureDate: string,
  apiKey: string
): Promise<number | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${DUFFEL_API_URL}/air/offer_requests`, {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        data: {
          slices: [{ origin, destination, departure_date: departureDate }],
          passengers: [{ type: 'adult' }],
          cabin_class: 'economy',
          max_connections: 1,
        }
      }),
    });

    if (!response.ok) return null;

    const json = await response.json();
    const offers = json.data?.offers || [];
    if (offers.length === 0) return null;

    const prices = offers
      .map((o: { total_amount: string }) => parseFloat(o.total_amount))
      .filter((p: number) => !isNaN(p));
    return prices.length > 0 ? Math.min(...prices) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}


serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Public endpoint — flight price browsing doesn't require auth

  try {
    const { origin, destinations } = await req.json();

    if (!origin || !destinations || !Array.isArray(destinations)) {
      return new Response(JSON.stringify({ error: 'origin and destinations[] required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('DUFFEL_API_KEY');
    if (!apiKey) {
      // Graceful: return empty prices so frontend stops retrying.
      return new Response(JSON.stringify({ prices: {}, reason: 'duffel_not_configured' }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Use a date ~14 days from now for better pricing
    const searchDate = new Date();
    searchDate.setDate(searchDate.getDate() + 14);
    const departureDate = searchDate.toISOString().split('T')[0];

    const cacheKey = `${origin}:${destinations.sort().join(',')}:${departureDate}`;
    const cached = priceCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify({ prices: cached.data, cached: true }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=900',
        },
      });
    }

    // Fetch all destination prices in parallel
    const results: Record<string, number | null> = {};
    const uniqueDestCodes = new Map<string, string[]>();

    // Group destinations by IATA code to avoid duplicate API calls
    for (const dest of destinations) {
      const code = DESTINATION_CODES[dest];
      if (!code) continue;
      if (!uniqueDestCodes.has(code)) uniqueDestCodes.set(code, []);
      uniqueDestCodes.get(code)!.push(dest);
    }

    const fetchPromises = Array.from(uniqueDestCodes.entries()).map(async ([code, destKeys]) => {
      if (code === origin) {
        for (const key of destKeys) results[key] = null;
        return;
      }
      const price = await fetchLowestFare(origin, code, departureDate, apiKey);
      for (const key of destKeys) results[key] = price;
    });

    await Promise.all(fetchPromises);

    // Cache results
    priceCache.set(cacheKey, { data: results, expires: Date.now() + CACHE_TTL_MS });

    return new Response(JSON.stringify({ prices: results }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900',
      },
    });
  } catch (error) {
    console.error('Destination prices error:', error);
    // Graceful: return empty so client doesn't see an error or retry-storm.
    return new Response(JSON.stringify({ prices: {}, error: 'transient' }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
});
