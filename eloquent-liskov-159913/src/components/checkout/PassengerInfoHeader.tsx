/**
 * Passenger Info Header Component
 * ID verification guidance and name change warning
 */

import { Info, AlertTriangle, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CHECKOUT_PASSENGER } from "@/config/checkoutCompliance";

interface PassengerInfoHeaderProps {
  className?: string;
  showWarning?: boolean;
}

export default function PassengerInfoHeader({
  className,
  showWarning = true,
}: PassengerInfoHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Info Alert */}
      <Alert className="border-primary/30 bg-primary/5">
        <User className="w-4 h-4 text-primary" />
        <AlertDescription className="text-sm">
          <span className="font-semibold">{CHECKOUT_PASSENGER.title}</span>
          <br />
          {CHECKOUT_PASSENGER.subtitle}
        </AlertDescription>
      </Alert>

      {/* Name Change Warning */}
      {showWarning && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {CHECKOUT_PASSENGER.warning}
          </p>
        </div>
      )}
    </div>
  );
}
