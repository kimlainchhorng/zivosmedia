/**
 * create-salon-deposit
 * --------------------
 * Mints (or reuses) a Stripe Checkout Session to collect the deposit for a
 * salon booking. Called from the public booking flow right after the
 * salon_bookings row is inserted, when the row's `deposit_cents > 0`.
 *
 * Mirrors the create-lodging-deposit pattern but simplified for V1:
 *  - Anon-callable (the public booking flow has no required auth).
 *  - Security comes from the booking row already existing in the DB with
 *    a known id; only pending bookings with deposit_cents > 0 are payable.
 *  - Idempotent via Stripe's Idempotency-Key (derived from booking_id +
 *    deposit_cents) and via reusing an existing open session_id stored on
 *    the booking.
 *
 * Charges are routed directly to the salon's Stripe Connect account via
 * `transfer_data.destination`. The 2% platform fee is recorded post-payment
 * by the existing stripe-webhook into platform_fee_ledger.
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
    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const body = (await req.json()) as Body;
    if (!body?.booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- Load booking + validate payable state ----------------------------
    const { data: booking, error: bErr } = await supabase
      .from("salon_bookings")
      .select("id, store_id, client_name, client_email, service_name, start_at, status, deposit_cents, deposit_paid_cents, stripe_checkout_session_id")
      .eq("id", body.booking_id)
      .maybeSingle();
    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const b = booking as any;

    if (b.status !== "pending") {
      return new Response(JSON.stringify({ error: `Booking is ${b.status}; deposits can only be paid on pending bookings.` }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((b.deposit_cents ?? 0) <= 0) {
      return new Response(JSON.stringify({ error: "This booking doesn't require a deposit." }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((b.deposit_paid_cents ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "Deposit already paid." }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- Load Stripe Connect account from store_payment_settings ----------
    const { data: settings } = await supabase
      .from("store_payment_settings")
      .select("stripe_account_id, stripe_status")
      .eq("store_id", b.store_id)
      .eq("market", "us")
      .maybeSingle();
    const accountId = (settings as any)?.stripe_account_id;
    if (!accountId || (settings as any).stripe_status !== "active") {
      return new Response(JSON.stringify({ error: "This salon hasn't finished Stripe onboarding yet." }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- Reuse existing open session if one exists ------------------------
    // Stripe Checkout sessions expire 24h after creation by default. If the
    // booking already has a session_id, check whether it's still open.
    if (b.stripe_checkout_session_id) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(b.stripe_checkout_session_id);
        if (existing.status === "open" && existing.url) {
          return new Response(JSON.stringify({ url: existing.url, session_id: existing.id }), {
            status: 200, headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      } catch {
        // Session may have been deleted on Stripe's side; fall through to create a new one.
      }
    }

    // ---- Store metadata ---------------------------------------------------
    const { data: store } = await supabase
      .from("store_profiles")
      .select("name, slug")
      .eq("id", b.store_id)
      .maybeSingle();
    const storeName = (store as any)?.name ?? "your salon";
    const appUrl = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "https://hizivo.com";

    // ---- Create the Checkout Session --------------------------------------
    const startLocal = new Date(b.start_at).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });

    // Idempotency-Key: derived from booking + amount so a retry returns the
    // same session, but a price change creates a fresh one.
    const idempotencyKey = `salon-deposit-${b.id}-${b.deposit_cents}`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: b.client_email ?? undefined,
        // Force-create a persistent Customer so the saved PaymentMethod
        // (setup_future_usage below) attaches to a re-usable Customer id
        // we can charge off-session later for the no-show fee. Without
        // this, Checkout would only create a guest reference that the
        // off-session paymentIntents.create call can't reuse.
        customer_creation: "always",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: b.deposit_cents,
            product_data: {
              name: `Deposit for ${b.service_name}`,
              description: `${storeName} · ${startLocal}`,
            },
          },
          quantity: 1,
        }],
        metadata: {
          type: "salon_deposit",
          salon_booking_id: b.id,
          store_id: b.store_id,
        },
        payment_intent_data: {
          // application_fee_amount: 0 — platform 2% is recorded post-payment
          // via the existing platform_fee_ledger flow in stripe-webhook.
          transfer_data: { destination: accountId },
          // Save the card off-session so charge-salon-no-show-fee can draw
          // against it if the customer no-shows. The customer's consent to
          // this was captured up-front on PublicSalonBookingPage (audit
          // trail in salon_bookings.no_show_fee_consent_at).
          setup_future_usage: "off_session",
          metadata: {
            type: "salon_deposit",
            salon_booking_id: b.id,
            store_id: b.store_id,
          },
        },
        success_url: `${appUrl}/booking/${b.id}?deposit=success`,
        cancel_url: `${appUrl}/booking/${b.id}?deposit=cancel`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 23, // 23h (just under Stripe's 24h max)
      },
      { idempotencyKey },
    );

    // ---- Persist session_id on the booking --------------------------------
    await supabase
      .from("salon_bookings")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", b.id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[create-salon-deposit]", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
