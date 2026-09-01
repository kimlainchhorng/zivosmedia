/**
 * Handler-owned authentication for pg_cron -> Edge Function requests.
 *
 * Steady state accepts only a versioned HMAC envelope generated from the Vault
 * secret. The long-lived secret is never placed in pg_net's queue; every signed
 * request also claims a database-backed nonce before business work.
 *
 * Exact secret and documented legacy credentials exist only during the
 * coordinated cutover while INTERNAL_CRON_LEGACY_AUTH_ENABLED=true.
 */

import { createClient } from "./deps.ts";

export type InternalCronFunctionName =
  | "auto-cancel-stale-orders"
  | "close-trip-call-sessions"
  | "marketing-automations-tick";

export type InternalCronPurpose = "execute" | "readiness";

export type InternalCronAuthFailureStage =
  | "configuration"
  | "envelope"
  | "timestamp"
  | "url"
  | "body"
  | "hmac"
  | "nonce_claim";

export interface InternalCronAuthDiagnosticEvent {
  event: "internal_cron_signed_rejected";
  function_name: InternalCronFunctionName | "unknown";
  stage: InternalCronAuthFailureStage;
}

type NonceClaimer = (nonce: string, route: string) => Promise<boolean>;
type DiagnosticLogger = (event: InternalCronAuthDiagnosticEvent) => void;
type DiagnosticObserver = (stage: InternalCronAuthFailureStage) => void;

export interface InternalCronAuthOptions {
  functionName?: InternalCronFunctionName;
  legacyBearerEnvNames?: readonly string[];
  legacyHeaderEnvNames?: readonly string[];
  nonceClaimer?: NonceClaimer;
  diagnosticLogger?: DiagnosticLogger;
  diagnosticObserver?: DiagnosticObserver;
}

export interface InternalCronReadinessFailurePayload {
  error: "signed_readiness_rejected";
  stage: InternalCronAuthFailureStage;
}

const SIGNATURE_VERSION = "zivo-cron-v1";
const MAX_REQUEST_AGE_SECONDS = 240;
const MAX_FUTURE_SKEW_SECONDS = 30;
const NONCE_RETENTION_MILLISECONDS = 10 * 60 * 1000;
const encoder = new TextEncoder();
const signedHeaderNames = [
  "x-zivo-cron-version",
  "x-zivo-cron-timestamp",
  "x-zivo-cron-nonce",
  "x-zivo-cron-purpose",
  "x-zivo-cron-signature",
] as const;
const timestampPattern = /^[1-9][0-9]{9,10}$/;
const noncePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const signaturePattern = /^[0-9a-f]{64}$/;

const defaultDiagnosticLogger: DiagnosticLogger = (event) => {
  // Stage-only telemetry: never add request headers, URLs, bodies, signatures,
  // nonces, timestamps, or secret material to this event.
  console.warn("[internal-cron-auth]", JSON.stringify(event));
};

function rejectSignedRequest(
  functionName: InternalCronFunctionName | "unknown",
  stage: InternalCronAuthFailureStage,
  diagnosticLogger: DiagnosticLogger,
  diagnosticObserver?: DiagnosticObserver,
): false {
  diagnosticLogger({
    event: "internal_cron_signed_rejected",
    function_name: functionName,
    stage,
  });
  diagnosticObserver?.(stage);
  return false;
}

function readSecret(name: string, minimumLength = 1): string | null {
  const value = Deno.env.get(name);
  return value && encoder.encode(value).byteLength >= minimumLength
    ? value
    : null;
}

async function hashSecret(value: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
}

async function sha256Hex(value: BufferSource): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function secretsMatch(
  provided: string | null,
  expected: string,
): Promise<boolean> {
  if (provided === null) return false;

  const [providedDigest, expectedDigest] = await Promise.all([
    hashSecret(provided),
    hashSecret(expected),
  ]);

  let difference = 0;
  for (let index = 0; index < expectedDigest.length; index += 1) {
    difference |= providedDigest[index] ^ expectedDigest[index];
  }
  return difference === 0;
}

