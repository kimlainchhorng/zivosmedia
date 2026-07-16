export const AUTO_REPAIR_STORE_ID = "a914b90d-c249-4794-ba5e-3fdac0deed44";

export const AUTO_REPAIR_SOFTWARE_HOSTS = new Set([
  "zivosoftware.com",
  "www.zivosoftware.com",
  ...(import.meta.env.DEV ? ["zivosoftware.localhost"] : []),
]);

export const ZIVO_MEDIA_HOSTS = new Set([
  "zivosmedia.com",
  "www.zivosmedia.com",
  "preview.zivosmedia.com",
]);

export const ZIVO_SOFTWARE_ORIGIN = "https://zivosoftware.com";
export const ZIVO_MEDIA_ORIGIN = "https://zivosmedia.com";
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
export const AUTO_REPAIR_MEDIA_DASHBOARD_URL = `${ZIVO_MEDIA_ORIGIN}${AUTO_REPAIR_DASHBOARD_PATH}`;

export const isAutoRepairSoftwareHost = (hostname?: string | null) =>
  AUTO_REPAIR_SOFTWARE_HOSTS.has((hostname || "").toLowerCase());

export const isZivoSoftwareHost = isAutoRepairSoftwareHost;

export const isZivoMediaHost = (hostname?: string | null) =>
  ZIVO_MEDIA_HOSTS.has((hostname || "").toLowerCase());

export const getZivoSoftwareUrl = (
  pathname = ZIVO_SOFTWARE_HOME_PATH,
  search?: string | null,
  hash?: string | null,
) => {
  const url = new URL(pathname, ZIVO_SOFTWARE_ORIGIN);
  url.search = search || "";
  url.hash = hash || "";
  return url.toString();
};

export const isZivoSoftwareBusinessPath = (pathname?: string | null) => {
  const path = pathname || "";
  return path === "/business" || path.startsWith("/business/");
};

export const isZivoSoftwareRedirectTarget = (target?: string | null) => {
  const value = target || "";
  try {
    const url = new URL(value);
    return isZivoSoftwareHost(url.hostname) && isZivoSoftwareBusinessPath(url.pathname);
  } catch {
    return false;
  }
};

const ZIVO_SOFTWARE_STORE_DASHBOARD_PATH =
  /^\/admin\/stores\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/?$/i;
const ZIVO_SOFTWARE_DESKTOP_PATH =
  /^\/desktop\/auto-repair\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/?$/i;

export const isZivoSoftwareStoreDashboardPath = (pathname?: string | null) =>
  ZIVO_SOFTWARE_STORE_DASHBOARD_PATH.test(pathname || "");

export const isZivoSoftwareWorkspacePath = (pathname?: string | null) => {
  const path = pathname || "";
  return isZivoSoftwareStoreDashboardPath(path) || ZIVO_SOFTWARE_DESKTOP_PATH.test(path);
};

export const getZivoSoftwareSubscriptionPath = (
  storeId: string,
  search?: string | null,
  hash?: string | null,
) => {
  const params = new URLSearchParams(search || "");
  params.set("tab", "subscriptions");
  const query = params.toString();
  return `/admin/stores/${encodeURIComponent(storeId)}${query ? `?${query}` : ""}${hash || ""}`;
};

export const isZivoSoftwareDashboardPath = (pathname?: string | null) => {
  const path = pathname || "";
  return isZivoSoftwareStoreDashboardPath(path);
};
