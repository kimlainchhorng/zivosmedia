import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  PAYMENT_RANK,
  decideBusReconciliation,
  targetForEvent,
  type BusPaymentStatus,
  type BusBookingStatus,
} from "../../supabase/functions/_shared/busWebhookTransitions";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const read = (rel: string) => readFileSync(resolve(repoRoot, rel), "utf8");

// ── Pure reconciliation logic (real behavioral coverage) ──────────────────────────────
describe("bus webhook reconciliation — event → target", () => {
  it("maps each handled Stripe event to the correct terminal state", () => {
    expect(targetForEvent("payment_intent.amount_capturable_updated")).toEqual({
      pay: "authorized",
      booking: null,
    });
    expect(targetForEvent("payment_intent.succeeded")).toEqual({
      pay: "captured",
      booking: "confirmed",
    });
    expect(targetForEvent("payment_intent.payment_failed")).toEqual({
      pay: "failed",
      booking: null,
    });
    expect(targetForEvent("payment_intent.canceled")).toEqual({
      pay: "voided",
      booking: "cancelled",
    });
    expect(targetForEvent("charge.refunded")).toEqual({ pay: "refunded", booking: "cancelled" });
  });

  it("ignores unrelated events", () => {
    expect(targetForEvent("customer.created")).toEqual({ pay: null, booking: null });
  });

  it("only refunds on a succeeded charge.refund.updated", () => {
    expect(targetForEvent("charge.refund.updated", true)).toEqual({
      pay: "refunded",
      booking: "cancelled",
    });
    expect(targetForEvent("charge.refund.updated", false)).toEqual({ pay: null, booking: null });
  });
});

describe("bus webhook reconciliation — idempotent, no-regress decisions", () => {
  const base = (
    eventType: string,
    pay: BusPaymentStatus,
    booking: BusBookingStatus,
    refundSucceeded = true,
  ) =>
    decideBusReconciliation({
      eventType,
      currentPaymentStatus: pay,
      currentBookingStatus: booking,
      refundSucceeded,
    });

  it("authorizes a fresh hold", () => {
    const d = base("payment_intent.amount_capturable_updated", "pending", "hold");
    expect(d.apply).toBe(true);
    expect(d.targetPay).toBe("authorized");
    expect(d.targetBooking).toBeNull();
  });

  it("captures + confirms an authorized hold", () => {
    const d = base("payment_intent.succeeded", "authorized", "hold");
    expect(d).toMatchObject({ apply: true, targetPay: "captured", targetBooking: "confirmed" });
  });

  it("is a no-op when the event replays the current state (idempotent redelivery)", () => {
    const d = base("payment_intent.succeeded", "captured", "confirmed");
    expect(d.apply).toBe(false);
    expect(d.reason).toBe("already_at_target");
  });

  it("never regresses captured back to authorized (out-of-order event)", () => {
    const d = base("payment_intent.amount_capturable_updated", "captured", "confirmed");
    expect(d.apply).toBe(false);
    expect(d.reason).toBe("would_regress");
  });

  it("never lets a stray payment_failed clobber a captured booking", () => {
    const d = base("payment_intent.payment_failed", "captured", "confirmed");
    expect(d.apply).toBe(false);
    expect(d.reason).toBe("would_regress");
  });

  it("voids an authorized hold that gets cancelled before capture", () => {
    const d = base("payment_intent.canceled", "authorized", "hold");
    expect(d).toMatchObject({ apply: true, targetPay: "voided", targetBooking: "cancelled" });
  });

  it("refunds a captured booking", () => {
    const d = base("charge.refunded", "captured", "confirmed");
    expect(d).toMatchObject({ apply: true, targetPay: "refunded", targetBooking: "cancelled" });
  });

  it("does not resurrect a cancelled booking on a late authorize/capture", () => {
    const authAfterCancel = base("payment_intent.amount_capturable_updated", "voided", "cancelled");
    expect(authAfterCancel.apply).toBe(false);
    // 'would_regress' or 'booking_locked' both correctly refuse the write.
    expect(["booking_locked", "would_regress"]).toContain(authAfterCancel.reason);
  });

  it("terminal refunded/voided outrank captured in the monotonic rank", () => {
    expect(PAYMENT_RANK.refunded).toBeGreaterThan(PAYMENT_RANK.captured);
    expect(PAYMENT_RANK.voided).toBeGreaterThan(PAYMENT_RANK.captured);
    expect(PAYMENT_RANK.captured).toBeGreaterThan(PAYMENT_RANK.authorized);
    expect(PAYMENT_RANK.authorized).toBeGreaterThan(PAYMENT_RANK.failed);
  });
});

// ── Migration + function source invariants (defect fix + security shape) ──────────────
describe("bus payment migration adds 'voided' + webhook idempotency table", () => {
  const migration = read(
    "supabase/migrations/20260717120000_bus_payment_voided_and_webhook_events.sql",
  );

  it("widens payment_status to include voided", () => {
    expect(migration).toMatch(
      /payment_status in \('pending','authorized','captured','failed','refunded','voided'\)/i,
    );
  });

  it("creates a dedup table with a unique stripe_event_id", () => {
    expect(migration).toMatch(/create table if not exists public\.bus_stripe_webhook_events/i);
    expect(migration).toMatch(/stripe_event_id text not null unique/i);
  });

  it("keeps the webhook event log service-role only", () => {
    expect(migration).toMatch(
      /revoke all on table public\.bus_stripe_webhook_events from anon, authenticated/i,
    );
  });
});

describe("stripe-bus-webhook enforces verify-before-write + dedup", () => {
  const fn = read("supabase/functions/stripe-bus-webhook/index.ts");

  it("verifies the Stripe signature before any bus_bookings write", () => {
    const verifyAt = fn.indexOf("constructEventAsync");
    const writeAt = fn.indexOf('.from("bus_bookings")');
    expect(verifyAt).toBeGreaterThan(-1);
    expect(writeAt).toBeGreaterThan(-1);
    expect(verifyAt).toBeLessThan(writeAt);
  });

  it("dedups redeliveries via ignoreDuplicates on stripe_event_id", () => {
    expect(fn).toMatch(/onConflict:\s*"stripe_event_id"/);
    expect(fn).toMatch(/ignoreDuplicates:\s*true/);
  });

  it("requires a webhook signing secret and fails closed without it", () => {
    expect(fn).toMatch(/STRIPE_WEBHOOK_SECRET|STRIPE_BUS_WEBHOOK_SECRET/);
    expect(fn).toMatch(/Stripe not configured/);
  });

  it("delegates state decisions to the pure reconciliation module", () => {
    expect(fn).toMatch(/decideBusReconciliation/);
  });
});

describe("create-bus-payment-intent uses a Stripe idempotency key", () => {
  const fn = read("supabase/functions/create-bus-payment-intent/index.ts");
  it("passes idempotencyKey keyed on the booking", () => {
    expect(fn).toMatch(/idempotencyKey:\s*`bus_pi_\$\{booking\.id\}`/);
  });
});
