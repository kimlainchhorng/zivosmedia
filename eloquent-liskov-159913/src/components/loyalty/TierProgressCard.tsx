import { Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { TIER_LABELS } from "./index";

interface TierProgressCardProps {
  className?: string;
}

const TierProgressCard = ({ className }: TierProgressCardProps) => {
  const { user } = useAuth();
  const { points, getNextTierProgress } = useLoyaltyPoints();
  const { nextTier, progress, pointsNeeded } = getNextTierProgress();

  if (!user) return null;

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-5 h-5 text-foreground" />
          <span className="text-sm font-medium">Tier Progress</span>
        </div>
        <div className="flex justify-between text-xs mb-2">
          <span className="font-medium capitalize">{TIER_LABELS[points.tier] ?? points.tier}</span>
          {pointsNeeded > 0 ? (
            <span className="text-muted-foreground">
              {pointsNeeded.toLocaleString()} pts to {TIER_LABELS[nextTier] ?? nextTier}
            </span>
          ) : (
            <span className="text-amber-400 font-semibold">Max tier reached!</span>
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </CardContent>
    </Card>
  );
};

export default TierProgressCard;
