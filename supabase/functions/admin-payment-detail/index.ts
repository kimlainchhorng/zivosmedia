// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { adminPaymentDetail } from "../_shared/zivopayAdmin.ts";
serve(withSecurity("admin-payment-detail", adminPaymentDetail, { strictCors: true, allowedMethods: ["GET"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
