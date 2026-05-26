/**
 * RideEntertainment — In-ride music control, ambient preferences, ride playlist
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Volume2, VolumeX, SkipForward, SkipBack, Play, Pause, Radio, Palette, Sun, Moon, Sparkles, Headphones, ListMusic, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "player" | "mood" | "playlist";

const moods = [
  { id: "chill", name: "Chill", emoji: "😌", genres: "Lo-fi, Ambient, Jazz", color: "from-sky-500/10 to-blue-500/10", border: "border-sky-500/20" },
  { id: "energetic", name: "Energetic", emoji: "⚡", genres: "Pop, Dance, EDM", color: "from-amber-500/10 to-orange-500/10", border: "border-amber-500/20" },
  { id: "focus", name: "Focus", emoji: "🎯", genres: "Classical, Instrumental", color: "from-emerald-500/10 to-teal-500/10", border: "border-emerald-500/20" },
  { id: "party", name: "Party", emoji: "🎉", genres: "Hip-hop, R&B, Latin", color: "from-violet-500/10 to-pink-500/10", border: "border-violet-500/20" },
  { id: "scenic", name: "Scenic", emoji: "🌅", genres: "Acoustic, Folk, Nature", color: "from-rose-500/10 to-amber-500/10", border: "border-rose-500/20" },
  { id: "silent", name: "Silent", emoji: "🤫", genres: "No music", color: "from-muted/20 to-muted/10", border: "border-border/40" },
];

const ambientSettings = [
  { id: "lighting", name: "Interior Lighting", options: ["Auto", "Warm", "Cool", "Off"], current: "Auto", icon: Sun },
  { id: "scent", name: "Air Freshener", options: ["None", "Lavender", "Ocean", "Citrus"], current: "None", icon: Sparkles },
];

const playlist = [
  { id: "1", title: "Midnight City", artist: "M83", duration: "4:03", liked: true },
  { id: "2", title: "Blinding Lights", artist: "The Weeknd", duration: "3:20", liked: false },
  { id: "3", title: "Levitating", artist: "Dua Lipa", duration: "3:23", liked: true },
  { id: "4", title: "Starboy", artist: "The Weeknd", duration: "3:50", liked: false },
  { id: "5", title: "Heat Waves", artist: "Glass Animals", duration: "3:59", liked: true },
];

export default function RideEntertainment() {
  const [activeTab, setActiveTab] = useState<Tab>("player");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolume] = useState(60);
  const [selectedMood, setSelectedMood] = useState("chill");
  const [ambientPrefs, setAmbientPrefs] = useState<Record<string, string>>({ lighting: "Auto", scent: "None" });
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set(["1", "3", "5"]));

  const tabs = [
    { id: "player" as const, label: "Player", icon: Music },
    { id: "mood" as const, label: "Mood", icon: Radio },
    { id: "playlist" as const, label: "Playlist", icon: ListMusic },
  ];

  const track = playlist[currentTrack];
  const nextTrack = () => setCurrentTrack(i => (i + 1) % playlist.length);
  const prevTrack = () => setCurrentTrack(i => (i - 1 + playlist.length) % playlist.length);

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
          {activeTab === "player" && (
            <div className="space-y-4">
              {/* Now playing */}
              <div className="rounded-2xl via-primary/5 border border-border p-6 text-center relative overflow-hidden bg-secondary">
                <div className="absolute -top-8 -right-8 w-24 h-24 to-transparent rounded-full bg-secondary" />
                <div className="relative">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4"
                    animate={isPlaying ? { rotate: 360 } : {}}
                    transition={isPlaying ? { repeat: Infinity, duration: 8, ease: "linear" } : {}}
                  >
                    <Headphones className="w-10 h-10 text-primary" />
                  </motion.div>
                  <p className="text-sm font-black text-foreground">{track.title}</p>
                  <p className="text-xs text-muted-foreground">{track.artist}</p>

                  {/* Progress bar */}
                  <div className="mt-4 px-4">
                    <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                      <motion.div className="h-full bg-primary rounded-full" animate={{ width: isPlaying ? "100%" : "35%" }} transition={isPlaying ? { duration: 180, ease: "linear" } : {}} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-muted-foreground">1:24</span>
                      <span className="text-[9px] text-muted-foreground">{track.duration}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <button type="button" onClick={prevTrack} className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center active:scale-95 transition-transform">
                      <SkipBack className="w-4 h-4 text-foreground" />
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg"
                    >
                      {isPlaying ? <Pause className="w-6 h-6 text-primary-foreground" /> : <Play className="w-6 h-6 text-primary-foreground ml-0.5" />}
                    </motion.button>
                    <button type="button" onClick={nextTrack} className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center active:scale-95 transition-transform">
                      <SkipForward className="w-4 h-4 text-foreground" />
                    </button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3 mt-4 px-4">
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="flex-1 h-1.5 rounded-full bg-muted/30 relative cursor-pointer" onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setVolume(Math.round(((e.clientX - rect.left) / rect.width) * 100)); }}>
                      <div className="absolute h-full bg-primary rounded-full" style={{ width: `${volume}%` }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-primary-foreground shadow-sm" style={{ left: `${volume}%`, marginLeft: "-6px" }} />
                    </div>
                    <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Ambient */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Ambient Settings</h3>
                {ambientSettings.map(setting => {
                  const Icon = setting.icon;
                  return (
                    <div key={setting.id} className="rounded-xl bg-card border border-border/40 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">{setting.name}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {setting.options.map(opt => (
                          <button type="button" key={opt} onClick={() => setAmbientPrefs(prev => ({ ...prev, [setting.id]: opt }))} className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all", ambientPrefs[setting.id] === opt ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-foreground border-border/40")}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "mood" && (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground px-1">Set the vibe for your ride</p>
              <div className="grid grid-cols-2 gap-2">
                {moods.map(mood => (
                  <motion.button
                    key={mood.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedMood(mood.id); toast.success(`${mood.name} mood activated!`); }}
                    className={cn("p-4 rounded-2xl border text-left transition-all bg-gradient-to-br", mood.color, selectedMood === mood.id ? `${mood.border} shadow-md ring-1 ring-primary/20` : "border-border/40")}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                    <p className="text-sm font-bold text-foreground mt-1">{mood.name}</p>
                    <p className="text-[9px] text-muted-foreground">{mood.genres}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "playlist" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Ride Playlist</h3>
                <Badge variant="outline" className="text-[9px] font-bold">{playlist.length} tracks</Badge>
              </div>
              {playlist.map((t, i) => {
                const isCurrentTrack = i === currentTrack;
                const isLiked = likedTracks.has(t.id);
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => { setCurrentTrack(i); setIsPlaying(true); setActiveTab("player"); }}
                    className={cn("w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all", isCurrentTrack ? "bg-primary/5 border-primary/30" : "bg-card border-border/40")}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", isCurrentTrack ? "bg-primary/10" : "bg-muted/30")}>
                      {isCurrentTrack && isPlaying ? (
                        <div className="flex items-end gap-0.5 h-4">
                          {[0.6, 1, 0.4].map((h, j) => (
                            <motion.div key={j} className="w-1 bg-primary rounded-full" animate={{ height: [`${h * 16}px`, "4px", `${h * 16}px`] }} transition={{ repeat: Infinity, duration: 0.8, delay: j * 0.15 }} />
                          ))}
                        </div>
                      ) : (
                        <Music className={cn("w-4 h-4", isCurrentTrack ? "text-primary" : "text-muted-foreground")} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-bold truncate", isCurrentTrack ? "text-primary" : "text-foreground")}>{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{t.artist}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{t.duration}</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setLikedTracks(prev => { const next = new Set(prev); next.has(t.id) ? next.delete(t.id) : next.add(t.id); return next; }); }} className="w-8 h-8 flex items-center justify-center">
                      <Heart className={cn("w-3.5 h-3.5 transition-colors", isLiked ? "text-red-500 fill-red-500" : "text-muted-foreground")} />
                    </button>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
