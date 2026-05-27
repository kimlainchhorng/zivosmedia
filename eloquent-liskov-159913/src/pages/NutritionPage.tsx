/**
 * NutritionPage — Daily meal & macro logger.
 * Local-only food log + water intake counter. Maps to a future
 * `nutrition_log` table without UI changes.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Apple, Plus, Droplets, Minus, X, Coffee, Soup, Pizza, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { cn } from "@/lib/utils";

type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  slot: MealSlot;
}

const STORAGE_KEY = "zivo:nutrition:v1";
const WATER_KEY = "zivo:nutrition:water:v1";

const SLOTS: { key: MealSlot; label: string; icon: typeof Coffee }[] = [
  { key: "breakfast", label: "Breakfast", icon: Coffee },
  { key: "lunch", label: "Lunch", icon: Soup },
  { key: "dinner", label: "Dinner", icon: Pizza },
  { key: "snack", label: "Snacks", icon: Cookie },
];

const SEEDS: FoodEntry[] = [
  { id: "f1", name: "Oatmeal with banana", calories: 320, protein: 10, carbs: 58, fats: 6, slot: "breakfast" },
  { id: "f2", name: "Grilled chicken salad", calories: 450, protein: 38, carbs: 22, fats: 24, slot: "lunch" },
];

const TARGETS = { calories: 2000, protein: 100, carbs: 250, fats: 70, water: 8 };

function loadEntries(): FoodEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEEDS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEEDS;
    return parsed as FoodEntry[];
  } catch { return SEEDS; }
}

function loadWater(): number {
  try { return Math.max(0, Math.floor(Number(localStorage.getItem(WATER_KEY) || 0))); } catch { return 0; }
}

function saveEntries(entries: FoodEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* private mode */ }
}

function saveWater(n: number) {
  try { localStorage.setItem(WATER_KEY, String(n)); } catch { /* private mode */ }
}

