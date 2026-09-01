/**
 * car-rental-review-submit
 * ------------------------
 * Public, reservation-linked car-rental review submission.
 */
import { createClient, serve } from "../_shared/deps.ts";
import {
  authorizeCarRentalReservationAccess,
  cleanCarRentalReservationId,
} from "../_shared/carRentalReservationAccess.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type Body = {
  reservation_id?: unknown;
  access_token?: unknown;
  rating?: unknown;
  cleanliness?: unknown;
  service?: unknown;
  value?: unknown;
  comment?: unknown;
};

serve(
  withSecurity(
    "car-rental-review-submit",
    async (req, ctx) => {
      const corsHeaders = ctx.corsHeaders;
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!supabaseUrl || !anonKey || !serviceKey) {
        return json(
          { error: "Reservation access is temporarily unavailable" },
          500,
        );
      }

      const body = (await req.json().catch(() => ({}))) as Body;
      const reservationId = cleanCarRentalReservationId(body.reservation_id);
      if (!reservationId) return json({ error: "Invalid reservation id" }, 400);

      const rating = cleanRating(body.rating);
      if (rating === null) return json({ error: "Rating is required" }, 400);

      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      }) as any;
      const authorized = await authorizeCarRentalReservationAccess({
        admin,
        req,
        supabaseUrl,
        anonKey,
        reservationId,
        accessToken: body.access_token,
        scope: "review",
      });
      if (!authorized) {
        return json({ error: "Invalid or expired review access" }, 403);
      }

      // The service-only RPC repeats the exact access decision after taking the
      // customer and reservation locks, then inserts authoritative reservation
      // identity and the review in that same database transaction.
      const { data: reviewId, error } = await admin.rpc(
        "car_rental_submit_review",
        {
          p_reservation_id: reservationId,
          p_access_token: authorized.accessToken,
          p_user_id: authorized.userId,
          p_rating: rating,
          p_cleanliness: cleanNullableRating(body.cleanliness),
          p_service: cleanNullableRating(body.service),
          p_value: cleanNullableRating(body.value),
          p_comment: cleanText(body.comment, 0, 2000),
        },
      );
      if (error) {
        if (error.code === "23505") {
          return json({ error: "Review already submitted" }, 409);
        }
        if (error.code === "42501") {
          return json({ error: "Invalid or expired review access" }, 403);
        }
        if (error.code === "P0002") {
          return json({ error: "Reservation not found" }, 404);
        }
        if (error.code === "P0001") {
          return json({ error: "Reservation is not ready for review" }, 409);
        }
        if (error.code === "22023") {
          return json({ error: "Review details are invalid" }, 400);
        }
        if (error.code === "40001") {
          return json({ error: "Reservation changed; please try again" }, 409);
        }
        console.error("[car-rental-review-submit:insert]", error.message);
        return json({ error: "Could not submit review" }, 500);
      }

      return json({ ok: true, review_id: reviewId });
    },
    {
      strictCors: true,
      allowedMethods: ["POST"],
      rateLimit: "api_general",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);

function cleanRating(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null;
}

function cleanNullableRating(value: unknown): number | null {
  if (value === null || value === "" || value === undefined || value === 0) {
    return null;
  }
  return cleanRating(value);
}

function cleanText(
  value: unknown,
  minLength: number,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) {
    return minLength === 0 ? null : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}
