/**
 * ZIVO REWARDS PAGE — Premium 2026
 * Central hub for ZIVO Points loyalty program
 */

import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Gift, Users, Trophy, Info, Crown, Star, Flame, Target, Zap, TrendingUp, Award, Calendar, ChevronRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import {
  PointsBalanceCard,
  PointsEarningList,
  TierProgressCard,
  RedemptionOptions,
  ReferralCard,
} from "@/components/loyalty";
import { POINTS_COMPLIANCE, type ZivoTier } from "@/config/zivoPoints";

export default function RewardsPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { points, isLoading } = useLoyaltyPoints();
  const [activeTab, setActiveTab] = useState("overview");
  
  const mapTier = (oldTier: string): ZivoTier => {
    if (oldTier === 'gold' || oldTier === 'silver') return 'elite';
    if (oldTier === 'bronze') return 'traveler';
    return 'explorer';
  };

  /* ── Streak: count consecutive active days from loyalty_transactions ── */
  const { data: streakData } = useQuery({
    queryKey: ["rewards-streak", user?.id],
    queryFn: async () => {
      if (!user?.id) return { streak: 0, activeDays: [] as string[] };
      const { data } = await (supabase as any)
        .from("loyalty_transactions")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (!data || data.length === 0) return { streak: 0, activeDays: [] };
      const uniqueDays = [...new Set((data as any[]).map((r: any) =>
        new Date(r.created_at).toISOString().slice(0, 10)
      ))].sort().reverse();
      let streak = 0;
      const today = new Date().toISOString().slice(0, 10);
      let cursor = today;
      for (const day of uniqueDays) {
        if (day === cursor) { streak++; const d = new Date(cursor); d.setDate(d.getDate() - 1); cursor = d.toISOString().slice(0, 10); }
        else if (day < cursor) break;
      }
      return { streak, activeDays: uniqueDays.slice(0, 7) };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  /* ── Challenges from achievements table ── */
  const { data: challenges = [] } = useQuery({
    queryKey: ["rewards-challenges"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("achievements")
        .select("id, name, description, points_reward, icon, target_count")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(3);
      return data || [];
    },
    staleTime: 10 * 60_000,
  });

  /* ── Leaderboard: top users by lifetime points ── */
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["rewards-leaderboard"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("loyalty_points")
        .select("user_id, lifetime_points, profiles:user_id(full_name, username, avatar_url)")
        .order("lifetime_points", { ascending: false })
        .limit(3);
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  /* ── Referral count ── */
  const { data: referralCount = 0 } = useQuery({
    queryKey: ["rewards-referral-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await (supabase as any)
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_user_id", user.id);
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  /* ── Completed actions from loyalty_transactions ── */
  const { data: completedActions = ["account_creation"] } = useQuery({
    queryKey: ["rewards-completed-actions", user?.id],
    queryFn: async () => {
      if (!user?.id) return ["account_creation"];
      const { data } = await (supabase as any)
        .from("loyalty_transactions")
        .select("transaction_type")
        .eq("member_id", user.id);
      const types = new Set((data || []).map((r: any) => r.transaction_type as string));
      types.add("account_creation");
      return [...types];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  /* ── Points history: last 6 months ── */
  const { data: monthlyPoints = [] } = useQuery({
    queryKey: ["rewards-monthly-points", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data } = await (supabase as any)
        .from("loyalty_transactions")
        .select("points_earned, created_at")
        .eq("user_id", user.id)
        .gte("created_at", sixMonthsAgo.toISOString())
        .gt("points_earned", 0);
      const monthly: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const key = new Date(r.created_at).toLocaleString("en", { month: "short" });
        monthly[key] = (monthly[key] || 0) + (r.points_earned || 0);
      });
      return Object.entries(monthly).map(([month, pts]) => ({ month, pts }));
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const streak = streakData?.streak ?? 0;
  const activeDays = streakData?.activeDays ?? [];

  /* week-of-day helpers for the streak display */
  const DAYS = ["S","M","T","W","T","F","S"];
  const todayDow = new Date().getDay();
  const weekDays = DAYS.map((d, i) => {
    const offset = i - todayDow;
    const date = new Date(); date.setDate(date.getDate() + offset);
    return { label: d, dateStr: date.toISOString().slice(0, 10) };
  });

  if (!authLoading && !user) {
    return <Navigate to="/login?redirect=/rewards" replace />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead 
        title="ZIVO Points | Earn Rewards on Your Travels"
        description="Earn ZIVO Points on bookings and redeem for discounts, priority alerts, and exclusive deals."
        canonical="https://hizivo.com/rewards"
      />
      
      {/* Premium Header */}
      <div className="sticky top-0 safe-area-top z-40 bg-background/95 backdrop-blur-2xl border-b border-border/30">
        <div className="px-4 py-3 safe-area-top">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold">ZIVO Points</h1>
                <p className="text-[10px] text-muted-foreground">Earn rewards on every trip</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 pt-5 space-y-6 max-w-4xl mx-auto">
        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <PointsBalanceCard />
        </motion.div>
        
        {/* Premium Tabs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
              {[
                { value: "overview", icon: Star, label: "Overview" },
                { value: "earn", icon: Trophy, label: "Earn" },
                { value: "redeem", icon: Gift, label: "Redeem" },
                { value: "refer", icon: Users, label: "Refer" },
              ].map(tab => (
                <button type="button"
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 touch-manipulation ${
                    activeTab === tab.value 
                      ? "bg-card text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            
            <TabsContent value="overview" className="space-y-5">
              <TierProgressCard />
              <PointsEarningList completedActions={completedActions} />
            </TabsContent>
            
            <TabsContent value="earn" className="space-y-5">
              <PointsEarningList completedActions={completedActions} />
              <Card className="border-primary/15 bg-primary/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Info className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Points are credited automatically after qualifying actions are completed.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="redeem">
              <RedemptionOptions pointsBalance={points.points_balance} />
            </TabsContent>
            
            <TabsContent value="refer">
              <ReferralCard
                referralCode={user?.id?.slice(0, 8).toUpperCase() || "ZIVO-NEW"}
                referralCount={referralCount}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
        
        {/* === WAVE 7: Rich Rewards Content === */}
        
        {/* Points Earning Streak */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-bold text-foreground">
                  {streak > 0 ? `${streak}-Day Earning Streak 🔥` : "Start Your Streak"}
                </p>
              </div>
              <div className="flex gap-1">
                {weekDays.map(({ label, dateStr }, i) => {
                  const active = activeDays.includes(dateStr);
                  return (
                    <div key={i} className={cn("flex-1 text-center py-1.5 rounded-lg text-[9px] font-bold", active ? "bg-amber-500/20 text-amber-500" : "bg-muted/50 text-muted-foreground")}>
                      {label}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Keep your streak! Book or search daily to earn bonus points.</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Challenges */}
        {challenges.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-foreground" /> Active Challenges</h2>
            <div className="space-y-2">
              {challenges.map((c: any) => (
                <Card key={c.id} className="border-border/40">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">{c.name}</p>
                        {c.points_reward && <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[8px]">{c.points_reward} pts</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{c.description}</p>
                      <div className="h-1.5 rounded-full bg-muted/50 mt-1.5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: "0%" }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Points History Chart */}
        {monthlyPoints.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card className="border-border/40">
              <CardContent className="p-4">
                <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-primary" /> Points Earned (Last 6 Months)</p>
                <div className="flex items-end gap-1.5 h-16">
                  {monthlyPoints.map(({ month, pts }, i) => {
                    const maxPts = Math.max(...monthlyPoints.map(m => m.pts), 1);
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-0.5">
                        <motion.div initial={{ height: 0 }} animate={{ height: `${(pts / maxPts) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.08 }}
                          className={cn("w-full rounded-t", i === monthlyPoints.length - 1 ? "bg-primary" : "bg-primary/20")} />
                        <span className="text-[8px] text-muted-foreground">{month}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>Total: <b className="text-foreground">{monthlyPoints.reduce((s, m) => s + m.pts, 0).toLocaleString()} pts</b></span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Community Leaderboard</h2>
            <Card className="border-border/40">
              <CardContent className="p-3 space-y-1.5">
                {leaderboard.map((r: any, i: number) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const isYou = r.user_id === user?.id;
                  const name = (r.profiles as any)?.full_name || (r.profiles as any)?.username || "User";
                  return (
                    <div key={r.user_id} className={cn("flex items-center gap-3 p-2 rounded-lg", isYou && "bg-primary/5 border border-primary/20")}>
                      <span className="text-sm">{medals[i] ?? "🎯"}</span>
                      <span className="text-xs font-bold text-foreground flex-1 truncate">{isYou ? "You" : name}</span>
                      <span className="text-xs text-muted-foreground">{(r.lifetime_points || 0).toLocaleString()} pts</span>
                    </div>
                  );
                })}
                {user && !leaderboard.find((r: any) => r.user_id === user.id) && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-sm">🎯</span>
                    <span className="text-xs font-bold text-foreground flex-1">You</span>
                    <span className="text-xs text-muted-foreground">{(points.lifetime_points || 0).toLocaleString()} pts</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Milestone Rewards */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /> Milestone Rewards</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { ptsNum: 1000, pts: "1,000", reward: "$10 credit" },
              { ptsNum: 2500, pts: "2,500", reward: "Free upgrade" },
              { ptsNum: 5000, pts: "5,000", reward: "Lounge pass" },
              { ptsNum: 10000, pts: "10,000", reward: "Free flight" },
            ].map(({ ptsNum, ...m }) => ({ ...m, reached: points.points_balance >= ptsNum })).map(m => (
              <Card key={m.pts} className={cn("border-border/40", m.reached && "border-emerald-500/20 bg-emerald-500/5")}>
                <CardContent className="p-3 text-center">
                  <p className="text-sm font-bold text-foreground">{m.pts}</p>
                  <p className="text-[10px] text-muted-foreground">{m.reward}</p>
                  {m.reached && <Badge className="mt-1 bg-emerald-500/10 text-emerald-500 border-0 text-[8px]">Unlocked</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Compliance Disclaimer — Premium */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/30 bg-muted/20">
            <CardContent className="p-4">
              <h4 className="font-bold text-xs mb-1.5 flex items-center gap-2 text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                Important Information
              </h4>
              <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                {POINTS_COMPLIANCE.fullDisclaimer}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <MobileBottomNav />
    </div>
  );
}
