import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");

describe("AR service-role authorization boundary", () => {
  it("does not authorize service-role writes from an unverified JWT payload", () => {
    for (const file of [
      "supabase/functions/ar-ro-archive/index.ts",
      "supabase/functions/ar-receipts-helper/index.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("Supabase-verified authentication");
      expect(source).not.toContain("accessToken.split(\".\")");
      expect(source).not.toContain("JSON.parse(atob(");
    }
  });
});
