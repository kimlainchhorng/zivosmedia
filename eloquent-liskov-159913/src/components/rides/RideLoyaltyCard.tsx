/**
 * RideLoyaltyCard — Enhanced with streaks, achievements, referrals, leaderboard
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, Flame, Gift, Zap, Lock, CheckCircle, Award, TrendingUp, Sparkles, Trophy, Users, Share2, Medal, Target, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tiers = [
  { id: "explorer", name: "Explorer", minPoints: 0, color: "text-muted-foreground", bg: "bg-muted/30" },
  { id: "traveler", name: "Traveler", minPoints: 500, color: "text-sky-500", bg: "bg-sky-500/10" },
  { id: "elite", name: "Elite", minPoints: 2000, color: "text-amber-500", bg: "bg-amber-500/10" },
];

const perks = [
  { id: "free-ride", name: "Free Ride (up to $15)", points: 500, icon: Zap, available: true },
  { id: "priority", name: "Priority Matching", points: 300, icon: Crown, available: true },
  { id: "upgrade", name: "Premium Upgrade", points: 750, icon: Sparkles, available: false },
  { id: "airport-lounge", name: "Airport Lounge Pass", points: 2000, icon: Star, available: false },
];

const challenges = [
  { id: "weekend", name: "Weekend Warrior", desc: "Take 3 rides this weekend", progress: 1, goal: 3, reward: 50, icon: Flame },
  { id: "green", name: "Go Green", desc: "Take 5 shared rides", progress: 3, goal: 5, reward: 75, icon: TrendingUp },
  { id: "explorer", name: "City Explorer", desc: "Visit 3 new neighborhoods", progress: 2, goal: 3, reward: 100, icon: Award },
];

const achievements = [
  { id: "first-ride", name: "First Ride", desc: "Complete your first trip", unlocked: true, icon: "🚗", date: "Jan 15" },
  { id: "night-owl", name: "Night Owl", desc: "10 rides after midnight", unlocked: true, icon: "🦉", date: "Feb 8" },
  { id: "globe-trotter", name: "Globe Trotter", desc: "Ride in 5 cities", unlocked: false, icon: "🌍", progress: 3, goal: 5 },
  { id: "big-tipper", name: "Big Tipper", desc: "Tip drivers 20 times", unlocked: false, icon: "💰", progress: 14, goal: 20 },
  { id: "century", name: "Century Rider", desc: "Complete 100 rides", unlocked: false, icon: "🏅", progress: 67, goal: 100 },
];

const leaderboard = [
  { rank: 1, name: "Jessica R.", points: 4250, tier: "Elite" },
  { rank: 2, name: "David K.", points: 3800, tier: "Elite" },
  { rank: 3, name: "You", points: 1250, tier: "Traveler", isYou: true },
  { rank: 4, name: "Sam L.", points: 980, tier: "Traveler" },
  { rank: 5, name: "Maria G.", points: 650, tier: "Explorer" },
];

type Tab = "overview" | "achievements" | "referrals" | "leaderboard";

export default function RideLoyaltyCard() {
  const [points] = useState(1250);
  const [streak] = useState(7);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showPerks, setShowPerks] = useState(false);

  const currentTier = tiers.reduce((acc, t) => (points >= t.minPoints ? t : acc), tiers[0]);
  const nextTier = tiers[tiers.indexOf(currentTier) + 1];
  const tierProgress = nextTier ? ((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100 : 100;

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "achievements" as const, label: "Badges" },
    { id: "referrals" as const, label: "Referrals" },
    { id: "leaderboard" as const, label: "Ranks" },
  ];

  return (
    <div className="space-y-4">
      {/* Points card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-amber-500/5 to-primary/10 border border-primary/20 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Crown className={cn("w-5 h-5", currentTier.color)} />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{currentTier.name} Member</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-foreground">{points.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground font-bold">pts</span>
          </div>
          {nextTier && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">{nextTier.minPoints - points} pts to {nextTier.name}</span>
                <span className="font-bold text-primary">{Math.round(tierProgress)}%</span>
              </div>
              <Progress value={tierProgress} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20 p-4">
        <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center">
          <Flame className="w-6 h-6 text-orange-500" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-bold text-foreground">{streak}-day ride streak!</span>
          <p className="text-[10px] text-muted-foreground">+{streak * 5} bonus pts earned</p>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={cn("w-3 h-3 rounded-full", i < streak ? "bg-orange-500" : "bg-muted/50")} />
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {tabs.map(tab => (
          <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Active challenges */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Active Challenges</h3>
                {challenges.map(ch => {
                  const Icon = ch.icon;
                  const pct = (ch.progress / ch.goal) * 100;
                  return (
                    <div key={ch.id} className="rounded-xl bg-card border border-border/40 p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{ch.name}</span>
                            <Badge variant="outline" className="text-[8px] font-bold text-primary">+{ch.reward} pts</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{ch.desc}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-[9px] font-bold text-muted-foreground">{ch.progress}/{ch.goal}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Redeemable perks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Redeem Points</h3>
                  <button type="button" onClick={() => setShowPerks(!showPerks)} className="text-[10px] font-bold text-primary">{showPerks ? "Show less" : "View all"}</button>
                </div>
                {perks.slice(0, showPerks ? perks.length : 2).map(perk => {
                  const Icon = perk.icon;
                  const canRedeem = points >= perk.points;
                  return (
                    <div key={perk.id} className={cn("rounded-xl border p-3 flex items-center gap-3", canRedeem ? "bg-card border-border/40" : "bg-muted/10 border-border/20 opacity-60")}>
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", canRedeem ? "bg-primary/10" : "bg-muted/30")}>
                        <Icon className={cn("w-4 h-4", canRedeem ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{perk.name}</p>
                        <p className="text-[10px] text-muted-foreground">{perk.points} points</p>
                      </div>
                      <Button size="sm" variant={canRedeem ? "default" : "outline"} className="h-8 text-[10px] font-bold rounded-lg px-3" disabled={!canRedeem} onClick={() => toast.success(`Redeemed: ${perk.name}!`)}>
                        {canRedeem ? "Redeem" : <Lock className="w-3 h-3" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "achievements" && (
            <div className="space-y-2">
              {achievements.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className={cn("rounded-xl border p-3.5 flex items-center gap-3", a.unlocked ? "bg-card border-border/40" : "bg-muted/10 border-border/20")}>
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-xl", a.unlocked ? "bg-amber-500/10" : "bg-muted/30 grayscale")}>
                    {a.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-xs font-bold", a.unlocked ? "text-foreground" : "text-muted-foreground")}>{a.name}</p>
                      {a.unlocked && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                    {!a.unlocked && a.progress !== undefined && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={(a.progress / a.goal!) * 100} className="h-1.5 flex-1" />
                        <span className="text-[9px] font-bold text-muted-foreground">{a.progress}/{a.goal}</span>
                      </div>
                    )}
                    {a.unlocked && a.date && <p className="text-[9px] text-emerald-500 font-bold mt-0.5">Unlocked {a.date}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "referrals" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-primary/5 border border-emerald-500/20 p-5 text-center">
                <Gift className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-foreground">Give $10, Get $10</h3>
                <p className="text-[11px] text-muted-foreground mt-1">Share your code and both of you get $10 ride credit</p>
                <div className="flex items-center gap-2 mt-4 mx-auto max-w-[200px] bg-card/80 rounded-xl px-4 py-2.5 border border-border/40">
                  <span className="text-sm font-black text-foreground tracking-widest flex-1">ZIVO-AK7M</span>
                  <button type="button" onClick={() => { navigator.clipboard.writeText("ZIVO-AK7M"); toast.success("Code copied!"); }}>
                    <Copy className="w-4 h-4 text-primary" />
                  </button>
                </div>
                <Button className="mt-4 h-10 rounded-xl text-xs font-bold gap-2" onClick={() => {
                  const msg = "Join me on ZIVO and get $10 off your first ride! Use code ZIVO-AK7M";
                  if (navigator.share) { navigator.share({ title: "ZIVO Referral", text: msg }).catch(() => {}); }
                  else { navigator.clipboard.writeText(msg).then(() => toast.success("Share link copied!")); }
                }}>
                  <Share2 className="w-3.5 h-3.5" /> Share with Friends
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Referral Stats</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Invited", value: "12", icon: Users },
                    { label: "Joined", value: "8", icon: CheckCircle },
                    { label: "Earned", value: "$80", icon: Gift },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl bg-card border border-border/40 p-3 text-center">
                      <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-black text-foreground">{s.value}</p>
                      <p className="text-[9px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground px-1">Top riders this month in your city</p>
              {leaderboard.map((entry, i) => (
                <motion.div key={entry.rank} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={cn("flex items-center gap-3 p-3 rounded-xl border", entry.isYou ? "bg-primary/5 border-primary/30" : "bg-card border-border/40")}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-sm", entry.rank === 1 ? "bg-amber-500/15 text-amber-500" : entry.rank === 2 ? "bg-slate-400/15 text-slate-400" : entry.rank === 3 && entry.isYou ? "bg-primary/15 text-primary" : "bg-muted/30 text-muted-foreground")}>
                    {entry.rank <= 3 ? <Medal className="w-4 h-4" /> : entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-bold", entry.isYou ? "text-primary" : "text-foreground")}>
                      {entry.name} {entry.isYou && "⭐"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{entry.tier}</p>
                  </div>
                  <span className="text-sm font-black text-foreground">{entry.points.toLocaleString()}</span>
                  <span className="text-[9px] text-muted-foreground">pts</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tier benefits */}
      {activeTab === "overview" && (
        <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your {currentTier.name} Benefits</h3>
          {["2x points on shared rides", "Priority customer support", "Monthly surprise rewards"].map(benefit => (
            <div key={benefit} className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs text-foreground">{benefit}</span>
            </div>
          ))}
          {nextTier && <p className="text-[10px] text-primary font-bold mt-2">Unlock {nextTier.name} for exclusive perks →</p>}
        </div>
      )}
    </div>
  );
}
