/**
 * Contract tests for the client-side rate limiter + progressive auth
 * lockout. This is the second line of defense behind server-side rate
 * limits; regressions here let brute-force attempts and runaway clients
 * through unnoticed until the server bears the load.
 *
 * Each test uses a unique key/action string so the module-level store
 * and sessionStorage don't leak state between cases.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  RateLimitError,
  checkRateLimit,
  recordAuthFailure,
  clearAuthLockout,
  formatLockout,
} from "./rateLimiter";

let counter = 0;
const uniqueAction = () => `t${Date.now()}_${++counter}`;

beforeEach(() => {
  vi.useRealTimers();
  try {
    sessionStorage.clear();
  } catch { /* ignore */ }
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RateLimitError", () => {
  it("carries retryAfter and the correct error name", () => {
    const err = new RateLimitError("too many", 42);
    expect(err.name).toBe("RateLimitError");
    expect(err.message).toBe("too many");
    expect(err.retryAfter).toBe(42);
    expect(err instanceof Error).toBe(true);
  });

  it("retryAfter is optional", () => {
    const err = new RateLimitError("no detail");
    expect(err.retryAfter).toBeUndefined();
  });
});

describe("checkRateLimit", () => {
  it("allows the first request and reports no retry-after", async () => {
    const key = `api:${uniqueAction()}`;
    const r = await checkRateLimit(key);
    expect(r.allowed).toBe(true);
    expect(r.retryAfter).toBe(0);
  });

  it("blocks once the per-category limit is exceeded", async () => {
    // 'search' category: 30 requests / 60s window
    const key = `search:${uniqueAction()}`;
    for (let i = 0; i < 30; i++) {
      const r = await checkRateLimit(key);
      expect(r.allowed).toBe(true);
    }
    const blocked = await checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("falls back to 'default' category for unknown prefixes", async () => {
    // 'default' allows 100 req / 60s — much higher than 'search'
    const key = `unknown_category:${uniqueAction()}`;
    // 60 requests would already trip 'search'; 'default' should allow them.
    for (let i = 0; i < 60; i++) {
      const r = await checkRateLimit(key);
      expect(r.allowed).toBe(true);
    }
  });

  it("isolates limits per key — separate keys do not share a budget", async () => {
    // 'search' allows 30; verify two keys each get their own 30.
    const keyA = `search:${uniqueAction()}`;
    const keyB = `search:${uniqueAction()}`;
    for (let i = 0; i < 30; i++) {
      await checkRateLimit(keyA);
    }
    // Key A is now at its limit. Key B should still be allowed.
    const r = await checkRateLimit(keyB);
    expect(r.allowed).toBe(true);
  });
});

describe("recordAuthFailure + progressive lockout", () => {
  it("returns null for the first few failures (below tier 1)", () => {
    const action = uniqueAction();
    for (let i = 0; i < 4; i++) {
      expect(recordAuthFailure(action)).toBeNull();
    }
  });

  it("locks for ~30s on the 5th failure (tier 1)", () => {
    const action = uniqueAction();
    for (let i = 0; i < 4; i++) recordAuthFailure(action);
    const lockSeconds = recordAuthFailure(action);
    expect(lockSeconds).toBe(30);
  });

  it("escalates to tier 2 (~120s / 2 min) at 10 failures", () => {
    const action = uniqueAction();
    for (let i = 0; i < 9; i++) recordAuthFailure(action);
    expect(recordAuthFailure(action)).toBe(120);
  });

  it("escalates to tier 3 (~600s / 10 min) at 15 failures", () => {
    const action = uniqueAction();
    for (let i = 0; i < 14; i++) recordAuthFailure(action);
    expect(recordAuthFailure(action)).toBe(600);
  });

  it("escalates to tier 4 (~1800s / 30 min) at 20+ failures", () => {
    const action = uniqueAction();
    for (let i = 0; i < 19; i++) recordAuthFailure(action);
    expect(recordAuthFailure(action)).toBe(1800);
  });

  // Regression, ported from ZIVO-CHAT (7fab858). The attempt window is 15
  // minutes but tier 4 locks for 30, and getLockoutState used to clear the
  // whole record once the window elapsed -- taking the still-active lockedUntil
  // with it and releasing a 20+-attempt attacker ~15 minutes early.
  it("keeps the 30-minute lockout enforced past the 15-minute window boundary", async () => {
    const action = uniqueAction();
    const base = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(base);
    try {
      for (let i = 0; i < 20; i++) recordAuthFailure(action);

      nowSpy.mockReturnValue(base + 14 * 60 * 1000); // inside the attempt window
      expect((await checkRateLimit(`auth:${action}`)).allowed).toBe(false);

      nowSpy.mockReturnValue(base + 16 * 60 * 1000); // window gone, lockout should remain
      const midway = await checkRateLimit(`auth:${action}`);
      expect(midway.allowed).toBe(false);
      expect(midway.retryAfter).toBeGreaterThan(0);

      nowSpy.mockReturnValue(base + 31 * 60 * 1000); // lockout fully elapsed
      expect((await checkRateLimit(`auth:${action}`)).allowed).toBe(true);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("checkRateLimit honors the progressive lockout for auth keys", async () => {
    const action = uniqueAction();
    for (let i = 0; i < 5; i++) recordAuthFailure(action);
    // Same action name, but accessed via the rate-limit "auth" prefix.
    const r = await checkRateLimit(`auth:${action}`);
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
    expect(r.retryAfter).toBeLessThanOrEqual(30);
  });

  it("clearAuthLockout removes the lockout state for that action", async () => {
    const action = uniqueAction();
    for (let i = 0; i < 5; i++) recordAuthFailure(action);
    expect((await checkRateLimit(`auth:${action}`)).allowed).toBe(false);

    clearAuthLockout(action);

    expect((await checkRateLimit(`auth:${action}`)).allowed).toBe(true);
  });
});

describe("formatLockout", () => {
  it("uses seconds for sub-minute values", () => {
    expect(formatLockout(1)).toBe("1 second");
    expect(formatLockout(30)).toBe("30 seconds");
    expect(formatLockout(59)).toBe("59 seconds");
  });

  it("switches to minutes at 60s and pluralizes correctly", () => {
    expect(formatLockout(60)).toBe("1 minute");
    expect(formatLockout(120)).toBe("2 minutes");
    expect(formatLockout(600)).toBe("10 minutes");
  });

  it("rounds up partial minutes (ceil), so a 61s lockout still reads '2 minutes'", () => {
    expect(formatLockout(61)).toBe("2 minutes");
  });
});
