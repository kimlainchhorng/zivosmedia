import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("marketing lead privacy intake", () => {
  const leadPages = [
    "src/pages/Deals.tsx",
    "src/pages/Vision.tsx",
    "src/pages/business/APIPartners.tsx",
    "src/pages/business/CorporateTravel.tsx",
    "src/pages/business/BusinessLandingPage.tsx",
  ];

  it("routes newsletter, deals, API, corporate, and business leads through trusted server-side ingestion", () => {
    for (const page of leadPages) {
      const source = read(page);
      expect(source).toContain('functions.invoke("marketing-interest-submit"');
      expect(source).not.toMatch(/from\("feedback_submissions"\)[\s\S]{0,160}\.insert/);
    }
  });

  it("keeps public lead forms near canonical privacy and terms links", () => {
    for (const page of leadPages) {
      const source = read(page);
      expect(source).toContain('to="/legal/privacy"');
      expect(source).toContain('to="/legal/terms"');
      expect(source).not.toContain('to="/privacy"');
      expect(source).not.toContain('to="/terms"');
    }
  });

  it("keeps marketing lead categories server-validated and browser inserts restricted", () => {
    const submit = read("supabase/functions/marketing-interest-submit/index.ts");
    const gate = read("supabase/migrations/20260601041500_marketing_interest_server_gate.sql");

    expect(submit).toContain('withSecurity("marketing-interest-submit"');
    expect(submit).toContain("strictCors: true");
    expect(submit).toContain('rateLimit: "api_general"');
    expect(submit).toContain("blockNetworkRiskAt: 80");
    expect(submit).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(submit).toContain("cleanEmail(body.email)");
    expect(submit).toContain("cleanText(body.company, MAX_TEXT)");
    expect(submit).toContain("cleanText(body.message, MAX_MESSAGE)");
    expect(submit).toContain('.from("feedback_submissions")');

    for (const category of [
      "newsletter_signup",
      "deals_alert_signup",
      "api_waitlist",
      "corporate_lead",
      "business_inquiry",
    ]) {
      expect(submit).toContain(category);
      expect(gate).toContain(category);
    }

    expect(gate).toContain("AS RESTRICTIVE");
    expect(gate).toContain("trusted server-side ingestion");
  });
});
