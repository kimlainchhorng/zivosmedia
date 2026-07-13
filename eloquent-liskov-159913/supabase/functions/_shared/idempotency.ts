// Idempotency wrapper — caches the response of a successful mutation under
// `Idempotency-Key` for 24 hours. Subsequent identical-keyed calls return the
// cached response unchanged, preventing duplicate side effects (charges, orders).

import { createClient } from './deps.ts';

const TTL_HOURS = 24;

export interface CachedResponse {
  status: number;
  body: unknown;
}

function client() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

export function getIdempotencyKey(req: Request): string | null {
  const k = req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key');
  if (!k) return null;
  if (k.length < 8 || k.length > 200) return null;
  return k;
}

export async function lookup(key: string, route: string): Promise<CachedResponse | null> {
  const sb = client();
  const { data, error } = await sb
    .from('idempotency_records')
    .select('status_code, response_body, expires_at')
    .eq('key', key)
    .eq('route', route)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return { status: data.status_code ?? 200, body: data.response_body };
}

export async function store(
  key: string,
  route: string,
  userId: string | null,
  status: number,
  body: unknown,
): Promise<void> {
  const sb = client();
  const expires = new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString();
  await sb.from('idempotency_records').upsert({
    key,
    route,
    user_id: userId,
    status_code: status,
    response_body: body,
    expires_at: expires,
  });
}

/**
 * Wrap a handler so that:
 *  - if the request includes a recognized idempotency key matching a recent
 *    successful call, the cached response is returned immediately;
 *  - otherwise the handler runs and its 2xx response is cached for next time.
 */
export async function withIdempotency<T>(
  req: Request,
  route: string,
  userId: string | null,
  handler: () => Promise<{ status: number; body: T }>,
): Promise<{ status: number; body: T; cached: boolean }> {
  const key = getIdempotencyKey(req);
  if (!key) {
    const r = await handler();
    return { ...r, cached: false };
  }
  const hit = await lookup(key, route);
  if (hit) return { status: hit.status, body: hit.body as T, cached: true };
  const r = await handler();
  if (r.status >= 200 && r.status < 300) {
    await store(key, route, userId, r.status, r.body);
  }
  return { ...r, cached: false };
}
