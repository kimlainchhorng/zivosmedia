/**
 * _ping — canary edge function.
 *
 * Imports only `createClient` from the shared deps module. If this function
 * deploys cleanly, the shared `npm:@supabase/supabase-js` import resolves
 * within Supabase's bundler timeout. Use as a smoke test before debugging
 * larger functions when a deploy mysteriously fails.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Touch the import so tree-shaking can't drop it.
const _sdkLoaded = typeof createClient === "function";

Deno.serve(withSecurity("ping-canary", async (_req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  return new Response(
    JSON.stringify({
      ok: true,
      sdk: "@supabase/supabase-js@2.49.1",
      sdk_loaded: _sdkLoaded,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
  skipBotDetection: true,
}));
