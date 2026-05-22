import { describe, expect, it } from "vitest";
import { buildStoreTabUrl, getTabFromSearch, isAutoRepairTab, isLodgingTab, resolveStoreTab, resolveStoreTabFromSearch } from "./storeTabRouting";
import { tabQueryFixtures, validAutoRepairTabFixtures, validBaseTabFixtures, validLodgingTabFixtures } from "@/test/fixtures/lodgingTabFixtures";

describe("store tab routing", () => {
  it("accepts valid lodging deep links for lodging stores", () => {
    validLodgingTabFixtures.forEach((tab) => expect(resolveStoreTab(tab, true)).toBe(tab));
    validLodgingTabFixtures.forEach((tab) => expect(isLodgingTab(tab)).toBe(true));
  });

  it("accepts valid base store tabs", () => {
    validBaseTabFixtures.forEach((tab) => expect(resolveStoreTab(tab, true)).toBe(tab));
  });

  it("accepts valid auto repair deep links only for auto repair stores", () => {
    validAutoRepairTabFixtures.forEach((tab) => expect(resolveStoreTab(tab, false, true)).toBe(tab));
    validAutoRepairTabFixtures.forEach((tab) => expect(isAutoRepairTab(tab)).toBe(true));
    expect(resolveStoreTab("ar-vehicles", false, false)).toBe("profile");
  });

  it("falls invalid lodging-store tabs back to overview", () => {
    expect(resolveStoreTab("bad-tab", true)).toBe("lodge-overview");
  });

  it("prevents lodging tabs on non-lodging stores", () => {
    expect(resolveStoreTab("lodge-overview", false)).toBe("profile");
  });

  it("defaults missing tabs safely", () => {
    expect(resolveStoreTab(null, true)).toBe("lodge-overview");
    expect(resolveStoreTab(null, false, true)).toBe("ar-dashboard");
    expect(resolveStoreTab(undefined, false)).toBe("profile");
  });

  it.each(tabQueryFixtures)("resolves query string $search", ({ search, lodging, autoRepair, expected }) => {
    expect(resolveStoreTabFromSearch(search, lodging, autoRepair)).toBe(expected);
  });

  it("parses tab query strings and builds URLs", () => {
    expect(getTabFromSearch("?tab=lodge-overview&x=1")).toBe("lodge-overview");
    expect(buildStoreTabUrl("store 1", "lodge-addons")).toBe("/admin/stores/store%201?tab=lodge-addons");
  });
});
