// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { createPaymentSupportThread } from "../_shared/zivopayChat.ts";

serve(withSecurity("zivochat-create-payment-support", createPaymentSupportThread, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
