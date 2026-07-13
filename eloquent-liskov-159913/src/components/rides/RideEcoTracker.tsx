/**
 * RideEcoTracker — Carbon offset tracking, eco badges, green vehicle filter, sustainability stats
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Leaf, TreePine, Droplets, Wind, Zap, TrendingDown, Award, Car, CheckCircle, ChevronRight, Globe, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ecoStats = {
  totalCO2Saved: 48.5,
  treesEquivalent: 2.4,
  greenRides: 23,
  totalRides: 67,
  monthlyGoal: 60,
  monthlyProgress: 48.5,
};

const ecoBadges = [
  { id: "first-green", name: "First Green Ride", icon: "🌱", unlocked: true, desc: "Took your first eco ride" },
  { id: "carbon-saver", name: "Carbon Saver", icon: "🌍", unlocked: true, desc: "Saved 10 kg of CO2" },
  { id: "tree-planter", name: "Tree Planter", icon: "🌳", unlocked: true, desc: "Equivalent of 1 tree planted" },
  { id: "eco-warrior", name: "Eco Warrior", icon: "⚡", unlocked: false, desc: "50 green rides", progress: 23, goal: 50 },
  { id: "planet-hero", name: "Planet Hero", icon: "🦸", unlocked: false, desc: "Save 100 kg CO2", progress: 48, goal: 100 },
];

const greenVehicles = [
  { type: "Electric", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10", savings: "100% emissions free", available: true },
  { type: "Hybrid", icon: Leaf, color: "text-sky-500", bg: "bg-sky-500/10", savings: "~50% less emissions", available: true },
  { type: "Shared Ride", icon: Car, color: "text-violet-500", bg: "bg-violet-500/10", savings: "Split emissions per rider", available: true },
];

export default function RideEcoTracker() {
  const [preferGreen, setPreferGreen] = useState(true);
  const [offsetEnabled, setOffsetEnabled] = useState(true);
  const greenPercent = Math.round((ecoStats.greenRides / ecoStats.totalRides) * 100);

  return (
    <div className="space-y-4">
      {/* Impact card */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 border border-emerald-500/20 p-5 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-bl from-emerald-500/15 to-transparent rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Impact</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-foreground">{ecoStats.totalCO2Saved}</span>
            <span className="text-sm text-muted-foreground font-bold">kg CO₂ saved</span>
          </div>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-lg font-black text-emerald-500">{ecoStats.treesEquivalent}</p>
              <p className="text-[9px] text-muted-foreground">Trees equivalent</p>
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{ecoStats.greenRides}</p>
              <p className="text-[9px] text-muted-foreground">Green rides</p>
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{greenPercent}%</p>
              <p className="text-[9px] text-muted-foreground">Green rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly goal */}
      <div className="rounded-2xl bg-card border border-border/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Monthly Goal</span>
          <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[8px] font-bold ml-auto">{Math.round((ecoStats.monthlyProgress / ecoStats.monthlyGoal) * 100)}%</Badge>
        </div>
        <Progress value={(ecoStats.monthlyProgress / ecoStats.monthlyGoal) * 100} className="h-2 mb-1" />
        <p className="text-[10px] text-muted-foreground">{ecoStats.monthlyProgress} of {ecoStats.monthlyGoal} kg CO₂ saved this month</p>
      </div>

      {/* Green preferences */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Green Settings</h3>
        
        <button type="button" onClick={() => { setPreferGreen(!preferGreen); toast.success(preferGreen ? "Green preference off" : "Green vehicles preferred!"); }} className={cn("w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left", preferGreen ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border/40")}>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", preferGreen ? "bg-emerald-500/10" : "bg-muted/50")}>
            <Leaf className={cn("w-5 h-5", preferGreen ? "text-emerald-500" : "text-muted-foreground")} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground">Prefer Green Vehicles</p>
            <p className="text-[10px] text-muted-foreground">Prioritize EVs and hybrids when available</p>
          </div>
          <div className={cn("w-11 h-6 rounded-full transition-colors flex items-center px-0.5", preferGreen ? "bg-emerald-500" : "bg-muted/50")}>
            <motion.div className="w-5 h-5 rounded-full bg-white shadow-sm" animate={{ x: preferGreen ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
          </div>
        </button>

        <button type="button" onClick={() => { setOffsetEnabled(!offsetEnabled); toast.success(offsetEnabled ? "Carbon offset disabled" : "Carbon offset enabled!"); }} className={cn("w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left", offsetEnabled ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border/40")}>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", offsetEnabled ? "bg-emerald-500/10" : "bg-muted/50")}>
            <TreePine className={cn("w-5 h-5", offsetEnabled ? "text-emerald-500" : "text-muted-foreground")} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground">Carbon Offset</p>
            <p className="text-[10px] text-muted-foreground">Add $0.10 per ride to offset emissions</p>
          </div>
          <div className={cn("w-11 h-6 rounded-full transition-colors flex items-center px-0.5", offsetEnabled ? "bg-emerald-500" : "bg-muted/50")}>
            <motion.div className="w-5 h-5 rounded-full bg-white shadow-sm" animate={{ x: offsetEnabled ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
          </div>
        </button>
      </div>

      {/* Green vehicle types */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Green Vehicle Options</h3>
        {greenVehicles.map(v => {
          const Icon = v.icon;
          return (
            <div key={v.type} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/40">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", v.bg)}>
                <Icon className={cn("w-5 h-5", v.color)} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">{v.type}</p>
                <p className="text-[10px] text-muted-foreground">{v.savings}</p>
              </div>
              {v.available && <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[8px] font-bold">Available</Badge>}
            </div>
          );
        })}
      </div>

      {/* Eco badges */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Eco Badges</h3>
        {ecoBadges.map(badge => (
          <div key={badge.id} className={cn("flex items-center gap-3 p-3 rounded-xl border", badge.unlocked ? "bg-card border-border/40" : "bg-muted/10 border-border/20")}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg", badge.unlocked ? "bg-emerald-500/10" : "bg-muted/30 grayscale")}>
              {badge.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn("text-xs font-bold", badge.unlocked ? "text-foreground" : "text-muted-foreground")}>{badge.name}</p>
                {badge.unlocked && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <p className="text-[10px] text-muted-foreground">{badge.desc}</p>
              {!badge.unlocked && badge.progress !== undefined && (
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={(badge.progress / badge.goal!) * 100} className="h-1.5 flex-1" />
                  <span className="text-[9px] font-bold text-muted-foreground">{badge.progress}/{badge.goal}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
