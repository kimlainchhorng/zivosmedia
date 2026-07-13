import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Trophy, Medal, Crown, TrendingUp, Flame, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar?: string | null;
  score: number;
  user_id: string;
  tier: string;
}

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
};

const rankBg = (rank: number) => {
  if (rank === 1) return "bg-yellow-500/10 border-yellow-500/20";
  if (rank === 2) return "bg-gray-500/5 border-gray-500/10";
  if (rank === 3) return "bg-amber-500/5 border-amber-500/10";
  return "";
};

const TIER_COLOR: Record<string, string> = {
  platinum: "text-blue-300",
  gold: "text-yellow-500",
  silver: "text-gray-400",
  bronze: "text-amber-700",
};

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState("all-time");

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const scoreField = period === "weekly" ? "points_balance" : "lifetime_points";
      const { data, error } = await supabase
        .from("loyalty_points")
        .select(`user_id, points_balance, lifetime_points, tier, profiles!inner(full_name, avatar_url)`)
        .order(scoreField, { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((row: any, i) => ({
        rank: i + 1,
        user_id: row.user_id,
        name: row.profiles?.full_name || "User",
        avatar: row.profiles?.avatar_url,
        score: period === "weekly" ? row.points_balance : row.lifetime_points,
        tier: row.tier || "bronze",
      })) as LeaderboardEntry[];
    },
  });

  const { data: myPoints } = useQuery({
    queryKey: ["my-points", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("loyalty_points").select("points_balance, lifetime_points, tier").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const myRank = leaderboard.findIndex(e => e.user_id === user?.id) + 1 || "—";
  const myScore = period === "weekly" ? (myPoints?.points_balance ?? 0) : (myPoints?.lifetime_points ?? 0);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-background pb-20 safe-area-top">
      <SEOHead
        title="Leaderboard – ZIVO | Top Earners & Rewards"
        description="See who's leading the ZIVO loyalty leaderboard. Earn points, climb the ranks, and win rewards."
        canonical="/leaderboard"
      />
      <div className="bg-gradient-to-b from-primary/20 to-background p-4 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-ig-gradient">Leaderboard</h1>
        </div>

        {/* My Position */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 mb-4 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-primary">
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">Y</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Your Rank</p>
                    <p className="text-xs text-muted-foreground">#{myRank} · {myScore.toLocaleString()} pts</p>
                  </div>
                </div>
                <Badge variant="outline" className={TIER_COLOR[myPoints?.tier ?? "bronze"]}>
                  {myPoints?.tier ?? "bronze"}
                </Badge>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Period Selector */}
        <div className="flex gap-2 mb-4">
          {["weekly", "all-time"].map((p) => (
            <Badge key={p} variant={period === p ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => setPeriod(p)}>
              {p === "all-time" ? "All Time" : "Weekly"}
            </Badge>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && leaderboard.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
          No data yet
        </div>
      )}

      {/* Top 3 Podium */}
      {!isLoading && top3.length >= 3 && (
        <div className="flex items-end justify-center gap-3 px-4 mb-6">
          {[top3[1], top3[0], top3[2]].map((entry, i) => {
            const heights = ["h-20", "h-28", "h-16"];
            const sizes = ["h-12 w-12", "h-16 w-16", "h-12 w-12"];
            return (
              <motion.div key={entry.user_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center">
                <Avatar className={`${sizes[i]} border-2 ${entry.rank === 1 ? "border-yellow-500" : "border-muted"} mb-1`}>
                  <AvatarImage src={entry.avatar ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">{entry.name[0]}</AvatarFallback>
                </Avatar>
                <p className="text-xs font-medium text-foreground truncate max-w-[80px] text-center">{entry.name}</p>
                <p className="text-xs text-muted-foreground">{entry.score.toLocaleString()}</p>
                <div className={`${heights[i]} w-20 rounded-t-lg mt-1 flex items-start justify-center pt-2 ${
                  entry.rank === 1 ? "bg-yellow-500/20" : entry.rank === 2 ? "bg-gray-500/10" : "bg-amber-500/10"
                }`}>
                  {rankIcon(entry.rank)}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full List */}
      <div className="px-4 space-y-2">
        {rest.map((entry, i) => (
          <motion.div key={entry.user_id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className={`p-3 flex items-center gap-3 ${rankBg(entry.rank)}`}>
              <div className="w-6 flex justify-center shrink-0">{rankIcon(entry.rank)}</div>
              <Avatar className="h-9 w-9">
                <AvatarImage src={entry.avatar ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{entry.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                <p className={`text-[10px] capitalize ${TIER_COLOR[entry.tier] ?? "text-muted-foreground"}`}>{entry.tier}</p>
              </div>
              <span className="text-sm font-semibold text-foreground">{entry.score.toLocaleString()}</span>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
