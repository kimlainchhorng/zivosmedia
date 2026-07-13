/**
 * MarketingOverviewHeader — Stat strip + channel tiles + "+ New Campaign" entry point.
 * Opens NewCampaignChannelPicker → CreateMarketingCampaignWizard with channel preselected.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import MarketingStatStrip from "./MarketingStatStrip";
import MarketingChannelTile from "./MarketingChannelTile";
import NewCampaignChannelPicker from "./NewCampaignChannelPicker";
import CreateMarketingCampaignWizard from "./CreateMarketingCampaignWizard";
import { useStoreMarketingOverview } from "@/hooks/useStoreMarketingOverview";

type Channel = "push" | "email" | "sms" | "inapp" | "multi";

export default function MarketingOverviewHeader({ storeId }: { storeId: string }) {
  const { data, isLoading } = useStoreMarketingOverview(storeId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [chosenChannel, setChosenChannel] = useState<Channel>("push");

  const openWizardWith = (ch: Channel) => {
    setChosenChannel(ch);
    setPickerOpen(false);
    setWizardOpen(true);
  };

  return (
    <div className="space-y-4 relative">
      {/* Header row with desktop pill button */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Marketing overview</h2>
          <p className="text-xs text-muted-foreground">Live performance across every channel</p>
        </div>
        <Button
          size="sm"
          onClick={() => setPickerOpen(true)}
          className="hidden sm:inline-flex rounded-full px-4 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1" /> New campaign
        </Button>
      </div>

      <MarketingStatStrip stats={data?.stats as any} isLoading={isLoading} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(data?.channels || []).map((ch) => (
          <MarketingChannelTile
            key={ch.channel}
            channel={ch}
            storeId={storeId}
            onCompose={(c) => openWizardWith(c as Channel)}
          />
        ))}
      </div>

      {/* Mobile sticky FAB */}
      <Button
        size="lg"
        onClick={() => setPickerOpen(true)}
        className="sm:hidden fixed right-4 z-30 rounded-full shadow-lg h-14 w-14 p-0"
        style={{ bottom: "calc(var(--zivo-safe-bottom,0px) + 5rem)" }}
        aria-label="New campaign"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <NewCampaignChannelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(ch) => openWizardWith(ch as Channel)}
      />

      <CreateMarketingCampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        storeId={storeId}
        defaultChannel={chosenChannel}
      />
    </div>
  );
}
