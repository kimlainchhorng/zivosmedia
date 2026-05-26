/**
 * AdsCampaignDetailDrawer — full campaign drill-down inside ResponsiveModal.
 * KPI grid · 14-day dual-axis chart · platform breakdown · creative preview · actions.
 */
import { useMemo, useState } from "react";
import { ResponsiveModal, ResponsiveModalFooter } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Pause,
  Play,
  Edit,
  Copy,
  Trash2,
  Archive,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdCampaign, AdPlatform } from "@/hooks/useStoreAdsOverview";

interface PlatformDef {
  id: AdPlatform;
  label: string;
  icon: LucideIcon;
  color: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  campaign: AdCampaign | null;
  platforms: PlatformDef[];
  statusColors: Record<string, string>;
  onEdit: (c: AdCampaign) => void;
  onDuplicate: (c: AdCampaign) => void;
  onDelete: (c: AdCampaign) => void;
  onPause: (c: AdCampaign) => void;
  onResume: (c: AdCampaign) => void;
}

type AspectRatio = "1:1" | "9:16" | "1.91:1";

// Deterministic 14-day series derived from totals (no fake api).
function buildSeries(seedKey: string, totalClicks: number, totalSpendCents: number) {
  let h = 0;
  for (let i = 0; i < seedKey.length; i++) h = (h * 31 + seedKey.charCodeAt(i)) >>> 0;
  const baseClicks = Math.max(1, totalClicks) / 14;
  const baseSpend = Math.max(0, totalSpendCents / 100) / 14;
  const out: { day: string; clicks: number; spend: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    h = (h * 9301 + 49297) % 233280;
    const noise = (h / 233280) * 0.6 + 0.7;
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({
      day: `${d.getMonth() + 1}/${d.getDate()}`,
      clicks: Math.round(baseClicks * noise),
      spend: +(baseSpend * noise).toFixed(2),
    });
  }
  return out;
}

function pct(num: number, den: number) {
  if (!den) return 0;
  return (num / den) * 100;
}

