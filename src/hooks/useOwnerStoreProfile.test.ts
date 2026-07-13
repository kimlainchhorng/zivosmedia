import { describe, expect, it } from "vitest";
import { isLodgingStoreCategory, normalizeStoreCategory } from "./useOwnerStoreProfile";
import { lodgingCategoryFixtures, lodgingNormalizationFixtures, nonLodgingCategoryFixtures } from "@/test/fixtures/lodgingCategoryFixtures";

describe("lodging store category detection", () => {
  it.each(lodgingCategoryFixtures)("detects %s as lodging", (category) => {
    expect(isLodgingStoreCategory(category)).toBe(true);
  });

  it.each(nonLodgingCategoryFixtures)("rejects %s as non-lodging", (category) => {
    expect(isLodgingStoreCategory(category)).toBe(false);
  });

  it.each(lodgingNormalizationFixtures)("normalizes $input", ({ input, expected }) => {
    expect(normalizeStoreCategory(input)).toBe(expected);
  });
});
