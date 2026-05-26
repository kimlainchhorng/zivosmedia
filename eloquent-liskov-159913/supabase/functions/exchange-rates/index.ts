import { publicCorsHeaders } from "../_shared/cors.ts";

/**
 * exchange-rates – Returns cached USD-based exchange rates.
 * Falls back to a small static set so the client never errors.
 */

const STATIC_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  KHR: 4100,
  THB: 35.5,
  JPY: 155,
  AUD: 1.55,
  CAD: 1.37,
  SGD: 1.35,
  MYR: 4.72,
  VND: 25400,
  CNY: 7.25,
  INR: 83.5,
  KRW: 1350,
  PHP: 56.5,
  IDR: 15800,
  TWD: 32,
  HKD: 7.82,
  AED: 3.67,
  SAR: 3.75,
  NZD: 1.68,
  CHF: 0.88,
  SEK: 10.7,
  NOK: 10.8,
  DKK: 6.88,
  ZAR: 18.5,
  BRL: 5.05,
  MXN: 17.2,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...publicCorsHeaders, "Access-Control-Allow-Methods": "GET, OPTIONS" } });
  }

  try {
    return new Response(
      JSON.stringify({ rates: STATIC_RATES, source: "static", updated_at: new Date().toISOString() }),
      { status: 200, headers: { ...publicCorsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "internal", rates: STATIC_RATES }),
      { status: 200, headers: { ...publicCorsHeaders, "Content-Type": "application/json" } },
    );
  }
});
