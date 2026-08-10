import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "supabase/functions/supplier-proxy/index.ts"),
  "utf8",
);
const modalSource = readFileSync(
  path.join(process.cwd(), "src/components/admin/store/autorepair/SupplierBrowserModal.tsx"),
  "utf8",
);

describe("supplier proxy messaging", () => {
  it("pins iframe messages to the app origin and rejects cross-origin input", () => {
    expect(source).toContain("var _parentOrigin = window.location.origin;");
    expect(source).toContain("if (e.origin !== _parentOrigin) return;");
    expect(source).not.toMatch(/postMessage\([^)]*,\s*['"]\*['"]\)/);
  });

  it("does not execute supplier HTML inside the Admin origin", () => {
    expect(modalSource).toContain("const SUPPLIER_EMBED_ENABLED = false;");
    expect(modalSource).not.toContain("allow-same-origin");
    expect(modalSource).toContain("ev.source !== iframeRef.current?.contentWindow");
  });

  it("never sends supplier passwords to the application database", () => {
    expect(modalSource).not.toContain('select("email,password');
    expect(modalSource).not.toContain("saveCredsRemote");
    expect(modalSource).not.toContain("clearCredsRemote");
    expect(modalSource).toContain("Passwords are entered for");
    expect(modalSource).toContain("never synced to the application database");
  });

  it("revalidates redirects and never shares supplier cookies", () => {
    expect(source).toContain('redirect: "manual"');
    expect(source).toContain("MAX_REDIRECTS = 3");
    expect(source).toContain("REDIRECT_HOST_NOT_ALLOWED");
    expect(source).not.toContain('redirect: "follow"');
    expect(source).not.toContain('req.headers.get("cookie")');
    expect(source).toContain('if (k.toLowerCase() === "set-cookie") return;');
    expect(source).toContain('candidate.protocol === "https:"');
  });
});
