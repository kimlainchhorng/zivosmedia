/**
 * FitnessHubPage — /fitness
 * View your activity history. Cards link straight back to chat for sharing.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FitnessActivityCard from "@/components/fitness/FitnessActivityCard";
import HubScaffold, { type HubStep } from "@/components/hubs/HubScaffold";
import Activity from "lucide-react/dist/esm/icons/activity";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Plus from "lucide-react/dist/esm/icons/plus";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Share2 from "lucide-react/dist/esm/icons/share-2";

interface FitnessRow {
  id: string;
  activity_type: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  steps: number | null;
  calories: number | null;
  recorded_at: string;
}

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const STEPS: HubStep[] = [
  { icon: Activity, title: "Track", desc: "Log workouts, steps, distance & calories" },
  { icon: TrendingUp, title: "See progress", desc: "Your recent activity, all in one place" },
  { icon: Share2, title: "Share", desc: "Long-press a card in chat to share with friends" },
];

export default function FitnessHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<FitnessRow[] | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await (dbFrom("fitness_activities") as { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: unknown) => { limit: (n: number) => Promise<{ data: FitnessRow[] | null }> } } } })
        .select("id, activity_type, duration_seconds, distance_meters, steps, calories, recorded_at")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(30);
      if (!cancelled) setRows((data as FitnessRow[] | null) || []);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <HubScaffold
      badge="Your activity"
      badgeIcon={Activity}
      title="Fitness"
      subtitle="Your recent workouts, all in one place. Log activity in Wellness and share cards to chat."
      primaryCta={{ label: "Log a workout", onClick: () => navigate("/wellness"), icon: Plus }}
      browseLabel="View activity"
      steps={STEPS}
      listingsHeading={`Recent activity${rows && rows.length > 0 ? ` (${rows.length})` : ""}`}
    >
      {rows == null ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border bg-card/30"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-orange-500/10 border border-border flex items-center justify-center mb-4 text-fuchsia-500">
            <Activity className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold mb-1">No activities yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Log a workout in Wellness and it'll show up here, ready to share.
          </p>
          <button
            type="button"
            onClick={() => navigate("/wellness")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-md shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="w-4 h-4" /> Log a workout
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <FitnessActivityCard
              key={r.id}
              activityType={r.activity_type}
              durationSeconds={r.duration_seconds ?? undefined}
              distanceMeters={r.distance_meters ?? undefined}
              steps={r.steps ?? undefined}
              calories={r.calories ?? undefined}
              recordedAt={r.recorded_at}
            />
          ))}
        </div>
      )}
    </HubScaffold>
  );
}
