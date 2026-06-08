// zivobusiness.com is served by the shared zivosmedia deployment. "Zivo Business"
// owns the business profile and billing ownership (software subscriptions,
// invoices, team access) — distinct from zivosoftware.com, which is the software
// catalog/landing. Before this config existed the host fell through to the
// generic super-app feed. These helpers gate the business host to its own
// landing and the business/account surfaces it should expose.

export const ZIVO_BUSINESS_HOSTS = new Set([
  "zivobusiness.com",
  "www.zivobusiness.com",
]);

export const ZIVO_BUSINESS_ORIGIN = "https://zivobusiness.com";
export const ZIVO_BUSINESS_HOME_PATH = "/";

const ZIVO_BUSINESS_ALLOWED_PREFIXES = [
  "/",
  "/business",
  "/account",
  "/support",
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
  "/legal",
  "/terms-of-service",
  "/privacy-policy",
  "/assets",
  "/pwa-icons",
];

const ZIVO_BUSINESS_ALLOWED_FILES = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]);

export const isZivoBusinessHost = (hostname?: string | null) =>
  ZIVO_BUSINESS_HOSTS.has((hostname || "").toLowerCase());

export const isZivoBusinessPath = (pathname?: string | null) => {
  const path = pathname || "";
  return (
    path === "/" ||
    ZIVO_BUSINESS_ALLOWED_FILES.has(path) ||
    ZIVO_BUSINESS_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
};
