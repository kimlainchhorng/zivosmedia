import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Shield, Check, X, Star, AlertCircle, Phone, Plane, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const insurancePlans = [
  {
    id: "basic",
    name: "Basic",
    price: 29,
    coverage: 50000,
    features: {
      "Trip Cancellation": "$2,500",
      "Medical Expenses": "$50,000",
      "Emergency Evacuation": "$100,000",
      "Baggage Loss": "$1,000",
      "Trip Delay": "$500",
      "24/7 Assistance": true,
      "Pre-existing Conditions": false,
      "Adventure Sports": false
    }
  },
  {
    id: "standard",
    name: "Standard",
    price: 59,
    coverage: 100000,
    popular: true,
    features: {
      "Trip Cancellation": "$5,000",
      "Medical Expenses": "$100,000",
      "Emergency Evacuation": "$250,000",
      "Baggage Loss": "$2,500",
      "Trip Delay": "$1,000",
      "24/7 Assistance": true,
      "Pre-existing Conditions": true,
      "Adventure Sports": false
    }
  },
  {
    id: "premium",
    name: "Premium",
    price: 99,
    coverage: 250000,
    features: {
      "Trip Cancellation": "$10,000",
      "Medical Expenses": "$250,000",
      "Emergency Evacuation": "$500,000",
      "Baggage Loss": "$5,000",
      "Trip Delay": "$2,000",
      "24/7 Assistance": true,
      "Pre-existing Conditions": true,
      "Adventure Sports": true
    }
  }
];

const featureIcons: Record<string, React.ReactNode> = {
  "Trip Cancellation": <Plane className="w-4 h-4" />,
  "Medical Expenses": <Stethoscope className="w-4 h-4" />,
  "24/7 Assistance": <Phone className="w-4 h-4" />
};

export default function TravelInsuranceCompare() {
  const [selectedPlan, setSelectedPlan] = useState("standard");

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Travel Insurance</CardTitle>
              <p className="text-sm text-muted-foreground">Compare coverage plans</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-3">
          {insurancePlans.map((plan) => (
            <div key={plan.id}>
              <Label
                htmlFor={plan.id}
                className={cn(
                  "flex flex-col p-4 rounded-xl border cursor-pointer transition-all",
                  selectedPlan === plan.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/50 bg-muted/20 hover:border-border"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={plan.id} id={plan.id} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.name}</span>
                        {plan.popular && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
                            <Star className="w-3 h-3 mr-0.5" />
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Up to ${plan.coverage.toLocaleString()} coverage
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">${plan.price}</p>
                    <p className="text-xs text-muted-foreground">per trip</p>
                  </div>
                </div>

                {selectedPlan === plan.id && (
                  <div className="space-y-2 pt-3 border-t border-border/50">
                    {Object.entries(plan.features).map(([feature, value]) => (
                      <div key={feature} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          {featureIcons[feature] || <Check className="w-4 h-4" />}
                          {feature}
                        </span>
                        {typeof value === "boolean" ? (
                          value ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground" />
                          )
                        ) : (
                          <span className="font-medium">{value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
          <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Coverage begins at departure. Cancel for any reason up to 48 hours before travel.
          </p>
        </div>

        <Button className="w-full">
          Add {insurancePlans.find(p => p.id === selectedPlan)?.name} Insurance - $
          {insurancePlans.find(p => p.id === selectedPlan)?.price}
        </Button>
      </CardContent>
    </Card>
  );
}
