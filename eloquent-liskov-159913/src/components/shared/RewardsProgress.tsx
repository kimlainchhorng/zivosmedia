import { Award, Star, Gift, TrendingUp, ChevronRight, Sparkles, Medal, Trophy, Gem, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const tiers: { name: string; points: number; color: string; Icon: LucideIcon }[] = [
  { name: "Bronze", points: 0, color: "from-amber-600 to-amber-700", Icon: Medal },
  { name: "Silver", points: 5000, color: "from-gray-400 to-gray-500", Icon: Award },
  { name: "Gold", points: 15000, color: "from-yellow-400 to-amber-500", Icon: Trophy },
  { name: "Platinum", points: 50000, color: "from-violet-400 to-purple-500", Icon: Gem },
];

const upcomingRewards = [
  { points: 500, reward: "$10 Travel Credit", icon: Gift },
  { points: 1000, reward: "Priority Boarding", icon: Star },
  { points: 2500, reward: "Free Checked Bag", icon: Award },
];

interface RewardsProgressProps {
  currentPoints?: number;
  memberSince?: string;
  bookingsThisYear?: number;
}

const RewardsProgress = ({
  currentPoints = 3250,
  memberSince = "Jan 2024",
  bookingsThisYear = 8,
}: RewardsProgressProps) => {
  const currentTier = tiers.reduce((acc, tier) => 
    currentPoints >= tier.points ? tier : acc, tiers[0]);
  
  const nextTier = tiers.find((tier) => tier.points > currentPoints) || tiers[tiers.length - 1];
  
  const progressToNext = nextTier.points > currentTier.points
    ? ((currentPoints - currentTier.points) / (nextTier.points - currentTier.points)) * 100
    : 100;

  const pointsToNext = nextTier.points - currentPoints;

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden via-card/50 border border-border rounded-3xl p-6 md:p-8 bg-secondary">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary blur-3xl rounded-full" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <Badge className="mb-2 bg-secondary text-foreground border-border">
                  <Sparkles className="w-3 h-3 mr-1" /> ZIVO Rewards
                </Badge>
                <h2 className="text-2xl font-display font-bold">Your Rewards Status</h2>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{currentPoints.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">ZIVO Points</p>
              </div>
            </div>

            {/* Current Tier */}
            <div className="bg-card/60 backdrop-blur-xl rounded-xl p-5 border border-border/30 mb-6">
              <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentTier.color} flex items-center justify-center`}>
                  <currentTier.Icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <p className="text-xl font-bold">{currentTier.name} Member</p>
                  <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{bookingsThisYear} bookings</p>
                  <p className="text-xs text-muted-foreground">this year</p>
                </div>
              </div>

              {/* Progress to Next Tier */}
              {currentTier !== nextTier && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress to {nextTier.name}</span>
                    <span className="font-medium">{pointsToNext.toLocaleString()} points to go</span>
                  </div>
                  <Progress value={progressToNext} className="h-3" />
                </div>
              )}
            </div>

            {/* Tier Ladder */}
            <div className="flex items-center justify-between mb-6 px-2">
              {tiers.map((tier, index) => (
                <div key={tier.name} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all",
                      currentPoints >= tier.points
                        ? `bg-gradient-to-br ${tier.color}`
                        : "bg-muted/50"
                    )}
                  >
                    <tier.Icon className={cn("w-5 h-5", currentPoints >= tier.points ? "text-primary-foreground" : "text-muted-foreground")} />
                  </div>
                  <p className={cn(
                    "text-xs font-medium",
                    currentPoints >= tier.points ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {tier.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {tier.points.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Upcoming Rewards */}
            <div className="bg-card/60 backdrop-blur-xl rounded-xl p-5 border border-border/30">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-foreground" />
                Next Rewards
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {upcomingRewards.map((reward) => (
                  <div
                    key={reward.points}
                    className="p-3 bg-muted/30 rounded-xl text-center"
                  >
                    <reward.icon className="w-5 h-5 text-foreground mx-auto mb-2" />
                    <p className="text-xs font-medium">{reward.reward}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {reward.points} pts
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mt-6">
              <Button className="bg-secondary">
                View All Benefits <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Helper function for conditional classes
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default RewardsProgress;
