/**
 * Lodging — Reservations list with status filter & quick actions.
 * Tapping a row opens the full reservation details page.
 */
import { useMemo, useState } from "react";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarRange, Search, CheckCircle2, LogIn, LogOut, XCircle, ChevronRight, ShieldCheck, BedDouble, Mail, Phone, ExternalLink, ClipboardCheck, Clock, Download, Send } from "lucide-react";
import { useLodgeReservations, type ReservationStatus } from "@/hooks/lodging/useLodgeReservations";
import { LodgingPaymentBadge } from "@/components/lodging/LodgingPaymentBadge";
import { toast } from "sonner";
import ChangeRequestsInbox from "@/components/lodging/host/ChangeRequestsInbox";
import HostReservationOpsSummary from "@/components/lodging/host/HostReservationOpsSummary";
import { useStoreChangeRequestInbox } from "@/hooks/lodging/useReservationChangeRequests";
import { useHostLodgingOpsToasts } from "@/hooks/lodging/useHostLodgingOpsToasts";
import { reservationDateLabel, reservationMinutes, reservationTimeRangeLabel } from "@/lib/lodging/reservationTime";
import LodgingNeedsSetupEmptyState from "./LodgingNeedsSetupEmptyState";

type ReservationFilter = ReservationStatus | "active" | "all";
const CLOSED_STATUSES = new Set<ReservationStatus>(["cancelled", "checked_out", "no_show"]);
const STATUSES: ReservationFilter[] = ["active", "all", "hold", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"];
const STATUS_LABEL: Record<string, string> = {
  active: "Active", all: "All", hold: "Hold", confirmed: "Confirmed", checked_in: "Checked-In",
  checked_out: "Checked-Out", cancelled: "Cancelled", no_show: "No-Show",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  hold: "outline", confirmed: "secondary", checked_in: "default", checked_out: "outline", cancelled: "destructive", no_show: "destructive",
};

const money = (cents?: number | null) => `$${((Number(cents) || 0) / 100).toFixed(2)}`;
type TimeFilter = "all" | "morning" | "afternoon" | "evening";
type SortMode = "date_desc" | "date_asc" | "checkin_asc" | "checkout_asc";
const TIME_LABEL: Record<TimeFilter, string> = { all: "Any time", morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

export default function LodgingReservationsSection({ storeId }: { storeId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = (searchParams.get("tab") || "active") as ReservationFilter;
  const [status, setStatus] = useState<ReservationFilter>(STATUSES.includes(initialStatus) ? initialStatus : "active");
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>((searchParams.get("time") as TimeFilter) || "all");
  const [sortMode, setSortMode] = useState<SortMode>((searchParams.get("sort") as SortMode) || "date_desc");
  const queryStatus = status === "active" ? "all" : status;
  const { data: reservations = [], isLoading, setStatus: setResStatus } = useLodgeReservations(storeId, queryStatus);
  const { data: pendingRequests = [] } = useStoreChangeRequestInbox(storeId);
  useHostLodgingOpsToasts(storeId);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let scoped = status === "active" ? reservations.filter(r => !CLOSED_STATUSES.has(r.status)) : reservations;
    if (timeFilter !== "all") {
      scoped = scoped.filter((r) => {
        const mins = reservationMinutes(r.check_in, r.room?.check_in_time, "check_in");
        return timeFilter === "morning" ? mins < 12 * 60 : timeFilter === "afternoon" ? mins >= 12 * 60 && mins < 17 * 60 : mins >= 17 * 60;
      });
    }
    if (term) scoped = scoped.filter(r =>
      [r.guest_name, r.guest_phone, r.guest_email, r.number, r.room_number, r.payment_status, r.status].some(v => String(v || "").toLowerCase().includes(term))
    );
    return [...scoped].sort((a, b) => {
      if (sortMode === "date_asc") return new Date(a.check_in).getTime() - new Date(b.check_in).getTime();
      if (sortMode === "checkin_asc") return reservationMinutes(a.check_in, a.room?.check_in_time, "check_in") - reservationMinutes(b.check_in, b.room?.check_in_time, "check_in");
      if (sortMode === "checkout_asc") return reservationMinutes(a.check_out, a.room?.check_out_time, "check_out") - reservationMinutes(b.check_out, b.room?.check_out_time, "check_out");
      return new Date(b.check_in).getTime() - new Date(a.check_in).getTime();
    });
  }, [reservations, q, status, timeFilter, sortMode]);

  const act = async (id: string, s: ReservationStatus, msg: string) => {
    try { await setResStatus.mutateAsync({ id, status: s }); toast.success(msg); }
    catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const openReservation = (id: string, workflow?: "cancel" | "review" | "addons" | "payment" | "audit" | "workflow") => {
    const params = new URLSearchParams();
    if (status !== "active") params.set("tab", status);
    if (q.trim()) params.set("q", q.trim());
    if (timeFilter !== "all") params.set("time", timeFilter);
    if (sortMode !== "date_desc") params.set("sort", sortMode);
    const returnTo = `${location.pathname}${params.toString() ? `?${params}` : ""}`;
    navigate(`/admin/stores/${storeId}/lodging/reservations/${id}${workflow ? `?workflow=${workflow}` : ""}`, {
      state: { returnTo, workflow },
    });
  };

  const syncParams = (nextStatus = status, nextQ = q, nextTime = timeFilter, nextSort = sortMode) => {
    const next = new URLSearchParams();
    if (nextStatus !== "active") next.set("tab", nextStatus);
    if (nextQ.trim()) next.set("q", nextQ.trim());
    if (nextTime !== "all") next.set("time", nextTime);
    if (nextSort !== "date_desc") next.set("sort", nextSort);
    setSearchParams(next, { replace: true });
  };

  const updateFilter = (nextStatus: ReservationFilter, nextQ = q) => {
    setStatus(nextStatus);
    syncParams(nextStatus, nextQ);
  };

  return (
    <div className="space-y-4">
      <LodgingQuickJump active="lodge-reservations" />
      <LodgingSectionStatusBanner title="Reservations" icon={CalendarRange} countLabel="Pending change requests" countValue={pendingRequests.length} fixLabel="Open Front Desk" fixTab="lodge-frontdesk" />
      <HostReservationOpsSummary reservations={reservations} requests={pendingRequests} onFilter={(value) => setQ(value)} />
      <ChangeRequestsInbox storeId={storeId} />
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><CalendarRange className="h-5 w-5" /> Reservations</CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          disabled={filtered.length === 0}
          onClick={() => exportReservationsCsv(filtered)}
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {STATUSES.map(s => (
            <button type="button" key={s} onClick={() => updateFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${status === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => { setQ(e.target.value); updateFilter(status, e.target.value); }} placeholder="Search guest, phone, email, room, ref, payment…" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-2 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Time</span>
          {(["all", "morning", "afternoon", "evening"] as TimeFilter[]).map((value) => (
            <button type="button" key={value} onClick={() => { setTimeFilter(value); syncParams(status, q, value, sortMode); }} className={`rounded-full border px-2.5 py-1 font-medium transition ${timeFilter === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>{TIME_LABEL[value]}</button>
          ))}
          <select value={sortMode} onChange={(e) => { const next = e.target.value as SortMode; setSortMode(next); syncParams(status, q, timeFilter, next); }} className="ml-auto h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground">
            <option value="date_desc">Newest check-in</option>
            <option value="date_asc">Oldest check-in</option>
            <option value="checkin_asc">Check-in time</option>
            <option value="checkout_asc">Check-out time</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <LodgingNeedsSetupEmptyState icon={CalendarRange} title={q.trim() ? "No reservations match your search" : status === "active" ? "Reservation workspace is ready" : `No ${STATUS_LABEL[status].toLowerCase()} reservations`} description="No live records yet. This section is installed for booking review, check-in workflow, payments, requests, and guest history." primaryAction={{ label: "Open rooms", tab: "lodge-rooms" }} secondaryAction={{ label: "Open rate plans", tab: "lodge-rate-plans" }} nextBestAction="Set rooms and rates, then create or import reservations." />
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const displayName = r.guest_name?.trim() || `Guest · ${r.number || r.id.slice(0, 8)}`;
              const balance = (r.total_cents || 0) - (r.paid_cents || 0);
              const pendingRequest = pendingRequests.find(req => req.reservation_id === r.id);
              const hasPendingRequest = !!pendingRequest;
              const paymentNeedsReview = ["failed", "pending", "processing"].includes(String(r.payment_status || ""));
              const isClosed = CLOSED_STATUSES.has(r.status);
              const needsReview = hasPendingRequest || balance > 0 || paymentNeedsReview || isClosed;
              const reviewWorkflow = pendingRequest?.type === "addon" ? "addons" : hasPendingRequest ? "workflow" : paymentNeedsReview || balance > 0 ? "payment" : isClosed ? "audit" : "review";
              return (
              <div key={r.id} className="p-3 rounded-lg border bg-card transition hover:border-primary/40 focus-within:border-primary/40">
                <button
                  type="button"
                  onClick={() => openReservation(r.id)}
                  className="w-full text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                         <span className="font-semibold text-sm">{displayName}</span>
                        <Badge variant={STATUS_VARIANT[r.status] || "outline"} className="text-[10px]">{STATUS_LABEL[r.status]}</Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">{r.number}</span>
                      </div>
                      <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <span className="inline-flex items-center gap-1.5"><CalendarRange className="h-3 w-3" /> {reservationDateLabel(r.check_in)} → {reservationDateLabel(r.check_out)} · {r.nights} night{r.nights !== 1 ? "s" : ""}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3" /> {reservationTimeRangeLabel(r.check_in, r.check_out, r.room?.check_in_time, r.room?.check_out_time)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{r.adults} adult{r.adults !== 1 ? "s" : ""}{r.children ? ` · ${r.children} child${r.children > 1 ? "ren" : ""}` : ""}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1"><BedDouble className="h-3 w-3" />{r.room_number ? `Unit ${r.room_number}` : "Room unassigned"}</span>
                        {r.guest_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.guest_phone}</span>}
                        {r.guest_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.guest_email}</span>}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <LodgingPaymentBadge status={(r as any).payment_status} reservationStatus={r.status} amountCents={(r as any).deposit_cents || r.total_cents} />
                        {balance > 0 && <Badge variant="destructive" className="text-[10px]">Balance {money(balance)}</Badge>}
                        {hasPendingRequest && <Badge variant="secondary" className="text-[10px]">Pending guest request</Badge>}
                        {r.status === "cancelled" && String(r.payment_status).includes("refund") && <Badge variant="secondary" className="text-[10px]">Refund workflow</Badge>}
                        {(r as any).policy_consent && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                            <ShieldCheck className="h-2.5 w-2.5" /> Policies acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1">
                      <div>
                        <p className="font-bold text-sm">{money(r.total_cents)}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">Paid {money(r.paid_cents || 0)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openReservation(r.id)}><ExternalLink className="h-3 w-3" /> Open</Button>
                  {needsReview && <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => openReservation(r.id, reviewWorkflow)}><ClipboardCheck className="h-3 w-3" /> Review</Button>}
                  {r.guest_email && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendConfirmationEmail(r)}><Send className="h-3 w-3" /> Send confirmation</Button>}
                  {r.status === "hold" && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => act(r.id, "confirmed", "Confirmed")}><CheckCircle2 className="h-3 w-3" /> Confirm</Button>}
                  {(r.status === "confirmed" || r.status === "hold") && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => act(r.id, "checked_in", "Checked in")}><LogIn className="h-3 w-3" /> Check-In</Button>}
                  {r.status === "checked_in" && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => act(r.id, "checked_out", "Checked out")}><LogOut className="h-3 w-3" /> Check-Out</Button>}
                  {!CLOSED_STATUSES.has(r.status) && <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive" onClick={() => openReservation(r.id, "cancel")}><XCircle className="h-3 w-3" /> Cancel / No-show</Button>}
                </div>
              </div>
            );})}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportReservationsCsv(rows: any[]) {
  const headers = ["Number", "Guest", "Email", "Phone", "Room", "Check-in", "Check-out", "Nights", "Adults", "Children", "Status", "Payment", "Total", "Paid", "Balance"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const total = Number(r.total_cents || 0) / 100;
    const paid = Number(r.paid_cents || 0) / 100;
    lines.push([
      r.number, r.guest_name, r.guest_email, r.guest_phone, r.room_number,
      r.check_in, r.check_out, r.nights, r.adults, r.children,
      r.status, r.payment_status, total.toFixed(2), paid.toFixed(2), (total - paid).toFixed(2),
    ].map(csvEscape).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function sendConfirmationEmail(r: any) {
  const subject = `Booking confirmation · ${r.number || ""}`;
  const body = [
    `Hello ${r.guest_name || "guest"},`,
    "",
    "Thank you for your booking. Here are your reservation details:",
    `Reservation: ${r.number || ""}`,
    `Room: ${r.room_number || "—"}`,
    `Check-in: ${r.check_in}`,
    `Check-out: ${r.check_out}`,
    `Nights: ${r.nights}`,
    `Guests: ${r.adults} adult(s)${r.children ? ` · ${r.children} child(ren)` : ""}`,
    `Total: $${(Number(r.total_cents || 0) / 100).toFixed(2)}`,
    `Balance due: $${((Number(r.total_cents || 0) - Number(r.paid_cents || 0)) / 100).toFixed(2)}`,
    "",
    "We look forward to welcoming you.",
  ].join("\n");
  const href = `mailto:${encodeURIComponent(r.guest_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}
