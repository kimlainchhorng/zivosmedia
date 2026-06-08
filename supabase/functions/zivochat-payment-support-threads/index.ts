// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { listPaymentSupportThreads } from "../_shared/zivopayChat.ts";

serve(withSecurity("zivochat-payment-support-threads", listPaymentSupportThreads, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
