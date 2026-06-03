#!/usr/bin/env node
/**
 * Ads, monetization, and conversion tracking contract check.
 *
 * Verifies analytics dedupe, conversion upload bridges, Ads Studio ownership
 * and attribution, creator monetization gates, affiliate tracking, and the
 * provider roadmap before scale-up.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

function requireMatch(id, text, pattern, relativePath) {
  if (!pattern.test(text)) {
    failures.push(`${id}: ${relativePath} missing pattern ${pattern}`);
  }
}

function requireStrictSecurity(id, route, text, risk = 80) {
  const relativePath = `supabase/functions/${route}/index.ts`;
  requireContains(id, text, `withSecurity("${route}"`, relativePath);
  requireContains(id, text, "const corsHeaders = ctx.corsHeaders", relativePath);
  requireContains(id, text, "strictCors: true", relativePath);
  requireContains(
    id,
    text,
    route === "ads-studio-track" ? 'allowedMethods: ["GET", "POST"]' : 'allowedMethods: ["POST"]',
    relativePath,
  );
  requireContains(id, text, 'trackNetwork: "suspicious"', relativePath);
  requireContains(id, text, `blockNetworkRiskAt: ${risk}`, relativePath);
  if (text.includes('"Access-Control-Allow-Origin": "*"')) {
    failures.push(`${id}: ${relativePath} must not use wildcard CORS`);
  }
}

const contracts = [
  {
    id: "browser-analytics-dedupe-and-queue",
    category: "analytics",
    check() {
      const analyticsPath = "src/lib/analytics.ts";
      const trackerPath = "supabase/functions/analytics-event-track/index.ts";
      const configPath = "supabase/config.toml";
      const analytics = source(analyticsPath);
      for (const needle of [
        "analytics-event-track",
        "event_id",
        "zivo:analytics_queue",
        "MAX_QUEUE = 200",
        "VITE_ANALYTICS_EVENT_TRACK_ENABLED",
        "flushQueue",
        "trackRawAnalyticsEvent",
        "online",
        "dedupeMs",
        "__resetAnalyticsDedupe",
      ]) {
        requireContains(this.id, analytics, needle, analyticsPath);
      }
      for (const needle of [
        'withSecurity("analytics-event-track"',
        'allowedMethods: ["POST"]',
        "strictCors: true",
        "auth.getUser(token)",
        "analytics_events",
      ]) {
        requireContains(this.id, source(trackerPath), needle, trackerPath);
      }
      requireContains(this.id, source(configPath), "[functions.analytics-event-track]", configPath);
      requireMatch(this.id, source(configPath), /\[functions\.analytics-event-track\]\s+verify_jwt = false/, configPath);
    },
  },
  {
    id: "google-ads-click-conversion-upload",
    category: "provider",
    check() {
      const clientPath = "src/lib/googleAdsConversion.ts";
      const edgePath = "supabase/functions/google-ads-conversion/index.ts";
      const adminPath = "src/pages/admin/AdminGoogleAdsPage.tsx";
      const client = source(clientPath);
      const edge = source(edgePath);
      const adminPage = source(adminPath);

      for (const needle of [
        "captureGclidFromUrl",
        "zivo_gclid",
        'supabase.functions.invoke("google-ads-conversion"',
        "conversion_action_id",
        "order_id",
      ]) {
        requireContains(this.id, client, needle, clientPath);
      }
      for (const needle of [
        "GOOGLE_ADS_CLIENT_ID",
        "GOOGLE_ADS_CLIENT_SECRET",
        "GOOGLE_ADS_REFRESH_TOKEN",
        "GOOGLE_ADS_CUSTOMER_ID",
        "GOOGLE_ADS_DEVELOPER_TOKEN",
        'allowedMethods: ["POST"]',
        "uploadClickConversions",
        "conversionAction",
        "partialFailure: true",
        "conversion_events",
        'source: "google_ads"',
      ]) {
        requireContains(this.id, edge, needle, edgePath);
      }
      for (const needle of ["Google Ads", "conversionId", "conversionLabel", "ad_campaigns"]) {
        requireContains(this.id, adminPage, needle, adminPath);
      }
    },
  },
  {
    id: "provider-campaign-create-post-gates",
    category: "provider",
    check() {
      const googleFnPath = "supabase/functions/google-ads-create-campaign/index.ts";
      const metaFnPath = "supabase/functions/meta-ads-create-campaign/index.ts";
      const googleAdminPath = "src/pages/admin/AdminGoogleAdsPage.tsx";
      const metaAdminPath = "src/pages/admin/AdminMetaAdsPage.tsx";
      const googleFn = source(googleFnPath);
      const metaFn = source(metaFnPath);
      const googleAdmin = source(googleAdminPath);
      const metaAdmin = source(metaAdminPath);

      for (const [route, text, relativePath] of [
        ["google-ads-create-campaign", googleFn, googleFnPath],
        ["meta-ads-create-campaign", metaFn, metaFnPath],
      ]) {
        requireContains(this.id, text, `withSecurity("${route}"`, relativePath);
        requireContains(this.id, text, 'allowedMethods: ["POST"]', relativePath);
        requireContains(this.id, text, "strictCors: true", relativePath);
        requireContains(this.id, text, 'trackNetwork: "suspicious"', relativePath);
        requireContains(this.id, text, "blockNetworkRiskAt: 80", relativePath);
        requireContains(this.id, text, 'rpc("has_role"', relativePath);
        requireContains(this.id, text, '_role: "admin"', relativePath);
        requireContains(this.id, text, 'status: "paused"', relativePath);
        requireContains(this.id, text, '.from("ad_campaigns")', relativePath);
        if (text.includes('"Access-Control-Allow-Origin": "*"')) {
          failures.push(`${this.id}: ${relativePath} must not use wildcard CORS`);
        }
      }

      requireContains(this.id, googleAdmin, 'functions.invoke("google-ads-create-campaign"', googleAdminPath);
      requireContains(this.id, googleAdmin, "server_publish_error", googleAdminPath);
      requireContains(this.id, googleAdmin, 'status: "pending"', googleAdminPath);
      requireContains(this.id, metaAdmin, 'functions.invoke("meta-ads-create-campaign"', metaAdminPath);
    },
  },
  {
    id: "meta-server-side-conversion-bridge",
    category: "provider",
    check() {
      const capiPath = "supabase/functions/meta-capi-bridge/index.ts";
      const bridgePath = "supabase/functions/meta-conversion-bridge/index.ts";
      const handlerPath = "supabase/functions/meta-conversion-handler/index.ts";
      const adminPath = "src/pages/admin/AdminMetaAdsPage.tsx";
      const capiBridge = source(capiPath);
      const conversionBridge = source(bridgePath);
      const conversionHandler = source(handlerPath);
      const metaAdmin = source(adminPath);

      for (const [relativePath, text] of [
        [capiPath, capiBridge],
        [bridgePath, conversionBridge],
        [handlerPath, conversionHandler],
      ]) {
        requireContains(this.id, text, 'allowedMethods: ["POST"]', relativePath);
        requireContains(this.id, text, "strictCors: true", relativePath);
      }

      for (const [relativePath, text] of [
        [capiPath, capiBridge],
        [bridgePath, conversionBridge],
      ]) {
        for (const needle of [
          "graph.facebook.com",
          "access_token",
          "event_id",
          "action_source",
          "sha256",
          "client_ip_address",
          "client_user_agent",
        ]) {
          requireContains(this.id, text, needle, relativePath);
        }
      }
      for (const table of ["trips", "food_orders", "flight_bookings", "travel_bookings", "transactions"]) {
        requireContains(this.id, conversionBridge, table, bridgePath);
      }
      requireContains(this.id, conversionBridge, "Purchase", bridgePath);
      requireContains(this.id, conversionBridge, "CompleteRegistration", bridgePath);
      requireContains(this.id, conversionHandler, "meta", handlerPath);
      requireContains(this.id, metaAdmin, "Meta Ads", adminPath);
      requireContains(this.id, metaAdmin, "ad_campaigns", adminPath);
    },
  },
  {
    id: "ads-studio-attribution-and-roas",
    category: "ads-studio",
    check() {
      const routeNames = [
        "ads-studio-auto-winner",
        "ads-studio-budget-guard",
        "ads-studio-export",
        "ads-studio-generate",
        "ads-studio-publish",
        "ads-studio-recommendations",
        "ads-studio-track",
        "ads-studio-track-conversion",
      ];
      const routes = Object.fromEntries(routeNames.map((route) => [route, source(`supabase/functions/${route}/index.ts`)]));
      for (const route of routeNames) requireStrictSecurity(this.id, route, routes[route]);
      for (const route of ["ads-studio-auto-winner", "ads-studio-budget-guard", "ads-studio-publish"]) {
        requireContains(this.id, routes[route], "isServiceRoleRequest(req,", `supabase/functions/${route}/index.ts`);
        requireContains(this.id, routes[route], "skipBotDetection: true", `supabase/functions/${route}/index.ts`);
      }

      requireContains(this.id, routes["ads-studio-export"], "(c as any).restaurants?.owner_id !== u.user.id", "supabase/functions/ads-studio-export/index.ts");
      requireContains(this.id, routes["ads-studio-generate"], "store.owner_id !== user.id", "supabase/functions/ads-studio-generate/index.ts");
      requireContains(this.id, routes["ads-studio-publish"], "store.owner_id !== user.id", "supabase/functions/ads-studio-publish/index.ts");
      requireContains(this.id, routes["ads-studio-publish"], '.eq("store_id", body.store_id)', "supabase/functions/ads-studio-publish/index.ts");
      requireContains(this.id, routes["ads-studio-recommendations"], "store.owner_id !== user.id", "supabase/functions/ads-studio-recommendations/index.ts");
      requireContains(this.id, routes["ads-studio-recommendations"], 'r.role === "admin"', "supabase/functions/ads-studio-recommendations/index.ts");

      for (const needle of ["ads_studio_events", "event_type", "creative_id", "variant_id"]) {
        requireContains(this.id, routes["ads-studio-track"], needle, "supabase/functions/ads-studio-track/index.ts");
      }
      for (const needle of [
        "Authentication required",
        "food_orders",
        "Order not found or access denied",
        "ads_click_id",
        "ads_creative_id",
        "ads_variant_id",
        "ads_platform",
        'event_type: "conversion"',
        "revenue_cents",
        "ads_studio_daily_spend",
        "conversions",
      ]) {
        requireContains(this.id, routes["ads-studio-track-conversion"], needle, "supabase/functions/ads-studio-track-conversion/index.ts");
      }

      const overviewPath = "src/hooks/useStoreMarketingOverview.ts";
      const overview = source(overviewPath);
      requireContains(this.id, overview, 'from("store_ad_campaigns" as any)', overviewPath);
      requireContains(this.id, overview, '.eq("store_id", storeId)', overviewPath);
      if (overview.includes('from("ad_campaigns")')) {
        failures.push(`${this.id}: ${overviewPath} must stay scoped to store_ad_campaigns`);
      }

      for (const surfacePath of [
        "src/components/admin/AdsStudioAnalytics.tsx",
        "src/components/admin/AdsStudioDashboard.tsx",
        "src/components/admin/AdsStudioWalletGuard.tsx",
        "src/pages/admin/AdminAdsAnalyticsPage.tsx",
      ]) {
        requireMatch(this.id, source(surfacePath), /ads|campaign|conversion|wallet|spend|roas/i, surfacePath);
      }
    },
  },
  {
    id: "creator-monetization-and-affiliate-tracking",
    category: "creator",
    check() {
      const tierIntentPath = "supabase/functions/subscribe-to-tier-intent/index.ts";
      const subscribePath = "supabase/functions/subscribe-to-tier/index.ts";
      const confirmPath = "supabase/functions/confirm-tier-subscription/index.ts";
      const tierIntent = source(tierIntentPath);
      const subscribe = source(subscribePath);
      const confirm = source(confirmPath);

      requireStrictSecurity(this.id, "subscribe-to-tier-intent", tierIntent);
      requireStrictSecurity(this.id, "subscribe-to-tier", subscribe);
      requireStrictSecurity(this.id, "confirm-tier-subscription", confirm);
      for (const needle of ["stripe", "creator", "tier", "client_secret"]) requireContains(this.id, tierIntent, needle, tierIntentPath);
      for (const needle of [
        "creator",
        "subscriber",
        "tier",
        'withIdempotency(req, "subscribe-to-tier", user.id',
        '"X-Idempotency-Cache": result.cached ? "HIT" : "MISS"',
        "if (tier.is_free)",
        '.from("creator_subscriptions")',
        'payment_method: "free"',
      ]) {
        requireContains(this.id, subscribe, needle, subscribePath);
      }
      for (const needle of [
        "rateLimitDb(user.id, \"payment\")",
        "payment does not belong to caller",
        "subscription does not belong to caller",
      ]) {
        requireContains(this.id, confirm, needle, confirmPath);
      }

      const subscriptionGatePath = "supabase/migrations/20260531223000_creator_subscriptions_server_gate.sql";
      const paidAccessGatePath = "supabase/migrations/20260531224500_paid_content_access_server_gate.sql";
      const subscriptionGate = source(subscriptionGatePath);
      const paidAccessGate = source(paidAccessGatePath);
      requireContains(this.id, subscriptionGate, 'DROP POLICY IF EXISTS "cs_ins_free_tier_only"', subscriptionGatePath);
      requireContains(this.id, subscriptionGate, 'DROP POLICY IF EXISTS "cs_ins"', subscriptionGatePath);
      requireContains(this.id, subscriptionGate, "server/payment flows only", subscriptionGatePath);
      requireContains(this.id, paidAccessGate, 'DROP POLICY IF EXISTS "pca_ins"', paidAccessGatePath);
      requireContains(this.id, paidAccessGate, "trusted wallet/payment flows only", paidAccessGatePath);

      const creatorSubscribePath = "src/components/creator/CreatorTiersSubscribe.tsx";
      const myUnlocksPath = "src/pages/MyUnlocksPage.tsx";
      const creatorSubscribe = source(creatorSubscribePath);
      const myUnlocks = source(myUnlocksPath);
      requireContains(this.id, creatorSubscribe, 'functions.invoke("subscribe-to-tier"', creatorSubscribePath);
      requireContains(this.id, creatorSubscribe, '"Idempotency-Key": idempotencyKey', creatorSubscribePath);
      if (/from\("creator_subscriptions"\)[\s\S]{0,120}\.insert/.test(creatorSubscribe)) {
        failures.push(`${this.id}: ${creatorSubscribePath} must not insert creator_subscriptions directly`);
      }
      requireContains(this.id, myUnlocks, "paid_content_access", myUnlocksPath);
      requireContains(this.id, myUnlocks, "Read-only view", myUnlocksPath);
      if (/from\("paid_content_access"\)[\s\S]{0,120}\.insert/.test(myUnlocks)) {
        failures.push(`${this.id}: ${myUnlocksPath} must not insert paid_content_access directly`);
      }

      for (const [relativePath, pattern] of [
        ["src/components/ppv/CreatorPPVStrip.tsx", /ppv|paid|unlock|price/i],
        ["src/pages/CreatorDashboardPage.tsx", /earnings|subscriber|analytics|payout/i],
        ["src/pages/MonetizationPage.tsx", /creator|subscriber|earning|payout|video/i],
      ]) {
        requireMatch(this.id, source(relativePath), pattern, relativePath);
      }
      requireContains(this.id, source("src/lib/affiliateTracking.ts"), "affiliate", "src/lib/affiliateTracking.ts");
      requireContains(this.id, source("src/lib/affiliateTracking.ts"), "subid", "src/lib/affiliateTracking.ts");
      requireContains(this.id, source("src/config/affiliateLinks.ts"), "affiliate", "src/config/affiliateLinks.ts");
      requireContains(this.id, source("supabase/functions/affiliate-link-redirect/index.ts"), 'allowedMethods: ["POST"]', "supabase/functions/affiliate-link-redirect/index.ts");
      requireContains(this.id, source("supabase/functions/affiliate-click-log/index.ts"), 'allowedMethods: ["POST"]', "supabase/functions/affiliate-click-log/index.ts");
      const payoutWorkflow = source("src/test/workflows/payouts-earnings-workflow.test.ts");
      for (const needle of ["CreatorPayoutsPage", "creator-payout-request", "creator_earnings", "creator_payouts"]) {
        requireContains(this.id, payoutWorkflow, needle, "src/test/workflows/payouts-earnings-workflow.test.ts");
      }
    },
  },
  {
    id: "provider-scale-up-roadmap",
    category: "docs",
    check() {
      const roadmapPath = "docs/zivo-full-platform-update-roadmap.md";
      const roadmap = source(roadmapPath);
      for (const needle of [
        "Google Ads",
        "Meta/Facebook/Instagram",
        "TikTok",
        "One event schema",
        "One Supabase Edge Function",
        "Consent gates",
        "Admin diagnostics page",
      ]) {
        requireContains(this.id, roadmap, needle, roadmapPath);
      }
    },
  },
];

for (const contract of contracts) contract.check();

console.log(JSON.stringify({
  generated: new Date().toISOString(),
  counts: {
    contracts: contracts.length,
    failures: failures.length,
  },
  contracts: contracts.map(({ id, category }) => ({ id, category })),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
