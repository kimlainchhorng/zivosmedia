import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/transactional-email-templates/salon-campaign-passthrough.tsx"),
  "utf8",
);

describe("salon campaign email HTML security contract", () => {
  it("uses a formatting allowlist and safe link protocols", () => {
    expect(source).toContain("const CAMPAIGN_TAGS = new Set");
    expect(source).toContain("const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])");
    expect(source).toContain("const sanitizeCampaignHtml = (html: string): string =>");
    expect(source).toContain("const safeHtml = sanitizeCampaignHtml(body_html)");
    expect(source).toContain("const safeUnsubscribeUrl = unsubscribe_url ? safeHref(unsubscribe_url) : null");
  });

  it("does not rely on the previous dangerous-tag-only scrub", () => {
    expect(source).not.toContain("stripDangerousTags");
    expect(source).toContain("target=\"_blank\" rel=\"noopener noreferrer\"");
  });
});
