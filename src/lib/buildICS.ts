/**
 * buildICS — generate a minimal RFC 5545 .ics calendar event blob and
 * trigger a browser download. Used by reservation, flight, and hotel
 * confirmations so the user can drop the booking straight into Apple
 * Calendar / Google Calendar / Outlook.
 *
 * Intentionally narrow: one VEVENT, no recurrence, no attendees. Good
 * enough for confirmations.
 */
export interface CalendarEventInput {
  title: string;
  description?: string;
  /** Local-time ISO string ("2026-05-12T19:00:00") or full Date. */
  start: string | Date;
  /** Optional — defaults to start + 1 hour. */
  end?: string | Date;
  location?: string;
  url?: string;
  /** Stable id so re-imports update the same event. Defaults to a uuid-ish slug. */
  uid?: string;
}

export function buildICS(input: CalendarEventInput): string {
  const start = toDate(input.start);
  const end = toDate(input.end ?? new Date(start.getTime() + 60 * 60 * 1000));
  const uid = input.uid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}@zivo.app`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZIVO//Concierge//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeText(input.title)}`,
    input.description ? `DESCRIPTION:${escapeText(input.description)}` : "",
    input.location ? `LOCATION:${escapeText(input.location)}` : "",
    input.url ? `URL:${escapeText(input.url)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export async function downloadICS(input: CalendarEventInput, filename = "zivo-event.ics") {
  if (typeof window === "undefined") return;
  const blob = new Blob([buildICS(input)], { type: "text/calendar;charset=utf-8" });
  const name = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  const { exportBlob } = await import("@/lib/native/exportFile");
  await exportBlob(blob, name, "Add to calendar");
}

function toDate(v: string | Date): Date {
  if (v instanceof Date) return v;
  return new Date(v);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatICSDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeText(s: string): string {
  // Normalize every line break — CRLF, lone CR, lone LF — to the "\n" escape. A bare
  // CR (0x0D) left in a property value is non-conformant (RFC 5545 §3.3.11/§3.1): CRLF
  // is the content-line delimiter, so a raw CR from "\r\n" content (e.g. a pasted
  // reservation note or merchant name) would corrupt the .ics line structure. The
  // "\r\n" alternative is listed first so a CRLF pair collapses to a single "\n".
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
