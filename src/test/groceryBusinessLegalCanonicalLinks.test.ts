import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const files = [
  "src/components/grocery/GroceryPolicyFooter.tsx",
  "src/components/grocery/GroceryCheckoutDrawer.tsx",
  "src/pages/grocery/GroceryTerms.tsx",
  "src/pages/business/BusinessLandingPage.tsx",
  "src/pages/business/PartnerWithZivo.tsx",
];

describe("grocery and business legal canonical links", () => {
  it("keeps grocery and business consent links on canonical legal routes", () => {
    const combined = files.map((file) => read(file)).join("\n");

    for (const canonical of [
      'to="/legal/terms"',
      'to="/legal/privacy"',
      'to="/legal/cookies"',
      'to="/legal/partner-disclosure"',
      'to="/grocery/terms"',
    ]) {
      expect(combined).toContain(canonical);
    }

    for (const legacy of [
      'to="/terms"',
      'to="/privacy"',
      'to="/cookies"',
      'to="/partner-disclosure"',
      'to="/privacy-policy"',
    ]) {
      expect(combined).not.toContain(legacy);
    }
  });

  it("keeps marketplace-specific policy routes alongside canonical platform policies", () => {
    const groceryTerms = read("src/pages/grocery/GroceryTerms.tsx");
    const checkoutDrawer = read("src/components/grocery/GroceryCheckoutDrawer.tsx");
    const partnerPage = read("src/pages/business/PartnerWithZivo.tsx");

    expect(groceryTerms).toContain('to="/grocery/fees"');
    expect(groceryTerms).toContain('to="/grocery/returns"');
    expect(checkoutDrawer).toContain('to="/grocery/terms"');
    expect(partnerPage).toContain("Partner Disclosure");
  });
});
