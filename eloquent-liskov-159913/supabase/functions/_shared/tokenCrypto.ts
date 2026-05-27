/**
 * AES-GCM encryption for OAuth access tokens stored in the database.
 *
 * Requires TOKEN_ENCRYPTION_KEY env var: base64-encoded 32-byte key.
 * Generate once with:  openssl rand -base64 32
 *
 * Stored format:  "enc:<base64(iv + ciphertext)>"
 * Tokens that don't start with "enc:" are treated as legacy plaintext
 * and returned as-is so existing rows keep working during migration.
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const PREFIX = "enc:";

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY not configured");
  const bytes = Uint8Array.from(atob(raw.trim()), c => c.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return crypto.subtle.importKey("raw", bytes, ALGORITHM, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(token: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(token),
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return PREFIX + btoa(String.fromCharCode(...combined));
}

export async function decryptToken(stored: string): Promise<string> {
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const key = await getKey();
  const combined = Uint8Array.from(atob(stored.slice(PREFIX.length)), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: combined.slice(0, IV_LENGTH) },
    key,
    combined.slice(IV_LENGTH),
  );
  return new TextDecoder().decode(decrypted);
}
