import {
  differenceInDays,
  format,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";

export type RentalDateWindowFailureReason =
  "missing" | "unparseable" | "reversed" | "past";

export type RentalDateWindow =
  | {
      ok: true;
      pickup: Date;
      return: Date;
      totalDays: number;
    }
  | {
      ok: false;
      reason: RentalDateWindowFailureReason;
    };

const parseDateParam = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = parseISO(value);
  if (!isValid(parsed) || format(parsed, "yyyy-MM-dd") !== value) return null;

  return parsed;
};

export function resolveRentalDateWindow(
  pickupParam: string | null,
  returnParam: string | null,
  now = new Date(),
): RentalDateWindow {
  if (!pickupParam || !returnParam) {
    return { ok: false, reason: "missing" };
  }

  const pickup = parseDateParam(pickupParam);
  const returnDate = parseDateParam(returnParam);
  if (!pickup || !returnDate) {
    return { ok: false, reason: "unparseable" };
  }

  const totalDays = differenceInDays(returnDate, pickup);
  if (totalDays <= 0) {
    return { ok: false, reason: "reversed" };
  }

  if (isBefore(pickup, startOfDay(now))) {
    return { ok: false, reason: "past" };
  }

  return { ok: true, pickup, return: returnDate, totalDays };
}
