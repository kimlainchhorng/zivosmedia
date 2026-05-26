/**
 * RideLoyaltyRewards — Points system, tier progression, streak bonuses, partner perks
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Flame, Gift, TrendingUp, Crown, Zap, Award, CheckCircle, Lock, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Perk {
  id: string;
  partner: string;
  offer: string;
  pointsCost: number;
  category: string;
  redeemed: boolean;
}

export default function RideLoyaltyRewards() {
  const [section, setSection] = useState<"points" | "tiers" | "streaks" | "perks">("points");
  const currentPoints = 2840;
  const totalEarned = 12500;
  const currentTier = "Traveler";
  const nextTier = "Elite";
  const tierProgress = 68;
  const streakDays = 12;
  const bestStreak = 21;

  const [points, setPoints] = useState(currentPoints);
  const [perks, setPerks] = useState<Perk[]>([
    { id: "1", partner: "Starbucks", offer: "Free Grande Drink", pointsCost: 500, category: "Food & Drink", redeemed: false },
    { id: "2", partner: "Spotify", offer: "1 Month Premium", pointsCost: 1200, category: "Entertainment", redeemed: false },
    { id: "3", partner: "Nike", offer: "15% Off Purchase", pointsCost: 800, category: "Shopping", redeemed: false },
    { id: "4", partner: "AMC", offer: "2 Movie Tickets", pointsCost: 1500, category: "Entertainment", redeemed: true },
    { id: "5", partner: "Shell", offer: "$10 Gas Credit", pointsCost: 600, category: "Auto", redeemed: false },
  ]);

  const sections = [
    { id: "points" as const, label: "Points", icon: Star },
    { id: "tiers" as const, label: "Tiers", icon: Crown },
    { id: "streaks" as const, label: "Streaks", icon: Flame },
    { id: "perks" as const, label: "Perks", icon: Gift },
  ];

  const tiers = [
    { name: "Explorer", minPoints: 0, color: "bg-muted", icon: "🌱", benefits: ["Earn 1x points", "Basic support"] },
    { name: "Traveler", minPoints: 5000, color: "bg-primary/20", icon: "✈️", benefits: ["Earn 1.5x points", "Priority matching", "Free cancellation"] },
    { name: "Elite", minPoints: 15000, color: "bg-amber-500/20", icon: "👑", benefits: ["Earn 2x points", "VIP support", "Free upgrades", "Airport lounge"] },
  ];

  const pointsHistory = [
    { label: "Morning ride to Office", points: "+45", time: "Today" },
    { label: "5-star rating bonus", points: "+10", time: "Today" },
    { label: "Streak bonus (Day 12)", points: "+50", time: "Today" },
    { label: "Redeemed AMC tickets", points: "-1500", time: "Yesterday" },
    { label: "Evening ride home", points: "+38", time: "Yesterday" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button type="button" key={s.id} onClick={() => setSection(s.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", section === s.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* Points Dashboard */}
          {section === "points" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/20 p-5 text-center">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-1" />
                <p className="text-3xl font-black text-foreground">{points.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground font-bold mt-1">Available Points</p>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <div>
                    <p className="text-sm font-black text-foreground">{totalEarned.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Lifetime Earned</p>
                  </div>
                  <div className="w-px h-6 bg-border/50" />
                  <div>
                    <p className="text-sm font-black text-foreground">1.5x</p>
                    <p className="text-[9px] text-muted-foreground">Current Rate</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Activity</h4>
                {pointsHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <div>
                      <p className="text-xs font-bold text-foreground">{h.label}</p>
                      <p className="text-[10px] text-muted-foreground">{h.time}</p>
                    </div>
                    <span className={cn("text-sm font-black", h.points.startsWith("+") ? "text-primary" : "text-destructive")}>{h.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tier Progression */}
          {section === "tiers" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">Current: {currentTier} ✈️</p>
                    <p className="text-[10px] text-muted-foreground">Next: {nextTier} at 15,000 pts</p>
                  </div>
                  <Badge className="text-[8px] font-bold gap-0.5"><TrendingUp className="w-2.5 h-2.5" /> {tierProgress}%</Badge>
                </div>
                <Progress value={tierProgress} className="h-2" />
                <p className="text-[10px] text-muted-foreground text-center">{(15000 - totalEarned).toLocaleString()} points to {nextTier}</p>
              </div>

              {tiers.map((tier, i) => {
                const isCurrent = tier.name === currentTier;
                const isLocked = i > tiers.findIndex(t => t.name === currentTier);
                return (
                  <div key={tier.name} className={cn("rounded-2xl border p-4 space-y-2", isCurrent ? "bg-primary/5 border-primary/30" : "bg-card border-border/40", isLocked && "opacity-60")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tier.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-foreground">{tier.name}</p>
                          <p className="text-[10px] text-muted-foreground">{tier.minPoints.toLocaleString()}+ points</p>
                        </div>
                      </div>
                      {isCurrent && <Badge className="text-[8px] font-bold">Current</Badge>}
                      {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="space-y-1">
                      {tier.benefits.map(b => (
                        <div key={b} className="flex items-center gap-1.5">
                          <CheckCircle className={cn("w-3 h-3", isLocked ? "text-muted-foreground/40" : "text-primary")} />
                          <span className="text-[10px] text-foreground">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Streaks */}
          {section === "streaks" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-5 text-center">
                <Flame className="w-10 h-10 text-orange-500 mx-auto mb-1" />
                <p className="text-3xl font-black text-foreground">{streakDays}</p>
                <p className="text-xs text-muted-foreground font-bold">Day Ride Streak 🔥</p>
                <p className="text-[10px] text-muted-foreground mt-1">Best: {bestStreak} days</p>
              </div>

              {/* Weekly streak visualization */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This Week</h4>
                <div className="flex gap-2 justify-between">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
                    const completed = i < 5;
                    const isToday = i === 4;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors", completed ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted/30 text-muted-foreground")}>
                          {completed ? <CheckCircle className="w-4 h-4" /> : d}
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground">{d}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Streak milestones */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Streak Bonuses</h4>
                {[
                  { days: 7, bonus: "+100 pts", achieved: true },
                  { days: 14, bonus: "+300 pts", achieved: false },
                  { days: 21, bonus: "+500 pts + Free Ride", achieved: false },
                  { days: 30, bonus: "+1000 pts + Tier Upgrade", achieved: false },
                ].map(m => (
                  <div key={m.days} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                    <div className="flex items-center gap-2">
                      {m.achieved ? <CheckCircle className="w-4 h-4 text-primary" /> : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}
                      <div>
                        <p className="text-xs font-bold text-foreground">{m.days}-Day Streak</p>
                        <p className="text-[10px] text-muted-foreground">{m.bonus}</p>
                      </div>
                    </div>
                    {!m.achieved && <span className="text-[10px] font-bold text-muted-foreground">{m.days - streakDays} days left</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partner Perks */}
          {section === "perks" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Partner Perks</h3>
                  <Badge variant="outline" className="text-[9px] font-bold">{points.toLocaleString()} pts available</Badge>
                </div>

                <div className="space-y-2">
                  {perks.map(perk => (
                    <div key={perk.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors", perk.redeemed ? "bg-muted/10 border-border/20 opacity-60" : "bg-muted/20 border-border/40")}>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-foreground">{perk.partner}</p>
                        <p className="text-[10px] text-muted-foreground">{perk.offer}</p>
                      </div>
                      {perk.redeemed ? (
                        <Badge variant="secondary" className="text-[8px] font-bold">Redeemed</Badge>
                      ) : (
                        <Button size="sm" variant={points >= perk.pointsCost ? "default" : "outline"} className="h-7 text-[10px] font-bold rounded-lg" disabled={points < perk.pointsCost} onClick={() => {
                          setPoints(p => p - perk.pointsCost);
                          setPerks(prev => prev.map(pk => pk.id === perk.id ? { ...pk, redeemed: true } : pk));
                          toast.success(`${perk.partner} perk redeemed!`);
                        }}>
                          {perk.pointsCost} pts
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-center text-muted-foreground">Perks provided by ZIVO partner brands</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
