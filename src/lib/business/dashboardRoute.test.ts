import { describe, expect, it } from "vitest";

import { resolveBusinessDashboardRoute } from "./dashboardRoute";

describe("resolveBusinessDashboardRoute", () => {
  it("keeps auto repair dashboard links on the repair software category route", () => {
    expect(resolveBusinessDashboardRoute("auto repair", "store-123")).toEqual({
      path: "/admin/stores/store-123?tab=ar-dashboard&category=auto-repair",
      externalUrl: "https://zivosoftware.com/admin/stores/store-123?tab=ar-dashboard&category=auto-repair",
      fallback: false,
    });
  });

  it("keeps non-auto repair dashboard routes unchanged", () => {
    expect(resolveBusinessDashboardRoute("car rental", "store-123")).toEqual({
      path: "/admin/stores/store-123?tab=car-rental-dashboard",
      fallback: false,
    });
  });
});
