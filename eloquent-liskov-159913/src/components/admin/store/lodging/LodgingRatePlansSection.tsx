import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BedDouble, CalendarDays, DollarSign } from "lucide-react";
import { EmptyPanel, LoadingPanel, NextActions, SectionShell, StatCard, money } from "./LodgingOperationsShared";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const goRooms = () => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab: "lodge-rooms" } }));

export default function LodgingRatePlansSection({ storeId }: { storeId: string }) {
  const { data: rooms = [], isLoading } = useLodgeRooms(storeId);
  const activeRooms = rooms.filter((room) => room.is_active);
  const seasonalCount = rooms.reduce((sum, room) => sum + (room.seasonal_rates?.length || 0), 0);
  const avgBase = activeRooms.length ? activeRooms.reduce((sum, room) => sum + (room.base_rate_cents || 0), 0) / activeRooms.length : 0;

  return (
    <SectionShell title="Rate Plans & Availability" subtitle="Room pricing, inventory, seasonal rates, discounts, and stay restrictions from Rooms & Rates." icon={CalendarDays} actions={<Button size="sm" onClick={goRooms}>Edit Rooms & Rates</Button>}>
      <LodgingQuickJump active="lodge-rate-plans" />
      <LodgingSectionStatusBanner title="Rate Plans & Availability" icon={CalendarDays} countLabel="Active room types" countValue={activeRooms.length} fixLabel="Open Rooms" fixTab="lodge-rooms" />
      {isLoading ? <LoadingPanel /> : rooms.length === 0 ? <EmptyPanel title="No rooms to price yet" body="Create room types first, then add base rates, weekend pricing, seasonal rules, and unit inventory." actionLabel="Open Rooms & Rates" tab="lodge-rooms" /> : <>
        {activeRooms.some((room) => !room.base_rate_cents || !room.units_total) && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3"><p className="text-sm font-semibold text-foreground">Rate readiness needs attention</p><p className="mt-1 text-xs text-muted-foreground">Add base rates and unit inventory to every active room so availability and booking flows stay accurate.</p><Button size="sm" className="mt-3 h-8" onClick={goRooms}>Update room pricing</Button></div>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active room types" value={String(activeRooms.length)} icon={BedDouble} />
          <StatCard label="Total units" value={String(rooms.reduce((sum, room) => sum + (room.units_total || 0), 0))} icon={BedDouble} />
          <StatCard label="Average base rate" value={money(avgBase)} icon={DollarSign} />
          <StatCard label="Seasonal plans" value={String(seasonalCount)} icon={CalendarDays} />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {rooms.map((room) => (
            <div key={room.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{room.name}</p>
                  <p className="text-xs text-muted-foreground">{room.units_total || 0} unit{room.units_total === 1 ? "" : "s"} · up to {room.max_guests} guests</p>
                </div>
                <Badge variant={room.is_active ? "secondary" : "outline"}>{room.is_active ? "Active" : "Hidden"}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <RateMetric label="Base" value={money(room.base_rate_cents)} />
                <RateMetric label="Weekend" value={money(room.weekend_rate_cents || room.base_rate_cents)} />
                <RateMetric label="Weekly" value={`${room.weekly_discount_pct || 0}% off`} />
                <RateMetric label="Monthly" value={`${room.monthly_discount_pct || 0}% off`} />
                <RateMetric label="Min stay" value={`${room.min_stay || 1} night${(room.min_stay || 1) === 1 ? "" : "s"}`} />
                <RateMetric label="Max stay" value={room.max_stay ? `${room.max_stay} nights` : "No max"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(room.seasonal_rates || []).length ? <Badge variant="outline">{room.seasonal_rates?.length} seasonal rate{room.seasonal_rates?.length === 1 ? "" : "s"}</Badge> : <Badge variant="outline">No seasonal rates</Badge>}
                {(room.no_arrival_weekdays || []).length ? room.no_arrival_weekdays?.map((day) => <Badge key={day} variant="outline">No {weekdays[day]}</Badge>) : <Badge variant="outline">All arrival days</Badge>}
              </div>
            </div>
          ))}
        </div>
        <NextActions actions={[{ label: "Edit room inventory", tab: "lodge-rooms", hint: "Update units, base rates, discounts, and stay rules." }, { label: "Open availability calendar", tab: "lodge-calendar", hint: "Review active inventory and arrival restrictions." }, { label: "Check reservations", tab: "lodge-reservations", hint: "Confirm rates are visible in booking workflows." }]} />
      </>}
    </SectionShell>
  );
}

function RateMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted/30 p-2"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 font-semibold text-foreground">{value}</p></div>;
}
