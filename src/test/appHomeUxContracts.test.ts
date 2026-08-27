import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("authenticated home UX contracts", () => {
  it("keeps the complete four-by-two phone launcher and one-row tablet launcher", () => {
    const home = source("src/pages/app/AppHome.tsx");
    const gridTag =
      home.match(/<div className="[^"]*grid-cols-4[^"]*">/)?.[0] ?? "";
    const gridClasses =
      gridTag.match(/className="([^"]+)"/)?.[1].split(/\s+/) ?? [];

    expect(gridClasses).toEqual(
      expect.arrayContaining(["grid", "grid-cols-4", "md:grid-cols-8"]),
    );
    expect(home).toContain("min-h-[88px]");
    expect(home).toContain("zivo-ride-icon.webp");
    expect(home).toContain("zivo-eats-icon.webp");
    expect(home).toContain("zivo-flights-aircraft.webp");
    expect(home).toContain("zivo-hotels-icon.webp");
    expect(home).toContain("zivo-rental-car.webp");
    expect(home).toContain("zivo-bus-icon.webp");
    expect(home).toContain("zivo-shopping.webp");

    for (const route of [
      'href: "/rides/hub"',
      'href: "/eats"',
      'href: "/flights"',
      'href: "/rent-car"',
      'href: "/bus"',
      'href: "/grocery"',
      'href: "/delivery"',
    ]) {
      expect(home).toContain(route);
    }

    expect(home).toContain("href: hotelsPath");
  });

  it("centers wide-screen content below the fixed desktop navigation", () => {
    const home = source("src/pages/app/AppHome.tsx");
    const shellTag =
      home.match(/<div className="[^"]*scroll-momentum[^"]*">/)?.[0] ?? "";
    const shellClasses =
      shellTag.match(/className="([^"]+)"/)?.[1].split(/\s+/) ?? [];

    expect(shellClasses).toEqual(
      expect.arrayContaining([
        "mx-auto",
        "w-full",
        "max-w-5xl",
        "lg:pt-[83px]",
      ]),
    );
  });

  it("does not preload hidden account and lodging data from Home", () => {
    const home = source("src/pages/app/AppHome.tsx");
    const referralsPage = source("src/pages/app/ReferAFriendPage.tsx");

    for (const orphanedHook of [
      "useOwnerStoreProfile",
      "useLodgeRooms",
      "useLodgePropertyProfile",
      "useLodgeReservations",
      "useLodgingPhase5Counts",
      "useLoyaltyPoints",
      "useUserRewards",
      "useReferrals",
      "useLocalPaymentMethods",
    ]) {
      expect(home).not.toContain(orphanedHook);
    }

    for (const visibleHomeHook of [
      "useUserProfile",
      "useRecentlyViewed",
      "useScheduledBookingsQuery",
      "useCustomerWallet",
      "useDeviceIntegrityCheck",
    ]) {
      expect(home).toContain(visibleHomeHook);
    }

    expect(referralsPage).toContain("useReferrals()");
  });

  it("does not preload the unsupported cross-service spend estimate", () => {
    const home = source("src/pages/app/AppHome.tsx");
    const legacySpendWidget = source(
      "src/components/home/SpendTrackerWidget.tsx",
    );

    expect(home).not.toContain("SpendTrackerWidget");
    expect(legacySpendWidget).toContain("@deprecated Not mounted on Home");
    expect(legacySpendWidget).toContain("server-owned spend ledger");
  });

  it("keeps home action cards readable, distinct, and touch friendly", () => {
    const concierge = source("src/components/home/ConciergeLauncher.tsx");
    const bundle = source("src/components/home/PlanTripBundle.tsx");
    const network = source("src/components/home/NetworkPromoStrip.tsx");

    expect(concierge).toContain("bg-ig-gradient");
    expect(concierge).toContain("overflow-x-auto");
    expect(concierge).not.toContain("from-violet-500/[0.10]");
    expect(bundle).toContain("bg-ig-gradient");
    expect(bundle).toContain("overflow-x-auto");
    expect(bundle).not.toContain("from-sky-500/[0.10]");
    expect(network).toContain("bg-ig-gradient");
    expect(network).toContain("truncate text-[10.5px]");
  });
});
