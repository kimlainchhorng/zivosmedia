/**
 * salon-booking-submit
 * --------------------
 * Public salon booking intake with server-side store, service, stylist,
 * contact, schedule, and attribution validation before writing salon_bookings.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  store_id?: unknown;
  client_id?: unknown;
  stylist_id?: unknown;
  service_id?: unknown;
  service_name?: unknown;
  stylist_name?: unknown;
  client_name?: unknown;
  client_phone?: unknown;
  client_email?: unknown;
  price_cents?: unknown;
  duration_minutes?: unknown;
  start_at?: unknown;
  end_at?: unknown;
  status?: unknown;
  source?: unknown;
  client_notes?: unknown;
  sms_opt_in?: unknown;
  email_opt_in?: unknown;
  marketing_opt_in?: unknown;
  created_by_user_id?: unknown;
  no_show_fee_consent_at?: unknown;
};

serve(withSecurity("salon-booking-submit", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;

  const body = await req.json().catch(() => ({})) as Body;
  const storeId = cleanUuid(body.store_id);
  const serviceId = cleanUuid(body.service_id);
  if (!storeId) return json({ error: "Invalid store id" }, 400);
  if (!serviceId) return json({ error: "Invalid service id" }, 400);

  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id, is_active")
    .eq("id", storeId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-booking-submit:store]", storeError.message);
    return json({ error: "Could not verify store" }, 500);
  }
  if (!store?.id || store.is_active === false) return json({ error: "Store is not available" }, 404);

  const { data: service, error: serviceError } = await admin
    .from("salon_services")
    .select("id, store_id, name, price_cents, duration_minutes, is_active")
    .eq("id", serviceId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (serviceError) {
    console.error("[salon-booking-submit:service]", serviceError.message);
    return json({ error: "Could not verify service" }, 500);
  }
  if (!service?.id || service.is_active === false) return json({ error: "Selected service is not available" }, 400);

  const stylistId = cleanOptionalUuid(body.stylist_id);
  if (body.stylist_id && !stylistId) return json({ error: "Invalid stylist id" }, 400);

  let stylist: { id: string; display_name: string | null } | null = null;
  if (stylistId) {
    const { data, error } = await admin
      .from("salon_stylists")
      .select("id, store_id, display_name, is_active")
      .eq("id", stylistId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) {
      console.error("[salon-booking-submit:stylist]", error.message);
      return json({ error: "Could not verify stylist" }, 500);
    }
    if (!data?.id || data.is_active === false) return json({ error: "Selected stylist is not available" }, 400);
    stylist = { id: data.id, display_name: data.display_name ?? null };
  }

  const booking = cleanBooking(body, {
    serviceName: service.name,
    priceCents: service.price_cents,
    durationMinutes: service.duration_minutes,
    stylistName: stylist?.display_name ?? null,
  });
  if (!booking.ok) return json({ error: booking.error }, 400);

  const createdByUserId = await resolveUserId(req, supabaseUrl, anonKey);
  const { data, error } = await admin
    .from("salon_bookings")
    .insert({
      ...booking.values,
      store_id: storeId,
      service_id: serviceId,
      stylist_id: stylist?.id ?? null,
      created_by_user_id: createdByUserId,
    })
    .select("id, start_at, deposit_cents")
    .single();
  if (error) {
    console.error("[salon-booking-submit:insert]", error.message);
    if (error.code === "23P01") {
      return json({ error: error.message, code: "slot_conflict" }, 409);
    }
    return json({ error: "Could not submit booking" }, 500);
  }

  return json({ ok: true, booking: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanBooking(
  value: Body,
  service: { serviceName: string; priceCents: number; durationMinutes: number; stylistName: string | null },
): { ok: true; values: Record<string, string | number | boolean | null> } | { ok: false; error: string } {
  const clientName = cleanText(value.client_name, 1, 200);
  if (!clientName) return { ok: false, error: "Customer name is required" };

  const clientPhone = cleanNullableText(value.client_phone, 40);
  const clientEmail = cleanNullableEmail(value.client_email);
  if (!clientPhone && !clientEmail) return { ok: false, error: "Phone or email is required" };
  if (value.client_email && !clientEmail) return { ok: false, error: "Valid email is required" };

  const startAt = cleanFutureIso(value.start_at);
  if (!startAt) return { ok: false, error: "Invalid appointment start time" };

  const endAt = new Date(new Date(startAt).getTime() + service.durationMinutes * 60 * 1000).toISOString();
  const consentAt = cleanNullableIso(value.no_show_fee_consent_at);
  if (value.no_show_fee_consent_at && !consentAt) return { ok: false, error: "Invalid no-show consent timestamp" };

  return {
    ok: true,
    values: {
      client_id: null,
      service_name: service.serviceName,
      stylist_name: service.stylistName,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      price_cents: service.priceCents,
      duration_minutes: service.durationMinutes,
      start_at: startAt,
      end_at: endAt,
      status: "pending",
      source: "app",
      client_notes: cleanNullableText(value.client_notes, 2000),
      sms_opt_in: cleanBoolean(value.sms_opt_in, true),
      email_opt_in: cleanBoolean(value.email_opt_in, true),
      marketing_opt_in: cleanBoolean(value.marketing_opt_in, false),
      no_show_fee_consent_at: consentAt,
    },
  };
}

async function resolveUserId(req: Request, supabaseUrl: string, anonKey: string): Promise<string | null> {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  }) as any;
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id;
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

function cleanNullableEmail(value: unknown): string | null {
  const email = cleanNullableText(value, 320)?.toLowerCase() ?? null;
  return email && EMAIL_RE.test(email) ? email : null;
}

function cleanFutureIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = Date.now();
  const max = new Date();
  max.setUTCFullYear(max.getUTCFullYear() + 1);
  if (date.getTime() < now - 60 * 1000 || date.getTime() > max.getTime()) return null;
  return date.toISOString();
}

function cleanNullableIso(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
