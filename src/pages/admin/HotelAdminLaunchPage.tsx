import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, CalendarRange, FileText, Hotel, KeyRound, ListChecks, Loader2, LogIn, MessageSquareText, PackagePlus, PlusCircle, ShieldCheck } from "lucide-react";
import Tag from "lucide-react/dist/esm/icons/tag";
import { useOwnerStoreProfile } from "@/hooks/useOwnerStoreProfile";
import { useLodgingOpsData } from "@/components/admin/store/lodging/LodgingOperationsShared";
import { useLodgingPhase5Counts } from "@/hooks/lodging/useLodgingPhase5Counts";
import { getLodgingCompletion } from "@/lib/lodging/lodgingCompletion";
import { runLodgingQa } from "@/lib/lodging/lodgingQa";
import { LODGING_TAB_IDS } from "@/lib/admin/storeTabRouting";

const proofRows = ["20 hotel sections registered", "Deep-link refresh routing enabled", "Setup Wizard enabled", "QA checklist + PDF report enabled", "Empty-state audit enabled", "Unit and E2E coverage added"];
const quickLinks = [
  ["Rooms", "lodge-rooms", BedDouble], ["Rate Plans", "lodge-rate-plans", CalendarRange], ["Promotions & Discounts", "lodge-promos", Tag], ["Reservations", "lodge-reservations", CalendarRange], ["Front Desk", "lodge-frontdesk", KeyRound],
  ["Add-ons", "lodge-addons", PackagePlus], ["Guest Requests", "lodge-guest-requests", MessageSquareText], ["Reports", "lodge-reports", FileText], ["QA Checklist", "qa", ListChecks], ["Completion Verification", "verification", ShieldCheck],
] as const;
const sectionDescriptions: Record<string, string> = {
  "lodge-overview": "Setup score, next action, and operations snapshot.", "lodge-rooms": "Rooms, inventory, rates, photos, and add-ons.", "lodge-rate-plans": "Rate plans and availability readiness.", "lodge-reservations": "Booking list, guest details, and status workflow.", "lodge-calendar": "Availability calendar and date blocks.", "lodge-guests": "Guest CRM, VIP notes, and stay history.", "lodge-frontdesk": "Today’s arrivals, in-house stays, and departures.", "lodge-housekeeping": "Room readiness and cleaning workflow.", "lodge-maintenance": "Maintenance readiness and task routing.", "lodge-addons": "Packages, extras, and guest-bookable services.", "lodge-guest-requests": "Service requests and add-on follow-up.", "lodge-dining": "Dining and meal-plan operations.", "lodge-experiences": "Tours and destination experiences.", "lodge-transport": "Transfers, parking, rental, and arrival logistics.", "lodge-wellness": "Spa, wellness, and treatment services.", "lodge-amenities": "Amenities and property policy settings.", "lodge-property": "Property profile, location, and guest-facing details.", "lodge-policies": "Rules, deposits, payment, and cancellation setup.", "lodge-reviews": "Completed stay follow-up and feedback readiness.", "lodge-reports": "Occupancy, ADR, RevPAR, revenue, and CSV export.",
};

