import { Plane, Crown, Star, Gift, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";

const DISPLAY_TIERS = [
  { key: "standard" as const, name: "Explorer", miles: 0, color: "from-gray-400 to-gray-500", benefits: ["Basic rewards", "Price alerts", "Trip tracking"] },
  { key: "bronze" as const, name: "Traveler", miles: 1000, color: "from-blue-400 to-cyan-500", benefits: ["5% bonus miles", "Priority support", "Seat selection"] },
  { key: "silver" as const, name: "Voyager", miles: 5000, color: "from-purple-400 to-purple-600", benefits: ["10% bonus miles", "Lounge access", "Free upgrades"] },
  { key: "gold" as const, name: "Elite", miles: 10000, color: "from-amber-400 to-yellow-500", benefits: ["20% bonus miles", "First class upgrades", "Concierge"] },
];

const FlightLoyaltyProgram = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { points, getNextTierProgress } = useLoyaltyPoints();

  const currentTierKey = points.tier;
  const currentDisplay = DISPLAY_TIERS.find((t) => t.key === currentTierKey) ?? DISPLAY_TIERS[0];
  const { nextTier, progress, pointsNeeded } = getNextTierProgress();
  const nextDisplay = DISPLAY_TIERS.find((t) => t.key === nextTier) ?? DISPLAY_TIERS[DISPLAY_TIERS.length - 1];

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 text-foreground border-border bg-secondary">
            <Crown className="w-3 h-3 mr-1" /> ZIVO SkyMiles
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Earn Miles on Every Flight Search
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Redeem for discounts, upgrades, and exclusive travel perks
          </p>
        </div>

        {/* Current Status Card */}
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${currentDisplay.color} flex items-center justify-center`}>
              <Plane className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-sm text-muted-foreground">Your Status</p>
              <h3 className="text-2xl font-bold">{currentDisplay.name}</h3>
              <p className="text-foreground font-semibold">
                {user ? `${points.points_balance.toLocaleString()} miles` : "Sign in to track miles"}
              </p>
            </div>
            {user && pointsNeeded > 0 && (
              <div className="w-full md:w-64">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Next: {nextDisplay.name}</span>
                  <span className="text-foreground">{pointsNeeded.toLocaleString()} to go</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            )}
          </div>
        </div>

        {/* Tier Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DISPLAY_TIERS.map((tier) => (
            <div
              key={tier.key}
              className={`relative p-4 rounded-xl border ${
                tier.key === currentTierKey ? "border-sky-500 bg-sky-500/5" : "border-border/50 bg-card/30"
              }`}
            >
              {tier.key === currentTierKey && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-foreground text-xs">Current</Badge>
              )}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center mx-auto mb-3`}>
                <Star className="w-6 h-6 text-primary-foreground" />
              </div>
              <h4 className="font-bold text-center mb-1">{tier.name}</h4>
              <p className="text-xs text-muted-foreground text-center mb-3">{tier.miles.toLocaleString()}+ miles</p>
              <ul className="space-y-1">
                {tier.benefits.map((benefit) => (
                  <li key={benefit} className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3 text-foreground" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {!user && (
          <div className="text-center mt-8">
            <Button
              className="text-primary-foreground font-semibold bg-foreground"
              onClick={() => navigate(withRedirectParam("/login", "/flights"))}
            >
              <Gift className="w-4 h-4 mr-2" />
              Join SkyMiles Free
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FlightLoyaltyProgram;
