/**
 * RescheduleSheet — date-range picker + price-delta preview for moving a stay.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarRange, AlertTriangle, Sparkles } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useLodgingReschedulePreview } from "@/hooks/lodging/useLodgingReschedulePreview";
import { useRoomConflictCheck } from "@/hooks/lodging/useRoomConflictCheck";
import { useReservationActions } from "@/hooks/lodging/useReservationChangeRequests";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reservationId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  totalCents: number;
  blockedDates?: string[];
}

export default function RescheduleSheet({
  open,
  onOpenChange,
  reservationId,
  roomId,
  checkIn,
  checkOut,
  totalCents,
  blockedDates = [],
}: Props) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState("");
  const newCheckIn = range?.from ? format(range.from, "yyyy-MM-dd") : undefined;
  const newCheckOut = range?.to ? format(range.to, "yyyy-MM-dd") : undefined;

  const preview = useLodgingReschedulePreview({
    originalCheckIn: checkIn,
    originalCheckOut: checkOut,
    originalTotalCents: totalCents,
    newCheckIn,
    newCheckOut,
  });

  const { data: conflict } = useRoomConflictCheck(
    roomId,
    newCheckIn || "",
    newCheckOut || "",
    !!newCheckIn && !!newCheckOut,
    reservationId,
  );

  const { requestReschedule } = useReservationActions(reservationId);

  const handleSubmit = async () => {
    if (!newCheckIn || !newCheckOut) return;
    try {
      const res = await requestReschedule.mutateAsync({
        check_in: newCheckIn,
        check_out: newCheckOut,
        reason: reason.trim() || undefined,
      });
      toast.success(
        res.auto_approved
          ? "Dates updated! Your stay has been moved."
          : "Request sent — the host will respond shortly.",
      );
      onOpenChange(false);
      setRange(undefined);
      setReason("");
    } catch (e: any) {
      toast.error(e.message || "Could not request reschedule");
    }
  };

  const blocked = conflict?.conflict;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5" /> Move your dates
          </SheetTitle>
          <SheetDescription>
            Pick new check-in and check-out dates. Availability and pricing are rechecked before changes are applied.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="rounded-xl border bg-card p-3 flex justify-center">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={1}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0)) || blockedDates.includes(format(d, "yyyy-MM-dd"))}
              className="p-3 pointer-events-auto"
            />
          </div>

          {preview && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New stay</span>
                <span className="font-semibold">
                  {preview.newNights} night{preview.newNights !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nightly rate</span>
                <span>${(preview.nightlyRateCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New total</span>
                <span className="font-semibold">${(preview.newTotalCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Price difference</span>
                <span
                  className={
                    preview.deltaCents > 0
                      ? "font-bold text-destructive"
                      : preview.deltaCents < 0
                        ? "font-bold text-emerald-600"
                        : "font-bold"
                  }
                >
                  {preview.deltaCents > 0 ? "+" : ""}${(preview.deltaCents / 100).toFixed(2)}
                </span>
              </div>
              {preview.autoApprovable ? (
                <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2 mt-1">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Instant approval when the room is free and no extra payment is required.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Host approval is needed. If the price increases, your saved card may be charged after approval.</span>
                </div>
              )}
            </div>
          )}

          {blocked && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                The room is already booked on those dates. Try different dates.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Plans changed, flight delay, etc."
              className="mt-1.5"
              rows={3}
            />
          </div>

          <div className="flex gap-2 sticky bottom-0 bg-background pt-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!preview || blocked || requestReschedule.isPending}
              onClick={handleSubmit}
            >
              {requestReschedule.isPending ? "Submitting…" : "Request change"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
