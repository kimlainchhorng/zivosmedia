/**
 * mint-sso-handoff - issues a single-use login token for ZIVO owned domains.
 *
 * Security model:
 * - Caller must present a valid ZIVO session JWT.
 * - The email is read from the authenticated user, never from the request body.
 * - The target origin must be allow-listed.
 * - The response contains only a GoTrue-managed one-time token hash, not an
 *   access token or refresh token.
 */
import { serve } from "../_shared/deps.ts";
import { requireUser, requireUserNotBlocked, getServiceRoleClient } from "../_shared/auth.ts";
import { HttpError, withErrorHandling } from "../_shared/errors.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import type { SecurityContext } from "../_shared/withSecurity.ts";

const DEFAULT_ALLOWED_TARGET_ORIGINS = [
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
  "https://preview.zivosmedia.com",
  "https://zivostravel.com",
  "https://www.zivostravel.com",
];

const ALLOWED_TARGET_ORIGINS = new Set([
  ...DEFAULT_ALLOWED_TARGET_ORIGINS,
  ...(Deno.env.get("ZIVO_SSO_HANDOFF_TARGET_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

type RequestBody = {
  targetOrigin?: unknown;
};

function json(corsHeaders: Record<string, string>, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeAllowedOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    const origin = url.origin;
    if (ALLOWED_TARGET_ORIGINS.has(origin)) return origin;
  } catch {
    return null;
  }

  return null;
}

async function readBody(req: Request): Promise<RequestBody> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as RequestBody : {};
  } catch {
    return {};
  }
}

const handler = withErrorHandling(async (req: Request, ctx?: SecurityContext): Promise<Response> => {
  const corsHeaders = ctx?.corsHeaders ?? {};
  const auth = await requireUser(req);
  await requireUserNotBlocked(auth.userId);

  const body = await readBody(req);
  const targetOrigin = normalizeAllowedOrigin(body.targetOrigin);
  if (!targetOrigin) {
    throw new HttpError(400, "Invalid SSO target origin", { code: "invalid_target_origin" });
  }

  const admin = getServiceRoleClient();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(auth.userId);
  const email = userData?.user?.email?.trim().toLowerCase();
  if (userError || !email) {
    throw new HttpError(401, "Could not verify the authenticated user", { code: "invalid_session" });
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    ctx?.log.error("sso_handoff_mint_failed", { error: linkError?.message ?? "missing token hash" });
    throw new HttpError(500, "Could not create SSO handoff token", { code: "handoff_mint_failed" });
  }

  return json(corsHeaders, {
    token_hash: tokenHash,
    target_origin: targetOrigin,
  });
}, "mint-sso-handoff");

serve(withSecurity("mint-sso-handoff", handler, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "auth_login",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
