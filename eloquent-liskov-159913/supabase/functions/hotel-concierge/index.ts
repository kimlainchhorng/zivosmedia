/**
 * hotel-concierge — Natural-language hotel ranking via Anthropic Claude.
 *
 * POST { prompt: string, candidate_ids?: string[] (optional, defaults to all
 *   active lodging properties), max?: number (default 5) }
 *
 * Returns: { picks: Array<{ id, score (0-100), reason }>, narrator: string }
 *
 * Uses Claude Haiku 4.5 for sub-second response. Anonymous-friendly (no auth
 * required) but rate-limited.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { rateLimitDb } from "../_shared/rateLimiter.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const LODGING_CATEGORIES = [
  "hotel", "resort", "guesthouse", "bed_and_breakfast", "hostel", "boutique_hotel",
  "lodge", "villa", "homestay", "serviced_apartment",
];

interface ConciergePick {
  id: string;
  score: number;
  reason: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Service not configured" }, 500);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  // Rate-limit per IP — 12 prompts / hour is plenty for genuine use.
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "anon";
  const rl = await rateLimitDb(ip, "hotel-concierge", { max: 12, windowSec: 3600 });
  if (!rl.allowed) return json({ error: "Too many requests, please try again later" }, 429);

  let body: { prompt?: string; candidate_ids?: string[]; max?: number };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const prompt = (body.prompt || "").trim();
  if (prompt.length < 3 || prompt.length > 500) {
    return json({ error: "Prompt must be 3–500 characters" }, 400);
  }
  const max = Math.max(1, Math.min(10, body.max ?? 5));

  // Pull candidate hotels with the data Claude needs to rank.
  let q = supabase
    .from("store_profiles")
    .select(`
      id, name, category, address, description,
      lodge_property_profile (
        popular_amenities, facilities, languages, meal_plans,
        cancellation_policy, check_in_from, check_out_until,
        property_highlights, nearby
      ),
      lodge_rooms (
        base_rate_cents, max_guests, breakfast_included, is_active
      )
    `)
    .in("category", LODGING_CATEGORIES)
    .eq("setup_complete", true)
    .limit(60);
  if (Array.isArray(body.candidate_ids) && body.candidate_ids.length > 0) {
    q = q.in("id", body.candidate_ids);
  }
  const { data: stores, error: storeErr } = await q;
  if (storeErr) return json({ error: storeErr.message }, 500);
  const candidates = (stores ?? []) as any[];
  if (candidates.length === 0) return json({ picks: [], narrator: "No properties match yet." });

  // Compress candidates into a small JSON shape Claude can scan cheaply.
  const compact = candidates.map((s) => {
    const profile = s.lodge_property_profile?.[0] || {};
    const rooms = (s.lodge_rooms || []).filter((r: any) => r.is_active !== false);
    const minPrice = rooms.length
      ? Math.min(...rooms.map((r: any) => Number(r.base_rate_cents) || 0).filter((p: number) => p > 0))
      : 0;
    const amenities = Array.from(new Set([
      ...(profile.popular_amenities || []),
      ...(profile.facilities || []),
    ])).slice(0, 12);
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      address: s.address,
      summary: (s.description || "").slice(0, 220),
      min_price_per_night_usd: minPrice ? Math.round(minPrice / 100) : null,
      amenities,
      languages: (profile.languages || []).slice(0, 4),
      breakfast: rooms.some((r: any) => r.breakfast_included),
      cancellation: profile.cancellation_policy || null,
      nearby: (profile.nearby || []).slice(0, 4),
    };
  });

  const systemPrompt = `You are a friendly travel concierge for ZIVO, a Cambodia-focused booking app.
Rank the candidate properties for the user's request. Reply in STRICT JSON only — no prose, no markdown fences. Schema:
{
  "narrator": "<one sentence summarising the picks for the user, <= 140 chars, no IDs>",
  "picks": [
    { "id": "<store id>", "score": <0-100 int>, "reason": "<<= 110 chars rationale citing concrete features>" }
  ]
}
Rules:
- Return ${max} picks max, ordered best first. If fewer obviously match, return fewer.
- Use only IDs that appear in the candidate list.
- Reasons must reference REAL attributes from the candidate (price, amenity, location, language, breakfast, etc.). No marketing fluff, no invented facts.
- If price is part of the request and known, mention it.
- If nothing fits, set picks=[] and narrator="No exact match — try broader filters.".`;

  const userMessage = `User request: "${prompt}"

Candidates (JSON):
${JSON.stringify(compact)}`;

  // Call Claude.
  let claudeRaw: string;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return json({ error: "AI provider error", detail: errText.slice(0, 200) }, 502);
    }
    const payload = await res.json();
    claudeRaw = payload?.content?.[0]?.text || "";
  } catch (e) {
    return json({ error: "AI call failed", detail: String(e).slice(0, 200) }, 502);
  }

  // Parse JSON, defensively stripping any code fences.
  const cleaned = claudeRaw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  let parsed: { narrator?: string; picks?: ConciergePick[] };
  try { parsed = JSON.parse(cleaned); } catch { return json({ error: "AI response unparseable", raw: cleaned.slice(0, 300) }, 502); }

  const validIds = new Set(compact.map((c) => c.id));
  const picks = (parsed.picks || [])
    .filter((p) => p && validIds.has(p.id))
    .slice(0, max)
    .map((p) => ({
      id: p.id,
      score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 0))),
      reason: String(p.reason || "").slice(0, 200),
    }));

  return json({
    picks,
    narrator: String(parsed.narrator || "").slice(0, 200),
  });
});
