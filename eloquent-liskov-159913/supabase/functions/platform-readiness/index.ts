import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

Deno.serve(withSecurity("platform-readiness", async (req, ctx) => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, {
      ...ctx.corsHeaders,
      Allow: "GET, OPTIONS",
    });
  }

  const expectedToken = Deno.env.get("PLATFORM_READINESS_TOKEN");
  if (expectedToken) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const headerToken = req.headers.get("x-readiness-token");
    if (bearer !== expectedToken && headerToken !== expectedToken) {
      return json({ error: "Unauthorized" }, 401, ctx.corsHeaders);
    }
  }

  const env = Object.fromEntries(
    requiredEnv.map((key) => [key, Boolean(Deno.env.get(key))]),
  );
  const missing = Object.entries(env)
    .filter(([, present]) => !present)
    .map(([key]) => key);

  return json({
    ok: missing.length === 0,
    route: ctx.route,
    requestId: ctx.correlationId,
    checkedAt: new Date().toISOString(),
    checks: {
      edge: true,
      env,
      tokenProtected: Boolean(expectedToken),
      network: {
        country: ctx.network.country,
        asn: ctx.network.asn,
        riskScore: ctx.network.riskScore,
        signals: ctx.network.signals,
        probableProxyOrVpn: ctx.network.probableProxyOrVpn,
      },
    },
    missing,
  }, missing.length === 0 ? 200 : 503, ctx.corsHeaders);
}, {
  strictCors: true,
  rateLimit: "api_general",
  trackNetwork: "suspicious",
}));
