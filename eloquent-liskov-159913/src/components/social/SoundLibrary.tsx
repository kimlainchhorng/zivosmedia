/**
 * SoundLibrary — Browse trending audio clips for reels
 */
import { useState } from "react";
import { Search, Play, Pause, Music, TrendingUp, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SoundItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  usageCount: number;
  category: string;
}

// Sounds catalog will be populated from a real audio_tracks table when
// that backend ships; empty until then so we never display fabricated
// trending audio with fake usage counts.
const DEMO_SOUNDS: SoundItem[] = [];

interface SoundLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sound: SoundItem) => void;
}

export default function SoundLibrary({ open, onClose, onSelect }: SoundLibraryProps) {
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("trending");

  const categories = ["trending", "chill", "ambient", "dramatic"];

  const filtered = DEMO_SOUNDS.filter((s) => {
    const matchesSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.artist.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 safe-area-top">
        <h2 className="text-lg font-semibold">Sounds</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sounds..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-1 px-4 py-2">
        {categories.map((c) => (
          <button type="button"
            key={c}
            onClick={() => setActiveCategory(c)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors",
              activeCategory === c ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Sound list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {filtered.map((sound) => (
          <div
            key={sound.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40"
          >
            <button type="button"
              onClick={() => setPlaying(playing === sound.id ? null : sound.id)}
              className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
            >
              {playing === sound.id ? (
                <Pause className="h-4 w-4 text-primary" />
              ) : (
                <Play className="h-4 w-4 text-primary ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{sound.title}</p>
              <p className="text-xs text-muted-foreground">{sound.artist} • {sound.duration}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">{(sound.usageCount / 1000).toFixed(1)}K</p>
              <button type="button"
                onClick={() => onSelect(sound)}
                className="text-xs font-medium text-primary mt-0.5"
              >
                Use
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
