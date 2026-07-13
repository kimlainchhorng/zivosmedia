/**
 * AdsConnectDialog — unified OAuth + manual fallback for a single ad platform.
 */
import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { Check, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";
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
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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

const GOOGLE_ADS_REDIRECT_URI = "https://zivosmedia.com/auth/google-ads/callback";

const MANUAL_COPY: Record<AdPlatform, { label: string; placeholder: string; namePlaceholder: string; note?: string; setupUri?: string }> = {
  meta: {
    label: "Meta ad account ID",
    placeholder: "act_1234567890",
    namePlaceholder: "AB Complete Car Care Meta Ads",
  },
  instagram: {
    label: "Instagram/Meta ad account ID",
    placeholder: "act_1234567890",
    namePlaceholder: "AB Complete Car Care Instagram Ads",
  },
  google: {
    label: "Google Ads customer ID",
    placeholder: "1234567890",
    namePlaceholder: "AB Complete Car Care Google Ads",
    note: "Google sign-in is waiting on Google Cloud setup. Add this authorized redirect URI to the OAuth client, then enable OAuth.",
    setupUri: GOOGLE_ADS_REDIRECT_URI,
  },
  tiktok: {
    label: "TikTok Ads advertiser ID",
    placeholder: "1234567890123456789",
    namePlaceholder: "AB Complete Car Care TikTok Ads",
    note: "TikTok is manual-connect in this build. Add the advertiser ID from TikTok Ads Manager to save drafts and export campaign setup.",
  },
  x: {
    label: "X Ads account ID",
    placeholder: "18ce54d4x5t",
    namePlaceholder: "AB Complete Car Care X Ads",
    note: "X is manual-connect in this build. Add the ads account ID from X Ads Manager to save drafts and export campaign setup.",
  },
};

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
  const [copiedSetupUri, setCopiedSetupUri] = useState(false);
  const manualCopy = MANUAL_COPY[platform];

  const copySetupUri = async () => {
    if (!manualCopy.setupUri) return;
    await navigator.clipboard.writeText(manualCopy.setupUri);
    setCopiedSetupUri(true);
    window.setTimeout(() => setCopiedSetupUri(false), 1600);
  };

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

        {manualCopy.note && (
          <div className="space-y-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-2.5 text-[11px] leading-snug text-blue-900 dark:text-blue-200">
            <p>{manualCopy.note}</p>
            {manualCopy.setupUri && (
              <button
                type="button"
                onClick={copySetupUri}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-blue-500/20 bg-white/70 px-2 py-1.5 text-left font-mono text-[10px] text-blue-950 transition hover:bg-white dark:bg-background/60 dark:text-blue-100"
              >
                <span className="truncate">{manualCopy.setupUri}</span>
                {copiedSetupUri ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Copy className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div>
            <Label className="text-xs">{manualCopy.label}</Label>
            <Input
              value={extId}
              onChange={(e) => setExtId(e.target.value)}
              placeholder={manualCopy.placeholder}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Display name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={manualCopy.namePlaceholder}
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
