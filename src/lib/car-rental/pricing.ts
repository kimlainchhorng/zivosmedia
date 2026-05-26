/**
 * Pricing helpers for car-rental bookings.
 *
 * `bestBaseTotal()` picks the cheapest combination of daily/weekly/monthly
 * rates for a given rental duration — the customer gets the best deal
 * automatically without the operator having to compose the rates manually.
 */

export interface VehicleRates {
  daily_rate_cents: number;
  weekly_rate_cents: number;   // 0 means "not configured" → ignored
  monthly_rate_cents: number;  // 0 means "not configured" → ignored
}

export interface PricingBreakdown {
  base_total_cents: number;
  effective_daily_cents: number; // base_total_cents / days, for display
  /** "daily" | "weekly" | "monthly" | "mixed" */
  applied: "daily" | "weekly" | "monthly" | "mixed";
  /** Human-readable explanation of the chosen combination. */
  explain: string;
  /** Savings vs straight-up daily × days. 0 when daily is already cheapest. */
  savings_cents: number;
}

/**
 * Compute the cheapest total for `days` days. Considers:
 *  - daily × days
 *  - if days >= 7 and weekly > 0: weeks × weekly + remainder × daily
 *  - if days >= 30 and monthly > 0: months × monthly + remainder × daily
 *  - mixed (months × monthly + (remainder weeks) × weekly + leftover days × daily)
 */
export function bestBaseTotal(rates: VehicleRates, days: number): PricingBreakdown {
  const safe = Math.max(1, Math.floor(days));
  const dailyTotal = rates.daily_rate_cents * safe;

  let cheapest = {
    cents: dailyTotal,
    applied: "daily" as PricingBreakdown["applied"],
    explain: `${safe} day${safe === 1 ? "" : "s"} × daily rate`,
  };

  if (rates.weekly_rate_cents > 0 && safe >= 7) {
    const weeks = Math.floor(safe / 7);
    const extra = safe % 7;
    const weeklyTotal = weeks * rates.weekly_rate_cents + extra * rates.daily_rate_cents;
    if (weeklyTotal < cheapest.cents) {
      cheapest = {
        cents: weeklyTotal,
        applied: extra === 0 ? "weekly" : "mixed",
        explain:
          extra === 0
            ? `${weeks} week${weeks === 1 ? "" : "s"} × weekly rate`
            : `${weeks} week${weeks === 1 ? "" : "s"} + ${extra} day${extra === 1 ? "" : "s"}`,
      };
    }
  }

  if (rates.monthly_rate_cents > 0 && safe >= 30) {
    const months = Math.floor(safe / 30);
    const remDays = safe - months * 30;
    let remPart = remDays * rates.daily_rate_cents;
    let remExplain = `${remDays} day${remDays === 1 ? "" : "s"}`;
    if (rates.weekly_rate_cents > 0 && remDays >= 7) {
      const remWeeks = Math.floor(remDays / 7);
      const remDays2 = remDays % 7;
      const remWithWeekly = remWeeks * rates.weekly_rate_cents + remDays2 * rates.daily_rate_cents;
      if (remWithWeekly < remPart) {
        remPart = remWithWeekly;
        remExplain = `${remWeeks} week${remWeeks === 1 ? "" : "s"}${remDays2 > 0 ? ` + ${remDays2} day${remDays2 === 1 ? "" : "s"}` : ""}`;
      }
    }
    const monthlyTotal = months * rates.monthly_rate_cents + remPart;
    if (monthlyTotal < cheapest.cents) {
      cheapest = {
        cents: monthlyTotal,
        applied: remDays === 0 ? "monthly" : "mixed",
        explain:
          remDays === 0
            ? `${months} month${months === 1 ? "" : "s"} × monthly rate`
            : `${months} month${months === 1 ? "" : "s"} + ${remExplain}`,
      };
    }
  }

  return {
    base_total_cents: cheapest.cents,
    effective_daily_cents: Math.round(cheapest.cents / safe),
    applied: cheapest.applied,
    explain: cheapest.explain,
    savings_cents: Math.max(0, dailyTotal - cheapest.cents),
  };
}
