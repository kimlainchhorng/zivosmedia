/**
 * _ping — canary edge function.
 *
 * Imports only `createClient` from the shared deps module. If this function
 * deploys cleanly, the shared `npm:@supabase/supabase-js` import resolves
 * within Supabase's bundler timeout. Use as a smoke test before debugging
 * larger functions when a deploy mysteriously fails.
 */
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Touch the import so tree-shaking can't drop it.
const _sdkLoaded = typeof createClient === "function";

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
});
