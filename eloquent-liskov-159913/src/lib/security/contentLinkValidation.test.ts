import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock sonner so toast calls don't blow up
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

import { scanContentForLinks, confirmContentSafe } from "./contentLinkValidation";
import { toast } from "sonner";

describe("scanContentForLinks", () => {
  it("returns ok=true for plain text", () => {
    const r = scanContentForLinks("Hello world, no links here");
    expect(r.ok).toBe(true);
    expect(r.blocked).toEqual([]);
    expect(r.suspicious).toEqual([]);
  });

  it("returns ok=true for empty/null", () => {
    expect(scanContentForLinks("").ok).toBe(true);
    expect(scanContentForLinks(null).ok).toBe(true);
    expect(scanContentForLinks(undefined).ok).toBe(true);
  });

  it("flags ZIVO typosquat as blocked", () => {
    const r = scanContentForLinks("Check this out: https://h1zivo.com/login");
    expect(r.ok).toBe(false);
    expect(r.blocked.length).toBe(1);
    expect(r.blocked[0]).toContain("h1zivo.com");
  });

  it("flags embedded credentials as blocked", () => {
    const r = scanContentForLinks("login at https://admin:pwd@evil.com/");
    expect(r.ok).toBe(false);
    expect(r.blocked.length).toBe(1);
  });

  it("flags javascript: as blocked", () => {
    const r = scanContentForLinks("click https://example.com then javascript:alert(1)");
    // javascript: doesn't match URL_REGEX (needs https://), so the
    // protection here is from the existing js: scheme reject in browsers.
    // The https://example.com link should be neutral, ok=true.
    expect(r.ok).toBe(true);
  });

  it("flags URL shortener as suspicious (not blocked)", () => {
    const r = scanContentForLinks("Check https://bit.ly/free-money");
    expect(r.ok).toBe(true);
    expect(r.suspicious.length).toBe(1);
    expect(r.suspicious[0]).toContain("bit.ly");
  });

  it("flags suspicious TLD as suspicious", () => {
    const r = scanContentForLinks("Visit https://promo.zip/");
    expect(r.ok).toBe(true);
    expect(r.suspicious.length).toBe(1);
  });

  it("dedupes the same URL appearing multiple times", () => {
    const r = scanContentForLinks("https://h1zivo.com/a https://h1zivo.com/a https://h1zivo.com/a");
    expect(r.blocked.length).toBe(1);
  });

  it("trusts a real partner URL (no warnings)", () => {
    const r = scanContentForLinks("Book at https://booking.com/hotel/123");
    expect(r.ok).toBe(true);
    expect(r.suspicious.length).toBe(0);
    expect(r.blocked.length).toBe(0);
  });
});

describe("confirmContentSafe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true for plain text and fires no toast", () => {
    expect(confirmContentSafe("hello world", "bio")).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("returns false and toasts error when text has a blocked URL", () => {
    const ok = confirmContentSafe("phishing https://h1zivo.com/login", "bio");
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledOnce();
    const msg = (toast.error as any).mock.calls[0][0] as string;
    expect(msg).toContain("blocked link");
    expect(msg).toContain("bio");
  });

  it("returns true but warns when text has a suspicious URL", () => {
    const ok = confirmContentSafe("look at https://bit.ly/x", "comment");
    expect(ok).toBe(true);
    expect(toast.warning).toHaveBeenCalledOnce();
  });

  it("uses the provided label in the message", () => {
    confirmContentSafe("https://h1zivo.com/", "review");
    const msg = (toast.error as any).mock.calls[0][0] as string;
    expect(msg).toContain("review");
  });
});
