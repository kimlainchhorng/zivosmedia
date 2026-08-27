import { describe, expect, it } from "vitest";
import {
  getAuthEntryExitAction,
  getAuthEntryReturnTarget,
} from "./authEntryReturn";

describe("getAuthEntryReturnTarget", () => {
  it("returns hotel checkout entries to the public detail with stay context", () => {
    expect(
      getAuthEntryReturnTarget(
        "/hotel/store-1/book?room=room-1&ci=2026-09-08&co=2026-09-10&adults=2&children=1&currency=KHR",
      ),
    ).toEqual({
      href: "/hotel/store-1?ci=2026-09-08&co=2026-09-10&adults=2&children=1&currency=KHR",
      label: "Back to hotel",
    });
  });

  it("returns car checkout entries to the public car with rental context", () => {
    expect(
      getAuthEntryReturnTarget(
        "/cars/car-1/checkout?pickup=2026-09-08&return=2026-09-10&currency=USD",
      ),
    ).toEqual({
      href: "/cars/car-1?pickup=2026-09-08&return=2026-09-10&currency=USD",
      label: "Back to car",
    });
  });

  it.each([
    ["missing", null],
    ["external", "https://evil.example/phish"],
    ["protocol-relative", "//evil.example/phish"],
    ["backslash authority", "/\\evil.example/phish"],
    ["another protected route", "/wallet"],
    ["an auth route", "/login?redirect=/wallet"],
  ])("falls back to public Home for %s targets", (_label, target) => {
    expect(getAuthEntryReturnTarget(target)).toEqual({
      href: "/",
      label: "Back to Zivo",
    });
  });
});

describe("getAuthEntryExitAction", () => {
  const hotelReturn = getAuthEntryReturnTarget(
    "/hotel/store-1/book?ci=2026-09-08&co=2026-09-10",
  );

  it("uses the real previous entry during an in-app journey", () => {
    expect(
      getAuthEntryExitAction({
        hostKey: "media",
        historyIndex: 2,
        returnTarget: hotelReturn,
      }),
    ).toEqual({ kind: "history", href: null, label: "Back" });
  });

  it("uses the contextual public detail for a direct main-app entry", () => {
    expect(
      getAuthEntryExitAction({
        hostKey: null,
        historyIndex: 0,
        returnTarget: hotelReturn,
      }),
    ).toEqual({
      kind: "internal",
      href: "/hotel/store-1?ci=2026-09-08&co=2026-09-10",
      label: "Back to hotel",
    });
  });

  it("escapes ZIVO Chat to the public network home instead of looping through its host gate", () => {
    expect(
      getAuthEntryExitAction({
        hostKey: "chat",
        historyIndex: 2,
        returnTarget: hotelReturn,
      }),
    ).toEqual({
      kind: "external",
      href: "https://zivosmedia.com/",
      label: "Back to Zivo",
    });
  });

  it("does not open Travel detail routes on unrelated dedicated hosts", () => {
    expect(
      getAuthEntryExitAction({
        hostKey: "software",
        historyIndex: 0,
        returnTarget: hotelReturn,
      }),
    ).toEqual({ kind: "internal", href: "/", label: "Back to Zivo" });
  });
});
