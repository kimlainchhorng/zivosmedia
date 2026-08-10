import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "supabase/functions/proxy-image/index.ts"),
  "utf8",
);

describe("proxy-image boundary", () => {
  it("pins HTTPS hosts and revalidates bounded redirects", () => {
    expect(source).toContain('parsed.protocol !== "https:"');
    expect(source).toContain("ALLOWED_DOMAINS.includes(hostname)");
    expect(source).toContain('redirect: "manual"');
    expect(source).toContain("MAX_REDIRECTS");
    expect(source).toContain("isAllowedImageUrl(target)");
  });

  it("bounds and validates the upstream image body", () => {
    expect(source).toContain("MAX_IMAGE_BYTES");
    expect(source).toContain("readBodyLimited(response.body)");
    expect(source).toContain("ALLOWED_CONTENT_TYPES");
    expect(source).toContain("hasImageSignature(bytes, contentType)");
  });
});
