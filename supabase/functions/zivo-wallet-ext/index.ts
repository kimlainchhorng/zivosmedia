// zivo-wallet-ext — internal-only proxy to the ZIVO Wallet cross-application
// payment ingress. This function moves money, so it is NOT callable from the
// browser: the caller must present the project service-role key as the bearer
// token (server-to-server from other edge functions or trusted backends).
//
// Actions: { action: "health" | "request" | "confirm" | "refund", payload: {...} }
import { withSecurity } from "../_shared/withSecurity.ts";
import {
  isWalletExtConfigured,
  walletExtConfirmPayment,
  walletExtRefundPayment,
  walletExtRequestPayment,
  type WalletExtPaymentConfirm,
  type WalletExtPaymentRequest,
  type WalletExtRefundRequest,
} from "../_shared/zivoWalletExt.ts";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function constantTimeEquals(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

function isInternalCaller(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey) return false;
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return token.length > 0 && constantTimeEquals(token, serviceKey);
}

Deno.serve(withSecurity("zivo-wallet-ext", async (req, _ctx) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!isInternalCaller(req)) return json({ error: "forbidden" }, 403);

  let body: { action?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const payload = body.payload ?? {};

  switch (body.action) {
    case "health":
      return json({ configured: isWalletExtConfigured() });
    case "request": {
      const result = await walletExtRequestPayment(payload as WalletExtPaymentRequest);
      return json(result, result.ok ? 200 : result.status);
    }
    case "confirm": {
      const result = await walletExtConfirmPayment(payload as WalletExtPaymentConfirm);
      return json(result, result.ok ? 200 : result.status);
    }
    case "refund": {
      const result = await walletExtRefundPayment(payload as WalletExtRefundRequest);
      return json(result, result.ok ? 200 : result.status);
    }
    default:
      return json({ error: "unknown_action" }, 400);
  }
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 85,
  skipBotDetection: true,
}));
