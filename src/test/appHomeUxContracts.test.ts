import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("authenticated home UX contracts", () => {
  it("keeps the complete four-by-two service launcher with comfortable targets", () => {
    const home = source("src/pages/app/AppHome.tsx");

    expect(home).toContain("grid grid-cols-4");
    expect(home).toContain("min-h-[88px]");
    expect(home).toContain("zivo-ride-icon.webp");
    expect(home).toContain("zivo-eats-icon.webp");
    expect(home).toContain("zivo-flights-icon.webp");
    expect(home).toContain("zivo-hotels-icon.webp");
    expect(home).toContain("zivo-rental-car.webp");
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
