/**
 * MarketingCampaignRow — Dense row with channel icons, audience, rates, sparkline, status.
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Smartphone, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MarketingCampaignSummary } from "@/hooks/useStoreMarketingOverview";

const CHANNEL_ICON: Record<string, any> = {
  push: Bell,
  email: Mail,
  sms: MessageSquare,
  inapp: Smartphone,
};

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (["sending", "running", "active"].includes(s)) return "default";
  if (s === "failed") return "destructive";
  if (["draft", "scheduled"].includes(s)) return "secondary";
  return "outline";
}

function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <svg viewBox={`0 0 ${data.length * 6} 16`} className="w-14 h-4">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={data.map((v, i) => `${i * 6},${16 - (v / max) * 14}`).join(" ")}
        className="text-primary"
      />
    </svg>
  );
}

export default function MarketingCampaignRow({
  campaign,
  onClick,
  onAction,
}: {
  campaign: MarketingCampaignSummary;
  onClick?: () => void;
  onAction?: (a: "pause" | "resume" | "duplicate" | "delete") => void;
}) {
  const Icon = CHANNEL_ICON[campaign.channel || "push"] || Bell;
  return (
    <Card
      className="p-3 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-semibold truncate">{campaign.name}</h4>
            <Badge variant={statusVariant(campaign.status)} className="text-[9px] h-4 px-1.5 capitalize shrink-0">
              {campaign.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {campaign.audience_size != null && <span>{campaign.audience_size.toLocaleString()} recipients</span>}
            {campaign.open_rate != null && <span>· {campaign.open_rate}% open</span>}
            {campaign.click_rate != null && <span>· {campaign.click_rate}% click</span>}
          </div>
        </div>
        {campaign.sparkline && <MiniSparkline data={campaign.sparkline} />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onAction?.("pause")}>Pause</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("resume")}>Resume</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("duplicate")}>Duplicate</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("delete")} className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
