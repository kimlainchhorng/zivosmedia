import { useState } from "react";
import { 
  Shield, 
  Check, 
  AlertTriangle,
  Plane,
  Stethoscope,
  Luggage,
  BadgeDollarSign,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TravelInsuranceWidgetProps {
  tripCost?: number;
  travelers?: number;
  destination?: string;
  className?: string;
}

const insurancePlans = [
  {
    id: "basic",
    name: "Basic Coverage",
    price: 29,
    pricePerDay: 4,
    recommended: false,
    coverage: [
      { icon: Plane, text: "Trip cancellation up to $1,500" },
      { icon: Stethoscope, text: "Medical expenses up to $10,000" },
      { icon: Luggage, text: "Baggage loss up to $500" },
    ]
  },
  {
    id: "standard",
    name: "Standard Coverage",
    price: 59,
    pricePerDay: 8,
    recommended: true,
    coverage: [
      { icon: Plane, text: "Trip cancellation up to $5,000" },
      { icon: Stethoscope, text: "Medical expenses up to $50,000" },
      { icon: Luggage, text: "Baggage loss up to $1,500" },
      { icon: AlertTriangle, text: "Emergency evacuation" },
    ]
  },
  {
    id: "premium",
    name: "Premium Coverage",
    price: 99,
    pricePerDay: 14,
    recommended: false,
    coverage: [
      { icon: Plane, text: "Trip cancellation - full coverage" },
      { icon: Stethoscope, text: "Medical expenses up to $100,000" },
      { icon: Luggage, text: "Baggage loss up to $3,000" },
      { icon: AlertTriangle, text: "Emergency evacuation" },
      { icon: BadgeDollarSign, text: "Cancel for any reason (75%)" },
    ]
  },
];

const TravelInsuranceWidget = ({ 
  tripCost = 2500,
  travelers = 2,
  destination = "Europe",
  className 
}: TravelInsuranceWidgetProps) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>("standard");
  const [showDetails, setShowDetails] = useState(false);

  const selectedInsurance = insurancePlans.find(p => p.id === selectedPlan);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10">
            <Shield className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Travel Protection</h3>
            <p className="text-sm text-muted-foreground">
              Protect your ${tripCost.toLocaleString()} trip
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">
            Recommended
          </Badge>
        </div>

        {/* Why Insurance */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Traveling to {destination}?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Medical costs abroad can exceed $50,000. Protect yourself and {travelers} travelers.
              </p>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-2 mb-4">
          {insurancePlans.map((plan) => (
            <button type="button"
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "w-full p-3 rounded-xl border-2 transition-all text-left",
                selectedPlan === plan.id
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-border hover:border-emerald-500/30"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    selectedPlan === plan.id
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-muted-foreground"
                  )}>
                    {selectedPlan === plan.id && (
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    )}
                  </div>
                  <span className="font-medium">{plan.name}</span>
                  {plan.recommended && (
                    <Badge className="bg-emerald-500 text-primary-foreground text-[10px] px-1.5 py-0">
                      Best Value
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold">${plan.price * travelers}</span>
                  <span className="text-xs text-muted-foreground ml-1">total</span>
                </div>
              </div>
              
              {selectedPlan === plan.id && (
                <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
                  {plan.coverage.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <item.icon className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* No Coverage Option */}
        <button type="button"
          onClick={() => setSelectedPlan(null)}
          className={cn(
            "w-full p-3 rounded-xl border-2 transition-all text-left mb-4",
            selectedPlan === null
              ? "border-destructive bg-destructive/10"
              : "border-border hover:border-destructive/30"
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
              selectedPlan === null
                ? "border-destructive bg-destructive"
                : "border-muted-foreground"
            )}>
              {selectedPlan === null && (
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              )}
            </div>
            <span className="text-sm">No thanks, I'll take the risk</span>
          </div>
        </button>

        {/* View Details Toggle */}
        <button type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:underline"
        >
          {showDetails ? "Hide" : "View"} full policy details
          {showDetails ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showDetails && (
          <div className="mt-3 p-3 rounded-xl bg-muted/30 text-xs text-muted-foreground space-y-2">
            <p>• Coverage begins at departure and ends upon return</p>
            <p>• Pre-existing conditions covered if purchased within 14 days of booking</p>
            <p>• 24/7 emergency assistance hotline included</p>
            <p>• Claims processed within 5-7 business days</p>
          </div>
        )}

        {/* Action */}
        <Button 
          className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500"
          disabled={selectedPlan === null}
        >
          {selectedPlan ? (
            <>
              Add Protection - ${(selectedInsurance?.price || 0) * travelers}
              <Shield className="w-4 h-4 ml-2" />
            </>
          ) : (
            "Continue without protection"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TravelInsuranceWidget;
