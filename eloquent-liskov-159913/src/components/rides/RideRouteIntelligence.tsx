/**
 * RideRouteIntelligence — Smart commute, carpool matching, traffic routing, cost reports
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Route, Users, Clock, DollarSign, TrendingDown, Zap, MapPin, ArrowRight, Brain, Lightbulb, BarChart3, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const smartRoutes = [
  { id: 1, name: "Morning Commute", from: "Home", to: "Office", bestTime: "7:45 AM", savings: "$3.20", traffic: "low", duration: "22 min" },
  { id: 2, name: "Evening Return", from: "Office", to: "Home", bestTime: "5:15 PM", savings: "$2.80", traffic: "medium", duration: "28 min" },
  { id: 3, name: "Gym Route", from: "Home", to: "FitZone Gym", bestTime: "6:00 AM", savings: "$1.50", traffic: "low", duration: "12 min" },
];

const carpoolMatches = [
  { id: 1, name: "Alex M.", route: "Similar commute • 92% overlap", time: "7:30-8:00 AM", savings: "Save 45%", rating: 4.9 },
  { id: 2, name: "Priya S.", route: "Same office park • 85% overlap", time: "8:00-8:30 AM", savings: "Save 40%", rating: 4.8 },
  { id: 3, name: "Jordan K.", route: "Nearby pickup • 78% overlap", time: "7:45-8:15 AM", savings: "Save 35%", rating: 4.7 },
];

const costReport = {
  thisMonth: 342,
  lastMonth: 410,
  savings: 68,
  avgPerRide: 18.5,
  totalRides: 18,
  smartSavings: 42,
  carpoolSavings: 26,
};

type Tab = "smart" | "carpool" | "costs";

export default function RideRouteIntelligence() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("smart");

  const tabs: { id: Tab; label: string; icon: typeof Route }[] = [
    { id: "smart", label: "Smart Routes", icon: Brain },
    { id: "carpool", label: "Carpool", icon: Users },
    { id: "costs", label: "Cost Report", icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      {/* AI insights banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20 rounded-2xl p-4 border border-primary/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Smart Insight</p>
            <p className="text-xs text-muted-foreground">Leave 10 min earlier on Tuesdays to save ~$4 on surge pricing</p>
          </div>
        </div>
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
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "smart" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {smartRoutes.map((route) => (
            <motion.div
              key={route.id}
              whileTap={{ scale: 0.98 }}
              className="bg-card rounded-xl p-4 border border-border/30 space-y-2"
              onClick={() => navigate("/rides/hub", { state: { initialDestinationAddress: route.to, scheduledTime: route.bestTime } })}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{route.name}</p>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                  route.traffic === "low" ? "bg-green-500/15 text-green-600" : "bg-yellow-500/15 text-yellow-600"
                )}>
                  {route.traffic} traffic
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{route.from}</span>
                <ArrowRight className="w-3 h-3" />
                <span>{route.to}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-foreground font-semibold">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Best: {route.bestTime}
                </span>
                <span className="flex items-center gap-1 text-foreground font-semibold">
                  <Zap className="w-3.5 h-3.5 text-primary" /> {route.duration}
                </span>
                <span className="flex items-center gap-1 text-green-600 font-bold">
                  <TrendingDown className="w-3.5 h-3.5" /> {route.savings}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {activeTab === "carpool" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-xs text-muted-foreground">Matched riders with similar commute patterns</p>
          {carpoolMatches.map((match) => (
            <div key={match.id} className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                  {match.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{match.name}</p>
                    <span className="text-[10px] text-muted-foreground">⭐ {match.rating}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{match.route}</p>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-lg">{match.savings}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {match.time}
                </span>
                <button type="button"
                  onClick={() => navigate("/chat", { state: { openChat: { userId: match.id?.toString(), name: match.name } } })}
                  className="text-xs font-bold text-primary"
                >
                  Request Match
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {activeTab === "costs" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-3 border border-border/30 text-center">
              <p className="text-2xl font-black text-foreground">${costReport.thisMonth}</p>
              <p className="text-[11px] text-muted-foreground font-medium">This Month</p>
            </div>
            <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20 text-center">
              <p className="text-2xl font-black text-green-600">-${costReport.savings}</p>
              <p className="text-[11px] text-green-600 font-medium">vs Last Month</p>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/30 space-y-3">
            <p className="text-sm font-bold text-foreground">Savings Breakdown</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Smart routing</span>
                <span className="text-xs font-bold text-green-600">-${costReport.smartSavings}</span>
              </div>
              <Progress value={62} className="h-1.5" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Carpool savings</span>
                <span className="text-xs font-bold text-green-600">-${costReport.carpoolSavings}</span>
              </div>
              <Progress value={38} className="h-1.5" />
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/30 space-y-2">
            <p className="text-sm font-bold text-foreground">Monthly Stats</p>
            {[
              { label: "Total rides", value: costReport.totalRides.toString() },
              { label: "Avg per ride", value: `$${costReport.avgPerRide}` },
              { label: "Last month total", value: `$${costReport.lastMonth}` },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="text-xs font-bold text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
