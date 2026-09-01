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
    expect(packageJson).toContain(
      '"qa:sso-auth-contracts": "node scripts/qa/sso-auth-contracts.mjs"',
    );
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
    expect(auth).toContain("signInWithPassword");
    expect(auth).not.toContain('rpc("auth_precheck_login"');
    expect(auth).not.toContain('rpc("auth_record_login_attempt"');
    expect(auth).toContain("getMfaChallenge");
    expect(auth).toContain("verifyMfaChallenge");
    expect(verifyDevice).toContain("register_trusted_device");
    expect(verifyDevice).toContain(
      'supabase.functions.invoke("verify-otp-code"',
    );
    expect(accountSessions).toContain(
      'supabase.functions.invoke("list-my-sessions"',
    );
    expect(accountSessions).toContain(
      'supabase.functions.invoke("revoke-session"',
    );
    expect(accountSessions).toContain('sessionId: "all_others"');
    expect(protectedRoute).toContain("allowStoreOwner");
    expect(protectedRoute).toContain("allowSupport");
  });

  it("keeps auth Edge Functions on strict security wrappers", () => {
    for (const route of [
      "public-signup",
      "send-otp-email",
      "verify-otp-code",
      "mint-sso-handoff",
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

  it("hardens cross-domain SSO with one-time token hashes instead of refresh-token URLs", () => {
    const crossDomain = read("src/lib/crossDomainSSO.ts");
    const receiver = read("src/pages/AuthHandoff.tsx");
    const issuer = read("supabase/functions/mint-sso-handoff/index.ts");
    const config = read("supabase/config.toml");

    expect(crossDomain).toContain(
      'const SSO_HANDOFF_FUNCTION = "mint-sso-handoff"',
    );
    expect(crossDomain).toContain(
      "authSupabase.functions.invoke<HandoffMintResponse>",
    );
    expect(crossDomain).toContain("body: { targetOrigin: target }");
    expect(crossDomain).toContain("ott: tokenHash");
    expect(crossDomain).not.toContain("rt: session.refresh_token");
    expect(crossDomain).not.toContain("refreshToken");

    expect(receiver).toContain('params.get("ott")');
    expect(receiver).toContain("authSupabase.auth.verifyOtp");
    expect(receiver).toContain('type: "magiclink"');
    expect(receiver).toContain("token_hash: tokenHash");
    expect(receiver).toContain("Legacy #at/#rt handoffs are accepted only");

    expect(issuer).toContain('withSecurity("mint-sso-handoff"');
    expect(issuer).toContain("requireUser(req)");
    expect(issuer).toContain("requireUserNotBlocked(auth.userId)");
    expect(issuer).toContain("ALLOWED_TARGET_ORIGINS");
    expect(issuer).toContain("admin.auth.admin.getUserById(auth.userId)");
    expect(issuer).toContain("auth.admin.generateLink");
    expect(issuer).toContain('type: "magiclink"');
    expect(issuer).toContain("hashed_token");
    expect(issuer).toContain('allowedMethods: ["POST"]');
    expect(issuer).toContain('rateLimit: "auth_login"');

    expect(config).toContain("[functions.mint-sso-handoff]");
    expect(config).toContain("verify_jwt = true");
  });

  it("keeps Ride code issuance compatible only with the known missing blocklist RPC", () => {
    const issuer = read(
      "supabase/functions/zivosmedia-auth-issue-code/index.ts",
    );

    expect(issuer).toContain('const MISSING_USER_BLOCKLIST_RPC = "PGRST202"');
    expect(issuer).toContain('const MISSING_USER_BLOCKLIST_TABLE = "PGRST205"');
    expect(issuer).toMatch(/service\.rpc\(\s*"is_user_blocked"/);
    expect(issuer).toContain(
      "blocklistError.code !== MISSING_USER_BLOCKLIST_RPC",
    );
    expect(issuer).toContain(
      'throw new Error("User suspension check unavailable")',
    );
    expect(issuer).toContain("service.auth.admin.getUserById(userId)");
    expect(issuer).toContain('.from("user_blocklist")');
    expect(issuer).toContain(
      "blocklistTableError.code !== MISSING_USER_BLOCKLIST_TABLE",
    );
    expect(issuer).toContain(
      'ctx.log.warn("user_blocklist_schema_compatibility"',
    );
    expect(issuer).toContain("userData.user.banned_until");
    expect(issuer).toContain('new HttpError(403, "Account suspended"');
    expect(issuer).toContain('code: "invalid_session"');
    expect(issuer).not.toContain("requireUserNotBlocked(auth.userId)");
  });
});
