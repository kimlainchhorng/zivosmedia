#!/usr/bin/env node
/**
 * SSO, auth, session, and device security contract check.
 *
 * Verifies Supabase session restore, OAuth/passwordless login, MFA step-up,
 * trusted device OTP, active session management, and role-aware route gates.
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
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
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

function requireStrictSecurity(id, route, text, risk = 80) {
  const relativePath = `supabase/functions/${route}/index.ts`;
  requireContains(id, text, `withSecurity("${route}"`, relativePath);
  requireContains(id, text, "strictCors: true", relativePath);
  requireContains(id, text, `blockNetworkRiskAt: ${risk}`, relativePath);
  if (text.includes('"Access-Control-Allow-Origin": "*"')) {
    failures.push(`${id}: ${relativePath} must not use wildcard CORS`);
  }
}

const contracts = [
  {
    id: "supabase-session-lifecycle",
    category: "auth-provider",
    check() {
      const authPath = "src/contexts/AuthContext.tsx";
      const sessionSecurityPath = "src/lib/security/sessionSecurity.ts";
      const authSessionTestPath = "src/test/authSessionSecurity.test.ts";
      const auth = source(authPath);
      const sessionSecurity = source(sessionSecurityPath);
      const authSessionTest = source(authSessionTestPath);

      for (const needle of [
        "supabase.auth.getSession()",
        "supabase.auth.onAuthStateChange",
        'event === "SIGNED_OUT" && !explicitSignOutRef.current',
        'event === "SIGNED_IN"',
        "TOKEN_REFRESHED",
        "const adminResolution = await checkAdminRole(userId)",
        "setupActivityTracking",
        "clearSessionArtifacts",
        'supabase.auth.signOut({ scope: "local" })',
      ]) {
        requireContains(this.id, auth, needle, authPath);
      }
      for (const needle of [
        "IDLE_TIMEOUT_MS = 30 * 60 * 1000",
        "MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000",
        "MAX_SESSION_AGE_REMEMBERED_MS = 30 * 24 * 60 * 60 * 1000",
        "LAST_ACTIVITY_KEY",
        "SESSION_START_KEY",
      ]) {
        requireContains(this.id, sessionSecurity, needle, sessionSecurityPath);
      }
      for (const needle of [
        "auth session security contracts",
        "transient sign-out recovery",
        "cross-tab sign-out behavior",
        "active session listing and revocation",
      ]) {
        requireContains(this.id, authSessionTest, needle, authSessionTestPath);
      }
    },
  },
  {
    id: "oauth-passwordless-login-entrypoints",
    category: "sso",
    check() {
      const appPath = "src/App.tsx";
      const loginPath = "src/pages/Login.tsx";
      const signupPath = "supabase/functions/public-signup/index.ts";
      const login = source(loginPath);
      const app = source(appPath);
      const signup = source(signupPath);

      for (const route of ['path="/login"', 'path="/auth-callback"', 'path="/verify-otp"', 'path="/verify-new-device"']) {
        requireContains(this.id, app, route, appPath);
      }
      for (const needle of [
        "handleOAuthSignIn",
        "signInWithOAuth",
        'provider: "google"',
        'handleOAuthSignIn("google")',
        'handleOAuthSignIn("apple")',
        "redirectTo: getEmailRedirectTo()",
        'queryParams: { prompt: "select_account" }',
        "signInWithOtp",
        "emailRedirectTo: getEmailRedirectTo()",
      ]) {
        requireContains(this.id, login, needle, loginPath);
      }
      requireNotContains(this.id, login, "status === 201", loginPath);

      for (const needle of [
        'withSecurity("public-signup"',
        'rateLimit: "auth_register"',
        "parsePublicSignupBody",
        'purpose: "signup"',
        "email_verification_required",
        "send-otp-email",
      ]) {
        requireContains(this.id, signup, needle, signupPath);
      }
      requireNotContains(this.id, signup, "auth.admin.createUser", signupPath);
      requireNotContains(this.id, signup, "auth.admin.updateUserById", signupPath);
    },
  },
  {
    id: "password-login-risk-and-mfa",
    category: "login-security",
    check() {
      const authPath = "src/contexts/AuthContext.tsx";
      const mfaPath = "src/lib/security/mfa.ts";
      const precheckPath = "supabase/migrations/20260411171431_aaa38013-ea70-461e-acb1-db94e7d4c43d.sql";
      const anomalyPath = "supabase/migrations/20260411183000_auth_shield_anomaly_detection.sql";
      const auth = source(authPath);
      const mfa = source(mfaPath);
      const precheck = source(precheckPath);
      const anomaly = source(anomalyPath);

      for (const needle of [
        "auth_precheck_login",
        "auth_record_login_attempt",
        "signInWithPassword",
        "is_driver",
        "DRIVER_ACCOUNT",
        "getMfaChallenge",
        "verifyMfaChallenge",
        'supabase.functions.invoke("log-login"',
      ]) {
        requireContains(this.id, auth, needle, authPath);
      }
      for (const needle of [
        "getAuthenticatorAssuranceLevel",
        "listFactors",
        "supabase.auth.mfa.challenge",
        "supabase.auth.mfa.verify",
        "startStepUpChallenge",
        "isAal2",
      ]) {
        requireContains(this.id, mfa, needle, mfaPath);
      }
      for (const needle of [
        "CREATE OR REPLACE FUNCTION public.auth_precheck_login",
        "CREATE OR REPLACE FUNCTION public.auth_record_login_attempt",
        "SECURITY DEFINER",
        "SET search_path = public",
      ]) {
        requireContains(this.id, precheck, needle, precheckPath);
      }
      for (const needle of [
        "risk_score",
        "risk_labels",
        "distributed_failed_attempts",
        "rapid_device_change",
        "security_incidents",
      ]) {
        requireContains(this.id, anomaly, needle, anomalyPath);
      }
    },
  },
  {
    id: "otp-and-trusted-device-security",
    category: "otp-devices",
    check() {
      const verifyDevicePath = "src/pages/VerifyNewDevice.tsx";
      const fingerprintPath = "src/lib/security/deviceFingerprint.ts";
      const sendOtpPath = "supabase/functions/send-otp-email/index.ts";
      const verifyOtpPath = "supabase/functions/verify-otp-code/index.ts";
      const trustedMigrationPath = "supabase/migrations/20260415015212_c5a25c0f-eb2c-4e0c-b585-004ff757eca1.sql";
      const verifyDevice = source(verifyDevicePath);
      const fingerprint = source(fingerprintPath);
      const sendOtp = source(sendOtpPath);
      const verifyOtp = source(verifyOtpPath);
      const trustedMigration = source(trustedMigrationPath);

      for (const needle of [
        'supabase.functions.invoke("verify-otp-code"',
        "register_trusted_device",
        "getDeviceFingerprint",
        "getDeviceName",
        "zivo_device_otp_email",
        'purpose: "new_device"',
        "supabase.auth.getUser()",
        'supabase.functions.invoke("send-otp-email"',
      ]) {
        requireContains(this.id, verifyDevice, needle, verifyDevicePath);
      }
      for (const needle of ["navigator.userAgent", "Intl.DateTimeFormat", "screen.width", "navigator.hardwareConcurrency", "fp_"]) {
        requireContains(this.id, fingerprint, needle, fingerprintPath);
      }
      for (const [route, text] of [["send-otp-email", sendOtp], ["verify-otp-code", verifyOtp]]) {
        requireStrictSecurity(this.id, route, text);
        requireContains(this.id, text, 'rateLimit: "auth_otp"', `supabase/functions/${route}/index.ts`);
      }
      for (const needle of [
        "recentCount && recentCount >= 5",
        "OTP_TTL_MS = 10 * 60 * 1000",
        "code_hmac",
        "requireOtpHmacSecret",
        "otp_codes",
      ]) {
        requireContains(this.id, sendOtp, needle, sendOtpPath);
      }
      for (const needle of [
        "attempts >= 5",
        "hmacEmailOtpCode",
        "bindExistingAccount",
        'request.purpose === "signup"',
        "auth.admin.updateUserById",
        "email_confirm: true",
        "auth.admin.generateLink",
      ]) {
        requireContains(this.id, verifyOtp, needle, verifyOtpPath);
      }
      requireNotContains(this.id, verifyOtp, "otpRecord.code ===", verifyOtpPath);
      for (const needle of [
        "CREATE OR REPLACE FUNCTION public.is_device_trusted",
        "CREATE OR REPLACE FUNCTION public.register_trusted_device",
        "CREATE OR REPLACE FUNCTION public.remove_trusted_device",
        "SECURITY DEFINER",
        "SET search_path = public",
      ]) {
        requireContains(this.id, trustedMigration, needle, trustedMigrationPath);
      }
    },
  },
  {
    id: "active-session-revocation",
    category: "sessions",
    check() {
      const accountSessionsPath = "src/pages/account/AccountSessionsPage.tsx";
      const accountSecurityPath = "src/pages/account/AccountSecurity.tsx";
      const listPath = "supabase/functions/list-my-sessions/index.ts";
      const revokePath = "supabase/functions/revoke-session/index.ts";
      const accountSessions = source(accountSessionsPath);
      const accountSecurity = source(accountSecurityPath);
      const list = source(listPath);
      const revoke = source(revokePath);

      for (const needle of [
        'supabase.functions.invoke("list-my-sessions"',
        'supabase.functions.invoke("revoke-session"',
        'sessionId: "all_others"',
        "x-device-fingerprint",
        "trusted_devices",
        "remove_trusted_device",
        "list_my_recent_logins",
      ]) {
        requireContains(this.id, accountSessions, needle, accountSessionsPath);
      }
      requireContains(this.id, accountSecurity, 'navigate("/account/sessions")', accountSecurityPath);
      requireContains(this.id, accountSecurity, "supabase.auth.signOut({ scope: 'global' })", accountSecurityPath);

      for (const [route, text] of [["list-my-sessions", list], ["revoke-session", revoke]]) {
        requireStrictSecurity(this.id, route, text);
        requireContains(this.id, text, "auth.getUser()", `supabase/functions/${route}/index.ts`);
        requireContains(this.id, text, "login_sessions", `supabase/functions/${route}/index.ts`);
        requireContains(this.id, text, "userId", `supabase/functions/${route}/index.ts`);
      }
      for (const needle of [
        "eq(\"user_id\", userId)",
        "eq(\"is_active\", true)",
        "is_current",
        "x-device-fingerprint",
      ]) {
        requireContains(this.id, list, needle, listPath);
      }
      for (const needle of [
        'sessionId === "all_others"',
        "row.user_id !== userId",
        'terminated_reason: "user_revoked"',
        'terminated_reason: "user_revoked_others"',
        'admin.auth.admin.signOut(userId, "others"',
      ]) {
        requireContains(this.id, revoke, needle, revokePath);
      }
    },
  },
  {
    id: "role-aware-protected-routes",
    category: "authorization",
    check() {
      const protectedRoutePath = "src/components/auth/ProtectedRoute.tsx";
      const userAccessPath = "src/hooks/useUserAccess.ts";
      const appPath = "src/App.tsx";
      const roleMatrixPath = "tests/e2e/auth-sso-role-matrix.spec.ts";
      const adminTwoStepPath = "tests/e2e/admin-two-step-required.spec.ts";
      const protectedRoute = source(protectedRoutePath);
      const userAccess = source(userAccessPath);
      const app = source(appPath);
      const roleMatrix = source(roleMatrixPath);
      const adminTwoStep = source(adminTwoStepPath);

      for (const needle of [
        "withRedirectParam",
        "requireAdmin",
        "allowStoreOwner",
        "allowSupport",
        "protected-route-store-owner",
        '.eq("owner_id", user!.id)',
        "AccessDenied",
        "publicStorePath",
      ]) {
        requireContains(this.id, protectedRoute, needle, protectedRoutePath);
      }
      for (const needle of [
        "get_my_user_access",
        "roles.includes",
        "isSupport",
        "isModerator",
        "isOperations",
        "isStoreOwner",
        "isDriver",
      ]) {
        requireContains(this.id, userAccess, needle, userAccessPath);
      }
      for (const route of [
        'path="/personal-dashboard"',
        'path="/shop-dashboard"',
        'path="/eats/driver-deliveries"',
        'path="/driver/payouts"',
        'path="/admin/analytics"',
        'path="/admin/support"',
        'path="/account/security"',
        'path="/account/sessions"',
        'path="/account/linked-devices"',
      ]) {
        requireContains(this.id, app, route, appPath);
      }
      requireNotContains(this.id, app, 'path="/creator-dashboard"', appPath);
      requireNotContains(this.id, app, 'path="/creator-payouts"', appPath);
      for (const role of ["customer", "shop-owner", "staff", "driver", "admin"]) {
        requireContains(this.id, roleMatrix, `role: "${role}"`, roleMatrixPath);
      }
      requireContains(this.id, roleMatrix, "SSO callback, saved-session restore, and role redirect logic", roleMatrixPath);
      for (const needle of [
        "admin two-step required contract",
        "enforceAal2(authHeader, corsHeaders)",
        "onInteractOutside={(e) => e.preventDefault()}",
        "useStepUpMfa",
      ]) {
        requireContains(this.id, adminTwoStep, needle, adminTwoStepPath);
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
