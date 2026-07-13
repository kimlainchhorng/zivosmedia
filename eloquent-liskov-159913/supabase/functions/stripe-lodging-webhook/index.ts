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
      .select("id, store_id, paid_cents, total_cents, payment_provider, stripe_payment_intent_id")
      .eq("id", reservationId)
      .maybeSingle();
    if (!r || (r as any).payment_provider !== "stripe") return;
    const settled = (r as any).paid_cents || (r as any).total_cents || 0;
    if (!settled) return;

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
  const queueAutoReversal = async (reservationId: string, reason: string) => {
    const { data: ledger } = await admin
      .from("lodge_payout_ledger")
      .select("id, stripe_transfer_id, amount_cents")
      .eq("reservation_id", reservationId)
      .eq("direction", "transfer")
      .eq("status", "created")
      .maybeSingle();
    if (!ledger || !(ledger as any).stripe_transfer_id) return;

    const { error: insertErr } = await admin
      .from("lodge_payout_ledger")
      .insert({
        reservation_id: reservationId,
        store_id: null as any, // copied from transfer row below
        stripe_account_id: "",
        direction: "reversal",
        amount_cents: (ledger as any).amount_cents,
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
        { amount: (ledger as any).amount_cents, metadata: { reservation_id: reservationId, reason } },
        { idempotencyKey: `lodging-reversal-${reservationId}` },
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
  }

  // If insert returned nothing, it was a duplicate — skip side effects.
  if (!inserted) {
    return new Response(
      JSON.stringify({ received: true, dedup: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const logRowId = inserted.id;

  const updateByPI = async (
    paymentIntentId: string,
    payment_status: string,
    extra: Record<string, any> = {},
  ) => {
    const { error } = await admin
      .from("lodge_reservations")
      .update({
        payment_status,
        stripe_last_event_at: eventStamp,
        stripe_last_event_type: eventType,
        ...extra,
      })
      .eq("stripe_payment_intent_id", paymentIntentId);
    if (error) console.error("[stripe-lodging-webhook] update failed", error);
  };

  let processingStatus: "applied" | "skipped" | "error" = "skipped";
  let processingError: string | null = null;

  try {
    switch (eventType) {
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object;
        await updateByPI(pi.id, "authorized", {
          last_payment_error: null,
          payment_provider: "stripe",
          status: "confirmed",
        });
        processingStatus = "applied";
        break;
      }
      case "payment_intent.processing": {
        const pi = event.data.object;
        await updateByPI(pi.id, "processing");
        processingStatus = "applied";
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        await updateByPI(pi.id, "captured", {
          last_payment_error: null,
          paid_cents: Number(pi.amount_received || pi.amount || 0),
          payment_provider: "stripe",
          status: "confirmed",
        });
        if (resolvedReservationId) {
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
        processingStatus = "applied";
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const errMsg =
          pi?.last_payment_error?.message ||
          pi?.last_payment_error?.code ||
          "Stripe reported a payment failure";
        await updateByPI(pi.id, "failed", { last_payment_error: errMsg });
        processingStatus = "applied";
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object;
        await updateByPI(pi.id, "unpaid");
        processingStatus = "applied";
        break;
      }
      case "charge.refund.updated": {
        const refund = event.data.object;
        const piId = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
        if (piId) {
          if (refund.status === "pending") {
            await updateByPI(piId, "refund_pending");
          } else if (refund.status === "succeeded") {
            await updateByPI(piId, "refunded");
            if (resolvedReservationId) {
              try { await queueAutoReversal(resolvedReservationId, "refund.updated"); } catch (e) { console.warn("[stripe-lodging-webhook] reversal skipped", e); }
              try {
                const refundCents = Number(refund.amount ?? 0);
                if (refundCents > 0) {
                  await notifyLodgingRefundIssued(admin, resolvedReservationId, refundCents, "Card", "complete");
                }
              } catch (e) { console.warn("[stripe-lodging-webhook] refund email skipped", e); }
            }
          } else if (refund.status === "failed" || refund.status === "canceled") {
            await updateByPI(piId, "captured", { last_payment_error: `Refund ${refund.status}` });
          }
          processingStatus = "applied";
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (piId) {
          await updateByPI(piId, "refunded");
          if (resolvedReservationId) {
            try { await queueAutoReversal(resolvedReservationId, "charge.refunded"); } catch (e) { console.warn("[stripe-lodging-webhook] reversal skipped", e); }
          }
          processingStatus = "applied";
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object;
        const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        if (piId) {
          const { error } = await admin
            .from("lodge_reservations")
            .update({
              stripe_payment_intent_id: piId,
              stripe_last_event_at: eventStamp,
              stripe_last_event_type: eventType,
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
  await admin
    .from("lodging_stripe_webhook_events")
    .update({
      processing_status: processingStatus,
      error_message: processingError,
      reservation_id: resolvedReservationId,
    })
    .eq("id", logRowId);

  return new Response(JSON.stringify({ received: true, status: processingStatus }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}, { rateLimit: "payment", strictCors: true, skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));
