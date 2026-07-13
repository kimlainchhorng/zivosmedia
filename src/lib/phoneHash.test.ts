/**
 * Contract tests for privacy-preserving phone hashing. hashPhoneE164 is what lets
 * two users discover they share a contact WITHOUT either side uploading a plaintext
 * number: only the SHA-256 hex digest of the normalized number leaves the device.
 * So two properties are load-bearing. (1) Determinism + normalization: the SAME
 * human number written different ways ("+1 415 555 2671", "  +14155552671  ") must
 * collapse to the SAME hash, or a real contact match is silently missed. (2) The
 * digest/encoding (SHA-256, 64-char lowercase hex) must not drift, or every already
 * computed hash stops matching. Expected hashes were ground-truthed by node:crypto's
 * createHash — a DIFFERENT implementation from the module's crypto.subtle path, which
 * must agree by FIPS 180-4 — and the empty-input vector is the canonical published
 * SHA-256 of "".
 */
import { describe, it, expect } from "vitest";
import { hashPhoneE164 } from "./phoneHash";

// Independent SHA-256 hex reference vectors (node:crypto, not crypto.subtle).
const HASH_US = "cb6880e416769253645cb9c6b8989154bf66a56a77fc14c81fb1019663cbb928";
const HASH_UK = "e631c2534428c6c9b48c2167604a8983046085e43a2c00ed748733c544c0bb4d";
const HASH_VANITY = "0fedee3be192e94b5a76823c64a9e61e6b62275ba12b85ab01f12cc86abf4b60";
// Canonical, universally published SHA-256 of the empty string.
const HASH_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("hashPhoneE164 — SHA-256 hex reference vectors", () => {
  it("matches the independent node:crypto vectors", async () => {
    expect(await hashPhoneE164("+14155552671")).toBe(HASH_US);
    expect(await hashPhoneE164("+442071838750")).toBe(HASH_UK);
  });

  it("hashes empty input to the canonical SHA-256 of the empty string", async () => {
    expect(await hashPhoneE164("")).toBe(HASH_EMPTY);
    expect(await hashPhoneE164("   ")).toBe(HASH_EMPTY); // all-whitespace normalizes to ""
  });

  it("emits a 64-char lowercase hex digest", async () => {
    const h = await hashPhoneE164("+14155552671");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("normalization collapses formatting variants to one hash", () => {
  it("ignores internal spaces, leading/trailing padding, tabs and newlines", async () => {
    expect(await hashPhoneE164("+1 415 555 2671")).toBe(HASH_US);
    expect(await hashPhoneE164("  +14155552671  ")).toBe(HASH_US);
    expect(await hashPhoneE164("+1\t415\n555 2671")).toBe(HASH_US);
  });

  it("is case-insensitive (lower-cases before hashing)", async () => {
    expect(await hashPhoneE164("+1800FLOWERS")).toBe(HASH_VANITY);
    expect(await hashPhoneE164("+1800flowers")).toBe(HASH_VANITY);
  });

  it("is deterministic across calls", async () => {
    expect(await hashPhoneE164("+14155552671")).toBe(await hashPhoneE164("+14155552671"));
  });

  it("gives different numbers different hashes (no trivial collision)", async () => {
    expect(await hashPhoneE164("+14155552671")).not.toBe(await hashPhoneE164("+442071838750"));
  });
});
