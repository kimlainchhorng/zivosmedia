/**
 * AdsStudioAnalytics — performance dashboard across all creatives for a store.
 * Pulls from ads_studio_creative_stats view (impressions, clicks, conversions, revenue, AI spend).
 */
import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, MousePointerClick, Eye, Target, DollarSign, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PerformanceChartSkeleton } from "./ads/MarketingSkeletons";
import MarketingEmptyState from "./ads/MarketingEmptyState";
import ResponsiveBreakdown from "./ads/ResponsiveBreakdown";
import type { BreakdownColumn } from "./ads/ResponsiveBreakdown";
import { mkMeta } from "./ads/marketing-tokens";
import { cn } from "@/lib/utils";

const NUM_FMT = new Intl.NumberFormat("en-US");
const CURRENCY_FMT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

interface Props { storeId: string }

interface CreativeStat {
  creative_id: string;
  goal: string;
  status: string;
  created_at: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_cents: number;
  spend_cents: number;
}

export default function AdsStudioAnalytics({ storeId }: Props) {
  const [stats, setStats] = useState<CreativeStat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ads_studio_creative_stats" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setStats((data as any) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load analytics");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (storeId) load(); }, [storeId]);

  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, s) => ({
          impressions: acc.impressions + (s.impressions || 0),
          clicks: acc.clicks + (s.clicks || 0),
          conversions: acc.conversions + (s.conversions || 0),
          revenue_cents: acc.revenue_cents + (s.revenue_cents || 0),
          spend_cents: acc.spend_cents + (s.spend_cents || 0),
        }),
        { impressions: 0, clicks: 0, conversions: 0, revenue_cents: 0, spend_cents: 0 },
      ),
    [stats],
  );

  const { ctr, cvr, roas } = useMemo(
    () => ({
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cvr: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
      roas: totals.spend_cents > 0 ? totals.revenue_cents / totals.spend_cents : 0,
    }),
    [totals],
  );

  const exportCsv = useCallback(() => {
    const header = "goal,date,impressions,clicks,conversions,revenue,spend\n";
    const lines = stats
      .map((s) =>
        [
          s.goal,
          new Date(s.created_at).toISOString().slice(0, 10),
          s.impressions,
          s.clicks,
          s.conversions,
          (s.revenue_cents / 100).toFixed(2),
          (s.spend_cents / 100).toFixed(2),
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + lines], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ads-performance-${storeId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [stats, storeId]);

  const columns = useMemo<BreakdownColumn<CreativeStat>[]>(() => ([
    { key: "goal", label: "Goal", render: (s) => <Badge variant="outline" className="text-[10px]">{s.goal}</Badge> },
    { key: "date", label: "Date", render: (s) => new Date(s.created_at).toLocaleDateString(), desktopOnly: true },
    { key: "impr", label: "Impr", isNumeric: true, render: (s) => NUM_FMT.format(s.impressions) },
    { key: "clicks", label: "Clicks", isNumeric: true, render: (s) => NUM_FMT.format(s.clicks) },
    { key: "conv", label: "Conv", isNumeric: true, render: (s) => NUM_FMT.format(s.conversions) },
    { key: "rev", label: "Revenue", isNumeric: true, render: (s) => <span className="text-primary font-medium">{CURRENCY_FMT.format(s.revenue_cents / 100)}</span> },
    { key: "spend", label: "Spend", isNumeric: true, render: (s) => <span className="text-muted-foreground">{CURRENCY_FMT.format(s.spend_cents / 100)}</span> },
  ]), []);

  if (loading) return <PerformanceChartSkeleton />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm sm:text-base">Performance</h3>
        </div>
        <Button size="sm" variant="ghost" className="h-9 sm:h-8" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5 sm:mr-1", loading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard icon={Eye} label="Impressions" value={NUM_FMT.format(totals.impressions)} />
        <StatCard icon={MousePointerClick} label="Clicks" value={NUM_FMT.format(totals.clicks)} sub={`${ctr.toFixed(2)}% CTR`} />
        <StatCard icon={Target} label="Conversions" value={NUM_FMT.format(totals.conversions)} sub={`${cvr.toFixed(2)}% CVR`} />
        <StatCard icon={DollarSign} label="Revenue" value={CURRENCY_FMT.format(totals.revenue_cents / 100)} sub={`${roas.toFixed(2)}x ROAS`} />
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs sm:text-sm font-semibold">Per-creative breakdown</p>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              AI spend: ${(totals.spend_cents / 100).toFixed(2)}
            </Badge>
          </div>
          {stats.length === 0 ? (
            <MarketingEmptyState
              icon={BarChart3}
              title="No campaigns yet"
              body="Generate one in the AI Studio tab to start collecting performance data."
            />
          ) : (
            <ResponsiveBreakdown
              rows={stats}
              columns={columns}
              rowKey={(s) => s.creative_id}
              onExportCsv={exportCsv}
              mobileTitle={(s) => (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{s.goal}</Badge>
                  <span className={mkMeta}>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const StatCard = memo(function StatCard({ icon: Icon, label, value, sub }: any) {
  return (
    <Card>
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          <Icon className="h-3 w-3" />
          <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
        </div>
        <p className="text-lg sm:text-xl font-bold tabular-nums">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
});
