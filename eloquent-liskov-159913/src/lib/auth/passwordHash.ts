/**
 * Client-side password hashing for two-step + passcode.
 * PBKDF2-SHA256 (200k iterations) via WebCrypto. Salt = 16 random bytes (base64).
 * Plain passwords are never sent to the server.
 */

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return bufToB64(arr.buffer);
}

export async function hashSecret(plain: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(plain),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: b64ToBuf(saltB64),
      iterations: 200_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return bufToB64(bits);
}

export async function verifySecret(plain: string, saltB64: string, expectedHashB64: string): Promise<boolean> {
  const candidate = await hashSecret(plain, saltB64);
  // constant-time-ish compare
  if (candidate.length !== expectedHashB64.length) return false;
  let mismatch = 0;
  for (let i = 0; i < candidate.length; i++) {
    mismatch |= candidate.charCodeAt(i) ^ expectedHashB64.charCodeAt(i);
  }
  return mismatch === 0;
}
