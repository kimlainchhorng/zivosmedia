import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Parental-safety server gate.
 *
 * SafetyCenterPage historically kept parental controls in localStorage with a
 * `hasPin` boolean standing in for a PIN — nothing verifiable, nothing that
 * survives the device, and editable by exactly the account the controls are
 * aimed at. The backend half moves that state behind the same server gate the
 * project already uses for two_step_auth / user_passcode. These contracts pin
 * the three properties that make it a gate rather than a mirror:
 *
 *   1. direct client writes are blocked (RESTRICTIVE false policies),
 *   2. the only write path is the account-security-settings function,
 *   3. the migration and the function agree on the value vocabulary.
 */

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

const MIGRATION = "supabase/migrations/20260811023000_parental_safety_server_state.sql";
const FUNCTION = "supabase/functions/account-security-settings/index.ts";

describe("parental safety server gate", () => {
  it("blocks every direct client write on parental_safety_settings", () => {
    const migration = source(MIGRATION);

    expect(migration).toContain("create table if not exists public.parental_safety_settings");
    expect(migration).toContain("alter table public.parental_safety_settings enable row level security");

    // The owner read that lets the client verify the salted PIN hash locally,
    // exactly like user_passcode.
    expect(migration).toMatch(/for select\s+to authenticated\s+using \(auth\.uid\(\) = user_id\)/);

    // One RESTRICTIVE false policy per write verb — the 20260601070000 shape.
    for (const verb of ["insert", "update", "delete"]) {
      const policy = new RegExp(
        `parental_safety_block_direct_${verb}"?\\s+on public\\.parental_safety_settings\\s+as restrictive`,
        "i",
      );
      expect(migration).toMatch(policy);
    }
    expect(migration).toMatch(/with check \(false\)/);
    expect(migration).toMatch(/using \(false\)/);

    expect(migration).toContain("revoke all on table public.parental_safety_settings from anon");
    expect(migration).toContain("grant select on table public.parental_safety_settings to authenticated");
  });

  it("keeps the PIN verifier all-or-nothing", () => {
    const migration = source(MIGRATION);
    const fn = source(FUNCTION);

    // A hash without its salt can never verify anything but still renders as
    // "PIN active" — refused at both layers.
    expect(migration).toMatch(/\(pin_hash is null\) = \(pin_salt is null\)/);
    expect(fn).toMatch(/\(pinHash === null\) !== \(pinSalt === null\)/);
    // And a partial update cannot sneak half a verifier in: the update path
    // only clears the pair, never sets it.
    const declaration = fn.indexOf("async function writeParental");
    expect(declaration).toBeGreaterThan(-1);
    const updateBranch = fn.slice(fn.indexOf('if (action === "update") {', declaration));
    expect(updateBranch.slice(0, 700)).toContain("clear_pin");
    expect(updateBranch.slice(0, 700)).not.toContain("body.pin_hash");
  });

  it("routes parental writes through the security function with an audit trail", () => {
    const fn = source(FUNCTION);

    expect(fn).toMatch(/RESOURCES = new Set\(\[.*"parental".*\]\)/);
    expect(fn).toContain('await writeParental(admin, user.id, action, body)');
    expect(fn).toContain('.from("parental_safety_settings")');
    // Ownership is bound from the verified JWT, never from the request body.
    expect(fn).toMatch(/\.upsert\(row, \{ onConflict: "user_id" \}\)/);
    expect(fn).not.toMatch(/user_id:\s*body/);
    // Disabling or clearing controls is exactly what the owner must be able to
    // see afterwards.
    expect(fn).toContain('event: "parental_safety_changed"');
    for (const action of ["removed", "pin_cleared", "pin_configured", "configured"]) {
      expect(fn).toContain(`"${action}"`);
    }
  });

  it("keeps the migration and function value vocabularies identical", () => {
    const migration = source(MIGRATION);
    const fn = source(FUNCTION);

    const sqlList = (column: string) => {
      const match = migration.match(new RegExp(`${column} in \\(([^)]+)\\)`));
      expect(match, `${column} CHECK list missing from migration`).toBeTruthy();
      return match![1].split(",").map((v) => v.trim().replace(/^'|'$/g, "")).sort();
    };
    const tsList = (name: string) => {
      const match = fn.match(new RegExp(`${name} = new Set\\(\\[([^\\]]+)\\]\\)`));
      expect(match, `${name} missing from function`).toBeTruthy();
      return match![1].split(",").map((v) => v.trim().replace(/^"|"$/g, "")).sort();
    };

    // Parsed from each side and compared — a value added to one layer only
    // fails here instead of surfacing as a runtime 500 (or a silent 400).
    expect(tsList("PARENTAL_SCREEN_TIMES")).toEqual(sqlList("screen_time"));
    expect(tsList("PARENTAL_CONTENT_FILTERS")).toEqual(sqlList("content_filter"));
  });

  it("wires the frontend to the server read/write contract without direct writes", () => {
    const page = source("src/pages/SafetyCenterPage.tsx");
    expect(page).toContain("localStorage");
    expect(page).toContain('from("parental_safety_settings")');
    expect(page).toContain('select("toggles, screen_time, content_filter, pin_hash, pin_salt, updated_at")');
    expect(page).toContain('functions.invoke("account-security-settings"');
    expect(page).toContain('resource: "parental"');
    expect(page).toContain('action: "upsert"');
    expect(page).toContain('action: "update"');
    expect(page).toContain('clear_pin: true');
    expect(page).toContain('action: "delete"');
    expect(page).toContain("generateSalt");
    expect(page).toContain("hashSecret");
    expect(page).toContain("pin_hash: verifier.hash");
    expect(page).toContain("pin_salt: verifier.salt");

    // Direct client writes are blocked by the migration. The page may read
    // the owner row, but all writes must remain inside the edge function.
    expect(page).not.toMatch(/from\("parental_safety_settings"\)[\s\S]{0,240}\.(insert|update|upsert|delete)\(/);
    expect(page).not.toMatch(/body:[\s\S]{0,240}\bpin\b(?!_hash|_salt)/);
  });
});
