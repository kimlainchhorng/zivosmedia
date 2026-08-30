/**
 * marketplace-review-submit
 * -------------------------
 * Authenticated marketplace seller review submission.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  seller_id?: unknown;
  listing_id?: unknown;
  order_id?: unknown;
  rating?: unknown;
  title?: unknown;
  content?: unknown;
};

serve(withSecurity("marketplace-review-submit", async (req, ctx) => {
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
  const sellerId = cleanUuid(body.seller_id);
  const listingId = cleanUuid(body.listing_id);
  const orderId = cleanUuid(body.order_id);
  const rating = cleanRating(body.rating);
  if (!sellerId || rating === null) return json({ error: "Seller and rating are required" }, 400);
  if (sellerId === user.id) return json({ error: "You cannot review your own seller profile" }, 409);

  let verifiedPurchase = false;
  if (orderId) {
    const { data: order, error: orderError } = await admin
      .from("marketplace_orders")
      .select("id, buyer_id, seller_id, status")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) {
      console.error("[marketplace-review-submit:order]", orderError.message);
      return json({ error: "Could not verify order" }, 500);
    }
    if (!order || order.buyer_id !== user.id || order.seller_id !== sellerId) {
      return json({ error: "Order is not reviewable by this user" }, 403);
    }
    verifiedPurchase = true;
  }

  if (listingId) {
    const { data: listing, error: listingError } = await admin
      .from("marketplace_listings")
      .select("id, seller_id")
      .eq("id", listingId)
      .maybeSingle();
    if (listingError) {
      console.error("[marketplace-review-submit:listing]", listingError.message);
      return json({ error: "Could not verify listing" }, 500);
    }
    if (!listing || listing.seller_id !== sellerId) return json({ error: "Listing does not belong to seller" }, 409);
  }

  if (orderId) {
    const { count, error: existingError } = await admin
      .from("marketplace_reviews")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId)
      .eq("reviewer_id", user.id);
    if (existingError) {
      console.error("[marketplace-review-submit:existing]", existingError.message);
      return json({ error: "Could not verify existing review" }, 500);
    }
    if ((count ?? 0) > 0) return json({ error: "Review already submitted" }, 409);
  }

  const payload = {
    reviewer_id: user.id,
    seller_id: sellerId,
    listing_id: listingId,
    order_id: orderId,
    rating,
    title: cleanText(body.title, 0, 140),
    content: cleanText(body.content, 0, 2000),
    is_verified_purchase: verifiedPurchase,
  };

  const { data, error } = await admin
    .from("marketplace_reviews")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("[marketplace-review-submit:insert]", error.message);
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

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}
