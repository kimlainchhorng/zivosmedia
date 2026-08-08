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

const DRIVER_BOOTSTRAP_SCOPE = "driver:bootstrap";
const DRIVER_DOCUMENT_URL_TTL_SECONDS = 5 * 60;

type MainDriverRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  vehicle_type: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  vehicle_year: number | null;
  avatar_url: string | null;
  status: string | null;
  rating: number | null;
  total_trips: number | null;
  documents_verified: boolean | null;
};

type MainDriverDocument = {
  id: string;
  document_type: string | null;
  file_path: string | null;
  status: string | null;
  rejection_reason: string | null;
  uploaded_at: string | null;
};

type DriverBootstrapPayload = {
  version: 1;
  source: "zivosmedia";
  market: {
    country: "KH";
    city: "Phnom Penh";
    zone_code: "PP";
    currency: "USD";
    display_currency: "KHR";
  };
  driver: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    license_number: string | null;
    vehicle_type: string | null;
    vehicle_model: string | null;
    vehicle_plate: string | null;
    vehicle_color: string | null;
    vehicle_year: number | null;
    avatar_url: string | null;
    status: string | null;
    rating: number | null;
    total_trips: number | null;
    documents_verified: boolean | null;
  };
  documents: Array<{
    source_document_id: string;
    source_document_type: string;
    file_name: string | null;
    signed_url: string | null;
    status: string;
    rejection_reason: string | null;
    uploaded_at: string | null;
  }>;
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

  const { data: consumedCode, error: updateError } = await service
    .from("zivosmedia_auth_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", authCode.id)
    .is("used_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (updateError || !consumedCode) {
    ctx.log.error("auth_code_mark_used_failed", { error: updateError?.message || "code_already_consumed" });
    const errorCode = updateError ? "mark_used_failed" : "code_already_consumed";
    await audit({ eventType: "auth_code.validate.failed", appKey: body.app_key, appId: app.id, userId: authCode.zivosmedia_user_id, success: false, errorCode, req, ctx });
    return json({ error: updateError ? "Could not validate authorization code" : "Authorization code is expired or already used" }, updateError ? 500 : 400);
  }

  const { data: userData, error: userError } = await service.auth.admin.getUserById(authCode.zivosmedia_user_id);
  if (userError || !userData.user) {
    await audit({ eventType: "auth_code.validate.failed", appKey: body.app_key, appId: app.id, userId: authCode.zivosmedia_user_id, success: false, errorCode: "user_not_found", req, ctx });
    return json({ error: "Zivosmedia user not found" }, 404);
  }

  // The Driver app gets a narrow server-to-server bootstrap only when it
  // explicitly requested the dedicated scope. The signed URLs are consumed by
  // the Driver edge function and are never returned to the Driver browser.
  let driverBootstrap: DriverBootstrapPayload | null | undefined;
  const scopes = Array.isArray(authCode.scopes) ? authCode.scopes : [];
  if (body.app_key === "zivo_driver" && scopes.includes(DRIVER_BOOTSTRAP_SCOPE)) {
    try {
      driverBootstrap = await buildDriverBootstrap(service, userData.user.id);
    } catch (error) {
      driverBootstrap = null;
      ctx.log.error("driver_bootstrap_failed", {
        error: error instanceof Error ? error.message : String(error),
        userId: userData.user.id,
      });
    }
  }

  await audit({ eventType: "auth_code.validated", appKey: body.app_key, appId: app.id, userId: userData.user.id, success: true, req, ctx });
  return json({
    token_type: "zivosmedia_identity",
    profile: publicProfileFromUser(userData.user),
    scopes: authCode.scopes,
    linked_at: new Date().toISOString(),
    ...(driverBootstrap ? { driver_bootstrap: driverBootstrap } : {}),
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

async function buildDriverBootstrap(
  service: ReturnType<typeof serviceClient>,
  userId: string,
): Promise<DriverBootstrapPayload | null> {
  const { data: driver, error: driverError } = await service
    .from("drivers")
    .select("id, full_name, email, phone, license_number, vehicle_type, vehicle_model, vehicle_plate, vehicle_color, vehicle_year, avatar_url, status, rating, total_trips, documents_verified")
    .eq("user_id", userId)
    .maybeSingle() as { data: MainDriverRecord | null; error: { message?: string } | null };

  if (driverError) throw new Error(`driver_profile_lookup_failed:${driverError.message || "unknown"}`);
  if (!driver) return null;

  const { data: sourceDocuments, error: documentError } = await service
    .from("driver_documents")
    .select("id, document_type, file_path, status, rejection_reason, uploaded_at")
    .eq("driver_id", driver.id)
    .order("uploaded_at", { ascending: false }) as { data: MainDriverDocument[] | null; error: { message?: string } | null };

  if (documentError) throw new Error(`driver_documents_lookup_failed:${documentError.message || "unknown"}`);

  const documents = await Promise.all((sourceDocuments ?? []).map(async (document) => {
    const sourcePath = cleanString(document.file_path, 1024);
    let signedUrl: string | null = null;

    // Main onboarding paths are scoped to the authenticated user's UUID. Do
    // not sign a path that could point at another user's private object.
    if (sourcePath && sourcePath.startsWith(`${userId}/`)) {
      const signed = await service
        .storage
        .from("driver-documents")
        .createSignedUrl(sourcePath, DRIVER_DOCUMENT_URL_TTL_SECONDS);
      signedUrl = signed.data?.signedUrl ?? null;
    }

    return {
      source_document_id: document.id,
      source_document_type: cleanString(document.document_type, 100) || "unknown",
      file_name: fileNameFromPath(sourcePath),
      signed_url: signedUrl,
      status: normalizeDocumentStatus(document.status),
      rejection_reason: cleanString(document.rejection_reason, 1000),
      uploaded_at: cleanIsoDate(document.uploaded_at),
    };
  }));

  // Bulk transfer eligibility is document-backed: do not expose a Driver
  // bootstrap for an account that has no safely signable private document.
  if (!documents.some((document) => document.signed_url)) return null;

  return {
    version: 1,
    source: "zivosmedia",
    // Zivosmedia's legacy driver table does not carry the dedicated driver's
    // market columns. This is the current product launch market and matches
    // the Driver project's PP/KH backfill; it is not a live GPS location.
    // USD remains the canonical pricing source while the Driver/Admin surfaces
    // display Cambodia amounts in KHR (៛).
    market: {
      country: "KH",
      city: "Phnom Penh",
      zone_code: "PP",
      currency: "USD",
      display_currency: "KHR",
    },
    driver: {
      full_name: cleanString(driver.full_name, 120),
      email: cleanString(driver.email, 180),
      phone: cleanString(driver.phone, 40),
      license_number: cleanString(driver.license_number, 80),
      vehicle_type: cleanString(driver.vehicle_type, 40),
      vehicle_model: cleanString(driver.vehicle_model, 120),
      vehicle_plate: cleanString(driver.vehicle_plate, 40),
      vehicle_color: cleanString(driver.vehicle_color, 80),
      vehicle_year: finiteNumber(driver.vehicle_year),
      avatar_url: cleanString(driver.avatar_url, 500),
      status: cleanString(driver.status, 40),
      rating: finiteNumber(driver.rating),
      total_trips: finiteNumber(driver.total_trips),
      documents_verified: typeof driver.documents_verified === "boolean" ? driver.documents_verified : null,
    },
    documents,
  };
}

function cleanString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function cleanIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeDocumentStatus(value: unknown): string {
  return value === "approved" || value === "rejected" || value === "pending" ? value : "pending";
}

function fileNameFromPath(value: string | null): string | null {
  if (!value) return null;
  const name = value.split("/").pop()?.trim() ?? "";
  return name ? name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 180) : null;
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
