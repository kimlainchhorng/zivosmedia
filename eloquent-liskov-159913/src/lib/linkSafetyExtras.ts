/**
 * Extra link-safety helpers: tracking-param stripping + blocked-click logging.
 */

const TRACKING_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "fbclid", "gclid", "gbraid", "wbraid", "msclkid", "yclid",
  "mc_cid", "mc_eid", "_hsenc", "_hsmi", "icid", "igshid",
];

/** Remove common tracking parameters from a URL. Safe — returns input on parse failure. */
export function stripTrackingParams(url: string): string {
  try {
    const u = new URL(url);
    let changed = false;
    TRACKING_PARAMS.forEach((p) => {
      if (u.searchParams.has(p)) {
        u.searchParams.delete(p);
        changed = true;
      }
    });
    return changed ? u.toString() : url;
  } catch {
    return url;
  }
}

/** Lightweight client-side log of blocked link attempts (console + optional analytics). */
export function logBlockedLinkAttempt(url: string, reason: string, source: string) {
  try {
    console.warn("[link-safety] blocked", { url: url.slice(0, 120), reason, source });
    // Optional: forward to analytics_events if present in window
    const w = window as any;
    if (w.gtag) w.gtag("event", "blocked_link_click", { url, reason, source });
  } catch {
    // no-op
  }
}
