import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

function runtimeFiles(relativeDirectory: string): string[] {
  const absoluteDirectory = path.join(root, relativeDirectory);
  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap(
    (entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      // Compare with normalized separators so the exclusion also holds on
      // Windows, where path.join yields backslashes.
      const posixPath = relativePath.split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (posixPath === "src/test") return [];
        return runtimeFiles(relativePath);
      }
      return /\.(?:ts|tsx|js|mjs)$/.test(entry.name) ? [relativePath] : [];
    },
  );
}

describe("AR supplier credential zero-row containment", () => {
  it("removes authenticated access while retaining service-role compatibility", () => {
    const migration = read(
      "supabase/migrations/20260830161008_release_backend_security_reconciliation.sql",
    );
    const start = migration.indexOf(
      "-- Disable plaintext supplier credential storage",
    );
    const end = migration.indexOf("-- Public storefront purchase pulse", start);
    const containment = migration.slice(start, end);

    expect(containment).toContain(
      "drop policy if exists merged_all_authenticated",
    );
    expect(containment).toContain(
      "revoke all on table public.ar_supplier_credentials from anon, authenticated;",
    );
    expect(containment).toContain(
      "grant select, insert, update, delete on table public.ar_supplier_credentials\n  to service_role;",
    );
    expect(containment).toContain(
      "Do not store secrets here until an encrypted or Vault-backed design is reviewed",
    );
    expect(containment).not.toMatch(/drop\s+(?:table|column)/i);
    expect(containment).not.toMatch(/grant[^;]+authenticated/i);
  });

  it("has no runtime caller that depends on the disabled plaintext table", () => {
    const references = [
      ...runtimeFiles("src"),
      ...runtimeFiles("supabase/functions"),
    ].filter((file) => read(file).includes("ar_supplier_credentials"));

    expect(references).toEqual([]);
  });
});
