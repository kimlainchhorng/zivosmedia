/**
 * UnifiedPerformancePanel — Cross-channel attribution + funnel + CSV export + share link.
 * Supports 7d/30d/90d presets + custom date range, full KPI strip, top campaigns table.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Link2 } from "lucide-react";
import { useUnifiedPerformance, type DateRange } from "@/hooks/useUnifiedPerformance";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { toast } from "sonner";
import PerformanceDateRangePicker, { type CustomRange } from "./PerformanceDateRangePicker";
import PerformanceKpiStrip from "./PerformanceKpiStrip";
import PerformanceTopCampaigns from "./PerformanceTopCampaigns";
import { exportPerformanceCsv } from "@/lib/performanceCsvExport";
import { format } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(217 91% 60%)", "hsl(142 71% 45%)"];

export default function UnifiedPerformancePanel({ storeId }: { storeId: string }) {
  const initial = useInitialFromUrl();
  const [preset, setPreset] = useState<DateRange>(initial.preset);
  const [custom, setCustom] = useState<CustomRange>(initial.custom);

  const { data, isLoading } = useUnifiedPerformance(
    storeId,
    preset === "custom" && custom.from && custom.to
      ? { range: "custom", fromIso: custom.from.toISOString(), toIso: custom.to.toISOString() }
      : { range: preset }
  );

  const fromLabel = data ? format(new Date(data.meta.sinceIso), "yyyy-MM-dd") : "";
  const toLabel = data ? format(new Date(data.meta.untilIso), "yyyy-MM-dd") : "";

  const handleExport = () => {
    if (!data) return;
    const filename = exportPerformanceCsv({
      fromLabel,
      toLabel,
      totals: {
        spend_cents: data.totals.spend_cents,
        revenue_cents: data.totals.revenue_cents,
        roas: data.totals.roas,
        conversions: data.totals.conversions,
        clicks: data.totals.clicks,
        impressions: data.totals.impressions,
      },
      series: data.series,
    });
    toast.success(`Exported ${filename}`);
  };

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("perf_range", preset);
    if (preset === "custom" && custom.from && custom.to) {
      url.searchParams.set("perf_from", custom.from.toISOString());
      url.searchParams.set("perf_to", custom.to.toISOString());
    } else {
      url.searchParams.delete("perf_from");
      url.searchParams.delete("perf_to");
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Share link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold">Unified performance</h3>
          <p className="text-[11px] text-muted-foreground">
            {data
              ? `${fromLabel} → ${toLabel} · ${data.meta.days} day${data.meta.days === 1 ? "" : "s"}`
              : "Cross-channel attribution & funnel"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PerformanceDateRangePicker
            preset={preset}
            custom={custom}
            onPresetChange={setPreset}
            onCustomChange={setCustom}
          />
          <Button size="sm" variant="outline" onClick={handleShare} className="h-8">
            <Link2 className="w-3.5 h-3.5 mr-1" /> Share
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} className="h-8" disabled={!data}>
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <Card>
          <CardContent className="py-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading performance data…
          </CardContent>
        </Card>
      ) : (
        <>
          <PerformanceKpiStrip
            spendCents={data.totals.spend_cents}
            revenueCents={data.totals.revenue_cents}
            roas={data.totals.roas}
            conversions={data.totals.conversions}
            clicks={data.totals.clicks}
            impressions={data.totals.impressions}
          />

          {/* Stacked area */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue attribution</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div
                className="h-48"
                role="img"
                aria-label={`Daily revenue chart from ${fromLabel} to ${toLabel}`}
              >
                <ResponsiveContainer>
                  <AreaChart data={data.series}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="ads" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
                    <Area type="monotone" dataKey="marketing" stackId="1" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.6} />
                    <Area type="monotone" dataKey="organic" stackId="1" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Funnel + Mix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Funnel</CardTitle></CardHeader>
              <CardContent className="space-y-2 pb-4">
                {[
                  { l: "Impressions", v: data.funnel.impressions, w: 100 },
                  { l: "Clicks", v: data.funnel.clicks, w: data.funnel.impressions ? (data.funnel.clicks / data.funnel.impressions) * 100 : 0 },
                  { l: "Add to cart", v: data.funnel.addToCart, w: data.funnel.impressions ? (data.funnel.addToCart / data.funnel.impressions) * 100 : 0 },
                  { l: "Purchases", v: data.funnel.purchases, w: data.funnel.impressions ? (data.funnel.purchases / data.funnel.impressions) * 100 : 0 },
                ].map((s, idx, arr) => {
                  const prev = idx > 0 ? arr[idx - 1] : null;
                  const drop = prev && prev.v > 0 ? ((prev.v - s.v) / prev.v) * 100 : null;
                  return (
                    <div key={s.l}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>
                          {s.l}
                          {drop !== null && drop > 0 && (
                            <span className="ml-1.5 text-[10px] text-amber-500">
                              −{drop.toFixed(0)}%
                            </span>
                          )}
                        </span>
                        <span className="font-semibold tabular-nums">{s.v.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(2, s.w)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Channel mix</CardTitle></CardHeader>
              <CardContent className="pb-4">
                <div className="h-40" role="img" aria-label="Channel mix donut chart">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={data.mix}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        innerRadius={32}
                        label={(e: any) => `${e.name}`}
                      >
                        {data.mix.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <PerformanceTopCampaigns storeId={storeId} fromIso={data.meta.sinceIso} />
        </>
      )}
    </div>
  );
}

/** Read initial range from URL so share links land on the right view. */
function useInitialFromUrl(): { preset: DateRange; custom: CustomRange } {
  if (typeof window === "undefined") return { preset: "30d", custom: {} };
  const url = new URL(window.location.href);
  const p = url.searchParams.get("perf_range") as DateRange | null;
  const f = url.searchParams.get("perf_from");
  const t = url.searchParams.get("perf_to");
  return {
    preset: p && ["7d", "30d", "90d", "custom"].includes(p) ? p : "30d",
    custom: {
      from: f ? new Date(f) : undefined,
      to: t ? new Date(t) : undefined,
    },
  };
}
