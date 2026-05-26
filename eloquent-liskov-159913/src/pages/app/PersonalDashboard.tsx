/**
 * PersonalDashboard — Employee + Career hub (Facebook-style compact layout).
 * Clock In/Out requires QR code scanning.
 */
import { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ArrowLeft, Clock, Users, Calendar, Timer,
  CheckCircle2, ChevronRight, ChevronLeft, FileText, Bell, HelpCircle, Settings, Briefcase,
  QrCode, ScanLine, PlusCircle, Send, Search, IdCard, RefreshCw, DollarSign,
  Sunrise, Sun, Moon, BarChart3, MessageCircle, Flame,
  Building2, UserPlus, Target, TrendingUp, Wifi, Sparkles, Coffee,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/app/AppLayout";
import { QRScannerModal } from "@/components/clock/QRScannerModal";
import { EmployeeQRDisplay } from "@/components/clock/EmployeeQRDisplay";
import { toast } from "sonner";
import { format, startOfWeek, startOfMonth, addDays, isAfter, isEqual, subWeeks } from "date-fns";

const WeeklyHoursChart = lazy(() => import("@/components/app/WeeklyHoursChart"));

const DAILY_HOURS_TARGET = 8;

const SHIFT_META: Record<string, { label: string; icon: typeof Sunrise; color: string; bg: string }> = {
  morning: { label: "Morning", icon: Sunrise, color: "text-amber-500", bg: "bg-amber-500/10" },
  afternoon: { label: "Afternoon", icon: Sun, color: "text-sky-500", bg: "bg-sky-500/10" },
  evening: { label: "Evening", icon: Moon, color: "text-violet-500", bg: "bg-violet-500/10" },
  full: { label: "Full Day", icon: Clock, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  split: { label: "Split", icon: BarChart3, color: "text-rose-500", bg: "bg-rose-500/10" },
};

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

type ClockStatus = "clocked-out" | "clocked-in";

type MenuItem = {
  icon: typeof Clock;
  label: string;
  description: string;
  onClick: () => void;
  color: string;
  bg: string;
  badge?: number | string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const PersonalDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [clockStatus, setClockStatus] = useState<ClockStatus>("clocked-out");
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [totalHoursToday, setTotalHoursToday] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [, setNowTick] = useState(0);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [onBreak, setOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState<Date | null>(null);
  const [breakTotalMins, setBreakTotalMins] = useState(0);
  const [shiftSummaryOpen, setShiftSummaryOpen] = useState(false);
  const [lastShift, setLastShift] = useState<{ grossHrs: number; breakMins: number; netHrs: number; rate: number; payType: string } | null>(null);

  // Profile (avatar + name)
  const { data: profile } = useQuery({
    queryKey: ["my-profile-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Fetch employee record
  const { data: empRecord } = useQuery({
    queryKey: ["my-employee-record-dashboard", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: byUserId } = await supabase
        .from("store_employees")
        .select("id, store_id, name, role, hourly_rate, pay_type")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (byUserId) return byUserId;
      if (user.email) {
        const { data: byEmail } = await supabase
          .from("store_employees")
          .select("id, store_id, name, role, hourly_rate, pay_type")
          .eq("email", user.email)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (byEmail) {
          await supabase.from("store_employees").update({ user_id: user.id }).eq("id", byEmail.id);
          return byEmail;
        }
      }
      return null;
    },
    enabled: !!user,
  });

  // Schedule data — used for upcoming shift + week summary
  const { data: scheduleData } = useQuery({
    queryKey: ["personal-dashboard-schedule", empRecord?.store_id],
    enabled: !!empRecord?.store_id,
    queryFn: async () => {
      const key = `schedule_data_${empRecord!.store_id}`;
      const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
      const value = (data?.value && typeof data.value === "object" ? (data.value as any) : {}) as {
        assignments?: WorkAssignment[];
        daysOff?: DayOff[];
      };
      return {
        assignments: Array.isArray(value.assignments) ? value.assignments : [],
        daysOff: Array.isArray(value.daysOff) ? value.daysOff : [],
      };
    },
  });

  // Career stats — applications submitted, jobs posted, unread notifications
  const { data: stats } = useQuery({
    queryKey: ["personal-dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { applications: 0, postedJobs: 0, notifications: 0 };
      const [appsRes, jobsRes, notifRes] = await Promise.all([
        (supabase as any)
          .from("career_applications")
          .select("id", { count: "exact", head: true })
          .eq("applicant_id", user.id),
        (supabase as any)
          .from("career_jobs")
          .select("id", { count: "exact", head: true })
          .eq("posted_by", user.id)
          .eq("status", "open"),
        (supabase as any)
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ]);
      return {
        applications: appsRes?.count ?? 0,
        postedJobs: jobsRes?.count ?? 0,
        notifications: notifRes?.count ?? 0,
      };
    },
  });

  // Recommended (latest) open jobs — top 3
  const { data: recommendedJobs } = useQuery({
    queryKey: ["personal-dashboard-recommended-jobs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("career_jobs")
        .select("id, title, location, is_remote, employment_type, career_companies(name, logo_url)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(3);
      return Array.isArray(data) ? data : [];
    },
  });

  // Recent applicants on jobs the user has posted (employer side)
  const { data: recentApplicants } = useQuery({
    queryKey: ["personal-dashboard-recent-applicants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("career_applications")
        .select("id, status, created_at, applicant_id, career_jobs!inner(id, title, posted_by)")
        .eq("career_jobs.posted_by", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return Array.isArray(data) ? data : [];
    },
  });

  // Clock-in streak — consecutive days with at least one clock_in, ending today or yesterday
  const { data: streak } = useQuery({
    queryKey: ["personal-dashboard-streak", empRecord?.id],
    enabled: !!empRecord?.id,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 60);
      since.setHours(0, 0, 0, 0);
      const { data } = await (supabase as any)
        .from("store_time_entries")
        .select("clock_in")
        .eq("employee_id", empRecord!.id)
        .gte("clock_in", since.toISOString())
        .order("clock_in", { ascending: false });
      const days = new Set<string>();
      for (const e of (data ?? []) as Array<{ clock_in: string }>) {
        days.add(format(new Date(e.clock_in), "yyyy-MM-dd"));
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = addDays(today, -1);
      const todayStr = format(today, "yyyy-MM-dd");
      const yStr = format(yesterday, "yyyy-MM-dd");
      let cursor: Date;
      if (days.has(todayStr)) cursor = today;
      else if (days.has(yStr)) cursor = yesterday;
      else return 0;
      let count = 0;
      while (days.has(format(cursor, "yyyy-MM-dd"))) {
        count += 1;
        cursor = addDays(cursor, -1);
      }
      return count;
    },
  });

  // This-month worked hours + estimated earnings
  const { data: monthlyTotals } = useQuery({
    queryKey: ["personal-dashboard-month", empRecord?.id],
    enabled: !!empRecord?.id,
    queryFn: async () => {
      const start = startOfMonth(new Date());
      const { data } = await (supabase as any)
        .from("store_time_entries")
        .select("clock_in, clock_out")
        .eq("employee_id", empRecord!.id)
        .gte("clock_in", start.toISOString());
      const entries: Array<{ clock_in: string; clock_out: string | null }> = Array.isArray(data) ? data : [];
      const hours = entries
        .filter((e) => e.clock_out)
        .reduce((sum, e) => sum + (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000, 0);
      const rate = (empRecord as any)?.hourly_rate ?? 0;
      const payType = (empRecord as any)?.pay_type ?? "hourly";
      const earnings = payType === "hourly" ? hours * rate : rate; // monthly = flat rate
      return { hours, earnings, rate, payType };
    },
  });

  // Last 8 weeks of hours worked — for the performance chart
  const { data: weeklyHours } = useQuery({
    queryKey: ["personal-dashboard-weekly-hours", empRecord?.id],
    enabled: !!empRecord?.id,
    queryFn: async () => {
      const since = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 7);
      const { data } = await (supabase as any)
        .from("store_time_entries")
        .select("clock_in, clock_out")
        .eq("employee_id", empRecord!.id)
        .gte("clock_in", since.toISOString())
        .not("clock_out", "is", null);
      const entries: Array<{ clock_in: string; clock_out: string }> = Array.isArray(data) ? data : [];
      const weeks: { label: string; hours: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const wStart = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
        const wEnd = addDays(wStart, 7);
        const hrs = entries
          .filter((e) => {
            const d = new Date(e.clock_in);
            return d >= wStart && d < wEnd;
          })
          .reduce((sum, e) => sum + (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3600000, 0);
        weeks.push({ label: i === 0 ? "This wk" : `${i}w ago`, hours: parseFloat(hrs.toFixed(1)) });
      }
      return weeks;
    },
  });

  // Per-day clock-in dates for the shift calendar
  const { data: clockedDays } = useQuery({
    queryKey: ["personal-dashboard-clocked-days", empRecord?.id, calendarMonth.getFullYear(), calendarMonth.getMonth()],
    enabled: !!empRecord?.id,
    queryFn: async () => {
      const start = startOfMonth(calendarMonth);
      const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0, 23, 59, 59);
      const { data } = await (supabase as any)
        .from("store_time_entries")
        .select("clock_in")
        .eq("employee_id", empRecord!.id)
        .gte("clock_in", start.toISOString())
        .lte("clock_in", end.toISOString());
      const days: string[] = [];
      for (const e of (data ?? []) as Array<{ clock_in: string }>) {
        const d = format(new Date(e.clock_in), "yyyy-MM-dd");
        if (!days.includes(d)) days.push(d);
      }
      return days;
    },
  });

  // Coworkers currently clocked in at the same store (excluding self)
  const { data: coworkersOnline } = useQuery({
    queryKey: ["personal-dashboard-coworkers", empRecord?.store_id, empRecord?.id],
    enabled: !!empRecord?.store_id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_time_entries")
        .select("id, clock_in, employee_id, store_employees!inner(id, name, role, store_id)")
        .eq("store_employees.store_id", empRecord!.store_id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(8);
      const rows: any[] = Array.isArray(data) ? data : [];
      return rows.filter((r) => r.employee_id !== empRecord?.id);
    },
  });

  // Check if already clocked in today
  useEffect(() => {
    if (!empRecord?.id) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let cancelled = false;

    void (async () => {
      const { data } = await (supabase as any)
        .from("store_time_entries")
        .select("id, clock_in, clock_out")
        .eq("employee_id", empRecord.id)
        .gte("clock_in", todayStart.toISOString())
        .order("clock_in", { ascending: false });

      if (cancelled) return;

      const entries: Array<{ id: string; clock_in: string; clock_out: string | null }> = Array.isArray(data)
        ? data
        : [];

      if (entries.length > 0) {
        const openEntry = entries.find((e) => !e.clock_out);
        if (openEntry) {
          setClockStatus("clocked-in");
          setClockInTime(new Date(openEntry.clock_in));
        }

        const completedHrs = entries
          .filter((e) => e.clock_out)
          .reduce((sum, e) => sum + (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000, 0);

        setTotalHoursToday(completedHrs);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [empRecord?.id]);

  // Live timer while clocked in — interval, not setTimeout-in-render
  useEffect(() => {
    if (clockStatus !== "clocked-in") return;
    const id = setInterval(() => setNowTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [clockStatus]);

  const handleQRScan = async (token: string): Promise<{ success: boolean; message: string; action?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("clock-qr", {
        body: { action: "validate", token, scanner_type: "employee_scans_store" },
      });

      if (error) {
        const details = (error as any)?.context ? await (error as any).context.json().catch(() => null) : null;
        return {
          success: false,
          message: details?.error || details?.message || error.message || "Clock scan failed",
        };
      }

      if (data?.success) {
        if (data.action_performed === "clock_in") {
          setClockStatus("clocked-in");
          setClockInTime(new Date(data.clock_in));
          toast.success("Clocked In!", { description: `Welcome, ${data.employee_name}` });
        } else {
          setClockStatus("clocked-out");
          const hrs = (new Date(data.clock_out).getTime() - new Date(data.clock_in).getTime()) / 3600000;
          setTotalHoursToday((prev) => prev + hrs);
          const currentBreakMins = breakStart
            ? breakTotalMins + Math.round((Date.now() - breakStart.getTime()) / 60000)
            : breakTotalMins;
          const netHrs = Math.max(0, hrs - currentBreakMins / 60);
          const rate = (empRecord as any)?.hourly_rate ?? 0;
          const payType = (empRecord as any)?.pay_type ?? "hourly";
          setLastShift({ grossHrs: hrs, breakMins: currentBreakMins, netHrs, rate, payType });
          setShiftSummaryOpen(true);
          setClockInTime(null);
          setOnBreak(false);
          setBreakStart(null);
          setBreakTotalMins(0);
          toast.success("Clocked Out!", { description: `Worked ${hrs.toFixed(1)}h` });
        }
        void queryClient.invalidateQueries({ queryKey: ["personal-dashboard-streak"] });
        void queryClient.invalidateQueries({ queryKey: ["personal-dashboard-month"] });
        void queryClient.invalidateQueries({ queryKey: ["personal-dashboard-coworkers"] });
        return { success: true, message: data.employee_name || "Success", action: data.action_performed };
      }

      return { success: false, message: data?.error || "Clock scan failed" };
    } catch (err: any) {
      return { success: false, message: err?.message || "Network error" };
    }
  };

  const formatBreakElapsed = () => {
    if (!breakStart) return "00:00";
    const diff = Math.floor((Date.now() - breakStart.getTime()) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2, "0");
    const s = (diff % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleBreakToggle = () => {
    if (!onBreak) {
      setBreakStart(new Date());
      setOnBreak(true);
      toast.info("Break started");
    } else {
      const mins = breakStart ? Math.round((Date.now() - breakStart.getTime()) / 60000) : 0;
      setBreakTotalMins(prev => prev + mins);
      setBreakStart(null);
      setOnBreak(false);
      toast.success(`Break ended — ${mins}m taken`);
    }
  };

  const formatElapsed = () => {
    if (!clockInTime) return "00:00:00";
    const diff = Math.floor((Date.now() - clockInTime.getTime()) / 1000);
    const h = Math.floor(diff / 3600).toString().padStart(2, "0");
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, "0");
    const s = (diff % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Upcoming shift — find next assigned working day for this employee
  const upcomingShift = useMemo(() => {
    if (!empRecord?.id || !scheduleData) return null;
    const myAssignments = scheduleData.assignments.filter((a) => a.employeeId === empRecord.id);
    const myDaysOff = scheduleData.daysOff.filter((d) => d.employeeId === empRecord.id);
    if (myAssignments.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      if (myDaysOff.some((d) => d.date === dateStr)) continue;
      const dow = (date.getDay() + 6) % 7; // Monday-indexed
      const a = myAssignments.find(
        (x) =>
          x.workDays.includes(dow) &&
          (isAfter(date, new Date(x.startDate)) || isEqual(date, new Date(x.startDate))) &&
          (isAfter(new Date(x.endDate), date) || isEqual(new Date(x.endDate), date))
      );
      if (a) {
        return {
          date,
          shiftType: a.shiftType,
          shiftStart: a.shiftStart,
          shiftEnd: a.shiftEnd,
          isToday: i === 0,
          daysAway: i,
        };
      }
    }
    return null;
  }, [empRecord?.id, scheduleData]);

  // Week summary — hours assigned this week + estimated earnings
  const weekSummary = useMemo(() => {
    if (!empRecord?.id || !scheduleData) return null;
    const myAssignments = scheduleData.assignments.filter((a) => a.employeeId === empRecord.id);
    const myDaysOff = scheduleData.daysOff.filter((d) => d.employeeId === empRecord.id);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    let shifts = 0;
    let hours = 0;
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dateStr = format(date, "yyyy-MM-dd");
      if (myDaysOff.some((d) => d.date === dateStr)) continue;
      const dow = (date.getDay() + 6) % 7;
      const a = myAssignments.find(
        (x) =>
          x.workDays.includes(dow) &&
          (isAfter(date, new Date(x.startDate)) || isEqual(date, new Date(x.startDate))) &&
          (isAfter(new Date(x.endDate), date) || isEqual(new Date(x.endDate), date))
      );
      if (a) {
        shifts += 1;
        const [sh, sm] = (a.shiftStart || "09:00").split(":").map(Number);
        const [eh, em] = (a.shiftEnd || "17:00").split(":").map(Number);
        let h = eh - sh + (em - sm) / 60;
        if (h < 0) h += 24;
        hours += h;
      }
    }
    const rate = (empRecord as any).hourly_rate ?? 0;
    const payType = (empRecord as any).pay_type ?? "hourly";
    const earnings =
      payType === "monthly"
        ? (rate / 4.33) * (shifts > 0 ? shifts / 5 : 0)
        : hours * rate;
    return { shifts, hours, earnings, payType, rate };
  }, [empRecord, scheduleData]);

  // Today's schedule status — working / day off / not scheduled
  const todayStatus = useMemo(() => {
    if (!empRecord?.id || !scheduleData) return null;
    const myAssignments = scheduleData.assignments.filter((a) => a.employeeId === empRecord.id);
    const myDaysOff = scheduleData.daysOff.filter((d) => d.employeeId === empRecord.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, "yyyy-MM-dd");
    const off = myDaysOff.find((d) => d.date === todayStr);
    if (off) return { type: "off" as const, reason: off.reason || "Day off" };
    const dow = (today.getDay() + 6) % 7;
    const a = myAssignments.find(
      (x) =>
        x.workDays.includes(dow) &&
        (isAfter(today, new Date(x.startDate)) || isEqual(today, new Date(x.startDate))) &&
        (isAfter(new Date(x.endDate), today) || isEqual(new Date(x.endDate), today))
    );
    if (a) return { type: "shift" as const, shiftStart: a.shiftStart, shiftEnd: a.shiftEnd, shiftType: a.shiftType };
    if (myAssignments.length === 0) return null;
    return { type: "free" as const };
  }, [empRecord?.id, scheduleData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-schedule"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-recent-notifs"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-recommended-jobs"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-recent-applicants"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-streak"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-month"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-coworkers"] }),
      queryClient.invalidateQueries({ queryKey: ["my-employee-record-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["my-profile-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-weekly-hours"] }),
      queryClient.invalidateQueries({ queryKey: ["personal-dashboard-clocked-days"] }),
    ]);
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const offset = (start.getDay() + 6) % 7; // Monday-indexed
    const cells: (Date | null)[] = Array(offset).fill(null);
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const displayName =
    profile?.full_name?.trim() ||
    empRecord?.name ||
    user?.email?.split("@")[0] ||
    "there";
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Profile completion — checks loaded fields; only meaningful once profile data has fetched
  const profileChecks = [
    { label: "Avatar", done: !!profile?.avatar_url },
    { label: "Full name", done: !!profile?.full_name?.trim() },
    { label: "Application", done: (stats?.applications ?? 0) > 0 },
  ];
  const profileDone = profileChecks.filter((c) => c.done).length;
  const profilePct = Math.round((profileDone / profileChecks.length) * 100);
  const profileNeedsWork = profile !== undefined && profilePct < 100;

  const sections: MenuSection[] = [
    {
      title: "Jobs",
      items: [
        { icon: Briefcase, label: "Apply for Jobs", description: "Browse openings & apply", onClick: () => navigate("/personal/apply-job"), color: "text-indigo-500", bg: "bg-indigo-500/10" },
        { icon: Send, label: "My Applications", description: "Track submitted applications", onClick: () => navigate("/personal/my-applications"), color: "text-blue-500", bg: "bg-blue-500/10", badge: stats?.applications || undefined },
        { icon: IdCard, label: "Create / Edit CV", description: "Build your resume", onClick: () => navigate("/personal/create-cv"), color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
        { icon: Search, label: "Find Employees", description: "Hire talent for your shop", onClick: () => navigate("/personal/find-employee"), color: "text-cyan-500", bg: "bg-cyan-500/10" },
        { icon: PlusCircle, label: "Post a Job", description: "Open positions at your shop", onClick: () => navigate("/personal/employer"), color: "text-emerald-500", bg: "bg-emerald-500/10", badge: stats?.postedJobs || undefined },
      ],
    },
    {
      title: "Work",
      items: [
        { icon: Users, label: "Employees", description: "Manage team members", onClick: () => navigate("/personal/employees"), color: "text-blue-500", bg: "bg-blue-500/10" },
        { icon: Calendar, label: "Schedule", description: "View work schedule", onClick: () => navigate("/personal/schedule"), color: "text-purple-500", bg: "bg-purple-500/10" },
        { icon: Timer, label: "Timesheet", description: "View hours history", onClick: () => navigate("/personal/timesheet"), color: "text-amber-500", bg: "bg-amber-500/10" },
        { icon: FileText, label: "Pay Stubs", description: "Earnings & deductions", onClick: () => navigate("/personal/pay-stubs"), color: "text-emerald-500", bg: "bg-emerald-500/10" },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: Bell, label: "Notifications", description: "Alerts & reminders", onClick: () => navigate("/personal/notifications"), color: "text-rose-500", bg: "bg-rose-500/10", badge: stats?.notifications || undefined },
        { icon: HelpCircle, label: "Help & Support", description: "FAQs & contact", onClick: () => navigate("/personal/help"), color: "text-sky-500", bg: "bg-sky-500/10" },
        { icon: Settings, label: "Settings", description: "Account preferences", onClick: () => navigate("/personal/settings"), color: "text-muted-foreground", bg: "bg-muted/60" },
      ],
    },
  ];

  return (
    <AppLayout title="Workplace" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center touch-manipulation active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px] flex-1">Workplace</h1>
          <button type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center touch-manipulation active:scale-90 transition-transform disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </button>
        </div>

        {/* Greeting + profile */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-3"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold text-[14px] overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{initials || "U"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground leading-tight">{greeting},</p>
            <p className="font-bold text-[15px] truncate leading-tight">{displayName}</p>
            {empRecord?.role && (
              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                {empRecord.role}
              </p>
            )}
          </div>
          {streak && streak > 0 ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 shrink-0">
              <Flame className="w-3 h-3 text-orange-500" />
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 leading-none">
                {streak}d
              </span>
            </div>
          ) : null}
        </motion.div>

        {/* Profile completion banner */}
        {profileNeedsWork && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate("/personal/settings")}
            className="w-full text-left rounded-xl p-3 mb-3 border border-primary/20 bg-primary/5 active:bg-primary/10 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-[12px] font-semibold flex-1">Complete your profile</p>
              <span className="text-[11px] font-bold text-primary">{profilePct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${profilePct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {profileChecks.filter((c) => !c.done).map((c) => c.label).join(" · ")} pending
            </p>
          </motion.button>
        )}

        {/* Quick Actions row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { icon: ScanLine, label: "Scan", onClick: () => setScannerOpen(true), color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { icon: MessageCircle, label: "Chat", onClick: () => navigate("/chat"), color: "text-teal-500", bg: "bg-teal-500/10" },
            { icon: Briefcase, label: "Jobs", onClick: () => navigate("/personal/apply-job"), color: "text-indigo-500", bg: "bg-indigo-500/10" },
            { icon: HelpCircle, label: "Help", onClick: () => navigate("/personal/help"), color: "text-sky-500", bg: "bg-sky-500/10" },
          ].map((qa) => (
            <button type="button"
              key={qa.label}
              onClick={qa.onClick}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border border-border/40 bg-card active:bg-muted/40 transition-colors"
            >
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", qa.bg)}>
                <qa.icon className={cn("w-4 h-4", qa.color)} />
              </div>
              <span className="text-[10.5px] font-medium leading-none">{qa.label}</span>
            </button>
          ))}
        </div>

        {/* Today's status banner */}
        {todayStatus && (
          <div
            className={cn(
              "rounded-xl px-3 py-2 mb-3 border flex items-center gap-2.5",
              todayStatus.type === "off"
                ? "bg-orange-500/5 border-orange-500/20"
                : todayStatus.type === "shift"
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-muted/40 border-border/40"
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                todayStatus.type === "off"
                  ? "bg-orange-500/15"
                  : todayStatus.type === "shift"
                  ? "bg-emerald-500/15"
                  : "bg-muted/60"
              )}
            >
              {todayStatus.type === "off" ? (
                <Sunrise className="w-3.5 h-3.5 text-orange-500" />
              ) : todayStatus.type === "shift" ? (
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight">
                Today · {format(new Date(), "EEE, MMM d")}
              </p>
              <p className="text-[12.5px] font-semibold leading-tight">
                {todayStatus.type === "off"
                  ? `Day off · ${todayStatus.reason}`
                  : todayStatus.type === "shift"
                  ? `Working ${todayStatus.shiftStart}–${todayStatus.shiftEnd}`
                  : "Not scheduled today"}
              </p>
            </div>
          </div>
        )}

        {/* Clock Card */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-xl p-3.5 mb-3 border",
            clockStatus === "clocked-in"
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-card border-border/40"
          )}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", clockStatus === "clocked-in" ? "bg-emerald-500/15" : "bg-muted/60")}>
              <Clock className={cn("w-4 h-4", clockStatus === "clocked-in" ? "text-emerald-500" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[13px] leading-tight">
                {clockStatus === "clocked-in" ? "Currently Working" : "Not Clocked In"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {clockStatus === "clocked-in"
                  ? `Since ${clockInTime?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Scan QR code to clock in"}
              </p>
            </div>
            {clockStatus === "clocked-in" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>

          <div className="text-center mb-3">
            <p className="text-2xl font-mono font-bold tracking-wider">{formatElapsed()}</p>
            {onBreak ? (
              <p className="text-[11px] text-amber-500 font-semibold">On break · {formatBreakElapsed()}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Today: {totalHoursToday.toFixed(1)}h logged{breakTotalMins > 0 ? ` · ${breakTotalMins}m break` : ""}
              </p>
            )}
          </div>

          {/* Today's goal progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10.5px] font-medium text-muted-foreground">Daily goal</span>
              </div>
              <span className="text-[10.5px] text-muted-foreground">
                {Math.min(totalHoursToday, DAILY_HOURS_TARGET).toFixed(1)} / {DAILY_HOURS_TARGET}h
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  totalHoursToday >= DAILY_HOURS_TARGET ? "bg-emerald-500" : "bg-primary"
                )}
                style={{
                  width: `${Math.min(100, (totalHoursToday / DAILY_HOURS_TARGET) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* QR-based Clock In/Out buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5 touch-manipulation active:scale-[0.97] transition-all",
                clockStatus === "clocked-in"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-emerald-500 text-white"
              )}
            >
              <ScanLine className="w-3.5 h-3.5" />
              {clockStatus === "clocked-in" ? "Scan to Clock Out" : "Scan QR to Clock In"}
            </button>
            {clockStatus === "clocked-in" && (
              <button
                type="button"
                onClick={handleBreakToggle}
                className={cn(
                  "px-3 py-2.5 rounded-xl font-semibold text-[12px] flex items-center gap-1.5 touch-manipulation active:scale-[0.97] transition-all shrink-0",
                  onBreak ? "bg-amber-500 text-white" : "bg-muted/70 text-foreground"
                )}
              >
                <Coffee className="w-3.5 h-3.5" />
                {onBreak ? formatBreakElapsed() : "Break"}
              </button>
            )}
          </div>

          {/* Show My QR toggle */}
          {empRecord && (
            <button type="button"
              onClick={() => setShowMyQR(!showMyQR)}
              className="w-full mt-2 py-2 rounded-xl border border-border/40 text-[12px] font-medium text-muted-foreground flex items-center justify-center gap-1.5 hover:bg-muted/30 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              {showMyQR ? "Hide My QR Code" : "Show My QR Code"}
            </button>
          )}

          {/* Employee QR Display (for admin to scan) */}
          {showMyQR && empRecord && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-border/30"
            >
              <EmployeeQRDisplay
                employeeId={empRecord.id}
                storeId={empRecord.store_id}
                employeeName={empRecord.name}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Quick stats strip */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button type="button"
            onClick={() => navigate("/personal/my-applications")}
            className="rounded-xl border border-border/40 bg-card p-2.5 text-left active:bg-muted/40 transition-colors"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Applied</p>
            <p className="text-lg font-bold leading-tight">{stats?.applications ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground">jobs</p>
          </button>
          <button type="button"
            onClick={() => navigate("/personal/employer")}
            className="rounded-xl border border-border/40 bg-card p-2.5 text-left active:bg-muted/40 transition-colors"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Posted</p>
            <p className="text-lg font-bold leading-tight">{stats?.postedJobs ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground">openings</p>
          </button>
          <button type="button"
            onClick={() => navigate("/personal/timesheet")}
            className="rounded-xl border border-border/40 bg-card p-2.5 text-left active:bg-muted/40 transition-colors"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Today</p>
            <p className="text-lg font-bold leading-tight">{totalHoursToday.toFixed(1)}h</p>
            <p className="text-[10px] text-muted-foreground">worked</p>
          </button>
        </div>

        {/* Shift Countdown Metric Card */}
        {upcomingShift && (() => {
          const meta = SHIFT_META[upcomingShift.shiftType] || SHIFT_META.full;
          const ShiftIcon = meta.icon;
          const whenLabel = upcomingShift.isToday ? "Today" : upcomingShift.daysAway === 1 ? "Tomorrow" : format(upcomingShift.date, "EEE, MMM d");

          // Compute hours until shift start
          const shiftDate = new Date(upcomingShift.date);
          const [sh, sm] = (upcomingShift.shiftStart || "09:00").split(":").map(Number);
          shiftDate.setHours(sh, sm, 0, 0);
          const diffMs = shiftDate.getTime() - Date.now();
          const diffH = Math.floor(diffMs / 3600000);
          const diffMin = Math.floor((diffMs % 3600000) / 60000);
          const countdownStr = upcomingShift.isToday && clockStatus === "clocked-out"
            ? (diffMs <= 0 ? "Starting now" : diffH > 0 ? `${diffH}h ${diffMin}m` : `${diffMin}m`)
            : null;

          const weeklyHrs = weekSummary?.hours ?? 0;
          const weeklyTarget = (weekSummary?.shifts ?? 0) * DAILY_HOURS_TARGET;
          const weeklyPct = weeklyTarget > 0 ? Math.min(100, (weeklyHrs / weeklyTarget) * 100) : 0;

          return (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 rounded-xl border border-border/40 bg-card p-3.5 shadow-sm"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", meta.bg)}>
                  <ShiftIcon className={cn("w-5 h-5", meta.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
                    Next Shift · {whenLabel}
                  </p>
                  <p className="font-bold text-[13px] leading-tight truncate">
                    {meta.label} · {upcomingShift.shiftStart}–{upcomingShift.shiftEnd}
                  </p>
                  {countdownStr && (
                    <p className={cn("text-[11px] font-semibold mt-0.5", meta.color)}>
                      Starts in {countdownStr}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/personal/schedule")}
                  className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg px-2 py-1 touch-manipulation active:scale-95 transition-all"
                >
                  Schedule
                </button>
              </div>

              {/* Weekly hours progress */}
              {weekSummary && weekSummary.shifts > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" /> This week
                    </span>
                    <span className="text-[10px] font-bold text-foreground">
                      {weeklyHrs.toFixed(1)} / {weeklyTarget.toFixed(0)}h
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${weeklyPct}%` }}
                    />
                  </div>
                  {weekSummary.earnings > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Est. earnings: <span className="font-semibold text-emerald-500">${weekSummary.earnings.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Quick clock-in button when shift is today and user is clocked out */}
              {upcomingShift.isToday && clockStatus === "clocked-out" && (
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="mt-2.5 w-full py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center gap-1.5 touch-manipulation active:scale-[0.98] transition-all"
                >
                  <QrCode className="w-3.5 h-3.5" /> Clock In Now
                </button>
              )}
            </motion.div>
          );
        })()}

        {/* Shift Calendar */}
        {scheduleData && empRecord && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 rounded-xl border border-border/40 bg-card p-3.5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <p className="text-[12px] font-semibold">My Schedule</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center touch-manipulation active:scale-90 transition-transform"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <span className="text-[11px] font-semibold text-muted-foreground min-w-[68px] text-center">
                  {format(calendarMonth, "MMM yyyy")}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center touch-manipulation active:scale-90 transition-transform"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
                <div key={d} className="text-center text-[9px] font-bold text-muted-foreground/50">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateStr = format(day, "yyyy-MM-dd");
                const isDayOff = scheduleData.daysOff.some(
                  (d) => d.employeeId === empRecord.id && d.date === dateStr
                );
                const dow = (day.getDay() + 6) % 7;
                const hasShift = !isDayOff && scheduleData.assignments.some(
                  (a) =>
                    a.employeeId === empRecord.id &&
                    a.workDays.includes(dow) &&
                    (isAfter(day, new Date(a.startDate)) || isEqual(day, new Date(a.startDate))) &&
                    (isAfter(new Date(a.endDate), day) || isEqual(new Date(a.endDate), day))
                );
                const isClockedIn = clockedDays?.includes(dateStr);
                const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col items-center justify-center py-0.5 rounded text-[10px] font-medium",
                      isToday && "ring-1 ring-primary ring-offset-1",
                      isDayOff && "text-orange-500",
                      hasShift && isClockedIn && "text-emerald-600 dark:text-emerald-400",
                      hasShift && !isClockedIn && "text-primary",
                      !hasShift && !isDayOff && "text-foreground/35"
                    )}
                  >
                    <span>{day.getDate()}</span>
                    {(hasShift || isDayOff) && (
                      <span
                        className={cn(
                          "w-1 h-1 rounded-full",
                          isDayOff && "bg-orange-400",
                          hasShift && isClockedIn && "bg-emerald-500",
                          hasShift && !isClockedIn && "bg-primary/60"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-border/20">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[9px] text-muted-foreground">Clocked in</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                <span className="text-[9px] text-muted-foreground">Scheduled</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                <span className="text-[9px] text-muted-foreground">Day off</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Week summary */}
        {weekSummary && weekSummary.shifts > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate("/personal/schedule")}
            className="w-full text-left rounded-xl p-3 mb-3 border border-border/40 bg-card active:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">This Week</p>
              <span className="text-[10px] text-muted-foreground">tap to view</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Shifts</p>
                <p className="text-base font-bold">{weekSummary.shifts}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Hours</p>
                <p className="text-base font-bold">{weekSummary.hours.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <DollarSign className="w-2.5 h-2.5" /> Est.
                </p>
                <p className="text-base font-bold">
                  {weekSummary.rate > 0 ? `$${weekSummary.earnings.toFixed(0)}` : "—"}
                </p>
              </div>
            </div>
          </motion.button>
        )}

        {/* This Month earnings */}
        {monthlyTotals && monthlyTotals.hours > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate("/personal/pay-stubs")}
            className="w-full text-left rounded-xl p-3 mb-3 border border-border/40 bg-gradient-to-br from-emerald-500/10 to-transparent active:bg-emerald-500/15 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">This Month</p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(), "MMM yyyy")}
              </span>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Hours worked</p>
                <p className="text-lg font-bold leading-tight">{monthlyTotals.hours.toFixed(1)}h</p>
              </div>
              <div className="border-l border-border/40 pl-3">
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <DollarSign className="w-2.5 h-2.5" /> Earned
                </p>
                <p className="text-lg font-bold leading-tight text-emerald-600 dark:text-emerald-400">
                  {monthlyTotals.rate > 0 ? `$${monthlyTotals.earnings.toFixed(0)}` : "—"}
                </p>
              </div>
            </div>
          </motion.button>
        )}

        {/* Weekly performance chart */}
        {weeklyHours && weeklyHours.some((w) => w.hours > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 rounded-xl border border-border/40 bg-card p-3.5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <p className="text-[12px] font-semibold">Hours per Week</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/personal/timesheet")}
                className="text-[11px] text-primary font-medium"
              >
                Full history
              </button>
            </div>
            <Suspense fallback={<div className="h-[128px] rounded-lg bg-muted/30" />}>
              <WeeklyHoursChart data={weeklyHours} weeklyTarget={DAILY_HOURS_TARGET * 5} />
            </Suspense>
          </motion.div>
        )}

        {/* Coworkers online now */}
        {coworkersOnline && coworkersOnline.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-emerald-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Online Now
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {coworkersOnline.length}
                </span>
              </div>
              <button type="button"
                onClick={() => navigate("/personal/employees")}
                className="text-[11px] text-primary font-medium"
              >
                Team
              </button>
            </div>
            <div className="rounded-xl border border-border/40 bg-card p-2.5">
              <div className="flex flex-wrap gap-2">
                {coworkersOnline.map((c: any) => {
                  const name = c.store_employees?.name || "Coworker";
                  const ini = name
                    .split(/\s+/)
                    .map((p: string) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-muted/40 border border-border/30"
                    >
                      <div className="relative">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-[9px] font-bold">
                          {ini || "?"}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-card" />
                      </div>
                      <span className="text-[11px] font-medium leading-none truncate max-w-[80px]">
                        {name.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recommended Jobs preview */}
        {recommendedJobs && recommendedJobs.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Latest Jobs
              </p>
              <button type="button"
                onClick={() => navigate("/personal/find-employee")}
                className="text-[11px] text-primary font-medium"
              >
                Browse all
              </button>
            </div>
            <div className="rounded-xl border border-border/40 bg-card overflow-hidden divide-y divide-border/30">
              {recommendedJobs.map((j: any) => (
                <button type="button"
                  key={j.id}
                  onClick={() => navigate(`/personal/jobs/${j.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {j.career_companies?.logo_url ? (
                      <img src={j.career_companies.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[12.5px] leading-tight truncate">{j.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight truncate">
                      {j.career_companies?.name || "Company"}
                      {j.location ? ` · ${j.location}` : ""}
                      {j.is_remote ? " · Remote" : ""}
                    </p>
                  </div>
                  {j.employment_type && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground shrink-0">
                      {String(j.employment_type).replaceAll("_", " ")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent applicants (employer) */}
        {recentApplicants && recentApplicants.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recent Applicants
              </p>
              <button type="button"
                onClick={() => navigate("/personal/employer")}
                className="text-[11px] text-primary font-medium"
              >
                Manage
              </button>
            </div>
            <div className="rounded-xl border border-border/40 bg-card overflow-hidden divide-y divide-border/30">
              {recentApplicants.map((a: any) => (
                <button type="button"
                  key={a.id}
                  onClick={() =>
                    a.career_jobs?.id &&
                    navigate(`/personal/employer/jobs/${a.career_jobs.id}/applicants`)
                  }
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[12.5px] leading-tight truncate">
                      New applicant
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight truncate">
                      {a.career_jobs?.title || "Your job posting"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0",
                      a.status === "shortlisted"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : a.status === "rejected"
                        ? "bg-rose-500/15 text-rose-600"
                        : a.status === "hired"
                        ? "bg-blue-500/15 text-blue-600"
                        : "bg-muted/60 text-muted-foreground"
                    )}
                  >
                    {a.status || "submitted"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sectioned menu */}
        {sections.map((section, sIdx) => (
          <div key={section.title} className={cn(sIdx > 0 && "mt-3")}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1.5">
              {section.title}
            </p>
            <div className="rounded-xl border border-border/40 bg-card overflow-hidden divide-y divide-border/30">
              {section.items.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.03 + i * 0.02 }}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-muted/30 transition-colors touch-manipulation active:bg-muted/50 text-left"
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", item.bg)}>
                    <item.icon className={cn("w-4 h-4", item.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[13px] leading-tight">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{item.description}</p>
                  </div>
                  {item.badge ? (
                    <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
        title={clockStatus === "clocked-in" ? "Scan to Clock Out" : "Scan to Clock In"}
      />

      {/* Shift summary Sheet */}
      <Sheet open={shiftSummaryOpen} onOpenChange={setShiftSummaryOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Shift Complete
            </SheetTitle>
          </SheetHeader>
          {lastShift && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total time", value: `${lastShift.grossHrs.toFixed(1)}h` },
                  { label: "Break", value: lastShift.breakMins > 0 ? `${lastShift.breakMins}m` : "—" },
                  { label: "Net hours", value: `${lastShift.netHrs.toFixed(1)}h`, highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className={cn("rounded-xl border p-3 text-center", highlight ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 bg-card")}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn("text-lg font-bold", highlight && "text-emerald-600 dark:text-emerald-400")}>{value}</p>
                  </div>
                ))}
              </div>
              {lastShift.rate > 0 && lastShift.payType === "hourly" && (
                <div className="rounded-xl border border-border/40 bg-card p-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated earnings</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    ${(lastShift.netHrs * lastShift.rate).toFixed(2)}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShiftSummaryOpen(false)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm touch-manipulation active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

export default PersonalDashboard;
