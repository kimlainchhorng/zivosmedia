export const RESERVATION_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const DEFAULT_CHECK_IN = "15:00";
const DEFAULT_CHECK_OUT = "11:00";

const normalizeClock = (value?: string | null, fallback = DEFAULT_CHECK_IN) => {
  if (!value) return fallback;
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
};

export const reservationDateLabel = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: RESERVATION_TIMEZONE }).format(new Date(value));
};

export const reservationTimeLabel = (value?: string | null, fallback?: string | null, kind: "check_in" | "check_out" = "check_in") => {
  if (value && value.includes("T")) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: RESERVATION_TIMEZONE }).format(new Date(value));
  }
  return normalizeClock(fallback, kind === "check_out" ? DEFAULT_CHECK_OUT : DEFAULT_CHECK_IN);
};

export const reservationMinutes = (value?: string | null, fallback?: string | null, kind: "check_in" | "check_out" = "check_in") => {
  const label = value && value.includes("T")
    ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: RESERVATION_TIMEZONE }).format(new Date(value))
    : normalizeClock(fallback, kind === "check_out" ? DEFAULT_CHECK_OUT : DEFAULT_CHECK_IN);
  const [h, m] = label.split(":").map(Number);
  return h * 60 + m;
};

export const reservationTimeRangeLabel = (checkIn?: string | null, checkOut?: string | null, inFallback?: string | null, outFallback?: string | null) =>
  `In ${reservationTimeLabel(checkIn, inFallback, "check_in")} · Out ${reservationTimeLabel(checkOut, outFallback, "check_out")}`;