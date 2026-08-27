import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/pages/MorePage.tsx"), "utf8");

const sliceBetween = (start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe("MorePage primary mobile touch targets", () => {
  it("keeps header and profile settings actions at least 44 by 44 pixels", () => {
    const header = sliceBetween("{/* Mobile sticky header */}", '<div className="flex-1 lg:flex lg:pt-16">');
    const profileCard = sliceBetween("/* --- Account Hub Card --- */", "const renderQuickActions");

    expect(header.match(/h-11 w-11/g)).toHaveLength(4);
    expect(header).not.toContain("h-10 w-10");
    expect(profileCard).toContain("h-11 w-11");
    expect(profileCard).toContain('aria-label="Open account settings"');
    expect(profileCard).toContain('<Button asChild variant="hero" className="h-12');
    expect(profileCard).toContain('<Button asChild variant="outline" className="h-12');
  });

  it("uses visible, keyboard-focusable quick actions and honest display preferences", () => {
    const quickActions = sliceBetween("/* --- Quick Actions Row --- */", "/* --- Link Row --- */");
    const preferences = sliceBetween("{/* Preferences panel */}", "{/* Shortcuts */}");

    expect(quickActions).toContain("min-h-[4.75rem]");
    expect(quickActions).toContain("border border-border/45 bg-background/80");
    expect(quickActions).toContain("focus-visible:ring-2 focus-visible:ring-ring");
    expect(preferences).toContain('to="/account/preferences#accessibility"');
    expect(preferences).toContain('aria-label="Open display and accessibility preferences"');
    expect(preferences.match(/min-h-\[4\.75rem\]/g)).toHaveLength(3);
    expect(source).not.toContain('href: "#theme-toggle"');
    expect(source).not.toContain("toggleThemePreference");
  });

  it("keeps preferences, shortcut reset, and footer controls touch friendly", () => {
    const preferences = sliceBetween("{/* Preferences panel */}", "{/* Shortcuts */}");
    const shortcuts = sliceBetween("{/* Shortcuts */}", "{/* All Sections OR categorized search results */}");
    const footer = sliceBetween("{/* Footer */}", "{/* Partner Sheet */}");

    expect(preferences).toContain("inline-flex min-h-11 min-w-11");
    expect(preferences).toContain("inline-flex h-11 min-w-11");
    expect(shortcuts).toContain('aria-label="Reset saved shortcuts"');
    expect(shortcuts).toContain("inline-flex min-h-11 min-w-11");
    expect(footer).toContain('aria-label="Open ZIVO support"');
    expect(footer).toContain("flex h-11 w-11");
    expect(footer).toContain("inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg");
    expect(footer).not.toContain('className="text-[11px] font-bold text-muted-foreground/80');
  });

  it("keeps account switching controls at least 44 pixels tall with visible focus", () => {
    const accountAccess = sliceBetween("{/* Account access */}", "{/* Footer */}");

    expect(accountAccess.match(/flex min-h-11 items-center justify-center/g)).toHaveLength(2);
    expect(accountAccess.match(/focus-visible:ring-2 focus-visible:ring-ring/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the floating return control at 44 by 44 pixels", () => {
    const scrollTop = sliceBetween("{/* Scroll-to-top floating button", "{/* Floating Help FAB */}");

    expect(scrollTop).toContain('aria-label="Back to top"');
    expect(scrollTop).toContain("h-11 w-11");
    expect(scrollTop).toContain("focus-visible:ring-2 focus-visible:ring-ring");
  });
});
