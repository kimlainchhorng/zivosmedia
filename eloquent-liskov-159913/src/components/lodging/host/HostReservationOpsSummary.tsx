import { AlertTriangle, CalendarCheck2, CalendarDays, CreditCard, LifeBuoy, PlaneLanding, PlaneTakeoff, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LodgeReservation } from "@/hooks/lodging/useLodgeReservations";
import type { ReservationChangeRequest } from "@/hooks/lodging/useReservationChangeRequests";
import type { LodgingRefundDispute } from "@/hooks/lodging/useLodgingRefundDisputes";

interface Props { reservations: LodgeReservation[]; requests?: ReservationChangeRequest[]; disputes?: LodgingRefundDispute[]; onFilter?: (value: string) => void; }

const today = () => new Date().toISOString().slice(0, 10);

export default function HostReservationOpsSummary({ reservations, requests = [], disputes = [], onFilter }: Props) {
  const t = today();
  const items = [
    { label: "Pending requests", value: requests.length, icon: LifeBuoy, filter: "pending", tone: "primary" },
    { label: "Arrivals today", value: reservations.filter((r) => r.check_in === t && !["cancelled", "no_show"].includes(r.status)).length, icon: PlaneLanding, filter: t, tone: "primary" },
    { label: "Departures today", value: reservations.filter((r) => r.check_out === t && r.status !== "cancelled").length, icon: PlaneTakeoff, filter: t, tone: "secondary" },
    { label: "Payment issues", value: reservations.filter((r) => ["failed", "past_due", "requires_payment", "unpaid"].includes(String(r.payment_status))).length, icon: CreditCard, filter: "failed", tone: "destructive" },
    { label: "Refund disputes", value: disputes.filter((d) => ["pending", "under_review"].includes(d.status)).length, icon: AlertTriangle, filter: "dispute", tone: "destructive" },
    { label: "Add-on failures", value: requests.filter((r) => r.type === "addon" && r.status === "failed").length, icon: XCircle, filter: "addon failed", tone: "destructive" },
    { label: "Cancelled/refund", value: reservations.filter((r) => r.status === "cancelled" || String(r.payment_status).includes("refund")).length, icon: CalendarDays, filter: "refund", tone: "secondary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button type="button" key={item.label} onClick={() => onFilter?.(item.filter)} className="rounded-lg border bg-card p-3 text-left hover:bg-muted/40 transition">
            <div className="flex items-center justify-between gap-2">
              <Icon className={item.tone === "destructive" ? "h-4 w-4 text-destructive" : "h-4 w-4 text-primary"} />
              <Badge variant={item.tone === "destructive" ? "destructive" : "secondary"}>{item.value}</Badge>
            </div>
            <p className="mt-2 text-[11px] font-medium text-muted-foreground leading-tight">{item.label}</p>
          </button>
        );
      })}
    </div>
  );
}