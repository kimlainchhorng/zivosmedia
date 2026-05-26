/**
 * Pure scoring logic for threat history rows. Mirrored on the server in
 * supabase/functions/_shared/threatIntel.ts (`scoreThreatHistory`) and in the
 * SQL RPC `auto_block_if_high_threat` — keep the three in sync.
 *
 * Why duplicate? Deno-imported edge code can't share a module with vite-built
 * client code (different module systems and dep graphs), and the SQL version
 * runs in-DB for atomicity. Same-rules-three-runtimes is the trade-off.
 */

export interface ThreatHistoryRow {
  source: string;
  total_count: number;
  blocked_count: number;
  max_severity: string | null;
  last_seen: string;
  sample: unknown[];
}

/**
 * Compute a 0-100 risk score from threat history rows.
 *  - any `ip_blocklist` row caps at 100 (already-blocked overrides everything)
 *  - each `blocked_link_attempts` row contributes 8 pts
 *  - each blocked `security_event` contributes 4 pts
 *  - each blocked `chat_security_event` contributes 6 pts
 *  - each unacknowledged `security_incident` of severity≥high contributes 25 pts
 */
export function scoreThreatHistory(rows: ThreatHistoryRow[]): number {
  let score = 0;
  for (const r of rows) {
    if (r.source === "ip_blocklist" && r.total_count > 0) return 100;
    if (r.source === "blocked_link_attempts") score += r.total_count * 8;
    if (r.source === "security_events")        score += r.blocked_count * 4;
    if (r.source === "security_incidents"
        && (r.max_severity === "high" || r.max_severity === "critical")) {
      score += r.blocked_count * 25;
    }
    if (r.source === "chat_security_events")   score += r.blocked_count * 6;
  }
  return Math.min(score, 100);
}

/** Returns the verdict label that AdminThreatHistoryPage badges with. */
export function threatVerdict(score: number): "clean" | "watch" | "high" | "critical" {
  if (score >= 70) return "critical";
  if (score >= 30) return "high";
  if (score >= 10) return "watch";
  return "clean";
}
