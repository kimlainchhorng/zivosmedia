const OTP_DIGITS = 6;
const OTP_MODULUS = 1_000_000;
const UINT32_RANGE = 0x1_0000_0000;
const OTP_HASH_PREFIX = "sha256:";

const encoder = new TextEncoder();

export function generateOtpCode(): string {
  const random = new Uint32Array(1);
  const maxUnbiased = Math.floor(UINT32_RANGE / OTP_MODULUS) * OTP_MODULUS;
  let value = 0;

  do {
    crypto.getRandomValues(random);
    value = random[0];
  } while (value >= maxUnbiased);

  return String(value % OTP_MODULUS).padStart(OTP_DIGITS, "0");
}

export async function hashOtpCode(email: string, code: string): Promise<string> {
  const secret = otpHashSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${normalizeEmail(email)}:${code}`),
  );

  return `${OTP_HASH_PREFIX}${toHex(new Uint8Array(signature))}`;
}

export async function isOtpCodeMatch(
  storedCode: string,
  email: string,
  submittedCode: string,
): Promise<boolean> {
  if (storedCode.startsWith(OTP_HASH_PREFIX)) {
    return constantTimeEqual(storedCode, await hashOtpCode(email, submittedCode));
  }

  return constantTimeEqual(storedCode, submittedCode);
}

function otpHashSecret(): string {
  const secret =
    Deno.env.get("OTP_CODE_PEPPER")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ||
    Deno.env.get("RESEND_API_KEY")?.trim();

  if (!secret) {
    throw new Error("OTP hash secret not configured");
  }

  return secret;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let i = 0; i < length; i += 1) {
    diff |= (leftBytes[i] ?? 0) ^ (rightBytes[i] ?? 0);
  }

  return diff === 0;
}
