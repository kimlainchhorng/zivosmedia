/**
 * Lodging — Front Desk: today board (arrivals / in-house / departures) + walk-in + search + rebook.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LodgingQuickJump from "./LodgingQuickJump";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BedDouble, CalendarRange, ClipboardCheck, DollarSign, Download, KeyRound, ListChecks, LogIn, LogOut, MessageSquareText, RefreshCw, Search as SearchIcon, UserPlus } from "lucide-react";
import { useLodgeReservations, type ReservationStatus, type LodgeReservation } from "@/hooks/lodging/useLodgeReservations";
import { useStoreChangeRequestInbox } from "@/hooks/lodging/useReservationChangeRequests";
import { useHostLodgingOpsToasts } from "@/hooks/lodging/useHostLodgingOpsToasts";
import { toast } from "sonner";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import LodgingNeedsSetupEmptyState, { FRONT_DESK_EMPTY_ACTIONS } from "./LodgingNeedsSetupEmptyState";
import { getFrontDeskOperationalStats } from "@/lib/lodging/frontDeskQa";
import { getLodgingCompletion } from "@/lib/lodging/lodgingCompletion";
import { runLodgingQa } from "@/lib/lodging/lodgingQa";
import { exportFrontDeskQaPdf } from "@/lib/lodging/frontDeskQaReport";
import WalkInBookingSheet from "./WalkInBookingSheet";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
const timeRange = (r: LodgeReservation) => r.room?.check_in_time || r.room?.check_out_time ? `${r.room?.check_in_time || "15:00"} → ${r.room?.check_out_time || "11:00"}` : "Standard hotel times";
const goTab = (tab: string) => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab } }));

export default function LodgingFrontDeskSection({ storeId }: { storeId: string }) {
  const navigate = useNavigate();
  const { data: reservations = [], setStatus } = useLodgeReservations(storeId, "all");
  const { data: guestRequests = [] } = useStoreChangeRequestInbox(storeId);
  useHostLodgingOpsToasts(storeId);
  const today = ymd(new Date());
  const [search, setSearch] = useState("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInPrefill, setWalkInPrefill] = useState<{ name: string; room: string | null }>({ name: "", room: "" });

  const matchSearch = (r: LodgeReservation) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.guest_name || "").toLowerCase().includes(q) || (r.room_number || "").toLowerCase().includes(q);
  };

  const { arrivals, inHouse, departures } = useMemo(() => {
    const arrivals = reservations.filter(r => r.check_in === today && ["confirmed", "hold"].includes(r.status)).filter(matchSearch);
    const departures = reservations.filter(r => r.check_out === today && r.status === "checked_in").filter(matchSearch);
    const inHouse = reservations.filter(r => r.status === "checked_in" && r.check_in <= today && r.check_out > today).filter(matchSearch);
    return { arrivals, inHouse, departures };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, today, search]);

  const act = async (id: string, s: ReservationStatus, msg: string) => {
    try { await setStatus.mutateAsync({ id, status: s }); toast.success(msg); }
    catch (e: any) { toast.error(e.message || "Failed"); }
  };
  const liveStats = getFrontDeskOperationalStats(reservations, guestRequests.length, today);
  const activeReservations = liveStats.activeReservations;
  const stats = [
    { label: "Today’s arrivals", value: liveStats.arrivals, icon: LogIn },
    { label: "In-house guests", value: liveStats.inHouse, icon: KeyRound },
    { label: "Today’s departures", value: liveStats.departures, icon: LogOut },
    { label: "Active reservations", value: activeReservations, icon: ClipboardCheck },
    { label: "Open guest requests", value: liveStats.openGuestRequests, icon: MessageSquareText },
  ];
  const exportReport = () => {
    const completion = getLodgingCompletion({ rooms: [], profile: null, addons: [], reservationsCount: reservations.length, guestRequestsCount: guestRequests.length, maintenanceReady: true, reportsReady: reservations.length > 0 });
    const qa = runLodgingQa({ storeId, completion, baseUrl: window.location.origin });
    exportFrontDeskQaPdf({ storeId, completion, qa, stats: liveStats, baseUrl: window.location.origin });
  };

  const rebook = async (r: LodgeReservation) => {
    setWalkInPrefill({ name: r.guest_name || "", room: r.room_number || null });
    setWalkInOpen(true);
  };

  const Column = ({ title, empty, items, action, color, emptyKind, showRebook }: { title: string; empty: string; items: LodgeReservation[]; action?: { label: string; icon: any; status: ReservationStatus; msg: string }; color: string; emptyKind: keyof typeof FRONT_DESK_EMPTY_ACTIONS; showRebook?: boolean }) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-sm">{title}</p>
        <Badge variant="outline" className={`text-[10px] ${color}`}>{items.length}</Badge>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? <LodgingNeedsSetupEmptyState icon={emptyKind === "departures" ? LogOut : emptyKind === "inHouse" ? KeyRound : LogIn} title={empty} description="No live records yet. The Front Desk workflow is installed, realtime-enabled, and ready for hotel data." primaryAction={FRONT_DESK_EMPTY_ACTIONS[emptyKind].primary} secondaryAction={FRONT_DESK_EMPTY_ACTIONS[emptyKind].secondary} nextBestAction={FRONT_DESK_EMPTY_ACTIONS[emptyKind].primary.label} compact />
          : items.map(r => (
            <div key={r.id} className="p-2.5 rounded-lg border bg-card">
              <p className="text-sm font-semibold truncate">{r.guest_name || "Guest"}</p>
              <p className="text-[11px] text-muted-foreground">{r.room_number || "—"} · {r.adults}A{r.children ? `/${r.children}C` : ""}</p>
              <p className="text-[10px] text-muted-foreground">{r.check_in} → {r.check_out}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-foreground"><CalendarRange className="h-3 w-3 text-primary" /> {timeRange(r)}</p>
              {action && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 mt-2 w-full"
                  onClick={() => act(r.id, action.status, action.msg)}>
                  <action.icon className="h-3 w-3" /> {action.label}
                </Button>
              )}
              {showRebook && (
                <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 mt-1 w-full text-primary hover:bg-primary/10"
                  onClick={() => rebook(r)}>
                  <RefreshCw className="h-3 w-3" /> Quick rebook +1 night
                </Button>
              )}
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Front Desk — {today}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-frontdesk" />
        <LodgingSectionStatusBanner title="Front Desk is ready" icon={KeyRound} countLabel="active reservations" countValue={activeReservations} fixLabel="Review reservations" fixTab="lodge-reservations" />
         <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-border bg-card p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-xl font-bold text-foreground">{value}</p></div>)}
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-sm font-semibold text-foreground">What this section does</p>
          <p className="mt-1 text-xs text-muted-foreground">Tracks same-day arrivals, in-house guests, departures, key handoff, check-in, and check-out. Empty columns mean there is no live reservation data for today.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => { setWalkInPrefill({ name: "", room: "" }); setWalkInOpen(true); }}><UserPlus className="mr-2 h-4 w-4" /> Walk-in booking</Button><Button size="sm" variant="outline" onClick={() => goTab("lodge-rate-plans")}><DollarSign className="mr-2 h-4 w-4" /> Open rate plans</Button><Button size="sm" variant="outline" onClick={() => goTab("lodge-rooms")}><BedDouble className="mr-2 h-4 w-4" /> Open rooms</Button><Button size="sm" variant="outline" onClick={() => goTab("lodge-guest-requests")}><MessageSquareText className="mr-2 h-4 w-4" /> Guest requests</Button><Button size="sm" variant="outline" onClick={() => navigate("/admin/lodging/qa-checklist")}><ListChecks className="mr-2 h-4 w-4" /> Run QA</Button><Button size="sm" variant="outline" onClick={() => navigate("/admin/lodging/completion-verification")}><ClipboardCheck className="mr-2 h-4 w-4" /> Completion Verification</Button><Button size="sm" variant="outline" onClick={exportReport}><Download className="mr-2 h-4 w-4" /> Export Front Desk QA Report</Button></div>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by guest name or room number…" className="pl-9 h-9" />
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <Column title="Arrivals" empty="No arrivals today" items={arrivals} color="text-primary" emptyKind="arrivals" action={{ label: "Check In", icon: LogIn, status: "checked_in", msg: "Checked in" }} />
          <Column title="In-House" empty="No in-house guests" items={inHouse} color="text-primary" emptyKind="inHouse" />
          <Column title="Departures" empty="No departures today" items={departures} color="text-primary" emptyKind="departures" action={{ label: "Check Out", icon: LogOut, status: "checked_out", msg: "Checked out" }} showRebook />
        </div>
        <WalkInBookingSheet storeId={storeId} open={walkInOpen} onOpenChange={setWalkInOpen} prefillGuestName={walkInPrefill.name} prefillRoom={walkInPrefill.room} />
      </CardContent>
    </Card>
  );
}
