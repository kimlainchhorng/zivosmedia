/**
 * CampaignsHistoryPanel — the surface the "Campaign sending" toast points to.
 * Lists the store's own marketing campaigns (draft / scheduled / sending / sent /
 * failed) with live delivery counts, and hosts the "New campaign" compose flow.
 * Renders full (Campaigns tab) or compact (Overview "Recent campaigns" card).
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, Mail, MessageSquare, Smartphone, Plus, Loader2, Megaphone,
  CheckCircle2, Clock, Send, Repeat, Zap, AlertTriangle, FileEdit,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useStoreCampaigns, type StoreCampaign } from "@/hooks/useStoreCampaigns";
import NewCampaignChannelPicker from "./NewCampaignChannelPicker";
import CreateMarketingCampaignWizard from "./CreateMarketingCampaignWizard";

type Channel = "push" | "email" | "sms" | "inapp" | "multi";

const CHANNEL_ICON: Record<string, any> = {
  push: Bell, email: Mail, sms: MessageSquare, inapp: Smartphone,
};

function statusMeta(status: string): { label: string; cls: string; icon: any; pulse?: boolean } {
  switch (status) {
    case "sending":
      return { label: "Sending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Send, pulse: true };
    case "sent":
      return { label: "Sent", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 };
    case "scheduled":
      return { label: "Scheduled", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock };
    case "active":
    case "running":
      return { label: "Automation", cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", icon: Zap };
    case "failed":
      return { label: "Failed", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: AlertTriangle };
    case "paused":
      return { label: "Paused", cls: "bg-muted text-muted-foreground", icon: Clock };
    default:
      return { label: "Draft", cls: "bg-muted text-muted-foreground", icon: FileEdit };
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return ""; }
}

function CampaignRow({ c, compact }: { c: StoreCampaign; compact?: boolean }) {
  const st = statusMeta(c.status);
  const StIcon = st.icon;
  const PrimaryIcon = CHANNEL_ICON[c.channels[0]] || Bell;
  const isSentLike = c.status === "sent" || c.stats.sent > 0;
  const openRate = c.stats.sent > 0 ? Math.round((c.stats.opened / c.stats.sent) * 100) : 0;
  const clickRate = c.stats.sent > 0 ? Math.round((c.stats.clicked / c.stats.sent) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 hover:shadow-sm transition-shadow">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <PrimaryIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{c.name}</p>
            <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 gap-0.5 shrink-0 ${st.cls}`}>
              <StIcon className={`w-2.5 h-2.5 ${st.pulse ? "animate-pulse" : ""}`} /> {st.label}
            </Badge>
            {c.isRecurring && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5 shrink-0">
                <Repeat className="w-2.5 h-2.5" /> {c.recurrenceInterval || "recurring"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground min-w-0">
            <div className="flex items-center gap-0.5 shrink-0">
              {c.channels.map((ch) => {
                const Ic = CHANNEL_ICON[ch] || Bell;
                return <Ic key={ch} className="w-3 h-3" />;
              })}
            </div>
            <span className="shrink-0">·</span>
            <span className="truncate">{c.audienceLabel}</span>
            {(c.sentAt || c.createdAt) && (
              <>
                <span className="shrink-0">·</span>
                <span className="shrink-0">
                  {c.status === "scheduled" && c.scheduledAt
                    ? `for ${timeAgo(c.scheduledAt)}`
                    : timeAgo(c.sentAt || c.createdAt)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Delivery stats */}
        {isSentLike ? (
          <div className={`shrink-0 text-right ${compact ? "hidden sm:block" : ""}`}>
            <p className="text-sm font-bold tabular-nums">
              {(c.stats.recipients || c.stats.sent).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {c.stats.opened > 0 ? `${openRate}% open · ${clickRate}% click` : "recipients"}
            </p>
          </div>
        ) : c.status === "failed" ? (
          <div className="shrink-0 text-right text-red-600">
            <p className="text-[11px] font-medium">Delivery failed</p>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function CampaignsHistoryPanel({
  storeId,
  storeName,
  storeCategory,
  compact = false,
  limit,
  onViewAll,
}: {
  storeId: string;
  storeName?: string;
  storeCategory?: string;
  compact?: boolean;
  limit?: number;
  onViewAll?: () => void;
}) {
  const { data: campaigns = [], isLoading } = useStoreCampaigns(storeId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("push");

  const open = (ch: Channel) => { setChannel(ch); setPickerOpen(false); setWizardOpen(true); };

  const shown = useMemo(
    () => (limit ? campaigns.slice(0, limit) : campaigns),
    [campaigns, limit],
  );
  const sentCount = campaigns.filter((c) => c.status === "sent").length;
  const liveCount = campaigns.filter((c) => c.status === "sending" || c.status === "scheduled" || c.status === "active").length;

  const composer = (
    <>
      <NewCampaignChannelPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(ch) => open(ch as Channel)} />
      <CreateMarketingCampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        storeId={storeId}
        defaultChannel={channel}
        storeName={storeName}
        storeCategory={storeCategory}
      />
    </>
  );

  /* ── Compact (Overview "Recent campaigns" card) ── */
  if (compact) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" /> Recent campaigns
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {campaigns.length === 0 ? "Sends show up here instantly" : `${sentCount} sent · ${liveCount} live`}
              </p>
            </div>
            {onViewAll && campaigns.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={onViewAll}>
                View all →
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-6">
              <Megaphone className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No campaigns yet. Send your first to reach customers.</p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setPickerOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> New campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {shown.map((c) => <CampaignRow key={c.id} c={c} compact />)}
            </div>
          )}
          {composer}
        </CardContent>
      </Card>
    );
  }

  /* ── Full (Campaigns tab) ── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Campaigns</h3>
          <p className="text-xs text-muted-foreground">
            {campaigns.length} total{campaigns.length > 0 ? ` · ${sentCount} sent · ${liveCount} live` : ""}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setPickerOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> New campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-7 h-7 text-primary" />
            </div>
            <p className="font-medium text-sm">No campaigns yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Send push, email, SMS, or in-app messages to your customers. Every send appears here with live delivery stats.
            </p>
            <Button className="mt-4 gap-1.5" size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Create first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {shown.map((c) => <CampaignRow key={c.id} c={c} />)}
        </div>
      )}
      {composer}
    </div>
  );
}
