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

// CSV formula injection (CWE-1236): actor_name / note are user-entered free
// text; a value starting with = + - @ tab or CR executes as a formula in
// Excel/Sheets/LibreOffice. Prefix with an apostrophe (leaving legit negative
// numbers intact) before RFC-4180 quoting.
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;
const NUMERIC_LITERAL = /^-?\d+(\.\d+)?$/;
const escape = (v: unknown): string => {
  let s = v == null ? "" : String(v);
  if (FORMULA_TRIGGERS.test(s) && !NUMERIC_LITERAL.test(s)) s = `'${s}`;
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

export async function downloadAuditCsv(reference: string, rows: AuditRow[]) {
  const csv = buildAuditCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const name = `reservation-${reference}-history.csv`;
  const { exportBlob } = await import("@/lib/native/exportFile");
  await exportBlob(blob, name, name);
}
