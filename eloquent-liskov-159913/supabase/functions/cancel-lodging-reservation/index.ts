/** cancel-lodging-reservation — guest previews/cancels their own reservation with Stripe refund/cancel handling. */
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { notifyLodgingReservation, notifyLodgingRefundIssued } from "../_shared/lodging-notifications.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

function hoursUntil(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}
function refundFor(checkIn: string, paidCents: number) {
  const h = hoursUntil(checkIn);
  if (h >= 24 * 7) return { refundCents: paidCents, nonRefundableCents: 0, percent: 100, label: "Full refund", window: "7+ days notice", hours_until_check_in: h };
  if (h >= 48) return { refundCents: Math.round(paidCents * 0.5), nonRefundableCents: paidCents - Math.round(paidCents * 0.5), percent: 50, label: "50% refund", window: "2–6 days notice", hours_until_check_in: h };
  return { refundCents: 0, nonRefundableCents: paidCents, percent: 0, label: "No refund", window: "Less than 48h notice", hours_until_check_in: h };
}
function paymentOutcome(policy: ReturnType<typeof refundFor>, piStatus?: string | null, hasPi?: boolean) {
  if (!hasPi) return "No saved-card payment intent is attached to this reservation.";
  if (["requires_capture", "requires_payment_method", "requires_confirmation", "requires_action", "processing"].includes(piStatus || "")) return "The card authorization will be cancelled; no additional charge will be made.";
  if (policy.refundCents > 0 && piStatus === "succeeded") return "Refund will be sent back to the saved payment method used for the reservation.";
  if (policy.refundCents <= 0) return "No refund is due, and the saved payment method will not be charged again.";
  return "Refund handling depends on the current payment status and will be finalized by Stripe.";
}

