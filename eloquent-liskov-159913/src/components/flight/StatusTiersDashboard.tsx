import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  Star,
  Shield,
  Sparkles,
  Plane,
  Gift,
  Clock,
  Luggage,
  Armchair,
  Coffee,
  Wifi,
  ChevronRight,
  Check,
  Lock,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TierBenefit {
  id: string;
  title: string;
  description: string;
  icon: typeof Gift;
  tiers: ('silver' | 'gold' | 'platinum')[];
}

interface StatusTier {
  id: 'silver' | 'gold' | 'platinum';
  name: string;
  icon: typeof Star;
  color: string;
  bgGradient: string;
  milesRequired: number;
  flightsRequired: number;
}

const TIERS: StatusTier[] = [
  {
    id: 'silver',
    name: 'Silver',
    icon: Shield,
    color: 'text-muted-foreground',
    bgGradient: 'from-muted-foreground/20 to-muted-foreground/10',
    milesRequired: 25000,
    flightsRequired: 10
  },
  {
    id: 'gold',
    name: 'Gold',
    icon: Crown,
    color: 'text-amber-400',
    bgGradient: 'from-amber-400/20 to-orange-500/10',
    milesRequired: 75000,
    flightsRequired: 30
  },
  {
    id: 'platinum',
    name: 'Platinum',
    icon: Sparkles,
    color: 'text-purple-400',
    bgGradient: 'from-purple-400/20 to-pink-500/10',
    milesRequired: 150000,
    flightsRequired: 60
  }
];

const BENEFITS: TierBenefit[] = [
  { id: '1', title: 'Priority Boarding', description: 'Board before general passengers', icon: Plane, tiers: ['silver', 'gold', 'platinum'] },
  { id: '2', title: 'Bonus Miles', description: 'Earn 25-100% extra miles', icon: TrendingUp, tiers: ['silver', 'gold', 'platinum'] },
  { id: '3', title: 'Free Seat Selection', description: 'Choose any standard seat free', icon: Armchair, tiers: ['silver', 'gold', 'platinum'] },
  { id: '4', title: 'Extra Baggage', description: 'Additional checked bag allowance', icon: Luggage, tiers: ['gold', 'platinum'] },
  { id: '5', title: 'Lounge Access', description: 'Complimentary airport lounge entry', icon: Coffee, tiers: ['gold', 'platinum'] },
  { id: '6', title: 'Priority Support', description: 'Dedicated customer service line', icon: Clock, tiers: ['gold', 'platinum'] },
  { id: '7', title: 'Free WiFi', description: 'Complimentary in-flight WiFi', icon: Wifi, tiers: ['platinum'] },
  { id: '8', title: 'Upgrade Priority', description: 'First in line for cabin upgrades', icon: Crown, tiers: ['platinum'] },
  { id: '9', title: 'Companion Pass', description: 'Annual companion ticket discount', icon: Gift, tiers: ['platinum'] },
];

interface StatusTiersDashboardProps {
  className?: string;
}

export const StatusTiersDashboard = ({ className }: StatusTiersDashboardProps) => {
  const [selectedTier, setSelectedTier] = useState<'silver' | 'gold' | 'platinum'>('gold');
  
  // User tier data — defaults shown until real data loads
  const [currentTier] = useState<'silver' | 'gold' | 'platinum'>('silver');
  const currentMiles = 0;
  const currentFlights = 0;
  const qualifyingPeriodEnd = 'Dec 31, 2026';

  const nextTier = TIERS.find(t => t.id === 'platinum')!;
  const milesToNext = nextTier.milesRequired - currentMiles;
  const flightsToNext = nextTier.flightsRequired - currentFlights;
  const milesProgress = (currentMiles / nextTier.milesRequired) * 100;
  const flightsProgress = (currentFlights / nextTier.flightsRequired) * 100;

  const currentTierData = TIERS.find(t => t.id === currentTier)!;

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br border",
              currentTierData.bgGradient,
              currentTier === 'gold' ? 'border-amber-500/40' : 
              currentTier === 'platinum' ? 'border-purple-500/40' : 'border-border'
            )}>
              <currentTierData.icon className={cn("w-6 h-6", currentTierData.color)} />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Status Tiers
                <Badge className={cn(
                  "border-0",
                  currentTier === 'gold' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground' :
                  currentTier === 'platinum' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-primary-foreground' :
                  'bg-gradient-to-r from-muted-foreground to-muted-foreground/80 text-primary-foreground'
                )}>
                  {currentTierData.name} Member
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Qualifying period ends {qualifyingPeriodEnd}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Current Status Card */}
        <div className={cn("p-6 bg-gradient-to-br", currentTierData.bgGradient)}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Your Status</p>
              <h3 className={cn("text-2xl font-bold", currentTierData.color)}>
                {currentTierData.name}
              </h3>
            </div>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center",
                currentTier === 'gold' ? 'bg-amber-500/20' :
                currentTier === 'platinum' ? 'bg-purple-500/20' : 'bg-muted'
              )}
            >
              <currentTierData.icon className={cn("w-8 h-8", currentTierData.color)} />
            </motion.div>
          </div>

          {/* Progress to Next Tier */}
          <div className="space-y-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress to {nextTier.name}</span>
              <Badge variant="outline">{Math.round(Math.max(milesProgress, flightsProgress))}%</Badge>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Qualifying Miles</span>
                  <span>{currentMiles.toLocaleString()} / {nextTier.milesRequired.toLocaleString()}</span>
                </div>
                <Progress value={milesProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {milesToNext.toLocaleString()} miles to go
                </p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Qualifying Flights</span>
                  <span>{currentFlights} / {nextTier.flightsRequired}</span>
                </div>
                <Progress value={flightsProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {flightsToNext} flights to go
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Selector */}
        <div className="p-4 border-b border-border/50">
          <div className="flex gap-2">
            {TIERS.map(tier => (
              <button type="button"
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all",
                  selectedTier === tier.id
                    ? tier.id === 'gold' ? 'bg-amber-500/20 border-amber-500/40' :
                      tier.id === 'platinum' ? 'bg-purple-500/20 border-purple-500/40' :
                      'bg-muted border-border'
                    : 'bg-muted/30 border-border/50 hover:border-border'
                )}
              >
                <tier.icon className={cn("w-5 h-5", tier.color)} />
                <span className={cn(
                  "font-medium",
                  selectedTier === tier.id ? tier.color : 'text-muted-foreground'
                )}>
                  {tier.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Benefits List */}
        <div className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4" />
            {TIERS.find(t => t.id === selectedTier)?.name} Benefits
          </h4>
          <div className="space-y-2">
            {BENEFITS.map((benefit, i) => {
              const isIncluded = benefit.tiers.includes(selectedTier);
              return (
                <motion.div
                  key={benefit.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    isIncluded 
                      ? "bg-muted/30 border-border/50" 
                      : "bg-muted/10 border-border/30 opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    isIncluded ? "bg-primary/20" : "bg-muted/30"
                  )}>
                    {isIncluded ? (
                      <benefit.icon className="w-4 h-4 text-primary" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-sm", !isIncluded && "text-muted-foreground")}>
                      {benefit.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </div>
                  {isIncluded && (
                    <Check className="w-5 h-5 text-emerald-400" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusTiersDashboard;
