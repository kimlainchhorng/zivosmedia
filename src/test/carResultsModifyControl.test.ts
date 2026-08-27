import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/CarResultsPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("car rental results modify control", () => {
  it("keeps its label and minimum touch target visible at phone widths", () => {
    expect(source).toContain('aria-label="Modify rental search"');
    expect(source).toContain("min-h-11 min-w-11");
    expect(source).toContain("<span>Modify</span>");
    expect(source).not.toContain('hidden sm:inline">Modify');
  });
});
