/**
 * stripe-car-rental-webhook
 * Listens to Stripe payment_intent + charge events whose metadata.type starts
 * with "car_rental_" and updates car_rental_reservations.payment_status.
 *
 * Mirrors stripe-lodging-webhook: persists every event to
 * car_rental_stripe_webhook_events with UNIQUE(stripe_event_id) so Stripe
 * redeliveries are idempotently dropped.
 */
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const CAR_RENTAL_TYPES = new Set([
  "car_rental_deposit",
  "car_rental_balance",
  "car_rental_full",
  "car_rental_deposit_refund",
]);

Deno.serve(withSecurity("stripe-car-rental-webhook", async (req) => {
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
    console.error("[stripe-car-rental-webhook] sig verify failed", e?.message);
    return new Response(`signature error: ${e.message}`, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const eventType = event.type as string;
  const eventStamp = new Date().toISOString();
  const obj = event.data?.object || {};

  // Only handle events whose metadata.type is a known car-rental type.
  // (The same Stripe account fires events for lodging, salon, etc. — we
  // ignore everything that's not ours, but still log it for debugging.)
  const metaType =
    obj?.metadata?.type
    || obj?.payment_intent?.metadata?.type
    || obj?.charge?.metadata?.type
    || null;
  const isCarRentalEvent = metaType ? CAR_RENTAL_TYPES.has(metaType) : false;

  const piId =
    obj.id && obj.object === "payment_intent" ? obj.id :
    typeof obj.payment_intent === "string" ? obj.payment_intent :
    obj.payment_intent?.id || null;

  // Resolve reservation_id from the PI (covers deposit + balance + refund).
  let resolvedReservationId: string | null = obj?.metadata?.reservation_id || null;
  if (!resolvedReservationId && piId) {
    const { data: depMatch } = await admin
      .from("car_rental_reservations")
      .select("id")
      .eq("stripe_payment_intent_id", piId)
      .maybeSingle();
    resolvedReservationId = (depMatch as any)?.id || null;
    if (!resolvedReservationId) {
      const { data: balMatch } = await admin
        .from("car_rental_reservations")
        .select("id")
        .eq("stripe_balance_payment_intent_id", piId)
        .maybeSingle();
      resolvedReservationId = (balMatch as any)?.id || null;
    }
  }

  // Trim payload — Stripe sends a lot, we keep just enough to debug.
  const trimmedPayload = {
    id: event.id,
    type: event.type,
    created: event.created,
    api_version: event.api_version,
    livemode: event.livemode,
    data: { object: { ...obj, customer: undefined } },
  };

  const { data: inserted, error: insertErr } = await admin
    .from("car_rental_stripe_webhook_events")
    .upsert(
      {
        stripe_event_id: event.id,
        event_type: eventType,
        event_created_at: event.created ? new Date(event.created * 1000).toISOString() : null,
        reservation_id: resolvedReservationId,
        stripe_payment_intent_id: piId,
        processing_status: "received",
        payload: trimmedPayload,
      },
      { onConflict: "stripe_event_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (insertErr) {
    console.error("[stripe-car-rental-webhook] event log insert failed", insertErr);
  }

  // Duplicate Stripe redelivery — drop quietly.
  if (!inserted) {
    return new Response(
      JSON.stringify({ received: true, dedup: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  const logRowId = inserted.id;

  // If this isn't a car-rental event, log it as skipped and stop here.
  if (!isCarRentalEvent) {
    await admin
      .from("car_rental_stripe_webhook_events")
      .update({ processing_status: "skipped" })
      .eq("id", logRowId);
    return new Response(
      JSON.stringify({ received: true, status: "skipped", reason: "not_car_rental" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const updateByDepositPI = async (
    paymentIntentId: string,
    payment_status: string,
    extra: Record<string, any> = {},
  ) => {
    const { error } = await admin
      .from("car_rental_reservations")
      .update({
        payment_status,
        stripe_last_event_at: eventStamp,
        stripe_last_event_type: eventType,
        ...extra,
      })
      .eq("stripe_payment_intent_id", paymentIntentId);
    if (error) console.error("[stripe-car-rental-webhook] deposit update failed", error);
  };

  const updateByBalancePI = async (
    paymentIntentId: string,
    payment_status: string,
    extra: Record<string, any> = {},
  ) => {
    const { error } = await admin
      .from("car_rental_reservations")
      .update({
        payment_status,
        stripe_last_event_at: eventStamp,
        stripe_last_event_type: eventType,
        ...extra,
      })
      .eq("stripe_balance_payment_intent_id", paymentIntentId);
    if (error) console.error("[stripe-car-rental-webhook] balance update failed", error);
  };

  let processingStatus: "applied" | "skipped" | "error" = "skipped";
  let processingError: string | null = null;

  try {
    switch (eventType) {
      // Deposit pre-auth landed and is now held against the card.
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object;
        await updateByDepositPI(pi.id, "authorized", {
          status: "confirmed",
          deposit_paid_cents: Number(pi.amount_capturable || pi.amount || 0),
          stripe_payment_method_id: typeof pi.payment_method === "string"
            ? pi.payment_method
            : pi.payment_method?.id || null,
          last_payment_error: null,
        });
        processingStatus = "applied";
        break;
      }
      // Immediate-capture mode: the full total was charged at booking.
      // OR balance was successfully captured at pickup.
      // OR a refund cleared (charge.refunded covers the refund branch).
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const piMetaType = pi?.metadata?.type;
        const amountReceived = Number(pi.amount_received || pi.amount || 0);
        const pmId = typeof pi.payment_method === "string"
          ? pi.payment_method
          : pi.payment_method?.id || null;

        if (piMetaType === "car_rental_balance") {
          // Balance PI succeeded → reservation is fully paid.
          await updateByBalancePI(pi.id, "paid", {
            amount_paid_cents: undefined as any, // calculated below via RPC fallback
            stripe_charge_id: typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge?.id || null,
            last_payment_error: null,
          });
          if (resolvedReservationId) {
            // Best-effort: sum deposit + balance into amount_paid_cents.
            const { data: cur } = await admin
              .from("car_rental_reservations")
              .select("deposit_paid_cents")
              .eq("id", resolvedReservationId)
              .maybeSingle();
            await admin
              .from("car_rental_reservations")
              .update({
                amount_paid_cents: Number((cur as any)?.deposit_paid_cents || 0) + amountReceived,
              })
              .eq("id", resolvedReservationId);
          }
        } else if (piMetaType === "car_rental_full") {
          // Immediate-capture mode: full total charged at booking.
          await updateByDepositPI(pi.id, "paid", {
            status: "confirmed",
            amount_paid_cents: amountReceived,
            stripe_charge_id: typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge?.id || null,
            stripe_payment_method_id: pmId,
            last_payment_error: null,
          });
        } else if (piMetaType === "car_rental_deposit") {
          // Manual-capture deposit that was eventually captured (rare —
          // typical flow keeps it as a hold until return).
          await updateByDepositPI(pi.id, "captured", {
            stripe_charge_id: typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge?.id || null,
            last_payment_error: null,
          });
        }
        processingStatus = "applied";
        break;
      }
      case "payment_intent.processing": {
        const pi = event.data.object;
        const piMetaType = pi?.metadata?.type;
        if (piMetaType === "car_rental_balance") {
          await updateByBalancePI(pi.id, "processing");
        } else {
          await updateByDepositPI(pi.id, "processing");
        }
        processingStatus = "applied";
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const errMsg =
          pi?.last_payment_error?.message
          || pi?.last_payment_error?.code
          || "Stripe reported a payment failure";
        const piMetaType = pi?.metadata?.type;
        if (piMetaType === "car_rental_balance") {
          await updateByBalancePI(pi.id, "failed", { last_payment_error: errMsg });
        } else {
          await updateByDepositPI(pi.id, "failed", { last_payment_error: errMsg });
        }
        processingStatus = "applied";
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object;
        const piMetaType = pi?.metadata?.type;
        if (piMetaType === "car_rental_balance") {
          await updateByBalancePI(pi.id, "unpaid");
        } else {
          // A deposit pre-auth was cancelled (e.g. by refund flow).
          await updateByDepositPI(pi.id, "refunded");
        }
        processingStatus = "applied";
        break;
      }
      case "charge.refund.updated": {
        const refund = event.data.object;
        const piIdRef = typeof refund.payment_intent === "string"
          ? refund.payment_intent
          : refund.payment_intent?.id;
        if (piIdRef) {
          if (refund.status === "pending") {
            await updateByDepositPI(piIdRef, "refund_pending");
          } else if (refund.status === "succeeded") {
            await updateByDepositPI(piIdRef, "refunded", { stripe_refund_id: refund.id });
          } else if (refund.status === "failed" || refund.status === "canceled") {
            await updateByDepositPI(piIdRef, "captured", {
              last_payment_error: `Refund ${refund.status}`,
            });
          }
          processingStatus = "applied";
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const piIdRef = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (piIdRef) {
          await updateByDepositPI(piIdRef, "refunded");
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
    console.error("[stripe-car-rental-webhook] handler error", e);
  }

  await admin
    .from("car_rental_stripe_webhook_events")
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
