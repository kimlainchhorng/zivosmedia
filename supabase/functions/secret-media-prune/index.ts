// supabase/functions/secret-media-prune/index.ts
// Deletes encrypted blobs in the `secret-media` bucket whose owning
// secret_messages row has expired (expires_at <= now).
// Scheduled via pg_cron every 5 minutes.

import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  const authorization = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  return authorization === `Bearer ${serviceKey}` || apikey === serviceKey;
}

Deno.serve(withSecurity("secret-media-prune", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const provided = new URL(req.url).searchParams.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
  const isInternal = Boolean(cronSecret && provided === cronSecret) || isServiceRoleRequest(req, serviceKey);
  if (!isInternal) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, serviceKey);

  const nowIso = new Date().toISOString();

  // 1. Find expired media messages.
  const { data: expired, error } = await admin
    .from("secret_messages")
    .select("id, storage_path")
    .lte("expires_at", nowIso)
    .not("storage_path", "is", null)
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ pruned: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const paths = expired.map((r) => r.storage_path).filter(Boolean) as string[];

  // 2. Best-effort delete from storage. Ignore "not found" errors.
  await admin.storage.from("secret-media").remove(paths);

  // 3. Delete the DB rows (cascade-equivalent — we keep the row's text envelope
  //    deletion as well; otherwise the realtime DELETE event already fires
  //    for the receiving client). We delete by id list.
  const ids = expired.map((r) => r.id);
  await admin.from("secret_messages").delete().in("id", ids);

  return new Response(
    JSON.stringify({ pruned: ids.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}, { strictCors: true, allowedMethods: ["GET", "POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
