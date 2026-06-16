/**
 * Contract tests for the pure exports of mediaType.ts — isVideoUrl and the
 * IMAGE_OR_VIDEO_ACCEPT constant.
 *
 * Expected values are grounded by an independent oracle that does NOT import the
 * module: a clean-room reimplementation re-derived from the documented rule (the
 * extension regex `\.(mp4|webm|mov|m4v|ogv)($|\?|#)`, case-insensitive, on the
 * trimmed URL). RegExp / String.trim are shared JS primitives; this vitest run
 * against the real module is the cross-check.
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - the `($|\?|#)` boundary: a video extension that ENDS the string matches
 *     ("img.jpg?file=clip.mp4" -> true), but one followed by "&" does NOT
 *     ("img.jpg?file=clip.mp4&x=1" -> false);
 *   - an extension followed by "." is rejected ("a.mp4.txt" -> false);
 *   - there must be a "." before the extension ("clipmp4" / "mp4" -> false);
 *   - the URL is trimmed and matching is case-insensitive ("UPPER.MOV",
 *     "  spaced.mov  ", "trailing.MP4   " -> true).
 */
import { describe, it, expect } from "vitest";
import { isVideoUrl, IMAGE_OR_VIDEO_ACCEPT } from "./mediaType";

describe("isVideoUrl — falsy inputs", () => {
  it("null -> false", () => expect(isVideoUrl(null)).toBe(false));
  it("undefined -> false", () => expect(isVideoUrl(undefined)).toBe(false));
  it("empty string -> false", () => expect(isVideoUrl("")).toBe(false));
});

describe("isVideoUrl — each of the 5 video extensions detected", () => {
  it("clip.mp4 -> true", () => expect(isVideoUrl("clip.mp4")).toBe(true));
  it("clip.MP4 -> true", () => expect(isVideoUrl("clip.MP4")).toBe(true));
  it("movie.webm -> true", () => expect(isVideoUrl("movie.webm")).toBe(true));
  it("video.mov -> true", () => expect(isVideoUrl("video.mov")).toBe(true));
  it("v.m4v -> true", () => expect(isVideoUrl("v.m4v")).toBe(true));
  it("loop.ogv -> true", () => expect(isVideoUrl("loop.ogv")).toBe(true));
});

describe("isVideoUrl — non-video extensions rejected", () => {
  it("photo.jpg -> false", () => expect(isVideoUrl("photo.jpg")).toBe(false));
  it("photo.png -> false", () => expect(isVideoUrl("photo.png")).toBe(false));
  it("song.mp3 -> false", () => expect(isVideoUrl("song.mp3")).toBe(false));
  it("doc.pdf -> false", () => expect(isVideoUrl("doc.pdf")).toBe(false));
  it("clip.avi -> false", () => expect(isVideoUrl("clip.avi")).toBe(false));
});

describe("isVideoUrl — query/hash boundary", () => {
  it("clip.mp4?token=1 -> true", () => expect(isVideoUrl("clip.mp4?token=1")).toBe(true));
  it("clip.mp4#t=10 -> true", () => expect(isVideoUrl("clip.mp4#t=10")).toBe(true));
  it("https://cdn.x/a/b/c.webm?v=2 -> true", () => expect(isVideoUrl("https://cdn.x/a/b/c.webm?v=2")).toBe(true));
});

describe("isVideoUrl — LOAD-BEARING contrast pair (ends-string vs mid-query)", () => {
  it("img.jpg?file=clip.mp4 -> true (extension ends the string)", () =>
    expect(isVideoUrl("img.jpg?file=clip.mp4")).toBe(true));
  it("img.jpg?file=clip.mp4&x=1 -> false (extension followed by '&')", () =>
    expect(isVideoUrl("img.jpg?file=clip.mp4&x=1")).toBe(false));
});

describe("isVideoUrl — extension-followed-by-dot rejections", () => {
  it("a.mp4.txt -> false", () => expect(isVideoUrl("a.mp4.txt")).toBe(false));
  it("a.mov.jpg -> false", () => expect(isVideoUrl("a.mov.jpg")).toBe(false));
});

describe("isVideoUrl — no-dot-boundary rejections", () => {
  it("clipmp4 -> false", () => expect(isVideoUrl("clipmp4")).toBe(false));
  it("mp4 -> false", () => expect(isVideoUrl("mp4")).toBe(false));
});

describe("isVideoUrl — trimming + case-insensitivity", () => {
  it(".mp4 -> true", () => expect(isVideoUrl(".mp4")).toBe(true));
  it("  spaced.mov  -> true", () => expect(isVideoUrl("  spaced.mov  ")).toBe(true));
  it("UPPER.MOV -> true", () => expect(isVideoUrl("UPPER.MOV")).toBe(true));
  it("trailing.MP4 (trailing spaces) -> true", () => expect(isVideoUrl("trailing.MP4   ")).toBe(true));
  it("https://x/movie.mov? -> true", () => expect(isVideoUrl("https://x/movie.mov?")).toBe(true));
  it("name.m4v#frag -> true", () => expect(isVideoUrl("name.m4v#frag")).toBe(true));
});

describe("IMAGE_OR_VIDEO_ACCEPT", () => {
  it('is exactly "image/*,video/*"', () => {
    expect(IMAGE_OR_VIDEO_ACCEPT).toBe("image/*,video/*");
  });
});
