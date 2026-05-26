/**
 * charge-salon-no-show-fee
 * ------------------------
 * Owner-triggered off-session charge for a salon booking's no-show fee.
 * Called from SalonBookingsSection's NoShowDialog when the owner picks
 * "Charge $X & mark no-show" — after the booking status has been flipped
 * to `no_show`.
 *
 * Auth model: requires an authenticated user who owns or manages the
 * booking's store (verified via store_members). NOT anon-callable —
 * unlike create-salon-deposit, this function spends the customer's
 * money without their tab being open.
 *
 * Mirrors auto-recharge-ads-wallet for the actual PaymentIntent create.
 * The card was saved off-session by the deposit Checkout via
 * `setup_future_usage: 'off_session'`; we charge the same Customer +
 * PaymentMethod with `confirm: true` + `off_session: true`.
 *
 * Idempotent:
 *   - `no_show_fee_payment_intent_id` is set BEFORE returning so retries
 *     skip if the column is already populated.
 *   - Stripe Idempotency-Key is `no-show:<booking_id>` so the SAME PI is
 *     returned on rapid double-click instead of double-charging.
 *
 * Failure handling: card declines are persisted to
 * `no_show_fee_charge_failed_*` BOTH synchronously here (so the UI can
 * show the error immediately) AND asynchronously by the
 * `payment_intent.payment_failed` webhook (safety net).
 */
import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import Stripe from "../_shared/stripe.ts";

interface Body {
  booking_id: string;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // ---- Authenticate caller ---------------------------------------------
    // Use the user's bearer token to confirm identity (NOT service-role —
    // this function modifies money on behalf of a specific owner).
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    const body = (await req.json()) as Body;
    if (!body?.booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- Service-role client for the rest of the flow --------------------
    // We've authenticated the user; now use service role for the actual
    // mutations (the booking row's stripe_* columns are NOT user-writable
    // by RLS — only the webhook + service role can populate them).
    const supabase = createClient(supabaseUrl, serviceKey);

    // ---- Load booking ----------------------------------------------------
    const { data: booking, error: bErr } = await supabase
      .from("salon_bookings")
      .select([
        "id", "store_id", "status",
        "no_show_fee_cents", "no_show_fee_charged_cents",
        "no_show_fee_payment_intent_id",
        "stripe_customer_id", "stripe_payment_method_id",
      ].join(","))
      .eq("id", body.booking_id)
      .maybeSingle();
    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const b = booking as any;

    // ---- Verify caller owns / manages the booking's store ----------------
    const { data: membership } = await supabase
      .from("store_members")
      .select("role")
      .eq("store_id", b.store_id)
      .eq("user_id", userId)
      .maybeSingle();
    const role = (membership as any)?.role ?? null;
    if (!role || (role !== "owner" && role !== "manager" && role !== "admin")) {
      return new Response(JSON.stringify({ error: "You don't have permission to charge fees on this booking." }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- Validate payable state ------------------------------------------
    if (b.status !== "no_show") {
      return new Response(JSON.stringify({ error: `Booking is ${b.status}; flip to no_show before charging the fee.` }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((b.no_show_fee_cents ?? 0) <= 0) {
      return new Response(JSON.stringify({ error: "This booking has no no-show fee on file." }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((b.no_show_fee_charged_cents ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "No-show fee already charged.", payment_intent_id: b.no_show_fee_payment_intent_id }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!b.stripe_customer_id || !b.stripe_payment_method_id) {
      return new Response(JSON.stringify({ error: "No card on file for this booking — the customer didn't pay a deposit, so we can't auto-charge." }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- Load the Stripe Connect destination -----------------------------
    const { data: settings } = await supabase
      .from("store_payment_settings")
      .select("stripe_account_id, stripe_status")
      .eq("store_id", b.store_id)
      .eq("market", "us")
      .maybeSingle();
    const accountId = (settings as any)?.stripe_account_id;
    if (!accountId || (settings as any).stripe_status !== "active") {
      return new Response(JSON.stringify({ error: "This salon's Stripe account isn't active." }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- Create the off-session PaymentIntent -----------------------------
    // Pattern from supabase/functions/auto-recharge-ads-wallet/index.ts:39-77,
    // plus transfer_data.destination so funds route to the salon's account.
    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: b.no_show_fee_cents,
          currency: "usd",
          customer: b.stripe_customer_id,
          payment_method: b.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          transfer_data: { destination: accountId },
          metadata: {
            type: "salon_no_show",
            salon_booking_id: b.id,
            store_id: b.store_id,
          },
        },
        { idempotencyKey: `no-show:${b.id}` },
      );

      // Persist pi.id immediately so a retry skips at the
      // no_show_fee_charged_cents-or-pi-id check above. The webhook will
      // later finalize no_show_fee_charged_cents on payment_intent.succeeded.
      await supabase
        .from("salon_bookings")
        .update({
          no_show_fee_payment_intent_id: pi.id,
          // Clear any prior failure state on a successful retry — UI will
          // also be refreshed by the webhook's idempotent finalize.
          no_show_fee_charge_failed_at: null,
          no_show_fee_charge_failed_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", b.id);

      // If the PI is already 'succeeded' synchronously, we can credit
      // the booking right here too — the webhook is idempotent anyway,
      // but doing it inline removes the 1-2s lag for the owner's UI.
      if (pi.status === "succeeded") {
        await supabase
          .from("salon_bookings")
          .update({
            no_show_fee_charged_cents: pi.amount_received || pi.amount || b.no_show_fee_cents,
            updated_at: new Date().toISOString(),
          })
          .eq("id", b.id)
          .eq("no_show_fee_charged_cents", 0); // idempotent vs webhook race
      }

      return new Response(JSON.stringify({
        ok: true,
        payment_intent_id: pi.id,
        amount: pi.amount,
        status: pi.status,
      }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    } catch (e) {
      // Stripe surfaces declines + authentication-required as exceptions on
      // off_session=true+confirm=true. Persist the failure reason now so the
      // owner sees the red "Charge failed" badge without waiting for the
      // webhook (which will also fire payment_intent.payment_failed).
      const err = e as Stripe.StripeRawError & { code?: string; message: string };
      const reason = err.message || err.code || "unknown";
      const piId = (err as any).payment_intent?.id ?? null;
      await supabase
        .from("salon_bookings")
        .update({
          no_show_fee_charge_failed_at: new Date().toISOString(),
          no_show_fee_charge_failed_reason: reason,
          ...(piId ? { no_show_fee_payment_intent_id: piId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", b.id);
      console.warn("[charge-salon-no-show-fee] charge failed", { booking: b.id, reason });
      return new Response(JSON.stringify({
        ok: false,
        error_code: err.code ?? "stripe_error",
        error_message: reason,
      }), {
        status: 200, // 200 — the FE flow expects to read ok:false and surface the reason
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("[charge-salon-no-show-fee]", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
