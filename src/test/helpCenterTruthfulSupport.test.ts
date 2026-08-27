import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/pages/HelpCenter.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("Help Center truthful support flow", () => {
  it("makes search and featured help destinations functional", () => {
    expect(source).toContain('type="search"');
    expect(source).toContain('aria-label="Search help articles"');
    expect(source).toContain("filteredPopularArticles");
    expect(source).toContain("filteredRidesFAQ");
    expect(source).toContain("searchResultCount");
    expect(source).toContain('href: "/legal/refunds"');
    expect(source).toContain('href: "/payment-methods"');
    expect(source).toContain('href: "/safety"');
    expect(source).toContain('href: "#travel"');
    expect(source).not.toContain('href: "#rental"');
    expect(source).not.toContain('href: "#hotels"');
  });

  it("uses real support destinations instead of dead contact buttons", () => {
    expect(source).toContain('href: "/support/tickets"');
    expect(source).toContain(
      'href: "mailto:support@zivosmedia.com?subject=ZIVO%20support%20request"',
    );
    expect(source).toContain('title: "Safety"');
    expect(source).toContain("<Button asChild");
  });

  it("routes ticket creation through the authenticated server intake", () => {
    expect(source).toContain('functions.invoke("support-ticket-submit"');
    expect(source).toContain(
      "source: `help_center:${ticketCategory}:${ticketPriority}`",
    );
    expect(source).toContain('to="/login?redirect=%2Fhelp-center"');
    expect(source).not.toMatch(
      /from\("feedback_submissions"\)[\s\S]{0,220}\.insert/,
    );
  });

  it("keeps the local header clear of the desktop shell without adding a Travel gap", () => {
    expect(source).toContain("isZivoTravelHost");
    expect(source).toContain("relative overflow-x-clip safe-area-bottom");
    expect(source).not.toContain("relative overflow-x-hidden safe-area-bottom");
    expect(source).not.toContain("relative overflow-hidden safe-area-bottom");
    expect(source).toContain('!isTravelHost && "lg:pt-[83px]"');
    expect(source).toContain('!isTravelHost && "lg:relative lg:top-auto"');
    expect(source).toContain('!isTravelHost && "lg:scroll-mt-[95px]"');
  });

  it("keeps self-service guidance inside the FAQ tab", () => {
    expect(source).toContain('activeTab === "faq" && !normalizedSearch');
    expect(source).not.toMatch(/\{!normalizedSearch && \(\s*<div className="space-y-8 mt-10">/);
  });

  it("does not present unverified support availability or engagement claims", () => {
    for (const claim of [
      "Support Team Online",
      "Average response: &lt;5 minutes",
      "Support by the Numbers",
      "Trending Questions",
      "1-800-ZIVO",
      "Response within 24h",
      'views: "',
      "Fees typically range from $3-10",
      "A $15 return fee may apply",
      "Average delivery is 30-45 minutes",
      "reset link valid for 1 hour",
    ]) {
      expect(source).not.toContain(claim);
    }
  });
});
