import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("public legal navigation canonical routes", () => {
  it("keeps footer, navbar, compliance center, and more hub legal links canonical", () => {
    const footer = read("src/components/Footer.tsx");
    const navBar = read("src/components/home/NavBar.tsx");
    const compliance = read("src/pages/ComplianceCenter.tsx");
    const morePage = read("src/pages/MorePage.tsx");
    const combined = [footer, navBar, compliance, morePage].join("\n");

    for (const canonical of [
      "/legal/terms",
      "/legal/privacy",
      "/legal/cookies",
      "/legal/refunds",
      "/legal/cancellation",
      "/legal/partner-disclosure",
      "/legal/accessibility",
      "/legal/do-not-sell",
    ]) {
      expect(combined).toContain(canonical);
    }

    for (const legacy of [
      'href: "/terms"',
      'href: "/privacy"',
      'href: "/cookies"',
      'href: "/refunds"',
      'href: "/partner-disclosure"',
      'href: "/accessibility"',
      'href: "/do-not-sell"',
      'href: "/legal/cancellation-policy"',
    ]) {
      expect(combined).not.toContain(legacy);
    }
  });

  it("keeps every canonical public legal destination registered in the app router", () => {
    const app = read("src/App.tsx");

    for (const route of [
      'path="/legal/terms"',
      'path="/legal/privacy"',
      'path="/legal/cookies"',
      'path="/legal/refunds"',
      'path="/legal/cancellation"',
      'path="/legal/partner-disclosure"',
      'path="/legal/accessibility"',
      'path="/legal/do-not-sell"',
    ]) {
      expect(app).toContain(route);
    }
  });
});
