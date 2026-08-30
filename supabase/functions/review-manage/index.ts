/**
 * review-manage
 * -------------
 * Authenticated server-gated generic review submission and deletion.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["submit", "delete"]);

type Body = {
  action?: unknown;
  review_id?: unknown;
  review?: unknown;
};

serve(withSecurity("review-manage", async (req, ctx) => {
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
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid review action" }, 400);

  if (action === "delete") {
    const reviewId = cleanUuid(body.review_id);
    if (!reviewId) return json({ error: "Invalid review id" }, 400);
    const { error } = await admin
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("reviewer_user_id", user.id);
    if (error) {
      console.error("[review-manage:delete]", error.message);
      return json({ error: "Could not delete review" }, 500);
    }
    return json({ ok: true, review_id: reviewId });
  }

  const review = cleanReview(body.review);
  if (!review.ok) return json({ error: review.error }, 400);

  const { data, error } = await admin
    .from("reviews")
    .insert({ ...review.values, reviewer_user_id: user.id })
    .select("*")
    .single();
  if (error) {
    console.error("[review-manage:submit]", error.message);
    return json({ error: "Could not submit review" }, 500);
  }
  return json({ ok: true, review: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanReview(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Review payload is required" };
  }
  const input = value as Record<string, unknown>;
  const targetType = cleanText(input.target_type, 1, 80);
  const targetId = cleanText(input.target_id, 1, 160);
  const rating = cleanRating(input.rating);
  if (!targetType || !targetId) return { ok: false, error: "Review target is required" };
  if (rating === null) return { ok: false, error: "Rating is required" };
  return {
    ok: true,
    values: {
      target_type: targetType,
      target_id: targetId,
      rating,
      comment: cleanText(input.comment, 0, 2000),
      service_type: cleanText(input.service_type, 0, 80),
      order_id: cleanUuid(input.order_id),
    },
  };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

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
