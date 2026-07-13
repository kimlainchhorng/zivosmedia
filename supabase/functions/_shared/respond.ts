/**
 * Standardized JSON responses that always attach CORS headers.
 */
import { getCorsHeaders } from "./cors.ts";

type CorsSource = Request | Record<string, string>;

function responseHeaders(source: CorsSource): Record<string, string> {
  return source instanceof Request ? getCorsHeaders(source) : source;
}

export function ok(source: CorsSource, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders(source), "Content-Type": "application/json" },
  });
}

export function err(
  source: CorsSource,
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify({ error: message, ...(extra ?? {}) }), {
    status,
    headers: { ...responseHeaders(source), "Content-Type": "application/json" },
  });
}

export function preflight(source: CorsSource): Response {
  return new Response(null, { status: 204, headers: responseHeaders(source) });
}
