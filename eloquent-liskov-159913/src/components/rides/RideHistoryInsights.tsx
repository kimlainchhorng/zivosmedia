/**
 * RideHistoryInsights - Monthly stats from real ride_requests data
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, MapPin, Clock, DollarSign, Leaf, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MonthStats {
  totalRides: number;
  totalSpent: number;
  totalDistanceMi: number;
  totalDurationMin: number;
}

export default function RideHistoryInsights() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [stats, setStats] = useState<MonthStats>({ totalRides: 0, totalSpent: 0, totalDistanceMi: 0, totalDurationMin: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const now = new Date();
    const startDate = period === "week"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    supabase
      .from("ride_requests")
      .select("payment_amount, distance_miles, duration_minutes")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("created_at", startDate.toISOString())
      .then(({ data }) => {
        if (data && data.length > 0) {
          setStats({
            totalRides: data.length,
            totalSpent: data.reduce((sum, r) => sum + (r.payment_amount || 0), 0),
            totalDistanceMi: Math.round(data.reduce((sum, r) => sum + (r.distance_miles || 0), 0) * 10) / 10,
            totalDurationMin: Math.round(data.reduce((sum, r) => sum + (r.duration_minutes || 0), 0)),
          });
        } else {
          setStats({ totalRides: 0, totalSpent: 0, totalDistanceMi: 0, totalDurationMin: 0 });
        }
        setLoading(false);
      });
  }, [user?.id, period]);

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground">Ride Insights</h2>
          </div>
          <div className="flex gap-1">
            {(["week", "month"] as const).map(p => (
              <button type="button"
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                  period === p ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"
                )}
              >
                {p === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 px-4">
        {[
          { label: "Rides", value: loading ? "—" : stats.totalRides.toString(), icon: Car, color: "text-primary" },
          { label: "Spent", value: loading ? "—" : `$${stats.totalSpent.toFixed(0)}`, icon: DollarSign, color: "text-emerald-500" },
          { label: "Distance", value: loading ? "—" : `${stats.totalDistanceMi} mi`, icon: TrendingUp, color: "text-sky-500" },
          { label: "Time", value: loading ? "—" : formatDuration(stats.totalDurationMin), icon: Clock, color: "text-amber-500" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-card border border-border/30 p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("w-3.5 h-3.5", stat.color)} />
                <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
              </div>
              <span className="text-lg font-black text-foreground">{stat.value}</span>
            </motion.div>
          );
        })}
      </div>

      {/* CO2 estimate */}
      <div className="px-4">
        <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-4 text-center">
          <Leaf className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
          <span className="text-xl font-black text-foreground">
            {loading ? "—" : `${(stats.totalDistanceMi * 0.21).toFixed(1)} kg`}
          </span>
          <p className="text-[10px] text-muted-foreground mt-1">Estimated CO₂ offset vs driving alone</p>
        </div>
      </div>

      {stats.totalRides === 0 && !loading && (
        <div className="px-4 text-center py-6">
          <p className="text-sm text-muted-foreground">No completed rides {period === "week" ? "this week" : "this month"} yet.</p>
        </div>
      )}
    </div>
  );
}
