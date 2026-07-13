import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { assessLinkSync } from "@/hooks/useLinkRisk";
import { stripTrackingParams } from "@/lib/linkSafetyExtras";
import ExternalLinkWarning from "./ExternalLinkWarning";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { cn } from "@/lib/utils";

interface Props {
  href: string;
  children?: ReactNode;
  className?: string;
  /** Show inline trust/risk badge next to the link */
  showBadge?: boolean;
  /** Open immediately if trusted — skip the modal (default: true) */
  fastPathTrusted?: boolean;
  onClickCapture?: () => void;
}

/**
 * Drop-in `<a>` replacement that:
 * - Assesses risk synchronously and shows an inline badge
 * - Forces rel=noopener,noreferrer,nofollow + target=_blank
 * - Intercepts clicks, opens an interstitial modal for non-trusted links
 * - Blocks clicks entirely if the URL is "blocked"
 * - Strips tracking params before opening
 */
export default function SafeExternalLink({
  href,
  children,
  className,
  showBadge = true,
  fastPathTrusted = true,
  onClickCapture,
}: Props) {
  const [warningOpen, setWarningOpen] = useState(false);
  const risk = assessLinkSync(href);
  const cleanedHref = stripTrackingParams(href);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClickCapture?.();

    if (risk.level === "blocked") return;
    if (risk.level === "trusted" && fastPathTrusted) {
      openExternalUrl(cleanedHref);
      return;
    }
    setWarningOpen(true);
  };

  const Badge = () => {
    if (!showBadge) return null;
    if (risk.level === "blocked") {
      return (
        <span className="inline-flex items-center gap-1 ml-1 text-[10px] text-destructive font-semibold">
          <ShieldAlert className="h-3 w-3" /> Blocked
        </span>
      );
    }
    if (risk.level === "suspicious") {
      return (
        <span className="inline-flex items-center gap-1 ml-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
          <AlertTriangle className="h-3 w-3" /> Caution
        </span>
      );
    }
    if (risk.level === "trusted") {
      return (
        <span className="inline-flex items-center gap-1 ml-1 text-[10px] text-primary font-semibold">
          <CheckCircle2 className="h-3 w-3" /> Verified
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <a
        href={cleanedHref}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={handleClick}
        aria-disabled={risk.level === "blocked"}
        className={cn(
          "underline-offset-2 hover:underline break-all",
          risk.level === "blocked" && "text-destructive line-through cursor-not-allowed",
          risk.level === "suspicious" && "text-amber-700 dark:text-amber-300",
          className,
        )}
        title={risk.warnings[0] || cleanedHref}
      >
        {children ?? cleanedHref}
        <Badge />
      </a>

      <ExternalLinkWarning
        url={cleanedHref}
        open={warningOpen}
        onOpenChange={setWarningOpen}
        onConfirm={(u) => openExternalUrl(u)}
      />
    </>
  );
}
