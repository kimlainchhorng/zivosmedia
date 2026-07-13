# MiMo advisor — Security review of client-side file-upload validation in src/lib/security/fileUploadSecurity.ts (defence-in-depth; server is authoritative). Focus: can any dangerous file pass validateFileClient? Check the filename path-traversal regex /[\\/\0-\x1F\x7F]/ + '..' check, the BLOCKED_EXTENSIONS polyglot handling via /\.[a-z0-9]+/g on the lowercased name (e.g. photo.php.png), the ALLOWED_MIME allowlist gated on truthy file.type, and verifyMagicBytes (returns true when declaredMime has no MAGIC entry, false when header too short). Report only real bugs or genuine gaps with exact inputs; otherwise confirm solid.

Files: src/lib/security/fileUploadSecurity.ts

## Findings

### P1 — Empty `file.type` silently skips the MIME allowlist

```js
if (file.type && !allowed.includes(file.type)) { ... }
```

When `file.type` is `""` (common on Linux, some OS/extension combos, or drag-drop edge cases), the truthy guard short-circuits and **the entire MIME check is bypassed**. Combined with a no-extension filename (which passes the `\.[a-z0-9]+` regex trivially), a file with arbitrary content sails through every client-side gate.

**Fix:** `if (!file.type || !allowed.includes(file.type))`

---

### P2 — `verifyMagicBytes` is never wired into `validateFileClient`

The function is exported but is async (needs `readFileHeader`), so `validateFileClient` never calls it. Any caller that only invokes `validateFileClient` gets zero magic-byte verification. This is the single biggest defence-in-depth gap — an attacker who controls `file.type` (trivial via tooling) and uses a safe extension can bypass content validation entirely.

**Fix:** Either make `validateFileClient` async with an optional `skipMagicBytes` flag, or document clearly that callers **must** chain `readFileHeader` + `verifyMagicBytes` after `validateFileClient`.

---

### P2 — MAGIC table covers only 5 of 16 allowed MIME types

JPEG, PNG, GIF, WebP, PDF are covered. Audio (`mpeg`, `ogg`, `wav`, `webm`), video (`mp4`, `webm`, `ogg`), and text (`plain`, `csv`) all hit the `if (!sig) return true` bail-out, meaning magic-byte checking is **always skipped** for those categories.

**Fix:** Add at least `audio/mpeg` (`[0x49,0x44,0x33]` ID3 / `[0xFF,0xFB]` syncword), `video/mp4` (`ftyp` at offset 4), and `audio/ogg` (`OggS`).

---

**Verdict:** The extension-blocking regex (extracts all `.[a-z0-9]+` tokens, catches `photo.php.png`) and the path-traversal checks are solid. The real risk is the empty-type + no-extension hole (P1) and the unwired magic-byte pipeline (P2). Server-side authority covers these, but they defeat the stated defence-in-depth goal.
