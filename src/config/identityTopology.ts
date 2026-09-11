/** Phase zero: diagnostics only. Never use decoded token claims for authorization. */
export const IDENTITY_PROJECTS = {
  media: "slirphzzwcogdbkeicff", ride: "yiedlgoxwjmansszdypf",
  driver: "yiedlgoxwjmansszdypf", business: "gzyktwcanrrkosieecxs",
} as const;
export function identityDiagnostic(hostname: string, issuer: unknown) {
  const app = hostname === "zivosmedia.com" || hostname === "www.zivosmedia.com" ? "media"
    : hostname === "ride.zivosmedia.com" ? "ride"
    : hostname === "zivodriver.com" ? "driver"
    : hostname === "zivobusiness.com" ? "business" : null;
  if (!app) return null;
  return { app, expectedIssuerMatches: issuer === `https://${IDENTITY_PROJECTS[app]}.supabase.co/auth/v1`, phase: "observe-only" };
}
export function observeIdentitySession(accessToken?: string) {
  if (import.meta.env.VITE_IDENTITY_DIAGNOSTICS_ENABLED !== "true" || !accessToken) return;
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const detail = identityDiagnostic(window.location.hostname, payload.iss);
    if (detail) window.dispatchEvent(new CustomEvent("zivo:identity-diagnostic", { detail }));
  } catch { /* Observation must never affect login. No tokens, claims or identifiers are emitted. */ }
}
