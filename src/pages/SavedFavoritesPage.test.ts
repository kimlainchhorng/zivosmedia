import { readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.resolve(process.cwd(), "src/pages/SavedFavoritesPage.tsx"), "utf8");

function countNestedButtons(node: unknown, insideButton = false): number {
  if (!node || typeof node !== "object") return 0;
  if (Array.isArray(node)) return node.reduce((count, child) => count + countNestedButtons(child, insideButton), 0);

  const candidate = node as Record<string, unknown>;
  const openingElement = candidate.openingElement as Record<string, unknown> | undefined;
  const name = openingElement?.name as Record<string, unknown> | undefined;
  const isButton = candidate.type === "JSXElement" && name?.type === "JSXIdentifier" && name.name === "button";
  const nestedButton = isButton && insideButton ? 1 : 0;
  const nextInsideButton = insideButton || isButton;

  return nestedButton + Object.entries(candidate).reduce((count, [key, value]) => {
    if (key === "loc" || key === "start" || key === "end") return count;
    return count + countNestedButtons(value, nextInsideButton);
  }, 0);
}

describe("SavedFavoritesPage markup", () => {
  it("keeps card navigation and remove actions as independent buttons", () => {
    const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });

    expect(countNestedButtons(ast)).toBe(0);
  });
});
