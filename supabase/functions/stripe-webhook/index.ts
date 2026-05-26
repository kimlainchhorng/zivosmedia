/**
 * Stripe Webhook Handler - OTA-Grade Payment Processing
 * Handles: checkout.session.completed, payment_intent.succeeded/failed, 
 * charge.refunded, charge.dispute.created
 */
import { serve, createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { notifyEatsOrderConfirmed, notifyEatsRefundIssued } from "../_shared/eats-notifications.ts";
import { notifyGroceryOrderConfirmed } from "../_shared/grocery-notifications.ts";
import { creditCreatorTipToWallet } from "../_shared/tipWalletCredit.ts";

// Audit logging helper
async function logPaymentAudit(
  supabase: any,
  data: {
    bookingId?: string;
    stripeEventType: string;
    stripeEventId?: string;
    stripePaymentIntentId?: string;
    duffelAction?: string;
    amount?: number;
    currency?: string;
    status: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    await supabase.from('flight_payment_audit_log').insert({
      booking_id: data.bookingId || null,
      stripe_event_type: data.stripeEventType,
      stripe_event_id: data.stripeEventId,
      stripe_payment_intent_id: data.stripePaymentIntentId,
      duffel_action: data.duffelAction,
      amount: data.amount,
      currency: data.currency || 'USD',
      status: data.status,
      error_message: data.errorMessage,
      metadata: data.metadata || {},
    });
  } catch (err) {
    console.error('[Audit] Failed to log payment event:', err);
  }
}

async function upsertPurchaseRecord(
  supabase: any,
  input: {
    userId?: string | null;
    transactionId: string;
    sourceType: string;
    amountCents: number;
    currency: string;
    status?: string;
    metadata?: Record<string, any>;
  }
) {
  const payload = {
    user_id: input.userId || null,
    transaction_id: input.transactionId,
    source_type: input.sourceType,
    amount_cents: input.amountCents,
    currency: (input.currency || 'USD').toUpperCase(),
    status: input.status || 'completed',
    metadata: input.metadata || {},
  };

  const { error } = await supabase
    .from('purchase_records')
    .upsert(payload, { onConflict: 'transaction_id' });

  if (error) {
    console.error('[Webhook] Failed to upsert purchase record:', error);
  }
}

function addMonthsUtc(date: Date, months: number) {
  const next = new Date(date.getTime());
  const originalDate = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months);
  if (next.getUTCDate() < originalDate) {
    next.setUTCDate(0);
  }
  return next;
}

function normalizeZivoPlusStatus(status: string | null | undefined) {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "past_due":
    case "unpaid":
      return "paused";
    default:
      return "expired";
  }
}

