import { serve, createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Duffel Fare Calendar Edge Function
 * 
 * Samples 5 dates across a month to determine low/mid/high fare levels.
 * Returns a map of date → price level for the entire month.
 * Results are cached in-memory for 6 hours per route+month.
 */

const DUFFEL_API_URL = 'https://api.duffel.com';

// In-memory cache (persists across warm invocations)
const fareCache = new Map<string, { data: Record<string, { level: string; price: number }>; expires: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function duffelSearch(
  origin: string,
  destination: string, 
  departureDate: string,
  cabinClass: string = 'economy'
): Promise<number | null> {
  const apiKey = Deno.env.get('DUFFEL_API_KEY');
  if (!apiKey) return null;

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
          cabin_class: cabinClass,
          max_connections: 1,
        }
      }),
    });

    if (!response.ok) return null;

    const json = await response.json();
    const offers = json.data?.offers || [];
    if (offers.length === 0) return null;

    // Get the lowest price from all offers
    const prices = offers.map((o: { total_amount: string }) => parseFloat(o.total_amount)).filter((p: number) => !isNaN(p));
    return prices.length > 0 ? Math.min(...prices) : null;
  } catch {
    return null;
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Pick 5 sample dates: early, mid-week early, mid, mid-week late, late
function getSampleDates(year: number, month: number): string[] {
  const daysInMonth = getDaysInMonth(year, month);
  const samples = [
    Math.min(3, daysInMonth),   // Early month (Tue/Wed area)
    Math.min(8, daysInMonth),   // ~Week 2
    Math.min(15, daysInMonth),  // Mid month
    Math.min(22, daysInMonth),  // ~Week 4
    Math.min(28, daysInMonth),  // Late month
  ];
  
  return [...new Set(samples)].map(d => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  });
}

function classifyPrices(
  samplePrices: { date: string; price: number }[],
  year: number,
  month: number
): Record<string, { level: string; price: number }> {
  if (samplePrices.length === 0) return {};

  const prices = samplePrices.map(s => s.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice;
  
  // Thresholds: bottom 33% = low, top 33% = high, middle = mid
  const lowThreshold = minPrice + range * 0.33;
  const highThreshold = minPrice + range * 0.67;

  // Build a price map from samples
  const sampleMap = new Map(samplePrices.map(s => [s.date, s.price]));
  
  // For each day of the month, interpolate from nearest samples
  const daysInMonth = getDaysInMonth(year, month);
  const result: Record<string, { level: string; price: number }> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    
    let price: number;
    if (sampleMap.has(dateStr)) {
      price = sampleMap.get(dateStr)!;
    } else {
      // Interpolate: find nearest sample dates
      const sampleDays = samplePrices.map(s => ({ day: parseInt(s.date.slice(-2)), price: s.price }));
      const before = sampleDays.filter(s => s.day <= d).sort((a, b) => b.day - a.day)[0];
      const after = sampleDays.filter(s => s.day >= d).sort((a, b) => a.day - b.day)[0];
      
      if (before && after && before.day !== after.day) {
        const ratio = (d - before.day) / (after.day - before.day);
        price = before.price + ratio * (after.price - before.price);
      } else {
        price = (before || after)?.price || minPrice;
      }

      // Day-of-week adjustment: weekends +15%, Tue/Wed -10%
      const dow = new Date(year, month, d).getDay();
      if (dow === 0 || dow === 5 || dow === 6) price *= 1.15;
      else if (dow === 2 || dow === 3) price *= 0.90;
    }

    const level = price <= lowThreshold ? 'low' : price >= highThreshold ? 'high' : 'mid';
    result[dateStr] = { level, price: Math.round(price) };
  }

  return result;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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
    const { origin, destination, year, month, cabinClass } = await req.json();
    
    if (!origin || !destination || year === undefined || month === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required params: origin, destination, year, month' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = `${origin}-${destination}-${year}-${month}-${cabinClass || 'economy'}`;
    const cached = fareCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return new Response(
        JSON.stringify({ fares: cached.data, fromCache: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sample 5 dates across the month
    const sampleDates = getSampleDates(year, month);
    console.log(`[FareCalendar] Sampling ${sampleDates.length} dates for ${origin}-${destination} ${year}-${month + 1}`);

    // Fetch prices in parallel
    const results = await Promise.all(
      sampleDates.map(async (date) => {
        const price = await duffelSearch(origin, destination, date, cabinClass || 'economy');
        return price !== null ? { date, price } : null;
      })
    );

    const validResults = results.filter((r): r is { date: string; price: number } => r !== null);
    console.log(`[FareCalendar] Got ${validResults.length}/${sampleDates.length} valid prices`);

    if (validResults.length === 0) {
      return new Response(
        JSON.stringify({ fares: {}, noData: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Classify all days of the month
    const fares = classifyPrices(validResults, year, month);

    // Cache results
    fareCache.set(cacheKey, { data: fares, expires: Date.now() + CACHE_TTL_MS });

    return new Response(
      JSON.stringify({ fares, sampleCount: validResults.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[FareCalendar] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', fares: {} }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