async function matchesAnyEnvironmentSecret(
  provided: string | null,
  environmentNames: readonly string[],
  prefix = "",
): Promise<boolean> {
  for (const environmentName of environmentNames) {
    const secret = readSecret(environmentName);
    if (secret && (await secretsMatch(provided, `${prefix}${secret}`))) {
      return true;
    }
  }
  return false;
}

function hasAnySignedHeader(req: Request): boolean {
  return signedHeaderNames.some((name) => req.headers.has(name));
}

function isInternalCronPurpose(
  value: string | null,
): value is InternalCronPurpose {
  return value === "execute" || value === "readiness";
}

function hexToBytes(value: string): ArrayBuffer {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes.buffer;
}

async function hmacMatches(
  secret: string,
  message: string,
  signature: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    hexToBytes(signature),
    encoder.encode(message),
  );
}

async function claimNonceWithServiceRole(
  nonce: string,
  route: string,
): Promise<boolean> {
  const supabaseUrl = readSecret("SUPABASE_URL");
  const serviceRoleKey = readSecret("SUPABASE_SERVICE_ROLE_KEY", 32);
  if (!supabaseUrl || !serviceRoleKey) return false;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.from("nonce_cache").insert({
    nonce,
    route,
    expires_at: new Date(
      Date.now() + NONCE_RETENTION_MILLISECONDS,
    ).toISOString(),
  });
  if (error) {
    // A duplicate nonce is a replay. Every other database failure is also
    // rejected so authentication never degrades to isolate-local memory.
    return false;
  }
  return true;
}

async function verifySignedRequest(
  req: Request,
  functionName: InternalCronFunctionName,
  internalSecret: string,
  nonceClaimer: NonceClaimer,
  diagnosticLogger: DiagnosticLogger,
  diagnosticObserver?: DiagnosticObserver,
): Promise<boolean> {
  const version = req.headers.get("x-zivo-cron-version");
  const timestamp = req.headers.get("x-zivo-cron-timestamp");
  const nonce = req.headers.get("x-zivo-cron-nonce");
  const purpose = req.headers.get("x-zivo-cron-purpose");
  const signature = req.headers.get("x-zivo-cron-signature");

  if (
    version !== SIGNATURE_VERSION ||
    !timestamp ||
    !timestampPattern.test(timestamp) ||
    !nonce ||
    !noncePattern.test(nonce) ||
    !isInternalCronPurpose(purpose) ||
    !signature ||
    !signaturePattern.test(signature) ||
    req.method !== "POST"
  ) {
    return rejectSignedRequest(
      functionName,
      "envelope",
      diagnosticLogger,
      diagnosticObserver,
    );
  }

  const parsedTimestamp = Number(timestamp);
  if (!Number.isSafeInteger(parsedTimestamp)) {
    return rejectSignedRequest(
      functionName,
      "timestamp",
      diagnosticLogger,
      diagnosticObserver,
    );
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    parsedTimestamp - now > MAX_FUTURE_SKEW_SECONDS ||
    now - parsedTimestamp > MAX_REQUEST_AGE_SECONDS
  ) {
    return rejectSignedRequest(
      functionName,
      "timestamp",
      diagnosticLogger,
      diagnosticObserver,
    );
  }

  const url = new URL(req.url);
  const expectedPath = `/functions/v1/${functionName}`;
  // Supabase's hosted gateway rewrites req.url.pathname before the request
  // reaches the Edge isolate. The canonical HMAC path remains the hardcoded
  // public path derived from functionName; the runtime URL is trusted only to
  // reject query strings.
  if (url.search !== "") {
    return rejectSignedRequest(
      functionName,
      "url",
      diagnosticLogger,
      diagnosticObserver,
    );
  }

  let bodyHash: string;
  try {
    const body = new Uint8Array(await req.clone().arrayBuffer());
    bodyHash = await sha256Hex(body);
  } catch {
    return rejectSignedRequest(
      functionName,
      "body",
      diagnosticLogger,
      diagnosticObserver,
    );
  }
  const message = [
    version,
    timestamp,
    nonce,
    "POST",
    expectedPath,
    purpose,
    bodyHash,
  ].join("\n");

  try {
    if (!(await hmacMatches(internalSecret, message, signature))) {
      return rejectSignedRequest(
        functionName,
        "hmac",
        diagnosticLogger,
        diagnosticObserver,
      );
    }
  } catch {
    return rejectSignedRequest(
      functionName,
      "hmac",
      diagnosticLogger,
      diagnosticObserver,
    );
  }

  try {
    if (!(await nonceClaimer(nonce, `internal-cron:${functionName}`))) {
      return rejectSignedRequest(
        functionName,
        "nonce_claim",
        diagnosticLogger,
        diagnosticObserver,
      );
    }
  } catch {
    return rejectSignedRequest(
      functionName,
      "nonce_claim",
      diagnosticLogger,
      diagnosticObserver,
    );
  }
  return true;
}