Deno.serve(withSecurity("cancel-lodging-reservation", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    if (isLikelyMaliciousBot(req.headers)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(admin, ipHash)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (await isAbuseThresholdExceeded(admin, user.id)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions. Try again in 24 hours." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { reservation_id, reason, preview } = await req.json();
    if (!reservation_id) return new Response(JSON.stringify({ error: "missing_reservation_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (typeof reason === "string") {
      const linkScan = scanContentForLinks(reason);
      if (!linkScan.ok) {
        logBlockedAttempt(admin, { endpoint: "cancel-lodging-reservation", userId: user.id, urls: linkScan.blocked, text: reason, ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") });
        return new Response(JSON.stringify({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: r } = await supabase
      .from("lodge_reservations")
      .select("id, store_id, check_in, status, paid_cents, guest_id, stripe_payment_intent_id, payment_status, payment_provider, paypal_capture_id, paypal_order_id, square_payment_id")
      .eq("id", reservation_id)
      .maybeSingle();
    if (!r) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.guest_id && r.guest_id !== user.id) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (["cancelled", "checked_out", "no_show"].includes(r.status)) return new Response(JSON.stringify({ error: "already_inactive" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const policy = refundFor(r.check_in, r.paid_cents || 0);
    let piStatus: string | null = null;
    if (r.stripe_payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(r.stripe_payment_intent_id);
      piStatus = pi.status;
    }

    if (preview) {
      return new Response(JSON.stringify({
        ok: true,
        preview: true,
        policy_label: policy.label,
        policy_window: policy.window,
        hours_until_check_in: policy.hours_until_check_in,
        days_until_check_in: policy.hours_until_check_in / 24,
        refund_percent: policy.percent,
        refundable_cents: policy.refundCents,
        non_refundable_cents: policy.nonRefundableCents,
        total_paid_cents: r.paid_cents || 0,
        payment_intent_status: piStatus,
        payment_method_outcome: paymentOutcome(policy, piStatus, Boolean(r.stripe_payment_intent_id)),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let paymentStatus = policy.refundCents > 0 ? "refund_pending" : "cancelled_no_refund";
    let stripeRefundId: string | null = null;
    let paypalRefundId: string | null = null;
    let squareRefundId: string | null = null;
    let providerRefundError: string | null = null;

    // Resolve which provider actually holds the funds. Prefer the explicit
    // payment_provider column (added by the multi-provider migration); fall
    // back to inferring from whichever provider id is stamped.
    const provider =
      (r as any).payment_provider ||
      (r.stripe_payment_intent_id ? "stripe"
        : (r as any).paypal_capture_id || (r as any).paypal_order_id ? "paypal"
        : (r as any).square_payment_id ? "square"
        : null);

    try {
      if (provider === "stripe" && r.stripe_payment_intent_id) {
        const pi = await stripe.paymentIntents.retrieve(r.stripe_payment_intent_id);
        if (["requires_capture", "requires_payment_method", "requires_confirmation", "requires_action", "processing"].includes(pi.status)) {
          if (pi.status === "requires_capture") await stripe.paymentIntents.cancel(pi.id);
          paymentStatus = policy.refundCents > 0 ? "refunded" : "unpaid";
        } else if (policy.refundCents > 0 && pi.status === "succeeded") {
          const refund = await stripe.refunds.create({ payment_intent: pi.id, amount: policy.refundCents, metadata: { reservation_id: r.id, type: "lodging_cancel" } });
          stripeRefundId = refund.id;
          paymentStatus = refund.status === "succeeded" ? "refunded" : "refund_pending";
        }
      } else if (provider === "paypal" && policy.refundCents > 0 && (r as any).paypal_capture_id) {
        // PayPal capture refund: POST /v2/payments/captures/{capture_id}/refund
        const ppMode = Deno.env.get("PAYPAL_MODE") ?? "live";
        const ppBase = ppMode === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
        const ppId = Deno.env.get("PAYPAL_CLIENT_ID");
        const ppSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
        if (!ppId || !ppSecret) throw new Error("PayPal credentials not configured");
        const tokenRes = await fetch(`${ppBase}/v1/oauth2/token`, {
          method: "POST",
          headers: { Authorization: `Basic ${btoa(`${ppId}:${ppSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=client_credentials",
        });
        if (!tokenRes.ok) throw new Error(`PayPal auth failed: ${await tokenRes.text()}`);
        const accessToken = (await tokenRes.json()).access_token;

        const refundRes = await fetch(`${ppBase}/v2/payments/captures/${(r as any).paypal_capture_id}/refund`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": `refund-${reservation_id}-${policy.refundCents}`,
          },
          body: JSON.stringify({
            amount: { value: (policy.refundCents / 100).toFixed(2), currency_code: "USD" },
            note_to_payer: "ZIVO lodging cancellation refund",
            invoice_id: reservation_id,
          }),
        });
        const refundJson = await refundRes.json();
        if (!refundRes.ok) throw new Error(refundJson?.message || refundJson?.details?.[0]?.description || "PayPal refund failed");
        paypalRefundId = refundJson.id ?? null;
        // PayPal returns status COMPLETED|PENDING|CANCELLED|FAILED
        paymentStatus = refundJson.status === "COMPLETED" ? "refunded" : refundJson.status === "PENDING" ? "refund_pending" : "refund_pending";
      } else if (provider === "square" && policy.refundCents > 0 && (r as any).square_payment_id) {
        // Square refund: POST /v2/refunds
        const sqMode = Deno.env.get("SQUARE_MODE") ?? "production";
        const sqBase = sqMode === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
        const sqToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
        if (!sqToken) throw new Error("Square access token not configured");
        const refundRes = await fetch(`${sqBase}/v2/refunds`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sqToken}`,
            "Content-Type": "application/json",
            "Square-Version": "2025-01-22",
          },
          body: JSON.stringify({
            idempotency_key: `refund-${reservation_id}-${policy.refundCents}`,
            payment_id: (r as any).square_payment_id,
            amount_money: { amount: policy.refundCents, currency: "USD" },
            reason: "ZIVO lodging cancellation",
          }),
        });
        const refundJson = await refundRes.json();
        if (!refundRes.ok) throw new Error(refundJson?.errors?.[0]?.detail || `Square refund failed (${refundRes.status})`);
        squareRefundId = refundJson.refund?.id ?? null;
        const sqStatus = refundJson.refund?.status; // PENDING | COMPLETED | REJECTED | FAILED
        paymentStatus = sqStatus === "COMPLETED" ? "refunded" : "refund_pending";
      } else if (provider === "cash" || !provider) {
        // Cash on arrival or no provider — nothing to refund through a gateway.
        paymentStatus = policy.refundCents > 0 ? "refunded" : "unpaid";
      }
    } catch (refundErr: any) {
      providerRefundError = String(refundErr?.message || refundErr);
      console.error("[cancel-lodging-reservation] refund failed", provider, providerRefundError);
      // Surface the failure but still proceed to mark the reservation as
      // cancelled — the operations team can retry the refund manually.
      paymentStatus = "refund_pending";
    }

    const now = new Date().toISOString();
    await admin.from("lodge_reservation_change_requests").insert({
      reservation_id,
      store_id: r.store_id,
      type: "cancel",
      status: "auto_approved",
      refund_cents: policy.refundCents,
      price_delta_cents: -policy.refundCents,
      reason: reason || null,
      requested_by: user.id,
      decided_by: user.id,
      decided_at: now,
      applied_at: now,
      payment_status: paymentStatus,
      addon_payload: {
        policy_percent: policy.percent,
        policy_label: policy.label,
        non_refundable_cents: policy.nonRefundableCents,
        payment_method_outcome: paymentOutcome(policy, piStatus, Boolean(r.stripe_payment_intent_id)),
        provider,
        stripe_refund_id: stripeRefundId,
        paypal_refund_id: paypalRefundId,
        square_refund_id: squareRefundId,
        provider_refund_error: providerRefundError,
      },
    });

    await admin.from("lodge_reservations").update({ status: "cancelled", payment_status: paymentStatus, last_payment_error: null }).eq("id", reservation_id);
    await admin.from("lodge_reservation_audit").insert({ reservation_id, store_id: r.store_id, action: "cancelled", actor_id: user.id, notes: reason || null, metadata: { refund_cents: policy.refundCents, non_refundable_cents: policy.nonRefundableCents, payment_status: paymentStatus } }).then(() => null);
    await notifyLodgingReservation(admin, { reservationId: r.id, event: "cancellation_update", templateName: "lodging-cancellation-update", idempotencyKey: `cancel-${reservation_id}-${paymentStatus}`, title: "Reservation cancelled", message: policy.refundCents > 0 ? "Your cancellation was processed and refund handling has started." : "Your cancellation was processed. No refund is due under the current policy.", templateData: { refundCents: policy.refundCents, paymentStatus }, smsBody: `ZIVO: Reservation cancelled. Refund status: ${paymentStatus.replace(/_/g, " ")}.` });

    // Refund-issued notification — only when there's a real refund amount.
    if (policy.refundCents > 0) {
      const providerLabels: Record<string, string> = { stripe: "Card", paypal: "PayPal", square: "Square", cash: "Cash" };
      const providerLabel = providerLabels[provider as string] ?? "your payment method";
      const status = paymentStatus === "refunded" ? "complete" : "in progress";
      try {
        await notifyLodgingRefundIssued(admin, r.id, policy.refundCents, providerLabel, status);
      } catch (e) {
        console.warn("[cancel-lodging-reservation] refund email skipped", e);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      status: "cancelled",
      refund_cents: policy.refundCents,
      non_refundable_cents: policy.nonRefundableCents,
      refund_percent: policy.percent,
      refund_label: policy.label,
      payment_status: paymentStatus,
      provider,
      stripe_refund_id: stripeRefundId,
      paypal_refund_id: paypalRefundId,
      square_refund_id: squareRefundId,
      provider_refund_error: providerRefundError,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
