import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(resolve(process.cwd(), "supabase/functions", name), "utf8");

describe("auto-repair outbound email boundaries", () => {
  it("escapes reminder content before composing HTML", () => {
    const source = read("ar-reminders-dispatch/index.ts");
    expect(source).toContain('import { escapeHtml } from "../_shared/escapeHtml.ts";');
    expect(source).toContain("escapeHtml(body).replace");
    expect(source).toContain("headerSafe");
  });

  it("escapes estimate fields and never trusts request Origin for links", () => {
    const source = read("ar-estimate-send/index.ts");
    expect(source).toContain("escapeHtml(customerFirstName)");
    expect(source).toContain("escapeHtml(storeName)");
    expect(source).toContain("escapeHtml(url)");
    expect(source).toContain("AR_PUBLIC_APP_ORIGIN");
    expect(source).not.toContain('req.headers.get("Origin")');
  });
});
