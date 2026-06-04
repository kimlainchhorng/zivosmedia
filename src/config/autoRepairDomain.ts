export const AUTO_REPAIR_STORE_ID = "a914b90d-c249-4794-ba5e-3fdac0deed44";

export const AUTO_REPAIR_SOFTWARE_HOSTS = new Set([
  "zivosoftware.com",
  "www.zivosoftware.com",
]);

export const AUTO_REPAIR_SOFTWARE_PATH = `/desktop/auto-repair/${AUTO_REPAIR_STORE_ID}`;

export const AUTO_REPAIR_DASHBOARD_PATH =
  `/admin/stores/${AUTO_REPAIR_STORE_ID}?tab=ar-dashboard&category=auto-repair`;

export const isAutoRepairSoftwareHost = (hostname?: string | null) =>
  AUTO_REPAIR_SOFTWARE_HOSTS.has((hostname || "").toLowerCase());
