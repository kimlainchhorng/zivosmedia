/**
 * CUSTOMER LOYALTY PAGE
 * Shows points balance, history, available rewards, and redemptions
 * App-native layout — no web header/footer
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Gift,
  Users,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronRight,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useReferrals } from "@/hooks/useReferrals";
import {
  usePointsHistory,
  useAvailableRewards,
  useRedeemReward,
  useUserRedemptions,
} from "@/hooks/useLoyalty";
import SEOHead from "@/components/SEOHead";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import {
  PointsBalanceCard,
  TierProgressCard,
  ReferralCard,
  TierComparisonTable,
} from "@/components/loyalty";
import { POINTS_COMPLIANCE, type ZivoTier } from "@/config/zivoPoints";
import { cn } from "@/lib/utils";

export default function LoyaltyPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { points, isLoading: pointsLoading } = useLoyaltyPoints();
  const { data: history = [], isLoading: historyLoading } = usePointsHistory();
  const { data: rewards = [], isLoading: rewardsLoading } = useAvailableRewards();
  const { data: redemptions = [] } = useUserRedemptions();
  const redeemMutation = useRedeemReward();
  const { referralCode: userReferralCode } = useReferrals();
  const [activeTab, setActiveTab] = useState("overview");

  // Map old tier to new
  const mapTier = (oldTier: string): ZivoTier => {
    if (oldTier === "gold" || oldTier === "silver") return "elite";
    if (oldTier === "bronze") return "traveler";
    return "explorer";
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/login?redirect=/account/loyalty" replace />;
  }

  const isLoading = authLoading || pointsLoading;

  const handleRedeem = (rewardId: string) => {
    redeemMutation.mutate(rewardId);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEOHead
        title="ZIVO Points | Earn & Redeem Rewards"
        description="Track your ZIVO Points balance, view earning history, and redeem rewards."
        canonical="https://hizivo.com/account/loyalty"
      />

      {/* Sticky app header */}
      <div className="sticky top-0 safe-area-top z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              ZIVO Points
            </h1>
            <p className="text-xs text-muted-foreground">Earn rewards on every order</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <PointsBalanceCard className="mb-1" />
            </motion.div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5 h-11">
                <TabsTrigger value="overview">
                  <Sparkles className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="levels">
                  <Layers className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="rewards">
                  <Gift className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="refer">
                  <Users className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <TierProgressCard />

                {/* Recent Activity */}
                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs font-bold gap-1"
                      onClick={() => setActiveTab("history")}
                    >
                      View All <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {historyLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : history.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No activity yet. Complete an order to start earning!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {history.slice(0, 5).map((entry) => (
                          <HistoryItem key={entry.id} entry={entry} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pending Redemptions */}
                {redemptions.filter((r) => r.status === "pending").length > 0 && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-base">Pending Rewards</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="space-y-2">
                        {redemptions
                          .filter((r) => r.status === "pending")
                          .map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20"
                            >
                              <div>
                                <p className="font-medium text-sm">{r.reward?.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  Expires {format(new Date(r.expiresAt!), "MMM d, yyyy")}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">Ready to use</Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Levels Tab */}
              <TabsContent value="levels">
                <TierComparisonTable currentTier={mapTier(points.tier)} />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history">
                <Card className="border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-base">Points History</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {historyLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : history.length === 0 ? (
                      <p className="text-center text-muted-foreground py-12 text-sm">
                        No points history yet. Complete an order to start earning!
                      </p>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2 pr-4">
                          {history.map((entry) => (
                            <HistoryItem key={entry.id} entry={entry} />
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Rewards Tab */}
              <TabsContent value="rewards">
                <Card className="border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-base">Available Rewards</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {rewardsLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : rewards.length === 0 ? (
                      <p className="text-center text-muted-foreground py-12 text-sm">
                        No rewards available right now. Check back soon!
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {rewards.map((reward) => {
                          const canAfford = points.points_balance >= reward.pointsRequired;
                          return (
                            <div
                              key={reward.id}
                              className={cn(
                                "p-4 rounded-xl border transition-all",
                                canAfford
                                  ? "bg-gradient-to-r from-primary/5 to-amber-500/5 border-primary/20 hover:border-primary/40"
                                  : "bg-muted/30 border-border opacity-60"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Gift className="w-4 h-4 text-primary" />
                                    <h4 className="font-semibold text-sm">{reward.name}</h4>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {reward.description}
                                  </p>
                                  <Badge variant="outline" className="text-[10px]">
                                    {reward.pointsRequired.toLocaleString()} pts
                                  </Badge>
                                </div>
                                <Button
                                  size="sm"
                                  className="rounded-xl text-xs h-8"
                                  disabled={!canAfford || redeemMutation.isPending}
                                  onClick={() => handleRedeem(reward.id)}
                                >
                                  {redeemMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : canAfford ? (
                                    "Redeem"
                                  ) : (
                                    "Need more pts"
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Refer Tab */}
              <TabsContent value="refer">
                <ReferralCard
                  referralCode={userReferralCode?.code || user?.id?.slice(0, 8).toUpperCase() || "ZIVO-NEW"}
                  referralCount={userReferralCode?.total_referrals || 0}
                />
              </TabsContent>
            </Tabs>

            {/* Compliance Disclaimer */}
            <p className="text-[10px] text-muted-foreground text-center mt-6 px-4">
              {POINTS_COMPLIANCE.footerNote}
            </p>
          </>
        )}
      </div>

      <ZivoMobileNav />
    </div>
  );
}

// History Item Component
function HistoryItem({
  entry,
}: {
  entry: {
    id: string;
    pointsAmount: number;
    transactionType: string;
    description: string | null;
    createdAt: string;
  };
}) {
  const isPositive = entry.pointsAmount > 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isPositive ? "bg-emerald-500/10" : "bg-rose-500/10"
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-foreground" />
          )}
        </div>
        <div>
          <p className="font-medium text-sm">
            {entry.description || entry.transactionType}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "font-bold text-sm",
          isPositive ? "text-emerald-500" : "text-rose-500"
        )}
      >
        {isPositive ? "+" : ""}
        {entry.pointsAmount.toLocaleString()}
      </span>
    </div>
  );
}
