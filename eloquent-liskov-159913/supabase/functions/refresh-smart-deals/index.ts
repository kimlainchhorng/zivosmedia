import { serve, createClient } from "../_shared/deps.ts";

/**
 * Refresh Smart Deals Cache — Scheduled Background Worker
 * Runs every 2 hours via pg_cron to pre-compute deals for instant delivery.
 * Searches ALL routes across multiple dates and stores results in DB.
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

const SMART_ROUTES = [
  // Beach
  { origin: 'JFK', destination: 'MIA', destName: 'Miami', destKey: 'miami', category: 'beach' as const },
  { origin: 'JFK', destination: 'CUN', destName: 'Cancún', destKey: 'cancun', category: 'beach' as const },
  { origin: 'JFK', destination: 'SJU', destName: 'San Juan', destKey: 'san-juan', category: 'beach' as const },
  { origin: 'LAX', destination: 'HNL', destName: 'Honolulu', destKey: 'honolulu', category: 'beach' as const },
  { origin: 'ATL', destination: 'FLL', destName: 'Fort Lauderdale', destKey: 'fort-lauderdale', category: 'beach' as const },
  { origin: 'ORD', destination: 'CUN', destName: 'Cancún', destKey: 'cancun', category: 'beach' as const },
  { origin: 'MSY', destination: 'MIA', destName: 'Miami', destKey: 'miami', category: 'beach' as const },
  // City
  { origin: 'DFW', destination: 'SFO', destName: 'San Francisco', destKey: 'san-francisco', category: 'city' as const },
  { origin: 'MSY', destination: 'ATL', destName: 'Atlanta', destKey: 'atlanta', category: 'city' as const },
  { origin: 'JFK', destination: 'ORD', destName: 'Chicago', destKey: 'chicago', category: 'city' as const },
  { origin: 'BOS', destination: 'DCA', destName: 'Washington DC', destKey: 'washington', category: 'city' as const },
  { origin: 'LAX', destination: 'PDX', destName: 'Portland', destKey: 'portland', category: 'city' as const },
  { origin: 'PNH', destination: 'BKK', destName: 'Bangkok', destKey: 'bangkok', category: 'city' as const },
  // Nightlife
  { origin: 'LAX', destination: 'LAS', destName: 'Las Vegas', destKey: 'las-vegas', category: 'nightlife' as const },
  { origin: 'DFW', destination: 'BNA', destName: 'Nashville', destKey: 'nashville', category: 'nightlife' as const },
  { origin: 'ATL', destination: 'MSY', destName: 'New Orleans', destKey: 'new-orleans', category: 'nightlife' as const },
  // Family
  { origin: 'ORD', destination: 'MCO', destName: 'Orlando', destKey: 'orlando', category: 'family' as const },
  { origin: 'JFK', destination: 'MCO', destName: 'Orlando', destKey: 'orlando', category: 'family' as const },
  { origin: 'ATL', destination: 'TPA', destName: 'Tampa', destKey: 'tampa', category: 'family' as const },
  // Adventure
  { origin: 'ORD', destination: 'DEN', destName: 'Denver', destKey: 'denver', category: 'adventure' as const },
  { origin: 'DEN', destination: 'PHX', destName: 'Phoenix', destKey: 'phoenix', category: 'adventure' as const },
  { origin: 'SEA', destination: 'DEN', destName: 'Denver', destKey: 'denver', category: 'adventure' as const },
  // Culture
  { origin: 'JFK', destination: 'CDG', destName: 'Paris', destKey: 'paris', category: 'culture' as const },
  { origin: 'LAX', destination: 'BOS', destName: 'Boston', destKey: 'boston', category: 'culture' as const },
  { origin: 'PNH', destination: 'REP', destName: 'Siem Reap', destKey: 'siem-reap', category: 'culture' as const },
];

const AVG_PRICES: Record<string, number> = {
  'JFK-MIA': 220, 'JFK-CUN': 380, 'JFK-SJU': 280, 'JFK-MCO': 190, 'JFK-CDG': 650, 'JFK-ORD': 180,
  'LAX-LAS': 120, 'LAX-HNL': 450, 'LAX-PDX': 160, 'LAX-BOS': 280,
  'ORD-MCO': 200, 'ORD-DEN': 180, 'ORD-CUN': 350,
  'ATL-FLL': 180, 'ATL-TPA': 160, 'ATL-MSY': 140,
  'DFW-SFO': 250, 'DFW-BNA': 160,
  'MSY-MIA': 180, 'MSY-ATL': 130,
  'BOS-DCA': 140,
  'SEA-DEN': 210,
  'DEN-PHX': 140,
  'PNH-REP': 80, 'PNH-BKK': 120,
};

async function searchRoute(origin: string, destination: string, date: string, apiKey: string) {
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
      price: parseFloat(cheapest.total_amount),
      airline: carrier.name || 'Airline',
      airlineCode: carrier.iata_code || firstSeg.operating_carrier?.iata_code || '',
      airlineLogo: carrier.logo_symbol_url || carrier.logo_lockup_url || null,
      flightNumber: flightNum,
      stops: Math.max(0, segments.length - 1),
      duration: `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`,
      departureTime: depTime,
      arrivalTime: arrTime,
      cabin,
      baggageIncluded: hasCheckedBag,
      offersCount: offers.length,
      expiresAt: cheapest.expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    };
  } catch { return null; }
}

async function getAIEnhancements(deals: any[], aiKey: string): Promise<any[]> {
  try {
    const dealSummary = deals.map(d =>
      `${d.originCode}->${d.destination}: $${Math.round(d.price)}, ${d.airline} ${d.flightNumber}, ${d.stops === 0 ? 'nonstop' : d.stops + ' stop'}, ${d.duration}, ${d.cabin}, savings: ${d.savingsPercent}%`
    ).join('\n');

    const resp = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a travel deal analyst. For each flight deal, provide: 1) A punchy description (max 15 words), 2) A practical travel tip (max 15 words), 3) A deal score 1-100, 4) A catchy tag. Return JSON array: {index, description, tip, score, tag}' },
          { role: 'user', content: `Analyze these live flight deals:\n${dealSummary}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'enhance_deals',
            description: 'Provide AI enhancements for travel deals',
            parameters: {
              type: 'object',
              properties: {
                deals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      index: { type: 'number' },
                      description: { type: 'string' },
                      tip: { type: 'string' },
                      score: { type: 'number' },
                      tag: { type: 'string' },
                    },
                    required: ['index', 'description', 'tip', 'score', 'tag'],
                  }
                }
              },
              required: ['deals'],
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'enhance_deals' } },
      }),
    });
    if (!resp.ok) return deals;
    const json = await resp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return deals;
    const enhanced = JSON.parse(toolCall.function.arguments);
    for (const e of enhanced.deals) {
      if (e.index >= 0 && e.index < deals.length) {
        deals[e.index].aiDescription = e.description;
        deals[e.index].aiTip = e.tip;
        deals[e.index].dealScore = Math.min(100, Math.max(1, e.score));
        deals[e.index].dealTag = e.tag;
      }
    }
    return deals;
  } catch { return deals; }
}

serve(async (req: Request) => {
  // This function is called by pg_cron — no CORS needed
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const duffelKey = Deno.env.get('DUFFEL_API_KEY');
  const aiKey = Deno.env.get('LOVABLE_API_KEY');

  if (!duffelKey) {
    return new Response(JSON.stringify({ error: 'DUFFEL_API_KEY not configured' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Log refresh start
  const { data: logEntry } = await supabase
    .from('ai_deals_refresh_log')
    .insert({ status: 'running', routes_searched: 0, deals_cached: 0 })
    .select('id')
    .single();
  const logId = logEntry?.id;

  console.log(`[refresh-smart-deals] Starting refresh at ${new Date().toISOString()}`);

  try {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(); // 2.5h expiry

    // Search dates: 3, 7, 14, 21 days out
    const dates = [3, 7, 14, 21].map(d => {
      const dt = new Date();
      dt.setDate(dt.getDate() + d);
      return dt.toISOString().split('T')[0];
    });

    const allDeals: any[] = [];
    const seen = new Set<string>();
    let routesSearched = 0;

    // Process routes in batches of 4 to avoid Duffel rate limits
    const batchSize = 4;
    for (let i = 0; i < SMART_ROUTES.length; i += batchSize) {
      const batch = SMART_ROUTES.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.flatMap(route =>
          dates.slice(0, 2).map(async date => {
            routesSearched++;
            const result = await searchRoute(route.origin, route.destination, date, duffelKey);
            return { route, date, result };
          })
        )
      );

      for (const { route, date, result } of batchResults) {
        if (!result) continue;
        const routeKey = `${route.origin}-${route.destination}`;
        if (seen.has(routeKey)) {
          const existing = allDeals.find(d => d.originCode === route.origin && d.destinationCode === route.destination);
          if (existing && existing.price <= result.price) continue;
          const idx = allDeals.indexOf(existing!);
          if (idx >= 0) allDeals.splice(idx, 1);
        }
        seen.add(routeKey);
        const avgPrice = AVG_PRICES[routeKey] || result.price * 1.2;
        const savings = Math.max(0, Math.round(((avgPrice - result.price) / avgPrice) * 100));

        allDeals.push({
          id: `${route.origin}-${route.destination}-${date}`,
          origin: route.origin, originCode: route.origin,
          destination: route.destName, destinationCode: route.destination, destinationKey: route.destKey,
          price: result.price, departureDate: date, returnDate: null,
          airline: result.airline, airlineCode: result.airlineCode, airlineLogo: result.airlineLogo,
          flightNumber: result.flightNumber,
          stops: result.stops, duration: result.duration,
          departureTime: result.departureTime, arrivalTime: result.arrivalTime,
          cabin: result.cabin, baggageIncluded: result.baggageIncluded,
          offersCount: result.offersCount,
          aiDescription: `Great deal to ${route.destName}`,
          aiTip: 'Book soon — prices may increase',
          dealScore: Math.min(100, 50 + savings),
          dealTag: savings > 20 ? 'Hot Deal' : savings > 10 ? 'Good Price' : 'Available',
          savingsPercent: savings, category: route.category,
          fetchedAt: now, expiresAt,
        });
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < SMART_ROUTES.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // AI enhance top deals
    allDeals.sort((a, b) => b.savingsPercent - a.savingsPercent || a.price - b.price);
    const enhanced = aiKey ? await getAIEnhancements(allDeals.slice(0, 20), aiKey) : allDeals;
    // Merge enhanced back
    for (let i = 0; i < Math.min(20, enhanced.length); i++) {
      allDeals[i] = enhanced[i];
    }

    // Clear old cache and insert new deals
    await supabase.from('ai_smart_deals_cache').delete().neq('id', '');

    const rows = allDeals.map(deal => ({
      id: deal.id,
      category: deal.category,
      origin_code: deal.originCode,
      destination_code: deal.destinationCode,
      deal_data: deal,
      created_at: now,
      expires_at: expiresAt,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('ai_smart_deals_cache').upsert(rows);
      if (insertError) console.error('[refresh-smart-deals] Insert error:', insertError);
    }

    // Update log
    if (logId) {
      await supabase.from('ai_deals_refresh_log').update({
        completed_at: new Date().toISOString(),
        routes_searched: routesSearched,
        deals_cached: rows.length,
        status: 'completed',
      }).eq('id', logId);
    }

    console.log(`[refresh-smart-deals] Done: ${routesSearched} routes searched, ${rows.length} deals cached`);

    return new Response(JSON.stringify({
      success: true,
      routesSearched,
      dealsCached: rows.length,
      refreshedAt: now,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[refresh-smart-deals] Error:', error);
    if (logId) {
      await supabase.from('ai_deals_refresh_log').update({
        completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      }).eq('id', logId);
    }
    return new Response(JSON.stringify({ error: 'Refresh failed' }), { status: 500 });
  }
});
