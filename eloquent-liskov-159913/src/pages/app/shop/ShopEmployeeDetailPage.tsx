import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Phone, Mail, DollarSign, Truck, Clock3, ShoppingCart, Calendar, Shield, Check, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeDetail {
  id: string;
  store_id: string;
  name: string;
  role: string;
  status: string;
  user_id: string | null;
  email: string | null;
  phone: string | null;
  hourly_rate: number | null;
  notes: string | null;
  assigned_truck_label: string | null;
  created_at: string;
}

interface ClockLog {
  id: string;
  action: "clock_in" | "clock_out";
  created_at: string;
  gps_verified: boolean;
  latitude: number | null;
  longitude: number | null;
}

interface ShiftRow {
  id: string;
  day_index: number;
  start_time: string;
  end_time: string;
  role: string | null;
  week_offset: number;
}

interface SaleRow {
  id: string;
  total_amount: number;
  truck_label: string | null;
  created_at: string;
}

interface RuleRow {
  id: string;
  title: string;
  category: string;
  active: boolean;
}

interface AckRow {
  rule_id: string;
  acknowledged_at: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function trimTime(t: string) {
  return (t ?? "").slice(0, 5);
}

function startOfThisWeekISO() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString();
}

function computeWeeklyHours(logs: ClockLog[]): number {
  const sorted = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let totalMs = 0;
  let openIn: number | null = null;
  for (const log of sorted) {
    const t = new Date(log.created_at).getTime();
    if (log.action === "clock_in") openIn = t;
    else if (log.action === "clock_out" && openIn !== null) {
      totalMs += t - openIn;
      openIn = null;
    }
  }
  if (openIn !== null) totalMs += Date.now() - openIn;
  return Math.max(0, totalMs / 3_600_000);
}

