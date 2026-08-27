import { differenceInDays, parseISO } from "date-fns";
import { describe, expect, it } from "vitest";

import { resolveRentalDateWindow } from "./rentalDateWindow";

const now = new Date(2026, 7, 26, 12, 0, 0);

describe("resolveRentalDateWindow", () => {
  it("rejects missing and malformed checkout dates", () => {
    expect(resolveRentalDateWindow(null, null, now)).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(resolveRentalDateWindow("2026-09-01", null, now)).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(resolveRentalDateWindow("not-a-date", "2026-09-03", now)).toEqual({
      ok: false,
      reason: "unparseable",
    });
    expect(resolveRentalDateWindow("2026-02-30", "2026-03-03", now)).toEqual({
      ok: false,
      reason: "unparseable",
    });
  });

  it("rejects same-day, reversed, and past rental windows", () => {
    expect(resolveRentalDateWindow("2026-09-03", "2026-09-03", now)).toEqual({
      ok: false,
      reason: "reversed",
    });
    expect(resolveRentalDateWindow("2026-09-10", "2026-09-05", now)).toEqual({
      ok: false,
      reason: "reversed",
    });
    expect(resolveRentalDateWindow("2020-01-01", "2020-01-05", now)).toEqual({
      ok: false,
      reason: "past",
    });
  });

  it.each([
    ["2026-08-27", "2026-08-28"],
    ["2026-09-08", "2026-09-12"],
    ["2026-09-29", "2026-10-03"],
  ])(
    "preserves the existing day-count formula for %s through %s",
    (pickupParam, returnParam) => {
      const result = resolveRentalDateWindow(pickupParam, returnParam, now);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.totalDays).toBe(
        differenceInDays(parseISO(returnParam), parseISO(pickupParam)),
      );
    },
  );
});
