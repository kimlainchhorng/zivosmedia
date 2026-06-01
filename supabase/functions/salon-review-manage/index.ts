/**
 * salon-review-manage
 * -------------------
 * Server-gated owner/admin salon review moderation.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["reply", "set_visible", "delete"]);

type Body = {
  action?: unknown;
  review_id?: unknown;
  response?: unknown;
  is_visible?: unknown;
};

serve(withSecurity("salon-review-manage", async (req, ctx) => {
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
  const reviewId = cleanUuid(body.review_id);
  if (!action || !reviewId) return json({ error: "Invalid review action" }, 400);

  const storeId = await getReviewStoreId(admin, reviewId);
  if (!storeId) return json({ error: "Invalid review id" }, 400);
  if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "delete") {
    const { error } = await admin.from("salon_reviews").delete().eq("id", reviewId).eq("store_id", storeId);
    if (error) {
      console.error("[salon-review-manage:delete]", error.message);
      return json({ error: "Could not delete review" }, 500);
    }
    return json({ ok: true, review_id: reviewId });
  }

  if (action === "set_visible") {
    if (typeof body.is_visible !== "boolean") return json({ error: "Invalid visibility" }, 400);
    return updateReview(admin, reviewId, storeId, { is_visible: body.is_visible }, json);
  }

  const response = cleanText(body.response, 0, 1000);
  return updateReview(admin, reviewId, storeId, { owner_response: response }, json);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function updateReview(admin: any, reviewId: string, storeId: string, patch: Record<string, unknown>, json: (body: unknown, status?: number) => Response) {
  const { data, error } = await admin
    .from("salon_reviews")
    .update(patch)
    .eq("id", reviewId)
    .eq("store_id", storeId)
    .select("*")
    .single();
  if (error) {
    console.error("[salon-review-manage:update]", error.message);
    return json({ error: "Could not update review" }, 500);
  }
  return json({ ok: true, review: data });
}

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-review-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-review-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getReviewStoreId(admin: any, reviewId: string): Promise<string | null> {
  const { data, error } = await admin.from("salon_reviews").select("store_id").eq("id", reviewId).maybeSingle();
  if (error) {
    console.error("[salon-review-manage:review-store]", error.message);
    return null;
  }
  return data?.store_id ?? null;
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

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}
