/**
 * lodging-wiring-monitor
 * Scheduled diagnostic: runs `lodging_wiring_report()`, persists a snapshot, diffs
 * against the previous run, and fires admin alerts on regressions or recoveries.
 * Designed to be called by pg_cron every ~15 minutes (or by CI as a one-shot).
 */
import { createClient } from "../_shared/deps.ts";

interface Check {
  id?: string;
  group: string;
  name: string;
  pass: boolean;
  severity?: string;
  message?: string;
}

interface Report {
  ran_at: string;
  pass_count: number;
  fail_count: number;
  checks: Check[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const { data: report, error: rpcErr } = await admin.rpc("lodging_wiring_report" as any);
    if (rpcErr) throw rpcErr;
    const r = report as unknown as Report;

    // Load previous run before inserting the new one
    const { data: prev } = await admin
      .from("lodging_wiring_report_runs")
      .select("summary, ran_at, schema_version")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Persist current snapshot
    const SCHEMA_VERSION = 2;
    await admin.from("lodging_wiring_report_runs").insert({
      summary: r as any,
      pass_count: r.pass_count,
      fail_count: r.fail_count,
      schema_version: SCHEMA_VERSION,
    } as any);

    // Skip diffing if the prior run was on a different schema (avoids spurious regressions).
    const prevSchema = (prev as any)?.schema_version ?? 1;
    const sameSchema = prevSchema === SCHEMA_VERSION;
    const prevChecks: Check[] = sameSchema ? ((prev?.summary as any)?.checks || []) : [];
    const prevById = new Map(prevChecks.map((c) => [c.id || c.name, c]));

    const newFailures: Check[] = [];
    const recoveries: Check[] = [];

    for (const c of r.checks) {
      const key = c.id || c.name;
      const before = prevById.get(key);
      if (!before) continue;
      if (before.pass && !c.pass) newFailures.push(c);
      else if (!before.pass && c.pass) recoveries.push(c);
    }

    const dashboardLink = "https://hizivo.com/admin/lodging/wiring-check";

    const sendAlert = async (title: string, body: string, severity: string) => {
      try {
        await admin.functions.invoke("send-admin-alert", {
          body: { title, body, severity, link: dashboardLink, source: "lodging-wiring-monitor" },
        });
      } catch (e) {
        console.error("[lodging-wiring-monitor] alert send failed", e);
      }
    };

    for (const f of newFailures) {
      await sendAlert(
        `Lodging wiring regression: ${f.name}`,
        `${f.message || "Check failed."}\n\nGroup: ${f.group}\nSeverity: ${f.severity || "unknown"}`,
        f.severity === "critical" ? "critical" : "high"
      );
    }
    for (const rc of recoveries) {
      await sendAlert(
        `Lodging wiring recovered: ${rc.name}`,
        `${rc.message || "Check now passing."}\n\nGroup: ${rc.group}`,
        "info"
      );
    }

    // CI may request the full report inline.
    let includeReport = false;
    try {
      const reqBody = await req.clone().json();
      includeReport = !!reqBody?.include_report;
    } catch (_) { /* no body */ }

    return new Response(
      JSON.stringify({
        ran_at: r.ran_at,
        pass: r.pass_count,
        fail: r.fail_count,
        new_failures: newFailures.length,
        recoveries: recoveries.length,
        schema_version: SCHEMA_VERSION,
        ...(includeReport ? { report: r } : {}),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[lodging-wiring-monitor] error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
