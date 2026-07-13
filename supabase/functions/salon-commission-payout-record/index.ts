/**
 * salon-commission-payout-record
 * ------------------------------
 * Protected writer for stylist commission payout ledger rows. The owner UI can
 * show calculated totals, but this function re-computes the amount from
 * completed bookings before recording or deleting payout rows.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const methods = new Set(["cash", "venmo", "zelle", "check", "ach", "stripe", "other"]);

serve(withSecurity("salon-commission-payout-record", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData.user) throw new Error("Invalid auth");
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "create");

    const execute = async () => {
      if (action === "delete") {
        const payoutId = String(body.payout_id || "").trim();
        if (!payoutId) return { status: 400, body: { error: "Missing payout_id" } };

        const { data: payout, error: payoutError } = await supabase
          .from("salon_commission_payouts")
          .select("id,store_id")
          .eq("id", payoutId)
          .maybeSingle();
        if (payoutError) throw payoutError;
        if (!payout) return { status: 200, body: { success: true, deleted: false } };

        await assertCanManageStore(supabase, userId, (payout as any).store_id);

        const { error: deleteError } = await supabase
          .from("salon_commission_payouts")
          .delete()
          .eq("id", payoutId)
          .eq("store_id", (payout as any).store_id);
        if (deleteError) throw deleteError;
        return { status: 200, body: { success: true, deleted: true, id: payoutId } };
      }

      if (action !== "create") return { status: 400, body: { error: "Invalid action" } };

      const storeId = String(body.store_id || "").trim();
      const stylistId = String(body.stylist_id || "").trim();
      const periodFrom = String(body.period_from || "").trim();
      const periodTo = String(body.period_to || "").trim();
      const method = String(body.method || "cash").trim();
      const reference = body.reference ? String(body.reference).trim().slice(0, 200) : null;
      const notes = body.notes ? String(body.notes).trim().slice(0, 500) : null;

      if (!storeId || !stylistId || !periodFrom || !periodTo || !methods.has(method)) {
        return { status: 400, body: { error: "Missing required fields" } };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(periodFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(periodTo)) {
        return { status: 400, body: { error: "Invalid period" } };
      }
      if (periodTo < periodFrom) {
        return { status: 400, body: { error: "Invalid period order" } };
      }

      await assertCanManageStore(supabase, userId, storeId);

      const { data: stylist, error: stylistError } = await supabase
        .from("salon_stylists")
        .select("id,store_id,commission_percent")
        .eq("id", stylistId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (stylistError) throw stylistError;
      if (!stylist) return { status: 403, body: { error: "Stylist does not belong to this store" } };

      const fromIso = new Date(`${periodFrom}T00:00:00.000Z`).toISOString();
      const toIso = new Date(`${periodTo}T23:59:59.999Z`).toISOString();
      const { data: bookings, error: bookingsError } = await supabase
        .from("salon_bookings")
        .select("price_cents,addons_total_cents,tip_cents")
        .eq("store_id", storeId)
        .eq("stylist_id", stylistId)
        .eq("status", "completed")
        .gte("start_at", fromIso)
        .lte("start_at", toIso)
        .limit(500);
      if (bookingsError) throw bookingsError;

      const servicesCount = (bookings || []).length;
      const serviceRevenueCents = (bookings || []).reduce(
        (sum: number, booking: any) => sum + Number(booking.price_cents || 0) + Number(booking.addons_total_cents || 0),
        0,
      );
      const tipsCents = (bookings || []).reduce((sum: number, booking: any) => sum + Number(booking.tip_cents || 0), 0);
      const commissionCents = Math.round(serviceRevenueCents * (Number((stylist as any).commission_percent || 0) / 100));
      const totalPaidCents = commissionCents + tipsCents;

      const requestedTotal = Math.round(Number(body.total_paid_cents || 0));
      if (requestedTotal !== totalPaidCents) {
        return {
          status: 400,
          body: {
            error: "Payout total does not match completed bookings",
            expected_total_paid_cents: totalPaidCents,
          },
        };
      }

      const { data: inserted, error: insertError } = await supabase
        .from("salon_commission_payouts")
        .insert({
          store_id: storeId,
          stylist_id: stylistId,
          period_from: periodFrom,
          period_to: periodTo,
          services_count: servicesCount,
          service_revenue_cents: serviceRevenueCents,
          tips_cents: tipsCents,
          commission_cents: commissionCents,
          total_paid_cents: totalPaidCents,
          method,
          reference,
          notes,
          paid_by_user_id: userId,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      return { status: 200, body: { success: true, id: (inserted as any).id, total_paid_cents: totalPaidCents } };
    };

    const result = action === "create"
      ? await withIdempotency(req, "salon-commission-payout-record", userId, execute)
      : { ...(await execute()), cached: false };

    return json(result.body, result.status, {
      "X-Idempotency-Cache": result.cached ? "HIT" : "MISS",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[salon-commission-payout-record]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

async function assertCanManageStore(supabase: any, userId: string, storeId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (isAdmin === true) return;

  const { data: store } = await supabase
    .from("store_profiles")
    .select("id,owner_id")
    .eq("id", storeId)
    .maybeSingle();
  if ((store as any)?.owner_id === userId) return;

  throw new Error("Not authorized for this store");
}
