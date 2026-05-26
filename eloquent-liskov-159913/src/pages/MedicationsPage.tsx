/**
 * MedicationsPage — Track meds, doses, and refills with reminders.
 * Local-only catalog for v1 (no PHI sent to server); each med is editable
 * and persists to localStorage so the UI is usable immediately.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Pill, Plus, Clock, Bell, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { cn } from "@/lib/utils";

interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  timeOfDay: string;
  refillIn: number; // days
  takenToday: boolean;
}

const STORAGE_KEY = "zivo:meds:v1";

const SEEDS: Medication[] = [
  { id: "m1", name: "Vitamin D3", dose: "1000 IU", frequency: "Daily", timeOfDay: "Morning", refillIn: 28, takenToday: true },
  { id: "m2", name: "Omega-3", dose: "1 capsule", frequency: "Daily", timeOfDay: "Evening", refillIn: 12, takenToday: false },
  { id: "m3", name: "Magnesium", dose: "200 mg", frequency: "Daily", timeOfDay: "Bedtime", refillIn: 5, takenToday: false },
];

function loadMeds(): Medication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEEDS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEEDS;
    return parsed as Medication[];
  } catch { return SEEDS; }
}

function saveMeds(meds: Medication[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(meds)); } catch { /* private mode */ }
}

export default function MedicationsPage() {
  const navigate = useNavigate();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", dose: "", timeOfDay: "Morning" });

  useEffect(() => { setMeds(loadMeds()); }, []);

  const stats = useMemo(() => {
    const total = meds.length;
    const taken = meds.filter((m) => m.takenToday).length;
    const refillsSoon = meds.filter((m) => m.refillIn <= 7).length;
    return { total, taken, refillsSoon };
  }, [meds]);

  const toggleTaken = (id: string) => {
    const next = meds.map((m) => (m.id === id ? { ...m, takenToday: !m.takenToday } : m));
    setMeds(next);
    saveMeds(next);
  };

  const removeMed = (id: string) => {
    const next = meds.filter((m) => m.id !== id);
    setMeds(next);
    saveMeds(next);
  };

  const addMed = () => {
    if (!draft.name.trim()) return;
    const newMed: Medication = {
      id: `m-${Date.now()}`,
      name: draft.name.trim(),
      dose: draft.dose.trim() || "1 dose",
      frequency: "Daily",
      timeOfDay: draft.timeOfDay,
      refillIn: 30,
      takenToday: false,
    };
    const next = [...meds, newMed];
    setMeds(next);
    saveMeds(next);
    setDraft({ name: "", dose: "", timeOfDay: "Morning" });
    setAdding(false);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Medications · ZIVO" description="Track meds, doses, and refills with reminders." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Pill className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Medications</h1>
          </div>
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            className="bg-ig-gradient text-white font-bold rounded-full h-9 px-3 hover:opacity-90 border-0"
          >
            <Plus className="h-4 w-4 mr-1" strokeWidth={3} />
            Add
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Today</p>
          <p className="text-3xl font-bold mt-1">{stats.taken} of {stats.total} taken</p>
          {stats.refillsSoon > 0 && (
            <p className="mt-2 text-sm text-white/90 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {stats.refillsSoon} need refilling soon
            </p>
          )}
        </motion.div>

        {/* Add form */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-card border border-border p-4 space-y-3"
            >
              <input
                type="text"
                placeholder="Medication name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <input
                type="text"
                placeholder="Dose (e.g. 100 mg)"
                value={draft.dose}
                onChange={(e) => setDraft({ ...draft, dose: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <select
                value={draft.timeOfDay}
                onChange={(e) => setDraft({ ...draft, timeOfDay: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              >
                <option>Morning</option>
                <option>Midday</option>
                <option>Evening</option>
                <option>Bedtime</option>
              </select>
              <div className="flex gap-2">
                <Button onClick={addMed} className="flex-1 bg-ig-gradient text-white font-bold rounded-xl h-10 hover:opacity-90 border-0">
                  Save
                </Button>
                <Button onClick={() => setAdding(false)} variant="ghost" className="rounded-xl h-10">
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <div className="space-y-2">
          {meds.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                m.takenToday ? "bg-card border-border" : "bg-card border-border",
              )}
            >
              <button
                type="button"
                aria-label={m.takenToday ? "Mark as not taken" : "Mark as taken"}
                onClick={() => toggleTaken(m.id)}
                className={cn(
                  "shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90",
                  m.takenToday
                    ? "bg-ig-gradient text-white shadow-sm"
                    : "bg-secondary border-2 border-dashed border-muted-foreground/40 text-transparent",
                )}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-bold leading-tight",
                  m.takenToday ? "text-muted-foreground line-through" : "text-foreground",
                )}>
                  {m.name}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <span>{m.dose}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{m.timeOfDay}</span>
                  {m.refillIn <= 7 && (
                    <>
                      <span>·</span>
                      <span className="text-ig-gradient font-bold flex items-center gap-0.5"><Bell className="h-2.5 w-2.5" />Refill in {m.refillIn}d</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Remove ${m.name}`}
                onClick={() => removeMed(m.id)}
                className="shrink-0 h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>

        {meds.length === 0 && !adding && (
          <div className="text-center py-10">
            <div className="h-14 w-14 rounded-2xl bg-ig-gradient flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/20">
              <Pill className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">No medications yet</p>
            <p className="text-xs text-muted-foreground">Add your first med to start tracking.</p>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Medications save on this device only. We never send your health data to ZIVO servers.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
