/**
 * Contract tests for the client-side passcode/two-step hasher. Plain secrets
 * never leave the device — only this PBKDF2-SHA256 output does — so the
 * algorithm, the 200k iteration count, and the salt handling are security
 * load-bearing. A silent drop to fewer iterations or a different hash would
 * weaken every stored passcode without any visible failure. The expected digest
 * below was computed by an independent implementation (node:crypto pbkdf2) so a
 * drift in the WebCrypto path fails loudly.
 */
import { describe, it, expect } from "vitest";
import { generateSalt, hashSecret, verifySecret } from "./passwordHash";

// Reproducible vector: salt bytes = ASCII "0123456789abcdef" (16 bytes),
// plain = "hunter2", PBKDF2-HMAC-SHA256, 200000 iterations, 32-byte output.
const KNOWN_SALT_B64 = "MDEyMzQ1Njc4OWFiY2RlZg==";
const KNOWN_HASH_B64 = "hLKep55MU6b1TXfm+tN3J2px5Je7Si5oYKK0dsjwH1Y=";

describe("generateSalt", () => {
  it("produces 16 random bytes, base64-encoded", () => {
    const salt = generateSalt();
    expect(atob(salt)).toHaveLength(16);
  });

  it("is non-deterministic across calls", () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });
});

describe("hashSecret", () => {
  it("matches the independent PBKDF2-SHA256 (200k) reference vector", async () => {
    expect(await hashSecret("hunter2", KNOWN_SALT_B64)).toBe(KNOWN_HASH_B64);
  });

  it("derives a 256-bit digest (44 base64 chars)", async () => {
    expect(await hashSecret("hunter2", KNOWN_SALT_B64)).toHaveLength(44);
  });

  it("is deterministic for the same secret + salt", async () => {
    const a = await hashSecret("s3cret", KNOWN_SALT_B64);
    const b = await hashSecret("s3cret", KNOWN_SALT_B64);
    expect(a).toBe(b);
  });

  it("salts the digest — same secret, different salt, different hash", async () => {
    const a = await hashSecret("s3cret", KNOWN_SALT_B64);
    const b = await hashSecret("s3cret", generateSalt());
    expect(a).not.toBe(b);
  });
});

describe("verifySecret", () => {
  it("accepts the correct secret against its stored hash", async () => {
    const salt = generateSalt();
    const hash = await hashSecret("correct horse", salt);
    expect(await verifySecret("correct horse", salt, hash)).toBe(true);
  });

  it("rejects a wrong secret", async () => {
    const salt = generateSalt();
    const hash = await hashSecret("correct horse", salt);
    expect(await verifySecret("Correct horse", salt, hash)).toBe(false);
  });

  it("rejects a hash of the wrong length without throwing", async () => {
    expect(await verifySecret("hunter2", KNOWN_SALT_B64, "tooShort")).toBe(false);
  });
});
