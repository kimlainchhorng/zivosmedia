/**
 * MindfulnessPage — Guided meditation, breathing, and sleep stories.
 * Mock catalog; structure is real and maps to a future `mindfulness_sessions` table.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Play, Moon, Wind, Brain, Heart, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { cn } from "@/lib/utils";

type Category = "All" | "Meditation" | "Breathing" | "Sleep" | "Focus" | "Stress";

interface Session {
  id: string;
  title: string;
  guide: string;
  duration: string;
  category: Exclude<Category, "All">;
  cover: string;
  featured?: boolean;
}

const SESSIONS: Session[] = [
  { id: "m1", title: "Morning calm — 10 min reset", guide: "Aya Tanaka", duration: "10 min", category: "Meditation", cover: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400", featured: true },
  { id: "m2", title: "4-7-8 breathing for anxiety", guide: "Dr. Lina Park", duration: "6 min", category: "Breathing", cover: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=400", featured: true },
  { id: "m3", title: "Sleep story — Drifting over Kyoto", guide: "Hayden West", duration: "32 min", category: "Sleep", cover: "https://images.unsplash.com/photo-1454942901704-3c44c11b2ad1?w=400", featured: true },
  { id: "m4", title: "Box breathing for stress", guide: "Marcus Ferrell", duration: "5 min", category: "Breathing", cover: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=400" },
  { id: "m5", title: "Focus flow — 25 min deep work", guide: "Naomi Reyes", duration: "25 min", category: "Focus", cover: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400" },
  { id: "m6", title: "Letting go before sleep", guide: "Sofia Bianchi", duration: "20 min", category: "Sleep", cover: "https://images.unsplash.com/photo-1488642693986-d4d8d1f43c11?w=400" },
  { id: "m7", title: "Body scan for tension", guide: "Aya Tanaka", duration: "15 min", category: "Stress", cover: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400" },
  { id: "m8", title: "Visualization — mountain peak", guide: "Marcus Ferrell", duration: "12 min", category: "Meditation", cover: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400" },
];

const CATEGORIES: { key: Category; icon: typeof Brain }[] = [
  { key: "All", icon: Sparkles },
  { key: "Meditation", icon: Brain },
  { key: "Breathing", icon: Wind },
  { key: "Sleep", icon: Moon },
  { key: "Focus", icon: Heart },
  { key: "Stress", icon: Flame },
];

const STREAK_KEY = "zivo:mindfulness:streak:v1";

function loadStreak(): number {
  try {
    return Math.max(0, Math.floor(Number(localStorage.getItem(STREAK_KEY) || 0)));
  } catch { return 0; }
}

export default function MindfulnessPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [streak] = useState(loadStreak());

  const featured = SESSIONS.filter((s) => s.featured);
  const filtered = activeCategory === "All" ? SESSIONS : SESSIONS.filter((s) => s.category === activeCategory);

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      <SEOHead title="Mindfulness · ZIVO" description="Guided meditation, breathing, and sleep stories." noIndex />

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
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Mindfulness</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-12">
        {/* Streak banner */}
        <div className="px-4 pt-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <Flame className="absolute top-3 right-3 h-5 w-5 text-white/40" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Current streak</p>
            <p className="text-3xl font-bold mt-1">{streak} day{streak === 1 ? "" : "s"}</p>
            <p className="text-sm text-white/80 mt-1">
              {streak === 0 ? "Start with a 5-minute session to begin your streak." : "Keep going — one session today extends it."}
            </p>
          </motion.div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-4">
          {CATEGORIES.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={cn(
                "shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
                activeCategory === key
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {key}
            </button>
          ))}
        </div>

        {/* Featured carousel */}
        {activeCategory === "All" && (
          <section className="pb-4">
            <h2 className="text-base font-bold text-foreground px-4 mb-3">Featured</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
              {featured.map((s, idx) => (
                <motion.button
                  key={s.id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="shrink-0 w-[220px] text-left"
                >
                  <div className="relative w-[220px] h-[140px] rounded-2xl overflow-hidden bg-muted shadow-md">
                    <img src={s.cover} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 text-foreground text-[10px] font-bold rounded-full px-2 py-0.5">
                      <Clock className="h-2.5 w-2.5" /> {s.duration}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">{s.category}</p>
                      <p className="text-sm font-bold text-white leading-tight mt-0.5 line-clamp-2">{s.title}</p>
                    </div>
                    <div className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/95 flex items-center justify-center shadow-md">
                      <Play className="h-4 w-4 text-foreground ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* All sessions */}
        <section className="px-4">
          <h2 className="text-base font-bold text-foreground mb-3">
            {activeCategory === "All" ? "All sessions" : `${activeCategory} sessions`}
          </h2>
          <div className="space-y-2">
            {filtered.map((s, idx) => (
              <motion.button
                key={s.id}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025 }}
                whileTap={{ scale: 0.985 }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border text-left hover:bg-secondary/40 transition-colors"
              >
                <div className="relative shrink-0">
                  <img src={s.cover} alt={s.title} className="w-14 h-14 rounded-lg object-cover" loading="lazy" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 hover:bg-black/55 rounded-lg transition-colors">
                    <Play className="h-4 w-4 text-white ml-0.5" fill="currentColor" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground line-clamp-1">{s.title}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                    <span className="truncate">{s.guide}</span>
                    <span>·</span>
                    <span className="shrink-0 flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{s.duration}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground text-center px-6 pt-8">
          Audio playback rolls out as the Mindfulness library publishes.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
