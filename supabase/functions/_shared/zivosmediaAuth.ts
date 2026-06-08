const CODE_BYTES = 32;
const STATE_HASH_PREFIX = "state:";

export type AuthCodeRecord = {
  codeHash: string;
  code: string;
};

export function isValidAppKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_:-]{3,80}$/.test(value);
}

export function isValidRedirectUri(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || isLocalRedirect(url);
  } catch {
    return false;
  }
}

export function isRedirectAllowed(redirectUri: string, allowedRedirects: string[]): boolean {
  return allowedRedirects.includes(redirectUri);
}

export function normalizeScopes(value: unknown, allowedScopes: string[]): string[] {
  const requested = Array.isArray(value)
    ? value.filter((scope): scope is string => typeof scope === "string")
    : ["openid", "profile", "email"];

  const allowed = new Set(allowedScopes);
  const scopes = requested
    .map((scope) => scope.trim())
    .filter((scope) => /^[a-z0-9_.:-]{1,80}$/.test(scope))
    .filter((scope) => allowed.has(scope));

  return [...new Set(scopes.length > 0 ? scopes : ["openid", "profile", "email"])];
}

export function isValidCodeChallenge(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(value);
}

export function isValidCodeVerifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._~-]{43,128}$/.test(value);
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  return sha256Base64Url(verifier);
}

export async function verifyCodeChallenge(verifier: string, expectedChallenge: string | null): Promise<boolean> {
  if (!isValidCodeVerifier(verifier) || !expectedChallenge) return false;
  return timingSafeEqual(await createCodeChallenge(verifier), expectedChallenge);
}

export async function createAuthCode(): Promise<AuthCodeRecord> {
  const bytes = new Uint8Array(CODE_BYTES);
  crypto.getRandomValues(bytes);
  const code = base64Url(bytes);
  return { code, codeHash: await sha256Hex(code) };
}

export async function hashAuthCode(code: string): Promise<string> {
  return sha256Hex(code);
}

export async function hashState(state: unknown): Promise<string | null> {
  if (typeof state !== "string" || !state) return null;
  return `${STATE_HASH_PREFIX}${await sha256Hex(state.slice(0, 2048))}`;
}

export async function hashClientSecret(secret: string): Promise<string> {
  return sha256Hex(secret);
}

export async function verifyClientSecret(secret: string, expectedHash: string | null): Promise<boolean> {
  if (!secret || !expectedHash) return false;
  return timingSafeEqual(await hashClientSecret(secret), expectedHash);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function publicProfileFromUser(user: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const metadata = user.user_metadata ?? {};
  return {
    zivosmedia_user_id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    display_name: stringOrNull(metadata.full_name) ?? stringOrNull(metadata.name) ?? stringOrNull(metadata.display_name),
    avatar_url: stringOrNull(metadata.avatar_url) ?? stringOrNull(metadata.picture),
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isLocalRedirect(url: URL): boolean {
  return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Base64Url(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return base64Url(new Uint8Array(hash));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
