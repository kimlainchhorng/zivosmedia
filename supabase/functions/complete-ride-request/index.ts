import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const USD_TO_KHR = 4062.5;
const DEFAULT_COMMISSION_PERCENT = 20;

function json(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function money(amount: number, currency: string): number {
  return currency === "KHR" ? Math.round(amount) : Math.round(amount * 100) / 100;
}

function formatAmount(amount: number, currency: string): string {
  if (currency === "KHR") return `${Math.round(amount).toLocaleString("en-US")} KHR`;
  return `$${amount.toFixed(2)}`;
}

function isBakongRide(ride: any): boolean {
  const currency = String(ride.payment_currency || "").toUpperCase();
  const paymentStatus = String(ride.payment_status || "").toLowerCase();
  return currency === "KHR" || paymentStatus.startsWith("bakong") || Boolean(ride.bakong_reference);
}

function isTerminalCancelled(status: string): boolean {
  return ["cancelled", "canceled"].includes(status.toLowerCase());
}

function isCashPayment(status: string): boolean {
  return status.toLowerCase() === "cash";
}

function isBakongPaidStatus(status: string): boolean {
  return ["bakong_paid", "aba_paid", "paid", "captured"].includes(status.toLowerCase());
}

function isCardSettledStatus(status: string): boolean {
  return ["captured", "paid", "succeeded"].includes(status.toLowerCase());
}

function isResolvedPayoutStatus(status: string): boolean {
  return ["manual_paid", "stripe_paid", "cash_collected", "waived"].includes(status.toLowerCase());
}

function resolveGrossAmount(ride: any, currency: string): number {
  if (currency === "KHR") {
    return Math.max(0, Math.round(Number(ride.bakong_amount_khr ?? ride.payment_amount ?? 0)));
  }
  const cents = Number(ride.captured_amount_cents ?? 0);
  if (Number.isFinite(cents) && cents > 0) return cents / 100;
  return Math.max(0, Number(ride.payment_amount ?? ride.quoted_total ?? 0));
}

async function getCommissionPercent(admin: any, rideType: string | null): Promise<number> {
  const { data } = await admin
    .from("commission_settings")
    .select("vehicle_type, commission_percentage")
    .eq("service_type", "rides")
    .eq("is_active", true);
  const rows = Array.isArray(data) ? data : [];
  const exact = rows.find((row: any) => String(row.vehicle_type || "").toLowerCase() === String(rideType || "").toLowerCase());
  const fallback = rows.find((row: any) => !row.vehicle_type);
  return Number(exact?.commission_percentage ?? fallback?.commission_percentage ?? DEFAULT_COMMISSION_PERCENT);
}

Deno.serve(withSecurity("complete-ride-request", async (req, ctx) => {
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

    const { ride_request_id } = await req.json().catch(() => ({}));
    if (!ride_request_id) return json({ error: "ride_request_id required" }, 400, cors);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: ride, error: rideErr } = await admin
      .from("ride_requests")
      .select("id, user_id, status, assigned_driver_id, ride_type, quoted_total, payment_amount, payment_currency, payment_status, payment_intent_id, stripe_payment_intent_id, captured_amount_cents, surcharge_amount_cents, bakong_reference, bakong_amount_khr, completed_at")
      .eq("id", ride_request_id)
      .maybeSingle();
    if (rideErr || !ride) return json({ error: "ride not found" }, 404, cors);

    const rideStatus = String(ride.status || "");
    if (isTerminalCancelled(rideStatus)) {
      return json({ error: "cannot complete a cancelled ride" }, 409, cors);
    }
    if (!ride.assigned_driver_id) {
      return json({ error: "cannot complete ride without an assigned driver" }, 409, cors);
    }

    const { data: driver } = ride.assigned_driver_id
      ? await admin.from("drivers").select("id, user_id, full_name").eq("id", ride.assigned_driver_id).maybeSingle()
      : { data: null };
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
    const isRider = ride.user_id === user.id;
    const isAssignedDriver = driver?.user_id === user.id || driver?.id === user.id;
    if (!isRider && !isAssignedDriver && !isAdmin) return json({ error: "forbidden" }, 403, cors);

    let capturedCents = Number(ride.captured_amount_cents ?? 0);
    let paymentStatus = String(ride.payment_status || "unpaid");
    const currency = isBakongRide(ride) ? "KHR" : String(ride.payment_currency || "USD").toUpperCase();
    const piId = (ride.payment_intent_id || ride.stripe_payment_intent_id) as string | null;

    if (currency === "KHR" && !isBakongPaidStatus(paymentStatus)) {
      return json({ error: "Bakong payment is not verified" }, 409, cors);
    }

    if (currency === "USD" && piId && ["authorized", "requires_capture"].includes(paymentStatus)) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) return json({ error: "Stripe not configured" }, 500, cors);
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      try {
        const captured = await stripe.paymentIntents.capture(piId);
        capturedCents = Number(captured.amount_received || captured.amount || capturedCents || 0);
        paymentStatus = "captured";
      } catch (e: any) {
        if (String(e?.code || "") === "payment_intent_unexpected_state") {
          const current = await stripe.paymentIntents.retrieve(piId);
          capturedCents = Number(current.amount_received || current.amount || capturedCents || 0);
          paymentStatus = current.status === "succeeded" ? "captured" : paymentStatus;
        } else {
          console.error("[complete-ride-request] stripe capture failed", e);
          return json({ error: e?.message || "Stripe capture failed" }, 502, cors);
        }
      }
    }

    if (currency === "USD" && !isCashPayment(paymentStatus) && !isCardSettledStatus(paymentStatus)) {
      return json({ error: "Ride payment is not captured" }, 409, cors);
    }

    const gross = currency === "USD" && capturedCents > 0 ? capturedCents / 100 : resolveGrossAmount(ride, currency);
    const commissionPercent = await getCommissionPercent(admin, ride.ride_type ?? null);
    const platformFee = money(gross * (commissionPercent / 100), currency);
    const driverNet = money(Math.max(0, gross - platformFee), currency);
    const completedAt = ride.completed_at ?? new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status: "completed",
      completed_at: completedAt,
      commission_amount: platformFee,
      driver_earning: driverNet,
    };
    if (currency === "USD" && capturedCents > 0) {
      updatePayload.captured_amount_cents = capturedCents;
      updatePayload.payment_status = paymentStatus;
    }

    const { error: updateErr } = await admin
      .from("ride_requests")
      .update(updatePayload as any)
      .eq("id", ride_request_id);
    if (updateErr) {
      console.error("[complete-ride-request] ride update failed", updateErr);
      return json({ error: "Failed to complete ride" }, 500, cors);
    }

    let earningId: string | null = null;
    const paymentMethod = currency === "KHR"
      ? "bakong_khqr"
      : isCashPayment(paymentStatus)
        ? "cash"
        : "card";
    const payoutStatus = currency === "KHR"
      ? "manual_pending"
      : paymentMethod === "cash"
        ? "cash_collected"
        : "stripe_pending";

    const { data: existingEarning } = await admin
      .from("driver_earnings")
      .select("id, payout_status")
      .eq("ride_request_id", ride_request_id)
      .eq("earning_type", "ride")
      .maybeSingle();

    const payoutAlreadyResolved = Boolean(existingEarning && isResolvedPayoutStatus(String((existingEarning as any).payout_status || "")));

    if (payoutAlreadyResolved) {
      earningId = (existingEarning as any).id ?? null;
    } else {
      const { data: earning, error: earningErr } = await admin
        .from("driver_earnings")
        .upsert({
          driver_id: ride.assigned_driver_id,
          ride_request_id,
          earning_type: "ride",
          base_amount: gross,
          platform_fee: platformFee,
          net_amount: driverNet,
          amount: driverNet,
          payment_method: paymentMethod,
          is_cash_collected: paymentMethod === "cash",
          currency,
          payout_status: payoutStatus,
          description: `Ride ${String(ride_request_id).slice(0, 8)} completed via ${paymentMethod}`,
        } as any, { onConflict: "ride_request_id,earning_type" })
        .select("id")
        .maybeSingle();

      if (earningErr) {
        console.error("[complete-ride-request] earnings upsert failed", earningErr);
        await admin.from("admin_notifications").insert({
          category: "payments",
          severity: "critical",
          title: "Driver earning failed",
          message: `Ride ${String(ride_request_id).slice(0, 8)} was completed but driver earning creation failed: ${earningErr.message}`,
          entity_type: "ride_request",
          entity_id: ride_request_id,
          link: "/admin/drivers/payouts",
        } as any).then(() => null);
        return json({ error: "Failed to create driver earning" }, 500, cors);
      }

      earningId = earning?.id ?? null;
    }

    if (currency === "KHR" && driverNet > 0 && !payoutAlreadyResolved) {
      const { data: existingNotice } = await admin
        .from("admin_notifications")
        .select("id")
        .eq("entity_type", "driver_earning")
        .eq("entity_id", earningId || ride_request_id)
        .eq("category", "payments")
        .maybeSingle();

      if (!existingNotice) {
        await admin.from("admin_notifications").insert({
          category: "payments",
          severity: "warning",
          title: "Bakong driver payout needed",
          message: `Ride ${String(ride_request_id).slice(0, 8)} was paid by Bakong. Pay ${formatAmount(driverNet, currency)} to ${driver?.full_name || "the assigned driver"} manually.`,
          entity_type: "driver_earning",
          entity_id: earningId || ride_request_id,
          link: "/admin/drivers/payouts",
        } as any).then(() => null);
      }
    }

    admin.functions.invoke("generate-trip-receipt", { body: { ride_request_id } })
      .catch((e: unknown) => console.warn("[complete-ride-request] receipt invoke failed", e));

    return json({
      ok: true,
      ride_request_id,
      status: "completed",
      payment_status: paymentStatus,
      currency,
      gross_amount: gross,
      platform_fee: platformFee,
      driver_earning: driverNet,
      driver_earning_id: earningId,
      manual_driver_payout_required: currency === "KHR" && driverNet > 0 && !payoutAlreadyResolved,
      payout_already_resolved: payoutAlreadyResolved,
    }, 200, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[complete-ride-request]", message);
    return json({ error: message }, 500, cors);
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
