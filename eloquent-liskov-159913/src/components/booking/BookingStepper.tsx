/**
 * Booking Stepper Component
 * Shows progress through the booking flow
 */
import { cn } from "@/lib/utils";
import { Check, Search, List, FileText, User, CreditCard } from "lucide-react";

type StepId = "search" | "results" | "details" | "traveler" | "checkout";

interface Step {
  id: StepId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  { id: "search", label: "Search", icon: Search },
  { id: "results", label: "Choose", icon: List },
  { id: "details", label: "Details", icon: FileText },
  { id: "traveler", label: "Traveler Info", icon: User },
  { id: "checkout", label: "Checkout", icon: CreditCard },
];

interface BookingStepperProps {
  currentStep: StepId;
  className?: string;
  compact?: boolean;
}

export default function BookingStepper({
  currentStep,
  className,
  compact = false,
}: BookingStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop stepper */}
      <div className={cn("hidden md:flex items-center justify-center", compact && "md:hidden")}>
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary bg-primary/10",
                    !isCompleted && !isCurrent && "border-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium",
                    isCurrent && "text-primary",
                    !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-16 lg:w-24 h-0.5 mx-2 mb-6",
                    index < currentIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile stepper - compact version */}
      <div className={cn("flex md:hidden items-center justify-between px-2", compact && "flex")}>
        <div className="flex items-center gap-1.5">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div
                key={step.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  isCompleted && "bg-primary",
                  isCurrent && "bg-primary w-6",
                  !isCompleted && !isCurrent && "bg-muted"
                )}
              />
            );
          })}
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          Step {currentIndex + 1} of {steps.length}
        </span>
      </div>
    </div>
  );
}
