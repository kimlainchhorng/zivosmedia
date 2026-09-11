export type CardReadFailure = 'rate-limited' | 'unauthorized' | 'forbidden' | 'unavailable';
export class CardReadError extends Error {
  constructor(public kind: CardReadFailure, public retryAt = 0) {
    super('Payment methods could not be loaded.');
    this.name = 'CardReadError';
  }
}

/** Read classification only. Provider bodies are never used as display copy. */
export async function classifyCardReadError(error: unknown, data?: unknown): Promise<CardReadError> {
  const context = error && typeof error === 'object' && 'context' in error ? error.context : null;
  const response = context instanceof Response ? context : null;
  let body = data;
  if (response) {
    try { const text = await response.clone().text(); if (text.length <= 4096) body = JSON.parse(text); } catch { /* no trusted body */ }
  }
  const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : '';
  const limited = response?.status === 429 || (response?.status === 403 && /too many requests|rate.limit/i.test(message));
  if (limited) {
    const header = response?.headers.get('retry-after');
    const seconds = header && /^\d+$/.test(header) ? Number(header) : 0;
    const date = header && !seconds ? Date.parse(header) : NaN;
    const delay = Math.max(2000, Math.min(300_000, seconds ? seconds * 1000 : Number.isFinite(date) ? date - Date.now() : 2000));
    return new CardReadError('rate-limited', Date.now() + delay);
  }
  return new CardReadError(response?.status === 401 ? 'unauthorized' : response?.status === 403 ? 'forbidden' : 'unavailable');
}

export function cardReadRetryDelay(attempt: number, error: CardReadError) {
  return Math.max(Math.min(30_000, 2000 * 2 ** attempt), error.retryAt - Date.now());
}

/** Session identity is a cache partition, never an authorization decision. */
export function cardSessionKey(accessToken?: string, lastSignIn?: string) {
  try {
    const payload = JSON.parse(atob((accessToken?.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.session_id === 'string') return payload.session_id;
  } catch { /* legacy/test sessions use their last sign-in timestamp */ }
  return lastSignIn || 'current-session';
}
