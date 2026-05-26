/**
 * Lightweight AAL (Authentication Assurance Level) check for edge functions
 * that do their own JWT auth instead of going through `requireUser`/`requireUserMfa`.
 *
 * Decodes the JWT payload locally (no network round-trip) and reads the `aal`
 * custom claim Supabase signs into the token. Returns a 403 Response with
 * `code: "mfa_required"` when the session is at AAL1.
 *
 * Usage:
 *   const mfaErr = enforceAal2(authHeader, corsHeaders);
 *   if (mfaErr) return mfaErr;
 */

/**
 * Returns null if the token is at AAL2/AAL3, or a 403 Response otherwise.
 */
export function enforceAal2(
  authHeader: string | null,
  corsHeaders: Record<string, string>,
): Response | null {
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let aal: string | null = null;
  try {
    const part = token.split(".")[1] ?? "";
    // base64url → base64
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(part.length + ((4 - part.length % 4) % 4), "=");
    const payload = JSON.parse(atob(b64));
    aal = typeof payload?.aal === "string" ? payload.aal : null;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid auth token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (aal !== "aal2" && aal !== "aal3") {
    return new Response(
      JSON.stringify({ error: "Step-up MFA required", code: "mfa_required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return null;
}
