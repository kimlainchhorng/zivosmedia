import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

function expectAll(text: string, needles: readonly string[]) {
  for (const needle of needles) {
    expect(text).toContain(needle);
  }
}

test.describe("account takeover protection contract", () => {
  test("keeps login, OTP, new-device, and recovery routes wired into the app shell", () => {
    const app = source("src/App.tsx");
    const login = source("src/pages/Login.tsx");
    const authContext = source("src/contexts/AuthContext.tsx");
    const verifyNewDevice = source("src/pages/VerifyNewDevice.tsx");
    const forgotPassword = source("src/pages/ForgotPassword.tsx");

    for (const route of [
      'path="/login"',
      'path="/forgot-password"',
      'path="/reset-password"',
      'path="/verify-new-device"',
      'path="/account/security"',
      'path="/account/sessions"',
    ]) {
      expect(app).toContain(route);
    }

    expect(login).toContain("refreshSession({");
    expect(login).toContain("Forgot password?");
    expect(login).toContain("supabase.auth.signInWithOtp");
    expectAll(authContext, [
      "signInWithPassword",
      "getMfaChallenge",
      "setMfaPending(challenge)",
      'supabase.functions.invoke("log-login"',
      'supabase.auth.signOut({ scope: "local" })',
      "remove_trusted_device",
    ]);
    expect(authContext).not.toContain('rpc("auth_precheck_login"');
    expect(authContext).not.toContain('rpc("auth_record_login_attempt"');
    expect(login).toContain("Email or password is incorrect.");
    expect(login).not.toContain("No account found for this email.");

    expect(verifyNewDevice).toContain('supabase.functions.invoke("verify-otp-code"');
    expect(verifyNewDevice).toContain('supabase.functions.invoke("send-otp-email"');
    expect(verifyNewDevice).toContain("register_trusted_device");
    expect(verifyNewDevice).toContain("sessionStorage.removeItem(\"zivo_device_otp_email\")");
    expect(verifyNewDevice).toContain("Verification code digit ");

    expect(forgotPassword).toContain("/reset-password");
    expect(forgotPassword).toContain("resetPasswordForEmail");
    expect(forgotPassword).toContain('checkRateLimit("auth:forgot_password")');
  });

  test("keeps OTP and login edge functions rate-limited, risk-scored, and strict-CORS only", () => {
    const routes = [
      ["send-otp-email", 'rateLimit: "auth_otp"', "blockNetworkRiskAt: 80"],
      ["send-otp-sms", 'rateLimit: "auth_otp"', "blockNetworkRiskAt: 90"],
      ["verify-otp-code", 'rateLimit: "auth_otp"', "blockNetworkRiskAt: 80"],
      ["log-login", 'rateLimit: "auth_login"', "blockNetworkRiskAt: 80"],
    ] as const;

    for (const [route, rateLimit, risk] of routes) {
      const text = source(`supabase/functions/${route}/index.ts`);
      expect(text).toContain(`withSecurity("${route}"`);
      expect(text).toContain("strictCors: true");
      expect(text).toContain(rateLimit);
      expect(text).toContain('trackNetwork: "suspicious"');
      expect(text).toContain(risk);
      expect(text).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    const verifyOtp = source("supabase/functions/verify-otp-code/index.ts");
    expect(verifyOtp).toContain("Too many verification attempts");
    expect(verifyOtp).toContain("otpRecord.attempts >= 5");
    expect(verifyOtp).toContain("remainingAttempts");

    const sendOtp = source("supabase/functions/send-otp-email/index.ts");
    expect(sendOtp).toContain("recentCount && recentCount >= 5");
    expect(sendOtp).toContain("Too many verification requests");
    expect(sendOtp).toContain("The code expires in 10 minutes");
    expect(sendOtp).toContain("Expires at <strong");
  });

  test("keeps session revocation, trusted-device cleanup, and security center controls visible", () => {
    const accountSecurity = source("src/pages/account/AccountSecurity.tsx");
    const accountSessions = source("src/pages/account/AccountSessionsPage.tsx");
    const mfaDialog = source("src/components/auth/MfaChallengeDialog.tsx");
    const sessionSecurity = source("src/lib/security/sessionSecurity.ts");
    const listSessions = source("supabase/functions/list-my-sessions/index.ts");
    const revokeSession = source("supabase/functions/revoke-session/index.ts");

    expect(accountSecurity).toContain("TwoFactorSetupDialog");
    expect(accountSecurity).toContain("LoginHistorySection");
    expect(accountSecurity).toContain("login_alerts_enabled");
    expect(accountSecurity).toContain("email_otp_backup_enabled");
    expect(accountSecurity).toContain('navigate("/account/sessions")');

    expect(accountSessions).toContain('supabase.functions.invoke("list-my-sessions"');
    expect(accountSessions).toContain('supabase.functions.invoke("revoke-session"');
    expect(accountSessions).toContain('sessionId: "all_others"');
    expect(accountSessions).toContain('.from("trusted_devices")');
    expect(accountSessions).toContain("remove_trusted_device");

    expect(mfaDialog).toContain("Two-factor verification");
    expect(mfaDialog).toContain("onInteractOutside={(e) => e.preventDefault()}");
    expect(mfaDialog).toContain("await signOut()");

    expect(sessionSecurity).toContain("IDLE_TIMEOUT_MS");
    expect(sessionSecurity).toContain("MAX_SESSION_AGE_MS");
    expect(sessionSecurity).toContain("MAX_SESSION_AGE_REMEMBERED_MS");
    expect(sessionSecurity).toContain("broadcastSignOut");

    for (const text of [listSessions, revokeSession]) {
      expect(text).toContain("withSecurity(");
      expect(text).toContain("strictCors: true");
      expect(text).toContain('trackNetwork: "suspicious"');
      expect(text).toContain("blockNetworkRiskAt: 80");
    }
    expect(listSessions).toContain(".from(\"login_sessions\")");
    expect(revokeSession).toContain("sessionId === \"all_others\"");
    expect(revokeSession).toContain("terminated_at");
  });

  test("keeps lockout, new-device alerts, and country-change alerts backed by database workflows", () => {
    const lockout = source("supabase/migrations/20260411170000_auth_shield_lockout.sql");
    const loginBoundary = source("supabase/migrations/20260831000449_harden_auth_login_attempt_boundary.sql");
    const newDevice = source("supabase/migrations/20260501150000_new_device_login_alert.sql");
    const country = source("supabase/migrations/20260501180000_login_country_tracking.sql");
    const trustedDevices = source("supabase/migrations/20260415015212_c5a25c0f-eb2c-4e0c-b585-004ff757eca1.sql");
    const notifications = source("supabase/functions/process-security-notifications/index.ts");
    const registry = source("supabase/functions/_shared/transactional-email-templates/registry.ts");

    expect(lockout).toContain("CREATE OR REPLACE FUNCTION public.auth_precheck_login");
    expect(lockout).toContain("CREATE OR REPLACE FUNCTION public.auth_record_login_attempt");
    expect(lockout.toLowerCase()).toContain("create table if not exists public.auth_login_protection");
    expect(lockout).toContain("failed_streak");
    expect(lockout).toContain("blocked_until");
    expect(loginBoundary).toContain(
      "REVOKE EXECUTE ON FUNCTION public.auth_precheck_login(TEXT, TEXT)",
    );
    expect(loginBoundary).toContain(
      "REVOKE EXECUTE ON FUNCTION public.auth_record_login_attempt(TEXT, BOOLEAN, TEXT)",
    );
    expect(loginBoundary).toContain("FROM PUBLIC, anon, authenticated");

    expect(newDevice).toContain("CREATE TRIGGER auth_login_events_new_device");
    expect(newDevice).toContain("new_device_login");
    expect(newDevice).toContain("device_fingerprint");
    expect(country).toContain("country_change_login");

    expect(trustedDevices).toContain("CREATE OR REPLACE FUNCTION public.register_trusted_device");
    expect(trustedDevices).toContain("CREATE OR REPLACE FUNCTION public.remove_trusted_device");

    expect(notifications).toContain("new-device-login");
    expect(notifications).toContain("country-change-login");
    expect(notifications).toContain("dequeue_security_notifications");
    expect(notifications).toContain("idempotencyKey: row.id");
    expect(registry).toContain("'new-device-login'");
    expect(registry).toContain("'country-change-login'");
  });

  test("keeps this account-takeover E2E contract wired into security readiness", () => {
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const securityContracts = source("scripts/qa/security-anti-abuse-contracts.mjs");
    const workflow = source("src/test/workflows/security-anti-abuse.test.ts");

    expect(matrix).toContain("tests/e2e/account-takeover-protection.spec.ts");
    expect(matrix).toContain("src/test/securityAttackDrills.test.ts");
    expect(matrix).toContain("src/test/rateLimitRiskDecisions.test.ts");
    expect(matrix).toContain("src/test/workflows/security-anti-abuse.test.ts");
    expect(matrix).toContain("npm run security:api-readiness:report");
    expect(securityContracts).toContain("tests/e2e/account-takeover-protection.spec.ts");
    expect(workflow).toContain("Account takeover / OTP stuffing");
  });
});