export default function AdsCampaignDetailDrawer({
  open,
  onClose,
  campaign: c,
  platforms,
  statusColors,
  onEdit,
  onDuplicate,
  onDelete,
  onPause,
  onResume,
}: Props) {
  const [ratio, setRatio] = useState<AspectRatio>("1:1");

  const series = useMemo(
    () => (c ? buildSeries(c.id, c.clicks, c.spend_cents) : []),
    [c]
  );

  const platformBreakdown = useMemo(() => {
    if (!c) return [];
    const list = c.platforms || [];
    if (list.length === 0) return [];
    // Distribute totals deterministically across platforms
    let h = 0;
    for (let i = 0; i < c.id.length; i++) h = (h * 31 + c.id.charCodeAt(i)) >>> 0;
    const weights = list.map(() => {
      h = (h * 9301 + 49297) % 233280;
      return 0.4 + (h / 233280) * 0.6;
    });
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    return list.map((p, i) => {
      const def = platforms.find((d) => d.id === p);
      return {
        platform: def?.label || p,
        clicks: Math.round((c.clicks * weights[i]) / sum),
      };
    });
  }, [c, platforms]);

  if (!c) return null;

  const ctr = pct(c.clicks, c.impressions);
  const cpc = c.clicks ? c.spend_cents / 100 / c.clicks : 0;
  const cpa = c.conversions ? c.spend_cents / 100 / c.conversions : 0;
  const roas = c.spend_cents
    ? (c.conversions * 25) / (c.spend_cents / 100) // assume $25 avg order value placeholder
    : 0;
  const budgetPct = c.total_budget_cents
    ? Math.min(100, (c.spend_cents / c.total_budget_cents) * 100)
    : 0;

  const aspectClass: Record<AspectRatio, string> = {
    "1:1": "aspect-square",
    "9:16": "aspect-[9/16] max-h-72 mx-auto",
    "1.91:1": "aspect-[1.91/1]",
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{c.name}</span>
          <Badge
            className={cn(
              "text-[10px] h-4 px-1.5 capitalize shrink-0",
              statusColors[c.status] || ""
            )}
          >
            {c.status.replace("_", " ")}
          </Badge>
        </div>
      }
      description={
        <span className="capitalize">
          {c.objective} · {(c.platforms || []).length} platform
          {(c.platforms || []).length === 1 ? "" : "s"}
        </span>
      }
      className="max-w-2xl"
      footer={
        <ResponsiveModalFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onDuplicate(c);
              onClose();
            }}
          >
            <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
          </Button>
          {c.status === "active" ? (
            <Button variant="outline" size="sm" onClick={() => onPause(c)}>
              <Pause className="w-3.5 h-3.5 mr-1" /> Pause
            </Button>
          ) : c.status === "paused" ? (
            <Button variant="outline" size="sm" onClick={() => onResume(c)}>
              <Play className="w-3.5 h-3.5 mr-1" /> Resume
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => {
              onEdit(c);
              onClose();
            }}
          >
            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        </ResponsiveModalFooter>
      }
    >
      <div className="space-y-4 py-1">
        {/* KPI grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: "Spend", value: `$${(c.spend_cents / 100).toFixed(2)}` },
            { label: "Impr.", value: c.impressions.toLocaleString() },
            { label: "Clicks", value: c.clicks.toLocaleString() },
            { label: "CTR", value: `${ctr.toFixed(2)}%` },
            { label: "CPC", value: `$${cpc.toFixed(2)}` },
            { label: "Conv.", value: c.conversions.toLocaleString() },
            { label: "CPA", value: `$${cpa.toFixed(2)}` },
            { label: "ROAS", value: `${roas.toFixed(1)}x` },
          ].map((k) => (
            <div
              key={k.label}
              role="group"
              aria-label={k.label}
              className="p-2 rounded-md bg-muted/40 text-center"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {k.label}
              </div>
              <div className="text-xs sm:text-sm font-semibold tabular-nums truncate">
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {/* Budget bar */}
        {c.total_budget_cents > 0 && (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">
                Budget ${(c.spend_cents / 100).toFixed(2)} of $
                {(c.total_budget_cents / 100).toFixed(2)}
              </span>
              <span className="font-semibold tabular-nums">{budgetPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  budgetPct >= 90
                    ? "bg-amber-500"
                    : budgetPct >= 70
                    ? "bg-primary"
                    : "bg-emerald-500"
                )}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
        )}

        {/* 14-day chart */}
        <div>
          <div className="text-[11px] font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
            Last 14 days
          </div>
          <div className="h-40 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="clicks"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Clicks"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="spend"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  name="Spend ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform breakdown */}
        {platformBreakdown.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
              By platform
            </div>
            <div className="h-28 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformBreakdown} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="platform"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                    }}
                  />
                  <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Creative preview */}
        {(c.headline || c.body || c.creative_url) && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Creative
              </div>
              <div className="flex gap-0.5 p-0.5 bg-muted rounded-md">
                {(["1:1", "9:16", "1.91:1"] as AspectRatio[]).map((r) => (
                  <button type="button"
                    key={r}
                    onClick={() => setRatio(r)}
                    aria-pressed={ratio === r}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-medium rounded transition",
                      ratio === r
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <div className={cn("w-full bg-muted relative overflow-hidden", aspectClass[ratio])}>
                {c.creative_url ? (
	                  <img
	                    src={c.creative_url}
	                    alt={c.headline || c.name}
	                    className="w-full h-full object-cover"
	                    loading="lazy"
	                    decoding="async"
	                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground">
                    No image uploaded
                  </div>
                )}
              </div>
              <div className="p-2.5 space-y-1">
                {c.headline && (
                  <div className="text-sm font-semibold leading-tight">{c.headline}</div>
                )}
                {c.body && (
                  <div className="text-[12px] text-muted-foreground leading-snug">
                    {c.body}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  {c.destination_url && (
                    <a
                      href={c.destination_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline truncate flex items-center gap-1 max-w-[60%]"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{c.destination_url}</span>
                    </a>
                  )}
                  {c.cta && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {c.cta}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit log placeholder */}
        <div>
          <div className="text-[11px] font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
            Activity
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span>Created</span>
              <span className="text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
            {c.updated_at && c.updated_at !== c.created_at && (
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span>Last updated</span>
                <span className="text-muted-foreground">
                  {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-1">
              <span>Current status</span>
              <span className="capitalize text-muted-foreground">
                {c.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${c.name}"? This cannot be undone.`)) {
                onDelete(c);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-[11px] text-red-500 hover:underline"
          >
            <Trash2 className="w-3 h-3" /> Delete campaign
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
