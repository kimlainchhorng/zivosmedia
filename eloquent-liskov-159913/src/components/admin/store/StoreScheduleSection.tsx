/**
 * StoreScheduleSection v2 — Redesigned employee scheduling with modern UI.
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, Users,
  Copy, Trash2, Download, AlertTriangle, Sun, Moon, Sunrise,
  BarChart3, CalendarOff, CalendarCheck, Briefcase, X, Check,
  UserPlus, Coffee, Palmtree, Thermometer, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isWithinInterval, parseISO, isSameDay, eachDayOfInterval } from "date-fns";
import { toast } from "sonner";

interface Props { storeId: string; }

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SHIFT_PRESETS = [
  { type: "morning", label: "Morning", icon: Sunrise, start: "06:00", end: "14:00", color: "bg-amber-50 text-amber-700 border-amber-200", dotColor: "bg-amber-400", gradient: "from-amber-400 to-orange-400" },
  { type: "afternoon", label: "Afternoon", icon: Sun, start: "14:00", end: "22:00", color: "bg-sky-50 text-sky-700 border-sky-200", dotColor: "bg-sky-400", gradient: "from-muted to-muted" },
  { type: "evening", label: "Evening", icon: Moon, start: "18:00", end: "02:00", color: "bg-violet-50 text-violet-700 border-violet-200", dotColor: "bg-violet-400", gradient: "from-muted to-muted" },
  { type: "full", label: "Full Day", icon: Clock, start: "09:00", end: "17:00", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dotColor: "bg-emerald-400", gradient: "from-emerald-400 to-teal-500" },
  { type: "split", label: "Split", icon: BarChart3, start: "10:00", end: "20:00", color: "bg-rose-50 text-rose-700 border-rose-200", dotColor: "bg-rose-400", gradient: "from-muted to-muted" },
];

const OFF_REASONS = ["Day Off", "Vacation", "Sick Leave", "Personal", "Public Holiday"];
const VISIBLE_DAY_COUNT = 7;

type WorkAssignment = {
  id: string; employeeId: string;
  startDate: string; endDate: string;
  shiftType: string; shiftStart: string; shiftEnd: string;
  workDays: number[]; note?: string;
};

type DayOff = {
  id: string; employeeId: string;
  date: string; reason: string; note?: string;
};

/** Inline cell action menu with editable times */
function CellActionMenu({ cellMenu, employees, onClose, onQuickAssign, onCustom, onDayOff }: {
  cellMenu: { empId: string; date: Date };
  employees: any[];
  onClose: () => void;
  onQuickAssign: (empId: string, date: Date, preset: typeof SHIFT_PRESETS[0], start: string, end: string) => void;
  onCustom: (empId: string, date: Date) => void;
  onDayOff: (empId: string, date: Date, reason: string) => void;
}) {
  const emp = employees.find((e: any) => e.id === cellMenu.empId);
  const date = cellMenu.date;
  const [times, setTimes] = useState<Record<string, { start: string; end: string }>>(
    () => Object.fromEntries(SHIFT_PRESETS.map(p => [p.type, { start: p.start, end: p.end }]))
  );
  const [selectedShift, setSelectedShift] = useState<string | null>("morning");

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const selectedPreset = SHIFT_PRESETS.find(p => p.type === selectedShift);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[400px] p-0 gap-0 rounded-2xl overflow-hidden shadow-2xl border-border/40">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-base font-bold text-primary-foreground shadow-md">
              {emp?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold leading-tight">{format(date, "EEEE, MMM d")}</p>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{emp?.name} · <span className="capitalize">{emp?.role}</span></p>
            </div>
          </div>
        </div>

        {/* All content — no scroll */}
        <div className="px-5 pt-4 pb-5 space-y-3">
          {/* Section Label */}
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Assign Shift
          </p>

          {/* Selected Shift Selector Pill */}
          {selectedPreset && (
            <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl border-2", selectedPreset.color)}>
              <div className={cn("w-5 h-5 rounded-full bg-gradient-to-r shrink-0 shadow-sm", selectedPreset.gradient)} />
              <span className="text-[14px] font-semibold flex-1">{selectedPreset.label}</span>
              <span className="text-[12px] text-muted-foreground tabular-nums">{selectedPreset.start} – {selectedPreset.end}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 rotate-90" />
            </div>
          )}

          {/* Start / End Time */}
          {selectedPreset && (
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Start Time</label>
                <div className="relative">
                  <input
                    type="time"
                    value={times[selectedPreset.type]?.start || selectedPreset.start}
                    onChange={e => setTimes(t => ({ ...t, [selectedPreset.type]: { ...t[selectedPreset.type], start: e.target.value } }))}
                    className="w-full text-base font-bold tabular-nums bg-card border border-border rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 pointer-events-none" />
                </div>
              </div>
              <div className="pb-3.5">
                <div className="w-4 h-[2px] bg-muted-foreground/20 rounded-full" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">End Time</label>
                <div className="relative">
                  <input
                    type="time"
                    value={times[selectedPreset.type]?.end || selectedPreset.end}
                    onChange={e => setTimes(t => ({ ...t, [selectedPreset.type]: { ...t[selectedPreset.type], end: e.target.value } }))}
                    className="w-full text-base font-bold tabular-nums bg-card border border-border rounded-xl px-3 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Assign Button */}
          {selectedPreset && (
            <Button
              className="w-full gap-2 h-10 text-[13px] font-bold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg transition-all rounded-xl"
              onClick={() => onQuickAssign(
                cellMenu.empId, date, selectedPreset,
                times[selectedPreset.type]?.start || selectedPreset.start,
                times[selectedPreset.type]?.end || selectedPreset.end
              )}
            >
              <Check className="w-4 h-4" /> Assign {selectedPreset.label} Shift
            </Button>
          )}

          {/* Other Shifts */}
          <div className="space-y-0.5 pt-1">
            {SHIFT_PRESETS.filter(p => p.type !== selectedShift).map(p => (
              <button type="button"
                key={p.type}
                onClick={() => setSelectedShift(p.type)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left hover:bg-muted/40 active:scale-[0.99]"
              >
                <div className={cn("w-4 h-4 rounded-full bg-gradient-to-r shrink-0 shadow-sm", p.gradient)} />
                <span className="text-[13px] font-semibold flex-1">{p.label}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{p.start} – {p.end}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/25" />
              </button>
            ))}
          </div>

          {/* Custom Shift */}
          <button type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left"
            onClick={() => onCustom(cellMenu.empId, date)}
          >
            <Plus className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            <span className="text-[13px] font-medium text-muted-foreground">Custom shift…</span>
          </button>

          <div className="border-t border-border/40 my-1" />

          {/* Time Off */}
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CalendarOff className="w-3.5 h-3.5" /> Time Off
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { reason: "Day Off", icon: Coffee },
              { reason: "Vacation", icon: Palmtree },
              { reason: "Sick Leave", icon: Thermometer },
              { reason: "Personal", icon: User },
            ].map(item => (
              <button type="button" key={item.reason}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left border border-border/40 hover:bg-muted/40 hover:border-border hover:shadow-sm active:scale-[0.98]"
                onClick={() => onDayOff(cellMenu.empId, date, item.reason)}
              >
                <item.icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-[12px] font-semibold">{item.reason}</span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StoreScheduleSection({ storeId }: Props) {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [assignDialog, setAssignDialog] = useState(false);
  const [offDialog, setOffDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState<{ empId: string; dayIdx: number } | null>(null);
  const [cellMenu, setCellMenu] = useState<{ empId: string; date: Date } | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "2week">("week");
  const menuRef = useRef<HTMLDivElement>(null);

  const [assignForm, setAssignForm] = useState({
    employeeId: "", startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    shiftType: "full", shiftStart: "09:00", shiftEnd: "17:00",
    workDays: [0, 1, 2, 3, 4] as number[], note: "",
  });

  const [offForm, setOffForm] = useState({
    employeeId: "", startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    reason: "Day Off", note: "",
  });

  const scheduleKey = `schedule_data_${storeId}`;
  const scheduleQueryKey = ["schedule-data", storeId] as const;

  const { data: scheduleData } = useQuery({
    queryKey: scheduleQueryKey,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", scheduleKey).maybeSingle();
      if (error) throw error;
      const value = data?.value && typeof data.value === "object" ? (data.value as any) : {};
      return {
        assignments: Array.isArray(value.assignments) ? (value.assignments as WorkAssignment[]) : [],
        daysOff: Array.isArray(value.daysOff) ? (value.daysOff as DayOff[]) : [],
      };
    },
  });

  useEffect(() => {
    if (!scheduleData) return;
    setAssignments(scheduleData.assignments);
    setDaysOff(scheduleData.daysOff);
  }, [scheduleData]);

  // Close cell menu on outside click
  useEffect(() => {
    if (!cellMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCellMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cellMenu]);

  const saveScheduleMutation = useMutation({
    mutationFn: async (payload: { assignments: WorkAssignment[]; daysOff: DayOff[] }) => {
      const value = { assignments: payload.assignments, daysOff: payload.daysOff };
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", scheduleKey).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", scheduleKey);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings").insert({ key: scheduleKey, value, description: "Store schedule data" });
        if (error) throw error;
      }
      return payload;
    },
    onSuccess: (payload) => { queryClient.setQueryData(scheduleQueryKey, payload); },
    onError: (error: any) => { toast.error("Failed to save: " + error.message); },
  });

  const persistSchedule = (a: WorkAssignment[], d: DayOff[]) => {
    const v = { assignments: a, daysOff: d };
    queryClient.setQueryData(scheduleQueryKey, v);
    saveScheduleMutation.mutate(v);
  };

  const { data: employees = [] } = useQuery({
    queryKey: ["store-employees-schedule", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("store_employees").select("*").eq("store_id", storeId).eq("status", "active").order("name");
      return (data || []) as any[];
    },
  });

  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const safeDaysOff = Array.isArray(daysOff) ? daysOff : [];
  const visibleDays = viewMode === "2week" ? 14 : 7;
  const weekDates = Array.from({ length: visibleDays }, (_, i) => addDays(weekStart, i));

  const getDayStatus = (empId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOff = safeDaysOff.find(d => d.employeeId === empId && d.date === dateStr);
    if (dayOff) return { status: "off" as const, dayOff, assignment: null };
    const dow = (date.getDay() + 6) % 7;
    const assignment = safeAssignments.find(a =>
      a.employeeId === empId && Array.isArray(a.workDays) && a.workDays.includes(dow) &&
      isWithinInterval(date, { start: parseISO(a.startDate), end: parseISO(a.endDate) })
    );
    if (assignment) return { status: "working" as const, dayOff: null, assignment };
    return { status: "unset" as const, dayOff: null, assignment: null };
  };

  const addAssignment = () => {
    if (!assignForm.employeeId || assignForm.workDays.length === 0) return;
    const n: WorkAssignment = {
      id: crypto.randomUUID(), employeeId: assignForm.employeeId,
      startDate: assignForm.startDate, endDate: assignForm.endDate,
      shiftType: assignForm.shiftType, shiftStart: assignForm.shiftStart,
      shiftEnd: assignForm.shiftEnd, workDays: assignForm.workDays, note: assignForm.note,
    };
    const updated = [...safeAssignments, n];
    setAssignments(updated);
    persistSchedule(updated, safeDaysOff);
    setAssignDialog(false);
    toast.success("Schedule assigned");
  };

  const addDaysOff = () => {
    if (!offForm.employeeId) return;
    const days = eachDayOfInterval({ start: parseISO(offForm.startDate), end: parseISO(offForm.endDate) });
    const newOffs = days.map(d => ({
      id: crypto.randomUUID(), employeeId: offForm.employeeId,
      date: format(d, "yyyy-MM-dd"), reason: offForm.reason, note: offForm.note,
    }));
    const updated = [...safeDaysOff, ...newOffs];
    setDaysOff(updated);
    persistSchedule(safeAssignments, updated);
    setOffDialog(false);
    toast.success(`${newOffs.length} day(s) off added`);
  };

  const removeAssignment = (id: string) => { const u = safeAssignments.filter(a => a.id !== id); setAssignments(u); persistSchedule(u, safeDaysOff); };
  const removeDayOff = (id: string) => { const u = safeDaysOff.filter(d => d.id !== id); setDaysOff(u); persistSchedule(safeAssignments, u); };

  const toggleWorkDay = (day: number) => {
    setAssignForm(f => ({ ...f, workDays: f.workDays.includes(day) ? f.workDays.filter(d => d !== day) : [...f.workDays, day].sort() }));
  };

  const weekStats = useMemo(() => {
    let totalShifts = 0, totalHours = 0;
    const scheduledIds = new Set<string>();
    const coverageByDay = weekDates.map(() => 0);
    employees.forEach((emp: any) => {
      weekDates.forEach((date, dayIdx) => {
        const s = getDayStatus(emp.id, date);
        if (s.status === "working" && s.assignment) {
          totalShifts++; scheduledIds.add(emp.id); coverageByDay[dayIdx]++;
          const [sh, sm] = s.assignment.shiftStart.split(":").map(Number);
          const [eh, em] = s.assignment.shiftEnd.split(":").map(Number);
          totalHours += Math.max(0, (eh + em / 60) - (sh + sm / 60));
        }
      });
    });
    return { totalShifts, totalHours, scheduledCount: scheduledIds.size, coverageByDay };
  }, [employees, weekDates, safeAssignments, safeDaysOff]);

  const maxCoverage = Math.max(...weekStats.coverageByDay, 1);

  const quickAssign = (empId: string, date: Date, preset: typeof SHIFT_PRESETS[0]) => {
    const dow = (date.getDay() + 6) % 7;
    const n: WorkAssignment = {
      id: crypto.randomUUID(), employeeId: empId,
      startDate: format(date, "yyyy-MM-dd"), endDate: format(date, "yyyy-MM-dd"),
      shiftType: preset.type, shiftStart: preset.start, shiftEnd: preset.end,
      workDays: [dow],
    };
    const updated = [...safeAssignments, n];
    setAssignments(updated);
    persistSchedule(updated, safeDaysOff);
    setCellMenu(null);
    toast.success(`${preset.label} shift assigned`);
  };

  const quickDayOff = (empId: string, date: Date, reason: string) => {
    const n: DayOff = {
      id: crypto.randomUUID(), employeeId: empId,
      date: format(date, "yyyy-MM-dd"), reason,
    };
    const updated = [...safeDaysOff, n];
    setDaysOff(updated);
    persistSchedule(safeAssignments, updated);
    setCellMenu(null);
    toast.success(`${reason} set`);
  };

  const statItems = [
    { icon: Calendar, label: "Shifts", value: weekStats.totalShifts, gradient: "from-muted to-muted" },
    { icon: Clock, label: "Hours", value: `${weekStats.totalHours.toFixed(0)}h`, gradient: "from-emerald-500 to-teal-600" },
    { icon: Users, label: "Scheduled", value: weekStats.scheduledCount, gradient: "from-muted to-muted" },
    { icon: AlertTriangle, label: "Unscheduled", value: Math.max(0, employees.length - weekStats.scheduledCount), gradient: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Schedule</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, visibleDays - 1), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setOffDialog(true)}>
            <CalendarOff className="w-3.5 h-3.5" /> Day Off
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-gradient-to-r from-primary to-primary/80 shadow-md hover:shadow-lg transition-shadow" onClick={() => setAssignDialog(true)}>
            <Plus className="w-3.5 h-3.5" /> Assign
          </Button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statItems.map((s, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl border bg-card p-4 group hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm", s.gradient)}>
                <s.icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold tracking-tight leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
            <div className={cn("absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-gradient-to-br opacity-[0.06]", s.gradient)} />
          </div>
        ))}
      </div>

      {/* ── Coverage Sparkline ── */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold">Daily Coverage</p>
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
            <button type="button" onClick={() => setViewMode("week")} className={cn("text-[10px] px-2.5 py-1 rounded-md font-medium transition-all", viewMode === "week" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>7 days</button>
            <button type="button" onClick={() => setViewMode("2week")} className={cn("text-[10px] px-2.5 py-1 rounded-md font-medium transition-all", viewMode === "2week" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>14 days</button>
          </div>
        </div>
        <div className="flex items-end gap-1.5">
          {weekDates.map((date, i) => {
            const count = weekStats.coverageByDay[i] || 0;
            const pct = (count / maxCoverage) * 100;
            const isToday = isSameDay(date, new Date());
            const isWeekend = ((date.getDay() + 6) % 7) >= 5;
            return (
              <div key={date.toISOString()} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className={cn("text-[10px] font-bold tabular-nums", count > 0 ? "text-foreground" : "text-muted-foreground/40")}>{count}</span>
                <div className="w-full h-10 rounded-md bg-muted/40 relative overflow-hidden">
                  <div
                    className={cn("absolute bottom-0 w-full rounded-md transition-all duration-500",
                      isToday ? "bg-gradient-to-t from-primary to-primary/60" :
                      count > 0 ? "bg-gradient-to-t from-primary/50 to-primary/20" : "bg-muted-foreground/8"
                    )}
                    style={{ height: `${Math.max(pct, 8)}%` }}
                  />
                </div>
                <span className={cn("text-[9px] font-medium", isToday ? "text-primary font-bold" : isWeekend ? "text-destructive/60" : "text-muted-foreground")}>
                  {format(date, "EEE")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Week Navigation ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 bg-muted/40 rounded-full p-0.5">
          <Button variant="ghost" size="icon" aria-label="Previous week" className="h-9 w-9 rounded-full hover:bg-background hover:shadow-sm transition-all" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm font-semibold h-9 px-5 rounded-full hover:bg-background hover:shadow-sm transition-all"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next week" className="h-9 w-9 rounded-full hover:bg-background hover:shadow-sm transition-all" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="gap-1.5 text-[11px] h-8 rounded-lg" onClick={() => { toast.success("Copied to next week"); setWeekStart(addWeeks(weekStart, 1)); }}>
            <Copy className="w-3 h-3" /> Copy
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-[11px] h-8 rounded-lg">
            <Download className="w-3 h-3" /> Export
          </Button>
        </div>
      </div>

      {/* ── Schedule Grid ── */}
      <div className="rounded-xl border bg-card overflow-visible shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: viewMode === "2week" ? "1200px" : "800px" }}>
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider w-48 sticky left-0 bg-muted/30 z-10">
                  Team
                </th>
                {weekDates.map((date) => {
                  const isToday = isSameDay(date, new Date());
                  const isWeekend = ((date.getDay() + 6) % 7) >= 5;
                  return (
                    <th key={date.toISOString()} className={cn("text-center px-2 py-3 font-medium text-[11px] min-w-[100px]",
                      isToday ? "text-primary" : isWeekend ? "text-destructive/60" : "text-muted-foreground"
                    )}>
                      <div className={cn("inline-flex flex-col items-center gap-0.5",
                        isToday && "bg-primary/10 rounded-lg px-3 py-1"
                      )}>
                        <span className="uppercase tracking-wider">{format(date, "EEE")}</span>
                        <span className={cn("text-[14px] font-bold", isToday ? "text-primary" : "text-foreground")}>{format(date, "d")}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="text-center px-3 py-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider w-16 sticky right-0 bg-muted/30 z-10">Hrs</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={weekDates.length + 2} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No team members</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Add employees first to start scheduling</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : employees.map((emp: any) => {
                let weekHours = 0;
                return (
                  <tr key={emp.id} className="border-t border-border/40 hover:bg-muted/5 transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[12px] font-bold text-primary ring-2 ring-primary/10">
                          {emp.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[13px] leading-tight">{emp.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{emp.role}</p>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((date, dayIdx) => {
                      const isToday = isSameDay(date, new Date());
                      const { status, dayOff, assignment } = getDayStatus(emp.id, date);
                      if (status === "working" && assignment) {
                        const [sh, sm] = assignment.shiftStart.split(":").map(Number);
                        const [eh, em] = assignment.shiftEnd.split(":").map(Number);
                        weekHours += Math.max(0, (eh + em / 60) - (sh + sm / 60));
                      }
                      const preset = assignment ? SHIFT_PRESETS.find(p => p.type === assignment.shiftType) : null;
                      const isMenuOpen = cellMenu && cellMenu.empId === emp.id && isSameDay(cellMenu.date, date);

                      return (
                        <td key={date.toISOString()} className={cn("px-1.5 py-2 text-center align-middle", isToday && "bg-primary/[0.03]")}>
                          {status === "off" ? (
                            <button type="button" onClick={() => setDetailDialog({ empId: emp.id, dayIdx })}
                              className="w-full rounded-xl bg-muted/40 border border-dashed border-muted-foreground/15 px-2 py-2.5 transition-all hover:bg-muted/60 active:scale-95">
                              <Coffee className="w-4 h-4 text-muted-foreground/50 mx-auto" />
                              <div className="text-[10px] font-medium text-muted-foreground/70 mt-1">{dayOff?.reason}</div>
                            </button>
                          ) : status === "working" && assignment ? (
                            <button type="button"
                              onClick={() => setDetailDialog({ empId: emp.id, dayIdx })}
                              className={cn("w-full rounded-xl border px-2 py-2 transition-all hover:shadow-md active:scale-[0.97]", preset?.color || SHIFT_PRESETS[3].color)}
                            >
                              <div className="font-bold text-[11px] capitalize">{preset?.label || assignment.shiftType}</div>
                              <div className="text-[10px] opacity-70 font-medium mt-0.5">{assignment.shiftStart}–{assignment.shiftEnd}</div>
                            </button>
                          ) : (
                            <button type="button"
                              onClick={() => setCellMenu(isMenuOpen ? null : { empId: emp.id, date })}
                              className={cn(
                                "w-full h-[52px] rounded-xl border border-dashed flex items-center justify-center transition-all",
                                isMenuOpen ? "border-primary/40 bg-primary/5" : "border-transparent hover:border-border/60 hover:bg-muted/20 group"
                              )}
                            >
                              <Plus className={cn("w-4 h-4 transition-colors", isMenuOpen ? "text-primary" : "text-muted-foreground/20 group-hover:text-muted-foreground/50")} />
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center sticky right-0 bg-card z-10">
                      <div className={cn("inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums",
                        weekHours > 40 ? "bg-destructive/10 text-destructive" : "text-foreground"
                      )}>
                        {weekHours.toFixed(0)}h
                        {weekHours > 40 && <AlertTriangle className="w-3 h-3 ml-0.5" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Cell Action Menu ── */}
      {cellMenu && <CellActionMenu
        cellMenu={cellMenu}
        employees={employees}
        onClose={() => setCellMenu(null)}
        onQuickAssign={(empId, date, preset, startTime, endTime) => {
          const dow = (date.getDay() + 6) % 7;
          const n: WorkAssignment = {
            id: crypto.randomUUID(), employeeId: empId,
            startDate: format(date, "yyyy-MM-dd"), endDate: format(date, "yyyy-MM-dd"),
            shiftType: preset.type, shiftStart: startTime, shiftEnd: endTime,
            workDays: [dow],
          };
          const updated = [...safeAssignments, n];
          setAssignments(updated);
          persistSchedule(updated, safeDaysOff);
          setCellMenu(null);
          toast.success(`${preset.label} shift assigned`);
        }}
        onCustom={(empId, date) => {
          const dow = (date.getDay() + 6) % 7;
          setAssignForm(f => ({ ...f, employeeId: empId, startDate: format(date, "yyyy-MM-dd"), endDate: format(date, "yyyy-MM-dd"), workDays: [dow] }));
          setAssignDialog(true);
          setCellMenu(null);
        }}
        onDayOff={(empId, date, reason) => {
          quickDayOff(empId, date, reason);
        }}
      />}
      {/* ── Legend ── */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        {SHIFT_PRESETS.map(p => (
          <div key={p.type} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full bg-gradient-to-r", p.gradient)} />
            <span className="text-[10px] text-muted-foreground font-medium">{p.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <Coffee className="w-2.5 h-2.5 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground font-medium">Off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-2.5 h-2.5 text-destructive" />
          <span className="text-[10px] text-muted-foreground font-medium">Overtime</span>
        </div>
      </div>

      {/* ── Active Assignments Summary ── */}
      {safeAssignments.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold">Active Assignments</p>
            <Badge variant="secondary" className="text-[10px]">{safeAssignments.length}</Badge>
          </div>
          <div className="space-y-2">
            {safeAssignments.map(a => {
              const emp = employees.find((e: any) => e.id === a.employeeId);
              const preset = SHIFT_PRESETS.find(p => p.type === a.shiftType);
              return (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group">
                  <div className={cn("w-2 h-8 rounded-full bg-gradient-to-b shrink-0", preset?.gradient || "from-gray-400 to-gray-500")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-semibold truncate">{emp?.name || "Unknown"}</p>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", preset?.color)}>{preset?.label}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {a.shiftStart}–{a.shiftEnd} · {format(parseISO(a.startDate), "MMM d")} → {format(parseISO(a.endDate), "MMM d")}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    {DAYS.map((d, i) => (
                      <span key={i} className={cn("w-4 h-4 rounded text-[8px] flex items-center justify-center font-bold",
                        a.workDays.includes(i) ? "bg-primary/10 text-primary" : "text-muted-foreground/20"
                      )}>{d.charAt(0)}</span>
                    ))}
                  </div>
                  <button type="button" onClick={() => removeAssignment(a.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-all">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Days Off Summary ── */}
      {safeDaysOff.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold">Upcoming Days Off</p>
            <Badge variant="secondary" className="text-[10px]">{safeDaysOff.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {safeDaysOff.sort((a, b) => a.date.localeCompare(b.date)).map(off => {
              const emp = employees.find((e: any) => e.id === off.employeeId);
              return (
                <div key={off.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/40 text-[10px] group hover:bg-muted/50 transition-colors">
                  <span className="font-bold">{emp?.name?.split(" ")[0]}</span>
                  <span className="text-muted-foreground">{format(parseISO(off.date), "MMM d")}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-muted-foreground">{off.reason}</span>
                  <button type="button" onClick={() => removeDayOff(off.id)} className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-destructive transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Assign Work Dialog ── */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              Assign Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Employee</Label>
              <Select value={assignForm.employeeId} onValueChange={v => setAssignForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name} · {e.role}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">From</Label>
                <Input type="date" value={assignForm.startDate} onChange={e => setAssignForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">To</Label>
                <Input type="date" value={assignForm.endDate} onChange={e => setAssignForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Working Days</Label>
              <div className="flex gap-1">
                {DAYS.map((d, i) => (
                  <button type="button" key={i} onClick={() => toggleWorkDay(i)}
                    className={cn("flex-1 h-9 rounded-lg text-[11px] font-bold border transition-all",
                      assignForm.workDays.includes(i)
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                        : "bg-muted/30 text-muted-foreground/60 border-transparent hover:bg-muted/50"
                    )}>{d.slice(0, 2)}</button>
                ))}
              </div>
              <div className="flex gap-3 mt-1">
                <button type="button" className="text-[10px] text-primary font-medium hover:underline" onClick={() => setAssignForm(f => ({ ...f, workDays: [0,1,2,3,4] }))}>Mon–Fri</button>
                <button type="button" className="text-[10px] text-primary font-medium hover:underline" onClick={() => setAssignForm(f => ({ ...f, workDays: [0,1,2,3,4,5] }))}>Mon–Sat</button>
                <button type="button" className="text-[10px] text-primary font-medium hover:underline" onClick={() => setAssignForm(f => ({ ...f, workDays: [0,1,2,3,4,5,6] }))}>All</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Shift</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {SHIFT_PRESETS.map(p => (
                  <button type="button" key={p.type} onClick={() => setAssignForm(f => ({ ...f, shiftType: p.type, shiftStart: p.start, shiftEnd: p.end }))}
                    className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                      assignForm.shiftType === p.type ? cn(p.color, "border-current shadow-sm scale-[1.02]") : "bg-muted/20 border-transparent hover:bg-muted/40"
                    )}>
                    <p.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Start</Label>
                <Input type="time" value={assignForm.shiftStart} onChange={e => setAssignForm(f => ({ ...f, shiftStart: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">End</Label>
                <Input type="time" value={assignForm.shiftEnd} onChange={e => setAssignForm(f => ({ ...f, shiftEnd: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Note</Label>
              <Input value={assignForm.note} onChange={e => setAssignForm(f => ({ ...f, note: e.target.value }))} placeholder="Optional note..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={addAssignment} disabled={!assignForm.employeeId || assignForm.workDays.length === 0}
              className="bg-gradient-to-r from-primary to-primary/80 shadow-sm">
              <Check className="w-3.5 h-3.5 mr-1.5" /> Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Day Off Dialog ── */}
      <Dialog open={offDialog} onOpenChange={setOffDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Coffee className="w-4 h-4 text-muted-foreground" />
              </div>
              Set Time Off
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Employee</Label>
              <Select value={offForm.employeeId} onValueChange={v => setOffForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">From</Label>
                <Input type="date" value={offForm.startDate} onChange={e => setOffForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">To</Label>
                <Input type="date" value={offForm.endDate} onChange={e => setOffForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Reason</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {OFF_REASONS.map(r => (
                  <button type="button" key={r} onClick={() => setOffForm(f => ({ ...f, reason: r }))}
                    className={cn("px-3 py-2 rounded-lg border text-[11px] font-medium transition-all text-left",
                      offForm.reason === r ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/20 border-transparent hover:bg-muted/40 text-muted-foreground"
                    )}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Note</Label>
              <Input value={offForm.note} onChange={e => setOffForm(f => ({ ...f, note: e.target.value }))} placeholder="Optional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOffDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={addDaysOff} disabled={!offForm.employeeId}>
              <Check className="w-3.5 h-3.5 mr-1.5" /> Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cell Detail Dialog ── */}
      <Dialog open={!!detailDialog} onOpenChange={o => !o && setDetailDialog(null)}>
        <DialogContent className="max-w-sm">
          {detailDialog && (() => {
            const date = weekDates[detailDialog.dayIdx] || addDays(weekStart, detailDialog.dayIdx);
            const emp = employees.find((e: any) => e.id === detailDialog.empId);
            const { status, dayOff, assignment } = getDayStatus(detailDialog.empId, date);
            const preset = assignment ? SHIFT_PRESETS.find(p => p.type === assignment.shiftType) : null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base">{format(date, "EEEE, MMM d")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary ring-2 ring-primary/10">{emp?.name?.charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-sm">{emp?.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{emp?.role}</p>
                    </div>
                  </div>
                  {status === "working" && assignment && (
                    <div className={cn("p-3 rounded-xl border", preset?.color)}>
                      <div className="flex items-center gap-2 mb-1">
                        {preset && <preset.icon className="w-4 h-4" />}
                        <span className="font-bold text-sm">{preset?.label}</span>
                      </div>
                      <p className="text-sm font-medium">{assignment.shiftStart} – {assignment.shiftEnd}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(parseISO(assignment.startDate), "MMM d")} → {format(parseISO(assignment.endDate), "MMM d, yyyy")}
                      </p>
                      {assignment.note && <p className="text-[11px] italic text-muted-foreground mt-1.5">"{assignment.note}"</p>}
                    </div>
                  )}
                  {status === "off" && dayOff && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-dashed">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{dayOff.reason}</span>
                      </div>
                      {dayOff.note && <p className="text-[11px] text-muted-foreground mt-1">{dayOff.note}</p>}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  {status === "working" && assignment && (
                    <Button variant="destructive" size="sm" onClick={() => { removeAssignment(assignment.id); setDetailDialog(null); }}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
                    </Button>
                  )}
                  {status === "off" && dayOff && (
                    <Button variant="outline" size="sm" onClick={() => { removeDayOff(dayOff.id); setDetailDialog(null); }}>
                      <X className="w-3.5 h-3.5 mr-1.5" /> Remove
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
