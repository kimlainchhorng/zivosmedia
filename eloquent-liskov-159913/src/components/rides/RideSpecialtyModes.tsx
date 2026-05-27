/**
 * RideSpecialtyModes — Pet-friendly, child seat, package delivery, special occasion rides
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dog, Baby, Package, PartyPopper, CheckCircle, Info, ChevronRight, Plus, Shield, Clock, DollarSign, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const modes = [
  {
    id: "pet",
    name: "Pet-Friendly",
    icon: Dog,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    desc: "Travel with your furry friend",
    surcharge: "$3.00",
    features: ["Pet-friendly drivers only", "Seat covers provided", "Up to 2 pets allowed", "Water bowl available"],
    rules: ["Pet must be leashed or in carrier", "Owner responsible for cleanup", "Service animals ride free"],
  },
  {
    id: "child",
    name: "Child Seat",
    icon: Baby,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    desc: "Safe rides with car seats",
    surcharge: "$5.00",
    features: ["Certified child seat installed", "Rear-facing & forward options", "Ages 0-8 supported", "Safety-certified drivers"],
    rules: ["Select seat type before booking", "Driver verifies installation", "One child seat per ride"],
  },
  {
    id: "package",
    name: "Package Delivery",
    icon: Package,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    desc: "Send packages across town",
    surcharge: "$2.00",
    features: ["Real-time package tracking", "Photo confirmation on delivery", "Up to 50 lbs", "Insurance included"],
    rules: ["No hazardous materials", "Package must fit in trunk", "Recipient must be available"],
  },
  {
    id: "occasion",
    name: "Special Occasion",
    icon: PartyPopper,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    desc: "Premium rides for celebrations",
    surcharge: "$15.00",
    features: ["Luxury vehicle guaranteed", "Complimentary water & snacks", "Decorated interior option", "Extended wait time included"],
    rules: ["Book 2+ hours in advance", "Decorations available for $10 extra", "Up to 4 passengers"],
  },
];

export default function RideSpecialtyModes() {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [activeModes, setActiveModes] = useState<string[]>([]);
  const [packageNote, setPackageNote] = useState("");
  const [childSeatType, setChildSeatType] = useState<"rear" | "forward" | "booster">("rear");
  const [occasionType, setOccasionType] = useState<string>("");

  const toggleMode = (id: string) => {
    if (activeModes.includes(id)) {
      setActiveModes(prev => prev.filter(m => m !== id));
      toast.success(`${modes.find(m => m.id === id)?.name} disabled`);
    } else {
      setActiveModes(prev => [...prev, id]);
      toast.success(`${modes.find(m => m.id === id)?.name} enabled for next ride!`);
    }
  };

  const activeMode = modes.find(m => m.id === selectedMode);

  return (
    <div className="space-y-4">
      {/* Active modes summary */}
      {activeModes.length > 0 && (
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Active for next ride</p>
          <div className="flex flex-wrap gap-1.5">
            {activeModes.map(id => {
              const mode = modes.find(m => m.id === id)!;
              const Icon = mode.icon;
              return (
                <Badge key={id} className={cn("gap-1 text-[10px] font-bold border-0", mode.bg, mode.color)}>
                  <Icon className="w-3 h-3" /> {mode.name}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode cards */}
      <div className="space-y-3">
        {modes.map((mode, i) => {
          const Icon = mode.icon;
          const isActive = activeModes.includes(mode.id);
          const isExpanded = selectedMode === mode.id;

          return (
            <motion.div key={mode.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <button type="button"
                onClick={() => setSelectedMode(isExpanded ? null : mode.id)}
                className={cn("w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all", isActive ? `${mode.bg} ${mode.border}` : "bg-card border-border/40 hover:border-primary/20")}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", mode.bg)}>
                  <Icon className={cn("w-6 h-6", mode.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{mode.name}</span>
                    {isActive && <CheckCircle className={cn("w-4 h-4", mode.color)} />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{mode.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-foreground">+{mode.surcharge}</p>
                  <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform mx-auto mt-0.5", isExpanded && "rotate-90")} />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-2 pt-2 pb-1 space-y-3">
                      {/* Features */}
                      <div className="rounded-xl bg-card border border-border/40 p-3 space-y-2">
                        <h4 className="text-xs font-bold text-foreground">What's included</h4>
                        {mode.features.map(f => (
                          <div key={f} className="flex items-center gap-2">
                            <CheckCircle className={cn("w-3.5 h-3.5 shrink-0", mode.color)} />
                            <span className="text-[11px] text-foreground">{f}</span>
                          </div>
                        ))}
                      </div>

                      {/* Mode-specific options */}
                      {mode.id === "child" && (
                        <div className="rounded-xl bg-card border border-border/40 p-3">
                          <h4 className="text-xs font-bold text-foreground mb-2">Seat Type</h4>
                          <div className="flex gap-2">
                            {(["rear", "forward", "booster"] as const).map(type => (
                              <button type="button" key={type} onClick={() => setChildSeatType(type)} className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold border capitalize transition-all", childSeatType === type ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-foreground border-border/40")}>
                                {type === "rear" ? "Rear-facing" : type === "forward" ? "Forward" : "Booster"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {mode.id === "package" && (
                        <div className="rounded-xl bg-card border border-border/40 p-3 space-y-2">
                          <h4 className="text-xs font-bold text-foreground">Package Details</h4>
                          <Input placeholder="What are you sending?" value={packageNote} onChange={e => setPackageNote(e.target.value)} className="h-10 rounded-xl text-sm" />
                        </div>
                      )}

                      {mode.id === "occasion" && (
                        <div className="rounded-xl bg-card border border-border/40 p-3 space-y-2">
                          <h4 className="text-xs font-bold text-foreground">Occasion Type</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {["Birthday", "Anniversary", "Prom", "Wedding", "Date Night", "Other"].map(o => (
                              <button type="button" key={o} onClick={() => setOccasionType(o)} className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all", occasionType === o ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-foreground border-border/40")}>
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rules */}
                      <div className="rounded-xl bg-muted/20 border border-border/30 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Info className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-bold text-muted-foreground">Guidelines</span>
                        </div>
                        {mode.rules.map(r => (
                          <p key={r} className="text-[10px] text-muted-foreground">• {r}</p>
                        ))}
                      </div>

                      <Button className="w-full h-11 rounded-xl font-bold gap-2" onClick={() => toggleMode(mode.id)}>
                        {isActive ? "Disable" : "Enable"} {mode.name}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
