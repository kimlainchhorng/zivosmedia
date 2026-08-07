import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readRaw = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

/**
 * Source with comments stripped.
 *
 * These assertions are about the copy a CUSTOMER reads. Scanning raw source
 * makes a comment explaining why a claim was removed look identical to the
 * claim itself — so documenting the fix would fail the test that protects it,
 * and the only way to pass would be to stop explaining. Strip comments and the
 * test checks the thing it is named after.
 */
const read = (relativePath: string) =>
  readRaw(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const SURFACES = {
  about: "src/pages/About.tsx",
  schema: "src/components/seo/OrganizationSchema.tsx",
  terms: "src/pages/legal/TermsOfService.tsx",
  refunds: "src/pages/legal/RefundPolicy.tsx",
} as const;

/**
 * What the site SAYS the business does has to match what it actually does.
 *
 * /about used to state, in bold, that "ZIVO does not sell tickets or process
 * payments" and that users are "redirected to our travel partners" to pay —
 * a description of an earlier, affiliate-only ZIVO. Meanwhile the Terms and the
 * Refund Policy both name ZIVO LLC as merchant of record, and the platform
 * settles rides, deliveries, and shopping through its own payment account.
 *
 * A public denial that the company processes payments, sitting alongside a
 * payment account that does exactly that, is the kind of contradiction that
 * costs an account. These tests keep the description honest.
 */
describe("published business description", () => {
  it("never denies that ZIVO processes payments", () => {
    const about = read(SURFACES.about);
    expect(about).not.toMatch(/does not sell tickets or process payments/i);
    expect(about).not.toMatch(/ZIVO does not .{0,40}process payments/i);
  });

  it("states that ZIVO is merchant of record for the services it operates", () => {
    const about = read(SURFACES.about);
    expect(about).toMatch(/ZIVO\s*\n?\s*processes the payment and is the merchant of record/i);
  });

  it("keeps the flights carve-out, which is the part that is still true", () => {
    // ZIVO genuinely does not issue airline tickets. Scoping the disclaimer to
    // flights preserves an accurate statement instead of deleting it wholesale.
    const about = read(SURFACES.about);
    expect(about).toMatch(/ticket is issued by an authorised partner/i);
    expect(about).toMatch(/sub-agent of licensed ticketing providers/i);
  });

  it("does not claim the platform charges no fees", () => {
    // The platform charges a payment fee on digital tenders, takes a service
    // commission, and charges the $2/$5 cancellation fees published on the
    // Cancellation Policy. "We never charge fees" contradicted all three.
    const about = read(SURFACES.about);
    expect(about).not.toMatch(/never charge fees/i);
    expect(about).not.toMatch(/completely free for travelers/i);
    expect(about).not.toMatch(/no impact on the price you pay/i);
  });

  it("names the operating services on both the human and machine-readable surfaces", () => {
    // The schema description is what aggregators and search engines consume, so
    // it drifted invisibly while the visible page was being read by people.
    for (const file of [SURFACES.about, SURFACES.schema]) {
      const source = read(file);
      expect(source).toMatch(/rides/i);
      expect(source).toMatch(/(food|package) (and package )?delivery/i);
    }
  });

  it("agrees with the Terms and Refund Policy on who the merchant of record is", () => {
    for (const file of [SURFACES.terms, SURFACES.refunds]) {
      expect(read(file)).toMatch(/merchant of record/i);
    }
  });

  /**
   * No customer-facing surface may deny that ZIVO takes the payment, for any
   * service ZIVO actually settles.
   *
   * Every service on this platform runs through ZIVO's own payment account —
   * including flights, where a licensed partner issues the TICKET but
   * create-flight-payment-intent takes the money and process-flight-refund
   * returns it via stripe.refunds.create. "Sells" and "issues" are different
   * things, and conflating them produced blanket denials across the FAQ, the
   * invoice footer, and the marketing copy.
   */
  it("never tells a customer that someone else took their money", () => {
    const denials = [
      /ZIVO is a comparison platform only/i,
      /We do not process payments/i,
      /travel search and referral service/i,
      /All bookings, payments, refunds, and changes\s*\n?\s*are handled directly by our travel partners/i,
    ];

    for (const file of [
      "src/components/shared/TravelFAQ.tsx",
      "src/hooks/useInvoicePdfExport.ts",
      "src/components/legal/LegalPreviewSheet.tsx",
      "src/components/seo/HowItWorksSection.tsx",
      SURFACES.about,
    ]) {
      const source = read(file);
      for (const denial of denials) {
        expect(source, `${file} denies ZIVO processes payments`).not.toMatch(denial);
      }
    }
  });

  it("keeps the invoice footer naming ZIVO as the issuer", () => {
    // An invoice is what a customer forwards to their bank in a dispute. One
    // that disclaims handling the payment argues the cardholder's case.
    const invoice = readRaw("src/hooks/useInvoicePdfExport.ts");
    expect(invoice).toContain("COMPANY_INFO.name");
    expect(invoice).toContain("COMPANY_INFO.statementDescriptor");
  });

  it("does not disclaim merchant of record for flights ZIVO charges for", () => {
    const refunds = read(SURFACES.refunds);
    expect(refunds).not.toMatch(/Flights:.*we are not the merchant of record/i);
  });
});
