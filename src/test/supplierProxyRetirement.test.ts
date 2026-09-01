import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const proxySource = readFileSync(
  path.join(process.cwd(), "supabase/functions/supplier-proxy/index.ts"),
  "utf8",
);
const modalSource = readFileSync(
  path.join(
    process.cwd(),
    "src/components/admin/store/autorepair/SupplierBrowserModal.tsx",
  ),
  "utf8",
);

describe("supplier proxy retirement", () => {
  it("keeps the compatibility endpoint behind both user and blocklist checks", () => {
    expect(proxySource).toContain("requireUser(req)");
    expect(proxySource).toContain("requireUserNotBlocked(auth.userId)");
    expect(proxySource).toContain('withSecurity("supplier-proxy"');
    expect(proxySource).toContain("strictCors: true");
    expect(proxySource).toContain('allowedMethods: ["GET", "POST"]');
  });

  it("returns one deterministic, non-cacheable retirement response", () => {
    expect(proxySource).toContain(
      'JSON.stringify({ error: "SUPPLIER_PROXY_RETIRED" })',
    );
    expect(proxySource).toContain("status: 410");
    expect(proxySource).toContain('"Cache-Control": "no-store, max-age=0"');
  });

  it("has no outbound network, request relay, or third-party HTML sink", () => {
    expect(proxySource).not.toMatch(/\bfetch\s*\(/);
    expect(proxySource).not.toContain("ALLOWED_HOSTS");
    expect(proxySource).not.toContain("arrayBuffer");
    expect(proxySource).not.toContain("redirect:");
    expect(proxySource).not.toContain("postMessage");
    expect(proxySource).not.toContain("Set-Cookie");
  });

  it("uses only the real HTTPS supplier site from the Admin UI", () => {
    expect(modalSource).toContain('parsed.protocol === "https:"');
    expect(modalSource).toContain(
      'window.open(value, "_blank", "noopener,noreferrer")',
    );
    expect(modalSource).toContain("Allow pop-ups for ZIVO");
    expect(modalSource).not.toContain("window.location.assign");
    expect(modalSource).not.toContain("supplier-proxy");
    expect(modalSource).not.toContain("fetchBlobUrl");
    expect(modalSource).not.toContain("URL.createObjectURL");
    expect(modalSource).not.toContain("<iframe");
    expect(modalSource).not.toContain("postMessage");
  });

  it("never persists a supplier password", () => {
    expect(modalSource).toContain("Passwords");
    expect(modalSource).toContain("never synced to the application database");
    expect(modalSource).not.toContain("JSON.stringify({ email, password");
    expect(modalSource).not.toContain("saveCredsRemote");
  });
});
