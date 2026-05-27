import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedDouble, CalendarRange, CheckCircle2, Download, Hotel, KeyRound, ListChecks, MessageSquareText, ShieldCheck, XCircle } from "lucide-react";
import { useOwnerStoreProfile } from "@/hooks/useOwnerStoreProfile";
import { useLodgingOpsData } from "@/components/admin/store/lodging/LodgingOperationsShared";
import { useStoreChangeRequestInbox } from "@/hooks/lodging/useReservationChangeRequests";
import { useLodgingPhase5Counts } from "@/hooks/lodging/useLodgingPhase5Counts";
import { getLodgingCompletion } from "@/lib/lodging/lodgingCompletion";
import { getFrontDeskOperationalStats } from "@/lib/lodging/frontDeskQa";
import { runLodgingQa } from "@/lib/lodging/lodgingQa";
import { exportFrontDeskQaPdf } from "@/lib/lodging/frontDeskQaReport";

export default function AdminLodgingCompletionVerificationPage() {
  const navigate = useNavigate();
  const { data: ownerStore } = useOwnerStoreProfile();
  const storeId = ownerStore?.isLodging ? ownerStore.id : "";
  const ops = useLodgingOpsData(storeId);
  const { data: guestRequests = [] } = useStoreChangeRequestInbox(storeId);
  const phase5 = useLodgingPhase5Counts(storeId);
  const stats = useMemo(() => getFrontDeskOperationalStats(ops.reservations, guestRequests.length), [ops.reservations, guestRequests.length]);
  const completion = getLodgingCompletion({
    rooms: ops.rooms, profile: ops.profile, addons: ops.addons,
    reservationsCount: ops.reservations.length,
    guestRequestsCount: guestRequests.length,
    housekeepingCount: phase5.housekeepingCount,
    maintenanceReady: true,
    reportsReady: ops.reservations.length > 0 || ops.rooms.length > 0,
    mealPlansCount: phase5.mealPlansCount,
    staffCount: phase5.staffCount,
    channelConnectionsCount: phase5.channelConnectionsCount,
    promotionsCount: phase5.promotionsCount,
    reviewsAwaitingReply: phase5.reviewsAwaitingReply,
  });
  const qa = useMemo(() => runLodgingQa({ storeId, storeName: ownerStore?.name, storeCategory: ownerStore?.category, completion, frontDeskStats: stats, baseUrl: window.location.origin }), [storeId, ownerStore?.name, ownerStore?.category, completion, stats]);
  const systemFailures = qa.checks.filter((check) => check.status === "fail" && check.category !== "setup");
  const setupWarnings = qa.checks.filter((check) => check.status === "warning" || check.category === "setup");
  const frontDeskChecks = qa.checks.filter((check) => check.id.startsWith("frontdesk-"));
  const openTab = (tab: string) => storeId ? navigate(`/admin/stores/${storeId}?tab=${tab}`) : navigate("/hotel-admin");
  const exportPdf = () => exportFrontDeskQaPdf({ storeId: storeId || "preview-store", storeName: ownerStore?.name, completion, qa, stats, baseUrl: window.location.origin });

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Badge variant="secondary" className="mb-2"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Completion Verification</Badge>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div><h1 className="text-2xl font-bold">Front Desk system verification</h1><p className="mt-1 text-sm text-muted-foreground">System checks, setup warnings, realtime operating stats, empty-state audit, and QA auto-run for {ownerStore?.name || "this Hotel/Resort store"}.</p></div>
            <div className="flex flex-wrap gap-2"><Button onClick={() => openTab("lodge-frontdesk")}><KeyRound className="mr-2 h-4 w-4" /> Open Front Desk</Button><Button variant="outline" onClick={() => navigate("/admin/lodging/qa-checklist")}><ListChecks className="mr-2 h-4 w-4" /> Run QA Checklist</Button><Button variant="outline" onClick={exportPdf}><Download className="mr-2 h-4 w-4" /> Export Front Desk QA Report</Button></div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3"><StatusCard label="System status" value={systemFailures.length ? "System failure" : "System passed"} ok={!systemFailures.length} /><StatusCard label="Setup data" value={setupWarnings.length ? "Setup needed" : "Ready"} ok={!setupWarnings.length} /><StatusCard label="QA auto-run" value={`${qa.passedCount} pass / ${qa.warningCount} warning`} ok={!systemFailures.length} /></div>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Live operational stats</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Object.entries({ "Today’s arrivals": stats.arrivals, "In-house guests": stats.inHouse, "Today’s departures": stats.departures, "Active reservations": stats.activeReservations, "Open guest requests": stats.openGuestRequests }).map(([label, value]) => <Metric key={label} label={label} value={String(value)} />)}</CardContent></Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <CheckList title="Front Desk checks" items={frontDeskChecks} />
          <CheckList title="System failures" items={systemFailures} empty="No system failures. Missing hotel data is shown under setup warnings." />
          <CheckList title="Setup warnings" items={setupWarnings} empty="No setup warnings." />
          <CheckList title="Empty-state audit" items={qa.checks.filter((check) => check.category === "empty-state")} />
        </div>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Hotel className="h-5 w-5 text-primary" /> Direct setup actions</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{[["Open Rooms", "lodge-rooms", BedDouble], ["Open Rate Plans", "lodge-rate-plans", CalendarRange], ["Open Reservations", "lodge-reservations", CalendarRange], ["Open Guest Requests", "lodge-guest-requests", MessageSquareText], ["Open Front Desk", "lodge-frontdesk", KeyRound]].map(([label, tab, Icon]: any) => <Button key={tab} variant="outline" onClick={() => openTab(tab)}><Icon className="mr-2 h-4 w-4" /> {label}</Button>)}</CardContent></Card>
      </div>
    </main>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) { return <Card className={ok ? "border-primary/20 bg-primary/5" : "border-destructive/30"}><CardContent className="p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-2 flex items-center gap-2 text-sm font-bold text-foreground">{ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}{value}</p></CardContent></Card>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-card p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold text-foreground">{value}</p></div>; }
function CheckList({ title, items, empty = "All checks passed." }: { title: string; items: any[]; empty?: string }) { return <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> {title}</CardTitle></CardHeader><CardContent className="space-y-2">{items.length === 0 ? <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">{empty}</p> : items.map((check) => <div key={check.id} className="rounded-lg border border-border bg-card p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-foreground">{check.name}</p><Badge variant={check.status === "fail" ? "destructive" : check.status === "warning" ? "outline" : "secondary"}>{check.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{check.detail}</p></div>)}</CardContent></Card>; }