export default function NutritionPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [water, setWater] = useState(0);
  const [adding, setAdding] = useState<MealSlot | null>(null);
  const [draft, setDraft] = useState({ name: "", calories: "", protein: "", carbs: "", fats: "" });

  useEffect(() => { setEntries(loadEntries()); setWater(loadWater()); }, []);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fats: acc.fats + e.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );
  }, [entries]);

  const removeEntry = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveEntries(next);
  };

  const addEntry = (slot: MealSlot) => {
    if (!draft.name.trim()) return;
    const newEntry: FoodEntry = {
      id: `e-${Date.now()}`,
      name: draft.name.trim(),
      calories: Math.max(0, Math.floor(Number(draft.calories) || 0)),
      protein: Math.max(0, Math.floor(Number(draft.protein) || 0)),
      carbs: Math.max(0, Math.floor(Number(draft.carbs) || 0)),
      fats: Math.max(0, Math.floor(Number(draft.fats) || 0)),
      slot,
    };
    const next = [...entries, newEntry];
    setEntries(next);
    saveEntries(next);
    setDraft({ name: "", calories: "", protein: "", carbs: "", fats: "" });
    setAdding(null);
  };

  const adjustWater = (delta: number) => {
    const next = Math.max(0, Math.min(20, water + delta));
    setWater(next);
    saveWater(next);
  };

  const caloriePct = Math.min(100, Math.round((totals.calories / TARGETS.calories) * 100));

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Nutrition · ZIVO" description="Log meals, calories, macros, and water intake." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Apple className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Nutrition</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Daily totals banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Today</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-3xl font-bold">{totals.calories}</p>
            <p className="text-base text-white/80">/ {TARGETS.calories} cal</p>
          </div>
          <div className="mt-3 h-2 w-full bg-white/15 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${caloriePct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-white/90 rounded-full"
            />
          </div>
          <div className="flex items-center justify-around mt-4 text-center">
            <div>
              <p className="text-xs text-white/70">Protein</p>
              <p className="text-sm font-bold">{totals.protein}<span className="font-medium text-white/70">g</span></p>
            </div>
            <div>
              <p className="text-xs text-white/70">Carbs</p>
              <p className="text-sm font-bold">{totals.carbs}<span className="font-medium text-white/70">g</span></p>
            </div>
            <div>
              <p className="text-xs text-white/70">Fats</p>
              <p className="text-sm font-bold">{totals.fats}<span className="font-medium text-white/70">g</span></p>
            </div>
          </div>
        </motion.div>

        {/* Water tracker */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-ig-gradient" />
              <div>
                <p className="text-sm font-bold text-foreground">Water</p>
                <p className="text-[11px] text-muted-foreground">{water} of {TARGETS.water} glasses</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Remove a glass"
                onClick={() => adjustWater(-1)}
                disabled={water === 0}
                className="h-9 w-9 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-secondary active:scale-90 transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Add a glass"
                onClick={() => adjustWater(1)}
                className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: TARGETS.water }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-2 rounded-full transition-colors",
                  i < water ? "bg-ig-gradient" : "bg-secondary",
                )}
              />
            ))}
          </div>
        </div>

        {/* Meal slots */}
        {SLOTS.map(({ key, label, icon: Icon }) => {
          const slotEntries = entries.filter((e) => e.slot === key);
          const slotTotal = slotEntries.reduce((sum, e) => sum + e.calories, 0);
          const isAdding = adding === key;
          return (
            <section key={key} className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {slotEntries.length === 0 ? "Nothing logged" : `${slotEntries.length} item · ${slotTotal} cal`}
                  </p>
                </div>
                {!isAdding && (
                  <button
                    type="button"
                    aria-label={`Add ${label}`}
                    onClick={() => setAdding(key)}
                    className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition"
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} />
                  </button>
                )}
              </div>

              <div className="px-4 py-2">
                {slotEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.calories} cal · {e.protein}p · {e.carbs}c · {e.fats}f
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${e.name}`}
                      onClick={() => removeEntry(e.id)}
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <AnimatePresence>
                  {isAdding && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="py-2 space-y-2 overflow-hidden"
                    >
                      <input
                        type="text"
                        placeholder="Food name"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        <input type="number" inputMode="numeric" placeholder="Cal" value={draft.calories} onChange={(e) => setDraft({ ...draft, calories: e.target.value })} className="h-9 px-2 rounded-lg bg-background border border-border text-xs text-center focus:outline-none focus:ring-2 focus:ring-rose-500/30" />
                        <input type="number" inputMode="numeric" placeholder="P g" value={draft.protein} onChange={(e) => setDraft({ ...draft, protein: e.target.value })} className="h-9 px-2 rounded-lg bg-background border border-border text-xs text-center focus:outline-none focus:ring-2 focus:ring-rose-500/30" />
                        <input type="number" inputMode="numeric" placeholder="C g" value={draft.carbs} onChange={(e) => setDraft({ ...draft, carbs: e.target.value })} className="h-9 px-2 rounded-lg bg-background border border-border text-xs text-center focus:outline-none focus:ring-2 focus:ring-rose-500/30" />
                        <input type="number" inputMode="numeric" placeholder="F g" value={draft.fats} onChange={(e) => setDraft({ ...draft, fats: e.target.value })} className="h-9 px-2 rounded-lg bg-background border border-border text-xs text-center focus:outline-none focus:ring-2 focus:ring-rose-500/30" />
                      </div>
                      <div className="flex gap-2 pb-1">
                        <Button onClick={() => addEntry(key)} className="flex-1 bg-ig-gradient text-white font-bold rounded-lg h-9 hover:opacity-90 border-0 text-sm">
                          Log
                        </Button>
                        <Button onClick={() => setAdding(null)} variant="ghost" className="rounded-lg h-9 text-sm">
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          );
        })}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Nutrition logs save on this device. Targets are defaults — adjust per your dietitian.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
