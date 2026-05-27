/**
 * PodcastsPage — ZIVO podcasts directory.
 * Browseable list of featured shows and latest episodes. Mock data for v1 —
 * structure is real (a podcasts table can populate this without UI changes).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Headphones, Play, Pause, Clock, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { cn } from "@/lib/utils";

interface Show {
  id: string;
  title: string;
  host: string;
  cover: string;
  episodes: number;
  category: string;
}

interface Episode {
  id: string;
  showId: string;
  showTitle: string;
  title: string;
  duration: string;
  publishedAgo: string;
  cover: string;
}

const SHOWS: Show[] = [
  { id: "s1", title: "The Travel Edit", host: "ZIVO Originals", cover: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400", episodes: 42, category: "Travel" },
  { id: "s2", title: "Founders & Frequent Flyers", host: "ZIVO Originals", cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400", episodes: 28, category: "Business" },
  { id: "s3", title: "Hotels After Dark", host: "Maya Chen", cover: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400", episodes: 16, category: "Hospitality" },
  { id: "s4", title: "Driving the World", host: "Carlos Mendoza", cover: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400", episodes: 35, category: "Travel" },
];

const EPISODES: Episode[] = [
  { id: "e1", showId: "s1", showTitle: "The Travel Edit", title: "How Tokyo became the world's longest hotel queue", duration: "32 min", publishedAgo: "2d ago", cover: SHOWS[0].cover },
  { id: "e2", showId: "s2", showTitle: "Founders & Frequent Flyers", title: "Why your loyalty miles are about to change", duration: "48 min", publishedAgo: "5d ago", cover: SHOWS[1].cover },
  { id: "e3", showId: "s3", showTitle: "Hotels After Dark", title: "Concierge confidential: the requests they can't refuse", duration: "26 min", publishedAgo: "1w ago", cover: SHOWS[2].cover },
  { id: "e4", showId: "s4", showTitle: "Driving the World", title: "Patagonia by camper van — 4,800 km solo", duration: "1 hr 12 min", publishedAgo: "1w ago", cover: SHOWS[3].cover },
];

const CATEGORIES = ["All", "Travel", "Business", "Hospitality", "Tech"];

export default function PodcastsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filteredShows = activeCategory === "All" ? SHOWS : SHOWS.filter((s) => s.category === activeCategory);

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      <SEOHead title="Podcasts · ZIVO" description="Listen to ZIVO podcasts on the go." />

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
              <Headphones className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Podcasts</h1>
          </div>
          <Button
            aria-label="Search podcasts"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
          >
            <Search className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-12">
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 border-b border-border/40">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                activeCategory === cat
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured shows — horizontal carousel */}
        <section className="pt-5 pb-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-base font-bold text-foreground">Featured shows</h2>
            <button type="button" aria-label="View all shows" className="text-xs font-semibold text-ig-gradient">
              See all
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
            {filteredShows.map((show, idx) => (
              <motion.button
                key={show.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileTap={{ scale: 0.97 }}
                className="shrink-0 w-[160px] text-left"
              >
                <div className="relative w-[160px] h-[160px] rounded-2xl overflow-hidden bg-muted shadow-md">
                  <img
                    src={show.cover}
                    alt={show.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 text-white text-[10px] font-semibold">
                    <Headphones className="h-3 w-3" />
                    {show.episodes} episodes
                  </div>
                </div>
                <p className="mt-2 text-sm font-bold text-foreground line-clamp-1">{show.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{show.host}</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Latest episodes */}
        <section className="pt-4 px-4">
          <h2 className="text-base font-bold text-foreground mb-3">Latest episodes</h2>
          <div className="space-y-3">
            {EPISODES.map((ep, idx) => {
              const isPlaying = playingId === ep.id;
              return (
                <motion.div
                  key={ep.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors"
                >
                  <div className="shrink-0 relative">
                    <img
                      src={ep.cover}
                      alt={ep.showTitle}
                      className="w-14 h-14 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      aria-label={isPlaying ? "Pause episode" : "Play episode"}
                      onClick={() => setPlayingId(isPlaying ? null : ep.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 rounded-xl transition-colors active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 text-white" fill="currentColor" />
                      ) : (
                        <Play className="h-5 w-5 text-white" fill="currentColor" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-ig-gradient uppercase tracking-wider">{ep.showTitle}</p>
                    <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug mt-0.5">{ep.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {ep.duration}
                      </span>
                      <span>{ep.publishedAgo}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </motion.div>
              );
            })}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground text-center px-6 pt-8">
          Showcasing featured shows. Audio playback rolls out as more episodes publish.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
