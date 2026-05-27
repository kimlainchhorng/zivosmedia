/**
 * AdsStudioDashboard — Creative performance charts, winner history, and budget pacing.
 * Combines: (B) Performance dashboard + (C) Budget caps & spend pacing per platform.
 */
import { useEffect, useMemo, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { Trophy, TrendingUp, DollarSign, Gauge, Save, Loader2, AlertTriangle } from "lucide-react";
import { PerformanceChartSkeleton, BreakdownTableSkeleton, LedgerListSkeleton } from "@/components/admin/ads/MarketingSkeletons";
import MarketingEmptyState from "@/components/admin/ads/MarketingEmptyState";
import { useIsMobilePreview } from "@/components/admin/ads/useResponsiveWidth";

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const numFormatter = new Intl.NumberFormat("en-US");

interface Props { storeId: string }
type Platform = "google" | "meta" | "tiktok" | "youtube" | "all";

interface Budget {
  id?: string;
  store_id: string;
  platform: Platform;
  daily_cap_cents: number;
  monthly_cap_cents: number;
  pacing: "even" | "accelerated" | "front_loaded";
  is_paused: boolean;
}
interface DailySpend {
  spend_date: string;
  platform: string;
  spend_cents: number;
  impressions: number;
  clicks: number;
  conversions: number;
}
interface Winner {
  variant_id: string;
  creative_id: string;
  variant_label: string;
  headline: string | null;
  cta: string | null;
  goal: string;
  auto_winner_at: string | null;
}

const PLATFORMS: Platform[] = ["all", "google", "meta", "tiktok", "youtube"];
const PLATFORM_LABEL: Record<string, string> = { all: "All Platforms", google: "Google", meta: "Meta", tiktok: "TikTok", youtube: "YouTube" };

const fmtUsd = (cents: number) => usdFormatter.format(cents / 100);

const KpiCard = memo(function KpiCard({ label, value, Icon }: { label: string; value: string; Icon: any }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="text-lg font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
});

export default function AdsStudioDashboard({ storeId }: Props) {
  const isMobile = useIsMobilePreview();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Record<string, Budget>>({});
  const [spend, setSpend] = useState<DailySpend[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [days, setDays] = useState<number>(30);

  const load = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      const [{ data: b }, { data: s }, { data: w }] = await Promise.all([
        supabase.from("ads_studio_budgets" as any).select("*").eq("store_id", storeId),
        supabase.from("ads_studio_daily_spend" as any).select("spend_date,platform,spend_cents,impressions,clicks,conversions").eq("store_id", storeId).gte("spend_date", since).order("spend_date", { ascending: true }),
        supabase.from("ads_studio_winner_history" as any).select("variant_id,creative_id,variant_label,headline,cta,goal,auto_winner_at").eq("store_id", storeId).limit(10),
      ]);
      const map: Record<string, Budget> = {};
      for (const p of PLATFORMS) {
        const found = (b as any[] | null)?.find((x) => x.platform === p);
        map[p] = found ?? { store_id: storeId, platform: p, daily_cap_cents: 0, monthly_cap_cents: 0, pacing: "even", is_paused: false };
      }
      setBudgets(map);
      setSpend((s as any) || []);
      setWinners((w as any) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load dashboard");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (storeId) load(); }, [storeId, days]);

  const saveBudget = async (platform: Platform) => {
    const b = budgets[platform];
    if (!b) return;
    setSaving(platform);
    try {
      const payload = {
        store_id: storeId,
        platform,
        daily_cap_cents: Math.max(0, Math.round(b.daily_cap_cents)),
        monthly_cap_cents: Math.max(0, Math.round(b.monthly_cap_cents)),
        pacing: b.pacing,
        is_paused: b.is_paused,
      };
      const { error } = await supabase.from("ads_studio_budgets" as any).upsert(payload, { onConflict: "store_id,platform" });
      if (error) throw error;
      toast.success(`${PLATFORM_LABEL[platform]} budget saved`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally { setSaving(null); }
  };

  const updateBudget = (p: Platform, patch: Partial<Budget>) =>
    setBudgets((prev) => ({ ...prev, [p]: { ...prev[p], ...patch } }));

  /* ───── Aggregations ───── */
  const totals = useMemo(() => {
    const t = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
    for (const r of spend) {
      t.spend += r.spend_cents; t.impressions += r.impressions; t.clicks += r.clicks; t.conversions += r.conversions;
    }
    const ctr = t.impressions ? (t.clicks / t.impressions) * 100 : 0;
    const cvr = t.clicks ? (t.conversions / t.clicks) * 100 : 0;
    const cpc = t.clicks ? t.spend / t.clicks : 0;
    return { ...t, ctr, cvr, cpc };
  }, [spend]);

  const trendData = useMemo(() => {
    const byDate: Record<string, any> = {};
    for (const r of spend) {
      const d = r.spend_date;
      if (!byDate[d]) byDate[d] = { date: d, spend: 0, clicks: 0, impressions: 0 };
      byDate[d].spend += r.spend_cents / 100;
      byDate[d].clicks += r.clicks;
      byDate[d].impressions += r.impressions;
    }
    return Object.values(byDate).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [spend]);

  const platformData = useMemo(() => {
    const byPlat: Record<string, any> = {};
    for (const r of spend) {
      if (!byPlat[r.platform]) byPlat[r.platform] = { platform: PLATFORM_LABEL[r.platform] || r.platform, spend: 0, clicks: 0, conversions: 0 };
      byPlat[r.platform].spend += r.spend_cents / 100;
      byPlat[r.platform].clicks += r.clicks;
      byPlat[r.platform].conversions += r.conversions;
    }
    return Object.values(byPlat);
  }, [spend]);

  // Today's spend per platform → pacing meter
  const todayByPlat = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const map: Record<string, number> = {};
    for (const r of spend) if (r.spend_date === today) map[r.platform] = (map[r.platform] || 0) + r.spend_cents;
    return map;
  }, [spend]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Performance & Budget</h3>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Spend" value={fmtUsd(totals.spend)} Icon={DollarSign} />
        <KpiCard label="Impressions" value={numFormatter.format(totals.impressions)} Icon={TrendingUp} />
        <KpiCard label="CTR" value={`${totals.ctr.toFixed(2)}%`} Icon={Gauge} />
        <KpiCard label="CPC" value={fmtUsd(totals.cpc)} Icon={DollarSign} />
      </div>

      {/* Trend chart */}
      {loading ? (
        <PerformanceChartSkeleton />
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Spend & clicks over time</CardTitle></CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <MarketingEmptyState icon={TrendingUp} title="No spend recorded yet" body="Once your ads run, daily spend will chart here." />
            ) : (
              <div className="aspect-[4/3] sm:aspect-[16/8] lg:aspect-[16/5] w-full">
                <ResponsiveContainer width="100%" height="100%" debounce={150}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" {...(isMobile ? { interval: "preserveStartEnd" as const, minTickGap: 24 } : {})} />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={isMobile ? 32 : 40} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                    <Area type="monotone" dataKey="spend" stroke="hsl(var(--primary))" fill="url(#spendGrad)" name="Spend ($)" isAnimationActive={!isMobile} animationDuration={isMobile ? 0 : 600} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Platform breakdown */}
      {loading ? (
        <BreakdownTableSkeleton />
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">By platform</CardTitle></CardHeader>
          <CardContent>
            {platformData.length === 0 ? (
              <MarketingEmptyState icon={Gauge} title="No platform data yet" body="Connect a platform and launch a campaign to see breakdowns." />
            ) : (
              <div className="aspect-[4/3] sm:aspect-[16/8] lg:aspect-[16/5] w-full">
                <ResponsiveContainer width="100%" height="100%" debounce={150}>
                  <BarChart data={platformData}>
                    {!isMobile && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
                    <XAxis dataKey="platform" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={isMobile ? 32 : 40} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="spend" fill="hsl(var(--primary))" name="Spend ($)" isAnimationActive={!isMobile} />
                    <Bar dataKey="clicks" fill="hsl(var(--accent-foreground) / 0.6)" name="Clicks" isAnimationActive={!isMobile} />
                    <Bar dataKey="conversions" fill="hsl(142 70% 45%)" name="Conversions" isAnimationActive={!isMobile} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Budget caps & pacing per platform */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Budgets & pacing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PLATFORMS.map((p) => {
            const b = budgets[p];
            if (!b) return null;
            const todaySpent = todayByPlat[p] || 0;
            const pct = b.daily_cap_cents > 0 ? Math.min(100, (todaySpent / b.daily_cap_cents) * 100) : 0;
            const overCap = b.daily_cap_cents > 0 && todaySpent >= b.daily_cap_cents;
            return (
              <div key={p} className="space-y-1.5 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{PLATFORM_LABEL[p]}</Badge>
                    {b.is_paused && <Badge variant="destructive" className="text-[10px]">Paused</Badge>}
                    {overCap && (
                      <Badge className="text-[10px] bg-amber-500/15 text-amber-600 gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" /> Cap hit
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={!b.is_paused} onCheckedChange={(v) => updateBudget(p, { is_paused: !v })} />
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => saveBudget(p)} disabled={saving === p}>
                      {saving === p ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Daily cap ($)</Label>
                    <Input type="number" min={0} value={b.daily_cap_cents / 100} onChange={(e) => updateBudget(p, { daily_cap_cents: Math.round(Number(e.target.value || 0) * 100) })} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Monthly cap ($)</Label>
                    <Input type="number" min={0} value={b.monthly_cap_cents / 100} onChange={(e) => updateBudget(p, { monthly_cap_cents: Math.round(Number(e.target.value || 0) * 100) })} className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Pacing</Label>
                    <Select value={b.pacing} onValueChange={(v: any) => updateBudget(p, { pacing: v })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="even">Even</SelectItem>
                        <SelectItem value="accelerated">Accelerated</SelectItem>
                        <SelectItem value="front_loaded">Front-loaded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {b.daily_cap_cents > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Today: {fmtUsd(todaySpent)} / {fmtUsd(b.daily_cap_cents)}</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Winner history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-amber-500" /> Winner history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <LedgerListSkeleton /> : winners.length === 0 ? (
            <MarketingEmptyState icon={Trophy} title="No winners yet" body="Schedule auto-winner from the Publish tab." />
          ) : (
            <div className="space-y-1.5">
              {winners.map((w) => (
                <div key={w.variant_id} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                  <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <Badge variant="outline" className="text-[10px]">{w.variant_label}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{w.goal}</Badge>
                  <span className="text-[11px] truncate flex-1">{w.headline || "—"}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {w.auto_winner_at ? new Date(w.auto_winner_at).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
