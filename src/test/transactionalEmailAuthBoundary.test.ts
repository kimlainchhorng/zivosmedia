import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(resolve(process.cwd(), name), "utf8");

describe("transactional email authentication boundary", () => {
  it("requires the service-role key before reading caller-controlled email data", () => {
    const source = read("supabase/functions/send-transactional-email/index.ts");
    const authGuard = source.indexOf("if (!isServiceRoleRequest(req, supabaseServiceKey))");
    const bodyParser = source.indexOf("// Parse request body");

    expect(source).toContain("function isServiceRoleRequest(req: Request, serviceKey: string)");
    expect(source).toContain("return authorization === `Bearer ${serviceKey}` || apikey === serviceKey;");
    expect(authGuard).toBeGreaterThan(-1);
    expect(bodyParser).toBeGreaterThan(-1);
    expect(authGuard).toBeLessThan(bodyParser);
    expect(source).toContain("status: 401");
  });

  it("enables Supabase JWT verification for the internal-only function", () => {
    const config = read("supabase/config.toml");

    expect(config).toMatch(/\[functions\.send-transactional-email\]\s+verify_jwt = true/);
  });
});
