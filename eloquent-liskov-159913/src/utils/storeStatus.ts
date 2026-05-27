/**
 * Store status utility — determines open/closed/almost-open/closing-soon and live delivery ETA
 * Uses store's country timezone for accurate status
 *
 * Supports multiple `hours` formats:
 *  - "7am–10pm", "7:00 AM - 8:00 PM"        (12h)
 *  - "07:00–22:00", "7:00 - 22:00"          (24h)
 *  - "10pm–2am"                              (overnight)
 *  - "24/7", "24 hours", "Open 24 hours", "always open"
 *  - JSON weekly schedule (string or object) with keys sun/mon/.../sat,
 *    each `{ open, close, closed?, is24h? }`
 *  - "" or "closed" → closed with "Hours not set"
 */

export type StoreStatusType = "open" | "closing-soon" | "almost-open" | "closed";

export interface StoreStatusResult {
  isOpen: boolean;
  status: StoreStatusType;
  label: string;
  closesAt?: string;
  formattedHours?: string;
}

/** Map market/country codes to IANA timezones */
const MARKET_TIMEZONES: Record<string, string> = {
  KH: "Asia/Phnom_Penh",
  US: "America/New_York",
  kh: "Asia/Phnom_Penh",
  us: "America/New_York",
  cambodia: "Asia/Phnom_Penh",
  usa: "America/New_York",
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Get current hours, minutes & weekday in a given timezone */
function getNowInTimezone(timezone?: string): { hours: number; minutes: number; weekday: number } {
  const now = new Date();
  if (!timezone) {
    return { hours: now.getHours(), minutes: now.getMinutes(), weekday: now.getDay() };
  }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hour12: false,
    }).formatToParts(now);
    const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
    const wd = parts.find((p) => p.type === "weekday")?.value || "";
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { hours: h === 24 ? 0 : h, minutes: m, weekday: weekdayMap[wd] ?? now.getDay() };
  } catch {
    return { hours: now.getHours(), minutes: now.getMinutes(), weekday: now.getDay() };
  }
}

function fmt12(h: number, m: number): string {
  const ap = h >= 12 ? "PM" : "AM";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  const mm = m > 0 ? `:${m.toString().padStart(2, "0")}` : ":00";
  return `${hh}${mm} ${ap}`;
}

