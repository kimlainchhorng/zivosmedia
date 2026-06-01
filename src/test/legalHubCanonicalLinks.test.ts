import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("legal hub canonical links", () => {
  it("routes policy hub cards through canonical legal paths", () => {
    const hub = read("src/pages/account/LegalPoliciesPage.tsx");

    const canonicalLinks = [
      'label: "Terms & Conditions", href: "/legal/terms"',
      'label: "Privacy Policy", href: "/legal/privacy"',
      'label: "Cookie Policy", href: "/legal/cookies"',
      'label: "Refund Policy", href: "/legal/refunds"',
      'label: "Cancellation Policy", href: "/legal/cancellation"',
      'label: "Seller of Travel", href: "/legal/seller-of-travel"',
      'label: "DMCA / Copyright", href: "/legal/dmca"',
      'label: "Dispute Resolution", href: "/legal/dispute-resolution"',
      'label: "Accessibility", href: "/legal/accessibility"',
    ];

    for (const link of canonicalLinks) {
      expect(hub).toContain(link);
    }

    expect(hub).not.toContain('label: "Terms & Conditions", href: "/terms"');
    expect(hub).not.toContain('label: "Privacy Policy", href: "/privacy"');
    expect(hub).not.toContain('label: "Cookie Policy", href: "/cookies"');
    expect(hub).not.toContain('label: "Refund Policy", href: "/refunds"');
  });

  it("keeps every canonical hub destination registered in the app router", () => {
    const app = read("src/App.tsx");

    for (const route of [
      'path="/legal/terms"',
      'path="/legal/privacy"',
      'path="/legal/cookies"',
      'path="/legal/refunds"',
      'path="/legal/cancellation"',
      'path="/legal/seller-of-travel"',
      'path="/legal/dmca"',
      'path="/legal/dispute-resolution"',
      'path="/legal/accessibility"',
    ]) {
      expect(app).toContain(route);
    }
  });
});
