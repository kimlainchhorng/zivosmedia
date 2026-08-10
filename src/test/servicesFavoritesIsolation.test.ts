import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/pages/app/ServicesPage.tsx"), "utf8");

describe("ServicesPage favorite account isolation", () => {
  it("namespaces favorite services by authenticated user", () => {
    expect(source).toMatch(/FAVORITES_KEY_PREFIX\s*=\s*["']zivo_favorite_services["']/);
    expect(source).toMatch(/favoritesStorageKey\(userId: string \| null\)/);
    expect(source).toMatch(/return userId \? `\$\{FAVORITES_KEY_PREFIX\}:\$\{userId\}` : null/);
    expect(source).toMatch(/loadFavoriteServices\(userId\)/);
    expect(source).toMatch(/saveFavoriteServices\(next, userId\)/);
    expect(source).toMatch(/favoriteState\.userId === userId/);
    expect(source).toMatch(/if \(!key \|\| typeof window === "undefined"\) return/);
    expect(source).not.toMatch(/localStorage\.(?:getItem|setItem)\(FAVORITES_KEY\)/);
  });
});
