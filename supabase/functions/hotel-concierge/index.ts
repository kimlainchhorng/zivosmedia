/**
 * hotel-concierge — Natural-language hotel ranking via AI provider.
 *
 * POST { prompt: string, candidate_ids?: string[] (optional, defaults to all
 *   active lodging properties), max?: number (default 5), provider?: "auto" | "deepseek" | "claude", model?: string }
 *
 * Returns: { picks: Array<{ id, score (0-100), reason }>, narrator: string }
 *
 * DeepSeek is used first by default. Claude is the fallback.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { rateLimitDb } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const DEEPSEEK_MODELS = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);
const CLAUDE_MODELS = new Set(["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-7", "claude-opus-4-8", "claude-haiku-4-5"]);
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEFAULT_CLAUDE_MODEL = "claude-haiku-4-5-20251001";

type AiProvider = "deepseek" | "claude" | "auto";

type Body = {
  prompt?: string;
  candidate_ids?: string[];
  max?: number;
  provider?: "deepseek" | "claude" | "auto";
  model?: string;
};

type ConciergePick = {
  id: string;
  score: number;
  reason: string;
};

const json = (payload: unknown, status = 200, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LODGING_CATEGORIES = [
  "hotel", "resort", "guesthouse", "bed_and_breakfast", "hostel", "boutique_hotel",
  "lodge", "villa", "homestay", "serviced_apartment",
];

function normalizeProvider(value: string | null): AiProvider {
  if (value === "claude") return "claude";
  if (value === "deepseek") return "deepseek";
  return "auto";
}

function cleanModel(value: string | null, provider: "deepseek" | "claude") {
  if (!value) return provider === "deepseek" ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_CLAUDE_MODEL;
  if (provider === "deepseek") return DEEPSEEK_MODELS.has(value) ? value : DEFAULT_DEEPSEEK_MODEL;
  return CLAUDE_MODELS.has(value) ? value : DEFAULT_CLAUDE_MODEL;
}

function providerOrder(preference: AiProvider) {
  if (preference === "claude") return ["claude", "deepseek"] as const;
  if (preference === "deepseek") return ["deepseek", "claude"] as const;
  return ["deepseek", "claude"] as const;
}

function conciergePrompt(compact: unknown, max: number) {
  return `You are a friendly travel concierge for ZIVO, a Cambodia-focused booking app.
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
- Reasons must reference REAL attributes from the candidate (price, amenity, location, language, breakfast, etc.).
- If price is part of the request and known, mention it.
- If nothing fits, set picks=[] and narrator="No exact match — try broader filters.".
`;
}

serve(withSecurity("hotel-concierge", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const aiHeaders = { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" };

  if (req.method === "OPTIONS") return new Response(null, { headers: aiHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405, aiHeaders);

  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
  const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
  if (!deepseekApiKey && !claudeApiKey) return json({ error: "Service not configured" }, 500, aiHeaders);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "anon";
  const rl = await rateLimitDb(ip, "hotel-concierge", { max: 12, windowSec: 3600 });
  if (!rl.allowed) return json({ error: "Too many requests, please try again later" }, 429, aiHeaders);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, aiHeaders);
  }

  const prompt = (body.prompt || "").trim();
  if (prompt.length < 3 || prompt.length > 500) {
    return json({ error: "Prompt must be 3–500 characters" }, 400, aiHeaders);
  }

  const requestedProvider = normalizeProvider(body.provider ?? null);
  const requestedModel = body.model ?? null;
  const max = Math.max(1, Math.min(10, body.max ?? 5));

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
  if (storeErr) return json({ error: storeErr.message }, 500, aiHeaders);
  const candidates = (stores ?? []) as any[];
  if (candidates.length === 0) return json({ picks: [], narrator: "No properties match yet." }, 200, aiHeaders);

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

  const messages = [
    { role: "user", content: `User request: "${prompt}"\n\nCandidates (JSON):\n${JSON.stringify(compact)}` },
  ];

  let picks = [] as ConciergePick[];
  let narrator = "";
  const attempts: string[] = [];

  for (const provider of providerOrder(requestedProvider)) {
    if (provider === "deepseek" && !deepseekApiKey) {
      attempts.push("deepseek:key-missing");
      continue;
    }
    if (provider === "claude" && !claudeApiKey) {
      attempts.push("claude:key-missing");
      continue;
    }

    const model = cleanModel(requestedModel, provider);
    try {
      if (provider === "deepseek") {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "authorization": `Bearer ${deepseekApiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            stream: false,
            temperature: 0.2,
            max_tokens: 800,
            thinking: { type: "disabled" },
            messages: [{ role: "system", content: conciergePrompt(compact, max) }, ...messages],
          }),
        });
        if (!res.ok) {
          attempts.push(`deepseek:${res.status}`);
          continue;
        }
        const payload = await res.json();
        const raw = (payload?.choices?.[0]?.message?.content || "").trim();
        ({ picks, narrator } = parseConciergePayload(raw));
      } else {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": claudeApiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            temperature: 0.2,
            system: conciergePrompt(compact, max),
            messages,
          }),
        });
        if (!res.ok) {
          attempts.push(`claude:${res.status}`);
          continue;
        }
        const payload = await res.json();
        const raw = (payload?.content?.[0]?.text || "").trim();
        ({ picks, narrator } = parseConciergePayload(raw));
      }

      if (narrator || picks.length > 0) break;
    } catch (e) {
      attempts.push(`${provider}:${String(e).slice(0, 80)}`);
    }
  }

  if (!narrator && picks.length === 0) {
    return json({ error: "AI provider failed", detail: attempts.join(", ") }, 502, aiHeaders);
  }

  const validIds = new Set(compact.map((c) => c.id));
  const normalized = picks
    .filter((p) => p && validIds.has(p.id))
    .slice(0, max)
    .map((p) => ({
      id: p.id,
      score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 0))),
      reason: String(p.reason || "").slice(0, 200),
    }));

  return json({
    picks: normalized,
    narrator: String(narrator || "").slice(0, 200),
  }, 200, aiHeaders);
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));

function parseConciergePayload(raw: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  let parsed: { narrator?: string; picks?: ConciergePick[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { picks: [] as ConciergePick[], narrator: "" };
  }
  return {
    picks: (parsed.picks || []) as ConciergePick[],
    narrator: String(parsed.narrator || ""),
  };
}
