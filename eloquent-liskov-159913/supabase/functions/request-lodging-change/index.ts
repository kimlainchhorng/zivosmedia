/** request-lodging-change — guest submits a validated lodging reschedule request. */
import { createClient } from "../_shared/deps.ts";
import { notifyLodgingReservation } from "../_shared/lodging-notifications.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ACTIVE = ["hold", "confirmed", "checked_in"];

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (isLikelyMaliciousBot(req.headers)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(admin, ipHash)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (await isAbuseThresholdExceeded(admin, user.id)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions. Try again in 24 hours." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { reservation_id, type, check_in, check_out, reason } = await req.json();
    if (!reservation_id || type !== "reschedule") return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (typeof reason === "string") {
      const linkScan = scanContentForLinks(reason);
      if (!linkScan.ok) {
        logBlockedAttempt(admin, { endpoint: "request-lodging-change", userId: user.id, urls: linkScan.blocked, text: reason, ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") });
        return new Response(JSON.stringify({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    if (!check_in || !check_out || daysBetween(check_in, check_out) < 1 || new Date(check_in) < new Date(new Date().toDateString())) {
      return new Response(JSON.stringify({ error: "invalid_range" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: reservation } = await supabase
      .from("lodge_reservations")
      .select("id, store_id, room_id, check_in, check_out, total_cents, paid_cents, rate_cents, status, guest_id")
      .eq("id", reservation_id)
      .maybeSingle();
    if (!reservation) return new Response(JSON.stringify({ error: "reservation_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (reservation.guest_id && reservation.guest_id !== user.id) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (["cancelled", "checked_out", "no_show"].includes(reservation.status)) return new Response(JSON.stringify({ error: "reservation_inactive" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: conflicts } = await admin.from("lodge_reservations").select("id").eq("room_id", reservation.room_id).in("status", ACTIVE).neq("id", reservation.id).lt("check_in", check_out).gt("check_out", check_in).limit(1);
    if (conflicts?.length) return new Response(JSON.stringify({ error: "room_unavailable" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: blocks } = await admin.from("lodge_room_blocks").select("id, block_date").eq("room_id", reservation.room_id).gte("block_date", check_in).lt("block_date", check_out).limit(1);
    if (blocks?.length) return new Response(JSON.stringify({ error: "room_blocked", block_date: blocks[0].block_date }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const oldNights = Math.max(1, daysBetween(reservation.check_in, reservation.check_out));
    const newNights = daysBetween(check_in, check_out);
    const nightly = Number(reservation.rate_cents || Math.round((reservation.total_cents || 0) / oldNights));
    const proposedTotalCents = nightly * newNights;
    const priceDeltaCents = proposedTotalCents - Number(reservation.total_cents || 0);
    const autoApprove = Math.abs(daysBetween(reservation.check_in, check_in)) <= 14 && priceDeltaCents <= 0;
    const now = new Date().toISOString();

    const { data: inserted, error: iErr } = await admin.from("lodge_reservation_change_requests").insert({
      reservation_id,
      store_id: reservation.store_id,
      type: "reschedule",
      status: autoApprove ? "auto_approved" : "pending",
      proposed_check_in: check_in,
      proposed_check_out: check_out,
      proposed_total_cents: proposedTotalCents,
      price_delta_cents: priceDeltaCents,
      reason: reason || null,
      requested_by: user.id,
      decided_at: autoApprove ? now : null,
      decided_by: autoApprove ? user.id : null,
      applied_at: autoApprove ? now : null,
      payment_status: priceDeltaCents > 0 ? "requires_capture" : "not_required",
    }).select("id").single();
    if (iErr) throw iErr;

    if (autoApprove) {
      await admin.from("lodge_reservations").update({ check_in, check_out, nights: newNights, total_cents: proposedTotalCents }).eq("id", reservation_id);
      await admin.from("lodge_reservation_audit").insert({ reservation_id, store_id: reservation.store_id, action: "rescheduled", actor_id: user.id, notes: reason || null, metadata: { check_in, check_out, price_delta_cents: priceDeltaCents } }).then(() => null);
    }
    await notifyLodgingReservation(admin, { reservationId: reservation_id, event: "reschedule_update", templateName: "lodging-reschedule-update", idempotencyKey: `reschedule-request-${inserted.id}`, title: autoApprove ? "Dates updated" : "Date change sent to host", message: autoApprove ? "Your new lodging dates are confirmed." : "Your date change request was sent to the property for approval.", templateData: { checkIn: check_in, checkOut: check_out, status: autoApprove ? "auto approved" : "pending" }, smsBody: autoApprove ? "ZIVO: Your lodging dates were updated." : "ZIVO: Your lodging date change was sent to the host." });

    return new Response(JSON.stringify({ request_id: inserted.id, auto_approved: autoApprove, price_delta_cents: priceDeltaCents, proposed_total_cents: proposedTotalCents }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
