/**
 * RideAnalyticsDashboard — Personal mobility insights, carbon savings, spending trends, ride patterns
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Leaf, DollarSign, MapPin, Clock, TrendingUp, TrendingDown, Calendar, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const monthlyStats = [
  { label: "Total Rides", value: "47", change: "+12%", up: true },
  { label: "Distance", value: "284 mi", change: "+8%", up: true },
  { label: "Avg. Cost", value: "$18.40", change: "-5%", up: false },
  { label: "Time Saved", value: "6.2 hrs", change: "+15%", up: true },
];

const spendingByCategory = [
  { category: "Commute", amount: 482, pct: 56, color: "bg-primary" },
  { category: "Airport", amount: 186, pct: 22, color: "bg-blue-500" },
  { category: "Social", amount: 124, pct: 14, color: "bg-purple-500" },
  { category: "Other", amount: 68, pct: 8, color: "bg-muted-foreground" },
];

const weeklyPattern = [
  { day: "Mon", rides: 8, bar: 80 },
  { day: "Tue", rides: 6, bar: 60 },
  { day: "Wed", rides: 9, bar: 90 },
  { day: "Thu", rides: 7, bar: 70 },
  { day: "Fri", rides: 10, bar: 100 },
  { day: "Sat", rides: 4, bar: 40 },
  { day: "Sun", rides: 3, bar: 30 },
];

const topRoutes = [
  { from: "Home", to: "Office", count: 22, avgCost: "$14.50", avgTime: "18 min" },
  { from: "Home", to: "Airport", count: 6, avgCost: "$38.20", avgTime: "35 min" },
  { from: "Office", to: "Gym", count: 8, avgCost: "$9.80", avgTime: "12 min" },
];

export default function RideAnalyticsDashboard() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex gap-2">
        {(["week", "month", "year"] as const).map((p) => (
          <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)} className="flex-1 capitalize">
            {p}
          </Button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {monthlyStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
              <p className="text-xl font-black text-foreground">{stat.value}</p>
              <div className="flex items-center gap-1">
                {stat.up ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-green-500" />
                )}
                <span className="text-[10px] text-green-500 font-semibold">{stat.change}</span>
                <span className="text-[10px] text-muted-foreground">vs last {period}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Spending breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Spending Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {spendingByCategory.map((cat) => (
              <motion.div
                key={cat.category}
                className={`${cat.color} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${cat.pct}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
            ))}
          </div>
          <div className="space-y-2">
            {spendingByCategory.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                  <span className="text-muted-foreground">{cat.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">${cat.amount}</span>
                  <Badge variant="secondary" className="text-[10px]">{cat.pct}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly pattern */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Ride Pattern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-24">
            {weeklyPattern.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  className="w-full bg-primary/80 rounded-t-md"
                  initial={{ height: 0 }}
                  animate={{ height: `${day.bar}%` }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                />
                <span className="text-[10px] text-muted-foreground font-medium">{day.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top routes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Route className="w-4 h-4 text-primary" /> Top Routes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topRoutes.map((route, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">{route.from} → {route.to}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{route.count} rides</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" /> {route.avgTime}
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">{route.avgCost}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Carbon impact */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            <p className="text-sm font-bold text-foreground">Carbon Impact</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-background/60 rounded-xl">
              <p className="text-lg font-black text-green-500">42 kg</p>
              <p className="text-[10px] text-muted-foreground">CO₂ saved this month</p>
            </div>
            <div className="text-center p-3 bg-background/60 rounded-xl">
              <p className="text-lg font-black text-green-500">18</p>
              <p className="text-[10px] text-muted-foreground">Green rides taken</p>
            </div>
          </div>
          <Progress value={68} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-center">68% of rides were eco-friendly 🌱</p>
        </CardContent>
      </Card>
    </div>
  );
}
