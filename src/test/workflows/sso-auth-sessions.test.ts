import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("SSO, auth, sessions, and devices workflow", () => {
  it("wires the SSO/auth contract gate into platform audit", () => {
    const contract = read("scripts/qa/sso-auth-contracts.mjs");
    const workflowCoverage = read("scripts/qa/workflow-coverage.mjs");
    const packageJson = read("package.json");

    for (const contractId of [
      "supabase-session-lifecycle",
      "oauth-passwordless-login-entrypoints",
      "password-login-risk-and-mfa",
      "otp-and-trusted-device-security",
      "active-session-revocation",
      "role-aware-protected-routes",
    ]) {
      expect(contract).toContain(contractId);
    }

    expect(workflowCoverage).toContain("qa:sso-auth-contracts");
    expect(packageJson).toContain('"qa:sso-auth-contracts": "node scripts/qa/sso-auth-contracts.mjs"');
    expect(packageJson).toContain("npm run qa:sso-auth-contracts");
  });

  it("keeps OAuth, passwordless, MFA, trusted devices, and session revocation wired", () => {
    const login = read("src/pages/Login.tsx");
    const auth = read("src/contexts/AuthContext.tsx");
    const verifyDevice = read("src/pages/VerifyNewDevice.tsx");
    const accountSessions = read("src/pages/account/AccountSessionsPage.tsx");
    const protectedRoute = read("src/components/auth/ProtectedRoute.tsx");

    expect(login).toContain("signInWithOAuth");
    expect(login).toContain("signInWithOtp");
    expect(login).toContain("redirectTo: getEmailRedirectTo()");
    expect(auth).toContain("supabase.auth.getSession()");
    expect(auth).toContain("supabase.auth.onAuthStateChange");
    expect(auth).toContain("auth_precheck_login");
    expect(auth).toContain("auth_record_login_attempt");
    expect(auth).toContain("getMfaChallenge");
    expect(auth).toContain("verifyMfaChallenge");
    expect(verifyDevice).toContain("register_trusted_device");
    expect(verifyDevice).toContain('supabase.functions.invoke("verify-otp-code"');
    expect(accountSessions).toContain('supabase.functions.invoke("list-my-sessions"');
    expect(accountSessions).toContain('supabase.functions.invoke("revoke-session"');
    expect(accountSessions).toContain('sessionId: "all_others"');
    expect(protectedRoute).toContain("allowStoreOwner");
    expect(protectedRoute).toContain("allowSupport");
  });

  it("keeps auth Edge Functions on strict security wrappers", () => {
    for (const route of [
      "public-signup",
      "send-otp-email",
      "verify-otp-code",
      "log-login",
      "list-my-sessions",
      "revoke-session",
    ]) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain(`withSecurity("${route}"`);
      expect(source).toContain("strictCors: true");
      expect(source).toContain("blockNetworkRiskAt: 80");
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });
});
