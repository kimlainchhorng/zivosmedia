/**
 * service-booking-submit
 * ----------------------
 * Public auto-repair/service booking intake with server-side store, product,
 * contact, and schedule validation before writing service_bookings.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^((8|9|10|11):[03]0 AM|12:[03]0 PM|[1-5]:[03]0 PM)$/;

type Body = {
  store_id?: unknown;
  product_id?: unknown;
  service_name?: unknown;
  customer_name?: unknown;
  customer_email?: unknown;
  customer_phone?: unknown;
  vehicle_make?: unknown;
  vehicle_model?: unknown;
  vehicle_year?: unknown;
  preferred_date?: unknown;
  preferred_time?: unknown;
  notes?: unknown;
};

serve(withSecurity("service-booking-submit", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;

  const body = await req.json().catch(() => ({})) as Body;
  const storeId = cleanUuid(body.store_id);
  if (!storeId) return json({ error: "Invalid store id" }, 400);

  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id, is_active")
    .eq("id", storeId)
    .maybeSingle();
  if (storeError) {
    console.error("[service-booking-submit:store]", storeError.message);
    return json({ error: "Could not verify store" }, 500);
  }
  if (!store?.id || store.is_active === false) return json({ error: "Store is not available" }, 404);

  const booking = cleanBooking(body);
  if (!booking.ok) return json({ error: booking.error }, 400);

  if (booking.values.product_id) {
    const { data: product, error: productError } = await admin
      .from("store_products")
      .select("id, name, store_id")
      .eq("id", booking.values.product_id)
      .eq("store_id", storeId)
      .maybeSingle();
    if (productError) {
      console.error("[service-booking-submit:product]", productError.message);
      return json({ error: "Could not verify service" }, 500);
    }
    if (!product?.id) return json({ error: "Selected service is not available" }, 400);
  }

  const { data, error } = await admin
    .from("service_bookings")
    .insert({ ...booking.values, store_id: storeId, status: "pending" })
    .select("id, created_at")
    .single();
  if (error) {
    console.error("[service-booking-submit:insert]", error.message);
    return json({ error: "Could not submit booking" }, 500);
  }

  return json({ ok: true, booking: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanBooking(value: Body):
  | { ok: true; values: Record<string, string | null> }
  | { ok: false; error: string } {
  const serviceName = cleanText(value.service_name, 1, 180);
  if (!serviceName) return { ok: false, error: "Service name is required" };

  const customerName = cleanText(value.customer_name, 1, 200);
  if (!customerName) return { ok: false, error: "Customer name is required" };

  const customerEmail = cleanEmail(value.customer_email);
  if (!customerEmail) return { ok: false, error: "Valid customer email is required" };

  const customerPhone = cleanText(value.customer_phone, 7, 40);
  if (!customerPhone) return { ok: false, error: "Customer phone is required" };

  const preferredDate = cleanDate(value.preferred_date);
  if (!preferredDate) return { ok: false, error: "Preferred date is required" };

  const preferredTime = cleanTime(value.preferred_time);
  if (!preferredTime) return { ok: false, error: "Preferred time is required" };

  const productId = cleanOptionalUuid(value.product_id);
  if (value.product_id && !productId) return { ok: false, error: "Invalid service id" };

  const year = cleanNullableText(value.vehicle_year, 12);
  if (year && !/^\d{4}$/.test(year)) return { ok: false, error: "Invalid vehicle year" };

  return {
    ok: true,
    values: {
      product_id: productId,
      service_name: serviceName,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      vehicle_make: cleanNullableText(value.vehicle_make, 80),
      vehicle_model: cleanNullableText(value.vehicle_model, 80),
      vehicle_year: year,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      notes: cleanNullableText(value.notes, 2000),
    },
  };
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanOptionalUuid(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return cleanUuid(value);
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > maxLength ? null : text || null;
}

function cleanEmail(value: unknown): string | null {
  const email = cleanText(value, 3, 320)?.toLowerCase() ?? null;
  return email && EMAIL_RE.test(email) ? email : null;
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setUTCFullYear(max.getUTCFullYear() + 1);
  if (date < today || date > max) return null;
  return value;
}

function cleanTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = value.trim();
  return TIME_RE.test(time) ? time : null;
}
