/**
 * car-dealership-review-submit
 * ----------------------------
 * Public, sale-linked dealership review submission.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const REVIEWABLE_STATUSES = new Set(["completed", "delivered"]);

type Body = {
  sale_id?: unknown;
  customer_name?: unknown;
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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;

  const body = await req.json().catch(() => ({})) as Body;
  const saleId = cleanUuid(body.sale_id);
  if (!saleId) return json({ error: "Invalid sale id" }, 400);

  const { data: sale, error: saleError } = await admin
    .from("car_dealership_sales")
    .select("id, store_id, customer_id, customer_name, vehicle_label, status")
    .eq("id", saleId)
    .maybeSingle();
  if (saleError) {
    console.error("[car-dealership-review-submit:sale]", saleError.message);
    return json({ error: "Could not verify deal" }, 500);
  }
  if (!sale) return json({ error: "Deal not found" }, 404);
  if (!REVIEWABLE_STATUSES.has(String(sale.status ?? "").toLowerCase())) {
    return json({ error: "Deal is not ready for review" }, 409);
  }

  const { count, error: existingError } = await admin
    .from("car_dealership_reviews")
    .select("id", { count: "exact", head: true })
    .eq("sale_id", saleId);
  if (existingError) {
    console.error("[car-dealership-review-submit:existing]", existingError.message);
    return json({ error: "Could not verify existing review" }, 500);
  }
  if ((count ?? 0) > 0) return json({ error: "Review already submitted" }, 409);

  const rating = cleanRating(body.rating);
  if (rating === null) return json({ error: "Rating is required" }, 400);

  const customerName = cleanText(body.customer_name, 1, 160) ?? cleanText(sale.customer_name, 1, 160);
  if (!customerName) return json({ error: "Customer name is required" }, 400);

  const reviewBody = cleanText(body.body, 1, 2000);
  if (!reviewBody) return json({ error: "Review body is required" }, 400);

  const payload = {
    store_id: sale.store_id,
    sale_id: sale.id,
    customer_id: sale.customer_id,
    customer_name: customerName,
    vehicle_label: cleanText(sale.vehicle_label, 0, 160),
    rating,
    title: cleanText(body.title, 0, 160),
    body: reviewBody,
    is_visible: false,
  };

  const { data, error } = await admin
    .from("car_dealership_reviews")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("[car-dealership-review-submit:insert]", error.message);
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
