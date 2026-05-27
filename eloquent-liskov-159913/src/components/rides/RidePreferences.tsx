/**
 * RidePreferences — Personalization hub with ride settings, favorite drivers, ride notes
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Thermometer, Music, MessageSquare, Heart, Star, Settings, ChevronRight, Check, Sparkles, StickyNote, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "preferences" | "favorites" | "notes";

const defaultPrefs = {
  quietMode: false,
  temperature: "cool" as "cool" | "warm" | "no-preference",
  music: "driver-choice" as "silent" | "driver-choice" | "my-playlist",
  conversation: "minimal" as "chatty" | "minimal" | "silent",
  seatPosition: "back-right" as "back-left" | "back-right" | "front",
  autoTip: 15,
};

const favoriteDrivers = [
  { id: "1", name: "Marcus T.", rating: 4.92, rides: 12, vehicle: "Silver Camry", lastRide: "2 days ago" },
  { id: "2", name: "Sarah K.", rating: 4.97, rides: 8, vehicle: "Black Tesla", lastRide: "1 week ago" },
  { id: "3", name: "James L.", rating: 4.88, rides: 5, vehicle: "White Accord", lastRide: "2 weeks ago" },
];

export default function RidePreferences() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("preferences");
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [rideNote, setRideNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>(["I have a small dog with me", "Please use the side entrance"]);
  const [favDrivers, setFavDrivers] = useState(favoriteDrivers);

  const tabs = [
    { id: "preferences" as const, label: "Settings", icon: Settings },
    { id: "favorites" as const, label: "Favorites", icon: Heart },
    { id: "notes" as const, label: "Notes", icon: StickyNote },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {activeTab === "preferences" && (
            <div className="space-y-4">
              {/* Quiet mode */}
              <PreferenceToggle
                icon={prefs.quietMode ? VolumeX : Volume2}
                label="Quiet Mode"
                desc="Minimal conversation, no music"
                active={prefs.quietMode}
                onToggle={() => { setPrefs(p => ({ ...p, quietMode: !p.quietMode })); toast.success(prefs.quietMode ? "Quiet mode off" : "Quiet mode on"); }}
              />

              {/* Temperature */}
              <PreferenceSelector
                icon={Thermometer}
                label="Temperature"
                options={[
                  { id: "cool", label: "Cool" },
                  { id: "warm", label: "Warm" },
                  { id: "no-preference", label: "No pref" },
                ]}
                selected={prefs.temperature}
                onSelect={v => setPrefs(p => ({ ...p, temperature: v as typeof p.temperature }))}
              />

              {/* Music */}
              <PreferenceSelector
                icon={Music}
                label="Music"
                options={[
                  { id: "silent", label: "Silent" },
                  { id: "driver-choice", label: "Driver's choice" },
                  { id: "my-playlist", label: "My playlist" },
                ]}
                selected={prefs.music}
                onSelect={v => setPrefs(p => ({ ...p, music: v as typeof p.music }))}
              />

              {/* Conversation */}
              <PreferenceSelector
                icon={MessageSquare}
                label="Conversation"
                options={[
                  { id: "chatty", label: "Chatty" },
                  { id: "minimal", label: "Minimal" },
                  { id: "silent", label: "Silent" },
                ]}
                selected={prefs.conversation}
                onSelect={v => setPrefs(p => ({ ...p, conversation: v as typeof p.conversation }))}
              />

              {/* Seat */}
              <PreferenceSelector
                icon={UserCheck}
                label="Seat Preference"
                options={[
                  { id: "back-left", label: "Back left" },
                  { id: "back-right", label: "Back right" },
                  { id: "front", label: "Front" },
                ]}
                selected={prefs.seatPosition}
                onSelect={v => setPrefs(p => ({ ...p, seatPosition: v as typeof p.seatPosition }))}
              />

              {/* Auto-tip */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Auto-Tip</p>
                    <p className="text-[10px] text-muted-foreground">Automatically tip after every ride</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[0, 10, 15, 20, 25].map(pct => (
                    <button type="button" key={pct} onClick={() => setPrefs(p => ({ ...p, autoTip: pct }))} className={cn("flex-1 py-2 rounded-xl text-xs font-bold border transition-all", prefs.autoTip === pct ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-foreground border-border/40")}>
                      {pct === 0 ? "Off" : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground px-1">Request your favorite drivers when available</p>
              {favDrivers.map((driver, i) => (
                <motion.div key={driver.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl bg-card border border-border/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{driver.name.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{driver.name}</span>
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-bold">{driver.rating}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{driver.vehicle} · {driver.rides} rides · {driver.lastRide}</p>
                    </div>
                    <Heart className="w-5 h-5 text-red-500 fill-red-500 shrink-0" />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] rounded-lg font-bold" onClick={() => navigate("/rides/hub", { state: { preferredDriverId: driver.id, preferredDriverName: driver.name } })}>
                      Request Driver
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-lg font-bold text-red-500 border-red-500/20 hover:bg-red-500/5" onClick={() => { setFavDrivers(prev => prev.filter(d => d.id !== driver.id)); toast.success(`${driver.name} removed`); }}>
                      Remove
                    </Button>
                  </div>
                </motion.div>
              ))}
              <div className="rounded-xl border border-dashed border-border/40 p-4 text-center">
                <p className="text-[10px] text-muted-foreground">Rate a driver 5 stars to add them to favorites</p>
              </div>
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary" /> Add Ride Note
                </h3>
                <p className="text-[10px] text-muted-foreground">Notes are shared with your driver before pickup</p>
                <div className="flex gap-2">
                  <Input placeholder="e.g., I'll be at the side entrance" value={rideNote} onChange={e => setRideNote(e.target.value)} className="h-11 rounded-xl text-sm" />
                  <Button className="h-11 px-4 rounded-xl font-bold" disabled={!rideNote.trim()} onClick={() => { setSavedNotes(prev => [rideNote.trim(), ...prev]); setRideNote(""); toast.success("Note saved!"); }}>
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Saved Notes</h3>
                {savedNotes.map((note, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                    <StickyNote className="w-4 h-4 text-primary shrink-0" />
                    <span className="flex-1 text-xs text-foreground">{note}</span>
                    <button type="button" onClick={() => { setSavedNotes(prev => prev.filter((_, j) => j !== i)); toast.success("Note removed"); }} className="text-[10px] text-red-500 font-bold">Remove</button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-muted/20 border border-border/30 p-3">
                <p className="text-[10px] text-muted-foreground"><strong>Quick templates:</strong></p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Wheelchair accessible", "I have luggage", "Waiting at door", "I'll be 2 min late"].map(t => (
                    <button type="button" key={t} onClick={() => setRideNote(t)} className="px-2.5 py-1 rounded-lg bg-card border border-border/40 text-[10px] font-medium text-foreground hover:border-primary/20 transition-colors">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PreferenceToggle({ icon: Icon, label, desc, active, onToggle }: { icon: any; label: string; desc: string; active: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={cn("w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left", active ? "bg-primary/5 border-primary/30" : "bg-card border-border/40")}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", active ? "bg-primary/10" : "bg-muted/50")}>
        <Icon className={cn("w-5 h-5", active ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <div className={cn("w-11 h-6 rounded-full transition-colors flex items-center px-0.5", active ? "bg-primary" : "bg-muted/50")}>
        <motion.div className="w-5 h-5 rounded-full bg-white shadow-sm" animate={{ x: active ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
      </div>
    </button>
  );
}

function PreferenceSelector({ icon: Icon, label, options, selected, onSelect }: { icon: any; label: string; options: { id: string; label: string }[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-foreground">{label}</span>
      </div>
      <div className="flex gap-2">
        {options.map(opt => (
          <button type="button" key={opt.id} onClick={() => onSelect(opt.id)} className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all", selected === opt.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-foreground border-border/40 hover:border-primary/20")}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
