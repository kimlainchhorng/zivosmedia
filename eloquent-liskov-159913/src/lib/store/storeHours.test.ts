import { describe, it, expect } from "vitest";
import { isOpenNow, parseHours } from "./storeHours";

const at = (day: number, h: number, m = 0) => {
  // pick a fixed Sunday (2026-04-26) and add `day` days
  const d = new Date(2026, 3, 26 + day, h, m, 0, 0);
  return d;
};

describe("storeHours", () => {
  it("returns null for unknown / empty / unparseable", () => {
    expect(isOpenNow(null)).toBeNull();
    expect(isOpenNow("")).toBeNull();
    expect(isOpenNow("call ahead")).toBeNull();
  });

  it("handles 24/7 and Closed", () => {
    expect(isOpenNow("24/7", at(1, 3))).toBe(true);
    expect(isOpenNow("Open 24 hours", at(1, 3))).toBe(true);
    expect(isOpenNow("Closed", at(1, 12))).toBe(false);
  });

  it("parses Mon–Sun 8:00–22:00", () => {
    expect(isOpenNow("Mon–Sun 8:00–22:00", at(1, 9))).toBe(true);
    expect(isOpenNow("Mon–Sun 8:00–22:00", at(1, 23))).toBe(false);
    expect(isOpenNow("Mon–Sun 8:00–22:00", at(1, 7, 59))).toBe(false);
  });

  it("parses Mon-Fri 9-18 with weekend off", () => {
    // Mon (day 1) at 10:00 → open
    expect(isOpenNow("Mon-Fri 9-18", at(1, 10))).toBe(true);
    // Sun (day 0) at 10:00 → closed (no window)
    expect(isOpenNow("Mon-Fri 9-18", at(0, 10))).toBe(false);
  });

  it("handles am/pm and overnight windows", () => {
    // 9pm to 2am, Friday at 1am Saturday should still be open
    expect(isOpenNow("Fri 9pm-2am", at(6, 1))).toBe(true);
    expect(isOpenNow("Fri 9pm-2am", at(5, 22))).toBe(true);
    expect(isOpenNow("Fri 9pm-2am", at(5, 8))).toBe(false);
  });

  it("supports comma-separated segments", () => {
    const h = "Mon-Fri 9-18, Sat-Sun 10-16";
    expect(isOpenNow(h, at(0, 11))).toBe(true);
    expect(isOpenNow(h, at(1, 8))).toBe(false);
    expect(isOpenNow(h, at(1, 17))).toBe(true);
  });

  it("parseHours returns null for nonsense", () => {
    expect(parseHours("hello world")).toBeNull();
  });
});