export function isInternalCronReadinessProbe(req: Request): boolean {
  return (
    hasAnySignedHeader(req) &&
    req.headers.get("x-zivo-cron-purpose") === "readiness"
  );
}

function isCompleteSignedReadinessEnvelope(req: Request): boolean {
  const url = new URL(req.url);
  return (
    req.method === "POST" &&
    req.headers.get("x-zivo-cron-version") === SIGNATURE_VERSION &&
    timestampPattern.test(req.headers.get("x-zivo-cron-timestamp") ?? "") &&
    noncePattern.test(req.headers.get("x-zivo-cron-nonce") ?? "") &&
    req.headers.get("x-zivo-cron-purpose") === "readiness" &&
    signaturePattern.test(req.headers.get("x-zivo-cron-signature") ?? "") &&
    url.search === ""
  );
}

export function getInternalCronReadinessFailurePayload(
  req: Request,
  stage: InternalCronAuthFailureStage | null | undefined,
): InternalCronReadinessFailurePayload | null {
  if (!stage || !isCompleteSignedReadinessEnvelope(req)) {
    return null;
  }
  return { error: "signed_readiness_rejected", stage };
}

export async function isAuthorizedInternalCron(
  req: Request,
  options: InternalCronAuthOptions = {},
): Promise<boolean> {
  const internalSecret = readSecret("INTERNAL_CRON_SECRET", 32);

  // Any partial or malformed signed envelope is rejected without falling back
  // to another credential mode.
  if (hasAnySignedHeader(req)) {
    const diagnosticLogger =
      options.diagnosticLogger ?? defaultDiagnosticLogger;
    if (!internalSecret || !options.functionName) {
      return rejectSignedRequest(
        options.functionName ?? "unknown",
        "configuration",
        diagnosticLogger,
        options.diagnosticObserver,
      );
    }
    return verifySignedRequest(
      req,
      options.functionName,
      internalSecret,
      options.nonceClaimer ?? claimNonceWithServiceRole,
      diagnosticLogger,
      options.diagnosticObserver,
    );
  }

  // Direct exact-secret probes and former credentials are cutover-only. Once
  // the flag is false, the signed HMAC path above is the sole accepted mode.
  if (Deno.env.get("INTERNAL_CRON_LEGACY_AUTH_ENABLED") !== "true") {
    return false;
  }

  if (
    internalSecret &&
    (await secretsMatch(req.headers.get("x-cron-secret"), internalSecret))
  ) {
    return true;
  }

  if (
    await matchesAnyEnvironmentSecret(
      req.headers.get("authorization"),
      options.legacyBearerEnvNames ?? [],
      "Bearer ",
    )
  ) {
    return true;
  }

  return matchesAnyEnvironmentSecret(
    req.headers.get("x-cron-secret"),
    options.legacyHeaderEnvNames ?? [],
  );
}
