import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Coins,
  Plane,
  Gift,
  TrendingUp,
  Calendar,
  Sparkles,
  CreditCard,
  ShoppingBag,
  Utensils,
  Car,
  Hotel,
  Star,
  History,
  ChevronRight,
  Crown,
  Award,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  Timer,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MilesTransaction {
  id: string;
  type: 'earn' | 'redeem';
  amount: number;
  description: string;
  category: string;
  date: string;
  icon: typeof Plane;
}

interface RedemptionOption {
  id: string;
  title: string;
  description: string;
  milesRequired: number;
  value: string;
  category: string;
  icon: typeof Gift;
  popular?: boolean;
  limited?: boolean;
  stock?: number;
}

interface TierInfo {
  name: string;
  icon: typeof Star;
  color: string;
  bgGradient: string;
  minMiles: number;
  nextTier?: string;
  benefits: string[];
  multiplier: string;
}

const TIERS: TierInfo[] = [
  { 
    name: 'Bronze', 
    icon: Award, 
    color: 'text-orange-400',
    bgGradient: 'from-orange-500/20 to-amber-500/10',
    minMiles: 0, 
    nextTier: 'Silver',
    benefits: ['1x base miles', 'Standard support'],
    multiplier: '1x'
  },
  { 
    name: 'Silver', 
    icon: Star, 
    color: 'text-muted-foreground',
    bgGradient: 'from-muted-foreground/20 to-muted-foreground/10',
    minMiles: 25000, 
    nextTier: 'Gold',
    benefits: ['1.25x miles', 'Priority booking', 'Free seat selection'],
    multiplier: '1.25x'
  },
  { 
    name: 'Gold', 
    icon: Crown, 
    color: 'text-amber-400',
    bgGradient: 'from-amber-400/20 to-yellow-500/10',
    minMiles: 75000, 
    nextTier: 'Platinum',
    benefits: ['1.5x miles', 'Lounge access', 'Free upgrades', 'Priority support'],
    multiplier: '1.5x'
  },
  { 
    name: 'Platinum', 
    icon: Zap, 
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-400/20 to-blue-500/10',
    minMiles: 150000, 
    benefits: ['2x miles', 'Unlimited upgrades', 'Concierge service', 'Partner status match'],
    multiplier: '2x'
  },
];

const REDEMPTION_OPTIONS: RedemptionOption[] = [
  { id: '1', title: 'Flight Upgrade', description: 'Upgrade to Business Class', milesRequired: 25000, value: '$800', category: 'flights', icon: Plane, popular: true },
  { id: '2', title: 'Lounge Access', description: 'Priority Pass - 1 Visit', milesRequired: 5000, value: '$50', category: 'lounges', icon: Star },
  { id: '3', title: 'Free Night', description: 'Partner Hotel Voucher', milesRequired: 15000, value: '$200', category: 'hotels', icon: Hotel },
  { id: '4', title: 'Shopping Credit', description: 'Duty-Free Voucher', milesRequired: 10000, value: '$100', category: 'shopping', icon: ShoppingBag },
  { id: '5', title: 'Car Rental Day', description: 'Free Rental Day', milesRequired: 8000, value: '$75', category: 'cars', icon: Car },
  { id: '6', title: 'Gift Card', description: '$50 ZIVO Credit', milesRequired: 5000, value: '$50', category: 'credit', icon: CreditCard },
  { id: '7', title: 'Double Miles Week', description: '2x earnings for 7 days', milesRequired: 15000, value: 'Boost', category: 'boosts', icon: Zap, limited: true, stock: 50 },
];

const EARN_RATES = [
  { category: 'Flights', rate: '10 miles per $1', multiplier: '2x on Business/First', icon: Plane, color: 'text-sky-400' },
  { category: 'Hotels', rate: '5 miles per $1', multiplier: '1.5x Partner Hotels', icon: Hotel, color: 'text-amber-400' },
  { category: 'Car Rentals', rate: '3 miles per $1', multiplier: '2x Weekend Rentals', icon: Car, color: 'text-emerald-400' },
  { category: 'Dining', rate: '2 miles per $1', multiplier: '3x Airport Dining', icon: Utensils, color: 'text-rose-400' },
];

interface ZivoMilesProgramProps {
  className?: string;
}

