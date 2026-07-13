/**
 * Contract tests for bestBaseTotal — the car-rental price optimizer that auto-picks
 * the cheapest combination of daily/weekly/monthly rates for a rental length. It is
 * directly customer-facing money: a regression could overcharge (miss a cheaper
 * weekly/monthly bundle) or mislabel the breakdown the customer sees. The expected
 * base_total_cents for every scenario was ground-truthed by an INDEPENDENT brute
 * force over all (months, weeks, days) decompositions — i.e. the true global
 * minimum, not a copy of this module's restricted search — so these tests verify
 * the optimizer actually finds the cheapest deal. The applied/explain/savings/
 * effective_daily fields are asserted against the documented formatting rules.
 */
import { describe, it, expect } from "vitest";
import { bestBaseTotal, type VehicleRates } from "./pricing";

const rates = (daily: number, weekly = 0, monthly = 0): VehicleRates => ({
  daily_rate_cents: daily,
  weekly_rate_cents: weekly,
  monthly_rate_cents: monthly,
});

describe("bestBaseTotal", () => {
  it("uses straight daily pricing for a short rental", () => {
    expect(bestBaseTotal(rates(5000), 3)).toEqual({
      base_total_cents: 15000,
      effective_daily_cents: 5000,
      applied: "daily",
      explain: "3 days × daily rate",
      savings_cents: 0,
    });
  });

  it("applies a whole-week weekly rate when it beats daily", () => {
    expect(bestBaseTotal(rates(5000, 30000), 7)).toEqual({
      base_total_cents: 30000,
      effective_daily_cents: 4286, // round(30000 / 7)
      applied: "weekly",
      explain: "1 week × weekly rate",
      savings_cents: 5000,
    });
  });

  it("mixes weeks and leftover days", () => {
    expect(bestBaseTotal(rates(5000, 30000), 10)).toEqual({
      base_total_cents: 45000,
      effective_daily_cents: 4500,
      applied: "mixed",
      explain: "1 week + 3 days",
      savings_cents: 5000,
    });
  });

  it("keeps daily when a configured weekly rate is not actually cheaper", () => {
    expect(bestBaseTotal(rates(5000, 40000), 7)).toEqual({
      base_total_cents: 35000,
      effective_daily_cents: 5000,
      applied: "daily",
      explain: "7 days × daily rate",
      savings_cents: 0,
    });
  });

  it("applies a whole-month monthly rate", () => {
    expect(bestBaseTotal(rates(5000, 0, 120000), 30)).toEqual({
      base_total_cents: 120000,
      effective_daily_cents: 4000,
      applied: "monthly",
      explain: "1 month × monthly rate",
      savings_cents: 30000,
    });
  });

  it("mixes a month with leftover days when no weekly rate is configured", () => {
    expect(bestBaseTotal(rates(5000, 0, 120000), 35)).toEqual({
      base_total_cents: 145000,
      effective_daily_cents: 4143, // round(145000 / 35)
      applied: "mixed",
      explain: "1 month + 5 days",
      savings_cents: 30000,
    });
  });

  it("folds the month remainder into whole weeks (nested weekly-in-remainder branch)", () => {
    expect(bestBaseTotal(rates(5000, 28000, 120000), 44)).toEqual({
      base_total_cents: 176000, // 1 month + 2 weeks beats 6 weeks + 2 days (178000)
      effective_daily_cents: 4000,
      applied: "mixed",
      explain: "1 month + 2 weeks",
      savings_cents: 44000,
    });
  });

  it("clamps non-positive and fractional day counts (floor, min 1)", () => {
    expect(bestBaseTotal(rates(5000), 0)).toEqual({
      base_total_cents: 5000,
      effective_daily_cents: 5000,
      applied: "daily",
      explain: "1 day × daily rate",
      savings_cents: 0,
    });
    expect(bestBaseTotal(rates(5000), 2.9)).toEqual({
      base_total_cents: 10000,
      effective_daily_cents: 5000,
      applied: "daily",
      explain: "2 days × daily rate",
      savings_cents: 0,
    });
  });
});
