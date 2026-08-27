/**
 * stripe-lodging-webhook
 * Listens to Stripe payment_intent + charge events and updates lodge_reservations.payment_status.
 * Also stamps `stripe_last_event_at` + `stripe_last_event_type` on every handled event so the
 * UI can surface a live "Updated 12s ago · payment_intent.succeeded" caption.
 *
 * Persists every event to `lodging_stripe_webhook_events` with a unique constraint on
 * `stripe_event_id` so duplicates (Stripe redelivery) are idempotently dropped.
 */
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { notifyLodgingBookingConfirmed, notifyLodgingRefundIssued } from "../_shared/lodging-notifications.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import {
  allowedCurrentLodgingPaymentStatuses,
  calculateLodgingTransferReversalCents,
  deriveLodgingPaymentAuthority,
  hasCurrentLodgingPaymentAuthorityMetadata,
  isAuthoritativeLodgingCheckoutSession,
  isAuthoritativeLodgingPaymentIntent,
  isCompleteLodgingPaymentIntentTransition,
  requiredStripeStatusForLodgingRecovery,
} from "../_shared/lodgingPaymentAuthority.ts";

const PAYMENT_BOUNDARY_SELECT =
  "id, store_id, guest_details, total_cents, deposit_cents, paid_cents, payment_status, stripe_session_id, stripe_payment_intent_id, stripe_last_event_at, stripe_last_event_type";

