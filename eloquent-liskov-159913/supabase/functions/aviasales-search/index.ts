import { serve, createClient } from "../_shared/deps.ts";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SEARCH_START_URL = 'https://tickets-api.travelpayouts.com/search/affiliate/start';

/**
 * Generate MD5 signature for Aviasales Search API
 * Steps:
 * 1. Flatten all param values alphabetically
 * 2. Join with ':'
 * 3. Prepend token
 * 4. MD5 hash
 */
async function generateSignature(token: string, params: Record<string, any>): Promise<string> {
  // Recursively flatten values in alphabetical key order
  function flattenValues(obj: any): string[] {
    if (obj === null || obj === undefined) return [];
    if (typeof obj !== 'object') return [String(obj)];
    if (Array.isArray(obj)) {
      return obj.flatMap(item => flattenValues(item));
    }
    const sorted = Object.keys(obj).sort();
    return sorted.flatMap(key => flattenValues(obj[key]));
  }

  const values = flattenValues(params);
  const raw = token + ':' + values.join(':');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: { user }, error: authErr } = await createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const TOKEN = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    if (!TOKEN) throw new Error('TRAVELPAYOUTS_API_TOKEN is not configured');

    const MARKER = Deno.env.get('TRAVELPAYOUTS_MARKER') || '700031';

    const { origin, destination, depart_date, return_date, adults, children, infants, cabin_class, locale, user_ip } = await req.json();

    if (!origin || !destination || !depart_date) {
      return new Response(
        JSON.stringify({ success: false, error: 'origin, destination, and depart_date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build directions
    const directions: Array<{ origin: string; destination: string; date: string }> = [
      { origin, destination, date: depart_date },
    ];
    if (return_date) {
      directions.push({ origin: destination, destination: origin, date: return_date });
    }

    // Map cabin class
    const cabinMap: Record<string, string> = {
      economy: 'Y', premium_economy: 'W', business: 'C', first: 'F',
    };
    const tripClass = cabinMap[cabin_class || 'economy'] || 'Y';

    // Build search params (exclude signature — it gets added after)
    const searchParams: Record<string, any> = {
      currency_code: 'USD',
      locale: locale || 'en_US',
      marker: MARKER,
      market_code: 'US',
      search_params: {
        directions,
        passengers: {
          adults: adults || 1,
          children: children || 0,
          infants: infants || 0,
        },
        trip_class: tripClass,
      },
    };

    // Generate MD5 signature
    const signature = await generateSignature(TOKEN, searchParams);
    
    // Add signature to both body and will use in header
    const requestBody = {
      ...searchParams,
      signature,
    };

    // Validate IP to prevent header injection — allow only IPv4/IPv6 chars
    const rawIp = user_ip || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '1.1.1.1';
    const clientIp = /^[\d.a-fA-F:]{2,45}$/.test(rawIp) ? rawIp : '1.1.1.1';

    console.log(`[aviasales-search] Starting search: ${origin} → ${destination}, depart: ${depart_date}, cabin: ${tripClass}, ip: ${clientIp}, marker: ${MARKER}`);

    // Step 1: Start search
    const startResponse = await fetch(SEARCH_START_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-real-host': 'hizovo.com',
        'x-user-ip': clientIp,
        'x-signature': signature,
        'x-affiliate-user-id': MARKER,
        'x-marker': MARKER,
      },
      body: JSON.stringify(requestBody),
    });

    // Handle non-JSON responses (API may return plain text errors)
    const startText = await startResponse.text();
    let startData: any;
    try {
      startData = JSON.parse(startText);
    } catch {
      console.error(`[aviasales-search] Non-JSON response (${startResponse.status}): ${startText.substring(0, 200)}`);

      if (startResponse.status === 403) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [],
            meta: {
              searchId: '',
              resultsUrl: '',
              totalProposals: 0,
              agentCount: 0,
              agents: [],
              unavailableReason: 'access_denied',
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `API returned non-JSON: ${startText.substring(0, 100)}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!startResponse.ok || !startData.search_id) {
      console.error('[aviasales-search] Start failed:', JSON.stringify(startData));
      return new Response(
        JSON.stringify({ success: false, error: 'Search start failed', details: startData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { search_id, results_url } = startData;
    console.log(`[aviasales-search] Search started: search_id=${search_id}, results_url=${results_url}`);

    // Step 2: Poll for results (up to 15 seconds)
    const allProposals: any[] = [];
    const agents: Record<string, any> = {};
    const airlines: Record<string, any> = {};
    const airports: Record<string, any> = {};
    let isOver = false;
    let pollCount = 0;
    const maxPolls = 10;
    const pollDelay = 1500; // 1.5 seconds

    while (!isOver && pollCount < maxPolls) {
      pollCount++;
      await new Promise(resolve => setTimeout(resolve, pollDelay));

      const resultsResponse = await fetch(`https://${results_url}/searches/${search_id}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-real-host': 'hizovo.com',
          'x-user-ip': clientIp,
          'x-marker': MARKER,
        },
        body: JSON.stringify({ search_id, marker: MARKER }),
      });

      const resultsText = await resultsResponse.text();
      let resultsData: any;
      try {
        resultsData = JSON.parse(resultsText);
      } catch {
        console.warn(`[aviasales-search] Poll ${pollCount} non-JSON: ${resultsText.substring(0, 100)}`);
        continue;
      }

      if (resultsData.agents) {
        Object.assign(agents, resultsData.agents);
      }
      if (resultsData.airlines) {
        Object.assign(airlines, resultsData.airlines);
      }
      if (resultsData.airports) {
        Object.assign(airports, resultsData.airports);
      }
      if (resultsData.proposals && Array.isArray(resultsData.proposals)) {
        allProposals.push(...resultsData.proposals);
      }

      isOver = resultsData.is_over === true;
      console.log(`[aviasales-search] Poll ${pollCount}: ${resultsData.proposals?.length || 0} proposals, is_over=${isOver}`);
    }

    // Transform proposals into a clean format
    const transformedResults = allProposals.slice(0, 30).map((proposal: any) => {
      // Each proposal has segments and terms (agency prices)
      const segments = proposal.segment || [];
      const terms = proposal.terms || {};

      // Find best price across all agents
      let bestPrice = Infinity;
      let bestAgentId = '';
      let bestProposalId = '';

      for (const [agentId, agentTerms] of Object.entries(terms)) {
        const term = agentTerms as any;
        const price = term?.unified_price || term?.price;
        if (price && price < bestPrice) {
          bestPrice = price;
          bestAgentId = agentId;
          bestProposalId = proposal.id || '';
        }
      }

      // Get agent info
      const agent = agents[bestAgentId] || {};

      // Parse segments for flight info
      const outbound = segments[0]?.flights || [];
      const firstFlight = outbound[0] || {};

      // Get airline info
      const airlineCode = firstFlight.operating_carrier || firstFlight.carrier || '';
      const airlineInfo = airlines[airlineCode] || {};

      return {
        id: proposal.id || `${bestAgentId}-${bestPrice}`,
        price: bestPrice === Infinity ? 0 : bestPrice,
        currency: 'USD',
        agentId: bestAgentId,
        agentName: agent.label || agent.gate_name || 'Unknown',
        agentPaymentMethods: agent.payment_methods || [],
        proposalId: bestProposalId,
        searchId: search_id,
        resultsUrl: results_url,
        // Flight details
        airline: airlineInfo.name || airlineCode,
        airlineCode,
        segments: segments.map((seg: any) => ({
          flights: (seg.flights || []).map((f: any) => ({
            carrier: f.carrier,
            operatingCarrier: f.operating_carrier,
            number: f.number,
            departure: f.departure,
            departureTime: f.departure_time,
            arrival: f.arrival,
            arrivalTime: f.arrival_time,
            duration: f.duration,
            aircraft: f.aircraft,
          })),
          stops: (seg.flights || []).length - 1,
          totalDuration: (seg.flights || []).reduce((sum: number, f: any) => sum + (f.duration || 0), 0),
        })),
        // All agent prices for comparison
        allPrices: Object.entries(terms).map(([agId, t]: [string, any]) => ({
          agentId: agId,
          agentName: (agents[agId] || {}).label || (agents[agId] || {}).gate_name || 'Unknown',
          price: t?.unified_price || t?.price || 0,
          currency: 'USD',
        })).sort((a, b) => a.price - b.price),
      };
    }).filter(r => r.price > 0);

    // Sort by price
    transformedResults.sort((a, b) => a.price - b.price);

    console.log(`[aviasales-search] Completed: ${transformedResults.length} results from ${Object.keys(agents).length} agents`);

    return new Response(
      JSON.stringify({
        success: true,
        data: transformedResults,
        meta: {
          searchId: search_id,
          resultsUrl: results_url,
          totalProposals: allProposals.length,
          agentCount: Object.keys(agents).length,
          agents: Object.entries(agents).map(([id, a]: [string, any]) => ({
            id,
            name: a.label || a.gate_name,
          })),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[aviasales-search] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
