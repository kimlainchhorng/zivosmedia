import { differenceInCalendarDays, parseISO } from "date-fns";
import { describe, expect, it } from "vitest";

import { resolveHotelDateWindow } from "./hotelDateWindow";

const now = new Date(2026, 7, 26, 12, 0, 0);

describe("resolveHotelDateWindow", () => {
  it("rejects missing and malformed stay dates", () => {
    expect(resolveHotelDateWindow(null, null, now)).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(resolveHotelDateWindow("2026-09-08", null, now)).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(resolveHotelDateWindow("not-a-date", "2026-09-10", now)).toEqual({
      ok: false,
      reason: "unparseable",
    });
    expect(resolveHotelDateWindow("2026-02-30", "2026-03-03", now)).toEqual({
      ok: false,
      reason: "unparseable",
    });
  });

  it("rejects same-day, reversed, and past stays", () => {
    expect(resolveHotelDateWindow("2026-09-08", "2026-09-08", now)).toEqual({
      ok: false,
      reason: "reversed",
    });
    expect(resolveHotelDateWindow("2026-09-10", "2026-09-08", now)).toEqual({
      ok: false,
      reason: "reversed",
    });
    expect(resolveHotelDateWindow("2020-01-01", "2020-01-05", now)).toEqual({
      ok: false,
      reason: "past",
    });
  });

  it.each([
    ["2026-08-26", "2026-08-27"],
    ["2026-09-08", "2026-09-10"],
    ["2026-09-29", "2026-10-03"],
  ])(
    "preserves the calendar-night formula for %s through %s",
    (checkInParam, checkOutParam) => {
      const result = resolveHotelDateWindow(checkInParam, checkOutParam, now);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.nights).toBe(
        differenceInCalendarDays(
          parseISO(checkOutParam),
          parseISO(checkInParam),
        ),
      );
      expect(result.checkInIso).toBe(checkInParam);
      expect(result.checkOutIso).toBe(checkOutParam);
    },
  );
});
