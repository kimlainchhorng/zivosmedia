import { serve, createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Refresh Popular Routes Prices
 * Fetches lowest one-way prices from Duffel for popular routes
 * and caches them in popular_route_prices table
 */

const DUFFEL_API_URL = 'https://api.duffel.com';

const POPULAR_ROUTES = [
  { from: "JFK", fromCity: "New York", to: "MIA", toCity: "Miami" },
  { from: "LAX", fromCity: "Los Angeles", to: "SFO", toCity: "San Francisco" },
  { from: "ORD", fromCity: "Chicago", to: "ATL", toCity: "Atlanta" },
  { from: "DFW", fromCity: "Dallas", to: "DEN", toCity: "Denver" },
  { from: "SEA", fromCity: "Seattle", to: "LAS", toCity: "Las Vegas" },
  { from: "BOS", fromCity: "Boston", to: "FLL", toCity: "Fort Lauderdale" },
];

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const duffelApiKey = Deno.env.get('DUFFEL_API_KEY');
    if (!duffelApiKey) throw new Error('DUFFEL_API_KEY not set');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if cache is still fresh (less than 4 hours old)
    const { data: existing } = await supabase
      .from('popular_route_prices')
      .select('fetched_at')
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ 
        status: 'cached', 
        message: 'Prices still fresh',
        count: existing.length 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Search date: 7 days from now
    const searchDate = new Date();
    searchDate.setDate(searchDate.getDate() + 7);
    const departureDate = searchDate.toISOString().split('T')[0];

    const results: Array<{
      origin_code: string;
      destination_code: string;
      origin_city: string;
      destination_city: string;
      lowest_price: number;
      currency: string;
      airline_name: string | null;
      airline_code: string | null;
      search_date: string;
      fetched_at: string;
      expires_at: string;
    }> = [];

    for (const route of POPULAR_ROUTES) {
      try {
        console.log(`[PopRoutes] Searching ${route.from} → ${route.to}`);

        const offerReq = await fetch(`${DUFFEL_API_URL}/air/offer_requests`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${duffelApiKey}`,
            'Duffel-Version': 'v2',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            data: {
              slices: [{ origin: route.from, destination: route.to, departure_date: departureDate }],
              passengers: [{ type: 'adult' }],
              cabin_class: 'economy',
              max_connections: 1,
            },
          }),
        });

        if (!offerReq.ok) {
          console.error(`[PopRoutes] Duffel error for ${route.from}-${route.to}: ${offerReq.status}`);
          continue;
        }

        const offerData = await offerReq.json();
        const offers = offerData?.data?.offers || [];

        if (offers.length === 0) {
          console.log(`[PopRoutes] No offers for ${route.from} → ${route.to}`);
          continue;
        }

        // Find cheapest offer
        let cheapest = offers[0];
        for (const offer of offers) {
          if (parseFloat(offer.total_amount) < parseFloat(cheapest.total_amount)) {
            cheapest = offer;
          }
        }

        const airlineName = cheapest.owner?.name || cheapest.slices?.[0]?.segments?.[0]?.marketing_carrier?.name || null;
        const airlineCode = cheapest.owner?.iata_code || cheapest.slices?.[0]?.segments?.[0]?.marketing_carrier?.iata_code || null;

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 6);

        results.push({
          origin_code: route.from,
          destination_code: route.to,
          origin_city: route.fromCity,
          destination_city: route.toCity,
          lowest_price: parseFloat(cheapest.total_amount),
          currency: cheapest.total_currency || 'USD',
          airline_name: airlineName,
          airline_code: airlineCode,
          search_date: departureDate,
          fetched_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });

        console.log(`[PopRoutes] ${route.from}→${route.to}: $${cheapest.total_amount}`);
      } catch (err) {
        console.error(`[PopRoutes] Error for ${route.from}-${route.to}:`, err);
      }
    }

    if (results.length > 0) {
      // Upsert all results
      const { error } = await supabase
        .from('popular_route_prices')
        .upsert(results, { onConflict: 'origin_code,destination_code' });

      if (error) {
        console.error('[PopRoutes] DB upsert error:', error);
        throw error;
      }
    }

    return new Response(JSON.stringify({ 
      status: 'refreshed', 
      count: results.length,
      routes: results.map(r => `${r.origin_code}→${r.destination_code}: $${r.lowest_price}`)
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[PopRoutes] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
