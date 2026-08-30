/**
 * car-rental-review-submit
 * ------------------------
 * Public, reservation-linked car-rental review submission.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVIEWABLE_STATUSES = new Set(["completed", "delivered", "returned", "closed"]);

type Body = {
  reservation_id?: unknown;
  rating?: unknown;
  cleanliness?: unknown;
  service?: unknown;
  value?: unknown;
  comment?: unknown;
};

serve(withSecurity("car-rental-review-submit", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;

  const body = await req.json().catch(() => ({})) as Body;
  const reservationId = cleanUuid(body.reservation_id);
  if (!reservationId) return json({ error: "Invalid reservation id" }, 400);

  const { data: reservation, error: reservationError } = await admin
    .from("car_rental_reservations")
    .select("id, store_id, customer_id, vehicle_id, customer_name, vehicle_label, status")
    .eq("id", reservationId)
    .maybeSingle();
  if (reservationError) {
    console.error("[car-rental-review-submit:reservation]", reservationError.message);
    return json({ error: "Could not verify reservation" }, 500);
  }
  if (!reservation) return json({ error: "Reservation not found" }, 404);
  if (!REVIEWABLE_STATUSES.has(String(reservation.status ?? "").toLowerCase())) {
    return json({ error: "Reservation is not ready for review" }, 409);
  }

  const { count, error: existingError } = await admin
    .from("car_rental_reviews")
    .select("id", { count: "exact", head: true })
    .eq("reservation_id", reservationId);
  if (existingError) {
    console.error("[car-rental-review-submit:existing]", existingError.message);
    return json({ error: "Could not verify existing review" }, 500);
  }
  if ((count ?? 0) > 0) return json({ error: "Review already submitted" }, 409);

  const rating = cleanRating(body.rating);
  if (rating === null) return json({ error: "Rating is required" }, 400);

  const payload = {
    store_id: reservation.store_id,
    reservation_id: reservation.id,
    customer_id: reservation.customer_id,
    vehicle_id: reservation.vehicle_id,
    customer_name: cleanText(reservation.customer_name, 1, 160) ?? "Customer",
    vehicle_label: cleanText(reservation.vehicle_label, 0, 160),
    rating,
    cleanliness: cleanNullableRating(body.cleanliness),
    service: cleanNullableRating(body.service),
    value: cleanNullableRating(body.value),
    comment: cleanText(body.comment, 0, 2000),
    // Unpublished until the owner shows it. This route is deliberately public
    // (/car-rental-review/:reservationId, no ProtectedRoute) so the only
    // credential is the reservation UUID — and the row carries the real
    // customer's name copied off the reservation. Publishing straight to the
    // storefront on that basis let anyone holding a reservation id post under
    // that customer's name, and the "Review already submitted" check then
    // locked the genuine customer out of ever replacing it.
    // This matches every sibling: car-dealership-review-submit writes
    // is_visible:false, and car-rental-review-manage's own create path already
    // inserts is_published:false. The owner publishes from
    // CarRentalReviewsSection's Show button (action "set_published").
    is_published: false,
    is_acknowledged: false,
  };

  const { data, error } = await admin
    .from("car_rental_reviews")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("[car-rental-review-submit:insert]", error.message);
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
  if (value === null || value === "" || value === undefined || value === 0) return null;
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
