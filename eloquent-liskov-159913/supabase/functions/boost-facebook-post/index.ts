// Boost a Facebook Page post via the Graph API /promotions endpoint.
import { createClient } from "../_shared/deps.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json() as {
      post_id: string;
      page_access_token: string;
      daily_budget_usd: number;
      duration_days: number;
      currency?: string;
      countries?: string[];
      objective?: string;
    };

    const { post_id, page_access_token, daily_budget_usd, duration_days } = body;
    if (!post_id || !page_access_token || !daily_budget_usd || !duration_days) {
      return json({ error: "post_id, page_access_token, daily_budget_usd and duration_days are required" }, 400);
    }

    const currency = body.currency || "USD";
    const countries = body.countries?.length ? body.countries : ["KH"];
    const objective = body.objective || "POST_ENGAGEMENT";

    // Facebook API requires Unix timestamps (seconds), NOT ISO strings
    const nowSec = Math.floor(Date.now() / 1000);
    const endSec = nowSec + duration_days * 24 * 60 * 60;

    // Total budget in smallest currency unit (cents for USD)
    const totalBudgetCents = Math.round(daily_budget_usd * 100 * duration_days);

    // Facebook Promotions API — use form-urlencoded (more reliable than JSON body)
    const params = new URLSearchParams({
      access_token: page_access_token,
      budget: String(totalBudgetCents),
      currency,
      end_time: String(endSec),
      start_time: String(nowSec),
      objective,
    });

    // Add countries targeting if specified
    if (countries.length > 0) {
      params.set("countries", JSON.stringify(countries));
    }

    const promotionRes = await fetch(
      `https://graph.facebook.com/v21.0/${post_id}/promotions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );

    const promotionData = await promotionRes.json() as any;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!promotionRes.ok || promotionData.error) {
      const errMsg: string = promotionData.error?.message || "Boost API error";

      // Log the failed attempt for manual follow-up
      await admin.from("ad_campaigns").insert({
        platform: "meta",
        name: `Boost (pending): ${post_id}`,
        daily_budget_cents: Math.round(daily_budget_usd * 100),
        status: "pending",
        external_id: post_id,
        metadata: {
          post_id, duration_days, currency, countries,
          fb_error: promotionData.error,
          fb_error_code: promotionData.error?.code,
        },
      });

      return json({
        success: false,
        warning: errMsg,
        fb_error_code: promotionData.error?.code,
        fallback: "pending",
        post_id,
      });
    }

    const promotionId: string = promotionData.id;

    // Log the successful boost
    await admin.from("ad_campaigns").insert({
      platform: "meta",
      name: `Boosted: ${post_id}`,
      daily_budget_cents: Math.round(daily_budget_usd * 100),
      status: "active",
      external_id: promotionId,
      metadata: { post_id, duration_days, promotion_id: promotionId, countries, currency },
    });

    return json({
      success: true,
      promotion_id: promotionId,
      post_id,
      status: "active",
      total_spend_usd: daily_budget_usd * duration_days,
    });
  } catch (e) {
    console.error("boost-facebook-post error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
