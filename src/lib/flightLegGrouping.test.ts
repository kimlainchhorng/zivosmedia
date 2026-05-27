/**
 * Tests for the segment-splitting + sort-key helpers used by the
 * round-trip leg picker. groupByOutbound / groupByReturn rely on
 * splitSegments to find the leg boundary, so a regression here breaks
 * "select outbound → then return" navigation for every round-trip
 * search. getLegDurationMinutes is used as the sort key when ranking
 * legs by duration.
 *
 * groupByOutbound / groupByReturn need a richer DuffelOffer mock
 * (fareVariants, baggageDetails, conditions) and are out of scope here.
 */
import { describe, it, expect } from "vitest";
import { splitSegments, getLegDurationMinutes } from "./flightLegGrouping";
import type { DuffelSegment } from "@/hooks/useDuffelFlights";
import type { LegGroup } from "@/components/flight/FlightLegCard";

function makeSeg(origin: string, destination: string, opts: Partial<DuffelSegment> = {}): DuffelSegment {
  return {
    id: `${origin}-${destination}`,
    departingAt: "2026-08-15T10:00:00Z",
    arrivingAt: "2026-08-15T15:00:00Z",
    origin: { code: origin, name: origin, city: origin },
    destination: { code: destination, name: destination, city: destination },
    operatingCarrier: "DL", operatingCarrierCode: "DL",
    marketingCarrier: "DL", marketingCarrierCode: "DL",
    flightNumber: "100", aircraft: "320", duration: "5h",
    cabinClass: "economy",
    ...opts,
  };
}

describe("splitSegments", () => {
  it("returns empty outbound and no return for an empty segments array", () => {
    expect(splitSegments([], "LAX")).toEqual({ outbound: [], returnSegs: [] });
  });

  it("returns outbound + no return when destCode is missing", () => {
    const segs = [makeSeg("JFK", "LAX")];
    expect(splitSegments(segs, "")).toEqual({ outbound: segs, returnSegs: [] });
  });

  it("returns all segs as outbound when no segment originates at destCode", () => {
    const segs = [makeSeg("JFK", "ATL"), makeSeg("ATL", "DFW")];
    expect(splitSegments(segs, "LAX")).toEqual({ outbound: segs, returnSegs: [] });
  });

  it("splits at the first segment whose origin == destCode (uppercase)", () => {
    // JFK → LAX, LAX → JFK  → outbound is the first hop, return is the second.
    const segs = [makeSeg("JFK", "LAX"), makeSeg("LAX", "JFK")];
    const { outbound, returnSegs } = splitSegments(segs, "LAX");
    expect(outbound).toEqual([segs[0]]);
    expect(returnSegs).toEqual([segs[1]]);
  });

  it("is case-insensitive for destCode (matches even when input is lowercase)", () => {
    const segs = [makeSeg("JFK", "LAX"), makeSeg("LAX", "JFK")];
    expect(splitSegments(segs, "lax").returnSegs).toEqual([segs[1]]);
  });

  it("does not split at index 0 (the boundary must be > 0)", () => {
    // Pathological: first segment already departs the destination. The
    // function should NOT split here — it'd produce an empty outbound.
    const segs = [makeSeg("LAX", "JFK"), makeSeg("JFK", "LAX")];
    const { outbound, returnSegs } = splitSegments(segs, "LAX");
    expect(returnSegs).toEqual([]);
    expect(outbound).toEqual(segs);
  });

  it("handles multi-stop outbound + multi-stop return", () => {
    // JFK → ATL → LAX, LAX → DFW → JFK
    const segs = [
      makeSeg("JFK", "ATL"),
      makeSeg("ATL", "LAX"),
      makeSeg("LAX", "DFW"),
      makeSeg("DFW", "JFK"),
    ];
    const { outbound, returnSegs } = splitSegments(segs, "LAX");
    expect(outbound).toHaveLength(2);
    expect(outbound[0].origin.code).toBe("JFK");
    expect(outbound[1].destination.code).toBe("LAX");
    expect(returnSegs).toHaveLength(2);
    expect(returnSegs[0].origin.code).toBe("LAX");
    expect(returnSegs[returnSegs.length - 1].destination.code).toBe("JFK");
  });
});

describe("getLegDurationMinutes", () => {
  // Use a partial cast — only summary.duration is consulted.
  const grp = (duration: string): LegGroup =>
    ({ summary: { duration } as LegGroup["summary"] }) as LegGroup;

  it("parses '2h 30m' style strings", () => {
    expect(getLegDurationMinutes(grp("2h 30m"))).toBe(150);
    expect(getLegDurationMinutes(grp("0h 45m"))).toBe(45);
    expect(getLegDurationMinutes(grp("12h 0m"))).toBe(720);
  });

  it("tolerates extra whitespace between the hour and minute tokens", () => {
    expect(getLegDurationMinutes(grp("1h   05m"))).toBe(65);
  });

  it("returns 9999 sentinel for unparseable / em-dash duration so legs sort last", () => {
    expect(getLegDurationMinutes(grp("—"))).toBe(9999);
    expect(getLegDurationMinutes(grp(""))).toBe(9999);
    expect(getLegDurationMinutes(grp("garbage"))).toBe(9999);
  });
});
