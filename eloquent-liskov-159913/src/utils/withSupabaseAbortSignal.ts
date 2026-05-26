type AbortableQuery<T> = T & {
  abortSignal?: (signal: AbortSignal) => T;
};

/**
 * Attach React Query's AbortSignal to a Supabase builder when supported.
 * Falls back safely on environments/builders without abortSignal.
 */
export function withSupabaseAbortSignal<T>(query: T, signal?: AbortSignal): T {
  if (!signal || !query) return query;
  const maybeAbortable = query as AbortableQuery<T>;
  if (typeof maybeAbortable.abortSignal === "function") {
    return maybeAbortable.abortSignal(signal);
  }
  return query;
}
