import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEventTracking } from "@/hooks/useEventTracking";

type LoadFailureCardProps = {
  title: string;
  description: string;
  onRetry: () => void;
  retryDisabled?: boolean;
  retryLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
  className?: string;
  trackingContext?: string;
};

export default function LoadFailureCard({
  title,
  description,
  onRetry,
  retryDisabled = false,
  retryLabel = "Retry",
  onSecondary,
  secondaryLabel = "Go Back",
  className,
  trackingContext = "unknown",
}: LoadFailureCardProps) {
  const { track } = useEventTracking();

  const handleRetry = () => {
    if (retryDisabled) return;
    void track("button_click", {
      component: "load_failure_card",
      action: "retry",
      context: trackingContext,
      title,
    });
    onRetry();
  };

  const handleSecondary = () => {
    if (!onSecondary) return;
    void track("button_click", {
      component: "load_failure_card",
      action: "secondary",
      context: trackingContext,
      title,
      secondary_label: secondaryLabel,
    });
    onSecondary();
  };

  return (
    <div className={className}>
      <div className="mx-auto max-w-xl rounded-3xl border border-border/60 bg-card/95 p-6 text-center shadow-lg shadow-black/5">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button type="button" onClick={handleRetry} disabled={retryDisabled} className="rounded-full px-5">
            {retryLabel}
          </Button>
          {onSecondary && (
            <Button type="button" variant="outline" onClick={handleSecondary} className="rounded-full px-5">
              {secondaryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
