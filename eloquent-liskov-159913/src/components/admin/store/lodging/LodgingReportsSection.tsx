/**
 * Lodging — Reports (Occupancy / ADR / RevPAR + breakdowns).
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, CreditCard, Download, PackagePlus } from "lucide-react";
import { useLodgeReports } from "@/hooks/lodging/useLodgeReports";
import LodgingNeedsSetupEmptyState from "./LodgingNeedsSetupEmptyState";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

export default function LodgingReportsSection({ storeId }: { storeId: string }) {
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  const [from, setFrom] = useState(ymd(monthAgo));
  const [to, setTo] = useState(ymd(today));
  const { data, isLoading } = useLodgeReports(storeId, from, to);

  const usd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const roomRevenue = data?.perRoomType.reduce((sum, room) => sum + room.revenue, 0) || 0;
  const extrasRevenue = Math.max(0, (data?.totalRevenueCents || 0) - roomRevenue);
  const paidEstimate = data?.totalRevenueCents || 0;

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Occupancy %", data.occupancyPct.toFixed(1)],
      ["ADR (USD)", (data.adrCents / 100).toFixed(2)],
      ["RevPAR (USD)", (data.revparCents / 100).toFixed(2)],
      ["Total Revenue (USD)", (data.totalRevenueCents / 100).toFixed(2)],
      ["Nights Sold", String(data.nightsSold)],
      ["Avg LOS", data.avgLos.toFixed(2)],
      [],
      ["Room Type", "Nights", "Revenue (USD)"],
      ...data.perRoomType.map(r => [r.name, String(r.nights), (r.revenue / 100).toFixed(2)]),
      [],
      ["Source", "Nights", "Revenue (USD)"],
      ...data.perSource.map(r => [r.source, String(r.nights), (r.revenue / 100).toFixed(2)]),
    ];
    const csv = rows.map(r => r.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lodging-report-${from}-to-${to}.csv`;
    a.click();
  };

  return (
    <div className="space-y-3">
      <LodgingQuickJump active="lodge-reports" />
      <LodgingSectionStatusBanner title="Reports & Analytics" icon={BarChart3} countLabel="Period" countValue={`${from} → ${to}`} fixLabel="Open Reservations" fixTab="lodge-reservations" />
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Reports</CardTitle>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data} className="gap-1"><Download className="h-4 w-4" /> CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        </div>

        {isLoading || !data ? <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p> : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FinanceCard icon={BarChart3} label="Room revenue" value={usd(roomRevenue)} />
              <FinanceCard icon={PackagePlus} label="Extras revenue" value={usd(extrasRevenue)} />
              <FinanceCard icon={CreditCard} label="Paid / posted" value={usd(paidEstimate)} />
              <FinanceCard icon={BarChart3} label="Tax included" value="Tracked per reservation" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Occupancy", value: `${data.occupancyPct.toFixed(1)}%` },
                { label: "ADR", value: usd(data.adrCents) },
                { label: "RevPAR", value: usd(data.revparCents) },
                { label: "Revenue", value: usd(data.totalRevenueCents) },
                { label: "Nights Sold", value: String(data.nightsSold) },
                { label: "Avg LOS", value: data.avgLos.toFixed(1) },
                { label: "Top Room", value: data.topRoomType || "—" },
                { label: "Top Source", value: data.topSource || "—" },
              ].map(k => (
                <div key={k.label} className="p-3 rounded-lg border bg-card">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</p>
                  <p className="text-lg font-bold mt-1 truncate">{k.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="font-semibold text-sm mb-2">By Room Type</p>
              <div className="rounded-lg border overflow-hidden text-sm">
                <div className="grid grid-cols-3 px-3 py-2 bg-muted/50 text-xs font-semibold">
                  <span>Room</span><span className="text-right">Nights</span><span className="text-right">Revenue</span>
                </div>
                {data.perRoomType.length === 0 ? <div className="p-3"><LodgingNeedsSetupEmptyState icon={BarChart3} title="Room revenue report is ready" description="No live records yet. Reports populate once rooms and reservations exist." primaryAction={{ label: "Open rooms", tab: "lodge-rooms" }} secondaryAction={{ label: "Review reservations", tab: "lodge-reservations" }} compact /></div>
                  : data.perRoomType.map(r => (
                    <div key={r.name} className="grid grid-cols-3 px-3 py-2 border-t text-xs">
                      <span className="truncate">{r.name}</span><span className="text-right">{r.nights}</span><span className="text-right">{usd(r.revenue)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-sm mb-2">By Source</p>
              <div className="rounded-lg border overflow-hidden text-sm">
                <div className="grid grid-cols-3 px-3 py-2 bg-muted/50 text-xs font-semibold">
                  <span>Source</span><span className="text-right">Nights</span><span className="text-right">Revenue</span>
                </div>
                {data.perSource.length === 0 ? <div className="p-3"><LodgingNeedsSetupEmptyState icon={BarChart3} title="Booking source report is ready" description="No live records yet. Booking sources appear after reservations are added." primaryAction={{ label: "Review reservations", tab: "lodge-reservations" }} secondaryAction={{ label: "Open Front Desk", tab: "lodge-frontdesk" }} compact /></div>
                  : data.perSource.map(r => (
                    <div key={r.source} className="grid grid-cols-3 px-3 py-2 border-t text-xs">
                      <span className="capitalize">{r.source}</span><span className="text-right">{r.nights}</span><span className="text-right">{usd(r.revenue)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

function FinanceCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-primary/5 p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p><Icon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-lg font-bold text-foreground truncate">{value}</p></div>;
}
