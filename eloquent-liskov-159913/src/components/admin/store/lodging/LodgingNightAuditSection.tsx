/**
 * Lodging — Night Audit.
 * End-of-day balance: arrivals/departures reconciled, room revenue, deposits,
 * outstanding balances, and a printable daily summary.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClipboardCheck, Download, LogIn, LogOut, KeyRound,
  DollarSign, AlertTriangle, CheckCircle2, BedDouble, Moon,
  RefreshCw,
} from "lucide-react";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";
import { useLodgeHousekeeping } from "@/hooks/lodging/useLodgeHousekeeping";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { toast } from "sonner";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function LodgingNightAuditSection({ storeId }: { storeId: string }) {
  const today = ymd(new Date());
  const [auditDate, setAuditDate] = useState(today);
  const [auditDone, setAuditDone] = useState(false);

  const { data: reservations = [], isLoading: resLoading } = useLodgeReservations(storeId, "all");
  const { data: housekeeping = [], isLoading: hkLoading } = useLodgeHousekeeping(storeId);
  const { data: rooms = [] } = useLodgeRooms(storeId);

  const audit = useMemo(() => {
    const arrivals = reservations.filter(r => r.check_in === auditDate && ["confirmed", "hold", "checked_in"].includes(r.status));
    const departures = reservations.filter(r => r.check_out === auditDate && (r.status === "checked_out" || r.status === "checked_in"));
    const inHouse = reservations.filter(r => r.status === "checked_in" && r.check_in <= auditDate && r.check_out > auditDate);
    const noShows = reservations.filter(r => r.check_in === auditDate && r.status === "no_show");
    const cancelled = reservations.filter(r => r.check_in === auditDate && r.status === "cancelled");

    // Revenue for the audit date — all checked-out reservations on that date
    const roomRevenue = departures.reduce((s, r) => s + (r.total_cents || 0), 0);
    const extrasRevenue = departures.reduce((s, r) => s + (r.extras_cents || 0), 0);
    const depositsCollected = arrivals.reduce((s, r) => s + (r.paid_cents || 0), 0);
    const outstandingBalance = inHouse.reduce((s, r) => {
      const balance = (r.total_cents || 0) - (r.paid_cents || 0);
      return s + Math.max(0, balance);
    }, 0);

    const dirtyRooms = housekeeping.filter(h => h.status === "dirty" || h.status === "in_progress").length;
    const cleanRooms = housekeeping.filter(h => h.status === "clean" || h.status === "inspected").length;
    const oos = housekeeping.filter(h => h.status === "out_of_service").length;

    const totalUnits = rooms.reduce((s, r) => s + (r.units_total || 0), 0);
    const occupancyPct = totalUnits > 0 ? Math.round((inHouse.length / totalUnits) * 100) : 0;

    const issues: string[] = [];
    if (noShows.length) issues.push(`${noShows.length} no-show${noShows.length > 1 ? "s" : ""} need action`);
    if (outstandingBalance > 0) issues.push(`${money(outstandingBalance)} outstanding balance`);
    if (dirtyRooms > 0) issues.push(`${dirtyRooms} room${dirtyRooms > 1 ? "s" : ""} not cleaned`);

    return {
      arrivals, departures, inHouse, noShows, cancelled,
      roomRevenue, extrasRevenue, depositsCollected, outstandingBalance,
      dirtyRooms, cleanRooms, oos, occupancyPct, totalUnits,
      issues,
    };
  }, [reservations, housekeeping, rooms, auditDate]);

  const exportAudit = () => {
    const lines = [
      `NIGHT AUDIT — ${auditDate}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      `OCCUPANCY: ${audit.inHouse.length}/${audit.totalUnits} (${audit.occupancyPct}%)`,
      `Arrivals: ${audit.arrivals.length}  |  Departures: ${audit.departures.length}  |  In-house: ${audit.inHouse.length}`,
      `No-shows: ${audit.noShows.length}  |  Cancellations: ${audit.cancelled.length}`,
      "",
      "REVENUE",
      `Room revenue:         ${money(audit.roomRevenue)}`,
      `Extras / packages:    ${money(audit.extrasRevenue)}`,
      `Deposits collected:   ${money(audit.depositsCollected)}`,
      `Outstanding balance:  ${money(audit.outstandingBalance)}`,
      "",
      "HOUSEKEEPING",
      `Clean: ${audit.cleanRooms}  |  Dirty: ${audit.dirtyRooms}  |  Out of service: ${audit.oos}`,
      "",
      "ISSUES",
      audit.issues.length ? audit.issues.map(i => `• ${i}`).join("\n") : "None",
      "",
      "DEPARTURES",
      ...audit.departures.map(r => `  ${r.guest_name || "Guest"} · ${r.room_number || "—"} · ${money(r.total_cents || 0)} · ${r.payment_status || "—"}`),
      "",
      "ARRIVALS",
      ...audit.arrivals.map(r => `  ${r.guest_name || "Guest"} · ${r.room_number || "—"} · ${r.check_in} → ${r.check_out}`),
      "",
      "IN-HOUSE GUESTS",
      ...audit.inHouse.map(r => `  ${r.guest_name || "Guest"} · ${r.room_number || "—"} · Balance ${money(Math.max(0, (r.total_cents || 0) - (r.paid_cents || 0)))}`),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `night-audit-${auditDate}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Night audit exported");
  };

  const isLoading = resLoading || hkLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Moon className="h-5 w-5" /> Night Audit</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportAudit} disabled={isLoading}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-nightaudit" />
        <LodgingSectionStatusBanner
          title="Night Audit"
          icon={Moon}
          countLabel={`Occupancy ${auditDate}`}
          countValue={`${audit.inHouse.length}/${audit.totalUnits} (${audit.occupancyPct}%)`}
          fixLabel="Open Front Desk"
          fixTab="lodge-frontdesk"
        />

        {/* Audit date picker */}
        <div className="flex items-center gap-3">
          <div>
            <Label className="text-xs">Audit date</Label>
            <Input type="date" value={auditDate} onChange={e => { setAuditDate(e.target.value); setAuditDone(false); }} className="h-8 w-40 text-xs" />
          </div>
          <Button size="sm" variant="outline" className="mt-5 gap-1.5" onClick={() => { setAuditDate(today); setAuditDone(false); }}>
            <RefreshCw className="h-3.5 w-3.5" /> Today
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : (
          <>
            {/* Issues banner */}
            {audit.issues.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm font-semibold text-foreground">Action required before close</p>
                </div>
                <ul className="space-y-1">
                  {audit.issues.map((issue, i) => <li key={i} className="text-xs text-amber-800">• {issue}</li>)}
                </ul>
              </div>
            )}

            {/* Occupancy grid */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              {[
                { label: "Arrivals", value: audit.arrivals.length, icon: LogIn },
                { label: "Departures", value: audit.departures.length, icon: LogOut },
                { label: "In-house", value: audit.inHouse.length, icon: KeyRound },
                { label: "Occupancy", value: `${audit.occupancyPct}%`, icon: BedDouble },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Revenue summary */}
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-primary" /> Daily Revenue Summary</p>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                {[
                  { label: "Room revenue (checkouts)", value: audit.roomRevenue },
                  { label: "Extras & packages", value: audit.extrasRevenue },
                  { label: "Deposits collected (arrivals)", value: audit.depositsCollected },
                  { label: "Outstanding balance (in-house)", value: audit.outstandingBalance, warn: audit.outstandingBalance > 0 },
                ].map(({ label, value, warn }) => (
                  <div key={label} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className={`font-semibold text-sm ${warn ? "text-amber-600" : "text-foreground"}`}>{money(value)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <span className="text-sm font-semibold">Total gross revenue</span>
                <span className="text-lg font-bold text-primary">{money(audit.roomRevenue + audit.extrasRevenue)}</span>
              </div>
            </div>

            {/* Housekeeping status */}
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Housekeeping Close-of-Day</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Clean</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{audit.cleanRooms}</p>
                </div>
                <div className="rounded-lg bg-secondary p-3">
                  <p className="text-xs text-foreground font-semibold uppercase tracking-wider">Dirty</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{audit.dirtyRooms}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Out of Svc</p>
                  <p className="text-2xl font-bold text-muted-foreground mt-1">{audit.oos}</p>
                </div>
              </div>
            </div>

            {/* No-shows */}
            {audit.noShows.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-semibold text-destructive mb-2">No-shows to action ({audit.noShows.length})</p>
                <div className="space-y-1">
                  {audit.noShows.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span>{r.guest_name || "Guest"} · {r.room_number || "—"}</span>
                      <Badge variant="destructive" className="text-[10px]">No-show</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Departure list */}
            {audit.departures.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Departures ({audit.departures.length})</p>
                <div className="rounded-lg border overflow-hidden text-xs">
                  <div className="grid grid-cols-4 bg-muted/50 px-3 py-1.5 font-semibold text-muted-foreground">
                    <span>Guest</span><span>Room</span><span>Total</span><span>Payment</span>
                  </div>
                  {audit.departures.map(r => (
                    <div key={r.id} className="grid grid-cols-4 px-3 py-2 border-t">
                      <span className="truncate">{r.guest_name || "Guest"}</span>
                      <span>{r.room_number || "—"}</span>
                      <span>{money(r.total_cents || 0)}</span>
                      <span className="capitalize">{r.payment_status || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In-house outstanding */}
            {audit.inHouse.filter(r => (r.total_cents || 0) - (r.paid_cents || 0) > 0).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">In-house with balance due</p>
                <div className="rounded-lg border overflow-hidden text-xs">
                  <div className="grid grid-cols-4 bg-muted/50 px-3 py-1.5 font-semibold text-muted-foreground">
                    <span>Guest</span><span>Room</span><span>Checkout</span><span>Balance</span>
                  </div>
                  {audit.inHouse.filter(r => (r.total_cents || 0) - (r.paid_cents || 0) > 0).map(r => (
                    <div key={r.id} className="grid grid-cols-4 px-3 py-2 border-t">
                      <span className="truncate">{r.guest_name || "Guest"}</span>
                      <span>{r.room_number || "—"}</span>
                      <span>{r.check_out}</span>
                      <span className="font-semibold text-amber-600">{money(Math.max(0, (r.total_cents || 0) - (r.paid_cents || 0)))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit sign-off */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Audit sign-off</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Mark audit complete for {auditDate} and export the daily summary.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={exportAudit}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Export report
                  </Button>
                  <Button size="sm" onClick={() => { setAuditDone(true); toast.success(`Night audit for ${auditDate} signed off`); }}>
                    <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> {auditDone ? "Signed off ✓" : "Sign off"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
