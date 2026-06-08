// @ts-nocheck
import {
  auditPaymentEvent,
  json,
  requireUser,
  requireUuid,
  serviceClient,
  sourcePlatform,
} from "./zivopay.ts";
import { assertBusinessBillingAccess } from "./zivopayBusiness.ts";

const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const STATUSES = new Set(["open", "pending_customer", "pending_admin", "resolved", "closed"]);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function optionalUuid(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requireUuid(value, field);
}

function cleanEnum(value: unknown, allowed: Set<string>, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return allowed.has(text) ? text : fallback;
}

async function assertOwnedPaymentContext(admin: any, userId: string, body: any) {
  let source = body.source_platform ? sourcePlatform(body.source_platform) : "zivo_chat";
  const context = {
    payment_id: optionalUuid(body.payment_id, "payment_id"),
    invoice_id: optionalUuid(body.invoice_id, "invoice_id"),
    subscription_id: optionalUuid(body.subscription_id, "subscription_id"),
    travel_booking_id: optionalUuid(body.travel_booking_id, "travel_booking_id"),
    driver_job_id: optionalUuid(body.driver_job_id, "driver_job_id"),
    business_id: optionalUuid(body.business_id, "business_id"),
  };

  if (context.payment_id) {
    const { data, error } = await admin
      .from("payment_orders")
      .select("id,zivosmedia_user_id,source_platform,business_id,travel_booking_id,driver_job_id,software_product_id")
      .eq("id", context.payment_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.zivosmedia_user_id !== userId) throw new Error("Payment record not found");
    source = data.source_platform ?? source;
    context.business_id = context.business_id ?? data.business_id ?? null;
    context.travel_booking_id = context.travel_booking_id ?? data.travel_booking_id ?? null;
    context.driver_job_id = context.driver_job_id ?? data.driver_job_id ?? null;
  }

  if (context.invoice_id) {
    const { data, error } = await admin
      .from("payment_invoices")
      .select("id,zivosmedia_user_id,business_id,subscription_id")
      .eq("id", context.invoice_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.zivosmedia_user_id !== userId) throw new Error("Invoice record not found");
    context.business_id = context.business_id ?? data.business_id ?? null;
    context.subscription_id = context.subscription_id ?? data.subscription_id ?? null;
  }

  if (context.subscription_id) {
    const { data, error } = await admin
      .from("payment_subscriptions")
      .select("id,zivosmedia_user_id,business_id")
      .eq("id", context.subscription_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.zivosmedia_user_id !== userId) throw new Error("Subscription record not found");
    context.business_id = context.business_id ?? data.business_id ?? null;
    if (source === "zivo_chat") source = "zivo_software";
  }

  if (context.business_id) {
    await assertBusinessBillingAccess(admin, userId, context.business_id);
  }

  return { source_platform: source, ...context };
}

