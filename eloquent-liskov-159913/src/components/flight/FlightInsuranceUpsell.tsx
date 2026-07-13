import { Shield, Check, X, AlertTriangle, Heart, Plane, Luggage, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const insurancePlans = [
  {
    id: "basic",
    name: "Basic Coverage",
    price: 12,
    description: "Essential protection for your trip",
    color: "sky",
    features: [
      { name: "Trip Cancellation", amount: "$1,000", included: true },
      { name: "Medical Emergency", amount: "$10,000", included: true },
      { name: "Lost Baggage", amount: "$500", included: true },
      { name: "Flight Delay", amount: "$100", included: true },
      { name: "Missed Connection", amount: "Not covered", included: false },
      { name: "Adventure Sports", amount: "Not covered", included: false },
    ]
  },
  {
    id: "standard",
    name: "Standard Coverage",
    price: 29,
    description: "Comprehensive protection for peace of mind",
    color: "violet",
    popular: true,
    features: [
      { name: "Trip Cancellation", amount: "$5,000", included: true },
      { name: "Medical Emergency", amount: "$50,000", included: true },
      { name: "Lost Baggage", amount: "$2,000", included: true },
      { name: "Flight Delay", amount: "$500", included: true },
      { name: "Missed Connection", amount: "$1,000", included: true },
      { name: "Adventure Sports", amount: "Not covered", included: false },
    ]
  },
  {
    id: "premium",
    name: "Premium Coverage",
    price: 49,
    description: "Maximum protection for worry-free travel",
    color: "amber",
    features: [
      { name: "Trip Cancellation", amount: "$10,000", included: true },
      { name: "Medical Emergency", amount: "$100,000", included: true },
      { name: "Lost Baggage", amount: "$5,000", included: true },
      { name: "Flight Delay", amount: "$1,000", included: true },
      { name: "Missed Connection", amount: "$2,500", included: true },
      { name: "Adventure Sports", amount: "$25,000", included: true },
    ]
  },
];

const FlightInsuranceUpsell = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>("standard");

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
      sky: {
        bg: isSelected ? "bg-sky-500/10" : "bg-card/60",
        border: isSelected ? "border-sky-500/30" : "border-border/50",
        text: "text-sky-400",
        badge: "bg-sky-500/20 text-sky-400 border-sky-500/30"
      },
      violet: {
        bg: isSelected ? "bg-violet-500/10" : "bg-card/60",
        border: isSelected ? "border-violet-500/30" : "border-border/50",
        text: "text-violet-400",
        badge: "bg-violet-500/20 text-violet-400 border-violet-500/30"
      },
      amber: {
        bg: isSelected ? "bg-amber-500/10" : "bg-card/60",
        border: isSelected ? "border-amber-500/30" : "border-border/50",
        text: "text-amber-400",
        badge: "bg-amber-500/20 text-amber-400 border-amber-500/30"
      }
    };
    return colors[color] || colors.sky;
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-green-500/20 text-green-400 border-green-500/30">
            <Shield className="w-3 h-3 mr-1" /> Travel Protection
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Protect Your Journey
          </h2>
          <p className="text-muted-foreground">Travel with confidence knowing you're covered</p>
        </div>

        {/* Alert Banner */}
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">Did you know?</p>
            <p className="text-sm text-muted-foreground">
              87% of travelers who faced trip disruptions wish they had purchased travel insurance.
              Protect yourself from unexpected cancellations, medical emergencies, and lost baggage.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {insurancePlans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const colors = getColorClasses(plan.color, isSelected);

            return (
              <button type="button"
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "relative text-left rounded-2xl border transition-all p-6",
                  colors.bg,
                  colors.border,
                  isSelected && "ring-2 ring-offset-2 ring-offset-background",
                  isSelected && plan.color === "sky" && "ring-sky-500/50",
                  isSelected && plan.color === "violet" && "ring-violet-500/50",
                  isSelected && plan.color === "amber" && "ring-amber-500/50"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-primary-foreground border-0">
                    Most Popular
                  </Badge>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", `bg-${plan.color}-500/20`)}>
                    <Shield className={cn("w-6 h-6", colors.text)} />
                  </div>
                  {isSelected && (
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", `bg-${plan.color}-500`)}>
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className={cn("text-3xl font-display font-bold", colors.text)}>${plan.price}</span>
                  <span className="text-muted-foreground text-sm">/person</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/50">
                  {plan.features.map((feature) => (
                    <div key={feature.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50" />
                        )}
                        <span className={cn("text-sm", !feature.included && "text-muted-foreground/50")}>
                          {feature.name}
                        </span>
                      </div>
                      <span className={cn("text-sm font-medium", !feature.included && "text-muted-foreground/50")}>
                        {feature.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Benefits */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Heart, label: "24/7 Medical Assistance", color: "text-red-400" },
            { icon: Plane, label: "Trip Interruption", color: "text-sky-400" },
            { icon: Luggage, label: "Baggage Protection", color: "text-violet-400" },
            { icon: Clock, label: "Delay Compensation", color: "text-amber-400" },
          ].map((benefit) => (
            <div key={benefit.label} className="flex items-center gap-3 p-4 bg-card/60 rounded-xl border border-border/50">
              <benefit.icon className={cn("w-5 h-5", benefit.color)} />
              <span className="text-sm font-medium">{benefit.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-500">
            <Shield className="w-4 h-4 mr-2" />
            Add Protection - ${insurancePlans.find(p => p.id === selectedPlan)?.price || 0}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Full refund available if cancelled within 24 hours
          </p>
        </div>
      </div>
    </section>
  );
};

export default FlightInsuranceUpsell;
