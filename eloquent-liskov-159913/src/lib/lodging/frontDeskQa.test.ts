import { describe, expect, it } from "vitest";
import { FRONT_DESK_EMPTY_ACTIONS } from "@/components/admin/store/lodging/LodgingNeedsSetupEmptyState";
import { getFrontDeskOperationalStats, runFrontDeskQa } from "./frontDeskQa";

describe("front desk QA helpers", () => {
  it("maps Front Desk empty states to exact setup tabs", () => {
    expect(FRONT_DESK_EMPTY_ACTIONS.arrivals.primary.tab).toBe("lodge-reservations");
    expect(FRONT_DESK_EMPTY_ACTIONS.arrivals.secondary.tab).toBe("lodge-rooms");
    expect(FRONT_DESK_EMPTY_ACTIONS.inHouse.secondary.tab).toBe("lodge-rate-plans");
    expect(FRONT_DESK_EMPTY_ACTIONS.departures.secondary.tab).toBe("lodge-guest-requests");
  });

  it("computes live operating stats from reservation data", () => {
    const stats = getFrontDeskOperationalStats([
      { check_in: "2026-04-24", check_out: "2026-04-26", status: "confirmed" },
      { check_in: "2026-04-22", check_out: "2026-04-25", status: "checked_in" },
      { check_in: "2026-04-20", check_out: "2026-04-24", status: "checked_in" },
      { check_in: "2026-04-24", check_out: "2026-04-25", status: "cancelled" },
    ], 2, "2026-04-24");
    expect(stats).toEqual({ arrivals: 1, inHouse: 1, departures: 1, activeReservations: 3, openGuestRequests: 2 });
  });

  it("separates missing data as setup warnings, not system failures", () => {
    const checks = runFrontDeskQa({ storeId: "store-1", stats: { arrivals: 0, inHouse: 0, departures: 0, activeReservations: 0, openGuestRequests: 0 } });
    expect(checks.filter((check) => check.status === "fail")).toHaveLength(0);
    expect(checks.some((check) => check.id === "frontdesk-no-live-reservations" && check.status === "warning")).toBe(true);
  });
});