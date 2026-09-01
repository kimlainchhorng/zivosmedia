import { describe, expect, it } from "vitest";

import {
  calculateEatsManualPayoutSummary,
  type EatsPayoutOrderSnapshot,
} from "@/lib/eatsPayoutSummary";

function order(
  overrides: Partial<EatsPayoutOrderSnapshot> = {},
): EatsPayoutOrderSnapshot {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    total_amount: 100,
    currency: "USD",
    status: "delivered",
    payment_status: "paid",
    payment_provider: "wallet",
    payment_type: "wallet",
    last_payment_error: null,
    refund_status: null,
    refunded_at: null,
    payout_hold: false,
    payout_eligible_at: "2026-08-29T12:00:00.000Z",
    commission_percent: 15,
    commission_amount_cents: 1_500,
    restaurant_payout_cents: 8_500,
    ...overrides,
  };
}

describe("Eats manual payout summary", () => {
  it("treats a stored commission of 15 as 15 percent, not 1500 percent", () => {
    const summary = calculateEatsManualPayoutSummary([order()], [], []);

    expect(summary).toMatchObject({
      grossCents: 10_000,
      platformFeeCents: 1_500,
      earnedCents: 8_500,
      availableCents: 8_500,
      commissionPercent: 15,
      usesMixedCommissionRates: false,
    });
  });

  it("uses each immutable order snapshot when historical commission rates differ", () => {
    const summary = calculateEatsManualPayoutSummary(
      [
        order(),
        order({
          id: "00000000-0000-4000-8000-000000000002",
          commission_percent: 20,
          commission_amount_cents: 2_000,
          restaurant_payout_cents: 8_000,
        }),
      ],
      [],
      [],
    );

    expect(summary.platformFeeCents).toBe(3_500);
    expect(summary.earnedCents).toBe(16_500);
    expect(summary.commissionPercent).toBeNull();
    expect(summary.usesMixedCommissionRates).toBe(true);
  });

  it("subtracts retryable automatic transfers and every obligating manual request", () => {
    const summary = calculateEatsManualPayoutSummary(
      [order()],
      [
        {
          order_id: "00000000-0000-4000-8000-000000000001",
          amount_cents: 2_000,
          direction: "transfer",
          status: "failed",
          stripe_reversal_id: null,
        },
      ],
      [
        { amount_cents: 1_000, status: "pending" },
        { amount_cents: 500, status: "paid" },
        { amount_cents: 900, status: "rejected" },
      ],
    );

    expect(summary.automaticReservedCents).toBe(2_000);
    expect(summary.manualReservedCents).toBe(1_500);
    expect(summary.availableCents).toBe(5_000);
  });

  it("releases an automatic reservation only for an exact completed reversal", () => {
    const transfer = {
      order_id: "00000000-0000-4000-8000-000000000001",
      amount_cents: 2_000,
      direction: "transfer",
      status: "created",
      stripe_reversal_id: null,
    };
    const mismatch = {
      ...transfer,
      amount_cents: 1_999,
      direction: "reversal",
      stripe_reversal_id: "trr_mismatch",
    };
    const exact = {
      ...transfer,
      direction: "reversal",
      stripe_reversal_id: "trr_exact",
    };

    expect(
      calculateEatsManualPayoutSummary([order()], [transfer, mismatch], [])
        .automaticReservedCents,
    ).toBe(2_000);
    expect(
      calculateEatsManualPayoutSummary([order()], [transfer, exact], [])
        .automaticReservedCents,
    ).toBe(0);
  });

  it("fails closed instead of estimating an eligible order with invalid snapshots", () => {
    expect(() =>
      calculateEatsManualPayoutSummary(
        [
          order({
            commission_amount_cents: 15,
            restaurant_payout_cents: 8_500,
          }),
        ],
        [],
        [],
      ),
    ).toThrow("invalid payout snapshot");
  });

  it("rejects a self-consistent payout split that does not match the stored rate", () => {
    expect(() =>
      calculateEatsManualPayoutSummary(
        [
          order({
            commission_percent: 15,
            commission_amount_cents: 0,
            restaurant_payout_cents: 10_000,
          }),
        ],
        [],
        [],
      ),
    ).toThrow("invalid payout snapshot");
  });

  it("excludes Stripe, refunded, held, unfinished, and not-yet-eligible orders", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    const summary = calculateEatsManualPayoutSummary(
      [
        order({ payment_provider: "stripe", payment_type: "card" }),
        order({ id: "2", refund_status: "pending" }),
        order({ id: "3", refunded_at: "2026-08-30T11:00:00.000Z" }),
        order({ id: "4", payout_hold: true }),
        order({ id: "5", status: "preparing" }),
        order({ id: "6", payout_eligible_at: "2026-08-31T12:00:00.000Z" }),
        order({ id: "7", currency: "KHR" }),
        order({ id: "8", currency: null }),
        order({ id: "9", payout_eligible_at: null }),
      ],
      [],
      [],
      now,
    );

    expect(summary.availableCents).toBe(0);
    expect(summary.eligibleOrderIds).toEqual([]);
  });

  it("includes only the exact paid no-refund cancellation entitlement", () => {
    const summary = calculateEatsManualPayoutSummary(
      [
        order({
          id: "no-refund",
          status: "cancelled",
          payment_status: "paid",
          last_payment_error: "cancelled_no_refund",
        }),
        order({ id: "ordinary-cancel", status: "cancelled" }),
      ],
      [],
      [],
    );

    expect(summary.eligibleOrderIds).toEqual(["no-refund"]);
    expect(summary.availableCents).toBe(8_500);
  });
});
