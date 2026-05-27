import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, X, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeOption {
  id: string;
  name: string;
  role: string;
}

interface ShiftRow {
  id: string;
  store_id: string;
  employee_id: string;
  day_index: number;
  start_time: string;
  end_time: string;
  role: string | null;
  week_offset: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ROLES = ["Cashier", "Manager", "Driver", "Kitchen", "Delivery", "Support"];
const SHIFT_COLORS = [
  "bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  "bg-purple-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300",
  "bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300",
  "bg-rose-500/20 border-rose-500/30 text-rose-700 dark:text-rose-300",
];

function getWeekLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function trimTime(t: string) {
  return (t ?? "").slice(0, 5);
}

export default function ShopEmployeeSchedulePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    day_index: 0,
    start_time: "09:00",
    end_time: "17:00",
    role: "Cashier",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) return;

      const { data: store } = await (supabase as any)
        .from("store_profiles")
        .select("id")
        .eq("owner_id", uid)
        .limit(1)
        .maybeSingle();
      const sid = store?.id || null;
      setStoreId(sid);
      if (!sid) return;

      const [{ data: empData }, { data: shiftData }] = await Promise.all([
        (supabase as any)
          .from("store_employees")
          .select("id, name, role")
          .eq("store_id", sid)
          .eq("status", "active")
          .order("name"),
        (supabase as any)
          .from("employee_shifts")
          .select("id, store_id, employee_id, day_index, start_time, end_time, role, week_offset")
          .eq("store_id", sid)
          .eq("week_offset", weekOffset)
          .order("day_index"),
      ]);

      const empList = (empData || []) as EmployeeOption[];
      setEmployees(empList);
      setShifts((shiftData || []) as ShiftRow[]);
      if (empList.length && !empList.some((e) => e.id === form.employee_id)) {
        setForm((f) => ({ ...f, employee_id: empList[0].id, role: empList[0].role || f.role }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [weekOffset]);

  const employeesById = useMemo(() => {
    const m = new Map<string, EmployeeOption>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const colorForEmployee = (id: string) => {
    const ids = [...new Set(shifts.map((s) => s.employee_id))];
    return SHIFT_COLORS[ids.indexOf(id) % SHIFT_COLORS.length] ?? SHIFT_COLORS[0];
  };

  const totalHoursForEmployee = (id: string) => {
    return shifts
      .filter((s) => s.employee_id === id)
      .reduce((sum, s) => {
        const [sh, sm] = trimTime(s.start_time).split(":").map(Number);
        const [eh, em] = trimTime(s.end_time).split(":").map(Number);
        return sum + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
      }, 0)
      .toFixed(1);
  };

  const employeeIdsWithShifts = [...new Set(shifts.map((s) => s.employee_id))];

  const addShift = async () => {
    if (!storeId || !form.employee_id) {
      toast.error("Pick an employee first.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("employee_shifts").insert({
        store_id: storeId,
        employee_id: form.employee_id,
        day_index: form.day_index,
        start_time: form.start_time,
        end_time: form.end_time,
        role: form.role,
        week_offset: weekOffset,
      });
      if (error) throw error;
      const empName = employeesById.get(form.employee_id)?.name || "employee";
      toast.success(`Shift added for ${empName}`);
      setShowForm(false);
      setForm((f) => ({ ...f, day_index: 0, start_time: "09:00", end_time: "17:00" }));
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Could not add shift.");
    } finally {
      setSaving(false);
    }
  };

  const removeShift = async (id: string) => {
    const { error } = await (supabase as any).from("employee_shifts").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove shift.");
      return;
    }
    toast.success("Shift removed");
    setShifts((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <AppLayout title="Employee Schedule" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-5">
          <button type="button" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px] flex-1">Employee Schedule</h1>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowForm(true)} disabled={!employees.length}>
            <Plus className="w-3.5 h-3.5" /> Add Shift
          </Button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setWeekOffset((w) => w - 1)} className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-[13px]">
              {weekOffset === 0
                ? "This Week"
                : weekOffset === 1
                ? "Next Week"
                : weekOffset === -1
                ? "Last Week"
                : `Week ${weekOffset > 0 ? "+" : ""}${weekOffset}`}
            </p>
            <p className="text-[11px] text-muted-foreground">{getWeekLabel(weekOffset)}</p>
          </div>
          <button type="button" onClick={() => setWeekOffset((w) => w + 1)} className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        ) : !storeId ? (
          <p className="text-sm text-muted-foreground">No owner store found for this account.</p>
        ) : !employees.length ? (
          <Card className="p-6 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-[14px] mb-1">Add team members first</p>
            <p className="text-[12px] mb-4">Schedules attach to real employees so hours and pay flow through.</p>
            <Button size="sm" onClick={() => navigate("/shop-dashboard/employees")} className="gap-1.5">
              Manage team
            </Button>
          </Card>
        ) : (
          <>
            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4">
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[14px]">Add Shift</p>
                      <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted/60">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <select
                      value={form.employee_id}
                      onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none"
                      autoFocus
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} · {emp.role}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1">Day</p>
                        <select
                          value={form.day_index}
                          onChange={(e) => setForm((f) => ({ ...f, day_index: parseInt(e.target.value) }))}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none"
                        >
                          {DAYS.map((d, i) => (
                            <option key={d} value={i}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1">Role</p>
                        <select
                          value={form.role}
                          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none"
                        >
                          {ROLES.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1">Start</p>
                        <input
                          type="time"
                          value={form.start_time}
                          onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1">End</p>
                        <input
                          type="time"
                          value={form.end_time}
                          onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <Button onClick={addShift} disabled={saving || !form.employee_id} className="w-full">
                      {saving ? "Saving…" : "Add Shift"}
                    </Button>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2 mb-6">
              {DAYS.map((day, dayIdx) => {
                const dayShifts = shifts.filter((s) => s.day_index === dayIdx);
                const isToday = dayIdx === (new Date().getDay() + 6) % 7 && weekOffset === 0;
                return (
                  <Card key={day} className={cn("p-3", isToday && "border-primary/40 bg-primary/5")}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className={cn("text-[12px] font-bold w-8", isToday ? "text-primary" : "text-muted-foreground")}>{day}</p>
                      {isToday && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Today</span>}
                    </div>
                    {dayShifts.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground pl-10">No shifts</p>
                    ) : (
                      <div className="space-y-1.5 pl-10">
                        {dayShifts.map((s) => {
                          const emp = employeesById.get(s.employee_id);
                          return (
                            <div key={s.id} className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[12px]", colorForEmployee(s.employee_id))}>
                              <span className="font-semibold flex-1 truncate">{emp?.name || "Employee"}</span>
                              <span className="text-[10px] opacity-80">{s.role}</span>
                              <span className="font-medium tabular-nums">
                                {trimTime(s.start_time)}–{trimTime(s.end_time)}
                              </span>
                              <button type="button" onClick={() => removeShift(s.id)} className="ml-1 opacity-60 hover:opacity-100">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {employeeIdsWithShifts.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" /> Weekly hours by employee
                </p>
                <div className="space-y-2">
                  {employeeIdsWithShifts.map((id) => {
                    const emp = employeesById.get(id);
                    const name = emp?.name || "Employee";
                    return (
                      <Card key={id} className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[13px] font-bold shrink-0">
                          {name[0]?.toUpperCase()}
                        </div>
                        <p className="font-semibold text-[13px] flex-1 truncate">{name}</p>
                        <div className="text-right">
                          <p className="font-bold text-[14px]">{totalHoursForEmployee(id)}</p>
                          <p className="text-[10px] text-muted-foreground">hrs/week</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {shifts.length === 0 && !showForm && (
              <Card className="p-8 text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-[14px] mb-1">No shifts scheduled</p>
                <p className="text-[12px] mb-4">Add shifts to build the weekly schedule.</p>
                <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add First Shift
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
