import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(process.cwd(), "src/pages/app/ServicesPage.tsx"), "utf8");

describe("ServicesPage canonical Ride links", () => {
  it("does not launch retired RideHub tab routes from the active services surface", () => {
    expect(source).not.toContain("/rides/hub?tab=reserve");
    expect(source).not.toContain("zivoReserveBanner");
  });

  it("marks Reserve as coming soon until the shared Ride app owns scheduling", () => {
    expect(source).toContain('id: "ride-reserve"');
    expect(source).toContain('href: "/rides/hub"');
    expect(source).toContain('badge: t("services.badge.coming_soon")');
    expect(source).toContain("comingSoon: true");
  });

  it("uses service identifiers rather than route-only favorite keys", () => {
    expect(source).toContain("const serviceFavoriteKey = (service: ServiceItem) => service.id ?? service.href");
    expect(source).toContain('key={serviceFavoriteKey(s) + "-fav"}');
    expect(source).toContain("toggleFavorite(service, e)");
    expect(source).not.toContain("toggleFavorite(service.href");
    expect(source).not.toContain("favorites.includes(service.href)");
  });
});
