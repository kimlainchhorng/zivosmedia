import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Creates a Meta Ads campaign + adset + creative + ad via Marketing API v21.
// Admin-only.
const META_API = "https://graph.facebook.com/v21.0";

async function metaPost(path: string, token: string, body: Record<string, any>) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    form.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  form.set("access_token", token);
  const resp = await fetch(`${META_API}${path}`, { method: "POST", body: form });
  const json = await resp.json();
  if (!resp.ok) throw new Error(`Meta ${path} failed: ${JSON.stringify(json)}`);
  return json;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const accessToken = Deno.env.get("META_ACCESS_TOKEN")!;
    const adAccount = Deno.env.get("META_AD_ACCOUNT_ID")!; // e.g. "act_123456"
    const pageId = Deno.env.get("META_PAGE_ID")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const {
      name = "ZIVO MVP Launch",
      daily_budget_cents = 2000,
      headline = "ZIVO — Rides, Eats, Travel",
      body = "Book rides, order food, and explore deals on ZIVO.",
      link = "https://hizivo.com",
      image_url,
    } = await req.json().catch(() => ({}));

    // 1) Campaign (PAUSED)
    const campaign = await metaPost(`/${adAccount}/campaigns`, accessToken, {
      name,
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      special_ad_categories: [],
    });

    // 2) Ad set
    const adSet = await metaPost(`/${adAccount}/adsets`, accessToken, {
      name: `${name} — adset`,
      campaign_id: campaign.id,
      daily_budget: daily_budget_cents,
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: { geo_locations: { countries: ["US", "KH"] } },
      status: "PAUSED",
    });

    // 3) Ad creative
    const creative = await metaPost(`/${adAccount}/adcreatives`, accessToken, {
      name: `${name} — creative`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          message: body,
          link,
          name: headline,
          ...(image_url ? { picture: image_url } : {}),
        },
      },
    });

    // 4) Ad
    const ad = await metaPost(`/${adAccount}/ads`, accessToken, {
      name: `${name} — ad`,
      adset_id: adSet.id,
      creative: { creative_id: creative.id },
      status: "PAUSED",
    });

    const { data: row } = await admin.from("ad_campaigns").insert({
      platform: "meta",
      external_id: campaign.id,
      name,
      status: "paused",
      daily_budget_cents,
      created_by: user.id,
      metadata: { campaign_id: campaign.id, adset_id: adSet.id, creative_id: creative.id, ad_id: ad.id, link, headline },
    } as any).select().single();

    return new Response(JSON.stringify({ ok: true, campaign: row, meta: { campaign, adSet, creative, ad } }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[meta-ads-create-campaign]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
