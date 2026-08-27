import { parseCutluySignatureHeader } from "./cutluyPolicy.mjs";

const encoder = new TextEncoder();
const MAX_WEBHOOK_BODY_BYTES = 64 * 1_024;
const CUTLUY_REPLAY_WINDOW_SECONDS = 5 * 60;

/** Parses lowercase/uppercase hex. Returns null for odd length or non-hex. */
export function hexToBytes(value: string): Uint8Array | null {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/** Constant-time for equal-length valid digests; malformed input fails closed. */
export function constantTimeHexEqual(left: string, right: string): boolean {
  const leftBytes = hexToBytes(left);
  const rightBytes = hexToBytes(right);
  if (!leftBytes || !rightBytes || leftBytes.length !== rightBytes.length)
    return false;

  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function signedPayload(
  timestampSeconds: number,
  rawBody: string | Uint8Array,
): Uint8Array {
  const prefix = encoder.encode(`${timestampSeconds}.`);
  const body = typeof rawBody === "string" ? encoder.encode(rawBody) : rawBody;
  const payload = new Uint8Array(prefix.length + body.length);
  payload.set(prefix);
  payload.set(body, prefix.length);
  return payload;
}

/**
 * Verify CutLuy's HMAC against the exact, unparsed request body.
 *
 * Callers must read `request.text()` or `request.arrayBuffer()` before JSON
 * parsing, pass those untouched bytes here, and parse only after this returns
 * true. No secret or signature value is logged by this helper.
 */
export async function verifyCutluyWebhookSignature(
  webhookSecret: string,
  rawBody: string | Uint8Array,
  signatureHeader: string | null,
  nowMs = Date.now(),
): Promise<boolean> {
  if (typeof webhookSecret !== "string" || webhookSecret.length === 0)
    return false;

  const body = typeof rawBody === "string" ? encoder.encode(rawBody) : rawBody;
  if (
    !(body instanceof Uint8Array) ||
    body.length === 0 ||
    body.length > MAX_WEBHOOK_BODY_BYTES
  ) {
    return false;
  }

  const signature = parseCutluySignatureHeader(signatureHeader);
  if (
    !signature ||
    !Number.isFinite(nowMs) ||
    Math.abs(nowMs / 1_000 - signature.timestampSeconds) >=
      CUTLUY_REPLAY_WINDOW_SECONDS
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    signedPayload(signature.timestampSeconds, body),
  );

  return constantTimeHexEqual(
    signature.signatureHex,
    toHex(new Uint8Array(digest)),
  );
}
