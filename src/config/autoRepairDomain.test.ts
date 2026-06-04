import { describe, expect, it } from "vitest";
import {
  AUTO_REPAIR_DASHBOARD_PATH,
  AUTO_REPAIR_SOFTWARE_PATH,
  AUTO_REPAIR_STORE_ID,
  isAutoRepairSoftwareHost,
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
    expect(isAutoRepairSoftwareHost("zivollc.com")).toBe(false);
    expect(isAutoRepairSoftwareHost("preview.zivollc.com")).toBe(false);
  });
});
