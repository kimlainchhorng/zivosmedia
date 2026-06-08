// @ts-nocheck
import { createClient } from "./deps.ts";
import Stripe from "./stripe.ts";

export const STRIPE_API_VERSION = "2025-08-27.basil";

export const SOURCE_PLATFORMS = new Set([
  "zivosmedia",
  "zivo_travel",
  "zivo_driver",
  "zivo_software",
  "zivo_business",
  "zivo_chat",
  "zivo_admin",
]);

export function json(corsHeaders: Record<string, string>, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function serviceClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function stripeClient() {
  return new Stripe(env("STRIPE_SECRET_KEY"), { apiVersion: STRIPE_API_VERSION });
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Unauthorized" };
  }

  const userClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return { user: null, error: "Unauthorized" };
  return { user, error: null };
}

export function normalizeCurrency(value: unknown): string {
  const currency = String(value || "usd").trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) throw new Error("currency must be a three-letter ISO code");
  return currency;
}

export function parseAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer in the smallest currency unit");
  }
  return amount;
}

export function requireUuid(value: unknown, field: string): string {
  const text = String(value || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error(`${field} must be a UUID`);
  }
  return text;
}

export function sourcePlatform(value: unknown): string {
  const platform = String(value || "");
  if (!SOURCE_PLATFORMS.has(platform)) throw new Error("source_platform is not supported");
  return platform;
}

export function safeUrl(input: unknown, fallback: string): string {
  const value = String(input || "").trim();
  if (!value) return fallback;
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("URL must be http or https");
  if (url.protocol === "http:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("http URLs are allowed only for local development");
  }
  return url.toString();
}

export async function getOrCreatePaymentCustomer(
  admin: any,
  stripe: any,
  user: any,
  input: {
    business_id?: string | null;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    currency: string;
  },
): Promise<string> {
  const businessId = input.business_id ?? null;
  let query = admin
    .from("payment_customers")
    .select("id, provider_customer_id")
    .eq("provider", "stripe")
    .eq("zivosmedia_user_id", user.id)
    .limit(1);

  query = businessId ? query.eq("business_id", businessId) : query.is("business_id", null);
  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.provider_customer_id) return existing.provider_customer_id;

  const customer = await stripe.customers.create({
    email: input.email || user.email || undefined,
    name: input.name || undefined,
    phone: input.phone || undefined,
    metadata: {
      zivosmedia_user_id: user.id,
      ...(businessId ? { business_id: businessId } : {}),
    },
  });

  const { error: insertError } = await admin.from("payment_customers").insert({
    zivosmedia_user_id: user.id,
    business_id: businessId,
    provider: "stripe",
    provider_customer_id: customer.id,
    email: input.email || user.email || null,
    name: input.name || null,
    phone: input.phone || null,
    default_currency: input.currency,
  });
  if (insertError && insertError.code !== "23505") throw new Error(insertError.message);

  return customer.id;
}

export async function auditPaymentEvent(admin: any, data: Record<string, unknown>) {
  await admin.from("payment_audit_logs").insert({
    event_type: data.event_type,
    actor_user_id: data.actor_user_id ?? null,
    zivosmedia_user_id: data.zivosmedia_user_id ?? null,
    business_id: data.business_id ?? null,
    source_platform: data.source_platform ?? null,
    payment_id: data.payment_id ?? null,
    subscription_id: data.subscription_id ?? null,
    invoice_id: data.invoice_id ?? null,
    refund_id: data.refund_id ?? null,
    payout_id: data.payout_id ?? null,
    success: data.success ?? true,
    error_message: data.error_message ?? null,
    ip_address: data.ip_address ?? null,
    user_agent: data.user_agent ?? null,
    metadata: data.metadata ?? {},
  });
}
