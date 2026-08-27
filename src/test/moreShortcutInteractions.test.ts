import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/pages/MorePage.tsx"), "utf8");
const shortcutsSectionStart = source.indexOf("{/* Shortcuts */}");
const shortcutsStart = source.indexOf("{shortcutLinks.map((link) => {");
const shortcutsEnd = source.indexOf("{/* All Sections OR categorized search results */}", shortcutsStart);
const shortcutsSectionMarkup = source.slice(shortcutsSectionStart, shortcutsEnd);
const shortcutMarkup = source.slice(shortcutsStart, shortcutsEnd);

describe("MorePage shortcut interactions", () => {
  it("keeps shortcut navigation and removal as separate controls", () => {
    expect(shortcutsStart).toBeGreaterThan(-1);
    expect(shortcutsEnd).toBeGreaterThan(shortcutsStart);
    expect(shortcutMarkup).toContain('<div\n                      key={link.href}');
    expect(shortcutMarkup).toContain('aria-label={`Open ${link.label} shortcut, ${sourceLabel}`}');
    expect(shortcutMarkup).toContain('aria-label={`Remove ${link.label} from shortcuts`}');
    expect(shortcutMarkup.indexOf("</Link>")).toBeLessThan(
      shortcutMarkup.indexOf('aria-label={`Remove ${link.label} from shortcuts`}'),
    );
    expect(shortcutMarkup).not.toContain("e.preventDefault()");
    expect(shortcutMarkup).not.toContain("e.stopPropagation()");
  });

  it("keeps the remove action touch-friendly and keyboard visible", () => {
    expect(shortcutMarkup).toContain("h-11 w-11");
    expect(shortcutMarkup).toContain("focus-visible:ring-2 focus-visible:ring-ring");
    expect(shortcutMarkup).toContain("sm:focus-visible:opacity-100");
  });

  it("keeps saved shortcuts readable at phone widths", () => {
    expect(shortcutsSectionStart).toBeGreaterThan(-1);
    expect(shortcutsSectionMarkup).toContain(
      'hasSavedShortcuts ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3"',
    );
  });
});
