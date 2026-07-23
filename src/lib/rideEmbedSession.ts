interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "zivo_ride_embed_parent_session";
const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;

interface StoredParentSession {
  userId: string;
  token: string;
}

function createToken(): string {
  return crypto.randomUUID();
}

function parseStoredParentSession(value: string | null): StoredParentSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredParentSession>;
    if (typeof parsed.userId !== "string" || typeof parsed.token !== "string") return null;
    if (!parsed.userId || !TOKEN_RE.test(parsed.token)) return null;
    return { userId: parsed.userId, token: parsed.token };
  } catch {
    return null;
  }
}

/**
 * One opaque token per authenticated parent user and browser tab. Switching
 * Zivosmedia accounts rotates the token, forcing the embedded Ride session to
 * reconcile before protected content renders.
 */
export function getOrCreateRideEmbedSession(
  userId: string,
  storage: SessionStorageLike = window.sessionStorage,
  generateToken: () => string = createToken,
): string {
  try {
    const existing = parseStoredParentSession(storage.getItem(STORAGE_KEY));
    if (existing?.userId === userId) return existing.token;
  } catch {
    // A storage-restricted browser still gets a fail-safe, per-mount token.
  }

  const token = generateToken();
  if (!TOKEN_RE.test(token)) throw new Error("Invalid Ride embed session token");
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ userId, token } satisfies StoredParentSession));
  } catch {
    // The child will reconcile again on a later mount if storage is blocked.
  }
  return token;
}
