/**
 * RideWellnessComfort — Temperature, quiet mode, meditation, motion sickness
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Thermometer, VolumeX, Brain, Waves, Wind, Snowflake, Sun, Moon, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const moods = [
  { id: "calm", label: "Calm", icon: Leaf, color: "text-emerald-500" },
  { id: "focus", label: "Focus", icon: Brain, color: "text-blue-500" },
  { id: "sleep", label: "Sleep", icon: Moon, color: "text-indigo-500" },
  { id: "energize", label: "Energize", icon: Sun, color: "text-amber-500" },
];

export default function RideWellnessComfort() {
  const [temp, setTemp] = useState([72]);
  const [quietMode, setQuietMode] = useState(false);
  const [motionSick, setMotionSick] = useState(false);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [freshAir, setFreshAir] = useState(false);

  return (
    <div className="space-y-4">
      {/* Temperature */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-primary" /> Climate Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Snowflake className="w-4 h-4 text-blue-400" />
              <Slider value={temp} onValueChange={setTemp} min={60} max={85} step={1} className="w-40" />
              <Sun className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-primary">{temp[0]}°F</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Wind className="w-4 h-4 text-muted-foreground" /> Fresh Air Mode
            </div>
            <Switch checked={freshAir} onCheckedChange={(v) => { setFreshAir(v); toast.success(v ? "Windows will be cracked" : "Fresh air off"); }} />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Mode */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <VolumeX className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <span className="font-bold text-sm">Quiet Ride</span>
                <p className="text-xs text-muted-foreground">Driver won't chat, minimal disruptions</p>
              </div>
            </div>
            <Switch checked={quietMode} onCheckedChange={(v) => { setQuietMode(v); toast.success(v ? "Quiet mode on" : "Quiet mode off"); }} />
          </div>
        </CardContent>
      </Card>

      {/* Mood Selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Waves className="w-4 h-4 text-primary" /> Ride Mood
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {moods.map((mood) => {
              const Icon = mood.icon;
              const active = activeMood === mood.id;
              return (
                <motion.button
                  key={mood.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setActiveMood(active ? null : mood.id); toast.success(active ? "Mood cleared" : `${mood.label} mode set`); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${active ? "bg-primary/10 border-primary" : "border-border/50 hover:bg-muted/30"}`}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-primary" : mood.color}`} />
                  <span className="text-[10px] font-bold">{mood.label}</span>
                </motion.button>
              );
            })}
          </div>
          {activeMood && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Ambient lighting & sounds adjusted for {moods.find(m => m.id === activeMood)?.label} mode
            </p>
          )}
        </CardContent>
      </Card>

      {/* Motion Sickness */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Waves className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <span className="font-bold text-sm">Motion Comfort</span>
                <p className="text-xs text-muted-foreground">Smoother driving, gentle stops & turns</p>
              </div>
            </div>
            <Switch checked={motionSick} onCheckedChange={(v) => { setMotionSick(v); toast.success(v ? "Motion comfort enabled" : "Standard driving"); }} />
          </div>
          {motionSick && (
            <div className="mt-3 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
              Driver will avoid sudden acceleration, take wider turns, and stop more gradually.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