export const ZivoMilesProgram = ({ className }: ZivoMilesProgramProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [transferAmount, setTransferAmount] = useState('');
  const [transactions, setTransactions] = useState<MilesTransaction[]>([]);

  // User's miles data from loyalty_points
  const [currentMiles, setCurrentMiles] = useState(0);
  const [lifetimeMiles, setLifetimeMiles] = useState(0);
  const pendingMiles = 0;
  const expiringMiles = 0;
  const expiryDate = 'Dec 31, 2025';
  const [yearlyMiles, setYearlyMiles] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("loyalty_points").select("points_balance, lifetime_points, tier").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setCurrentMiles(data.points_balance ?? 0);
        setLifetimeMiles(data.lifetime_points ?? 0);
        setYearlyMiles(data.lifetime_points ?? 0);
      }
    });
  }, [user]);
  
  // Calculate tier
  const currentTier = TIERS.reduce((acc, tier) => 
    yearlyMiles >= tier.minMiles ? tier : acc
  , TIERS[0]);
  
  const nextTier = TIERS.find(t => t.minMiles > yearlyMiles);
  const progressToNext = nextTier 
    ? ((yearlyMiles - currentTier.minMiles) / (nextTier.minMiles - currentTier.minMiles)) * 100
    : 100;
  const milesToNext = nextTier ? nextTier.minMiles - yearlyMiles : 0;

  const handleRedeem = (option: RedemptionOption) => {
    if (currentMiles >= option.milesRequired) {
      toast.success(`Redeemed ${option.title} for ${option.milesRequired.toLocaleString()} miles!`);
    } else {
      toast.error(`Not enough miles. You need ${(option.milesRequired - currentMiles).toLocaleString()} more miles.`);
    }
  };

  const handleTransfer = () => {
    const amount = parseInt(transferAmount);
    if (amount && amount <= currentMiles && amount >= 1000) {
      toast.success(`${amount.toLocaleString()} miles transferred to partner program`);
      setTransferAmount('');
    } else if (amount < 1000) {
      toast.error('Minimum transfer is 1,000 miles');
    }
  };

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl bg-gradient-to-br border flex items-center justify-center",
              currentTier.bgGradient,
              currentTier.color === 'text-amber-400' ? 'border-amber-500/40' : 'border-primary/40'
            )}>
              <currentTier.icon className={cn("w-6 h-6", currentTier.color)} />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                ZIVO Miles
                <Badge className={cn(
                  "border-0",
                  currentTier.name === 'Gold' && "bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground",
                  currentTier.name === 'Silver' && "bg-gradient-to-r from-muted-foreground to-muted-foreground/80 text-primary-foreground",
                  currentTier.name === 'Platinum' && "bg-gradient-to-r from-cyan-400 to-blue-500 text-primary-foreground",
                  currentTier.name === 'Bronze' && "bg-gradient-to-r from-orange-400 to-amber-500 text-primary-foreground"
                )}>
                  <currentTier.icon className="w-3 h-3 mr-1" />
                  {currentTier.name} Member
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentTier.multiplier} earning rate • Earn & redeem across all ZIVO services
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Tier Progress Banner */}
        {nextTier && (
          <div className="px-6 py-4 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 border-b border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {milesToNext.toLocaleString()} miles to {nextTier.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {yearlyMiles.toLocaleString()} / {nextTier.minMiles.toLocaleString()} yearly miles
              </span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        )}

        {/* Miles Summary */}
        <div className="p-6 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div 
              className="text-center p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-3xl font-bold text-amber-400">{currentMiles.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Available Miles</p>
            </motion.div>
            <motion.div 
              className="text-center p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-2xl font-semibold text-emerald-400">+{pendingMiles.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending</p>
            </motion.div>
            <motion.div 
              className="text-center p-4 rounded-xl bg-card/50 border border-border/50 relative overflow-hidden"
              whileHover={{ scale: 1.02 }}
            >
              <div className="absolute top-0 right-0 w-8 h-8 bg-secondary rounded-bl-xl flex items-center justify-center">
                <Timer className="w-3 h-3 text-foreground" />
              </div>
              <p className="text-2xl font-semibold text-foreground">{expiringMiles.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Expiring {expiryDate}</p>
            </motion.div>
            <motion.div 
              className="text-center p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-2xl font-semibold">{lifetimeMiles.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Lifetime Earned</p>
            </motion.div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tiers">Tiers</TabsTrigger>
            <TabsTrigger value="earn">Earn</TabsTrigger>
            <TabsTrigger value="redeem">Redeem</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-0">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                <p className="text-lg font-semibold">—</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <Calendar className="w-5 h-5 mx-auto mb-1 text-foreground" />
                <p className="text-lg font-semibold">{transactions.length}</p>
                <p className="text-xs text-muted-foreground">Transactions</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                <Gift className="w-5 h-5 mx-auto mb-1 text-foreground" />
                <p className="text-lg font-semibold">—</p>
                <p className="text-xs text-muted-foreground">Rewards Used</p>
              </div>
            </div>

            {/* Next Reward Progress */}
            <div className="p-4 rounded-xl border border-border bg-secondary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Next Reward: Flight Upgrade</span>
                <span className="text-sm text-muted-foreground">25,000 miles</span>
              </div>
              <Progress value={(currentMiles / 25000) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-400" />
                You can redeem this reward now!
              </p>
            </div>

            {/* Transfer Miles */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Transfer to Partner Programs</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter miles (min 1,000)"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleTransfer} disabled={!transferAmount}>
                  Transfer
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                1:1 ratio with 15+ airline partners
              </p>
            </div>
          </TabsContent>

          <TabsContent value="tiers" className="space-y-4 mt-0">
            <p className="text-sm text-muted-foreground mb-4">
              Your status is based on miles earned in the calendar year
            </p>
            {TIERS.map((tier, i) => {
              const isCurrentTier = tier.name === currentTier.name;
              const isAchieved = yearlyMiles >= tier.minMiles;
              
              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    isCurrentTier ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border/50 bg-card/30",
                    !isAchieved && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                      tier.bgGradient
                    )}>
                      <tier.icon className={cn("w-6 h-6", tier.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{tier.name}</h4>
                        {isCurrentTier && (
                          <Badge variant="outline" className="text-xs">Current</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{tier.multiplier}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tier.minMiles.toLocaleString()}+ yearly miles
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tier.benefits.map(benefit => (
                          <Badge key={benefit} variant="outline" className="text-[10px]">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {isAchieved && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </TabsContent>

          <TabsContent value="earn" className="space-y-3 mt-0">
            <p className="text-sm text-muted-foreground mb-4">
              Earn miles on every purchase across the ZIVO ecosystem
            </p>
            {EARN_RATES.map((rate, i) => (
              <motion.div
                key={rate.category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50"
              >
                <div className={cn("w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center", rate.color)}>
                  <rate.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{rate.category}</h4>
                  <p className="text-sm text-muted-foreground">{rate.rate}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {rate.multiplier}
                </Badge>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="redeem" className="space-y-3 mt-0">
            <div className="grid gap-3">
              {REDEMPTION_OPTIONS.map((option, i) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleRedeem(option)}
                  className={cn(
                    "relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                    currentMiles >= option.milesRequired 
                      ? "bg-muted/30 border-border/50 hover:border-primary/50" 
                      : "bg-muted/10 border-border/30 opacity-60"
                  )}
                >
                  {option.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-amber-500 text-primary-foreground">
                      Popular
                    </Badge>
                  )}
                  {option.limited && (
                    <Badge className="absolute -top-2 -right-2 bg-foreground text-primary-foreground animate-pulse">
                      Limited: {option.stock} left
                    </Badge>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <option.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{option.title}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-400">{option.milesRequired.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">≈ {option.value}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-2 mt-0">
            {transactions.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No transactions yet
              </div>
            )}
            {transactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  tx.type === 'earn' ? "bg-emerald-500/20" : "bg-rose-500/20"
                )}>
                  <tx.icon className={cn(
                    "w-5 h-5",
                    tx.type === 'earn' ? "text-emerald-400" : "text-rose-400"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                <span className={cn(
                  "font-semibold",
                  tx.type === 'earn' ? "text-emerald-400" : "text-rose-400"
                )}>
                  {tx.type === 'earn' ? '+' : ''}{tx.amount.toLocaleString()}
                </span>
              </motion.div>
            ))}
            <Button variant="ghost" className="w-full mt-2">
              <History className="w-4 h-4 mr-2" />
              View All Transactions
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ZivoMilesProgram;
