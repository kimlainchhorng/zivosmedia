/**
 * ZivoReserve — Uber Reserve-style ride scheduling with 3 screens:
 * 1. Landing (hero + benefits)
 * 2. Date/Time picker (scroll wheel style)
 * 3. Reservation confirmation
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, Calendar, Car, Shield, MapPin,
  ChevronRight, ArrowRight, CheckCircle, Home,
  Navigation, X, FileText, Plus, DollarSign, Plane,
  UserCheck, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addDays, setHours, setMinutes } from "date-fns";
import reserveHero from "@/assets/zivo-reserve-hero.webp";
import ScrollWheelPicker from "./ScrollWheelPicker";

type Screen = "landing" | "datetime" | "route" | "confirmed";

/* ─── Date/Time Generation ─── */
function generateDays(count: number) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = addDays(today, i);
    days.push({
      date: d,
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, "EEE MMM d"),
      dayShort: format(d, "EEE"),
      dayNum: format(d, "d"),
    });
  }
  return days;
}

const hours = Array.from({ length: 12 }, (_, i) => i + 1);
const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/* (ScrollColumn removed — using shared ScrollWheelPicker) */

/* ─── Benefits List ─── */
const benefits = [
  {
    icon: DollarSign,
    title: "Price locked",
    desc: "No surge pricing ever",
  },
  {
    icon: Plane,
    title: "Flight tracking",
    desc: "Adjusts to your arrival",
  },
  {
    icon: UserCheck,
    title: "Meet & greet",
    desc: "Driver meets you by name",
  },
  {
    icon: Shield,
    title: "Free cancellation",
    desc: "Up to 60 min before",
  },
  {
    icon: Clock,
    title: "Extra wait time",
    desc: "Never miss your ride",
  },
  {
    icon: Zap,
    title: "Top-rated drivers",
    desc: "Priority matching",
  },
];

