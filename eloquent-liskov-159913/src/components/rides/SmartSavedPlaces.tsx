/**
 * SmartSavedPlaces - Saved locations with time-of-day smart suggestions
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Briefcase, Star, MapPin, Plus, Clock, Sparkles, ChevronRight, X, Edit2, Trash2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

interface SavedPlace {
  id: string;
  name: string;
  address: string;
  icon: "home" | "work" | "gym" | "favorite" | "custom";
  visits: number;
  lastVisit?: string;
}

const iconMap = {
  home: { icon: Home, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  work: { icon: Briefcase, color: "text-sky-500", bg: "bg-sky-500/10" },
  gym: { icon: Heart, color: "text-red-500", bg: "bg-red-500/10" },
  favorite: { icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
  custom: { icon: MapPin, color: "text-violet-500", bg: "bg-violet-500/10" },
};

const initialPlaces: SavedPlace[] = [];

// Smart suggestions based on time of day
function getSmartSuggestions(places: SavedPlace[]): SavedPlace[] {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return places.filter(p => p.icon === "work").slice(0, 2);
  if (hour >= 17 && hour < 21) return places.filter(p => p.icon === "home").slice(0, 2);
  if (hour >= 10 && hour < 12) return places.filter(p => p.icon === "gym").slice(0, 2);
  return places.sort((a, b) => b.visits - a.visits).slice(0, 2);
}

interface SmartSavedPlacesProps {
  onSelect?: (place: SavedPlace) => void;
}

export default function SmartSavedPlaces({ onSelect }: SmartSavedPlacesProps) {
  const [places, setPlaces] = useState(initialPlaces);
  const [showAll, setShowAll] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newIcon, setNewIcon] = useState<keyof typeof iconMap>("custom");
  const { user } = useAuth();

  const suggestions = getSmartSuggestions(places);

  useEffect(() => {
    if (!user) return;
    supabase.from("saved_locations").select("*").eq("user_id", user.id).then(({ data }) => {
      if (data) {
        setPlaces(data.map(d => ({
          id: d.id,
          name: d.label,
          address: d.address,
          icon: (d.icon as SavedPlace["icon"]) || "custom",
          visits: 0,
        })));
      }
    });
  }, [user]);

  const addPlace = async () => {
    if (!newName.trim() || !newAddress.trim()) return;
    if (user) {
      const { data, error } = await supabase.from("saved_locations").insert({
        user_id: user.id,
        label: newName,
        address: newAddress,
        icon: newIcon,
        lat: 0,
        lng: 0,
      }).select().single();
      if (!error && data) {
        setPlaces(prev => [...prev, { id: data.id, name: newName, address: newAddress, icon: newIcon, visits: 0 }]);
      }
    } else {
      setPlaces(prev => [...prev, { id: Date.now().toString(), name: newName, address: newAddress, icon: newIcon, visits: 0 }]);
    }
    setNewName("");
    setNewAddress("");
    setShowAdd(false);
    toast.success("Place saved!");
  };

  const removePlace = async (id: string) => {
    if (user) {
      await supabase.from("saved_locations").delete().eq("id", id).eq("user_id", user.id);
    }
    setPlaces(places.filter(p => p.id !== id));
    toast.success("Place removed");
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Smart suggestion header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Smart Suggestions</h3>
            <p className="text-[10px] text-muted-foreground">{greeting} — where are you heading?</p>
          </div>
        </div>

        {/* Top suggestions */}
        <div className="flex gap-2 mb-2">
          {suggestions.map((place) => {
            const cfg = iconMap[place.icon];
            const Icon = cfg.icon;
            return (
              <button type="button"
                key={place.id}
                onClick={() => onSelect?.(place)}
                className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 hover:border-primary/20 transition-all active:scale-[0.98]"
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.bg)}>
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-xs font-bold text-foreground block truncate">{place.name}</span>
                  <span className="text-[9px] text-muted-foreground">{place.visits} trips</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* All saved places */}
      <button type="button"
        onClick={() => setShowAll(!showAll)}
        className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground border-t border-border/20"
      >
        {showAll ? "Show less" : `All saved places (${places.length})`}
        <ChevronRight className={cn("w-3 h-3 transition-transform", showAll && "rotate-90")} />
      </button>

      <AnimatePresence>
        {showAll && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 space-y-1.5">
              {places.map((place) => {
                const cfg = iconMap[place.icon];
                const Icon = cfg.icon;
                return (
                  <div key={place.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/20 transition-all group">
                    <button type="button" onClick={() => onSelect?.(place)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                        <Icon className={cn("w-4 h-4", cfg.color)} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-foreground">{place.name}</span>
                        <p className="text-[10px] text-muted-foreground truncate">{place.address}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[8px] h-4">{place.visits}x</Badge>
                      <button type="button" onClick={() => removePlace(place.id)} className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted">
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add place */}
              {!showAdd ? (
                <button type="button"
                  onClick={() => setShowAdd(true)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground hover:border-primary/30 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add a place
                </button>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 p-3 rounded-xl bg-muted/10 border border-border/20">
                  <div className="flex gap-1.5">
                    {(Object.keys(iconMap) as Array<keyof typeof iconMap>).map((key) => {
                      const cfg = iconMap[key];
                      const Icon = cfg.icon;
                      return (
                        <button type="button"
                          key={key}
                          onClick={() => setNewIcon(key)}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                            newIcon === key ? `${cfg.bg} ring-2 ring-primary/20` : "bg-muted/30"
                          )}
                        >
                          <Icon className={cn("w-3.5 h-3.5", newIcon === key ? cfg.color : "text-muted-foreground")} />
                        </button>
                      );
                    })}
                  </div>
                  <Input placeholder="Place name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-xs" />
                  <Input placeholder="Address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="h-8 text-xs" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={addPlace} disabled={!newName.trim()}>Save</Button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
