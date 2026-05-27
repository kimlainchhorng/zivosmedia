import { createClient, serve } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

declare const Deno: { env: { get(key: string): string | undefined } };

/* ───────── helpers ───────── */

type Rec = Record<string, unknown>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length ? v.trim() : null;

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : null; }
  return null;
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ───────── Meta CAPI sender ───────── */

interface MetaPayload {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: string;
  user_data: Rec;
  custom_data?: Rec;
}

async function sendToMeta(
  pixelId: string,
  accessToken: string,
  testCode: string | undefined,
  events: MetaPayload[],
): Promise<{ ok: boolean; status: number; body: Rec }> {
  const payload: Rec = { data: events, access_token: accessToken };
  if (testCode) payload.test_event_code = testCode;

  const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/* ───────── user data builder ───────── */

async function buildUserData(
  supabase: ReturnType<typeof createClient>,
  record: Rec,
): Promise<Rec> {
  const userId =
    str(record.user_id) ?? str(record.customer_id) ??
    str(record.rider_id) ?? str(record.buyer_id);

  const ud: Rec = {};

  // Try to get email/phone from profile
  let email = str(record.email) ?? str(record.customer_email);
  let phone = str(record.phone) ?? str(record.customer_phone);

  if (userId && (!email || !phone)) {
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("email, phone")
      .eq("user_id", userId)
      .maybeSingle();
    if (!email && profile?.email) email = profile.email;
    if (!phone && profile?.phone) phone = profile.phone;
  }

  if (email) ud.em = [await sha256(email)];
  if (phone) ud.ph = [await sha256(phone)];

  // IP / UA from metadata
  const meta = (record.metadata && typeof record.metadata === "object") ? record.metadata as Rec : {};
  const ip = str(record.client_ip_address) ?? str(meta.client_ip_address as string);
  const ua = str(record.client_user_agent) ?? str(meta.client_user_agent as string);
  if (ip) ud.client_ip_address = ip;
  if (ua) ud.client_user_agent = ua;

  return ud;
}

/* ───────── Purchase event builders per table ───────── */

async function buildPurchaseEvent(
  supabase: any,
  table: string,
  record: Rec,
): Promise<MetaPayload | null> {
  const userData = await buildUserData(supabase, record);
  const eventId = str(record.id) ?? crypto.randomUUID();

  let value: number | null = null;
  let currency = "USD";
  let contentName = "";
  let contentCategory = "";

  switch (table) {
    case "trips": {
      value = num(record.fare_amount);
      const meta = (record.metadata && typeof record.metadata === "object") ? record.metadata as Rec : {};
      currency = (str(meta.currency as string) ?? str(record.currency as string) ?? "USD").toUpperCase();
      contentName = str(record.dropoff_address) ?? "Ride booking";
      contentCategory = "Travel";
      break;
    }
    case "food_orders": {
      value = num(record.total_amount);
      currency = (str(record.currency as string) ?? "USD").toUpperCase();
      // Try to resolve restaurant name
      if (record.restaurant_id) {
        const { data: r } = await (supabase as any)
          .from("restaurants").select("name")
          .eq("id", String(record.restaurant_id)).maybeSingle();
        contentName = r?.name ?? "Food order";
      } else {
        contentName = "Food order";
      }
      contentCategory = "Food & Beverage";
      break;
    }
    case "flight_bookings": {
      value = num(record.total_amount);
      currency = (str(record.currency as string) ?? "USD").toUpperCase();
      if (record.flight_id) {
        const { data: f } = await (supabase as any)
          .from("flights").select("departure_city, arrival_city")
          .eq("id", String(record.flight_id)).maybeSingle();
        contentName = (f?.departure_city && f?.arrival_city)
          ? `${f.departure_city} → ${f.arrival_city}` : "Flight booking";
      } else {
        contentName = "Flight booking";
      }
      contentCategory = "Travel";
      break;
    }
    case "travel_bookings": {
      value = num(record.offer_price_amount);
      if (value === null && record.offer_id) {
        const { data: offer } = await (supabase as any)
          .from("travel_offers").select("price_amount, price_currency")
          .eq("id", String(record.offer_id)).maybeSingle();
        if (offer?.price_amount != null) value = num(offer.price_amount);
        if (offer?.price_currency) currency = String(offer.price_currency).toUpperCase();
      }
      currency = (str(record.offer_price_currency as string) ?? currency).toUpperCase();
      const svc = str(record.service_type as string)?.toLowerCase();
      contentName = svc === "flights" ? "Flight booking"
        : svc === "hotels" ? "Hotel booking"
        : svc === "cars" ? "Car rental" : "Travel booking";
      contentCategory = "Travel";
      break;
    }
    case "transactions": {
      value = num(record.amount);
      currency = (str(record.currency as string) ?? "USD").toUpperCase();
      contentName = str(record.description) ?? "ZIVO transaction";
      const meta = (record.metadata && typeof record.metadata === "object") ? record.metadata as Rec : {};
      const svcType = (str(meta.service_type as string) ?? "").toLowerCase();
      contentCategory = ["flight", "hotel", "travel", "ride", "car"].some(t => svcType.includes(t))
        ? "Travel"
        : ["food", "restaurant", "grocery"].some(t => svcType.includes(t))
        ? "Food & Beverage"
        : ["shopping", "store", "marketplace"].some(t => svcType.includes(t))
        ? "Retail" : "General";
      break;
    }
    default:
      return null;
  }

  if (value === null || value <= 0) return null;

  return {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: userData,
    custom_data: { value, currency, content_name: contentName, content_category: contentCategory },
  };
}

/* ───────── CompleteRegistration builder ───────── */

async function buildRegistrationEvent(record: Rec): Promise<MetaPayload | null> {
  const userId = str(record.user_id) ?? str(record.id);
  if (!userId) return null;

  const ud: Rec = {};
  const email = str(record.email);
  const phone = str(record.phone);
  if (email) ud.em = [await sha256(email)];
  if (phone) ud.ph = [await sha256(phone)];

  return {
    event_name: "CompleteRegistration",
    event_time: Math.floor(Date.now() / 1000),
    event_id: userId,
    action_source: "website",
    user_data: ud,
    custom_data: { content_name: "ZIVO Account", status: "confirmed" },
  };
}

/* ───────── Main handler ───────── */

const PURCHASE_TABLES = new Set([
  "trips", "food_orders", "flight_bookings", "travel_bookings", "transactions",
]);

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const pixelId = Deno.env.get("META_PIXEL_ID");
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    const testCode = Deno.env.get("META_TEST_EVENT_CODE") || undefined;

    if (!pixelId || !accessToken) {
      return new Response(
        JSON.stringify({ ok: false, error: "META_PIXEL_ID or META_ACCESS_TOKEN missing" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();

    // DB webhook payload shape: { type, table, schema, record, old_record }
    const table: string = (body.table ?? body.type ?? "").trim();
    const record: Rec = body.record ?? {};
    const operation: string = (body.type ?? body.operation ?? "").toUpperCase();

    if (!table || !record || typeof record !== "object") {
      return new Response(JSON.stringify({ ok: false, error: "Invalid payload" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    let event: MetaPayload | null = null;

    // ── Purchase path: completed orders ──
    if (PURCHASE_TABLES.has(table)) {
      const status = str(record.status)?.toLowerCase();
      if (status !== "completed" && status !== "delivered" && status !== "payment_confirmed") {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "status_not_completed" }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      event = await buildPurchaseEvent(supabase, table, record);
    }

    // ── Registration path: new profile row ──
    if (table === "profiles" && (operation === "INSERT")) {
      // Only fire if email_verified or if there's no such column
      const verified = record.email_verified;
      if (verified === false) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "email_not_verified" }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      event = await buildRegistrationEvent(record);
    }

    // Also handle profiles UPDATE where email_verified flips to true
    if (table === "profiles" && operation === "UPDATE") {
      const oldRecord: Rec = body.old_record ?? {};
      if (record.email_verified === true && oldRecord.email_verified !== true) {
        event = await buildRegistrationEvent(record);
      }
    }

    if (!event) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no_event_mapped" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const result = await sendToMeta(pixelId, accessToken, testCode, [event]);

    if (!result.ok) {
      console.error("[meta-conversion-bridge] Meta API error", { status: result.status, table, body: result.body });
      return new Response(
        JSON.stringify({ ok: false, status: result.status, table, meta: result.body }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    console.log("[meta-conversion-bridge] Sent", event.event_name, "for", table, "id:", event.event_id);

    return new Response(
      JSON.stringify({
        ok: true,
        event_name: event.event_name,
        event_id: event.event_id,
        table,
        meta: result.body,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[meta-conversion-bridge] Error", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