export default function ShopEmployeeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [clockLogs, setClockLogs] = useState<ClockLog[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [acks, setAcks] = useState<AckRow[]>([]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: emp } = await (supabase as any)
        .from("store_employees")
        .select("id, store_id, name, role, status, user_id, email, phone, hourly_rate, notes, assigned_truck_label, created_at")
        .eq("id", id)
        .maybeSingle();
      if (!emp) {
        setEmployee(null);
        return;
      }
      setEmployee(emp as EmployeeDetail);

      const weekStart = startOfThisWeekISO();
      const empUserId = (emp as EmployeeDetail).user_id;

      const [{ data: clocks }, { data: shiftRows }, { data: ruleRows }, { data: ackRows }, salesPromise] = await Promise.all([
        (supabase as any)
          .from("employee_clock_logs")
          .select("id, action, created_at, gps_verified, latitude, longitude")
          .eq("employee_id", id)
          .gte("created_at", weekStart)
          .order("created_at", { ascending: true }),
        (supabase as any)
          .from("employee_shifts")
          .select("id, day_index, start_time, end_time, role, week_offset")
          .eq("employee_id", id)
          .eq("week_offset", 0)
          .order("day_index"),
        (supabase as any)
          .from("employee_rules")
          .select("id, title, category, active")
          .eq("store_id", (emp as EmployeeDetail).store_id)
          .eq("active", true)
          .order("position"),
        (supabase as any)
          .from("employee_rule_acknowledgements")
          .select("rule_id, acknowledged_at")
          .eq("employee_id", id),
        empUserId
          ? (supabase as any)
              .from("truck_sales")
              .select("id, total_amount, truck_label, created_at")
              .eq("driver_user_id", empUserId)
              .eq("status", "completed")
              .gte("created_at", weekStart)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      setClockLogs((clocks || []) as ClockLog[]);
      setShifts((shiftRows || []) as ShiftRow[]);
      setRules((ruleRows || []) as RuleRow[]);
      setAcks((ackRows || []) as AckRow[]);
      const salesData = (salesPromise as any)?.data || [];
      setSales(salesData as SaleRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const weeklyHours = useMemo(() => computeWeeklyHours(clockLogs), [clockLogs]);
  const weeklySalesTotal = useMemo(() => sales.reduce((s, r) => s + Number(r.total_amount || 0), 0), [sales]);
  const weeklyEarned = weeklyHours * Number(employee?.hourly_rate ?? 0);
  const ackedRuleIds = useMemo(() => new Set(acks.map((a) => a.rule_id)), [acks]);

  const toggleAck = async (rule: RuleRow) => {
    if (!employee) return;
    if (ackedRuleIds.has(rule.id)) {
      const { error } = await (supabase as any)
        .from("employee_rule_acknowledgements")
        .delete()
        .eq("rule_id", rule.id)
        .eq("employee_id", employee.id);
      if (error) {
        toast.error("Could not clear acknowledgement.");
        return;
      }
      toast.success(`${rule.title} ack cleared`);
    } else {
      const { error } = await (supabase as any)
        .from("employee_rule_acknowledgements")
        .insert({ rule_id: rule.id, employee_id: employee.id });
      if (error) {
        toast.error("Could not save acknowledgement.");
        return;
      }
      toast.success(`${rule.title} acknowledged`);
    }
    loadData();
  };

  return (
    <AppLayout title="Employee" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-5">
          <button type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px] flex-1">Employee</h1>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !employee ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Employee not found.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Header card */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary text-[18px] font-bold flex items-center justify-center shrink-0">
                  {employee.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[16px] truncate">{employee.name}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{employee.role}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      employee.status === "active"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                        : "bg-slate-500/15 text-slate-600 dark:text-slate-300",
                    )}>
                      {employee.status}
                    </span>
                    {employee.user_id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                        linked
                      </span>
                    )}
                    {employee.assigned_truck_label && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center gap-1">
                        <Truck className="w-3 h-3" /> {employee.assigned_truck_label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1.5 text-[12px] text-muted-foreground">
                {employee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" /> {employee.phone}
                  </div>
                )}
                {employee.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> {employee.email}
                  </div>
                )}
                {employee.hourly_rate != null && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" /> {Number(employee.hourly_rate).toFixed(2)} / hr
                  </div>
                )}
                {employee.notes && (
                  <div className="text-[11px] text-muted-foreground/80 mt-1">{employee.notes}</div>
                )}
              </div>
            </Card>

            {/* Week stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Clock3 className="w-3 h-3" /> Hours
                </p>
                <p className="font-bold text-[18px]">{weeklyHours.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">this week</p>
              </Card>
              <Card className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" /> Sales
                </p>
                <p className="font-bold text-[18px]">${weeklySalesTotal.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">{sales.length} orders</p>
              </Card>
              <Card className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Earned
                </p>
                <p className="font-bold text-[18px]">${weeklyEarned.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">hrs × rate</p>
              </Card>
            </div>

            {/* This week's shifts */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-semibold flex-1">This week's shifts</p>
                <button type="button"
                  onClick={() => navigate("/shop-dashboard/employee-schedule")}
                  className="text-[11px] font-semibold text-primary"
                >
                  Edit
                </button>
              </div>
              {shifts.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No shifts scheduled.</p>
              ) : (
                <div className="space-y-1.5">
                  {shifts.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-[12px] bg-muted/30 rounded-lg px-2.5 py-1.5">
                      <span className="font-semibold w-10 text-muted-foreground">{DAYS[s.day_index]}</span>
                      <span className="flex-1">{s.role || "Shift"}</span>
                      <span className="font-medium tabular-nums">{trimTime(s.start_time)}–{trimTime(s.end_time)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Clock history */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock3 className="w-4 h-4 text-emerald-500" />
                <p className="text-sm font-semibold">Clock log (this week)</p>
              </div>
              {clockLogs.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No clock-in or clock-out events yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {[...clockLogs].reverse().slice(0, 30).map((log) => (
                    <div key={log.id} className="flex items-center gap-2 text-[12px] bg-muted/30 rounded-lg px-2.5 py-1.5">
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                          log.action === "clock_in"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            : "bg-slate-500/15 text-slate-600 dark:text-slate-300",
                        )}
                      >
                        {log.action.replace("_", " ")}
                      </span>
                      <span className="flex-1 truncate">
                        {new Date(log.created_at).toLocaleString("en-US", {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {log.gps_verified && log.latitude != null && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> GPS
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Sales history */}
            {employee.user_id && (
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4 text-purple-500" />
                  <p className="text-sm font-semibold">Sales (this week)</p>
                </div>
                {sales.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">No sales recorded yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sales.slice(0, 20).map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-[12px] bg-muted/30 rounded-lg px-2.5 py-1.5">
                        <span className="flex-1">
                          {new Date(s.created_at).toLocaleString("en-US", {
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {s.truck_label ? ` · ${s.truck_label}` : ""}
                        </span>
                        <span className="font-bold">${Number(s.total_amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Rules acknowledgement */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-purple-500" />
                <p className="text-sm font-semibold flex-1">Rules acknowledgement</p>
                <span className="text-[11px] text-muted-foreground">
                  {ackedRuleIds.size}/{rules.length}
                </span>
              </div>
              {rules.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No active rules to acknowledge.</p>
              ) : (
                <div className="space-y-1.5">
                  {rules.map((rule) => {
                    const acked = ackedRuleIds.has(rule.id);
                    return (
                      <button type="button"
                        key={rule.id}
                        onClick={() => toggleAck(rule)}
                        className={cn(
                          "w-full flex items-center gap-2 text-left text-[12px] rounded-lg px-2.5 py-2 border transition-colors",
                          acked
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted/30 border-border/30",
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                            acked ? "bg-emerald-500 border-emerald-500" : "border-border",
                          )}
                        >
                          {acked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="flex-1 font-medium">{rule.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {rule.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            <Button variant="outline" className="w-full" onClick={() => navigate("/shop-dashboard/employees")}>
              Back to team
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
