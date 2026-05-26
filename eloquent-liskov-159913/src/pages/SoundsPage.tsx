/**
 * SoundsPage — Creator audio library.
 * Browseable trending sounds creators can attach to reels and stories.
 * Mock data for v1 — structure maps directly to a `sounds` table.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Music2, Play, Pause, Plus, TrendingUp, Filter, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { cn } from "@/lib/utils";

interface Sound {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: string;
  usedIn: number;
  genre: string;
  trending?: boolean;
}

const SOUNDS: Sound[] = [
  { id: "s1", title: "Sunrise Over Tokyo", artist: "Lo-Fi Atelier", cover: "https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=200", duration: "0:28", usedIn: 2412, genre: "Chill", trending: true },
  { id: "s2", title: "Paris in the Rain", artist: "Café Noir", cover: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=200", duration: "0:35", usedIn: 1880, genre: "Jazz" },
  { id: "s3", title: "Roadtrip Anthem", artist: "Highway Tape", cover: "https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=200", duration: "0:45", usedIn: 5340, genre: "Pop", trending: true },
  { id: "s4", title: "Ocean Drift", artist: "Coral Tides", cover: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=200", duration: "0:32", usedIn: 974, genre: "Ambient" },
  { id: "s5", title: "Neon Markets", artist: "Bangkok Bass Club", cover: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=200", duration: "0:30", usedIn: 3201, genre: "Electronic", trending: true },
  { id: "s6", title: "Mountain Pass", artist: "Alpine Choir", cover: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200", duration: "0:42", usedIn: 612, genre: "Cinematic" },
  { id: "s7", title: "Sunset Marrakech", artist: "Souk Sessions", cover: "https://images.unsplash.com/photo-1539020140153-e479b8c8db2c?w=200", duration: "0:38", usedIn: 1456, genre: "World" },
  { id: "s8", title: "Late Night Diner", artist: "Vinyl 9th", cover: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=200", duration: "0:33", usedIn: 822, genre: "Jazz" },
];

const GENRES = ["All", "Chill", "Jazz", "Pop", "Ambient", "Electronic", "Cinematic", "World"];

export default function SoundsPage() {
  const navigate = useNavigate();
  const [activeGenre, setActiveGenre] = useState("All");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filtered = activeGenre === "All" ? SOUNDS : SOUNDS.filter((s) => s.genre === activeGenre);
  const trending = SOUNDS.filter((s) => s.trending);

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      <SEOHead title="Sounds · ZIVO" description="Trending audio for your reels and stories." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Music2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Sounds</h1>
          </div>
          <Button
            aria-label="Filter sounds"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
          >
            <Filter className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-12">
        {/* Genre chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 border-b border-border/40">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGenre(g)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                activeGenre === g
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Trending section */}
        {activeGenre === "All" && (
          <section className="pt-5 pb-2">
            <div className="flex items-center gap-2 px-4 mb-3">
              <TrendingUp className="h-4 w-4 text-ig-gradient" />
              <h2 className="text-base font-bold text-foreground">Trending now</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
              {trending.map((sound, idx) => {
                const isPlaying = playingId === sound.id;
                return (
                  <motion.div
                    key={sound.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="shrink-0 w-[150px]"
                  >
                    <div className="relative w-[150px] h-[150px] rounded-2xl overflow-hidden bg-muted shadow-md">
                      <img src={sound.cover} alt={sound.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                      <button
                        type="button"
                        aria-label={isPlaying ? "Pause" : "Play"}
                        onClick={() => setPlayingId(isPlaying ? null : sound.id)}
                        className="absolute inset-0 flex items-center justify-center active:scale-95"
                      >
                        <div className="h-11 w-11 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                          {isPlaying ? (
                            <Pause className="h-5 w-5 text-foreground" fill="currentColor" />
                          ) : (
                            <Play className="h-5 w-5 text-foreground ml-0.5" fill="currentColor" />
                          )}
                        </div>
                      </button>
                      <div className="absolute bottom-2 left-2 right-2 text-[10px] font-semibold text-white">
                        {sound.usedIn.toLocaleString()} reels
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-bold text-foreground line-clamp-1">{sound.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{sound.artist}</p>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Full list */}
        <section className="pt-4 px-4">
          <h2 className="text-base font-bold text-foreground mb-3">All sounds</h2>
          <div className="space-y-2">
            {filtered.map((sound, idx) => {
              const isPlaying = playingId === sound.id;
              return (
                <motion.div
                  key={sound.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors"
                >
                  <button
                    type="button"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    onClick={() => setPlayingId(isPlaying ? null : sound.id)}
                    className="shrink-0 relative active:scale-95 transition-transform"
                  >
                    <img src={sound.cover} alt={sound.title} className="w-12 h-12 rounded-lg object-cover" loading="lazy" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 rounded-lg transition-colors">
                      {isPlaying ? (
                        <Pause className="h-4 w-4 text-white" fill="currentColor" />
                      ) : (
                        <Play className="h-4 w-4 text-white ml-0.5" fill="currentColor" />
                      )}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{sound.title}</p>
                      {sound.trending && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-ig-gradient">
                          <TrendingUp className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="truncate">{sound.artist}</span>
                      <span>·</span>
                      <span className="shrink-0 flex items-center gap-0.5"><Volume2 className="h-2.5 w-2.5" />{sound.duration}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate("/feed/new")}
                    className="bg-ig-gradient text-white font-bold rounded-full h-8 px-3 hover:opacity-90 border-0 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" strokeWidth={3} />
                    Use
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground text-center px-6 pt-6">
          Sounds preview in-browser. Full library connects when audio uploads roll out.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
