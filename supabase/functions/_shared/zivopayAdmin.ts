// @ts-nocheck
import {
  auditPaymentEvent,
  json,
  requireUser,
  requireUuid,
  serviceClient,
  stripeClient,
} from "./zivopay.ts";

export async function requirePaymentAdmin(req: Request, cors: Record<string, string>) {
  const { user, error } = await requireUser(req);
  if (error || !user) return { response: json(cors, { error: "Unauthorized" }, 401), user: null, admin: null };
  const admin = serviceClient();
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
  if (!isAdmin) return { response: json(cors, { error: "admin role required" }, 403), user: null, admin: null };
  return { response: null, user, admin };
}

function paging(req: Request) {
  const url = new URL(req.url);
  return {
    limit: Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50))),
    sourcePlatform: url.searchParams.get("source_platform"),
    status: url.searchParams.get("status"),
    userId: url.searchParams.get("zivosmedia_user_id"),
    businessId: url.searchParams.get("business_id"),
  };
}

function applyCommonFilters(query: any, filters: any) {
  if (filters.sourcePlatform) query = query.eq("source_platform", filters.sourcePlatform);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.userId) query = query.eq("zivosmedia_user_id", filters.userId);
  if (filters.businessId) query = query.eq("business_id", filters.businessId);
  return query;
}

export async function adminListPayments(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const gate = await requirePaymentAdmin(req, cors);
  if (gate.response) return gate.response;
  const filters = paging(req);
  let query = gate.admin
    .from("payment_orders")
    .select("*, payment_transactions(*)")
    .order("created_at", { ascending: false })
    .limit(filters.limit);
  query = applyCommonFilters(query, filters);
  const { data, error } = await query;
  if (error) return json(cors, { error: error.message }, 400);
  return json(cors, { payments: data ?? [] });
}

export async function adminPaymentDetail(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const gate = await requirePaymentAdmin(req, cors);
  if (gate.response) return gate.response;
  const id = requireUuid(new URL(req.url).searchParams.get("id"), "id");
  const { data: order, error } = await gate.admin
    .from("payment_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return json(cors, { error: error.message }, 400);
  if (!order) return json(cors, { error: "Payment not found" }, 404);

  const { data: transactions, error: txError } = await gate.admin
    .from("payment_transactions")
    .select("*")
    .eq("payment_order_id", order.id)
    .order("created_at", { ascending: false });
  if (txError) return json(cors, { error: txError.message }, 400);

  const transactionIds = (transactions ?? []).map((tx: any) => tx.id);
  let refunds: any[] = [];
  if (transactionIds.length > 0) {
    const { data: refundRows, error: refundError } = await gate.admin
      .from("payment_refunds")
      .select("*")
      .in("payment_transaction_id", transactionIds)
      .order("created_at", { ascending: false });
    if (refundError) return json(cors, { error: refundError.message }, 400);
    refunds = refundRows ?? [];
  }

  const [auditResult, webhookResult] = await Promise.all([
    gate.admin
      .from("payment_audit_logs")
      .select("*")
      .eq("payment_id", order.id)
      .order("created_at", { ascending: false })
      .limit(100),
    gate.admin
      .from("payment_webhook_events")
      .select("*")
      .eq("related_payment_id", order.id)
      .order("received_at", { ascending: false })
      .limit(100),
  ]);
  if (auditResult.error) return json(cors, { error: auditResult.error.message }, 400);
  if (webhookResult.error) return json(cors, { error: webhookResult.error.message }, 400);

  return json(cors, {
    payment: {
      ...order,
      payment_transactions: transactions ?? [],
      payment_refunds: refunds,
      payment_audit_logs: auditResult.data ?? [],
      payment_webhook_events: webhookResult.data ?? [],
    },
  });
}

export async function adminListTable(req: Request, ctx: any, table: string, key: string) {
  const cors = ctx.corsHeaders;
  const gate = await requirePaymentAdmin(req, cors);
  if (gate.response) return gate.response;
  const filters = paging(req);
  let query = gate.admin.from(table).select("*").order("created_at", { ascending: false }).limit(filters.limit);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.userId && table === "payment_refunds") {
    const { data: txRows, error: txError } = await gate.admin
      .from("payment_transactions")
      .select("id")
      .eq("zivosmedia_user_id", filters.userId)
      .limit(1000);
    if (txError) return json(cors, { error: txError.message }, 400);
    const txIds = (txRows ?? []).map((row: any) => row.id);
    if (txIds.length === 0) return json(cors, { [key]: [] });
    query = query.in("payment_transaction_id", txIds);
  } else if (filters.userId) {
    query = query.eq("zivosmedia_user_id", filters.userId);
  }
  if (filters.businessId && ["payment_subscriptions", "payment_invoices"].includes(table)) query = query.eq("business_id", filters.businessId);
  const { data, error } = await query;
  if (error) return json(cors, { error: error.message }, 400);
  return json(cors, { [key]: data ?? [] });
}

export async function adminListWebhooks(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const gate = await requirePaymentAdmin(req, cors);
  if (gate.response) return gate.response;
  const filters = paging(req);
  let query = gate.admin
    .from("payment_webhook_events")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(filters.limit);
  const url = new URL(req.url);
  const processed = url.searchParams.get("processed");
  if (processed === "true") query = query.eq("processed", true);
  if (processed === "false") query = query.eq("processed", false);
  if (filters.sourcePlatform) query = query.eq("source_platform", filters.sourcePlatform);
  const { data, error } = await query;
  if (error) return json(cors, { error: error.message }, 400);
  return json(cors, { webhook_events: data ?? [] });
}

