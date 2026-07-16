// Durable idempotency boundary for mutation endpoints.
//
// A request claims its (route, key) before any side effect runs. The claim is
// bound to both the authenticated actor and an exact request-body fingerprint,
// so a reused key cannot disclose another actor's response or silently execute
// different input. Successful responses are cached for 24 hours.

import { createClient } from "./deps.ts";

const TTL_HOURS = 24;
const PROCESSING_STATUS = 102;

export interface CachedResponse {
  status: number;
  body: unknown;
}

export interface IdempotencyContext {
  key: string | null;
  providerKey: string | null;
  requestHash: string | null;
}

export interface IdempotencyOptions {
  required?: boolean;
}

function client() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export function getIdempotencyKey(req: Request): string | null {
  const key = req.headers.get("idempotency-key") ?? req.headers.get("x-idempotency-key");
  if (!key || key.length < 8 || key.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(key)) return null;
  return key;
}

async function requestHash(req: Request): Promise<string> {
  const body = await req.clone().text();
  return sha256(`${req.method.toUpperCase()}\n${body}`);
}

async function providerKey(route: string, userId: string | null, key: string): Promise<string> {
  return `${route.slice(0, 32)}:${await sha256(`${route}\n${userId ?? "anonymous"}\n${key}`)}`;
}

function actorFilter(query: any, userId: string | null) {
  return userId ? query.eq("user_id", userId) : query.is("user_id", null);
}

async function releaseClaim(key: string, route: string, userId: string | null, hash: string): Promise<void> {
  const sb = client();
  let query = sb
    .from("idempotency_records")
    .delete()
    .eq("key", key)
    .eq("route", route)
    .eq("response_hash", hash)
    .eq("status_code", PROCESSING_STATUS);
  query = actorFilter(query, userId);
  const { error } = await query;
  if (error) console.error("Unable to release idempotency claim", { route, error: error.message });
}

async function claim(
  key: string,
  route: string,
  userId: string | null,
  hash: string,
): Promise<CachedResponse | null> {
  const sb = client();
  const expiresAt = new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString();
  const { error: insertError } = await sb.from("idempotency_records").insert({
    key,
    route,
    user_id: userId,
    response_hash: hash,
    status_code: PROCESSING_STATUS,
    response_body: null,
    expires_at: expiresAt,
  });

  if (!insertError) return null;
  if (insertError.code !== "23505") throw new Error(`Unable to claim idempotency key: ${insertError.message}`);

  const { data, error } = await sb
    .from("idempotency_records")
    .select("user_id, response_hash, status_code, response_body, expires_at")
    .eq("key", key)
    .eq("route", route)
    .maybeSingle();
  if (error) throw new Error(`Unable to read idempotency key: ${error.message}`);
  if (!data) throw new Error("Idempotency key claim disappeared; retry with a new key");

  if ((data.user_id ?? null) !== userId) {
    throw new Error("Idempotency key is already bound to a different actor");
  }
  if (data.response_hash !== hash) {
    throw new Error("Idempotency key was reused with a different request body");
  }
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    throw new Error("Idempotency key expired; retry with a new key");
  }
  if (data.status_code === PROCESSING_STATUS) {
    throw new Error("An identical request is already processing");
  }
  if (data.status_code >= 200 && data.status_code < 300) {
    return { status: data.status_code, body: data.response_body };
  }
  throw new Error("Idempotency key is not reusable; retry with a new key");
}

async function complete(
  key: string,
  route: string,
  userId: string | null,
  hash: string,
  status: number,
  body: unknown,
): Promise<void> {
  const sb = client();
  let query = sb
    .from("idempotency_records")
    .update({ status_code: status, response_body: body })
    .eq("key", key)
    .eq("route", route)
    .eq("response_hash", hash)
    .eq("status_code", PROCESSING_STATUS)
    .select("key");
  query = actorFilter(query, userId);
  const { data, error } = await query;
  if (error) throw new Error(`Unable to persist idempotent response: ${error.message}`);
  if (!data?.length) throw new Error("Idempotency claim was lost before the response was persisted");
}

/**
 * Claim a request key before executing the handler and cache its successful
 * response. Existing callers may omit a key; payment endpoints should set
 * `required: true` and pass `providerKey` to their provider SDK mutation.
 */
export async function withIdempotency<T>(
  req: Request,
  route: string,
  userId: string | null,
  handler: (context: IdempotencyContext) => Promise<{ status: number; body: T }>,
  options: IdempotencyOptions = {},
): Promise<{ status: number; body: T; cached: boolean }> {
  const key = getIdempotencyKey(req);
  if (!key) {
    if (options.required) throw new Error("A valid Idempotency-Key header is required");
    const result = await handler({ key: null, providerKey: null, requestHash: null });
    return { ...result, cached: false };
  }

  const hash = await requestHash(req);
  const providerIdempotencyKey = await providerKey(route, userId, key);
  const hit = await claim(key, route, userId, hash);
  if (hit) return { status: hit.status, body: hit.body as T, cached: true };

  let result: { status: number; body: T };
  try {
    result = await handler({ key, providerKey: providerIdempotencyKey, requestHash: hash });
  } catch (error) {
    await releaseClaim(key, route, userId, hash);
    throw error;
  }

  if (result.status >= 200 && result.status < 300) {
    // If this write fails, the in-progress claim intentionally remains in place:
    // returning an uncached successful mutation would make a retry unsafe.
    await complete(key, route, userId, hash, result.status, result.body);
  } else {
    await releaseClaim(key, route, userId, hash);
  }
  return { ...result, cached: false };
}
