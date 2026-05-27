/**
 * Hash a normalized phone number (E.164, lowercased) with SHA-256.
 * Used for privacy-preserving contact matching.
 */
export async function hashPhoneE164(phoneE164: string): Promise<string> {
  const norm = phoneE164.trim().toLowerCase().replace(/\s+/g, "");
  const data = new TextEncoder().encode(norm);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
