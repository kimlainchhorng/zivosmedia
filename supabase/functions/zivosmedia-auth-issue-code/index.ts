import { createClient, serve } from "../_shared/deps.ts";
import { requireUser, requireUserNotBlocked } from "../_shared/auth.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import {
  createAuthCode,
  hashState,
  isRedirectAllowed,
  isValidAppKey,
  isValidCodeChallenge,
  isValidRedirectUri,
  normalizeScopes,
} from "../_shared/zivosmediaAuth.ts";

type IssueCodeBody = {
  app_key?: unknown;
  redirect_uri?: unknown;
  scopes?: unknown;
  state?: unknown;
  nonce?: unknown;
  code_challenge?: unknown;
  code_challenge_method?: unknown;
};

const CODE_TTL_MS = 5 * 60 * 1000;

serve(withSecurity("zivosmedia-auth-issue-code", async (req, ctx) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    });

  const auth = await requireUser(req);
  await requireUserNotBlocked(auth.userId);

  const body = await req.json().catch(() => ({})) as IssueCodeBody;
  if (!isValidAppKey(body.app_key)) {
    await audit({ eventType: "auth_code.issue.rejected", appKey: null, userId: auth.userId, success: false, errorCode: "invalid_app_key", req, ctx });
    return json({ error: "Invalid app_key" }, 400);
  }
  if (!isValidRedirectUri(body.redirect_uri)) {
    await audit({ eventType: "auth_code.issue.rejected", appKey: body.app_key, userId: auth.userId, success: false, errorCode: "invalid_redirect_uri", req, ctx });
    return json({ error: "Invalid redirect_uri" }, 400);
  }

  const service = serviceClient();
  const { data: app, error: appError } = await service
    .from("app_integrations")
    .select("id, app_key, redirect_uris, allowed_scopes, status, enabled")
    .eq("app_key", body.app_key)
    .maybeSingle();

  if (appError || !app || app.status !== "enabled" || app.enabled !== true) {
    await audit({ eventType: "auth_code.issue.rejected", appKey: body.app_key, userId: auth.userId, success: false, errorCode: "app_not_enabled", req, ctx });
    return json({ error: "App integration is not enabled" }, 403);
  }

  if (!isRedirectAllowed(body.redirect_uri, app.redirect_uris ?? [])) {
    await audit({ eventType: "auth_code.issue.rejected", appKey: body.app_key, userId: auth.userId, success: false, errorCode: "redirect_not_allowed", req, ctx });
    return json({ error: "redirect_uri is not registered for this app" }, 400);
  }

  if (!isValidCodeChallenge(body.code_challenge)) {
    await audit({ eventType: "auth_code.issue.rejected", appKey: body.app_key, userId: auth.userId, success: false, errorCode: "invalid_code_challenge", req, ctx });
    return json({ error: "Invalid code_challenge" }, 400);
  }
  if (body.code_challenge_method !== "S256") {
    await audit({ eventType: "auth_code.issue.rejected", appKey: body.app_key, userId: auth.userId, success: false, errorCode: "invalid_code_challenge_method", req, ctx });
    return json({ error: "Only S256 code_challenge_method is supported" }, 400);
  }

  const { code, codeHash } = await createAuthCode();
  const scopes = normalizeScopes(body.scopes, app.allowed_scopes ?? []);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  const nonce = typeof body.nonce === "string" ? body.nonce.slice(0, 256) : null;

  const { error: insertError } = await service.from("zivosmedia_auth_codes").insert({
    app_integration_id: app.id,
    code_hash: codeHash,
    zivosmedia_user_id: auth.userId,
    redirect_uri: body.redirect_uri,
    scopes,
    code_challenge: body.code_challenge,
    code_challenge_method: "S256",
    nonce,
    state_hash: await hashState(body.state),
    expires_at: expiresAt,
    metadata: { request_id: ctx.correlationId },
  });

  if (insertError) {
    ctx.log.error("auth_code_insert_failed", { error: insertError.message });
    await audit({ eventType: "auth_code.issue.failed", appKey: body.app_key, userId: auth.userId, success: false, errorCode: "insert_failed", req, ctx });
    return json({ error: "Could not issue authorization code" }, 500);
  }

  await audit({ eventType: "auth_code.issued", appKey: body.app_key, appId: app.id, userId: auth.userId, success: true, req, ctx });
  return json({
    code,
    token_type: "zivosmedia_authorization_code",
    expires_at: expiresAt,
    redirect_uri: body.redirect_uri,
    state: typeof body.state === "string" ? body.state : null,
  });
}, {
  allowedMethods: ["POST"],
  strictCors: true,
  rateLimit: "auth_otp",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server misconfigured: service role credentials missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function audit(input: {
  eventType: string;
  appKey: string | null;
  appId?: string | null;
  userId: string | null;
  success: boolean;
  errorCode?: string;
  req: Request;
  ctx: { ip: string | null; userAgent: string | null; correlationId: string };
}) {
  await serviceClient().from("zivosmedia_auth_audit_logs").insert({
    event_type: input.eventType,
    app_key: input.appKey,
    app_integration_id: input.appId ?? null,
    zivosmedia_user_id: input.userId,
    ip_address: input.ctx.ip,
    user_agent: input.ctx.userAgent,
    success: input.success,
    error_code: input.errorCode ?? null,
    metadata: { request_id: input.ctx.correlationId },
  });
}
