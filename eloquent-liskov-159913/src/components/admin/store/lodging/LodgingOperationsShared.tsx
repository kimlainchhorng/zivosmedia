import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddonIcon } from "@/components/lodging/addonIcons";
import { useLodgeRooms, type LodgeAddon, type LodgeRoom } from "@/hooks/lodging/useLodgeRooms";
import { useLodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";
import { reservationTimeRangeLabel } from "@/lib/lodging/reservationTime";
import { BedDouble, CalendarRange, CheckCircle2, ClipboardList, Hotel, Loader2, PackagePlus, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import LodgingNeedsSetupEmptyState from "./LodgingNeedsSetupEmptyState";

type AddonView = LodgeAddon & { roomName: string; roomId: string };

const goTab = (tab: string) => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab } }));
export const money = (cents?: number | null) => `$${((Number(cents) || 0) / 100).toFixed(2)}`;
export const addonCategories = ["Food & drink", "Stay flexibility", "Transport", "Wellness", "Experiences", "Celebration", "Services"];
export const normalizeCategory = (category?: string) => category === "Stay" ? "Stay flexibility" : category || "Services";

export function useLodgingOpsData(storeId: string) {
  const roomsQuery = useLodgeRooms(storeId);
  const profileQuery = useLodgePropertyProfile(storeId);
  const reservationsQuery = useLodgeReservations(storeId, "all");

  const addons = useMemo<AddonView[]>(() => (roomsQuery.data || []).flatMap((room) =>
    (room.addons || []).map((addon) => ({ ...addon, category: normalizeCategory(addon.category), roomName: room.name, roomId: room.id })),
  ), [roomsQuery.data]);

  return {
    rooms: roomsQuery.data || [],
    profile: profileQuery.data,
    reservations: reservationsQuery.data || [],
    addons,
    isLoading: roomsQuery.isLoading || profileQuery.isLoading || reservationsQuery.isLoading,
  };
}

export function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export function SectionShell({ title, subtitle, icon: Icon, children, actions }: { title: string; subtitle: string; icon: LucideIcon; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {actions}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function EmptyPanel({ title, body, actionLabel, tab }: { title: string; body: string; actionLabel: string; tab: string }) {
  return (
    <LodgingNeedsSetupEmptyState icon={Sparkles} title={title} description={body} primaryAction={{ label: actionLabel, tab }} secondaryAction={{ label: "Open Front Desk", tab: "lodge-frontdesk" }} />
  );
}

export function LoadingPanel() {
  return <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading hotel data…</p>;
}

export function AddonList({ addons, emptyTitle, emptyBody }: { addons: AddonView[]; emptyTitle: string; emptyBody: string }) {
  if (addons.length === 0) return <EmptyPanel title={emptyTitle} body={emptyBody} actionLabel="Open Rooms & Rates" tab="lodge-rooms" />;
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {addons.slice(0, 12).map((addon, index) => (
        <div key={`${addon.roomId}-${addon.name}-${index}`} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-start gap-2">
            <span className="rounded-md bg-primary/10 p-1.5 text-primary"><AddonIcon slug={addon.icon} className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{addon.name}</p>
              <p className="truncate text-xs text-muted-foreground">{addon.roomName}</p>
            </div>
            <Badge variant={addon.active === false || addon.disabled ? "outline" : "secondary"} className="text-[10px]">
              {addon.active === false || addon.disabled ? "Hidden" : addon.price_cents > 0 ? money(addon.price_cents) : "Free"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OpsSnapshot({ rooms, addons, reservations }: { rooms: LodgeRoom[]; addons: AddonView[]; reservations: any[] }) {
  const activeReservations = reservations.filter((r) => !["cancelled", "checked_out", "no_show"].includes(r.status)).length;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active rooms" value={String(rooms.filter((r) => r.is_active).length)} icon={BedDouble} />
      <StatCard label="Active stays" value={String(activeReservations)} icon={CalendarRange} />
      <StatCard label="Guest add-ons" value={String(addons.filter((a) => a.active !== false && !a.disabled).length)} icon={PackagePlus} />
      <StatCard label="Profile ready" value={rooms.length ? "Live" : "Setup"} icon={CheckCircle2} />
    </div>
  );
}

export function NextActions({ actions }: { actions: { label: string; tab: string; hint: string }[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {actions.map((action) => (
        <button type="button" key={action.label} onClick={() => goTab(action.tab)} className="rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/50 hover:bg-primary/5">
          <p className="text-sm font-semibold text-foreground">{action.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{action.hint}</p>
        </button>
      ))}
    </div>
  );
}

export function PolicySummary({ profile, rooms }: { profile: ReturnType<typeof useLodgingOpsData>["profile"]; rooms: LodgeRoom[] }) {
  const firstRoom = rooms[0];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs font-semibold text-muted-foreground">Check-in / check-out</p><p className="mt-1 text-sm text-foreground">{reservationTimeRangeLabel(null, null, profile?.check_in_from || firstRoom?.check_in_time, profile?.check_out_until || firstRoom?.check_out_time)}</p></div>
      <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs font-semibold text-muted-foreground">Cancellation</p><p className="mt-1 line-clamp-2 text-sm text-foreground">{profile?.cancellation_policy || firstRoom?.cancellation_policy || "Not set"}</p></div>
      <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs font-semibold text-muted-foreground">Deposit</p><p className="mt-1 text-sm text-foreground">{profile?.deposit_required ? `${profile.deposit_percent || 0}% required` : "No deposit required"}</p></div>
      <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs font-semibold text-muted-foreground">Property type</p><p className="mt-1 text-sm text-foreground"><Hotel className="mr-1 inline h-3.5 w-3.5" />Hotel / Resort profile</p></div>
    </div>
  );
}
