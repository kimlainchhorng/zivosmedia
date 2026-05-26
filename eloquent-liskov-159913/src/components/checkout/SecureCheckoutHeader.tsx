/**
 * Secure Checkout Header Component
 * Unified header for all checkout pages with trust signals
 */

import { Lock, Shield, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECKOUT_HEADER } from "@/config/checkoutCompliance";

interface SecureCheckoutHeaderProps {
  currentStep?: 1 | 2 | 3;
  totalSteps?: number;
  variant?: "flights" | "hotels" | "cars" | "default";
  className?: string;
  showProgress?: boolean;
}

const stepLabels = ["Details", "Traveler Info", "Payment"];

export default function SecureCheckoutHeader({
  currentStep,
  totalSteps = 3,
  variant = "default",
  className,
  showProgress = false,
}: SecureCheckoutHeaderProps) {
  const variantStyles = {
    flights: "border-flights/30 bg-flights/5",
    hotels: "border-hotels/30 bg-hotels/5",
    cars: "border-cars/30 bg-cars/5",
    default: "border-emerald-500/30 bg-emerald-500/5",
  };

  const iconColors = {
    flights: "text-flights",
    hotels: "text-hotels",
    cars: "text-cars",
    default: "text-emerald-500",
  };

  return (
    <div className={cn("rounded-2xl p-4 md:p-6 transition-all duration-200", variantStyles[variant], className)}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
          "bg-emerald-500/20"
        )}>
          <Lock className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2 mb-1">
            <span>{CHECKOUT_HEADER.icon}</span>
            {CHECKOUT_HEADER.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {CHECKOUT_HEADER.subtitle}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      {showProgress && currentStep && (
        <div className="mt-6 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const step = i + 1;
            const isComplete = step < currentStep;
            const isCurrent = step === currentStep;
            
            return (
              <div key={step} className="flex items-center flex-1">
                <div className={cn(
                  "flex items-center gap-2",
                  step < totalSteps && "flex-1"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                    isComplete && "bg-emerald-500 text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground",
                    !isComplete && !isCurrent && "bg-muted text-muted-foreground"
                  )}>
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      step
                    )}
                  </div>
                  <span className={cn(
                    "text-sm hidden sm:inline",
                    (isComplete || isCurrent) ? "font-medium" : "text-muted-foreground"
                  )}>
                    {stepLabels[i] || `Step ${step}`}
                  </span>
                  {step < totalSteps && (
                    <div className={cn(
                      "flex-1 h-px mx-2",
                      isComplete ? "bg-emerald-500" : "bg-border"
                    )} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
