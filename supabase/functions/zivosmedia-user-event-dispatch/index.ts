import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

/**
 * Hub-side webhook emitter for Zivosmedia identity events.
 *
 * Server-internal only (requires the service-role key as Bearer). Given
 * { event_type: "user_updated" | "user_disabled", zivosmedia_user_id }, it loads the
 * canonical profile and fans the event out to every enabled relying-party app that has a
 * webhook_url registered in app_integrations, recording each delivery in
 * platform_webhook_events. This is the missing counterpart to the per-app
 * zivosmedia-user-updated / zivosmedia-user-disabled receivers.
 *
 * Signing (shared ZIVOSMEDIA_WEBHOOK_SECRET):
 *  - x-zivo-signature: sha256=<hex HMAC(body)>           (compat with current receivers)
 *  - x-zivo-timestamp + x-zivo-signature-v2: t=<unix>,v1=<hex HMAC("t.body")>
 *      (replay-safe; receivers should migrate to this and reject |now-t| > 300s)
 */

type DispatchBody = {
  event_type?: unknown;
  zivosmedia_user_id?: unknown;
};

const ALLOWED_EVENTS = new Set(["user_updated", "user_disabled"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

<<<<<<< HEAD
serve(
  withSecurity("zivosmedia-user-event-dispatch", async (req, ctx) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

=======
serve(withSecurity("zivosmedia-user-event-dispatch", async (req: Request, ctx) => {
>>>>>>> origin/main
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("ZIVOSMEDIA_WEBHOOK_SECRET");
  if (!url || !serviceKey) return json(ctx.corsHeaders, { error: "server_misconfigured" }, 500);
  if (!webhookSecret) return json(ctx.corsHeaders, { error: "missing_webhook_secret" }, 503);

  // Internal-only: caller must present the service-role key.
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!timingSafeEqual(bearer, serviceKey)) return json(ctx.corsHeaders, { error: "unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as DispatchBody;
  const eventType = typeof body.event_type === "string" ? body.event_type : "";
  const userId = typeof body.zivosmedia_user_id === "string" ? body.zivosmedia_user_id : "";
  if (!ALLOWED_EVENTS.has(eventType)) return json(ctx.corsHeaders, { error: "invalid_event_type" }, 400);
  if (!UUID_RE.test(userId)) return json(ctx.corsHeaders, { error: "invalid_zivosmedia_user_id" }, 400);

  const service = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userError } = await service.auth.admin.getUserById(userId);
  if (userError || !userData.user) return json(ctx.corsHeaders, { error: "user_not_found" }, 404);
  const u = userData.user;
  const profile = {
    zivosmedia_user_id: u.id,
    email: u.email ?? null,
    phone: u.phone ?? null,
    display_name:
      strOrNull(u.user_metadata?.full_name) ??
      strOrNull(u.user_metadata?.name) ??
      strOrNull(u.user_metadata?.display_name),
    avatar_url: strOrNull(u.user_metadata?.avatar_url) ?? strOrNull(u.user_metadata?.picture),
  };

  const { data: apps, error: appsError } = await service
    .from("app_integrations")
    .select("app_key, webhook_url")
    .eq("status", "enabled")
    .eq("enabled", true)
    .not("webhook_url", "is", null);
  if (appsError) return json(ctx.corsHeaders, { error: "registry_unavailable" }, 502);

  const targets = (apps ?? []).filter((a) => typeof a.webhook_url === "string" && a.webhook_url);
  const results: Array<{ app_key: string; ok: boolean; status?: number; error?: string }> = [];

  for (const app of targets) {
    const payload = { event_type: eventType, profile, sent_at: new Date().toISOString() };
    const rawBody = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000).toString();
    const sigBody = await hmacSha256Hex(webhookSecret, rawBody);
    const sigV2 = await hmacSha256Hex(webhookSecret, `${ts}.${rawBody}`);

    // Receivers are event-specific (e.g. driver edge fn ".../zivosmedia-user-disabled",
    // travel worker ".../webhooks/zivosmedia/user-disabled"). Register webhook_url with an
    // "{event}" placeholder so it resolves to the right per-event endpoint; if absent, POST
    // as-is (single endpoint that branches on payload.event_type).
    const targetUrl = (app.webhook_url as string).replace("{event}", eventType.replace(/_/g, "-"));

    let ok = false;
    let status: number | undefined;
    let errorMessage: string | null = null;
    try {
      // Per-delivery timeout so one hung receiver can't stall the whole fan-out.
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 10_000);
      try {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-zivo-signature": `sha256=${sigBody}`,
            "x-zivo-timestamp": ts,
            "x-zivo-signature-v2": `t=${ts},v1=${sigV2}`,
          },
          body: rawBody,
          signal: ac.signal,
        });
        status = res.status;
        ok = res.ok;
        if (!ok) errorMessage = `http_${res.status}`;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "delivery_failed";
    }

    await service.from("platform_webhook_events").insert({
      source_app: "zivosmedia",
      target_app: app.app_key,
      event_type: eventType,
      payload,
      payload_hash: sigBody,
      signature_status: "valid",
      status: ok ? "processed" : "failed",
      error_message: errorMessage,
      processed_at: ok ? new Date().toISOString() : null,
    });

    results.push({ app_key: app.app_key, ok, status, error: errorMessage ?? undefined });
  }

  return json(ctx.corsHeaders, {
    event_type: eventType,
    zivosmedia_user_id: userId,
    dispatched: results.length,
    delivered: results.filter((r) => r.ok).length,
    results,
    checkedAt: new Date().toISOString(),
  });
}, {
  allowedMethods: ["POST"],
<<<<<<< HEAD
  strictCors: true,
  skipBotDetection: true,
  skipWaf: true,
=======
  skipBotDetection: true,
  strictCors: true,
>>>>>>> origin/main
}));

function json(corsHeaders: Record<string, string>, bodyValue: unknown, status = 200) {
  return new Response(JSON.stringify(bodyValue), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
