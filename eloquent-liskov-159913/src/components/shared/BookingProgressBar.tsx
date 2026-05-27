import { 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  active: boolean;
}

interface BookingProgressBarProps {
  steps: ProgressStep[];
  className?: string;
}

const BookingProgressBar = ({ steps, className }: BookingProgressBarProps) => {
  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Booking Progress</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {completedCount} of {steps.length} complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-teal-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                step.completed && "bg-primary text-primary-foreground",
                step.active && !step.completed && "bg-primary/20 text-primary border-2 border-primary",
                !step.completed && !step.active && "bg-muted text-muted-foreground"
              )}>
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium hidden sm:block",
                step.active ? "text-primary" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div className={cn(
                "w-8 sm:w-16 h-0.5 mx-2",
                step.completed ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingProgressBar;
