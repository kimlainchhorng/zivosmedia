import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("Khmer webfont CLS guard", () => {
  it("keeps Noto Sans Khmer on font-display:optional to avoid late-swap CLS", () => {
    const css = read("public/fonts/noto-sans-khmer.css");
    expect(css).not.toMatch(/font-display:\s*swap/);
    expect(css.match(/font-display:\s*optional/g)?.length).toBeGreaterThanOrEqual(9);
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
});
