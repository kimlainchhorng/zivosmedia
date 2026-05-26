import { serve, createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

/**
 * Duffel Flights API Edge Function
 * 
 * Implements real flight search and booking using the Duffel API
 * Supports: offer requests, offer retrieval, order creation
 * 
 * ZIVO is the Merchant of Record - Stripe checkout, then Duffel order
 * 
 * Includes search logging for admin debugging
 */

const DUFFEL_API_URL = 'https://api.duffel.com';

// Supabase client for logging
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get current environment
const DUFFEL_ENV = Deno.env.get('DUFFEL_ENV') || 'sandbox';

// Default cache TTL in seconds (2 minutes)
const DEFAULT_CACHE_TTL = 120;

/**
 * Generate cache key for search params
 */
function generateCacheKey(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
}): string {
  return `${params.origin}-${params.destination}-${params.departureDate}-${params.returnDate || 'OW'}-${params.passengers}-${params.cabinClass}`;
}

/**
 * Check cache for existing results
 */
async function checkCache(cacheKey: string): Promise<{ hit: boolean; data?: unknown }> {
  try {
    const { data, error } = await supabase
      .from('flight_search_cache')
      .select('offers_data, offers_count, offer_request_id')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return { hit: false };
    }

    // Increment hit counter
    await supabase
      .from('flight_search_cache')
      .update({ hits: supabase.rpc('increment_counter') })
      .eq('cache_key', cacheKey);

    console.log('[Cache] HIT for key:', cacheKey);
    return { hit: true, data: data.offers_data };
  } catch {
    return { hit: false };
  }
}

/**
 * Store search results in cache
 */
async function setCache(params: {
  cacheKey: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  offersData: unknown;
  offersCount: number;
  offerRequestId?: string;
  ttlSeconds?: number;
}): Promise<void> {
  const ttl = params.ttlSeconds || DEFAULT_CACHE_TTL;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  try {
    await supabase
      .from('flight_search_cache')
      .upsert({
        cache_key: params.cacheKey,
        origin_iata: params.origin,
        destination_iata: params.destination,
        departure_date: params.departureDate,
        return_date: params.returnDate || null,
        passengers: params.passengers,
        cabin_class: params.cabinClass,
        offers_data: params.offersData,
        offers_count: params.offersCount,
        offer_request_id: params.offerRequestId,
        expires_at: expiresAt.toISOString(),
        hits: 0,
      }, { onConflict: 'cache_key' });

    console.log('[Cache] SET for key:', params.cacheKey, 'TTL:', ttl, 's');
  } catch (err) {
    console.error('[Cache] Failed to set:', err);
  }
}

/**
 * Check API limits and update usage
 */
async function checkAndUpdateApiUsage(isLive: boolean): Promise<{ allowed: boolean; reason?: string }> {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get limits
    const { data: limits } = await supabase
      .from('flight_api_limits')
      .select('daily_search_cap, daily_booking_cap, is_active')
      .single();

    if (!limits?.is_active) {
      return { allowed: true };
    }

    // Get today's usage
    const { data: usage } = await supabase
      .from('flight_api_usage')
      .select('searches_live, bookings_total')
      .eq('date', today)
      .single();

    const currentSearches = usage?.searches_live || 0;

    if (limits.daily_search_cap && currentSearches >= limits.daily_search_cap) {
      return { allowed: false, reason: 'Daily search limit reached' };
    }

    // Update usage
    if (isLive) {
      await supabase.rpc('increment_flight_api_usage', { is_cached: false });
    } else {
      await supabase.rpc('increment_flight_api_usage', { is_cached: true });
    }

    return { allowed: true };
  } catch (err) {
    console.error('[API Limits] Check failed:', err);
    return { allowed: true }; // Allow on error to not block searches
  }
}

/**
 * Log search request and response to database for debugging
 */
async function logSearch(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  requestId?: string;
  statusCode: number;
  error?: string;
  offersCount: number;
  responseTimeMs: number;
  fromCache?: boolean;
}) {
  try {
    await supabase.from('flight_search_logs').insert({
      origin_iata: params.origin,
      destination_iata: params.destination,
      departure_date: params.departureDate,
      return_date: params.returnDate || null,
      passengers: params.passengers,
      cabin_class: params.cabinClass,
      duffel_request_id: params.requestId || null,
      duffel_status_code: params.statusCode,
      duffel_error: params.error || null,
      offers_count: params.offersCount,
      response_time_ms: params.responseTimeMs,
      environment: DUFFEL_ENV,
    });
  } catch (err) {
    console.error('[Logging] Failed to log search:', err);
  }
}

interface DuffelPassenger {
  type: 'adult' | 'child' | 'infant_without_seat';
}

interface DuffelSlice {
  origin: string;
  destination: string;
  departure_date: string;
}

interface CreateOfferRequestParams {
  slices: DuffelSlice[];
  passengers: DuffelPassenger[];
  cabin_class?: 'economy' | 'premium_economy' | 'business' | 'first';
  max_connections?: number;
}

interface GetOffersParams {
  offer_request_id: string;
  sort?: 'total_amount' | 'total_duration';
  max_offers?: number;
}

interface GetOfferParams {
  offer_id: string;
}

interface CreateOrderParams {
  offer_id: string;
  passengers: Array<{
    id: string;
    title: string;
    gender: string;
    given_name: string;
    family_name: string;
    born_on: string;
    email: string;
    phone_number: string;
  }>;
  payments?: Array<{
    type: 'balance';
    amount: string;
    currency: string;
  }>;
  metadata?: Record<string, string>;
  services?: Array<{
    id: string;
    quantity: number;
  }>;
}

