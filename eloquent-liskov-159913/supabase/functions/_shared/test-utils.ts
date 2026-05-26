/**
 * Test helpers for Deno tests against deployed edge functions.
 *
 * Loads .env automatically, exposes a `callFn` helper, and provides assertion
 * utilities for CORS, auth, and Zod-style validation responses.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ??
  Deno.env.get("SUPABASE_URL") ??
  "";
const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "";

export interface CallOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** null = no Authorization header at all. undefined = use anon key. string = bearer. */
  authToken?: string | null;
  origin?: string;
}

export interface CallResult {
  status: number;
  headers: Headers;
  body: unknown;
  text: string;
}

export function fnUrl(name: string, query?: Record<string, string>): string {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL/VITE_SUPABASE_URL not configured for tests");
  }
  const u = new URL(`/functions/v1/${name}`, SUPABASE_URL);
  if (query) for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}

export async function callFn(name: string, opts: CallOptions = {}): Promise<CallResult> {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Origin": opts.origin ?? "https://hizivo.com",
    ...(opts.headers ?? {}),
  });
  if (opts.authToken !== null) {
    headers.set("Authorization", `Bearer ${opts.authToken ?? ANON_KEY}`);
    headers.set("apikey", ANON_KEY);
  }
  const init: RequestInit = {
    method: opts.method ?? "POST",
    headers,
  };
  if (opts.body !== undefined && init.method !== "GET" && init.method !== "OPTIONS") {
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(fnUrl(name), init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: res.status, headers: res.headers, body, text };
}

export async function preflight(name: string, origin = "https://hizivo.com"): Promise<CallResult> {
  const res = await fetch(fnUrl(name), {
    method: "OPTIONS",
    headers: {
      "Origin": origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, content-type",
    },
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text, text };
}

export function assertCors(res: CallResult, expectedOrigin = "https://hizivo.com") {
  const allow = res.headers.get("access-control-allow-origin");
  assert(
    allow === expectedOrigin || allow === "*",
    `Missing/invalid CORS allow-origin (got "${allow}")`,
  );
  const allowHeaders = res.headers.get("access-control-allow-headers");
  assert(allowHeaders, "Missing access-control-allow-headers");
  assert(/authorization/i.test(allowHeaders!), "CORS allow-headers must include authorization");
}

export function assertUnauthorized(res: CallResult) {
  assertEquals(
    res.status,
    401,
    `Expected 401, got ${res.status} (body: ${res.text.slice(0, 200)})`,
  );
}

export function assertValidationError(res: CallResult, field?: string) {
  assertEquals(
    res.status,
    400,
    `Expected 400, got ${res.status} (body: ${res.text.slice(0, 200)})`,
  );
  if (field) {
    const body = res.body as { fieldErrors?: Record<string, string[]>; error?: string };
    const hasField = body?.fieldErrors && field in body.fieldErrors;
    const hasErrorString = typeof body?.error === "string" &&
      body.error.toLowerCase().includes(field.toLowerCase());
    assert(
      hasField || hasErrorString,
      `Expected validation error mentioning "${field}", got ${JSON.stringify(body).slice(0, 200)}`,
    );
  }
}

export const TEST_CONFIG = { SUPABASE_URL, ANON_KEY };
