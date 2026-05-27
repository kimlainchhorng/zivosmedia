import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const USD_TO_KHR = 4062.5;

type Decision = "refunded" | "no_refund_due";

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function formatKhr(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} KHR`;
}

function appendAdminNote(existing: string | null, adminId: string, decision: Decision, amountKhr: number, notes: string | null) {
  const stamp = new Date().toISOString();
  const action = decision === "refunded" ? `manual Bakong refund marked paid (${formatKhr(amountKhr)})` : "manual Bakong refund marked no refund due";
  const line = `[${stamp}] ${action} by ${adminId}${notes ? `: ${notes}` : ""}`;
  return existing ? `${existing}\n${line}` : line;
}

Deno.serve(withSecurity("resolve-bakong-ride-refund", async (req, ctx) => {
  const cors = ctx.corsHeaders;

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { ...cors, "Allow": "POST, OPTIONS" });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader) return json({ error: "unauthorized" }, 401, cors);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "unauthorized" }, 401, cors);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
    if (!isAdmin) return json({ error: "admin role required" }, 403, cors);

    const { ride_request_id, decision, notes } = await req.json();
    if (!ride_request_id || !["refunded", "no_refund_due"].includes(decision)) {
      return json({ error: "invalid input" }, 400, cors);
    }

    const trimmedNotes = typeof notes === "string" && notes.trim().length > 0
      ? notes.trim().slice(0, 2000)
      : null;

    const { data: ride, error: rideErr } = await admin
      .from("ride_requests")
      .select("id, user_id, payment_status, payment_currency, payment_amount, refund_status, refunded_at, bakong_reference, bakong_amount_khr, cancel_fee_cents, admin_notes")
      .eq("id", ride_request_id)
      .maybeSingle();

    if (rideErr || !ride) return json({ error: "ride not found" }, 404, cors);

    const currency = String((ride as any).payment_currency || "").toUpperCase();
    const paymentStatus = String((ride as any).payment_status || "");
    const isBakongRide = currency === "KHR" || Boolean((ride as any).bakong_reference) || paymentStatus.startsWith("bakong_");
    if (!isBakongRide) {
      return json({ error: "bakong ride required" }, 400, cors);
    }

    const currentRefundStatus = String((ride as any).refund_status || "");
    if (currentRefundStatus === "manual_refunded" || currentRefundStatus === "no_refund_due") {
      return json({
        ok: true,
        status: "already_resolved",
        refund_status: currentRefundStatus,
        payment_status: (ride as any).payment_status,
      }, 200, cors);
    }
    if (currentRefundStatus !== "manual_refund_pending") {
      return json({ error: "refund_not_pending", refund_status: currentRefundStatus || null }, 409, cors);
    }

    const paidKhr = Math.max(0, Math.round(Number((ride as any).bakong_amount_khr ?? (ride as any).payment_amount ?? 0)));
    const feeKhr = Math.min(paidKhr, Math.round((Number((ride as any).cancel_fee_cents || 0) / 100) * USD_TO_KHR));
    const refundKhr = Math.max(0, paidKhr - feeKhr);
    const finalDecision = decision as Decision;

    const updatePayload = {
      payment_status: finalDecision === "refunded" ? "bakong_refunded" : "bakong_paid",
      refund_status: finalDecision === "refunded" ? "manual_refunded" : "no_refund_due",
      refunded_at: finalDecision === "refunded" ? new Date().toISOString() : (ride as any).refunded_at ?? null,
      admin_notes: appendAdminNote((ride as any).admin_notes ?? null, user.id, finalDecision, refundKhr, trimmedNotes),
    };

    const { error: updateErr } = await admin
      .from("ride_requests")
      .update(updatePayload as any)
      .eq("id", ride_request_id);
    if (updateErr) return json({ error: updateErr.message }, 500, cors);

    await admin
      .from("admin_notifications")
      .update({ is_read: true, is_archived: true } as any)
      .eq("entity_type", "ride_request")
      .eq("entity_id", ride_request_id)
      .eq("category", "payments")
      .ilike("title", "%Bakong ride refund%")
      .then(() => null);

    await admin.from("admin_actions").insert({
      admin_id: user.id,
      action_type: finalDecision === "refunded" ? "bakong_manual_refund_marked_paid" : "bakong_manual_refund_closed",
      entity_type: "ride_request",
      entity_id: ride_request_id,
      payload_json: {
        decision: finalDecision,
        refund_amount_khr: refundKhr,
        paid_amount_khr: paidKhr,
        fee_amount_khr: feeKhr,
        bakong_reference: (ride as any).bakong_reference ?? null,
        notes: trimmedNotes,
      },
    } as any).then(() => null);

    return json({
      ok: true,
      status: "resolved",
      decision: finalDecision,
      payment_status: updatePayload.payment_status,
      refund_status: updatePayload.refund_status,
      refund_amount_khr: refundKhr,
      paid_amount_khr: paidKhr,
      fee_amount_khr: feeKhr,
    }, 200, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resolve-bakong-ride-refund]", message);
    return json({ error: message }, 500, cors);
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
