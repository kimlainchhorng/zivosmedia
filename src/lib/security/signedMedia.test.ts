/**
 * Contract tests for the pure helpers in signedMedia. These ship in every
 * signed-URL render path (chat media, PPV thumbnails, voice notes), so
 * regressions here surface as broken media across the app.
 *
 * The async `signedUrlFor` / `signedUrlsFor` paths are not covered here —
 * they need a Supabase client mock and live with the integration suites.
 */
import { describe, it, expect } from "vitest";
import {
  SIGNED_URL_TTL,
  pathFromPublicUrl,
  isStoragePath,
} from "./signedMedia";

describe("SIGNED_URL_TTL", () => {
  it("orders TTLs sensibly: thumbnail > download > display", () => {
    // Sanity ordering: thumbnails outlive a normal display URL (grid views
    // reuse them across renders), and downloads sit between to cover slow
    // user-initiated transfers without being indefinite.
    expect(SIGNED_URL_TTL.thumbnail).toBeGreaterThan(SIGNED_URL_TTL.display);
    expect(SIGNED_URL_TTL.download).toBeGreaterThan(SIGNED_URL_TTL.display);
  });

  it("returns positive second-count values for every purpose", () => {
    for (const purpose of Object.keys(SIGNED_URL_TTL) as Array<keyof typeof SIGNED_URL_TTL>) {
      expect(SIGNED_URL_TTL[purpose]).toBeGreaterThan(0);
    }
  });
});

describe("pathFromPublicUrl", () => {
  const bucket = "chat-media";
  const fullUrl = `https://abc123.supabase.co/storage/v1/object/public/${bucket}/user-42/foo.jpg`;

  it("extracts the storage path from a canonical public URL", () => {
    expect(pathFromPublicUrl(fullUrl, bucket)).toBe("user-42/foo.jpg");
  });

  it("returns null when the URL does not contain the bucket marker", () => {
    expect(
      pathFromPublicUrl("https://abc.supabase.co/storage/v1/object/public/other-bucket/x.jpg", bucket),
    ).toBeNull();
  });

  it("returns null for non-public URLs", () => {
    expect(pathFromPublicUrl("https://abc.supabase.co/some-other-path/x.jpg", bucket)).toBeNull();
    expect(pathFromPublicUrl("not a url", bucket)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(pathFromPublicUrl("", bucket)).toBeNull();
  });

  it("preserves nested paths with multiple segments", () => {
    const nested = `https://abc.supabase.co/storage/v1/object/public/${bucket}/a/b/c/d.png`;
    expect(pathFromPublicUrl(nested, bucket)).toBe("a/b/c/d.png");
  });

  it("survives query strings appended to the URL", () => {
    const withQuery = `${fullUrl}?t=123`;
    expect(pathFromPublicUrl(withQuery, bucket)).toBe("user-42/foo.jpg?t=123");
  });
});

describe("isStoragePath", () => {
  it("treats plain storage paths as paths", () => {
    expect(isStoragePath("user-42/foo.jpg")).toBe(true);
    expect(isStoragePath("a/b/c.png")).toBe(true);
    expect(isStoragePath("just-a-file.jpg")).toBe(true);
  });

  it("rejects every URL scheme it knows about", () => {
    expect(isStoragePath("https://example.com/foo.jpg")).toBe(false);
    expect(isStoragePath("http://example.com/foo.jpg")).toBe(false);
    expect(isStoragePath("blob:https://example.com/123")).toBe(false);
    expect(isStoragePath("data:image/png;base64,AAA")).toBe(false);
  });

  it("rejects empty / falsy input", () => {
    expect(isStoragePath("")).toBe(false);
  });
});
