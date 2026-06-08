// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { requirePaymentAdmin } from "../_shared/zivopayAdmin.ts";
import { adminListPaymentSupportThreads } from "../_shared/zivopayChat.ts";

serve(withSecurity("admin-payment-support-threads", async (req, ctx) => {
  const gate = await requirePaymentAdmin(req, ctx.corsHeaders);
  if (gate.response) return gate.response;
  return adminListPaymentSupportThreads(req, ctx, gate);
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "admin_action",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 85,
}));
