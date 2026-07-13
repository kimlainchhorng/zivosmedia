import { describe, expect, it } from "vitest";

import { validateFileClient } from "@/lib/security/fileUploadSecurity";
import { validateUpload } from "../../supabase/functions/_shared/fileUpload";

const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

describe("file upload security validators", () => {
  it("rejects unsafe filenames before storage writes", async () => {
    await expect(validateUpload("../avatar.png", "image/png", 10, "image", pngHeader))
      .resolves.toMatchObject({ ok: false, reason: "File name contains an unsafe path sequence" });
    await expect(validateUpload("avatar.php.jpg", "image/jpeg", 10, "image", new Uint8Array([0xff, 0xd8, 0xff])))
      .resolves.toMatchObject({ ok: false, reason: 'File extension ".php" is not allowed' });
    await expect(validateUpload("empty.png", "image/png", 0, "image", pngHeader))
      .resolves.toMatchObject({ ok: false, reason: "File is empty" });
  });

  it("rejects active-content polyglot payload markers", async () => {
    const suspicious = new TextEncoder().encode("<svg onload=alert(1)></svg>");

    await expect(validateUpload("profile.png", "image/png", suspicious.length, "image", suspicious))
      .resolves.toMatchObject({ ok: false });
  });

  it("keeps client validation aligned with server filename checks", () => {
    expect(validateFileClient(new File(["x"], "avatar.php.jpg", { type: "image/jpeg" }), "image"))
      .toMatchObject({ ok: false, error: 'File type ".php" is not allowed.' });
    expect(validateFileClient(new File(["x"], "../avatar.png", { type: "image/png" }), "image"))
      .toMatchObject({ ok: false, error: "File name contains an unsafe path sequence." });
    expect(validateFileClient(new File([], "avatar.png", { type: "image/png" }), "image"))
      .toMatchObject({ ok: false, error: "File is empty." });
  });
});
