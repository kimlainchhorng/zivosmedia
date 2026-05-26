/**
 * WellnessPage — ZIVO Health & Wellness hub
 * Single page with sub-sections routed via URL: /wellness, /wellness/activity,
 * /wellness/workouts, /wellness/vitals, /wellness/mindfulness, /wellness/telehealth,
 * /wellness/meds, /wellness/nutrition, /wellness/goals
 */
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Activity, Dumbbell, Heart, Brain, Stethoscope, Pill,
  UtensilsCrossed, Trophy, Footprints, Flame, Droplets, Moon,
  ChevronRight, Plus, TrendingUp, Calendar, Clock, Bell, Target,
  Video, Phone, Plus as PlusIcon, Star, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";

/* ─── Wellness Store (localStorage) ─── */
interface WellnessDay {
  date: string; // YYYY-MM-DD
  steps: number;
  calories: number;
  waterGlasses: number;
  sleepHours: number;
  workoutsLogged: string[];
  mealsLogged: { name: string; cal: number; time: string }[];
  vitals: { type: string; value: string; unit: string; time: string }[];
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function loadDay(): WellnessDay {
  try {
    const raw = localStorage.getItem(`wellness_day_${todayKey()}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    date: todayKey(),
    steps: 0,
    calories: 0,
    waterGlasses: 0,
    sleepHours: 0,
    workoutsLogged: [],
    mealsLogged: [],
    vitals: [],
  };
}

function saveDay(day: WellnessDay) {
  localStorage.setItem(`wellness_day_${day.date}`, JSON.stringify(day));
}

function useWellnessDay() {
  const [day, setDay] = useState<WellnessDay>(loadDay);

  const update = useCallback((patch: Partial<WellnessDay>) => {
    setDay((prev) => {
      const next = { ...prev, ...patch };
      saveDay(next);
      return next;
    });
  }, []);

  return { day, update };
}

type SectionKey =
  | "hub"
  | "activity"
  | "workouts"
  | "vitals"
  | "mindfulness"
  | "telehealth"
  | "meds"
  | "nutrition"
  | "goals";

const SECTION_TITLES: Record<SectionKey, string> = {
  hub: "Health & Wellness",
  activity: "Activity Tracker",
  workouts: "Workouts",
  vitals: "Health Vitals",
  mindfulness: "Mindfulness",
  telehealth: "Telehealth",
  meds: "Medications",
  nutrition: "Nutrition",
  goals: "Wellness Goals",
};

const HUB_CARDS: { key: SectionKey; icon: any; label: string; desc: string; gradient: string }[] = [
  { key: "activity", icon: Activity, label: "Activity", desc: "Steps, calories & moves", gradient: "from-muted to-muted" },
  { key: "workouts", icon: Dumbbell, label: "Workouts", desc: "Plans & guides", gradient: "from-muted to-muted" },
  { key: "vitals", icon: Heart, label: "Vitals", desc: "HR, BP & sleep", gradient: "from-muted to-muted" },
  { key: "mindfulness", icon: Brain, label: "Mindfulness", desc: "Meditation & calm", gradient: "from-muted to-muted" },
  { key: "telehealth", icon: Stethoscope, label: "Telehealth", desc: "Talk to a doctor", gradient: "from-muted to-muted" },
  { key: "meds", icon: Pill, label: "Medications", desc: "Reminders & refills", gradient: "from-muted to-muted" },
  { key: "nutrition", icon: UtensilsCrossed, label: "Nutrition", desc: "Meals & macros", gradient: "from-lime-500 via-green-500 to-emerald-500" },
  { key: "goals", icon: Trophy, label: "Goals", desc: "Targets & streaks", gradient: "from-yellow-500 via-amber-400 to-orange-400" },
];

function resolveSection(slug?: string): SectionKey {
  if (!slug) return "hub";
  const k = slug.toLowerCase();
  if (k in SECTION_TITLES) return k as SectionKey;
  return "hub";
}

export default function WellnessPage() {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const active = useMemo(() => resolveSection(section), [section]);

  const title = SECTION_TITLES[active];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-24 safe-area-bottom">
      <SEOHead title={`${title} – ZIVO`} description="Track your health, workouts, vitals and wellness goals." noIndex />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40 flex items-center gap-2 px-3 pb-2 pt-safe"
        style={{ paddingTop: "var(--zivo-safe-top-sticky, var(--zivo-safe-top,0px))" }}>
        <button type="button"
          onClick={() => (active === "hub" ? navigate("/more") : navigate("/wellness"))}
          aria-label="Go back"
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-90 transition-transform text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-[17px] flex-1 truncate">{title}</h1>
      </header>

      <main className="flex-1 px-4 pt-4 lg:max-w-3xl lg:mx-auto w-full">
        {active === "hub" && <HubView />}
        {active === "activity" && <ActivityView />}
        {active === "workouts" && <WorkoutsView />}
        {active === "vitals" && <VitalsView />}
        {active === "mindfulness" && <MindfulnessView />}
        {active === "telehealth" && <TelehealthView />}
        {active === "meds" && <MedsView />}
        {active === "nutrition" && <NutritionView />}
        {active === "goals" && <GoalsView />}
      </main>

      <ZivoMobileNav />
    </div>
  );
}

/* ─────────────────────────  Hub  ───────────────────────── */
function HubView() {
  const navigate = useNavigate();
  const { day, update } = useWellnessDay();
  const [showWaterLog, setShowWaterLog] = useState(false);

  const stepsGoal = 10000;
  const waterGoal = 8;
  const stepsPercent = Math.min(Math.round((day.steps / stepsGoal) * 100), 100);
  const overallPercent = Math.min(
    Math.round(((stepsPercent + Math.min((day.waterGlasses / waterGoal) * 100, 100)) / 2)),
    100
  );

  const addWater = () => {
    if (day.waterGlasses < waterGoal) {
      update({ waterGlasses: day.waterGlasses + 1 });
      toast.success(`+1 glass logged (${day.waterGlasses + 1}/${waterGoal})`);
    } else {
      toast.success("Daily water goal reached!");
    }
  };

  return (
    <div className="space-y-5">
      {/* Today summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 border border-emerald-500/20 p-4"
      >
        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Today · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
        <p className="mt-1 text-lg font-bold">
          {overallPercent === 0 ? "Start tracking today" : `You're ${overallPercent}% to your daily goal`}
        </p>
        <Progress value={overallPercent} className="mt-2 h-2" />
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { icon: Footprints, label: "Steps", value: day.steps > 0 ? day.steps.toLocaleString() : "—" },
            { icon: Flame, label: "Cal", value: day.calories > 0 ? day.calories.toString() : "—" },
            { icon: Droplets, label: "Water", value: `${day.waterGlasses}/${waterGoal}` },
            { icon: Moon, label: "Sleep", value: day.sleepHours > 0 ? `${day.sleepHours}h` : "—" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400" />
              <p className="text-[13px] font-bold mt-1">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sub-sections */}
      <div className="grid grid-cols-2 gap-3">
        {HUB_CARDS.map((card, i) => (
          <Link key={card.key} to={`/wellness/${card.key}`} className="contents">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 280, damping: 22 }}
              className={cn(
                "rounded-2xl bg-gradient-to-br p-4 h-[112px] flex flex-col justify-between shadow-md active:scale-95 transition-transform",
                card.gradient,
              )}
            >
              <card.icon className="w-5 h-5 text-foreground" />
              <div>
                <p className="text-foreground font-bold text-[14px] leading-tight">{card.label}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">{card.desc}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <Card className="p-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick actions</p>
        <div className="space-y-1.5">
          <ActionRow
            icon={PlusIcon}
            label="Log a workout"
            onClick={() => navigate("/wellness/workouts")}
          />
          <ActionRow
            icon={Droplets}
            label="Log water intake"
            subtitle={`${day.waterGlasses}/${waterGoal} glasses today`}
            onClick={addWater}
          />
          <ActionRow
            icon={UtensilsCrossed}
            label="Log a meal"
            onClick={() => navigate("/wellness/nutrition")}
          />
          <ActionRow
            icon={Heart}
            label="Add a vital reading"
            onClick={() => navigate("/wellness/vitals")}
          />
        </div>
      </Card>
    </div>
  );
}

function ActionRow({ icon: Icon, label, subtitle, onClick }: { icon: any; label: string; subtitle?: string; onClick: () => void }) {
  return (
    <button type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 active:scale-[0.98] transition-all text-left"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium">{label}</span>
        {subtitle && <span className="block text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
    </button>
  );
}

/* ─────────────────────────  Activity  ───────────────────────── */
function ActivityView() {
  const { day, update } = useWellnessDay();
  const [stepsInput, setStepsInput] = useState("");
  const [showStepsForm, setShowStepsForm] = useState(false);
  const stepsGoal = 10000;
  const stepsPercent = Math.min(Math.round((day.steps / stepsGoal) * 100), 100);
  const distanceKm = (day.steps * 0.000762).toFixed(1);
  const caloriesFromSteps = Math.round(day.steps * 0.04);

  const submitSteps = () => {
    const n = parseInt(stepsInput);
    if (!isNaN(n) && n > 0) {
      update({ steps: n, calories: Math.round(n * 0.04) });
      setShowStepsForm(false);
      setStepsInput("");
      toast.success(`Steps updated: ${n.toLocaleString()}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Today's steps</p>
            <p className="text-3xl font-bold">{day.steps > 0 ? day.steps.toLocaleString() : "0"}</p>
            <p className="text-[12px] text-muted-foreground mt-1">Goal: {stepsGoal.toLocaleString()}</p>
          </div>
          <button type="button"
            onClick={() => setShowStepsForm(true)}
            className="h-16 w-16 rounded-full border-4 flex items-center justify-center transition-colors active:scale-95"
            style={{ borderColor: `hsl(var(--primary) / 0.3)`, borderTopColor: "hsl(var(--primary))" }}
          >
            <Footprints className="w-6 h-6 text-primary" />
          </button>
        </div>
        <Progress value={stepsPercent} className="mt-4 h-2" />
        {stepsPercent === 100 && (
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Daily goal reached!
          </p>
        )}
      </Card>

      <AnimatePresence>
        {showStepsForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-4">
              <p className="font-semibold text-[14px] mb-3">Log today's steps</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  placeholder="e.g. 8000"
                  className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => e.key === "Enter" && submitSteps()}
                  autoFocus
                />
                <Button size="sm" onClick={submitSteps} className="h-10">Save</Button>
                <button type="button" onClick={() => setShowStepsForm(false)} className="p-2 rounded-xl hover:bg-muted/60">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, label: "Calories", value: day.calories > 0 ? day.calories.toString() : caloriesFromSteps > 0 ? caloriesFromSteps.toString() : "—", unit: "kcal" },
          { icon: Clock, label: "Active time", value: day.steps > 0 ? `${Math.round(day.steps / 110)}` : "—", unit: "min" },
          { icon: TrendingUp, label: "Distance", value: day.steps > 0 ? distanceKm : "—", unit: "km" },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <s.icon className="w-5 h-5 mx-auto text-orange-500" />
            <p className="text-lg font-bold mt-1">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.unit}</p>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Button className="w-full" variant="outline" onClick={() => setShowStepsForm(true)}>
        <Footprints className="w-4 h-4 mr-1.5" />
        Log today's steps
      </Button>
    </div>
  );
}

/* ─────────────────────────  Workouts  ───────────────────────── */
function WorkoutsView() {
  const { day, update } = useWellnessDay();
  const plans = [
    { name: "Full body strength", duration: "45 min", level: "Intermediate", color: "from-rose-500 to-orange-500", cal: 320 },
    { name: "Morning yoga flow", duration: "20 min", level: "Beginner", color: "from-violet-500 to-purple-500", cal: 110 },
    { name: "HIIT cardio blast", duration: "30 min", level: "Advanced", color: "from-red-500 to-pink-500", cal: 280 },
    { name: "Core & abs focus", duration: "15 min", level: "All levels", color: "from-amber-500 to-orange-500", cal: 120 },
    { name: "Recovery stretch", duration: "10 min", level: "Beginner", color: "from-emerald-500 to-teal-500", cal: 60 },
  ];

  const logWorkout = (name: string, cal: number) => {
    if (!day.workoutsLogged.includes(name)) {
      update({
        workoutsLogged: [...day.workoutsLogged, name],
        calories: day.calories + cal,
      });
      toast.success(`${name} logged! +${cal} kcal`);
    } else {
      toast.info("Already logged today");
    }
  };

  return (
    <div className="space-y-4">
      {day.workoutsLogged.length > 0 ? (
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed today</p>
          <p className="font-bold text-[15px] mt-1">{day.workoutsLogged.length} workout{day.workoutsLogged.length > 1 ? "s" : ""} logged</p>
          <p className="text-xs text-muted-foreground mt-0.5">{day.workoutsLogged.join(" · ")}</p>
        </Card>
      ) : (
        <Card className="p-4 border-border bg-secondary">
          <p className="text-[11px] font-semibold text-foreground dark:text-foreground uppercase tracking-wider">Today's suggestion</p>
          <p className="font-bold text-[15px] mt-1">Full body strength · 45 min</p>
          <Button size="sm" className="mt-3" onClick={() => logWorkout("Full body strength", 320)}>
            <Dumbbell className="w-4 h-4 mr-1.5" />
            Log this workout
          </Button>
        </Card>
      )}

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Plans — tap to log</p>
        <div className="space-y-2">
          {plans.map((p) => {
            const done = day.workoutsLogged.includes(p.name);
            return (
              <Card
                key={p.name}
                className={cn("p-3 flex items-center gap-3 active:scale-[0.99] transition-transform cursor-pointer", done && "opacity-60")}
                onClick={() => logWorkout(p.name, p.cal)}
              >
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", p.color)}>
                  {done ? <Check className="w-5 h-5 text-white" /> : <Dumbbell className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.duration} · {p.level} · ~{p.cal} kcal</p>
                </div>
                {done ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Done</span>
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground/40" />
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  Vitals  ───────────────────────── */
function VitalsView() {
  const { day, update } = useWellnessDay();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "Heart rate", value: "", unit: "bpm" });

  const vitalTemplates = [
    { type: "Heart rate", unit: "bpm", icon: Heart, color: "text-rose-500", placeholder: "e.g. 72" },
    { type: "Blood pressure", unit: "mmHg", icon: Activity, color: "text-blue-500", placeholder: "e.g. 120/80" },
    { type: "Blood oxygen", unit: "SpO₂", icon: Droplets, color: "text-cyan-500", placeholder: "e.g. 98%" },
    { type: "Sleep hours", unit: "hours", icon: Moon, color: "text-violet-500", placeholder: "e.g. 7.5" },
    { type: "Weight", unit: "kg", icon: TrendingUp, color: "text-emerald-500", placeholder: "e.g. 68.4" },
    { type: "Body temp", unit: "°C", icon: Flame, color: "text-orange-500", placeholder: "e.g. 36.6" },
  ];

  const logVital = () => {
    if (!form.value.trim()) return;
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const newVitals = [...day.vitals, { type: form.type, value: form.value, unit: form.unit, time }];
    const patch: Partial<WellnessDay> = { vitals: newVitals };
    if (form.type === "Sleep hours") {
      const h = parseFloat(form.value);
      if (!isNaN(h)) patch.sleepHours = h;
    }
    update(patch);
    toast.success(`${form.type} logged: ${form.value} ${form.unit}`);
    setShowForm(false);
    setForm({ type: "Heart rate", value: "", unit: "bpm" });
  };

  const getLatest = (type: string) => day.vitals.filter((v) => v.type === type).slice(-1)[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {vitalTemplates.map((v) => {
          const latest = getLatest(v.type);
          const Icon = v.icon;
          return (
            <Card
              key={v.type}
              className="p-4 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => { setForm({ type: v.type, value: "", unit: v.unit }); setShowForm(true); }}
            >
              <Icon className={cn("w-5 h-5", v.color)} />
              <p className="text-[11px] text-muted-foreground mt-2">{v.type}</p>
              <p className="text-xl font-bold mt-0.5">{latest ? latest.value : "—"}</p>
              <p className="text-[10px] text-muted-foreground/70">{latest ? `${latest.unit} · ${latest.time}` : v.unit}</p>
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[14px]">Log {form.type}</p>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted/60">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={vitalTemplates.find((v) => v.type === form.type)?.placeholder || ""}
                  className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => e.key === "Enter" && logVital()}
                  autoFocus
                />
                <Button size="sm" onClick={logVital} className="h-10">Save</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {vitalTemplates.map((v) => (
                  <button type="button"
                    key={v.type}
                    onClick={() => setForm({ type: v.type, value: "", unit: v.unit })}
                    className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors", form.type === v.type ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50")}
                  >
                    {v.type}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button className="w-full" variant="outline" onClick={() => setShowForm(true)}>
        <Plus className="w-4 h-4 mr-1.5" />
        Add a reading
      </Button>
    </div>
  );
}

/* ─────────────────────────  Mindfulness  ───────────────────────── */
const BREATHING_PHASES = [
  { label: "Inhale", duration: 4, color: "text-violet-500" },
  { label: "Hold", duration: 4, color: "text-purple-500" },
  { label: "Exhale", duration: 6, color: "text-indigo-500" },
  { label: "Hold", duration: 2, color: "text-purple-400" },
];

function MindfulnessView() {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseSec, setPhaseSec] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const streakKey = `wellness_mindfulness_streak`;
  const [streak] = useState(() => {
    try { return parseInt(localStorage.getItem(streakKey) || "0") || 0; } catch { return 0; }
  });

  const sessions = [
    { name: "Morning calm", duration: "5 min", category: "Breathing", cycles: 5 },
    { name: "Stress relief", duration: "10 min", category: "Meditation", cycles: 8 },
    { name: "Sleep wind-down", duration: "15 min", category: "Sleep", cycles: 12 },
    { name: "Focus session", duration: "20 min", category: "Productivity", cycles: 15 },
  ];

  const startSession = (name: string) => {
    setActiveSession(name);
    setPhaseIdx(0);
    setPhaseSec(0);
    setCycleCount(0);
    setTimerActive(true);
  };

  const stopSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setActiveSession(null);
    if (cycleCount > 0) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`wellness_mindfulness_${today}`, "1");
      const newStreak = streak + 1;
      localStorage.setItem(streakKey, String(newStreak));
      toast.success(`Session complete! ${cycleCount} cycle${cycleCount !== 1 ? "s" : ""} done.`);
    }
  };

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setPhaseSec((s) => {
        const phase = BREATHING_PHASES[phaseIdx];
        if (s + 1 >= phase.duration) {
          const nextIdx = (phaseIdx + 1) % BREATHING_PHASES.length;
          setPhaseIdx(nextIdx);
          if (nextIdx === 0) setCycleCount((c) => c + 1);
          return 0;
        }
        return s + 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, phaseIdx]);

  const phase = BREATHING_PHASES[phaseIdx];
  const phaseProgress = phase ? ((phaseSec / phase.duration) * 100) : 0;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {activeSession ? (
          <motion.div key="timer" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="p-6 border-border text-center bg-secondary">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{activeSession}</p>
              <motion.div
                key={phaseIdx}
                animate={{ scale: phase.label === "Inhale" ? [1, 1.25] : phase.label === "Exhale" ? [1.25, 1] : 1 }}
                transition={{ duration: phase.duration, ease: "linear" }}
                className="w-24 h-24 mx-auto rounded-full border-2 border-border flex items-center justify-center mb-4 bg-secondary"
              >
                <p className={cn("font-bold text-lg", phase.color)}>{phase.label}</p>
              </motion.div>
              <p className="text-3xl font-bold tabular-nums">{phase.duration - phaseSec}s</p>
              <Progress value={phaseProgress} className="mt-3 h-1.5" />
              <p className="text-[11px] text-muted-foreground mt-2">{cycleCount} cycle{cycleCount !== 1 ? "s" : ""} complete</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={stopSession}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Stop Session
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="p-5 border-border text-center bg-secondary">
              <Brain className="w-10 h-10 mx-auto text-foreground" />
              <p className="font-bold text-[15px] mt-3">{streak}-day streak</p>
              <p className="text-[12px] text-muted-foreground">
                {streak > 0 ? "Keep going — you're building a habit" : "Start your first session today"}
              </p>
              <Button className="mt-3" size="sm" onClick={() => startSession("4-4-6-2 Breathing")}>
                Start Breathing
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Featured sessions</p>
        <div className="space-y-2">
          {sessions.map((s) => (
            <Card key={s.name} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => activeSession ? null : startSession(s.name)}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-secondary">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px]">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">{s.category} • {s.duration}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  Telehealth  ───────────────────────── */
function TelehealthView() {
  const navigate = useNavigate();
  const docs = [
    { name: "Dr. Sarah Chen", specialty: "General Practice", available: "Available now", color: "bg-emerald-500", online: true },
    { name: "Dr. Marcus Reed", specialty: "Cardiology", available: "Next: 2:30 PM", color: "bg-amber-500", online: false },
    { name: "Dr. Priya Patel", specialty: "Dermatology", available: "Available now", color: "bg-emerald-500", online: true },
    { name: "Dr. James Liu", specialty: "Mental Health", available: "Tomorrow", color: "bg-muted-foreground", online: false },
  ];

  const handleBook = (docName: string, type: "video" | "voice") => {
    navigate("/support", { state: { prefill: `I'd like to book a ${type} consultation with ${docName}.` } });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border-border bg-secondary">
        <Stethoscope className="w-6 h-6 text-foreground" />
        <p className="font-bold text-[15px] mt-2">Need to talk to a doctor?</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">Book a video or voice consultation in minutes.</p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={() => navigate("/support")}>
            <Video className="w-4 h-4 mr-1.5" />Video
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/support")}>
            <Phone className="w-4 h-4 mr-1.5" />Voice
          </Button>
        </div>
      </Card>

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available providers</p>
        <div className="space-y-2">
          {docs.map((d) => (
            <Card key={d.name} className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold bg-foreground">
                {d.name.split(" ")[1][0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px]">{d.name}</p>
                <p className="text-[11px] text-muted-foreground">{d.specialty}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={cn("inline-block w-2 h-2 rounded-full", d.color)} />
                <p className="text-[10px] text-muted-foreground mt-0.5 mb-1">{d.available}</p>
                {d.online && (
                  <button type="button"
                    onClick={() => handleBook(d.name, "video")}
                    className="text-[10px] font-semibold text-foreground bg-secondary px-2 py-0.5 rounded-full"
                  >
                    Book
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  Medications  ───────────────────────── */
interface Med { name: string; dose: string; schedule: string }

function loadMeds(): Med[] {
  try { return JSON.parse(localStorage.getItem("wellness_meds") || "[]"); } catch { return []; }
}

function MedsView() {
  const [meds, setMeds] = useState<Med[]>(() => {
    const saved = loadMeds();
    if (saved.length > 0) return saved;
    return [
      { name: "Vitamin D3", dose: "1000 IU", schedule: "Daily • 8:00 AM" },
      { name: "Omega-3", dose: "1 capsule", schedule: "Daily • with breakfast" },
      { name: "Magnesium", dose: "400 mg", schedule: "Daily • bedtime" },
    ];
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dose: "", schedule: "" });
  const [takenToday, setTakenToday] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`wellness_meds_taken_${todayKey()}`) || "[]")); } catch { return new Set(); }
  });

  const saveMeds = (updated: Med[]) => {
    setMeds(updated);
    localStorage.setItem("wellness_meds", JSON.stringify(updated));
  };

  const toggleTaken = (name: string) => {
    setTakenToday((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      localStorage.setItem(`wellness_meds_taken_${todayKey()}`, JSON.stringify([...next]));
      return next;
    });
  };

  const addMed = () => {
    if (!form.name.trim()) return;
    const updated = [...meds, { name: form.name.trim(), dose: form.dose.trim() || "—", schedule: form.schedule.trim() || "Daily" }];
    saveMeds(updated);
    toast.success(`${form.name} added`);
    setForm({ name: "", dose: "", schedule: "" });
    setShowForm(false);
  };

  const removeMed = (name: string) => {
    saveMeds(meds.filter((m) => m.name !== name));
    toast.success(`${name} removed`);
  };

  const takenCount = meds.filter((m) => takenToday.has(m.name)).length;
  const takenPct = meds.length > 0 ? Math.round((takenCount / meds.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Reminders</p>
        <p className="font-bold text-[15px] mt-1">{meds.length} active medication{meds.length !== 1 ? "s" : ""}</p>
        <p className="text-[12px] text-muted-foreground">You've taken {takenCount} of {meds.length} today</p>
        <Progress value={takenPct} className="mt-2 h-2" />
      </Card>

      <div className="space-y-2">
        {meds.map((m) => {
          const taken = takenToday.has(m.name);
          return (
            <Card key={m.name} className={cn("p-3 flex items-center gap-3", taken && "opacity-60")}>
              <button type="button"
                onClick={() => toggleTaken(m.name)}
                className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors", taken ? "bg-emerald-500/20" : "bg-amber-500/15")}
              >
                {taken ? <Check className="w-5 h-5 text-emerald-600" /> : <Pill className="w-5 h-5 text-amber-500" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px]">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">{m.dose} • {m.schedule}</p>
              </div>
              <div className="flex items-center gap-2">
                {taken ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Taken</span>
                ) : (
                  <Bell className="w-4 h-4 text-muted-foreground" />
                )}
                <button type="button" onClick={() => removeMed(m.name)} className="p-1 rounded-lg hover:bg-muted/60">
                  <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[14px]">Add medication</p>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted/60">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Medication name (e.g. Vitamin C)"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                <input
                  type="text"
                  value={form.dose}
                  onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
                  placeholder="Dose (e.g. 500 mg)"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.schedule}
                    onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
                    placeholder="Schedule (e.g. Daily • 9:00 AM)"
                    className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === "Enter" && addMed()}
                  />
                  <Button size="sm" onClick={addMed} className="h-10">Add</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button className="w-full" variant="outline" onClick={() => setShowForm(true)}>
        <Plus className="w-4 h-4 mr-1.5" />
        Add medication
      </Button>
    </div>
  );
}

/* ─────────────────────────  Nutrition  ───────────────────────── */
function NutritionView() {
  const { day, update } = useWellnessDay();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", cal: "" });

  const calGoal = 2000;
  const totalCal = day.mealsLogged.reduce((s, m) => s + m.cal, 0);
  const calPercent = Math.min(Math.round((totalCal / calGoal) * 100), 100);

  const logMeal = () => {
    const cal = parseInt(form.cal);
    if (!form.name.trim() || isNaN(cal) || cal <= 0) return;
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const newMeals = [...day.mealsLogged, { name: form.name.trim(), cal, time }];
    update({ mealsLogged: newMeals, calories: day.calories + cal });
    toast.success(`${form.name} logged! +${cal} kcal`);
    setForm({ name: "", cal: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Today's intake</p>
        <p className="text-3xl font-bold mt-1">
          {totalCal.toLocaleString()} <span className="text-base font-normal text-muted-foreground">/ {calGoal.toLocaleString()} kcal</span>
        </p>
        <Progress value={calPercent} className="mt-2 h-2" />
      </Card>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[14px]">Log a meal</p>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted/60">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Meal name (e.g. Chicken salad)"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.cal}
                    onChange={(e) => setForm((f) => ({ ...f, cal: e.target.value }))}
                    placeholder="Calories (kcal)"
                    className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === "Enter" && logMeal()}
                  />
                  <Button size="sm" onClick={logMeal} className="h-10">Log</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["Breakfast ~400", "Lunch ~600", "Dinner ~700", "Snack ~200"].map((q) => (
                  <button type="button"
                    key={q}
                    onClick={() => {
                      const [name, cal] = q.split("~");
                      setForm({ name: name.trim(), cal: cal.trim() });
                    }}
                    className="text-[11px] font-medium px-2 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {day.mealsLogged.length > 0 ? (
        <div className="space-y-2">
          {day.mealsLogged.map((m, i) => (
            <Card key={i} className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px]">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">{m.time}</p>
              </div>
              <p className="text-[12px] font-bold text-muted-foreground">{m.cal} kcal</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-5 text-center text-muted-foreground">
          <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No meals logged today</p>
        </Card>
      )}

      <Button className="w-full" onClick={() => setShowForm(true)}>
        <Plus className="w-4 h-4 mr-1.5" />
        Log a meal
      </Button>
    </div>
  );
}

/* ─────────────────────────  Goals  ───────────────────────── */
interface WellnessGoal { label: string; target: string; progress: number; streak: string }

const DEFAULT_GOALS: WellnessGoal[] = [
  { label: "10,000 steps daily", target: "10000 steps", progress: 68, streak: "12 days" },
  { label: "Drink 8 glasses water", target: "8 glasses", progress: 62, streak: "5 days" },
  { label: "Sleep 7+ hours", target: "7 hours", progress: 100, streak: "3 days" },
  { label: "Workout 5x per week", target: "5 workouts/week", progress: 60, streak: "2 weeks" },
  { label: "Meditate daily", target: "1 session/day", progress: 33, streak: "3 days" },
];

function loadGoals(): WellnessGoal[] {
  try { return JSON.parse(localStorage.getItem("wellness_goals") || "null") ?? DEFAULT_GOALS; } catch { return DEFAULT_GOALS; }
}

function GoalsView() {
  const [goals, setGoals] = useState<WellnessGoal[]>(loadGoals);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", target: "" });

  const saveGoals = (updated: WellnessGoal[]) => {
    setGoals(updated);
    localStorage.setItem("wellness_goals", JSON.stringify(updated));
  };

  const addGoal = () => {
    if (!form.label.trim()) return;
    const g: WellnessGoal = { label: form.label.trim(), target: form.target.trim() || "—", progress: 0, streak: "0 days" };
    saveGoals([...goals, g]);
    toast.success(`Goal added: ${g.label}`);
    setForm({ label: "", target: "" });
    setShowForm(false);
  };

  const removeGoal = (label: string) => {
    saveGoals(goals.filter((g) => g.label !== label));
    toast.success("Goal removed");
  };

  const onTrack = goals.filter((g) => g.progress >= 50).length;

  const GOAL_ICONS = [Footprints, Droplets, Moon, Dumbbell, Brain, Heart, Activity, Trophy];

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20 text-center">
        <Trophy className="w-10 h-10 mx-auto text-yellow-500" />
        <p className="font-bold text-[15px] mt-3">{goals.length} active goal{goals.length !== 1 ? "s" : ""}</p>
        <p className="text-[12px] text-muted-foreground">{onTrack} on track today</p>
      </Card>

      <div className="space-y-2">
        {goals.map((g, i) => {
          const Icon = GOAL_ICONS[i % GOAL_ICONS.length];
          const colors = ["text-emerald-500", "text-cyan-500", "text-violet-500", "text-rose-500", "text-purple-500", "text-pink-500", "text-orange-500", "text-yellow-500"];

          const incrementProgress = () => {
            const updated = goals.map((goal) =>
              goal.label === g.label
                ? { ...goal, progress: Math.min(100, goal.progress + 10) }
                : goal
            );
            saveGoals(updated);
            if (g.progress + 10 >= 100) toast.success(`"${g.label}" completed! 🎉`);
          };

          return (
            <Card key={g.label} className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                  <Icon className={cn("w-5 h-5", colors[i % colors.length])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px]">{g.label}</p>
                  <p className="text-[11px] text-muted-foreground">{g.target} • {g.streak} streak</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button"
                    onClick={incrementProgress}
                    disabled={g.progress >= 100}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                      g.progress >= 100
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    {g.progress >= 100 ? <Check className="w-3.5 h-3.5" /> : "+"}
                  </button>
                  <span className="text-[12px] font-bold tabular-nums w-8 text-right">{g.progress}%</span>
                  <button type="button" onClick={() => removeGoal(g.label)} className="p-1 rounded-lg hover:bg-muted/60">
                    <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </button>
                </div>
              </div>
              <Progress value={g.progress} className="mt-2 h-1.5" />
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-[14px]">Add a goal</p>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted/60">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Goal (e.g. Run 5km weekly)"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.target}
                    onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                    placeholder="Target (e.g. 5 km)"
                    className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === "Enter" && addGoal()}
                  />
                  <Button size="sm" onClick={addGoal} className="h-10">Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Run 5km weekly", "No sugar this week", "7-day workout streak", "10k steps daily", "Drink 3L water daily"].map((q) => (
                    <button type="button"
                      key={q}
                      onClick={() => setForm((f) => ({ ...f, label: q }))}
                      className="text-[11px] font-medium px-2 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button className="w-full" variant="outline" onClick={() => setShowForm(true)}>
        <Target className="w-4 h-4 mr-1.5" />
        Add a goal
      </Button>
    </div>
  );
}