Deno.serve(withSecurity("stripe-lodging-webhook", async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const stripe = new (Stripe as any)(stripeKey, { apiVersion: "2024-11-20.acacia" });
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (e: any) {
    console.error("[stripe-lodging-webhook] sig verify failed", e?.message);
    return new Response(`signature error: ${e.message}`, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const eventType = event.type as string;
  const eventStamp = new Date().toISOString();
  const TRANSFER_IN_FLIGHT_RETRY = "lodging_transfer_in_flight_retry";
  const providerEventStamp = Number.isSafeInteger(event.created) && event.created > 0
    ? new Date(event.created * 1000).toISOString()
    : eventStamp;

  /**
   * Auto-transfer the hotel's share to their Connect account on a successful
   * payment. Idempotent — UNIQUE(reservation_id, direction) on the ledger
   * means a webhook redelivery can't double-transfer. If the hotel hasn't
   * onboarded Connect (or has opted out), we no-op and the existing manual
   * `lodge-payout-request` flow still works.
   */
  const queueAutoTransfer = async (reservationId: string) => {
    const { data: r } = await admin
      .from("lodge_reservations")
      .select("id, store_id, paid_cents, payment_status, payment_provider, stripe_payment_intent_id")
      .eq("id", reservationId)
      .maybeSingle();
    if (
      !r
      || (r as any).payment_provider !== "stripe"
      || (r as any).payment_status !== "captured"
    ) return;
    const settled = Number((r as any).paid_cents || 0);
    if (!Number.isSafeInteger(settled) || settled <= 0) return;

    const { data: store } = await admin
      .from("restaurants")
      .select("id, stripe_account_id, commission_rate, auto_payout_enabled")
      .eq("id", (r as any).store_id)
      .maybeSingle();
    if (!store?.stripe_account_id || (store as any).auto_payout_enabled === false) return;

    const rate = Number((store as any).commission_rate ?? 0.10);
    const commissionCents = Math.round(settled * rate);
    const transferCents = Math.max(0, settled - commissionCents);
    if (transferCents <= 0) return;

    // Reserve the ledger row first so duplicates fail the UNIQUE constraint.
    const { error: insertErr } = await admin
      .from("lodge_payout_ledger")
      .insert({
        reservation_id: reservationId,
        store_id: (r as any).store_id,
        stripe_account_id: (store as any).stripe_account_id,
        direction: "transfer",
        amount_cents: transferCents,
        commission_cents: commissionCents,
        commission_rate: rate,
        status: "queued",
      });
    if (insertErr) {
      // 23505 = unique violation — we've already done this transfer.
      if ((insertErr as any).code === "23505") return;
      console.error("[stripe-lodging-webhook] ledger reserve failed", insertErr);
      return;
    }

    // Close the window between reading payment state and reserving the payout.
    // A refund event that won the race must prevent the external transfer.
    const { data: stillCaptured, error: capturedCheckError } = await admin
      .from("lodge_reservations")
      .select("id")
      .eq("id", reservationId)
      .eq("payment_status", "captured")
      .eq("paid_cents", settled)
      .maybeSingle();
    if (capturedCheckError || !stillCaptured) {
      await admin
        .from("lodge_payout_ledger")
        .update({
          status: "failed",
          error_message: "Payment state changed before transfer",
          updated_at: new Date().toISOString(),
        })
        .eq("reservation_id", reservationId)
        .eq("direction", "transfer")
        .eq("status", "queued");
      return;
    }

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: transferCents,
          currency: "usd",
          destination: (store as any).stripe_account_id,
          source_transaction: undefined, // direct platform balance transfer
          transfer_group: `lodging-${reservationId}`,
          metadata: {
            reservation_id: reservationId,
            store_id: (r as any).store_id,
            commission_cents: String(commissionCents),
            type: "lodging_auto_transfer",
          },
        },
        { idempotencyKey: `lodging-transfer-${reservationId}` },
      );
      await admin
        .from("lodge_payout_ledger")
        .update({ status: "created", stripe_transfer_id: transfer.id, updated_at: new Date().toISOString() })
        .eq("reservation_id", reservationId)
        .eq("direction", "transfer");
    } catch (e: any) {
      const msg = String(e?.message || e);
      console.error("[stripe-lodging-webhook] auto-transfer failed", msg);
      await admin
        .from("lodge_payout_ledger")
        .update({ status: "failed", error_message: msg, updated_at: new Date().toISOString() })
        .eq("reservation_id", reservationId)
        .eq("direction", "transfer");
    }
  };

  /**
   * Reverse the auto-transfer when a refund is issued. Stripe transfer
   * reversals pull money back from the connected account onto our platform
   * balance so the refund doesn't come out of our pocket.
   */
  const queueAutoReversal = async (
    reservationId: string,
    reason: string,
    refundId: string,
    refundCents: number,
  ) => {
    const { data: ledger, error: ledgerError } = await admin
      .from("lodge_payout_ledger")
      .select("id, stripe_transfer_id, amount_cents, store_id, stripe_account_id, status")
      .eq("reservation_id", reservationId)
      .eq("direction", "transfer")
      .maybeSingle();
    if (ledgerError) throw ledgerError;
    if ((ledger as any)?.status === "queued") {
      // A signed refund won the race with the external transfer call. Mark the
      // webhook attempt retryable so a redelivery observes either `created`
      // and reverses it, or `failed` and safely no-ops.
      throw new Error(TRANSFER_IN_FLIGHT_RETRY);
    }
    if (
      !ledger
      || (ledger as any).status !== "created"
      || !(ledger as any).stripe_transfer_id
    ) return;

    const { data: reservation } = await admin
      .from("lodge_reservations")
      .select("paid_cents")
      .eq("id", reservationId)
      .maybeSingle();
    const settledCents = Number((reservation as any)?.paid_cents || 0);
    const transferCents = Number((ledger as any).amount_cents || 0);
    const reversalCents = calculateLodgingTransferReversalCents({
      transferCents,
      settledCents,
      refundCents,
    });
    if (!reversalCents) return;

    // The current schema permits one reversal row per reservation. A future
    // multi-refund policy needs a per-refund ledger key and migration; until
    // then the first signed refund owns the single idempotent reversal.
    const { error: insertErr } = await admin
      .from("lodge_payout_ledger")
      .insert({
        reservation_id: reservationId,
        store_id: (ledger as any).store_id,
        stripe_account_id: (ledger as any).stripe_account_id,
        direction: "reversal",
        amount_cents: reversalCents,
        commission_cents: 0,
        status: "queued",
      });
    if (insertErr) {
      if ((insertErr as any).code === "23505") return;
      console.error("[stripe-lodging-webhook] reversal reserve failed", insertErr);
      return;
    }

    try {
      const reversal = await stripe.transfers.createReversal(
        (ledger as any).stripe_transfer_id,
        {
          amount: reversalCents,
          metadata: {
            reservation_id: reservationId,
            reason,
            refund_id: refundId,
            refund_cents: String(refundCents),
          },
        },
        { idempotencyKey: `lodging-reversal-${reservationId}-${refundId}` },
      );
      await admin
        .from("lodge_payout_ledger")
        .update({ status: "created", stripe_reversal_id: reversal.id, updated_at: new Date().toISOString() })
        .eq("reservation_id", reservationId)
        .eq("direction", "reversal");
    } catch (e: any) {
      const msg = String(e?.message || e);
      console.error("[stripe-lodging-webhook] auto-reversal failed", msg);
      await admin
        .from("lodge_payout_ledger")
        .update({ status: "failed", error_message: msg, updated_at: new Date().toISOString() })
        .eq("reservation_id", reservationId)
        .eq("direction", "reversal");
    }
  };

  // Pull common identifiers off the event for the log row
  const obj = event.data?.object || {};
  const piIdRaw =
    obj.id && obj.object === "payment_intent" ? obj.id :
    typeof obj.payment_intent === "string" ? obj.payment_intent :
    obj.payment_intent?.id || null;
  const sessionIdRaw = obj.object === "checkout.session" ? obj.id : null;

  // Try to resolve reservation_id ahead of insert (best-effort; non-blocking)
  let resolvedReservationId: string | null = null;
  if (piIdRaw) {
    const { data } = await admin
      .from("lodge_reservations")
      .select("id")
      .eq("stripe_payment_intent_id", piIdRaw)
      .maybeSingle();
    resolvedReservationId = (data as any)?.id || null;
  }
  if (!resolvedReservationId && sessionIdRaw) {
    const { data } = await admin
      .from("lodge_reservations")
      .select("id")
      .eq("stripe_session_id", sessionIdRaw)
      .maybeSingle();
    resolvedReservationId = (data as any)?.id || null;
  }

  // Trim payload so we don't blow past row size limits
  const trimmedPayload = {
    id: event.id,
    type: event.type,
    created: event.created,
    api_version: event.api_version,
    livemode: event.livemode,
    data: { object: { ...obj, customer: undefined } },
  };

  // Idempotent insert. Conflict means we've seen this event before — short-circuit.
  const { data: inserted, error: insertErr } = await admin
    .from("lodging_stripe_webhook_events")
    .upsert(
      {
        stripe_event_id: event.id,
        event_type: eventType,
        event_created_at: event.created ? new Date(event.created * 1000).toISOString() : null,
        reservation_id: resolvedReservationId,
        stripe_payment_intent_id: piIdRaw,
        stripe_session_id: sessionIdRaw,
        processing_status: "received",
        payload: trimmedPayload,
      },
      { onConflict: "stripe_event_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (insertErr) {
    console.error("[stripe-lodging-webhook] event log insert failed", insertErr);
    // Do not acknowledge an event we could not durably deduplicate. A non-2xx
    // response lets Stripe retry instead of silently losing payment state.
    return new Response(JSON.stringify({ received: false, error: "event_log_unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let logRowId = inserted?.id as string | undefined;
  if (!logRowId) {
    // A previously failed handler is retryable. Atomically reclaim only rows
    // marked `error`; applied/skipped/actively-received events remain deduped.
    const { data: retryClaim, error: retryClaimError } = await admin
      .from("lodging_stripe_webhook_events")
      .update({ processing_status: "received", error_message: null })
      .eq("stripe_event_id", event.id)
      .eq("processing_status", "error")
      .select("id")
      .maybeSingle();
    if (retryClaimError) {
      console.error("[stripe-lodging-webhook] retry claim failed", retryClaimError);
      return new Response(JSON.stringify({ received: false, error: "event_retry_unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    logRowId = retryClaim?.id as string | undefined;
    if (!logRowId) {
      return new Response(
        JSON.stringify({ received: true, dedup: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const checkPaymentIntentAuthority = async (paymentIntent: any) => {
    const paymentIntentId = typeof paymentIntent?.id === "string" ? paymentIntent.id : "";
    const byPaymentIntent = await admin
      .from("lodge_reservations")
      .select(PAYMENT_BOUNDARY_SELECT)
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();
    if (byPaymentIntent.error) throw byPaymentIntent.error;
    let reservation = byPaymentIntent.data as any;
    let linkedSession: any = null;

    // Stripe does not guarantee webhook order. If the PaymentIntent event
    // arrives before checkout.session.completed, prove its link through the
    // stored, versioned Checkout Session before backfilling the PI identifier.
    if (!reservation) {
      const metadataReservationId = typeof paymentIntent?.metadata?.reservation_id === "string"
        ? paymentIntent.metadata.reservation_id
        : "";
      const byMetadata = await admin
        .from("lodge_reservations")
        .select(PAYMENT_BOUNDARY_SELECT)
        .eq("id", metadataReservationId)
        .maybeSingle();
      if (byMetadata.error) throw byMetadata.error;
      const candidate = byMetadata.data as any;
      if (
        candidate
        && !candidate.stripe_payment_intent_id
        && candidate.stripe_session_id
      ) {
        linkedSession = await stripe.checkout.sessions.retrieve(candidate.stripe_session_id);
        const linkedPaymentIntentId = typeof linkedSession.payment_intent === "string"
          ? linkedSession.payment_intent
          : linkedSession.payment_intent?.id;
        if (linkedPaymentIntentId === paymentIntentId) reservation = candidate;
      }
    }
    if (!reservation) {
      return { ok: false as const, reservationId: null, reason: "reservation_not_found" };
    }

    const r = reservation as any;
    const authority = deriveLodgingPaymentAuthority(r);
    if (!authority.ok) {
      return { ok: false as const, reservationId: r.id, reason: authority.reason };
    }
    if (!isAuthoritativeLodgingPaymentIntent({
      paymentIntent,
      paymentIntentId,
      reservationId: r.id,
      storeId: r.store_id,
      mode: authority.mode,
      payableCents: authority.payableCents,
    }) || !isCompleteLodgingPaymentIntentTransition({
      eventType,
      paymentIntent,
      payableCents: authority.payableCents,
    })) {
      return { ok: false as const, reservationId: r.id, reason: "provider_terms_mismatch" };
    }
    if (linkedSession && !isAuthoritativeLodgingCheckoutSession({
      session: linkedSession,
      reservationId: r.id,
      storeId: r.store_id,
      mode: authority.mode,
      payableCents: authority.payableCents,
    })) {
      return { ok: false as const, reservationId: r.id, reason: "session_terms_mismatch" };
    }
    if (!r.stripe_payment_intent_id) {
      const { data: linked, error: linkError } = await admin
        .from("lodge_reservations")
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq("id", r.id)
        .is("stripe_payment_intent_id", null)
        .select("id")
        .maybeSingle();
      if (linkError) throw linkError;
      if (!linked) {
        return { ok: false as const, reservationId: r.id, reason: "payment_intent_link_changed" };
      }
      r.stripe_payment_intent_id = paymentIntentId;
    }

    return { ok: true as const, reservation: r, authority };
  };

  const checkCheckoutSessionAuthority = async (session: any) => {
    const sessionId = typeof session?.id === "string" ? session.id : "";
    const { data: reservation, error } = await admin
      .from("lodge_reservations")
      .select(PAYMENT_BOUNDARY_SELECT)
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!reservation) {
      return { ok: false as const, reservationId: null, reason: "reservation_not_found" };
    }

    const r = reservation as any;
    const sessionPaymentIntentId = typeof session?.payment_intent === "string"
      ? session.payment_intent
      : session?.payment_intent?.id;
    if (
      r.stripe_payment_intent_id
      && r.stripe_payment_intent_id === sessionPaymentIntentId
      && hasCurrentLodgingPaymentAuthorityMetadata(session?.metadata)
      && session?.metadata?.reservation_id === r.id
      && session?.metadata?.store_id === r.store_id
      && String(session?.currency || "").toLowerCase() === "usd"
    ) {
      return { ok: true as const, reservation: r, authority: null };
    }
    const authority = deriveLodgingPaymentAuthority(r);
    if (!authority.ok) {
      return { ok: false as const, reservationId: r.id, reason: authority.reason };
    }
    if (!isAuthoritativeLodgingCheckoutSession({
      session,
      reservationId: r.id,
      storeId: r.store_id,
      mode: authority.mode,
      payableCents: authority.payableCents,
    })) {
      return { ok: false as const, reservationId: r.id, reason: "provider_terms_mismatch" };
    }

    return { ok: true as const, reservation: r, authority };
  };

  const updateByPI = async (
    paymentIntentId: string,
    payment_status: string,
    extra: Record<string, any> = {},
    allowedCurrentStatuses: readonly string[] = [],
  ) => {
    let query = admin
      .from("lodge_reservations")
      .update({
        payment_status,
        stripe_last_event_at: providerEventStamp,
        stripe_last_event_type: eventType,
        ...extra,
      })
      .eq("stripe_payment_intent_id", paymentIntentId);
    if (allowedCurrentStatuses.length) {
      query = query.in("payment_status", allowedCurrentStatuses);
    }
    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw error;
    return Boolean(data);
  };

  let processingStatus: "applied" | "skipped" | "error" = "skipped";
  let processingError: string | null = null;
  const rejectPaymentAuthority = async (failure: { reservationId: string | null; reason: string }) => {
    // This is a durable provider/business-term rejection, not a transient
    // handler failure. Record it without asking Stripe to redeliver forever.
    processingStatus = "skipped";
    processingError = `payment_authority:${failure.reason}`;
    if (failure.reservationId) {
      await admin
        .from("lodge_reservations")
        .update({
          payment_status: "failed",
          last_payment_error: "Stripe payment terms require review",
          stripe_last_event_at: providerEventStamp,
          stripe_last_event_type: eventType,
        })
        .eq("id", failure.reservationId)
        .in("payment_status", ["pending", "processing"]);
    }
  };

  try {
    switch (eventType) {
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object;
        const check = await checkPaymentIntentAuthority(pi);
        if (!check.ok) {
          await rejectPaymentAuthority(check);
          break;
        }
        resolvedReservationId = check.reservation.id;
        let allowedCurrentStatuses = allowedCurrentLodgingPaymentStatuses(eventType);
        const requiredProviderStatus = requiredStripeStatusForLodgingRecovery({
          eventType,
          currentPaymentStatus: check.reservation.payment_status,
        });
        if (requiredProviderStatus) {
          const currentPaymentIntent = await stripe.paymentIntents.retrieve(pi.id);
          if (currentPaymentIntent.status !== requiredProviderStatus) {
            processingStatus = "skipped";
            break;
          }
          const currentCheck = await checkPaymentIntentAuthority(currentPaymentIntent);
          if (!currentCheck.ok) {
            await rejectPaymentAuthority(currentCheck);
            break;
          }
          allowedCurrentStatuses = [...allowedCurrentStatuses, "failed"];
        }
        const applied = await updateByPI(pi.id, "authorized", {
          last_payment_error: null,
          payment_provider: "stripe",
          status: "confirmed",
        }, allowedCurrentStatuses);
        processingStatus = applied ? "applied" : "skipped";
        break;
      }
      case "payment_intent.processing": {
        const pi = event.data.object;
        const check = await checkPaymentIntentAuthority(pi);
        if (!check.ok) {
          await rejectPaymentAuthority(check);
          break;
        }
        resolvedReservationId = check.reservation.id;
        const applied = await updateByPI(
          pi.id,
          "processing",
          {},
          allowedCurrentLodgingPaymentStatuses(eventType),
        );
        processingStatus = applied ? "applied" : "skipped";
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const check = await checkPaymentIntentAuthority(pi);
        if (!check.ok) {
          await rejectPaymentAuthority(check);
          break;
        }
        resolvedReservationId = check.reservation.id;
        const paidCents = Number(check.reservation.paid_cents || 0) + Number(pi.amount_received || 0);
        const applied = await updateByPI(pi.id, "captured", {
          last_payment_error: null,
          paid_cents: paidCents,
          payment_provider: "stripe",
          status: "confirmed",
        }, allowedCurrentLodgingPaymentStatuses(eventType));
        if (applied && resolvedReservationId) {
          // Guest confirmation email + SMS (idempotent — keyed on paid amount).
          try {
            await notifyLodgingBookingConfirmed(admin, resolvedReservationId, "Card");
          } catch (e) {
            console.warn("[stripe-lodging-webhook] confirmation email skipped", e);
          }
          // Auto-transfer the hotel's share via Stripe Connect (idempotent —
          // ledger UNIQUE(reservation_id, direction) blocks double-transfer).
          try {
            await queueAutoTransfer(resolvedReservationId);
          } catch (e) {
            console.warn("[stripe-lodging-webhook] auto-transfer skipped", e);
          }
        }
        processingStatus = applied ? "applied" : "skipped";
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const check = await checkPaymentIntentAuthority(pi);
        if (!check.ok) {
          await rejectPaymentAuthority(check);
          break;
        }
        resolvedReservationId = check.reservation.id;
        const errMsg =
          pi?.last_payment_error?.message ||
          pi?.last_payment_error?.code ||
          "Stripe reported a payment failure";
        const applied = await updateByPI(
          pi.id,
          "failed",
          { last_payment_error: errMsg },
          allowedCurrentLodgingPaymentStatuses(eventType),
        );
        processingStatus = applied ? "applied" : "skipped";
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object;
        const check = await checkPaymentIntentAuthority(pi);
        if (!check.ok) {
          await rejectPaymentAuthority(check);
          break;
        }
        resolvedReservationId = check.reservation.id;
        const applied = await updateByPI(
          pi.id,
          "unpaid",
          {},
          allowedCurrentLodgingPaymentStatuses(eventType),
        );
        processingStatus = applied ? "applied" : "skipped";
        break;
      }
      case "charge.refund.updated": {
        const refund = event.data.object;
        const piId = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
        if (piId) {
          if (refund.status === "pending") {
            processingStatus = await updateByPI(
              piId,
              "refund_pending",
              {},
              ["pending", "processing", "failed", "authorized", "captured", "paid", "refund_pending"],
            )
              ? "applied"
              : "skipped";
          } else if (refund.status === "succeeded") {
            const applied = await updateByPI(
              piId,
              "refunded",
              {},
              ["pending", "processing", "failed", "authorized", "captured", "paid", "refund_pending", "refunded"],
            );
            if (applied && resolvedReservationId) {
              const refundCents = Number(refund.amount ?? 0);
              const refundId = typeof refund.id === "string" ? refund.id : `${piId}-${refundCents}`;
              try {
                await queueAutoReversal(
                  resolvedReservationId,
                  "refund.updated",
                  refundId,
                  refundCents,
                );
              } catch (e: any) {
                if (e?.message === TRANSFER_IN_FLIGHT_RETRY) throw e;
                console.warn("[stripe-lodging-webhook] reversal skipped", e);
              }
              try {
                if (refundCents > 0) {
                  await notifyLodgingRefundIssued(admin, resolvedReservationId, refundCents, "Card", "complete");
                }
              } catch (e) { console.warn("[stripe-lodging-webhook] refund email skipped", e); }
            }
            processingStatus = applied ? "applied" : "skipped";
          } else if (refund.status === "failed" || refund.status === "canceled") {
            const reviewApplied = await updateByPI(
              piId,
              "refund_pending",
              { last_payment_error: `Refund ${refund.status}` },
              ["pending", "processing", "failed", "authorized", "refund_pending"],
            );
            const capturedApplied = reviewApplied
              ? false
              : await updateByPI(
                piId,
                "captured",
                { last_payment_error: `Refund ${refund.status}` },
                ["captured", "paid"],
              );
            processingStatus = reviewApplied || capturedApplied ? "applied" : "skipped";
          }
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (piId) {
          const applied = await updateByPI(
            piId,
            "refunded",
            {},
            ["pending", "processing", "failed", "authorized", "captured", "paid", "refund_pending", "refunded"],
          );
          if (applied && resolvedReservationId) {
            const refund = Array.isArray(charge?.refunds?.data) ? charge.refunds.data[0] : null;
            const refundCents = Number(refund?.amount ?? charge.amount_refunded ?? 0);
            const refundId = typeof refund?.id === "string"
              ? refund.id
              : `${charge.id || piId}-${refundCents}`;
            try {
              await queueAutoReversal(
                resolvedReservationId,
                "charge.refunded",
                refundId,
                refundCents,
              );
            } catch (e: any) {
              if (e?.message === TRANSFER_IN_FLIGHT_RETRY) throw e;
              console.warn("[stripe-lodging-webhook] reversal skipped", e);
            }
          }
          processingStatus = applied ? "applied" : "skipped";
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object;
        const check = await checkCheckoutSessionAuthority(session);
        if (!check.ok) {
          await rejectPaymentAuthority(check);
          break;
        }
        resolvedReservationId = check.reservation.id;
        const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        if (piId) {
          const { error } = await admin
            .from("lodge_reservations")
            .update({
              stripe_payment_intent_id: piId,
            })
            .eq("stripe_session_id", session.id)
            .is("stripe_payment_intent_id", null);
          if (error) console.error("[stripe-lodging-webhook] backfill PI failed", error);
          processingStatus = "applied";
        }
        break;
      }
      default:
        processingStatus = "skipped";
        break;
    }
  } catch (e: any) {
    processingStatus = "error";
    processingError = String(e?.message || e);
    console.error("[stripe-lodging-webhook] handler error", e);
  }

  // Stamp the log row with the final processing status
  const { error: logUpdateError } = await admin
    .from("lodging_stripe_webhook_events")
    .update({
      processing_status: processingStatus,
      error_message: processingError,
      reservation_id: resolvedReservationId,
    })
    .eq("id", logRowId);

  if (logUpdateError) {
    console.error("[stripe-lodging-webhook] event log finalization failed", logUpdateError);
    return new Response(JSON.stringify({ received: false, error: "event_log_finalize_failed" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true, status: processingStatus }), {
    status: processingStatus === "error" ? 503 : 200,
    headers: { "Content-Type": "application/json" },
  });
}, { rateLimit: "payment", strictCors: true, allowedMethods: ["POST"], skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));
