import { Eye, Heart, MessageCircle, Share2, TrendingUp, Clock, BarChart3, Activity, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReelAnalyticsProps {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

function compactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString();
}

export default function ReelAnalytics({ views, likes, comments, shares }: ReelAnalyticsProps) {
  const totalActions = likes + comments + shares;
  const engagementRate = views > 0 ? (((likes + comments + shares) / views) * 100).toFixed(1) : "0";
  const averageRetention = views > 0 ? Math.max(18, Math.min(92, 72 - Number(engagementRate) * 0.4)) : 0;
  const healthLabel = Number(engagementRate) >= 8 ? "Strong" : Number(engagementRate) >= 3 ? "Building" : "Warming";
  const insightLabel = Number(engagementRate) >= 8
    ? "Momentum is strong"
    : comments < Math.max(2, Math.round(likes * 0.08))
      ? "Invite comments"
      : "Keep testing hooks";
  const insightDetail = Number(engagementRate) >= 8
    ? "Push this reel while attention is active"
    : comments < Math.max(2, Math.round(likes * 0.08))
      ? "Ask a question in the caption or comments"
      : "Try another opener with this format";
  const shareRate = views > 0 ? (shares / views) * 100 : 0;
  const distributionSignal =
    shareRate >= 2
      ? { label: "Share lift", detail: `${shareRate.toFixed(1)}% share rate`, width: `${Math.min(100, Math.max(42, shareRate * 18))}%` }
      : totalActions >= 50
        ? { label: "Action base", detail: `${compactNumber(totalActions)} total actions`, width: "68%" }
        : { label: "Testing signal", detail: "Collect more actions", width: `${Math.min(48, Math.max(18, totalActions * 2))}%` };

  const stats = [
    { icon: Eye, label: "Views", value: compactNumber(views), color: "text-sky-500" },
    { icon: Heart, label: "Likes", value: compactNumber(likes), color: "text-rose-500" },
    { icon: MessageCircle, label: "Comments", value: compactNumber(comments), color: "text-amber-500" },
    { icon: Share2, label: "Shares", value: compactNumber(shares), color: "text-emerald-500" },
    { icon: TrendingUp, label: "Engagement", value: `${engagementRate}%`, color: "text-purple-500" },
  ];
  const retentionBars = Array.from({ length: 20 }, (_, i) => {
    const falloff = i * 3.2;
    const pulse = Math.sin((i + 1) * 0.9) * 7;
    return Math.max(16, Math.min(96, averageRetention + 18 - falloff + pulse));
  });

  return (
    <div className="zivo-social-module space-y-4 overflow-hidden rounded-[1.25rem] p-3">
      <div className="zivo-social-header-glass flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
            <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-primary">Performance</p>
            <h3 className="truncate text-base font-black tracking-tight text-foreground">Reel analytics</h3>
          </div>
        </div>
        <div className="zivo-social-chip flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-primary">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Live
        </div>
      </div>

      <div className="zivo-social-share-preview flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
              Creator insight
            </span>
            <span className="block truncate text-xs font-bold text-foreground">{insightDetail}</span>
          </span>
        </span>
        <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
          {insightLabel}
        </span>
      </div>

      <div className="zivo-social-module-tile rounded-2xl px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-primary">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-foreground">{distributionSignal.label}</span>
              <span className="block truncate text-[11px] font-semibold text-muted-foreground">{distributionSignal.detail}</span>
            </span>
          </span>
          <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
            Growth
          </span>
        </div>
        <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 transition-[width] duration-300"
            style={{ width: distributionSignal.width }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Zap className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tabular-nums text-foreground">{compactNumber(totalActions)}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Actions</span>
          </span>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-foreground">{healthLabel}</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Health</span>
          </span>
        </div>
        <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-500">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tabular-nums text-foreground">{Math.round(averageRetention)}%</span>
            <span className="block truncate text-[10px] font-semibold text-muted-foreground">Retention</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="zivo-social-module-tile min-h-[82px] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <s.icon className={cn("h-4 w-4", s.color)} aria-hidden="true" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40" aria-hidden />
            </div>
            <p className="truncate text-lg font-black leading-tight text-foreground">{s.value}</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="zivo-social-module-tile p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground">Audience Retention</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">Stable preview from current engagement</p>
          </div>
          <span className="zivo-social-chip flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black text-primary">
            <Activity className="h-3.5 w-3.5" />
            {Math.round(averageRetention)}%
          </span>
        </div>
        <div className="flex h-24 items-end gap-1 rounded-2xl bg-white/35 px-2 py-2 shadow-inner">
          {retentionBars.map((height, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-cyan-500/35 via-fuchsia-500/30 to-white/75 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">0:00</span>
          <span className="zivo-social-chip rounded-full px-2 py-0.5 text-[10px] font-black text-primary">
            {healthLabel} signal
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">End</span>
        </div>
      </div>
    </div>
  );
}
