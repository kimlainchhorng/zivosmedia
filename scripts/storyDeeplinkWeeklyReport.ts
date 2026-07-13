/**
 * Weekly cohort report — story deep-link performance by source.
 *
 * Reads the last 7 days of `analytics_events` for the four story events,
 * aggregates per-source metrics + top-converting stories, and writes a CSV
 * to /mnt/documents/.
 *
 * Usage (operator-run, requires service-role key):
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun scripts/storyDeeplinkWeeklyReport.ts
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const STORY_EVENTS = [
  "story_deeplink_open",
  "story_segment_view",
  "story_deeplink_close",
  "story_deeplink_missing",
];

interface Row {
  event_name: string;
  meta: Record<string, any> | null;
  created_at: string;
}

async function fetchAll(start: Date, end: Date): Promise<Row[]> {
  const rows: Row[] = [];
  const PAGE = 1000;
  for (let p = 0; p < 100; p++) {
    const { data, error } = await supabase
      .from("analytics_events")
      .select("event_name, meta, created_at")
      .in("event_name", STORY_EVENTS)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (error) throw error;
    const batch = (data || []) as Row[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

(async () => {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  console.log(`Fetching analytics_events from ${start.toISOString()} → ${end.toISOString()}`);
  const rows = await fetchAll(start, end);
  console.log(`Loaded ${rows.length} story analytics events.`);

  // Per-source aggregation
  const bySource = new Map<string, {
    opens: number; views: number; closes: number; completions: number; missing: number;
    stories: Map<string, { opens: number; views: number; completions: number }>;
  }>();
  const reasons = new Map<string, number>();

  const ensureSource = (s: string) => {
    let row = bySource.get(s);
    if (!row) {
      row = { opens: 0, views: 0, closes: 0, completions: 0, missing: 0, stories: new Map() };
      bySource.set(s, row);
    }
    return row;
  };

  for (const r of rows) {
    const m = r.meta || {};
    const src = (m.source as string) || "unknown";
    const sRow = ensureSource(src);
    const sid = m.story_id as string | undefined;
    const ensureStory = (id: string) => {
      let st = sRow.stories.get(id);
      if (!st) { st = { opens: 0, views: 0, completions: 0 }; sRow.stories.set(id, st); }
      return st;
    };

    switch (r.event_name) {
      case "story_deeplink_open":
        sRow.opens++; if (sid) ensureStory(sid).opens++; break;
      case "story_segment_view":
        sRow.views++; if (sid) ensureStory(sid).views++; break;
      case "story_deeplink_close":
        sRow.closes++;
        if (m.completed) { sRow.completions++; if (sid) ensureStory(sid).completions++; }
        break;
      case "story_deeplink_missing": {
        sRow.missing++;
        const reason = (m.reason as string) || "unknown";
        reasons.set(reason, (reasons.get(reason) || 0) + 1);
        break;
      }
    }
  }

  // Build CSV
  const lines: string[] = [];
  lines.push(`# Story Deep-Link Weekly Report`);
  lines.push(`# Range: ${start.toISOString()} → ${end.toISOString()}`);
  lines.push(`# Total events: ${rows.length}`);
  lines.push("");
  lines.push("## Per-source funnel");
  lines.push(["source", "opens", "rendered", "render_rate", "completions", "completion_rate", "missing", "missing_rate"].join(","));
  for (const [src, r] of [...bySource.entries()].sort((a, b) => b[1].opens - a[1].opens)) {
    const renderRate = r.opens ? r.views / r.opens : 0;
    const compRate = r.opens ? r.completions / r.opens : 0;
    const missRate = (r.opens + r.missing) ? r.missing / (r.opens + r.missing) : 0;
    lines.push([src, r.opens, r.views, renderRate.toFixed(3), r.completions, compRate.toFixed(3), r.missing, missRate.toFixed(3)].map(csvEscape).join(","));
  }
  lines.push("");
  lines.push("## Missing reasons");
  lines.push("reason,count");
  for (const [reason, count] of [...reasons.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`${csvEscape(reason)},${count}`);
  }
  lines.push("");
  lines.push("## Top stories per source (min 5 opens, top 10 by conversion)");
  lines.push("source,story_id,opens,rendered,conversion,completions");
  for (const [src, r] of bySource.entries()) {
    const top = [...r.stories.entries()]
      .map(([id, s]) => ({ id, ...s, conv: s.opens ? s.views / s.opens : 0 }))
      .filter((s) => s.opens >= 5)
      .sort((a, b) => b.conv - a.conv || b.opens - a.opens)
      .slice(0, 10);
    for (const s of top) {
      lines.push([src, s.id, s.opens, s.views, s.conv.toFixed(3), s.completions].map(csvEscape).join(","));
    }
  }

  const stamp = end.toISOString().slice(0, 10);
  const outPath = `/mnt/documents/story-deeplink-weekly-${stamp}.csv`;
  mkdirSync("/mnt/documents", { recursive: true });
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`Wrote ${outPath}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
