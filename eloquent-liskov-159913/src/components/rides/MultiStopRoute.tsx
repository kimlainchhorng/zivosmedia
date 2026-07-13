/**
 * MultiStopRoute - Multi-stop trip planner with reorderable waypoints
 */
import { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { MapPin, Plus, X, GripVertical, Navigation, Clock, Route, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Stop {
  id: string;
  address: string;
  label?: string;
  waitTime?: number; // minutes
}

interface MultiStopRouteProps {
  pickup?: string;
  onConfirm?: (stops: Stop[]) => void;
  maxStops?: number;
}

export default function MultiStopRoute({ pickup = "Current location", onConfirm, maxStops = 5 }: MultiStopRouteProps) {
  const [stops, setStops] = useState<Stop[]>([
    { id: "1", address: "", label: "Stop 1" },
  ]);
  const [newAddress, setNewAddress] = useState("");

  const addStop = () => {
    if (stops.length >= maxStops) {
      toast.error(`Maximum ${maxStops} stops allowed`);
      return;
    }
    setStops([...stops, { id: Date.now().toString(), address: "", label: `Stop ${stops.length + 1}` }]);
  };

  const removeStop = (id: string) => {
    if (stops.length <= 1) return;
    setStops(stops.filter(s => s.id !== id));
  };

  const updateAddress = (id: string, address: string) => {
    setStops(stops.map(s => s.id === id ? { ...s, address } : s));
  };

  const updateWaitTime = (id: string, waitTime: number) => {
    setStops(stops.map(s => s.id === id ? { ...s, waitTime } : s));
  };

  const totalEstimate = stops.length * 8 + 12; // rough estimate

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Route className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Multi-Stop</h3>
            <p className="text-[10px] text-muted-foreground">Up to {maxStops} stops</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] font-bold">
          <Clock className="w-3 h-3 mr-1" /> ~{totalEstimate} min
        </Badge>
      </div>

      {/* Pickup */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="w-0.5 h-6 bg-border/40" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] text-muted-foreground">Pickup</span>
            <p className="text-xs font-medium text-foreground">{pickup}</p>
          </div>
        </div>
      </div>

      {/* Reorderable stops */}
      <div className="px-4">
        <Reorder.Group values={stops} onReorder={setStops} className="space-y-2">
          {stops.map((stop, index) => (
            <Reorder.Item key={stop.id} value={stop}>
              <div className="flex items-start gap-2">
                {/* Timeline */}
                <div className="flex flex-col items-center pt-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black",
                    index === stops.length - 1
                      ? "bg-red-500/10 text-red-500"
                      : "bg-amber-500/10 text-amber-500"
                  )}>
                    {index + 1}
                  </div>
                  {index < stops.length - 1 && <div className="w-0.5 h-8 bg-border/40 mt-1" />}
                </div>

                {/* Stop card */}
                <div className="flex-1 rounded-xl bg-muted/20 border border-border/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                    <Input
                      placeholder={`Stop ${index + 1} address...`}
                      value={stop.address}
                      onChange={(e) => updateAddress(stop.id, e.target.value)}
                      className="h-8 text-xs flex-1 bg-transparent border-0 p-0 focus-visible:ring-0"
                    />
                    {stops.length > 1 && (
                      <button type="button" onClick={() => removeStop(stop.id)} className="p-1 rounded-full hover:bg-muted shrink-0">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Wait time */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Wait:</span>
                    <div className="flex gap-1">
                      {[0, 2, 5, 10].map(mins => (
                        <button type="button"
                          key={mins}
                          onClick={() => updateWaitTime(stop.id, mins)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold transition-all",
                            stop.waitTime === mins
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/40 text-muted-foreground"
                          )}
                        >
                          {mins === 0 ? "None" : `${mins}m`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {/* Add stop */}
      {stops.length < maxStops && (
        <div className="px-4 pt-2">
          <button type="button"
            onClick={addStop}
            className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-medium text-muted-foreground"
          >
            <Plus className="w-4 h-4" /> Add another stop
          </button>
        </div>
      )}

      {/* Route summary */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/20">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {stops.length + 1} points • ~{totalEstimate} min total
            </span>
          </div>
          <Badge variant="outline" className="text-[9px] font-bold text-primary border-primary/20">
            Optimized
          </Badge>
        </div>
      </div>

      {/* Confirm */}
      <div className="px-4 pb-4">
        <Button
          onClick={() => {
            onConfirm?.(stops);
            toast.success("Multi-stop route confirmed!");
          }}
          disabled={stops.some(s => !s.address.trim())}
          className="w-full h-11 rounded-xl font-bold"
        >
          <Route className="w-4 h-4 mr-2" /> Confirm Route
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
