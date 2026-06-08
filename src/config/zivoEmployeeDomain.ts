// zivoemployee.com is served by the shared zivosmedia deployment. "Zivo Employee"
// is the staff-facing side of a business (schedules, time clock, payroll info,
// onboarding/training). Its dedicated backend and repo ownership are still
// undecided (see docs/OPEN_QUESTIONS.md), so the landing is informational and
// routes only to shared identity/account/support surfaces — no product backend
// is wired here yet. Before this config existed the host fell through to the
// generic super-app feed.

export const ZIVO_EMPLOYEE_HOSTS = new Set([
  "zivoemployee.com",
  "www.zivoemployee.com",
]);

export const ZIVO_EMPLOYEE_ORIGIN = "https://zivoemployee.com";
export const ZIVO_EMPLOYEE_HOME_PATH = "/";

const ZIVO_EMPLOYEE_ALLOWED_PREFIXES = [
  "/",
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

const ZIVO_EMPLOYEE_ALLOWED_FILES = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]);

export const isZivoEmployeeHost = (hostname?: string | null) =>
  ZIVO_EMPLOYEE_HOSTS.has((hostname || "").toLowerCase());

export const isZivoEmployeePath = (pathname?: string | null) => {
  const path = pathname || "";
  return (
    path === "/" ||
    ZIVO_EMPLOYEE_ALLOWED_FILES.has(path) ||
    ZIVO_EMPLOYEE_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
};
