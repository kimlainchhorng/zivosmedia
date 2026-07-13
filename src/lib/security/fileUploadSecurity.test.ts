// Security pins for the client-side file-upload validation (defence-in-depth;
// the server in fileUpload.ts is authoritative). Exercised surface: the pure
// `validateFileClient(file, category)` and `verifyMagicBytes(header, mime)`.
// Load-bearing properties guarded here:
//   1. Filename safety — reject path separators (/ \), control chars
//      (0x00-0x1F, 0x7F) and any ".." run (path-traversal / null-byte defense).
//   2. Blocked-extension polyglot defense — the name is lower-cased and EVERY
//      ".<alnum>" run is matched, so "photo.php.png" trips on ".php" and
//      "SCRIPT.JS" on ".js"; script/markup extensions (.svg/.html/.js…) are
//      blocked even when their MIME would otherwise be acceptable.
//   3. MIME allowlist is gated on a TRUTHY file.type. An empty file.type
//      deliberately skips the allowlist (relying on the extension blocklist +
//      server authority) — that shipped tradeoff is pinned, not endorsed; see
//      the owner hardening chip raised alongside this slice.
//   4. Per-category size cap + zero-byte rejection.
//   5. verifyMagicBytes — skip (true) for a declaredMime with no signature
//      entry; false when the header is too short to match. WebP intentionally
//      checks only the RIFF prefix (documented limitation; server re-validates).
// Verified against an independent clean-room oracle. No correctness bug was
// found in the reviewed logic (DeepSeek + MiMo) — these tests pin current
// behavior; MiMo's defence-in-depth notes are tracked as an owner-facing chip.
import { describe, it, expect } from "vitest";
import {
  validateFileClient,
  verifyMagicBytes,
  type FileCategory,
} from "./fileUploadSecurity";

const mkFile = (name: string, opts: { type?: string; size?: number } = {}): File => {
  const parts = opts.size != null ? [new Uint8Array(opts.size)] : ["x"];
  return new File(parts, name, { type: opts.type ?? "" });
};

describe("validateFileClient — filename safety", () => {
  it("rejects a forward-slash path sequence", () => {
    expect(validateFileClient(mkFile("safe.txt/../../etc/passwd", { type: "text/plain" }), "document"))
      .toEqual({ ok: false, error: "File name contains an unsafe path sequence." });
  });
  it("rejects a backslash separator", () => {
    expect(validateFileClient(mkFile("a\\b.txt", { type: "text/plain" }), "document"))
      .toEqual({ ok: false, error: "File name contains an unsafe path sequence." });
  });
  it("rejects an embedded null byte", () => {
    // Build the name with String.fromCharCode(0) so the source stays pure ASCII
    // (no literal control byte) while the runtime filename carries a real NUL.
    const nulName = "evil" + String.fromCharCode(0) + ".jpg";
    expect(validateFileClient(mkFile(nulName, { type: "image/jpeg" }), "image"))
      .toEqual({ ok: false, error: "File name contains an unsafe path sequence." });
  });
  it("rejects a '..' sequence even without a separator", () => {
    expect(validateFileClient(mkFile("a..b.png", { type: "image/png" }), "image"))
      .toEqual({ ok: false, error: "File name contains an unsafe path sequence." });
  });
  it("rejects a blank name", () => {
    expect(validateFileClient(mkFile("   ", { type: "image/png" }), "image"))
      .toEqual({ ok: false, error: "File name is required." });
  });
  it("rejects an over-long name (>180 chars)", () => {
    expect(validateFileClient(mkFile("a".repeat(181) + ".png", { type: "image/png" }), "image"))
      .toEqual({ ok: false, error: "File name is too long." });
  });
});

describe("validateFileClient — blocked-extension polyglot defense", () => {
  it("blocks photo.php.png on the inner .php", () => {
    expect(validateFileClient(mkFile("photo.php.png", { type: "image/png" }), "image"))
      .toEqual({ ok: false, error: 'File type ".php" is not allowed.' });
  });
  it("blocks an uppercase SCRIPT.JS on .js", () => {
    expect(validateFileClient(mkFile("SCRIPT.JS", { type: "text/plain" }), "document"))
      .toEqual({ ok: false, error: 'File type ".js" is not allowed.' });
  });
  it("blocks .svg (markup polyglot) despite image intent", () => {
    expect(validateFileClient(mkFile("logo.svg", { type: "image/svg+xml" }), "image"))
      .toEqual({ ok: false, error: 'File type ".svg" is not allowed.' });
  });
  it("blocks archive.tar.exe on .exe with empty MIME", () => {
    expect(validateFileClient(mkFile("archive.tar.exe"), "document"))
      .toEqual({ ok: false, error: 'File type ".exe" is not allowed.' });
  });
});

describe("validateFileClient — MIME allowlist", () => {
  it("rejects a pdf uploaded into the image category", () => {
    expect(validateFileClient(mkFile("doc.pdf", { type: "application/pdf" }), "image"))
      .toEqual({ ok: false, error: "image uploads must be: image/jpeg, image/png, image/webp, image/gif." });
  });
  it("skips the MIME check when file.type is empty (shipped tradeoff)", () => {
    expect(validateFileClient(mkFile("Makefile"), "document")).toEqual({ ok: true });
  });
  it("accepts a png in the avatar category", () => {
    expect(validateFileClient(mkFile("a.png", { type: "image/png" }), "avatar")).toEqual({ ok: true });
  });
});

describe("validateFileClient — size and zero-byte limits", () => {
  it("rejects an avatar above the 2 MB cap", () => {
    expect(validateFileClient(mkFile("a.png", { type: "image/png", size: 3 * 1024 * 1024 }), "avatar"))
      .toEqual({ ok: false, error: "File is too large. Maximum is 2 MB." });
  });
  it("accepts an avatar at exactly the 2 MB cap", () => {
    expect(validateFileClient(mkFile("a.png", { type: "image/png", size: 2 * 1024 * 1024 }), "avatar"))
      .toEqual({ ok: true });
  });
  it("rejects a zero-byte file", () => {
    expect(validateFileClient(mkFile("empty.txt", { type: "text/plain", size: 0 }), "document"))
      .toEqual({ ok: false, error: "File is empty." });
  });
});

describe("verifyMagicBytes", () => {
  it("skips (returns true) when the declaredMime has no signature entry", () => {
    expect(verifyMagicBytes(new Uint8Array([0x48, 0x65, 0x6c]), "text/plain")).toBe(true);
  });
  it("returns false when the header is too short to match", () => {
    expect(verifyMagicBytes(new Uint8Array([0xff, 0xd8]), "image/jpeg")).toBe(false);
  });
  it("returns true for a correct PNG signature", () => {
    expect(verifyMagicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]), "image/png")).toBe(true);
  });
  it("returns false for a wrong PNG signature", () => {
    expect(verifyMagicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x00]), "image/png")).toBe(false);
  });
  it("returns true for a correct PDF signature", () => {
    expect(verifyMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), "application/pdf")).toBe(true);
  });
  it("accepts a WebP on the RIFF prefix (documented defence-in-depth limitation)", () => {
    expect(verifyMagicBytes(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]), "image/webp")).toBe(true);
  });
});

// Type-level guard: FileCategory is the ALLOWED_MIME keyset. Referenced so a
// rename/removal of a category surfaces here at compile time.
const _categories: FileCategory[] = ["image", "document", "audio", "video", "avatar"];
void _categories;
