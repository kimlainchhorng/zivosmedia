/**
 * Contract tests for buildAuditCsv — the reservation-audit CSV exporter. It is
 * security-load-bearing against CSV formula injection (CWE-1236): actor_name/note
 * are user-entered free text, and a value starting with = + @ (or tab/CR) executes
 * as a formula when the export is opened in Excel/Sheets/LibreOffice. The builder
 * neutralizes those by prefixing an apostrophe — while deliberately EXEMPTING legit
 * negative numbers — then applies RFC-4180 quoting and a UTF-8 BOM. Expected strings
 * were produced by an independent clean-room reimplementation of the documented
 * escaping rules (not by importing the module). downloadAuditCsv is out of scope —
 * it only wraps the output in a Blob and hands it to the native export bridge.
 */
import { describe, it, expect } from "vitest";
import { buildAuditCsv, type AuditRow } from "./auditCsv";

const BOM = String.fromCharCode(0xfeff);
const HEADER = "timestamp,from_status,to_status,actor_role,actor_name,note";

function auditRow(overrides: Partial<AuditRow> = {}): AuditRow {
  return { created_at: "2026-06-16T00:00:00.000Z", ...overrides };
}
// The single data row of a one-row CSV (after the header line).
const data = (r: AuditRow): string => buildAuditCsv([r]).split("\r\n")[1];

describe("buildAuditCsv structure", () => {
  it("emits a BOM + header and nothing else for no rows", () => {
    expect(buildAuditCsv([])).toBe(BOM + HEADER);
  });

  it("ISO-normalizes the timestamp and joins fields/rows per RFC-4180 with CRLF", () => {
    expect(
      buildAuditCsv([
        {
          created_at: "2026-06-16T12:30:00.000Z",
          from_status: "pending",
          to_status: "confirmed",
          actor_role: "host",
          actor_name: "Alice",
          note: "ok",
        },
      ]),
    ).toBe(BOM + HEADER + "\r\n" + "2026-06-16T12:30:00.000Z,pending,confirmed,host,Alice,ok");
  });

  it("renders null/undefined fields as empty cells", () => {
    expect(data(auditRow())).toBe("2026-06-16T00:00:00.000Z,,,,,");
  });
});

describe("buildAuditCsv formula-injection neutralization (CWE-1236)", () => {
  it("apostrophe-prefixes values starting with = + @", () => {
    expect(data(auditRow({ actor_name: "=cmd()", note: "@SUM(1)" }))).toBe(
      "2026-06-16T00:00:00.000Z,,,,'=cmd(),'@SUM(1)",
    );
  });

  it("prefixes a leading-+ value but EXEMPTS legit negative numbers", () => {
    expect(data(auditRow({ actor_name: "+42", note: "-42" }))).toBe(
      "2026-06-16T00:00:00.000Z,,,,'+42,-42",
    );
    expect(data(auditRow({ note: "-5.5" }))).toBe("2026-06-16T00:00:00.000Z,,,,,-5.5");
  });

  it("prefixes THEN RFC-quotes when a formula value also contains a comma", () => {
    expect(data(auditRow({ note: "=a,b" }))).toBe('2026-06-16T00:00:00.000Z,,,,,"\'=a,b"');
  });
});

describe("buildAuditCsv RFC-4180 quoting", () => {
  it("wraps and doubles quotes, and wraps commas/newlines", () => {
    expect(data(auditRow({ actor_name: "a,b", note: 'say "hi"' }))).toBe(
      '2026-06-16T00:00:00.000Z,,,,"a,b","say ""hi"""',
    );
    expect(data(auditRow({ note: "l1\nl2" }))).toBe('2026-06-16T00:00:00.000Z,,,,,"l1\nl2"');
  });
});
