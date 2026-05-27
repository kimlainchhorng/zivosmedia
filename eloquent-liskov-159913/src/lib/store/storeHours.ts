/**
 * storeHours — lightweight parser for free-text store hours.
 * Returns null when input is unparseable so the UI can stay silent
 * rather than guess wrong. Uses the user's local timezone.
 *
 * Supports patterns commonly present in seed data:
 *   "24/7", "24 hours", "Always open"
 *   "Closed"
 *   "Mon–Sun 8:00–22:00"     (en-dash, em-dash, hyphen)
 *   "Mon-Fri 9-18"
 *   "Daily 7am–11pm"
 *   "Mon-Fri 9-18, Sat-Sun 10-16"
 */

export type WeekIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sun

export interface DayWindow {
  /** Minutes since 00:00 local. Overnight windows are represented as start > end. */
  start: number;
  end: number;
}

export type WeekSchedule = Partial<Record<WeekIndex, DayWindow[]>> & {
  alwaysOpen?: boolean;
  alwaysClosed?: boolean;
};

const DAY_TOKENS: Record<string, WeekIndex> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const DASH_RE = /[-–—]/g;
const JSON_DAY_KEYS: Record<string, WeekIndex> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function normalizeDashes(s: string): string {
  return s.replace(DASH_RE, "-");
}

function dayRange(from: WeekIndex, to: WeekIndex): WeekIndex[] {
  const out: WeekIndex[] = [];
  let i = from;
  // include up to 7 steps to handle Mon-Sun, Fri-Mon (wrap), etc.
  for (let n = 0; n < 7; n++) {
    out.push(i as WeekIndex);
    if (i === to) break;
    i = ((i + 1) % 7) as WeekIndex;
  }
  return out;
}

function parseClock(raw: string): number | null {
  // accepts "9", "9am", "9:30", "9:30 pm", "21", "21:00"
  const m = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3];
  if (Number.isNaN(h) || h > 24 || min > 59) return null;
  if (ap === "am") {
    if (h === 12) h = 0;
  } else if (ap === "pm") {
    if (h !== 12) h += 12;
  }
  // 24:00 maps to end-of-day
  if (h === 24) h = 24;
  return h * 60 + min;
}

function parseJsonSchedule(input: string): WeekSchedule | null {
  if (!input.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(input) as Record<string, unknown>;
    const schedule: WeekSchedule = {};
    let openDays = 0;
    let twentyFourHourDays = 0;

    for (const [dayKey, day] of Object.entries(parsed)) {
      const dayIndex = JSON_DAY_KEYS[dayKey.slice(0, 3).toLowerCase()];
      if (dayIndex === undefined || !day || typeof day !== "object") continue;
      const info = day as Record<string, unknown>;
      if (info.closed === true) continue;

      openDays += 1;
      if (info.is24h === true) {
        schedule[dayIndex] = [{ start: 0, end: 24 * 60 }];
        twentyFourHourDays += 1;
        continue;
      }

      const open = typeof info.open === "string" ? parseClock(info.open) : null;
      const close = typeof info.close === "string" ? parseClock(info.close) : null;
      if (open != null && close != null) {
        schedule[dayIndex] = [{ start: open, end: close }];
      }
    }

    if (openDays === 0) return { alwaysClosed: true };
    if (openDays === 7 && twentyFourHourDays === 7) return { alwaysOpen: true };
    return Object.keys(schedule).length ? schedule : null;
  } catch {
    return null;
  }
}

/** Parse free-text hours into a per-day schedule. Returns null if unparseable. */
export function parseHours(input: string | null | undefined): WeekSchedule | null {
  if (!input) return null;
  const text = normalizeDashes(input.trim().toLowerCase());
  if (!text) return null;

  const jsonSchedule = parseJsonSchedule(input);
  if (jsonSchedule) return jsonSchedule;

  if (/(^|\s)(24\s*\/\s*7|24\s*hours?|always\s*open|open\s*24)/.test(text)) {
    return { alwaysOpen: true };
  }
  if (/^closed$/.test(text) || /(^|\s)permanently\s*closed/.test(text)) {
    return { alwaysClosed: true };
  }

  // Split on commas/semicolons into segments
  const segments = text.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const schedule: WeekSchedule = {};
  let matchedAny = false;

  for (const seg of segments) {
    // Forms:
    //  "mon-fri 9-18"
    //  "mon 9-18"
    //  "daily 7am-11pm"
    //  "weekends 10-16"
    const m = seg.match(
      /^(daily|everyday|weekday[s]?|weekend[s]?|[a-z]{3,9})(?:\s*-\s*([a-z]{3,9}))?\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/
    );
    if (!m) continue;

    const [, fromTok, toTok, openRaw, closeRaw] = m;
    const open = parseClock(openRaw);
    const close = parseClock(closeRaw);
    if (open == null || close == null) continue;

    const days: WeekIndex[] | null = (() => {
      if (fromTok === "daily" || fromTok === "everyday") return [0, 1, 2, 3, 4, 5, 6];
      if (fromTok === "weekday" || fromTok === "weekdays") return [1, 2, 3, 4, 5];
      if (fromTok === "weekend" || fromTok === "weekends") return [0, 6];
      const from = DAY_TOKENS[fromTok];
      const to = toTok ? DAY_TOKENS[toTok] : from;
      return from === undefined || to === undefined ? null : dayRange(from, to);
    })();

    if (!days) continue;
    for (const d of days) {
      (schedule[d] ||= []).push({ start: open, end: close });
    }
    matchedAny = true;
  }

  return matchedAny ? schedule : null;
}

/** True if the store is open at `now` in the user's local timezone. Returns null when unknown. */
export function isOpenNow(input: string | null | undefined, now: Date = new Date()): boolean | null {
  const sched = parseHours(input);
  if (!sched) return null;
  if (sched.alwaysOpen) return true;
  if (sched.alwaysClosed) return false;

  const today = now.getDay() as WeekIndex;
  const yesterday = ((today + 6) % 7) as WeekIndex;
  const minutes = now.getHours() * 60 + now.getMinutes();

  const inWindow = (w: DayWindow, m: number) => {
    if (w.start <= w.end) return m >= w.start && m < w.end;
    // overnight
    return m >= w.start || m < w.end;
  };

  const todayWins = sched[today] || [];
  for (const w of todayWins) if (inWindow(w, minutes)) return true;

  // overnight spillover from yesterday
  const ywins = sched[yesterday] || [];
  for (const w of ywins) {
    if (w.start > w.end && minutes < w.end) return true;
  }
  return false;
}
