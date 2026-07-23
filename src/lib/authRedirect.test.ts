import { describe, expect, it } from "vitest";
import { getSafeRedirectTargetForHost, isExternalRedirectTarget, withProductContext } from "./authRedirect";

describe("auth redirect safety", () => {
  it("allows zivosmedia.com to return to zivosoftware.com", () => {
    expect(
      getSafeRedirectTargetForHost(
        "https://zivosoftware.com/login?connected=zivosmedia",
        "zivosmedia.com",
      ),
    ).toBe("https://zivosoftware.com/login?connected=zivosmedia");
  });

  it("allows zivosoftware.com to send users to zivosmedia.com", () => {
    expect(
      getSafeRedirectTargetForHost(
        "https://zivosmedia.com/login?redirect=https%3A%2F%2Fzivosoftware.com%2Flogin",
        "zivosoftware.com",
      ),
    ).toBe("https://zivosmedia.com/login?redirect=https%3A%2F%2Fzivosoftware.com%2Flogin");
  });

  it("resolves zivosoftware.com business redirects through the tenant-aware setup route", () => {
    expect(getSafeRedirectTargetForHost("/business", "zivosoftware.com")).toBe(
      "/business/new",
    );
    expect(getSafeRedirectTargetForHost("/business/dashboard", "zivosoftware.com")).toBe(
      "/business/new",
    );
  });

  it("rewrites the legacy ZIVO Media auto repair dashboard back to zivosoftware.com", () => {
    const dashboardUrl =
      "https://zivosmedia.com/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair";

    expect(getSafeRedirectTargetForHost(dashboardUrl, "zivosoftware.com")).toBe(
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
    );
  });

  it("keeps zivoschat.com auth redirects on the chat surface", () => {
    expect(
      getSafeRedirectTargetForHost(
        null,
        "zivoschat.com",
      ),
    ).toBe("/chat");
    expect(
      getSafeRedirectTargetForHost(
        "/login?redirect=/account",
        "zivoschat.com",
      ),
    ).toBe("/chat");
    expect(
      getSafeRedirectTargetForHost(
        "https://zivosmedia.com/login?redirect=https%3A%2F%2Fzivoschat.com%2Fchat",
        "zivoschat.com",
      ),
    ).toBe("/chat");
    expect(
      getSafeRedirectTargetForHost(
        "https://zivoschat.com/chat",
        "zivosmedia.com",
      ),
    ).toBe("https://zivoschat.com/chat");
  });

  it("keeps zivodriver.com auth redirects on the driver surface", () => {
    expect(
      getSafeRedirectTargetForHost(
        null,
        "zivodriver.com",
      ),
    ).toBe("/");
    expect(
      getSafeRedirectTargetForHost(
        "/login?redirect=/driver",
        "zivodriver.com",
      ),
    ).toBe("/");
    expect(
      getSafeRedirectTargetForHost(
        "https://zivosmedia.com/login?redirect=https%3A%2F%2Fzivodriver.com%2Fdriver",
        "zivodriver.com",
      ),
    ).toBe("/");
    expect(
      getSafeRedirectTargetForHost(
        "https://zivodriver.com/driver",
        "zivosmedia.com",
      ),
    ).toBe("https://zivodriver.com/driver");
  });

  it("allows zivosmedia.com to return users to zivostravel.com", () => {
    expect(
      getSafeRedirectTargetForHost(
        "https://zivostravel.com/trips?source=zivosmedia",
        "zivosmedia.com",
      ),
    ).toBe("https://zivostravel.com/trips?source=zivosmedia");
  });

  it("allows zivostravel.com to send users to zivosmedia.com", () => {
    expect(
      getSafeRedirectTargetForHost("https://zivosmedia.com/account", "zivostravel.com"),
    ).toBe("https://zivosmedia.com/account");
  });

  it("falls back to travel home when no redirect is given on the travel host", () => {
    expect(getSafeRedirectTargetForHost(null, "zivostravel.com")).toBe("/");
  });

  it("blocks non-ZIVO external redirects", () => {
    expect(
      getSafeRedirectTargetForHost("https://example.com/phish", "zivosmedia.com"),
    ).toBe("/");
  });

  it("blocks protocol-relative and backslash-authority redirects", () => {
    // "//evil.com" and the backslash variants all parse to host evil.com once the
    // browser normalizes them, so the sanitizer must reject them like any off-origin URL.
    expect(getSafeRedirectTargetForHost("//evil.com", "zivosmedia.com")).toBe("/");
    expect(getSafeRedirectTargetForHost("/\\evil.com", "zivosmedia.com")).toBe("/");
    expect(getSafeRedirectTargetForHost("/\\/evil.com", "zivosmedia.com")).toBe("/");
    // A backslash mid-path is same-origin (normalizes to "/foo/bar"), so it stays allowed.
    expect(getSafeRedirectTargetForHost("/foo\\bar", "zivosmedia.com")).toBe("/foo\\bar");
  });

  it("normalizes same-host absolute URLs to internal paths", () => {
    expect(
      getSafeRedirectTargetForHost("https://zivosmedia.com/account?tab=security", "zivosmedia.com"),
    ).toBe("/account?tab=security");
  });

  it("blocks internal auth-route loops", () => {
    expect(getSafeRedirectTargetForHost("/login?redirect=/account", "zivosmedia.com")).toBe("/");
  });

  it("normalizes canonical Ride redirects before adding them to login URLs", () => {
    const tripId = "550e8400-e29b-41d4-a716-446655440000";

    expect(
      getSafeRedirectTargetForHost(
        `/rides/track/${tripId}?token=secret&multi=Market%7CAirport#private`,
        "zivosmedia.com",
      ),
    ).toBe(`/rides/track/${tripId}?multi=Market%7CAirport`);
    expect(getSafeRedirectTargetForHost("/ride-quotes?token=secret#private", "zivosmedia.com"))
      .toBe("/ride-quotes");
    expect(getSafeRedirectTargetForHost("/rides/hub?destination=Airport&token=secret#private", "zivosmedia.com"))
      .toBe("/rides/hub?destination=Airport");
    expect(getSafeRedirectTargetForHost("/rides/hub?tab=history&token=secret#private", "zivosmedia.com"))
      .toBe("/rides/hub?ride_path=%2Fhistory");
    expect(getSafeRedirectTargetForHost(
      `/rides/hub?tab=tracking&trip_id=${tripId}&token=secret#private`,
      "zivosmedia.com",
    )).toBe(`/rides/hub?ride_path=%2Ftracking%2F${tripId}`);
    expect(getSafeRedirectTargetForHost(
      `/rides/hub?tab=rate&trip_id=${tripId}&token=secret#private`,
      "zivosmedia.com",
    )).toBe(`/rides/hub?ride_path=%2Frate%2F${tripId}`);
    expect(getSafeRedirectTargetForHost("/rides/hub?tab=reserve&token=secret#private", "zivosmedia.com"))
      .toBe("/rides/hub");
  });

  it("detects external redirect targets", () => {
    expect(isExternalRedirectTarget("https://zivosoftware.com/login")).toBe(true);
    expect(isExternalRedirectTarget("/account")).toBe(false);
  });
});

describe("product context preservation", () => {
  it("appends product and intent to an internal target", () => {
    expect(withProductContext("/trips", "travel", "booking")).toBe(
      "/trips?product=travel&intent=booking",
    );
  });

  it("appends to an absolute trusted target without dropping existing query", () => {
    expect(
      withProductContext("https://zivostravel.com/trips?source=zivosmedia", "travel", "booking"),
    ).toBe("https://zivostravel.com/trips?source=zivosmedia&product=travel&intent=booking");
  });

  it("returns the target unchanged when no context is present", () => {
    expect(withProductContext("/trips", null, null)).toBe("/trips");
  });

  it("does not overwrite an existing product param", () => {
    expect(withProductContext("/trips?product=existing", "travel", null)).toBe(
      "/trips?product=existing",
    );
  });
});
