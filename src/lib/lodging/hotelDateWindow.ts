import {
  differenceInCalendarDays,
  format,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";

export type HotelDateWindowFailureReason =
  "missing" | "unparseable" | "reversed" | "past";

export type HotelDateWindow =
  | {
      ok: true;
      checkIn: Date;
      checkOut: Date;
      checkInIso: string;
      checkOutIso: string;
      nights: number;
    }
  | {
      ok: false;
      reason: HotelDateWindowFailureReason;
    };

const parseDateParam = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = parseISO(value);
  if (!isValid(parsed) || format(parsed, "yyyy-MM-dd") !== value) return null;

  return parsed;
};

export function resolveHotelDateWindow(
  checkInParam: string | null,
  checkOutParam: string | null,
  now = new Date(),
): HotelDateWindow {
  if (!checkInParam || !checkOutParam) {
    return { ok: false, reason: "missing" };
  }

  const checkIn = parseDateParam(checkInParam);
  const checkOut = parseDateParam(checkOutParam);
  if (!checkIn || !checkOut) {
    return { ok: false, reason: "unparseable" };
  }

  const nights = differenceInCalendarDays(checkOut, checkIn);
  if (nights <= 0) {
    return { ok: false, reason: "reversed" };
  }

  if (isBefore(checkIn, startOfDay(now))) {
    return { ok: false, reason: "past" };
  }

  return {
    ok: true,
    checkIn,
    checkOut,
    checkInIso: checkInParam,
    checkOutIso: checkOutParam,
    nights,
  };
}
