import {
  createAuthCode,
  createCodeChallenge,
  hashAuthCode,
  isRedirectAllowed,
  isValidAppKey,
  isValidCodeChallenge,
  isValidCodeVerifier,
  isValidRedirectUri,
  normalizeScopes,
  verifyCodeChallenge,
  verifyClientSecret,
} from "./zivosmediaAuth.ts";

Deno.test("createAuthCode returns a one-time code and hash pair", async () => {
  const first = await createAuthCode();
  const second = await createAuthCode();

  if (first.code.length < 40) throw new Error("code is too short");
  if (first.code === second.code) throw new Error("codes should be random");
  if (await hashAuthCode(first.code) !== first.codeHash) throw new Error("hash mismatch");
});

Deno.test("app keys and redirect URIs are constrained", () => {
  if (!isValidAppKey("zivo_travel")) throw new Error("expected app key to pass");
  if (isValidAppKey("../../bad")) throw new Error("expected path-like key to fail");
  if (!isValidRedirectUri("https://zivostravel.com/auth/zivosmedia/callback")) throw new Error("https redirect should pass");
  if (!isValidRedirectUri("http://localhost:5173/auth/zivosmedia/callback")) throw new Error("localhost redirect should pass");
  if (isValidRedirectUri("http://zivostravel.com/auth/zivosmedia/callback")) throw new Error("plain http production redirect should fail");
});

Deno.test("redirect and scope validation are allowlist based", () => {
  const redirect = "https://zivostravel.com/auth/zivosmedia/callback";
  if (!isRedirectAllowed(redirect, [redirect])) throw new Error("redirect should be allowed");
  if (isRedirectAllowed("https://evil.example/callback", [redirect])) throw new Error("redirect should be blocked");

  const scopes = normalizeScopes(["openid", "email", "admin", "email"], ["openid", "profile", "email"]);
  if (scopes.join(",") !== "openid,email") throw new Error(`unexpected scopes: ${scopes.join(",")}`);
});

Deno.test("code challenge and client secret checks are strict", async () => {
  if (!isValidCodeChallenge("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-abc")) {
    throw new Error("valid S256 challenge should pass");
  }
  if (isValidCodeChallenge("short")) throw new Error("short challenge should fail");

  const expectedHash = await hashAuthCode("server-secret");
  if (!await verifyClientSecret("server-secret", expectedHash)) throw new Error("secret should verify");
  if (await verifyClientSecret("wrong-secret", expectedHash)) throw new Error("wrong secret should fail");
});

Deno.test("PKCE verifier creates and verifies S256 challenges", async () => {
  const verifier = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._~-abc";
  if (!isValidCodeVerifier(verifier)) throw new Error("valid verifier should pass");
  if (isValidCodeVerifier("short")) throw new Error("short verifier should fail");

  const challenge = await createCodeChallenge(verifier);
  if (!isValidCodeChallenge(challenge)) throw new Error("generated challenge should be valid");
  if (!await verifyCodeChallenge(verifier, challenge)) throw new Error("verifier should match challenge");
  if (await verifyCodeChallenge(`${verifier}x`, challenge)) throw new Error("wrong verifier should fail");
});
