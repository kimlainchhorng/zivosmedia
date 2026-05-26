import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plane, 
  Hotel, 
  Car, 
  MapPin, 
  ArrowRight, 
  Check,
  Calendar,
  Users,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TripStep {
  id: string;
  type: "flight" | "hotel" | "car" | "activity";
  title: string;
  subtitle: string;
  icon: typeof Plane;
  completed: boolean;
  active: boolean;
  href: string;
  savings?: string;
}

interface TripFlowConnectorProps {
  destination?: string;
  dates?: { start: Date; end: Date };
  currentStep?: "flight" | "hotel" | "car";
  className?: string;
}

const TripFlowConnector = ({ 
  destination = "Paris", 
  dates,
  currentStep = "flight",
  className 
}: TripFlowConnectorProps) => {
  const navigate = useNavigate();
  
  const steps: TripStep[] = [
    {
      id: "flight",
      type: "flight",
      title: "Book Flight",
      subtitle: destination ? `To ${destination}` : "Choose destination",
      icon: Plane,
      completed: currentStep === "hotel" || currentStep === "car",
      active: currentStep === "flight",
      href: "/book-flight",
      savings: "Save 15%"
    },
    {
      id: "hotel",
      type: "hotel",
      title: "Find Hotel",
      subtitle: destination ? `In ${destination}` : "Select accommodation",
      icon: Hotel,
      completed: currentStep === "car",
      active: currentStep === "hotel",
      href: "/book-hotel",
      savings: "Save 20%"
    },
    {
      id: "car",
      type: "car",
      title: "Rent Car",
      subtitle: "Airport pickup",
      icon: Car,
      completed: false,
      active: currentStep === "car",
      href: "/rent-car",
      savings: "Save 10%"
    }
  ];

  return (
    <Card className={cn("overflow-hidden border-primary/20", className)}>
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-teal-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Complete Your Trip</CardTitle>
              <p className="text-sm text-muted-foreground">Bundle & save up to 25%</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Smart Bundle
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Trip Progress Flow */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />
          
          <div className="space-y-3">
            {steps.map((step, index) => (
              <button type="button"
                key={step.id}
                onClick={() => navigate(step.href)}
                className={cn(
                  "relative w-full flex items-center gap-4 p-3 rounded-xl transition-all",
                  step.active && "bg-primary/10 border border-primary/20",
                  step.completed && "opacity-70",
                  !step.active && !step.completed && "hover:bg-muted/50"
                )}
              >
                {/* Icon with status */}
                <div className={cn(
                  "relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  step.completed && "bg-primary text-primary-foreground",
                  step.active && "bg-primary/20 text-primary border-2 border-primary",
                  !step.completed && !step.active && "bg-muted text-muted-foreground"
                )}>
                  {step.completed ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold",
                      step.active && "text-primary",
                      step.completed && "line-through"
                    )}>
                      {step.title}
                    </span>
                    {step.savings && !step.completed && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                        {step.savings}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.subtitle}</p>
                </div>
                
                {/* Arrow */}
                <ChevronRight className={cn(
                  "w-5 h-5 shrink-0",
                  step.active ? "text-primary" : "text-muted-foreground"
                )} />
              </button>
            ))}
          </div>
        </div>

        {/* Bundle Summary */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-teal-500/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Bundle Savings</span>
            <span className="text-lg font-bold text-primary">-$245</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Complete all 3 bookings to unlock maximum savings
          </p>
        </div>

        <Button 
          variant="default"
          className="w-full bg-gradient-to-r from-primary to-teal-500"
          onClick={() => navigate(steps.find(s => s.active)?.href || "/book-flight")}
        >
          Continue Planning
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default TripFlowConnector;
