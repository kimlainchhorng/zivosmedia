/**
 * AdsPlatformTile — compact, status-aware platform connector tile.
 * 2-line layout on mobile (icon+name / status+action), single-row on desktop.
 */
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import type { AdAccount, AdPlatform } from "@/hooks/useStoreAdsOverview";

interface Props {
  platform: AdPlatform;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  account?: AdAccount;
  onClick: () => void;
}

function statusMeta(account?: AdAccount) {
  if (!account || account.status === "disconnected") {
    return {
      dot: "bg-muted-foreground/40",
      label: "Not connected",
      action: "Connect",
      connected: false,
    };
  }
  if (account.status === "pending") {
    return {
      dot: "bg-amber-500",
      label: "Pending review",
      action: "Manage",
      connected: true,
    };
  }
  if (account.status === "connected" || account.status === "active") {
    const last4 = account.external_account_id?.slice(-4);
    return {
      dot: "bg-emerald-500",
      label: last4 ? `Connected · ****${last4}` : "Connected",
      action: "Manage",
      connected: true,
    };
  }
  return {
    dot: "bg-blue-500",
    label: account.status,
    action: "Manage",
    connected: true,
  };
}

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return null;
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdsPlatformTile({
  platform,
  label,
  icon: Icon,
  color,
  account,
  onClick,
}: Props) {
  const meta = statusMeta(account);
  const synced = relativeTime(account?.connected_at ?? null);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={meta.connected}
      aria-label={`${meta.connected ? "Manage" : "Connect"} ${label}`}
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-xl border border-border bg-card p-2.5 sm:p-3 text-left",
        "transition active:scale-[0.98] hover:border-primary/40 hover:bg-accent/30 touch-manipulation",
        "min-h-[88px]",
        meta.connected
          ? "border-l-2 border-l-emerald-500"
          : "opacity-90 hover:opacity-100"
      )}
      data-platform={platform}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white shadow-sm ring-1 ring-border/70 shrink-0">
          <Icon className={cn("w-5 h-5 sm:w-5.5 sm:h-5.5", color)} />
        </span>
        <span className="text-xs sm:text-sm font-semibold truncate">{label}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
          <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
            {meta.label}
          </span>
        </span>
        <span className="text-[10px] sm:text-[11px] font-semibold text-primary shrink-0">
          {meta.action}
        </span>
      </div>
      {meta.connected && synced && (
        <span className="text-[10px] text-muted-foreground/70 leading-none">
          Synced {synced}
        </span>
      )}
    </button>
  );
}
