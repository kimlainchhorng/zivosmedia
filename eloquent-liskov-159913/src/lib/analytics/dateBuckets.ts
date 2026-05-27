/**
 * Local-timezone date range helpers for analytics queries.
 *
 * All ranges are anchored to the device's local timezone — "today" means
 * "today as the user sees it on their phone", not UTC.
 */

export type Bucket = "today" | "this_week" | "this_month";

export interface BucketRange {
  /** ISO timestamp (inclusive) — UTC representation of local-tz start. */
  since: string;
  /** ISO timestamp (exclusive) — UTC representation of local-tz end. */
  until: string;
  /** IANA tz, e.g. "Asia/Phnom_Penh". */
  timeZone: string;
  /** Offset from UTC in minutes (e.g. +420 for ICT). */
  tzOffsetMinutes: number;
  /** Human label, e.g. "Today" / "This week". */
  label: string;
}

function getTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Returns local-tz start of day for the given `now`. */
function startOfLocalDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns local-tz start of week (Monday) for the given `now`. */
function startOfLocalWeek(now: Date): Date {
  const d = startOfLocalDay(now);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // shift so Monday=0
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfLocalMonth(now: Date): Date {
  const d = startOfLocalDay(now);
  d.setDate(1);
  return d;
}

export function getBucketRange(bucket: Bucket, now: Date = new Date()): BucketRange {
  const tz = getTimeZone();
  const tzOffsetMinutes = -now.getTimezoneOffset(); // JS returns inverse sign
  let start: Date;
  let label: string;

  switch (bucket) {
    case "today":
      start = startOfLocalDay(now);
      label = "Today";
      break;
    case "this_week":
      start = startOfLocalWeek(now);
      label = "This week";
      break;
    case "this_month":
      start = startOfLocalMonth(now);
      label = "This month";
      break;
  }

  // `until` = start + duration; for simplicity we use "now" as the upper bound
  // so the bucket reflects engagement up to the present moment.
  const end = now;

  return {
    since: start.toISOString(),
    until: end.toISOString(),
    timeZone: tz,
    tzOffsetMinutes,
    label,
  };
}

/** Format a Date as `YYYY-MM-DD` in the device's local timezone. */
export function formatLocalDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
