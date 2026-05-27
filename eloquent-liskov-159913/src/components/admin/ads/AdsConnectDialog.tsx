/**
 * AdsConnectDialog — unified OAuth + manual fallback for a single ad platform.
 */
import { useState } from "react";
import { type LucideIcon, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AdAccount, AdPlatform } from "@/hooks/useStoreAdsOverview";

interface Props {
  open: boolean;
  onClose: () => void;
  platform: AdPlatform;
  label: string;
  icon: LucideIcon;
  color: string;
  account?: AdAccount;
  supportsOAuth: boolean;
  oauthBrandClass?: string; // e.g. "bg-[#1877F2] hover:bg-[#1459bf]"
  helpUrl?: string;
  onOAuth: () => void;
  onSaveManual: (externalId: string, displayName: string) => void;
  onDisconnect: (id: string) => void;
  oauthPending: boolean;
  savePending: boolean;
}

export default function AdsConnectDialog({
  open,
  onClose,
  platform,
  label,
  icon: Icon,
  color,
  account,
  supportsOAuth,
  oauthBrandClass,
  helpUrl,
  onOAuth,
  onSaveManual,
  onDisconnect,
  oauthPending,
  savePending,
}: Props) {
  const [extId, setExtId] = useState(account?.external_account_id ?? "");
  const [name, setName] = useState(account?.display_name ?? "");

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={
        <span className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", color)} /> Connect {label}
        </span>
      }
    >
      <div className="space-y-3 text-sm">
        {account && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/30">
            <div className="min-w-0">
              <p className="text-xs font-semibold">Connected</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {account.display_name || account.external_account_id || "Account"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-red-500 hover:text-red-600 shrink-0"
              onClick={() => onDisconnect(account.id)}
            >
              <Trash2 className="w-3 h-3 mr-1" /> Disconnect
            </Button>
          </div>
        )}

        {supportsOAuth && (
          <>
            <Button
              className={cn(
                "w-full text-white",
                oauthBrandClass || "bg-primary hover:bg-primary/90"
              )}
              onClick={onOAuth}
              disabled={oauthPending}
              data-platform={platform}
            >
              {oauthPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Icon className="w-4 h-4 mr-2" />
              )}
              Continue with {label.split(" ")[0]}
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                or enter manually
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <div className="space-y-2">
          <div>
            <Label className="text-xs">Ad account ID</Label>
            <Input
              value={extId}
              onChange={(e) => setExtId(e.target.value)}
              placeholder="act_1234567890"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Display name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Business Ads"
              className="h-9"
            />
          </div>
          <Button
            className="w-full h-10"
            onClick={() => onSaveManual(extId.trim(), name.trim())}
            disabled={!extId.trim() || savePending}
          >
            {savePending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
            Save connection
          </Button>
        </div>

        {helpUrl && (
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-3 h-3" />
            Where do I find my ad account ID?
          </a>
        )}
      </div>
    </ResponsiveModal>
  );
}
