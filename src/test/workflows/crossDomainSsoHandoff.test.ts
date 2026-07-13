import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("cross-domain SSO handoff hardening", () => {
  it("mints one-time token hashes instead of sending refresh tokens in URLs", () => {
    const client = read("src/lib/crossDomainSSO.ts");
    const receiver = read("src/pages/AuthHandoff.tsx");
    const fn = read("supabase/functions/mint-sso-handoff/index.ts");
    const config = read("supabase/config.toml");

    expect(client).toContain('SSO_HANDOFF_FUNCTION = "mint-sso-handoff"');
    expect(client).toContain("authSupabase.functions.invoke<HandoffMintResponse>");
    expect(client).toContain("ott: tokenHash");
    expect(client).not.toContain("refresh_token");
    expect(client).not.toContain("rt: session");

    expect(receiver).toContain("authSupabase.auth.verifyOtp");
    expect(receiver).toContain('type: "magiclink"');
    expect(receiver).toContain("token_hash: tokenHash");
    expect(receiver).toContain("window.history.replaceState");

    expect(fn).toContain("auth.admin.generateLink");
    expect(fn).toContain("hashed_token");
    expect(fn).toContain("email = userData?.user?.email");
    expect(fn).toContain("withSecurity");
    expect(fn).toContain("strictCors: true");
    expect(fn).toContain('allowedMethods: ["POST"]');
    expect(fn).toContain('rateLimit: "auth_login"');
    expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    expect(fn).not.toContain("'Access-Control-Allow-Origin': '*'");

    expect(config).toContain("[functions.mint-sso-handoff]");
    expect(config).toContain("verify_jwt = true");
  });
});
