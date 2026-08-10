import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const component = readFileSync(resolve(process.cwd(), "src/components/grocery/GroceryOrderAgain.tsx"), "utf8");
const page = readFileSync(resolve(process.cwd(), "src/pages/GroceryStorePage.tsx"), "utf8");

describe("grocery order-again cache account isolation", () => {
  it("keys local purchase history by the authenticated account", () => {
    expect(component).toContain('const CACHE_KEY = "zivo-grocery-order-history";');
    expect(component).toMatch(/`\$\{CACHE_KEY\}:\$\{userId\}`/);
    expect(component).toMatch(/const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);/);
    expect(component).toMatch(/const cacheKey = cacheKeyForUser\(user\?\.id \?\? null\);/);
    expect(component).toMatch(/if \(!cacheKey\) return;/);
    expect(component).toMatch(/localStorage\.getItem\(cacheKey\)/);
    expect(component).toMatch(/localStorage\.setItem\(cacheKey, JSON\.stringify/);
    expect(component).not.toMatch(/localStorage\.getItem\(CACHE_KEY\)/);
    expect(component).not.toMatch(/localStorage\.setItem\(CACHE_KEY,/);
  });

  it("clears and reloads the fallback on auth changes without changing checkout", () => {
    expect(component).toMatch(/supabase\.auth\.onAuthStateChange/);
    expect(component).toMatch(/setHistory\(\[\]\);/);
    expect(component).toMatch(/\}, \[store, userId\]\);/);
    expect(component).toMatch(/\.eq\("user_id", userId\)/);
    expect(page).toContain("void saveToOrderHistory(");
  });
});
