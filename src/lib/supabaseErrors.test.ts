/**
 * Contract tests for the Supabase error categorizer + retry helper.
 * Every userMessage in the categorizer is something users see when a
 * request fails — wrong copy or wrong retryability flag turns into
 * either silent retries that never recover or hard failures we could
 * have recovered from.
 */
import { describe, it, expect, vi } from "vitest";
import {
  categorizeError,
  formatErrorForLog,
  isOnline,
  withRetry,
} from "./supabaseErrors";

describe("categorizeError — network failures", () => {
  it("classifies fetch TypeErrors as retryable network errors", () => {
    const err = new TypeError("Failed to fetch");
    const info = categorizeError(err);
    expect(info.type).toBe("network");
    expect(info.isRetryable).toBe(true);
    expect(info.userMessage).toMatch(/internet connection/i);
  });

  it("classifies AbortError DOMException as a timeout network error", () => {
    const abortErr = new DOMException("aborted", "AbortError");
    const info = categorizeError(abortErr);
    expect(info.type).toBe("network");
    expect(info.isRetryable).toBe(true);
    expect(info.message).toBe("Request timed out");
  });
});

describe("categorizeError — auth / permission", () => {
  it("treats 401 as a non-retryable auth error with sign-in message", () => {
    const info = categorizeError({ status: 401, message: "JWT expired" });
    expect(info.type).toBe("auth");
    expect(info.isRetryable).toBe(false);
    expect(info.userMessage).toMatch(/sign in/i);
  });

  it("treats PGRST301 (no auth) as auth error", () => {
    const info = categorizeError({ code: "PGRST301", message: "no auth" });
    expect(info.type).toBe("auth");
    expect(info.isRetryable).toBe(false);
  });

  it("treats 403 (RLS denied) as non-retryable auth-class error", () => {
    const info = categorizeError({ status: 403 });
    expect(info.type).toBe("auth");
    expect(info.isRetryable).toBe(false);
    expect(info.userMessage).toMatch(/access denied/i);
  });
});

describe("categorizeError — rate limit + 5xx", () => {
  it("classifies 429 as a retryable rate_limit error", () => {
    const info = categorizeError({ status: 429 });
    expect(info.type).toBe("rate_limit");
    expect(info.isRetryable).toBe(true);
    expect(info.userMessage).toMatch(/too many requests/i);
  });

  it("classifies 502 / 503 / 504 as retryable network errors", () => {
    for (const status of [502, 503, 504]) {
      const info = categorizeError({ status });
      expect(info.type).toBe("network");
      expect(info.isRetryable).toBe(true);
    }
  });

  it("falls back to a generic 5xx database error for any other status ≥ 500", () => {
    const info = categorizeError({ status: 500, message: "boom" });
    expect(info.type).toBe("database");
    expect(info.isRetryable).toBe(true);
  });
});

describe("categorizeError — database / constraint errors", () => {
  it("matches PGRST* codes as retryable database errors", () => {
    const info = categorizeError({ code: "PGRST116", message: "no rows" });
    expect(info.type).toBe("database");
    expect(info.isRetryable).toBe(true);
  });

  it("matches PostgreSQL 23* (integrity violation) codes as database errors", () => {
    const info = categorizeError({ code: "23505", message: "unique_violation" });
    expect(info.type).toBe("database");
    expect(info.isRetryable).toBe(true);
  });
});

describe("categorizeError — unknown / fallback", () => {
  it("returns 'unknown' with generic message when the shape doesn't match", () => {
    const info = categorizeError({ message: "weird thing" });
    expect(info.type).toBe("unknown");
    expect(info.isRetryable).toBe(true);
    expect(info.userMessage).toMatch(/something went wrong/i);
  });

  it("stringifies primitive throws into the message", () => {
    const info = categorizeError("string-shaped error");
    expect(info.type).toBe("unknown");
    expect(info.message).toBe("string-shaped error");
  });

  it("never throws on null / undefined input", () => {
    expect(() => categorizeError(null)).not.toThrow();
    expect(() => categorizeError(undefined)).not.toThrow();
  });
});

describe("formatErrorForLog", () => {
  it("prefixes the message with the error type", () => {
    const info = categorizeError({ status: 429 });
    expect(formatErrorForLog(info)).toBe("[rate_limit] Rate limited");
  });
});

describe("isOnline", () => {
  it("returns a boolean (truthy unless navigator says we're offline)", () => {
    expect(typeof isOnline()).toBe("boolean");
  });
});

describe("withRetry", () => {
  it("returns the result on first success without retrying", async () => {
    const op = vi.fn().mockResolvedValue("ok");
    const r = await withRetry(op, { baseDelayMs: 0 });
    expect(r.data).toBe("ok");
    expect(r.error).toBeNull();
    expect(r.attempts).toBe(1);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries up to maxAttempts on retryable errors", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce("eventually-ok");
    const r = await withRetry(op, { maxAttempts: 3, baseDelayMs: 0 });
    expect(r.data).toBe("eventually-ok");
    expect(r.error).toBeNull();
    expect(r.attempts).toBe(3);
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("stops immediately on non-retryable errors (e.g. 401)", async () => {
    const op = vi.fn().mockRejectedValue({ status: 401 });
    const r = await withRetry(op, { maxAttempts: 5, baseDelayMs: 0 });
    expect(r.data).toBeNull();
    expect(r.error?.type).toBe("auth");
    expect(r.attempts).toBe(1);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("reports the final error after maxAttempts retryable failures", async () => {
    const op = vi.fn().mockRejectedValue(new TypeError("fetch fail"));
    const r = await withRetry(op, { maxAttempts: 2, baseDelayMs: 0 });
    expect(r.data).toBeNull();
    expect(r.error?.type).toBe("network");
    expect(r.attempts).toBe(2);
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("invokes onRetry between attempts but not after the final failure", async () => {
    const onRetry = vi.fn();
    const op = vi.fn().mockRejectedValue(new TypeError("fetch fail"));
    await withRetry(op, { maxAttempts: 3, baseDelayMs: 0, onRetry });
    // Retries between attempts 1→2 and 2→3, but not after attempt 3 (final).
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});
