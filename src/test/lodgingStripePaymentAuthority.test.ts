import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  allowedCurrentLodgingPaymentStatuses,
  calculateLodgingTransferReversalCents,
  deriveLodgingPaymentAuthority,
  isAuthoritativeLodgingPaymentIntent,
  isAuthoritativeLodgingCheckoutSession,
  isAuthorizedLodgingPaymentCaller,
  isCompleteLodgingPaymentIntentTransition,
  LODGING_PAYMENT_AUTHORITY_VERSION,
  lodgingPaymentAttemptScope,
  requiredStripeStatusForLodgingRecovery,
  resolveLodgingPaymentAuthority,
} from "../../supabase/functions/_shared/lodgingPaymentAuthority";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");

const fullPaymentReservation = {
  store_id: "hotel-1",
  guest_details: { pay_method: "card" },
  total_cents: 7_480,
  deposit_cents: 2_000,
  paid_cents: 0,
};

describe("lodging Stripe payment authority", () => {
  it("rejects a guessed reservation caller while preserving guest and admin retries", () => {
    expect(
      isAuthorizedLodgingPaymentCaller({
        reservationGuestId: "guest-owner",
        userId: "different-user",
        isGlobalAdmin: false,
      }),
    ).toBe(false);
    expect(
      isAuthorizedLodgingPaymentCaller({
        reservationGuestId: "guest-owner",
        userId: "guest-owner",
        isGlobalAdmin: false,
      }),
    ).toBe(true);
    expect(
      isAuthorizedLodgingPaymentCaller({
        reservationGuestId: "guest-owner",
        userId: "admin-user",
        isGlobalAdmin: true,
      }),
    ).toBe(true);
  });

  it("rejects caller-selected underpayment, hotel swapping, and a deposit downgrade", () => {
    expect(
      resolveLodgingPaymentAuthority({
        reservation: fullPaymentReservation,
        requestedStoreId: "hotel-1",
        requestedMode: "full",
        requestedCents: 50,
      }),
    ).toEqual({ ok: false, reason: "amount_mismatch" });

    expect(
      resolveLodgingPaymentAuthority({
        reservation: fullPaymentReservation,
        requestedStoreId: "other-hotel",
        requestedMode: "full",
        requestedCents: 7_480,
      }),
    ).toEqual({ ok: false, reason: "store_mismatch" });

    expect(
      resolveLodgingPaymentAuthority({
        reservation: fullPaymentReservation,
        requestedStoreId: "hotel-1",
        requestedMode: "deposit",
        requestedCents: 2_000,
      }),
    ).toEqual({ ok: false, reason: "mode_mismatch" });
  });

  it("allows the exact persisted full balance and card-on-arrival deposit", () => {
    expect(
      resolveLodgingPaymentAuthority({
        reservation: { ...fullPaymentReservation, paid_cents: 1_000 },
        requestedStoreId: "hotel-1",
        requestedMode: "full",
        requestedCents: 7_480,
      }),
    ).toEqual({
      ok: true,
      mode: "full",
      authorizedCents: 7_480,
      payableCents: 6_480,
    });

    expect(
      resolveLodgingPaymentAuthority({
        reservation: {
          ...fullPaymentReservation,
          guest_details: { pay_method: "card_on_arrival" },
        },
        requestedStoreId: "hotel-1",
        requestedMode: "deposit",
        requestedCents: 2_000,
      }),
    ).toEqual({
      ok: true,
      mode: "deposit",
      authorizedCents: 2_000,
      payableCents: 2_000,
    });
  });

  it("derives the outstanding balance without trusting browser cents", () => {
    expect(
      deriveLodgingPaymentAuthority({
        ...fullPaymentReservation,
        paid_cents: 2_500,
      }),
    ).toEqual({
      ok: true,
      mode: "full",
      authorizedCents: 7_480,
      payableCents: 4_980,
    });
    expect(
      deriveLodgingPaymentAuthority({
        ...fullPaymentReservation,
        paid_cents: 7_480,
      }),
    ).toEqual({
      ok: true,
      mode: "full",
      authorizedCents: 7_480,
      payableCents: 0,
    });
  });

  it("fails closed when persisted payment intent is unavailable or below Stripe's minimum", () => {
    expect(
      resolveLodgingPaymentAuthority({
        reservation: { ...fullPaymentReservation, guest_details: {} },
        requestedStoreId: "hotel-1",
        requestedMode: "full",
        requestedCents: 7_480,
      }),
    ).toEqual({ ok: false, reason: "payment_method_unavailable" });

    expect(
      resolveLodgingPaymentAuthority({
        reservation: { ...fullPaymentReservation, total_cents: 49 },
        requestedStoreId: "hotel-1",
        requestedMode: "full",
        requestedCents: 49,
      }),
    ).toEqual({ ok: false, reason: "amount_unavailable" });

    expect(
      deriveLodgingPaymentAuthority({
        ...fullPaymentReservation,
        paid_cents: -1,
      }),
    ).toEqual({ ok: false, reason: "amount_unavailable" });
  });

  it("will not reuse a stale open Stripe session with different authority", () => {
    const validSession = {
      amount_total: 7_480,
      currency: "usd",
      metadata: {
        reservation_id: "reservation-1",
        store_id: "hotel-1",
        mode: "full",
        lodging_payment_authority: LODGING_PAYMENT_AUTHORITY_VERSION,
      },
    };
    const authority = {
      reservationId: "reservation-1",
      storeId: "hotel-1",
      mode: "full" as const,
      payableCents: 7_480,
    };

    expect(
      isAuthoritativeLodgingCheckoutSession({
        session: validSession,
        ...authority,
      }),
    ).toBe(true);
    expect(
      isAuthoritativeLodgingCheckoutSession({
        session: {
          ...validSession,
          metadata: {
            ...validSession.metadata,
            lodging_payment_authority: undefined,
          },
        },
        ...authority,
      }),
    ).toBe(false);
    expect(
      isAuthoritativeLodgingCheckoutSession({
        session: { ...validSession, amount_total: 50 },
        ...authority,
      }),
    ).toBe(false);
    expect(
      isAuthoritativeLodgingCheckoutSession({
        session: {
          ...validSession,
          metadata: { ...validSession.metadata, store_id: "other-hotel" },
        },
        ...authority,
      }),
    ).toBe(false);
  });

  it("requires exact versioned PaymentIntent terms and complete settlement", () => {
    const paymentIntent = {
      id: "pi_valid",
      amount: 7_480,
      amount_received: 7_480,
      currency: "usd",
      capture_method: "automatic",
      metadata: {
        reservation_id: "reservation-1",
        store_id: "hotel-1",
        mode: "full",
        lodging_payment_authority: LODGING_PAYMENT_AUTHORITY_VERSION,
      },
    };
    const authority = {
      paymentIntentId: "pi_valid",
      reservationId: "reservation-1",
      storeId: "hotel-1",
      mode: "full" as const,
      payableCents: 7_480,
    };

    expect(
      isAuthoritativeLodgingPaymentIntent({ paymentIntent, ...authority }),
    ).toBe(true);
    expect(
      isAuthoritativeLodgingPaymentIntent({
        paymentIntent: { ...paymentIntent, amount: 50 },
        ...authority,
      }),
    ).toBe(false);
    for (const invalidPaymentIntent of [
      { ...paymentIntent, currency: "khr" },
      { ...paymentIntent, capture_method: "manual" },
      {
        ...paymentIntent,
        metadata: { ...paymentIntent.metadata, store_id: "other-hotel" },
      },
      {
        ...paymentIntent,
        metadata: {
          ...paymentIntent.metadata,
          lodging_payment_authority: undefined,
        },
      },
    ]) {
      expect(
        isAuthoritativeLodgingPaymentIntent({
          paymentIntent: invalidPaymentIntent,
          ...authority,
        }),
      ).toBe(false);
    }
    expect(
      isCompleteLodgingPaymentIntentTransition({
        eventType: "payment_intent.succeeded",
        paymentIntent: { ...paymentIntent, amount_received: 5_000 },
        payableCents: 7_480,
      }),
    ).toBe(false);
    expect(
      isCompleteLodgingPaymentIntentTransition({
        eventType: "payment_intent.amount_capturable_updated",
        paymentIntent: { amount_capturable: 2_000 },
        payableCents: 2_000,
      }),
    ).toBe(true);
  });

  it("keeps delayed PaymentIntent events from moving a reservation backward", () => {
    expect(
      allowedCurrentLodgingPaymentStatuses(
        "payment_intent.amount_capturable_updated",
      ),
    ).not.toContain("unpaid");
    expect(
      allowedCurrentLodgingPaymentStatuses("payment_intent.payment_failed"),
    ).not.toContain("authorized");
    expect(
      allowedCurrentLodgingPaymentStatuses("payment_intent.processing"),
    ).not.toContain("failed");
    expect(
      allowedCurrentLodgingPaymentStatuses("payment_intent.succeeded"),
    ).toContain("authorized");
    expect(
      allowedCurrentLodgingPaymentStatuses("payment_intent.succeeded"),
    ).not.toContain("refund_pending");
    expect(
      allowedCurrentLodgingPaymentStatuses("payment_intent.succeeded"),
    ).not.toContain("refunded");
    expect(
      allowedCurrentLodgingPaymentStatuses("checkout.session.completed"),
    ).toEqual([]);
    expect(
      requiredStripeStatusForLodgingRecovery({
        eventType: "payment_intent.amount_capturable_updated",
        currentPaymentStatus: "failed",
      }),
    ).toBe("requires_capture");
    expect(
      requiredStripeStatusForLodgingRecovery({
        eventType: "payment_intent.amount_capturable_updated",
        currentPaymentStatus: "unpaid",
      }),
    ).toBeNull();
  });

  it("keeps named refresh retries stable while letting legacy hosted callers advance generations", () => {
    expect(
      lodgingPaymentAttemptScope({
        clientAttemptId: "embedded_refresh_1",
        currentSessionId: "cs_old",
        currentPaymentIntentId: "pi_old",
      }),
    ).toBe(
      lodgingPaymentAttemptScope({
        clientAttemptId: "embedded_refresh_1",
        currentSessionId: "cs_new",
        currentPaymentIntentId: "pi_new",
      }),
    );

    expect(
      lodgingPaymentAttemptScope({
        clientAttemptId: "default",
        currentSessionId: "cs_expired",
        currentPaymentIntentId: null,
      }),
    ).not.toBe(
      lodgingPaymentAttemptScope({
        clientAttemptId: "default",
        currentSessionId: "cs_replacement",
        currentPaymentIntentId: null,
      }),
    );
  });

  it("reverses a hotel transfer in proportion to the signed refund", () => {
    expect(
      calculateLodgingTransferReversalCents({
        transferCents: 9_000,
        settledCents: 10_000,
        refundCents: 5_000,
      }),
    ).toBe(4_500);
    expect(
      calculateLodgingTransferReversalCents({
        transferCents: 9_000,
        settledCents: 10_000,
        refundCents: 10_000,
      }),
    ).toBe(9_000);
    expect(
      calculateLodgingTransferReversalCents({
        transferCents: 9_000,
        settledCents: 0,
        refundCents: 5_000,
      }),
    ).toBeNull();
  });

  it("wires the pure boundary before privileged Stripe and database side effects", () => {
    const source = read("supabase/functions/create-lodging-deposit/index.ts");
    expect(source).toContain("r.guest_id === user.id");
    expect(source).toContain('.eq("role", "admin")');
    expect(source).toContain("isAuthorizedLodgingPaymentCaller({");
    expect(source).toContain("resolveLodgingPaymentAuthority({");
    expect(source).toContain("unit_amount: payableCents");
    expect(source).not.toContain("unit_amount: body.deposit_cents");
    expect(source).not.toContain(
      "Math.max(50, Math.round(Number(body.deposit_cents)",
    );
    expect(source).toContain("isAuthoritativeLodgingCheckoutSession({");
    expect(source).toContain("LODGING_PAYMENT_AUTHORITY_VERSION");
    expect(source).toContain(
      "lodging_payment_authority: LODGING_PAYMENT_AUTHORITY_VERSION",
    );
    expect(source).toContain("terminalAuthorityIsValid");
    expect(source).toContain("flagPaymentAuthorityReview()");
    expect(source).toContain("stripe.checkout.sessions.expire(candidate.id)");
    expect(source).toContain('.eq("payment_lock_token", myLockToken)');
    expect(source).toContain("if (linkError || !linkedReservation)");
    expect(source).toContain("lodgingPaymentAttemptScope({");
    expect(source).toContain('sessionLookupError?.code === "resource_missing"');
    expect(source).not.toContain("force_${Date.now()}");

    const persistenceStart = source.indexOf(
      "const session = await stripe.checkout.sessions.create",
    );
    const persistenceEnd = source.indexOf("if (dedupRowId)", persistenceStart);
    const persistence = source.slice(persistenceStart, persistenceEnd);
    expect(persistence).toContain('payment_status: "pending"');
    expect(persistence).not.toContain(
      'payment_status: mode === "deposit" ? "authorized"',
    );
    expect(persistence).not.toContain("deposit_cents:");

    const webhook = read("supabase/functions/stripe-lodging-webhook/index.ts");
    expect(webhook).toContain("checkCheckoutSessionAuthority(session)");
    expect(webhook).toContain("checkPaymentIntentAuthority(pi)");
    expect(webhook).toContain("isAuthoritativeLodgingPaymentIntent({");
    expect(webhook).toContain("isCompleteLodgingPaymentIntentTransition({");
    expect(webhook).toContain(
      'last_payment_error: "Stripe payment terms require review"',
    );
    expect(webhook).toContain('payment_status: "failed"');
    expect(webhook).toContain(
      "allowedCurrentLodgingPaymentStatuses(eventType)",
    );
    expect(webhook).toContain("stripe_last_event_at: providerEventStamp");
    expect(webhook).not.toContain("stripe_last_event_at.lte.");
    expect(webhook).toContain("return Boolean(data)");
    expect(webhook).toContain("status: 503");
    expect(webhook).toContain("stripe.paymentIntents.retrieve(pi.id)");
    expect(webhook).toContain(
      "currentPaymentIntent.status !== requiredProviderStatus",
    );
    expect(webhook).toContain(
      '.select("id, stripe_transfer_id, amount_cents, store_id, stripe_account_id, status")',
    );
    expect(webhook).toContain("store_id: (ledger as any).store_id");
    expect(webhook).toContain(
      "stripe_account_id: (ledger as any).stripe_account_id",
    );
    expect(webhook).toContain('.eq("payment_status", "captured")');
    expect(webhook).not.toContain("paid_cents || (r as any).total_cents");
    expect(webhook).toContain(
      'TRANSFER_IN_FLIGHT_RETRY = "lodging_transfer_in_flight_retry"',
    );
    expect(webhook).toContain("throw new Error(TRANSFER_IN_FLIGHT_RETRY)");
    const succeededCase = webhook.slice(
      webhook.indexOf('case "payment_intent.succeeded"'),
      webhook.indexOf('case "payment_intent.payment_failed"'),
    );
    expect(
      succeededCase.indexOf("checkPaymentIntentAuthority(pi)"),
    ).toBeLessThan(succeededCase.indexOf('updateByPI(pi.id, "captured"'));
    expect(succeededCase.indexOf('updateByPI(pi.id, "captured"')).toBeLessThan(
      succeededCase.indexOf("notifyLodgingBookingConfirmed"),
    );
    expect(succeededCase).toContain("if (applied && resolvedReservationId)");
    expect(succeededCase.indexOf("notifyLodgingBookingConfirmed")).toBeLessThan(
      succeededCase.indexOf("queueAutoTransfer"),
    );
    const checkoutCase = webhook.slice(
      webhook.indexOf('case "checkout.session.completed"'),
      webhook.indexOf("default:"),
    );
    expect(
      checkoutCase.indexOf("checkCheckoutSessionAuthority(session)"),
    ).toBeLessThan(checkoutCase.indexOf("stripe_payment_intent_id: piId"));
    expect(checkoutCase).not.toContain("stripe_last_event_at:");

    const refundCase = webhook.slice(
      webhook.indexOf('case "charge.refund.updated"'),
      webhook.indexOf('case "checkout.session.completed"'),
    );
    expect(refundCase).toContain(
      '["pending", "processing", "failed", "authorized", "captured", "paid", "refund_pending", "refunded"]',
    );
    expect(refundCase).toContain("if (applied && resolvedReservationId)");

    const drawer = read("src/components/lodging/LodgingBookingDrawer.tsx");
    expect(drawer).toContain("totalCents: inserted.total_cents");
    expect(drawer).toContain("depositCents: inserted.deposit_cents");
    expect(drawer).toContain("amountCents={persistedCardGrossCents}");

    const trip = read("src/pages/trips/TripDetailPage.tsx");
    expect(trip).toContain('payMethod === "card_on_arrival"');
    expect(trip).toContain("deposit_cents: grossCents || 0");
    expect(trip).not.toContain('mode: "deposit",');

    const admin = read(
      "src/pages/admin/lodging/AdminLodgingReservationDetailPage.tsx",
    );
    expect(admin).toContain("reservationPayMethod");
    expect(admin).toContain("deposit_cents: cardRetryGrossCents");
    expect(admin).toContain("mode: cardRetryMode");
  });
});
