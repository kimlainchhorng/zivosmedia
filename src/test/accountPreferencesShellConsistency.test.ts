import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/account/PreferencesPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("Account Preferences shell consistency", () => {
  it("renders one app page instead of a viewport-height page around every card", () => {
    expect(source.match(/<SEOHead/g)).toHaveLength(1);
    expect(source).toContain("const PreferenceSection");
    expect(source).not.toContain("const Section3D");
    expect(source).not.toContain('className="min-h-screen');
    expect(source).not.toContain("h-screen overflow-y-auto");
    expect(source).toContain('id="main-content"');
    expect(source).toContain("max-w-2xl");
  });

  it("keeps the header visible and clear of both native and desktop app chrome", () => {
    expect(source).toContain("zivo-pt-safe-sticky sticky top-0 z-40");
    expect(source).toContain('!isTravelHost && "lg:pt-[83px]"');
    expect(source).toContain('!isTravelHost && "lg:top-[83px]"');
    expect(source).toContain("pb-[calc(var(--zivo-safe-bottom,0px)+8.5rem)]");
    expect(source).toContain('aria-label="Go back"');
    expect(source).toContain("h-11 w-11");
  });

  it("returns through app history with an Account hub fallback", () => {
    expect(source).toContain("window.history.state?.idx");
    expect(source).toContain("navigate(-1)");
    expect(source).toContain('navigate("/more", { replace: true })');
    expect(source).toContain("onClick={handleBack}");
  });

  it("aligns hash-linked sections below the sticky header without forcing motion", () => {
    expect(source).toContain('id="accessibility" className={hashTargetClassName}');
    expect(source).toContain('id="translation" className={hashTargetClassName}');
    expect(source).toContain("scroll-mt-[calc(var(--zivo-safe-top-sticky)_+_4rem)]");
    expect(source).toContain('"lg:scroll-mt-[155px]"');
    expect(source).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches');
    expect(source).toContain('behavior: prefersReducedMotion ? "auto" : "smooth"');
    expect(source).toContain("[a11yPrefs.reducedMotion, activeLanguages.length]");
  });

  it("keeps selection and switch controls named, stateful, and touch friendly", () => {
    expect(source).toContain('role="switch"');
    expect(source).toContain("aria-checked={checked}");
    expect(source).toContain("className=\"flex h-11 w-14");
    expect(source.match(/<PreferenceSwitch/g)).toHaveLength(6);
    expect(source.match(/aria-pressed=/g)?.length).toBeGreaterThanOrEqual(7);
    expect(source).toContain('role="group"');
    expect(source).toContain('aria-label="Language choices"');
    expect(source).toContain('aria-label="Currency choices"');
  });
});
