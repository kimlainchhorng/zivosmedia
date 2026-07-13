/**
 * RidePassPlans - Subscription tier cards (like Uber One / Lyft Pink)
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Zap, Star, Check, ChevronRight, Sparkles, Shield, Clock, Percent, Gift, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  icon: typeof Star;
  color: string;
  gradient: string;
  popular?: boolean;
  savings: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: "basic",
    name: "Ride Pass",
    price: 9.99,
    period: "/month",
    icon: Car,
    color: "text-sky-500",
    gradient: "from-muted to-muted",
    savings: "Save ~$15/mo",
    features: [
      "5% off all rides",
      "No surge pricing up to 1.5x",
      "Priority support",
      "Free cancellations (2/month)",
    ],
  },
  {
    id: "plus",
    name: "Ride Pass+",
    price: 24.99,
    period: "/month",
    icon: Zap,
    color: "text-primary",
    gradient: "from-primary/15 to-primary/5",
    popular: true,
    savings: "Save ~$40/mo",
    features: [
      "15% off all rides",
      "No surge pricing up to 2x",
      "Priority pickup",
      "Unlimited free cancellations",
      "Free premium upgrades (3/month)",
      "10% off ZIVO Eats",
    ],
  },
  {
    id: "premium",
    name: "Ride Pass Elite",
    price: 49.99,
    period: "/month",
    icon: Crown,
    color: "text-amber-500",
    gradient: "from-amber-500/15 to-amber-500/5",
    savings: "Save ~$80/mo",
    features: [
      "25% off all rides",
      "No surge pricing ever",
      "Always Premium vehicles",
      "Dedicated driver pool",
      "Airport lounge access",
      "15% off all ZIVO services",
      "Concierge support line",
    ],
  },
];

export default function RidePassPlans({ onSubscribe }: { onSubscribe?: (planId: string) => void }) {
  const [selected, setSelected] = useState("plus");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">ZIVO Ride Pass</span>
        </div>
        <h2 className="text-xl font-black text-foreground mb-1">Ride more, save more</h2>
        <p className="text-sm text-muted-foreground">Unlock exclusive perks with a monthly membership</p>
      </div>

      {/* Plan cards */}
      <div className="space-y-3 px-4">
        {plans.map((plan, index) => {
          const Icon = plan.icon;
          const isSelected = selected === plan.id;
          return (
            <motion.button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "w-full text-left rounded-2xl border p-4 transition-all relative overflow-hidden",
                isSelected
                  ? `bg-gradient-to-br ${plan.gradient} border-primary/30 ring-2 ring-primary/20 shadow-lg`
                  : "bg-card border-border/40 hover:border-border"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-black px-3 py-1 rounded-bl-xl">
                  MOST POPULAR
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  isSelected ? "bg-primary/15" : "bg-muted/50"
                )}>
                  <Icon className={cn("w-5 h-5", plan.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{plan.name}</span>
                    <div className="text-right">
                      <span className="text-lg font-black text-foreground">${plan.price}</span>
                      <span className="text-[10px] text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[9px] font-bold mt-1", plan.color, "border-current/20 bg-current/5")}>
                    {plan.savings}
                  </Badge>
                </div>
              </div>

              {/* Features list - only show for selected */}
              {isSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-3 pt-3 border-t border-border/30"
                >
                  <div className="grid gap-1.5">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2">
                        <Check className={cn("w-3.5 h-3.5 shrink-0", plan.color)} />
                        <span className="text-xs text-foreground/80">{feat}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Subscribe CTA */}
      <div className="px-4 pb-4">
        <Button
          onClick={() => onSubscribe?.(selected)}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold shadow-lg shadow-primary/25"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Start {plans.find(p => p.id === selected)?.name}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-2">Cancel anytime • 7-day free trial</p>
      </div>
    </div>
  );
}
