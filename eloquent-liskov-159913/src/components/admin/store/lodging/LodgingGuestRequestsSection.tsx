import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquareText, PackagePlus } from "lucide-react";
import { EmptyPanel, LoadingPanel, NextActions, SectionShell, StatCard, money } from "./LodgingOperationsShared";
import { useStoreChangeRequestInbox } from "@/hooks/lodging/useReservationChangeRequests";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";
import LodgingNeedsSetupEmptyState from "./LodgingNeedsSetupEmptyState";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

const goReservations = () => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab: "lodge-reservations" } }));

export default function LodgingGuestRequestsSection({ storeId }: { storeId: string }) {
  const { data: pending = [], isLoading } = useStoreChangeRequestInbox(storeId);
  const { data: reservations = [] } = useLodgeReservations(storeId, "all");
  const addonReservations = reservations.filter((reservation: any) => Array.isArray(reservation.addons) && reservation.addons.length > 0);
  const activeServices = addonReservations.filter((r) => !["cancelled", "checked_out", "no_show"].includes(r.status));
  const completedServices = addonReservations.filter((r) => r.status === "checked_out");
  const failedServices = reservations.filter((r) => ["cancelled", "no_show"].includes(r.status) && (r.extras_cents || 0) > 0);
  const pendingAddons = pending.filter((request) => request.type === "addon");

  return (
    <SectionShell title="Guest Requests" subtitle="Service requests, add-on follow-up, and reservation actions for front-desk teams." icon={MessageSquareText} actions={<Button size="sm" onClick={goReservations}>Open Reservations</Button>}>
      <LodgingQuickJump active="lodge-guest-requests" />
      <LodgingSectionStatusBanner title="Guest Requests" icon={MessageSquareText} countLabel="Pending requests" countValue={pendingAddons.length} fixLabel="Open Concierge" fixTab="lodge-concierge" />
      {isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pending add-ons" value={String(pendingAddons.length)} icon={PackagePlus} />
          <StatCard label="Approved services" value={String(activeServices.length)} icon={MessageSquareText} />
          <StatCard label="Failed / cancelled" value={String(failedServices.length)} icon={MessageSquareText} />
          <StatCard label="Completed services" value={String(completedServices.length)} icon={MessageSquareText} />
        </div>
        {pending.length === 0 && addonReservations.length === 0 ? <LodgingNeedsSetupEmptyState icon={MessageSquareText} title="Guest request workspace is ready" description="Approved add-ons, change requests, service follow-ups, and reservation-linked guest needs will appear here for front-desk action." primaryAction={{ label: "Configure guest add-ons", tab: "lodge-addons" }} secondaryAction={{ label: "Review reservations", tab: "lodge-reservations" }} nextBestAction="Create reservations or add-ons so guest requests can flow into this queue." /> : (
          <div className="space-y-2">
            {[...pending.slice(0, 8), ...activeServices.slice(0, 4).map((reservation: any) => ({ id: `res-${reservation.id}`, type: "addon", status: "approved", reservation, price_delta_cents: reservation.extras_cents || 0, created_at: reservation.updated_at }))].map((item: any) => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.reservation?.guest_name || "Guest request"}</p>
                    <p className="text-xs text-muted-foreground">{item.reservation?.number || "Reservation"} · {String(item.type).replace(/_/g, " ")} · {money(item.price_delta_cents || item.reservation?.extras_cents || 0)}</p>
                  </div>
                  <Badge variant={item.status === "pending" ? "default" : "secondary"}>{String(item.status).replace(/_/g, " ")}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
        <NextActions actions={[{ label: "Review reservations", tab: "lodge-reservations", hint: "Open bookings with guest details and status workflow." }, { label: "Open front desk", tab: "lodge-frontdesk", hint: "Handle today’s arrivals, in-house guests, and departures." }, { label: "Manage add-ons", tab: "lodge-addons", hint: "Search and audit the guest service catalog." }]} />
      </>}
    </SectionShell>
  );
}
