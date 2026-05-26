import { useState, useEffect } from "react";
import { ArrowLeft, Clock, LogIn, LogOut, Calendar, TrendingUp, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ClockEntry {
  id: string;
  employeeName: string;
  type: "in" | "out";
  timestamp: string;
}

const STORAGE_KEY = "zivo_timeclock_entries";

function loadEntries(): ClockEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function ShopTimeClockPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ClockEntry[]>(loadEntries);
  const [employeeName, setEmployeeName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [clockType, setClockType] = useState<"in" | "out">("in");

  const save = (updated: ClockEntry[]) => {
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clockAction = () => {
    if (!employeeName.trim()) return;
    const entry: ClockEntry = {
      id: `${Date.now()}`,
      employeeName: employeeName.trim(),
      type: clockType,
      timestamp: new Date().toISOString(),
    };
    save([entry, ...entries]);
    toast.success(`${employeeName} clocked ${clockType}`);
    setEmployeeName("");
    setShowForm(false);
  };

  const todayEntries = entries.filter((e) => e.timestamp.startsWith(todayStr()));

  const clockedInNames = new Set<string>();
  todayEntries.forEach((e) => {
    if (e.type === "in") clockedInNames.add(e.employeeName);
    if (e.type === "out") clockedInNames.delete(e.employeeName);
  });

  const hoursWorkedToday = (() => {
    const pairs: { name: string; inTime: string }[] = [];
    let total = 0;
    [...todayEntries].reverse().forEach((e) => {
      if (e.type === "in") pairs.push({ name: e.employeeName, inTime: e.timestamp });
      if (e.type === "out") {
        const match = pairs.find((p) => p.name === e.employeeName);
        if (match) {
          total += (new Date(e.timestamp).getTime() - new Date(match.inTime).getTime()) / 3600000;
          pairs.splice(pairs.indexOf(match), 1);
        }
      }
    });
    return total.toFixed(1);
  })();

  return (
    <AppLayout title="Time Clock" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-5">
          <button type="button" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px]">Time Clock</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Clocked in", value: clockedInNames.size.toString(), icon: User, color: "text-emerald-500" },
            { label: "Hours today", value: hoursWorkedToday, icon: Clock, color: "text-blue-500" },
            { label: "Entries today", value: todayEntries.length.toString(), icon: TrendingUp, color: "text-purple-500" },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
              <p className="font-bold text-[18px]">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Clocked-in badge list */}
        {clockedInNames.size > 0 && (
          <Card className="p-3 mb-4 bg-emerald-500/10 border-emerald-500/20">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-2">Currently clocked in</p>
            <div className="flex flex-wrap gap-1.5">
              {[...clockedInNames].map((name) => (
                <span key={name} className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[12px] font-medium">
                  {name}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Clock action buttons */}
        <div className="flex gap-2 mb-4">
          <Button className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setClockType("in"); setShowForm(true); }}>
            <LogIn className="w-4 h-4" /> Clock In
          </Button>
          <Button className="flex-1 gap-1.5" variant="outline" onClick={() => { setClockType("out"); setShowForm(true); }}>
            <LogOut className="w-4 h-4" /> Clock Out
          </Button>
        </div>

        {/* Clock form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4">
              <Card className="p-4">
                <p className="font-semibold text-[14px] mb-3">
                  Clock {clockType === "in" ? "In" : "Out"} — {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Employee name"
                    className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === "Enter" && clockAction()}
                    autoFocus
                  />
                  <Button size="sm" onClick={clockAction} disabled={!employeeName.trim()} className="h-10">Record</Button>
                  <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground text-sm">✕</button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[...clockedInNames].map((name) => (
                    <button type="button" key={name} onClick={() => setEmployeeName(name)}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary/50 text-muted-foreground transition-colors">
                      {name}
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entry list */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Today's entries
          </p>
          {todayEntries.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No entries today</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {todayEntries.map((e) => (
                <Card key={e.id} className="p-3 flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", e.type === "in" ? "bg-emerald-500/15" : "bg-rose-500/15")}>
                    {e.type === "in" ? <LogIn className="w-4 h-4 text-emerald-600" /> : <LogOut className="w-4 h-4 text-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13px]">{e.employeeName}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(e.timestamp)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold">{formatTime(e.timestamp)}</p>
                    <span className={cn("text-[10px] font-semibold", e.type === "in" ? "text-emerald-600" : "text-rose-500")}>
                      {e.type === "in" ? "Clock In" : "Clock Out"}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
