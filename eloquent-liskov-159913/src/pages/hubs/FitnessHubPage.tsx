/**
 * FitnessHubPage — /fitness
 * View your activity history. Cards link straight back to chat for sharing.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FitnessActivityCard from "@/components/fitness/FitnessActivityCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Activity from "lucide-react/dist/esm/icons/activity";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

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

export default function FitnessHubPage() {
  const { user } = useAuth();
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Activity className="w-6 h-6 text-emerald-500" />Fitness</h1>
          <p className="text-sm text-muted-foreground">Your recent workouts. Long-press a card in chat to share with friends.</p>
        </div>

        {rows == null ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">No activities yet. Log a workout to see it here.</p>
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
      </main>
      <Footer />
    </div>
  );
}
