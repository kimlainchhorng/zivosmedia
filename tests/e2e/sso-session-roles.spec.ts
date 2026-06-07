import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test.describe("SSO, sessions, and role routing contract", () => {
  test("covers password, magic-link, saved sessions, and auth callback entry points", () => {
    const login = source("src/pages/Login.tsx");
    const callback = source("src/pages/AuthCallback.tsx");
    const sw = source("src/sw.js");
    const app = source("src/App.tsx");

    expect(login).toContain("signIn(trimmedEmail, password)");
    expect(login).toContain("supabase.auth.signInWithOtp");
    expect(login).toContain("refreshSession({");
    expect(login).toContain("redirectTo: getEmailRedirectTo()");
    expect(login).toContain("Forgot password?");

    expect(callback).toContain("exchangeCodeForSession(code)");
    expect(callback).toContain("user.app_metadata?.provider");
    expect(callback).toContain("isOAuthUser");
    expect(callback).toContain("saveAccount");
    expect(callback).toContain('navigate(isAdminUser ? "/admin/analytics" : redirectTo');

    expect(sw).toContain("Skip OAuth callback routes");
    expect(sw).toContain("url.pathname.startsWith('/~oauth')");
    expect(app).toContain('"/auth-callback"');
  });

  test("keeps protected routes, role dashboards, and support/store-owner exceptions explicit", () => {
    const app = source("src/App.tsx");
    const guard = source("src/components/auth/ProtectedRoute.tsx");

    for (const route of [
      'path="/app"',
      'path="/shop-dashboard"',
      'path="/creator-dashboard"',
      'path="/eats/driver-deliveries"',
      'path="/account/sessions"',
      'path="/admin/analytics"',
      'path="/admin/stores/:storeId"',
      'path="/admin/support"',
    ]) {
      expect(app).toContain(route);
    }

    expect(guard).toContain("withRedirectParam(\"/login\", redirectTarget)");
    expect(guard).toContain("requireAdmin && !isAdmin");
    expect(guard).toContain("allowStoreOwner");
    expect(guard).toContain("allowSupport");
    expect(guard).toContain("useUserAccess(user?.id)");
    expect(guard).toContain('.eq("owner_id", user!.id)');
    expect(guard).toContain("<AccessDenied");
  });

  test("requires session security, MFA challenge, login audit, and revocation coverage", () => {
    const auth = source("src/contexts/AuthContext.tsx");
    const mfaDialog = source("src/components/auth/MfaChallengeDialog.tsx");
    const sessions = source("src/pages/account/AccountSessionsPage.tsx");
    const sessionSecurity = source("src/lib/security/sessionSecurity.ts");
    const listSessions = source("supabase/functions/list-my-sessions/index.ts");
    const revokeSession = source("supabase/functions/revoke-session/index.ts");
    const lockout = source("supabase/migrations/20260411170000_auth_shield_lockout.sql");

    expect(auth).toContain("auth_precheck_login");
    expect(auth).toContain("auth_record_login_attempt");
    expect(auth).toContain("getMfaChallenge");
    expect(auth).toContain("setMfaPending(challenge)");
    expect(auth).toContain('supabase.functions.invoke("log-login"');
    expect(auth).toContain('supabase.auth.signOut({ scope: "local" })');
    expect(auth).toContain("remove_trusted_device");

    expect(mfaDialog).toContain("Two-factor verification");
    expect(mfaDialog).toContain("onInteractOutside={(e) => e.preventDefault()}");
    expect(mfaDialog).toContain("await signOut()");

    expect(sessionSecurity).toContain("IDLE_TIMEOUT_MS");
    expect(sessionSecurity).toContain("MAX_SESSION_AGE_MS");
    expect(sessionSecurity).toContain("MAX_SESSION_AGE_REMEMBERED_MS");
    expect(sessionSecurity).toContain("broadcastSignOut");

    expect(sessions).toContain('supabase.functions.invoke("list-my-sessions"');
    expect(sessions).toContain('supabase.functions.invoke("revoke-session"');
    expect(sessions).toContain('sessionId: "all_others"');
    expect(sessions).toContain('.from("trusted_devices")');
    expect(sessions).toContain("remove_trusted_device");

    expect(listSessions).toContain("withSecurity(\"list-my-sessions\"");
    expect(listSessions).toContain(".from(\"login_sessions\")");
    expect(revokeSession).toContain("withSecurity(\"revoke-session\"");
    expect(revokeSession).toContain("sessionId === \"all_others\"");
    expect(revokeSession).toContain("terminated_at");
    expect(lockout).toContain("CREATE OR REPLACE FUNCTION public.auth_precheck_login");
    expect(lockout).toContain("CREATE OR REPLACE FUNCTION public.auth_record_login_attempt");
  });
});
