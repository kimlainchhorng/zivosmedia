/**
 * ReservationStatusTimeline - Horizontal stepper visualising reservation lifecycle.
 * Compact mode renders a small inline pill for trip lists.
 */
import { Check, Circle, X, AlertOctagon, Clock, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type LodgeStatus = "hold" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";

interface Props {
  status: LodgeStatus;
  compact?: boolean;
  className?: string;
}

const STEPS: { key: LodgeStatus; label: string; icon: typeof Clock }[] = [
  { key: "hold",         label: "Hold",       icon: Clock },
  { key: "confirmed",    label: "Confirmed",  icon: ShieldCheck },
  { key: "checked_in",   label: "Checked-in", icon: LogIn },
  { key: "checked_out",  label: "Checked-out", icon: LogOut },
];

const STATUS_LABEL: Record<LodgeStatus, string> = {
  hold: "Hold",
  confirmed: "Confirmed",
  checked_in: "Checked-in",
  checked_out: "Checked-out",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const STATUS_TONE: Record<LodgeStatus, string> = {
  hold:         "bg-amber-500/10 text-amber-600 border-amber-500/30",
  confirmed:    "bg-primary/10 text-primary border-primary/30",
  checked_in:   "bg-sky-500/10 text-sky-600 border-sky-500/30",
  checked_out:  "bg-muted text-muted-foreground border-border",
  cancelled:    "bg-destructive/10 text-destructive border-destructive/30",
  no_show:      "bg-destructive/10 text-destructive border-destructive/30",
};

export function ReservationStatusTimeline({ status, compact, className }: Props) {
  const isTerminalBad = status === "cancelled" || status === "no_show";

  if (compact) {
    const Icon = isTerminalBad ? (status === "cancelled" ? X : AlertOctagon) :
      STEPS.find((s) => s.key === status)?.icon || Clock;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold",
          STATUS_TONE[status],
          className
        )}
      >
        <Icon className="h-3 w-3" />
        {STATUS_LABEL[status]}
      </span>
    );
  }

  if (isTerminalBad) {
    const Icon = status === "cancelled" ? X : AlertOctagon;
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-3 rounded-xl border",
          STATUS_TONE[status],
          className
        )}
      >
        <Icon className="h-4 w-4" />
        <p className="text-xs font-bold">{STATUS_LABEL[status]}</p>
        <p className="text-[11px] opacity-80">
          {status === "cancelled" ? "This reservation has been cancelled." : "Guest did not arrive."}
        </p>
      </div>
    );
  }

  const activeIdx = Math.max(0, STEPS.findIndex((s) => s.key === status));

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const reached = i <= activeIdx;
          const isCurrent = i === activeIdx;
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center border-2 transition-colors",
                    reached
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border",
                    isCurrent && "ring-2 ring-primary/30"
                  )}
                >
                  {reached && i < activeIdx ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <p
                  className={cn(
                    "text-[10px] font-semibold leading-tight text-center",
                    reached ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mb-4 transition-colors",
                    i < activeIdx ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
