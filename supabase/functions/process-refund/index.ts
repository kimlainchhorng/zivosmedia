import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("process-refund", async (req, ctx) => {
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Verify admin role via has_role
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(admin, ipHash)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (await isAbuseThresholdExceeded(admin, user.id)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions. Try again in 24 hours." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { request_id, decision, approved_amount_cents, notes } = await req.json();
    if (!request_id || !["approve", "partial", "deny"].includes(decision)) {
      return new Response(JSON.stringify({ error: "invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof notes === "string") {
      const linkScan = scanContentForLinks(notes);
      if (!linkScan.ok) {
        logBlockedAttempt(admin, { endpoint: "process-refund", userId: user.id, urls: linkScan.blocked, text: notes, ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") });
        return new Response(JSON.stringify({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: refundReq, error: reqErr } = await admin
      .from("ride_refund_requests")
      .select("*")
      .eq("id", request_id)
      .maybeSingle();
    if (reqErr || !refundReq) {
      return new Response(JSON.stringify({ error: "request not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (refundReq.status !== "pending") {
      return new Response(JSON.stringify({ error: "already decided" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DENY path
    if (decision === "deny") {
      await admin.from("ride_refund_requests").update({
        status: "denied",
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        decision_notes: notes ?? null,
      } as any).eq("id", request_id);

      // Email rider best-effort
      try {
        const { data: rider } = await admin.from("profiles").select("email, full_name").eq("user_id", refundReq.requester_id).maybeSingle();
        if (rider?.email) {
          await admin.functions.invoke("send-transactional-email", {
            body: { template: "generic", to: rider.email, subject: "Your refund request was reviewed", data: { heading: "Refund denied", body: notes || "After review, your refund request was not approved." } },
          });
        }
      } catch {}

      return new Response(JSON.stringify({ ok: true, status: "denied" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // APPROVE / PARTIAL — execute Stripe refund
    const { data: ride } = await admin
      .from("ride_requests")
      .select("id, user_id, payment_intent_id, stripe_payment_intent_id, captured_amount_cents, payment_amount")
      .eq("id", refundReq.ride_request_id)
      .maybeSingle();
    if (!ride) {
      return new Response(JSON.stringify({ error: "ride not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const piId = (ride.payment_intent_id || ride.stripe_payment_intent_id) as string | null;
    if (!piId) {
      return new Response(JSON.stringify({ error: "no payment intent on ride" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tripTotalCents = (ride.captured_amount_cents as number) ?? Math.round(((ride.payment_amount as number) ?? 0) * 100);
    let amount = decision === "approve" ? refundReq.requested_amount_cents : (approved_amount_cents ?? 0);
    amount = Math.min(Math.max(0, amount), tripTotalCents);
    if (amount <= 0) {
      return new Response(JSON.stringify({ error: "amount must be > 0" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let stripeRefundId: string | null = null;
    try {
      const refund = await stripe.refunds.create({
        payment_intent: piId,
        amount,
        reason: "requested_by_customer",
        metadata: { ride_request_id: ride.id, refund_request_id: request_id },
      });
      stripeRefundId = refund.id;
    } catch (e: any) {
      console.error("[process-refund] stripe error", e);
      return new Response(JSON.stringify({ error: `stripe: ${e.message ?? e}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isPartial = amount < tripTotalCents;
    const newPaymentStatus = isPartial ? "partial_refund" : "refunded";

    await admin.from("ride_refund_requests").update({
      status: "processed",
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      decision_notes: notes ?? null,
      approved_amount_cents: amount,
      stripe_refund_id: stripeRefundId,
    } as any).eq("id", request_id);

    await admin.from("ride_requests").update({ payment_status: newPaymentStatus, refund_status: newPaymentStatus } as any).eq("id", ride.id);

    // Ledger entry (negative)
    await admin.from("financial_ledger").insert({
      user_id: ride.user_id,
      ride_request_id: ride.id,
      entry_type: "refund",
      amount_cents: -amount,
      currency: "usd",
      stripe_reference: stripeRefundId,
      description: `Refund (${decision}) for ride ${ride.id.slice(0, 8)}`,
    } as any);

    // Audit log
    try {
      await admin.from("admin_actions").insert({
        admin_id: user.id,
        action_type: "refund_processed",
        entity_type: "ride_refund_request",
        entity_id: request_id,
        payload_json: { decision, amount_cents: amount, stripe_refund_id: stripeRefundId, notes },
      } as any);
    } catch {}

    // Email rider
    try {
      const { data: rider } = await admin.from("profiles").select("email, full_name").eq("user_id", ride.user_id).maybeSingle();
      if (rider?.email) {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            template: "generic",
            to: rider.email,
            subject: `Your ZIVO refund of $${(amount / 100).toFixed(2)} was processed`,
            data: { heading: "Refund issued", body: `We've refunded $${(amount / 100).toFixed(2)} to your original payment method. Allow 5-10 business days for it to appear.` },
          },
        });
      }
    } catch {}

    return new Response(JSON.stringify({ ok: true, status: "processed", stripe_refund_id: stripeRefundId, amount_cents: amount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[process-refund]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
