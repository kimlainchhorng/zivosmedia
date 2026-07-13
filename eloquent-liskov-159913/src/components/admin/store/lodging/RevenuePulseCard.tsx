import { useMemo } from "react";
import { useLodgeReports } from "@/hooks/lodging/useLodgeReports";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";
import { TrendingUp, DollarSign, Percent, BedDouble, ArrowDownToLine, ArrowUpFromLine, BarChart3 } from "lucide-react";

const money = (cents: number) => `$${(cents / 100).toFixed(0)}`;
const pct = (n: number) => `${n.toFixed(1)}%`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function RevenuePulseCard({ storeId }: { storeId: string }) {
  const r7 = useLodgeReports(storeId, daysAgo(7), todayISO());
  const r30 = useLodgeReports(storeId, daysAgo(30), todayISO());
  const { data: reservations = [] } = useLodgeReservations(storeId, "all");

  const today = todayISO();
  const arrivals = reservations.filter((r: any) => r.check_in?.slice(0, 10) === today).length;
  const departures = reservations.filter((r: any) => r.check_out?.slice(0, 10) === today).length;
  const inHouse = reservations.filter((r: any) => r.status === "checked_in").length;

  // Sparkline: per-day occupancy estimate over last 14 days (simple proxy from reservations)
  const sparkData = useMemo(() => {
    const buckets: number[] = Array(14).fill(0);
    const start = Date.now() - 13 * 86400000;
    reservations.forEach((res: any) => {
      const ci = new Date(res.check_in || 0).getTime();
      const co = new Date(res.check_out || 0).getTime();
      if (!ci || !co) return;
      for (let i = 0; i < 14; i++) {
        const day = start + i * 86400000;
        if (day >= ci && day < co && !["cancelled", "no_show"].includes(res.status)) buckets[i] += 1;
      }
    });
    const max = Math.max(1, ...buckets);
    return buckets.map((v) => Math.round((v / max) * 100));
  }, [reservations]);

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 p-1.5 text-primary"><TrendingUp className="h-3.5 w-3.5" /></span>
          <p className="text-[13px] font-bold text-foreground">Revenue Pulse</p>
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">Live</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Last 7 / 30 days</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <KpiTile icon={Percent} label="Occupancy" v7={pct(r7.data?.occupancyPct ?? 0)} v30={pct(r30.data?.occupancyPct ?? 0)} />
        <KpiTile icon={DollarSign} label="ADR" v7={money(r7.data?.adrCents ?? 0)} v30={money(r30.data?.adrCents ?? 0)} />
        <KpiTile icon={BarChart3} label="RevPAR" v7={money(r7.data?.revparCents ?? 0)} v30={money(r30.data?.revparCents ?? 0)} />
        <KpiTile icon={BedDouble} label="Revenue" v7={money(r7.data?.totalRevenueCents ?? 0)} v30={money(r30.data?.totalRevenueCents ?? 0)} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <MiniTile icon={ArrowDownToLine} label="Arrivals today" value={String(arrivals)} />
        <MiniTile icon={BedDouble} label="In-house now" value={String(inHouse)} />
        <MiniTile icon={ArrowUpFromLine} label="Departures today" value={String(departures)} />
      </div>

      <div className="mt-3 rounded-md border border-border/60 bg-background/50 p-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last 14 days · occupancy trend</p>
        <div className="flex h-10 items-end gap-0.5">
          {sparkData.map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-primary/70 transition-all" style={{ height: `${Math.max(4, h)}%` }} title={`${h}%`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiTile({ icon: Icon, label, v7, v30 }: { icon: any; label: string; v7: string; v30: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <p className="mt-1 text-lg font-bold leading-tight text-foreground">{v7}</p>
      <p className="text-[10px] text-muted-foreground">30d: <span className="font-semibold text-foreground/80">{v30}</span></p>
    </div>
  );
}

function MiniTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 p-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
