/**
 * ics - Build a richer .ics calendar file with two timed events (check-in / check-out)
 * including timezone, address, and contact details.
 */
export interface IcsEventInput {
  reference: string;
  storeName: string;
  roomName: string;
  storeAddress?: string | null;
  storePhone?: string | null;
  storeUrl?: string | null;
  guestName: string;
  guestEmail?: string | null;
  checkIn: string;        // YYYY-MM-DD
  checkOut: string;       // YYYY-MM-DD
  checkInTime?: string;   // "15:00"
  checkOutTime?: string;  // "11:00"
  timezone?: string;      // IANA tz, default Asia/Phnom_Penh
  totalText?: string;
  cancellationText?: string;
}

const DEFAULT_TZ = "Asia/Phnom_Penh";

const escapeIcs = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

const fmtLocal = (date: string, time: string) => {
  const [y, m, d] = date.split("-");
  const [hh, mm] = time.split(":");
  return `${y}${m}${d}T${(hh || "00").padStart(2, "0")}${(mm || "00").padStart(2, "0")}00`;
};

const addHour = (time: string) => {
  const [hh, mm] = time.split(":").map(Number);
  const h = ((hh || 0) + 1) % 24;
  return `${String(h).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}`;
};

const stamp = () => new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

export function buildBookingIcs(input: IcsEventInput): string {
  const tz = input.timezone || DEFAULT_TZ;
  const ci = input.checkInTime || "15:00";
  const co = input.checkOutTime || "11:00";
  const ciEnd = addHour(ci);
  const coEnd = addHour(co);

  const orgLine = `ORGANIZER;CN=${escapeIcs(input.storeName)}:mailto:noreply@hizivo.com`;
  const attLine = input.guestEmail
    ? `ATTENDEE;CN=${escapeIcs(input.guestName)};RSVP=FALSE:mailto:${input.guestEmail}`
    : null;
  const url = input.storeUrl ? `URL:${input.storeUrl}` : null;
  const loc = input.storeAddress
    ? `LOCATION:${escapeIcs(`${input.storeName} – ${input.storeAddress}`)}`
    : `LOCATION:${escapeIcs(input.storeName)}`;

  const descParts = [
    `Booking ${input.reference}`,
    `Guest: ${input.guestName}`,
    input.totalText ? `Total: ${input.totalText}` : null,
    `Room: ${input.roomName}`,
    input.storePhone ? `Contact: ${input.storePhone}` : null,
    input.cancellationText ? `Cancellation: ${input.cancellationText}` : null,
  ].filter(Boolean) as string[];
  const desc = `DESCRIPTION:${escapeIcs(descParts.join("\n"))}`;

  // Minimal VTIMEZONE block (clients fall back to system tz database)
  const vtz = [
    "BEGIN:VTIMEZONE",
    `TZID:${tz}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0700",
    "TZOFFSETTO:+0700",
    `TZNAME:${tz.split("/").pop() || "Local"}`,
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  const event = (suffix: string, summary: string, start: string, end: string) => [
    "BEGIN:VEVENT",
    `UID:${input.reference}-${suffix}@zivo`,
    `DTSTAMP:${stamp()}`,
    `DTSTART;TZID=${tz}:${start}`,
    `DTEND;TZID=${tz}:${end}`,
    `SUMMARY:${escapeIcs(summary)}`,
    desc,
    loc,
    orgLine,
    ...(attLine ? [attLine] : []),
    ...(url ? [url] : []),
    "STATUS:TENTATIVE",
    "END:VEVENT",
  ];

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZIVO//Lodging//EN",
    "CALSCALE:GREGORIAN",
    ...vtz,
    ...event("ci", `Check-in: ${input.storeName} – ${input.roomName}`, fmtLocal(input.checkIn, ci), fmtLocal(input.checkIn, ciEnd)),
    ...event("co", `Check-out: ${input.storeName} – ${input.roomName}`, fmtLocal(input.checkOut, co), fmtLocal(input.checkOut, coEnd)),
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcsFile(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
