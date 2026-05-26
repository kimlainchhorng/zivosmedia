// supabase/functions/security-cleanup/index.ts
//
// Daily housekeeping for the security tables. Schedule via pg_cron or the
// Supabase scheduler — once a day at off-peak is fine. All operations are
// idempotent and bounded; running twice in a row is harmless.
//
// Pieces:
//   1. prune_expired_ip_blocklist(90)       — drops blocklist rows older than
//                                              90 days past expiry.
//   2. blocked_link_attempts old-row sweep  — deletes rows older than 90 days.
//      The admin dashboard shows up to "30d" so 90d is generous forensics
//      headroom.
//   3. csp_violations old-row sweep         — deletes rows older than 30 days.
//      The CSP page shows up to "30d"; older rows have no operational value.
//   4. security_notification_queue sweep    — deletes 'sent' rows older than
//      30 days and 'failed' rows older than 90 days.
//
// Returns a JSON summary of how many rows were affected.

import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupResult {
  ip_blocklist_pruned: number;
  blocked_links_pruned: number;
  csp_violations_pruned: number;
  notif_queue_pruned: number;
  ran_at: string;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const result: CleanupResult = {
    ip_blocklist_pruned: 0,
    blocked_links_pruned: 0,
    csp_violations_pruned: 0,
    notif_queue_pruned: 0,
    ran_at: new Date().toISOString(),
    errors: [],
  };

  // 1. Prune expired ip_blocklist via the dedicated RPC.
  try {
    const { data, error } = await admin.rpc("prune_expired_ip_blocklist", {
      _retain_days: 90,
    });
    if (error) throw error;
    result.ip_blocklist_pruned = (data as number) ?? 0;
  } catch (e) {
    result.errors.push(`ip_blocklist: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Sweep blocked_link_attempts older than 90 days.
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await admin
      .from("blocked_link_attempts")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    if (error) throw error;
    result.blocked_links_pruned = count ?? 0;
  } catch (e) {
    result.errors.push(`blocked_link_attempts: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3. Sweep csp_violations older than 30 days.
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await admin
      .from("csp_violations")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    if (error) throw error;
    result.csp_violations_pruned = count ?? 0;
  } catch (e) {
    result.errors.push(`csp_violations: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 4. Sweep terminal notification queue rows.
  try {
    const sentCutoff   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const failedCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const [sentRes, failedRes] = await Promise.all([
      admin
        .from("security_notification_queue")
        .delete({ count: "exact" })
        .eq("status", "sent")
        .lt("sent_at", sentCutoff),
      admin
        .from("security_notification_queue")
        .delete({ count: "exact" })
        .eq("status", "failed")
        .lt("created_at", failedCutoff),
    ]);
    if (sentRes.error)   throw sentRes.error;
    if (failedRes.error) throw failedRes.error;
    result.notif_queue_pruned = (sentRes.count ?? 0) + (failedRes.count ?? 0);
  } catch (e) {
    result.errors.push(`notif_queue: ${e instanceof Error ? e.message : String(e)}`);
  }

  const status = result.errors.length === 0 ? 200 : 207;  // 207 = partial
  return new Response(JSON.stringify(result), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
