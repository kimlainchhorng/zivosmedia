import { serve, createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

/**
 * AI Smart Deal Finder v3 — Cache-First, Instant Global Delivery
 * • Reads pre-computed deals from DB cache (refreshed every 2h by cron)
 * • Falls back to live Duffel search only when cache is empty
 * • Sub-100ms response times for all customers globally
 */

const DUFFEL_API_URL = 'https://api.duffel.com';
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface DuffelSegment {
  origin?: { iata_code?: string; name?: string; city_name?: string };
  destination?: { iata_code?: string; name?: string; city_name?: string };
  departing_at?: string;
  arriving_at?: string;
  duration?: string;
  operating_carrier?: { name?: string; logo_symbol_url?: string; logo_lockup_url?: string; iata_code?: string };
  marketing_carrier?: { name?: string; iata_code?: string };
  marketing_carrier_flight_number?: string;
}

interface SmartDeal {
  id: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  destinationKey: string;
  price: number;
  departureDate: string;
  returnDate: string | null;
  airline: string;
  airlineCode: string;
  airlineLogo: string | null;
  flightNumber: string;
  stops: number;
  duration: string;
  departureTime: string;
  arrivalTime: string;
  cabin: string;
  baggageIncluded: boolean;
  offersCount: number;
  aiDescription: string;
  aiTip: string;
  dealScore: number;
  dealTag: string;
  savingsPercent: number;
  category: 'beach' | 'city' | 'adventure' | 'culture' | 'nightlife' | 'family';
  fetchedAt: string;
  expiresAt: string;
}

// Fallback routes for live search when cache is empty
const FALLBACK_ROUTES = [
  { origin: 'JFK', destination: 'MIA', destName: 'Miami', destKey: 'miami', category: 'beach' as const },
  { origin: 'JFK', destination: 'ORD', destName: 'Chicago', destKey: 'chicago', category: 'city' as const },
  { origin: 'LAX', destination: 'LAS', destName: 'Las Vegas', destKey: 'las-vegas', category: 'nightlife' as const },
  { origin: 'ORD', destination: 'MCO', destName: 'Orlando', destKey: 'orlando', category: 'family' as const },
  { origin: 'ORD', destination: 'DEN', destName: 'Denver', destKey: 'denver', category: 'adventure' as const },
  { origin: 'JFK', destination: 'CDG', destName: 'Paris', destKey: 'paris', category: 'culture' as const },
];

const AVG_PRICES: Record<string, number> = {
  'JFK-MIA': 220, 'JFK-ORD': 180, 'LAX-LAS': 120, 'ORD-MCO': 200, 'ORD-DEN': 180, 'JFK-CDG': 650,
};

interface SearchResult {
  price: number; airline: string; airlineCode: string; airlineLogo: string | null;
  flightNumber: string; stops: number; duration: string; departureTime: string;
  arrivalTime: string; cabin: string; baggageIncluded: boolean; offersCount: number; expiresAt: string;
}

async function searchRoute(origin: string, destination: string, date: string, apiKey: string): Promise<SearchResult | null> {
  try {
    const resp = await fetch(`${DUFFEL_API_URL}/air/offer_requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        data: {
          slices: [{ origin, destination, departure_date: date }],
          passengers: [{ type: 'adult' }],
          cabin_class: 'economy',
          max_connections: 1,
        }
      }),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const offers = json.data?.offers || [];
    if (!offers.length) return null;

    let cheapest = offers[0];
    for (const o of offers) {
      if (parseFloat(o.total_amount) < parseFloat(cheapest.total_amount)) cheapest = o;
    }

    const slice = cheapest.slices?.[0];
    const segments: DuffelSegment[] = slice?.segments || [];
    const carrier = cheapest.owner || segments[0]?.operating_carrier || {};
    const firstSeg = segments[0] || {};
    const lastSeg = segments[segments.length - 1] || {};

    const totalMin = segments.reduce((a: number, s: DuffelSegment) => {
      if (!s.duration) return a;
      const m = s.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      return m ? a + (parseInt(m[1] || '0') * 60) + parseInt(m[2] || '0') : a;
    }, 0);

    const flightNum = firstSeg.marketing_carrier?.iata_code && firstSeg.marketing_carrier_flight_number
      ? `${firstSeg.marketing_carrier.iata_code}${firstSeg.marketing_carrier_flight_number}` : '';
    const depTime = firstSeg.departing_at ? new Date(firstSeg.departing_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
    const arrTime = lastSeg.arriving_at ? new Date(lastSeg.arriving_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
    const cabin = cheapest.slices?.[0]?.segments?.[0]?.passengers?.[0]?.cabin_class_marketing_name || 'Economy';
    const paxBaggage = cheapest.slices?.[0]?.segments?.[0]?.passengers?.[0]?.baggages || [];
    const hasCheckedBag = paxBaggage.some((b: { type: string; quantity: number }) => b.type === 'checked' && b.quantity > 0);

    return {
      price: parseFloat(cheapest.total_amount), airline: carrier.name || 'Airline',
      airlineCode: carrier.iata_code || firstSeg.operating_carrier?.iata_code || '',
      airlineLogo: carrier.logo_symbol_url || carrier.logo_lockup_url || null,
      flightNumber: flightNum, stops: Math.max(0, segments.length - 1),
      duration: `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`,
      departureTime: depTime, arrivalTime: arrTime, cabin, baggageIncluded: hasCheckedBag,
      offersCount: offers.length,
      expiresAt: cheapest.expires_at || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  } catch { return null; }
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Public endpoint — try to identify user for rate limiting, but don't require auth
  const authHeader = req.headers.get("Authorization");
  let rateLimitKey = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { data } = await createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      ).auth.getUser();
      if (data?.user?.id) rateLimitKey = data.user.id;
    } catch { /* anon ok */ }
  }
  const rl = await rateLimitDb(rateLimitKey, "api_general");
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "api_general") },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const category = body.category as string | undefined;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Step 1: Try DB cache first (instant!) ──
    let query = supabase
      .from('ai_smart_deals_cache')
      .select('deal_data')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: cachedRows, error: cacheError } = await query.limit(12);

    if (!cacheError && cachedRows && cachedRows.length > 0) {
      const deals = cachedRows.map(r => r.deal_data as SmartDeal);
      deals.sort((a, b) => b.savingsPercent - a.savingsPercent || a.price - b.price);

      // Get latest refresh timestamp
      const { data: logData } = await supabase
        .from('ai_deals_refresh_log')
        .select('completed_at, routes_searched, deals_cached')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      return new Response(JSON.stringify({
        deals,
        generatedAt: logData?.completed_at || deals[0]?.fetchedAt || new Date().toISOString(),
        totalRoutesSearched: logData?.routes_searched || deals.length,
        totalDealsFound: deals.length,
        source: 'cache',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 2: Cache miss — do a small live search as fallback ──
    console.log('[ai-smart-deals] Cache miss, doing live fallback search');
    const duffelKey = Deno.env.get('DUFFEL_API_KEY');
    if (!duffelKey) {
      return new Response(JSON.stringify({
        deals: [], generatedAt: new Date().toISOString(),
        totalRoutesSearched: 0, totalDealsFound: 0, source: 'empty',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const routes = category
      ? FALLBACK_ROUTES.filter(r => r.category === category)
      : FALLBACK_ROUTES;

    const date = new Date();
    date.setDate(date.getDate() + 7);
    const searchDate = date.toISOString().split('T')[0];
    const now = new Date().toISOString();

    const results = await Promise.all(
      routes.map(async route => {
        const result = await searchRoute(route.origin, route.destination, searchDate, duffelKey);
        return { route, result };
      })
    );

    const deals: SmartDeal[] = [];
    for (const { route, result } of results) {
      if (!result) continue;
      const routeKey = `${route.origin}-${route.destination}`;
      const avgPrice = AVG_PRICES[routeKey] || result.price * 1.2;
      const savings = Math.max(0, Math.round(((avgPrice - result.price) / avgPrice) * 100));

      deals.push({
        id: `${route.origin}-${route.destination}-${searchDate}`,
        origin: route.origin, originCode: route.origin,
        destination: route.destName, destinationCode: route.destination, destinationKey: route.destKey,
        price: result.price, departureDate: searchDate, returnDate: null,
        airline: result.airline, airlineCode: result.airlineCode, airlineLogo: result.airlineLogo,
        flightNumber: result.flightNumber, stops: result.stops, duration: result.duration,
        departureTime: result.departureTime, arrivalTime: result.arrivalTime,
        cabin: result.cabin, baggageIncluded: result.baggageIncluded, offersCount: result.offersCount,
        aiDescription: `Great deal to ${route.destName}`,
        aiTip: 'Book soon — prices may increase',
        dealScore: Math.min(100, 50 + savings),
        dealTag: savings > 20 ? 'Hot Deal' : savings > 10 ? 'Good Price' : 'Available',
        savingsPercent: savings, category: route.category,
        fetchedAt: now, expiresAt: result.expiresAt,
      });
    }

    deals.sort((a, b) => b.savingsPercent - a.savingsPercent || a.price - b.price);

    return new Response(JSON.stringify({
      deals,
      generatedAt: now,
      totalRoutesSearched: routes.length,
      totalDealsFound: deals.length,
      source: 'live',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Smart Deals error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
