import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "supabase/functions/_shared/threatIntel.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("authenticated user blocklist failure behavior", () => {
  it("fails closed when the user blocklist RPC is unavailable", () => {
    const userCheck = source.slice(
      source.indexOf("export async function isUserBlocked"),
      source.indexOf("/**", source.indexOf("export async function isUserBlocked")),
    );

    expect(userCheck).toMatch(
      /is_user_blocked_failed[\s\S]*?throw new Error\('User blocklist unavailable'\)/,
    );
    expect(userCheck).toMatch(
      /is_user_blocked_threw[\s\S]*?throw new Error\('User blocklist unavailable'\)/,
    );
  });
});
