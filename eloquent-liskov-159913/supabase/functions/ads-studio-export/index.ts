/**
 * ads-studio-export
 * Builds platform-specific export bundles + deep launch links for an Ads Studio creative.
 * Returns CSV/JSON the user pastes into Google/Meta/TikTok Ads Manager.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return j({ error: "unauthenticated" }, 401);

    const { creative_id, destination_url } = await req.json();
    if (!creative_id) return j({ error: "creative_id required" }, 400);

    const { data: c } = await admin
      .from("ads_studio_creatives")
      .select("*, restaurants:store_id(id, name, owner_id, slug, city)")
      .eq("id", creative_id)
      .maybeSingle();
    if (!c || (c as any).restaurants?.owner_id !== u.user.id) return j({ error: "forbidden" }, 403);

    const store = (c as any).restaurants;
    const finalUrl = destination_url || `https://hizivo.com/store/${store.slug || store.id}`;
    const trackBase = `${SUPABASE_URL}/functions/v1/ads-studio-track?c=${creative_id}&t=click`;
    const utm = (src: string) => {
      const u = `${finalUrl}${finalUrl.includes("?") ? "&" : "?"}utm_source=${src}&utm_medium=cpc&utm_campaign=zivo_ads_studio&utm_content=${creative_id}&zv_ad=${creative_id}&zv_src=${src}`;
      return u;
    };
    const pixel = (src: string) => `${trackBase}&src=${src}`;

    // --- Google Ads RSA CSV ---
    const gHeadlines: string[] = (c.headlines as any)?.google || (c.headlines as any)?.meta || [];
    const dShort: string[] = (c.descriptions as any)?.short || [];
    const googleCsv = [
      "Campaign,Ad group,Headline 1,Headline 2,Headline 3,Description 1,Description 2,Final URL,Path 1,Path 2",
      [
        `"ZIVO - ${escapeCsv(store.name)}"`,
        `"${escapeCsv(c.goal)}"`,
        ...gHeadlines.slice(0, 3).map((h) => `"${escapeCsv(h)}"`),
        ...dShort.slice(0, 2).map((d) => `"${escapeCsv(d)}"`),
        `"${utm("google")}"`,
        `"book"`,
        `"now"`,
      ].join(","),
    ].join("\n");

    // --- Meta (FB+IG) ---
    const metaHeadlines: string[] = (c.headlines as any)?.meta || [];
    const metaBundle = {
      campaign_name: `ZIVO – ${store.name} – ${c.goal}`,
      objective: mapMetaObjective(c.goal),
      ad_set: {
        targeting: c.targeting,
        daily_budget_usd: (c.budget as any)?.daily ?? 10,
      },
      ads: metaHeadlines.slice(0, 3).map((h, i) => ({
        name: `Ad ${i + 1}`,
        primary_text: dShort[0] || h,
        headline: h,
        description: (c.descriptions as any)?.long?.[0] || "",
        cta: (c.ctas as any)?.[0] || "LEARN_MORE",
        link: utm("meta"),
        creative_image: (c.image_urls as any)?.[0]?.url ?? null,
      })),
    };

    // --- TikTok ---
    const tiktokBundle = {
      campaign_name: `ZIVO – ${store.name}`,
      objective: c.goal === "traffic" ? "TRAFFIC" : "REACH",
      identity: store.name,
      adgroup: { targeting: c.targeting, daily_budget_usd: (c.budget as any)?.daily ?? 20 },
      ads: ((c.headlines as any)?.tiktok || metaHeadlines).slice(0, 3).map((h: string) => ({
        ad_text: h,
        cta: (c.ctas as any)?.[0] || "LEARN_MORE",
        landing_url: utm("tiktok"),
        video_script: (c.video_scripts as any)?.tiktok_15s || null,
        cover_image: (c.image_urls as any)?.find((i: any) => i.aspect === "9:16")?.url ?? null,
      })),
    };

    // --- YouTube Shorts ---
    const youtubeBundle = {
      script: (c.video_scripts as any)?.youtube_shorts_30s || null,
      headline: gHeadlines[0] || metaHeadlines[0] || "",
      cover_image: (c.image_urls as any)?.find((i: any) => i.aspect === "9:16")?.url ?? null,
      landing_url: utm("youtube"),
    };

    return j({
      ok: true,
      destination_url: finalUrl,
      bundles: { google_csv: googleCsv, meta: metaBundle, tiktok: tiktokBundle, youtube: youtubeBundle },
      tracking_pixels: {
        google: pixel("google"),
        meta: pixel("meta"),
        tiktok: pixel("tiktok"),
        youtube: pixel("youtube"),
      },
      launch_urls: {
        google: "https://ads.google.com/aw/campaigns/new",
        meta: "https://business.facebook.com/adsmanager/manage/campaigns",
        tiktok: "https://ads.tiktok.com/i18n/perf/campaign?aadvid=",
        youtube: "https://ads.google.com/aw/campaigns/new",
      },
    });
  } catch (e) {
    console.error("export err", e);
    return j({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function mapMetaObjective(goal: string) {
  switch (goal) {
    case "leads": return "OUTCOME_LEADS";
    case "bookings": return "OUTCOME_SALES";
    case "awareness": return "OUTCOME_AWARENESS";
    default: return "OUTCOME_TRAFFIC";
  }
}
function escapeCsv(s: string) { return (s ?? "").replace(/"/g, '""'); }
function j(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
