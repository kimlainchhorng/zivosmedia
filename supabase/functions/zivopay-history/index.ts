// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { json, requireUser, serviceClient } from "../_shared/zivopay.ts";

serve(withSecurity("zivopay-history", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
    const admin = serviceClient();

    const { data, error } = await admin
      .from("payment_orders")
      .select("id, source_platform, order_type, related_table, related_id, business_id, travel_booking_id, driver_job_id, software_product_id, amount, currency, status, metadata, created_at, updated_at, payment_transactions(id, provider, provider_payment_intent_id, provider_checkout_session_id, amount, currency, status, paid_at, created_at)")
      .eq("zivosmedia_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    return json(cors, { payments: data ?? [] });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
}));
