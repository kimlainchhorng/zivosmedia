/**
 * Opaque Realtime channel naming.
 *
 * Realtime channel topic names are visible to anyone subscribed to the same
 * channel server. Embedding raw user IDs ("presence-uuid-uuid") leaks the
 * social graph — anyone running a Realtime client can enumerate which users
 * are paired together.
 *
 * Solution: hash the natural key with a per-app salt to produce a short opaque
 * topic name. The hash is deterministic so both clients still arrive at the
 * same channel, but a third party watching topic metadata learns nothing.
 */

const SALT = "zivo:rt:v1"; // bump when invalidating all channel names

/**
 * SHA-256 hash, base64url-encoded, truncated to 22 chars (~128 bits of entropy).
 */
async function hashTopic(input: string): Promise<string> {
  const data = new TextEncoder().encode(`${SALT}|${input}`);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buf);
  // base64url
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 22);
}

const cache = new Map<string, string>();

async function memoHash(key: string): Promise<string> {
  const hit = cache.get(key);
  if (hit) return hit;
  const out = await hashTopic(key);
  cache.set(key, out);
  return out;
}

/**
 * Stable channel name for two users (order-independent). Use for 1:1 presence.
 *   topicForPair("alice", "bob") === topicForPair("bob", "alice")
 */
export async function topicForPair(userIdA: string, userIdB: string, kind = "presence"): Promise<string> {
  const sorted = [userIdA, userIdB].sort().join(":");
  const h = await memoHash(`pair:${kind}:${sorted}`);
  return `${kind}:${h}`;
}

/**
 * Channel name for a group resource (group chat, group call, etc.).
 */
export async function topicForGroup(groupId: string, kind = "group"): Promise<string> {
  const h = await memoHash(`group:${kind}:${groupId}`);
  return `${kind}:${h}`;
}

/**
 * Channel name for a single user's private events (personal notifications,
 * incoming-call signalling, etc.).
 */
export async function topicForUser(userId: string, kind = "user"): Promise<string> {
  const h = await memoHash(`user:${kind}:${userId}`);
  return `${kind}:${h}`;
}

// ── Synchronous variants ─────────────────────────────────────────────────────
//
// Some call sites (event handlers like `pc.onicecandidate`) cannot await.
// We use FNV-1a 64-bit (split into two 32-bit halves) — not cryptographic, but
// the goal is *opacity*, not unforgeability. The salt + 64-bit output is more
// than enough to stop a casual observer from recovering the raw ID.

function fnv1a(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x84222325;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 ^= c;
    h2 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = Math.imul(h2, 0x01000193) >>> 0;
    // mix the two halves
    h1 = (h1 + (h2 << 5)) >>> 0;
    h2 = (h2 + (h1 << 7)) >>> 0;
  }
  return h1.toString(36).padStart(7, "0") + h2.toString(36).padStart(7, "0");
}

const syncCache = new Map<string, string>();
function memoFnv(key: string): string {
  const hit = syncCache.get(key);
  if (hit) return hit;
  const out = fnv1a(`${SALT}|${key}`);
  syncCache.set(key, out);
  return out;
}

export function topicForGroupSync(groupId: string, kind = "group"): string {
  return `${kind}:${memoFnv(`group:${kind}:${groupId}`)}`;
}

export function topicForPairSync(userIdA: string, userIdB: string, kind = "presence"): string {
  const sorted = [userIdA, userIdB].sort().join(":");
  return `${kind}:${memoFnv(`pair:${kind}:${sorted}`)}`;
}

export function topicForUserSync(userId: string, kind = "user"): string {
  return `${kind}:${memoFnv(`user:${kind}:${userId}`)}`;
}
