import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, Award, Star, Flame, Target, Lock, CheckCircle, Trophy,
  Zap, Heart, MessageCircle, Users, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { formatDistanceToNow } from "date-fns";

const ICON_MAP: Record<string, any> = {
  zap: Zap, star: Star, flame: Flame, target: Target,
  trophy: Trophy, heart: Heart, message: MessageCircle,
  users: Users, award: Award,
};

const COLOR_MAP: Record<string, string> = {
  yellow: "text-yellow-500 bg-yellow-500/10",
  blue: "text-blue-500 bg-blue-500/10",
  red: "text-red-500 bg-red-500/10",
  green: "text-green-500 bg-green-500/10",
  purple: "text-purple-500 bg-purple-500/10",
  orange: "text-orange-500 bg-orange-500/10",
  emerald: "text-emerald-500 bg-emerald-500/10",
  amber: "text-amber-500 bg-amber-500/10",
  primary: "text-primary bg-primary/10",
};

export default function BadgesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");

  // Load badge definitions from achievements table
  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ["badges-achievements"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("achievements")
        .select("id, name, description, icon, icon_color, category, condition_type, condition_value, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
    staleTime: 10 * 60_000,
  });

  // Load user's earned achievements
  const { data: earnedIds = new Set<string>(), data: earnedMap } = useQuery({
    queryKey: ["badges-earned", user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data } = await (supabase as any)
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", user.id);
      const map = new Map((data || []).map((r: any) => [r.achievement_id, r.earned_at]));
      return map;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  }) as { data: Map<string, string> };

  // User progress metrics for progress bars
  const { data: metrics } = useQuery({
    queryKey: ["badges-metrics", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const [posts, follows, likes, messages] = await Promise.all([
        (supabase as any).from("user_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        (supabase as any).from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
        (supabase as any).from("post_reactions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        (supabase as any).from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
      ]);
      return {
        post_count: posts.count ?? 0,
        follower_count: follows.count ?? 0,
        likes_count: likes.count ?? 0,
        message_count: messages.count ?? 0,
      } as Record<string, number>;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const getProgress = (conditionType: string | null, conditionValue: number | null): { progress: number; max: number } => {
    if (!conditionType || !conditionValue || !metrics) return { progress: 0, max: conditionValue ?? 1 };
    const val = metrics[conditionType] ?? 0;
    return { progress: Math.min(val, conditionValue), max: conditionValue };
  };

  const categories: string[] = ["all", ...new Set(achievements.map((a: any) => a.category).filter(Boolean) as string[])];
  const filtered = activeCategory === "all"
    ? achievements
    : achievements.filter((a: any) => a.category === activeCategory);

  const earnedCount = achievements.filter((a: any) => earnedMap?.has(a.id)).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead
        title="Badges & Achievements – ZIVO"
        description="Earn badges and unlock achievements on ZIVO. Show off your loyalty, engagement, and explorer status."
        canonical="/badges"
      />
      <div className="bg-gradient-to-b from-primary/20 to-background p-4 pt-6 safe-area-top">
        <div className="flex items-center gap-2 mb-6">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Award className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-ig-gradient">Badges & Achievements</h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
            </div>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground">{earnedCount}/{achievements.length}</p>
                <p className="text-sm text-muted-foreground">Badges Earned</p>
                <Progress value={achievements.length > 0 ? (earnedCount / achievements.length) * 100 : 0} className="h-2 mt-3" />
              </>
            )}
          </Card>
        </motion.div>
      </div>

      <div className="px-4">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className="cursor-pointer capitalize shrink-0"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">No badges in this category yet</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((badge: any, i: number) => {
            const isEarned = earnedMap?.has(badge.id) ?? false;
            const earnedAt = earnedMap?.get(badge.id);
            const IconComp = ICON_MAP[badge.icon?.toLowerCase()] ?? Award;
            const colorClass = COLOR_MAP[badge.icon_color?.toLowerCase()] ?? COLOR_MAP.primary;
            const { progress, max } = getProgress(badge.condition_type, badge.condition_value);

            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={`p-4 text-center relative ${!isEarned ? "opacity-60" : ""}`}>
                  {isEarned ? (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-2 ${colorClass}`}>
                    <IconComp className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{badge.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
                  {isEarned && earnedAt && (
                    <p className="text-[10px] text-green-600 font-medium">
                      Earned {formatDistanceToNow(new Date(earnedAt), { addSuffix: true })}
                    </p>
                  )}
                  {!isEarned && badge.condition_value && (
                    <>
                      <Progress value={(progress / max) * 100} className="h-1.5 mb-1" />
                      <p className="text-xs text-muted-foreground">{progress}/{max}</p>
                    </>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
