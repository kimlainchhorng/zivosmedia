// supabase/functions/secret-media-prune/index.ts
// Deletes encrypted blobs in the `secret-media` bucket whose owning
// secret_messages row has expired (expires_at <= now).
// Scheduled via pg_cron every 5 minutes.

import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
});
