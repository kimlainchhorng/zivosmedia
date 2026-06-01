export interface SupabaseFunctionErrorDetails {
  code?: string;
  message?: string;
  retryAfter?: number;
}

interface FunctionErrorBody {
  code?: unknown;
  error?: unknown;
  message?: unknown;
  retryAfter?: unknown;
  retry_after_seconds?: unknown;
}

export async function getSupabaseFunctionErrorDetails(error: unknown): Promise<SupabaseFunctionErrorDetails> {
  const body = await readFunctionErrorBody(error);
  const retryAfter = readRetryAfter(body);
  const message =
    typeof body?.error === "string"
      ? body.error
      : typeof body?.message === "string"
        ? body.message
        : error instanceof Error
          ? error.message
          : undefined;

  return {
    code: typeof body?.code === "string" ? body.code : undefined,
    message,
    retryAfter,
  };
}

async function readFunctionErrorBody(error: unknown): Promise<FunctionErrorBody | null> {
  const context = (error as { context?: unknown } | null)?.context;

  try {
    if (context instanceof Response) {
      return await context.clone().json();
    }

    if (context && typeof context === "object" && "json" in context) {
      const json = (context as { json?: () => Promise<unknown> }).json;
      if (typeof json === "function") return await json.call(context) as FunctionErrorBody;
    }

    if (context && typeof context === "object" && "body" in context) {
      const body = (context as { body?: unknown }).body;
      if (typeof body === "string") return JSON.parse(body);
      if (body && typeof body === "object") return body as FunctionErrorBody;
    }
  } catch {
    return null;
  }

  return null;
}

function readRetryAfter(body: FunctionErrorBody | null): number | undefined {
  const raw = body?.retryAfter ?? body?.retry_after_seconds;
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.ceil(value);
}
