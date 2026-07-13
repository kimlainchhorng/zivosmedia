/**
 * RideAccessibilityPlus — WAV, hearing/vision assist, service animals, adaptive UI
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Accessibility, Eye, Ear, Dog, Armchair, Phone, Heart, Shield, Check, ChevronRight, Volume2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AccessibilityOption {
  id: string;
  label: string;
  desc: string;
  icon: typeof Accessibility;
  color: string;
}

const mobilityOptions: AccessibilityOption[] = [
  { id: "wav", label: "Wheelchair Vehicle", desc: "Ramp or lift-equipped vehicle", icon: Accessibility, color: "text-blue-500" },
  { id: "boarding", label: "Assisted Boarding", desc: "Driver assistance getting in/out", icon: Armchair, color: "text-green-500" },
  { id: "space", label: "Extra Space", desc: "Larger vehicle for mobility aids", icon: Armchair, color: "text-purple-500" },
];

const sensoryOptions: AccessibilityOption[] = [
  { id: "hearing", label: "Hearing Assistance", desc: "Visual notifications, text-based communication", icon: Ear, color: "text-amber-500" },
  { id: "vision", label: "Vision Support", desc: "Audio guidance, high-contrast mode", icon: Eye, color: "text-cyan-500" },
  { id: "audio-desc", label: "Audio Descriptions", desc: "Spoken trip updates and directions", icon: Volume2, color: "text-pink-500" },
];

const otherOptions: AccessibilityOption[] = [
  { id: "service-animal", label: "Service Animal", desc: "All drivers accommodate service animals", icon: Dog, color: "text-orange-500" },
  { id: "large-text", label: "Large Text Mode", desc: "Increased font size throughout app", icon: Type, color: "text-indigo-500" },
  { id: "emergency", label: "Accessible Emergency", desc: "One-tap SOS with location sharing", icon: Phone, color: "text-destructive" },
];

export default function RideAccessibilityPlus() {
  const [enabled, setEnabled] = useState<string[]>(["service-animal"]);
  const [savedProfile, setSavedProfile] = useState(false);

  const toggle = (id: string) => {
    setEnabled((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSavedProfile(false);
  };

  const saveProfile = () => {
    setSavedProfile(true);
    toast.success("Accessibility profile saved!");
  };

  const renderSection = (title: string, options: AccessibilityOption[]) => (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground">{title}</p>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isOn = enabled.includes(opt.id);
        return (
          <motion.button
            key={opt.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggle(opt.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
              isOn ? "bg-primary/10 border-primary/30" : "bg-card border-border/30"
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isOn ? "bg-primary/20" : "bg-muted/40")}>
              <Icon className={cn("w-5 h-5", isOn ? opt.color : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
              isOn ? "bg-primary border-primary" : "border-muted-foreground/30"
            )}>
              {isOn && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/15 rounded-2xl p-4 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-black text-foreground">Inclusive Rides</p>
            <p className="text-xs text-muted-foreground">Every ride should be accessible to everyone</p>
          </div>
        </div>
      </div>

      {/* Saved profile badge */}
      {enabled.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-xl">
          <Shield className="w-4 h-4 text-primary" />
          <p className="text-xs text-muted-foreground flex-1">
            <span className="font-bold text-foreground">{enabled.length}</span> accessibility feature{enabled.length !== 1 && "s"} active
          </p>
          {!savedProfile && (
            <button type="button" onClick={saveProfile} className="text-xs font-bold text-primary">
              Save Profile
            </button>
          )}
        </div>
      )}

      {renderSection("Mobility", mobilityOptions)}
      {renderSection("Sensory", sensoryOptions)}
      {renderSection("Other Needs", otherOptions)}

      {/* Info */}
      <div className="bg-muted/20 rounded-xl p-3 space-y-1">
        <p className="text-xs font-bold text-foreground">🤝 Our Commitment</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          All ZIVO Rides drivers are trained in accessibility assistance. Service animals are always welcome at no extra charge. Contact support for any special accommodation needs.
        </p>
      </div>
    </div>
  );
}
