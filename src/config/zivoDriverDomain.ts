export const ZIVO_DRIVER_HOSTS = new Set([
  "zivodriver.com",
  "www.zivodriver.com",
]);

export const ZIVO_DRIVER_ORIGIN = "https://zivodriver.com";
export const ZIVO_DRIVER_HOME_PATH = "/";
export const ZIVO_DRIVER_APP_PATH = "/driver";

export const ZIVO_DRIVER_SUPABASE_URL =
  import.meta.env.VITE_ZIVO_DRIVER_SUPABASE_URL || "https://yiedlgoxwjmansszdypf.supabase.co";

export const ZIVO_DRIVER_SUPABASE_PROJECT_ID = "yiedlgoxwjmansszdypf";

export const ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY || "";

const ZIVO_DRIVER_ALLOWED_PREFIXES = [
  "/",
  "/driver",
  "/drivers",
  "/driver-onboarding",
  "/driver-signup",
  "/driver-login",
  "/ride",
  "/rides",
  "/trips",
  "/earnings",
  "/wallet",
  "/support",
  "/account",
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
  "/downloads",
  "/legal",
  "/terms-of-service",
  "/privacy-policy",
  "/assets",
  "/pwa-icons",
];

const ZIVO_DRIVER_ALLOWED_FILES = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]);

const hasDriverPreviewFlag = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("zd") === "1" || params.get("driver") === "1") {
      sessionStorage.setItem("zivo_force_driver", "1");
    } else if (params.get("zd") === "0" || params.get("driver") === "0") {
      sessionStorage.removeItem("zivo_force_driver");
    }
    return sessionStorage.getItem("zivo_force_driver") === "1";
  } catch {
    return false;
  }
};

export const isZivoDriverHost = (hostname?: string | null) =>
  ZIVO_DRIVER_HOSTS.has((hostname || "").toLowerCase()) || hasDriverPreviewFlag();

export const isZivoDriverPath = (pathname?: string | null) => {
  const path = pathname || "";
  return (
    path === "/" ||
    ZIVO_DRIVER_ALLOWED_FILES.has(path) ||
    ZIVO_DRIVER_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
};

export const getZivoDriverUrl = (
  pathname = ZIVO_DRIVER_HOME_PATH,
  search?: string | null,
  hash?: string | null,
) => {
  const url = new URL(pathname, ZIVO_DRIVER_ORIGIN);
  url.search = search || "";
  url.hash = hash || "";
  return url.toString();
};
