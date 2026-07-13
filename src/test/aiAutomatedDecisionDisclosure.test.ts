import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("AI automated decision disclosure", () => {
  it("keeps full Terms explicit about AI ranking, risk review, and user limits", () => {
    const terms = read("src/pages/legal/TermsOfService.tsx");

    expect(terms).toContain("AI, Ranking & Automated Decisions");
    expect(terms).toContain("search ranking");
    expect(terms).toContain("recommendations");
    expect(terms).toContain("fraud detection");
    expect(terms).toContain("pricing estimates");
    expect(terms).toContain("moderation");
    expect(terms).toContain("safety review");
    expect(terms).toContain("AI output may be inaccurate or incomplete");
    expect(terms).toContain("account suspension");
    expect(terms).toContain("payout holds");
    expect(terms).toContain("content removal");
    expect(terms).toContain("booking risk review");
    expect(terms).toContain("payment risk review");
    expect(terms).toContain("human review or appeal where available");
    expect(terms).toContain("reverse-engineer");
    expect(terms).toContain("ranking, recommendation, fraud, safety, moderation");
  });

  it("keeps full Privacy explicit about automated decision purposes and rights", () => {
    const privacy = read("src/pages/legal/PrivacyPolicy.tsx");

    expect(privacy).toContain("AI & Automated Decisions");
    expect(privacy).toContain("rank feed, reels, and search results");
    expect(privacy).toContain("personalize recommendations");
    expect(privacy).toContain("detect fraud, spam, abuse, and security threats");
    expect(privacy).toContain("moderate content");
    expect(privacy).toContain("calculate pricing estimates");
    expect(privacy).toContain("route support requests");
    expect(privacy).toContain("measure ad relevance");
    expect(privacy).toContain("contract, legitimate interests, consent where required, and legal obligation");
    expect(privacy).toContain("de-identified or aggregated data");
    expect(privacy).toContain("request information about automated decisions affecting you");
    expect(privacy).toContain("request human review or submit an appeal where available");
  });

  it("keeps quick legal previews and creator education aligned with AI, algorithm, and appeals", () => {
    const preview = read("src/components/legal/LegalPreviewSheet.tsx");
    const academy = read("src/pages/MonetizationArticlesPage.tsx");

    expect(preview).toContain("ZIVO uses AI for search ranking");
    expect(preview).toContain("fraud detection, pricing, moderation");
    expect(preview).toContain("AI output may be inaccurate");
    expect(preview).toContain("AI helps rank content, detect fraud, moderate, and price rides");
    expect(preview).toContain("human review on request");
    expect(academy).toContain("Understanding the ZIVO algorithm");
    expect(academy).toContain("AI-generated content label");
    expect(academy).toContain("Why is your video not getting recommended?");
    expect(academy).toContain("Appealing a muted video");
    expect(academy).toContain("Understanding content removal decisions");
    expect(academy).toContain("Appealing a content decision");
  });

  it("keeps moderation appeals behind a trusted backend workflow", () => {
    const page = read("src/pages/ModerationAppealsPage.tsx");
    const edge = read("supabase/functions/moderation-appeal-submit/index.ts");
    const gate = read("supabase/migrations/20260601061500_moderation_appeals_server_gate.sql");

    expect(page).toContain('supabase.functions.invoke("moderation-appeal-submit"');
    expect(page).not.toMatch(/from\("appeal_requests"\)[\s\S]{0,180}\.insert/);

    expect(edge).toContain('withSecurity("moderation-appeal-submit"');
    expect(edge).toContain("strictCors: true");
    expect(edge).toContain('trackNetwork: "suspicious"');
    expect(edge).toContain("blockNetworkRiskAt: 80");
    expect(edge).toContain("auth.getUser(token)");
    expect(edge).toContain('.from("moderation_actions")');
    expect(edge).toContain('.eq("target_user_id", user.id)');
    expect(edge).toContain('.from("appeal_requests")');
    expect(edge).toContain("alreadySubmitted: true");

    expect(gate).toContain("ON public.appeal_requests");
    expect(gate).toContain("AS RESTRICTIVE");
    expect(gate).toContain("WITH CHECK (false)");
    expect(gate).toContain("trusted server-side ingestion");
  });
});
