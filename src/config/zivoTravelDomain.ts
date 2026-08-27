import { ZIVO_MEDIA_ORIGIN } from "@/config/autoRepairDomain";

export const ZIVO_TRAVEL_HOSTS = new Set([
  "zivostravel.com",
  "www.zivostravel.com",
]);

export const ZIVO_TRAVEL_ORIGIN = "https://zivostravel.com";
export const ZIVO_TRAVEL_HOME_PATH = "/";
export const ZIVO_TRAVEL_APP_PATH = "/travel";

export const ZIVO_TRAVEL_SUPABASE_URL =
  import.meta.env.VITE_ZIVO_TRAVEL_SUPABASE_URL || "";

export const ZIVO_TRAVEL_SUPABASE_PROJECT_ID = "xbllvmpomorawkcrtbcq";

export const ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY || "";

export const ZIVO_TRAVEL_USE_DEDICATED_BACKEND =
  import.meta.env.VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND === "true";

const ZIVO_TRAVEL_ALLOWED_PREFIXES = [
  "/flights",
  "/airports",
  "/hotels",
  "/hotel",
  "/hotels-list",
  "/cars",
  "/car-rental",
  "/rent-car",
  "/bus",
  "/travel",
  "/zivo-travel",
  "/my-trips",
  "/confirmation",
  "/things-to-do",
  "/activities",
  "/experiences",
  "/travel-insurance",
  "/extras",
  "/guides",
  "/destinations",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-otp",
  "/verify-new-device",
  "/auth",
  "/auth-callback",
  "/connect",
  "/connect-website",
  "/booking",
  "/checkout",
  "/how-to-rent",
  "/support",
  "/account",
  "/payment-methods",
  "/wallet",
  "/legal",
  "/terms-of-service",
  "/privacy-policy",
  "/downloads",
  "/assets",
  "/pwa-icons",
];

const ZIVO_TRAVEL_ALLOWED_FILES = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]);

// Dev/preview override: lets ANY host (e.g. localhost) render the travel surface
// when `?zt=1` (or `?travel=1`) is in the URL. The flag persists for the browser
// session so navigation keeps travel mode; `?zt=0` clears it. Real travel hosts
// always match regardless. Does NOT switch the backend (that stays gated by
// VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND), so auth/data are unaffected.
const hasTravelPreviewFlag = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("zt") === "1" || params.get("travel") === "1") {
      sessionStorage.setItem("zivo_force_travel", "1");
    } else if (params.get("zt") === "0" || params.get("travel") === "0") {
      sessionStorage.removeItem("zivo_force_travel");
    }
    return sessionStorage.getItem("zivo_force_travel") === "1";
  } catch {
    return false;
  }
};

export const isZivoTravelHost = (hostname?: string | null) =>
  ZIVO_TRAVEL_HOSTS.has((hostname || "").toLowerCase()) ||
  hasTravelPreviewFlag();

export const isZivoTravelPath = (pathname?: string | null) => {
  const path = pathname || "";
  return (
    path === "/" ||
    ZIVO_TRAVEL_ALLOWED_FILES.has(path) ||
    ZIVO_TRAVEL_ALLOWED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    )
  );
};

export const getZivoTravelUrl = (
  pathname = ZIVO_TRAVEL_HOME_PATH,
  search?: string | null,
  hash?: string | null,
) => {
  const url = new URL(pathname, ZIVO_TRAVEL_ORIGIN);
  url.search = search || "";
  url.hash = hash || "";
  return url.toString();
};

/**
 * Destination for the explicit parent-app return control.
 *
 * A real Travel host returns through the production Zivosmedia origin. Local
 * and preview hosts reload their own root with `zt=0`, which clears the
 * session-persisted Travel preview before the main app renders.
 */
export const getZivoMediaHomeHref = (hostname?: string | null) => {
  const currentHostname = (
    hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")
  ).toLowerCase();

  return ZIVO_TRAVEL_HOSTS.has(currentHostname)
    ? `${ZIVO_MEDIA_ORIGIN}/`
    : "/?zt=0";
};