async function syncZivoPlusSubscription(
  supabase: any,
  input: {
    userId: string;
    planId: string;
    status: string;
    billingCycle: string;
    currentPeriodStart: string;
    currentPeriodEnd?: string;
    stripeSubscriptionId?: string | null;
    extendByMonths?: number;
  },
) {
  const normalizedStatus = normalizeZivoPlusStatus(input.status);
  const now = new Date();
  const { data: existing, error: existingError } = await supabase
    .from("zivo_subscriptions")
    .select("id, current_period_end")
    .eq("user_id", input.userId)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const basePeriodEnd = existing?.current_period_end && new Date(existing.current_period_end) > now
    ? new Date(existing.current_period_end)
    : now;
  const currentPeriodEnd = input.extendByMonths
    ? addMonthsUtc(basePeriodEnd, input.extendByMonths).toISOString()
    : input.currentPeriodEnd;

  if (!currentPeriodEnd) {
    throw new Error("current_period_end is required for ZIVO+ subscription sync");
  }

  const payload = {
    user_id: input.userId,
    plan_id: input.planId,
    status: normalizedStatus,
    billing_cycle: input.billingCycle === "yearly" ? "yearly" : "monthly",
    current_period_start: input.currentPeriodStart,
    current_period_end: currentPeriodEnd,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    cancelled_at: normalizedStatus === "cancelled" ? now.toISOString() : null,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("zivo_subscriptions")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("zivo_subscriptions")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data?.id ?? null;
}

async function upsertShopPulse(
  supabase: any,
  storeId: string,
  transactionId: string,
) {
  if (!storeId) return;

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('shop_live_pulse')
    .upsert(
      {
        store_id: storeId,
        last_purchase_at: nowIso,
        last_event_id: transactionId,
        updated_at: nowIso,
      },
      { onConflict: 'store_id' }
    );

  if (error) {
    console.error('[Webhook] Failed to upsert live pulse:', error);
  }
}

serve(withSecurity("stripe-webhook", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
      status: 405,
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    /**
     * Auto-transfer the restaurant's share to their Connect account on a paid
     * Eats order. Idempotent — UNIQUE(order_id, direction) on the ledger
     * prevents double-transfer on webhook redelivery. Skips silently when the
     * restaurant hasn't onboarded Connect or has opted out.
     */
    const queueEatsAutoTransfer = async (orderId: string) => {
      const { data: o } = await supabase
        .from("food_orders")
        .select("id, restaurant_id, total_amount, payment_provider, payment_status")
        .eq("id", orderId)
        .maybeSingle();
      if (!o || (o as any).payment_status !== "paid") return;
      // Only Stripe-paid orders get an auto-transfer; PayPal/Square route through their own webhooks.
      if ((o as any).payment_provider && (o as any).payment_provider !== "stripe") return;
      const settledCents = Math.round(Number((o as any).total_amount || 0) * 100);
      if (!settledCents) return;

      const { data: r } = await supabase
        .from("restaurants")
        .select("id, stripe_account_id, commission_rate, auto_payout_enabled")
        .eq("id", (o as any).restaurant_id)
        .maybeSingle();
      if (!r?.stripe_account_id || (r as any).auto_payout_enabled === false) return;

      const rate = Number((r as any).commission_rate ?? 0.10);
      const commissionCents = Math.round(settledCents * rate);
      const transferCents = Math.max(0, settledCents - commissionCents);
      if (transferCents <= 0) return;

      const { error: insertErr } = await supabase
        .from("eats_payout_ledger")
        .insert({
          order_id: orderId,
          restaurant_id: (o as any).restaurant_id,
          stripe_account_id: (r as any).stripe_account_id,
          direction: "transfer",
          amount_cents: transferCents,
          commission_cents: commissionCents,
          commission_rate: rate,
          status: "queued",
        });
      if (insertErr) {
        if ((insertErr as any).code === "23505") return; // already done
        console.error("[stripe-webhook] eats ledger reserve failed", insertErr);
        return;
      }

      try {
        const transfer = await stripe.transfers.create(
          {
            amount: transferCents,
            currency: "usd",
            destination: (r as any).stripe_account_id,
            transfer_group: `eats-${orderId}`,
            metadata: {
              order_id: orderId,
              restaurant_id: (o as any).restaurant_id,
              commission_cents: String(commissionCents),
              type: "eats_auto_transfer",
            },
          },
          { idempotencyKey: `eats-transfer-${orderId}` },
        );
        await supabase
          .from("eats_payout_ledger")
          .update({ status: "created", stripe_transfer_id: transfer.id, updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .eq("direction", "transfer");
      } catch (e: any) {
        const msg = String(e?.message || e);
        console.error("[stripe-webhook] eats auto-transfer failed", msg);
        await supabase
          .from("eats_payout_ledger")
          .update({ status: "failed", error_message: msg, updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .eq("direction", "transfer");
      }
    };

    /**
     * Reverse the auto-transfer when an Eats refund completes.
     */
    const queueEatsAutoReversal = async (orderId: string, reason: string) => {
      const { data: ledger } = await supabase
        .from("eats_payout_ledger")
        .select("id, stripe_transfer_id, amount_cents, restaurant_id, stripe_account_id")
        .eq("order_id", orderId)
        .eq("direction", "transfer")
        .eq("status", "created")
        .maybeSingle();
      if (!ledger || !(ledger as any).stripe_transfer_id) return;

      const { error: insertErr } = await supabase
        .from("eats_payout_ledger")
        .insert({
          order_id: orderId,
          restaurant_id: (ledger as any).restaurant_id,
          stripe_account_id: (ledger as any).stripe_account_id,
          direction: "reversal",
          amount_cents: (ledger as any).amount_cents,
          commission_cents: 0,
          status: "queued",
        });
      if (insertErr) {
        if ((insertErr as any).code === "23505") return;
        console.error("[stripe-webhook] eats reversal reserve failed", insertErr);
        return;
      }

      try {
        const reversal = await stripe.transfers.createReversal(
          (ledger as any).stripe_transfer_id,
          { amount: (ledger as any).amount_cents, metadata: { order_id: orderId, reason } },
          { idempotencyKey: `eats-reversal-${orderId}` },
        );
        await supabase
          .from("eats_payout_ledger")
          .update({ status: "created", stripe_reversal_id: reversal.id, updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .eq("direction", "reversal");
      } catch (e: any) {
        const msg = String(e?.message || e);
        console.error("[stripe-webhook] eats auto-reversal failed", msg);
        await supabase
          .from("eats_payout_ledger")
          .update({ status: "failed", error_message: msg, updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .eq("direction", "reversal");
      }
    };

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Webhook signature verification failed:", errMessage);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // SECURITY: Webhook signature verification is mandatory
      console.error("[Webhook] Missing STRIPE_WEBHOOK_SECRET or stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Webhook signature verification required. Configure STRIPE_WEBHOOK_SECRET." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("[Webhook] Processing event:", event.type, "ID:", event.id);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id;

        console.log("[Webhook] Checkout completed:", session.id, "Type:", metadata.type);

        // Creator one-time / lifetime tier purchase — recurring tiers go through
        // customer.subscription.created instead. Identify by metadata.tier_id +
        // creator_id + subscriber_id and a non-subscription session mode.
        if (metadata.tier_id && metadata.creator_id && metadata.subscriber_id && session.mode === "payment") {
          const row = {
            creator_id: metadata.creator_id,
            subscriber_id: metadata.subscriber_id,
            tier_id: metadata.tier_id,
            status: "active",
            price_cents: session.amount_total ?? null,
            stripe_session_id: session.id,
            payment_method: "stripe",
            started_at: new Date().toISOString(),
            // Lifetime — no expiry. (NULL expires_at signals lifetime.)
            expires_at: null,
          } as any;
          const { error: subErr } = await supabase
            .from("creator_subscriptions")
            .upsert(row, { onConflict: "stripe_session_id" });
          if (subErr) {
            console.error("[Webhook] lifetime tier upsert failed", subErr);
          } else {
            console.log("[Webhook] Lifetime creator tier activated", { session: session.id });
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                body: JSON.stringify({
                  user_id: metadata.creator_id,
                  notification_type: "creator_new_subscriber",
                  title: "New lifetime subscriber 💎",
                  body: `Someone bought your lifetime tier — that's permanent revenue.`,
                  data: { type: "creator_new_subscriber", tier_id: metadata.tier_id, action_url: "/creator/dashboard" },
                }),
              });
            } catch {}
          }
          break;
        }

        if (metadata.type === "zivo_plus_gift") {
          const recipientId = metadata.gift_recipient_id || metadata.user_id;
          const planId = metadata.plan_id;
          const giftMonths = Number.parseInt(metadata.gift_months || "0", 10);
          const giftLabel = metadata.gift_duration_label || metadata.gift_duration || "premium";

          if (session.payment_status !== "paid") {
            console.log("[Webhook] ZIVO+ gift checkout not paid yet:", session.id);
          } else if (!recipientId || !planId || !Number.isFinite(giftMonths) || giftMonths <= 0) {
            console.error("[Webhook] ZIVO+ gift metadata missing", { session: session.id, recipientId, planId, giftMonths });
          } else {
            const now = new Date().toISOString();
            try {
              const localSubscriptionId = await syncZivoPlusSubscription(supabase, {
                userId: recipientId,
                planId,
                status: "active",
                billingCycle: metadata.billing_cycle || (giftMonths >= 12 ? "yearly" : "monthly"),
                currentPeriodStart: now,
                extendByMonths: giftMonths,
              });
              console.log("[Webhook] ZIVO+ gift activated", { recipientId, session: session.id, localSubscriptionId });

              if (metadata.gift_sender_id) {
                try {
                  const giftCoins = giftMonths >= 12 ? 2500 : giftMonths >= 6 ? 1500 : 1000;
                  const giftPayload = {
                    kind: "premium_gift",
                    gift_key: `zivo_premium_${metadata.gift_duration || `${giftMonths}_months`}`,
                    name: `ZIVO Premium ${giftLabel}`,
                    icon: "Premium",
                    coins: giftCoins,
                    total_coins: giftCoins,
                    premium_months: giftMonths,
                    subscription_id: localSubscriptionId,
                    stripe_session_id: session.id,
                  };
                  const { data: existingGiftMessage, error: existingGiftError } = await supabase
                    .from("direct_messages")
                    .select("id")
                    .eq("sender_id", metadata.gift_sender_id)
                    .eq("receiver_id", recipientId)
                    .eq("message_type", "gift")
                    .contains("gift_payload", { stripe_session_id: session.id })
                    .maybeSingle();

                  if (existingGiftError) {
                    console.warn("[Webhook] Premium gift message lookup failed", existingGiftError);
                  } else if (!existingGiftMessage) {
                    const { data: giftMessage, error: giftMessageError } = await supabase
                      .from("direct_messages")
                      .insert({
                        sender_id: metadata.gift_sender_id,
                        receiver_id: recipientId,
                        message: `Gifted ${metadata.gift_recipient_name || "this chat"} ${giftLabel} of ZIVO Premium`,
                        message_type: "gift",
                        gift_payload: giftPayload,
                      })
                      .select("id")
                      .single();

                    if (giftMessageError) {
                      console.error("[Webhook] Premium gift chat message insert failed", giftMessageError);
                    } else {
                      await supabase.rpc("fn_record_gift_transaction", {
                        p_sender: metadata.gift_sender_id,
                        p_receiver: recipientId,
                        p_gift_key: giftPayload.gift_key,
                        p_gift_name: giftPayload.name,
                        p_coins: giftCoins,
                        p_combo: 1,
                        p_note: null,
                        p_message_id: giftMessage.id,
                      });
                    }
                  }
                } catch (messageErr) {
                  console.error("[Webhook] Premium gift chat message failed", messageErr);
                }
              }

              try {
                await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                  body: JSON.stringify({
                    user_id: recipientId,
                    notification_type: "membership_gift_received",
                    title: "ZIVO Premium gift received",
                    body: `You received ${giftLabel} of ZIVO Premium.`,
                    data: { type: "membership_gift_received", action_url: "/zivo-plus", subscription_id: localSubscriptionId },
                  }),
                });
              } catch {}

              if (metadata.gift_sender_id) {
                try {
                  await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                    body: JSON.stringify({
                      user_id: metadata.gift_sender_id,
                      notification_type: "membership_gift_sent",
                      title: "Premium gift sent",
                      body: `Your ${giftLabel} ZIVO Premium gift was delivered.`,
                      data: { type: "membership_gift_sent", recipient_id: recipientId, action_url: "/chat" },
                    }),
                  });
                } catch {}
              }
            } catch (giftErr) {
              console.error("[Webhook] ZIVO+ gift activation failed", giftErr);
            }
          }
        }

        if (metadata.type === "ride") {
          // Update ride request
          const { error } = await supabase
            .from("ride_requests")
            .update({
              status: "paid",
              payment_status: "paid",
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("stripe_checkout_session_id", session.id);

          if (error) {
            console.error("Error updating ride request:", error);
          } else {
            console.log("Ride request updated to paid:", metadata.ride_request_id);
            // Notify rider: payment confirmed
            if (metadata.rider_id || metadata.user_id || metadata.customer_id) {
              const uid = metadata.rider_id || metadata.user_id || metadata.customer_id;
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                  body: JSON.stringify({ user_id: uid, notification_type: "payment_confirmed", title: "Ride Payment Confirmed ✅", body: `Your ride payment of $${((session.amount_total || 0) / 100).toFixed(2)} was successful`, data: { type: "payment_confirmed", service: "ride", action_url: `/rides/tracking/${metadata.ride_request_id}` } }),
                });
              } catch {}
            }
          }
        } else if (metadata.type === "eats") {
          // Update food order
          const { error } = await supabase
            .from("food_orders")
            .update({
              status: "pending",
              payment_status: "paid",
              stripe_payment_id: paymentIntentId,
              placed_at: new Date().toISOString(),
            })
            .eq("stripe_checkout_session_id", session.id);

          if (error) {
            console.error("Error updating food order:", error);
          } else {
            console.log("Food order updated to paid:", metadata.order_id);
            // Notify customer: order confirmed
            if (metadata.user_id || metadata.customer_id) {
              const uid = metadata.user_id || metadata.customer_id;
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                  body: JSON.stringify({ user_id: uid, notification_type: "payment_confirmed", title: "Order Confirmed 🍕", body: `Your order payment of $${((session.amount_total || 0) / 100).toFixed(2)} was successful`, data: { type: "payment_confirmed", service: "eats", action_url: `/eats/${metadata.order_id}` } }),
                });
              } catch {}
            }
          }
        } else if (metadata.type === "p2p") {
          // Update P2P booking
          const { error } = await supabase
            .from("p2p_bookings")
            .update({
              status: "confirmed",
              payment_status: "captured",
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq("stripe_checkout_session_id", session.id);

          if (error) {
            console.error("Error updating P2P booking:", error);
          } else {
            console.log("P2P booking updated to captured:", metadata.booking_id);
          }
        } else if (metadata.type === "flight") {
          // Log payment audit
          await logPaymentAudit(supabase, {
            bookingId: metadata.booking_id,
            stripeEventType: event.type,
            stripeEventId: event.id,
            stripePaymentIntentId: paymentIntentId,
            status: 'success',
            amount: session.amount_total ? session.amount_total / 100 : undefined,
            currency: session.currency?.toUpperCase(),
            metadata: { checkout_session_id: session.id },
          });

          // Update flight booking with explicit payment confirmation
          const { data: updatedBooking, error: updateError } = await supabase
            .from("flight_bookings")
            .update({
              payment_status: "paid",
              stripe_payment_intent_id: paymentIntentId,
              ticketing_status: "processing",
            })
            .eq("stripe_checkout_session_id", session.id)
            .select()
            .single();

          if (updateError) {
            console.error("[Webhook] Error updating flight booking:", updateError);
            
            await logPaymentAudit(supabase, {
              bookingId: metadata.booking_id,
              stripeEventType: event.type,
              stripeEventId: event.id,
              status: 'error',
              errorMessage: updateError.message,
            });

            await supabase.from('flight_admin_alerts').insert({
              booking_id: metadata.booking_id,
              alert_type: 'payment_failed',
              message: `Failed to update booking after payment: ${updateError.message}`,
              severity: 'critical',
            });
            break;
          }

          console.log("[Webhook] Flight booking paid:", metadata.booking_id);

          // Notify user: flight payment confirmed
          if (metadata.user_id) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                body: JSON.stringify({ user_id: metadata.user_id, notification_type: "payment_confirmed", title: "Flight Payment Confirmed ✈️", body: `Your flight payment of $${((session.amount_total || 0) / 100).toFixed(2)} was successful. Ticketing in progress.`, data: { type: "payment_confirmed", service: "flight", booking_id: metadata.booking_id, action_url: `/bookings/${metadata.booking_id}` } }),
              });
            } catch {}
          }
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-flight-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                type: "payment_receipt",
                bookingId: metadata.booking_id,
              }),
            });
            console.log("[Webhook] Payment receipt email triggered");
          } catch (emailErr) {
            console.error("[Webhook] Payment email failed:", emailErr);
          }
          
          // Trigger ticketing with explicit error handling
          try {
            const ticketResponse = await fetch(`${supabaseUrl}/functions/v1/issue-flight-ticket`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ bookingId: metadata.booking_id }),
            });
            
            if (!ticketResponse.ok) {
              const ticketError = await ticketResponse.json();
              console.error("[Webhook] Ticketing trigger failed:", ticketError);
              
              await logPaymentAudit(supabase, {
                bookingId: metadata.booking_id,
                stripeEventType: 'ticketing_triggered',
                stripeEventId: event.id,
                duffelAction: 'create_order_failed',
                status: 'error',
                errorMessage: ticketError.error || 'Ticketing failed',
              });
            } else {
              console.log("[Webhook] Ticketing triggered successfully for:", metadata.booking_id);
              
              await logPaymentAudit(supabase, {
                bookingId: metadata.booking_id,
                stripeEventType: 'ticketing_triggered',
                stripeEventId: event.id,
                duffelAction: 'create_order',
                status: 'success',
              });
            }
          } catch (ticketErr) {
            console.error("[Webhook] Error triggering ticketing:", ticketErr);
            await supabase.from('flight_admin_alerts').insert({
              booking_id: metadata.booking_id,
              alert_type: 'ticketing_failed',
              message: `Failed to trigger ticketing after payment: ${ticketErr instanceof Error ? ticketErr.message : 'Unknown error'}`,
              severity: 'critical',
            });
          }
        } else if (metadata.type === "travel") {
          // Handle travel bookings (hotels, activities, transfers)
          console.log("[Webhook] Travel checkout completed:", session.id, "Order:", metadata.orderId);

          // Update payment status
          await supabase
            .from("travel_payments")
            .update({ status: "succeeded" })
            .eq("stripe_checkout_session_id", session.id);

          // Trigger booking confirmation with Hotelbeds
          try {
            const confirmResponse = await fetch(`${supabaseUrl}/functions/v1/confirm-hotelbeds-booking`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ orderId: metadata.orderId }),
            });

            if (!confirmResponse.ok) {
              const confirmError = await confirmResponse.json();
              console.error("[Webhook] Travel booking confirmation failed:", confirmError);

              // Update order status to failed
              await supabase
                .from("travel_orders")
                .update({ status: "failed" })
                .eq("id", metadata.orderId);

              // Log audit event
              await supabase.from("booking_audit_logs").insert({
                order_id: metadata.orderId,
                event: "booking_confirmation_failed",
                meta: { error: confirmError.error, checkout_session_id: session.id },
              });
            } else {
              console.log("[Webhook] Travel booking confirmed for order:", metadata.orderNumber);
            }
          } catch (confirmErr) {
            console.error("[Webhook] Error confirming travel booking:", confirmErr);

            await supabase
              .from("travel_orders")
              .update({ status: "failed" })
              .eq("id", metadata.orderId);

            await supabase.from("booking_audit_logs").insert({
              order_id: metadata.orderId,
              event: "booking_confirmation_error",
              meta: {
                error: confirmErr instanceof Error ? confirmErr.message : "Unknown error",
                checkout_session_id: session.id,
              },
            });
          }
        } else if (metadata.type === "creator_tip") {
          // Tip via create-tip-checkout. The function inserts creator_tips with
          // status='pending' + payment_intent_id = session.payment_intent OR
          // session.id (depending on availability at session-create time).
          // Without this branch, tips stay pending forever — creator never
          // sees them as succeeded.
          if (session.payment_status !== "paid") {
            console.log("[Webhook] creator_tip session not yet paid:", session.id);
          } else {
            // Resolve the tip row by either payment_intent_id (if set during
            // create) or by session.id (fallback used when PI isn't known yet).
            const piRef = paymentIntentId ?? session.id;
            const sessionRef = session.id;
            const tipperId = metadata.tipper_id;

            // Try by payment_intent_id first; if no row, try by session.id.
            const tipSelect = "id, status, creator_id, amount_cents, tipper_id, is_anonymous, message";
            let tipRow: any = null;
            const { data: byPi } = await supabase
              .from("creator_tips")
              .select(tipSelect)
              .eq("payment_intent_id", piRef)
              .maybeSingle();
            tipRow = byPi ?? null;
            if (!tipRow) {
              const { data: bySession } = await supabase
                .from("creator_tips")
                .select(tipSelect)
                .eq("payment_intent_id", sessionRef)
                .maybeSingle();
              tipRow = bySession ?? null;
            }

            if (!tipRow) {
              console.warn("[Webhook] creator_tip row not found", { session: session.id, pi: piRef });
            } else if (tipRow.status === "succeeded") {
              console.log("[Webhook] creator_tip already succeeded", { tip: tipRow.id });
              // Still attempt the wallet credit — idempotent via reference_id.
              await creditCreatorTipToWallet(supabase, tipRow);
            } else {
              const { error: tipErr } = await supabase
                .from("creator_tips")
                .update({
                  status: "succeeded",
                  payment_provider: "stripe",
                  payment_intent_id: paymentIntentId ?? sessionRef,
                  last_payment_error: null,
                })
                .eq("id", tipRow.id);
              if (tipErr) {
                console.error("[Webhook] creator_tip flip failed", tipErr);
              } else {
                console.log("[Webhook] creator_tip succeeded", { tip: tipRow.id });
                await creditCreatorTipToWallet(supabase, tipRow);
                // Push notify the creator + tipper
                const creatorId = metadata.creator_id;
                const isAnon = metadata.is_anonymous === "true";
                if (creatorId) {
                  try {
                    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                      body: JSON.stringify({
                        user_id: creatorId,
                        notification_type: "tip_received",
                        title: "You received a tip! 💰",
                        body: `${isAnon ? "Someone" : "A fan"} sent you $${(((session.amount_total || 0)) / 100).toFixed(2)}`,
                        data: { type: "tip_received", amount_cents: session.amount_total ?? 0, action_url: "/wallet" },
                      }),
                    });
                  } catch {}
                }
              }
            }
          }
        } else if (metadata.type === "reel_boost") {
          // Reel boost via create-reel-boost. Without this branch, the buyer
          // pays but the reel is never marked as boosted. Idempotent via
          // merchant_boosts.payment_ref UNIQUE-ish on session id.
          if (session.payment_status !== "paid") {
            console.log("[Webhook] reel_boost session not yet paid:", session.id);
          } else {
            const storeId = metadata.store_id || null;
            const reelId = metadata.reel_id || null;
            const amountCents = session.amount_total || 0;
            const featuredDays = 7; // matches the standard boost duration
            const featuredUntil = new Date(Date.now() + featuredDays * 24 * 60 * 60 * 1000).toISOString();

            const { data: existing } = await supabase
              .from("merchant_boosts")
              .select("id")
              .eq("payment_ref", session.id)
              .maybeSingle();

            if (existing) {
              console.log("[Webhook] reel_boost already credited:", session.id);
            } else if (!storeId) {
              console.warn("[Webhook] reel_boost missing store_id metadata", { session: session.id });
            } else {
              const { error: boostErr } = await supabase.from("merchant_boosts").insert({
                store_id: storeId,
                amount_cents: amountCents,
                currency: (session.currency || "usd").toUpperCase(),
                paid_via: "stripe",
                payment_ref: session.id,
                featured_until: featuredUntil,
                status: "active",
              });
              if (boostErr) {
                console.error("[Webhook] reel_boost insert failed", boostErr);
              } else {
                console.log("[Webhook] reel_boost activated", { store: storeId, reel: reelId, until: featuredUntil });
                // Notify the merchant
                const buyer = metadata.user_id;
                if (buyer) {
                  try {
                    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                      body: JSON.stringify({
                        user_id: buyer,
                        notification_type: "boost_activated",
                        title: "Boost active 🚀",
                        body: `Your reel boost is now live for ${featuredDays} days.`,
                        data: { type: "boost_activated", reel_id: reelId, action_url: "/shop-dashboard/attribution" },
                      }),
                    });
                  } catch {}
                }
              }
            }
          }
        } else if (metadata.type === "ads_wallet_topup" || metadata.store_id && metadata.amount_cents) {
          // SAFETY NET for ads-wallet top-ups. Primary path is verify-ads-wallet-topup
          // (called by SPA on return). If the buyer closed the tab on Stripe's
          // hosted page, they never come back to call verify and the wallet
          // never credits — even though Stripe captured the funds. This branch
          // mirrors verify-ads-wallet-topup and is idempotent via the
          // ads_wallet_ledger.ref_id check.
          if (session.payment_status !== "paid") {
            console.log("[Webhook] ads_wallet_topup session not yet paid:", session.id);
          } else {
            const storeId = metadata.store_id;
            const amountCents = Number(metadata.amount_cents || session.amount_total || 0);
            if (!storeId || !amountCents) {
              console.warn("[Webhook] ads_wallet_topup missing storeId/amount", { session: session.id });
            } else {
              const { data: existing } = await supabase
                .from("ads_wallet_ledger")
                .select("id")
                .eq("ref_id", session.id)
                .maybeSingle();
              if (existing) {
                console.log("[Webhook] ads_wallet_topup already credited:", session.id);
              } else {
                const { data: wallet } = await supabase
                  .from("ads_studio_wallet")
                  .select("balance_cents")
                  .eq("store_id", storeId)
                  .maybeSingle();
                const newBalance = (wallet?.balance_cents ?? 0) + amountCents;

                let paymentMethodId: string | null = null;
                try {
                  if (paymentIntentId) {
                    const stripe = new Stripe(stripeKey!, { apiVersion: "2025-08-27.basil" });
                    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
                    paymentMethodId = (typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id) ?? null;
                  }
                } catch (e) { console.warn("[Webhook] couldn't retrieve PI for ads_wallet_topup", e); }

                const upd: Record<string, unknown> = { balance_cents: newBalance, last_recharge_at: new Date().toISOString() };
                if (paymentMethodId) upd.stripe_payment_method_id = paymentMethodId;
                await supabase.from("ads_studio_wallet").upsert(
                  { store_id: storeId, ...upd },
                  { onConflict: "store_id" }
                );

                await supabase.from("ads_wallet_ledger").insert({
                  store_id: storeId,
                  entry_type: "topup",
                  amount_cents: amountCents,
                  balance_after_cents: newBalance,
                  ref_id: session.id,
                  ref_type: "stripe_checkout_session",
                  description: `Stripe top-up $${(amountCents / 100).toFixed(2)} (webhook safety net)`,
                });
                console.log("[Webhook] ads_wallet credit safety net fired", { store: storeId, amount: amountCents, session: session.id });
              }
            }
          }
        }
        // ──── Record 2% platform fee ────
        const merchantId = metadata.merchant_id || metadata.restaurant_id || metadata.store_id || null;

        if (session.amount_total && session.amount_total > 0) {
          try {
            const grossCents = session.amount_total;
            const feePct = 2.00;

            // Check for active fee waiver
            let waived = false;
            let waiverId = null;
            if (merchantId) {
              const { data: waiver } = await supabase
                .from("merchant_fee_waivers")
                .select("id, waiver_pct")
                .eq("store_id", merchantId)
                .gte("expires_at", new Date().toISOString())
                .lte("starts_at", new Date().toISOString())
                .order("waiver_pct", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (waiver && waiver.waiver_pct >= 100) {
                waived = true;
                waiverId = waiver.id;
              }
            }

            const feeAmountCents = waived ? 0 : Math.round(grossCents * feePct / 100);

            await supabase.from("platform_fee_ledger").insert({
              order_type: metadata.type || "general",
              order_id: session.id,
              merchant_id: merchantId,
              gross_amount_cents: grossCents,
              fee_pct: waived ? 0 : feePct,
              fee_amount_cents: feeAmountCents,
              waived,
              waiver_id: waiverId,
            });

            if (feeAmountCents > 0) {
              await supabase.from("admin_wallet_ledger").upsert(
                {
                  source_type: "platform_fee",
                  source_id: session.id,
                  transaction_id: session.id,
                  amount_cents: feeAmountCents,
                  currency: session.currency?.toUpperCase() || "USD",
                  metadata: {
                    order_type: metadata.type || "general",
                    merchant_id: merchantId,
                    gross_amount_cents: grossCents,
                    fee_pct: feePct,
                  },
                },
                { onConflict: "transaction_id,source_type,source_id" }
              );
            }

            console.log("[Webhook] Platform fee recorded:", feeAmountCents, "cents", waived ? "(WAIVED)" : "");
          } catch (feeErr) {
            console.error("[Webhook] Platform fee recording failed:", feeErr);
          }
        }

        if (session.amount_total && session.amount_total > 0) {
          const userId = metadata.user_id || metadata.customer_id || metadata.rider_id || null;
          await upsertPurchaseRecord(supabase, {
            userId,
            transactionId: session.id,
            sourceType: metadata.type || 'stripe_checkout',
            amountCents: session.amount_total,
            currency: session.currency?.toUpperCase() || 'USD',
            status: 'completed',
            metadata: {
              stripe_event_id: event.id,
              stripe_payment_intent_id: paymentIntentId,
              merchant_id: merchantId,
              checkout_session_id: session.id,
              meta_event_id: session.id,
            },
          });

          if (merchantId) {
            await upsertShopPulse(supabase, merchantId, session.id);
          }
        }

        // ──── Fire Meta CAPI Purchase event ────
        if (session.amount_total && session.amount_total > 0) {
          try {
            const capiUrl = `${supabaseUrl}/functions/v1/meta-capi-bridge`;
            const userId = metadata.user_id || metadata.customer_id || metadata.rider_id || null;
            const capiPayload: Record<string, unknown> = {
              table: "stripe_checkout",
              type: "INSERT",
              record: {
                id: session.id,
                user_id: userId,
                store_id: merchantId,
                total_amount: session.amount_total / 100,
                currency: session.currency?.toUpperCase() || "USD",
                created_at: new Date().toISOString(),
                service_type: metadata.type || "general",
                metadata: {
                  store_id: merchantId,
                },
              },
            };
            await fetch(capiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify(capiPayload),
            });
            console.log("[Webhook] Meta CAPI Purchase event fired for:", session.id);
          } catch (capiErr) {
            console.error("[Webhook] Meta CAPI trigger failed:", capiErr);
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("[Webhook] Payment succeeded:", paymentIntent.id);

        // Update any orders with this payment intent ID
        await supabase
          .from("ride_requests")
          .update({ payment_status: "paid" })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        const { data: paidFoodOrders } = await supabase
          .from("food_orders")
          .update({ payment_status: "paid" })
          .eq("stripe_payment_id", paymentIntent.id)
          .select("id");

        // Trigger Stripe Connect auto-transfer + customer confirmation email/SMS
        // for each food order that just flipped to paid.
        for (const row of (paidFoodOrders ?? []) as { id: string }[]) {
          try { await queueEatsAutoTransfer(row.id); }
          catch (e) { console.warn("[Webhook] eats auto-transfer skipped", e); }
          try { await notifyEatsOrderConfirmed(supabase, row.id, "Card"); }
          catch (e) { console.warn("[Webhook] eats confirmation email skipped", e); }
          // Dispatch driver — only fires after payment confirms, idempotent.
          try {
            await fetch(`${supabaseUrl}/functions/v1/dispatch-eats-order`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({ order_id: row.id }),
            });
          } catch (e) { console.warn("[Webhook] eats dispatch skipped", e); }
        }

        // Webhook safety net for grocery orders — confirm-grocery-payment is the
        // primary path but if it fails (e.g., client closed tab) the webhook
        // still flips payment_status and fires the confirmation.
        const { data: paidGroceryOrders } = await supabase
          .from("shopping_orders")
          .update({ payment_status: "paid" })
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .neq("payment_status", "paid")
          .select("id");
        for (const row of (paidGroceryOrders ?? []) as { id: string }[]) {
          try { await notifyGroceryOrderConfirmed(supabase, row.id, "Card"); }
          catch (e) { console.warn("[Webhook] grocery confirmation email skipped", e); }
        }

        // Webhook safety net for COIN TOP-UPS — verify-coin-purchase is the
        // primary path (called by the SPA). If the buyer closes the tab right
        // after Stripe confirms but before that call, coins never credited.
        // The credit_coin_purchase RPC is idempotent (keyed on session_id /
        // payment_intent_id) so calling it from both paths is safe.
        const coinUserId = paymentIntent.metadata?.user_id;
        const coinPackageId = paymentIntent.metadata?.package_id;
        const coinAmount = parseInt(paymentIntent.metadata?.coins || "0", 10);
        if (coinUserId && coinPackageId && coinAmount > 0) {
          try {
            const { error: coinErr } = await supabase.rpc("credit_coin_purchase", {
              _user_id: coinUserId,
              _session_id: paymentIntent.id,
              _package_id: coinPackageId,
              _coins: coinAmount,
              _amount_cents: paymentIntent.amount_received || paymentIntent.amount || 0,
              _currency: paymentIntent.currency ?? "usd",
            });
            if (coinErr) {
              console.error("[Webhook] coin credit failed", coinErr);
            } else {
              console.log("[Webhook] coin credit safety net fired", { user: coinUserId, coins: coinAmount, pi: paymentIntent.id });
              // Notify the user they got their coins (best-effort).
              try {
                await supabase.from("user_notifications").insert({
                  user_id: coinUserId,
                  type: "coin_topup_success",
                  entity_id: paymentIntent.id,
                  entity_type: "coin_purchase",
                  message: `+${coinAmount.toLocaleString()} Z Coins added to your wallet`,
                  is_read: false,
                });
              } catch (e) { console.warn("[Webhook] coin notify skipped", e); }
            }
          } catch (e) {
            console.error("[Webhook] coin credit error", e);
          }
        }

        // Log for flight payments
        if (paymentIntent.metadata?.type === 'flight') {
          await logPaymentAudit(supabase, {
            bookingId: paymentIntent.metadata.booking_id,
            stripeEventType: event.type,
            stripeEventId: event.id,
            stripePaymentIntentId: paymentIntent.id,
            status: 'success',
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
          });
        }

        // ZIVO wallet in-app top-up. The client also verifies immediately after
        // confirmPayment; this webhook is the safety net if the app closes.
        if (paymentIntent.metadata?.type === "user_wallet_topup") {
          const walletUserId = paymentIntent.metadata.user_id;
          const amountCents = Number(
            paymentIntent.metadata.amount_cents ??
            paymentIntent.amount_received ??
            paymentIntent.amount ??
            0,
          );
          const currency = String(paymentIntent.metadata.currency ?? paymentIntent.currency ?? "USD").toUpperCase();

          if (!walletUserId || !Number.isFinite(amountCents) || amountCents <= 0) {
            console.warn("[Webhook] user_wallet_topup missing user/amount", { pi: paymentIntent.id });
          } else {
            const { error: walletTopupErr } = await supabase.rpc("credit_user_wallet_topup", {
              p_user_id: walletUserId,
              p_amount_cents: amountCents,
              p_currency: currency,
              p_stripe_reference: paymentIntent.id,
              p_description: `Stripe topup ${paymentIntent.id}`,
            });

            if (walletTopupErr) {
              console.error("[Webhook] user_wallet_topup credit failed", walletTopupErr);
            } else {
              console.log("[Webhook] user_wallet_topup credited", {
                user: walletUserId,
                amount_cents: amountCents,
                pi: paymentIntent.id,
              });
            }
          }
        }

        // Creator tip via in-app PaymentIntent (create-tip-payment-intent).
        // Without this branch the tip stays at status='pending' and the creator's
        // wallet never receives the funds — only the checkout-session flow was
        // wired previously.
        if (paymentIntent.metadata?.type === "creator_tip") {
          const { data: tipRow } = await supabase
            .from("creator_tips")
            .select("id, status, creator_id, amount_cents, tipper_id, is_anonymous, message")
            .eq("payment_intent_id", paymentIntent.id)
            .maybeSingle();

          if (!tipRow) {
            console.warn("[Webhook] creator_tip row not found for PI", { pi: paymentIntent.id });
          } else if ((tipRow as any).status === "succeeded") {
            console.log("[Webhook] creator_tip already succeeded", { tip: (tipRow as any).id });
            await creditCreatorTipToWallet(supabase, tipRow as any);
          } else {
            const { error: flipErr } = await supabase
              .from("creator_tips")
              .update({
                status: "succeeded",
                payment_provider: "stripe",
                last_payment_error: null,
              })
              .eq("id", (tipRow as any).id);
            if (flipErr) {
              console.error("[Webhook] creator_tip PI flip failed", flipErr);
            } else {
              console.log("[Webhook] creator_tip succeeded via PI", { tip: (tipRow as any).id });
              await creditCreatorTipToWallet(supabase, tipRow as any);
              const creatorId = (tipRow as any).creator_id;
              const isAnon = !!(tipRow as any).is_anonymous;
              const amount = (tipRow as any).amount_cents ?? paymentIntent.amount ?? 0;
              if (creatorId) {
                try {
                  await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                    body: JSON.stringify({
                      user_id: creatorId,
                      notification_type: "tip_received",
                      title: "You received a tip! 💰",
                      body: `${isAnon ? "Someone" : "A fan"} sent you $${(amount / 100).toFixed(2)}`,
                      data: { type: "tip_received", amount_cents: amount, action_url: "/wallet" },
                    }),
                  });
                } catch {}
              }
            }
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("[Webhook] Payment failed:", paymentIntent.id);
        const failedUserId = paymentIntent.metadata?.user_id || paymentIntent.metadata?.customer_id || paymentIntent.metadata?.rider_id;

        // Update any orders with this payment intent ID
        await supabase
          .from("ride_requests")
          .update({ payment_status: "failed", status: "cancelled" })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        await supabase
          .from("food_orders")
          .update({ payment_status: "failed", status: "cancelled" })
          .eq("stripe_payment_id", paymentIntent.id);

        // Notify user: payment failed
        if (failedUserId) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({ user_id: failedUserId, notification_type: "payment_failed", title: "Payment Failed ❌", body: `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} could not be processed. Please try again.`, data: { type: "payment_failed", action_url: "/wallet" } }),
            });
          } catch {}
        }

        // Handle flight payment failures
        if (paymentIntent.metadata?.type === 'flight') {
          await supabase
            .from("flight_bookings")
            .update({ 
              payment_status: "failed",
              ticketing_status: "cancelled",
            })
            .eq("stripe_payment_intent_id", paymentIntent.id);

          await logPaymentAudit(supabase, {
            bookingId: paymentIntent.metadata.booking_id,
            stripeEventType: event.type,
            stripeEventId: event.id,
            stripePaymentIntentId: paymentIntent.id,
            status: 'failed',
            errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
          });

          await supabase.from('flight_admin_alerts').insert({
            booking_id: paymentIntent.metadata.booking_id,
            alert_type: 'payment_failed',
            message: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
            severity: 'high',
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' 
          ? charge.payment_intent 
          : charge.payment_intent?.id;
        const refundAmount = charge.amount_refunded / 100;

        console.log("[Webhook] Charge refunded:", charge.id, "Amount:", refundAmount, "PI:", paymentIntentId);

        // Notify user about refund
        const refundUserId = charge.metadata?.user_id || charge.metadata?.customer_id || charge.metadata?.rider_id;
        if (refundUserId) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({ user_id: refundUserId, notification_type: "refund_processed", title: "Refund Processed 💵", body: `$${refundAmount.toFixed(2)} has been refunded to your payment method`, data: { type: "refund_processed", amount: refundAmount, action_url: "/wallet" } }),
            });
          } catch {}
        }

        if (paymentIntentId) {
          // Update ride requests
          await supabase
            .from("ride_requests")
            .update({ 
              refund_status: "refunded",
              refunded_at: new Date().toISOString(),
            })
            .eq("stripe_payment_intent_id", paymentIntentId);

          // Update food orders + email/SMS the customer about the completed refund.
          const { data: refundedOrders } = await supabase
            .from("food_orders")
            .update({
              refund_status: "refunded",
              refunded_at: new Date().toISOString(),
            })
            .eq("stripe_payment_id", paymentIntentId)
            .select("id");
          for (const row of (refundedOrders ?? []) as { id: string }[]) {
            try { await notifyEatsRefundIssued(supabase, row.id, charge.amount_refunded, "Card", "complete"); }
            catch (e) { console.warn("[Webhook] eats refund email skipped", e); }
          }

          // Update P2P bookings
          await supabase
            .from("p2p_bookings")
            .update({ 
              refund_status: "refunded",
              payment_status: "refunded",
              refunded_at: new Date().toISOString(),
            })
            .eq("stripe_payment_intent_id", paymentIntentId);

          // Update flight bookings
          const { data: flightBooking } = await supabase
            .from("flight_bookings")
            .update({ 
              refund_status: "refunded",
              payment_status: "refunded",
              refund_amount: refundAmount,
              refund_processed_at: new Date().toISOString(),
            })
            .eq("stripe_payment_intent_id", paymentIntentId)
            .select('id')
            .single();

          if (flightBooking) {
            await logPaymentAudit(supabase, {
              bookingId: flightBooking.id,
              stripeEventType: event.type,
              stripeEventId: event.id,
              stripePaymentIntentId: paymentIntentId,
              status: 'success',
              amount: refundAmount,
              currency: charge.currency.toUpperCase(),
              metadata: { refund_id: charge.refunds?.data?.[0]?.id },
            });
          }
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
        
        console.log("[Webhook] DISPUTE CREATED:", dispute.id, "Reason:", dispute.reason, "Amount:", dispute.amount / 100);

        // Get the charge to find the payment intent
        if (chargeId) {
          const charge = await stripe.charges.retrieve(chargeId);
          const paymentIntentId = typeof charge.payment_intent === 'string' 
            ? charge.payment_intent 
            : charge.payment_intent?.id;

          if (paymentIntentId) {
            // Update flight bookings with dispute info
            const { data: flightBooking } = await supabase
              .from("flight_bookings")
              .update({ 
                dispute_status: dispute.status,
                dispute_id: dispute.id,
                dispute_created_at: new Date().toISOString(),
              })
              .eq("stripe_payment_intent_id", paymentIntentId)
              .select('id, booking_reference')
              .single();

            if (flightBooking) {
              // Create CRITICAL admin alert
              await supabase.from('flight_admin_alerts').insert({
                booking_id: flightBooking.id,
                alert_type: 'dispute_created',
                message: `🚨 CHARGEBACK DISPUTE: Booking ${flightBooking.booking_reference}. Reason: ${dispute.reason}. Amount: $${dispute.amount / 100}. Respond within deadline!`,
                severity: 'critical',
              });

              await logPaymentAudit(supabase, {
                bookingId: flightBooking.id,
                stripeEventType: event.type,
                stripeEventId: event.id,
                stripePaymentIntentId: paymentIntentId,
                status: 'dispute_opened',
                amount: dispute.amount / 100,
                currency: dispute.currency.toUpperCase(),
                metadata: { 
                  dispute_id: dispute.id,
                  reason: dispute.reason,
                  evidence_due_by: dispute.evidence_details?.due_by,
                },
              });
            }

            // Also check P2P bookings
            await supabase
              .from("p2p_bookings")
              .update({ 
                dispute_status: dispute.status,
              })
              .eq("stripe_payment_intent_id", paymentIntentId);
          }
        }
        break;
      }

      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
        
        console.log("[Webhook] Dispute closed:", dispute.id, "Status:", dispute.status);

        if (chargeId) {
          const charge = await stripe.charges.retrieve(chargeId);
          const paymentIntentId = typeof charge.payment_intent === 'string' 
            ? charge.payment_intent 
            : charge.payment_intent?.id;

          if (paymentIntentId) {
            const { data: flightBooking } = await supabase
              .from("flight_bookings")
              .update({ 
                dispute_status: dispute.status,
              })
              .eq("stripe_payment_intent_id", paymentIntentId)
              .select('id, booking_reference')
              .single();

            if (flightBooking) {
              const isWon = dispute.status === 'won';
              await supabase.from('flight_admin_alerts').insert({
                booking_id: flightBooking.id,
                alert_type: 'dispute_closed',
                message: isWon 
                  ? `✅ Dispute WON for booking ${flightBooking.booking_reference}` 
                  : `❌ Dispute LOST for booking ${flightBooking.booking_reference}. Amount: $${dispute.amount / 100}`,
                severity: isWon ? 'low' : 'high',
              });

              await logPaymentAudit(supabase, {
                bookingId: flightBooking.id,
                stripeEventType: event.type,
                stripeEventId: event.id,
                stripePaymentIntentId: paymentIntentId,
                status: dispute.status,
                amount: dispute.amount / 100,
                metadata: { dispute_id: dispute.id },
              });
            }
          }
        }
        break;
      }

      // ============ ZIVO+ MEMBERSHIP SUBSCRIPTION EVENTS ============
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = subscription.metadata || {};

        // Creator tier subscription — written from subscribe-to-tier checkout.
        // Metadata is set by stripe.checkout.sessions.create({ metadata: { tier_id, creator_id, subscriber_id } })
        // and propagates to the resulting Subscription via session settings.
        if (metadata.tier_id && metadata.creator_id && metadata.subscriber_id) {
          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;
          const status = subscription.status === "active" || subscription.status === "trialing"
            ? "active"
            : subscription.status; // canceled | incomplete | past_due | etc.

          // Pull the unit price off the first item to record price_cents at the time of subscription.
          const item = subscription.items?.data?.[0];
          const priceCents = item?.price?.unit_amount ?? null;

          const row = {
            creator_id: metadata.creator_id,
            subscriber_id: metadata.subscriber_id,
            tier_id: metadata.tier_id,
            status,
            price_cents: priceCents,
            stripe_subscription_id: subscription.id,
            payment_method: "stripe",
            started_at: new Date(subscription.start_date * 1000).toISOString(),
            expires_at: periodEnd,
          } as any;

          // Upsert by stripe_subscription_id so retries don't double-insert.
          const { error: subErr } = await supabase
            .from("creator_subscriptions")
            .upsert(row, { onConflict: "stripe_subscription_id" });
          if (subErr) {
            console.error("[Webhook] creator_subscriptions upsert failed", subErr);
          } else {
            console.log("[Webhook] creator_subscriptions synced", { sub: subscription.id, status });
          }

          // Notify creator + subscriber on first activation.
          if (event.type === "customer.subscription.created" && status === "active") {
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                body: JSON.stringify({
                  user_id: metadata.creator_id,
                  notification_type: "creator_new_subscriber",
                  title: "New subscriber 🎉",
                  body: `Someone subscribed to your ${item?.price?.nickname || "tier"} tier.`,
                  data: { type: "creator_new_subscriber", tier_id: metadata.tier_id, action_url: "/creator/dashboard" },
                }),
              });
            } catch {}
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                body: JSON.stringify({
                  user_id: metadata.subscriber_id,
                  notification_type: "subscription_active",
                  title: "Subscription active ✨",
                  body: `Your subscription is active. Welcome aboard!`,
                  data: { type: "subscription_active", creator_id: metadata.creator_id, action_url: `/u/${metadata.creator_id}` },
                }),
              });
            } catch {}
          }
          break;
        }

        // Only handle membership subscriptions
        if (metadata.type === "membership" && metadata.user_id && metadata.plan_id) {
          console.log("[Webhook] Membership subscription event:", event.type, "Sub:", subscription.id);

          try {
            const currentPeriodStart = (subscription as any).current_period_start ?? subscription.start_date;
            const currentPeriodEnd = (subscription as any).current_period_end ?? (subscription as any).items?.data?.[0]?.current_period_end;
            await syncZivoPlusSubscription(supabase, {
              userId: metadata.user_id,
              planId: metadata.plan_id,
              status: subscription.status,
              billingCycle: metadata.billing_cycle || (metadata.plan === "annual" ? "yearly" : "monthly"),
              currentPeriodStart: new Date(currentPeriodStart * 1000).toISOString(),
              currentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
              stripeSubscriptionId: subscription.id,
            });
            console.log("[Webhook] Membership subscription synced:", metadata.user_id, "Status:", subscription.status);
            // Notify user: ZIVO+ activated
            if (subscription.status === "active") {
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                  body: JSON.stringify({ user_id: metadata.user_id, notification_type: "membership_activated", title: "Welcome to ZIVO+ ⭐", body: "Your premium membership is now active. Enjoy exclusive perks!", data: { type: "membership_activated", action_url: "/account" } }),
                });
              } catch {}
            }
          } catch (upsertError) {
            console.error("[Webhook] Error syncing membership:", upsertError);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = subscription.metadata || {};

        // Creator tier cancellation
        if (metadata.tier_id && metadata.creator_id && metadata.subscriber_id) {
          const cancelledAt = subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : new Date().toISOString();
          const { error } = await supabase
            .from("creator_subscriptions")
            .update({ status: "cancelled", cancelled_at: cancelledAt })
            .eq("stripe_subscription_id", subscription.id);
          if (error) {
            console.error("[Webhook] creator_subscriptions cancel failed", error);
          } else {
            console.log("[Webhook] creator subscription cancelled", subscription.id);
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                body: JSON.stringify({
                  user_id: metadata.subscriber_id,
                  notification_type: "subscription_cancelled",
                  title: "Subscription cancelled",
                  body: "Your creator subscription was cancelled. You can resubscribe anytime.",
                  data: { type: "subscription_cancelled", creator_id: metadata.creator_id, action_url: `/u/${metadata.creator_id}` },
                }),
              });
            } catch {}
          }
          break;
        }

        if (metadata.type === "membership") {
          console.log("[Webhook] Membership subscription deleted:", subscription.id);
          
          const { error: updateError } = await supabase
            .from("zivo_subscriptions")
            .update({ 
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);

          if (updateError) {
            console.error("[Webhook] Error cancelling membership:", updateError);
          } else {
            console.log("[Webhook] Membership cancelled for subscription:", subscription.id);
            if (metadata.user_id) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
                  body: JSON.stringify({ user_id: metadata.user_id, notification_type: "membership_cancelled", title: "ZIVO+ Cancelled", body: "Your ZIVO+ membership has been cancelled. You can resubscribe anytime.", data: { type: "membership_cancelled", action_url: "/account" } }),
                });
              } catch {}
            }
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
        
        if (subscriptionId) {
          // Check if this is a membership subscription
          const { data: existingSub } = await supabase
            .from("zivo_subscriptions")
            .select("id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();

          if (existingSub) {
            console.log("[Webhook] Membership invoice paid, ensuring active status");
            await supabase
              .from("zivo_subscriptions")
              .update({ status: "active" })
              .eq("stripe_subscription_id", subscriptionId);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
        
        if (subscriptionId) {
          // Check if this is a membership subscription
          const { data: existingSub } = await supabase
            .from("zivo_subscriptions")
            .select("id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();

          if (existingSub) {
            console.log("[Webhook] Membership invoice payment failed, setting past_due");
            await supabase
              .from("zivo_subscriptions")
              .update({ status: "past_due" })
              .eq("stripe_subscription_id", subscriptionId);
          }
        }
        break;
      }

      // ============ STRIPE IDENTITY (KYC) ============
      case "identity.verification_session.verified":
      case "identity.verification_session.requires_input":
      case "identity.verification_session.processing":
      case "identity.verification_session.canceled": {
        const vs = event.data.object as any;
        const userId = vs.metadata?.user_id;
        const role = vs.metadata?.role || "creator";
        if (!userId) {
          console.warn("[Webhook] identity event missing user_id metadata", { id: vs.id, type: event.type });
          break;
        }

        const verified = event.type === "identity.verification_session.verified";
        const requiresInput = event.type === "identity.verification_session.requires_input";
        const canceled = event.type === "identity.verification_session.canceled";

        const submissionStatus = verified ? "verified"
          : canceled ? "canceled"
          : requiresInput ? "requires_input"
          : "pending";

        const update: Record<string, any> = {
          stripe_verification_status: vs.status,
          status: submissionStatus,
          updated_at: new Date().toISOString(),
        };
        if (verified) {
          update.stripe_verified_at = new Date().toISOString();
          update.reviewed_at = new Date().toISOString();
        }
        if (requiresInput && vs.last_error?.reason) {
          update.rejection_reason = vs.last_error.reason;
        }

        await supabase
          .from("kyc_submissions")
          .update(update)
          .eq("stripe_verification_session_id", vs.id);

        // Mirror to creator_profiles.is_verified for the existing dashboard.
        if (role === "creator") {
          if (verified) {
            await supabase
              .from("creator_profiles")
              .update({ is_verified: true })
              .eq("user_id", userId);
          } else if (canceled || requiresInput) {
            // Don't unset is_verified — once verified, stays verified.
            // Just log for ops via console.
          }
        }

        // Notify the user.
        try {
          const titleByEvent: Record<string, string> = {
            "identity.verification_session.verified": "Identity verified ✓",
            "identity.verification_session.requires_input": "Identity check needs more info",
            "identity.verification_session.canceled": "Identity check cancelled",
            "identity.verification_session.processing": "Identity check processing",
          };
          const bodyByEvent: Record<string, string> = {
            "identity.verification_session.verified": "Your identity has been verified. Payouts and other gated features are now available.",
            "identity.verification_session.requires_input": "Stripe needs another document or photo to complete your verification.",
            "identity.verification_session.canceled": "Your identity verification was cancelled. You can restart any time.",
            "identity.verification_session.processing": "We're reviewing your documents — usually takes a few minutes.",
          };
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({
              user_id: userId,
              notification_type: "identity_verification_update",
              title: titleByEvent[event.type] || "Identity update",
              body: bodyByEvent[event.type] || "",
              data: { type: "identity_verification_update", status: vs.status, action_url: "/creator/setup?step=verify" },
            }),
          });
        } catch (e) {
          console.warn("[Webhook] identity notify failed", e);
        }

        console.log("[Webhook] identity event handled", { type: event.type, user: userId, status: vs.status });
        break;
      }

      default:
        console.log("[Webhook] Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[Webhook] Error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}, { rateLimit: "payment", strictCors: true, skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));
