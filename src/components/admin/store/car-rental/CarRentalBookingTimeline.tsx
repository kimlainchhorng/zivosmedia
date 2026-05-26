/**
 * Vertical lifecycle timeline for a reservation:
 *   Created → Confirmed → Picked up → Returned (or Cancelled / No-show)
 */
import { Calendar, CheckCircle2, KeyRound, ClipboardCheck, XCircle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  createdAt: string;
  pickedUpAt: string | null;
  returnedAt: string | null;
  cancelledAt: string | null;
  refundAt?: string | null;
  status: string;
}

interface Step {
  label: string;
  icon: React.ElementType;
  at: string | null;
  highlight: boolean;
  done: boolean;
  tone: "primary" | "emerald" | "destructive" | "muted";
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function CarRentalBookingTimeline({ createdAt, pickedUpAt, returnedAt, cancelledAt, refundAt, status }: Props) {
  const isCancelled = status === "cancelled" || status === "no_show";
  const isNoShow = status === "no_show";

  const steps: Step[] = [];

  steps.push({
    label: "Booking created",
    icon: Calendar,
    at: createdAt,
    highlight: false,
    done: true,
    tone: "primary",
  });

  if (isCancelled) {
    steps.push({
      label: isNoShow ? "Marked as no-show" : "Cancelled",
      icon: isNoShow ? AlertOctagon : XCircle,
      at: cancelledAt ?? createdAt,
      highlight: true,
      done: true,
      tone: "destructive",
    });
    if (refundAt) {
      steps.push({
        label: "Refund issued",
        icon: CheckCircle2,
        at: refundAt,
        highlight: true,
        done: true,
        tone: "emerald",
      });
    }
  } else {
    steps.push({
      label: "Confirmed",
      icon: CheckCircle2,
      at: status === "pending" ? null : createdAt,
      highlight: status === "confirmed",
      done: status !== "pending",
      tone: "primary",
    });
    steps.push({
      label: "Vehicle picked up",
      icon: KeyRound,
      at: pickedUpAt,
      highlight: status === "picked_up",
      done: Boolean(pickedUpAt),
      tone: "emerald",
    });
    steps.push({
      label: "Vehicle returned",
      icon: ClipboardCheck,
      at: returnedAt,
      highlight: status === "returned",
      done: status === "returned",
      tone: "emerald",
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 print:bg-white print:break-inside-avoid">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Lifecycle</p>
      <ol className="space-y-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const lineTone =
            i === steps.length - 1 ? null :
            steps[i + 1].done ? "bg-foreground/20" : "bg-border";
          const iconBg =
            !s.done ? "bg-muted text-muted-foreground/50" :
            s.tone === "primary" ? "bg-primary/15 text-primary" :
            s.tone === "emerald" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
            s.tone === "destructive" ? "bg-destructive/15 text-destructive" :
            "bg-muted text-muted-foreground";
          return (
            <li key={s.label} className="relative flex items-start gap-3">
              {lineTone && (
                <span className={cn("absolute left-[15px] top-8 bottom-[-12px] w-0.5", lineTone)} aria-hidden />
              )}
              <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full z-10", iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className={cn(
                  "text-sm font-semibold",
                  s.done ? "text-foreground" : "text-muted-foreground",
                  s.highlight && "underline decoration-dotted underline-offset-4"
                )}>
                  {s.label}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {s.at ? formatDateTime(s.at) : "Pending"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
