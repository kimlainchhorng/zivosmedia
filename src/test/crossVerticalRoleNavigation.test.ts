import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("cross-vertical role navigation", () => {
  it("keeps the main dashboard connected to live ride, eats, flight, hotel, and rental routes", () => {
    const app = source("src/App.tsx");
    const dashboard = source("src/pages/app/UnifiedDashboard.tsx");

    for (const route of [
      'path="/rides/hub"',
      'path="/eats"',
      'path="/flights"',
      'path="/hotels"',
      'path="/car-rental"',
    ]) {
      expect(app).toContain(route);
    }

    for (const service of [
      '{ id: "ride", name: "Ride"',
      '{ id: "eats", name: "Eats"',
      '{ id: "flights", name: "Flights"',
      '{ id: "hotels", name: "Hotels"',
      '{ id: "rentals", name: "Rentals"',
    ]) {
      expect(dashboard).toContain(service);
    }

    expect(dashboard).toContain('link: "/car-rental", enabled: true');
    expect(dashboard).toContain('link: "/flights", enabled: true');
    expect(dashboard).not.toContain('link: "/rent-car"');
  });

  it("keeps role shortcuts pointed at registered work dashboards", () => {
    const app = source("src/App.tsx");
    const appMore = source("src/pages/app/AppMore.tsx");
    const morePage = source("src/pages/MorePage.tsx");
    const driverMap = source("src/pages/driver/DriverMapPage.tsx");

    for (const route of [
      'path="/drive"',
      'path="/driver/earnings"',
      'path="/driver/payouts"',
      'path="/eats/driver-deliveries"',
      'path="/creator-dashboard"',
      'path="/shop-dashboard"',
      'path="/admin/analytics"',
    ]) {
      expect(app).toContain(route);
    }

    for (const shortcut of [
      'label: "Driver Dashboard", description: "Manage your rides", href: "/drive"',
      'label: "Creator Dashboard", href: "/creator-dashboard"',
      'label: "Eats Driver", href: "/eats/driver-deliveries"',
      'label: "Shop Dashboard"',
      'label: "Admin dashboard"',
    ]) {
      expect(appMore + morePage).toContain(shortcut);
    }

    expect(appMore).not.toContain('href: "/driver", color: "from-blue-500 to-blue-600"');
    expect(driverMap).toContain('navigate("/drive")');
    expect(driverMap).not.toContain('navigate("/driver")');
  });

  it("tracks this cross-vertical regression in the platform readiness matrix", () => {
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const workflow = source("src/test/roleWorkflowMatrix.test.ts");

    expect(matrix).toContain("src/test/crossVerticalRoleNavigation.test.ts");
    expect(workflow).toContain("crossVerticalRoleNavigation.test.ts");
  });
});
