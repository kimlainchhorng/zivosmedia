import { describe, expect, it } from "vitest";
import {
  AUTO_REPAIR_DASHBOARD_PATH,
  AUTO_REPAIR_MEDIA_DASHBOARD_URL,
  AUTO_REPAIR_SOFTWARE_PATH,
  AUTO_REPAIR_STORE_ID,
  ZIVO_SOFTWARE_AUTH_REDIRECT_PATH,
  ZIVO_SOFTWARE_ORIGIN,
  ZIVO_SOFTWARE_SUPABASE_PROJECT_ID,
  ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY,
  ZIVO_SOFTWARE_SUPABASE_URL,
  ZIVO_SOFTWARE_HOME_PATH,
  getZivoSoftwareUrl,
  isAutoRepairSoftwareHost,
  isZivoMediaHost,
  isZivoSoftwareDashboardPath,
  isZivoSoftwareHost,
  isZivoSoftwareRedirectTarget,
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
    expect(AUTO_REPAIR_MEDIA_DASHBOARD_URL).toBe(
      "https://zivosmedia.com/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
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
    expect(ZIVO_SOFTWARE_ORIGIN).toBe("https://zivosoftware.com");
    expect(ZIVO_SOFTWARE_HOME_PATH).toBe("/business");
    expect(ZIVO_SOFTWARE_AUTH_REDIRECT_PATH).toBe("/business/new");
    expect(isZivoSoftwareHost("zivosoftware.com")).toBe(true);
    expect(isZivoSoftwareHost("zivosmedia.com")).toBe(false);
  });

  it("recognizes media hosts that should hand business setup to software", () => {
    expect(isZivoMediaHost("zivosmedia.com")).toBe(true);
    expect(isZivoMediaHost("www.zivosmedia.com")).toBe(true);
    expect(isZivoMediaHost("preview.zivosmedia.com")).toBe(true);
    expect(isZivoMediaHost("zivosoftware.com")).toBe(false);
    expect(isZivoMediaHost("localhost")).toBe(false);
  });

  it("builds software-domain URLs while preserving navigation state", () => {
    expect(getZivoSoftwareUrl("/business/new", "?new=1", "#profile")).toBe(
      "https://zivosoftware.com/business/new?new=1#profile",
    );
    expect(getZivoSoftwareUrl("/business")).toBe("https://zivosoftware.com/business");
  });

  it("only treats absolute zivosoftware.com URLs as software auth redirects", () => {
    expect(isZivoSoftwareRedirectTarget("/business/dashboard")).toBe(false);
    expect(isZivoSoftwareRedirectTarget("https://zivosmedia.com/business/dashboard")).toBe(false);
    expect(isZivoSoftwareRedirectTarget("https://zivosoftware.com/business/dashboard")).toBe(true);
    expect(isZivoSoftwareRedirectTarget("https://www.zivosoftware.com/business/new")).toBe(true);
  });

  it("points the software domain at the dedicated software Supabase project", () => {
    expect(ZIVO_SOFTWARE_SUPABASE_PROJECT_ID).toBe("ydxztoresbdeoeijhxww");
    expect(ZIVO_SOFTWARE_SUPABASE_URL).toBe("https://ydxztoresbdeoeijhxww.supabase.co");
    expect(ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY).toMatch(/^sb_publishable_/);
  });

  it("allows only the Software dashboard route on the software domain", () => {
    expect(isZivoSoftwareDashboardPath("/business/dashboard")).toBe(true);
    expect(isZivoSoftwareDashboardPath("/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44")).toBe(true);
    expect(isZivoSoftwareDashboardPath("/admin/stores/another-store-id")).toBe(false);
    expect(isZivoSoftwareDashboardPath("/eats/restaurant-dashboard")).toBe(false);
    expect(isZivoSoftwareDashboardPath("/bus/operator")).toBe(false);
    expect(isZivoSoftwareDashboardPath("/hotel-admin")).toBe(false);
    expect(isZivoSoftwareDashboardPath("/reels")).toBe(false);
    expect(isZivoSoftwareDashboardPath("/chat")).toBe(false);
    expect(isZivoSoftwareDashboardPath("/profile")).toBe(false);
  });
});