/* ─── Main Component ─── */
export default function ZivoReserve({ onReserve }: { onReserve?: () => void } = {}) {
  const [screen, setScreen] = useState<Screen>("landing");
  const [selectedDayIdx, setSelectedDayIdx] = useState(2);
  const [selectedHourIdx, setSelectedHourIdx] = useState(4);
  const [selectedMinIdx, setSelectedMinIdx] = useState(6);
  const [amPm, setAmPm] = useState<"AM" | "PM">("PM");
  const [pickup, setPickup] = useState("900 Fourth Ave");
  const [dropoff, setDropoff] = useState("");

  const days = useMemo(() => generateDays(60), []);

  const selectedDay = days[selectedDayIdx];
  const selectedHour = hours[selectedHourIdx];
  const selectedMin = minutes[selectedMinIdx];

  const formattedTime = `${selectedHour}:${String(selectedMin).padStart(2, "0")} ${amPm}`;
  const formattedDateTime = `${selectedDay?.label} at ${formattedTime}`;

  const handleReserve = () => {
    if (onReserve) {
      onReserve();
      return;
    }
    if (!pickup || !dropoff) {
      setScreen("route");
      return;
    }
    setScreen("datetime");
  };

  const handleSetTime = () => {
    if (!pickup || !dropoff) {
      setScreen("route");
      return;
    }
    setScreen("confirmed");
    toast.success("Your ride has been reserved!");
  };

  const handleBack = () => {
    if (screen === "datetime") setScreen(pickup && dropoff ? "route" : "landing");
    else if (screen === "route") setScreen("landing");
    else if (screen === "confirmed") setScreen("landing");
    else setScreen("landing");
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <AnimatePresence mode="wait">
        {/* ─── LANDING SCREEN ─── */}
        {screen === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex flex-col h-full bg-background overflow-hidden"
          >
            {/* Hero image — compact */}
            <div className="relative w-full h-[140px] shrink-0">
              <img
	                src={reserveHero}
	                alt="ZIVO Reserve"
	                className="w-full h-full object-cover rounded-b-2xl"
	                loading="lazy"
	                decoding="async"
	              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent rounded-b-2xl" />
              <div className="absolute bottom-2 left-4">
                <div className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Premium</span>
                </div>
              </div>
            </div>

            {/* Content — fills remaining space */}
            <div className="flex flex-col flex-1 min-h-0 px-4 pt-3 pb-4">
              {/* Title */}
              <div className="mb-2 shrink-0">
                <h1 className="text-lg font-black text-foreground tracking-tight leading-tight">
                  ZIVO Reserve
                </h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Schedule up to 60 days ahead. Price locked, no surge.
                </p>
              </div>

              {/* Benefits — compact rows, scrollable if needed */}
              <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto scrollbar-none mb-3">
                {benefits.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-xl bg-card border border-border/40 px-3 py-2 shrink-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground leading-tight">{b.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{b.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <Button
                className="w-full h-11 rounded-2xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-xl shadow-primary/30 shrink-0"
                onClick={handleReserve}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Reserve a ride
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── ROUTE SCREEN ─── */}
        {screen === "route" && (
          <motion.div
            key="route"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex flex-col flex-1 px-5 pt-4 pb-4"
          >
            <button type="button" onClick={handleBack} className="self-start mb-4">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>

            <h1 className="text-2xl font-black text-foreground mb-6">
              Where are you going?
            </h1>

            {/* Route inputs */}
            <div className="rounded-2xl bg-card border border-border/30 p-4 space-y-0">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div className="w-0.5 h-10 bg-border/50" />
                  <div className="w-3 h-3 rounded-full bg-foreground" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pickup</label>
                    <Input
                      placeholder="Pickup address"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="h-11 rounded-xl text-sm font-semibold bg-muted/20 border-0 focus:bg-muted/40 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dropoff</label>
                    <Input
                      placeholder="Destination address"
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      className="h-11 rounded-xl text-sm font-semibold bg-muted/20 border-0 focus:bg-muted/40 mt-1"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick places */}
            <div className="mt-4 space-y-2">
              {[
                { name: "Home — 123 Main St", icon: Home },
                { name: "San Francisco International Airport (SFO)", icon: Navigation },
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <button type="button"
                    key={p.name}
                    onClick={() => {
                      setDropoff(p.name);
                      toast.success("Destination set");
                    }}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/30 text-left hover:border-primary/20 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-6">
              <Button
                className="w-full h-14 rounded-2xl text-base font-bold shadow-lg bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  if (!pickup || !dropoff) {
                    toast.error("Please enter pickup and destination");
                    return;
                  }
                  setScreen("datetime");
                }}
                disabled={!pickup || !dropoff}
              >
                Set pickup time
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── DATETIME PICKER SCREEN ─── */}
        {screen === "datetime" && (
          <motion.div
            key="datetime"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="flex flex-col flex-1 px-5 pt-4 pb-4"
          >
            <button type="button" onClick={handleBack} className="self-start mb-4">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>

            <h1 className="text-2xl font-black text-foreground mb-2">
              When do you want to leave?
            </h1>

            {/* 2026 Scroll wheel time picker */}
            <div className="flex-1 flex items-center justify-center px-1">
              <div className="w-full max-w-sm">
                <ScrollWheelPicker
                  days={days}
                  selectedDayIdx={selectedDayIdx}
                  onDayChange={setSelectedDayIdx}
                  hours={hours}
                  selectedHourIdx={selectedHourIdx}
                  onHourChange={setSelectedHourIdx}
                  minutes={minutes}
                  selectedMinIdx={selectedMinIdx}
                  onMinChange={setSelectedMinIdx}
                  amPm={amPm}
                  onAmPmChange={setAmPm}
                />
              </div>
            </div>

            {/* Benefits reminder */}
            <div className="space-y-3 mb-5">
              {benefits.map((b, i) => {
                const Icon = b.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-snug">{b.title}</p>
                  </div>
                );
              })}
              <button type="button" className="text-xs text-primary font-semibold hover:underline">
                See terms
              </button>
            </div>

            {/* CTA */}
            <Button
              className="w-full h-14 rounded-2xl text-base font-bold shadow-lg bg-foreground text-background hover:bg-foreground/90"
              onClick={handleSetTime}
            >
              Set pickup time
            </Button>
          </motion.div>
        )}

        {/* ─── CONFIRMED SCREEN ─── */}
        {screen === "confirmed" && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col flex-1 px-5 pt-4 pb-4"
          >
            <button type="button" onClick={handleBack} className="self-start mb-6">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-2xl font-black text-foreground mb-1">
                Your ride has been reserved
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-emerald-600 font-semibold">Reservation confirmed</span>
              </div>
            </motion.div>

            {/* Upcoming trip card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-6"
            >
              <h3 className="text-sm font-bold text-muted-foreground mb-3">Upcoming Trip</h3>
              <div className="rounded-2xl bg-foreground/[0.06] border border-border/30 overflow-hidden">
                {/* Date/time header */}
                <div className="bg-foreground text-background px-5 py-4 rounded-t-2xl">
                  <p className="text-base font-bold">
                    {selectedDay?.label} at {formattedTime}
                  </p>
                </div>

                {/* Route details */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-0.5 pt-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <div className="w-0.5 h-8 bg-border/50" />
                      <div className="w-3 h-3 rounded-full bg-foreground" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-sm font-bold text-foreground">{pickup}</p>
                        <p className="text-xs text-muted-foreground">Pickup at {formattedTime}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{dropoff}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-2 border-t border-border/20">
                    <button type="button" className="text-sm font-bold text-foreground underline underline-offset-2">
                      Details
                    </button>
                    <button type="button" className="text-sm font-bold text-primary underline underline-offset-2">
                      See terms
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Reserve another */}
            <div className="mt-auto pt-6">
              <Button
                className="w-full h-14 rounded-2xl text-base font-bold shadow-lg bg-foreground text-background hover:bg-foreground/90 gap-2"
                onClick={() => {
                  setPickup("900 Fourth Ave");
                  setDropoff("");
                  setScreen("landing");
                }}
              >
                Reserve another ride
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
