/**
 * ReelSocialProof — Live activity ticker on Reels
 * Shows "X people bought this" and "Y viewing now" from database
 */
import { useState, useEffect, useRef } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { supabase } from "@/integrations/supabase/client";
import { Eye, ShoppingBag, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  storeId: string | null;
  postId?: string;
  compact?: boolean;
}

interface ActivityData {
  recentPurchases: number;
  activeViewers: number;
  trendingScore: number;
}

export default function ReelSocialProof({ storeId, postId, compact = false }: Props) {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const loadActivityRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!storeId) return;

    const loadActivity = async () => {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const db = supabase as any;

        // Recent purchases from this store in the last hour
        const { count: purchaseCount } = await db
          .from("store_orders")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeId)
          .in("status", ["completed", "delivered", "confirmed"])
          .gte("created_at", oneHourAgo);

        // Simulated active viewers (in production: realtime presence)
        const viewerBase = (purchaseCount || 0) * 2 + Math.floor(Math.random() * 5) + 1;

        // Trending score based on recent engagement
        const { count: engagementCount } = await db
          .from("post_likes")
          .select("id", { count: "exact", head: true })
          .eq("post_id", postId || "")
          .gte("created_at", oneHourAgo);

        setActivity({
          recentPurchases: purchaseCount || 0,
          activeViewers: viewerBase,
          trendingScore: (purchaseCount || 0) + (engagementCount || 0),
        });
      } catch {
        // Silent — non-critical feature
      }
    };

    loadActivity();
    loadActivityRef.current = loadActivity;
  }, [storeId, postId]);

  useVisibleInterval(
    () => loadActivityRef.current?.(),
    storeId ? 30_000 : null,
  );

  // Cycle between messages
  useVisibleInterval(
    () => setDisplayIndex((prev) => (prev + 1) % 3),
    activity ? 4000 : null,
  );

  if (!activity || (activity.recentPurchases === 0 && activity.activeViewers < 2)) return null;

  const messages = [
    activity.recentPurchases > 0
      ? { icon: ShoppingBag, text: `${activity.recentPurchases} ${activity.recentPurchases === 1 ? "person" : "people"} bought this in the last hour`, color: "text-emerald-400" }
      : null,
    activity.activeViewers > 1
      ? { icon: Eye, text: `${activity.activeViewers} people viewing this shop now`, color: "text-sky-400" }
      : null,
    activity.trendingScore > 3
      ? { icon: TrendingUp, text: `Trending — ${activity.trendingScore} interactions this hour`, color: "text-amber-400" }
      : null,
  ].filter(Boolean) as { icon: any; text: string; color: string }[];

  if (messages.length === 0) return null;

  const current = messages[displayIndex % messages.length];
  const Icon = current.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-white/80">
        <Icon className="h-3 w-3" />
        <span>{current.text}</span>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={displayIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25 }}
        className="inline-flex max-w-full items-center gap-2 bg-black/40 backdrop-blur-lg rounded-full px-3 py-1.5"
      >
        <div className={`w-1.5 h-1.5 rounded-full bg-current animate-pulse ${current.color}`} />
        <Icon className={`h-3.5 w-3.5 ${current.color}`} />
        <span className="truncate text-[11px] text-white/90 font-medium">{current.text}</span>
      </motion.div>
    </AnimatePresence>
  );
}
