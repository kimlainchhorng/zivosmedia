import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/pages/CreatorGoalsPage.tsx"), "utf8");

describe("CreatorGoalsPage account isolation", () => {
  it("namespaces creator targets by authenticated user", () => {
    expect(source).toMatch(/GOALS_KEY_PREFIX\s*=\s*["']zivo:creator:goals:v1["']/);
    expect(source).toMatch(/goalsStorageKey\(userId: string \| null\)/);
    expect(source).toMatch(/return userId \? `\$\{GOALS_KEY_PREFIX\}:\$\{userId\}` : null/);
    expect(source).toMatch(/loadGoals\(userId\)/);
    expect(source).toMatch(/saveGoals\(next, userId\)/);
    expect(source).toMatch(/goalState\.userId === userId/);
    expect(source).toMatch(/if \(!key \|\| typeof window === "undefined"\) return/);
    expect(source).not.toMatch(/localStorage\.(?:getItem|setItem)\(GOALS_KEY\)/);
  });
});
