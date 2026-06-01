import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function expectAll(text: string, needles: readonly string[]) {
  for (const needle of needles) {
    expect(text).toContain(needle);
  }
}

describe("auth session security contracts", () => {
  it("keeps Supabase session restore, refresh, and transient sign-out recovery guarded", () => {
    const auth = source("src/contexts/AuthContext.tsx");

    expectAll(auth, [
      "supabase.auth.getSession()",
      "supabase.auth.onAuthStateChange",
      "initializedRef.current",
      'event === "SIGNED_OUT" && !explicitSignOutRef.current',
      "Received SIGNED_OUT, verifying persisted session before logout",
      "for (let attempt = 0; attempt < 3; attempt += 1)",
      "TOKEN_REFRESHED",
      "checkedAdminForRef",
      "checkAdminRole(session.user.id)",
      "clearSessionArtifacts()",
    ]);
  });

  it("keeps login risk precheck, login audit, driver blocking, and post-login MFA step-up intact", () => {
    const auth = source("src/contexts/AuthContext.tsx");
    const mfa = source("src/lib/security/mfa.ts");
    const mfaDialog = source("src/components/auth/MfaChallengeDialog.tsx");

    expectAll(auth, [
      "auth_precheck_login",
      "auth_record_login_attempt",
      "signInWithPassword",
      "emailExists",
      "is_driver",
      "DRIVER_ACCOUNT",
      "getMfaChallenge",
      "setMfaPending(challenge)",
      'supabase.functions.invoke("log-login"',
    ]);

    expectAll(mfa, [
      "getAuthenticatorAssuranceLevel",
      "listFactors",
      "supabase.auth.mfa.challenge",
      "supabase.auth.mfa.verify",
      "startStepUpChallenge",
      "isAal2",
    ]);

    expectAll(mfaDialog, [
      "Two-factor verification",
      "verifyMfa(code.trim())",
      "onInteractOutside={(e) => e.preventDefault()}",
      "await signOut()",
    ]);
  });

  it("keeps idle timeout, remembered-session max age, and cross-tab sign-out behavior explicit", () => {
    const sessionSecurity = source("src/lib/security/sessionSecurity.ts");

    expectAll(sessionSecurity, [
      "REMEMBER_ME_KEY",
      "SESSION_START_KEY",
      "LAST_ACTIVITY_KEY",
      "IDLE_TIMEOUT_MS = 30 * 60 * 1000",
      "MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000",
      "MAX_SESSION_AGE_REMEMBERED_MS = 30 * 24 * 60 * 60 * 1000",
      "activityEvents",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "setInterval",
      "onExpire()",
      "registerTabSession",
      "broadcastSignOut",
      "ACTIVE_TAB_KEY",
    ]);
  });

  it("keeps sign-out clearing local session state, trusted devices, and signed URL cache", () => {
    const auth = source("src/contexts/AuthContext.tsx");

    expectAll(auth, [
      "explicitSignOutRef.current = true",
      "clearSessionArtifacts()",
      "clearSignedUrlCache()",
      "setMfaPending(null)",
      "getDeviceFingerprint()",
      "remove_trusted_device",
      'supabase.auth.signOut({ scope: "local" })',
      "setUser(null)",
      "setSession(null)",
      "setIsAdmin(false)",
    ]);
  });

  it("keeps active session listing and revocation owner-scoped and server-side", () => {
    const accountSessions = source("src/pages/account/AccountSessionsPage.tsx");
    const listSessions = source("supabase/functions/list-my-sessions/index.ts");
    const revokeSession = source("supabase/functions/revoke-session/index.ts");

    expectAll(accountSessions, [
      'supabase.functions.invoke("list-my-sessions"',
      'supabase.functions.invoke("revoke-session"',
      'sessionId: "all_others"',
      "x-device-fingerprint",
      '.from("trusted_devices")',
      "remove_trusted_device",
      "list_my_recent_logins",
    ]);

    expectAll(listSessions, [
      'withSecurity("list-my-sessions"',
      "strictCors: true",
      'allowedMethods: ["POST"]',
      'rateLimit: "api_general"',
      "auth.getUser()",
      '.from("login_sessions")',
      '.eq("user_id", userId)',
      '.eq("is_active", true)',
      "is_current",
      "x-device-fingerprint",
    ]);

    expectAll(revokeSession, [
      'withSecurity("revoke-session"',
      "strictCors: true",
      'allowedMethods: ["POST"]',
      'rateLimit: "auth_password_reset"',
      "auth.getUser()",
      'sessionId === "all_others"',
      "row.user_id !== userId",
      'terminated_reason: "user_revoked"',
      'terminated_reason: "user_revoked_others"',
      'admin.auth.admin.signOut(userId, "others"',
    ]);
  });

  it("keeps auth session security wired into SSO and platform readiness", () => {
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const ssoContracts = source("scripts/qa/sso-auth-contracts.mjs");
    const workflow = source("src/test/workflows/sso-auth-sessions.test.ts");
    const e2e = source("tests/e2e/sso-session-roles.spec.ts");

    expect(matrix).toContain("src/test/authSessionSecurity.test.ts");
    expect(matrix).toContain("npm run qa:sso-auth-contracts");
    expect(matrix).toContain("npm run test -- src/test/authSessionSecurity.test.ts src/test/workflows/sso-auth-sessions.test.ts");
    expect(matrix).toContain("npx playwright test tests/e2e/sso-session-roles.spec.ts tests/e2e/auth-sso-role-matrix.spec.ts tests/e2e/admin-two-step-required.spec.ts");
    expect(matrix).toContain("Keep OAuth, passwordless OTP, MFA step-up, trusted devices, active sessions, and role-aware route gates green.");
    expect(ssoContracts).toContain("src/test/authSessionSecurity.test.ts");
    expect(workflow).toContain("keeps OAuth, passwordless, MFA, trusted devices, and session revocation wired");
    expect(e2e).toContain("requires session security, MFA challenge, login audit, and revocation coverage");
  });
});