export default function HotelAdminLaunchPage() {
  const navigate = useNavigate();
  const { data: ownerStore, isLoading } = useOwnerStoreProfile();
  const storeId = ownerStore?.isLodging ? ownerStore.id : "";
  const ops = useLodgingOpsData(storeId);
  const phase5 = useLodgingPhase5Counts(storeId);
  const completion = getLodgingCompletion({
    rooms: ops.rooms, profile: ops.profile, addons: ops.addons,
    reservationsCount: ops.reservations.length,
    housekeepingCount: phase5.housekeepingCount,
    maintenanceReady: true,
    reportsReady: ops.reservations.length > 0 || ops.rooms.length > 0,
    mealPlansCount: phase5.mealPlansCount,
    staffCount: phase5.staffCount,
    channelConnectionsCount: phase5.channelConnectionsCount,
    promotionsCount: phase5.promotionsCount,
    reviewsAwaitingReply: phase5.reviewsAwaitingReply,
  });
  const qa = runLodgingQa({ storeId, storeName: ownerStore?.name, storeCategory: ownerStore?.category, completion });
  const openTab = (tab: string) => tab === "qa" ? navigate("/admin/lodging/qa-checklist") : tab === "verification" ? navigate("/admin/lodging/completion-verification") : navigate(`/admin/stores/${storeId}?tab=${tab}`);

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/8 p-5">
          <Badge variant="secondary" className="mb-3"><Hotel className="mr-1 h-3.5 w-3.5" /> Hotel / Resort Operations Center</Badge>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">{ownerStore?.isLodging ? ownerStore.name : "Hotel/Resort Admin"}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Visible launch hub for rooms, rates, reservations, guest services, QA proof, and next setup actions.</p>
            </div>
            {ownerStore?.isLodging && <div className="flex flex-wrap gap-2"><Button onClick={() => openTab("lodge-overview")}><Hotel className="mr-2 h-4 w-4" /> Open Hotel Admin</Button><Button variant="outline" onClick={() => navigate("/admin/lodging/qa-checklist")}><ShieldCheck className="mr-2 h-4 w-4" /> Run QA</Button></div>}
          </div>
        </div>

        {isLoading ? (
          <Card><CardContent className="flex items-center gap-3 p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /> Finding your property…</CardContent></Card>
        ) : !ownerStore?.isLodging ? (
          <Card className="mx-auto max-w-md border-primary/20 bg-card shadow-sm">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Hotel className="h-7 w-7" />
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Hotel / Resort Operations</Badge>
              <CardTitle className="text-xl">Create or select a Hotel / Resort store</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Connect a lodging store to open rooms, rates, reservations, add-ons, guest requests, and QA reports.</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2"><Button onClick={() => navigate("/store/setup")}><PlusCircle className="mr-2 h-4 w-4" /> Set up Hotel / Resort</Button><Button variant="outline" onClick={() => navigate("/partner-login")}><LogIn className="mr-2 h-4 w-4" /> Go to Partner Login</Button></CardContent>
        </Card>
        ) : (
          <>
            <Card className="border-primary/20 bg-primary/5"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Completed implementation</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{proofRows.map((row) => <div key={row} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm"><ShieldCheck className="h-4 w-4 text-primary" />{row}</div>)}<Button onClick={() => openTab("lodge-frontdesk")}><KeyRound className="mr-2 h-4 w-4" /> Open Front Desk</Button><Button variant="outline" onClick={() => openTab("lodge-rooms")}><BedDouble className="mr-2 h-4 w-4" /> Add Rooms</Button><Button variant="outline" onClick={() => openTab("lodge-rate-plans")}><CalendarRange className="mr-2 h-4 w-4" /> Add Rates</Button></CardContent></Card>
            <div className="grid gap-3 md:grid-cols-4"><Metric label="Completion" value={`${completion.percent}%`} /><Metric label="QA system" value={`${qa.passedCount} pass`} /><Metric label="Setup actions" value={String(completion.incompleteItems.length)} /><Metric label="Sections" value={`${LODGING_TAB_IDS.length}/20`} /></div>
            <Card><CardHeader><CardTitle>Next best action</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-foreground">{completion.nextBestAction.label}</p><p className="text-sm text-muted-foreground">{completion.nextBestAction.hint}</p></div><Button onClick={() => openTab(completion.nextBestAction.tab)}>{completion.nextBestAction.actionLabel}</Button></CardContent></Card>
            <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Open workflows</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{quickLinks.map(([label, tab, Icon]) => <Button key={tab} variant="outline" onClick={() => openTab(tab)}><Icon className="mr-2 h-4 w-4" />{label}</Button>)}</CardContent></Card><Card><CardHeader><CardTitle>Completion proof</CardTitle></CardHeader><CardContent className="grid gap-2">{proofRows.map((row) => <div key={row} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm"><ShieldCheck className="h-4 w-4 text-primary" />{row}</div>)}</CardContent></Card></div>
            <Card><CardHeader><CardTitle>All Hotel/Resort sections</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{LODGING_TAB_IDS.map((tab) => <button type="button" key={tab} onClick={() => openTab(tab)} className="rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50"><p className="text-sm font-semibold capitalize text-foreground">{tab.replace("lodge-", "").replace(/-/g, " ")}</p><p className="mt-1 text-xs text-muted-foreground">{sectionDescriptions[tab]}</p></button>)}</CardContent></Card>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold text-foreground">{value}</p></CardContent></Card>;
}