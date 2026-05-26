/**
 * ConflictReasonPanel — explains why Confirm is disabled by listing
 * the actual overlapping reservations on the same room.
 */
import { AlertTriangle, CalendarX, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface ConflictRow {
  id: string;
  reference: string | null;
  status: string;
  check_in: string;
  check_out: string;
  guest_first_name?: string | null;
}

interface Props {
  conflicts: ConflictRow[];
  onPickNewDates?: () => void;
  showGuestName?: boolean; // host-only
  className?: string;
}

const STATUS_TONE: Record<string, string> = {
  hold: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  confirmed: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  checked_in: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

const fmtDate = (d: string) => {
  try { return format(new Date(d), "MMM d"); } catch { return d; }
};

export function ConflictReasonPanel({ conflicts, onPickNewDates, showGuestName, className }: Props) {
  if (!conflicts.length) return null;
  return (
    <div className={cn("rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2", className)}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-destructive">Room is booked for these dates</p>
          <p className="text-[11px] text-destructive/80 mt-0.5">
            {conflicts.length === 1
              ? "1 reservation overlaps with your selection."
              : `${conflicts.length} reservations overlap with your selection.`}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {conflicts.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <CalendarX className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-bold truncate">
                #{c.reference || c.id.slice(0, 6).toUpperCase()}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize",
                  STATUS_TONE[c.status] || "bg-muted text-muted-foreground border-border"
                )}
              >
                {c.status.replace(/_/g, " ")}
              </span>
              {showGuestName && c.guest_first_name && (
                <span className="text-[10px] text-muted-foreground truncate">· {c.guest_first_name}</span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
              {fmtDate(c.check_in)} <ArrowRight className="h-2.5 w-2.5" /> {fmtDate(c.check_out)}
            </span>
          </li>
        ))}
      </ul>

      {onPickNewDates && (
        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1" onClick={onPickNewDates}>
          Pick new dates
        </Button>
      )}
    </div>
  );
}
