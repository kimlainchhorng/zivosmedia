import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("security attack drill guard", () => {
  it("keeps the documented drill matrix mapped to executable controls", () => {
    const drills = read("docs/security-anti-abuse-drills.md");
    const workflow = read("src/test/workflows/security-anti-abuse.test.ts");
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");

    for (const drill of [
      "Account takeover / OTP stuffing",
      "Card testing / payment replay",
      "Spam / notification abuse",
      "Scraping / scanner traffic",
      "Fake booking / price tampering",
      "Key leakage / frontend secret exposure",
    ]) {
      expect(drills).toContain(drill);
      expect(workflow).toContain(drill);
    }

    expect(matrix).toContain("src/test/securityAttackDrills.test.ts");
    expect(drills).toContain("npm run security:api-readiness -- --strict");
    expect(drills).toContain("npm run security:scan");
  });

  it("keeps account takeover controls tied to OTP, login, sessions, and device alerts", () => {
    const otpEmail = read("supabase/functions/send-otp-email/index.ts");
    const otpSms = read("supabase/functions/send-otp-sms/index.ts");
    const login = read("supabase/functions/log-login/index.ts");
    const listSessions = read("supabase/functions/list-my-sessions/index.ts");
    const revokeSession = read("supabase/functions/revoke-session/index.ts");
    const securityNotifications = read(
      "supabase/functions/process-security-notifications/index.ts",
    );
    const authHardening = read(
      "supabase/migrations/20260429230000_security_hardening.sql",
    );

    for (const source of [otpEmail, otpSms]) {
      expect(source).toContain("withSecurity(");
      expect(source).toContain('rateLimit: "auth_otp"');
      expect(source).toContain("strictCors: true");
    }
    expect(otpEmail).toContain("blockNetworkRiskAt: 80");
    expect(otpSms).toContain("blockNetworkRiskAt: 90");
    expect(otpEmail).toContain("Too many verification requests");

    expect(login).toContain('withSecurity("log-login"');
    expect(login).toContain('rateLimit: "auth_login"');
    expect(login).toContain("login_history");
    expect(login).toContain("blockNetworkRiskAt: 80");

    for (const source of [listSessions, revokeSession]) {
      expect(source).toContain("withSecurity(");
      expect(source).toContain("strictCors: true");
      expect(source).toContain("trackNetwork");
      expect(source).toContain("blockNetworkRiskAt: 80");
    }

    expect(securityNotifications).toContain("new-device-login");
    expect(securityNotifications).toContain("country-change-login");
    expect(authHardening.toLowerCase()).toContain(
      "create table if not exists public.auth_lockout_state",
    );
    expect(authHardening).toContain("fail_count");
    expect(authHardening).toContain("locked_until");
  });

  it("keeps money and booking abuse drills protected by idempotency, terminal states, and server-side pricing", () => {
    const stripeWebhook = read("supabase/functions/stripe-webhook/index.ts");
    const groceryCheckout = read(
      "supabase/functions/create-grocery-checkout/index.ts",
    );
    const carDeposit = read(
      "supabase/functions/create-car-rental-deposit/index.ts",
    );
    const lodgingDeposit = read(
      "supabase/functions/create-lodging-deposit/index.ts",
    );
    const salonBookingSecurity = read(
      "supabase/migrations/20260524110000_salon_public_booking_security.sql",
    );
    const salonBookingGate = read(
      "supabase/migrations/20260601231500_salon_bookings_public_submit_gate.sql",
    );
    const salonBookingSubmit = read(
      "supabase/functions/salon-booking-submit/index.ts",
    );
    const salonBookingPage = read("src/pages/salon/PublicSalonBookingPage.tsx");
    const paymentsWorkflow = read(
      "src/test/workflows/payments-refunds-webhooks.test.ts",
    );

    expect(stripeWebhook).toMatch(/withSecurity\(\s*["']stripe-webhook["']/);
    expect(stripeWebhook).toContain("idempotency");
    expect(stripeWebhook).toContain("flight_payment_audit_log");
    expect(stripeWebhook).toContain("purchase_records");
    expect(paymentsWorkflow).toContain(
      "keeps provider webhooks idempotent and provider-authoritative",
    );

    for (const checkout of [groceryCheckout, carDeposit, lodgingDeposit]) {
      expect(checkout).toContain("rateLimit");
      expect(checkout).toContain("strictCors: true");
      expect(checkout).toContain("trackNetwork");
      expect(checkout).toContain("blockNetworkRiskAt: 80");
    }

    expect(carDeposit).toContain(
      'code: "car_rental_payment_authority_unavailable"',
    );
    expect(carDeposit).toContain("status: 503");
    expect(carDeposit).not.toContain("Stripe");
    expect(carDeposit).not.toContain("paymentIntents");
    expect(carDeposit).not.toContain("req.json");
    expect(lodgingDeposit).toContain('rateLimitDb(user.id, "payment")');
    expect(lodgingDeposit).toContain("TERMINAL_PAYMENT_STATES");
    expect(lodgingDeposit).toContain(
      "checkout.sessions.create(sessionParams, { idempotencyKey })",
    );

    expect(salonBookingSecurity).toContain("tg_salon_sanitize_public_booking");
    expect(salonBookingSecurity).toContain(
      "NEW.price_cents := v_svc.price_cents",
    );
    expect(salonBookingSecurity).toContain("NEW.status := 'pending'");
    expect(salonBookingSecurity).toContain("Public can request bookings");
    expect(salonBookingPage).toContain('"salon-booking-submit"');
    expect(salonBookingPage).not.toMatch(
      /from\("salon_bookings"\)[\s\S]{0,360}\.(insert|upsert)/,
    );
    expect(salonBookingSubmit).toContain('withSecurity("salon-booking-submit"');
    expect(salonBookingSubmit).toContain('allowedMethods: ["POST"]');
    expect(salonBookingSubmit).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(salonBookingGate).toContain(
      "Salon booking public inserts require trusted server-side validation",
    );
    expect(salonBookingGate).toContain(
      "REVOKE INSERT ON TABLE public.salon_bookings FROM anon",
    );
  });

  it("keeps spam, scraping, scanner, and key-leak controls observable", () => {
    const dispatch = read("supabase/functions/notify-dispatch/index.ts");
    const transactional = read(
      "supabase/functions/send-transactional-email/index.ts",
    );
    const unsubscribe = read(
      "supabase/functions/handle-email-unsubscribe/index.ts",
    );
    const botDetection = read("supabase/functions/_shared/botDetection.ts");
    const waf = read("supabase/functions/_shared/waf.ts");
    const threatIntel = read("supabase/functions/_shared/threatIntel.ts");
    const secretScanner = read("scripts/security/check-secrets.mjs");
    const rotationRunbook = read("docs/supabase-secret-rotation-runbook.md");
    const apiReadiness = read("scripts/security/api-readiness-check.mjs");

    expect(dispatch).toContain("marketing_enabled");
    expect(dispatch).toContain("marketing_disabled");
    expect(dispatch).toContain("deliveryAllowed");
    expect(transactional).toContain("suppressed_emails");
    expect(unsubscribe).toContain("List-Unsubscribe=One-Click");

    expect(botDetection).toContain("SCRAPER_UA_PATTERNS");
    expect(botDetection).toContain("SCANNER_UA_PATTERNS");
    expect(botDetection).toContain("missing_ua");
    expect(waf).toContain("SQLI");
    expect(waf).toContain("XSS");
    expect(waf).toContain("TRAVERSAL");
    expect(waf).toContain("CMD_INJECTION");
    expect(waf).toContain("PROTO_POLLUTION");
    expect(threatIntel).toContain("autoBlockIfHighThreat");

    for (const secretGuard of [
      "Supabase service-role JWT",
      "Supabase publishable key",
      "Supabase secret key",
      "Supabase access token",
      "Private key block",
      "OpenAI API key",
    ]) {
      expect(secretScanner).toContain(secretGuard);
    }
    expect(rotationRunbook).toContain("Supabase Secret Rotation Runbook");
    expect(rotationRunbook).toContain("Treat the value as compromised");
    expect(rotationRunbook).toContain("SUPABASE_ACCESS_TOKEN");
    expect(apiReadiness).toContain("frontendSecretPatterns");
    expect(apiReadiness).toContain("frontend-service-role");
  });
});
