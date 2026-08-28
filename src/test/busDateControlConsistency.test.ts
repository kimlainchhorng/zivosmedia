import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { formatBusTravelDate } from "@/lib/busTravelDate";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/app/BusBookingPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("Bus date control consistency", () => {
  it("formats calendar-only values without a timezone day shift", () => {
    expect(formatBusTravelDate("2026-09-02", "en-US")).toBe("Sep 2");
    expect(formatBusTravelDate("2027-01-01", "en-US")).toBe("Jan 1");
  });

  it("fails safely for malformed or impossible dates", () => {
    expect(formatBusTravelDate("not-a-date", "en-US")).toBe("not-a-date");
    expect(formatBusTravelDate("2026-02-30", "en-US")).toBe("2026-02-30");
    expect(formatBusTravelDate("2026-09-02", "not_a_locale")).toBe("Sep 2");
  });

  it("keeps the native picker and raw ISO value behind a stable visible label", () => {
    expect(source).toContain("const { t, locale } = useI18n();");
    expect(source).toContain("formatBusTravelDate(date, locale)");
    expect(source).toContain('data-testid="bus-date-display"');
    expect(source).toContain('type="date"');
    expect(source).toContain('aria-label={t("bus.date")}');
    expect(source).toContain("value={date}");
    expect(source).toContain("min={todayISO()}");
    expect(source).toContain("onChange={(e) => setDate(e.target.value)}");
    expect(source).toContain(
      "absolute inset-0 h-full w-full cursor-pointer opacity-0",
    );
    expect(source).toContain("focus-within:ring-2 focus-within:ring-ring");
  });
});
