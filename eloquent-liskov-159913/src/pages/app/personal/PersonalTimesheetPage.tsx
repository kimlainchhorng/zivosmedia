import { useState, useMemo } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, addWeeks, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";

const statusColor: Record<string, string> = {
  approved: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
  active: "text-blue-500 border-blue-500/30 bg-blue-500/5",
  off: "text-muted-foreground border-border/30 bg-muted/10",
};

export default function PersonalTimesheetPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  const { data: empRecord } = useQuery({
    queryKey: ["personal-emp-record", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_employees")
        .select("id, store_id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["personal-timesheet-entries", empRecord?.id, weekOffset],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_time_entries")
        .select("id, clock_in, clock_out, break_minutes")
        .eq("employee_id", empRecord!.id)
        .gte("clock_in", weekStart.toISOString())
        .lte("clock_in", weekEnd.toISOString())
        .order("clock_in", { ascending: true });
      return data ?? [];
    },
    enabled: !!empRecord?.id,
  });

  const weekData = useMemo(() => {
    const ws = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(ws, i);
      const entry = entries.find(e => isSameDay(new Date(e.clock_in), day));
      if (!entry) {
        return { day: format(day, "EEE"), date: format(day, "MMM d"), start: "—", end: "—", hours: 0, status: "off" as const };
      }
      const clockIn = new Date(entry.clock_in);
      const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
      const workedMs = clockOut
        ? clockOut.getTime() - clockIn.getTime() - (entry.break_minutes ?? 0) * 60000
        : 0;
      const hours = Math.round((workedMs / 3600000) * 4) / 4;
      return {
        day: format(day, "EEE"),
        date: format(day, "MMM d"),
        start: format(clockIn, "h:mm a"),
        end: clockOut ? format(clockOut, "h:mm a") : "In progress",
        hours,
        status: (clockOut ? "approved" : "active") as "approved" | "active",
      };
    });
  }, [entries, weekOffset]);

  const totalHours = weekData.reduce((s, d) => s + d.hours, 0);
  const workedDays = weekData.filter(d => d.hours > 0).length;
  const overtime = Math.max(0, totalHours - 40);
  const weekLabel = weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Last Week" : `${Math.abs(weekOffset)} weeks ago`;
  const weekRange = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <AppLayout title="Timesheet" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24 space-y-4">
        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px]">Timesheet</h1>
        </div>

        {/* Week nav */}
        <div className="flex items-center justify-between rounded-2xl bg-card border border-border/40 px-4 py-3">
          <button type="button" aria-label="Previous week" onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-[13px] font-bold text-foreground">{weekLabel}</p>
            <p className="text-[10px] text-muted-foreground">{weekRange}</p>
          </div>
          <button type="button" aria-label="Next week" onClick={() => setWeekOffset(w => Math.min(0, w + 1))} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors" disabled={weekOffset >= 0}>
            <ChevronRight className={cn("w-4 h-4", weekOffset >= 0 && "opacity-30")} />
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Hours", value: `${totalHours}h`, color: "text-primary" },
            { label: "Days Worked", value: `${workedDays}/5`, color: "text-foreground" },
            { label: "Overtime", value: `${overtime}h`, color: overtime > 0 ? "text-amber-500" : "text-muted-foreground" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-card border border-border/40 p-3 text-center">
              <p className={cn("text-lg font-black", s.color)}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground font-bold">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Day-by-day */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Daily Breakdown</p>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            weekData.map((d, i) => (
              <motion.div key={d.day} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className={cn("rounded-2xl bg-card border border-border/40 p-4 flex items-center gap-4", d.status === "off" && "opacity-50")}>
                <div className="w-12 text-center shrink-0">
                  <p className="text-[11px] font-bold text-muted-foreground">{d.day}</p>
                  <p className="text-[10px] text-muted-foreground">{d.date.split(" ")[1]}</p>
                </div>
                <div className="flex-1">
                  {d.status === "off" ? (
                    <p className="text-[12px] text-muted-foreground">Day off</p>
                  ) : (
                    <>
                      <p className="text-[13px] font-bold text-foreground">{d.start} – {d.end}</p>
                      <p className="text-[10px] text-muted-foreground">{d.hours}h worked</p>
                    </>
                  )}
                </div>
                <Badge variant="outline" className={cn("text-[9px] font-bold capitalize", statusColor[d.status])}>
                  {d.status}
                </Badge>
                {d.hours > 0 && (
                  <div className="w-10 text-right shrink-0">
                    <p className="text-[13px] font-black text-foreground">{d.hours}h</p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Hours bar */}
        <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-foreground">Weekly Progress</span>
            <span className="text-[11px] text-muted-foreground">{totalHours} / 40h</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (totalHours / 40) * 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {overtime > 0 ? `${overtime}h overtime this week` : `${(40 - totalHours).toFixed(1)}h remaining to 40h`}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
