/**
 * Checkout Step Indicator — visual progress through booking flow
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  completed: boolean;
  active: boolean;
}

interface CheckoutStepIndicatorProps {
  steps: Step[];
  className?: string;
}

export default function CheckoutStepIndicator({ steps, className }: CheckoutStepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-between gap-1", className)}>
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300",
                step.completed
                  ? "bg-emerald-500 text-white"
                  : step.active
                  ? "bg-[hsl(var(--flights))] text-white ring-2 ring-[hsl(var(--flights))]/30"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {step.completed ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-[11px] font-medium truncate",
                step.active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-px mx-1",
                step.completed ? "bg-emerald-500" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
