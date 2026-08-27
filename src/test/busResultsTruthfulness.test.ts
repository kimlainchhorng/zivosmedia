import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/app/BusBookingPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("bus result truthfulness", () => {
  it("never substitutes fabricated operators, schedules, fares, or seats", () => {
    expect(source).not.toContain("const buildTrips");
    expect(source).not.toContain("occupiedSeats");
    expect(source).not.toContain("Giant Ibis Transport");
    expect(source).not.toContain("Mekong Express");
    expect(source).not.toContain("Vireak Buntham Night");
    expect(source).not.toContain("setTrips(buildTrips");
    expect(source).toContain("real: true;");
    expect(source).toContain("real: true,");
  });

  it("keeps an empty live response distinct from a provider error", () => {
    expect(source).toContain('type BusSearchStatus = "idle" | "loading" | "ready" | "empty" | "error";');
    expect(source).toContain("if (error || !Array.isArray(data))");
    expect(source).toContain('setSearchStatus("error")');
    expect(source).toContain("else if (data.length === 0)");
    expect(source).toContain('setSearchStatus("empty")');
    expect(source).toContain('searchStatus === "error"');
    expect(source).toContain("Bus schedules unavailable");
    expect(source).toContain('searchStatus === "empty"');
    expect(source).toContain("No buses found");
    expect(source.match(/>\s*Retry\s*</g)).toHaveLength(2);
    expect(source.match(/t\("bus\.edit_search"\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("allows only current server rows to open seats or reach confirmation", () => {
    expect(source).toContain(
      "const serverTrip = trips.find((candidate) => candidate.real && candidate.id === trip.id);",
    );
    expect(source).toContain('rpc("get_bus_trip_seats", { p_trip_id: serverTrip.id })');
    expect(source).not.toContain("treat as all available");
    expect(source).toContain("const isCurrentServerTrip = Boolean(");
    expect(source).toContain("if (!isCurrentServerTrip)");
    expect(source).toContain("if (!row?.booking_id || !row.booking_ref)");
    expect(source).toContain('step === "confirmed" && selectedTrip?.real && bookingRef');
    expect(source).not.toContain("Sample-catalog demo confirmation");
    expect(source).not.toContain('t("bus.sample_notice")');
    expect(source).not.toContain('t("bus.total_paid")');
  });
});
