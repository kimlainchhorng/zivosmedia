/**
 * Reading a supabase-js edge-function failure properly.
 *
 * `supabase.functions.invoke` reports every non-2xx the same way — a
 * FunctionsHttpError whose message is "Edge Function returned a non-2xx status
 * code". The status and the JSON body the function actually sent are on
 * `error.context`, and callers that do not look there cannot tell "this
 * function is not deployed" from "this function deliberately refused".
 *
 * That distinction matters wherever a caller falls back to writing the table
 * directly when a function is missing. BusOperatorConsole did exactly that, in
 * a bare `catch`, so a 409 "this payment was refunded and cannot be captured"
 * was swallowed and the booking was marked confirmed anyway — with a
 * "Booking confirmed." toast. The refusal existed and the UI overrode it.
 *
 * The body shape varies across SDK versions (object or JSON string), which is
 * the same variance `invokeSensitive` handles.
 */

type EdgeErrorLike = {
  name?: string;
  message?: string;
  context?: { status?: number; body?: unknown };
};

function parseBody(error: unknown): Record<string, unknown> | null {
  const body = (error as EdgeErrorLike)?.context?.body;
  if (!body) return null;
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof body === "object" ? (body as Record<string, unknown>) : null;
}

/**
 * True only when the function is genuinely not there — a 404 from the gateway,
 * or a transport failure that never reached one.
 *
 * Deliberately narrow. A 400/403/409 is the function answering, and treating
 * that as "not deployed" is how a refusal becomes a direct write.
 */
export function isEdgeFunctionMissing(error: unknown): boolean {
  if (!error) return false;
  const status = (error as EdgeErrorLike)?.context?.status;
  if (status === 404) return true;
  if (typeof status === "number") return false;
  // No status at all: the request never got an HTTP response.
  const name = (error as EdgeErrorLike)?.name ?? "";
  return /FunctionsFetchError|FunctionsRelayError/i.test(name);
}

/** The message the function itself sent, if it sent one. */
export function edgeFunctionErrorMessage(error: unknown, fallback: string): string {
  const body = parseBody(error);
  const message = body?.error ?? body?.message;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}
