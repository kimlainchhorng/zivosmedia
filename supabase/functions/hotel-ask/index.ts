/**
 * hotel-ask — Property-grounded Q&A for a single hotel detail page.
 *
 * POST { store_id: string, question: string, history?: Array<{role, content}> }
 * Returns: { answer: string }
 *
 * Uses DeepSeek as primary and falls back to Claude when needed.
 * Stateless per-call — caller passes prior turns in `history`.
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
  store_id?: string;
  question?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  provider?: "deepseek" | "claude" | "auto";
  model?: string;
};

const json = (p: unknown, status = 200, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizeProvider(value: string | null): AiProvider {
  if (value === "claude") return "claude";
  if (value === "deepseek") return "deepseek";
  return "auto";
}

function cleanModel(value: string | null, provider: "deepseek" | "claude") {
  if (!value) {
    return provider === "deepseek" ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_CLAUDE_MODEL;
  }
  if (provider === "deepseek") return DEEPSEEK_MODELS.has(value) ? value : DEFAULT_DEEPSEEK_MODEL;
  return CLAUDE_MODELS.has(value) ? value : DEFAULT_CLAUDE_MODEL;
}

function providerOrder(preference: AiProvider) {
  if (preference === "claude") return ["claude", "deepseek"] as const;
  if (preference === "deepseek") return ["deepseek", "claude"] as const;
  return ["deepseek", "claude"] as const;
}

const systemPrompt = (facts: unknown) => `You are the on-page assistant for a hotel listing on ZIVO. Answer the user's question using ONLY the FACTS JSON below.

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

serve(withSecurity("hotel-ask", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const aiHeaders = { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" };

  if (req.method === "OPTIONS") return new Response(null, { headers: aiHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405, aiHeaders);

  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
  const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
  if (!deepseekApiKey && !claudeApiKey) return json({ error: "Service not configured" }, 500, aiHeaders);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "anon";
  const rl = await rateLimitDb(ip, "hotel-ask", { max: 30, windowSec: 600 });
  if (!rl.allowed) return json({ error: "Slow down — please try again in a few minutes" }, 429, aiHeaders);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, aiHeaders);
  }

  const storeId = (body.store_id || "").trim();
  const question = (body.question || "").trim();
  if (!storeId) return json({ error: "store_id required" }, 400, aiHeaders);
  if (question.length < 2 || question.length > 400) return json({ error: "Question must be 2-400 characters" }, 400, aiHeaders);

  const history = Array.isArray(body.history)
    ? body.history.slice(-10).filter((m) =>
      m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0,
    )
    : [];

  const { data: detail, error: detailErr } = await sb.rpc("get_hotel_detail", {
    p_store_id: storeId, p_check_in: null, p_check_out: null,
  });
  if (detailErr) return json({ error: detailErr.message }, 500, aiHeaders);
  if (!detail || !detail.store) return json({ error: "Hotel not found" }, 404, aiHeaders);

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

  const messages = [...history, { role: "user", content: question }];
  const requestedProvider = normalizeProvider(body.provider || null);
  const requestedModel = body.model || null;

  let answer = "";
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
            max_tokens: 350,
            thinking: { type: "disabled" },
            messages: [{ role: "system", content: systemPrompt(facts) }, ...messages],
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          attempts.push(`deepseek:${res.status}`);
          continue;
        }
        const payload = await res.json();
        answer = (payload?.choices?.[0]?.message?.content || "").trim();
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
            max_tokens: 350,
            temperature: 0.2,
            system: systemPrompt(facts),
            messages,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          attempts.push(`claude:${res.status}`);
          continue;
        }
        const payload = await res.json();
        answer = (payload?.content?.[0]?.text || "").trim();
      }

      if (answer) break;
    } catch (e) {
      attempts.push(`${provider}:${String(e).slice(0, 80)}`);
    }
  }

  if (!answer) {
    return json({ error: "AI provider failed", detail: attempts.join(", ") }, 502, aiHeaders);
  }

  return json({ answer }, 200, aiHeaders);
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
