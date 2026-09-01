import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("wellness account isolation", () => {
  it("waits for an authenticated identity before mounting persisted wellness state", () => {
    const wellness = source("src/pages/WellnessPage.tsx");
    const nutrition = source("src/pages/NutritionPage.tsx");

    expect(wellness).toContain(
      'const { user, isLoading: authLoading } = useAuth();',
    );
    expect(wellness).toContain('key={user?.id ?? "auth-pending"}');
    expect(wellness).toContain("authLoading || !user");

    expect(nutrition).toContain(
      'const { user, isLoading: authLoading } = useAuth();',
    );
    expect(nutrition).toContain(
      "if (authLoading || !userId || loadedUserId !== userId)",
    );
  });

  it("scopes every health and nutrition storage family to the active user", () => {
    const wellness = source("src/pages/WellnessPage.tsx");
    const nutrition = source("src/pages/NutritionPage.tsx");

    expect(wellness).toContain(
      "`${WELLNESS_STORAGE_PREFIX}:${userId}:${suffix}`",
    );
    expect(wellness).toContain("function loadDay(userId: string)");
    expect(wellness).toContain(
      'wellnessStorageKey(userId, "medications")',
    );
    expect(wellness).toContain(
      'wellnessStorageKey(userId, "mindfulness:streak")',
    );
    expect(wellness).toContain('wellnessStorageKey(userId, "goals")');

    expect(nutrition).toContain(
      "`${NUTRITION_STORAGE_PREFIX}:${userId}:${suffix}`",
    );
    expect(nutrition).toContain(
      'nutritionStorageKey(userId, "entries")',
    );
    expect(nutrition).toContain(
      'nutritionStorageKey(userId, "water")',
    );
  });

  it("does not import legacy global health data into a signed-in account", () => {
    const wellness = source("src/pages/WellnessPage.tsx");
    const nutrition = source("src/pages/NutritionPage.tsx");

    for (const legacyKey of [
      "wellness_day_",
      "wellness_mindfulness_streak",
      "wellness_mindfulness_",
      'localStorage.getItem("wellness_meds")',
      'localStorage.setItem("wellness_meds")',
      "wellness_meds_taken_",
      'localStorage.getItem("wellness_goals")',
      'localStorage.setItem("wellness_goals")',
    ]) {
      expect(wellness).not.toContain(legacyKey);
    }

    expect(nutrition).not.toContain('"zivo:nutrition:v1"');
    expect(nutrition).not.toContain('"zivo:nutrition:water:v1"');
  });
});
