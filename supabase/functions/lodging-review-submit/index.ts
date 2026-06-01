/**
 * lodging-review-submit
 * ---------------------
 * Authenticated guest review submission for completed lodging stays.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const REVIEWABLE_STATUSES = new Set(["checked_out"]);

type Body = {
  store_id?: unknown;
  reservation_id?: unknown;
  guest_name?: unknown;
  rating?: unknown;
  title?: unknown;
  body?: unknown;
  cleanliness?: unknown;
  comfort?: unknown;
  location_score?: unknown;
  staff?: unknown;
  value?: unknown;
};

serve(withSecurity("lodging-review-submit", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const storeId = cleanUuid(body.store_id);
  const reservationId = cleanUuid(body.reservation_id);
  if (!storeId || !reservationId) return json({ error: "Invalid store or reservation id" }, 400);

  const { data: reservation, error: reservationError } = await admin
    .from("lodge_reservations")
    .select("id, store_id, guest_id, guest_name, status")
    .eq("id", reservationId)
    .maybeSingle();
  if (reservationError) {
    console.error("[lodging-review-submit:reservation]", reservationError.message);
    return json({ error: "Could not verify reservation" }, 500);
  }
  if (!reservation || reservation.store_id !== storeId) return json({ error: "Reservation not found" }, 404);
  if (reservation.guest_id && reservation.guest_id !== user.id) return json({ error: "Not authorized for this reservation" }, 403);
  if (!REVIEWABLE_STATUSES.has(String(reservation.status ?? "").toLowerCase())) {
    return json({ error: "Stay is not ready for review" }, 409);
  }

  const { count, error: existingError } = await admin
    .from("lodging_reviews")
    .select("id", { count: "exact", head: true })
    .eq("reservation_id", reservationId);
  if (existingError) {
    console.error("[lodging-review-submit:existing]", existingError.message);
    return json({ error: "Could not verify existing review" }, 500);
  }
  if ((count ?? 0) > 0) return json({ error: "Review already submitted" }, 409);

  const rating = cleanRating(body.rating);
  const reviewBody = cleanText(body.body, 1, 2000);
  if (rating === null) return json({ error: "Rating is required" }, 400);
  if (!reviewBody) return json({ error: "Review body is required" }, 400);

  const payload = {
    store_id: storeId,
    reservation_id: reservationId,
    guest_user_id: user.id,
    guest_name: cleanText(body.guest_name, 0, 160) ?? cleanText(reservation.guest_name, 0, 160) ?? "Guest",
    rating,
    title: cleanText(body.title, 0, 160),
    body: reviewBody,
    cleanliness: cleanNullableRating(body.cleanliness),
    comfort: cleanNullableRating(body.comfort),
    location_score: cleanNullableRating(body.location_score),
    staff: cleanNullableRating(body.staff),
    value: cleanNullableRating(body.value),
    source: "zivo_app",
    flagged: false,
  };

  const { data, error } = await admin
    .from("lodging_reviews")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("[lodging-review-submit:insert]", error.message);
    return json({ error: "Could not submit review" }, 500);
  }

  return json({ ok: true, review_id: data.id });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanRating(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null;
}

function cleanNullableRating(value: unknown): number | null {
  if (value === null || value === "" || value === undefined) return null;
  return cleanRating(value);
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}
