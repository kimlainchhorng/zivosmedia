import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import translations from "../../i18n/translations";

const source = readFileSync(path.join(process.cwd(), "src/pages/app/ServicesPage.tsx"), "utf8");

const bilingualUiKeys = [
  "home.bus",
  "home.delivery",
  "services.title",
  "services.section.popular",
  "services.explore.title",
  "services.explore.subtitle",
  "services.tab.ride",
  "services.tab.food",
  "services.tab.travel",
  "services.tab.more",
  "services.tab.favorites",
  "services.favorites.empty",
  "services.search_results",
  "services.badge.live",
  "services.badge.hot",
  "services.badge.book",
  "services.badge.order",
  "services.badge.shop",
  "services.badge.new",
  "services.badge.rent",
  "services.badge.ai",
  "services.badge.premium",
  "services.badge.earn",
  "services.a11y.back",
  "services.a11y.clear_search",
  "services.a11y.save_favorite",
  "services.a11y.remove_favorite",
  "services.waitlist.title",
  "services.waitlist.success",
  "services.waitlist.launch_email",
  "services.waitlist.close",
  "services.waitlist.coming_soon",
  "services.waitlist.prompt",
  "services.waitlist.email_label",
  "services.waitlist.email_placeholder",
  "services.waitlist.joining",
  "services.waitlist.submit",
  "services.waitlist.error",
] as const;

describe("ServicesPage bilingual UI contract", () => {
  it.each(bilingualUiKeys)("provides English and Khmer copy for %s", (key) => {
    expect(translations.en[key]).toBeTruthy();
    expect(translations.km[key]).toBeTruthy();
  });

  it("routes the remaining page chrome and service badges through i18n", () => {
    for (const key of bilingualUiKeys) {
      expect(source).toContain(`t("${key}")`);
    }

    expect(source).not.toMatch(/badge: "(?:Live|Hot|Book|Order|Shop|New|Rent|AI|Premium|Earn)"/);
    expect(source).not.toContain('aria-label="Back"');
    expect(source).not.toContain('aria-label="Clear search"');
    expect(source).not.toContain('aria-label="Remove from favorites"');
  });

  it("keeps the waitlist email field programmatically labelled", () => {
    expect(source).toContain('htmlFor="service-waitlist-email"');
    expect(source).toContain('id="service-waitlist-email"');
    expect(source).toContain('autoComplete="email"');
    expect(source).toContain("<SheetContent side=\"bottom\" hideClose");
    expect(source).toContain('aria-label={t("services.waitlist.close")}');
  });

  it("uses Khmer script for the Creator Hub label", () => {
    expect(translations.km["services.creator"]).toBe("មជ្ឈមណ្ឌលអ្នកបង្កើត");
  });
});
