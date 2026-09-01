import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "../_shared/stripe.ts";
import { createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(
  withSecurity(
    "create-eats-payment",
    async (req, ctx) => {
      const corsHeaders = ctx.corsHeaders;
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            Allow: "POST, OPTIONS",
          },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader.startsWith("Bearer "))
          throw new Error("Not authenticated");
        const token = authHeader.replace("Bearer ", "");
        const {
          data: { user },
        } = await supabase.auth.getUser(token);
        if (!user?.email) throw new Error("Not authenticated");

        const rl = await rateLimitDb(user.id, "payment");
        if (!rl.allowed) {
          return new Response(
            JSON.stringify({
              error: "Too many requests. Please try again shortly.",
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                ...rateLimitHeaders(rl, "payment"),
              },
            },
          );
        }

        const { order_id, amount_cents } = await req.json();
        if (
          !order_id ||
          !Number.isSafeInteger(amount_cents) ||
          amount_cents < 50
        ) {
          throw new Error("Invalid order_id or amount");
        }

        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { autoRefreshToken: false, persistSession: false } },
        );
        const { data: order } = await adminClient
          .from("food_orders")
          .select(
            "id, customer_id, status, payment_type, payment_status, total_amount, stripe_payment_id",
          )
          .eq("id", order_id)
          .maybeSingle();
        if (!order || (order as any).customer_id !== user.id)
          throw new Error("Order not found or access denied");
        if ((order as any).status === "cancelled") {
          throw new Error("Cancelled orders cannot be paid");
        }
        if ((order as any).payment_type !== "card") {
          throw new Error("Order is not a card payment");
        }
        if (
          ["paid", "refunded", "refund_pending"].includes(
            (order as any).payment_status,
          )
        ) {
          throw new Error("Order is already settled");
        }
        const expectedAmount = Math.round(
          Number((order as any).total_amount || 0) * 100,
        );
        if (
          !Number.isSafeInteger(expectedAmount) ||
          expectedAmount < 50 ||
          amount_cents !== expectedAmount
        ) {
          throw new Error("Payment amount does not match order");
        }

        const stripe = new Stripe(stripeKey, {
          apiVersion: "2025-08-27.basil",
        });

        // Resolve one durable Stripe customer before creating the deterministic
        // PaymentIntent. Two first-time requests can both observe an empty
        // customer list; the stable Stripe idempotency key makes both create
        // calls resolve to the same Customer, and payment_customers preserves
        // that binding for later orders.
        const { data: existingPaymentCustomer, error: customerLookupError } =
          await adminClient
            .from("payment_customers")
            .select("provider_customer_id")
            .eq("provider", "stripe")
            .eq("zivosmedia_user_id", user.id)
            .is("business_id", null)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
        if (customerLookupError) {
          throw new Error(
            `Could not resolve Stripe customer binding: ${customerLookupError.message}`,
          );
        }

        let customerId = existingPaymentCustomer?.provider_customer_id as
          string | null;
        if (!customerId) {
          const customers = await stripe.customers.list({
            email: user.email,
            limit: 10,
          });
          const matchingCustomer =
            customers.data.find(
              (customer) =>
                customer.metadata?.zivosmedia_user_id === user.id ||
                customer.metadata?.zivo_user_id === user.id,
            ) ??
            customers.data.find(
              (customer) =>
                !customer.metadata?.zivosmedia_user_id &&
                !customer.metadata?.zivo_user_id,
            );
          if (matchingCustomer) {
            customerId = matchingCustomer.id;
          } else {
            const newCustomer = await stripe.customers.create(
              {
                email: user.email,
                metadata: {
                  zivosmedia_user_id: user.id,
                  source: "eats",
                },
              },
              { idempotencyKey: `eats-customer-${user.id}` },
            );
            customerId = newCustomer.id;
          }

          const { error: customerBindError } = await adminClient
            .from("payment_customers")
            .insert({
              zivosmedia_user_id: user.id,
              business_id: null,
              provider: "stripe",
              provider_customer_id: customerId,
              email: user.email,
              default_currency: "usd",
              metadata: { source: "eats" },
            });
          if (customerBindError) {
            if (customerBindError.code !== "23505") {
              throw new Error(
                `Could not persist Stripe customer binding: ${customerBindError.message}`,
              );
            }
            const { data: recoveredBinding, error: recoveredBindingError } =
              await adminClient
                .from("payment_customers")
                .select("provider_customer_id")
                .eq("provider", "stripe")
                .eq("provider_customer_id", customerId)
                .eq("zivosmedia_user_id", user.id)
                .is("business_id", null)
                .maybeSingle();
            if (recoveredBindingError || !recoveredBinding) {
              throw new Error(
                `Could not recover Stripe customer binding: ${recoveredBindingError?.message ?? "conflicting customer owner"}`,
              );
            }
            customerId = recoveredBinding.provider_customer_id;
          }
        }
        if (!customerId) {
          throw new Error("Stripe customer binding is incomplete");
        }

        // Create PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: expectedAmount,
            currency: "usd",
            customer: customerId,
            metadata: { type: "eats", order_id, user_id: user.id },
            automatic_payment_methods: { enabled: true },
          },
          { idempotencyKey: `eats-payment-${order_id}-${expectedAmount}` },
        );

        // Update food_orders with stripe payment intent ID
        const { data: savedOrder, error: updateError } = await adminClient
          .from("food_orders")
          .update({
            stripe_payment_id: paymentIntent.id,
            payment_provider: "stripe",
          })
          .eq("id", order_id)
          .eq("customer_id", user.id)
          .neq("status", "cancelled")
          .neq("status", "refunded")
          .in("payment_status", [
            "unpaid",
            "pending",
            "processing",
            "authorized",
            "failed",
          ])
          .select("id")
          .maybeSingle();
        if (updateError) {
          // The database response is uncertain: the write may have committed
          // even though its acknowledgement failed. Keep the deterministic
          // PaymentIntent alive so a retry can retrieve the same intent and
          // safely repeat this idempotent attachment instead of receiving a
          // cancelled intent with an unusable client secret.
          console.error("[create-eats-payment:update]", updateError.message);
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Payment setup is still being confirmed",
              retryable: true,
            }),
            {
              status: 503,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        if (!savedOrder) {
          try {
            await stripe.paymentIntents.cancel(paymentIntent.id, {
              cancellation_reason: "abandoned",
            });
          } catch (cancelError) {
            console.error(
              "[create-eats-payment:cancel-orphan]",
              cancelError instanceof Error ? cancelError.message : "unknown",
            );
          }
          return new Response(
            JSON.stringify({ ok: false, error: "Order is no longer payable" }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    },
    {
      rateLimit: "payment",
      strictCors: true,
      allowedMethods: ["POST"],
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);
