import { useState } from "react";
import { Sparkles, Coins, Info, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useAuth } from "@/contexts/AuthContext";

interface RewardsRedemptionWidgetProps {
  className?: string;
  totalPrice?: number;
}

const RewardsRedemptionWidget = ({
  className,
  totalPrice = 1299,
}: RewardsRedemptionWidgetProps) => {
  const { user } = useAuth();
  const { points, pointsToValue, redeemPoints, isRedeeming, MIN_REDEMPTION_POINTS } = useLoyaltyPoints();
  const [milesValue, setMilesValue] = useState([0]);

  const availableMiles = points.points_balance;
  const maxRedeemable = Math.min(availableMiles, totalPrice * 100); // 100 miles = $1
  const dollarValue = milesValue[0] / 100;
  const remainingCash = totalPrice - dollarValue;
  const usagePercent = maxRedeemable > 0 ? (milesValue[0] / maxRedeemable) * 100 : 0;

  if (!user || availableMiles < MIN_REDEMPTION_POINTS) return null;

  return (
    <div className={cn("p-4 rounded-xl bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/30", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Use ZIVO Miles</h3>
        </div>
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Coins className="w-3 h-3 mr-1" />
          {availableMiles.toLocaleString()} pts
        </Badge>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Miles to redeem</span>
          <span className="font-mono font-bold text-primary">{milesValue[0].toLocaleString()}</span>
        </div>
        <Slider
          value={milesValue}
          onValueChange={setMilesValue}
          max={maxRedeemable}
          step={1000}
          className="mb-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span>{maxRedeemable.toLocaleString()} max</span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-background/50 border border-border/30 mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Miles value</span>
            <span className="text-emerald-400 font-medium">-${dollarValue.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Remaining cash</span>
            <span className="font-bold">${remainingCash.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[25, 50, 100].map((percent) => (
          <button type="button"
            key={percent}
            onClick={() => setMilesValue([Math.floor(maxRedeemable * percent / 100)])}
            className={cn(
              "flex-1 py-1.5 rounded-xl text-xs font-medium transition-all border",
              usagePercent >= percent
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-muted/20 border-border/30 text-muted-foreground hover:text-foreground"
            )}
          >
            {percent}%
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2 p-2 rounded-xl bg-secondary text-xs">
        <Info className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">Pro tip:</span> Save miles for premium upgrades to maximize value
        </p>
      </div>

      {milesValue[0] >= MIN_REDEMPTION_POINTS && (
        <Button
          className="w-full mt-4 bg-gradient-to-r from-primary to-amber-500"
          onClick={() =>
            redeemPoints({
              pointsToRedeem: milesValue[0],
              referenceType: "checkout",
              referenceId: "manual",
            })
          }
          disabled={isRedeeming}
        >
          <Zap className="w-4 h-4 mr-2" />
          {isRedeeming ? "Applying..." : `Apply ${milesValue[0].toLocaleString()} Miles`}
        </Button>
      )}
    </div>
  );
};

export default RewardsRedemptionWidget;
