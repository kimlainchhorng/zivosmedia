import { useState } from "react";
import { 
  Crown, 
  Armchair, 
  Utensils,
  Luggage,
  Wifi,
  Check,
  ArrowRight,
  Sparkles,
  Timer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpgradeOpportunityWidgetProps {
  className?: string;
  currentClass?: "economy" | "premium" | "business";
  route?: string;
  basePrice?: number;
}

interface UpgradeOption {
  id: string;
  name: string;
  price: number;
  savings: number;
  features: { icon: typeof Armchair; text: string }[];
  availability: "available" | "limited" | "last-chance";
  seatsLeft?: number;
}

const UpgradeOpportunityWidget = ({ 
  className,
  currentClass = "economy",
  route = "JFK → CDG",
  basePrice = 650
}: UpgradeOpportunityWidgetProps) => {
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);

  const upgrades: UpgradeOption[] = [
    {
      id: "premium",
      name: "Premium Economy",
      price: 299,
      savings: 150,
      availability: "available",
      features: [
        { icon: Armchair, text: "6\" extra legroom" },
        { icon: Utensils, text: "Premium meals" },
        { icon: Luggage, text: "2 checked bags" },
      ]
    },
    {
      id: "business",
      name: "Business Class",
      price: 899,
      savings: 400,
      availability: "limited",
      seatsLeft: 3,
      features: [
        { icon: Armchair, text: "Lie-flat seat" },
        { icon: Utensils, text: "Gourmet dining" },
        { icon: Wifi, text: "Free high-speed WiFi" },
        { icon: Luggage, text: "Priority everything" },
      ]
    },
    {
      id: "first",
      name: "First Class",
      price: 1899,
      savings: 800,
      availability: "last-chance",
      seatsLeft: 1,
      features: [
        { icon: Crown, text: "Private suite" },
        { icon: Utensils, text: "Chef-prepared meals" },
        { icon: Wifi, text: "Unlimited connectivity" },
        { icon: Armchair, text: "Onboard shower access" },
      ]
    }
  ];

  const availabilityConfig = {
    available: { label: "Available", color: "bg-emerald-500/10 text-emerald-400" },
    limited: { label: "Limited", color: "bg-amber-500/10 text-amber-400" },
    "last-chance": { label: "Last Chance", color: "bg-red-500/10 text-red-400 animate-pulse" }
  };

  // Filter to only show upgrades above current class
  const classOrder = ["economy", "premium", "business", "first"];
  const currentIndex = classOrder.indexOf(currentClass);
  const availableUpgrades = upgrades.filter((_, index) => index >= currentIndex);

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-sm">Upgrade Your Experience</h3>
        </div>
        <Badge variant="secondary" className="text-xs">{route}</Badge>
      </div>

      {/* Current Class */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 mb-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Current Booking</p>
            <p className="font-medium capitalize">{currentClass} Class</p>
          </div>
          <p className="font-bold">${basePrice}</p>
        </div>
      </div>

      {/* Upgrade Options */}
      <div className="space-y-3">
        {availableUpgrades.map((upgrade) => {
          const isSelected = selectedUpgrade === upgrade.id;
          const config = availabilityConfig[upgrade.availability];
          
          return (
            <button type="button"
              key={upgrade.id}
              onClick={() => setSelectedUpgrade(isSelected ? null : upgrade.id)}
              className={cn(
                "w-full p-4 rounded-xl border transition-all text-left",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border/30 hover:border-primary/30"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{upgrade.name}</span>
                    <Badge className={config.color}>
                      {upgrade.seatsLeft && (
                        <Timer className="w-3 h-3 mr-1" />
                      )}
                      {upgrade.seatsLeft ? `${upgrade.seatsLeft} left` : config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold">+${upgrade.price}</span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">
                      Save ${upgrade.savings}
                    </Badge>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-2">
                {upgrade.features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span>{feature.text}</span>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      {selectedUpgrade && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">New Total</p>
              <p className="text-xl font-bold">
                ${basePrice + (upgrades.find(u => u.id === selectedUpgrade)?.price || 0)}
              </p>
            </div>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500">
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Note */}
      {!selectedUpgrade && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Upgrade prices shown are special online-only rates • Limited availability
        </p>
      )}
    </div>
  );
};

export default UpgradeOpportunityWidget;
