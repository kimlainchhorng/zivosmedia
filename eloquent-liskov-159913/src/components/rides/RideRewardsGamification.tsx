/**
 * RideRewardsGamification — Badges, streaks, leaderboard, referral challenges
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Flame, Trophy, Target, Star, Zap, Gift, TrendingUp, Crown, Medal, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const badges = [
  { id: "first-ride", name: "First Ride", icon: Star, color: "text-yellow-500", earned: true, date: "Jan 15" },
  { id: "night-owl", name: "Night Owl", icon: Zap, color: "text-purple-400", earned: true, date: "Feb 3" },
  { id: "eco-warrior", name: "Eco Warrior", icon: Target, color: "text-green-500", earned: true, date: "Feb 20" },
  { id: "road-king", name: "Road King", icon: Crown, color: "text-amber-500", earned: false, progress: 72, requirement: "Complete 50 rides" },
  { id: "social-rider", name: "Social Rider", icon: Users, color: "text-blue-400", earned: false, progress: 40, requirement: "Share 10 rides" },
  { id: "streak-master", name: "Streak Master", icon: Flame, color: "text-orange-500", earned: false, progress: 60, requirement: "7-day ride streak" },
];

const leaderboard = [
  { rank: 1, name: "Alex M.", points: 4850, avatar: "🏆" },
  { rank: 2, name: "Sarah K.", points: 4200, avatar: "🥈" },
  { rank: 3, name: "You", points: 3900, avatar: "🥉", isUser: true },
  { rank: 4, name: "James R.", points: 3650, avatar: "4" },
  { rank: 5, name: "Lisa T.", points: 3400, avatar: "5" },
];

const challenges = [
  { id: 1, title: "Weekend Warrior", desc: "Complete 5 weekend rides", reward: "500 pts", progress: 3, total: 5, deadline: "3 days left", icon: Calendar },
  { id: 2, title: "Refer a Friend", desc: "Invite 3 friends to ZIVO Rides", reward: "1,000 pts + $10 credit", progress: 1, total: 3, deadline: "5 days left", icon: Gift },
  { id: 3, title: "Peak Performer", desc: "Rate 10 rides this month", reward: "300 pts", progress: 7, total: 10, deadline: "12 days left", icon: TrendingUp },
];

type TabId = "badges" | "leaderboard" | "challenges" | "streaks";
const tabs: { id: TabId; label: string; icon: typeof Award }[] = [
  { id: "badges", label: "Badges", icon: Medal },
  { id: "leaderboard", label: "Board", icon: Trophy },
  { id: "challenges", label: "Challenges", icon: Target },
  { id: "streaks", label: "Streaks", icon: Flame },
];

export default function RideRewardsGamification() {
  const [activeTab, setActiveTab] = useState<TabId>("badges");

  const currentStreak = 4;
  const bestStreak = 12;
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const streakDays = [true, true, true, true, false, false, false];

  return (
    <div className="space-y-4">
      {/* Points banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 rounded-2xl p-4 border border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Ride Points</p>
            <p className="text-3xl font-black text-foreground">3,900</p>
            <p className="text-xs text-primary font-semibold mt-0.5">Gold Tier • 1,100 to Platinum</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
            <Award className="w-8 h-8 text-primary" />
          </div>
        </div>
        <Progress value={78} className="mt-3 h-2" />
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {activeTab === "badges" && (
            <div className="grid grid-cols-3 gap-3">
              {badges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <motion.div
                    key={badge.id}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "rounded-xl p-3 border text-center space-y-1.5",
                      badge.earned
                        ? "bg-card border-primary/20"
                        : "bg-muted/20 border-border/30 opacity-70"
                    )}
                  >
                    <div className={cn("w-10 h-10 mx-auto rounded-full flex items-center justify-center", badge.earned ? "bg-primary/15" : "bg-muted/40")}>
                      <Icon className={cn("w-5 h-5", badge.earned ? badge.color : "text-muted-foreground")} />
                    </div>
                    <p className="text-[11px] font-bold text-foreground leading-tight">{badge.name}</p>
                    {badge.earned ? (
                      <p className="text-[9px] text-muted-foreground">{badge.date}</p>
                    ) : (
                      <>
                        <Progress value={badge.progress} className="h-1" />
                        <p className="text-[9px] text-muted-foreground">{badge.requirement}</p>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border",
                    entry.isUser ? "bg-primary/10 border-primary/30" : "bg-card border-border/30"
                  )}
                >
                  <span className="text-lg w-8 text-center">{entry.avatar}</span>
                  <div className="flex-1">
                    <p className={cn("text-sm font-bold", entry.isUser && "text-primary")}>{entry.name}</p>
                  </div>
                  <p className="text-sm font-black text-foreground">{entry.points.toLocaleString()} pts</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "challenges" && (
            <div className="space-y-3">
              {challenges.map((ch) => {
                const Icon = ch.icon;
                return (
                  <div key={ch.id} className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground">{ch.title}</p>
                          <span className="text-[10px] text-muted-foreground">{ch.deadline}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{ch.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(ch.progress / ch.total) * 100} className="flex-1 h-2" />
                      <span className="text-[11px] font-bold text-foreground">{ch.progress}/{ch.total}</span>
                    </div>
                    <p className="text-xs font-semibold text-primary">🎁 {ch.reward}</p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "streaks" && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-4 border border-border/30 text-center space-y-3">
                <Flame className="w-12 h-12 text-orange-500 mx-auto" />
                <div>
                  <p className="text-4xl font-black text-foreground">{currentStreak}</p>
                  <p className="text-xs text-muted-foreground font-medium">Day Streak</p>
                </div>
                <p className="text-xs text-muted-foreground">Best: {bestStreak} days</p>

                <div className="flex justify-center gap-2 pt-2">
                  {weekDays.map((day, i) => (
                    <div key={i} className="text-center space-y-1">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                        streakDays[i]
                          ? "bg-orange-500 text-white"
                          : "bg-muted/30 text-muted-foreground"
                      )}>
                        {streakDays[i] ? "✓" : ""}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{day}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
                <p className="text-sm font-bold text-foreground">Streak Rewards</p>
                {[
                  { days: 3, reward: "50 bonus pts", done: true },
                  { days: 7, reward: "200 pts + badge", done: false },
                  { days: 14, reward: "500 pts + $5 credit", done: false },
                  { days: 30, reward: "1,500 pts + Gold badge", done: false },
                ].map((r) => (
                  <div key={r.days} className={cn("flex items-center justify-between py-1.5", r.done && "opacity-60")}>
                    <span className="text-xs text-foreground">{r.days}-day streak</span>
                    <span className={cn("text-xs font-bold", r.done ? "text-muted-foreground line-through" : "text-primary")}>{r.reward}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
