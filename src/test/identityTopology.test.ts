import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ZIVO runs separate auth backends per app and the owner's standing ruling is
 * not to migrate (see IDENTITY_NOTES.md). This pins the topology so that adding,
 * removing or repointing a backend has to be a deliberate edit to this file
 * rather than a side effect of some other change.
 */
const SRC = resolve(__dirname, "..");
const CLIENT = readFileSync(join(SRC, "integrations", "supabase", "client.ts"), "utf8");

const PROJECT_REFS = {
  media: "slirphzzwcogdbkeicff",
  software: "ydxztoresbdeoeijhxww",
  driver: "yiedlgoxwjmansszdypf",
  travel: "xbllvmpomorawkcrtbcq",
} as const;

// Business appears ONLY in the diagnostics observer (see the test below).
// Employees is wired into nothing here at all.
const NOT_WIRED_HERE = { business: "gzyktwcanrrkosieecxs", employees: "wtdlbzgryuelpylijnkd" } as const;
// The one file allowed to name another app's project, and only to compare an
// issuer string for observation. IDENTITY_PLAN.md phase 0.
const DIAGNOSTICS_ONLY = "config/identityTopology.ts";

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}
const ALL_SOURCE = sourceFiles(SRC).map((f) => ({ f, text: readFileSync(f, "utf8") }));

describe("identity topology", () => {
  it("pins each app's Supabase project ref", () => {
    const config = {
      software: readFileSync(join(SRC, "config", "autoRepairDomain.ts"), "utf8"),
      driver: readFileSync(join(SRC, "config", "zivoDriverDomain.ts"), "utf8"),
      travel: readFileSync(join(SRC, "config", "zivoTravelDomain.ts"), "utf8"),
    };
    expect(config.software).toContain(`"${PROJECT_REFS.software}"`);
    expect(config.driver).toContain(`"${PROJECT_REFS.driver}"`);
    expect(config.travel).toContain(`"${PROJECT_REFS.travel}"`);
  });

  it("keeps other apps' backends out of everything but the diagnostics observer", () => {
    // If one of these appears anywhere else, this app has started addressing
    // another app's identity store — the exact move IDENTITY_NOTES.md forbids.
    for (const [app, ref] of Object.entries(NOT_WIRED_HERE)) {
      const hits = ALL_SOURCE.filter(({ text }) => text.includes(ref))
        .map(({ f }) => f.slice(SRC.length + 1))
        .filter((f) => f !== "test/identityTopology.test.ts" && f !== DIAGNOSTICS_ONLY);
      expect(hits, `${app} project ${ref} is referenced outside the diagnostics observer`).toEqual([]);
    }
  });

  it("keeps the diagnostics observer observation-only", () => {
    // It decodes an access token, so it must never gate anything. It reads one
    // env flag, emits a DOM event, and swallows every error.
    const observer = readFileSync(join(SRC, DIAGNOSTICS_ONLY), "utf8");
    expect(observer).toContain('import.meta.env.VITE_IDENTITY_DIAGNOSTICS_ENABLED !== "true"');
    expect(observer).toContain('phase: "observe-only"');
    // No decoded claim may become an authorization decision or leave the page.
    // `.supabase.co` appears in the issuer string, so match real client calls only.
    expect(observer).not.toMatch(/\bfetch\s*\(|supabase\.(auth|from|functions|rpc|storage)\b|signOut|\.setSession\b/);
  });

  it("routes data by host for software, travel and driver", () => {
    for (const flag of ["useZivoSoftwareBackend", "useZivoTravelBackend", "useZivoDriverBackend"]) {
      expect(CLIENT).toContain(flag);
    }
    const dataUrl = CLIENT.slice(CLIENT.indexOf("export const DATA_SUPABASE_URL"));
    for (const flag of ["useZivoSoftwareBackend", "useZivoTravelBackend", "useZivoDriverBackend"]) {
      expect(dataUrl.slice(0, 400)).toContain(flag);
    }
  });

  it("documents that AUTH follows the data project for software only", () => {
    // The asymmetry itself: data switches for three hosts, auth for one. On a
    // travel or driver host the accessToken callback would hand dataSupabase a
    // Media-signed JWT, which that project cannot verify — auth.uid() goes null
    // and RLS reads come back EMPTY rather than failing loudly.
    //
    // Both branches are dead today (env vars empty), so this is a tripwire, not
    // a live bug. If you switch one on, give it a dedicated auth project too and
    // update this test and IDENTITY_NOTES.md together.
    const authUrl = CLIENT.slice(
      CLIENT.indexOf("const EFFECTIVE_AUTH_SUPABASE_URL"),
      CLIENT.indexOf("const EFFECTIVE_DATA_SUPABASE_URL"),
    );
    expect(authUrl).toContain("useDedicatedSoftwareAuth");
    expect(authUrl).not.toContain("useZivoTravelBackend");
    expect(authUrl).not.toContain("useZivoDriverBackend");
    expect(CLIENT).toContain("accessToken: async () => {");
  });

  it("has an IDENTITY_NOTES.md recording the coupling", () => {
    const notes = readFileSync(resolve(SRC, "..", "IDENTITY_NOTES.md"), "utf8");
    expect(notes).toContain("do not migrate");
    for (const ref of Object.values(PROJECT_REFS)) expect(notes).toContain(ref);
  });
});
