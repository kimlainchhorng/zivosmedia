/**
 * User-friendly error fallback for lazy-loaded sections
 * Shows a compact retry prompt instead of crashing the page
 */
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionErrorFallbackProps {
  onRetry?: () => void;
  message?: string;
}

export default function SectionErrorFallback({
  onRetry,
  message = "Something went wrong loading this section.",
}: SectionErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 mt-1">
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}
