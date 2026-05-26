import { 
  Check, 
  Plane, 
  Hotel, 
  Car, 
  CreditCard,
  CheckCircle,
  Circle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingStep {
  id: string;
  label: string;
  type: "flight" | "hotel" | "car" | "payment" | "confirmation";
  status: "completed" | "current" | "upcoming";
  optional?: boolean;
}

interface BookingFlowStepperProps {
  steps: BookingStep[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

const stepIcons = {
  flight: Plane,
  hotel: Hotel,
  car: Car,
  payment: CreditCard,
  confirmation: CheckCircle,
};

const stepColors = {
  flight: "bg-sky-500",
  hotel: "bg-amber-500",
  car: "bg-emerald-500",
  payment: "bg-purple-500",
  confirmation: "bg-primary",
};

const BookingFlowStepper = ({ 
  steps, 
  orientation = "horizontal",
  className 
}: BookingFlowStepperProps) => {
  const isVertical = orientation === "vertical";

  return (
    <div className={cn(
      "w-full",
      isVertical ? "space-y-2" : "flex items-center justify-between",
      className
    )}>
      {steps.map((step, index) => {
        const Icon = stepIcons[step.type];
        const isLast = index === steps.length - 1;
        
        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center",
              isVertical ? "w-full" : "flex-1",
              !isLast && !isVertical && "flex-1"
            )}
          >
            {/* Step Circle */}
            <div className={cn(
              "relative flex items-center",
              isVertical && "flex-row gap-3 w-full p-2 rounded-xl",
              isVertical && step.status === "current" && "bg-muted/50"
            )}>
              {/* Icon Container */}
              <div className={cn(
                "relative flex items-center justify-center rounded-full transition-all",
                step.status === "completed" && cn("w-8 h-8", stepColors[step.type]),
                step.status === "current" && "w-10 h-10 bg-primary ring-4 ring-primary/20",
                step.status === "upcoming" && "w-8 h-8 bg-muted border-2 border-border"
              )}>
                {step.status === "completed" ? (
                  <Check className="w-4 h-4 text-primary-foreground" />
                ) : step.status === "current" ? (
                  <Icon className="w-5 h-5 text-primary-foreground" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
                
                {/* Pulse animation for current step */}
                {step.status === "current" && (
                  <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                )}
              </div>

              {/* Label */}
              <div className={cn(
                isVertical ? "flex-1" : "absolute -bottom-6 left-1/2 -translate-x-1/2",
                "whitespace-nowrap"
              )}>
                <p className={cn(
                  "text-xs font-medium",
                  step.status === "current" && "text-primary",
                  step.status === "completed" && "text-foreground",
                  step.status === "upcoming" && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {step.optional && step.status === "upcoming" && (
                  <p className="text-[10px] text-muted-foreground">Optional</p>
                )}
              </div>

              {/* Vertical status indicator */}
              {isVertical && (
                <div className={cn(
                  "ml-auto flex items-center gap-1 text-xs",
                  step.status === "completed" && "text-emerald-500",
                  step.status === "current" && "text-primary"
                )}>
                  {step.status === "completed" && (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Done</span>
                    </>
                  )}
                  {step.status === "current" && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>In progress</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div className={cn(
                isVertical 
                  ? "hidden" 
                  : "flex-1 h-0.5 mx-2",
                step.status === "completed" 
                  ? "bg-primary" 
                  : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Pre-built booking flow configurations
export const flightOnlyFlow: BookingStep[] = [
  { id: "1", label: "Select Flight", type: "flight", status: "completed" },
  { id: "2", label: "Payment", type: "payment", status: "current" },
  { id: "3", label: "Confirmation", type: "confirmation", status: "upcoming" },
];

export const flightHotelFlow: BookingStep[] = [
  { id: "1", label: "Flight", type: "flight", status: "completed" },
  { id: "2", label: "Hotel", type: "hotel", status: "current" },
  { id: "3", label: "Payment", type: "payment", status: "upcoming" },
  { id: "4", label: "Confirmed", type: "confirmation", status: "upcoming" },
];

export const fullTripFlow: BookingStep[] = [
  { id: "1", label: "Flight", type: "flight", status: "completed" },
  { id: "2", label: "Hotel", type: "hotel", status: "completed" },
  { id: "3", label: "Car", type: "car", status: "current", optional: true },
  { id: "4", label: "Payment", type: "payment", status: "upcoming" },
  { id: "5", label: "Confirmed", type: "confirmation", status: "upcoming" },
];

export default BookingFlowStepper;
