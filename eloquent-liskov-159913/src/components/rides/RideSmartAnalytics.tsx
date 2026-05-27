/**
 * RideSmartAnalytics — Usage patterns, cost optimization, monthly reports, trends
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, Clock, MapPin, DollarSign, Lightbulb, Download, Calendar, Route, Zap, Target, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const monthlyData = {
  totalRides: 24,
  totalSpent: 342.50,
  avgPerRide: 14.27,
  totalDistance: 186,
  totalTime: 420,
  vsLastMonth: { rides: 12, spent: -8, distance: 15 },
};

const patterns = [
  { label: "Peak ride time", value: "5:30 PM - 6:30 PM", icon: Clock, tip: "Book 15 min earlier to save ~$3" },
  { label: "Most visited", value: "Downtown (42%)", icon: MapPin, tip: "Consider a Ride Pass for this route" },
  { label: "Avg. wait time", value: "4.2 min", icon: Clock, tip: "Schedule rides to reduce wait" },
  { label: "Preferred vehicle", value: "Economy (67%)", icon: Route, tip: "Try shared rides to save 30%" },
];

const optimizations = [
  { id: "shared", title: "Switch to shared rides", savings: "$45/mo", desc: "Your top 3 routes have active shared options", impact: 85 },
  { id: "schedule", title: "Schedule recurring trips", savings: "$22/mo", desc: "Your daily commute is eligible for discounts", impact: 65 },
  { id: "offpeak", title: "Ride off-peak hours", savings: "$18/mo", desc: "Shifting 30 min earlier avoids surge pricing", impact: 50 },
  { id: "pass", title: "Get a Ride Pass", savings: "$30/mo", desc: "Based on your usage, Traveler Pass saves the most", impact: 75 },
];

const weeklyBreakdown = [
  { day: "Mon", rides: 4, spend: 52 },
  { day: "Tue", rides: 3, spend: 41 },
  { day: "Wed", rides: 5, spend: 68 },
  { day: "Thu", rides: 3, spend: 45 },
  { day: "Fri", rides: 6, spend: 82 },
  { day: "Sat", rides: 2, spend: 35 },
  { day: "Sun", rides: 1, spend: 19.50 },
];

const maxSpend = Math.max(...weeklyBreakdown.map(d => d.spend));

export default function RideSmartAnalytics() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const downloadReport = () => {
    const rows = [
      ["ZIVO Monthly Analytics Report"],
      [`Period: ${period}`],
      [""],
      ["Total Rides", monthlyData.totalRides],
      ["Total Spent", `$${monthlyData.totalSpent}`],
      ["Average Per Ride", `$${monthlyData.avgPerRide}`],
      ["Total Distance", `${monthlyData.totalDistance} mi`],
      ["Total Time", `${monthlyData.totalTime} min`],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `zivo-analytics-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  };

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {(["week", "month", "year"] as const).map(p => (
          <button type="button" key={p} onClick={() => setPeriod(p)} className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize", period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {p}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Rides", value: monthlyData.totalRides, change: monthlyData.vsLastMonth.rides, prefix: "" },
          { label: "Spent", value: `$${monthlyData.totalSpent}`, change: monthlyData.vsLastMonth.spent, prefix: "$" },
          { label: "Avg/Ride", value: `$${monthlyData.avgPerRide}`, change: -5, prefix: "" },
          { label: "Distance", value: `${monthlyData.totalDistance} mi`, change: monthlyData.vsLastMonth.distance, prefix: "" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl bg-card border border-border/40 p-3">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-lg font-black text-foreground mt-0.5">{stat.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {stat.change > 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
              <span className={cn("text-[9px] font-bold", stat.change > 0 ? "text-emerald-500" : "text-red-500")}>
                {stat.change > 0 ? "+" : ""}{stat.change}% vs last {period}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="rounded-2xl bg-card border border-border/40 p-4">
        <h3 className="text-xs font-bold text-foreground mb-3">Weekly Breakdown</h3>
        <div className="flex items-end gap-2 h-28">
          {weeklyBreakdown.map((d, i) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] font-bold text-foreground">${d.spend}</span>
              <motion.div
                className="w-full rounded-t-lg bg-primary/80"
                initial={{ height: 0 }}
                animate={{ height: `${(d.spend / maxSpend) * 100}%` }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              />
              <span className="text-[9px] text-muted-foreground font-bold">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage patterns */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Usage Patterns</h3>
        {patterns.map(p => {
          const Icon = p.icon;
          return (
            <div key={p.label} className="rounded-xl bg-card border border-border/40 p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">{p.label}</p>
                  <p className="text-xs font-bold text-foreground">{p.value}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2 pl-12">
                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="text-[10px] text-amber-500 font-medium">{p.tip}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cost optimizations */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-primary" /> Save Up To $115/mo
        </h3>
        {optimizations.map((opt, i) => (
          <motion.div key={opt.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl bg-card border border-border/40 p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-foreground">{opt.title}</span>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[9px] font-bold">Save {opt.savings}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">{opt.desc}</p>
            <div className="flex items-center gap-2">
              <Progress value={opt.impact} className="h-1.5 flex-1" />
              <span className="text-[9px] font-bold text-muted-foreground">{opt.impact}% impact</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Export */}
      <Button variant="outline" className="w-full h-12 rounded-2xl text-sm font-bold gap-2" onClick={downloadReport}>
        <Download className="w-4 h-4" /> Download Monthly Report
      </Button>
    </div>
  );
}
