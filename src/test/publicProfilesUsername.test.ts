import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const stripSql = (s: string) => s.replace(/^\s*--.*$/gm, " ");

const MIGRATION = "supabase/migrations/20260806000000_expose_username_on_public_profiles.sql";
const sql = stripSql(read(MIGRATION));

/**
 * Three social surfaces select `username` from public_profiles. PostgREST
 * rejects a whole request over one unknown column, so until the view exposed
 * it, every one of those queries returned nothing and the surfaces rendered
 * empty — with no error anywhere.
 */
describe("public_profiles exposes what its callers select", () => {
  it("projects username alongside the existing columns", () => {
    expect(sql).toMatch(/select p\.id, p\.user_id, p\.full_name, p\.avatar_url, p\.username/);
  });

  it("keeps the OF-creator filter exactly as it was", () => {
    // The view's whole purpose. Widening the projection must not widen who is
    // visible in discovery.
    expect(sql).toMatch(/where p\.is_of_creator = false/);
  });

  it("re-asserts security_invoker and the grant", () => {
    // CREATE OR REPLACE VIEW does not reliably preserve either, and both were
    // set deliberately in earlier migrations — losing security_invoker would
    // run the view with the definer's rights instead of the caller's.
    expect(sql).toMatch(/set \(security_invoker = true\)/);
    expect(sql).toMatch(/grant select on public\.public_profiles to anon, authenticated/);
  });

  it("still matches every column the callers ask for", () => {
    const projected = new Set(
      (sql.match(/select ((?:p\.[a-z_]+,?\s*)+)from/)?.[1] ?? "")
        .split(",").map((c) => c.trim().replace("p.", "")).filter(Boolean),
    );
    expect(projected.size).toBeGreaterThan(3);

    for (const file of [
      "src/components/channels/ChannelPostCard.tsx",
      "src/components/channels/ChannelPostComments.tsx",
      "src/components/social/LikedByModal.tsx",
    ]) {
      const source = read(file);
      const sel = source.match(/\.from\("public_profiles"\)\s*\n?\s*\.select\("([^"]+)"\)/)?.[1];
      expect(sel, `${file} should query public_profiles`).toBeDefined();
      for (const col of sel!.split(",").map((c) => c.trim())) {
        expect(projected.has(col), `${file} selects ${col}, which the view must project`).toBe(true);
      }
    }
  });
});
