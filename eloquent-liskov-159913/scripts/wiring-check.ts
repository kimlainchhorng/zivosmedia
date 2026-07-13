/**
 * scripts/wiring-check.ts
 * One-shot CI runner — pings lodging-wiring-monitor and exits non-zero on any failure.
 * In CI mode (CI=true), also writes wiring-report.json + wiring-report.csv to cwd
 * and emits `pass` / `fail` outputs to $GITHUB_OUTPUT for downstream steps.
 *
 * Usage:
 *   SUPABASE_URL=https://slirphzzwcogdbkeicff.supabase.co \
 *   SUPABASE_ANON_KEY=... \
 *   deno run --allow-net --allow-env --allow-write scripts/wiring-check.ts
 */
const SCHEMA_VERSION = 2;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://slirphzzwcogdbkeicff.supabase.co";
const ANON = Deno.env.get("SUPABASE_ANON_KEY");
const IS_CI = Deno.env.get("CI") === "true" || !!Deno.env.get("GITHUB_ACTIONS");

if (!ANON) {
  console.error("SUPABASE_ANON_KEY env var is required.");
  Deno.exit(2);
}

const url = `${SUPABASE_URL}/functions/v1/lodging-wiring-monitor`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ANON}`,
    apikey: ANON,
  },
  body: JSON.stringify({ source: "ci", include_report: true }),
});

const json = await res.json().catch(() => ({} as Record<string, unknown>));
console.log(JSON.stringify(json, null, 2));

const passCount = Number((json as any).pass ?? 0);
const failCount = Number((json as any).fail ?? 0);
const newFailures = Number((json as any).new_failures ?? 0);
const report = (json as any).report;

// CI artifacts: JSON + CSV
if (IS_CI) {
  try {
    await Deno.writeTextFile("./wiring-report.json", JSON.stringify(json, null, 2));
    if (report?.checks) {
      const escape = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const headers = ["run_at_iso", "group", "check_id", "name", "pass", "severity", "message", "fix_sql", "failing_query", "schema_version"];
      const ranAt = report.ran_at || new Date().toISOString();
      const rows = report.checks.map((c: any) => [
        ranAt, c.group, c.id || "", c.name, c.pass ? "PASS" : "FAIL",
        c.severity || "", c.message || "", c.fix || "", c.failing_query || "", String(SCHEMA_VERSION),
      ].map(escape).join(","));
      const csv = "\uFEFF" + [
        `# schema_version=${SCHEMA_VERSION}`,
        `# generated_at=${ranAt}`,
        headers.join(","),
        ...rows,
      ].join("\r\n");
      await Deno.writeTextFile("./wiring-report.csv", csv);
    }
  } catch (e) {
    console.error("Failed to write CI artifacts:", e);
  }

  // GitHub Actions outputs
  const ghOutput = Deno.env.get("GITHUB_OUTPUT");
  if (ghOutput) {
    try {
      await Deno.writeTextFile(
        ghOutput,
        `pass=${passCount}\nfail=${failCount}\nnew_failures=${newFailures}\n`,
        { append: true },
      );
    } catch (e) {
      console.error("Failed to write GITHUB_OUTPUT:", e);
    }
  }
}

if (!res.ok || failCount > 0 || newFailures > 0) {
  console.error(`Wiring check failed: ${failCount} failing, ${newFailures} new regressions.`);
  Deno.exit(1);
}
console.log("Wiring check OK.");
Deno.exit(0);
