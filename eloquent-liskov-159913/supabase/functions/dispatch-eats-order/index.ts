/**
 * dispatch-eats-order
 * --------------------
 * Idempotent helper that bridges myzivo (customer) → zivodriver (driver) for
 * a paid Eats order. Inserts a `jobs` row and triggers `dispatch-start` so
 * online drivers receive offers.
 *
 * The previous flow ran this from useEatsOrder.ts directly, but that path
 * fires for redirect-based payments (PayPal / Square) BEFORE payment confirms
 * AND races with `window.location.assign`. As a result drivers were getting
 * offers for unpaid or cancelled orders. This function is now the single
 * trusted dispatcher — called from the payment webhooks once payment_status
 * flips to 'paid'.
 *
 * Idempotency: looks up an existing job tagged with the order_id in notes.
 * If one exists, skips. Safe to call multiple times.
 */
import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id || "").trim();
    const offerTtlSeconds = Number(body.offer_ttl_seconds ?? 30);
    const radiusMeters = Number(body.radius_meters ?? 15000);

    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Idempotency: a job with this order_id in notes already exists.
    const { data: existingJob } = await admin
      .from("jobs")
      .select("id, status")
      .eq("job_type", "food_delivery")
      .like("notes", `%Food order: ${orderId}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob) {
      return new Response(JSON.stringify({
        ok: true,
        already_dispatched: true,
        job_id: (existingJob as any).id,
        status: (existingJob as any).status,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Pull the order details we need to build the job row.
    const { data: order } = await admin
      .from("food_orders")
      .select("id, customer_id, restaurant_id, delivery_address, delivery_lat, delivery_lng, total_amount, subtotal, delivery_fee, service_fee, tip_amount, items, payment_status, status, special_instructions")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((order as any).payment_status !== "paid" && (order as any).payment_status !== "cash_on_delivery") {
      return new Response(JSON.stringify({
        error: "Order not yet paid — refusing to dispatch",
        payment_status: (order as any).payment_status,
      }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Hydrate restaurant pickup info.
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("name, address, lat, lng, phone")
      .eq("id", (order as any).restaurant_id)
      .maybeSingle();

    const { data: jobInsert, error: jobErr } = await admin
      .from("jobs")
      .insert({
        customer_id: (order as any).customer_id,
        job_type: "food_delivery" as any,
        status: "requested" as any,
        pickup_address: restaurant?.name || "Restaurant",
        pickup_lat: (restaurant as any)?.lat || 0,
        pickup_lng: (restaurant as any)?.lng || 0,
        dropoff_address: (order as any).delivery_address,
        dropoff_lat: (order as any).delivery_lat,
        dropoff_lng: (order as any).delivery_lng,
        notes: `Food order: ${orderId}`,
        price_total: (order as any).total_amount,
        requested_at: new Date().toISOString(),
      } as any)
      .select("id")
      .single();
    if (jobErr || !jobInsert) {
      console.error("[dispatch-eats-order] job insert failed", jobErr);
      return new Response(JSON.stringify({ error: jobErr?.message || "Could not create job" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Also create a service_orders row for the new unified pipeline
    // (zivodriver Service Jobs page reads from service_orders, NOT jobs).
    // Without this insert, drivers using the new UI never see the offer.
    // Idempotency: if a service_orders row already exists for this order,
    // skip — re-dispatch should not create duplicates.
    const { data: existingService } = await admin
      .from("service_orders")
      .select("id")
      .eq("external_order_id", orderId)
      .eq("external_kind", "food_order")
      .maybeSingle();
    if (!existingService) {
      const totalCents = Math.round(Number((order as any).total_amount || 0) * 100);
      const subtotalCents = Math.round(Number((order as any).subtotal || 0) * 100);
      const deliveryFeeCents = Math.round(Number((order as any).delivery_fee || 0) * 100);
      const serviceFeeCents = Math.round(Number((order as any).service_fee || 0) * 100);
      const tipCents = Math.round(Number((order as any).tip_amount || 0) * 100);
      const { error: serviceErr } = await admin
        .from("service_orders")
        .insert({
          kind: "delivery",
          status: "searching",
          customer_id: (order as any).customer_id,
          shop_id: (order as any).restaurant_id,
          pickup_address: restaurant?.name || "Restaurant",
          pickup_lat: (restaurant as any)?.lat || null,
          pickup_lng: (restaurant as any)?.lng || null,
          dropoff_address: (order as any).delivery_address,
          dropoff_lat: (order as any).delivery_lat,
          dropoff_lng: (order as any).delivery_lng,
          items: (order as any).items ?? null,
          special_notes: (order as any).special_instructions ?? null,
          subtotal_cents: subtotalCents,
          delivery_fee_cents: deliveryFeeCents,
          service_fee_cents: serviceFeeCents,
          tip_cents: tipCents,
          total_cents: totalCents,
          currency: "USD",
          external_order_id: orderId,
          external_kind: "food_order",
        } as any);
      if (serviceErr) {
        // Don't fail the dispatch — legacy jobs row still exists, drivers
        // using the legacy UI will still see the offer. Log + continue.
        console.warn("[dispatch-eats-order] service_orders insert failed", serviceErr);
      } else {
        console.log("[dispatch-eats-order] service_orders row created", { order_id: orderId });
      }
    }

    // Trigger dispatch-start (in zivodriver's edge functions, but same project).
    try {
      await fetch(`${supabaseUrl}/functions/v1/dispatch-start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          job_id: (jobInsert as any).id,
          offer_ttl_seconds: offerTtlSeconds,
          radius_meters: radiusMeters,
        }),
      });
    } catch (e) {
      console.warn("[dispatch-eats-order] dispatch-start invocation failed", e);
      // Don't fail — the job row exists; ops can retry dispatch from admin.
    }

    return new Response(JSON.stringify({
      ok: true,
      job_id: (jobInsert as any).id,
      already_dispatched: false,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[dispatch-eats-order]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
