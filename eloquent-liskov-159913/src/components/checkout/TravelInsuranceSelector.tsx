/**
 * TravelInsuranceSelector Component
 * Compact insurance plan selector for checkout
 */

import { Shield, Check, Info } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { INSURANCE_PLANS } from "@/config/checkoutUpsells";
import { cn } from "@/lib/utils";

interface TravelInsuranceSelectorProps {
  selectedPlanId: string | null;
  onSelect: (planId: string, price: number) => void;
  tripPrice?: number;
  className?: string;
}

export function TravelInsuranceSelector({
  selectedPlanId,
  onSelect,
  className,
}: TravelInsuranceSelectorProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-emerald-500" />
        <h3 className="font-semibold">Travel Protection</h3>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-4 h-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">
              Protect your trip against cancellations, medical emergencies, and more.
              Coverage begins when you complete your booking.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Plan Options */}
      <RadioGroup
        value={selectedPlanId || "none"}
        onValueChange={(value) => {
          const plan = INSURANCE_PLANS.find((p) => p.id === value);
          onSelect(value, plan?.price || 0);
        }}
        className="space-y-3"
      >
        {INSURANCE_PLANS.map((plan) => {
          const isSelected = selectedPlanId === plan.id || (!selectedPlanId && plan.id === "none");
          
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.98] touch-manipulation",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/30"
              )}
              onClick={() => onSelect(plan.id, plan.price)}
            >
              <RadioGroupItem value={plan.id} id={plan.id} className="mt-0.5" />
              
              <Label htmlFor={plan.id} className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{plan.name}</span>
                  {plan.badge && (
                    <Badge className="bg-foreground hover:bg-foreground text-primary-foreground text-[10px] px-1.5 py-0">
                      Recommended
                    </Badge>
                  )}
                  <span className="ml-auto font-semibold text-sm">
                    {plan.price === 0 ? "Free" : `+$${plan.price}`}
                  </span>
                </div>
                
                {plan.features.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-xs text-primary">
                        +{plan.features.length - 3} more benefits
                      </li>
                    )}
                  </ul>
                )}
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {/* Compliance Disclaimer */}
      <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
        Insurance is provided by third-party partners. ZIVO is not an insurer. 
        By selecting a plan, you agree to the insurer's terms and conditions.
      </p>
    </div>
  );
}
