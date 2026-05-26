/**
 * useLodgingReschedulePreview — computes the price delta for moving dates
 * on a reservation, given the room's nightly rate.
 *
 * Pure client-side preview; the server re-validates on submit.
 */
import { useMemo } from "react";
import { differenceInCalendarDays } from "date-fns";

interface PreviewInput {
  originalCheckIn: string;
  originalCheckOut: string;
  originalTotalCents: number;
  newCheckIn: string | undefined;
  newCheckOut: string | undefined;
}

export interface ReschedulePreview {
  oldNights: number;
  newNights: number;
  nightlyRateCents: number;
  newTotalCents: number;
  deltaCents: number;
  daysShifted: number;
  autoApprovable: boolean;
}

export function useLodgingReschedulePreview({
  originalCheckIn,
  originalCheckOut,
  originalTotalCents,
  newCheckIn,
  newCheckOut,
}: PreviewInput): ReschedulePreview | null {
  return useMemo(() => {
    if (!newCheckIn || !newCheckOut) return null;
    const oldIn = new Date(originalCheckIn);
    const oldOut = new Date(originalCheckOut);
    const newIn = new Date(newCheckIn);
    const newOut = new Date(newCheckOut);
    if (isNaN(newIn.getTime()) || isNaN(newOut.getTime())) return null;

    const oldNights = Math.max(1, differenceInCalendarDays(oldOut, oldIn));
    const newNights = Math.max(0, differenceInCalendarDays(newOut, newIn));
    if (newNights < 1) return null;

    const nightlyRateCents = Math.round(originalTotalCents / oldNights);
    const newTotalCents = nightlyRateCents * newNights;
    const deltaCents = newTotalCents - originalTotalCents;
    const daysShifted = Math.abs(differenceInCalendarDays(newIn, oldIn));
    const autoApprovable = daysShifted <= 14;

    return {
      oldNights,
      newNights,
      nightlyRateCents,
      newTotalCents,
      deltaCents,
      daysShifted,
      autoApprovable,
    };
  }, [originalCheckIn, originalCheckOut, originalTotalCents, newCheckIn, newCheckOut]);
}
