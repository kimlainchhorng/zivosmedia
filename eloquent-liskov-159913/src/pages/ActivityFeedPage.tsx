import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, MessageCircle, UserPlus, Star, ShoppingBag, Award, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import SEOHead from "@/components/SEOHead";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import LoadFailureCard from "@/components/reliability/LoadFailureCard";

interface Activity {
  id: string;
  type: "like" | "comment" | "follow" | "review" | "purchase" | "achievement" | "post";
  user: string;
  action: string;
  target?: string;
  time: string;
  preview?: string;
}

function categoryToType(category: string): Activity["type"] {
  if (category.includes("like") || category.includes("heart")) return "like";
  if (category.includes("comment") || category.includes("reply")) return "comment";
  if (category.includes("follow") || category.includes("friend")) return "follow";
  if (category.includes("review") || category.includes("rating")) return "review";
  if (category.includes("purchase") || category.includes("order") || category.includes("payment")) return "purchase";
  if (category.includes("badge") || category.includes("achievement") || category.includes("reward")) return "achievement";
  return "post";
}

const ICON_MAP: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  review: Star,
  purchase: ShoppingBag,
  achievement: Award,
  post: Zap,
};

const COLOR_MAP: Record<string, string> = {
  like: "text-red-500 bg-red-500/10",
  comment: "text-blue-500 bg-blue-500/10",
  follow: "text-primary bg-primary/10",
  review: "text-yellow-500 bg-yellow-500/10",
  purchase: "text-green-500 bg-green-500/10",
  achievement: "text-purple-500 bg-purple-500/10",
  post: "text-orange-500 bg-orange-500/10",
};

export default function ActivityFeedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [hasRefreshError, setHasRefreshError] = useState(false);
  const activitiesRef = useRef<Activity[]>([]);

  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  const loadActivities = useCallback(async () => {
    if (!user) {
      setActivities([]);
      setLoadError(false);
      setHasRefreshError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(false);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, category, created_at, is_read")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const nextActivities = (data || []).map((n) => ({
        id: n.id,
        type: categoryToType(n.category ?? ""),
        user: n.title,
        action: n.body,
        time: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
      })) as Activity[];

      setActivities(nextActivities);
      setHasRefreshError(false);
    } catch (error) {
      console.error("[ActivityFeedPage] failed to load activity:", error);
      if (activitiesRef.current.length > 0) {
        setHasRefreshError(true);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const filters = ["all", "likes", "comments", "follows", "sales"];
  const filterTypeMap: Record<string, string[]> = {
    all: [],
    likes: ["like"],
    comments: ["comment"],
    follows: ["follow"],
    sales: ["purchase", "review"],
  };

  const filtered = filter === "all" ? activities : activities.filter(a => filterTypeMap[filter]?.includes(a.type));

  // Group by time period (notifications within last 24h vs earlier)
  const today = filtered.filter(a => !a.time.includes("day") && !a.time.includes("month") && !a.time.includes("year"));
  const earlier = filtered.filter(a => a.time.includes("day") || a.time.includes("month") || a.time.includes("year"));

  return (
    <div className="min-h-[100dvh] bg-background pb-nav safe-area-bottom">
      <SEOHead
        title="Activity Feed – ZIVO"
        description="See your latest activity, likes, comments, and follows on ZIVO."
        canonical="/activity"
        noIndex
      />
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-ig-gradient">Activity</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <Badge key={f} variant={filter === f ? "default" : "outline"} className="cursor-pointer capitalize shrink-0"
              onClick={() => setFilter(f)}>
              {f}
            </Badge>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border">
        {loadError && activities.length === 0 ? (
          <LoadFailureCard
            className="px-4 py-10"
            title="Activity refresh failed"
            description="We couldn&apos;t load your latest activity right now. Retry to restore notifications and account events."
            onRetry={() => void loadActivities()}
            onSecondary={() => navigate("/feed")}
            secondaryLabel="Go Feed"
            trackingContext="activity"
          />
        ) : loading && activities.length === 0 ? (
          <div className="space-y-0">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {hasRefreshError && activities.length > 0 && (
              <DegradedDataBanner
                className="px-4 py-3"
                message="Showing cached activity. Refresh failed."
                onRetry={() => void loadActivities()}
                trackingContext="activity"
              />
            )}

            {today.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground px-4 py-2 bg-muted/50">Today</p>
                {today.map((activity, i) => (
                  <ActivityRow key={activity.id} activity={activity} index={i} />
                ))}
              </>
            )}
            {earlier.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground px-4 py-2 bg-muted/50">Earlier</p>
                {earlier.map((activity, i) => (
                  <ActivityRow key={activity.id} activity={activity} index={i} />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No activity yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ activity, index }: { activity: Activity; index: number }) {
  const Icon = ICON_MAP[activity.type];
  const colorClass = COLOR_MAP[activity.type];

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{activity.user}</span>{" "}
          {activity.action}
        </p>
        {activity.target && <p className="text-xs text-muted-foreground">{activity.target}</p>}
        {activity.preview && <p className="text-xs text-muted-foreground italic">"{activity.preview}"</p>}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
    </motion.div>
  );
}
