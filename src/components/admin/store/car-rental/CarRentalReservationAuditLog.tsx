/**
 * Audit log of reservation events. Reads `car_rental_reservation_events` and
 * renders a chronological list under the reservation's lifecycle timeline.
 */
import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props { reservationId: string }

interface Event {
  id: string;
  event_type: "created" | "status_changed" | "vehicle_changed" | "dates_changed" | "price_changed" | "refunded" | "damage_recorded" | "cancelled" | "other";
  actor_source: string;
  detail: Record<string, unknown>;
  created_at: string;
}

const formatTs = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function describe(e: Event): { label: string; detail?: string } {
  const d = e.detail ?? {};
  switch (e.event_type) {
    case "created": {
      const status = String(d.status ?? "pending");
      return { label: `Booking created (${status})`, detail: typeof d.vehicle_label === "string" ? String(d.vehicle_label) : undefined };
    }
    case "status_changed":
      return { label: `Status: ${d.from} → ${d.to}` };
    case "vehicle_changed":
      return { label: `Vehicle changed`, detail: `${d.from} → ${d.to}` };
    case "dates_changed":
      return { label: "Dates changed" };
    case "price_changed":
      return { label: "Price changed", detail: `${formatCents(d.from_cents)} → ${formatCents(d.to_cents)}` };
    case "refunded":
      return { label: `Refunded ${formatCents(d.amount_cents)}`, detail: typeof d.method === "string" ? d.method : undefined };
    case "damage_recorded":
      return { label: "Damage recorded", detail: `${(d.marks as number) ?? 0} mark${(d.marks as number) === 1 ? "" : "s"}` };
    case "cancelled":
      return { label: `Cancelled${d.to === "no_show" ? " (no-show)" : ""}`, detail: d.reason ? String(d.reason) : undefined };
    default:
      return { label: "Event" };
  }
}

function formatCents(v: unknown): string {
  if (typeof v !== "number") return "—";
  return `$${(v / 100).toFixed(2)}`;
}

export default function CarRentalReservationAuditLog({ reservationId }: Props) {
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("car_rental_reservation_events")
        .select("id, event_type, actor_source, detail, created_at")
        .eq("reservation_id", reservationId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (cancelled) return;
      setEvents((data ?? []) as unknown as Event[]);
    })();
    return () => { cancelled = true; };
  }, [reservationId]);

  if (events === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 print:bg-white">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading audit log…
        </p>
      </div>
    );
  }
  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 print:bg-white print:break-inside-avoid">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 inline-flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" /> Audit log ({events.length})
      </p>
      <ol className="space-y-1.5">
        {events.map((e) => {
          const { label, detail } = describe(e);
          return (
            <li key={e.id} className="flex items-baseline justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{label}</p>
                {detail && <p className="text-[11px] text-muted-foreground truncate">{detail}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-muted-foreground tabular-nums">{formatTs(e.created_at)}</p>
                <p className={cn(
                  "text-[9px] font-bold uppercase tracking-wider",
                  e.actor_source === "app" ? "text-emerald-600 dark:text-emerald-300" :
                  e.actor_source === "system" ? "text-muted-foreground" : "text-primary"
                )}>{e.actor_source}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
