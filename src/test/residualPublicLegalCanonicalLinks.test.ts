import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const files = [
  "src/pages/security/PrivacyCompliance.tsx",
  "src/pages/Refunds.tsx",
  "src/pages/TravelCheckoutPage.tsx",
  "src/pages/Privacy.tsx",
  "src/pages/account/PrivacyControls.tsx",
  "src/components/home/NewsletterSection.tsx",
  "src/pages/legal/InsurancePolicy.tsx",
  "src/pages/legal/AccessibilityStatement.tsx",
];

describe("residual public legal canonical links", () => {
  it("keeps remaining public privacy, refund, and checkout links canonical", () => {
    const combined = files.map((file) => read(file)).join("\n");

    for (const canonical of [
      'to="/legal/terms"',
      'to="/legal/privacy"',
      'to="/legal/cookies"',
      'to="/legal/partner-disclosure"',
    ]) {
      expect(combined).toContain(canonical);
    }

    for (const legacy of [
      'to="/terms"',
      'to="/privacy"',
      'to="/cookies"',
      'to="/partner-disclosure"',
      'to="/privacy-policy"',
      'to="/terms-of-service"',
    ]) {
      expect(combined).not.toContain(legacy);
    }
  });

  it("keeps privacy, data-rights, and checkout copy attached to canonical links", () => {
    const privacyCompliance = read("src/pages/security/PrivacyCompliance.tsx");
    const privacyControls = read("src/pages/account/PrivacyControls.tsx");
    const travelCheckout = read("src/pages/TravelCheckoutPage.tsx");
    const newsletter = read("src/components/home/NewsletterSection.tsx");

    expect(privacyCompliance).toContain("View Cookie Policy");
    expect(privacyControls).toContain("Learn more about how we protect your privacy");
    expect(travelCheckout).toContain("cancellation policies apply");
    expect(newsletter).toContain("No spam, unsubscribe anytime");
  });
});
