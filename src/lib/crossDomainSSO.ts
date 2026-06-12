import { authSupabase } from "@/integrations/supabase/client";

// zivosmedia.com and zivostravel.com are different apex domains but are served
// by the same build and authenticate against the same Supabase project
// (slirphzzwcogdbkeicff). Browser storage is per-origin, so a session on one
// domain is invisible to the other. This module bridges that gap with a
// one-time magic-link token hash minted server-side. The hash rides in the URL
// fragment, never as query params, and the receiver consumes it with verifyOtp.

export const SSO_HANDOFF_PATH = "/auth/handoff";
const SSO_HANDOFF_FUNCTION = "mint-sso-handoff";
const ALLOWED_HANDOFF_ORIGINS = new Set([
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
  "https://preview.zivosmedia.com",
  "https://zivostravel.com",
  "https://www.zivostravel.com",
]);

type HandoffMintResponse = {
  token_hash?: string;
};

/** Only allow same-site relative paths, to prevent open-redirect abuse. */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  // Must be a root-relative path. Reject absolute URLs ("https://..."),
  // protocol-relative ("//evil.com"), and anything not starting with "/".
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

function normalizeTargetOrigin(targetOrigin: string): string | null {
  try {
    const url = new URL(targetOrigin);
    const origin = url.origin;
    if (ALLOWED_HANDOFF_ORIGINS.has(origin)) return origin;

    if (import.meta.env.DEV) {
      const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
      if (isLocalhost && (url.protocol === "http:" || url.protocol === "https:")) {
        return origin;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function buildPlainTargetUrl(targetOrigin: string, nextPath: string): string {
  try {
    return new URL(nextPath, targetOrigin).toString();
  } catch {
    return nextPath;
  }
}

/**
 * Build a cross-domain SSO handoff URL to `targetOrigin`. When the user has an
 * active session, the target receives only a single-use OTP hash. Falls back to
 * a plain link when signed out or when the mint function is unavailable.
 */
export async function buildHandoffUrl(targetOrigin: string, nextPath = "/"): Promise<string> {
  const next = sanitizeNextPath(nextPath);
  const target = normalizeTargetOrigin(targetOrigin);
  const plainUrl = target ? buildPlainTargetUrl(target, next) : next;

  if (!target) return plainUrl;

  try {
    const { data } = await authSupabase.auth.getSession();
    if (data.session?.access_token) {
      const { data: handoff, error } = await authSupabase.functions.invoke<HandoffMintResponse>(
        SSO_HANDOFF_FUNCTION,
        { body: { targetOrigin: target } },
      );
      const tokenHash = handoff?.token_hash;
      if (!error && tokenHash) {
        const hash = new URLSearchParams({
          ott: tokenHash,
          next,
        });
        return `${target}${SSO_HANDOFF_PATH}#${hash.toString()}`;
      }
    }
  } catch {
    // Fall through to a plain link if auth or the handoff function is unavailable.
  }
  return plainUrl;
}

/** Navigate the browser to `targetOrigin`, carrying the session when present. */
export async function goCrossDomain(targetOrigin: string, nextPath = "/"): Promise<void> {
  const url = await buildHandoffUrl(targetOrigin, nextPath);
  window.location.href = url;
}
