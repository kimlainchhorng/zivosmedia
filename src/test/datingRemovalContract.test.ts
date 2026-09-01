import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("Dating product removal", () => {
  it("does not ship a Dating page or public route", () => {
    expect(existsSync(path.join(root, "src/pages/DatingPage.tsx"))).toBe(false);

    const app = source("src/App.tsx");
    const countryHub = source("src/pages/seo/CountryHubPage.tsx");
    expect(app).not.toContain("DatingPage");
    expect(app).not.toContain('path="/dating"');
    expect(app).toMatch(
      /<Route\s+path="\/:countrySlug"\s+element=\{\s*<CountryHubPage\s*\/>\s*\}\s*\/>/,
    );
    expect(countryHub).toContain("return <NotFound />;");
  });

  it("does not advertise Dating in social navigation or Live", () => {
    const publicSurfaces = [
      source("src/components/social/FeedSidebar.tsx"),
      source("src/pages/MorePage.tsx"),
      source("src/pages/LiveStreamPage.tsx"),
      source("src/pages/MonetizationArticlesPage.tsx"),
    ].join("\n");

    expect(publicSurfaces).not.toContain('path: "/dating"');
    expect(publicSurfaces).not.toContain('href: "/dating"');
    expect(publicSurfaces).not.toContain('navigate("/dating")');
    expect(publicSurfaces).not.toContain("Dating Live");
    expect(publicSurfaces).not.toMatch(/label:\s*["']Dating["']/);
    expect(publicSurfaces).not.toContain("matchmaking");
  });

  it("removes Dating-only cache and feature-flag contracts", () => {
    expect(source("src/hooks/useVerificationRealtime.ts")).not.toContain(
      '"dating-profiles"',
    );
    expect(source("src/config/liveFeatureFlags.ts")).not.toContain(
      "datingLive",
    );
  });
});
