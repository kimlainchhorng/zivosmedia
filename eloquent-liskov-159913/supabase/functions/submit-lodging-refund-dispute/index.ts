import { createClient } from "../_shared/deps.ts";
import { notifyLodgingReservation } from "../_shared/lodging-notifications.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const openStatuses = ["pending", "under_review", "approved"];
const allowedStatuses = ["cancelled", "no_show", "checked_out"];

Deno.serve(withSecurity("submit-lodging-refund-dispute", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claimsData.claims.sub;

    const body = await req.json().catch(() => ({}));
    const reservationId = String(body.reservation_id || "");
    const reasonCategory = String(body.reason_category || "refund_review").slice(0, 80);
    const description = String(body.description || "").trim().slice(0, 2000);
    const requestedAmount = Math.max(0, Math.round(Number(body.requested_amount_cents || 0)));
    if (!reservationId || description.length < 12) return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: r } = await admin.from("lodge_reservations").select("id, store_id, guest_id, status, payment_status, paid_cents, total_cents").eq("id", reservationId).maybeSingle();
    if (!r) return new Response(JSON.stringify({ error: "reservation_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.guest_id !== userId) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const paymentStatus = String(r.payment_status || "");
    if (!allowedStatuses.includes(String(r.status)) && !paymentStatus.includes("refund") && paymentStatus !== "cancelled_no_refund") {
      return new Response(JSON.stringify({ error: "not_eligible" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: existing } = await admin.from("lodge_refund_disputes").select("id, status").eq("reservation_id", reservationId).in("status", openStatuses).limit(1);
    if (existing?.length) return new Response(JSON.stringify({ error: "open_request_exists" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: cancelReq } = await admin.from("lodge_reservation_change_requests").select("id, refund_cents, addon_payload").eq("reservation_id", reservationId).eq("type", "cancel").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const nonRefundable = Number(cancelReq?.addon_payload?.non_refundable_cents ?? Math.max(0, Number(r.paid_cents || 0) - Number(cancelReq?.refund_cents || 0)));
    const capped = Math.min(requestedAmount || nonRefundable, Math.max(0, nonRefundable || Number(r.paid_cents || 0)));

    const { data: inserted, error } = await admin.from("lodge_refund_disputes").insert({ reservation_id: r.id, store_id: r.store_id, guest_id: userId, change_request_id: cancelReq?.id || null, reason_category: reasonCategory, description, requested_amount_cents: capped, status: "pending" }).select("id").single();
    if (error) throw error;
    await admin.from("admin_notifications").insert({ category: "lodging_refund_dispute", title: "Lodging refund request", message: `Refund review requested for reservation ${r.id}`, severity: "medium", entity_type: "lodge_refund_dispute", entity_id: inserted.id }).then(() => null);
    await notifyLodgingReservation(admin, { reservationId: r.id, event: "refund_dispute_submitted", templateName: "lodging-cancellation-update", idempotencyKey: `refund-dispute-${inserted.id}`, title: "Refund review request received", message: "Your refund request was submitted and is pending review.", templateData: { requestedAmountCents: capped }, smsBody: "ZIVO: Your lodging refund review request was received and is pending review." });

    return new Response(JSON.stringify({ ok: true, id: inserted.id, requested_amount_cents: capped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
