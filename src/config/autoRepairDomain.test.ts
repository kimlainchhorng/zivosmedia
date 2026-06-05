import { describe, expect, it } from "vitest";
import {
  AUTO_REPAIR_DASHBOARD_PATH,
  AUTO_REPAIR_SOFTWARE_PATH,
  AUTO_REPAIR_STORE_ID,
  ZIVO_SOFTWARE_AUTH_REDIRECT_PATH,
  ZIVO_SOFTWARE_SUPABASE_PROJECT_ID,
  ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY,
  ZIVO_SOFTWARE_SUPABASE_URL,
  ZIVO_SOFTWARE_HOME_PATH,
  isAutoRepairSoftwareHost,
  isZivoSoftwareDashboardPath,
  isZivoSoftwareHost,
} from "./autoRepairDomain";

describe("auto repair software domain config", () => {
  it("points the software domain to the dedicated auto repair store dashboard", () => {
    expect(AUTO_REPAIR_STORE_ID).toBe("a914b90d-c249-4794-ba5e-3fdac0deed44");
    expect(AUTO_REPAIR_SOFTWARE_PATH).toBe(
      "/desktop/auto-repair/a914b90d-c249-4794-ba5e-3fdac0deed44",
    );
    expect(AUTO_REPAIR_DASHBOARD_PATH).toBe(
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
    );
  });

  it("recognizes apex and www zivosoftware hosts only", () => {
    expect(isAutoRepairSoftwareHost("zivosoftware.com")).toBe(true);
    expect(isAutoRepairSoftwareHost("www.zivosoftware.com")).toBe(true);
    expect(isAutoRepairSoftwareHost("ZIVOSOFTWARE.COM")).toBe(true);
    expect(isAutoRepairSoftwareHost("zivosmedia.com")).toBe(false);
    expect(isAutoRepairSoftwareHost("www.zivosmedia.com")).toBe(false);
    expect(isAutoRepairSoftwareHost("ZIVOSMEDIA.COM")).toBe(false);
    expect(isAutoRepairSoftwareHost("preview.zivosmedia.com")).toBe(false);
  });

  it("uses zivosoftware.com as the business software home", () => {
    expect(ZIVO_SOFTWARE_HOME_PATH).toBe("/business");
    expect(ZIVO_SOFTWARE_AUTH_REDIRECT_PATH).toBe("/business/new");
    expect(isZivoSoftwareHost("zivosoftware.com")).toBe(true);
    expect(isZivoSoftwareHost("zivosmedia.com")).toBe(false);
  });

  it("points the software domain at the dedicated software Supabase project", () => {
    expect(ZIVO_SOFTWARE_SUPABASE_PROJECT_ID).toBe("ydxztoresbdeoeijhxww");
    expect(ZIVO_SOFTWARE_SUPABASE_URL).toBe("https://ydxztoresbdeoeijhxww.supabase.co");
    expect(ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY).toMatch(/^sb_publishable_/);
  });

  it("allows business dashboard routes on the software domain", () => {
    expect(isZivoSoftwareDashboardPath("/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44")).toBe(true);
    expect(isZivoSoftwareDashboardPath("/admin/stores/another-store-id")).toBe(true);
    expect(isZivoSoftwareDashboardPath("/eats/restaurant-dashboard")).toBe(true);
    expect(isZivoSoftwareDashboardPath("/bus/operator")).toBe(true);
    expect(isZivoSoftwareDashboardPath("/hotel-admin")).toBe(true);
    expect(isZivoSoftwareDashboardPath("/reels")).toBe(false);
    expect(isZivoSoftwareDashboardPath("/chat")).toBe(false);
    expect(isZivoSoftwareDashboardPath("/profile")).toBe(false);
  });
});
