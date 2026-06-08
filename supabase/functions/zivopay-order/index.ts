// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { json, requireUser, requireUuid, serviceClient } from "../_shared/zivopay.ts";

serve(withSecurity("zivopay-order", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const url = new URL(req.url);
    const id = requireUuid(url.searchParams.get("id"), "id");
    const admin = serviceClient();

    const { data, error } = await admin
      .from("payment_orders")
      .select("*, payment_transactions(*, payment_refunds(*))")
      .eq("id", id)
      .eq("zivosmedia_user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return json(cors, { error: "Payment order not found" }, 404);

    return json(cors, { payment_order: data });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
}));
