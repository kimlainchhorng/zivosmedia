/**
 * DriverPerformancePage - Driver metrics & stats
 * Ported from Zivo Driver Connect
 */
import { ArrowLeft, Target, Clock, Percent, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DriverBottomNav from "@/components/driver/DriverBottomNav";
import { useDriverDashboardData } from "@/hooks/useDriverDashboardData";

export default function DriverPerformancePage() {
  const navigate = useNavigate();
  const { stats } = useDriverDashboardData();

  const performanceStats = [
    {
      label: "Acceptance Rate",
      value: `${stats.acceptanceRate}%`,
      icon: Target,
      description: "Orders accepted vs total offered",
    },
    {
      label: "Completion Rate",
      value: "100%",
      icon: CheckCircle,
      description: `${stats.todayDeliveries} trips completed today`,
    },
    {
      label: "On-Time Rate",
      value: "100%",
      icon: Clock,
      description: "Deliveries completed on time",
    },
    {
      label: "Rating",
      value: `${stats.rating.toFixed(1)}`,
      icon: Target,
      description: "Your average driver rating",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 safe-area-top z-40 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Performance</h1>
            <p className="text-xs text-muted-foreground">Your driver stats</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Total Stats */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Today's Deliveries
            </p>
            <p className="text-4xl font-bold text-foreground">{stats.todayDeliveries}</p>
            <p className="text-sm text-muted-foreground mt-1">
              ${stats.todayEarnings.toFixed(2)} earned • {stats.hoursOnline.toFixed(1)}h online
            </p>
          </div>
        </div>

        {/* Stats List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Your Rates
          </h3>
          <div className="space-y-2">
            {performanceStats.map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{stat.label}</p>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-foreground">{stat.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            Maintaining high acceptance and completion rates helps you get more trip requests
            and qualify for bonuses.
          </p>
        </div>
      </main>

      <DriverBottomNav />
    </div>
  );
}
