import { describe, expect, it } from "vitest";

import {
  applyRideLaunchState,
  canonicalRidePath,
  deriveCanonicalRideFramePath,
  getRideNavigationPath,
  isRideManageAccountRequest,
  sanitizeCanonicalRidePath,
  updateCanonicalRideHostPath,
} from "./canonicalRideLaunch";
import { getOrCreateRideEmbedSession } from "./rideEmbedSession";

describe("canonical Ride launch contract", () => {
  it("maps the shared multi-stop route into the standalone app", () => {
    const tripId = "550e8400-e29b-41d4-a716-446655440000";
    expect(canonicalRidePath("/rides/multi-stop")).toBe("/multi-stop");
    expect(canonicalRidePath(`/rides/track/${tripId}`)).toBe(`/tracking/${tripId}`);
    expect(canonicalRidePath("/rides/track/not-a-trip")).toBe("/");
    expect(canonicalRidePath("/ride-quotes")).toBe("/history");
    expect(canonicalRidePath("/rides/hub")).toBe("/");
    expect(canonicalRidePath("/rides/hub", "?tab=history")).toBe("/history");
    expect(canonicalRidePath("/rides/hub", `?tab=tracking&trip_id=${tripId}`)).toBe(`/tracking/${tripId}`);
    expect(canonicalRidePath("/rides/hub", `?tab=rate&trip_id=${tripId}`)).toBe(`/rate/${tripId}`);
    expect(canonicalRidePath("/rides/hub", "?tab=reserve")).toBe("/");
    expect(canonicalRidePath("/app/request-ride")).toBe("/");
  });

  it("promotes supported React Router state into iframe-safe parameters", () => {
    const params = applyRideLaunchState(new URLSearchParams(), {
      initialDestinationAddress: "Central Market",
      vehicleType: "Comfort",
      preferredDriverId: "not-forwarded",
    });

    expect(params.get("destination")).toBe("Central Market");
    expect(params.get("vehicle")).toBe("comfort");
    expect(params.has("preferredDriverId")).toBe(false);
  });

  it("does not override URL intent or forward unsupported vehicle classes", () => {
    const params = applyRideLaunchState(new URLSearchParams("destination=Airport"), {
      initialDestinationAddress: "Market",
      vehicleType: "spaceship",
    });

    expect(params.get("destination")).toBe("Airport");
    expect(params.has("vehicle")).toBe(false);
  });

  it("accepts only allowlisted refresh paths and removes unrelated query data", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(sanitizeCanonicalRidePath("/delivery?token=secret#private")).toBe("/delivery");
    expect(sanitizeCanonicalRidePath("/tracking?token=secret#private")).toBe("/tracking");
    expect(sanitizeCanonicalRidePath(`/tracking/${id}?multi=Market%7CAirport&token=secret`))
      .toBe(`/tracking/${id}?multi=Market%7CAirport`);
    expect(sanitizeCanonicalRidePath(`/receipt/${id}?token=secret`))
      .toBe(`/receipt/${id}`);
    expect(sanitizeCanonicalRidePath("//evil.example/tracking/x")).toBeNull();
    expect(sanitizeCanonicalRidePath("/admin")).toBeNull();
  });

  it("mirrors canonical Ride UUIDv7 and confirmed-coordinate routes", () => {
    const v7Id = "018f0c7e-7000-7000-8000-000000000001";

    expect(sanitizeCanonicalRidePath(
      `/tracking/${v7Id}?multi=Market%7CAirport&multiCoords=11.56%2C104.92&token=secret`,
    )).toBe(
      `/tracking/${v7Id}?multi=Market%7CAirport&multiCoords=11.56%2C104.92`,
    );
    expect(sanitizeCanonicalRidePath(`/receipt/${v7Id}`)).toBe(`/receipt/${v7Id}`);
    expect(sanitizeCanonicalRidePath(`/rate/${v7Id}`)).toBe(`/rate/${v7Id}`);
    expect(sanitizeCanonicalRidePath(`/rate-restaurant/${v7Id}`))
      .toBe(`/rate-restaurant/${v7Id}`);
    expect(sanitizeCanonicalRidePath(
      "/multi-stop?from=Home&fromLat=11.56&fromLng=104.92&stops=Office&stopCoords=11.57%2C104.93",
    )).toBe(
      "/multi-stop?from=Home&fromLat=11.56&fromLng=104.92&stops=Office&stopCoords=11.57%2C104.93",
    );
    expect(sanitizeCanonicalRidePath(
      "/?pickup=Home&multi=Office&multiCoords=11.57%2C104.93&token=secret",
    )).toBe("/?pickup=Home&multi=Office&multiCoords=11.57%2C104.93");

    expect(sanitizeCanonicalRidePath(
      "/tracking/018f0c7e-7000-6000-8000-000000000001",
    )).toBeNull();
    expect(sanitizeCanonicalRidePath(
      "/tracking/018f0c7e-7000-7000-c000-000000000001",
    )).toBeNull();
  });

  it("requires the exact child navigation message type", () => {
    expect(getRideNavigationPath({ type: "zivo-ride:navigate", path: "/history" })).toBe("/history");
    expect(getRideNavigationPath({ type: "other", path: "/history" })).toBeNull();
  });

  it("accepts account management only from the current parent-session generation", () => {
    const current = "a".repeat(32);
    expect(isRideManageAccountRequest({
      type: "zivo-ride:manage-account",
      embed_session: current,
    }, current)).toBe(true);
    expect(isRideManageAccountRequest({
      type: "zivo-ride:manage-account",
      embed_session: "b".repeat(32),
    }, current)).toBe(false);
    expect(isRideManageAccountRequest({
      type: "zivo-ride:navigate",
      embed_session: current,
    }, current)).toBe(false);
    expect(isRideManageAccountRequest(null, current)).toBe(false);
    expect(isRideManageAccountRequest({
      type: "zivo-ride:manage-account",
      embed_session: current,
    }, null)).toBe(false);
  });

  it("keeps ride_path authoritative and canonicalizes duplicate launch values", () => {
    expect(
      deriveCanonicalRideFramePath(
        "/rides/multi-stop",
        "?from=Outer&stops=OuterStop&ride_path=%2Fmulti-stop%3Ffrom%3DHome%26stops%3DOffice%257CMarket",
      ),
    ).toBe("/multi-stop?from=Home&stops=Office%7CMarket");
    expect(sanitizeCanonicalRidePath("/multi-stop?from=Home&from=Duplicate&stops=Office"))
      .toBe("/multi-stop?from=Home&stops=Office");
  });

  it("preserves an authenticated receipt path across an embedded refresh", () => {
    const tripId = "550e8400-e29b-41d4-a716-446655440000";
    const hostPath = updateCanonicalRideHostPath(
      "https://zivosmedia.com/rides/hub",
      `/receipt/${tripId}`,
    );

    expect(hostPath).toBe(`/rides/hub?ride_path=%2Freceipt%2F${tripId}`);
    const refreshed = new URL(hostPath!, "https://zivosmedia.com");
    expect(deriveCanonicalRideFramePath(refreshed.pathname, refreshed.search))
      .toBe(`/receipt/${tripId}`);
  });

  it("preserves primary Ride dock routes across an embedded refresh", () => {
    for (const childPath of ["/delivery", "/tracking"]) {
      const hostPath = updateCanonicalRideHostPath(
        "https://zivosmedia.com/rides/hub?token=secret#private",
        childPath,
      );

      expect(hostPath).toBe(`/rides/hub?ride_path=${encodeURIComponent(childPath)}`);
      const refreshed = new URL(hostPath!, "https://zivosmedia.com");
      expect(deriveCanonicalRideFramePath(refreshed.pathname, refreshed.search))
        .toBe(childPath);
    }
  });

  it("preserves a multi-stop to root-booking transition across refresh", () => {
    const childPath = "/?pickup=Home&destination=Office&multi=Market";
    const hostPath = updateCanonicalRideHostPath(
      "https://zivosmedia.com/rides/multi-stop?from=Home&stops=Office%7CMarket",
      childPath,
    );

    expect(hostPath).toBe(
      "/rides/multi-stop?ride_path=%2F%3Fpickup%3DHome%26destination%3DOffice%26multi%3DMarket",
    );
    const refreshed = new URL(hostPath!, "https://zivosmedia.com");
    expect(deriveCanonicalRideFramePath(refreshed.pathname, refreshed.search)).toBe(childPath);
  });

  it("keeps host defaults route-specific and idempotent", () => {
    const tripId = "550e8400-e29b-41d4-a716-446655440000";
    expect(updateCanonicalRideHostPath(
      "https://zivosmedia.com/rides/hub?ride_path=%2Fhistory",
      "/?destination=Airport",
    )).toBe("/rides/hub?destination=Airport");
    expect(updateCanonicalRideHostPath(
      "https://zivosmedia.com/rides/multi-stop?ride_path=%2Fhistory",
      "/multi-stop?from=Home&stops=Office",
    )).toBe("/rides/multi-stop?from=Home&stops=Office");
    expect(deriveCanonicalRideFramePath(
      `/rides/track/${tripId}`,
      "?multi=Market%7CAirport&token=secret",
    )).toBe(`/tracking/${tripId}?multi=Market%7CAirport`);
    expect(deriveCanonicalRideFramePath("/ride-quotes", "?token=secret")).toBe("/history");
    expect(deriveCanonicalRideFramePath("/rides/hub", "?tab=history&destination=Airport")).toBe("/history");
    expect(deriveCanonicalRideFramePath(
      "/rides/hub",
      `?tab=tracking&trip_id=${tripId}&token=secret`,
    )).toBe(`/tracking/${tripId}`);
    expect(deriveCanonicalRideFramePath(
      "/rides/hub",
      `?tab=rate&trip_id=${tripId}&token=secret`,
    )).toBe(`/rate/${tripId}`);
    expect(deriveCanonicalRideFramePath("/rides/hub", "?tab=tracking")).toBe("/");
    expect(deriveCanonicalRideFramePath("/rides/hub", "?tab=reserve")).toBe("/");
  });

  it("strips unsupported host query and hash state from iframe return URLs", () => {
    const tripId = "550e8400-e29b-41d4-a716-446655440000";

    expect(updateCanonicalRideHostPath(
      `https://zivosmedia.com/rides/track/${tripId}?token=secret&multi=Market%7CAirport#private`,
      `/tracking/${tripId}?multi=Market%7CAirport&token=secret#private`,
    )).toBe(`/rides/track/${tripId}?multi=Market%7CAirport`);
    expect(updateCanonicalRideHostPath(
      "https://zivosmedia.com/rides/hub?tab=history&token=secret#private",
      "/history",
    )).toBe("/rides/hub?ride_path=%2Fhistory");
    expect(updateCanonicalRideHostPath(
      `https://zivosmedia.com/rides/hub?tab=tracking&trip_id=${tripId}&token=secret#private`,
      `/tracking/${tripId}`,
    )).toBe(`/rides/hub?ride_path=%2Ftracking%2F${tripId}`);
  });

  it("keeps one opaque embed session per parent user and rotates on account switch", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const tokens = ["a".repeat(32), "b".repeat(32)];

    const first = getOrCreateRideEmbedSession("user-a", storage, () => tokens.shift()!);
    const sameUser = getOrCreateRideEmbedSession("user-a", storage, () => "c".repeat(32));
    const nextUser = getOrCreateRideEmbedSession("user-b", storage, () => tokens.shift()!);

    expect(first).toBe("a".repeat(32));
    expect(sameUser).toBe(first);
    expect(nextUser).toBe("b".repeat(32));
  });
});
