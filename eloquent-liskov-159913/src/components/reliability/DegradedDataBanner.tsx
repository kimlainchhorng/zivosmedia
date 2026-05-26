import type { ReactNode } from "react";
import { useEventTracking } from "@/hooks/useEventTracking";

type DegradedDataBannerProps = {
  message: string;
  onRetry: () => void;
  retryDisabled?: boolean;
  retryLabel?: string;
  className?: string;
  rightSlot?: ReactNode;
  trackingContext?: string;
};

export default function DegradedDataBanner({
  message,
  onRetry,
  retryDisabled = false,
  retryLabel = "Retry",
  className,
  rightSlot,
  trackingContext = "unknown",
}: DegradedDataBannerProps) {
  const { track } = useEventTracking();

  const handleRetry = () => {
    if (retryDisabled) return;
    void track("button_click", {
      component: "degraded_data_banner",
      action: "retry",
      context: trackingContext,
      message,
    });
    onRetry();
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-foreground">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
          <span className="truncate font-semibold">{message}</span>
        </div>
        {rightSlot ?? (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retryDisabled}
            className="shrink-0 rounded-full bg-foreground px-3 py-1 text-[11px] font-bold text-background active:scale-95 disabled:opacity-50"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
