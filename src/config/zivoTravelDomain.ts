export const ZIVO_TRAVEL_HOSTS = new Set([
  "zivostravel.com",
  "www.zivostravel.com",
]);

export const ZIVO_TRAVEL_ORIGIN = "https://zivostravel.com";
export const ZIVO_TRAVEL_HOME_PATH = "/";
export const ZIVO_TRAVEL_APP_PATH = "/travel";

export const ZIVO_TRAVEL_SUPABASE_URL =
  import.meta.env.VITE_ZIVO_TRAVEL_SUPABASE_URL || "https://xbllvmpomorawkcrtbcq.supabase.co";

export const ZIVO_TRAVEL_SUPABASE_PROJECT_ID = "xbllvmpomorawkcrtbcq";

export const ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_3idiRHli7BTv1HI_AtiyBw_cOBl9Xti";

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

export const isZivoTravelHost = (hostname?: string | null) =>
  ZIVO_TRAVEL_HOSTS.has((hostname || "").toLowerCase());

export const isZivoTravelPath = (pathname?: string | null) => {
  const path = pathname || "";
  return (
    path === "/" ||
    ZIVO_TRAVEL_ALLOWED_FILES.has(path) ||
    ZIVO_TRAVEL_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
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
