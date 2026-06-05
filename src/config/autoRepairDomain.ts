export const AUTO_REPAIR_STORE_ID = "a914b90d-c249-4794-ba5e-3fdac0deed44";

export const AUTO_REPAIR_SOFTWARE_HOSTS = new Set([
  "zivosoftware.com",
  "www.zivosoftware.com",
]);

export const ZIVO_SOFTWARE_HOME_PATH = "/business";
export const ZIVO_SOFTWARE_AUTH_REDIRECT_PATH = "/business/new";

export const ZIVO_SOFTWARE_SUPABASE_URL =
  import.meta.env.VITE_ZIVO_SOFTWARE_SUPABASE_URL || "https://ydxztoresbdeoeijhxww.supabase.co";

export const ZIVO_SOFTWARE_SUPABASE_PROJECT_ID = "ydxztoresbdeoeijhxww";

export const ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY || "";

export const AUTO_REPAIR_SOFTWARE_PATH = `/desktop/auto-repair/${AUTO_REPAIR_STORE_ID}`;

export const AUTO_REPAIR_DASHBOARD_PATH =
  `/admin/stores/${AUTO_REPAIR_STORE_ID}?tab=ar-dashboard&category=auto-repair`;

export const isAutoRepairSoftwareHost = (hostname?: string | null) =>
  AUTO_REPAIR_SOFTWARE_HOSTS.has((hostname || "").toLowerCase());

export const isZivoSoftwareHost = isAutoRepairSoftwareHost;

export const isZivoSoftwareBusinessPath = (pathname?: string | null) => {
  const path = pathname || "";
  return path === "/business" || path.startsWith("/business/");
};

export const isZivoSoftwareRedirectTarget = (target?: string | null) => {
  const value = target || "";
  if (isZivoSoftwareBusinessPath(value)) return true;

  try {
    const url = new URL(value);
    return isZivoSoftwareHost(url.hostname) || isZivoSoftwareBusinessPath(url.pathname);
  } catch {
    return false;
  }
};

export const isZivoSoftwareDashboardPath = (pathname?: string | null) => {
  const path = pathname || "";
  return (
    path === "/admin/stores" ||
    path.startsWith("/admin/stores/") ||
    path === "/business/dashboard" ||
    path === "/bus/operator" ||
    path === "/eats/restaurant-dashboard" ||
    path === "/hotel-admin"
  );
};
