/**
 * ads-studio-generate
 * Generates AI ad creative (copy + images + video scripts) and logs cost.
 *
 * Pricing (cents):
 *  - copy: 25  (headlines + descriptions + CTAs + hashtags)
 *  - image: 100  (per image variant)
 *  - video_script: 50  (15s + 30s scripts)
 */
import { serve, createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_CENTS: Record<string, number> = {
  copy: 25,
  image: 100,
  video_script: 50,
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Body = {
  store_id: string;
  creative_id?: string;
  goal: string;
  service_summary: string;
  store_name: string;
  store_city?: string;
  targeting?: Record<string, unknown>;
  platforms: string[];
  generate: { copy?: boolean; images?: number; video_scripts?: boolean };
  reference_image_url?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return jsonResp({ error: "unauthenticated" }, 401);

    const rl = await rateLimitDb(user.id, "api_general", { max: 10, windowSec: 60 });
    if (!rl.allowed) {
      return jsonResp({ error: "Too many requests. Please wait before generating again." }, 429);
    }

    const body = (await req.json()) as Body;
    if (!body?.store_id) return jsonResp({ error: "store_id required" }, 400);

    // Sanitize and cap user-supplied text to prevent prompt injection
    if (typeof body.service_summary === "string") body.service_summary = body.service_summary.slice(0, 500);
    if (typeof body.store_name === "string") body.store_name = body.store_name.slice(0, 100);
    if (typeof body.goal === "string") body.goal = body.goal.slice(0, 200);
    if (typeof body.store_city === "string") body.store_city = body.store_city.slice(0, 100);

    // Verify ownership
    const { data: store } = await admin
      .from("restaurants")
      .select("id, owner_id, name, city")
      .eq("id", body.store_id)
      .maybeSingle();
    if (!store || store.owner_id !== user.id) return jsonResp({ error: "forbidden" }, 403);

    // ------- Wallet guard -------
    const imageCountReq = Math.min(Math.max(body.generate.images ?? 0, 0), 4);
    const estCost =
      (body.generate.copy !== false ? PRICE_CENTS.copy : 0) +
      imageCountReq * PRICE_CENTS.image +
      (body.generate.video_scripts ? PRICE_CENTS.video_script : 0);

    const { data: wallet } = await admin
      .from("restaurant_wallets")
      .select("balance_cents, auto_recharge_enabled, auto_recharge_threshold_cents, auto_recharge_amount_cents")
      .eq("restaurant_id", body.store_id)
      .maybeSingle();
    const balance = wallet?.balance_cents ?? 0;
    if (balance < estCost) {
      return jsonResp({
        error: "insufficient_balance",
        message: `Wallet balance $${(balance / 100).toFixed(2)} below required $${(estCost / 100).toFixed(2)}.`,
        balance_cents: balance,
        required_cents: estCost,
        auto_recharge: wallet?.auto_recharge_enabled ?? false,
      }, 402);
    }

    const platforms = body.platforms?.length ? body.platforms : ["google", "meta", "tiktok"];

    // ---------- 1) AI COPY ----------
    let copyResult: any = null;
    let totalCost = 0;
    if (body.generate.copy !== false) {
      const sys = `You are a senior performance-marketing copywriter for a local business. Output STRICT JSON, no prose. Constraints:
- Google headlines: max 30 chars each
- Meta/TikTok headlines: max 40 chars
- Descriptions short: max 90 chars; long: max 200 chars
- 5 headlines, 3 short descriptions, 2 long descriptions, 5 hashtags, 4 CTA suggestions.`;
      const usr = `Business: ${body.store_name || store.name}
City: ${body.store_city || store.city || "local area"}
Goal: ${body.goal}
Services/offer: ${body.service_summary}
Platforms: ${platforms.join(", ")}
Targeting: ${JSON.stringify(body.targeting ?? {})}

Return JSON shape:
{
  "headlines": { "google": ["..."], "meta": ["..."], "tiktok": ["..."] },
  "descriptions": { "short": ["..."], "long": ["..."] },
  "ctas": ["Book Now", "..."],
  "hashtags": ["#...", "..."]
}`;

      const aiResp = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: usr },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!aiResp.ok) {
        const t = await aiResp.text();
        if (aiResp.status === 429) return jsonResp({ error: "Rate limited, please try again." }, 429);
        if (aiResp.status === 402) return jsonResp({ error: "AI credits exhausted in workspace." }, 402);
        throw new Error(`AI copy failed [${aiResp.status}]: ${t.slice(0, 200)}`);
      }
      const aiData = await aiResp.json();
      const raw = aiData?.choices?.[0]?.message?.content ?? "{}";
      try { copyResult = JSON.parse(raw); } catch { copyResult = { raw }; }
      totalCost += PRICE_CENTS.copy;
      await admin.from("ads_studio_generations").insert({
        store_id: body.store_id,
        creative_id: body.creative_id ?? null,
        generation_type: "copy",
        model: "google/gemini-3-flash-preview",
        cost_cents: PRICE_CENTS.copy,
        created_by: user.id,
      });
    }

    // ---------- 2) AI IMAGES ----------
    const imageUrls: { aspect: string; url: string }[] = [];
    const imageCount = Math.min(Math.max(body.generate.images ?? 0, 0), 4);
    if (imageCount > 0) {
      const aspects = ["1:1", "9:16", "16:9", "1.91:1"].slice(0, imageCount);
      for (const aspect of aspects) {
        const prompt = `Professional, high-quality marketing ad image for a local business.
Business: ${body.store_name || store.name}
Offer: ${body.service_summary}
Goal: ${body.goal}
Style: vibrant, trustworthy, well-lit, modern. No text overlay (text is added separately).
Aspect: ${aspect}.`;

        const resp = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });
        if (!resp.ok) {
          if (resp.status === 429) return jsonResp({ error: "Rate limited on image gen." }, 429);
          if (resp.status === 402) return jsonResp({ error: "AI credits exhausted." }, 402);
          continue;
        }
        const j = await resp.json();
        const dataUrl: string | undefined = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!dataUrl) continue;

        // Upload to storage
        const base64 = dataUrl.split(",")[1];
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const path = `${body.store_id}/${crypto.randomUUID()}.png`;
        const { error: upErr } = await admin.storage
          .from("store-ad-creatives")
          .upload(path, bytes, { contentType: "image/png", upsert: false });
        if (upErr) {
          console.error("upload error", upErr);
          continue;
        }
        const { data: pub } = admin.storage.from("store-ad-creatives").getPublicUrl(path);
        imageUrls.push({ aspect, url: pub.publicUrl });
        totalCost += PRICE_CENTS.image;
        await admin.from("ads_studio_generations").insert({
          store_id: body.store_id,
          creative_id: body.creative_id ?? null,
          generation_type: "image",
          model: "google/gemini-2.5-flash-image",
          cost_cents: PRICE_CENTS.image,
          meta: { aspect, path },
          created_by: user.id,
        });
      }
    }

    // ---------- 3) VIDEO SCRIPTS ----------
    let videoScripts: any = null;
    if (body.generate.video_scripts) {
      const sys = `You write punchy short-form video ad scripts for TikTok and YouTube Shorts. Strict JSON only.`;
      const usr = `Business: ${body.store_name || store.name}
Offer: ${body.service_summary}
Goal: ${body.goal}

Return:
{
  "tiktok_15s": { "hook": "0-3s line", "body": "3-12s line", "cta": "12-15s line", "shotlist": ["...","...","..."] },
  "youtube_shorts_30s": { "hook": "...", "body": "...", "cta": "...", "shotlist": ["...","...","...","..."] }
}`;
      const r = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          response_format: { type: "json_object" },
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const raw = j?.choices?.[0]?.message?.content ?? "{}";
        try { videoScripts = JSON.parse(raw); } catch { videoScripts = { raw }; }
        totalCost += PRICE_CENTS.video_script;
        await admin.from("ads_studio_generations").insert({
          store_id: body.store_id,
          creative_id: body.creative_id ?? null,
          generation_type: "video_script",
          model: "google/gemini-3-flash-preview",
          cost_cents: PRICE_CENTS.video_script,
          created_by: user.id,
        });
      }
    }

    // Deduct actual cost from wallet
    if (totalCost > 0) {
      await admin
        .from("restaurant_wallets")
        .update({ balance_cents: balance - totalCost, updated_at: new Date().toISOString() })
        .eq("restaurant_id", body.store_id);
    }

    return jsonResp({
      ok: true,
      cost_cents: totalCost,
      balance_after_cents: Math.max(0, balance - totalCost),
      copy: copyResult,
      images: imageUrls,
      video_scripts: videoScripts,
    });
  } catch (err) {
    console.error("ads-studio-generate error", err);
    return jsonResp({ error: err instanceof Error ? err.message : "unknown error" }, 500);
  }
});

function jsonResp(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
