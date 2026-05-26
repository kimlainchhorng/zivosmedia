/**
 * ReservationStatusHistory — reverse-chronological audit-row list with actor + role.
 * Pairs with `useReservationLive` to refresh in realtime.
 */
import { ArrowRight, X, AlertOctagon, Clock, ShieldCheck, LogIn, LogOut, User, Building2, Shield, Bot } from "lucide-react";
import { useLodgeReservationAudit } from "@/hooks/lodging/useLodgeReservationAudit";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  reservationId: string;
  className?: string;
}

const STATUS_ICON: Record<string, typeof Clock> = {
  hold: Clock,
  confirmed: ShieldCheck,
  checked_in: LogIn,
  checked_out: LogOut,
  cancelled: X,
  no_show: AlertOctagon,
};

const STATUS_LABEL: Record<string, string> = {
  hold: "Hold",
  confirmed: "Confirmed",
  checked_in: "Checked-in",
  checked_out: "Checked-out",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const ROLE_ICON: Record<string, typeof User> = {
  guest: User,
  host: Building2,
  admin: Shield,
  system: Bot,
};

const ROLE_LABEL: Record<string, string> = {
  guest: "Guest",
  host: "Host",
  admin: "Admin",
  system: "System",
};

export function ReservationStatusHistory({ reservationId, className }: Props) {
  const { data: audits = [], isLoading } = useLodgeReservationAudit(reservationId);

  if (isLoading) {
    return <div className="text-[11px] text-muted-foreground">Loading history…</div>;
  }
  if (!audits.length) {
    return <p className="text-[11px] text-muted-foreground">No status changes yet.</p>;
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {audits.map((a) => {
        const Icon = STATUS_ICON[a.to_status] || Clock;
        const role = (a as any).actor_role || "system";
        const RoleIcon = ROLE_ICON[role] || Bot;
        const isBad = a.to_status === "cancelled" || a.to_status === "no_show";
        return (
          <li
            key={a.id}
            className={cn(
              "flex items-start gap-2 p-2 rounded-xl border text-[11px]",
              isBad
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-card"
            )}
          >
            <div
              className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                isBad ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
              )}
            >
              <Icon className="h-3 w-3" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold flex items-center gap-1 flex-wrap">
                {a.from_status ? (
                  <>
                    <span className="text-muted-foreground">{STATUS_LABEL[a.from_status] || a.from_status}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </>
                ) : null}
                <span>{STATUS_LABEL[a.to_status] || a.to_status}</span>
              </p>
              <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                <RoleIcon className="h-3 w-3" />
                <span>by {ROLE_LABEL[role] || role}</span>
                <span>·</span>
                <time>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</time>
              </p>
              {a.note && <p className="text-muted-foreground mt-0.5 italic">"{a.note}"</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
