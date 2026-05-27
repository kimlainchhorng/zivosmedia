/**
 * auditCsv — turn lodge_reservation_audit rows into a downloadable CSV.
 * Adds UTF-8 BOM for Excel compatibility, ISO timestamps, escapes quotes.
 */
export interface AuditRow {
  created_at: string;
  from_status?: string | null;
  to_status?: string | null;
  actor_role?: string | null;
  actor_name?: string | null;
  note?: string | null;
}

const escape = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function buildAuditCsv(rows: AuditRow[]): string {
  const header = ["timestamp", "from_status", "to_status", "actor_role", "actor_name", "note"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.created_at).toISOString(),
        r.from_status ?? "",
        r.to_status ?? "",
        r.actor_role ?? "",
        r.actor_name ?? "",
        r.note ?? "",
      ]
        .map(escape)
        .join(",")
    );
  }
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadAuditCsv(reference: string, rows: AuditRow[]) {
  const csv = buildAuditCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservation-${reference}-history.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
