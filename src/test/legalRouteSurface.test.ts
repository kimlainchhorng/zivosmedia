import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("canonical legal route surface", () => {
  it("keeps core public policy pages mounted under /legal routes", () => {
    const app = source("src/App.tsx");

    for (const route of [
      'path="/legal/terms"',
      'path="/legal/privacy"',
      'path="/legal/cookies"',
      'path="/legal/refunds"',
      'path="/legal/cancellation"',
      'path="/legal/do-not-sell"',
      'path="/legal/data-retention"',
      'path="/legal/security"',
      'path="/legal/vdp"',
      'path="/legal/*"',
    ]) {
      expect(app).toContain(route);
    }

    for (const page of [
      "TermsOfService",
      "PrivacyPolicy",
      "CookiePolicy",
      "RefundPolicy",
      "CancellationPolicy",
      "DoNotSell",
      "DataRetentionPolicy",
      "SecurityPolicy",
      "VulnerabilityDisclosureLegal",
      "GenericLegalPage",
    ]) {
      expect(app).toContain(page);
    }
  });

  it("keeps checkout legal buttons opening canonical policy sheets", () => {
    const checkoutTerms = source("src/components/checkout/CheckoutTermsAcceptance.tsx");
    const legalSheet = source("src/components/checkout/InlineLegalSheet.tsx");
    const checkoutFooter = source("src/components/checkout/CheckoutTrustFooter.tsx");

    expect(checkoutTerms).toContain('openSheet("Terms of Service", "/legal/terms")');
    expect(checkoutTerms).toContain('openSheet("Privacy Policy", "/legal/privacy")');
    expect(checkoutTerms).toContain("state.fareRules && state.termsOfService");
    expect(checkoutTerms).toContain("marketing: false");

    for (const route of [
      '"/legal/terms": lazy(() => import("@/pages/legal/TermsOfService"))',
      '"/legal/privacy": lazy(() => import("@/pages/legal/PrivacyPolicy"))',
      '"/legal/cookies": lazy(() => import("@/pages/legal/CookiePolicy"))',
      '"/legal/refunds": lazy(() => import("@/pages/legal/RefundPolicy"))',
      '"/legal/cancellation": lazy(() => import("@/pages/legal/CancellationPolicy"))',
    ]) {
      expect(legalSheet).toContain(route);
    }

    for (const href of [
      'to="/legal/terms"',
      'to="/legal/privacy"',
      'to="/legal/flight-terms"',
      'to="/legal/partner-disclosure"',
    ]) {
      expect(checkoutFooter).toContain(href);
    }
  });

  it("keeps the More hub policy buttons on canonical legal destinations", () => {
    const morePage = source("src/pages/MorePage.tsx");

    for (const link of [
      'label: "Terms of Service", href: "/legal/terms"',
      'label: "Privacy Policy", href: "/legal/privacy"',
      'label: "Cookies Policy", href: "/legal/cookies"',
      'label: "Refund Policy", href: "/legal/refunds"',
      'label: "Cancellation Policy", href: "/legal/cancellation"',
      '{ label: "Terms", href: "/legal/terms" }',
      '{ label: "Privacy", href: "/legal/privacy" }',
      '{ label: "Cookies", href: "/legal/cookies" }',
      '{ label: "Refunds", href: "/legal/refunds" }',
    ]) {
      expect(morePage).toContain(link);
    }
  });

  it("keeps policy pages explicit about data rights, refunds, cancellation, and legal contact paths", () => {
    const privacy = source("src/pages/legal/PrivacyPolicy.tsx");
    const refunds = source("src/pages/legal/RefundPolicy.tsx");
    const cancellation = source("src/pages/legal/CancellationPolicy.tsx");
    const retention = source("src/pages/legal/DataRetentionPolicy.tsx");

    expect(privacy).toContain("Data Deletion");
    expect(privacy).toContain("We do not sell, rent, or trade your personal information");
    expect(privacy).toContain("CCPA");

    expect(refunds).toContain("Merchant of Record");
    expect(refunds).toContain("Payment Method");
    expect(refunds).toContain("5-10 business days");
    expect(cancellation).toContain("Merchant of Record");
    expect(cancellation).toContain("cancellation");

    expect(retention).toContain("Consent & acceptance records");
    expect(retention).toContain("7 years");
    expect(retention).toContain("privacy@zivosmedia.com");
  });
});
