/**
 * Contract tests for computeOpenSlots — the salon booking slot generator.
 *
 * TIMEZONE-INDEPENDENCE STRATEGY: the function mixes local-time `setHours`
 * (to build the working-hours window) with UTC `toISOString` (for output), so
 * naive absolute-ISO assertions would be machine-timezone-dependent. To stay
 * TZ-agnostic, every test:
 *   - builds busy ranges in the LOCAL frame — ISO strings WITHOUT a trailing
 *     "Z" (e.g. `${DATE}T10:00:00`) and `earliestStart` via the local Date
 *     constructor — so they share the function's local window;
 *   - asserts each returned slot's LOCAL wall-clock via `hm()`, which reads
 *     the instant back with getHours/getMinutes. Round-tripping the instant
 *     through toISOString and back to local time is TZ-independent (verified
 *     identical under ambient TZ and Asia/Tokyo).
 *   - derives the day-of-week dynamically (`DOW`) rather than hardcoding it.
 *
 * Values are grounded by an independent clean-room oracle that does NOT import
 * this module.
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - durationMinutes <= 0 AND slotMinutes <= 0 both short-circuit to [] (the
 *     slotMinutes guard prevents a `t += 0` infinite loop — a thread hang);
 *   - a slot whose END lands EXACTLY on the closing time is INCLUDED (the loop
 *     bound is `t + dur <= windowEnd`, inclusive);
 *   - busy-overlap is HALF-OPEN (`t < busy.end && slotEnd > busy.start`), so a
 *     slot merely TOUCHING a busy block at its start or end edge is NOT a
 *     conflict and is kept;
 *   - slotMinutes defaults to 15 when omitted;
 *   - only the schedule row whose day_of_week === new Date(date).getDay() is
 *     used; a non-working / missing / null-time row yields [].
 */
import { describe, it, expect } from "vitest";
import { computeOpenSlots, type ScheduleRow } from "./availability";

const DATE = "2026-06-15";
const DOW = new Date(`${DATE}T00:00:00`).getDay(); // computed (Monday), never hardcoded

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));
const hm = (iso: string): string => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const row = (start: string, end: string, working = true, dow = DOW): ScheduleRow => ({
  day_of_week: dow,
  is_working: working,
  start_time: start,
  end_time: end,
});

const FULL9 = ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00"];

describe("computeOpenSlots — guards", () => {
  it("returns [] when durationMinutes is 0", () => {
    expect(computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "12:00:00")], busy: [], durationMinutes: 0 })).toEqual([]);
  });

  it("returns [] when durationMinutes is negative", () => {
    expect(computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "12:00:00")], busy: [], durationMinutes: -30 })).toEqual([]);
  });

  it("returns [] when slotMinutes is 0 (guards the t += 0 infinite loop)", () => {
    expect(
      computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "12:00:00")], busy: [], durationMinutes: 60, slotMinutes: 0 }),
    ).toEqual([]);
  });

  it("returns [] when slotMinutes is negative", () => {
    expect(
      computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "12:00:00")], busy: [], durationMinutes: 60, slotMinutes: -5 }),
    ).toEqual([]);
  });

  it("returns [] when no schedule row matches the day of week", () => {
    expect(
      computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "12:00:00", true, (DOW + 1) % 7)], busy: [], durationMinutes: 60 }),
    ).toEqual([]);
  });

  it("returns [] when the matching row is not working", () => {
    expect(
      computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "12:00:00", false)], busy: [], durationMinutes: 60 }),
    ).toEqual([]);
  });

  it("returns [] when start_time is null", () => {
    expect(
      computeOpenSlots({
        date: DATE,
        schedule: [{ day_of_week: DOW, is_working: true, start_time: null, end_time: "12:00:00" }],
        busy: [],
        durationMinutes: 60,
      }),
    ).toEqual([]);
  });

  it("returns [] when end_time is null", () => {
    expect(
      computeOpenSlots({
        date: DATE,
        schedule: [{ day_of_week: DOW, is_working: true, start_time: "09:00:00", end_time: null }],
        busy: [],
        durationMinutes: 60,
      }),
    ).toEqual([]);
  });
});

describe("computeOpenSlots — slot generation", () => {
  it("emits a slot every slotMinutes within the window (09:00-12:00, dur 60, slot 15)", () => {
    const slots = computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "12:00:00")], busy: [], durationMinutes: 60, slotMinutes: 15 });
    expect(slots.map(hm)).toEqual(FULL9);
  });

  it("defaults slotMinutes to 15 when omitted", () => {
    const slots = computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "12:00:00")], busy: [], durationMinutes: 60 });
    expect(slots.map(hm)).toEqual(FULL9);
  });

  it("includes a slot whose end lands EXACTLY on the closing time (inclusive bound)", () => {
    const slots = computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "10:00:00")], busy: [], durationMinutes: 60, slotMinutes: 60 });
    expect(slots.map(hm)).toEqual(["09:00"]);
  });

  it("excludes a slot whose end would exceed the closing time (09:15 + 60 > 10:00)", () => {
    const slots = computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "10:00:00")], busy: [], durationMinutes: 60, slotMinutes: 15 });
    expect(slots.map(hm)).toEqual(["09:00"]);
  });

  it("returns [] when the duration is longer than the whole window", () => {
    expect(computeOpenSlots({ date: DATE, schedule: [row("09:00:00", "10:00:00")], busy: [], durationMinutes: 120 })).toEqual([]);
  });
});

describe("computeOpenSlots — overlap & filters", () => {
  it("uses HALF-OPEN overlap: a slot merely touching a busy block at its edge is kept", () => {
    const slots = computeOpenSlots({
      date: DATE,
      schedule: [row("09:00:00", "12:00:00")],
      busy: [{ start_at: `${DATE}T10:00:00`, end_at: `${DATE}T11:00:00` }],
      durationMinutes: 60,
      slotMinutes: 60,
    });
    // 10:00 slot overlaps and is dropped; 09:00 ends exactly at busy.start and
    // 11:00 starts exactly at busy.end — touching is not a conflict, both kept.
    expect(slots.map(hm)).toEqual(["09:00", "11:00"]);
  });

  it("skips slots earlier than earliestStart", () => {
    const slots = computeOpenSlots({
      date: DATE,
      schedule: [row("09:00:00", "12:00:00")],
      busy: [],
      durationMinutes: 60,
      slotMinutes: 60,
      earliestStart: new Date(2026, 5, 15, 10, 0, 0, 0), // local 10:00
    });
    expect(slots.map(hm)).toEqual(["10:00", "11:00"]);
  });

  it("uses only the schedule row matching the date's day of week", () => {
    const slots = computeOpenSlots({
      date: DATE,
      schedule: [
        row("06:00:00", "07:00:00", true, (DOW + 6) % 7),
        row("09:00:00", "10:00:00", true, DOW),
        row("20:00:00", "21:00:00", true, (DOW + 1) % 7),
      ],
      busy: [],
      durationMinutes: 60,
      slotMinutes: 60,
    });
    expect(slots.map(hm)).toEqual(["09:00"]);
  });
});
