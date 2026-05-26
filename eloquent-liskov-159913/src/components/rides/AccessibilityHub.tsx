/**
 * AccessibilityHub - Accessibility features panel with assisted boarding, voice commands
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Accessibility, Volume2, Eye, Ear, Hand, MessageSquare, Check, ChevronRight, Info, Mic, Type, Monitor, Vibrate, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface A11yFeature {
  id: string;
  icon: typeof Accessibility;
  label: string;
  description: string;
  category: "mobility" | "vision" | "hearing" | "cognitive";
  enabled: boolean;
}

const a11yFeatures: A11yFeature[] = [
  // Mobility
  { id: "wheelchair", icon: Accessibility, label: "Wheelchair Accessible", description: "Request WAV-equipped vehicle", category: "mobility", enabled: false },
  { id: "assisted", icon: Hand, label: "Assisted Boarding", description: "Driver helps with boarding and luggage", category: "mobility", enabled: false },
  { id: "extra_time", icon: MessageSquare, label: "Extra Wait Time", description: "Driver waits up to 5 extra minutes", category: "mobility", enabled: false },

  // Vision
  { id: "screen_reader", icon: Eye, label: "Screen Reader Mode", description: "Optimized for VoiceOver / TalkBack", category: "vision", enabled: true },
  { id: "large_text", icon: Type, label: "Large Text", description: "Increase font size throughout the app", category: "vision", enabled: false },
  { id: "high_contrast", icon: Monitor, label: "High Contrast", description: "Enhanced color contrast for readability", category: "vision", enabled: false },

  // Hearing
  { id: "visual_alerts", icon: Vibrate, label: "Visual & Haptic Alerts", description: "Replace audio cues with vibration & flash", category: "hearing", enabled: false },
  { id: "text_driver", icon: MessageSquare, label: "Text-Only Communication", description: "Communicate with driver via text only", category: "hearing", enabled: false },

  // Cognitive
  { id: "simple_mode", icon: Moon, label: "Simplified Interface", description: "Reduce UI complexity and animations", category: "cognitive", enabled: false },
  { id: "voice_commands", icon: Mic, label: "Voice Commands", description: "Navigate and book rides using voice", category: "cognitive", enabled: false },
];

const categories = [
  { id: "mobility", label: "Mobility", icon: Accessibility, color: "text-emerald-500" },
  { id: "vision", label: "Vision", icon: Eye, color: "text-sky-500" },
  { id: "hearing", label: "Hearing", icon: Ear, color: "text-violet-500" },
  { id: "cognitive", label: "Cognitive", icon: MessageSquare, color: "text-amber-500" },
];

const PREFS_KEY = "zivo_a11y_prefs";

export default function AccessibilityHub() {
  const [features, setFeatures] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
      return saved ?? Object.fromEntries(a11yFeatures.map(f => [f.id, f.enabled]));
    } catch {
      return Object.fromEntries(a11yFeatures.map(f => [f.id, f.enabled]));
    }
  });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const toggleFeature = (id: string) => {
    setFeatures(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      const feat = a11yFeatures.find(f => f.id === id);
      toast.success(`${feat?.label} ${newState[id] ? "enabled" : "disabled"}`);
      return newState;
    });
  };

  const savePreferences = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(features));
    toast.success("Accessibility preferences saved!");
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info("Voice commands not supported in this browser");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setIsListening(false);
      if (command.includes("home")) toast.success(`Heard: "${command}" — booking ride home`);
      else if (command.includes("eta")) toast.success(`Heard: "${command}" — checking ETA`);
      else toast.info(`Heard: "${command}"`);
    };
    recognition.onerror = () => { setIsListening(false); toast.error("Could not hear command"); };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const enabledCount = Object.values(features).filter(Boolean).length;

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 bg-gradient-to-b from-primary/5 to-transparent border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Accessibility className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Accessibility</h3>
              <p className="text-[10px] text-muted-foreground">Ride your way, comfortably</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-bold">
            {enabledCount} active
          </Badge>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5">
          <button type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
              !activeCategory ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"
            )}
          >
            All
          </button>
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button type="button"
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                  activeCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"
                )}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Features list */}
      <div className="px-4 py-3 space-y-2">
        {a11yFeatures
          .filter(f => !activeCategory || f.category === activeCategory)
          .map((feat, i) => {
            const Icon = feat.icon;
            const active = features[feat.id];
            const catConfig = categories.find(c => c.id === feat.category);

            return (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  active ? "bg-primary/5 border-primary/15" : "bg-muted/5 border-border/20"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  active ? "bg-primary/10" : "bg-muted/30"
                )}>
                  <Icon className={cn("w-4 h-4", active ? catConfig?.color || "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-foreground">{feat.label}</span>
                  <p className="text-[10px] text-muted-foreground">{feat.description}</p>
                </div>
                <Switch checked={active} onCheckedChange={() => toggleFeature(feat.id)} />
              </motion.div>
            );
          })}
      </div>

      {/* Voice commands demo */}
      {features.voice_commands && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-3">
          <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 text-center">
            <Mic className="w-8 h-8 text-primary mx-auto mb-2" />
            <span className="text-xs font-bold text-foreground">Voice Commands Active</span>
            <p className="text-[10px] text-muted-foreground mt-1">
              Try: "Book a ride home" or "What's my ETA?"
            </p>
            <Button size="sm" className="mt-3 h-8 text-xs" onClick={startListening} disabled={isListening}>
              <Mic className={`w-3 h-3 mr-1.5 ${isListening ? "animate-pulse" : ""}`} />
              {isListening ? "Listening..." : "Start Listening"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Save preferences */}
      <div className="px-4 pb-4">
        <Button
          onClick={savePreferences}
          className="w-full h-11 rounded-xl font-bold"
        >
          <Check className="w-4 h-4 mr-2" /> Save Preferences
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Preferences apply to all future rides
        </p>
      </div>
    </div>
  );
}
