import { serve, createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Duffel Hot Deals Edge Function
 * Searches multiple popular routes across flexible dates to find cheapest real deals.
 * Results cached in-memory for 4 hours.
 */

const DUFFEL_API_URL = 'https://api.duffel.com';

const dealCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

// Expanded popular deal routes from major US hubs
const DEAL_ROUTES = [
  // JFK routes
  { origin: 'JFK', destination: 'MIA', destName: 'Miami', destKey: 'miami' },
  { origin: 'JFK', destination: 'CUN', destName: 'Cancún', destKey: 'cancun' },
  { origin: 'JFK', destination: 'SJU', destName: 'San Juan', destKey: 'san-juan' },
  { origin: 'JFK', destination: 'FLL', destName: 'Fort Lauderdale', destKey: 'fort-lauderdale' },
  { origin: 'JFK', destination: 'MCO', destName: 'Orlando', destKey: 'orlando' },
  { origin: 'JFK', destination: 'TPA', destName: 'Tampa', destKey: 'tampa' },
  { origin: 'JFK', destination: 'CDG', destName: 'Paris', destKey: 'paris' },
  { origin: 'JFK', destination: 'BCN', destName: 'Barcelona', destKey: 'barcelona' },
  // LAX routes
  { origin: 'LAX', destination: 'LAS', destName: 'Las Vegas', destKey: 'las-vegas' },
  { origin: 'LAX', destination: 'HNL', destName: 'Honolulu', destKey: 'honolulu' },
  { origin: 'LAX', destination: 'SFO', destName: 'San Francisco', destKey: 'san-francisco' },
  { origin: 'LAX', destination: 'PDX', destName: 'Portland', destKey: 'portland' },
  { origin: 'LAX', destination: 'SEA', destName: 'Seattle', destKey: 'seattle' },
  { origin: 'LAX', destination: 'CUN', destName: 'Cancún', destKey: 'cancun' },
  // ORD routes
  { origin: 'ORD', destination: 'MCO', destName: 'Orlando', destKey: 'orlando' },
  { origin: 'ORD', destination: 'MIA', destName: 'Miami', destKey: 'miami' },
  { origin: 'ORD', destination: 'DEN', destName: 'Denver', destKey: 'denver' },
  { origin: 'ORD', destination: 'LAS', destName: 'Las Vegas', destKey: 'las-vegas' },
  { origin: 'ORD', destination: 'MSP', destName: 'Minneapolis', destKey: 'minneapolis' },
  { origin: 'ORD', destination: 'BNA', destName: 'Nashville', destKey: 'nashville' },
  // ATL routes
  { origin: 'ATL', destination: 'SAN', destName: 'San Diego', destKey: 'san-diego' },
  { origin: 'ATL', destination: 'FLL', destName: 'Fort Lauderdale', destKey: 'fort-lauderdale' },
  { origin: 'ATL', destination: 'TPA', destName: 'Tampa', destKey: 'tampa' },
  { origin: 'ATL', destination: 'MSY', destName: 'New Orleans', destKey: 'new-orleans' },
  { origin: 'ATL', destination: 'CUN', destName: 'Cancún', destKey: 'cancun' },
  // DFW routes
  { origin: 'DFW', destination: 'SFO', destName: 'San Francisco', destKey: 'san-francisco' },
  { origin: 'DFW', destination: 'MIA', destName: 'Miami', destKey: 'miami' },
  { origin: 'DFW', destination: 'LAS', destName: 'Las Vegas', destKey: 'las-vegas' },
  { origin: 'DFW', destination: 'AUS', destName: 'Austin', destKey: 'austin' },
  { origin: 'DFW', destination: 'DEN', destName: 'Denver', destKey: 'denver' },
  // MSY routes
  { origin: 'MSY', destination: 'MIA', destName: 'Miami', destKey: 'miami' },
  { origin: 'MSY', destination: 'CUN', destName: 'Cancún', destKey: 'cancun' },
  { origin: 'MSY', destination: 'LAS', destName: 'Las Vegas', destKey: 'las-vegas' },
  { origin: 'MSY', destination: 'MCO', destName: 'Orlando', destKey: 'orlando' },
  { origin: 'MSY', destination: 'ATL', destName: 'Atlanta', destKey: 'atlanta' },
  { origin: 'MSY', destination: 'DFW', destName: 'Dallas', destKey: 'dallas' },
  { origin: 'MSY', destination: 'CLT', destName: 'Charlotte', destKey: 'charlotte' },
  // BOS routes
  { origin: 'BOS', destination: 'MIA', destName: 'Miami', destKey: 'miami' },
  { origin: 'BOS', destination: 'FLL', destName: 'Fort Lauderdale', destKey: 'fort-lauderdale' },
  { origin: 'BOS', destination: 'DCA', destName: 'Washington DC', destKey: 'washington' },
  { origin: 'BOS', destination: 'MCO', destName: 'Orlando', destKey: 'orlando' },
  // SEA routes
  { origin: 'SEA', destination: 'LAX', destName: 'Los Angeles', destKey: 'los-angeles' },
  { origin: 'SEA', destination: 'LAS', destName: 'Las Vegas', destKey: 'las-vegas' },
  { origin: 'SEA', destination: 'HNL', destName: 'Honolulu', destKey: 'honolulu' },
  // DEN routes
  { origin: 'DEN', destination: 'PHX', destName: 'Phoenix', destKey: 'phoenix' },
  { origin: 'DEN', destination: 'LAS', destName: 'Las Vegas', destKey: 'las-vegas' },
  { origin: 'DEN', destination: 'AUS', destName: 'Austin', destKey: 'austin' },
  // MIA routes
  { origin: 'MIA', destination: 'CUN', destName: 'Cancún', destKey: 'cancun' },
  { origin: 'MIA', destination: 'SJU', destName: 'San Juan', destKey: 'san-juan' },
  // Cambodia / Asia routes (from PNH hub)
  { origin: 'PNH', destination: 'REP', destName: 'Siem Reap', destKey: 'siem-reap' },
  { origin: 'PNH', destination: 'BKK', destName: 'Bangkok', destKey: 'bangkok' },
  { origin: 'PNH', destination: 'SGN', destName: 'Ho Chi Minh City', destKey: 'ho-chi-minh' },
  { origin: 'PNH', destination: 'KOS', destName: 'Sihanoukville', destKey: 'sihanoukville' },
  { origin: 'REP', destination: 'BKK', destName: 'Bangkok', destKey: 'bangkok' },
  { origin: 'REP', destination: 'SGN', destName: 'Ho Chi Minh City', destKey: 'ho-chi-minh' },
  { origin: 'BKK', destination: 'REP', destName: 'Siem Reap', destKey: 'siem-reap' },
  { origin: 'BKK', destination: 'PNH', destName: 'Phnom Penh', destKey: 'phnom-penh' },
];

interface DealResult {
  origin: string;
  originCode: string;
  destination: string;
  destinationKey: string;
  destinationCode: string;
  price: number;
  departureDate: string;
  airline: string;
  airlineLogo: string | null;
  stops: number;
  duration: string;
}

async function searchRoute(
  origin: string, destination: string, departureDate: string, apiKey: string
): Promise<{ price: number; airline: string; airlineLogo: string | null; stops: number; duration: string } | null> {
  try {
    const response = await fetch(`${DUFFEL_API_URL}/air/offer_requests`, {
      method: 'POST',
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

    let cheapest = offers[0];
    for (const o of offers) {
      if (parseFloat(o.total_amount) < parseFloat(cheapest.total_amount)) cheapest = o;
    }
    const slice = cheapest.slices?.[0];
    const segments = slice?.segments || [];
    const carrier = cheapest.owner || segments[0]?.operating_carrier || {};
    const totalMinutes = segments.reduce((acc: number, seg: { duration?: string }) => {
      if (!seg.duration) return acc;
      const match = seg.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (!match) return acc;
      return acc + (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
    }, 0);
    return {
      price: parseFloat(cheapest.total_amount),
      airline: carrier.name || 'Airline',
      airlineLogo: carrier.logo_symbol_url || carrier.logo_lockup_url || null,
      stops: Math.max(0, segments.length - 1),
      duration: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
    };
  } catch { return null; }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: { user }, error: authErr } = await createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const userOrigin = body.origin as string | undefined;

    const apiKey = Deno.env.get('DUFFEL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'DUFFEL_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cacheKey = `deals:${userOrigin || 'all'}`;
    const cached = dealCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let routes = DEAL_ROUTES;
    if (userOrigin) {
      const filtered = routes.filter(r => r.origin === userOrigin);
      if (filtered.length > 0) routes = filtered;
    }

    // Search across 4 flexible dates
    const datesToCheck = [5, 10, 14, 21].map(daysOut => {
      const d = new Date();
      d.setDate(d.getDate() + daysOut);
      return d.toISOString().split('T')[0];
    });

    const deals: DealResult[] = [];
    const seen = new Set<string>();
    const selectedRoutes = routes.slice(0, 8);

    const promises = selectedRoutes.flatMap(route =>
      datesToCheck.map(async (date) => {
        const result = await searchRoute(route.origin, route.destination, date, apiKey);
        if (!result) return;
        const dedupKey = `${route.origin}-${route.destination}`;
        if (seen.has(dedupKey)) {
          const existing = deals.find(d => d.originCode === route.origin && d.destinationCode === route.destination);
          if (existing && existing.price <= result.price) return;
          const idx = deals.indexOf(existing!);
          if (idx >= 0) deals.splice(idx, 1);
        }
        seen.add(dedupKey);
        deals.push({
          origin: route.origin,
          originCode: route.origin,
          destination: route.destName,
          destinationKey: route.destKey,
          destinationCode: route.destination,
          price: result.price,
          departureDate: date,
          airline: result.airline,
          airlineLogo: result.airlineLogo,
          stops: result.stops,
          duration: result.duration,
        });
      })
    );

    await Promise.all(promises);
    deals.sort((a, b) => a.price - b.price);

    const responseData = { deals: deals.slice(0, 12) };
    dealCache.set(cacheKey, { data: responseData, expires: Date.now() + CACHE_TTL_MS });

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Hot deals error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
