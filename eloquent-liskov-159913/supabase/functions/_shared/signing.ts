// HMAC-SHA256 request signing + replay protection for high-value endpoints.
// Header convention:
//   x-zivo-timestamp: <unix seconds>
//   x-zivo-nonce:     <random 16+ chars>
//   x-zivo-signature: hex(hmac_sha256(secret, `${ts}.${nonce}.${method}.${path}.${bodyHash}`))

import { createClient } from './deps.ts';

const REPLAY_WINDOW_SECONDS = 300;

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: 'missing' | 'expired' | 'replay' | 'invalid' | 'no_secret' };

export async function verifySignature(req: Request, route: string, secretEnvName: string): Promise<SignatureCheck> {
  const secret = Deno.env.get(secretEnvName);
  if (!secret) return { ok: false, reason: 'no_secret' };

  const ts = req.headers.get('x-zivo-timestamp');
  const nonce = req.headers.get('x-zivo-nonce');
  const sig = req.headers.get('x-zivo-signature');
  if (!ts || !nonce || !sig) return { ok: false, reason: 'missing' };
  if (nonce.length < 16 || nonce.length > 128) return { ok: false, reason: 'invalid' };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: 'invalid' };
  const skew = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
  if (skew > REPLAY_WINDOW_SECONDS) return { ok: false, reason: 'expired' };

  const url = new URL(req.url);
  const bodyBuf = req.method === 'GET' || req.method === 'HEAD'
    ? new Uint8Array()
    : new Uint8Array(await req.clone().arrayBuffer());
  const bodyHash = await sha256Hex(bodyBuf);
  const expected = await hmacSha256Hex(secret, `${ts}.${nonce}.${req.method}.${url.pathname}.${bodyHash}`);
  if (!timingSafeEqual(expected, sig.toLowerCase())) return { ok: false, reason: 'invalid' };

  // Replay check via nonce_cache
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  const { error } = await sb.from('nonce_cache').insert({ nonce, route });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: false, reason: 'replay' };
    // unknown DB error → treat as invalid for safety
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true };
}
