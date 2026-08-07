/**
 * CSV export for the store admin tables.
 *
 * WHY THIS EXISTS
 * `StoreCustomersSection` built its CSV with `row.join(",")`. That is correct
 * only while no value contains a comma, a quote, or a newline — and the very
 * first column is a customer name. "Smith, John" splits into two fields and
 * every column after it shifts by one, silently, for the rest of that row. A
 * store owner reconciling that file against their books finds phone numbers in
 * the orders column and has no reason to suspect the export rather than their
 * own records.
 *
 * Three more Export buttons were unwired entirely. Rather than write the same
 * loop four times — and repeat the escaping bug three more times — the quoting
 * and the download live here once.
 *
 * Quoting follows RFC 4180: wrap in double quotes when the value contains a
 * comma, quote, CR or LF, and double any embedded quote.
 */

export type CsvCell = string | number | boolean | null | undefined;

/**
 * One CSV field, quoted only when it has to be.
 *
 * Null and undefined become an empty field rather than the strings "null" or
 * "undefined" — a blank cell is what a spreadsheet user means by "no value",
 * and printing the word is how a column of missing phone numbers turns into a
 * column that looks populated.
 */
export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/** A full CSV document, CRLF-delimited as the spec requires. */
export function toCsv(headers: readonly string[], rows: readonly CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return lines.join("\r\n");
}

/**
 * Filename with a date, so repeated exports do not overwrite each other.
 *
 * A store owner exporting payroll twice in a week otherwise ends up with
 * `payroll.csv` and `payroll (1).csv` and no way to tell which is which.
 */
export function csvFilename(base: string, date = new Date()): string {
  const stamp = Number.isNaN(date.getTime())
    ? "unknown-date"
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const safeBase = base.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "export";
  return `${safeBase}-${stamp}.csv`;
}

/**
 * Build the file and hand it to the browser.
 *
 * The object URL is revoked on the next frame rather than immediately: some
 * browsers have not finished reading the blob when `click()` returns, and
 * revoking too early produces an empty download with no error anywhere.
 *
 * Returns false when there is nothing to export, so callers can leave the
 * button disabled rather than handing someone a file with only headers.
 */
export function downloadCsv(
  base: string,
  headers: readonly string[],
  rows: readonly CsvCell[][],
): boolean {
  if (rows.length === 0) return false;
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") return false;

  // The BOM makes Excel open UTF-8 correctly. Without it, Khmer names in a
  // Cambodian store's customer export render as mojibake.
  const blob = new Blob(["﻿", toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = csvFilename(base);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}
