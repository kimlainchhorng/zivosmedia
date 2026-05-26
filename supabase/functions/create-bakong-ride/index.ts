import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const BAKONG_API = "https://api-bakong.nbc.gov.kh/v1";
const USD_TO_KHR = 4062.5;
const DEFAULT_STATIC_KHQR =
  "00020101021130510016abaakhppxxx@abaa01151260319063643400208ABA Bank5204421553031165802KH5915CHHORNG KIMLAIN6010PHNOM PENH624168370010PAYWAY@ABA0106941478020903218711963040E41";
const STATIC_MERCHANT_KHQR =
  Deno.env.get("KHQR_STATIC_MERCHANT_QR")?.trim() ||
  Deno.env.get("VITE_KHQR_STATIC_MERCHANT_QR")?.trim() ||
  DEFAULT_STATIC_KHQR;
const MERCHANT_FIELD_TAGS = ["29", "30", "31", "52", "58", "59", "60"];
const MAX_KHQR_AGE_SECONDS = 10 * 60;
const MAX_KHQR_FUTURE_SKEW_SECONDS = 30;

type TlvEntry = [tag: string, value: string];
type VerifyChannel = "Bakong" | "Telegram";

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function md5Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function stripCrc(qr: string): string {
  return qr.replace(/6304[0-9A-Fa-f]{4}$/, "");
}

function parseTlvEntries(s: string): TlvEntry[] {
  const out: TlvEntry[] = [];
  let i = 0;
  while (i <= s.length - 4) {
    const tag = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!Number.isFinite(len)) break;
    const value = s.slice(i + 4, i + 4 + len);
    if (value.length !== len) break;
    out.push([tag, value]);
    i += 4 + len;
  }
  return out;
}

function parseTlv(s: string): Record<string, string> {
  return Object.fromEntries(parseTlvEntries(s));
}

function readQrReference(fields: Record<string, string>): string | null {
  const additionalData = fields["62"];
  if (!additionalData) return null;
  return parseTlv(additionalData)["01"] ?? null;
}

function validateKhqrPayload(qr: string, reference: string, amountKhr: number): string | null {
  if (!qr || typeof qr !== "string") return "Missing KHQR";
  const fields = parseTlv(stripCrc(qr));
  const merchantFields = parseTlv(stripCrc(STATIC_MERCHANT_KHQR));

  for (const tag of MERCHANT_FIELD_TAGS) {
    if (merchantFields[tag] && fields[tag] !== merchantFields[tag]) {
      return "KHQR merchant account does not match ZIVO merchant";
    }
  }

  if (fields["53"] !== "116") return "KHQR must use KHR currency";

  const qrAmount = Number(fields["54"]);
  if (!Number.isFinite(qrAmount) || Math.round(qrAmount) !== amountKhr) {
    return "KHQR amount does not match the ride total";
  }

  const qrReference = readQrReference(fields);
  if (!qrReference || qrReference !== reference) {
    return "KHQR reference does not match the ride reference";
  }

  return null;
}

function validateReference(reference: string): string | null {
  if (!/^[A-Za-z0-9_-]{8,25}$/.test(reference)) {
    return "Invalid payment reference";
  }
  return null;
}

function validateSinceSec(sinceSec: number): string | null {
  if (!Number.isFinite(sinceSec) || sinceSec <= 0) {
    return "Payment timestamp is required";
  }
  const now = Math.floor(Date.now() / 1000);
  if (sinceSec > now + MAX_KHQR_FUTURE_SKEW_SECONDS) {
    return "Payment timestamp is in the future";
  }
  if (now - sinceSec > MAX_KHQR_AGE_SECONDS) {
    return "Payment QR has expired. Please generate a new KHQR.";
  }
  return null;
}

