import { Coins, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { TIER_LABELS } from "./index";

interface PointsBalanceCardProps {
  className?: string;
}

const PointsBalanceCard = ({ className }: PointsBalanceCardProps) => {
  const { user } = useAuth();
  const { points, isLoading } = useLoyaltyPoints();

  if (!user) return null;

  return (
    <Card className={cn("bg-gradient-to-br from-primary/10 to-amber-500/10 border-primary/30", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium">ZIVO Miles</span>
          </div>
          <span className="text-xs text-muted-foreground">{TIER_LABELS[points.tier] ?? points.tier} Tier</span>
        </div>
        <p className="text-3xl font-display font-bold">
          {isLoading ? "—" : points.points_balance.toLocaleString()}
        </p>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          <span>{points.lifetime_points.toLocaleString()} lifetime</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PointsBalanceCard;