export async function adminListAuditLogs(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const gate = await requirePaymentAdmin(req, cors);
  if (gate.response) return gate.response;
  const filters = paging(req);
  let query = gate.admin
    .from("payment_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit);
  if (filters.sourcePlatform) query = query.eq("source_platform", filters.sourcePlatform);
  if (filters.userId) query = query.eq("zivosmedia_user_id", filters.userId);
  if (filters.businessId) query = query.eq("business_id", filters.businessId);
  const { data, error } = await query;
  if (error) return json(cors, { error: error.message }, 400);
  return json(cors, { audit_logs: data ?? [] });
}

export async function adminRefundRequest(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const gate = await requirePaymentAdmin(req, cors);
  if (gate.response) return gate.response;
  try {
    const body = await req.json();
    const txId = requireUuid(body.payment_transaction_id, "payment_transaction_id");
    const { data: tx, error: txError } = await gate.admin
      .from("payment_transactions")
      .select("id, payment_order_id, amount, currency, zivosmedia_user_id")
      .eq("id", txId)
      .maybeSingle();
    if (txError) throw new Error(txError.message);
    if (!tx) return json(cors, { error: "Transaction not found" }, 404);
    const amount = Math.min(Number(body.amount || tx.amount), Number(tx.amount));
    if (!Number.isInteger(amount) || amount <= 0) throw new Error("amount must be a positive integer");
    const { data: refund, error } = await gate.admin.from("payment_refunds").insert({
      payment_transaction_id: tx.id,
      provider: "stripe",
      amount,
      currency: String(tx.currency || "usd").toLowerCase(),
      reason: body.reason ? String(body.reason).slice(0, 240) : null,
      status: "requested",
      requested_by: gate.user.id,
    }).select("*").single();
    if (error) throw new Error(error.message);
    await auditPaymentEvent(gate.admin, {
      event_type: "admin_refund_requested",
      actor_user_id: gate.user.id,
      zivosmedia_user_id: tx.zivosmedia_user_id,
      payment_id: tx.payment_order_id,
      refund_id: refund.id,
      source_platform: body.source_platform ?? null,
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      metadata: { amount, reason: body.reason ?? null },
    });
    return json(cors, { refund });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function adminRefundApprove(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const gate = await requirePaymentAdmin(req, cors);
  if (gate.response) return gate.response;
  try {
    const body = await req.json();
    const refundId = requireUuid(body.refund_id, "refund_id");
    const { data: refund, error: refundError } = await gate.admin
      .from("payment_refunds")
      .select("*, payment_transactions(id, payment_order_id, provider_payment_intent_id, amount, currency, zivosmedia_user_id)")
      .eq("id", refundId)
      .maybeSingle();
    if (refundError) throw new Error(refundError.message);
    if (!refund) return json(cors, { error: "Refund not found" }, 404);
    if (refund.provider_refund_id) return json(cors, { refund, idempotent: true });
    const tx = refund.payment_transactions;
    if (!tx?.provider_payment_intent_id) throw new Error("Transaction has no provider payment intent");
    const stripe = stripeClient();
    const providerRefund = await stripe.refunds.create({
      payment_intent: tx.provider_payment_intent_id,
      amount: refund.amount,
      reason: "requested_by_customer",
      metadata: { payment_refund_id: refund.id, payment_transaction_id: tx.id, admin_id: gate.user.id },
    }, { idempotencyKey: `zivopay-refund-${refund.id}` });
    const { data: updated, error } = await gate.admin.from("payment_refunds").update({
      provider_refund_id: providerRefund.id,
      status: providerRefund.status ?? "succeeded",
      approved_by: gate.user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", refund.id).select("*").single();
    if (error) throw new Error(error.message);
    const orderStatus = Number(refund.amount) >= Number(tx.amount) ? "refunded" : "partially_refunded";
    await gate.admin.from("payment_transactions").update({ status: orderStatus, updated_at: new Date().toISOString() }).eq("id", tx.id);
    await gate.admin.from("payment_orders").update({ status: orderStatus, updated_at: new Date().toISOString() }).eq("id", tx.payment_order_id);
    await auditPaymentEvent(gate.admin, {
      event_type: "admin_refund_approved",
      actor_user_id: gate.user.id,
      zivosmedia_user_id: tx.zivosmedia_user_id,
      payment_id: tx.payment_order_id,
      refund_id: refund.id,
      success: true,
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      metadata: { provider_refund_id: providerRefund.id, amount: refund.amount },
    });
    return json(cors, { refund: updated });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function adminPayoutStatus(req: Request, ctx: any, status: "held" | "eligible") {
  const cors = ctx.corsHeaders;
  const gate = await requirePaymentAdmin(req, cors);
  if (gate.response) return gate.response;
  try {
    const body = await req.json();
    const payoutId = requireUuid(body.payout_id, "payout_id");
    const { data, error } = await gate.admin.from("payment_driver_payouts").update({
      status,
      updated_at: new Date().toISOString(),
    }).eq("id", payoutId).select("*").single();
    if (error) throw new Error(error.message);
    await auditPaymentEvent(gate.admin, {
      event_type: status === "held" ? "admin_payout_held" : "admin_payout_released",
      actor_user_id: gate.user.id,
      zivosmedia_user_id: data.zivosmedia_user_id,
      source_platform: "zivo_admin",
      payout_id: data.id,
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      metadata: { reason: body.reason ?? null },
    });
    return json(cors, { payout: data });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}
