/**
 * car-dealership-review-submit
 * ----------------------------
 * Public, sale-linked dealership review submission.
 */
<<<<<<< Updated upstream
import { serve } from "../_shared/deps.ts";
import {
  authorizeCarDealershipSaleReviewAccess,
  cleanCarDealershipUuid,
  createCarDealershipServiceClient,
=======
import { createClient, serve } from "../_shared/deps.ts";
import {
  authorizeCarDealershipSaleReviewAccess,
  cleanCarDealershipUuid,
>>>>>>> Stashed changes
} from "../_shared/carDealershipCustomerAccess.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type Body = {
  sale_id?: unknown;
  access_token?: unknown;
  rating?: unknown;
  title?: unknown;
  body?: unknown;
};

serve(withSecurity("car-dealership-review-submit", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Review access is temporarily unavailable" }, 503);
  }
<<<<<<< Updated upstream
  const admin = createCarDealershipServiceClient(supabaseUrl, serviceKey);
=======
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
>>>>>>> Stashed changes

  const body = await req.json().catch(() => ({})) as Body;
  const saleId = cleanCarDealershipUuid(body.sale_id);
  if (!saleId) return json({ error: "Invalid sale id" }, 400);

  const rating = cleanRating(body.rating);
  if (rating === null) return json({ error: "Rating is required" }, 400);

  const reviewBody = cleanText(body.body, 1, 2000);
  if (!reviewBody) return json({ error: "Review body is required" }, 400);

  const authorized = await authorizeCarDealershipSaleReviewAccess({
    admin,
    req,
    supabaseUrl,
    anonKey,
    saleId,
    accessToken: body.access_token,
  });
  if (!authorized) {
    return json({ error: "Invalid or expired review access" }, 403);
  }

  // The service-only RPC repeats authorization after locking the customer and
  // sale, then derives review identity from the authoritative sale row.
  const { data, error } = await admin.rpc("car_dealership_submit_review", {
    p_sale_id: saleId,
    p_access_token: authorized.accessToken,
    p_user_id: authorized.userId,
    p_rating: rating,
    p_title: cleanText(body.title, 0, 160),
    p_body: reviewBody,
  });
  if (error) {
    if (error.code === "23505") {
      return json({ error: "Review already submitted" }, 409);
    }
    if (error.code === "42501") {
      return json({ error: "Invalid or expired review access" }, 403);
    }
    if (error.code === "P0002") {
      return json({ error: "Deal not found" }, 404);
    }
    if (error.code === "P0001") {
      return json({ error: "Deal is not ready for review" }, 409);
    }
    if (error.code === "22023") {
      return json({ error: "Review details are invalid" }, 400);
    }
    if (error.code === "40001") {
      return json({ error: "Deal changed; please try again" }, 409);
    }
    console.error("[car-dealership-review-submit:insert]", error.message);
    return json({ error: "Could not submit review" }, 500);
  }

  const result = Array.isArray(data) ? data[0] : data;
  const reviewId = cleanCarDealershipUuid(result?.review_id);
  if (!reviewId) {
    console.error("[car-dealership-review-submit:shape] missing review id");
    return json({ error: "Could not confirm review" }, 500);
  }

  return json({
    ok: true,
    review_id: reviewId,
    already_processed: result?.already_processed === true,
  });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanRating(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}
