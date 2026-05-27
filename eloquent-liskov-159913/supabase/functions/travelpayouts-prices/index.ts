import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

serve(withSecurity("travelpayouts-prices", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed", data: [] }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ success: false, error: "Authentication required", data: [] }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: { user }, error: authErr } = await createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ success: false, error: "Authentication required", data: [] }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const TRAVELPAYOUTS_API_TOKEN = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    if (!TRAVELPAYOUTS_API_TOKEN) {
      throw new Error('TRAVELPAYOUTS_API_TOKEN is not configured');
    }

    const TRAVELPAYOUTS_MARKER = Deno.env.get('TRAVELPAYOUTS_MARKER');

    const { origin, destination, depart_date, return_date, currency } = await req.json();

    const cleanOrigin = String(origin || "").trim().toUpperCase();
    const cleanDestination = String(destination || "").trim().toUpperCase();
    const cleanCurrency = String(currency || "usd").trim().toLowerCase();
    if (!/^[A-Z]{3}$/.test(cleanOrigin) || !/^[A-Z]{3}$/.test(cleanDestination) || !/^[a-z]{3}$/.test(cleanCurrency)) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid origin, destination, or currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the v3 prices_for_dates endpoint (recommended replacement for v1/v2)
    const params = new URLSearchParams({
      origin: cleanOrigin,
      destination: cleanDestination,
      currency: cleanCurrency,
      sorting: 'price',
      direct: 'false',
      limit: '10',
      page: '1',
      token: TRAVELPAYOUTS_API_TOKEN,
    });

    if (depart_date) params.set('departure_at', depart_date);
    if (return_date && depart_date) {
      const diffMs = new Date(return_date).getTime() - new Date(depart_date).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays <= 30) {
        params.set('return_at', return_date);
      } else {
        console.log(`[travelpayouts-prices] Skipping return_date (${diffDays} days > 30 day limit)`);
      }
    } else if (return_date) {
      params.set('return_at', return_date);
    }
    if (TRAVELPAYOUTS_MARKER) params.set('marker', TRAVELPAYOUTS_MARKER);

    const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params.toString()}`;

    console.log(`[travelpayouts-prices] Fetching: ${cleanOrigin} -> ${cleanDestination}, depart: ${depart_date || 'any'}`);

    // Retry transient network errors (Travelpayouts occasionally resets the connection)
    const fetchWithRetry = async (attempts = 3): Promise<Response> => {
      let lastErr: unknown;
      for (let i = 0; i < attempts; i++) {
        try {
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 10_000);
          const res = await fetch(url, { signal: ctrl.signal });
          clearTimeout(timeout);
          return res;
        } catch (e) {
          lastErr = e;
          console.warn(`[travelpayouts-prices] fetch attempt ${i + 1} failed:`, (e as Error)?.message);
          await new Promise((r) => setTimeout(r, 300 * (i + 1)));
        }
      }
      throw lastErr;
    };

    let response: Response;
    try {
      response = await fetchWithRetry(3);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Network error';
      console.error('[travelpayouts-prices] Network failure after retries:', message);
      // Return 200 with fallback flag so the client SDK reads the body cleanly
      return new Response(
        JSON.stringify({ success: false, fallback: true, error: 'SERVICE_UNAVAILABLE', details: message, data: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('[travelpayouts-prices] API error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, fallback: true, error: 'Travelpayouts API error', details: data, data: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform results into a clean format
    const prices = (data.data || []).map((ticket: any) => ({
      origin: ticket.origin,
      destination: ticket.destination,
      originAirport: ticket.origin_airport,
      destinationAirport: ticket.destination_airport,
      price: ticket.price,
      airline: ticket.airline,
      flightNumber: ticket.flight_number,
      departureAt: ticket.departure_at,
      returnAt: ticket.return_at,
      transfers: ticket.transfers,
      duration: ticket.duration,
      durationTo: ticket.duration_to,
      durationBack: ticket.duration_back,
      link: ticket.link,
    }));

    console.log(`[travelpayouts-prices] Found ${prices.length} prices for ${cleanOrigin} -> ${cleanDestination}`);

    return new Response(
      JSON.stringify({ success: true, data: prices, currency: cleanCurrency }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[travelpayouts-prices] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Always return 200 so the frontend doesn't blank-screen on a 500
    return new Response(
      JSON.stringify({ success: false, fallback: true, error: message, data: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}, { rateLimit: "search", strictCors: true, trackNetwork: "suspicious" }));
