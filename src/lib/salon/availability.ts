/**
 * Compute open booking time slots for a salon stylist on a given date.
 * Inputs:
 *  - schedule rows for the stylist (one per day_of_week)
 *  - existing bookings for that stylist on the chosen date
 *  - the requested service duration
 *  - slot granularity (default 15 min)
 * Returns sorted ISO start times that fit fully within working hours and
 * don't overlap with any pending/confirmed booking.
 */

export interface ScheduleRow {
  day_of_week: number;
  is_working: boolean;
  start_time: string | null; // "09:00:00"
  end_time: string | null;
}

export interface BusyRange {
  start_at: string; // ISO
  end_at: string;
}

export interface AvailabilityInput {
  /** YYYY-MM-DD in the user's locale. */
  date: string;
  schedule: ScheduleRow[];
  busy: BusyRange[];
  durationMinutes: number;
  slotMinutes?: number;
  /** Don't return slots earlier than this. Defaults to "now" if date is today. */
  earliestStart?: Date;
}

const MS_PER_MIN = 60 * 1000;

export function computeOpenSlots({
  date,
  schedule,
  busy,
  durationMinutes,
  slotMinutes = 15,
  earliestStart,
}: AvailabilityInput): string[] {
  if (durationMinutes <= 0) return [];
  const target = new Date(`${date}T00:00:00`);
  const dow = target.getDay();
  const row = schedule.find((s) => s.day_of_week === dow);
  if (!row || !row.is_working || !row.start_time || !row.end_time) return [];

  const startOfDay = new Date(target);
  const [sh, sm] = row.start_time.split(":").map(Number);
  const [eh, em] = row.end_time.split(":").map(Number);
  const windowStart = new Date(startOfDay);
  windowStart.setHours(sh, sm, 0, 0);
  const windowEnd = new Date(startOfDay);
  windowEnd.setHours(eh, em, 0, 0);

  const busyRanges = busy.map((b) => ({
    start: new Date(b.start_at).getTime(),
    end: new Date(b.end_at).getTime(),
  }));

  const minStart = earliestStart ? earliestStart.getTime() : 0;
  const slots: string[] = [];
  for (
    let t = windowStart.getTime();
    t + durationMinutes * MS_PER_MIN <= windowEnd.getTime();
    t += slotMinutes * MS_PER_MIN
  ) {
    if (t < minStart) continue;
    const slotEnd = t + durationMinutes * MS_PER_MIN;
    const overlaps = busyRanges.some((r) => t < r.end && slotEnd > r.start);
    if (!overlaps) slots.push(new Date(t).toISOString());
  }
  return slots;
}
