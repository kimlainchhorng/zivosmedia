/**
 * Generate an .ics file from a list of car-rental reservations.
 * RFC 5545 minimal implementation — works with Google Calendar, Outlook, Apple Calendar.
 */

export interface IcalReservation {
  id: string;
  confirmation_code: string;
  vehicle_label: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  pickup_location_name: string | null;
  pickup_at: string;
  dropoff_at: string;
  status: string;
  total_cents: number;
  rental_days: number;
  internal_notes?: string | null;
  customer_notes?: string | null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toUtcStamp(iso: string): string {
  const d = new Date(iso);
  return [
    d.getUTCFullYear(),
    pad(d.getUTCMonth() + 1),
    pad(d.getUTCDate()),
    "T",
    pad(d.getUTCHours()),
    pad(d.getUTCMinutes()),
    pad(d.getUTCSeconds()),
    "Z",
  ].join("");
}

function escapeIcsText(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold long ICS lines per RFC 5545 (max 75 octets, continuation with CRLF + space).
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + (i === 0 ? 75 : 74));
    out.push((i === 0 ? "" : " ") + chunk);
    i += i === 0 ? 75 : 74;
  }
  return out.join("\r\n");
}

export function buildIcsFile(opts: {
  calendarName: string;
  reservations: IcalReservation[];
  domain?: string;
}): string {
  const { calendarName, reservations, domain = "zivo.app" } = opts;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZIVO//Car Rental//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${escapeIcsText(calendarName)}`),
  ];

  const dtstamp = toUtcStamp(new Date().toISOString());

  for (const r of reservations) {
    const summary = `${r.vehicle_label} · ${r.customer_name}`;
    const descParts = [
      `Code: ${r.confirmation_code}`,
      `Status: ${r.status}`,
      `Total: $${(r.total_cents / 100).toFixed(2)} (${r.rental_days} day${r.rental_days === 1 ? "" : "s"})`,
    ];
    if (r.customer_phone) descParts.push(`Phone: ${r.customer_phone}`);
    if (r.customer_email) descParts.push(`Email: ${r.customer_email}`);
    if (r.customer_notes) descParts.push(`Customer notes: ${r.customer_notes}`);
    if (r.internal_notes) descParts.push(`Internal: ${r.internal_notes}`);
    const description = descParts.join("\n");

    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:car-rental-${r.id}@${domain}`),
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${toUtcStamp(r.pickup_at)}`,
      `DTEND:${toUtcStamp(r.dropoff_at)}`,
      fold(`SUMMARY:${escapeIcsText(summary)}`),
      fold(`DESCRIPTION:${escapeIcsText(description)}`),
    );
    if (r.pickup_location_name) {
      lines.push(fold(`LOCATION:${escapeIcsText(r.pickup_location_name)}`));
    }
    // Map status → STATUS field.
    const statusMap: Record<string, string> = {
      pending: "TENTATIVE",
      confirmed: "CONFIRMED",
      picked_up: "CONFIRMED",
      returned: "CONFIRMED",
      cancelled: "CANCELLED",
      no_show: "CANCELLED",
    };
    lines.push(`STATUS:${statusMap[r.status] ?? "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Browser helper: trigger a download of the .ics blob.
 */
export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
