import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { cascadeCancellationToDriver } from "../_shared/cancellation-cascade.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const USD_TO_KHR = 4062.5;

function formatKhr(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} KHR`;
}

Deno.serve(withSecurity("cancel-ride-request", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { ride_request_id, reason, cancel_fee_cents } = await req.json();
    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: ride } = await admin
      .from("ride_requests")
      .select("id, user_id, status, payment_status, payment_currency, captured_amount_cents, payment_amount, payment_intent_id, stripe_payment_intent_id, bakong_reference, bakong_amount_khr")
      .eq("id", ride_request_id)
      .maybeSingle();

    if (!ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((ride as any).user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const status = String((ride as any).status || "").toLowerCase();
    if (["cancelled", "completed"].includes(status)) {
      return new Response(JSON.stringify({ error: "already_inactive", current_status: status }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const feeCents = Math.max(0, Math.floor(Number(cancel_fee_cents || 0)));
    const currency = String((ride as any).payment_currency || "").toUpperCase();
    const isBakongPaid = currency === "KHR" || (ride as any).payment_status === "bakong_paid" || Boolean((ride as any).bakong_reference);
    const piId = ((ride as any).payment_intent_id || (ride as any).stripe_payment_intent_id) as string | null;
    const captured = Number((ride as any).captured_amount_cents || Math.round(Number((ride as any).payment_amount || 0) * 100));

    let stripeRefundId: string | null = null;
    let refundCents = 0;
    let manualRefund: { currency: "KHR"; paid_amount_khr: number; refund_amount_khr: number; fee_amount_khr: number; reference: string | null } | null = null;
    let providerError: string | null = null;
    let nextPaymentStatus = (ride as any).payment_status as string;
    let nextRefundStatus: string | null = null;

    if (!isBakongPaid && piId) {
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
      const stripe = new (Stripe as any)(stripeKey, { apiVersion: "2025-08-27.basil" });
      const paymentIntent = await stripe.paymentIntents.retrieve(piId);
      const capturedForRefund = Math.max(captured, Number(paymentIntent.amount_received || 0));

      if (capturedForRefund > 0 || paymentIntent.status === "succeeded") {
        refundCents = Math.max(0, capturedForRefund - feeCents);
        if (refundCents > 0) {
          try {
            const refund = await stripe.refunds.create({
              payment_intent: piId,
              amount: refundCents,
              metadata: { ride_request_id, type: "ride_cancel", cancel_fee_cents: String(feeCents) },
            });
            stripeRefundId = refund.id;
            nextPaymentStatus = refund.status === "succeeded" ? "refunded" : "refund_pending";
            nextRefundStatus = nextPaymentStatus;
          } catch (e: any) {
            providerError = String(e?.message || e);
            console.error("[cancel-ride-request] refund failed", providerError);
            nextPaymentStatus = "refund_pending";
            nextRefundStatus = "refund_pending";
          }
        } else {
          nextPaymentStatus = "captured";
          nextRefundStatus = "no_refund_due";
        }
      } else if (["requires_capture", "requires_payment_method", "requires_confirmation", "requires_action", "processing"].includes(String(paymentIntent.status))) {
        try {
          await stripe.paymentIntents.cancel(piId);
          nextPaymentStatus = "canceled";
          nextRefundStatus = "authorization_cancelled";
        } catch (e: any) {
          providerError = String(e?.message || e);
          console.error("[cancel-ride-request] authorization cancel failed", providerError);
          nextPaymentStatus = "cancel_pending";
          nextRefundStatus = "authorization_cancel_pending";
        }
      } else {
        nextPaymentStatus = String(paymentIntent.status || nextPaymentStatus);
        nextRefundStatus = "no_refund_due";
      }
    } else if (isBakongPaid) {
      const paidKhr = Math.round(Number((ride as any).bakong_amount_khr ?? (ride as any).payment_amount ?? 0));
      const feeKhr = Math.min(paidKhr, Math.round((feeCents / 100) * USD_TO_KHR));
      const refundKhr = Math.max(0, paidKhr - feeKhr);
      manualRefund = {
        currency: "KHR",
        paid_amount_khr: paidKhr,
        refund_amount_khr: refundKhr,
        fee_amount_khr: feeKhr,
        reference: (ride as any).bakong_reference ?? null,
      };
      nextPaymentStatus = refundKhr > 0 ? "bakong_refund_pending" : "bakong_paid";
      nextRefundStatus = refundKhr > 0 ? "manual_refund_pending" : "no_refund_due";
    }

    await admin
      .from("ride_requests")
      .update({
        status: "cancelled",
        cancel_reason: reason ?? null,
        cancel_fee_cents: feeCents,
        payment_status: nextPaymentStatus,
        refund_status: nextRefundStatus,
        cancelled_at: new Date().toISOString(),
      } as any)
      .eq("id", ride_request_id);

    if (manualRefund?.refund_amount_khr) {
      try {
        await admin.from("admin_notifications").insert({
          category: "payments",
          severity: "warning",
          title: "Bakong ride refund needed",
          message: `Ride ${ride_request_id.slice(0, 8)} was cancelled after Bakong payment ${manualRefund.reference ?? ""}. Refund ${formatKhr(manualRefund.refund_amount_khr)} manually${manualRefund.fee_amount_khr > 0 ? ` after ${formatKhr(manualRefund.fee_amount_khr)} cancellation fee` : ""}.`,
          entity_type: "ride_request",
          entity_id: ride_request_id,
          link: "/admin/payments/refunds",
        } as any);
      } catch (e) {
        console.warn("[cancel-ride-request] bakong refund notification failed", e);
      }
    }

    try {
      await cascadeCancellationToDriver(admin, ride_request_id, "ride");
    } catch (e) {
      console.warn("[cancel-ride-request] driver cascade skipped", e);
    }

    return new Response(JSON.stringify({
      ok: true,
      status: "cancelled",
      refund_cents: refundCents,
      cancel_fee_cents: feeCents,
      payment_status: nextPaymentStatus,
      stripe_refund_id: stripeRefundId,
      manual_refund: manualRefund,
      provider_error: providerError,
      fee_charge_skipped: !piId && !isBakongPaid && feeCents > 0
        ? "Cancellation fee was recorded but cannot be charged without a saved payment method on file."
        : null,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[cancel-ride-request]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
