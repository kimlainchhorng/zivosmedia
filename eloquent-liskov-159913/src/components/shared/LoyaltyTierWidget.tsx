import { 
  Crown, 
  Star,
  TrendingUp,
  Gift,
  Zap,
  ChevronRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LoyaltyTierWidgetProps {
  className?: string;
  memberMiles?: number;
  memberName?: string;
  monthlyEarned?: number;
}

const tiers = [
  { name: "Bronze", minMiles: 0, color: "from-amber-700 to-amber-600", benefits: ["Basic seat selection"] },
  { name: "Silver", minMiles: 25000, color: "from-muted-foreground/80 to-muted-foreground/60", benefits: ["Free seat selection", "Priority boarding", "1.5x miles"] },
  { name: "Gold", minMiles: 50000, color: "from-amber-500 to-yellow-400", benefits: ["Lounge access", "2x miles", "Free upgrades"] },
  { name: "Platinum", minMiles: 100000, color: "from-purple-500 to-pink-400", benefits: ["Unlimited lounge", "3x miles", "Companion passes"] },
];

const LoyaltyTierWidget = ({ 
  className,
  memberMiles = 42500,
  memberName = "Traveler",
  monthlyEarned = 2500
}: LoyaltyTierWidgetProps) => {
  // Calculate current tier based on miles
  const currentTierIndex = tiers.findIndex((tier, index) => {
    const nextTier = tiers[index + 1];
    return !nextTier || memberMiles < nextTier.minMiles;
  });
  const currentTier = tiers[currentTierIndex];
  const nextTier = tiers[currentTierIndex + 1] || tiers[currentTierIndex];
  const progressToNext = currentTierIndex < tiers.length - 1 
    ? ((memberMiles - currentTier.minMiles) / (nextTier.minMiles - currentTier.minMiles)) * 100 
    : 100;
  const milesToNext = nextTier.minMiles - memberMiles;
  
  const currentBenefits = [
    { icon: Gift, label: currentTier.benefits[0] || "Free seat selection" },
    { icon: Zap, label: currentTier.benefits[1] || "Priority boarding" },
    { icon: Star, label: currentTier.benefits[2] || "1.5x miles earning" },
  ];

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-sm">Loyalty Status</h3>
        </div>
        <Badge className={cn("bg-gradient-to-r text-primary-foreground border-0", currentTier.color)}>
          {currentTier.name}
        </Badge>
      </div>

      {/* Current Miles */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/30 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Total Miles</span>
          <div className="flex items-center gap-1 text-emerald-400 text-xs">
            <TrendingUp className="w-3 h-3" />
            +{monthlyEarned.toLocaleString()} this month
          </div>
        </div>
        <p className="text-3xl font-bold">{memberMiles.toLocaleString()}</p>
      </div>

      {/* Progress to Next Tier */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Progress to {nextTier.name}</span>
          <span className="font-medium">{milesToNext.toLocaleString()} miles to go</span>
        </div>
        <Progress value={progressToNext} className="h-2 mb-2" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{currentTier.name}</span>
          <span>{nextTier.name}</span>
        </div>
      </div>

      {/* Tier Visualization */}
      <div className="flex gap-1 mb-4">
        {tiers.map((tier, index) => (
          <div
            key={tier.name}
            className={cn(
              "flex-1 h-2 rounded-full",
              index <= 1 ? `bg-gradient-to-r ${tier.color}` : "bg-muted/30"
            )}
          />
        ))}
      </div>

      {/* Current Benefits */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2">Your Benefits</p>
        <div className="space-y-2">
          {currentBenefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Icon className="w-4 h-4 text-primary" />
                <span>{benefit.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Tier Preview */}
      <button type="button" className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 flex items-center justify-between hover:from-amber-500/20 hover:to-yellow-500/20 transition-all">
        <div className="text-left">
          <p className="text-xs text-muted-foreground">Unlock with {nextTier.name}</p>
          <p className="text-sm font-medium">Lounge access + 2x miles</p>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-400" />
      </button>
    </div>
  );
};

export default LoyaltyTierWidget;
