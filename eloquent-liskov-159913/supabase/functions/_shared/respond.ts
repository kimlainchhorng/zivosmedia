/**
 * Standardized JSON responses that always attach CORS headers.
 */
import { getCorsHeaders } from "./cors.ts";

export function ok(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export function err(
  req: Request,
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify({ error: message, ...(extra ?? {}) }), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
