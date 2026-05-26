/**
 * Affiliate tracking — logs clicks to Supabase affiliate_click_logs table
 */
import { supabase } from "@/integrations/supabase/client";

export interface AffiliateClick {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  flightId: string;
  airline: string;
  airlineCode: string;
  origin: string;
  destination: string;
  price: number;
  passengers: number;
  cabinClass: string;
  affiliatePartner: string;
  referralUrl: string;
  userAgent: string;
  source: string;
  ctaType?: 'top_cta' | 'result_card' | 'sticky_cta' | 'compare_prices' | 'no_results_fallback' | 'partner_selector' | 'exit_intent' | 'cross_sell' | 'popular_route' | 'trending_deal';
  serviceType?: 'flights' | 'hotels' | 'car_rental' | 'activities' | 'transfers' | 'esim' | 'luggage' | 'compensation';
  device?: 'mobile' | 'desktop' | 'tablet';
  route?: string;
  abExperiments?: Record<string, string>;
}

export const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("affiliate_session_id");
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("affiliate_session_id", sessionId);
  }
  return sessionId;
};

export const getDeviceType = (): 'mobile' | 'desktop' | 'tablet' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

export const trackAffiliateClick = (data: Omit<AffiliateClick, "id" | "timestamp" | "sessionId" | "userAgent" | "device" | "abExperiments">) => {
  const sessionId = getSessionId();
  const device = getDeviceType();
  const route = data.origin && data.destination ? `${data.origin}-${data.destination}` : undefined;

  const click: AffiliateClick = {
    ...data,
    id: `click_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date(),
    sessionId,
    userAgent: navigator.userAgent,
    device,
    route,
    abExperiments: {},
  };

  // Log to Supabase (fire-and-forget)
  supabase.from("affiliate_click_logs").insert({
    session_id: sessionId,
    partner_id: data.affiliatePartner,
    partner_name: data.affiliatePartner,
    product: data.serviceType || "flights",
    page_source: data.source || "unknown",
    destination_url: data.referralUrl,
    final_url: data.referralUrl,
    subid: sessionId,
    device_type: device,
    user_agent: navigator.userAgent,
    user_id: data.userId || null,
    utm_source: "hizovo",
    utm_medium: "affiliate",
    utm_campaign: "travel",
  }).then(({ error }) => {
    if (error) console.warn("[AffiliateTracking] Log error:", error);
  });

  return click;
};

export const trackPageView = (page: string, _metadata?: Record<string, any>) => {
  // Log to analytics_events table
  supabase.from("analytics_events").insert({
    event_name: "page_view",
    page,
    session_id: getSessionId(),
    device_type: getDeviceType(),
  }).then(({ error }) => {
    if (error) console.warn("[AffiliateTracking] Page view log error:", error);
  });
};

export const getAffiliateClicks = async (): Promise<AffiliateClick[]> => {
  const sessionId = getSessionId();
  const { data } = await supabase
    .from("affiliate_click_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []).map((c: any) => ({
    id: c.id,
    timestamp: new Date(c.created_at),
    sessionId: c.session_id,
    flightId: "",
    airline: "",
    airlineCode: "",
    origin: "",
    destination: "",
    price: 0,
    passengers: 1,
    cabinClass: "economy",
    affiliatePartner: c.partner_name,
    referralUrl: c.destination_url,
    userAgent: c.user_agent || "",
    source: c.page_source,
    device: c.device_type as any,
    serviceType: c.product as any,
  }));
};

export const buildAffiliateUrl = (params: {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  partner?: string;
}): string => {
  const { origin, destination, departDate, returnDate, passengers, cabinClass, partner = "skyscanner" } = params;
  const searchSessionId = getSessionId();
  const trackingParams = `utm_source=hizovo&utm_medium=affiliate&utm_campaign=travel&subid=${searchSessionId}`;

  switch (partner) {
    case "skyscanner": {
      const dateFormatted = departDate.replace(/-/g, "").substring(2);
      let url = `https://www.skyscanner.com/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${dateFormatted}/`;
      if (returnDate) url += `${returnDate.replace(/-/g, "").substring(2)}/`;
      url += `?adultsv2=${passengers}&cabinclass=${cabinClass}&${trackingParams}`;
      return url;
    }
    case "kayak":
      return `https://www.kayak.com/flights/${origin}-${destination}/${departDate}${returnDate ? `/${returnDate}` : ""}/${passengers}adults?sort=bestflight_a&fs=cabin=${cabinClass}&${trackingParams}`;
    case "google_flights":
      return `https://www.google.com/travel/flights?q=flights%20from%20${origin}%20to%20${destination}%20on%20${departDate}&curr=USD&${trackingParams}`;
    default:
      return `https://www.skyscanner.com/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${departDate.replace(/-/g, "").substring(2)}/?adultsv2=${passengers}&${trackingParams}`;
  }
};

const COMMISSION_RATES = {
  flights: { type: 'flat' as const, avg: 6 },
  hotels: { type: 'percent' as const, rate: 0.04 },
  car_rental: { type: 'percent' as const, rate: 0.02 },
  activities: { type: 'percent' as const, rate: 0.05 },
  transfers: { type: 'percent' as const, rate: 0.05 },
  esim: { type: 'percent' as const, rate: 0.12 },
  luggage: { type: 'percent' as const, rate: 0.08 },
  compensation: { type: 'percent' as const, rate: 0.25 },
};

export const getAffiliateAnalytics = async () => {
  const clicks = await getAffiliateClicks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayClicks = clicks.filter(c => new Date(c.timestamp) >= today);

  const totalRevenue = clicks.reduce((sum, c) => {
    const config = COMMISSION_RATES[(c.serviceType || 'flights') as keyof typeof COMMISSION_RATES] || COMMISSION_RATES.flights;
    return sum + (config.type === 'flat' ? config.avg : c.price * (config as any).rate);
  }, 0);

  return {
    totalClicks: clicks.length,
    todayClicks: todayClicks.length,
    weekClicks: clicks.length,
    monthClicks: clicks.length,
    totalRevenue,
    todayRevenue: 0,
    avgOrderValue: 0,
    topAirlines: [] as [string, number][],
    topRoutes: [] as [string, number][],
    clicksByPartner: {} as Record<string, number>,
    clicksByCTA: {} as Record<string, number>,
    clicksByDevice: {} as Record<string, number>,
    conversionRate: 0,
    resultsViews: 0,
    recentClicks: clicks.slice(0, 10),
  };
};
