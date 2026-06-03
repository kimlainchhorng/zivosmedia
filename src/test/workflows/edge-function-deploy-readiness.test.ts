import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

const criticalFunctions = [
  ["analytics-event-track", false],
  ["notification-manage", true],
  ["social-notification-manage", true],
  ["push-device-manage", true],
  ["talent-invite-notification", true],
  ["admin-broadcast-notification", true],
] as const;

describe("Edge Function deploy readiness", () => {
  it("keeps critical browser-invoked functions declared in Supabase config", () => {
    const config = read("supabase/config.toml");

    for (const [slug, verifyJwt] of criticalFunctions) {
      const fn = read(`supabase/functions/${slug}/index.ts`);
      expect(config).toContain(`[functions.${slug}]`);
      expect(config).toMatch(new RegExp(`\\[functions\\.${slug}\\]\\s+verify_jwt = ${verifyJwt ? "true" : "false"}`));
      expect(fn).toContain(`withSecurity("${slug}"`);
      expect(fn).toContain('allowedMethods: ["POST"]');
      if (verifyJwt) expect(fn).toMatch(/auth\.getUser\((?:token)?\)/);
    }
  });

  it("wires the deploy contract into package scripts", () => {
    const packageJson = read("package.json");
    expect(packageJson).toContain('"qa:edge-function-deploy-contracts"');
    expect(packageJson).toContain("scripts/qa/edge-function-deploy-contracts.mjs");
  });
});