function amountMatches(text: string, amount: number): boolean {
  const target = Number(amount);
  if (!isFinite(target) || target <= 0) return false;
  const rounded = Math.round(target);
  const variants = new Set<string>([
    target.toFixed(2),
    target.toFixed(1),
    String(target),
    String(rounded),
    rounded.toLocaleString("en-US"),
  ]);
  const haystacks = [text, text.replace(/,/g, "")];
  for (const v of variants) {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[^0-9])${escaped}(?:[^0-9]|$)`);
    if (haystacks.some((haystack) => re.test(haystack))) return true;
  }
  return false;
}

function pickTelegramText(update: any): { text: string; chatId: string | null; date: number } | null {
  const msg = update.message ?? update.channel_post ?? update.edited_message ?? update.edited_channel_post;
  if (!msg) return null;
  const text = String(msg.text ?? msg.caption ?? "").trim();
  if (!text) return null;
  return {
    text,
    chatId: msg.chat?.id != null ? String(msg.chat.id) : null,
    date: Number(msg.date ?? 0),
  };
}

async function verifyWithBakong(qr: string): Promise<boolean> {
  const token = Deno.env.get("BAKONG_TOKEN");
  if (!token) return false;

  const md5 = await md5Hex(qr);
  const resp = await fetch(`${BAKONG_API}/check_transaction_by_md5`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ md5 }),
  });
  const data = await resp.json().catch(() => ({}));
  return data?.responseCode === 0;
}

async function verifyWithTelegram(reference: string, amountKhr: number, sinceSec = 0): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) return false;
  const chatIdFilter = Deno.env.get("TELEGRAM_CHAT_ID") ?? null;

  const resp = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeout: 0,
      allowed_updates: ["message", "channel_post", "edited_message", "edited_channel_post"],
    }),
  });
  const telegram = await resp.json().catch(() => ({}));
  if (!resp.ok || !telegram?.ok || !Array.isArray(telegram.result)) return false;

  const refLower = reference.toLowerCase();
  return telegram.result.some((update: any) => {
    const picked = pickTelegramText(update);
    if (!picked) return false;
    if (sinceSec && picked.date && picked.date < sinceSec) return false;
    if (chatIdFilter && picked.chatId && picked.chatId !== chatIdFilter) return false;
    return picked.text.toLowerCase().includes(refLower) && amountMatches(picked.text, amountKhr);
  });
}

async function verifyPayment(qr: string, reference: string, amountKhr: number, sinceSec = 0): Promise<VerifyChannel | null> {
  const [bakong, telegram] = await Promise.allSettled([
    verifyWithBakong(qr),
    verifyWithTelegram(reference, amountKhr, sinceSec),
  ]);

  if (bakong.status === "fulfilled" && bakong.value) return "Bakong";
  if (telegram.status === "fulfilled" && telegram.value) return "Telegram";
  return null;
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return asNumber(value);
}

Deno.serve(withSecurity("create-bakong-ride", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { ...corsHeaders, "Allow": "POST, OPTIONS" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const user = userData.user;
  const rl = await rateLimitDb(user.id, "payment");
  if (!rl.allowed) {
    return json(
      { error: "Too many requests. Please try again shortly." },
      429,
      { ...corsHeaders, ...rateLimitHeaders(rl, "payment") },
    );
  }

  const body = await req.json().catch(() => ({}));
  const pickup = body.pickup ?? {};
  const dropoff = body.dropoff ?? {};
  const reference = String(body.reference ?? "").trim();
  const qr = String(body.qr ?? "").trim();
  const amountKhr = Math.round(Number(body.amount_khr));
  const quotedTotal = asNumber(body.quoted_total);
  const expectedKhr = quotedTotal == null ? null : Math.round(quotedTotal * USD_TO_KHR);
  const sinceSec = Number(body.since_sec ?? body.sinceSec ?? 0);

  if (!pickup.address || !dropoff.address || !reference || !qr || !Number.isFinite(amountKhr) || amountKhr <= 0 || quotedTotal == null || quotedTotal <= 0) {
    return json({ error: "Invalid ride or payment payload" }, 400, corsHeaders);
  }

  const referenceError = validateReference(reference);
  if (referenceError) return json({ error: referenceError }, 400, corsHeaders);

  const sinceError = validateSinceSec(sinceSec);
  if (sinceError) return json({ error: sinceError }, 400, corsHeaders);

  if (expectedKhr != null && Math.abs(expectedKhr - amountKhr) > 2) {
    return json({ error: "Payment amount does not match ride total" }, 400, corsHeaders);
  }

  const qrError = validateKhqrPayload(qr, reference, amountKhr);
  if (qrError) return json({ error: qrError }, 400, corsHeaders);

  if (!Deno.env.get("BAKONG_TOKEN") && !Deno.env.get("TELEGRAM_BOT_TOKEN")) {
    return json({ error: "Bakong payment verification is not configured" }, 500, corsHeaders);
  }

  const verifiedBy = await verifyPayment(qr, reference, amountKhr, sinceSec);
  if (!verifiedBy) {
    return json({ ok: false, paid: false, error: "Payment not verified" }, 402, corsHeaders);
  }

  const baseNotes = Array.isArray(body.notes) ? body.notes.filter(Boolean).map(String) : [];
  const scheduledAt = body.scheduled_at ? String(body.scheduled_at) : null;
  const notes = [
    ...baseNotes,
    `Payment: Bakong KHQR (${reference}, ${amountKhr.toLocaleString("en-US")} KHR, verified by ${verifiedBy})`,
  ].join(" | ");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingRide, error: existingRideError } = await admin
    .from("ride_requests")
    .select("id, user_id, bakong_reference, bakong_amount_khr, bakong_verified_by")
    .eq("bakong_reference", reference)
    .maybeSingle();

  if (existingRideError) {
    console.error("[create-bakong-ride] existing lookup failed", existingRideError);
    return json({ error: "Failed to check payment reference" }, 500, corsHeaders);
  }

  if (existingRide) {
    if (existingRide.user_id !== user.id) {
      return json({ error: "Payment reference already used" }, 409, corsHeaders);
    }

    return json({
      ok: true,
      paid: true,
      idempotent: true,
      ride_request_id: existingRide.id,
      verified_by: existingRide.bakong_verified_by ?? verifiedBy,
      amount_khr: existingRide.bakong_amount_khr ?? amountKhr,
      reference,
    }, 200, corsHeaders);
  }

  const insertPayload = {
    user_id: user.id,
    pickup_address: String(pickup.address),
    pickup_lat: asOptionalNumber(pickup.lat),
    pickup_lng: asOptionalNumber(pickup.lng),
    dropoff_address: String(dropoff.address),
    dropoff_lat: asOptionalNumber(dropoff.lat),
    dropoff_lng: asOptionalNumber(dropoff.lng),
    ride_type: String(body.ride_type || "moto"),
    quoted_total: quotedTotal,
    distance_miles: asOptionalNumber(body.distance_miles),
    duration_minutes: asOptionalNumber(body.duration_minutes),
    scheduled_at: scheduledAt,
    status: scheduledAt ? "scheduled" : "searching",
    payment_status: "bakong_paid",
    payment_amount: amountKhr,
    payment_currency: "KHR",
    bakong_reference: reference,
    bakong_amount_khr: amountKhr,
    bakong_verified_by: verifiedBy,
    bakong_verified_at: new Date().toISOString(),
    customer_name: String(body.customer_name || user.user_metadata?.full_name || ""),
    customer_phone: String(body.customer_phone || user.user_metadata?.phone || ""),
    requires_car_seat: Boolean(body.requires_car_seat),
    car_seat_type: body.car_seat_type ? String(body.car_seat_type) : null,
    price_before_discount: asOptionalNumber(body.price_before_discount),
    promo_code: body.promo_code ? String(body.promo_code) : null,
    promo_discount: asOptionalNumber(body.promo_discount),
    notes,
  };

  const { data: ride, error: rideError } = await admin
    .from("ride_requests")
    .insert(insertPayload)
    .select("id")
    .single();

  if (rideError || !ride) {
    if ((rideError as any)?.code === "23505") {
      const { data: duplicateRide } = await admin
        .from("ride_requests")
        .select("id, user_id, bakong_amount_khr, bakong_verified_by")
        .eq("bakong_reference", reference)
        .maybeSingle();

      if (duplicateRide?.user_id === user.id) {
        return json({
          ok: true,
          paid: true,
          idempotent: true,
          ride_request_id: duplicateRide.id,
          verified_by: duplicateRide.bakong_verified_by ?? verifiedBy,
          amount_khr: duplicateRide.bakong_amount_khr ?? amountKhr,
          reference,
        }, 200, corsHeaders);
      }

      return json({ error: "Payment reference already used" }, 409, corsHeaders);
    }

    console.error("[create-bakong-ride] insert failed", rideError);
    return json({ error: "Failed to create ride" }, 500, corsHeaders);
  }

  return json({
    ok: true,
    paid: true,
    ride_request_id: ride.id,
    verified_by: verifiedBy,
    amount_khr: amountKhr,
    reference,
  }, 200, corsHeaders);
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
