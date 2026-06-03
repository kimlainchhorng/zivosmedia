import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("ads, monetization, and conversion tracking workflow", () => {
  it("keeps the standalone ads monetization contract gate wired into platform audit", () => {
    const contractScript = read("scripts/qa/ads-monetization-contracts.mjs");
    const coverageScript = read("scripts/qa/workflow-coverage.mjs");
    const packageJson = read("package.json");

    for (const contractId of [
      "browser-analytics-dedupe-and-queue",
      "google-ads-click-conversion-upload",
      "provider-campaign-create-post-gates",
      "meta-server-side-conversion-bridge",
      "ads-studio-attribution-and-roas",
      "creator-monetization-and-affiliate-tracking",
      "provider-scale-up-roadmap",
    ]) {
      expect(contractScript).toContain(contractId);
    }

    expect(coverageScript).toContain("qa:ads-monetization-contracts");
    expect(packageJson).toContain('"qa:ads-monetization-contracts"');
    expect(packageJson).toContain("npm run qa:ads-monetization-contracts");
  });

  it("keeps browser analytics deduped, queued, and written to the shared analytics table", () => {
    const analytics = read("src/lib/analytics.ts");
    const eventTracking = read("src/hooks/useEventTracking.ts");
    const affiliateTracking = read("src/lib/affiliateTracking.ts");
    const errorReporting = read("src/lib/security/errorReporting.ts");
    const analyticsGate = read("supabase/migrations/20260601010000_analytics_events_server_gate.sql");
    const analyticsFn = read("supabase/functions/analytics-event-track/index.ts");
    const supabaseConfig = read("supabase/config.toml");

    expect(analytics).toContain('functions.invoke("analytics-event-track"');
    expect(analytics).toContain("event_id");
    expect(analytics).toContain("zivo:analytics_queue");
    expect(analytics).toContain("MAX_QUEUE = 200");
    expect(analytics).toContain("VITE_ANALYTICS_EVENT_TRACK_ENABLED");
    expect(analytics).toContain("flushQueue");
    expect(analytics).toContain("trackRawAnalyticsEvent");
    expect(analytics).toContain("online");
    expect(analytics).toContain("dedupeMs");
    expect(analytics).toContain("__resetAnalyticsDedupe");
    expect(analytics).not.toMatch(/from\("analytics_events"\)[\s\S]{0,120}\.insert/);
    expect(eventTracking).toContain("trackRawAnalyticsEvent");
    expect(eventTracking).not.toMatch(/from\('analytics_events'\)[\s\S]{0,120}\.insert/);
    expect(affiliateTracking).toContain("trackRawAnalyticsEvent");
    expect(errorReporting).toContain("trackRawAnalyticsEvent");
    expect(errorReporting).not.toMatch(/from\("analytics_events"\)[\s\S]{0,120}\.insert/);
    expect(analyticsGate).toContain('DROP POLICY IF EXISTS "Anyone can insert analytics events"');
    expect(analyticsGate).toContain('DROP POLICY IF EXISTS "analytics_insert_anon"');
    expect(analyticsGate).toContain("trusted server-side ingestion");
    expect(analyticsFn).toContain('withSecurity("analytics-event-track"');
    expect(analyticsFn).toContain('allowedMethods: ["POST"]');
    expect(analyticsFn).toContain('from("analytics_events")');
    expect(analyticsFn).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(analyticsFn).toContain("MAX_META_JSON");
    expect(analyticsFn).toContain("strictCors: true");
    expect(supabaseConfig).toContain("[functions.analytics-event-track]");
    expect(supabaseConfig).toMatch(/\[functions\.analytics-event-track\]\s+verify_jwt = false/);
  });

  it("keeps Google Ads click conversion upload connected from frontend to Edge Function to audit log", () => {
    const client = read("src/lib/googleAdsConversion.ts");
    const edge = read("supabase/functions/google-ads-conversion/index.ts");
    const adminPage = read("src/pages/admin/AdminGoogleAdsPage.tsx");

    expect(client).toContain("captureGclidFromUrl");
    expect(client).toContain("zivo_gclid");
    expect(client).toContain('supabase.functions.invoke("google-ads-conversion"');
    expect(client).toContain("conversion_action_id");
    expect(client).toContain("order_id");

    expect(edge).toContain("GOOGLE_ADS_CLIENT_ID");
    expect(edge).toContain("GOOGLE_ADS_CLIENT_SECRET");
    expect(edge).toContain("GOOGLE_ADS_REFRESH_TOKEN");
    expect(edge).toContain("GOOGLE_ADS_CUSTOMER_ID");
    expect(edge).toContain("GOOGLE_ADS_DEVELOPER_TOKEN");
    expect(edge).toContain('allowedMethods: ["POST"]');
    expect(edge).toContain("uploadClickConversions");
    expect(edge).toContain("conversionAction");
    expect(edge).toContain("partialFailure: true");
    expect(edge).toContain("conversion_events");
    expect(edge).toContain('source: "google_ads"');

    expect(adminPage).toContain("Google Ads");
    expect(adminPage).toContain("conversionId");
    expect(adminPage).toContain("conversionLabel");
    expect(adminPage).toContain("ad_campaigns");
  });

  it("keeps the unified marketing event pipeline connected to analytics and provider audit logs", () => {
    const client = read("src/services/marketingTracking.ts");
    const edge = read("supabase/functions/marketing-event-track/index.ts");
    const config = read("supabase/config.toml");
    const env = read(".env.example");
    const adsAnalytics = read("src/pages/admin/AdminAdsAnalyticsPage.tsx");

    expect(client).toContain('supabase.functions.invoke("marketing-event-track"');
    expect(client).toContain("click_ids");
    expect(client).toContain("zivo_gclid");
    expect(client).toContain("cookieValue(\"_fbc\")");
    expect(client).toContain("cookieValue(\"_fbp\")");
    expect(client).toContain("mirrorServerMarketingEvent");

    expect(edge).toContain('withSecurity("marketing-event-track"');
    expect(edge).toContain('allowedMethods: ["POST"]');
    expect(edge).toContain('from("analytics_events")');
    expect(edge).toContain('from("conversion_events")');
    expect(edge).toContain("META_ACCESS_TOKEN");
    expect(edge).toContain("META_PIXEL_ID");
    expect(edge).toContain("GOOGLE_ADS_CONVERSION_ACTION_ID_");
    expect(edge).toContain("uploadClickConversions");
    expect(edge).toContain("tiktok_browser_pixel");
    expect(edge).toContain("x_browser_pixel");
    expect(edge).toContain("avoids calling");
    expect(edge).toContain("auditDiagnosticProviders");
    expect(edge).toContain('status: "diagnostic"');
    expect(edge).toContain("without sending provider network calls");

    expect(config).toContain("[functions.marketing-event-track]");
    expect(config).toContain("verify_jwt = false");
    expect(env).toContain("GOOGLE_ADS_CONVERSION_ACTION_ID_PURCHASE");
    expect(env).toContain("GOOGLE_ADS_CONVERSION_ACTION_ID_INITIATE_CHECKOUT");

    expect(adsAnalytics).toContain('from("analytics_events")');
    expect(adsAnalytics).toContain('like("event_name", "marketing_%")');
    expect(adsAnalytics).toContain("tiktok_browser_pixel");
    expect(adsAnalytics).toContain("x_browser_pixel");
    expect(adsAnalytics).toContain("Provider Delivery Log");
    expect(adsAnalytics).toContain("Internal Marketing Events");
    expect(adsAnalytics).toContain("Monetization Readiness");
    expect(adsAnalytics).toContain("Pipeline Test");
    expect(adsAnalytics).toContain("Send Test Lead");
    expect(adsAnalytics).toContain("without firing real ad-platform conversions");
    expect(adsAnalytics).toContain('supabase.functions.invoke("marketing-event-track"');
    expect(adsAnalytics).toContain('event_name: "Lead"');
    expect(adsAnalytics).toContain('source: "admin_diagnostics"');
    expect(adsAnalytics).toContain('fetch("/ads.txt"');
    expect(adsAnalytics).toContain("pub-0000000000000000");
    expect(adsAnalytics).toContain("VITE_GOOGLE_ADSENSE_CLIENT");
    expect(adsAnalytics).toContain("VITE_ADSENSE_SLOT_HOME_FEED");
    expect(adsAnalytics).toContain("value_cents");
  });

  it("keeps Meta server-side conversion events mapped to core revenue tables", () => {
    const capiBridge = read("supabase/functions/meta-capi-bridge/index.ts");
    const conversionBridge = read("supabase/functions/meta-conversion-bridge/index.ts");
    const conversionHandler = read("supabase/functions/meta-conversion-handler/index.ts");
    const metaAdmin = read("src/pages/admin/AdminMetaAdsPage.tsx");

    for (const fn of [capiBridge, conversionBridge]) {
      expect(fn).toContain("graph.facebook.com");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain("access_token");
      expect(fn).toContain("event_id");
      expect(fn).toContain("action_source");
      expect(fn).toContain("sha256");
      expect(fn).toContain("client_ip_address");
      expect(fn).toContain("client_user_agent");
    }

    for (const table of [
      "trips",
      "food_orders",
      "flight_bookings",
      "travel_bookings",
      "transactions",
    ]) {
      expect(conversionBridge).toContain(table);
    }

    expect(conversionBridge).toContain("Purchase");
    expect(conversionBridge).toContain("CompleteRegistration");
    expect(conversionHandler).toContain("meta");
    expect(conversionHandler).toContain('allowedMethods: ["POST"]');
    expect(metaAdmin).toContain("Meta Ads");
    expect(metaAdmin).toContain("ad_campaigns");
  });

  it("keeps Google and Meta campaign creation behind admin-only POST Edge Functions", () => {
    const googleFn = read("supabase/functions/google-ads-create-campaign/index.ts");
    const metaFn = read("supabase/functions/meta-ads-create-campaign/index.ts");
    const googleAdmin = read("src/pages/admin/AdminGoogleAdsPage.tsx");
    const metaAdmin = read("src/pages/admin/AdminMetaAdsPage.tsx");

    for (const fn of [googleFn, metaFn]) {
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).toContain('rpc("has_role"');
      expect(fn).toContain('_role: "admin"');
      expect(fn).toContain('status: "paused"');
      expect(fn).toContain('.from("ad_campaigns")');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(googleFn).toContain('withSecurity("google-ads-create-campaign"');
    expect(metaFn).toContain('withSecurity("meta-ads-create-campaign"');
    expect(googleAdmin).toContain('functions.invoke("google-ads-create-campaign"');
    expect(googleAdmin).toContain("server_publish_error");
    expect(googleAdmin).toContain('status: "pending"');
    expect(metaAdmin).toContain('functions.invoke("meta-ads-create-campaign"');
  });

  it("keeps admin ad feedback queues behind an authenticated admin Edge Function", () => {
    const adminQueue = read("supabase/functions/admin-feedback-queue-write/index.ts");
    const adminQueueGate = read("supabase/migrations/20260601053000_admin_feedback_queue_server_gate.sql");
    const googleAdmin = read("src/pages/admin/AdminGoogleAdsPage.tsx");
    const metaAdmin = read("src/pages/admin/AdminMetaAdsPage.tsx");

    expect(adminQueue).toContain('withSecurity("admin-feedback-queue-write"');
    expect(adminQueue).toContain("strictCors: true");
    expect(adminQueue).toContain('allowedMethods: ["POST"]');
    expect(adminQueue).toContain('trackNetwork: "suspicious"');
    expect(adminQueue).toContain("blockNetworkRiskAt: 80");
    expect(adminQueue).toContain('rateLimit: "api_general"');
    expect(adminQueue).toContain('auth.getUser()');
    expect(adminQueue).toContain('rpc("has_role"');
    expect(adminQueue).toContain('_role: "admin"');
    expect(adminQueue).toContain('from("feedback_submissions")');
    expect(adminQueue).toContain("admin_fb_config");
    expect(adminQueue).toContain("fb_scheduled_post");
    expect(adminQueue).toContain("google_ads_conversion_test");
    expect(adminQueue).toContain("replace_fb_config");
    expect(adminQueue).toContain("delete_fb_config");
    expect(adminQueue).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(adminQueueGate).toContain("AS RESTRICTIVE");
    expect(adminQueueGate).toContain("FOR INSERT");
    expect(adminQueueGate).toContain("admin_fb_config");
    expect(adminQueueGate).toContain("fb_scheduled_post");
    expect(adminQueueGate).toContain("google_ads_conversion_test");
    expect(adminQueueGate).toContain("trusted server-side ingestion");

    for (const adminPage of [googleAdmin, metaAdmin]) {
      expect(adminPage).toContain('functions.invoke("admin-feedback-queue-write"');
      expect(adminPage).not.toMatch(/from\("feedback_submissions" as any\)[\s\S]{0,120}\.insert/);
    }

    expect(metaAdmin).not.toMatch(/from\("feedback_submissions" as any\)[\s\S]{0,120}\.delete/);
  });

  it("keeps ads wallet auto-recharge internal-only and POST-gated", () => {
    const recharge = read("supabase/functions/auto-recharge-ads-wallet/index.ts");
    const topup = read("supabase/functions/create-ads-wallet-topup/index.ts");
    const verifyTopup = read("supabase/functions/verify-ads-wallet-topup/index.ts");

    expect(recharge).toContain('withSecurity("auto-recharge-ads-wallet"');
    expect(recharge).toContain("strictCors: true");
    expect(recharge).toContain('allowedMethods: ["POST"]');
    expect(recharge).toContain('rateLimit: "admin_action"');
    expect(recharge).toContain('trackNetwork: "suspicious"');
    expect(recharge).toContain("skipBotDetection: true");
    expect(recharge).toContain("skipWaf: true");
    expect(recharge).toContain("isInternalCaller(req)");
    expect(recharge).toContain("x-cron-secret");
    expect(recharge).toContain("stripe.paymentIntents.create");
    expect(recharge).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(topup).toContain('withSecurity("create-ads-wallet-topup"');
    expect(topup).toContain("strictCors: true");
    expect(topup).toContain('allowedMethods: ["POST"]');
    expect(topup).toContain('rateLimit: "payment"');
    expect(topup).toContain('trackNetwork: "suspicious"');
    expect(topup).toContain("blockNetworkRiskAt: 80");
    expect(topup).toContain("stripe.checkout.sessions.create");
    expect(topup).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(verifyTopup).toContain('withSecurity("verify-ads-wallet-topup"');
    expect(verifyTopup).toContain("strictCors: true");
    expect(verifyTopup).toContain('allowedMethods: ["POST"]');
    expect(verifyTopup).toContain('rateLimit: "payment"');
    expect(verifyTopup).toContain("blockNetworkRiskAt: 80");
    expect(verifyTopup).toContain("ads_wallet_ledger");
    expect(verifyTopup).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("keeps Ads Studio attribution tied to orders, creative performance, and ROAS rollups", () => {
    const track = read("supabase/functions/ads-studio-track/index.ts");
    const conversion = read("supabase/functions/ads-studio-track-conversion/index.ts");
    const autoWinner = read("supabase/functions/ads-studio-auto-winner/index.ts");
    const budgetGuard = read("supabase/functions/ads-studio-budget-guard/index.ts");
    const exportBundle = read("supabase/functions/ads-studio-export/index.ts");
    const generate = read("supabase/functions/ads-studio-generate/index.ts");
    const publish = read("supabase/functions/ads-studio-publish/index.ts");
    const recommendations = read("supabase/functions/ads-studio-recommendations/index.ts");
    const storeMarketingOverview = read("src/hooks/useStoreMarketingOverview.ts");
    const analytics = read("src/components/admin/AdsStudioAnalytics.tsx");
    const dashboard = read("src/components/admin/AdsStudioDashboard.tsx");
    const walletGuard = read("src/components/admin/AdsStudioWalletGuard.tsx");
    const adsAdmin = read("src/pages/admin/AdminAdsAnalyticsPage.tsx");

    const adsRoutes = {
      "ads-studio-auto-winner": autoWinner,
      "ads-studio-budget-guard": budgetGuard,
      "ads-studio-export": exportBundle,
      "ads-studio-generate": generate,
      "ads-studio-publish": publish,
      "ads-studio-recommendations": recommendations,
      "ads-studio-track": track,
      "ads-studio-track-conversion": conversion,
    };

    for (const [route, fn] of Object.entries(adsRoutes)) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain(route === "ads-studio-track" ? 'allowedMethods: ["GET", "POST"]' : 'allowedMethods: ["POST"]');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    for (const cronRoute of [autoWinner, budgetGuard, publish]) {
      expect(cronRoute).toContain("isServiceRoleRequest(req,");
      expect(cronRoute).toContain("skipBotDetection: true");
    }

    expect(exportBundle).toContain("(c as any).restaurants?.owner_id !== u.user.id");
    expect(generate).toContain("store.owner_id !== user.id");
    expect(publish).toContain("store.owner_id !== user.id");
    expect(publish).toContain('.eq("store_id", body.store_id)');
    expect(recommendations).toContain("store.owner_id !== user.id");
    expect(recommendations).toContain('r.role === "admin"');

    expect(track).toContain("ads_studio_events");
    expect(track).toContain("event_type");
    expect(track).toContain("creative_id");
    expect(track).toContain("variant_id");

    expect(conversion).toContain("Authentication required");
    expect(conversion).toContain("food_orders");
    expect(conversion).toContain("Order not found or access denied");
    expect(conversion).toContain("ads_click_id");
    expect(conversion).toContain("ads_creative_id");
    expect(conversion).toContain("ads_variant_id");
    expect(conversion).toContain("ads_platform");
    expect(conversion).toContain('event_type: "conversion"');
    expect(conversion).toContain("revenue_cents");
    expect(conversion).toContain("ads_studio_daily_spend");
    expect(conversion).toContain("conversions");

    expect(storeMarketingOverview).toContain('from("store_ad_campaigns" as any)');
    expect(storeMarketingOverview).toContain('.eq("store_id", storeId)');
    expect(storeMarketingOverview).not.toContain('from("ad_campaigns")');

    for (const surface of [analytics, dashboard, walletGuard, adsAdmin]) {
      expect(surface).toMatch(/ads|campaign|conversion|wallet|spend|roas/i);
    }
  });

  it("keeps creator subscriptions, video monetization, affiliate tracking, and payouts connected", () => {
    const tierIntent = read("supabase/functions/subscribe-to-tier-intent/index.ts");
    const subscribeToTier = read("supabase/functions/subscribe-to-tier/index.ts");
    const subscriptionGate = read("supabase/migrations/20260531223000_creator_subscriptions_server_gate.sql");
    const paidAccessGate = read("supabase/migrations/20260531224500_paid_content_access_server_gate.sql");
    const creatorTipsGate = read("supabase/migrations/20260531230000_creator_tips_server_gate.sql");
    const fanBadgesGate = read("supabase/migrations/20260531231500_fan_badges_server_gate.sql");
    const milestoneGate = read("supabase/migrations/20260531233000_creator_milestones_server_gate.sql");
    const creatorLinksGate = read("supabase/migrations/20260601000500_creator_links_owner_and_metrics_gate.sql");
    const affiliateLinksGate = read("supabase/migrations/20260601001500_affiliate_links_owner_and_metrics_gate.sql");
    const affiliateUrlGate = read("supabase/migrations/20260601003000_affiliate_links_url_safety_gate.sql");
    const affiliateClickLogGate = read("supabase/migrations/20260601004500_affiliate_click_logs_server_gate.sql");
    const milestoneCelebrate = read("supabase/functions/creator-milestone-celebrate/index.ts");
    const affiliateRedirectFn = read("supabase/functions/affiliate-link-redirect/index.ts");
    const affiliateClickLogFn = read("supabase/functions/affiliate-click-log/index.ts");
    const confirmTier = read("supabase/functions/confirm-tier-subscription/index.ts");
    const cancelSubscription = read("supabase/functions/cancel-creator-subscription/index.ts");
    const tipCheckout = read("supabase/functions/create-tip-checkout/index.ts");
    const tipIntent = read("supabase/functions/create-tip-payment-intent/index.ts");
    const paypalTip = read("supabase/functions/create-tip-paypal-order/index.ts");
    const creatorSubscribe = read("src/components/creator/CreatorTiersSubscribe.tsx");
    const myUnlocks = read("src/pages/MyUnlocksPage.tsx");
    const fanBadges = read("src/pages/FanBadgesPage.tsx");
    const creatorMilestones = read("src/pages/CreatorMilestonesPage.tsx");
    const linkHub = read("src/pages/LinkHubPage.tsx");
    const creatorTips = read("src/pages/CreatorTipsPage.tsx");
    const accountTips = read("src/pages/account/AccountTipsPage.tsx");
    const ppvStrip = read("src/components/ppv/CreatorPPVStrip.tsx");
    const creatorDashboard = read("src/pages/CreatorDashboardPage.tsx");
    const monetization = read("src/pages/MonetizationPage.tsx");
    const affiliateTracking = read("src/lib/affiliateTracking.ts");
    const outboundTracking = read("src/lib/outboundTracking.ts");
    const affiliateConfig = read("src/config/affiliateLinks.ts");
    const affiliateRedirectPage = read("src/pages/AffiliateRedirectPage.tsx");
    const affiliateLinksPage = read("src/pages/AffiliateLinksPage.tsx");
    const affiliateLinkSheet = read("src/components/affiliate/AffiliateLinkSheet.tsx");
    const payoutWorkflow = read("src/test/workflows/payouts-earnings-workflow.test.ts");

    expect(tierIntent).toContain("stripe");
    expect(tierIntent).toContain("creator");
    expect(tierIntent).toContain("tier");
    expect(tierIntent).toContain("client_secret");
    expect(tierIntent).toContain('withSecurity("subscribe-to-tier-intent"');
    expect(tierIntent).toContain('allowedMethods: ["POST"]');
    expect(tierIntent).toContain("strictCors: true");
    expect(tierIntent).toContain('trackNetwork: "suspicious"');
    expect(tierIntent).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(subscribeToTier).toContain("creator");
    expect(subscribeToTier).toContain("subscriber");
    expect(subscribeToTier).toContain("tier");
    expect(subscribeToTier).toContain('withSecurity("subscribe-to-tier"');
    expect(subscribeToTier).toContain('allowedMethods: ["POST"]');
    expect(subscribeToTier).toContain("strictCors: true");
    expect(subscribeToTier).toContain('trackNetwork: "suspicious"');
    expect(subscribeToTier).toContain('withIdempotency(req, "subscribe-to-tier", user.id');
    expect(subscribeToTier).toContain('"X-Idempotency-Cache": result.cached ? "HIT" : "MISS"');
    expect(subscribeToTier).toContain("if (tier.is_free)");
    expect(subscribeToTier).toContain('.from("creator_subscriptions")');
    expect(subscribeToTier).toContain("payment_method: \"free\"");
    expect(subscribeToTier).not.toContain('"Access-Control-Allow-Origin": "*"');
    expect(subscriptionGate).toContain('DROP POLICY IF EXISTS "cs_ins_free_tier_only"');
    expect(subscriptionGate).toContain('DROP POLICY IF EXISTS "cs_ins"');
    expect(subscriptionGate).toContain("server/payment flows only");
    expect(paidAccessGate).toContain('DROP POLICY IF EXISTS "pca_ins"');
    expect(paidAccessGate).toContain("trusted wallet/payment flows only");
    expect(creatorTipsGate).toContain('DROP POLICY IF EXISTS "ct_ins"');
    expect(creatorTipsGate).toContain("trusted payment functions and webhooks only");
    expect(fanBadgesGate).toContain('DROP POLICY IF EXISTS "fb_ins"');
    expect(fanBadgesGate).toContain("trusted server flows only");
    expect(milestoneGate).toContain("trusted server flows only");
    expect(milestoneCelebrate).toContain('withSecurity("creator-milestone-celebrate"');
    expect(milestoneCelebrate).toContain('allowedMethods: ["POST"]');
    expect(milestoneCelebrate).toContain('.from("creator_milestones")');
    expect(milestoneCelebrate).toContain('.eq("creator_id", userData.user.id)');
    expect(milestoneCelebrate).toContain("is_celebrated: true");
    expect(creatorLinksGate).toContain('DROP POLICY IF EXISTS "cln_ins"');
    expect(creatorLinksGate).toContain('CREATE POLICY "cln_ins_profile_owner"');
    expect(creatorLinksGate).toContain("cp.id = creator_links.creator_id");
    expect(creatorLinksGate).toContain("cp.user_id = auth.uid()");
    expect(creatorLinksGate).toContain("prevent_direct_creator_link_metric_writes");
    expect(creatorLinksGate).toContain("creator_link_metrics_server_gate_required");
    expect(creatorLinksGate).toContain("NEW.click_count IS DISTINCT FROM OLD.click_count");
    expect(affiliateLinksGate).toContain("affiliate_links_owner_read");
    expect(affiliateLinksGate).toContain("owner_id = auth.uid()");
    expect(affiliateLinksGate).toContain("prevent_direct_affiliate_link_metric_writes");
    expect(affiliateLinksGate).toContain("affiliate_link_metrics_server_gate_required");
    expect(affiliateLinksGate).toContain("NEW.click_count IS DISTINCT FROM OLD.click_count");
    expect(affiliateLinksGate).toContain("NEW.conversion_count IS DISTINCT FROM OLD.conversion_count");
    expect(affiliateLinksGate).toContain("NEW.earnings_cents IS DISTINCT FROM OLD.earnings_cents");
    expect(affiliateLinksGate).toContain("record_affiliate_link_click");
    expect(affiliateLinksGate).toContain("GRANT EXECUTE ON FUNCTION public.record_affiliate_link_click(text) TO service_role");
    expect(affiliateUrlGate).toContain("affiliate_link_target_url_invalid");
    expect(affiliateUrlGate).toContain("normalized_target !~ '^https?://[^[:space:]]+$'");
    expect(affiliateUrlGate).toContain("Blocks unsafe affiliate redirect target URLs");
    expect(affiliateClickLogGate).toContain('DROP POLICY IF EXISTS "Anyone can insert click logs"');
    expect(affiliateClickLogGate).toContain("trusted server-side tracking");
    expect(affiliateRedirectFn).toContain('withSecurity("affiliate-link-redirect"');
    expect(affiliateRedirectFn).toContain('allowedMethods: ["POST"]');
    expect(affiliateRedirectFn).toContain('rpc("record_affiliate_link_click"');
    expect(affiliateRedirectFn).toContain("strictCors: true");
    expect(affiliateClickLogFn).toContain('withSecurity("affiliate-click-log"');
    expect(affiliateClickLogFn).toContain('allowedMethods: ["POST"]');
    expect(affiliateClickLogFn).toContain('from("affiliate_click_logs")');
    expect(affiliateClickLogFn).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(affiliateClickLogFn).toContain("safeUrl(body.destination_url)");
    expect(affiliateClickLogFn).toContain("strictCors: true");
    expect(confirmTier).toContain('withSecurity("confirm-tier-subscription"');
    expect(confirmTier).toContain('allowedMethods: ["POST"]');
    expect(confirmTier).toContain("strictCors: true");
    expect(confirmTier).toContain('trackNetwork: "suspicious"');
    expect(confirmTier).toContain("rateLimitDb(user.id, \"payment\")");
    expect(confirmTier).toContain("payment does not belong to caller");
    expect(confirmTier).toContain("subscription does not belong to caller");
    expect(confirmTier).not.toContain('"Access-Control-Allow-Origin": "*"');
    expect(cancelSubscription).toContain("subscription");
    expect(cancelSubscription).toContain('withSecurity("cancel-creator-subscription"');
    expect(cancelSubscription).toContain('allowedMethods: ["POST"]');
    expect(cancelSubscription).toContain('rateLimit: "payment"');
    expect(tipCheckout).toContain('allowedMethods: ["POST"]');
    expect(tipIntent).toContain('allowedMethods: ["POST"]');

    expect(creatorSubscribe).toContain("CreatorTiersSubscribe");
    expect(creatorSubscribe).toContain("Subscribe");
    expect(creatorSubscribe).toContain('functions.invoke("subscribe-to-tier"');
    expect(creatorSubscribe).toContain('"Idempotency-Key": idempotencyKey');
    expect(creatorSubscribe).not.toMatch(/from\("creator_subscriptions"\)[\s\S]{0,120}\.insert/);
    expect(myUnlocks).toContain("paid_content_access");
    expect(myUnlocks).toContain("Read-only view");
    expect(myUnlocks).not.toMatch(/from\("paid_content_access"\)[\s\S]{0,120}\.insert/);
    expect(fanBadges).toContain("fan_badges");
    expect(fanBadges).toContain("Read-only view");
    expect(fanBadges).not.toMatch(/from\("fan_badges"\)[\s\S]{0,120}\.insert/);
    expect(creatorMilestones).toContain("creator_milestones");
    expect(creatorMilestones).toContain('functions.invoke("creator-milestone-celebrate"');
    expect(creatorMilestones).not.toMatch(/from\("creator_milestones"\)[\s\S]{0,120}\.update/);
    expect(linkHub).toContain("creator_links");
    expect(linkHub).toContain("click_count");
    expect(linkHub).not.toMatch(/from\("creator_links"\)[\s\S]{0,160}\.update\(\{\s*click_count/);
    expect(linkHub).not.toMatch(/from\("creator_links"\)[\s\S]{0,160}\.insert\(\{[\s\S]{0,160}click_count/);
    for (const fn of [tipCheckout, tipIntent, paypalTip]) {
      expect(fn).toContain('from("creator_tips")');
      expect(fn).toContain("serviceKey");
      expect(fn).toContain('withSecurity("');
      expect(fn).toContain("strictCors: true");
    }
    for (const surface of [creatorTips, accountTips]) {
      expect(surface).toContain("creator_tips");
      expect(surface).not.toMatch(/from\("creator_tips"\)[\s\S]{0,120}\.insert/);
    }
    expect(ppvStrip).toMatch(/ppv|paid|unlock|price/i);
    expect(creatorDashboard).toMatch(/earnings|subscriber|analytics|payout/i);
    expect(monetization).toMatch(/creator|subscriber|earning|payout|video/i);

    expect(affiliateTracking).toContain("affiliate");
    expect(affiliateTracking).toContain("subid");
    expect(affiliateTracking).toContain('functions.invoke("affiliate-click-log"');
    expect(affiliateTracking).not.toMatch(/from\("affiliate_click_logs"\)[\s\S]{0,120}\.insert/);
    expect(outboundTracking).toContain("affiliate-click-log");
    expect(outboundTracking).not.toMatch(/from\('affiliate_click_logs'\)[\s\S]{0,120}\.insert/);
    expect(affiliateConfig).toContain("affiliate");
    expect(affiliateRedirectPage).toContain('functions.invoke("affiliate-link-redirect"');
    expect(affiliateRedirectPage).not.toContain('.from("affiliate_links")');
    expect(affiliateRedirectPage).not.toMatch(/update\(\{\s*click_count/);
    expect(affiliateLinksPage).toContain("affiliate_links");
    expect(affiliateLinksPage).not.toMatch(/from\("affiliate_links"\)[\s\S]{0,160}\.update\(\{[\s\S]{0,120}(click_count|conversion_count|earnings_cents)/);
    expect(affiliateLinkSheet).toContain("affiliate_links");
    expect(affiliateLinkSheet).toContain("validateExternalUrl(detail.targetUrl)");
    expect(affiliateLinkSheet).toContain("target_url: safeUrl");
    expect(affiliateLinkSheet).not.toMatch(/insert\(\{[\s\S]{0,160}(click_count|conversion_count|earnings_cents)/);

    expect(payoutWorkflow).toContain("CreatorPayoutsPage");
    expect(payoutWorkflow).toContain("creator-payout-request");
    expect(payoutWorkflow).toContain("creator_earnings");
    expect(payoutWorkflow).toContain("creator_payouts");
  });

  it("documents the provider roadmap for Meta, Google Ads, TikTok, and X before scale-up", () => {
    const roadmap = read("docs/zivo-full-platform-update-roadmap.md");

    expect(roadmap).toContain("Google Ads");
    expect(roadmap).toContain("Meta/Facebook/Instagram");
    expect(roadmap).toContain("TikTok");
    expect(roadmap).toContain("X:");
    expect(roadmap).toContain("One event schema");
    expect(roadmap).toContain("Meta, Google, TikTok, X");
    expect(roadmap).toContain("One Supabase Edge Function");
    expect(roadmap).toContain("Consent gates");
    expect(roadmap).toContain("Admin diagnostics page");
  });
});
