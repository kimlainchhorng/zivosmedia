/**
 * MarketingChannelTile — Status, last sent, 7d sparkline, "Send test" action.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MessageSquare, Smartphone, Send } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import SendTestDialog from "./SendTestDialog";
import type { ChannelStatus } from "@/hooks/useStoreMarketingOverview";

const META = {
  push: { icon: Bell, label: "Push", color: "bg-blue-500/10 text-blue-600" },
  email: { icon: Mail, label: "Email", color: "bg-violet-500/10 text-violet-600" },
  sms: { icon: MessageSquare, label: "SMS", color: "bg-emerald-500/10 text-emerald-600" },
  inapp: { icon: Smartphone, label: "In-app", color: "bg-amber-500/10 text-amber-600" },
} as const;

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <svg viewBox={`0 0 ${data.length * 8} 24`} className="w-full h-6">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={data.map((v, i) => `${i * 8},${24 - (v / max) * 22}`).join(" ")}
        className="text-primary"
      />
    </svg>
  );
}

export default function MarketingChannelTile({
  channel,
  storeId,
  onCompose,
}: {
  channel: ChannelStatus;
  storeId?: string;
  onCompose?: (ch: string) => void;
}) {
  const meta = META[channel.channel];
  const Icon = meta.icon;
  const [testOpen, setTestOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{meta.label}</div>
                <Badge variant={channel.status === "configured" ? "default" : "secondary"} className="text-[9px] h-4 px-1.5">
                  {channel.status === "configured" ? "Active" : "Setup needed"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mb-1.5">
            {channel.last_sent_at
              ? `Last sent ${formatDistanceToNow(parseISO(channel.last_sent_at), { addSuffix: true })}`
              : "Never sent"}
          </div>
          <Sparkline data={channel.volume_7d} />
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-7 text-xs mt-1"
            onClick={() => {
              if (onCompose) onCompose(channel.channel);
              else setTestOpen(true);
            }}
          >
            <Send className="w-3 h-3 mr-1" /> Send test
          </Button>
        </CardContent>
      </Card>
      {storeId && (
        <SendTestDialog
          open={testOpen}
          onClose={() => setTestOpen(false)}
          storeId={storeId}
          channel={channel.channel}
        />
      )}
    </>
  );
}
