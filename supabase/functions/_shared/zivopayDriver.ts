// @ts-nocheck
import {
  auditPaymentEvent,
  json,
  requireUser,
  requireUuid,
  safeUrl,
  serviceClient,
  stripeClient,
} from "./zivopay.ts";

export async function driverIdsForUser(admin: any, userId: string): Promise<string[]> {
  const ids = new Set<string>([userId]);
  const { data } = await admin
    .from("drivers")
    .select("id")
    .eq("user_id", userId);
  for (const row of data ?? []) {
    if (row?.id) ids.add(row.id);
  }
  return [...ids];
}

export async function createDriverPayoutAccount(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const origin = req.headers.get("origin") || "https://zivodriver.com";
    const returnUrl = safeUrl(body.return_url, `${origin}/driver/payouts?onboarded=1`);
    const refreshUrl = safeUrl(body.refresh_url, `${origin}/driver/payouts`);
    const country = String(body.country || "US").slice(0, 2).toUpperCase();
    const admin = serviceClient();
    const stripe = stripeClient();

    const { data: existing } = await admin
      .from("driver_stripe_accounts")
      .select("stripe_account_id")
      .eq("driver_id", user.id)
      .maybeSingle();

    let accountId = existing?.stripe_account_id ?? null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email: user.email || undefined,
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        metadata: { zivosmedia_user_id: user.id, driver_id: user.id },
      });
      accountId = account.id;
      await admin.from("driver_stripe_accounts").insert({
        driver_id: user.id,
        stripe_account_id: accountId,
        country,
      } as any);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    await auditPaymentEvent(admin, {
      event_type: "driver_payout_account_link_created",
      actor_user_id: user.id,
      zivosmedia_user_id: user.id,
      source_platform: "zivo_driver",
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      metadata: { provider_connected_account_id: accountId },
    });

    return json(cors, { url: link.url, account_id: accountId });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function getDriverEarnings(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const admin = serviceClient();
    const driverIds = await driverIdsForUser(admin, user.id);
    const { data, error } = await admin
      .from("driver_earnings")
      .select("id, driver_id, ride_request_id, trip_id, earning_type, base_amount, tip_amount, bonus_amount, platform_fee, net_amount, currency, payout_status, payout_reference, description, created_at")
      .in("driver_id", driverIds)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    const summary = (data ?? []).reduce((acc: any, row: any) => {
      const currency = String(row.currency || "USD").toUpperCase();
      if (!acc[currency]) acc[currency] = { gross: 0, fees: 0, net: 0, pending: 0, paid: 0 };
      acc[currency].gross += Number(row.base_amount || 0) + Number(row.tip_amount || 0) + Number(row.bonus_amount || 0);
      acc[currency].fees += Number(row.platform_fee || 0);
      acc[currency].net += Number(row.net_amount || 0);
      if (["stripe_paid", "manual_paid", "cash_collected", "waived"].includes(String(row.payout_status))) acc[currency].paid += Number(row.net_amount || 0);
      else acc[currency].pending += Number(row.net_amount || 0);
      return acc;
    }, {});

    return json(cors, { earnings: data ?? [], summary });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function getDriverPayouts(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const admin = serviceClient();
    const { data, error } = await admin
      .from("payment_driver_payouts")
      .select("*")
      .eq("zivosmedia_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return json(cors, { payouts: data ?? [] });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function applyDriverPayoutStatus(req: Request, ctx: any, status: "paid" | "failed") {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("authorization") ?? "";
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return json(ctx.corsHeaders, { error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const payoutId = body.payout_id ? requireUuid(body.payout_id, "payout_id") : null;
    const providerPayoutId = body.provider_payout_id ? String(body.provider_payout_id) : null;
    if (!payoutId && !providerPayoutId) throw new Error("payout_id or provider_payout_id is required");
    const admin = serviceClient();
    const update = {
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const query = admin.from("payment_driver_payouts").update(update);
    const { data, error } = payoutId
      ? await query.eq("id", payoutId).select("id, zivosmedia_user_id").maybeSingle()
      : await query.eq("provider", "stripe").eq("provider_payout_id", providerPayoutId).select("id, zivosmedia_user_id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return json(ctx.corsHeaders, { error: "Payout not found" }, 404);

    await auditPaymentEvent(admin, {
      event_type: `driver_payout_${status}`,
      zivosmedia_user_id: data.zivosmedia_user_id,
      source_platform: "zivo_driver",
      payout_id: data.id,
      success: true,
      metadata: { provider_payout_id: providerPayoutId },
    });

    return json(ctx.corsHeaders, { ok: true, payout_id: data.id, status });
  } catch (error) {
    return json(ctx.corsHeaders, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function recordDriverTransferPayout(admin: any, input: {
  driverId: string;
  zivosmediaUserId: string;
  driverJobId: string;
  travelBookingId?: string | null;
  connectedAccountId: string;
  providerPayoutId: string;
  grossAmount: number;
  platformFee: number;
  driverEarning: number;
  currency: string;
}) {
  const { data: existing } = await admin
    .from("payment_driver_payouts")
    .select("id")
    .eq("provider", "stripe")
    .eq("provider_payout_id", input.providerPayoutId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin.from("payment_driver_payouts").insert({
    driver_id: input.driverId,
    zivosmedia_user_id: input.zivosmediaUserId,
    driver_job_id: input.driverJobId,
    travel_booking_id: input.travelBookingId ?? null,
    provider: "stripe",
    provider_connected_account_id: input.connectedAccountId,
    provider_payout_id: input.providerPayoutId,
    gross_amount: input.grossAmount,
    platform_fee: input.platformFee,
    driver_earning: input.driverEarning,
    currency: input.currency.toLowerCase(),
    status: "payout_pending",
    available_at: new Date().toISOString(),
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}
