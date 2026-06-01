/**
 * SoundLibrary — Browse trending audio clips for reels
 */
import { useState } from "react";
import { Search, Play, Pause, Music, TrendingUp, Clock, X, Sparkles, Radio, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

  const categories = ["all", "trending", "chill", "ambient", "dramatic"];

  const filtered = DEMO_SOUNDS.filter((s) => {
    const matchesSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.artist.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  const catalogSignal = search
    ? { label: "Search ready", detail: "Waiting for real tracks", width: "58%" }
    : activeCategory !== "all"
      ? { label: "Filter ready", detail: `${activeCategory} lane prepared`, width: "72%" }
      : { label: "Catalog shell", detail: "Rights-safe audio slots", width: "42%" };
  const emptyTitle = search ? "No matching sounds yet" : "Sound library coming soon";
  const emptyDescription = search
    ? "The real audio catalog is not connected yet, so search will light up once tracks are available."
    : "Real trending audio will appear here when the audio catalog is connected.";

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="zivo-social-surface fixed inset-0 z-50 flex flex-col"
    >
      <div className="safe-area-top px-4 pt-3">
        <div className="zivo-social-header-glass flex items-center justify-between gap-3 rounded-[1.25rem] px-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
            <Music className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-primary">Reels audio</p>
            <h2 className="truncate text-lg font-black tracking-tight text-foreground">Sounds</h2>
          </div>
        </div>
        <button type="button" onClick={onClose} className="zivo-social-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <X className="h-5 w-5" />
        </button>
        </div>
      </div>

      <div className="px-4 pb-2 pt-4">
        <div className="zivo-social-search relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sounds..."
            className="h-11 w-full bg-transparent pl-11 pr-4 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
        {categories.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setActiveCategory(c)}
            className={cn(
              "shrink-0 capitalize transition-transform active:scale-95",
              activeCategory === c ? "zivo-social-chip-active" : "zivo-social-chip"
            )}
            aria-pressed={activeCategory === c}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {filtered.length === 0 && (
          <div className="zivo-social-module mt-3 flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-[1.5rem] px-5 py-10 text-center">
            <span className="zivo-social-share-orb mb-5 flex h-16 w-16 items-center justify-center rounded-3xl text-primary">
              <Music className="h-7 w-7" />
            </span>
            <span className="zivo-social-chip mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-primary">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              Catalog pending
            </span>
            <h3 className="text-xl font-black tracking-tight text-foreground">{emptyTitle}</h3>
            <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-muted-foreground">
              {emptyDescription}
            </p>
            <div className="zivo-social-share-preview mt-5 flex w-full max-w-sm items-center justify-between gap-3 rounded-3xl px-3 py-2 text-left">
              <span className="flex min-w-0 items-center gap-2">
                <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-primary">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Current filter</span>
                  <span className="block truncate text-sm font-black text-foreground">
                    {search ? `"${search}"` : activeCategory}
                  </span>
                </span>
              </span>
              <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
                Ready UI
              </span>
            </div>
            <div className="zivo-social-module-tile mt-3 w-full max-w-sm rounded-3xl px-3 py-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-primary">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-foreground">{catalogSignal.label}</span>
                    <span className="block truncate text-[11px] font-semibold text-muted-foreground">{catalogSignal.detail}</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
                  Audio
                </span>
              </div>
              <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-fuchsia-500 transition-[width] duration-300"
                  style={{ width: catalogSignal.width }}
                />
              </div>
            </div>
            <div className="mt-3 grid w-full max-w-sm gap-2 sm:grid-cols-3">
              <div className="zivo-social-module-tile flex items-center gap-3 p-3 text-left">
                <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">Trending ready</p>
                  <p className="text-xs font-semibold text-muted-foreground">No fake counts</p>
                </div>
              </div>
              <div className="zivo-social-module-tile flex items-center gap-3 p-3 text-left">
                <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">Reel timing</p>
                  <p className="text-xs font-semibold text-muted-foreground">Built for clips</p>
                </div>
              </div>
              <div className="zivo-social-module-tile flex items-center gap-3 p-3 text-left sm:col-span-1">
                <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground">Rights safe</p>
                  <p className="text-xs font-semibold text-muted-foreground">Catalog only</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {filtered.map((sound) => (
          <div
            key={sound.id}
            className="zivo-social-module-tile flex items-center gap-3 rounded-2xl p-3 transition-transform hover:-translate-y-0.5"
          >
            <button
              type="button"
              onClick={() => setPlaying(playing === sound.id ? null : sound.id)}
              className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary transition-transform active:scale-95"
              aria-label={playing === sound.id ? `Pause ${sound.title}` : `Preview ${sound.title}`}
            >
              {playing === sound.id ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-black text-foreground">{sound.title}</p>
              <p className="text-xs font-semibold text-muted-foreground">{sound.artist} • {sound.duration}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-muted-foreground">{(sound.usageCount / 1000).toFixed(1)}K</p>
              <button
                type="button"
                onClick={() => onSelect(sound)}
                className="zivo-social-chip-active mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black"
                aria-label={`Use ${sound.title} by ${sound.artist}`}
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Use
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