export async function createPaymentSupportThread(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") return json(cors, { error: "Method not allowed" }, 405);
  const { user, error } = await requireUser(req);
  if (error || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const subject = cleanText(body.subject, 180) ?? "Payment support request";
    const message = cleanText(body.message, 4000);
    if (!message) throw new Error("message is required");

    const admin = serviceClient();
    const paymentContext = await assertOwnedPaymentContext(admin, user.id, body);
    const priority = cleanEnum(body.priority, PRIORITIES, "normal");
    const status = cleanEnum(body.status, STATUSES, "open");
    const ticketNumber = `ZP-${Date.now().toString().slice(-6)}`;

    const ticketPayload = {
      ticket_number: ticketNumber,
      subject,
      message,
      source: "zivochat_payment_support",
      payment_context: paymentContext,
      submitted_at: new Date().toISOString(),
    };

    const { data: ticket, error: ticketError } = await admin
      .from("feedback_submissions")
      .insert({
        user_id: user.id,
        category: "support_ticket",
        subject,
        message: JSON.stringify(ticketPayload),
        device_info: cleanText(body.user_agent ?? ctx.userAgent, 240),
        status: "new",
      })
      .select("id")
      .single();
    if (ticketError) throw new Error(ticketError.message);

    const chatThreadId = optionalUuid(body.chat_thread_id, "chat_thread_id") ?? ticket.id;
    const { data: supportThread, error: threadError } = await admin
      .from("payment_support_threads")
      .insert({
        chat_thread_id: chatThreadId,
        zivosmedia_user_id: user.id,
        source_platform: paymentContext.source_platform,
        payment_id: paymentContext.payment_id,
        invoice_id: paymentContext.invoice_id,
        subscription_id: paymentContext.subscription_id,
        travel_booking_id: paymentContext.travel_booking_id,
        driver_job_id: paymentContext.driver_job_id,
        business_id: paymentContext.business_id,
        status,
        priority,
        metadata: {
          feedback_submission_id: ticket.id,
          ticket_number: ticketNumber,
          subject,
          message_preview: message.slice(0, 240),
        },
      })
      .select("*")
      .single();
    if (threadError) throw new Error(threadError.message);

    await auditPaymentEvent(admin, {
      event_type: "zivochat_payment_support_opened",
      actor_user_id: user.id,
      zivosmedia_user_id: user.id,
      business_id: paymentContext.business_id,
      source_platform: paymentContext.source_platform,
      payment_id: paymentContext.payment_id,
      subscription_id: paymentContext.subscription_id,
      invoice_id: paymentContext.invoice_id,
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      metadata: {
        support_thread_id: supportThread.id,
        chat_thread_id: chatThreadId,
        feedback_submission_id: ticket.id,
        ticket_number: ticketNumber,
      },
    });

    return json(cors, { support_thread: supportThread, ticket_number: ticketNumber });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function listPaymentSupportThreads(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error } = await requireUser(req);
  if (error || !user) return json(cors, { error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const admin = serviceClient();
  let query = admin
    .from("payment_support_threads")
    .select("*")
    .eq("zivosmedia_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  const status = url.searchParams.get("status");
  if (status && STATUSES.has(status)) query = query.eq("status", status);
  const { data, error: queryError } = await query;
  if (queryError) return json(cors, { error: queryError.message }, 400);
  return json(cors, { support_threads: data ?? [] });
}

export async function adminListPaymentSupportThreads(req: Request, ctx: any, gate: any) {
  const cors = ctx.corsHeaders;
  const filters = new URL(req.url).searchParams;
  const limit = Math.min(200, Math.max(1, Number(filters.get("limit") || 50)));
  let query = gate.admin
    .from("payment_support_threads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  const status = filters.get("status");
  const priority = filters.get("priority");
  const userId = filters.get("zivosmedia_user_id");
  const source = filters.get("source_platform");
  if (status && STATUSES.has(status)) query = query.eq("status", status);
  if (priority && PRIORITIES.has(priority)) query = query.eq("priority", priority);
  if (userId) query = query.eq("zivosmedia_user_id", requireUuid(userId, "zivosmedia_user_id"));
  if (source) query = query.eq("source_platform", sourcePlatform(source));
  const { data, error } = await query;
  if (error) return json(cors, { error: error.message }, 400);
  return json(cors, { support_threads: data ?? [] });
}

export async function adminUpdatePaymentSupportThread(req: Request, ctx: any, gate: any) {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") return json(cors, { error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const id = requireUuid(body.support_thread_id, "support_thread_id");
    const patch: Record<string, unknown> = {};
    if (body.status !== undefined) patch.status = cleanEnum(body.status, STATUSES, "");
    if (body.priority !== undefined) patch.priority = cleanEnum(body.priority, PRIORITIES, "");
    if (body.assigned_admin_id !== undefined) patch.assigned_admin_id = optionalUuid(body.assigned_admin_id, "assigned_admin_id");
    if (patch.status === "" || patch.priority === "") throw new Error("Invalid status or priority");
    if (Object.keys(patch).length === 0) throw new Error("No support thread changes provided");
    patch.updated_at = new Date().toISOString();

    const { data, error } = await gate.admin
      .from("payment_support_threads")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await auditPaymentEvent(gate.admin, {
      event_type: "admin_payment_support_updated",
      actor_user_id: gate.user.id,
      zivosmedia_user_id: data.zivosmedia_user_id,
      business_id: data.business_id,
      source_platform: data.source_platform,
      payment_id: data.payment_id,
      subscription_id: data.subscription_id,
      invoice_id: data.invoice_id,
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      metadata: { support_thread_id: data.id, changes: patch },
    });

    return json(cors, { support_thread: data });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}
