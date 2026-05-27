/**
 * hotel-ask — Property-grounded Q&A for a single hotel detail page.
 *
 * POST { store_id: string, question: string, history?: Array<{role, content}> }
 * Returns: { answer: string }
 *
 * Calls Anthropic Claude Haiku with the hotel's full live data injected as
 * system context (rooms, amenities, policies, location, recent reviews).
 * Stateless per-call — caller passes prior turns in `history`.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { rateLimitDb } from "../_shared/rateLimiter.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (p: unknown, status = 200) =>
  new Response(JSON.stringify(p), { status, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Service not configured" }, 500);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "anon";
  const rl = await rateLimitDb(ip, "hotel-ask", { max: 30, windowSec: 600 });
  if (!rl.allowed) return json({ error: "Slow down — please try again in a few minutes" }, 429);

  let body: {
    store_id?: string;
    question?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const storeId = (body.store_id || "").trim();
  const question = (body.question || "").trim();
  if (!storeId) return json({ error: "store_id required" }, 400);
  if (question.length < 2 || question.length > 400) return json({ error: "Question must be 2-400 characters" }, 400);

  const history = Array.isArray(body.history)
    ? body.history.slice(-10).filter((m) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0,
      )
    : [];

  // Pull the live aggregate so Claude has the same data the user sees on screen.
  const { data: detail, error: detailErr } = await sb.rpc("get_hotel_detail", {
    p_store_id: storeId, p_check_in: null, p_check_out: null,
  });
  if (detailErr) return json({ error: detailErr.message }, 500);
  if (!detail || !detail.store) return json({ error: "Hotel not found" }, 404);

  // Compress to keep tokens cheap.
  const store = detail.store || {};
  const profile = detail.profile || {};
  const rooms: any[] = Array.isArray(detail.rooms) ? detail.rooms : [];
  const promos: any[] = Array.isArray(detail.promotions) ? detail.promotions : [];
  const reviewItems: any[] = detail.reviews?.items || [];
  const reviewStats = detail.reviews?.stats || null;

  const facts = {
    name: store.name,
    category: store.category,
    address: store.address,
    description: (store.description || "").slice(0, 500),
    coordinates: typeof store.latitude === "number" && typeof store.longitude === "number"
      ? { lat: store.latitude, lng: store.longitude } : null,
    phone: store.phone,
    check_in_from: profile.check_in_from || null,
    check_in_until: profile.check_in_until || null,
    check_out_from: profile.check_out_from || null,
    check_out_until: profile.check_out_until || null,
    languages: profile.languages || [],
    popular_amenities: profile.popular_amenities || [],
    facilities: profile.facilities || [],
    meal_plans: profile.meal_plans || [],
    cancellation_policy: profile.cancellation_policy || null,
    pet_policy: profile.pet_policy || null,
    child_policy: profile.child_policy || null,
    house_rules: profile.house_rules || null,
    payment_methods: profile.payment_methods || [],
    nearby: profile.nearby || [],
    rooms: rooms.slice(0, 12).map((r: any) => ({
      name: r.name,
      type: r.room_type,
      beds: r.beds,
      max_guests: r.max_guests,
      base_rate_usd: r.base_rate_cents ? Math.round(r.base_rate_cents / 100) : null,
      breakfast_included: !!r.breakfast_included,
      smoking: r.smoking_allowed ?? null,
      ac: r.ac ?? null,
    })),
    active_promotions: promos.map((p: any) => ({
      name: p.name, type: p.promo_type, value: p.discount_value, min_nights: p.min_nights, max_nights: p.max_nights,
    })),
    review_stats: reviewStats ? {
      count: Number(reviewStats.count) || 0,
      avg: reviewStats.avg ? Number(reviewStats.avg) : 0,
      sub: {
        cleanliness: reviewStats.cleanliness ? Number(reviewStats.cleanliness) : null,
        comfort: reviewStats.comfort ? Number(reviewStats.comfort) : null,
        location: reviewStats.location_score ? Number(reviewStats.location_score) : null,
        staff: reviewStats.staff ? Number(reviewStats.staff) : null,
        value: reviewStats.value ? Number(reviewStats.value) : null,
      },
    } : null,
    recent_reviews: reviewItems.slice(0, 5).map((r: any) => ({
      rating: r.rating,
      title: r.title,
      body: (r.body || "").slice(0, 240),
      date: r.created_at,
    })),
  };

  const systemPrompt = `You are the on-page assistant for a hotel listing on ZIVO. Answer the user's question using ONLY the FACTS JSON below.

FACTS:
${JSON.stringify(facts)}

Rules:
- Be concise (1-3 short sentences). No greetings, no "as an AI", no marketing language.
- Cite concrete attributes (price, time, distance, amenity name, language, etc).
- If the data does not contain the answer, say so plainly: e.g. "I don't have that detail — try contacting the property" and reference how to (phone if available, or the on-page Live Chat / Share-to-chat).
- Currency is USD. Times are 24h.
- Never invent facts that aren't in FACTS. If a number isn't there, say "not listed".
- If asked about availability for specific dates, say availability depends on the dates and direct them to use the Check Availability button.
- For policy questions (cancellation, pets, children, smoking, parties), quote the policy concisely.
- Reply in the user's question language when possible.`;

  const messages = [
    ...history,
    { role: "user", content: question },
  ];

  let answer = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 350,
        temperature: 0.2,
        system: systemPrompt,
        messages,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return json({ error: "AI provider error", detail: errText.slice(0, 200) }, 502);
    }
    const payload = await res.json();
    answer = payload?.content?.[0]?.text || "";
  } catch (e) {
    return json({ error: "AI call failed", detail: String(e).slice(0, 200) }, 502);
  }

  return json({ answer: answer.trim() });
});
