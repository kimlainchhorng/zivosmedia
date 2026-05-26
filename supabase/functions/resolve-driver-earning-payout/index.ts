import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type Decision = "manual_paid" | "stripe_paid" | "waived";

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function formatAmount(amount: number, currency: string): string {
  if (currency === "KHR") return `${Math.round(amount).toLocaleString("en-US")} KHR`;
  return `$${Number(amount || 0).toFixed(2)}`;
}

function appendDescription(existing: string | null, adminId: string, decision: Decision, reference: string | null, notes: string | null) {
  const label = decision === "manual_paid"
    ? "Manual driver payout marked paid"
    : decision === "stripe_paid"
      ? "Stripe driver payout marked paid"
      : "Driver payout waived";
  const suffix = [
    reference ? `reference ${reference}` : null,
    notes,
  ].filter(Boolean).join(" - ");
  const line = `[${new Date().toISOString()}] ${label} by ${adminId}${suffix ? `: ${suffix}` : ""}`;
  return existing ? `${existing}\n${line}` : line;
}

async function verifyManualPayoutMethod(admin: any, driverId: string, payoutMethodId: unknown, reference: string | null) {
  const { data: driver, error: driverErr } = await admin
    .from("drivers")
    .select("user_id")
    .eq("id", driverId)
    .maybeSingle();
  if (driverErr || !driver?.user_id) {
    return { methodId: null, warning: "driver payout method owner could not be found" };
  }

  let selectedMethodId = typeof payoutMethodId === "string" && payoutMethodId.trim().length > 0
    ? payoutMethodId.trim()
    : null;

  if (!selectedMethodId) {
    const { data: method, error: methodErr } = await admin
      .from("customer_payout_methods")
      .select("id")
      .eq("user_id", driver.user_id)
      .eq("method_type", "aba")
      .is("store_id", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (methodErr) {
      return { methodId: null, warning: methodErr.message };
    }
    selectedMethodId = method?.id ?? null;
  }

  if (!selectedMethodId) {
    return { methodId: null, warning: "driver has no saved ABA payout method" };
  }

  await admin
    .from("customer_payout_methods")
    .update({ is_default: false } as any)
    .eq("user_id", driver.user_id)
    .eq("method_type", "aba")
    .is("store_id", null)
    .neq("id", selectedMethodId)
    .then(() => null);

  const { data: updated, error: updateErr } = await admin
    .from("customer_payout_methods")
    .update({
      is_verified: true,
      verification_status: "verified",
      verification_note: `Verified by paid Bakong driver payout${reference ? ` ${reference}` : ""}`,
      is_default: true,
    } as any)
    .eq("user_id", driver.user_id)
    .eq("method_type", "aba")
    .is("store_id", null)
    .eq("id", selectedMethodId)
    .select("id")
    .limit(1);
  if (updateErr) {
    return { methodId: null, warning: updateErr.message };
  }

  const methodId = Array.isArray(updated) && updated.length > 0 ? updated[0]?.id ?? null : null;
  return {
    methodId,
    warning: methodId ? null : "selected ABA payout method was not found",
  };
}

Deno.serve(withSecurity("resolve-driver-earning-payout", async (req, ctx) => {
  const cors = ctx.corsHeaders;

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { ...cors, "Allow": "POST, OPTIONS" });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401, cors);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "unauthorized" }, 401, cors);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
    if (!isAdmin) return json({ error: "admin role required" }, 403, cors);

    const { earning_id, decision, reference, notes, payout_method_id } = await req.json().catch(() => ({}));
    if (!earning_id || !["manual_paid", "stripe_paid", "waived"].includes(decision)) {
      return json({ error: "invalid input" }, 400, cors);
    }

    const finalDecision = decision as Decision;
    const trimmedReference = typeof reference === "string" && reference.trim().length > 0
      ? reference.trim().slice(0, 160)
      : null;
    const trimmedNotes = typeof notes === "string" && notes.trim().length > 0
      ? notes.trim().slice(0, 2000)
      : null;

    const { data: earning, error: earningErr } = await admin
      .from("driver_earnings")
      .select("id, driver_id, ride_request_id, net_amount, currency, payout_status, payout_reference, description")
      .eq("id", earning_id)
      .maybeSingle();
    if (earningErr || !earning) return json({ error: "earning not found" }, 404, cors);

    const currency = String((earning as any).currency || "USD").toUpperCase();
    const currentStatus = String((earning as any).payout_status || "pending");
    if (["manual_paid", "stripe_paid", "waived", "cash_collected"].includes(currentStatus)) {
      return json({
        ok: true,
        status: "already_resolved",
        payout_status: currentStatus,
        payout_reference: (earning as any).payout_reference ?? null,
      }, 200, cors);
    }

    if (finalDecision === "manual_paid" && currency !== "KHR") {
      return json({ error: "manual Bakong payout requires KHR earning" }, 400, cors);
    }
    if (finalDecision === "stripe_paid" && currency !== "USD") {
      return json({ error: "Stripe payout requires USD earning" }, 400, cors);
    }
    if (finalDecision !== "waived" && !trimmedReference) {
      return json({ error: "reference required" }, 400, cors);
    }

    const updatePayload = {
      payout_status: finalDecision,
      payout_reference: trimmedReference,
      description: appendDescription((earning as any).description ?? null, user.id, finalDecision, trimmedReference, trimmedNotes),
    };

    const { error: updateErr } = await admin
      .from("driver_earnings")
      .update(updatePayload as any)
      .eq("id", earning_id);
    if (updateErr) return json({ error: updateErr.message }, 500, cors);

    let payoutMethodVerification = { methodId: null as string | null, warning: null as string | null };
    if (finalDecision === "manual_paid") {
      payoutMethodVerification = await verifyManualPayoutMethod(
        admin,
        String((earning as any).driver_id),
        payout_method_id,
        trimmedReference,
      );
    }

    await admin
      .from("admin_notifications")
      .update({ is_read: true, is_archived: true } as any)
      .eq("entity_type", "driver_earning")
      .eq("entity_id", earning_id)
      .eq("category", "payments")
      .then(() => null);

    await admin.from("admin_driver_actions").insert({
      admin_id: user.id,
      driver_id: (earning as any).driver_id,
      action_type: finalDecision === "manual_paid" ? "driver_manual_payout_marked_paid" : finalDecision === "stripe_paid" ? "driver_stripe_payout_marked_paid" : "driver_payout_waived",
      reason: trimmedNotes,
      metadata: {
        earning_id,
        ride_request_id: (earning as any).ride_request_id ?? null,
        decision: finalDecision,
        reference: trimmedReference,
        net_amount: Number((earning as any).net_amount || 0),
        currency,
        payout_method_id: payoutMethodVerification.methodId,
        payout_method_warning: payoutMethodVerification.warning,
      },
    } as any).then(() => null);

    return json({
      ok: true,
      earning_id,
      payout_status: finalDecision,
      payout_reference: trimmedReference,
      net_amount: Number((earning as any).net_amount || 0),
      currency,
      display_amount: formatAmount(Number((earning as any).net_amount || 0), currency),
      payout_method_verified_id: payoutMethodVerification.methodId,
      payout_method_warning: payoutMethodVerification.warning,
    }, 200, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resolve-driver-earning-payout]", message);
    return json({ error: message }, 500, cors);
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
