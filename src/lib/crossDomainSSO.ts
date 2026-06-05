import { supabase } from "@/integrations/supabase/client";

// zivosmedia.com and zivostravel.com are different apex domains but are served
// by the same build and authenticate against the same Supabase project
// (slirphzzwcogdbkeicff). Browser storage is per-origin, so a session on one
// domain is invisible to the other. This module bridges that gap with a
// short-lived token handoff: the source domain hands the current session to the
// target via the URL *hash* (never the query — the hash is not sent to servers
// or written to access logs), and the receiver (/auth/handoff) calls
// supabase.auth.setSession() then wipes the hash.
//
// Hardened follow-up (no refresh_token in the URL): mint a one-time magic-link
// OTP server-side via admin.generateLink and consume it with verifyOtp, mirroring
// the existing /connect/media flow. That needs an edge function deploy; this
// client-only version intentionally does not.

export const SSO_HANDOFF_PATH = "/auth/handoff";

/** Only allow same-site relative paths, to prevent open-redirect abuse. */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  // Must be a root-relative path. Reject absolute URLs ("https://…"),
  // protocol-relative ("//evil.com"), and anything not starting with "/".
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

/**
 * Build a cross-domain SSO handoff URL to `targetOrigin`. When the user has an
 * active session, the access/refresh tokens ride in the URL hash so the target
 * origin can adopt the session. Falls back to a plain link when signed out.
 */
export async function buildHandoffUrl(targetOrigin: string, nextPath = "/"): Promise<string> {
  const next = sanitizeNextPath(nextPath);
  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (session?.access_token && session?.refresh_token) {
      const hash = new URLSearchParams({
        at: session.access_token,
        rt: session.refresh_token,
        next,
      });
      return `${targetOrigin}${SSO_HANDOFF_PATH}#${hash.toString()}`;
    }
  } catch {
    // Fall through to a plain link if the session can't be read.
  }
  return `${targetOrigin}${next}`;
}

/** Navigate the browser to `targetOrigin`, carrying the session when present. */
export async function goCrossDomain(targetOrigin: string, nextPath = "/"): Promise<void> {
  const url = await buildHandoffUrl(targetOrigin, nextPath);
  window.location.href = url;
}
