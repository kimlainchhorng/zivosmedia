const isPerfTraceEnabled =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  typeof performance !== "undefined";

export function perfNow() {
  return isPerfTraceEnabled ? performance.now() : 0;
}

export function perfLog(label: string, details?: Record<string, unknown>) {
  if (!isPerfTraceEnabled) return;
  const sinceStart = Math.round(performance.now());
  console.info(`[perf] ${label}`, {
    sinceStartMs: sinceStart,
    ...details,
  });
}

export function perfMeasure(label: string, startedAt: number, details?: Record<string, unknown>) {
  if (!isPerfTraceEnabled || !startedAt) return;
  perfLog(label, {
    durationMs: Math.round(performance.now() - startedAt),
    ...details,
  });
}
