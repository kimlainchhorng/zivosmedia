/**
 * stripe-bus-webhook
 *
 * Provider-event confirmation + reconciliation for the bus vertical. Listens to Stripe
 * payment_intent + charge events for bus bookings (identified by
 * metadata.bus_booking_id or by a matching bus_bookings.stripe_payment_intent_id) and
 * updates bus_bookings.status / payment_status idempotently.
 *
 * This is the "confirm only from a trusted provider event" path required by the shared
 * contract (docs/ZIVO_TRAVEL_BUS_CONTRACT_V1.md §7). It complements the interim
 * operator-driven capture-bus-payment: whichever moves the booking first, the other
 * reconciles to the same terminal state without double-writing.
 *
 * Idempotency: every event is persisted to bus_stripe_webhook_events with
 * UNIQUE(stripe_event_id); Stripe redeliveries are dropped before any state change. State
 * transitions are additionally guarded so a late/out-of-order event never regresses a
 * booking (e.g. an "authorized" arriving after "captured" is a no-op).
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY,
 * STRIPE_WEBHOOK_SECRET (use STRIPE_BUS_WEBHOOK_SECRET if a dedicated endpoint secret is
 * provisioned).
 *
 * NOTE: STAGED, NOT DEPLOYED. The bus payment functions are held out of deploy while the
 * Supabase project is at its edge-function cap and the cutover plan keeps operator capture
 * as the interim model. Deploy alongside create-bus-payment-intent / capture-bus-payment
 * with sandbox Stripe secrets once a slot is freed.
 *
 * No withSecurity JWT/CORS gate: Stripe webhooks are authenticated by signature
 * verification, not JWT; bot/WAF rules do not apply to provider-to-provider HTTPS.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";
import {
  type BusPaymentStatus,
  decideBusReconciliation,
} from "../_shared/busWebhookTransitions.ts";

Deno.serve(
  withSecurity(
    "stripe-bus-webhook",
    async (req) => {
      if (req.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
      }

      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      const webhookSecret =
        Deno.env.get("STRIPE_BUS_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      if (!stripeKey || !webhookSecret) {
        return new Response(JSON.stringify({ error: "Stripe not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const stripe = new (Stripe as any)(stripeKey, { apiVersion: "2025-08-27.basil" });
      const sig = req.headers.get("stripe-signature");
      const body = await req.text();

      let event: any;
      try {
        event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
      } catch (e: any) {
        console.error("[stripe-bus-webhook] sig verify failed", e?.message);
        return new Response(`signature error: ${e?.message}`, { status: 400 });
      }

      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const eventType = event.type as string;
      const eventStamp = new Date().toISOString();
      const obj = event.data?.object || {};

      // Resolve the PaymentIntent id from any relevant event object shape.
      const piId: string | null =
        obj.object === "payment_intent" && obj.id
          ? obj.id
          : typeof obj.payment_intent === "string"
            ? obj.payment_intent
            : obj.payment_intent?.id || null;

      // Prefer the explicit metadata link create-bus-payment-intent stamps on the PI.
      const metaBookingId: string | null =
        obj?.metadata?.bus_booking_id ||
        obj?.payment_intent?.metadata?.bus_booking_id ||
        null;

      // --- Idempotent event log (dedup Stripe redeliveries) ---------------------------
      const trimmedPayload = {
        id: event.id,
        type: event.type,
        created: event.created,
        api_version: event.api_version,
        livemode: event.livemode,
        data: { object: { ...obj, customer: undefined } },
      };

      const { data: inserted, error: insertErr } = await admin
        .from("bus_stripe_webhook_events")
        .upsert(
          {
            stripe_event_id: event.id,
            event_type: eventType,
            event_created_at: event.created
              ? new Date(event.created * 1000).toISOString()
              : null,
            booking_id: metaBookingId,
            stripe_payment_intent_id: piId,
            processing_status: "received",
            payload: trimmedPayload,
          },
          { onConflict: "stripe_event_id", ignoreDuplicates: true },
        )
        .select("id")
        .maybeSingle();

      if (insertErr) {
        console.error("[stripe-bus-webhook] event log insert failed", insertErr);
      }

      // ignoreDuplicates returns no row on a redelivery -> already processed.
      if (!inserted) {
        return new Response(JSON.stringify({ received: true, dedup: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const logRowId = (inserted as any).id;

      // --- Resolve the bus booking ----------------------------------------------------
      let booking: any = null;
      if (metaBookingId) {
        const { data } = await admin
          .from("bus_bookings")
          .select("id, status, payment_status, stripe_payment_intent_id")
          .eq("id", metaBookingId)
          .maybeSingle();
        booking = data || null;
      }
      if (!booking && piId) {
        const { data } = await admin
          .from("bus_bookings")
          .select("id, status, payment_status, stripe_payment_intent_id")
          .eq("stripe_payment_intent_id", piId)
          .maybeSingle();
        booking = data || null;
      }

      if (!booking) {
        await admin
          .from("bus_stripe_webhook_events")
          .update({ processing_status: "skipped", error_message: "no_matching_bus_booking" })
          .eq("id", logRowId);
        return new Response(
          JSON.stringify({ received: true, status: "skipped", reason: "not_bus" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // --- Decide the target state (pure, no-regress, idempotent) ---------------------
      const curPay = (booking.payment_status || "pending") as BusPaymentStatus;
      const refundSucceeded =
        eventType === "charge.refunded" ||
        obj?.status === "succeeded" ||
        obj?.refunded === true;

      const decision = decideBusReconciliation({
        eventType,
        currentPaymentStatus: curPay,
        currentBookingStatus: booking.status,
        refundSucceeded,
      });

      let processingStatus: "applied" | "skipped" | "error" = "skipped";
      let processingError: string | null = null;

      try {
        if (decision.apply && decision.targetPay) {
          const update: Record<string, unknown> = {
            payment_status: decision.targetPay,
            stripe_last_event_at: eventStamp,
            stripe_last_event_type: eventType,
          };
          if (decision.targetBooking && booking.status !== decision.targetBooking) {
            update.status = decision.targetBooking;
          }
          if (!booking.stripe_payment_intent_id && piId) {
            update.stripe_payment_intent_id = piId;
          }

          const { error: uErr } = await admin
            .from("bus_bookings")
            .update(update)
            .eq("id", booking.id);
          if (uErr) throw uErr;
          processingStatus = "applied";
        } else {
          processingStatus = "skipped";
        }
      } catch (e: any) {
        processingStatus = "error";
        processingError = String(e?.message || e);
        console.error("[stripe-bus-webhook] handler error", e);
      }

      await admin
        .from("bus_stripe_webhook_events")
        .update({
          processing_status: processingStatus,
          error_message: processingError,
          booking_id: booking.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", logRowId);

      return new Response(JSON.stringify({ received: true, status: processingStatus }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    { strictCors: true, allowedMethods: ["POST"], skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" },
  ),
);
