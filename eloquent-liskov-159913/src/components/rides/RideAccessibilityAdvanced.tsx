/**
 * RideAccessibilityAdvanced — Wheelchair vehicles, hearing/vision assist, companion booking, special needs
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Accessibility, Eye, Ear, Users, Heart, CheckCircle, Plus, Settings, Volume2, VolumeX, Type, Contrast, Hand, UserPlus, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AccessibilityPreference {
  id: string;
  label: string;
  description: string;
  icon: typeof Eye;
  enabled: boolean;
  category: string;
}

export default function RideAccessibilityAdvanced() {
  const navigate = useNavigate();
  const [section, setSection] = useState<"wheelchair" | "sensory" | "companion" | "profile">("wheelchair");

  const [preferences, setPreferences] = useState<AccessibilityPreference[]>([
    { id: "screen-reader", label: "Screen Reader Optimized", description: "Enhanced audio descriptions for all ride events", icon: Volume2, enabled: true, category: "vision" },
    { id: "large-text", label: "Large Text Mode", description: "Increased font sizes throughout the app", icon: Type, enabled: false, category: "vision" },
    { id: "high-contrast", label: "High Contrast", description: "Enhanced color contrast for better visibility", icon: Contrast, enabled: true, category: "vision" },
    { id: "haptic-alerts", label: "Haptic Alerts", description: "Vibration feedback for ride updates", icon: Hand, enabled: true, category: "hearing" },
    { id: "visual-alerts", label: "Visual-Only Alerts", description: "Flash notifications instead of audio", icon: VolumeX, enabled: false, category: "hearing" },
    { id: "text-comm", label: "Text-Only Communication", description: "Communicate with driver via text only", icon: MessageSquare, enabled: false, category: "hearing" },
  ]);

  const [companions, setCompanions] = useState([
    { id: "1", name: "Maria G.", role: "Caregiver", phone: "+1 (555) 234-5678", autoAdd: true },
  ]);

  const sections = [
    { id: "wheelchair" as const, label: "WAV", icon: Accessibility },
    { id: "sensory" as const, label: "Sensory", icon: Eye },
    { id: "companion" as const, label: "Companion", icon: Users },
    { id: "profile" as const, label: "Profile", icon: Settings },
  ];

  const togglePref = (id: string) => {
    setPreferences(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    toast.success("Preference updated");
  };

  const wavVehicles = [
    { type: "Wheelchair Van", features: ["Ramp access", "Securement system", "Extra space"], available: true, eta: "8 min", price: "$14.50" },
    { type: "Accessible SUV", features: ["Side entry", "Fold-flat seats", "Assist rails"], available: true, eta: "12 min", price: "$18.00" },
    { type: "Accessible Luxury", features: ["Power ramp", "Climate zones", "Privacy partition"], available: false, eta: "—", price: "$28.00" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button type="button" key={s.id} onClick={() => setSection(s.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", section === s.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* Wheelchair Accessible Vehicles */}
          {section === "wheelchair" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Accessibility className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Wheelchair Accessible Vehicles</h3>
                </div>
                <p className="text-xs text-muted-foreground">All WAV vehicles are ADA-compliant with trained drivers</p>
              </div>

              {wavVehicles.map(v => (
                <div key={v.type} className={cn("rounded-2xl bg-card border p-4 space-y-3", v.available ? "border-border/40" : "border-border/20 opacity-50")}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{v.type}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {v.available ? (
                          <Badge className="text-[8px] font-bold gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Available</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[8px] font-bold">Unavailable</Badge>
                        )}
                        {v.available && <span className="text-[10px] text-muted-foreground">ETA: {v.eta}</span>}
                      </div>
                    </div>
                    <span className="text-lg font-black text-foreground">{v.price}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {v.features.map(f => (
                      <Badge key={f} variant="outline" className="text-[8px] font-bold">{f}</Badge>
                    ))}
                  </div>

                  {v.available && (
                    <Button className="w-full h-10 rounded-xl text-xs font-bold" onClick={() => navigate("/rides/hub", { state: { vehicleType: v.type, accessible: true } })}>
                      Book {v.type}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sensory Assistance */}
          {section === "sensory" && (
            <div className="space-y-4">
              {/* Vision section */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Vision Assistance</h3>
                </div>
                {preferences.filter(p => p.category === "vision").map(pref => {
                  const Icon = pref.icon;
                  return (
                    <div key={pref.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-bold text-foreground">{pref.label}</p>
                          <p className="text-[10px] text-muted-foreground">{pref.description}</p>
                        </div>
                      </div>
                      <Switch checked={pref.enabled} onCheckedChange={() => togglePref(pref.id)} />
                    </div>
                  );
                })}
              </div>

              {/* Hearing section */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Ear className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Hearing Assistance</h3>
                </div>
                {preferences.filter(p => p.category === "hearing").map(pref => {
                  const Icon = pref.icon;
                  return (
                    <div key={pref.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-bold text-foreground">{pref.label}</p>
                          <p className="text-[10px] text-muted-foreground">{pref.description}</p>
                        </div>
                      </div>
                      <Switch checked={pref.enabled} onCheckedChange={() => togglePref(pref.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Companion Booking */}
          {section === "companion" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Companion Ride</h3>
                </div>
                <p className="text-xs text-muted-foreground">Book a companion to ride alongside you for assistance</p>
              </div>

              {companions.map(c => (
                <div key={c.id} className="rounded-2xl bg-card border border-border/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.role} • {c.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.autoAdd && <Badge variant="secondary" className="text-[8px] font-bold">Auto-Add</Badge>}
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </div>
              ))}

              <Button className="w-full h-11 rounded-xl text-sm font-bold gap-2" variant="outline" onClick={() => { setCompanions(prev => [...prev, { id: Date.now().toString(), name: "New Companion", role: "Assistant", phone: "+1 (555) 000-0000", autoAdd: false }]); toast.success("Companion added"); }}>
                <UserPlus className="w-4 h-4" /> Add Companion
              </Button>

              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2">
                <h4 className="text-xs font-bold text-foreground">Companion Options</h4>
                {[
                  { label: "Auto-add companion to every ride", enabled: true },
                  { label: "Share ride tracking with companion", enabled: true },
                  { label: "Allow companion to book rides for me", enabled: false },
                ].map(opt => (
                  <div key={opt.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                    <span className="text-xs font-bold text-foreground">{opt.label}</span>
                    <Switch defaultChecked={opt.enabled} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accessibility Profile */}
          {section === "profile" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">My Accessibility Profile</h3>
                  <Badge className="text-[8px] font-bold gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Saved</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Your preferences are automatically applied to every ride</p>

                {[
                  { label: "Mobility", value: "Wheelchair user — Power chair", icon: Accessibility },
                  { label: "Vision", value: "Screen reader + High contrast", icon: Eye },
                  { label: "Hearing", value: "Haptic alerts enabled", icon: Ear },
                  { label: "Communication", value: "Text preferred", icon: MessageSquare },
                  { label: "Companion", value: "Maria G. — Caregiver", icon: Users },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-center">
                <Shield className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">Driver Notification</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Your driver is automatically informed of your accessibility needs before pickup</p>
              </div>

              <Button className="w-full h-11 rounded-xl text-sm font-bold gap-2" onClick={() => toast.success("Profile updated!")}>
                <CheckCircle className="w-4 h-4" /> Save Profile
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
