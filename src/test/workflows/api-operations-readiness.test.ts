import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

describe("API, speed, and operations readiness workflow", () => {
  it("wires the API operations contract gate into platform audit", () => {
    const contract = source("scripts/qa/api-operations-contracts.mjs");
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const workflowCoverage = source("scripts/qa/workflow-coverage.mjs");
    const packageJson = source("package.json");

    for (const contractId of [
      "edge-wrapper-observability",
      "preflight-and-runtime-artifacts",
      "operations-runbook-alert-owners",
      "webhook-and-payment-ops-surfaces",
      "cron-monitor-and-maintenance-routes",
    ]) {
      expect(contract).toContain(contractId);
    }

    expect(matrix).toContain("src/test/workflows/api-operations-readiness.test.ts");
    expect(matrix).toContain("src/test/webhookFailureAlerting.test.ts");
    expect(matrix).toContain("npx playwright test tests/e2e/server-error-fallbacks.spec.ts");
    expect(matrix).toContain("server-error fallbacks, and API readiness green");
    expect(workflowCoverage).toContain("qa:api-operations-contracts");
    expect(packageJson).toContain('"qa:api-operations-contracts": "node scripts/qa/api-operations-contracts.mjs"');
    expect(packageJson).toContain("npm run qa:api-operations-contracts");
  });

  it("keeps critical Edge Functions observable through the shared security wrapper", () => {
    const wrapper = source("supabase/functions/_shared/withSecurity.ts");
    const audit = source("supabase/functions/_shared/audit.ts");
    const limiter = source("supabase/functions/_shared/rateLimiter.ts");
    const readiness = source("scripts/security/api-readiness-check.mjs");

    expect(wrapper).toContain("x-request-id");
    expect(wrapper).toContain("request_completed");
    expect(wrapper).toContain("request_failed");
    expect(wrapper).toContain("err(req, 'Internal error', 500");
    expect(wrapper).toContain("recordSecurityEvent");
    expect(wrapper).toContain("recordNetworkEvent");
    expect(wrapper).toContain("rateLimit(ip, opts.rateLimit)");

    expect(audit).toContain("security_events");
    expect(audit).toContain("network_security_events");
    expect(audit).toContain("audit_logs");

    expect(limiter).toContain("auth_login");
    expect(limiter).toContain("payment");
    expect(limiter).toContain("rateLimitDb");

    expect(readiness).toContain("checkOperationsRunbook");
    expect(readiness).toContain("api-operations-runbook.md");
    expect(readiness).toContain("methodGated");
    expect(readiness).toContain("missingMethodGate");
    expect(readiness).toContain("highRiskMissingMethodGate");
    expect(readiness).toContain("Method-gated Edge Functions");
    expect(readiness).toContain("High-Risk Functions Missing allowedMethods");
    expect(readiness).toContain("function 5xx");
    expect(readiness).toContain("webhook failure");
    expect(readiness).toContain("slow query");
    expect(readiness).toContain("auth spike");
    expect(readiness).toContain("payment spike");
    expect(readiness).toContain("looseRouteBacklog");
    expect(readiness).toContain("edge-function-security-backlog");
    expect(readiness).toContain("edge-function-method-gate-backlog");
    expect(readiness).toContain("Every Edge Function must use withSecurity()");
    expect(readiness).toContain("must declare wrapper-level allowedMethods");

    const runbook = source("docs/api-operations-runbook.md");
    expect(runbook).toContain("method gate backlog");
    expect(runbook).toContain("wrapper-level `allowedMethods`");
  });

  it("keeps flexible read, cron, webhook, and proxy routes explicitly method-bounded", () => {
    for (const route of [
      "ar-reminders-dispatch",
      "bot-ai-handler",
      "bot-api",
      "bot-dispatch",
      "clock-qr",
      "compute-eta",
      "export-moderation-actions-csv",
      "get-ice-servers",
      "lodging-ical-export",
      "lodging-ical-import",
      "lodging-wiring-monitor",
      "process-security-notifications",
      "refresh-popular-routes",
      "refresh-smart-deals",
      "salon-low-stock-digest",
      "schedule-fire",
      "secret-media-prune",
      "security-cleanup",
      "supplier-proxy",
    ]) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain('allowedMethods: ["GET", "POST"]');
      expect(fn).toContain("strictCors: true");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });

  it("surfaces webhook failures and payment mismatches to admin operations", () => {
    const webhookStatus = source("src/pages/admin/AdminWebhookStatusPage.tsx");
    const lodgingEvents = source("src/pages/admin/AdminLodgingWebhookEventsPage.tsx");
    const paymentsWorkflow = source("src/test/workflows/payments-refunds-webhooks.test.ts");

    expect(webhookStatus).toContain('supabase.from("webhook_events")');
    expect(webhookStatus).toContain("Mismatch alerts");
    expect(webhookStatus).toContain("payment_failed");
    expect(webhookStatus).toContain("PaymentIntent");

    expect(lodgingEvents).toContain("lodging_stripe_webhook_events");
    expect(lodgingEvents).toContain("Last 200 Stripe webhook events");

    expect(paymentsWorkflow).toContain("grocery_paypal_webhook_events");
    expect(paymentsWorkflow).toContain("grocery_square_webhook_events");
    expect(paymentsWorkflow).toContain("paymentWebhookIdempotency");
  });

  it("keeps public report sinks, contact matching, and moderation export on strict wrappers", () => {
    const csp = source("supabase/functions/csp-report/index.ts");
    const contact = source("supabase/functions/contact-match/index.ts");
    const moderationExport = source("supabase/functions/export-moderation-actions-csv/index.ts");

    for (const [route, fn] of [
      ["csp-report", csp],
      ["contact-match", contact],
      ["export-moderation-actions-csv", moderationExport],
    ] as const) {
      expect(fn).toContain("withSecurity(");
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(csp).toContain('withSecurity("csp-report"');
    expect(csp).toContain("skipBotDetection: true");
    expect(csp).toContain("Always return 204");

    expect(contact).toContain('withSecurity("contact-match"');
    expect(contact).toContain("auth.getUser()");
    expect(contact).toContain("slice(0, 2000)");
    expect(contact).toContain("phone_hash");

    expect(moderationExport).toContain('withSecurity("export-moderation-actions-csv"');
    expect(moderationExport).toContain("has_role");
    expect(moderationExport).toContain("_role: \"admin\"");
    expect(moderationExport).toContain("Content-Disposition");
  });

  it("keeps hotel AI, live signaling, recording, and store lookup endpoints bounded", () => {
    const hotelAsk = source("supabase/functions/hotel-ask/index.ts");
    const concierge = source("supabase/functions/hotel-concierge/index.ts");
    const liveSignal = source("supabase/functions/live-signal/index.ts");
    const liveWebrtc = source("src/lib/liveWebrtc.ts");
    const liveSignalGate = source("supabase/migrations/20260601013000_live_stream_signals_server_gate.sql");
    const livekit = source("supabase/functions/livekit-recording/index.ts");
    const lookup = source("supabase/functions/lookup-store-id/index.ts");

    for (const [route, fn] of Object.entries({
      "hotel-ask": hotelAsk,
      "hotel-concierge": concierge,
      "live-signal": liveSignal,
      "livekit-recording": livekit,
      "lookup-store-id": lookup,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      if (route === "live-signal" || route === "livekit-recording") {
        expect(fn).toContain('allowedMethods: ["POST"]');
      }
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    for (const fn of [hotelAsk, concierge]) {
      expect(fn).toContain("rateLimitDb(ip");
      expect(fn).toContain("skipBotDetection: true");
      expect(fn).toContain("ANTHROPIC_API_KEY");
    }

    expect(liveSignal).toContain("publisher_auth_required");
    expect(liveSignal).toContain("x-pair-token");
    expect(liveSignal).toContain("isDuplicateIce");
    expect(liveSignal).toContain("skipBotDetection: true");
    expect(liveWebrtc).toContain('functions.invoke("live-signal"');
    expect(liveWebrtc).not.toMatch(/from\("live_stream_signals"\)[\s\S]{0,160}\.insert/);
    expect(liveSignalGate).toContain('DROP POLICY IF EXISTS "Authenticated insert signals as host or viewer"');
    expect(liveSignalGate).toContain("trusted server-side ingestion");

    expect(livekit).toContain("session.host_id !== user.id");
    expect(livekit).toContain("EgressClient");

    expect(lookup).toContain("Valid email is required");
    expect(lookup).toContain("rateLimitDb(`lookup-store-id:${ip}`");
    expect(lookup).toContain("listUsers");
  });

  it("keeps lodging iCal, marketing tick, chat handoff, and pair-live routes protected", () => {
    const exportFeed = source("supabase/functions/lodging-ical-export/index.ts");
    const importFeed = source("supabase/functions/lodging-ical-import/index.ts");
    const tick = source("supabase/functions/marketing-automations-tick/index.ts");
    const handoff = source("supabase/functions/mint-chat-handoff/index.ts");
    const pairLive = source("supabase/functions/pair-go-live/index.ts");

    for (const [route, fn] of Object.entries({
      "lodging-ical-export": exportFeed,
      "lodging-ical-import": importFeed,
      "marketing-automations-tick": tick,
      "mint-chat-handoff": handoff,
      "pair-go-live": pairLive,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    for (const fn of [exportFeed, importFeed, tick, pairLive]) {
      expect(fn).toContain("skipBotDetection: true");
    }

    expect(exportFeed).toContain("ical_export_token");
    expect(exportFeed).toContain("Content-Type\": \"text/calendar");

    expect(importFeed).toContain("isServiceRoleRequest(req, SERVICE_ROLE)");
    expect(importFeed).toContain("x-cron-secret");
    expect(importFeed).toContain("canManageStore");
    expect(importFeed).toContain("store?.owner_id === userId");
    expect(importFeed).toContain("store_employees");
    expect(importFeed).toContain("user_roles");
    expect(importFeed).toContain("syncConnection(admin, c)");

    expect(tick).toContain("CRON_SECRET");
    expect(tick).toContain("x-cron-secret");
    expect(tick).toContain("notify-dispatch");
    expect(tick).toContain('category: "marketing"');

    expect(handoff).toContain("auth.admin.generateLink");
    expect(handoff).toContain('allowedMethods: ["POST"]');
    expect(handoff).toContain("hashed_token");
    expect(handoff).toContain("email = userData?.user?.email");
    expect(handoff).toContain('rateLimit: "auth_login"');

    expect(pairLive).toContain("get_paired_session_by_token");
    expect(pairLive).toContain('allowedMethods: ["POST"]');
    expect(pairLive).toContain('"start" | "end" | "heartbeat"');
    expect(pairLive).toContain("stream_id");
  });

  it("keeps social preview, Facebook posting, security queue, and avatar upload endpoints bounded", () => {
    const postOg = source("supabase/functions/post-og/index.ts");
    const profileOg = source("supabase/functions/profile-og/index.ts");
    const facebook = source("supabase/functions/post-to-facebook-page/index.ts");
    const securityQueue = source("supabase/functions/process-security-notifications/index.ts");
    const avatarUpload = source("supabase/functions/profile-avatar-upload/index.ts");

    for (const [route, fn] of Object.entries({
      "post-og": postOg,
      "profile-og": profileOg,
      "post-to-facebook-page": facebook,
      "process-security-notifications": securityQueue,
      "profile-avatar-upload": avatarUpload,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      if (route === "profile-avatar-upload") {
        expect(fn).toContain('allowedMethods: ["POST"]');
      }
      if (route === "post-to-facebook-page") {
        expect(fn).toContain('allowedMethods: ["POST"]');
      }
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    for (const fn of [postOg, profileOg, securityQueue]) {
      expect(fn).toContain("skipBotDetection: true");
    }

    expect(postOg).toContain("SOCIAL_CRAWLER_UA");
    expect(postOg).toContain("Location: shareLandingUrl");
    expect(postOg).toContain("resolvePostMeta");

    expect(profileOg).toContain("SOCIAL_CRAWLER_UA");
    expect(profileOg).toContain("resolveOnly");
    expect(profileOg).toContain("Location: shareLandingUrl");

    expect(facebook).toContain("auth.getUser()");
    expect(facebook).toContain("scanContentForLinks");
    expect(facebook).toContain("isAbuseThresholdExceeded");
    expect(facebook).toContain("decryptToken");

    expect(securityQueue).toContain("dequeue_security_notifications");
    expect(securityQueue).toContain("isServiceRoleRequest(req, serviceKey)");
    expect(securityQueue).toContain("x-cron-secret");
    expect(securityQueue).toContain("send-transactional-email");

    expect(avatarUpload).toContain("admin.auth.getUser(token)");
    expect(avatarUpload).toContain('new Set(["image/jpeg", "image/png", "image/webp"])');
    expect(avatarUpload).toContain("5 * 1024 * 1024");
    expect(avatarUpload).toContain("8 * 1024 * 1024");
  });

  it("keeps scheduled maintenance, employee invites, promo redemption, and transcription protected", () => {
    const lowStock = source("supabase/functions/salon-low-stock-digest/index.ts");
    const scheduleFire = source("supabase/functions/schedule-fire/index.ts");
    const mediaPrune = source("supabase/functions/secret-media-prune/index.ts");
    const cleanup = source("supabase/functions/security-cleanup/index.ts");
    const emailInvite = source("supabase/functions/send-employee-email-invite/index.ts");
    const smsInvite = source("supabase/functions/send-employee-sms-invite/index.ts");
    const promo = source("supabase/functions/track-promo-redemption/index.ts");
    const transcribe = source("supabase/functions/transcribe-voice/index.ts");

    for (const [route, fn] of Object.entries({
      "salon-low-stock-digest": lowStock,
      "schedule-fire": scheduleFire,
      "secret-media-prune": mediaPrune,
      "security-cleanup": cleanup,
      "send-employee-email-invite": emailInvite,
      "send-employee-sms-invite": smsInvite,
      "track-promo-redemption": promo,
      "transcribe-voice": transcribe,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    for (const fn of [lowStock, scheduleFire, mediaPrune, cleanup]) {
      expect(fn).toContain("skipBotDetection: true");
      expect(fn).toContain("x-cron-secret");
    }

    expect(scheduleFire).toContain("isServiceRoleRequest(req, serviceKey)");
    expect(scheduleFire).toContain("scheduled_messages");
    expect(mediaPrune).toContain("secret-media");
    expect(mediaPrune).toContain("isServiceRoleRequest(req, serviceKey)");
    expect(cleanup).toContain("prune_expired_ip_blocklist");
    expect(cleanup).toContain("security_notification_queue");

    expect(emailInvite).toContain("auth.getUser()");
    expect(emailInvite).toContain("store.owner_id !== user.id");
    expect(emailInvite).toContain("send-transactional-email");
    expect(smsInvite).toContain("auth.getUser()");
    expect(smsInvite).toContain("store.owner_id !== user.id");
    expect(smsInvite).toContain("TWILIO_ACCOUNT_SID");
    expect(smsInvite).toContain("rate_limited");

    expect(promo).toContain("auth.getClaims(token)");
    expect(promo).toContain("per_customer_limit");
    expect(promo).toContain("marketing_campaign_events");

    expect(transcribe).toContain("auth.getUser(token)");
    expect(transcribe).toContain("canAccessVoiceNote");
    expect(transcribe).toContain("direct_messages");
    expect(transcribe).toContain("message.sender_id === userId || message.receiver_id === userId");
  });

  it("keeps provider webhooks and internal payment crons off legacy wildcard CORS", () => {
    const sharedCors = source("supabase/functions/_shared/cors.ts");
    const wrapper = source("supabase/functions/_shared/withSecurity.ts");
    const authEmail = source("supabase/functions/auth-email-hook/index.ts");
    const staleOrders = source("supabase/functions/auto-cancel-stale-orders/index.ts");
    const adsRecharge = source("supabase/functions/auto-recharge-ads-wallet/index.ts");
    const rideWebhook = source("supabase/functions/stripe-ride-webhook/index.ts");

    expect(sharedCors).toContain("stripe-signature");
    expect(sharedCors).toContain("x-lovable-signature");
    expect(sharedCors).toContain("x-lovable-timestamp");
    expect(wrapper).toContain("stripe-signature");
    expect(wrapper).toContain("x-lovable-signature");
    expect(wrapper).toContain("x-lovable-timestamp");

    for (const [route, fn] of Object.entries({
      "auth-email-hook": authEmail,
      "auto-cancel-stale-orders": staleOrders,
      "auto-recharge-ads-wallet": adsRecharge,
      "stripe-ride-webhook": rideWebhook,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(authEmail).toContain("verifyWebhookRequest");
    expect(authEmail).toContain('allowedMethods: ["POST"]');
    expect(authEmail).toContain("handlePreview(req, corsHeaders)");
    expect(authEmail).toContain("handleWebhook(req, corsHeaders)");
    expect(staleOrders).toContain("isInternalCaller(req)");
    expect(staleOrders).toContain('allowedMethods: ["POST"]');
    expect(adsRecharge).toContain('allowedMethods: ["POST"]');
    expect(adsRecharge).toContain("stripe.paymentIntents.create");
    expect(rideWebhook).toContain("constructEventAsync");
    expect(rideWebhook).toContain("stripe-signature");
  });

  it("keeps device linking and clock QR flows on strict shared security", () => {
    const issue = source("supabase/functions/device-link-issue/index.ts");
    const claim = source("supabase/functions/device-link-claim/index.ts");
    const register = source("supabase/functions/device-register/index.ts");
    const manage = source("supabase/functions/linked-device-manage/index.ts");
    const manageGate = source("supabase/migrations/20260601111500_linked_devices_server_gate.sql");
    const linkedDevicesHook = source("src/hooks/useLinkedDevices.ts");
    const clockQr = source("supabase/functions/clock-qr/index.ts");

    for (const [route, fn] of Object.entries({
      "device-link-issue": issue,
      "device-link-claim": claim,
      "device-register": register,
      "linked-device-manage": manage,
      "clock-qr": clockQr,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"../_shared/cors.ts"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(issue).toContain("cleanup_expired_device_link_tokens");
    expect(issue).toContain("issuer_user_id: userData.user.id");
    expect(claim).toContain("row.issuer_user_id !== userData.user.id");
    expect(claim).toContain("linked_devices");
    expect(register).toContain("device_fingerprint");
    expect(register).toContain("userData.user.id");
    expect(manage).toContain("auth.getUser(token)");
    expect(manage).toContain('from("linked_devices")');
    expect(manage).toContain('.eq("user_id", user.id)');
    expect(manage).toContain("cleanUuid");
    expect(manageGate).toContain("linked_devices_block_direct_delete");
    expect(manageGate).toContain("AS RESTRICTIVE");
    expect(manageGate).toContain("trusted server-side ownership validation");
    expect(linkedDevicesHook).toContain('functions.invoke("linked-device-manage"');
    expect(linkedDevicesHook).not.toMatch(/from\("linked_devices"\)[\s\S]{0,180}\.delete/);
    expect(clockQr).toContain('action === "generate"');
    expect(clockQr).toContain('action === "validate"');
    expect(clockQr).toContain('.eq("owner_id", userId)');
    expect(clockQr).toContain("store_time_entries");
  });

  it("keeps ride and Eats dispatch helpers on strict internal security", () => {
    const ride = source("supabase/functions/dispatch-ride/index.ts");
    const start = source("supabase/functions/dispatch-start/index.ts");
    const eats = source("supabase/functions/dispatch-eats-order/index.ts");
    const eta = source("supabase/functions/compute-eta/index.ts");

    for (const [route, fn] of Object.entries({
      "dispatch-ride": ride,
      "dispatch-start": start,
      "dispatch-eats-order": eats,
      "compute-eta": eta,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).toContain("skipBotDetection: true");
      expect(fn).not.toContain('"../_shared/cors.ts"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    for (const fn of [ride, eats, eta]) {
      expect(fn).toContain("isServiceRoleRequest(req, serviceKey)");
    }

    expect(ride).toContain("job_offers");
    expect(ride).toContain("ride_requests");
    expect(eta).toContain("GOOGLE_MAPS_API_KEY");
    expect(eta).toContain("eta_minutes");

    expect(eats).toContain("payment_status");
    expect(eats).toContain('payment_status !== "paid"');
    expect(eats).toContain("dispatch-start");
    expect(eats).toContain("isServiceRoleRequest(req, serviceKey)");

    expect(start).toContain("isServiceRoleRequest(req, serviceRoleKey)");
    expect(start).toContain("if (!isInternal)");
    expect(start).toContain("job.customer_id !== userId");
    expect(start).toContain("manualDispatch(adminClient, jobId, job.customer_id");
  });

  it("keeps deposits, gift cards, and salon off-session charges on payment security", () => {
    const lodging = source("supabase/functions/create-lodging-deposit/index.ts");
    const carRental = source("supabase/functions/create-car-rental-deposit/index.ts");
    const salonDeposit = source("supabase/functions/create-salon-deposit/index.ts");
    const noShow = source("supabase/functions/charge-salon-no-show-fee/index.ts");
    const tip = source("supabase/functions/charge-salon-tip/index.ts");
    const giftPurchase = source("supabase/functions/purchase-gift-card/index.ts");
    const giftRedeem = source("supabase/functions/redeem-gift-card/index.ts");

    for (const [route, fn] of Object.entries({
      "create-lodging-deposit": lodging,
      "create-car-rental-deposit": carRental,
      "create-salon-deposit": salonDeposit,
      "charge-salon-no-show-fee": noShow,
      "charge-salon-tip": tip,
      "purchase-gift-card": giftPurchase,
      "redeem-gift-card": giftRedeem,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain("getCorsHeaders");
      expect(fn).not.toContain('"../_shared/cors.ts"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(lodging).toContain("payment_lock_token");
    expect(lodging).toContain("lodging_deposit_retry_attempts");
    expect(lodging).toContain("rateLimitDb(user.id, \"payment\")");
    expect(carRental).toContain("car_rental_payment_attempts");
    expect(carRental).toContain("capture_method");
    expect(salonDeposit).toContain("transfer_data: { destination: accountId }");
    expect(salonDeposit).toContain("setup_future_usage: \"off_session\"");
    expect(noShow).toContain("store_members");
    expect(noShow).toContain("off_session: true");
    expect(tip).toContain("MAX_TIP_CENTS");
    expect(tip).toContain("tip_stripe_payment_intent_id");
    expect(giftPurchase).toContain("PRESET_AMOUNTS");
    expect(giftPurchase).toContain("gift_card_purchase");
    expect(giftRedeem).toContain("rateLimitDb(user.id, \"payment\")");
    expect(giftRedeem).toContain("customer_wallet_transactions");
  });

  it("keeps ads, smart deals, driver Connect, and salon membership sync bounded", () => {
    const smartDeals = source("supabase/functions/ai-smart-deals/index.ts");
    const refreshDeals = source("supabase/functions/refresh-smart-deals/index.ts");
    const refreshRoutes = source("supabase/functions/refresh-popular-routes/index.ts");
    const googleCreate = source("supabase/functions/google-ads-create-campaign/index.ts");
    const googleConversion = source("supabase/functions/google-ads-conversion/index.ts");
    const metaCreate = source("supabase/functions/meta-ads-create-campaign/index.ts");
    const driverOnboard = source("supabase/functions/driver-connect-onboard/index.ts");
    const driverStatus = source("supabase/functions/driver-connect-status/index.ts");
    const membership = source("supabase/functions/sync-salon-membership-tier/index.ts");

    for (const [route, fn] of Object.entries({
      "ai-smart-deals": smartDeals,
      "refresh-smart-deals": refreshDeals,
      "refresh-popular-routes": refreshRoutes,
      "google-ads-create-campaign": googleCreate,
      "google-ads-conversion": googleConversion,
      "meta-ads-create-campaign": metaCreate,
      "driver-connect-onboard": driverOnboard,
      "driver-connect-status": driverStatus,
      "sync-salon-membership-tier": membership,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain("getCorsHeaders");
      expect(fn).not.toContain('"../_shared/cors.ts"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    for (const fn of [refreshDeals, refreshRoutes, googleConversion]) {
      expect(fn).toContain("isServiceRoleRequest(req");
    }
    for (const fn of [refreshDeals, refreshRoutes, googleConversion]) {
      expect(fn).toContain("skipBotDetection: true");
    }

    expect(smartDeals).toContain("rateLimitDb(rateLimitKey, \"api_general\")");
    expect(smartDeals).toContain("ai_smart_deals_cache");
    expect(refreshDeals).toContain("x-cron-secret");
    expect(refreshDeals).toContain("ai_deals_refresh_log");
    expect(refreshRoutes).toContain("x-cron-secret");
    expect(refreshRoutes).toContain("popular_route_prices");

    expect(googleCreate).toContain("has_role");
    expect(googleCreate).toContain("_role: \"admin\"");
    expect(googleConversion).toContain("uploadClickConversions");
    expect(metaCreate).toContain("has_role");
    expect(metaCreate).toContain("META_ACCESS_TOKEN");

    expect(driverOnboard).toContain("stripe.accounts.create");
    expect(driverOnboard).toContain("driver_stripe_accounts");
    expect(driverStatus).toContain("stripe.accounts.retrieve");
    expect(membership).toContain("store_members");
    expect(membership).toContain("stripe.prices.create");
  });

  it("keeps remaining service-role travel, signup, webhooks, and monitor routes bounded", () => {
    const duffel = source("supabase/functions/duffel-flights/index.ts");
    const stylist = source("supabase/functions/connect-onboard-stylist/index.ts");
    const escalate = source("supabase/functions/dispatch-escalate/index.ts");
    const suppression = source("supabase/functions/handle-email-suppression/index.ts");
    const wiring = source("supabase/functions/lodging-wiring-monitor/index.ts");
    const capi = source("supabase/functions/meta-capi-bridge/index.ts");
    const conversion = source("supabase/functions/meta-conversion-bridge/index.ts");
    const signup = source("supabase/functions/public-signup/index.ts");
    const subscribe = source("supabase/functions/subscribe-salon-membership/index.ts");
    const cancelMembership = source("supabase/functions/cancel-membership/index.ts");

    for (const [route, fn] of Object.entries({
      "duffel-flights": duffel,
      "connect-onboard-stylist": stylist,
      "dispatch-escalate": escalate,
      "handle-email-suppression": suppression,
      "lodging-wiring-monitor": wiring,
      "meta-capi-bridge": capi,
      "meta-conversion-bridge": conversion,
      "public-signup": signup,
      "subscribe-salon-membership": subscribe,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain("getCorsHeaders");
      expect(fn).not.toContain('"../_shared/cors.ts"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(duffel).toContain("rateLimitDb(user.id, \"search\")");
    expect(duffel).toContain("DUFFEL_API_KEY");
    expect(stylist).toContain("stripe.accounts.create");
    expect(stylist).toContain("salon_stylists");
    expect(subscribe).toContain("application_fee_percent");
    expect(subscribe).toContain("PLATFORM_FEE_PERCENT");
    expect(cancelMembership).toContain('withSecurity("cancel-membership"');
    expect(cancelMembership).toContain("strictCors: true");
    expect(cancelMembership).toContain('allowedMethods: ["POST"]');
    expect(cancelMembership).toContain('rateLimit: "payment"');
    expect(cancelMembership).toContain('trackNetwork: "suspicious"');
    expect(cancelMembership).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const fn of [escalate, wiring, capi, conversion]) {
      expect(fn).toContain("isServiceRoleRequest(req");
      expect(fn).toContain("skipBotDetection: true");
    }
    expect(escalate).toContain("x-cron-secret");
    expect(escalate).toContain("dispatch-ride");
    expect(wiring).toContain("x-cron-secret");
    expect(wiring).toContain("lodging_wiring_report");
    expect(capi).toContain("upsertShopLivePulse");
    expect(capi).toContain("sendToMeta");
    expect(conversion).toContain("sendToMeta");

    expect(suppression).toContain("verifyWebhookRequest");
    expect(suppression).toContain("skipWaf: true");
    expect(suppression).toContain("suppressed_emails");

    expect(signup).toContain("withErrorHandling");
    expect(signup).toContain('rateLimit: "auth_register"');
    expect(signup).toContain("calculateAge");
    expect(signup).toContain("send-otp-email");
  });

  it("keeps account, notification, and email preview routes bounded", () => {
    const account = source("supabase/functions/account-summary/index.ts");
    const notifications = source("supabase/functions/notifications-summary/index.ts");
    const emailPreview = source("supabase/functions/preview-transactional-email/index.ts");

    for (const [route, fn] of Object.entries({
      "account-summary": account,
      "notifications-summary": notifications,
      "preview-transactional-email": emailPreview,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(account).toContain('rateLimit: "api_general"');
    expect(account).toContain('allowedMethods: ["POST"]');
    expect(account).toContain("auth.getClaims");
    expect(account).toContain("user_followers");

    expect(notifications).toContain('rateLimit: "api_general"');
    expect(notifications).toContain("auth.getClaims");
    expect(notifications).toContain("unreadCount");

    expect(emailPreview).toContain("LOVABLE_API_KEY");
    expect(emailPreview).toContain("renderAsync");
    expect(emailPreview).toContain('rateLimit: "admin_action"');
    expect(emailPreview).toContain('allowedMethods: ["POST"]');
    expect(emailPreview).toContain("skipBotDetection: true");
  });

  it("keeps authenticated maps proxy routes bounded", () => {
    const mapsApiKey = source("supabase/functions/maps-api-key/index.ts");
    const autocomplete = source("supabase/functions/maps-autocomplete/index.ts");
    const geocode = source("supabase/functions/maps-geocode/index.ts");
    const details = source("supabase/functions/maps-place-details/index.ts");
    const reverse = source("supabase/functions/maps-reverse-geocode/index.ts");
    const route = source("supabase/functions/maps-route/index.ts");

    for (const [routeName, fn] of Object.entries({
      "maps-api-key": mapsApiKey,
      "maps-autocomplete": autocomplete,
      "maps-geocode": geocode,
      "maps-place-details": details,
      "maps-reverse-geocode": reverse,
      "maps-route": route,
    })) {
      expect(fn).toContain(`withSecurity("${routeName}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).toContain("auth.getUser()");
      expect(fn).toContain("GOOGLE_MAPS_API_KEY");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(mapsApiKey).toContain('rateLimit: "api_general"');
    for (const fn of [autocomplete, geocode, details, reverse, route]) {
      expect(fn).toContain('rateLimit: "search"');
    }
    expect(autocomplete).toContain("AIRPORT_CODES");
    expect(geocode).toContain("Address must be 3-300 characters");
    expect(details).toContain("Invalid place_id");
    expect(reverse).toContain("Invalid coordinates");
    expect(route).toContain("fallbackDirectionsApi");
    expect(route).toContain("corsHeaders: Record<string, string>");
  });

  it("keeps AI and reel boost routes bounded", () => {
    const faceEdit = source("supabase/functions/ai-face-edit/index.ts");
    const supportChat = source("supabase/functions/ai-support-chat/index.ts");
    const tripSuggestions = source("supabase/functions/ai-trip-suggestions/index.ts");
    const reelBoost = source("supabase/functions/create-reel-boost/index.ts");

    for (const [routeName, fn] of Object.entries({
      "ai-face-edit": faceEdit,
      "ai-support-chat": supportChat,
      "ai-trip-suggestions": tripSuggestions,
      "create-reel-boost": reelBoost,
    })) {
      expect(fn).toContain(`withSecurity("${routeName}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).toContain("auth.getUser");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(faceEdit).toContain('rateLimit: "upload"');
    expect(faceEdit).toContain('rateLimitDb(user.id, "upload"');
    expect(faceEdit).toContain("imageBase64.length > 10_000_000");
    expect(faceEdit).toContain("google/gemini-2.5-flash-image");

    expect(supportChat).toContain('rateLimit: "api_general"');
    expect(supportChat).toContain("text/event-stream");
    expect(supportChat).toContain("trimmedMessages");

    expect(tripSuggestions).toContain('rateLimit: "api_general"');
    expect(tripSuggestions).toContain("TripPreferences");
    expect(tripSuggestions).toContain("Invalid AI response format");

    expect(reelBoost).toContain('rateLimit: "payment"');
    expect(reelBoost).toContain("stripe.checkout.sessions.create");
    expect(reelBoost).toContain('type: "reel_boost"');
  });

  it("keeps commerce search proxies bounded", () => {
    const costco = source("supabase/functions/costco-search/index.ts");
    const kroger = source("supabase/functions/kroger-search/index.ts");
    const target = source("supabase/functions/target-search/index.ts");
    const walmart = source("supabase/functions/walmart-search/index.ts");

    for (const [routeName, fn] of Object.entries({
      "costco-search": costco,
      "kroger-search": kroger,
      "target-search": target,
      "walmart-search": walmart,
    })) {
      expect(fn).toContain(`withSecurity("${routeName}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('rateLimit: "search"');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).toContain("auth.getUser()");
      expect(fn).toContain("RAPID_API_KEY");
      expect(fn).toContain("X-RapidAPI-Key");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(costco).toContain("real-time-costco-data.p.rapidapi.com");
    expect(costco).toContain("costco-static.com");
    expect(costco).toContain("Image host not allowed");

    expect(kroger).toContain("kroger2.p.rapidapi.com");
    expect(target).toContain("target-com-shopping-api.p.rapidapi.com");

    expect(walmart).toContain("walmart-api4.p.rapidapi.com");
    expect(walmart).toContain("walmartimages.com");
    expect(walmart).toContain("Image host not allowed");
  });

  it("keeps travel provider and realtime utility routes bounded", () => {
    const aviasales = source("supabase/functions/aviasales-search/index.ts");
    const hotelbeds = source("supabase/functions/hotelbeds-hotels/index.ts");
    const ratehawk = source("supabase/functions/ratehawk-hotels/index.ts");
    const ice = source("supabase/functions/get-ice-servers/index.ts");
    const translate = source("supabase/functions/translate-caption/index.ts");

    for (const [routeName, fn] of Object.entries({
      "aviasales-search": aviasales,
      "hotelbeds-hotels": hotelbeds,
      "ratehawk-hotels": ratehawk,
      "get-ice-servers": ice,
      "translate-caption": translate,
    })) {
      expect(fn).toContain(`withSecurity("${routeName}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).toContain("auth.getUser()");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    for (const fn of [aviasales, hotelbeds, ratehawk]) {
      expect(fn).toContain('rateLimit: "search"');
    }

    expect(aviasales).toContain("TRAVELPAYOUTS_API_TOKEN");
    expect(aviasales).toContain("generateSignature");
    expect(aviasales).toContain("x-signature");

    expect(hotelbeds).toContain("HOTELBEDS_HOTEL_API_KEY");
    expect(hotelbeds).toContain("X-Signature");
    expect(hotelbeds).toContain("cancelBooking");

    expect(ratehawk).toContain("RATEHAWK_API_KEY");
    expect(ratehawk).toContain("searchPayload");

    expect(ice).toContain('rateLimit: "api_general"');
    expect(ice).toContain("TWILIO_ACCOUNT_SID");
    expect(ice).toContain("STUN_FALLBACK");

    expect(translate).toContain('rateLimit: "api_general"');
    expect(translate).toContain("LOVABLE_API_KEY");
    expect(translate).toContain("text.length > 5000");
  });

  it("keeps device link polling and Duffel helper routes bounded", () => {
    const devicePoll = source("supabase/functions/device-link-poll/index.ts");
    const destinationPrices = source("supabase/functions/duffel-destination-prices/index.ts");
    const fareCalendar = source("supabase/functions/duffel-fare-calendar/index.ts");
    const hotDeals = source("supabase/functions/duffel-hot-deals/index.ts");

    for (const [routeName, fn] of Object.entries({
      "device-link-poll": devicePoll,
      "duffel-destination-prices": destinationPrices,
      "duffel-fare-calendar": fareCalendar,
      "duffel-hot-deals": hotDeals,
    })) {
      expect(fn).toContain(`withSecurity("${routeName}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain("getCorsHeaders");
      expect(fn).not.toContain('"../_shared/cors.ts"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(devicePoll).toContain('rateLimit: "api_general"');
    expect(devicePoll).toContain("device_link_tokens");
    expect(devicePoll).toContain("issuer_user_id");
    expect(devicePoll).toContain("auth.getUser()");

    expect(destinationPrices).toContain('rateLimit: "search"');
    expect(destinationPrices).toContain("Public endpoint");
    expect(destinationPrices).toContain("DUFFEL_API_KEY");
    expect(destinationPrices).toContain("priceCache");
    expect(destinationPrices).not.toContain("auth.getUser()");

    for (const fn of [fareCalendar, hotDeals]) {
      expect(fn).toContain('rateLimit: "search"');
      expect(fn).toContain("DUFFEL_API_KEY");
      expect(fn).toContain("auth.getUser()");
    }
    expect(fareCalendar).toContain("fareCache");
    expect(fareCalendar).toContain("classifyPrices");
    expect(hotDeals).toContain("dealCache");
    expect(hotDeals).toContain("DEAL_ROUTES");
  });

  it("keeps public utility and scanner routes bounded", () => {
    const geo = source("supabase/functions/geo-detect/index.ts");
    const meta = source("supabase/functions/meta-conversion-handler/index.ts");
    const ping = source("supabase/functions/ping-canary/index.ts");
    const imageProxy = source("supabase/functions/proxy-image/index.ts");
    const invoice = source("supabase/functions/scan-invoice/index.ts");
    const urlScan = source("supabase/functions/scan-url/index.ts");
    const vin = source("supabase/functions/vin-decode/index.ts");
    const rates = source("supabase/functions/exchange-rates/index.ts");
    const grocery = source("supabase/functions/grocery-nearby-stores/index.ts");

    for (const [routeName, fn] of Object.entries({
      "geo-detect": geo,
      "meta-conversion-handler": meta,
      "ping-canary": ping,
      "proxy-image": imageProxy,
      "scan-invoice": invoice,
      "scan-url": urlScan,
      "vin-decode": vin,
      "exchange-rates": rates,
      "grocery-nearby-stores": grocery,
    })) {
      expect(fn).toContain(`withSecurity("${routeName}"`);
      expect(fn).toContain("ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    expect(geo).toContain('rateLimit: "api_general"');
    expect(geo).toContain("COUNTRY_LANG_MAP");

    expect(meta).toContain('rateLimit: "api_general"');
    expect(meta).toContain("skipBotDetection: true");
    expect(meta).toContain("META_ACCESS_TOKEN");
    expect(meta).toContain("sha256Hex");

    expect(ping).toContain("skipBotDetection: true");
    expect(ping).toContain("_sdkLoaded");

    expect(imageProxy).toContain('rateLimit: "api_general"');
    expect(imageProxy).toContain("ALLOWED_DOMAINS");
    expect(imageProxy).toContain("Domain not whitelisted");

    expect(invoice).toContain('rateLimit: "upload"');
    expect(invoice).toContain("ANTHROPIC_API_KEY");
    expect(invoice).toContain("TOOL_SCHEMA");

    expect(urlScan).toContain('rateLimit: "api_general"');
    expect(urlScan).toContain("GOOGLE_SAFE_BROWSING_KEY");
    expect(urlScan).toContain("SUSPICIOUS_TLDS");

    expect(vin).toContain('rateLimit: "api_general"');
    expect(vin).toContain("sanitizeVin");
    expect(vin).toContain("vpic.nhtsa.dot.gov");

    expect(rates).toContain('rateLimit: "api_general"');
    expect(rates).toContain("STATIC_RATES");

    expect(grocery).toContain('rateLimit: "search"');
    expect(grocery).toContain("GOOGLE_MAPS_API_KEY");
    expect(grocery).toContain("STORE_QUERIES");
  });

  it("keeps the supplier iframe proxy bounded", () => {
    const supplier = source("supabase/functions/supplier-proxy/index.ts");

    expect(supplier).toContain('withSecurity("supplier-proxy"');
    expect(supplier).toContain("ctx.corsHeaders");
    expect(supplier).toContain("strictCors: true");
    expect(supplier).toContain('rateLimit: "api_general"');
    expect(supplier).toContain('trackNetwork: "suspicious"');
    expect(supplier).toContain("blockNetworkRiskAt: 80");
    expect(supplier).toContain("skipBotDetection: true");
    expect(supplier).toContain("skipWaf: true");
    expect(supplier).toContain("ALLOWED_HOSTS");
    expect(supplier).toContain("HOST_NOT_ALLOWED");
    expect(supplier).toContain("STRIP_HEADERS");
    expect(supplier).toContain("zivo-supplier-navigate");
    expect(supplier).not.toContain("Access-Control-Allow-Origin\": \"*");
    expect(supplier).not.toContain("req.headers.get(\"origin\") ?? \"*\"");
  });

  it("routes bug reports through trusted server-side ingestion", () => {
    const fn = source("supabase/functions/bug-report-submit/index.ts");
    const gate = source("supabase/migrations/20260601021500_bug_reports_server_gate.sql");
    const bugPage = source("src/pages/BugReportsPage.tsx");
    const bugSheet = source("src/components/support/BugReportSheet.tsx");

    expect(fn).toContain('withSecurity("bug-report-submit"');
    expect(fn).toContain("strictCors: true");
    expect(fn).toContain('allowedMethods: ["POST"]');
    expect(fn).toContain('rateLimit: "api_general"');
    expect(fn).toContain('trackNetwork: "suspicious"');
    expect(fn).toContain("blockNetworkRiskAt: 80");
    expect(fn).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(fn).toContain('.from("bug_reports")');
    expect(fn).toContain("safeUrl(body.screenshot_url)");
    expect(fn).toContain("safeUrl(body.page_url)");
    expect(fn).toContain("cleanMetadata(body)");

    expect(gate).toContain("REVOKE INSERT ON TABLE public.bug_reports FROM authenticated");
    expect(gate).toContain('CREATE POLICY "bug_reports_select_own"');
    expect(gate).toContain("trusted server-side ingestion through bug-report-submit");

    // MarketplacePage was a third client here until the marketplace feature was
    // withdrawn; the remaining clients still carry the full contract.
    for (const client of [bugPage, bugSheet]) {
      expect(client).toContain('functions.invoke("bug-report-submit"');
      expect(client).not.toMatch(/from\("bug_reports"\)\.insert/);
    }
  });

  it("routes account support tickets through trusted server-side ingestion", () => {
    const fn = source("supabase/functions/support-ticket-submit/index.ts");
    const manage = source("supabase/functions/support-ticket-manage/index.ts");
    const gate = source("supabase/migrations/20260601033000_support_tickets_server_gate.sql");
    const manageGate = source("supabase/migrations/20260601233000_support_tickets_customer_manage_gate.sql");
    const personalHelp = source("src/pages/app/personal/PersonalHelpPage.tsx");
    const liveChat = source("src/components/shared/LiveChatWidget.tsx");
    const newTicket = source("src/pages/support/CreateSupportTicketPage.tsx");
    const chatHub = source("src/pages/ChatHubPage.tsx");

    expect(fn).toContain('withSecurity(\n    "support-ticket-submit"');
    expect(fn).toContain('allowedMethods: ["POST"]');
    expect(fn).toContain("requireUser(req)");
    expect(fn).toContain("requireUserNotBlocked(userId)");
    expect(fn).toContain("getServiceRoleClient()");
    expect(fn).toContain('.from("feedback_submissions")');
    expect(fn).toContain('category: "support_ticket"');
    expect(fn).toContain("ticket_number: ticketNumber");
    expect(fn).toContain('action: "support_ticket_submitted"');
    expect(fn).toContain("cleanEmail(body.email)");
    expect(fn).toContain("blockNetworkRiskAt: 80");

    expect(gate).toContain("AS RESTRICTIVE");
    expect(gate).toContain("COALESCE(category, 'general') <> 'support_ticket'");
    expect(gate).toContain("trusted server-side ingestion");
    expect(manage).toContain('withSecurity(\n    "support-ticket-manage"');
    expect(manage).toContain('allowedMethods: ["POST"]');
    expect(manage).toContain("requireUser(req)");
    expect(manage).toContain("requireUserNotBlocked(userId)");
    expect(manage).toContain("getServiceRoleClient()");
    expect(manage).toContain('.from("support_tickets")');
    expect(manage).toContain('.delete()');
    expect(manage).toContain('.eq("user_id", userId)');
    expect(manageGate).toContain('DROP POLICY IF EXISTS "Users manage own tickets"');
    expect(manageGate).toContain('CREATE POLICY "Users view own tickets"');
    expect(manageGate).toContain("FOR SELECT");
    expect(manageGate).toContain("Customer writes require trusted server-side support-ticket-manage");

    expect(personalHelp).toContain('functions.invoke("support-ticket-submit"');
    expect(personalHelp).not.toMatch(/from\("feedback_submissions"\)\.insert/);
    expect(liveChat).toContain('functions.invoke("support-ticket-submit"');
    expect(liveChat).toContain('source: `live_chat:${escalationCategory}`');
    expect(liveChat).not.toMatch(/from\("support_tickets"\)[\s\S]{0,240}\.insert/);
    expect(newTicket).toContain('functions.invoke("support-ticket-submit"');
    expect(newTicket).toContain('source: `support_new:${category}:${priority}`');
    expect(newTicket).not.toMatch(/from\("support_tickets"\)[\s\S]{0,260}\.insert/);
    expect(chatHub).toContain('functions.invoke("support-ticket-manage"');
    expect(chatHub).not.toMatch(/from\("support_tickets"\)[\s\S]{0,260}\.delete/);
  });

  it("routes AI concierge handoff messages through trusted server-side ingestion", () => {
    const fn = source("supabase/functions/concierge-message-submit/index.ts");
    const gate = source("supabase/migrations/20260601051500_concierge_messages_server_gate.sql");
    const concierge = source("src/components/profile/AIConciergeTrigger.tsx");

    expect(fn).toContain('withSecurity(\n    "concierge-message-submit"');
    expect(fn).toContain('allowedMethods: ["POST"]');
    expect(fn).toContain("requireUser(req)");
    expect(fn).toContain("requireUserNotBlocked(userId)");
    expect(fn).toContain("getServiceRoleClient()");
    expect(fn).toContain('.from("feedback_submissions")');
    expect(fn).toContain('category: "concierge_message"');
    expect(fn).toContain("blockNetworkRiskAt: 80");

    expect(gate).toContain("AS RESTRICTIVE");
    expect(gate).toContain("COALESCE(category, 'general') <> 'concierge_message'");
    expect(gate).toContain("trusted server-side ingestion");

    expect(concierge).toContain('functions.invoke("concierge-message-submit"');
    expect(concierge).not.toMatch(/from\("feedback_submissions"\)\.insert/);
  });

  it("routes service waitlist signups through trusted server-side ingestion", () => {
    const fn = source("supabase/functions/service-waitlist-submit/index.ts");
    const gate = source("supabase/migrations/20260601034500_service_waitlist_server_gate.sql");
    const servicesPage = source("src/pages/app/ServicesPage.tsx");

    expect(fn).toContain('withSecurity("service-waitlist-submit"');
    expect(fn).toContain("strictCors: true");
    expect(fn).toContain('allowedMethods: ["POST"]');
    expect(fn).toContain('rateLimit: "api_general"');
    expect(fn).toContain('trackNetwork: "suspicious"');
    expect(fn).toContain("blockNetworkRiskAt: 80");
    expect(fn).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(fn).toContain("cleanEmail(body.email)");
    expect(fn).toContain("cleanText(body.service");
    expect(fn).toContain('.from("feedback_submissions")');
    expect(fn).toContain('category: "service_waitlist"');

    expect(gate).toContain("AS RESTRICTIVE");
    expect(gate).toContain("COALESCE(category, 'general') <> 'service_waitlist'");
    expect(gate).toContain("trusted server-side ingestion");

    expect(servicesPage).toContain('functions.invoke("service-waitlist-submit"');
    expect(servicesPage).not.toMatch(/from\("feedback_submissions"\)\.insert/);
  });

  it("routes product feedback through trusted server-side ingestion", () => {
    const fn = source("supabase/functions/feedback-submit/index.ts");
    const gate = source("supabase/migrations/20260601040000_product_feedback_server_gate.sql");
    const feedback = source("src/pages/Feedback.tsx");
    const feedbackPage = source("src/pages/FeedbackPage.tsx");

    expect(fn).toContain('withSecurity("feedback-submit"');
    expect(fn).toContain("strictCors: true");
    expect(fn).toContain('allowedMethods: ["POST"]');
    expect(fn).toContain('rateLimit: "api_general"');
    expect(fn).toContain('trackNetwork: "suspicious"');
    expect(fn).toContain("blockNetworkRiskAt: 80");
    expect(fn).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(fn).toContain("cleanEmail(body.email)");
    expect(fn).toContain("cleanRating(body.rating)");
    expect(fn).toContain("CATEGORIES");
    expect(fn).toContain('.from("feedback_submissions")');

    expect(gate).toContain("AS RESTRICTIVE");
    expect(gate).toContain("'price_mismatch'");
    expect(gate).toContain("'suggestion'");
    expect(gate).toContain("'feature'");
    expect(gate).toContain("trusted server-side ingestion");

    for (const client of [feedback, feedbackPage]) {
      expect(client).toContain('functions.invoke("feedback-submit"');
      expect(client).not.toMatch(/from\("feedback_submissions"\)\.insert/);
    }
  });

  it("routes marketing and B2B lead capture through trusted server-side ingestion", () => {
    const fn = source("supabase/functions/marketing-interest-submit/index.ts");
    const gate = source("supabase/migrations/20260601041500_marketing_interest_server_gate.sql");
    const deals = source("src/pages/Deals.tsx");
    const vision = source("src/pages/Vision.tsx");
    const apiPartners = source("src/pages/business/APIPartners.tsx");
    const corporateTravel = source("src/pages/business/CorporateTravel.tsx");
    const businessLanding = source("src/pages/business/BusinessLandingPage.tsx");

    expect(fn).toContain('withSecurity("marketing-interest-submit"');
    expect(fn).toContain("strictCors: true");
    expect(fn).toContain('allowedMethods: ["POST"]');
    expect(fn).toContain('rateLimit: "api_general"');
    expect(fn).toContain('trackNetwork: "suspicious"');
    expect(fn).toContain("blockNetworkRiskAt: 80");
    expect(fn).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(fn).toContain("cleanEmail(body.email)");
    expect(fn).toContain("CATEGORIES");
    expect(fn).toContain('.from("feedback_submissions")');

    for (const category of [
      "newsletter_signup",
      "deals_alert_signup",
      "api_waitlist",
      "corporate_lead",
      "business_inquiry",
    ]) {
      expect(fn).toContain(category);
      expect(gate).toContain(category);
    }
    expect(gate).toContain("AS RESTRICTIVE");
    expect(gate).toContain("trusted server-side ingestion");

    for (const client of [deals, vision, apiPartners, corporateTravel, businessLanding]) {
      expect(client).toContain('functions.invoke("marketing-interest-submit"');
      expect(client).not.toMatch(/from\("feedback_submissions"\)\.insert/);
    }
  });

  it("documents owners and checks for 5xx, slow queries, and auth/payment spikes", () => {
    const runbook = source("docs/api-operations-runbook.md");
    const platform = source("docs/end-to-end-platform-readiness.md");
    const plan = source("scripts/qa/workflow-test-plan.mjs");

    for (const phrase of [
      "Function 5xx",
      "Webhook failure",
      "Slow query",
      "Auth spike",
      "Payment spike",
      "Primary owner",
      "pg_stat_statements",
      "rate_limits",
      "security_events",
      "network_security_events",
    ]) {
      expect(runbook).toContain(phrase);
    }

    expect(platform).toContain("function 5xx");
    expect(platform).toContain("database slow queries");
    expect(plan).toContain("src/test/workflows/api-operations-readiness.test.ts");
  });
});
