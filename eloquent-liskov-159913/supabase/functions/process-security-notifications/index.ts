// supabase/functions/process-security-notifications/index.ts
//
// Drains public.security_notification_queue and dispatches each row through
// the existing send-transactional-email function. Schedule via pg_cron or
// Supabase scheduler — once a minute is plenty for the volume this generates.
//
// Each row is dequeued atomically via the dequeue_security_notifications RPC
// (FOR UPDATE SKIP LOCKED) so concurrent runs don't double-send. Status
// transitions: pending → in_flight → sent (or pending again with retry
// backoff, settling to failed after 5 attempts).
//
// Body: optional { kinds?: string[], limit?: number }. Defaults: drain every
// kind, batch size 50.

import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueueRow {
  id: string;
  kind: string;
  identifier: string | null;
  user_id: string | null;
  payload: Record<string, unknown> | null;
}

interface RunResult {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
  ran_at: string;
}

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://hizivo.com";

function templateForKind(kind: string): { templateName: string; mapPayload: (row: QueueRow) => Record<string, unknown> } | null {
  switch (kind) {
    case "new_device_login":
      return {
        templateName: "new-device-login",
        mapPayload: (row) => ({
          identifier: row.identifier ?? "",
          detectedAt: (row.payload?.detected_at as string) ?? new Date().toISOString(),
          deviceFingerprint: (row.payload?.device_fingerprint as string) ?? "",
          manageSecurityUrl: `${SITE_URL}/account/security`,
          notMeUrl: `${SITE_URL}/account/security?action=lock`,
        }),
      };
    case "country_change_login":
      return {
        templateName: "country-change-login",
        mapPayload: (row) => ({
          identifier: row.identifier ?? "",
          detectedAt: (row.payload?.detected_at as string) ?? new Date().toISOString(),
          priorCountry: (row.payload?.prior_country as string) ?? "—",
          newCountry: (row.payload?.new_country as string) ?? "—",
          manageSecurityUrl: `${SITE_URL}/account/security`,
          notMeUrl: `${SITE_URL}/account/security?action=lock`,
        }),
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Optional body: { kinds?: string[], limit?: number }.
  let kinds: string[] | null = null;
  let limit = 50;
  try {
    if (req.method === "POST") {
      const body = await req.json();
      if (Array.isArray(body?.kinds)) kinds = body.kinds.filter((k: unknown) => typeof k === "string");
      if (typeof body?.limit === "number") limit = Math.max(1, Math.min(500, body.limit));
    }
  } catch { /* empty body is fine */ }

  // 1. Atomically claim a batch.
  const { data: batch, error: dequeueErr } = await admin.rpc(
    "dequeue_security_notifications",
    { _limit: limit, _kinds: kinds },
  );
  if (dequeueErr) {
    return new Response(JSON.stringify({ error: dequeueErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const rows = (batch ?? []) as QueueRow[];

  const result: RunResult = {
    attempted: rows.length, sent: 0, failed: 0, skipped: 0, errors: [],
    ran_at: new Date().toISOString(),
  };

  // 2. Dispatch each row sequentially. Email volume here is low; serial keeps
  //    the code simple and avoids hammering the email API.
  for (const row of rows) {
    const recipe = templateForKind(row.kind);
    if (!recipe) {
      // Unknown kind — mark failed (no retries) so it doesn't loop.
      await admin.rpc("mark_security_notification_failed", {
        _id: row.id,
        _error: `unknown_kind:${row.kind}`,
        _retry_after_seconds: 365 * 24 * 3600,
      });
      result.failed++;
      result.errors.push({ id: row.id, error: `unknown kind ${row.kind}` });
      continue;
    }

    if (!row.identifier) {
      await admin.rpc("mark_security_notification_failed", {
        _id: row.id, _error: "no_identifier", _retry_after_seconds: 24 * 3600,
      });
      result.skipped++;
      continue;
    }

    try {
      const { error: sendErr } = await admin.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: recipe.templateName,
            recipientEmail: row.identifier,
            idempotencyKey: row.id,  // queue id is stable per logical alert
            templateData: recipe.mapPayload(row),
          },
        },
      );
      if (sendErr) throw sendErr;

      await admin.rpc("mark_security_notification_sent", { _id: row.id });
      result.sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.rpc("mark_security_notification_failed", {
        _id: row.id, _error: msg.slice(0, 500),
        _retry_after_seconds: 5 * 60,
      });
      result.failed++;
      result.errors.push({ id: row.id, error: msg });
    }
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
