/**
 * Server-only helpers for the custom ZIVO email OTP flows.
 *
 * OTP codes are deliberately never persisted as plaintext. The HMAC binds a
 * one-time code to its database record, recipient, purpose, and (where
 * applicable) authenticated account, so a code from one flow cannot be
 * replayed into another.
 */

export const EMAIL_OTP_PURPOSES = [
  "signup",
  "new_device",
  "password_change",
  "email_verification",
] as const;

export type EmailOtpPurpose = typeof EMAIL_OTP_PURPOSES[number];

export type EmailOtpHmacInput = {
  id: string;
  email: string;
  purpose: EmailOtpPurpose;
  userId: string | null;
  code: string;
};

const OTP_HMAC_SECRET_MIN_BYTES = 32;
const OTP_HMAC_VERSION = "zivo-email-otp-v1";

export function normalizeOtpEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmailOtpPurpose(value: unknown): value is EmailOtpPurpose {
  return typeof value === "string" && (EMAIL_OTP_PURPOSES as readonly string[]).includes(value);
}

export function generateEmailOtpCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

export function requireOtpHmacSecret(value = Deno.env.get("OTP_CODE_HMAC_SECRET")): string {
  const secret = value?.trim() ?? "";
  if (new TextEncoder().encode(secret).byteLength < OTP_HMAC_SECRET_MIN_BYTES) {
    throw new Error("OTP_CODE_HMAC_SECRET must be configured with at least 32 random bytes");
  }
  return secret;
}

export function otpHmacPayload(input: EmailOtpHmacInput): string {
  return [
    OTP_HMAC_VERSION,
    input.id,
    normalizeOtpEmail(input.email),
    input.purpose,
    input.userId ?? "",
    input.code,
  ].join("\u001f");
}

export async function hmacEmailOtpCode(secret: string, input: EmailOtpHmacInput): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(otpHmacPayload(input)));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Fixed-length HMAC comparison without exposing a prefix timing oracle. */
export function timingSafeEqualOtpHmac(left: string | null | undefined, right: string): boolean {
  if (!left || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
