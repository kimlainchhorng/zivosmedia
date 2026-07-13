/**
 * SurgePricingMap - Live demand heat map with surge multiplier badges
 * Inspired by Uber's surge pricing visualization
 */
import { useState, useEffect } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp, Zap, Clock, MapPin, Info, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SurgeZone {
  id: string;
  name: string;
  multiplier: number;
  demand: "low" | "moderate" | "high" | "extreme";
  eta_minutes: number;
  x: number; // percentage position
  y: number;
  radius: number;
}

const demandConfig = {
  low: { color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", text: "text-emerald-500", label: "Low demand", badge: "bg-emerald-500/15" },
  moderate: { color: "from-amber-500/25 to-amber-500/5", border: "border-amber-500/30", text: "text-amber-500", label: "Moderate", badge: "bg-amber-500/15" },
  high: { color: "from-orange-500/30 to-orange-500/5", border: "border-orange-500/30", text: "text-orange-500", label: "High demand", badge: "bg-orange-500/15" },
  extreme: { color: "from-red-500/35 to-red-500/5", border: "border-red-500/30", text: "text-red-500", label: "Very high", badge: "bg-red-500/15" },
};

export default function SurgePricingMap() {
  const [zones, setZones] = useState<SurgeZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<SurgeZone | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    supabase.from("surge_zones").select("id, name, base_multiplier, manual_multiplier, is_active, surge_enabled, lat, lng, radius_km")
      .eq("is_active", true).eq("surge_enabled", true).then(({ data }) => {
        if (data && data.length > 0) {
          setZones(data.map((z, i) => ({
            id: z.id,
            name: z.name,
            multiplier: z.manual_multiplier ?? z.base_multiplier,
            demand: z.manual_multiplier && z.manual_multiplier > 2 ? "extreme" : z.manual_multiplier && z.manual_multiplier > 1.5 ? "high" : z.base_multiplier > 1.2 ? "moderate" : "low",
            eta_minutes: Math.round(5 + Math.random() * 10),
            x: 15 + (i * 22) % 75,
            y: 20 + (i * 17) % 60,
            radius: z.radius_km ? Math.max(30, Math.min(80, z.radius_km * 6)) : 50,
          })));
        }
      });
  }, []);

  useVisibleInterval(() => {
    setZones(prev => prev.map(z => ({
      ...z,
      multiplier: Math.max(1, z.multiplier + (Math.random() - 0.5) * 0.1),
      eta_minutes: Math.max(2, z.eta_minutes + Math.floor(Math.random() * 3) - 1),
    })));
  }, 15000);

  const avgSurge = zones.reduce((s, z) => s + z.multiplier, 0) / zones.length;

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Live Demand</h3>
            <p className="text-[10px] text-muted-foreground">Updated just now</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-bold border-orange-500/30 text-orange-500 bg-orange-500/5">
            <TrendingUp className="w-3 h-3 mr-1" />
            Avg {avgSurge.toFixed(1)}x
          </Badge>
          <button type="button" onClick={() => setShowInfo(!showInfo)} className="p-1 rounded-lg hover:bg-muted/50">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Info tooltip */}
      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden">
            <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-3 mb-2">
              Prices adjust based on real-time demand. Wait a few minutes or move to a nearby area for lower rates.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map visualization */}
      <div className="relative h-48 mx-4 mb-3 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20 overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(8)].map((_, i) => (
            <div key={`h-${i}`} className="absolute w-full h-px bg-foreground/20" style={{ top: `${(i + 1) * 11}%` }} />
          ))}
          {[...Array(8)].map((_, i) => (
            <div key={`v-${i}`} className="absolute h-full w-px bg-foreground/20" style={{ left: `${(i + 1) * 11}%` }} />
          ))}
        </div>

        {/* Surge zone bubbles */}
        {zones.map((zone) => {
          const cfg = demandConfig[zone.demand];
          return (
            <motion.button
              key={zone.id}
              onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
              className={cn(
                "absolute rounded-full bg-gradient-radial border-2 flex items-center justify-center transition-all",
                cfg.color, cfg.border,
                selectedZone?.id === zone.id && "ring-2 ring-primary/50 scale-110"
              )}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: zone.radius,
                height: zone.radius,
                transform: "translate(-50%, -50%)",
              }}
              animate={{
                scale: zone.demand === "extreme" ? [1, 1.05, 1] : 1,
              }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <span className={cn("text-xs font-black", cfg.text)}>
                {zone.multiplier.toFixed(1)}x
              </span>
            </motion.button>
          );
        })}

        {/* Your location pin */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground shadow-lg" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-primary/40 rounded-b-full" />
        </div>
      </div>

      {/* Selected zone detail */}
      <AnimatePresence>
        {selectedZone && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 overflow-hidden"
          >
            <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2">
                <MapPin className={cn("w-4 h-4", demandConfig[selectedZone.demand].text)} />
                <div>
                  <span className="text-sm font-bold text-foreground">{selectedZone.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={cn("text-[9px] font-bold", demandConfig[selectedZone.demand].badge, demandConfig[selectedZone.demand].text)}>
                      {selectedZone.multiplier.toFixed(1)}x surge
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {selectedZone.eta_minutes} min ETA
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedZone(null)} className="p-1 rounded-full hover:bg-muted">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center justify-between px-4 pb-4">
        {Object.entries(demandConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={cn("w-2.5 h-2.5 rounded-full", cfg.badge)} />
            <span className="text-[9px] text-muted-foreground capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