/** Parse an hours string. Returns null if not parseable. */
function parseHoursString(hours: string) {
  // 12-hour with am/pm
  const m12 = hours.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[–\-to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (m12) {
    let openHour = parseInt(m12[1]);
    const openMin = m12[2] ? parseInt(m12[2]) : 0;
    const openAp = m12[3].toLowerCase();
    let closeHour = parseInt(m12[4]);
    const closeMin = m12[5] ? parseInt(m12[5]) : 0;
    const closeAp = m12[6].toLowerCase();
    const formattedOpen = `${openHour}${openMin ? `:${openMin.toString().padStart(2, "0")}` : ":00"} ${openAp.toUpperCase()}`;
    const formattedClose = `${closeHour}${closeMin ? `:${closeMin.toString().padStart(2, "0")}` : ":00"} ${closeAp.toUpperCase()}`;
    if (openAp === "pm" && openHour !== 12) openHour += 12;
    if (openAp === "am" && openHour === 12) openHour = 0;
    if (closeAp === "pm" && closeHour !== 12) closeHour += 12;
    if (closeAp === "am" && closeHour === 12) closeHour = 0;
    return { openHour, openMin, closeHour, closeMin, formattedOpen, formattedClose };
  }

  // 24-hour clock (no am/pm)
  const m24 = hours.match(/(\d{1,2}):(\d{2})\s*[–\-to]+\s*(\d{1,2}):(\d{2})/);
  if (m24) {
    const openHour = parseInt(m24[1]);
    const openMin = parseInt(m24[2]);
    const closeHour = parseInt(m24[3]);
    const closeMin = parseInt(m24[4]);
    return {
      openHour,
      openMin,
      closeHour,
      closeMin,
      formattedOpen: fmt12(openHour, openMin),
      formattedClose: fmt12(closeHour, closeMin),
    };
  }

  return null;
}

/** Try to interpret a JSON weekly-schedule. Returns today's hours string or special tokens. */
function extractTodayFromSchedule(hours: string, weekday: number): string | "ALL_24H" | "CLOSED_TODAY" | null {
  let parsed: any;
  try {
    parsed = typeof hours === "string" ? JSON.parse(hours) : hours;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (!DAY_KEYS.some((k) => k in parsed)) return null;

  const allDays24 = DAY_KEYS.every((k) => parsed[k]?.is24h);
  if (allDays24) return "ALL_24H";

  const today = parsed[DAY_KEYS[weekday]];
  if (!today) return null;
  if (today.closed) return "CLOSED_TODAY";
  if (today.is24h) return "ALL_24H";
  if (today.open && today.close) return `${today.open} – ${today.close}`;
  return null;
}

/**
 * @param hours - opening hours string or JSON weekly schedule
 * @param market - optional market/country code (e.g. "KH", "US") to use correct timezone
 */
export function getStoreStatus(hours: string, market?: string): StoreStatusResult {
  const timezone = market ? MARKET_TIMEZONES[market] || MARKET_TIMEZONES[market.toLowerCase()] : undefined;
  const { hours: currentHour, minutes: currentMin, weekday } = getNowInTimezone(timezone);
  const currentMinutes = currentHour * 60 + currentMin;

  // Empty / closed marker
  if (!hours || !hours.trim()) {
    return { isOpen: false, status: "closed", label: "Hours not set" };
  }
  const trimmed = hours.trim();
  if (/^closed$/i.test(trimmed)) {
    return { isOpen: false, status: "closed", label: "Closed" };
  }

  // 24/7
  if (/24\s*\/\s*7|24\s*hours|always\s*open|open\s*24/i.test(trimmed)) {
    return { isOpen: true, status: "open", label: "Open 24 hours", formattedHours: "Open 24 hours" };
  }

  // JSON weekly schedule
  const todayFromSchedule = extractTodayFromSchedule(trimmed, weekday);
  if (todayFromSchedule === "ALL_24H") {
    return { isOpen: true, status: "open", label: "Open 24 hours", formattedHours: "Open 24 hours" };
  }
  if (todayFromSchedule === "CLOSED_TODAY") {
    return { isOpen: false, status: "closed", label: "Closed today" };
  }
  const effectiveHours = typeof todayFromSchedule === "string" ? todayFromSchedule : trimmed;

  const parsed = parseHoursString(effectiveHours);
  if (!parsed) {
    // Unrecognized format — be safe and report unknown rather than always-open lie
    return { isOpen: false, status: "closed", label: "Hours unavailable", formattedHours: effectiveHours };
  }

  const { openHour, openMin, closeHour, closeMin, formattedOpen, formattedClose } = parsed;
  const openMinutes = openHour * 60 + openMin;
  let closeMinutes = closeHour * 60 + closeMin;
  const formattedHours = `${formattedOpen}–${formattedClose}`;

  // Overnight hours (e.g. 10pm–2am) — close wraps to next day
  const overnight = closeMinutes <= openMinutes;
  let nowM = currentMinutes;
  if (overnight) {
    closeMinutes += 24 * 60;
    if (nowM < openMinutes) nowM += 24 * 60;
  }

  const isOpen = nowM >= openMinutes && nowM < closeMinutes;

  if (isOpen) {
    const minutesLeft = closeMinutes - nowM;
    if (minutesLeft <= 30) {
      return { isOpen: true, status: "closing-soon", label: `Closing in ${minutesLeft}m`, closesAt: formattedClose, formattedHours };
    }
    if (minutesLeft <= 60) {
      return { isOpen: true, status: "closing-soon", label: `Closes in ${minutesLeft}m`, closesAt: formattedClose, formattedHours };
    }
    return { isOpen: true, status: "open", label: "Open", closesAt: formattedClose, formattedHours };
  }

  const minutesUntilOpen = openMinutes - currentMinutes;
  if (minutesUntilOpen > 0 && minutesUntilOpen <= 60) {
    return { isOpen: false, status: "almost-open", label: `Opens in ${minutesUntilOpen}m`, formattedHours };
  }

  return { isOpen: false, status: "closed", label: "Closed", formattedHours };
}

/** Simulate live delivery ETA with slight variation from base */
export function getLiveEta(baseMin: number): number {
  const variation = Math.floor(Math.random() * 10) - 3;
  return Math.max(15, baseMin + variation);
}
