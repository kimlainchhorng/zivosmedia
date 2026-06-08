import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import {
  hashAuthCode,
  isValidAppKey,
  isValidCodeVerifier,
  publicProfileFromUser,
  verifyCodeChallenge,
  verifyClientSecret,
} from "../_shared/zivosmediaAuth.ts";

type ValidateCodeBody = {
  app_key?: unknown;
  client_secret?: unknown;
  code?: unknown;
  code_verifier?: unknown;
};

serve(withSecurity("zivosmedia-auth-validate-code", async (req, ctx) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    });

  const body = await req.json().catch(() => ({})) as ValidateCodeBody;
  if (
    !isValidAppKey(body.app_key) ||
    typeof body.client_secret !== "string" ||
    typeof body.code !== "string" ||
    !isValidCodeVerifier(body.code_verifier)
  ) {
    await audit({ eventType: "auth_code.validate.rejected", appKey: isValidAppKey(body.app_key) ? body.app_key : null, userId: null, success: false, errorCode: "invalid_request", req, ctx });
    return json({ error: "Invalid request" }, 400);
  }

  const service = serviceClient();
  const { data: app, error: appError } = await service
    .from("app_integrations")
    .select("id, app_key, client_secret_hash, status, enabled")
    .eq("app_key", body.app_key)
    .maybeSingle();

  if (appError || !app || app.status !== "enabled" || app.enabled !== true) {
    await audit({ eventType: "auth_code.validate.rejected", appKey: body.app_key, userId: null, success: false, errorCode: "app_not_enabled", req, ctx });
    return json({ error: "App integration is not enabled" }, 403);
  }

  if (!await verifyClientSecret(body.client_secret, app.client_secret_hash)) {
    await audit({ eventType: "auth_code.validate.rejected", appKey: body.app_key, appId: app.id, userId: null, success: false, errorCode: "invalid_client", req, ctx });
    return json({ error: "Invalid client credentials" }, 401);
  }

  const codeHash = await hashAuthCode(body.code);
  const { data: authCode, error: codeError } = await service
    .from("zivosmedia_auth_codes")
    .select("id, app_integration_id, zivosmedia_user_id, redirect_uri, scopes, code_challenge, code_challenge_method, expires_at, used_at, revoked_at")
    .eq("code_hash", codeHash)
    .eq("app_integration_id", app.id)
    .maybeSingle();

  if (codeError || !authCode) {
    await audit({ eventType: "auth_code.validate.rejected", appKey: body.app_key, appId: app.id, userId: null, success: false, errorCode: "code_not_found", req, ctx });
    return json({ error: "Invalid authorization code" }, 400);
  }
  if (authCode.used_at || authCode.revoked_at || new Date(authCode.expires_at).getTime() <= Date.now()) {
    await audit({ eventType: "auth_code.validate.rejected", appKey: body.app_key, appId: app.id, userId: authCode.zivosmedia_user_id, success: false, errorCode: "code_not_active", req, ctx });
    return json({ error: "Authorization code is expired or already used" }, 400);
  }
  if (authCode.code_challenge_method !== "S256" || !await verifyCodeChallenge(body.code_verifier, authCode.code_challenge)) {
    await audit({ eventType: "auth_code.validate.rejected", appKey: body.app_key, appId: app.id, userId: authCode.zivosmedia_user_id, success: false, errorCode: "invalid_code_verifier", req, ctx });
    return json({ error: "Invalid code verifier" }, 400);
  }

  const { error: updateError } = await service
    .from("zivosmedia_auth_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", authCode.id)
    .is("used_at", null)
    .is("revoked_at", null);

  if (updateError) {
    ctx.log.error("auth_code_mark_used_failed", { error: updateError.message });
    await audit({ eventType: "auth_code.validate.failed", appKey: body.app_key, appId: app.id, userId: authCode.zivosmedia_user_id, success: false, errorCode: "mark_used_failed", req, ctx });
    return json({ error: "Could not validate authorization code" }, 500);
  }

  const { data: userData, error: userError } = await service.auth.admin.getUserById(authCode.zivosmedia_user_id);
  if (userError || !userData.user) {
    await audit({ eventType: "auth_code.validate.failed", appKey: body.app_key, appId: app.id, userId: authCode.zivosmedia_user_id, success: false, errorCode: "user_not_found", req, ctx });
    return json({ error: "Zivosmedia user not found" }, 404);
  }

  await audit({ eventType: "auth_code.validated", appKey: body.app_key, appId: app.id, userId: userData.user.id, success: true, req, ctx });
  return json({
    token_type: "zivosmedia_identity",
    profile: publicProfileFromUser(userData.user),
    scopes: authCode.scopes,
    linked_at: new Date().toISOString(),
  });
}, {
  allowedMethods: ["POST"],
  strictCors: true,
  rateLimit: "auth_otp",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
  skipBotDetection: true,
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
