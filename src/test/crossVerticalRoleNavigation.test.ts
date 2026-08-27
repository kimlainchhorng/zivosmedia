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
      'path="/shop-dashboard"',
      'path="/admin/analytics"',
    ]) {
      expect(app).toContain(route);
    }

    for (const shortcut of [
      'label: "Driver Dashboard", description: "Manage your rides", href: "/drive"',
      'label: "Eats Driver", href: "/eats/driver-deliveries"',
      'label: "Shop Dashboard"',
      'label: "Admin dashboard"',
    ]) {
      expect(appMore + morePage).toContain(shortcut);
    }

    expect(appMore).not.toContain(
      'href: "/driver", color: "from-blue-500 to-blue-600"',
    );
    expect(app).not.toContain('path="/creator-dashboard"');
    expect(appMore + morePage).not.toContain('href: "/creator-dashboard"');
    expect(driverMap).toContain('navigate("/drive")');
    expect(driverMap).not.toContain('navigate("/driver")');
  });

  it("keeps dashboard quick links on registered pages with a Settings return control", () => {
    const app = source("src/App.tsx");
    const dashboard = source("src/pages/app/UnifiedDashboard.tsx");
    const settings = source("src/pages/account/AccountSettingsPage.tsx");

    for (const route of [
      'path="/my-trips"',
      'path="/wallet"',
      'path="/support"',
      'path="/account/settings"',
    ]) {
      expect(app).toContain(route);
    }

    for (const shortcut of [
      '{ to: "/my-trips", icon: Clock, label: "My Trips" }',
      '{ to: "/wallet", icon: Wallet, label: "Wallet" }',
      '{ to: "/support", icon: HelpCircle, label: "Support" }',
      '{ to: "/account/settings", icon: Settings, label: "Settings" }',
    ]) {
      expect(dashboard).toContain(shortcut);
    }

    expect(dashboard).not.toContain('to: "/profile/settings"');
    expect(settings).toContain('aria-label="Back"');
  });

  it("keeps Car Rental app-native on ZIVO while preserving the Travel surface", () => {
    const rental = source("src/pages/CarRentalLanding.tsx");

    expect(rental).toContain(
      'import AppLayout from "@/components/app/AppLayout"',
    );
    expect(rental).toContain("const isTravelHost =");
    expect(rental).toContain("if (!isTravelHost)");
    expect(rental).toContain("data-car-rental-app-shell");
    expect(rental).toContain('title="Rental Cars"');
    expect(rental).toContain("showBack");
    expect(rental).toContain('aria-label="Search rental cars"');
    expect(rental).toContain("<TravelPageFrame>");
    expect(rental).toContain("<Header />");
    expect(rental).toContain("<Footer />");
    expect(rental).toContain('aria-label="Go back"');
    expect(rental).toContain("window.history.state?.idx");
    expect(rental).toContain("navigate(-1)");
    expect(rental).toContain('navigate("/", { replace: true })');
    expect(rental).toContain('className="absolute left-4 top-4 z-20');
  });

  it("tracks this cross-vertical regression in the platform readiness matrix", () => {
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const workflow = source("src/test/roleWorkflowMatrix.test.ts");

    expect(matrix).toContain("src/test/crossVerticalRoleNavigation.test.ts");
    expect(workflow).toContain("crossVerticalRoleNavigation.test.ts");
  });
});
