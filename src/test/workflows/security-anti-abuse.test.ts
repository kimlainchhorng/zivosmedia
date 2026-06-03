import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("security, anti-abuse, and hacker-protection workflow", () => {
  it("keeps public app auth redirects on the modern login/signup flow", () => {
    const surfaces = [
      "src/pages/SocialFeedPage.tsx",
      "src/pages/user/PublicUserProfilePage.tsx",
      "src/pages/store/ServiceBookingPage.tsx",
      "src/pages/chat/JoinGroupPage.tsx",
      "src/pages/cars/CarDetailPage.tsx",
    ];

    for (const relativePath of surfaces) {
      const source = read(relativePath);
      expect(source).toContain('from "@/lib/authRedirect"');
      expect(source).toContain("withRedirectParam(");
      expect(source).not.toMatch(/\/auth\?(next|redirect)=/);
    }

    expect(read("src/pages/store/ServiceBookingPage.tsx")).toContain('withRedirectParam("/signup", `/store/${slug}`)');
    expect(read("src/pages/SocialFeedPage.tsx")).toContain('withRedirectParam("/login", "/feed")');
  });

  it("keeps high-risk Edge Functions on shared security wrappers and readiness inventory", () => {
    const readiness = read("scripts/security/api-readiness-check.mjs");
    const wrapper = read("supabase/functions/_shared/withSecurity.ts");
    const cors = read("supabase/functions/_shared/cors.ts");

    expect(readiness).toContain("const highRiskFunctionName = /(admin|auth|login|otp|token|session|wallet|payment|checkout|capture|webhook|payout|withdraw|withdrawal|refund|cancel|delete|moderate|verify|transfer|coin|stripe|paypal|square|aba|bakong)/i");
    expect(readiness).toContain("high-risk-function-without-wrapper");
    expect(readiness).toContain("highRiskMissingSecurity");
    expect(readiness).toContain("strictCors");
    expect(readiness).toContain("if (/\\.(test|spec)\\.[cm]?[jt]sx?$/.test(file)) return false");
    expect(readiness).toContain("file.includes(`${path.sep}src${path.sep}test${path.sep}`)");

    expect(wrapper).toContain("inspectRequest");
    expect(wrapper).toContain("detectBot");
    expect(wrapper).toContain("isIpBlocked");
    expect(wrapper).toContain("autoBlockIfHighThreat");
    expect(wrapper).toContain("rateLimit(ip, opts.rateLimit)");
    expect(wrapper).toContain("recordSecurityEvent");
    expect(wrapper).toContain("recordNetworkEvent");
    expect(wrapper).toContain("blockNetworkRiskAt");
    expect(wrapper).toContain("allowedMethods");
    expect(wrapper).toContain("Method not allowed");
    expect(wrapper).toContain("Allow");
    expect(wrapper).toContain("X-Content-Type-Options");
    expect(wrapper).toContain("X-Frame-Options");

    expect(cors).toContain("strictCorsHeaders");
    expect(cors).toContain("Access-Control-Allow-Origin");
  });

  it("keeps privileged admin user-management endpoints on strict CORS and network-risk blocking", () => {
    const adminRoutes = [
      "admin-create-user",
      "admin-delete-user",
      "admin-list-created-users",
      "admin-update-profile",
      "admin-create-user-post",
      "admin-delete-user-post",
      "admin-post-comment",
      "admin-moderate-message",
    ];

    for (const route of adminRoutes) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain(`withSecurity("${route}"`);
      expect(source).toContain("const corsHeaders = ctx.corsHeaders");
      expect(source).toContain("strictCors: true");
      expect(source).toContain('allowedMethods: ["POST"]');
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain("blockNetworkRiskAt: 85");
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });

  it("keeps session and wallet endpoints on strict CORS, network-risk blocking, and replay protection", () => {
    const cors = read("supabase/functions/_shared/cors.ts");
    const protectedRoutes = [
      "list-my-sessions",
      "revoke-session",
      "wallet-summary",
      "create-user-wallet-topup",
      "verify-user-wallet-topup",
    ];

    expect(cors).toContain("idempotency-key");
    expect(cors).toContain("x-device-fingerprint");

    for (const route of protectedRoutes) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain(`withSecurity("${route}"`);
      expect(source).toContain("const corsHeaders = ctx.corsHeaders");
      expect(source).toContain("strictCors: true");
      expect(source).toContain('allowedMethods: ["POST"]');
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain("blockNetworkRiskAt: 80");
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    const walletTopup = read("supabase/functions/create-user-wallet-topup/index.ts");
    expect(walletTopup).toContain('req.headers.get("Idempotency-Key")');
    expect(walletTopup).toContain("idempotencyKey ? { idempotencyKey } : undefined");
  });

  it("keeps OTP and provider webhook endpoints on strict wrappers without breaking provider auth", () => {
    const cors = read("supabase/functions/_shared/cors.ts");
    const errors = read("supabase/functions/_shared/errors.ts");
    const respond = read("supabase/functions/_shared/respond.ts");
    const otpEmail = read("supabase/functions/send-otp-email/index.ts");
    const otpCode = read("supabase/functions/verify-otp-code/index.ts");
    const stripeCarRentalWebhook = read("supabase/functions/stripe-car-rental-webhook/index.ts");
    const twilioWebhook = read("supabase/functions/twilio-webhook/index.ts");

    expect(cors).toContain("https://hizivo.com");
    expect(cors).toContain(".hizivo.com");
    expect(errors).toContain("ctx?.corsHeaders ?? getCorsHeaders(req)");
    expect(respond).toContain("type CorsSource = Request | Record<string, string>");

    for (const source of [otpEmail, otpCode]) {
      expect(source).toContain("strictCors: true");
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain("blockNetworkRiskAt: 80");
      expect(source).toContain("ctx?.corsHeaders");
    }

    for (const source of [stripeCarRentalWebhook, twilioWebhook]) {
      expect(source).toContain("strictCors: true");
      expect(source).toContain("skipBotDetection: true");
      expect(source).toContain("skipWaf: true");
      expect(source).toContain('trackNetwork: "suspicious"');
    }

    expect(stripeCarRentalWebhook).toContain('allowedMethods: ["POST"]');

    expect(twilioWebhook).toContain('req.headers.get("X-Twilio-Signature")');
    expect(twilioWebhook).toContain("twimlEmpty(corsHeaders)");
    expect(twilioWebhook).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("keeps bot and channel communication endpoints on strict wrappers without breaking webhook callers", () => {
    const webhookRoutes = [
      "bot-api",
      "bot-ai-handler",
      "bot-dispatch",
      "bot-send-message",
      "channel-publish-scheduled",
      "channel-og",
    ];
    const appRoutes = [
      "bot-create",
      "bot-clone",
      "bot-broadcast",
      "channel-broadcast",
    ];

    for (const route of [...webhookRoutes, ...appRoutes]) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain(`withSecurity("${route}"`);
      expect(source).toContain("const corsHeaders = ctx.corsHeaders");
      expect(source).toContain("strictCors: true");
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain("blockNetworkRiskAt: 80");
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    for (const route of webhookRoutes) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain("skipBotDetection: true");
    }

    for (const route of [
      "bot-create",
      "bot-clone",
      "bot-broadcast",
      "bot-send-message",
      "channel-broadcast",
    ]) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain('allowedMethods: ["POST"]');
    }

    const botApi = read("supabase/functions/bot-api/index.ts");
    expect(botApi).toContain("verify_bot_token");
    expect(botApi).toContain("Access-Control-Allow-Methods");
    expect(botApi).toContain("sendMessage");

    const botCreate = read("supabase/functions/bot-create/index.ts");
    const botClone = read("supabase/functions/bot-clone/index.ts");
    expect(botCreate).toContain("auth.admin.createUser");
    expect(botCreate).toContain("create_bot_row");
    expect(botClone).toContain("src.owner_id !== owner.id");

    const botBroadcast = read("supabase/functions/bot-broadcast/index.ts");
    expect(botBroadcast).toContain("bot.owner_id !== owner.id");
    expect(botBroadcast).toContain("text too long");

    const channelBroadcast = read("supabase/functions/channel-broadcast/index.ts");
    expect(channelBroadcast).toContain("isLikelyMaliciousBot(req.headers)");
    expect(channelBroadcast).toContain("isIpAbuseThresholdExceeded");
    expect(channelBroadcast).toContain("scanContentForLinks(normalizedText)");
    expect(channelBroadcast).toContain("sub?.role === \"admin\" || sub?.role === \"editor\"");
    expect(channelBroadcast).toContain("comments_enabled");
    expect(channelBroadcast).toContain("comments_enabled === false ? false : true");
    expect(channelBroadcast).toContain("normalizedText");
    expect(channelBroadcast).toContain("normalizedMedia.length === 0");
    expect(channelBroadcast).toContain("scheduled_for must be a future ISO timestamp");

    const scheduled = read("supabase/functions/channel-publish-scheduled/index.ts");
    expect(scheduled).toContain("isServiceRoleRequest(req, serviceKey)");
    expect(scheduled).toContain("cronAuthorized");
    expect(scheduled).toContain("send-push-notification");
  });

  it("keeps AR communications and Facebook marketing actions behind strict wrappers", () => {
    const routes = [
      "ar-estimate-send",
      "ar-receipts-helper",
      "ar-reminders-dispatch",
      "auto-post-facebook",
      "boost-facebook-post",
    ];

    for (const route of routes) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain(`withSecurity("${route}"`);
      expect(source).toContain("const corsHeaders = ctx.corsHeaders");
      expect(source).toContain("strictCors: true");
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain("blockNetworkRiskAt: 80");
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    const estimate = read("supabase/functions/ar-estimate-send/index.ts");
    expect(estimate).toContain('allowedMethods: ["POST"]');
    expect(estimate).toContain("isServiceRoleRequest(req, serviceKey)");
    expect(estimate).toContain("store?.owner_id !== user.id");
    expect(estimate).toContain("store_employees");

    const receipts = read("supabase/functions/ar-receipts-helper/index.ts");
    expect(receipts).toContain('allowedMethods: ["POST"]');
    expect(receipts).toContain("FALLBACK_BUCKET");
    expect(receipts).toContain("createSignedUrl(path, 60 * 60)");
    expect(receipts).toContain("amountCents <= 0");

    const reminders = read("supabase/functions/ar-reminders-dispatch/index.ts");
    expect(reminders).toContain("isServiceRoleRequest(req, serviceKey)");
    expect(reminders).toContain("x-cron-secret");
    expect(reminders).toContain("skipBotDetection: true");
    expect(reminders).toContain("store?.owner_id !== callerUserId");

    const cron = read("supabase/migrations/20260609000000_ar_reminders_secure_cron.sql");
    expect(cron).toContain("cron.unschedule");
    expect(cron).toContain("x-cron-secret");
    expect(cron).toContain("CRON_SECRET");

    const autoPost = read("supabase/functions/auto-post-facebook/index.ts");
    const boost = read("supabase/functions/boost-facebook-post/index.ts");
    for (const source of [autoPost, boost]) {
      expect(source).toContain('allowedMethods: ["POST"]');
      expect(source).toContain('r.role === "admin" || r.role === "super_admin"');
      expect(source).toContain("Forbidden");
    }
  });

  it("blocks scanners, scrapers, injection payloads, risky networks, and repeat threat actors", () => {
    const waf = read("supabase/functions/_shared/waf.ts");
    const botDetection = read("supabase/functions/_shared/botDetection.ts");
    const networkSignals = read("supabase/functions/_shared/networkSignals.ts");
    const threatIntel = read("supabase/functions/_shared/threatIntel.ts");
    const threatMigration = read("supabase/migrations/20260501100000_threat_intel.sql");
    const autoBlockMigration = read("supabase/migrations/20260501110000_auto_block_threat.sql");
    const networkMigration = read("supabase/migrations/20260521183500_network_security_events.sql");

    expect(waf).toContain("SQLI");
    expect(waf).toContain("XSS");
    expect(waf).toContain("TRAVERSAL");
    expect(waf).toContain("CMD_INJECTION");
    expect(waf).toContain("NOSQL");
    expect(waf).toContain("PROTO_POLLUTION");
    expect(waf).toContain("MAX_BODY_BYTES");
    expect(waf).toContain("payload_too_large");

    expect(botDetection).toContain("SCRAPER_UA_PATTERNS");
    expect(botDetection).toContain("SCANNER_UA_PATTERNS");
    expect(botDetection).toContain("missing_ua");
    expect(botDetection).toContain("isLikelyMaliciousBot");

    expect(networkSignals).toContain("SUSPICIOUS_PROXY_HEADERS");
    expect(networkSignals).toContain("tor_exit_country_code");
    expect(networkSignals).toContain("probableProxyOrVpn");

    expect(threatIntel).toContain("isIpBlocked");
    expect(threatIntel).toContain("lookupThreatHistory");
    expect(threatIntel).toContain("scoreThreatHistory");
    expect(threatIntel).toContain("autoBlockIfHighThreat");

    expect(threatMigration).toContain("CREATE TABLE IF NOT EXISTS public.ip_blocklist");
    expect(threatMigration).toContain("ALTER TABLE public.ip_blocklist FORCE  ROW LEVEL SECURITY");
    expect(threatMigration).toContain("CREATE OR REPLACE FUNCTION public.is_ip_blocked");
    expect(threatMigration).toContain("CREATE OR REPLACE FUNCTION public.get_threat_history");
    expect(autoBlockMigration).toContain("CREATE OR REPLACE FUNCTION public.auto_block_if_high_threat");
    expect(autoBlockMigration).toContain("GRANT EXECUTE ON FUNCTION public.auto_block_if_high_threat");
    expect(autoBlockMigration).toContain("TO service_role");

    expect(networkMigration).toContain("CREATE TABLE IF NOT EXISTS public.network_security_events");
    expect(networkMigration).toContain("risk_score");
    expect(networkMigration).toContain("signals text[] NOT NULL DEFAULT '{}'");
  });

  it("covers account takeover, card testing, spam, scraping, fake booking, and key-leak drills", () => {
    const drills = read("docs/security-anti-abuse-drills.md");
    const otpEmail = read("supabase/functions/send-otp-email/index.ts");
    const otpSms = read("supabase/functions/send-otp-sms/index.ts");
    const carDeposit = read("supabase/functions/create-car-rental-deposit/index.ts");
    const lodgingDeposit = read("supabase/functions/create-lodging-deposit/index.ts");
    const marketingDispatch = read("supabase/functions/notify-dispatch/index.ts");
    const publicSalonBookingPage = read("src/pages/salon/PublicSalonBookingPage.tsx");
    const salonBookingSubmit = read("supabase/functions/salon-booking-submit/index.ts");
    const publicBookingSecurity = read("supabase/migrations/20260524110000_salon_public_booking_security.sql");
    const publicBookingGate = read("supabase/migrations/20260601231500_salon_bookings_public_submit_gate.sql");
    const secretScanner = read("scripts/security/check-secrets.mjs");
    const rotationRunbook = read("docs/supabase-secret-rotation-runbook.md");
    const deploySecrets = read("docs/production-deploy-secrets.md");

    expect(drills).toContain("Account takeover / OTP stuffing");
    expect(drills).toContain("Card testing / payment replay");
    expect(drills).toContain("Spam / notification abuse");
    expect(drills).toContain("Scraping / scanner traffic");
    expect(drills).toContain("Fake booking / price tampering");
    expect(drills).toContain("Key leakage / frontend secret exposure");

    expect(otpEmail).toContain('withSecurity("send-otp-email"');
    expect(otpEmail).toContain('rateLimit: "auth_otp"');
    expect(otpEmail).toContain("Too many verification requests");
    expect(otpSms).toContain('withSecurity("send-otp-sms"');
    expect(otpSms).toContain('rateLimit: "auth_otp"');

    expect(carDeposit).toContain("rateLimitDb(rlKey, \"payment\")");
    expect(carDeposit).toContain("TERMINAL_PAYMENT_STATES");
    expect(carDeposit).toContain("const idempotencyKey = `car_rental_dep_");
    expect(lodgingDeposit).toContain("rateLimitDb(user.id, \"payment\")");
    expect(lodgingDeposit).toContain("TERMINAL_PAYMENT_STATES");
    expect(lodgingDeposit).toContain("checkout.sessions.create(sessionParams, { idempotencyKey })");

    expect(marketingDispatch).toContain("marketing_enabled");
    expect(marketingDispatch).toContain("marketing_disabled");
    expect(marketingDispatch).toContain("deliveryAllowed");

    expect(publicBookingSecurity).toContain("tg_salon_sanitize_public_booking");
    expect(publicBookingSecurity).toContain("NEW.price_cents := v_svc.price_cents");
    expect(publicBookingSecurity).toContain("NEW.status := 'pending'");
    expect(publicBookingSecurity).toContain("Public can request bookings");
    expect(publicSalonBookingPage).toContain('"salon-booking-submit"');
    expect(publicSalonBookingPage).not.toMatch(/from\("salon_bookings"\)[\s\S]{0,360}\.(insert|upsert)/);
    expect(salonBookingSubmit).toContain('withSecurity("salon-booking-submit"');
    expect(salonBookingSubmit).toContain('allowedMethods: ["POST"]');
    expect(salonBookingSubmit).toContain("strictCors: true");
    expect(salonBookingSubmit).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(salonBookingSubmit).toContain('.from("store_profiles")');
    expect(salonBookingSubmit).toContain('.from("salon_services")');
    expect(salonBookingSubmit).toContain('.from("salon_stylists")');
    expect(salonBookingSubmit).toContain('.from("salon_bookings")');
    expect(publicBookingGate).toContain("Salon booking public inserts require trusted server-side validation");
    expect(publicBookingGate).toContain("REVOKE INSERT ON TABLE public.salon_bookings FROM anon");
    expect(publicBookingGate).toContain("TO service_role");

    expect(secretScanner).toContain("Supabase service-role JWT");
    expect(secretScanner).toContain("Supabase publishable key");
    expect(secretScanner).toContain("Supabase secret key");
    expect(secretScanner).toContain("Supabase access token");
    expect(secretScanner).toContain("Private key block");
    expect(secretScanner).toContain("OpenAI API key");

    expect(rotationRunbook).toContain("Treat the value as compromised");
    expect(rotationRunbook).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(rotationRunbook).toContain("SUPABASE_ANON_KEY");
    expect(rotationRunbook).toContain("SUPABASE_ACCESS_TOKEN");
    expect(rotationRunbook).toContain("rg -l --hidden");
    expect(rotationRunbook).toContain("--glob '!.env.local'");
    expect(rotationRunbook).toContain("Incident Closeout");
    expect(deploySecrets).toContain("docs/supabase-secret-rotation-runbook.md");
  });

  it("keeps security events, incident escalation, and admin-only acknowledgement auditable", () => {
    const audit = read("supabase/functions/_shared/audit.ts");
    const sentinel = read("supabase/migrations/20260411160000_security_sentinel_project.sql");
    const chatSecurity = read("supabase/migrations/20260411124500_chat_security_enforcement.sql");
    const login = read("supabase/functions/log-login/index.ts");
    const securityNotifications = read("supabase/functions/process-security-notifications/index.ts");
    const securityReport = read("supabase/functions/security-report-submit/index.ts");
    const securityReportGate = read("supabase/migrations/20260601023000_security_reports_server_gate.sql");
    const securityReportPage = read("src/pages/security/SecurityReport.tsx");

    expect(audit).toContain("redactPii");
    expect(audit).toContain("recordSecurityEvent");
    expect(audit).toContain("recordNetworkEvent");
    expect(audit).toContain("recordAudit");
    expect(audit).toContain("security_events");

    expect(sentinel).toContain("CREATE TABLE IF NOT EXISTS public.security_incidents");
    expect(sentinel).toContain("chain_hash");
    expect(sentinel).toContain("prev_chain_hash");
    expect(sentinel).toContain("compute_incident_chain_hash");
    expect(sentinel).toContain("admin_ack_security_incident");
    expect(sentinel).toContain("Only admins can acknowledge incidents");

    expect(chatSecurity).toContain("CREATE TABLE IF NOT EXISTS public.chat_security_events");
    expect(chatSecurity).toContain("analyze_chat_content_security");
    expect(chatSecurity).toContain("enforce_chat_message_security");
    expect(chatSecurity).toContain("RAISE EXCEPTION 'Message blocked by security policy");

    expect(login).toContain("login_history");
    expect(login).toContain('withSecurity("log-login"');
    expect(login).toContain('rateLimit: "auth_login"');
    expect(login).toContain("blockNetworkRiskAt: 80");
    expect(securityNotifications).toContain("new-device-login");
    expect(securityNotifications).toContain("country-change-login");

    expect(securityReport).toContain('withSecurity("security-report-submit"');
    expect(securityReport).toContain("strictCors: true");
    expect(securityReport).toContain('allowedMethods: ["POST"]');
    expect(securityReport).toContain('rateLimit: "api_general"');
    expect(securityReport).toContain('trackNetwork: "suspicious"');
    expect(securityReport).toContain("blockNetworkRiskAt: 90");
    expect(securityReport).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(securityReport).toContain('.from("feedback_submissions")');
    expect(securityReport).toContain('category: "security_report"');
    expect(securityReport).toContain("cleanEmail(body.email)");
    expect(securityReport).toContain("cleanSeverity(body.severity)");

    expect(securityReportGate).toContain('AS RESTRICTIVE');
    expect(securityReportGate).toContain("COALESCE(category, 'general') <> 'security_report'");
    expect(securityReportGate).toContain("trusted server-side ingestion through security-report-submit");

    expect(securityReportPage).toContain('functions.invoke("security-report-submit"');
    expect(securityReportPage).not.toMatch(/from\("feedback_submissions"\)\.insert/);
  });

  it("keeps social safety reports behind trusted server-side intake", () => {
    const safetyFn = read("supabase/functions/social-safety-report/index.ts");
    const safetyGate = read("supabase/migrations/20260601054500_social_safety_reports_server_gate.sql");
    const storyChatGate = read("supabase/migrations/20260601060000_story_chat_safety_reports_server_gate.sql");
    const helper = read("src/lib/social/safetyReport.ts");
    const postActions = read("src/hooks/usePostActions.ts");
    const reportContent = read("src/hooks/useReportContent.ts");
    const postComments = read("src/hooks/usePostComments.ts");
    const groupChat = read("src/components/chat/GroupChat.tsx");
    const personalChat = read("src/components/chat/PersonalChat.tsx");
    const storyViewer = read("src/components/stories/StoryViewer.tsx");
    const feed = read("src/pages/FeedPage.tsx");
    const reels = read("src/pages/ReelsFeedPage.tsx");
    const socialFeed = read("src/pages/SocialFeedPage.tsx");
    const profileTabs = read("src/components/profile/ProfileContentTabs.tsx");

    expect(safetyFn).toContain('withSecurity("social-safety-report"');
    expect(safetyFn).toContain("strictCors: true");
    expect(safetyFn).toContain('trackNetwork: "suspicious"');
    expect(safetyFn).toContain("blockNetworkRiskAt: 80");
    expect(safetyFn).toContain('auth.getUser(token)');
    expect(safetyFn).toContain('insert(admin, "post_reports"');
    expect(safetyFn).toContain('insert(admin, "comment_reports"');
    expect(safetyFn).toContain('insert(admin, "content_reports"');
    expect(safetyFn).toContain('insert(admin, "group_message_reports"');
    expect(safetyFn).toContain('insert(admin, "chat_message_reports"');
    expect(safetyFn).toContain('insert(admin, "story_reports"');
    expect(safetyFn).toContain('insert(admin, "story_comment_reports"');
    expect(safetyFn).toContain('from("user_safety_actions")');
    expect(safetyFn).toContain("alreadyReported: true");
    expect(safetyFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const table of ["post_reports", "comment_reports", "content_reports", "group_message_reports"]) {
      expect(safetyGate).toContain(`ON public.${table}`);
      expect(safetyGate).toContain(`${table}_block_direct_insert`);
    }
    expect(safetyGate).toContain("AS RESTRICTIVE");
    expect(safetyGate).toContain("WITH CHECK (false)");
    expect(safetyGate).toContain("trusted server-side ingestion");
    for (const table of ["story_reports", "story_comment_reports", "chat_message_reports"]) {
      expect(storyChatGate).toContain(`ON public.${table}`);
      expect(storyChatGate).toContain(`${table}_block_direct_insert`);
    }
    expect(storyChatGate).toContain("AS RESTRICTIVE");
    expect(storyChatGate).toContain("WITH CHECK (false)");
    expect(storyChatGate).toContain("trusted server-side ingestion");

    expect(helper).toContain('functions.invoke("social-safety-report"');
    for (const surface of [postActions, reportContent, postComments, groupChat, personalChat, storyViewer, feed, reels, socialFeed, profileTabs]) {
      expect(surface).toContain("submitSafetyReport");
      expect(surface).not.toMatch(/from\("(post_reports|comment_reports|content_reports|group_message_reports|chat_message_reports|story_reports|story_comment_reports)"\)[\s\S]{0,140}\.insert/);
    }
  });

  it("keeps moderation appeals behind verified server-side submission", () => {
    const appealFn = read("supabase/functions/moderation-appeal-submit/index.ts");
    const appealGate = read("supabase/migrations/20260601061500_moderation_appeals_server_gate.sql");
    const appealsPage = read("src/pages/ModerationAppealsPage.tsx");

    expect(appealFn).toContain('withSecurity("moderation-appeal-submit"');
    expect(appealFn).toContain("strictCors: true");
    expect(appealFn).toContain('trackNetwork: "suspicious"');
    expect(appealFn).toContain("blockNetworkRiskAt: 80");
    expect(appealFn).toContain("auth.getUser(token)");
    expect(appealFn).toContain('from("moderation_actions")');
    expect(appealFn).toContain('.eq("target_user_id", user.id)');
    expect(appealFn).toContain('from("appeal_requests")');
    expect(appealFn).toContain("alreadySubmitted: true");
    expect(appealFn).toContain("cleanEvidenceUrls");
    expect(appealFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(appealGate).toContain("ON public.appeal_requests");
    expect(appealGate).toContain("AS RESTRICTIVE");
    expect(appealGate).toContain("WITH CHECK (false)");
    expect(appealGate).toContain("trusted server-side ingestion");

    expect(appealsPage).toContain('functions.invoke("moderation-appeal-submit"');
    expect(appealsPage).not.toMatch(/from\("appeal_requests"\)[\s\S]{0,160}\.insert/);
  });

  it("keeps admin moderation reviews behind server-side admin audit", () => {
    const reviewFn = read("supabase/functions/admin-moderation-review/index.ts");
    const reviewGate = read("supabase/migrations/20260601063000_admin_moderation_review_server_gate.sql");
    const moderationPage = read("src/pages/AdminModerationPage.tsx");

    expect(reviewFn).toContain('withSecurity("admin-moderation-review"');
    expect(reviewFn).toContain("strictCors: true");
    expect(reviewFn).toContain('allowedMethods: ["POST"]');
    expect(reviewFn).toContain('trackNetwork: "suspicious"');
    expect(reviewFn).toContain("blockNetworkRiskAt: 85");
    expect(reviewFn).toContain("enforceAal2");
    expect(reviewFn).toContain('rpc("has_role"');
    expect(reviewFn).toContain('_role: "admin"');
    expect(reviewFn).toContain('from("content_moderation_queue")');
    expect(reviewFn).toContain('from("moderation_actions")');
    expect(reviewFn).toContain("applyTargetVisibility");
    expect(reviewFn).toContain("content_hidden");
    expect(reviewFn).toContain("content_unhidden");
    expect(reviewFn).toContain("report_dismissed");
    expect(reviewFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(reviewGate).toContain("ON public.content_moderation_queue");
    expect(reviewGate).toContain("FOR UPDATE");
    expect(reviewGate).toContain("USING (false)");
    expect(reviewGate).toContain("ON public.moderation_actions");
    expect(reviewGate).toContain("FOR INSERT");
    expect(reviewGate).toContain("WITH CHECK (false)");
    expect(reviewGate).toContain("trusted server-side ingestion");

    expect(moderationPage).toContain('functions.invoke("admin-moderation-review"');
    expect(moderationPage).not.toMatch(/from\("content_moderation_queue"\)[\s\S]{0,220}\.update/);
    expect(moderationPage).not.toMatch(/from\("moderation_actions"\)[\s\S]{0,220}\.insert/);
  });

  it("keeps admin content report status changes behind server-side admin review", () => {
    const statusFn = read("supabase/functions/admin-content-report-status/index.ts");
    const statusGate = read("supabase/migrations/20260601064500_admin_content_reports_status_server_gate.sql");
    const reportsPage = read("src/pages/AdminContentReportsPage.tsx");

    expect(statusFn).toContain('withSecurity("admin-content-report-status"');
    expect(statusFn).toContain("strictCors: true");
    expect(statusFn).toContain('allowedMethods: ["POST"]');
    expect(statusFn).toContain('trackNetwork: "suspicious"');
    expect(statusFn).toContain("blockNetworkRiskAt: 85");
    expect(statusFn).toContain("enforceAal2");
    expect(statusFn).toContain('rpc("has_role"');
    expect(statusFn).toContain('_role: "admin"');
    expect(statusFn).toContain('from("content_reports")');
    expect(statusFn).toContain("reviewed_by: user.id");
    expect(statusFn).toContain("reviewed_at: null");
    expect(statusFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(statusGate).toContain("ON public.content_reports");
    expect(statusGate).toContain("AS RESTRICTIVE");
    expect(statusGate).toContain("FOR UPDATE");
    expect(statusGate).toContain("USING (false)");
    expect(statusGate).toContain("WITH CHECK (false)");
    expect(statusGate).toContain("trusted server-side ingestion");

    expect(reportsPage).toContain('functions.invoke("admin-content-report-status"');
    expect(reportsPage).not.toMatch(/from\("content_reports"\)[\s\S]{0,220}\.update/);
  });

  it("keeps local account security setting writes behind server-side user scoping", () => {
    const settingsFn = read("supabase/functions/account-security-settings/index.ts");
    const settingsGate = read("supabase/migrations/20260601070000_account_security_settings_server_gate.sql");
    const twoStepHook = read("src/hooks/useTwoStep.ts");
    const passcodeHook = read("src/hooks/usePasscode.ts");
    const twoStepPage = read("src/pages/TwoStepAuthPage.tsx");

    expect(settingsFn).toContain('withSecurity("account-security-settings"');
    expect(settingsFn).toContain("strictCors: true");
    expect(settingsFn).toContain('allowedMethods: ["POST"]');
    expect(settingsFn).toContain('rateLimit: "auth_login"');
    expect(settingsFn).toContain('trackNetwork: "suspicious"');
    expect(settingsFn).toContain("blockNetworkRiskAt: 85");
    expect(settingsFn).toContain("auth.getUser(token)");
    expect(settingsFn).toContain('from("two_step_auth")');
    expect(settingsFn).toContain('from("user_passcode")');
    expect(settingsFn).toContain('from("login_alerts")');
    expect(settingsFn).toContain("cleanAutoLock");
    expect(settingsFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const table of ["two_step_auth", "user_passcode"]) {
      expect(settingsGate).toContain(`ON public.${table}`);
      expect(settingsGate).toContain(`${table}_block_direct_insert`);
      expect(settingsGate).toContain(`${table}_block_direct_update`);
      expect(settingsGate).toContain(`${table}_block_direct_delete`);
    }
    expect(settingsGate).toContain("AS RESTRICTIVE");
    expect(settingsGate).toContain("trusted server-side ingestion");

    for (const surface of [twoStepHook, passcodeHook, twoStepPage]) {
      expect(surface).toContain('functions.invoke("account-security-settings"');
      expect(surface).not.toMatch(/from\("(two_step_auth|user_passcode)"\)[\s\S]{0,180}\.(insert|upsert|update|delete)/);
    }
  });

  it("keeps account privacy, contacts, device link, and chat preference mutations POST-gated", () => {
    for (const route of [
      "block-user-manage",
      "chat-consume-view-once",
      "chat-thread-settings-update",
      "close-friend-manage",
      "contact-manage",
      "contact-match",
      "contact-request-manage",
      "device-key-manage",
      "device-link-claim",
      "device-link-issue",
      "device-link-poll",
      "device-register",
      "linked-device-manage",
      "muted-conversation-manage",
      "privacy-settings-update",
      "public-signup",
      "user-safety-action-manage",
    ]) {
      const fn = read(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain(route === "device-link-poll" ? 'allowedMethods: ["GET"]' : 'allowedMethods: ["POST"]');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });

  it("keeps legacy active-session heartbeats and login alerts server-scoped", () => {
    const presenceFn = read("supabase/functions/user-session-presence/index.ts");
    const presenceGate = read("supabase/migrations/20260601071500_user_session_presence_server_gate.sql");
    const sessionsHook = read("src/hooks/useSessions.ts");

    expect(presenceFn).toContain('withSecurity("user-session-presence"');
    expect(presenceFn).toContain("strictCors: true");
    expect(presenceFn).toContain('trackNetwork: "suspicious"');
    expect(presenceFn).toContain("blockNetworkRiskAt: 80");
    expect(presenceFn).toContain("auth.getUser(token)");
    expect(presenceFn).toContain('from("user_sessions")');
    expect(presenceFn).toContain('from("login_alerts")');
    expect(presenceFn).toContain("revoke_all_others");
    expect(presenceFn).toContain("session_revoked");
    expect(presenceFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "user_sessions_block_direct_insert",
      "user_sessions_block_direct_update",
      "user_sessions_block_direct_delete",
      "login_alerts_block_direct_insert",
    ]) {
      expect(presenceGate).toContain(policy);
    }
    expect(presenceGate).toContain("AS RESTRICTIVE");
    expect(presenceGate).toContain("trusted server-side ingestion");

    expect(sessionsHook).toContain('functions.invoke("user-session-presence"');
    expect(sessionsHook).not.toMatch(/from\("(user_sessions|login_alerts)"\)[\s\S]{0,220}\.(insert|update|delete|upsert)/);
  });

  it("keeps Secret Chat device key writes server-scoped while preserving key reads", () => {
    const deviceKeyFn = read("supabase/functions/device-key-manage/index.ts");
    const deviceKeyGate = read("supabase/migrations/20260601073000_device_keys_server_gate.sql");
    const secretChat = read("src/hooks/useSecretChat.ts");

    expect(deviceKeyFn).toContain('withSecurity("device-key-manage"');
    expect(deviceKeyFn).toContain("strictCors: true");
    expect(deviceKeyFn).toContain('trackNetwork: "suspicious"');
    expect(deviceKeyFn).toContain("blockNetworkRiskAt: 80");
    expect(deviceKeyFn).toContain("auth.getUser(token)");
    expect(deviceKeyFn).toContain('from("device_keys")');
    expect(deviceKeyFn).toContain("cleanPublicKey");
    expect(deviceKeyFn).toContain("device_fingerprint");
    expect(deviceKeyFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "device_keys_block_direct_insert",
      "device_keys_block_direct_update",
      "device_keys_block_direct_delete",
    ]) {
      expect(deviceKeyGate).toContain(policy);
    }
    expect(deviceKeyGate).toContain("authenticated reads are allowed");
    expect(deviceKeyGate).toContain("trusted server-side ingestion");

    expect(secretChat).toContain('functions.invoke("device-key-manage"');
    expect(secretChat).toContain('from("device_keys")');
    expect(secretChat).not.toMatch(/from\("device_keys"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
  });

  it("keeps privacy preference writes behind an allowlisted server update", () => {
    const privacyFn = read("supabase/functions/privacy-settings-update/index.ts");
    const privacyGate = read("supabase/migrations/20260601074500_privacy_settings_server_gate.sql");
    const allowMessages = read("src/hooks/useAllowMessageRequests.ts");
    const sensitiveMedia = read("src/hooks/useSensitiveMediaPreference.ts");
    const privacyPage = read("src/pages/account/PrivacySettingsPage.tsx");

    expect(privacyFn).toContain('withSecurity("privacy-settings-update"');
    expect(privacyFn).toContain("strictCors: true");
    expect(privacyFn).toContain('trackNetwork: "suspicious"');
    expect(privacyFn).toContain("blockNetworkRiskAt: 80");
    expect(privacyFn).toContain("auth.getUser(token)");
    expect(privacyFn).toContain("BOOLEAN_KEYS");
    expect(privacyFn).toContain("PROFILE_VISIBILITY");
    expect(privacyFn).toContain('from("privacy_settings")');
    expect(privacyFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(privacyGate).toContain("privacy_settings_block_direct_insert");
    expect(privacyGate).toContain("privacy_settings_block_direct_update");
    expect(privacyGate).toContain("AS RESTRICTIVE");
    expect(privacyGate).toContain("trusted server-side ingestion");

    for (const surface of [allowMessages, sensitiveMedia, privacyPage]) {
      expect(surface).toContain('functions.invoke("privacy-settings-update"');
      expect(surface).not.toMatch(/from\("privacy_settings"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
    }
  });

  it("keeps close-friends mutations behind verified server-side ownership checks", () => {
    const closeFriendFn = read("supabase/functions/close-friend-manage/index.ts");
    const closeFriendGate = read("supabase/migrations/20260601080000_close_friends_server_gate.sql");
    const closeFriendsPage = read("src/pages/CloseFriendsPage.tsx");

    expect(closeFriendFn).toContain('withSecurity("close-friend-manage"');
    expect(closeFriendFn).toContain("strictCors: true");
    expect(closeFriendFn).toContain('trackNetwork: "suspicious"');
    expect(closeFriendFn).toContain("blockNetworkRiskAt: 80");
    expect(closeFriendFn).toContain("auth.getUser(token)");
    expect(closeFriendFn).toContain("cleanAction");
    expect(closeFriendFn).toContain("cleanUuid");
    expect(closeFriendFn).toContain("friendId === user.id");
    expect(closeFriendFn).toContain('from("close_friends")');
    expect(closeFriendFn).toContain('onConflict: "user_id,friend_id"');
    expect(closeFriendFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(closeFriendGate).toContain("close_friends_block_direct_insert");
    expect(closeFriendGate).toContain("close_friends_block_direct_delete");
    expect(closeFriendGate).toContain("AS RESTRICTIVE");
    expect(closeFriendGate).toContain("trusted server-side ingestion");

    expect(closeFriendsPage).toContain('functions.invoke("close-friend-manage"');
    expect(closeFriendsPage).toContain('from("close_friends")');
    expect(closeFriendsPage).not.toMatch(/from\("close_friends"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
  });

  it("keeps user block and unblock mutations behind verified server-side ownership checks", () => {
    const blockFn = read("supabase/functions/block-user-manage/index.ts");
    const blockGate = read("supabase/migrations/20260601081500_blocked_users_server_gate.sql");
    const surfaces = [
      read("src/hooks/useBlockUser.ts"),
      read("src/pages/account/PrivacySettingsPage.tsx"),
      read("src/pages/chat/BlockedUsersPage.tsx"),
      read("src/components/chat/ChatSecurity.tsx"),
      read("src/components/chat/ChatHeaderProfileSheet.tsx"),
      read("src/components/chat/ChatContactInfo.tsx"),
      read("src/pages/chat/settings/ChatPrivacyHubPage.tsx"),
      read("src/pages/chat/MessageRequestsPage.tsx"),
      read("src/pages/PublicProfilePage.tsx"),
      read("src/components/profile/ProfilePreviewSheet.tsx"),
    ];

    expect(blockFn).toContain('withSecurity("block-user-manage"');
    expect(blockFn).toContain("strictCors: true");
    expect(blockFn).toContain('trackNetwork: "suspicious"');
    expect(blockFn).toContain("blockNetworkRiskAt: 80");
    expect(blockFn).toContain("auth.getUser(token)");
    expect(blockFn).toContain("MAX_TARGETS");
    expect(blockFn).toContain("cleanTargetIds");
    expect(blockFn).toContain("value !== blockerId");
    expect(blockFn).toContain('from("blocked_users")');
    expect(blockFn).toContain('onConflict: "blocker_id,blocked_id"');
    expect(blockFn).toContain("cleanupSocialGraph");
    expect(blockFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "blocked_users_block_direct_insert",
      "blocked_users_block_direct_update",
      "blocked_users_block_direct_delete",
    ]) {
      expect(blockGate).toContain(policy);
    }
    expect(blockGate).toContain("AS RESTRICTIVE");
    expect(blockGate).toContain("trusted server-side ingestion");

    for (const surface of surfaces) {
      expect(surface).toContain('functions.invoke("block-user-manage"');
      expect(surface).not.toMatch(/from\("blocked_users"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
      expect(surface).not.toMatch(/dbFrom\("blocked_users"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
    }
  });

  it("keeps chat thread preference mutations behind an allowlisted server update", () => {
    const settingsFn = read("supabase/functions/chat-thread-settings-update/index.ts");
    const settingsGate = read("supabase/migrations/20260601083000_chat_thread_settings_server_gate.sql");
    const threadSettings = read("src/hooks/useThreadSettings.ts");

    expect(settingsFn).toContain('withSecurity("chat-thread-settings-update"');
    expect(settingsFn).toContain("strictCors: true");
    expect(settingsFn).toContain('trackNetwork: "suspicious"');
    expect(settingsFn).toContain("blockNetworkRiskAt: 80");
    expect(settingsFn).toContain("auth.getUser(token)");
    expect(settingsFn).toContain("PATCH_KEYS");
    expect(settingsFn).toContain("NOTIFICATION_MODES");
    expect(settingsFn).toContain("cleanThreadId");
    expect(settingsFn).toContain("normalizePatch");
    expect(settingsFn).toContain('from("chat_thread_settings")');
    expect(settingsFn).toContain('onConflict: "user_id,thread_id"');
    expect(settingsFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "chat_thread_settings_block_direct_insert",
      "chat_thread_settings_block_direct_update",
      "chat_thread_settings_block_direct_delete",
    ]) {
      expect(settingsGate).toContain(policy);
    }
    expect(settingsGate).toContain("AS RESTRICTIVE");
    expect(settingsGate).toContain("trusted server-side ingestion");

    expect(threadSettings).toContain('functions.invoke("chat-thread-settings-update"');
    expect(threadSettings).toContain('from("chat_thread_settings")');
    expect(threadSettings).not.toMatch(/from\("chat_thread_settings"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
  });

  it("keeps muted conversation mutations behind verified server-side ownership checks", () => {
    const muteFn = read("supabase/functions/muted-conversation-manage/index.ts");
    const muteGate = read("supabase/migrations/20260601084500_muted_conversations_server_gate.sql");
    const mutedChatsPage = read("src/pages/MutedChatsPage.tsx");

    expect(muteFn).toContain('withSecurity("muted-conversation-manage"');
    expect(muteFn).toContain("strictCors: true");
    expect(muteFn).toContain('trackNetwork: "suspicious"');
    expect(muteFn).toContain("blockNetworkRiskAt: 80");
    expect(muteFn).toContain("auth.getUser(token)");
    expect(muteFn).toContain("cleanConversationId");
    expect(muteFn).toContain("cleanMutedUntil");
    expect(muteFn).toContain('from("muted_conversations")');
    expect(muteFn).toContain('onConflict: "user_id,conversation_id"');
    expect(muteFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "muted_conversations_block_direct_insert",
      "muted_conversations_block_direct_update",
      "muted_conversations_block_direct_delete",
    ]) {
      expect(muteGate).toContain(policy);
    }
    expect(muteGate).toContain("AS RESTRICTIVE");
    expect(muteGate).toContain("trusted server-side ingestion");

    expect(mutedChatsPage).toContain('functions.invoke("muted-conversation-manage"');
    expect(mutedChatsPage).toContain('from("muted_conversations")');
    expect(mutedChatsPage).not.toMatch(/from\("muted_conversations"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
  });

  it("keeps contact-list mutations behind verified server-side ownership checks", () => {
    const contactFn = read("supabase/functions/contact-manage/index.ts");
    const contactGate = read("supabase/migrations/20260601090000_user_contacts_server_gate.sql");
    const contactsHook = read("src/hooks/useContacts.ts");
    const contactRequestsHook = read("src/hooks/useContactRequests.ts");

    expect(contactFn).toContain('withSecurity("contact-manage"');
    expect(contactFn).toContain("strictCors: true");
    expect(contactFn).toContain('trackNetwork: "suspicious"');
    expect(contactFn).toContain("blockNetworkRiskAt: 80");
    expect(contactFn).toContain("auth.getUser(token)");
    expect(contactFn).toContain("acceptRequest");
    expect(contactFn).toContain("cleanCustomName");
    expect(contactFn).toContain("cleanAddedVia");
    expect(contactFn).toContain('from("user_contacts")');
    expect(contactFn).toContain('from("contact_requests")');
    expect(contactFn).toContain('onConflict: "owner_id,contact_user_id"');
    expect(contactFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "user_contacts_block_direct_insert",
      "user_contacts_block_direct_update",
      "user_contacts_block_direct_delete",
    ]) {
      expect(contactGate).toContain(policy);
    }
    expect(contactGate).toContain("AS RESTRICTIVE");
    expect(contactGate).toContain("trusted server-side ingestion");

    expect(contactsHook).toContain('from("user_contacts")');
    for (const surface of [contactsHook, contactRequestsHook]) {
      expect(surface).toContain('functions.invoke("contact-manage"');
      expect(surface).not.toMatch(/from\("user_contacts"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
    }
  });

  it("keeps contact request lifecycle mutations behind verified server-side ownership checks", () => {
    const requestFn = read("supabase/functions/contact-request-manage/index.ts");
    const requestGate = read("supabase/migrations/20260601091500_contact_requests_server_gate.sql");
    const contactRequestsHook = read("src/hooks/useContactRequests.ts");
    const contactFn = read("supabase/functions/contact-manage/index.ts");

    expect(requestFn).toContain('withSecurity("contact-request-manage"');
    expect(requestFn).toContain("strictCors: true");
    expect(requestFn).toContain('trackNetwork: "suspicious"');
    expect(requestFn).toContain("blockNetworkRiskAt: 80");
    expect(requestFn).toContain("auth.getUser(token)");
    expect(requestFn).toContain("sendRequest");
    expect(requestFn).toContain("cleanMessage");
    expect(requestFn).toContain('from("contact_requests")');
    expect(requestFn).toContain('.eq("from_user_id", user.id)');
    expect(requestFn).toContain('.eq("to_user_id", user.id)');
    expect(requestFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "contact_requests_block_direct_insert",
      "contact_requests_block_direct_update",
      "contact_requests_block_direct_delete",
    ]) {
      expect(requestGate).toContain(policy);
    }
    expect(requestGate).toContain("AS RESTRICTIVE");
    expect(requestGate).toContain("trusted server-side ingestion");

    expect(contactRequestsHook).toContain('functions.invoke("contact-request-manage"');
    expect(contactRequestsHook).toContain('functions.invoke("contact-manage"');
    expect(contactRequestsHook).toContain('from("contact_requests")');
    expect(contactRequestsHook).not.toMatch(/from\("contact_requests"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
    expect(contactFn).toContain('from("contact_requests")');
  });

  it("keeps legacy user safety actions behind verified server-side ownership checks", () => {
    const safetyActionFn = read("supabase/functions/user-safety-action-manage/index.ts");
    const safetyActionGate = read("supabase/migrations/20260601093000_user_safety_actions_server_gate.sql");
    const mutedBlockedPage = read("src/pages/MutedBlockedUsersPage.tsx");
    const socialSafetyFn = read("supabase/functions/social-safety-report/index.ts");

    expect(safetyActionFn).toContain('withSecurity("user-safety-action-manage"');
    expect(safetyActionFn).toContain("strictCors: true");
    expect(safetyActionFn).toContain('trackNetwork: "suspicious"');
    expect(safetyActionFn).toContain("blockNetworkRiskAt: 80");
    expect(safetyActionFn).toContain("auth.getUser(token)");
    expect(safetyActionFn).toContain("cleanOperation");
    expect(safetyActionFn).toContain("cleanAction");
    expect(safetyActionFn).toContain('from("user_safety_actions")');
    expect(safetyActionFn).toContain('onConflict: "user_id,target_user_id,action"');
    expect(safetyActionFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "user_safety_actions_block_direct_insert",
      "user_safety_actions_block_direct_update",
      "user_safety_actions_block_direct_delete",
    ]) {
      expect(safetyActionGate).toContain(policy);
    }
    expect(safetyActionGate).toContain("AS RESTRICTIVE");
    expect(safetyActionGate).toContain("trusted server-side ingestion");

    expect(mutedBlockedPage).toContain('functions.invoke("user-safety-action-manage"');
    expect(mutedBlockedPage).toContain('from("user_safety_actions")');
    expect(mutedBlockedPage).not.toMatch(/from\("user_safety_actions"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
    expect(socialSafetyFn).toContain('from("user_safety_actions")');
  });

  it("keeps push subscription device revocation behind verified server-side ownership checks", () => {
    const pushDeviceFn = read("supabase/functions/push-device-manage/index.ts");
    const pushGate = read("supabase/migrations/20260601094500_push_subscriptions_server_gate.sql");
    const pushDevicesPage = read("src/pages/PushDevicesPage.tsx");
    const pushDeviceClient = read("src/lib/notifications/pushDeviceManage.ts");
    const webRegister = read("supabase/functions/register-web-push/index.ts");
    const webUnregister = read("supabase/functions/unregister-web-push/index.ts");

    expect(pushDeviceFn).toContain('withSecurity("push-device-manage"');
    expect(pushDeviceFn).toContain("strictCors: true");
    expect(pushDeviceFn).toContain('trackNetwork: "suspicious"');
    expect(pushDeviceFn).toContain("blockNetworkRiskAt: 80");
    expect(pushDeviceFn).toContain("auth.getUser(token)");
    expect(pushDeviceFn).toContain("cleanEndpoint");
    expect(pushDeviceFn).toContain('from("push_subscriptions")');
    expect(pushDeviceFn).toContain('.eq("user_id", user.id)');
    expect(pushDeviceFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "push_subscriptions_block_direct_insert",
      "push_subscriptions_block_direct_update",
      "push_subscriptions_block_direct_delete",
    ]) {
      expect(pushGate).toContain(policy);
    }
    expect(pushGate).toContain("AS RESTRICTIVE");
    expect(pushGate).toContain("trusted server-side ingestion");

    expect(pushDeviceClient).toContain('functions.invoke("push-device-manage"');
    expect(pushDeviceClient).toContain("VITE_PUSH_DEVICE_MANAGE_ENABLED");
    expect(pushDeviceClient).toContain("PushDeviceManageUnavailableError");
    expect(pushDeviceClient).toContain('action: "revoke"');
    expect(pushDevicesPage).toContain("@/lib/notifications/pushDeviceManage");
    expect(pushDevicesPage).toContain('from("push_subscriptions")');
    expect(pushDevicesPage).not.toMatch(/from\("push_subscriptions"\)[\s\S]{0,220}\.(insert|upsert|update|delete)/);
    expect(webRegister).toContain('from("push_subscriptions")');
    expect(webUnregister).toContain('from("push_subscriptions")');
  });

  it("keeps user notification update and delete actions behind server-side ownership checks", () => {
    const notificationFn = read("supabase/functions/notification-manage/index.ts");
    const notificationGate = read("supabase/migrations/20260601100000_notifications_server_gate.sql");
    const notificationCenter = read("src/pages/NotificationCenterPage.tsx");
    const notificationsHook = read("src/hooks/useNotifications.ts");
    const personalNotifications = read("src/pages/app/personal/PersonalNotificationsPage.tsx");
    const rideNotifications = read("src/components/rides/RideNotificationCenter.tsx");
    const notificationManageClient = read("src/lib/notifications/notificationManage.ts");

    expect(notificationFn).toContain('withSecurity("notification-manage"');
    expect(notificationFn).toContain("strictCors: true");
    expect(notificationFn).toContain('trackNetwork: "suspicious"');
    expect(notificationFn).toContain("blockNetworkRiskAt: 80");
    expect(notificationFn).toContain("auth.getUser(token)");
    expect(notificationFn).toContain("cleanIds");
    expect(notificationFn).toContain("cleanDate");
    expect(notificationFn).toContain('from("notifications")');
    expect(notificationFn).toContain('.eq("user_id", user.id)');
    expect(notificationFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of ["notifications_block_direct_update", "notifications_block_direct_delete"]) {
      expect(notificationGate).toContain(policy);
    }
    expect(notificationGate).toContain("AS RESTRICTIVE");
    expect(notificationGate).toContain("trusted server-side ingestion");

    expect(notificationManageClient).toMatch(/functions\.invoke\(['"]notification-manage['"]/);
    expect(notificationManageClient).toContain("VITE_NOTIFICATION_MANAGE_ENABLED");
    expect(notificationManageClient).toContain("NotificationManageUnavailableError");

    for (const surface of [notificationCenter, notificationsHook, personalNotifications, rideNotifications]) {
      expect(surface).toContain("@/lib/notifications/notificationManage");
      expect(surface).toContain("notifications");
      expect(surface).not.toMatch(/from\(['"]notifications['"]\)[\s\S]{0,260}\.(update|delete)/);
    }
  });

  it("keeps talent invite notification creation behind verified server-side intake", () => {
    const inviteFn = read("supabase/functions/talent-invite-notification/index.ts");
    const inviteGate = read("supabase/migrations/20260601101500_job_invite_notifications_server_gate.sql");
    const findTalent = read("src/components/careers/FindTalentTab.tsx");
    const talentInviteClient = read("src/lib/notifications/talentInviteNotification.ts");

    expect(inviteFn).toContain('withSecurity("talent-invite-notification"');
    expect(inviteFn).toContain("strictCors: true");
    expect(inviteFn).toContain('allowedMethods: ["POST"]');
    expect(inviteFn).toContain('trackNetwork: "suspicious"');
    expect(inviteFn).toContain("blockNetworkRiskAt: 80");
    expect(inviteFn).toContain("auth.getUser(token)");
    expect(inviteFn).toContain('eq("open_to_work", true)');
    expect(inviteFn).toContain('from("notifications")');
    expect(inviteFn).toContain('template: "job_invite"');
    expect(inviteFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(inviteGate).toContain("notifications_block_direct_job_invite_insert");
    expect(inviteGate).toContain("AS RESTRICTIVE");
    expect(inviteGate).toContain("COALESCE(template, '') <> 'job_invite'");
    expect(inviteGate).toContain("trusted server-side ingestion");

    expect(talentInviteClient).toContain('functions.invoke("talent-invite-notification"');
    expect(talentInviteClient).toContain("VITE_TALENT_INVITE_NOTIFICATION_ENABLED");
    expect(talentInviteClient).toContain("TalentInviteNotificationUnavailableError");
    expect(findTalent).toContain("@/lib/notifications/talentInviteNotification");
    expect(findTalent).not.toMatch(/from\("notifications"\)[\s\S]{0,260}\.insert/);
  });

  it("keeps admin broadcast notification creation behind admin-only server-side intake", () => {
    const broadcastFn = read("supabase/functions/admin-broadcast-notification/index.ts");
    const broadcastGate = read("supabase/migrations/20260601103000_admin_broadcast_notifications_server_gate.sql");
    const adminBroadcast = read("src/pages/admin/AdminBroadcastPage.tsx");
    const adminBroadcastClient = read("src/lib/notifications/adminBroadcastNotification.ts");

    expect(broadcastFn).toContain('withSecurity("admin-broadcast-notification"');
    expect(broadcastFn).toContain("strictCors: true");
    expect(broadcastFn).toContain('rateLimit: "admin_action"');
    expect(broadcastFn).toContain('trackNetwork: "suspicious"');
    expect(broadcastFn).toContain("blockNetworkRiskAt: 85");
    expect(broadcastFn).toContain('rpc("has_role"');
    expect(broadcastFn).toContain('_role: "admin"');
    expect(broadcastFn).toContain('from("profiles").select("id")');
    expect(broadcastFn).toContain('from("notifications")');
    expect(broadcastFn).toContain('template: "admin_broadcast"');
    expect(broadcastFn).toContain('functions.invoke("send-push-notification"');
    expect(broadcastFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(broadcastGate).toContain("notifications_block_direct_admin_broadcast_insert");
    expect(broadcastGate).toContain("AS RESTRICTIVE");
    expect(broadcastGate).toContain("ADD COLUMN IF NOT EXISTS role text");
    expect(broadcastGate).toContain("COALESCE(template, '') <> 'admin_broadcast'");
    expect(broadcastGate).toContain("trusted server-side ingestion");

    expect(adminBroadcastClient).toContain('functions.invoke("admin-broadcast-notification"');
    expect(adminBroadcastClient).toContain("VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED");
    expect(adminBroadcastClient).toContain("AdminBroadcastNotificationUnavailableError");
    expect(adminBroadcastClient).toContain('action: "preview"');
    expect(adminBroadcastClient).toContain('action: "send"');
    expect(adminBroadcast).toContain("@/lib/notifications/adminBroadcastNotification");
    expect(adminBroadcast).not.toMatch(/from\("notifications" as any\)[\s\S]{0,260}\.insert/);
    expect(adminBroadcast).not.toContain('template: "admin_broadcast"');
  });

  it("keeps social notification writes and read-state changes behind server-side intake", () => {
    const socialFn = read("supabase/functions/social-notification-manage/index.ts");
    const socialGate = read("supabase/migrations/20260601110000_user_notifications_server_gate.sql");
    const socialHook = read("src/hooks/useSocialNotifications.ts");
    const socialClient = read("src/lib/notifications/socialNotificationManage.ts");

    expect(socialFn).toContain('withSecurity("social-notification-manage"');
    expect(socialFn).toContain("strictCors: true");
    expect(socialFn).toContain('trackNetwork: "suspicious"');
    expect(socialFn).toContain("blockNetworkRiskAt: 80");
    expect(socialFn).toContain("auth.getUser(token)");
    expect(socialFn).toContain('from("user_notifications")');
    expect(socialFn).toContain('.eq("user_id", user.id)');
    expect(socialFn).toContain("cleanIds");
    expect(socialFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "user_notifications_block_direct_insert",
      "user_notifications_block_direct_update",
      "user_notifications_block_direct_delete",
    ]) {
      expect(socialGate).toContain(policy);
    }
    expect(socialGate).toContain("AS RESTRICTIVE");
    expect(socialGate).toContain("trusted server-side validation");

    expect(socialClient).toContain('functions.invoke("social-notification-manage"');
    expect(socialClient).toContain("VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED");
    expect(socialClient).toContain("SocialNotificationManageUnavailableError");
    expect(socialClient).toContain('action: "mark_read"');
    expect(socialClient).toContain('action: "mark_all_read"');
    expect(socialClient).toContain('action: "create"');
    expect(socialHook).toContain("@/lib/notifications/socialNotificationManage");
    expect(socialHook).not.toMatch(/from\("user_notifications"\)[\s\S]{0,260}\.(insert|update|delete)/);
  });
});
