/**
 * Standardized error classes + handler wrapper for edge functions.
 *
 * `withErrorHandling(handler)` wraps an async (req) => Response handler and
 * translates thrown UnauthorizedError / ValidationError / HttpError into
 * standard JSON responses with CORS headers attached.
 */
import { getCorsHeaders } from "./cors.ts";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends Error {
  fieldErrors: Record<string, string[]>;
  constructor(fieldErrors: Record<string, string[]>, message = "Validation failed") {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class HttpError extends Error {
  status: number;
  extra?: Record<string, unknown>;
  constructor(status: number, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.extra = extra;
  }
}

export type EdgeHandler = (req: Request) => Promise<Response>;

export function withErrorHandling(handler: EdgeHandler, fnName?: string): EdgeHandler {
  return async (req: Request): Promise<Response> => {
    const cors = getCorsHeaders(req);
    try {
      return await handler(req);
    } catch (err) {
      const tag = fnName ? `[${fnName}]` : "[edge]";
      if (err instanceof UnauthorizedError) {
        const code = (err as unknown as { code?: string }).code;
        // MFA-required errors return 403 + a machine-readable code so the
        // client can prompt for a TOTP challenge and re-call.
        if (code === "mfa_required") {
          return jsonResponse({ error: err.message, code }, 403, cors);
        }
        return jsonResponse({ error: err.message }, 401, cors);
      }
      if (err instanceof ValidationError) {
        return jsonResponse({ error: err.message, fieldErrors: err.fieldErrors }, 400, cors);
      }
      if (err instanceof HttpError) {
        return jsonResponse({ error: err.message, ...(err.extra ?? {}) }, err.status, cors);
      }
      console.error(tag, "Unhandled error:", err);
      const msg = err instanceof Error ? err.message : "Internal server error";
      return jsonResponse({ error: msg }, 500, cors);
    }
  };
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
