import { describe, expect, it } from "vitest";
import { getZivoMobileNavActiveTab } from "@/lib/zivoMobileNavActiveTab";

describe("Zivo Travel mobile Home navigation", () => {
  it.each(["/", "/zivo-travel", "/zivo-travel/"])(
    "selects Home only on the Travel front door at %s",
    (path) => {
      expect(getZivoMobileNavActiveTab(path, true)).toBe("home");
    },
  );

  it.each([
    "/flights",
    "/hotels-list",
    "/hotel/property-id",
    "/cars",
    "/bus",
    "/travel/checkout",
  ])("keeps Home actionable on the Travel browsing page %s", (path) => {
    expect(getZivoMobileNavActiveTab(path, true)).toBeNull();
  });

  it.each([
    ["/my-trips", "trips"],
    ["/zivo-travel/my-trips", "trips"],
    ["/wallet", "wallet"],
    ["/zivo-travel/wallet", "wallet"],
    ["/payment-methods", "cards"],
    ["/zivo-travel/payment-methods", "cards"],
    ["/account", "account"],
    ["/zivo-travel/account", "account"],
  ])("preserves the Travel utility selection at %s", (path, expected) => {
    expect(getZivoMobileNavActiveTab(path, true)).toBe(expected);
  });

  it("preserves the non-Travel fallback behavior", () => {
    expect(getZivoMobileNavActiveTab("/support", false)).toBe("home");
    expect(getZivoMobileNavActiveTab("/more", false)).toBe("account");
  });
});
