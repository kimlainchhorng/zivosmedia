#!/usr/bin/env node
/**
 * Security, anti-abuse, and hacker-protection contract check.
 *
 * Verifies shared Edge Function defenses, attack drills, rate-limit decisions,
 * scanner/WAF controls, payment/booking abuse protections, and secret scanning.
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

function requireNotContains(id, text, needle, relativePath) {
  if (text.includes(needle)) {
    failures.push(`${id}: ${relativePath} must not contain ${JSON.stringify(needle)}`);
  }
}

function requireNotMatch(id, text, pattern, relativePath) {
  if (pattern.test(text)) {
    failures.push(`${id}: ${relativePath} must not match ${pattern}`);
  }
}

function requireMatch(id, text, pattern, relativePath) {
  if (!pattern.test(text)) {
    failures.push(`${id}: ${relativePath} must match ${pattern}`);
  }
}

function requireStrictRoute(id, route, expected) {
  const relativePath = `supabase/functions/${route}/index.ts`;
  const text = source(relativePath);
  requireContains(id, text, `withSecurity("${route}"`, relativePath);
  requireContains(id, text, "strictCors: true", relativePath);
  requireContains(id, text, 'allowedMethods: ["POST"]', relativePath);
  requireContains(id, text, 'trackNetwork: "suspicious"', relativePath);
  requireContains(id, text, expected.rateLimit, relativePath);
  requireContains(id, text, expected.risk, relativePath);
  requireNotContains(id, text, '"Access-Control-Allow-Origin": "*"', relativePath);
  return text;
}

const contracts = [
  {
    id: "shared-edge-defense-wrapper",
    category: "edge-security",
    check() {
      const wrapperPath = "supabase/functions/_shared/withSecurity.ts";
      const corsPath = "supabase/functions/_shared/cors.ts";
      const readinessPath = "scripts/security/api-readiness-check.mjs";
      const wrapper = source(wrapperPath);
      const cors = source(corsPath);
      const readiness = source(readinessPath);

      for (const needle of [
        "inspectRequest",
        "detectBot",
        "isIpBlocked",
        "autoBlockIfHighThreat",
        "rateLimit(ip, opts.rateLimit)",
        "recordSecurityEvent",
        "recordNetworkEvent",
        "blockNetworkRiskAt",
        "allowedMethods",
        "Method not allowed",
        "Allow",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ]) {
        requireContains(this.id, wrapper, needle, wrapperPath);
      }
      for (const needle of ["strictCorsHeaders", "Access-Control-Allow-Origin", "idempotency-key", "x-device-fingerprint"]) {
        requireContains(this.id, cors, needle, corsPath);
      }
      for (const needle of [
        "high-risk-function-without-wrapper",
        "highRiskMissingSecurity",
        "missingWithSecurity",
        "missingStrictCors",
        "frontendSecretPatterns",
        "frontend-service-role",
      ]) {
        requireContains(this.id, readiness, needle, readinessPath);
      }
    },
  },
  {
    id: "risk-rate-limit-route-matrix",
    category: "rate-limits",
    check() {
      const limiterPath = "supabase/functions/_shared/rateLimiter.ts";
      const migrationPath = "supabase/migrations/20260429230000_security_hardening.sql";
      const limiter = source(limiterPath);
      const migration = source(migrationPath);

      for (const category of [
        "auth_login",
        "auth_register",
        "auth_otp",
        "auth_password_reset",
        "payment",
        "search",
        "upload",
        "admin_action",
        "api_general",
      ]) {
        requireContains(this.id, limiter, `${category}:`, limiterPath);
      }
      for (const needle of ["rateLimitDb(", "rate_limit_check", "Fail-open with in-memory fallback", "Retry-After"]) {
        requireContains(this.id, limiter, needle, limiterPath);
      }
      for (const needle of ["create table if not exists public.rate_limit_buckets", "create or replace function public.rate_limit_check", "for update", "grant execute on function public.rate_limit_check"]) {
        requireContains(this.id, migration, needle, migrationPath);
      }

      for (const [route, rateLimit, risk] of [
        ["send-otp-email", 'rateLimit: "auth_otp"', "blockNetworkRiskAt: 80"],
        ["send-otp-sms", 'rateLimit: "auth_otp"', "blockNetworkRiskAt: 90"],
        ["log-login", 'rateLimit: "auth_login"', "blockNetworkRiskAt: 80"],
        ["process-refund", 'rateLimit: "admin_action"', "blockNetworkRiskAt: 85"],
        ["admin-delete-user", 'rateLimit: "admin_action"', "blockNetworkRiskAt: 85"],
        ["create-grocery-checkout", 'rateLimit: "payment"', "blockNetworkRiskAt: 80"],
        ["create-flight-checkout", 'rateLimit: "payment"', "blockNetworkRiskAt: 80"],
        ["target-search", 'rateLimit: "search"', "blockNetworkRiskAt: 80"],
      ]) {
        requireStrictRoute(this.id, route, { rateLimit, risk });
      }

      for (const [route, rateLimit] of [
        ["admin-create-user", 'rateLimit: "admin_action"'],
        ["admin-delete-user", 'rateLimit: "admin_action"'],
        ["admin-list-created-users", 'rateLimit: "admin_action"'],
        ["admin-update-profile", 'rateLimit: "upload"'],
        ["admin-create-user-post", 'rateLimit: "upload"'],
        ["admin-delete-user-post", 'rateLimit: "admin_action"'],
        ["admin-post-comment", 'rateLimit: "admin_action"'],
        ["admin-moderate-message", 'rateLimit: "admin_action"'],
      ]) {
        requireStrictRoute(this.id, route, { rateLimit, risk: "blockNetworkRiskAt: 85" });
      }

      for (const [route, rateLimit] of [
        ["list-my-sessions", 'rateLimit: "api_general"'],
        ["revoke-session", 'rateLimit: "auth_password_reset"'],
        ["wallet-summary", 'rateLimit: "api_general"'],
        ["create-user-wallet-topup", 'rateLimit: "payment"'],
        ["verify-user-wallet-topup", 'rateLimit: "payment"'],
      ]) {
        requireStrictRoute(this.id, route, { rateLimit, risk: "blockNetworkRiskAt: 80" });
      }
    },
  },
  {
    id: "waf-bot-network-threat-intel",
    category: "threat-detection",
    check() {
      const wafPath = "supabase/functions/_shared/waf.ts";
      const botPath = "supabase/functions/_shared/botDetection.ts";
      const networkPath = "supabase/functions/_shared/networkSignals.ts";
      const threatPath = "supabase/functions/_shared/threatIntel.ts";
      const threatMigrationPath = "supabase/migrations/20260501100000_threat_intel.sql";
      const autoBlockPath = "supabase/migrations/20260501110000_auto_block_threat.sql";
      const networkMigrationPath = "supabase/migrations/20260521183500_network_security_events.sql";
      const waf = source(wafPath);
      const bot = source(botPath);
      const network = source(networkPath);
      const threat = source(threatPath);
      const threatMigration = source(threatMigrationPath);
      const autoBlock = source(autoBlockPath);
      const networkMigration = source(networkMigrationPath);

      for (const needle of ["SQLI", "XSS", "TRAVERSAL", "CMD_INJECTION", "NOSQL", "PROTO_POLLUTION", "MAX_BODY_BYTES", "payload_too_large"]) {
        requireContains(this.id, waf, needle, wafPath);
      }
      for (const needle of ["SCRAPER_UA_PATTERNS", "SCANNER_UA_PATTERNS", "missing_ua", "isLikelyMaliciousBot"]) {
        requireContains(this.id, bot, needle, botPath);
      }
      for (const needle of ["SUSPICIOUS_PROXY_HEADERS", "long_forwarded_chain", "tor_exit_country_code", "probableProxyOrVpn", "Math.min(riskScore, 100)"]) {
        requireContains(this.id, network, needle, networkPath);
      }
      for (const needle of ["isIpBlocked", "lookupThreatHistory", "scoreThreatHistory", "autoBlockIfHighThreat"]) {
        requireContains(this.id, threat, needle, threatPath);
      }
      for (const needle of ["CREATE TABLE IF NOT EXISTS public.ip_blocklist", "CREATE OR REPLACE FUNCTION public.is_ip_blocked", "CREATE OR REPLACE FUNCTION public.get_threat_history"]) {
        requireContains(this.id, threatMigration, needle, threatMigrationPath);
      }
      requireContains(this.id, autoBlock, "CREATE OR REPLACE FUNCTION public.auto_block_if_high_threat", autoBlockPath);
      for (const needle of ["CREATE TABLE IF NOT EXISTS public.network_security_events", "risk_score", "request_id", "ip_hash", "signals text[] NOT NULL DEFAULT '{}'"]) {
        requireContains(this.id, networkMigration, needle, networkMigrationPath);
      }
    },
  },
  {
    id: "attack-drill-coverage",
    category: "drills",
    check() {
      const drillsPath = "docs/security-anti-abuse-drills.md";
      const workflowPath = "src/test/workflows/security-anti-abuse.test.ts";
      const focusedDrillsPath = "src/test/securityAttackDrills.test.ts";
      const rateLimitTestPath = "src/test/rateLimitRiskDecisions.test.ts";
      const accountTakeoverE2ePath = "tests/e2e/account-takeover-protection.spec.ts";
      const matrixPath = "scripts/qa/platform-readiness-matrix.mjs";
      const coveragePath = "scripts/qa/workflow-coverage.mjs";
      const packagePath = "package.json";
      const drills = source(drillsPath);
      const workflow = source(workflowPath);
      const focusedDrills = source(focusedDrillsPath);
      const rateLimitTest = source(rateLimitTestPath);
      const accountTakeoverE2e = source(accountTakeoverE2ePath);
      const matrix = source(matrixPath);
      const coverage = source(coveragePath);
      const packageJson = source(packagePath);

      for (const drill of [
        "Account takeover / OTP stuffing",
        "Card testing / payment replay",
        "Spam / notification abuse",
        "Scraping / scanner traffic",
        "Fake booking / price tampering",
        "Key leakage / frontend secret exposure",
      ]) {
        requireContains(this.id, drills, drill, drillsPath);
        requireContains(this.id, workflow, drill, workflowPath);
        requireContains(this.id, focusedDrills, drill, focusedDrillsPath);
      }
      requireContains(this.id, rateLimitTest, "sensitive routes on the right rate-limit and network-risk thresholds", rateLimitTestPath);
      for (const needle of ["auth_precheck_login", "verify-otp-code", "register_trusted_device", "new_device_login", "country_change_login"]) {
        requireContains(this.id, accountTakeoverE2e, needle, accountTakeoverE2ePath);
      }
      requireContains(this.id, matrix, "src/test/securityAttackDrills.test.ts", matrixPath);
      requireContains(this.id, matrix, "tests/e2e/account-takeover-protection.spec.ts", matrixPath);
      requireContains(this.id, matrix, "qa:security-anti-abuse-contracts", matrixPath);
      requireContains(this.id, coverage, "qa:security-anti-abuse-contracts", coveragePath);
      requireContains(this.id, packageJson, '"qa:security-anti-abuse-contracts"', packagePath);
      requireContains(this.id, packageJson, "npm run qa:security-anti-abuse-contracts", packagePath);
    },
  },
  {
    id: "money-booking-spam-abuse",
    category: "abuse-prevention",
    check() {
      const stripeWebhookPath = "supabase/functions/stripe-webhook/index.ts";
      const carDepositPath = "supabase/functions/create-car-rental-deposit/index.ts";
      const lodgingDepositPath = "supabase/functions/create-lodging-deposit/index.ts";
      const groceryCheckoutPath = "supabase/functions/create-grocery-checkout/index.ts";
      const notifyDispatchPath = "supabase/functions/notify-dispatch/index.ts";
      const bookingSecurityPath = "supabase/migrations/20260524110000_salon_public_booking_security.sql";
      const bookingGatePath = "supabase/migrations/20260601231500_salon_bookings_public_submit_gate.sql";
      const bookingSubmitPath = "supabase/functions/salon-booking-submit/index.ts";
      const bookingPagePath = "src/pages/salon/PublicSalonBookingPage.tsx";
      const stripeWebhook = source(stripeWebhookPath);
      const carDeposit = source(carDepositPath);
      const lodgingDeposit = source(lodgingDepositPath);
      const groceryCheckout = source(groceryCheckoutPath);
      const notifyDispatch = source(notifyDispatchPath);
      const bookingSecurity = source(bookingSecurityPath);
      const bookingGate = source(bookingGatePath);
      const bookingSubmit = source(bookingSubmitPath);
      const bookingPage = source(bookingPagePath);

      requireContains(this.id, stripeWebhook, 'withSecurity("stripe-webhook"', stripeWebhookPath);
      requireContains(this.id, stripeWebhook, "idempotency", stripeWebhookPath);
      requireContains(this.id, stripeWebhook, "purchase_records", stripeWebhookPath);
      for (const [text, relativePath] of [
        [carDeposit, carDepositPath],
        [lodgingDeposit, lodgingDepositPath],
        [groceryCheckout, groceryCheckoutPath],
      ]) {
        requireContains(this.id, text, 'rateLimit', relativePath);
        requireContains(this.id, text, "strictCors: true", relativePath);
        requireContains(this.id, text, 'trackNetwork: "suspicious"', relativePath);
        requireContains(this.id, text, "blockNetworkRiskAt: 80", relativePath);
      }
      requireContains(this.id, carDeposit, "TERMINAL_PAYMENT_STATES", carDepositPath);
      requireContains(this.id, carDeposit, "const idempotencyKey = `car_rental_dep_", carDepositPath);
      requireContains(this.id, lodgingDeposit, "TERMINAL_PAYMENT_STATES", lodgingDepositPath);
      requireContains(this.id, lodgingDeposit, "checkout.sessions.create(sessionParams, { idempotencyKey })", lodgingDepositPath);
      for (const needle of ["marketing_enabled", "marketing_disabled", "deliveryAllowed"]) {
        requireContains(this.id, notifyDispatch, needle, notifyDispatchPath);
      }
      for (const needle of ["tg_salon_sanitize_public_booking", "NEW.price_cents := v_svc.price_cents", "NEW.status := 'pending'", "Public can request bookings"]) {
        requireContains(this.id, bookingSecurity, needle, bookingSecurityPath);
      }
      requireContains(this.id, bookingPage, '"salon-booking-submit"', bookingPagePath);
      requireNotMatch(this.id, bookingPage, /from\("salon_bookings"\)[\s\S]{0,360}\.(insert|upsert)/, bookingPagePath);
      for (const needle of [
        'withSecurity("salon-booking-submit"',
        'allowedMethods: ["POST"]',
        "strictCors: true",
        "SUPABASE_SERVICE_ROLE_KEY",
        '.from("store_profiles")',
        '.from("salon_services")',
        '.from("salon_stylists")',
        '.from("salon_bookings")',
      ]) {
        requireContains(this.id, bookingSubmit, needle, bookingSubmitPath);
      }
      for (const needle of [
        "Salon booking public inserts require trusted server-side validation",
        "REVOKE INSERT ON TABLE public.salon_bookings FROM anon",
        "TO service_role",
      ]) {
        requireContains(this.id, bookingGate, needle, bookingGatePath);
      }
    },
  },
  {
    id: "legacy-friendship-server-ownership",
    category: "social-safety",
    check() {
      const friendshipPath = "supabase/functions/friendship-manage/index.ts";
      const friendshipGatePath = "supabase/migrations/20260601165245_friendships_server_gate.sql";
      const notificationsPath = "src/pages/NotificationsPage.tsx";
      const friendRequestsPath = "src/pages/FriendRequestsPage.tsx";
      const publicProfilePath = "src/pages/PublicProfilePage.tsx";
      const socialFeedPath = "src/pages/SocialFeedPage.tsx";
      const publicUserProfilePath = "src/pages/user/PublicUserProfilePage.tsx";
      const socialListModalPath = "src/components/profile/SocialListModal.tsx";
      const friendshipFn = source(friendshipPath);
      const friendshipGate = source(friendshipGatePath);
      const notificationsPage = source(notificationsPath);
      const friendRequestsPage = source(friendRequestsPath);
      const publicProfilePage = source(publicProfilePath);
      const socialFeedPage = source(socialFeedPath);
      const publicUserProfilePage = source(publicUserProfilePath);
      const socialListModal = source(socialListModalPath);

      for (const needle of [
        'withSecurity("friendship-manage"',
        "strictCors: true",
        'allowedMethods: ["POST"]',
        'trackNetwork: "suspicious"',
        "blockNetworkRiskAt: 80",
        "auth.getUser(token)",
        "cleanUuid",
        "ensureFollowing",
        "removeFollowing",
        'from("friendships")',
        'from("user_followers")',
        "send-push-notification",
        "friend_request_received",
        "friend_request_accepted",
      ]) {
        requireContains(this.id, friendshipFn, needle, friendshipPath);
      }
      requireNotContains(this.id, friendshipFn, '"Access-Control-Allow-Origin": "*"', friendshipPath);

      for (const policy of [
        "friendships_block_direct_insert",
        "friendships_block_direct_update",
        "friendships_block_direct_delete",
      ]) {
        requireContains(this.id, friendshipGate, policy, friendshipGatePath);
      }
      requireContains(this.id, friendshipGate, "AS RESTRICTIVE", friendshipGatePath);
      requireContains(this.id, friendshipGate, "trusted server-side ingestion", friendshipGatePath);

      for (const [surface, relativePath] of [
        [notificationsPage, notificationsPath],
        [friendRequestsPage, friendRequestsPath],
        [publicProfilePage, publicProfilePath],
        [socialFeedPage, socialFeedPath],
        [publicUserProfilePage, publicUserProfilePath],
        [socialListModal, socialListModalPath],
      ]) {
        requireContains(this.id, surface, 'functions.invoke("friendship-manage"', relativePath);
        requireNotMatch(this.id, surface, /from\(["']friendships["']\)[\s\S]{0,360}\.(insert|upsert|update|delete)/, relativePath);
      }
      requireNotContains(this.id, notificationsPage, 'functions.invoke("send-push-notification"', notificationsPath);
    },
  },
  {
    id: "notifications-server-ownership",
    category: "notification-safety",
    check() {
      const functionPath = "supabase/functions/notification-manage/index.ts";
      const helperPath = "src/lib/notifications/notificationManage.ts";
      const gatePath = "supabase/migrations/20260601100000_notifications_server_gate.sql";
      const notificationFn = source(functionPath);
      const helper = source(helperPath);
      const gate = source(gatePath);
      const surfaces = [
        ["src/hooks/useNotifications.ts", source("src/hooks/useNotifications.ts")],
        ["src/pages/NotificationCenterPage.tsx", source("src/pages/NotificationCenterPage.tsx")],
        ["src/pages/app/personal/PersonalNotificationsPage.tsx", source("src/pages/app/personal/PersonalNotificationsPage.tsx")],
        ["src/components/rides/RideNotificationCenter.tsx", source("src/components/rides/RideNotificationCenter.tsx")],
      ];

      for (const needle of [
        'withSecurity("notification-manage"',
        "strictCors: true",
        'allowedMethods: ["POST"]',
        'trackNetwork: "suspicious"',
        "blockNetworkRiskAt: 80",
        "auth.getUser(token)",
        "userOwnershipFilter(user.id)",
        "user_id.eq",
        "to_value.eq",
        'from("notifications")',
      ]) {
        requireContains(this.id, notificationFn, needle, functionPath);
      }
      requireNotContains(this.id, notificationFn, '"Access-Control-Allow-Origin": "*"', functionPath);

      for (const needle of [
        'functions.invoke("notification-manage"',
        'action: "mark_read"',
        'action: "mark_all_read"',
        'action: "delete"',
        'action: "clear_in_app"',
        'action: "snooze"',
      ]) {
        requireContains(this.id, helper, needle, helperPath);
      }

      for (const policy of ["notifications_block_direct_update", "notifications_block_direct_delete"]) {
        requireContains(this.id, gate, policy, gatePath);
      }
      requireContains(this.id, gate, "AS RESTRICTIVE", gatePath);

      for (const [relativePath, surface] of surfaces) {
        requireContains(this.id, surface, "notificationManage", relativePath);
        requireNotMatch(this.id, surface, /functions\.invoke\(["']notification-manage["']/, relativePath);
        requireNotMatch(this.id, surface, /from\(["']notifications["']\)[\s\S]{0,260}\.(update|delete)/, relativePath);
      }
    },
  },
  {
    id: "follow-graph-server-ownership",
    category: "social-safety",
    check() {
      const followPath = "supabase/functions/follow-manage/index.ts";
      const followFn = source(followPath);
      const surfaces = [
        ["src/pages/PublicProfilePage.tsx", source("src/pages/PublicProfilePage.tsx")],
        ["src/pages/SocialFeedPage.tsx", source("src/pages/SocialFeedPage.tsx")],
        ["src/pages/FeedPage.tsx", source("src/pages/FeedPage.tsx")],
        ["src/pages/ReelsFeedPage.tsx", source("src/pages/ReelsFeedPage.tsx")],
        ["src/pages/LiveStreamPage.tsx", source("src/pages/LiveStreamPage.tsx")],
        ["src/components/profile/SocialListModal.tsx", source("src/components/profile/SocialListModal.tsx")],
        ["src/components/social/FollowSuggestions.tsx", source("src/components/social/FollowSuggestions.tsx")],
        ["src/components/social/SuggestedUsersCarousel.tsx", source("src/components/social/SuggestedUsersCarousel.tsx")],
        ["src/components/social/FeaturedCreatorsRow.tsx", source("src/components/social/FeaturedCreatorsRow.tsx")],
        ["src/components/social/TrendingCreators.tsx", source("src/components/social/TrendingCreators.tsx")],
      ];

      for (const needle of [
        'withSecurity("follow-manage"',
        "strictCors: true",
        'allowedMethods: ["POST"]',
        'trackNetwork: "suspicious"',
        "blockNetworkRiskAt: 80",
        "auth.getUser(token)",
        "cleanUuid",
        "removeFollower",
        "notifyNewFollower",
        'from("user_followers")',
        "send-push-notification",
        "new_follower",
      ]) {
        requireContains(this.id, followFn, needle, followPath);
      }
      requireNotContains(this.id, followFn, '"Access-Control-Allow-Origin": "*"', followPath);

      for (const [relativePath, surface] of surfaces) {
        requireContains(this.id, surface, 'functions.invoke("follow-manage"', relativePath);
        requireNotMatch(this.id, surface, /from\(["']user_followers["'](?: as any)?\)[\s\S]{0,360}\.(insert|upsert|update|delete)/, relativePath);
        requireNotContains(this.id, surface, 'notification_type: "new_follower"', relativePath);
      }
    },
  },
  {
    id: "direct-message-send-server-ownership",
    category: "chat-safety",
    check() {
      const chatSendPath = "supabase/functions/chat-message-send/index.ts";
      const chatSendGatePath = "supabase/migrations/20260601172000_direct_messages_server_gate.sql";
      const helperPath = "src/lib/chat/directMessageSend.ts";
      const outboxPath = "src/lib/chat/messageOutbox.ts";
      const chatSendFn = source(chatSendPath);
      const chatSendGate = source(chatSendGatePath);
      const helper = source(helperPath);
      const outbox = source(outboxPath);
      const surfaces = [
        ["src/components/chat/PersonalChat.tsx", source("src/components/chat/PersonalChat.tsx")],
        ["src/pages/ChatHubPage.tsx", source("src/pages/ChatHubPage.tsx")],
        ["src/components/chat/CallScreen.tsx", source("src/components/chat/CallScreen.tsx")],
        ["src/components/chat/ShareToChatSheet.tsx", source("src/components/chat/ShareToChatSheet.tsx")],
        ["src/components/stories/StoryViewer.tsx", source("src/components/stories/StoryViewer.tsx")],
        ["src/components/stories/StoryForwardSheet.tsx", source("src/components/stories/StoryForwardSheet.tsx")],
        ["src/hooks/useBroadcastLists.ts", source("src/hooks/useBroadcastLists.ts")],
        ["src/hooks/useMessageActions.ts", source("src/hooks/useMessageActions.ts")],
        ["src/components/chat/GiftSendSheet.tsx", source("src/components/chat/GiftSendSheet.tsx")],
        ["src/components/notifications/ChatBellPopover.tsx", source("src/components/notifications/ChatBellPopover.tsx")],
        ["src/pages/NotificationCenterPage.tsx", source("src/pages/NotificationCenterPage.tsx")],
      ];

      for (const needle of [
        'withSecurity("chat-message-send"',
        "strictCors: true",
        'allowedMethods: ["POST"]',
        'trackNetwork: "suspicious"',
        "blockNetworkRiskAt: 80",
        "auth.getUser(token)",
        "MESSAGE_TYPES",
        "locked_payload_content",
        "sender_id: senderId",
        'from("direct_messages")',
        'from("direct_message_locked_payloads")',
      ]) {
        requireContains(this.id, chatSendFn, needle, chatSendPath);
      }
      requireNotContains(this.id, chatSendFn, '"Access-Control-Allow-Origin": "*"', chatSendPath);

      for (const needle of [
        "direct_messages_block_direct_insert",
        "direct_message_locked_payloads_block_direct_insert",
        "AS RESTRICTIVE",
        "CREATE OR REPLACE FUNCTION public.tg_notify_direct_message()",
        "user_id = NEW.sender_id OR id = NEW.sender_id",
      ]) {
        requireContains(this.id, chatSendGate, needle, chatSendGatePath);
      }

      requireContains(this.id, helper, 'functions.invoke<FunctionSendResult>("chat-message-send"', helperPath);
      requireContains(this.id, helper, "stripClientSender", helperPath);
      requireContains(this.id, outbox, "sendDirectMessage", outboxPath);

      for (const [relativePath, surface] of surfaces) {
        requireMatch(this.id, surface, /sendDirectMessage|sendDirectMessages/, relativePath);
        requireNotMatch(this.id, surface, /from\(["']direct_messages["'](?:\s+as\s+any)?\)(?:(?!;)[\s\S]){0,360}\.insert/, relativePath);
        requireNotMatch(this.id, surface, /dbFrom\(["']direct_messages["']\)\.insert/, relativePath);
        requireNotMatch(this.id, surface, /supabase\.from\(["']direct_messages["']\)\.insert/, relativePath);
        requireNotContains(this.id, surface, 'notification_type: "chat_message"', relativePath);
        requireNotContains(this.id, surface, "sendChatPush", relativePath);
      }
    },
  },
  {
    id: "group-message-send-server-membership",
    category: "chat-safety",
    check() {
      const groupSendPath = "supabase/functions/group-message-send/index.ts";
      const groupSendGatePath = "supabase/migrations/20260601173500_group_messages_server_gate.sql";
      const helperPath = "src/lib/chat/groupMessageSend.ts";
      const outboxPath = "src/lib/chat/messageOutbox.ts";
      const groupSendFn = source(groupSendPath);
      const groupSendGate = source(groupSendGatePath);
      const helper = source(helperPath);
      const outbox = source(outboxPath);
      const surfaces = [
        ["src/components/chat/GroupChat.tsx", source("src/components/chat/GroupChat.tsx")],
        ["src/components/chat/ShareToChatSheet.tsx", source("src/components/chat/ShareToChatSheet.tsx")],
      ];

      for (const needle of [
        'withSecurity("group-message-send"',
        "strictCors: true",
        'allowedMethods: ["POST"]',
        'trackNetwork: "suspicious"',
        "blockNetworkRiskAt: 80",
        "auth.getUser(token)",
        "MESSAGE_TYPES",
        'from("chat_group_members")',
        '.eq("group_id", groupId)',
        '.eq("user_id", senderId)',
        "sender_id: senderId",
        'from("group_messages")',
      ]) {
        requireContains(this.id, groupSendFn, needle, groupSendPath);
      }
      requireNotContains(this.id, groupSendFn, '"Access-Control-Allow-Origin": "*"', groupSendPath);

      for (const needle of [
        "group_messages_block_direct_insert",
        "AS RESTRICTIVE",
        "CREATE OR REPLACE FUNCTION public.tg_notify_group_message()",
        "user_id = NEW.sender_id OR id = NEW.sender_id",
        "send-push-notification",
        "group_message",
      ]) {
        requireContains(this.id, groupSendGate, needle, groupSendGatePath);
      }

      requireContains(this.id, helper, 'functions.invoke<FunctionSendResult>("group-message-send"', helperPath);
      requireContains(this.id, helper, "stripClientSender", helperPath);
      requireContains(this.id, outbox, "sendGroupMessage", outboxPath);

      for (const [relativePath, surface] of surfaces) {
        requireContains(this.id, surface, "sendGroupMessage", relativePath);
        requireNotMatch(this.id, surface, /from\(["']group_messages["'](?:\s+as\s+any)?\)(?:(?!;)[\s\S]){0,360}\.insert/, relativePath);
        requireNotMatch(this.id, surface, /dbFrom\(["']group_messages["']\)\.insert/, relativePath);
        requireNotMatch(this.id, surface, /supabase\.from\(["']group_messages["']\)\.insert/, relativePath);
        requireNotContains(this.id, surface, 'notification_type: "group_message"', relativePath);
        requireNotContains(this.id, surface, "sendGroupPush", relativePath);
      }
    },
  },
  {
    id: "chat-group-lifecycle-server-roles",
    category: "chat-safety",
    check() {
      const groupManagePath = "supabase/functions/chat-group-manage/index.ts";
      const groupManageGatePath = "supabase/migrations/20260601175000_chat_groups_server_gate.sql";
      const helperPath = "src/lib/chat/groupManage.ts";
      const groupManageFn = source(groupManagePath);
      const groupManageGate = source(groupManageGatePath);
      const helper = source(helperPath);
      const surfaces = [
        ["src/hooks/useGroupAdmin.ts", source("src/hooks/useGroupAdmin.ts")],
        ["src/components/chat/CreateGroupModal.tsx", source("src/components/chat/CreateGroupModal.tsx")],
        ["src/components/chat/GroupInfoSheet.tsx", source("src/components/chat/GroupInfoSheet.tsx")],
        ["src/components/chat/GroupChat.tsx", source("src/components/chat/GroupChat.tsx")],
        ["src/pages/ChatHubPage.tsx", source("src/pages/ChatHubPage.tsx")],
      ];

      for (const needle of [
        'withSecurity("chat-group-manage"',
        "strictCors: true",
        'allowedMethods: ["POST"]',
        'trackNetwork: "suspicious"',
        "blockNetworkRiskAt: 80",
        "auth.getUser(token)",
        '"create_group"',
        '"set_member_role"',
        '"create_invite"',
        "requireAdmin",
        "getMemberRole",
        "countOwners",
        'from("chat_groups")',
        'from("chat_group_members")',
        'from("chat_group_invites")',
      ]) {
        requireContains(this.id, groupManageFn, needle, groupManagePath);
      }
      requireNotContains(this.id, groupManageFn, '"Access-Control-Allow-Origin": "*"', groupManagePath);

      for (const policy of [
        "chat_groups_block_direct_insert",
        "chat_groups_block_direct_update",
        "chat_groups_block_direct_delete",
        "chat_group_members_block_direct_insert",
        "chat_group_members_block_direct_update",
        "chat_group_members_block_direct_delete",
        "chat_group_invites_block_direct_insert",
        "chat_group_invites_block_direct_update",
        "chat_group_invites_block_direct_delete",
      ]) {
        requireContains(this.id, groupManageGate, policy, groupManageGatePath);
      }
      requireContains(this.id, groupManageGate, "AS RESTRICTIVE", groupManageGatePath);
      requireContains(this.id, groupManageGate, "trusted server-side", groupManageGatePath);

      requireContains(this.id, helper, 'functions.invoke<GroupManageResult<T>>("chat-group-manage"', helperPath);
      for (const helperName of [
        "createGroup",
        "updateGroup",
        "addGroupMembers",
        "removeGroupMember",
        "leaveGroup",
        "setGroupMemberRole",
        "muteGroupMember",
        "createGroupInvite",
        "revokeGroupInvite",
      ]) {
        requireContains(this.id, helper, helperName, helperPath);
      }

      for (const [relativePath, surface] of surfaces) {
        requireMatch(this.id, surface, /createGroup|updateGroup|addGroupMembers|removeGroupMember|leaveGroup|setGroupMemberRole|muteGroupMember|createGroupInvite|revokeGroupInvite/, relativePath);
        requireNotMatch(this.id, surface, /from\(["']chat_groups["'](?:\s+as\s+any)?\)(?:(?!;)[\s\S]){0,360}\.(insert|update|delete)/, relativePath);
        requireNotMatch(this.id, surface, /dbFrom\(["']chat_groups["']\)(?:(?!;)[\s\S]){0,360}\.(insert|update|delete)/, relativePath);
        requireNotMatch(this.id, surface, /from\(["']chat_group_members["'](?:\s+as\s+any)?\)(?:(?!;)[\s\S]){0,360}\.(insert|update|delete)/, relativePath);
        requireNotMatch(this.id, surface, /dbFrom\(["']chat_group_members["']\)(?:(?!;)[\s\S]){0,360}\.(insert|update|delete)/, relativePath);
        requireNotMatch(this.id, surface, /from\(["']chat_group_invites["'](?:\s+as\s+any)?\)(?:(?!;)[\s\S]){0,360}\.(insert|update|delete)/, relativePath);
      }
    },
  },
  {
    id: "post-reactions-server-ownership",
    category: "feed-safety",
    check() {
      const reactionManagePath = "supabase/functions/post-reaction-manage/index.ts";
      const reactionGatePath = "supabase/migrations/20260601180500_post_reactions_server_gate.sql";
      const helperPath = "src/lib/social/postReactionManage.ts";
      const reactionManageFn = source(reactionManagePath);
      const reactionGate = source(reactionGatePath);
      const helper = source(helperPath);
      const surfaces = [
        ["src/hooks/usePostReactions.ts", source("src/hooks/usePostReactions.ts")],
        ["src/pages/ReelsFeedPage.tsx", source("src/pages/ReelsFeedPage.tsx")],
      ];

      for (const needle of [
        'withSecurity("post-reaction-manage"',
        "strictCors: true",
        'allowedMethods: ["POST"]',
        'trackNetwork: "suspicious"',
        "blockNetworkRiskAt: 80",
        "auth.getUser(token)",
        "REACTION_EMOJIS",
        "cleanEmoji",
        "ensurePostExists",
        'source === "user" ? "user_posts" : "store_posts"',
        'from("post_reactions")',
        ".eq(\"user_id\", user.id)",
        "onConflict: \"user_id,post_id,source\"",
      ]) {
        requireContains(this.id, reactionManageFn, needle, reactionManagePath);
      }
      requireNotContains(this.id, reactionManageFn, '"Access-Control-Allow-Origin": "*"', reactionManagePath);

      for (const policy of [
        "post_reactions_block_direct_insert",
        "post_reactions_block_direct_update",
        "post_reactions_block_direct_delete",
      ]) {
        requireContains(this.id, reactionGate, policy, reactionGatePath);
      }
      requireContains(this.id, reactionGate, "AS RESTRICTIVE", reactionGatePath);
      requireContains(this.id, reactionGate, "trusted server-side", reactionGatePath);

      requireContains(this.id, helper, 'functions.invoke<PostReactionManageResult>("post-reaction-manage"', helperPath);
      requireContains(this.id, helper, "set_reaction", helperPath);
      requireContains(this.id, helper, "clear_reaction", helperPath);

      for (const [relativePath, surface] of surfaces) {
        requireContains(this.id, surface, "setPostReaction", relativePath);
        requireNotMatch(this.id, surface, /from\(["']post_reactions["'](?:\s+as\s+any)?\)(?:(?!;)[\s\S]){0,360}\.(insert|upsert|update|delete)/, relativePath);
      }
    },
  },
  {
    id: "post-bookmarks-server-ownership",
    category: "feed-safety",
    check() {
      const bookmarkManagePath = "supabase/functions/post-bookmark-manage/index.ts";
      const bookmarkGatePath = "supabase/migrations/20260601182000_post_bookmarks_server_gate.sql";
      const helperPath = "src/lib/social/postBookmarkManage.ts";
      const bookmarkManageFn = source(bookmarkManagePath);
      const bookmarkGate = source(bookmarkGatePath);
      const helper = source(helperPath);
      const surfaces = [
        ["src/hooks/usePostActions.ts", source("src/hooks/usePostActions.ts")],
        ["src/pages/FeedPage.tsx", source("src/pages/FeedPage.tsx")],
        ["src/pages/ReelsFeedPage.tsx", source("src/pages/ReelsFeedPage.tsx")],
        ["src/pages/BookmarksPage.tsx", source("src/pages/BookmarksPage.tsx")],
        ["src/pages/SavedPostsPage.tsx", source("src/pages/SavedPostsPage.tsx")],
        ["src/pages/SocialFeedPage.tsx", source("src/pages/SocialFeedPage.tsx")],
        ["src/components/profile/ProfileContentTabs.tsx", source("src/components/profile/ProfileContentTabs.tsx")],
        ["src/pages/PublicProfilePage.tsx", source("src/pages/PublicProfilePage.tsx")],
      ];

      for (const needle of [
        'withSecurity("post-bookmark-manage"',
        "strictCors: true",
        'allowedMethods: ["POST"]',
        'trackNetwork: "suspicious"',
        "blockNetworkRiskAt: 80",
        "auth.getUser(token)",
        "ensurePostExists",
        "resolveBookmarkTarget",
        "saveLegacyBookmark",
        "deleteLegacyBookmark",
        'source === "user" ? "user_posts" : "store_posts"',
        'from("post_bookmarks")',
        'from("bookmarks")',
        "onConflict: \"user_id,post_id,source\"",
        "onConflict: \"user_id,item_type,item_id\"",
      ]) {
        requireContains(this.id, bookmarkManageFn, needle, bookmarkManagePath);
      }
      requireNotContains(this.id, bookmarkManageFn, '"Access-Control-Allow-Origin": "*"', bookmarkManagePath);

      for (const policy of [
        "post_bookmarks_block_direct_insert",
        "post_bookmarks_block_direct_update",
        "post_bookmarks_block_direct_delete",
        "bookmarks_block_direct_post_insert",
        "bookmarks_block_direct_post_update",
        "bookmarks_block_direct_post_delete",
      ]) {
        requireContains(this.id, bookmarkGate, policy, bookmarkGatePath);
      }
      requireContains(this.id, bookmarkGate, "AS RESTRICTIVE", bookmarkGatePath);
      requireContains(this.id, bookmarkGate, "Non-post bookmarks keep existing user-owned RLS", bookmarkGatePath);

      requireContains(this.id, helper, 'functions.invoke<PostBookmarkManageResult>("post-bookmark-manage"', helperPath);
      requireContains(this.id, helper, "save_post", helperPath);
      requireContains(this.id, helper, "unsave_post", helperPath);

      for (const [relativePath, surface] of surfaces) {
        requireMatch(this.id, surface, /savePostBookmark|removePostBookmark/, relativePath);
        requireNotMatch(this.id, surface, /from\(["']post_bookmarks["'](?:\s+as\s+any)?\)(?:(?!;)[\s\S]){0,360}\.(insert|upsert|update|delete)/, relativePath);
        requireNotMatch(this.id, surface, /from\(["']bookmarks["'](?:\s+as\s+any)?\)(?:(?!;)[\s\S]){0,420}\.(insert|upsert|update|delete)[\s\S]{0,240}item_type["']?\s*:\s*["']post["']/, relativePath);
      }
    },
  },
  {
    id: "audit-incidents-secret-leakage",
    category: "audit",
    check() {
      const auditPath = "supabase/functions/_shared/audit.ts";
      const sentinelPath = "supabase/migrations/20260411160000_security_sentinel_project.sql";
      const chatSecurityPath = "supabase/migrations/20260411124500_chat_security_enforcement.sql";
      const loginPath = "supabase/functions/log-login/index.ts";
      const securityNotificationsPath = "supabase/functions/process-security-notifications/index.ts";
      const secretScannerPath = "scripts/security/check-secrets.mjs";
      const rotationRunbookPath = "docs/supabase-secret-rotation-runbook.md";
      const deploySecretsPath = "docs/production-deploy-secrets.md";
      const drillsPath = "docs/security-anti-abuse-drills.md";
      const audit = source(auditPath);
      const sentinel = source(sentinelPath);
      const chatSecurity = source(chatSecurityPath);
      const login = source(loginPath);
      const securityNotifications = source(securityNotificationsPath);
      const secretScanner = source(secretScannerPath);
      const rotationRunbook = source(rotationRunbookPath);
      const deploySecrets = source(deploySecretsPath);
      const drills = source(drillsPath);

      for (const needle of ["redactPii", "recordSecurityEvent", "recordNetworkEvent", "recordAudit", "security_events"]) {
        requireContains(this.id, audit, needle, auditPath);
      }
      for (const needle of ["CREATE TABLE IF NOT EXISTS public.security_incidents", "chain_hash", "prev_chain_hash", "compute_incident_chain_hash", "admin_ack_security_incident", "Only admins can acknowledge incidents"]) {
        requireContains(this.id, sentinel, needle, sentinelPath);
      }
      for (const needle of ["CREATE TABLE IF NOT EXISTS public.chat_security_events", "analyze_chat_content_security", "enforce_chat_message_security", "RAISE EXCEPTION 'Message blocked by security policy"]) {
        requireContains(this.id, chatSecurity, needle, chatSecurityPath);
      }
      requireContains(this.id, login, "login_history", loginPath);
      requireContains(this.id, securityNotifications, "new-device-login", securityNotificationsPath);
      requireContains(this.id, securityNotifications, "country-change-login", securityNotificationsPath);
      for (const secretGuard of ["Supabase service-role JWT", "Supabase publishable key", "Supabase secret key", "Supabase access token", "Private key block", "OpenAI API key"]) {
        requireContains(this.id, secretScanner, secretGuard, secretScannerPath);
      }
      for (const needle of ["Supabase Secret Rotation Runbook", "Treat the value as compromised", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_ACCESS_TOKEN", "rg -l --hidden", "--glob '!.env.local'", "Incident Closeout"]) {
        requireContains(this.id, rotationRunbook, needle, rotationRunbookPath);
      }
      requireContains(this.id, deploySecrets, "docs/supabase-secret-rotation-runbook.md", deploySecretsPath);
      requireContains(this.id, drills, "Supabase rotation runbook", drillsPath);
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
