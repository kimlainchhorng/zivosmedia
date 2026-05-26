type EdgeFunctionFallbackOptions<T> = {
  functionName: string;
  error: unknown;
  fallback: T;
  context?: Record<string, unknown>;
  throttleMs?: number;
};

type EdgeFunctionLikeError = {
  name?: string;
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
  status?: number;
};

const lastWarningByFunction = new Map<string, number>();

// Circuit breaker state — opens after N consecutive failures within window,
// stays open for cooldown to stop retry storms against a known-bad function.
type CircuitState = {
  failures: number;
  firstFailureAt: number;
  openedUntil: number;
};
const circuitState = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_MS = 60_000;
const OPEN_COOLDOWN_MS = 2 * 60_000;

function normalizeError(error: unknown): EdgeFunctionLikeError {
  if (error && typeof error === "object") {
    return error as EdgeFunctionLikeError;
  }
  return { message: String(error) };
}

function shouldLog(functionName: string, throttleMs: number): boolean {
  const now = Date.now();
  const last = lastWarningByFunction.get(functionName) ?? 0;
  if (now - last < throttleMs) {
    return false;
  }
  lastWarningByFunction.set(functionName, now);
  return true;
}

/**
 * Returns true if the circuit is currently OPEN — caller should skip the
 * edge function call entirely and serve fallback immediately.
 */
export function isEdgeFunctionCircuitOpen(functionName: string): boolean {
  const state = circuitState.get(functionName);
  if (!state) return false;
  if (Date.now() < state.openedUntil) return true;
  // Cooldown elapsed — reset and allow next attempt
  if (state.openedUntil > 0 && Date.now() >= state.openedUntil) {
    circuitState.delete(functionName);
  }
  return false;
}

/**
 * Record success or failure for circuit tracking. Call once per invocation.
 */
export function recordEdgeFunctionResult(functionName: string, success: boolean): void {
  if (success) {
    circuitState.delete(functionName);
    return;
  }
  const now = Date.now();
  const state = circuitState.get(functionName);
  if (!state || now - state.firstFailureAt > FAILURE_WINDOW_MS) {
    circuitState.set(functionName, { failures: 1, firstFailureAt: now, openedUntil: 0 });
    return;
  }
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.openedUntil = now + OPEN_COOLDOWN_MS;
  }
}

export function edgeFunctionFallback<T>({
  functionName,
  error,
  fallback,
  context,
  throttleMs = 60_000,
}: EdgeFunctionFallbackOptions<T>): T {
  recordEdgeFunctionResult(functionName, false);

  if (shouldLog(functionName, throttleMs)) {
    const normalized = normalizeError(error);
    console.warn(`[edge-function] ${functionName} failed; using fallback`, {
      status: normalized.status,
      code: normalized.code,
      name: normalized.name,
      message: normalized.message,
      details: normalized.details,
      hint: normalized.hint,
      context,
    });
  }

  return fallback;
}
