import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyLanguageToDocument, KHMER_FONT_WOFF2 } from "@/lib/i18n/languagePreference";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("Khmer webfont CLS + late-apply guard", () => {
  it("keeps Noto on font-display:swap so mid-session language switches still get glyphs", () => {
    const css = read("public/fonts/noto-sans-khmer.css");
    expect(css).not.toMatch(/font-display:\s*optional/);
    expect(css.match(/font-display:\s*swap/g)?.length).toBeGreaterThanOrEqual(9);
  });

  it("prefers the shipped Noto family before any unloaded Battambang name", () => {
    const css = read("src/index.css");
    const start = css.indexOf("/* ── Khmer Language Typography ── */");
    const end = css.indexOf("/* ── end Khmer typography ──");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(block).toContain("'Noto Sans Khmer'");
    expect(block).not.toMatch(/font-family:\s*'Battambang'/);
  });

  it("gates prerendered km first paint via a CSP-safe external script", () => {
    const prerender = read("scripts/seo/prerender-public-home.mjs");
    const gate = read("public/public-khmer-font-gate.js");
    expect(prerender).toContain("zivo-km-font-pending");
    expect(prerender).toContain('rel="preload"');
    expect(prerender).toContain('src="/public-khmer-font-gate.js"');
    // Production CSP is script-src 'self' only — no inline executable bootstrap.
    expect(prerender).not.toMatch(/<script>\s*\(function/);
    expect(gate).toContain("zivo-km-font-pending");
    expect(gate).toContain("document.fonts.load");
  });

  it("preloads the Khmer WOFF2 and warms document.fonts when applying km", () => {
    document.head.innerHTML = "";
    document.documentElement.removeAttribute("lang");
    applyLanguageToDocument("km");
    expect(document.documentElement.getAttribute("lang")).toBe("km");
    expect(document.getElementById("zivo-khmer-font")).toBeTruthy();
    for (const href of KHMER_FONT_WOFF2) {
      const preload = document.head.querySelector(
        `link[rel="preload"][as="font"][href="${href}"]`,
      );
      expect(preload).toBeTruthy();
    }
  });
});