// Helper to make Duffel API requests
async function duffelRequest(
  endpoint: string, 
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<{ data?: unknown; error?: string; status: number }> {
  const apiKey = Deno.env.get('DUFFEL_API_KEY');
  
  if (!apiKey) {
    return { error: 'DUFFEL_API_KEY not configured', status: 500 };
  }

  const url = `${DUFFEL_API_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Duffel] API error:', data);
      return { 
        error: data.errors?.[0]?.message || 'Duffel API error', 
        status: response.status 
      };
    }

    return { data: data.data, status: response.status };
  } catch (err) {
    console.error('[Duffel] Request failed:', err);
    return { error: 'Failed to connect to Duffel API', status: 500 };
  }
}

// Create an offer request (start a search) with caching
async function createOfferRequest(params: CreateOfferRequestParams) {
  console.log('[Duffel] Creating offer request:', JSON.stringify(params));
  const startTime = Date.now();
  
  // Extract search params for logging and caching
  const firstSlice = params.slices[0];
  const returnSlice = params.slices[1];
  const origin = firstSlice?.origin || '';
  const destination = firstSlice?.destination || '';
  const departureDate = firstSlice?.departure_date || '';
  const returnDate = returnSlice?.departure_date;
  const passengerCount = params.passengers?.length || 1;
  const cabinClass = params.cabin_class || 'economy';
  
  // Generate cache key
  const cacheKey = generateCacheKey({
    origin,
    destination,
    departureDate,
    returnDate,
    passengers: passengerCount,
    cabinClass,
  });

  // Check cache first
  const cached = await checkCache(cacheKey);
  if (cached.hit && cached.data) {
    const responseTimeMs = Date.now() - startTime;
    console.log('[Duffel] Serving from cache:', cacheKey);
    
    // Log cached response
    await logSearch({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers: passengerCount,
      cabinClass,
      statusCode: 200,
      offersCount: (cached.data as { offers?: unknown[] }).offers?.length || 0,
      responseTimeMs,
      fromCache: true,
    });

    // Update usage stats
    await checkAndUpdateApiUsage(false); // false = cached

    return {
      ...(cached.data as object),
      fromCache: true,
      environment: DUFFEL_ENV,
    };
  }

  // Check API limits before live call
  const limitsCheck = await checkAndUpdateApiUsage(true); // true = live
  if (!limitsCheck.allowed) {
    return { error: limitsCheck.reason || 'API limit reached' };
  }
  
  // Omit cabin_class so Duffel returns all cabin classes (Economy, Business, First)
  // The frontend groups them as fare variants so users can upgrade within the same flight
  const requestBody: Record<string, unknown> = {
    data: {
      slices: params.slices,
      passengers: params.passengers,
      max_connections: params.max_connections ?? 2,
    }
  };
  const result = await duffelRequest('/air/offer_requests', 'POST', requestBody);

  const responseTimeMs = Date.now() - startTime;

  if (result.error) {
    // Log failed search
    await logSearch({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers: passengerCount,
      cabinClass,
      statusCode: result.status,
      error: result.error,
      offersCount: 0,
      responseTimeMs,
    });
    return { error: result.error };
  }

  const offerRequest = result.data as { 
    id: string; 
    offers: unknown[];
    slices: unknown[];
    passengers: unknown[];
    created_at: string;
  };

  const offersCount = offerRequest.offers?.length || 0;
  console.log('[Duffel] Raw offers count:', offersCount);
  console.log('[Duffel] Environment:', DUFFEL_ENV);
  if (offersCount > 0) {
    const sampleOffer = offerRequest.offers[0] as Record<string, unknown>;
    const sampleSlices = (sampleOffer.slices || []) as Array<Record<string, unknown>>;
    const sampleSegs = sampleSlices[0] ? (sampleSlices[0].segments || []) as unknown[] : [];
    const carrier = sampleSegs.length > 0 ? (sampleSegs[0] as Record<string, unknown>).operating_carrier : null;
    console.log('[Duffel] Sample offer - airline:', JSON.stringify(carrier), 'slices:', sampleSlices.length, 'segments:', sampleSegs.length, 'price:', sampleOffer.total_amount, sampleOffer.total_currency);
  }
  const transformedOffers = transformOffers(offerRequest.offers || []);
  console.log('[Duffel] Offer request created:', offerRequest.id, 'with', offersCount, 'raw offers,', transformedOffers.length, 'transformed');

  // Log successful search
  await logSearch({
    origin,
    destination,
    departureDate,
    returnDate,
    passengers: passengerCount,
    cabinClass,
    requestId: offerRequest.id,
    statusCode: result.status,
    offersCount,
    responseTimeMs,
  });

  const responseData = {
    offer_request_id: offerRequest.id,
    offers: transformedOffers,
    created_at: offerRequest.created_at,
    environment: DUFFEL_ENV,
  };

  // Cache the results (120 seconds default)
  await setCache({
    cacheKey,
    origin,
    destination,
    departureDate,
    returnDate,
    passengers: passengerCount,
    cabinClass,
    offersData: responseData,
    offersCount,
    offerRequestId: offerRequest.id,
  });

  return responseData;
}

// Get offers for an existing offer request
async function getOffers(params: GetOffersParams) {
  console.log('[Duffel] Getting offers for request:', params.offer_request_id);
  
  const queryParams = new URLSearchParams({
    offer_request_id: params.offer_request_id,
    ...(params.sort && { sort: params.sort }),
    ...(params.max_offers && { limit: String(params.max_offers) }),
  });

  const result = await duffelRequest(`/air/offers?${queryParams.toString()}`);

  if (result.error) {
    return { error: result.error };
  }

  const offers = result.data as unknown[];
  console.log('[Duffel] Retrieved', offers.length, 'offers');

  return {
    offers: transformOffers(offers),
    total: offers.length,
  };
}

// Get a single offer by ID
async function getOffer(params: GetOfferParams) {
  console.log('[Duffel] Getting offer:', params.offer_id);
  
  const result = await duffelRequest(`/air/offers/${params.offer_id}`);

  if (result.error) {
    const errStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
    const isNotFound = errStr.includes('not_found') || errStr.includes('Not found') || errStr.includes('does not exist');
    if (isNotFound) {
      console.log('[Duffel] Offer not found (likely expired), returning null offer');
      return { offer: null, expired: true };
    }
    return { error: result.error };
  }

  return {
    offer: transformOffer(result.data),
  };
}

// Create an order (booking) - for test mode only, returns order details
async function createOrder(params: CreateOrderParams) {
  console.log('[Duffel] Creating order for offer:', params.offer_id);
  
  // In test mode, Duffel allows creating orders without real payment
  // In production, use Duffel Links or Payment Intents for checkout
  const result = await duffelRequest('/air/orders', 'POST', {
    data: {
      type: 'instant',
      selected_offers: [params.offer_id],
      passengers: params.passengers,
      payments: params.payments || [],
      metadata: params.metadata || {},
      ...(params.services && params.services.length > 0 ? { services: params.services } : {}),
    }
  });

  if (result.error) {
    return { error: result.error };
  }

  const order = result.data as {
    id: string;
    booking_reference: string;
    created_at: string;
    total_amount: string;
    total_currency: string;
    passengers: unknown[];
    slices: unknown[];
  };

  console.log('[Duffel] Order created:', order.id, 'ref:', order.booking_reference);

  return {
    order_id: order.id,
    booking_reference: order.booking_reference,
    created_at: order.created_at,
    total_amount: order.total_amount,
    total_currency: order.total_currency,
  };
}

/**
 * Parse ISO 8601 duration (e.g. PT20H44M, PT45M, P0DT20H44M0S)
 */
function parseISO8601Duration(dur: string): { hours: number; minutes: number; totalMinutes: number } {
  if (!dur) return { hours: 0, minutes: 0, totalMinutes: 0 };
  let totalMinutes = 0;
  const dayMatch = dur.match(/(\d+)D/);
  const hourMatch = dur.match(/(\d+)H/);
  const minMatch = dur.match(/(\d+)M/);
  if (dayMatch) totalMinutes += parseInt(dayMatch[1]) * 24 * 60;
  if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) totalMinutes += parseInt(minMatch[1]);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, totalMinutes };
}

/**
 * Calculate duration from timestamps as fallback
 */
function calcDurationFromTimestamps(departAt: string, arriveAt: string): { hours: number; minutes: number; totalMinutes: number } {
  try {
    const diff = new Date(arriveAt).getTime() - new Date(departAt).getTime();
    const totalMinutes = Math.max(0, Math.round(diff / 60000));
    return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, totalMinutes };
  } catch {
    return { hours: 0, minutes: 0, totalMinutes: 0 };
  }
}

function readFareBrandName(
  offer: Record<string, unknown>,
  firstSlice: Record<string, unknown> | undefined,
  firstSegment: Record<string, unknown> | undefined,
  passengers: Array<Record<string, unknown>>,
): string {
  const firstSlicePassenger = ((firstSlice?.passengers as Array<Record<string, unknown>> | undefined) || [])[0];
  const firstSegmentPassenger = ((firstSegment?.passengers as Array<Record<string, unknown>> | undefined) || [])[0];
  const firstOfferPassenger = passengers[0];

  // Prefer the most specific passenger-level fare brand first.
  // Duffel often exposes generic cabin marketing labels like "Economy"
  // alongside the actual branded fare like "Basic" or "Main".
  const candidateValues: unknown[] = [
    firstSlicePassenger?.fare_brand_name,
    firstSegmentPassenger?.fare_brand_name,
    firstOfferPassenger?.fare_brand_name,
    offer.fare_brand_name,
    firstSlice?.fare_brand_name,
    firstSlicePassenger?.cabin_class_marketing_name,
    firstOfferPassenger?.cabin_class_marketing_name,
    firstSegmentPassenger?.cabin_class_marketing_name,
    (firstSlice?.cabin as Record<string, unknown> | undefined)?.marketing_name,
    (firstSlicePassenger?.cabin as Record<string, unknown> | undefined)?.marketing_name,
    (firstSegmentPassenger?.cabin as Record<string, unknown> | undefined)?.marketing_name,
    (firstOfferPassenger?.cabin as Record<string, unknown> | undefined)?.marketing_name,
  ];

  for (const candidate of candidateValues) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
}

// Transform Duffel offer to our format
function transformOffer(offer: unknown): DuffelOfferTransformed | null {
  if (!offer || typeof offer !== 'object') return null;
  
  const o = offer as Record<string, unknown>;
  const slices = (o.slices || []) as Array<Record<string, unknown>>;
  const passengers = (o.passengers || []) as Array<Record<string, unknown>>;
  
  // Get first slice for outbound info
  const firstSlice = slices[0];
  if (!firstSlice) return null;
  
  // Flatten ALL slices' segments for round-trip support
  const firstSliceSegments = (firstSlice.segments || []) as Array<Record<string, unknown>>;
  const allSegments: Array<Record<string, unknown>> = [];
  for (const slice of slices) {
    const sliceSegs = (slice.segments || []) as Array<Record<string, unknown>>;
    allSegments.push(...sliceSegs);
  }
  const segments = firstSliceSegments; // outbound-only for departure/arrival metadata
  const allSegs = allSegments; // all slices for full segment list
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  
  if (!firstSegment || !lastSegment) return null;

  // Extract all unique carriers from segments
  const carrierMap = new Map<string, { name: string; code: string; isOperating: boolean }>();
  let operatedBy: string | null = null;
  const firstMarketingCarrier = firstSegment.marketing_carrier as Record<string, string> | undefined;

  for (const seg of segments) {
    const opCarrier = seg.operating_carrier as Record<string, string> | undefined;
    const mkCarrier = seg.marketing_carrier as Record<string, string> | undefined;
    const opCode = opCarrier?.iata_code;
    const mkCode = mkCarrier?.iata_code;

    if (opCode && !carrierMap.has(opCode)) {
      carrierMap.set(opCode, { name: opCarrier?.name || opCode, code: opCode, isOperating: true });
    }
    if (mkCode && !carrierMap.has(mkCode)) {
      carrierMap.set(mkCode, { name: mkCarrier?.name || mkCode, code: mkCode, isOperating: false });
    }
    // Detect codeshare: marketing differs from operating
    if (opCode && mkCode && opCode !== mkCode && !operatedBy) {
      operatedBy = `Operated by ${opCarrier?.name || opCode}`;
    }
  }

  const carriers = Array.from(carrierMap.values());
  // Build display name: max 2 carrier names
  const uniqueNames = [...new Set(carriers.map(c => c.name))];
  let airlineName: string;
  if (uniqueNames.length === 1) {
    airlineName = uniqueNames[0];
  } else if (uniqueNames.length === 2) {
    airlineName = `${uniqueNames[0]} + ${uniqueNames[1]}`;
  } else {
    airlineName = `${uniqueNames[0]} + ${uniqueNames[1]} +${uniqueNames.length - 2} more`;
  }
  const firstCarrier = carriers[0];
  const airlineCode = firstCarrier?.code || 'XX';

  // Extract airports
  const origin = firstSegment.origin as Record<string, string> | undefined;
  const destination = lastSegment.destination as Record<string, string> | undefined;

  // Calculate duration with robust parser
  const rawDuration = firstSlice.duration as string || '';
  let dur = parseISO8601Duration(rawDuration);
  // Fallback: calculate from timestamps if parser returns 0
  if (dur.totalMinutes === 0 && firstSegment.departing_at && lastSegment.arriving_at) {
    dur = calcDurationFromTimestamps(firstSegment.departing_at as string, lastSegment.arriving_at as string);
  }
  const durationFormatted = `${dur.hours}h ${dur.minutes}m`;

  // Get stops + stopDetails with layover durations
  const stops = Math.max(0, segments.length - 1);
  const stopCities: string[] = [];
  const stopDetails: Array<{ code: string; city: string; layoverDuration: string }> = [];
  for (let i = 0; i < segments.length - 1; i++) {
    const segDest = segments[i].destination as Record<string, string> | undefined;
    const code = segDest?.iata_code || '';
    const city = segDest?.city_name || segDest?.name || code;
    stopCities.push(code);
    // Layover = next segment departure - this segment arrival
    let layoverDuration = '';
    try {
      const arriveAt = segments[i].arriving_at as string;
      const departAt = segments[i + 1].departing_at as string;
      if (arriveAt && departAt) {
        const diffMs = new Date(departAt).getTime() - new Date(arriveAt).getTime();
        const layoverMin = Math.max(0, Math.round(diffMs / 60000));
        const lH = Math.floor(layoverMin / 60);
        const lM = layoverMin % 60;
        layoverDuration = `${lH}h ${lM}m`;
      }
    } catch { /* ignore */ }
    stopDetails.push({ code, city, layoverDuration });
  }

  // Baggage info - read from SEGMENTS' passengers (Duffel puts baggages at slice.segment.passengers[].baggages[])
  // Also check offer-level passengers as fallback
  let baggageInfo = 'No bags included';
  let carryOnIncluded = false;
  let checkedBagsIncluded = false;
  let checkedBagQuantity = 0;
  let carryOnQuantity = 0;
  const fareBrandName = readFareBrandName(o, firstSlice, firstSegment, passengers);
  let checkedBagWeightKg: number | null = null;
  let checkedBagWeightLb: number | null = null;
  let carryOnWeightKg: number | null = null;
  let carryOnWeightLb: number | null = null;

  const extractBaggageWeights = (baggages: Array<Record<string, unknown>>) => {
    const checkedBags = baggages.filter(b => b.type === 'checked');
    const carryOn = baggages.filter(b => b.type === 'carry_on');
    carryOnQuantity = carryOn.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    carryOnIncluded = carryOnQuantity > 0;
    checkedBagQuantity = checkedBags.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    checkedBagsIncluded = checkedBagQuantity > 0;
    // Extract weight info from first bag of each type
    if (checkedBags.length > 0) {
      const cb = checkedBags[0];
      if (cb.max_weight_kg) checkedBagWeightKg = Number(cb.max_weight_kg);
      if (cb.max_weight_lb) checkedBagWeightLb = Number(cb.max_weight_lb);
      // Fallback: convert if only one unit present
      if (checkedBagWeightKg && !checkedBagWeightLb) checkedBagWeightLb = Math.round(checkedBagWeightKg * 2.205);
      if (checkedBagWeightLb && !checkedBagWeightKg) checkedBagWeightKg = Math.round(checkedBagWeightLb / 2.205);
    }
    if (carryOn.length > 0) {
      const co = carryOn[0];
      if (co.max_weight_kg) carryOnWeightKg = Number(co.max_weight_kg);
      if (co.max_weight_lb) carryOnWeightLb = Number(co.max_weight_lb);
      if (carryOnWeightKg && !carryOnWeightLb) carryOnWeightLb = Math.round(carryOnWeightKg * 2.205);
      if (carryOnWeightLb && !carryOnWeightKg) carryOnWeightKg = Math.round(carryOnWeightLb / 2.205);
    }
  };

  try {
    // Primary: read from first segment's passengers (where Duffel puts baggage allowances)
    let foundBaggages = false;
    const firstSegPax = (firstSegment.passengers as Array<Record<string, unknown>> | undefined);
    if (firstSegPax && firstSegPax.length > 0) {
      const segPaxFirst = firstSegPax[0];
      const segBaggages = segPaxFirst.baggages as Array<Record<string, unknown>> | undefined;
      if (segBaggages && segBaggages.length > 0) {
        foundBaggages = true;
        extractBaggageWeights(segBaggages);
      }
    }
    // Fallback: offer-level passengers
    if (!foundBaggages) {
      const firstPax = passengers[0];
      if (firstPax) {
        const baggages = firstPax.baggages as Array<Record<string, unknown>> | undefined;
        if (baggages && baggages.length > 0) {
          extractBaggageWeights(baggages);
        }
      }
    }
    // Build display string
    if (carryOnIncluded && checkedBagsIncluded) {
      baggageInfo = `Carry-on + ${checkedBagQuantity} checked bag${checkedBagQuantity > 1 ? 's' : ''}`;
    } else if (checkedBagsIncluded) {
      baggageInfo = `${checkedBagQuantity} checked bag${checkedBagQuantity > 1 ? 's' : ''}`;
    } else if (carryOnIncluded) {
      baggageInfo = 'Carry-on only';
    } else {
      baggageInfo = 'Personal item only';
    }
    console.log(`[Baggage] offer=${(o.id as string)?.slice(-8)} carry=${carryOnQuantity}(${carryOnWeightKg}kg) checked=${checkedBagQuantity}(${checkedBagWeightKg}kg) brand="${fareBrandName}"`);
  } catch (err) {
    console.error('[Baggage] Parse error:', err);
    baggageInfo = 'Varies by fare';
  }

  // Cabin class with segment-level fallback
  let cabinClass = o.cabin_class as string;
  if (!cabinClass) {
    try {
      const segPax = (firstSegment.passengers as Array<Record<string, string>> | undefined);
      cabinClass = segPax?.[0]?.cabin_class || 'economy';
    } catch {
      cabinClass = 'economy';
    }
  }

  // Conditions (cancellation, change)
  const conditions = o.conditions as Record<string, unknown> | undefined;
  // Duffel conditions are objects like { allowed: true, penalty_amount: "0.00", penalty_currency: "USD" }
  // or null if not allowed at all
  const changeCondition = conditions?.change_before_departure as Record<string, unknown> | null | undefined;
  const refundCondition = conditions?.refund_before_departure as Record<string, unknown> | null | undefined;
  const isChangeable = changeCondition ? (changeCondition.allowed !== false) : false;
  const isRefundable = refundCondition ? (refundCondition.allowed !== false) : false;
  const changePenalty = changeCondition?.penalty_amount ? parseFloat(changeCondition.penalty_amount as string) : null;
  const refundPenalty = refundCondition?.penalty_amount ? parseFloat(refundCondition.penalty_amount as string) : null;
  const penaltyCurrency = (changeCondition?.penalty_currency || refundCondition?.penalty_currency || 'USD') as string;

  // Debug logging
  console.log(`[Transform] offer=${(o.id as string)?.slice(-8)} airline=${airlineName}(${airlineCode}) carriers=${carriers.length} segs=${segments.length} stops=${stops} dur="${durationFormatted}" baggage="${baggageInfo}" cabin="${cabinClass}" price=${o.total_amount}`);

  return {
    id: o.id as string,
    airline: airlineName,
    airlineCode,
    flightNumber: `${firstMarketingCarrier?.iata_code || ''}${firstSegment.marketing_carrier_flight_number || ''}`,
    departure: {
      time: formatTime(firstSegment.departing_at as string),
      date: formatDate(firstSegment.departing_at as string),
      city: origin?.city_name || origin?.name || '',
      code: origin?.iata_code || '',
      terminal: firstSegment.origin_terminal as string | undefined,
    },
    arrival: {
      time: formatTime(lastSegment.arriving_at as string),
      date: formatDate(lastSegment.arriving_at as string),
      city: destination?.city_name || destination?.name || '',
      code: destination?.iata_code || '',
      terminal: lastSegment.destination_terminal as string | undefined,
    },
    duration: durationFormatted,
    durationMinutes: dur.totalMinutes,
    stops,
    stopCities,
    stopDetails,
    carriers,
    operatedBy,
    price: parseFloat(o.total_amount as string) || 0,
    currency: o.total_currency as string || 'USD',
    pricePerPerson: parseFloat(o.total_amount as string) / Math.max(passengers.length, 1),
    cabinClass,
    fareBrandName: fareBrandName || cabinClass,
    baggageIncluded: baggageInfo,
    isRefundable,
    conditions: {
      changeable: isChangeable,
      refundable: isRefundable,
      changePenalty,
      refundPenalty,
      penaltyCurrency,
    },
    baggageDetails: {
      carryOnIncluded,
      carryOnQuantity,
      checkedBagsIncluded,
      checkedBagQuantity,
    } as {
      carryOnIncluded: boolean;
      carryOnQuantity: number;
      carryOnWeightKg?: number | null;
      carryOnWeightLb?: number | null;
      checkedBagsIncluded: boolean;
      checkedBagQuantity: number;
      checkedBagWeightKg?: number | null;
      checkedBagWeightLb?: number | null;
      [key: string]: unknown;
    },
    segments: allSegs.map(seg => transformSegment(seg)),
    owner: firstCarrier,
    expiresAt: o.expires_at as string,
    passengers: passengers.length,
  };
}

function transformSegment(segment: Record<string, unknown>) {
  const operatingCarrier = segment.operating_carrier as Record<string, string> | undefined;
  const marketingCarrier = segment.marketing_carrier as Record<string, string> | undefined;
  const origin = segment.origin as Record<string, string> | undefined;
  const destination = segment.destination as Record<string, string> | undefined;
  const aircraft = segment.aircraft as Record<string, string> | undefined;

  const rawDuration = segment.duration as string || '';
  const dur = parseISO8601Duration(rawDuration);

  return {
    id: segment.id as string,
    departingAt: segment.departing_at as string,
    arrivingAt: segment.arriving_at as string,
    origin: {
      code: origin?.iata_code || '',
      name: origin?.name || '',
      city: origin?.city_name || '',
      terminal: segment.origin_terminal as string | undefined,
    },
    destination: {
      code: destination?.iata_code || '',
      name: destination?.name || '',
      city: destination?.city_name || '',
      terminal: segment.destination_terminal as string | undefined,
    },
    operatingCarrier: operatingCarrier?.name || '',
    operatingCarrierCode: operatingCarrier?.iata_code || '',
    marketingCarrier: marketingCarrier?.name || '',
    marketingCarrierCode: marketingCarrier?.iata_code || '',
    flightNumber: `${marketingCarrier?.iata_code || ''}${segment.marketing_carrier_flight_number || ''}`,
    aircraft: aircraft?.name || 'Unknown',
    duration: `${dur.hours}h ${dur.minutes}m`,
    cabinClass: (segment.passengers as Array<Record<string, string>> | undefined)?.[0]?.cabin_class || 'economy',
  };
}

function transformOffers(offers: unknown[]): DuffelOfferTransformed[] {
  const transformed = offers
    .map(o => transformOffer(o))
    .filter((o): o is DuffelOfferTransformed => o !== null);

  const buildFareVariantKey = (offer: DuffelOfferTransformed) => {
    const bag = offer.baggageDetails as Record<string, unknown>;
    const conditions = offer.conditions;
    return [
      offer.cabinClass,
      (offer.fareBrandName || offer.cabinClass).toLowerCase(),
      offer.baggageIncluded || '',
      bag.carryOnIncluded ? 'co1' : 'co0',
      bag.carryOnQuantity,
      bag.carryOnWeightKg ?? '',
      bag.carryOnWeightLb ?? '',
      bag.checkedBagsIncluded ? 'cb1' : 'cb0',
      bag.checkedBagQuantity,
      bag.checkedBagWeightKg ?? '',
      bag.checkedBagWeightLb ?? '',
      conditions.changeable ? 'chg1' : 'chg0',
      conditions.changePenalty ?? '',
      conditions.refundable ? 'ref1' : 'ref0',
      conditions.refundPenalty ?? '',
      conditions.penaltyCurrency || '',
    ].join('::');
  };

  // Group by flight fingerprint (same itinerary, different fares)
  // For round-trips, include ALL segment flight numbers so different return legs stay separate
  const groups = new Map<string, DuffelOfferTransformed[]>();
  for (const offer of transformed) {
    // Build fingerprint from all segment flight numbers + times to uniquely identify the itinerary
    const segFP = offer.segments.map((s: any) => `${s.marketingCarrierCode}${s.flightNumber}-${s.departingAt}`).join('|');
    const flightFP = `${offer.airlineCode}-${segFP}`;
    const group = groups.get(flightFP) || [];
    // Avoid only truly identical duplicates; preserve same-price Duffel fare bundles with different bags/rules
    const offerVariantKey = buildFareVariantKey(offer);
    const exactDup = group.some((g) => g.id === offer.id || buildFareVariantKey(g) === offerVariantKey);
    if (!exactDup) {
      group.push(offer);
      groups.set(flightFP, group);
    }
  }

  // For each group, deduplicate by cabinClass+fareBrandName (keep cheapest), then attach as fare variants
  const result: DuffelOfferTransformed[] = [];
  for (const group of groups.values()) {
    // Sort by price ascending
    group.sort((a, b) => a.price - b.price);

    // Deduplicate: keep only the cheapest offer per materially distinct fare bundle
    const seen = new Map<string, DuffelOfferTransformed>();
    for (const g of group) {
      const key = buildFareVariantKey(g);
      if (!seen.has(key)) {
        seen.set(key, g);
      }
    }
    const dedupedGroup = [...seen.values()];
    dedupedGroup.sort((a, b) => a.price - b.price);

    const primary = dedupedGroup[0];
    // Attach all fare variants (including primary) as fareVariants
    const rawVariants = dedupedGroup.map(g => ({
      id: g.id,
      fareBrandName: g.fareBrandName || g.cabinClass,
      price: g.price,
      pricePerPerson: g.pricePerPerson,
      currency: g.currency,
      conditions: g.conditions,
      baggageDetails: g.baggageDetails,
      baggageIncluded: g.baggageIncluded,
      cabinClass: g.cabinClass,
    }));

    // Smart-label variants that share the same fareBrandName
    if (rawVariants.length > 1) {
      const nameCount = new Map<string, number>();
      for (const v of rawVariants) {
        const n = (v.fareBrandName || '').toLowerCase();
        nameCount.set(n, (nameCount.get(n) || 0) + 1);
      }
      // For duplicated names, assign tiered labels based on features
      const nameIndex = new Map<string, number>();
      for (const v of rawVariants) {
        const n = (v.fareBrandName || '').toLowerCase();
        if ((nameCount.get(n) || 0) > 1) {
          const idx = nameIndex.get(n) || 0;
          nameIndex.set(n, idx + 1);
          // Derive label from features: cheapest with least features = Basic, next = Standard, etc.
          const tierLabels = ['Basic', 'Standard', 'Flexible', 'Premium'];
          v.fareBrandName = tierLabels[idx] || `${v.fareBrandName} ${idx + 1}`;
        }
      }
    }

    primary.fareVariants = rawVariants;
    result.push(primary);
  }

  console.log(`[Transform] ${offers.length} raw -> ${transformed.length} transformed -> ${result.length} grouped (${groups.size} unique flights)`);
  return result;
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '--:--';
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

interface DuffelOfferTransformed {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departure: {
    time: string;
    date: string;
    city: string;
    code: string;
    terminal?: string;
  };
  arrival: {
    time: string;
    date: string;
    city: string;
    code: string;
    terminal?: string;
  };
  duration: string;
  durationMinutes: number;
  stops: number;
  stopCities: string[];
  stopDetails: Array<{ code: string; city: string; layoverDuration: string }>;
  carriers: Array<{ name: string; code: string; isOperating: boolean }>;
  operatedBy: string | null;
  price: number;
  currency: string;
  pricePerPerson: number;
  cabinClass: string;
  fareBrandName: string | null;
  baggageIncluded: string;
  isRefundable: boolean;
  conditions: {
    changeable: boolean;
    refundable: boolean;
    changePenalty: number | null;
    refundPenalty: number | null;
    penaltyCurrency: string;
  };
  baggageDetails: {
    carryOnIncluded: boolean;
    carryOnQuantity: number;
    checkedBagsIncluded: boolean;
    checkedBagQuantity: number;
  };
  segments: unknown[];
  owner: { name: string; code: string; isOperating: boolean } | undefined;
  expiresAt: string;
  passengers: number;
  fareVariants?: Array<{
    id: string;
    fareBrandName: string | null;
    price: number;
    currency: string;
    conditions: { changeable: boolean; refundable: boolean; changePenalty: number | null; refundPenalty: number | null; penaltyCurrency: string };
    baggageDetails: { carryOnIncluded: boolean; carryOnQuantity: number; carryOnWeightKg?: number | null; carryOnWeightLb?: number | null; checkedBagsIncluded: boolean; checkedBagQuantity: number; checkedBagWeightKg?: number | null; checkedBagWeightLb?: number | null };
    baggageIncluded: string;
    cabinClass: string;
  }>;
}

// ---- Available Services ----
interface GetAvailableServicesParams {
  offer_id: string;
}

async function getAvailableServices(params: GetAvailableServicesParams) {
  console.log('[Duffel] Fetching available services for offer:', params.offer_id);

  const result = await duffelRequest(`/air/offers/${params.offer_id}/available_services`, 'GET');

  // If the offer expired or doesn't support services, return empty gracefully
  if (result.error) {
    const errStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
    const isNotFound = errStr.includes('not_found') || errStr.includes('Not found') || errStr.includes('does not exist');
    if (isNotFound) {
      console.log('[Duffel] Offer not found for available_services (likely expired), returning empty');
      return { services: [], grouped: {}, total: 0 };
    }
    return { error: result.error };
  }

  const services = result.data as Array<{
    id: string;
    type: string;
    maximum_quantity: number;
    total_amount: string;
    total_currency: string;
    passenger_ids: string[];
    segment_ids: string[];
    metadata?: Record<string, unknown>;
  }>;

  // Group by type
  const grouped: Record<string, typeof services> = {};
  for (const svc of (services || [])) {
    const t = svc.type || 'other';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(svc);
  }

  return { services: services || [], grouped, total: (services || []).length };
}

// ---- Seat Maps ----
interface GetSeatMapsParams {
  offer_id: string;
}

async function getSeatMaps(params: GetSeatMapsParams) {
  console.log('[Duffel] Fetching seat maps for offer:', params.offer_id);

  const result = await duffelRequest(`/air/seat_maps?offer_id=${params.offer_id}`, 'GET');

  if (result.error) {
    const errStr = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
    const isNotFound = errStr.includes('not_found') || errStr.includes('Not found') || errStr.includes('does not exist');
    if (isNotFound) {
      console.log('[Duffel] Seat maps not available for this offer (expired or unsupported)');
      return { seat_maps: [], available: false };
    }
    return { error: result.error };
  }

  const seatMaps = (Array.isArray(result.data) ? result.data : []) as Array<{
    id: string;
    slice_id: string;
    segment_id: string;
    cabins: Array<{
      cabin_class: string;
      deck: number;
      wings: { first_row_index: number; last_row_index: number };
      rows: Array<{
        sections: Array<{
          elements: Array<{
            type: string; // 'seat' | 'bassinet' | 'empty' | 'exit_row' | 'lavatory' | 'galley'
            designator?: string; // e.g. '14A'
            name?: string;
            disclosures?: string[];
            available_services?: Array<{
              id: string;
              passenger_id: string;
              total_amount: string;
              total_currency: string;
            }>;
          }>;
        }>;
      }>;
    }>;
  }>;

  if (!seatMaps || seatMaps.length === 0) {
    console.log('[Duffel] No seat maps returned (airline may not support seat selection)');
    return { seat_maps: [], available: false };
  }

  console.log(`[Duffel] Got ${seatMaps.length} seat map(s)`);

  // Transform to a cleaner format
  const transformed = seatMaps.map(sm => ({
    id: sm.id,
    slice_id: sm.slice_id,
    segment_id: sm.segment_id,
    cabins: sm.cabins.map(cabin => ({
      cabin_class: cabin.cabin_class,
      deck: cabin.deck,
      wings: cabin.wings,
      rows: cabin.rows.map((row, rowIdx) => ({
        rowNumber: rowIdx + 1,
        sections: row.sections.map(section => ({
          elements: section.elements.map(el => ({
            type: el.type,
            designator: el.designator || null,
            name: el.name || null,
            disclosures: el.disclosures || [],
            available_services: (el.available_services || []).map(svc => ({
              id: svc.id,
              passenger_id: svc.passenger_id,
              price: parseFloat(svc.total_amount),
              currency: svc.total_currency,
            })),
            is_available: el.type === 'seat' && (el.available_services || []).length > 0,
          })),
        })),
      })),
    })),
  }));

  return { seat_maps: transformed, available: true };
}

function validateGetSeatMaps(p: Record<string, unknown>): string | null {
  if (!p.offer_id || typeof p.offer_id !== 'string') return 'offer_id is required';
  return null;
}

// ---- Input validation helpers ----
const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_CABIN = new Set(['economy', 'premium_economy', 'business', 'first']);
const VALID_PAX_TYPE = new Set(['adult', 'child', 'infant_without_seat']);

function validateCreateOfferRequest(p: Record<string, unknown>): string | null {
  const slices = p.slices as unknown[];
  if (!Array.isArray(slices) || slices.length < 1 || slices.length > 6) return 'slices must be an array of 1-6 items (supports multi-city)';
  for (const s of slices) {
    const sl = s as Record<string, string>;
    if (!sl.origin || !IATA_RE.test(sl.origin)) return 'Invalid origin IATA code';
    if (!sl.destination || !IATA_RE.test(sl.destination)) return 'Invalid destination IATA code';
    if (!sl.departure_date || !DATE_RE.test(sl.departure_date)) return 'Invalid departure_date format';
  }
  const passengers = p.passengers as unknown[];
  if (!Array.isArray(passengers) || passengers.length < 1 || passengers.length > 9) return 'passengers must be 1-9';
  for (const px of passengers) {
    const pxObj = px as Record<string, string>;
    if (!VALID_PAX_TYPE.has(pxObj.type)) return 'Invalid passenger type';
  }
  if (p.cabin_class && !VALID_CABIN.has(p.cabin_class as string)) return 'Invalid cabin_class';
  return null;
}

function validateGetOffers(p: Record<string, unknown>): string | null {
  if (typeof p.offer_request_id !== 'string' || !p.offer_request_id) return 'offer_request_id required';
  return null;
}

function validateGetOffer(p: Record<string, unknown>): string | null {
  if (typeof p.offer_id !== 'string' || !p.offer_id) return 'offer_id required';
  return null;
}

function validateGetAvailableServices(p: Record<string, unknown>): string | null {
  if (typeof p.offer_id !== 'string' || !p.offer_id) return 'offer_id required';
  return null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
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
    const { action, ...params } = await req.json();

    console.log('[Duffel] Action:', action);

    // Validate action
    if (typeof action !== 'string' || !['createOfferRequest', 'getOffers', 'getOffer', 'createOrder', 'getAvailableServices', 'getSeatMaps'].includes(action)) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate params per action
    let validationError: string | null = null;
    if (action === 'createOfferRequest') validationError = validateCreateOfferRequest(params);
    else if (action === 'getOffers') validationError = validateGetOffers(params);
    else if (action === 'getOffer') validationError = validateGetOffer(params);
    else if (action === 'getAvailableServices') validationError = validateGetAvailableServices(params);
    else if (action === 'getSeatMaps') validationError = validateGetSeatMaps(params);

    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'createOfferRequest':
        result = await createOfferRequest(params as CreateOfferRequestParams);
        break;

      case 'getOffers':
        result = await getOffers(params as GetOffersParams);
        break;

      case 'getOffer':
        result = await getOffer(params as GetOfferParams);
        break;

      case 'createOrder':
        result = await createOrder(params as CreateOrderParams);
        break;

      case 'getAvailableServices':
        result = await getAvailableServices(params as GetAvailableServicesParams);
        break;

      case 'getSeatMaps':
        result = await getSeatMaps(params as GetSeatMapsParams);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if ('error' in result && result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[Duffel] Handler error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
