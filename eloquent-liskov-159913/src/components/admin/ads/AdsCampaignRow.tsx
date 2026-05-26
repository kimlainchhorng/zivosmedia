/**
 * AdsCampaignRow — campaign card with sparkline + budget bar + overflow menu.
 */
import { type LucideIcon, Pause, Play, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import AdsCampaignRowMenu from "./AdsCampaignRowMenu";
import type { AdCampaign, AdPlatform } from "@/hooks/useStoreAdsOverview";

interface PlatformDef {
  id: AdPlatform;
  label: string;
  icon: LucideIcon;
  color: string;
}

interface Props {
  campaign: AdCampaign;
  platforms: PlatformDef[];
  statusColors: Record<string, string>;
  onEdit: (c: AdCampaign) => void;
  onDelete: (c: AdCampaign) => void;
  onPause: (c: AdCampaign) => void;
  onResume: (c: AdCampaign) => void;
  onLaunch: (c: AdCampaign) => void;
  onDuplicate?: (c: AdCampaign) => void;
  onArchive?: (c: AdCampaign) => void;
  onClick?: (c: AdCampaign) => void;
}

// Pseudo sparkline derived from clicks (deterministic; no fake API call).
function makeSpark(seedKey: string, total: number): { v: number }[] {
  let h = 0;
  for (let i = 0; i < seedKey.length; i++) h = (h * 31 + seedKey.charCodeAt(i)) >>> 0;
  const base = Math.max(1, total) / 7;
  return Array.from({ length: 7 }).map((_, i) => {
    h = (h * 9301 + 49297) % 233280;
    const noise = (h / 233280) * 0.6 + 0.7; // 0.7 - 1.3
    return { v: Math.round(base * noise) };
  });
}

export default function AdsCampaignRow({
  campaign: c,
  platforms,
  statusColors,
  onEdit,
  onDelete,
  onPause,
  onResume,
  onLaunch,
  onDuplicate,
  onArchive,
  onClick,
}: Props) {
  const spark = makeSpark(c.id, c.clicks);
  const budgetPct = c.total_budget_cents
    ? Math.min(100, Math.round((c.spend_cents / c.total_budget_cents) * 100))
    : 0;

  return (
    <div
      className="group flex flex-col gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-accent/10 transition cursor-pointer"
      onClick={() => onClick?.(c)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(c);
        }
      }}
    >
      {/* Top row: name + status + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate">{c.name}</span>
            <Badge
              className={cn(
                "text-[10px] h-4 px-1.5 capitalize",
                statusColors[c.status] || ""
              )}
            >
              {c.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-muted-foreground capitalize">
              {c.objective}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <div className="flex items-center gap-0.5">
              {(c.platforms || []).slice(0, 5).map((p) => {
                const def = platforms.find((x) => x.id === p);
                if (!def) return null;
                const Icon = def.icon;
                return <Icon key={p} className={cn("w-3 h-3", def.color)} />;
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {c.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] px-2"
              onClick={() => onLaunch(c)}
              aria-label="Submit campaign for review"
            >
              Submit
            </Button>
          )}
          {c.status === "active" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onPause(c)}
              aria-label="Pause campaign"
            >
              <Pause className="w-3.5 h-3.5" />
            </Button>
          )}
          {c.status === "paused" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onResume(c)}
              aria-label="Resume campaign"
            >
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}
          <AdsCampaignRowMenu
            campaign={c}
            onEdit={onEdit}
            onDuplicate={(cam) => onDuplicate?.(cam)}
            onPause={onPause}
            onResume={onResume}
            onArchive={(cam) => onArchive?.(cam)}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-[1fr,auto] gap-3 items-end">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span>
              <span className="font-semibold text-foreground">
                {c.impressions.toLocaleString()}
              </span>{" "}
              impr
            </span>
            <span>
              <span className="font-semibold text-foreground">
                {c.clicks.toLocaleString()}
              </span>{" "}
              clicks
            </span>
            <span>
              <span className="font-semibold text-foreground">
                ${(c.spend_cents / 100).toFixed(2)}
              </span>{" "}
              spent
            </span>
          </div>
          {c.total_budget_cents > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                <span>Budget</span>
                <span>{budgetPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
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
        </div>
        <div className="w-16 h-8 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function CampaignPlatformIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return <Icon className={cn("w-3 h-3", color)} />;
}

export const FallbackPlatformIcon = Megaphone;
