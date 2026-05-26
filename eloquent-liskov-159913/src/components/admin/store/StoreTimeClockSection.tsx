/**
 * StoreTimeClockSection — 2026 Time clock with live timer, break tracking, GPS placeholder, weekly summary, overtime alerts.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock, LogIn, LogOut, Timer, Users, Calendar, Download,
  Coffee, MapPin, AlertTriangle, TrendingUp, BarChart3,
  CheckCircle2, Pause, Play, QrCode, ScanLine, MessageSquare
} from "lucide-react";
import { StoreQRDisplay } from "@/components/clock/StoreQRDisplay";
import { QRScannerModal } from "@/components/clock/QRScannerModal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props { storeId: string; }

const CLOCK_OUT_REASONS = [
  { value: "end_of_shift", label: "End of Shift" },
  { value: "early_leave", label: "Early Leave" },
  { value: "emergency", label: "Emergency" },
  { value: "sick", label: "Feeling Sick" },
  { value: "personal", label: "Personal Reason" },
  { value: "other", label: "Other" },
];

type ClockEntry = {
  id: string; employeeId: string; employeeName: string; role: string;
  clockIn: Date; clockOut: Date | null;
  breaks: { start: Date; end: Date | null }[];
  isOnBreak: boolean;
};

export default function StoreTimeClockSection({ storeId }: Props) {
  const [localEntries, setLocalEntries] = useState<ClockEntry[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [tab, setTab] = useState("today");
  const [adminScannerOpen, setAdminScannerOpen] = useState(false);
  const [, setTick] = useState(0);
  const [clockOutTarget, setClockOutTarget] = useState<{ id: string; employeeName: string; hoursWorked: number } | null>(null);
  const [clockOutReason, setClockOutReason] = useState("end_of_shift");
  const [clockOutNote, setClockOutNote] = useState("");

  // Live timer update
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ["store-employees-timeclock", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("store_employees").select("*").eq("store_id", storeId).eq("status", "active").order("name");
      return (data || []) as any[];
    },
  });

  // Fetch real clock entries from DB
  const { data: dbEntries = [], refetch: refetchEntries } = useQuery({
    queryKey: ["store-time-entries", storeId],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("store_time_entries")
        .select("*, store_employees(name, role)")
        .eq("store_id", storeId)
        .gte("clock_in", todayStart.toISOString())
        .order("clock_in", { ascending: false });
      return (data || []).map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id,
        employeeName: row.store_employees?.name || "Unknown",
        role: row.store_employees?.role || "staff",
        clockIn: new Date(row.clock_in),
        clockOut: row.clock_out ? new Date(row.clock_out) : null,
        breaks: [],
        isOnBreak: false,
      } as ClockEntry));
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Merge DB entries with any local-only entries
  const entries = [
    ...dbEntries,
    ...localEntries.filter(le => !dbEntries.some(de => de.employeeId === le.employeeId && !de.clockOut)),
  ];

  const clockedIn = entries.filter(e => !e.clockOut);
  const onBreak = clockedIn.filter(e => e.isOnBreak);
  const todayEntries = entries.filter(e => format(e.clockIn, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"));

  const handleClockIn = () => {
    if (!selectedEmployee) return;
    const emp = employees.find((e: any) => e.id === selectedEmployee);
    if (!emp) return;
    setLocalEntries(prev => [...prev, { id: crypto.randomUUID(), employeeId: emp.id, employeeName: emp.name, role: emp.role, clockIn: new Date(), clockOut: null, breaks: [], isOnBreak: false }]);
    setSelectedEmployee("");
    refetchEntries();
  };

  const handleClockOut = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const hours = getHoursWorked(entry);
    setClockOutTarget({ id, employeeName: entry.employeeName, hoursWorked: hours });
    setClockOutReason(hours >= 8 ? "end_of_shift" : "early_leave");
    setClockOutNote("");
  };

  const confirmClockOut = async () => {
    if (!clockOutTarget) return;
    const reason = clockOutReason === "other" ? clockOutNote : CLOCK_OUT_REASONS.find(r => r.value === clockOutReason)?.label || clockOutReason;
    // Update DB directly
    await supabase
      .from("store_time_entries")
      .update({ clock_out: new Date().toISOString(), clock_out_reason: reason } as any)
      .eq("id", clockOutTarget.id);
    setLocalEntries(prev => prev.map(e => e.id === clockOutTarget.id ? { ...e, clockOut: new Date(), isOnBreak: false, breaks: e.breaks.map(b => b.end ? b : { ...b, end: new Date() }) } : e));
    toast.success("Clocked Out", { description: `${clockOutTarget.employeeName} — ${reason}` });
    setClockOutTarget(null);
    refetchEntries();
  };

  const toggleBreak = (id: string) => {
    setLocalEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      if (e.isOnBreak) {
        return { ...e, isOnBreak: false, breaks: e.breaks.map(b => b.end ? b : { ...b, end: new Date() }) };
      } else {
        return { ...e, isOnBreak: true, breaks: [...e.breaks, { start: new Date(), end: null }] };
      }
    }));
  };

  const getHoursWorked = (entry: ClockEntry): number => {
    const end = entry.clockOut || new Date();
    const totalMs = end.getTime() - entry.clockIn.getTime();
    const breakMs = entry.breaks.reduce((s, b) => s + ((b.end || new Date()).getTime() - b.start.getTime()), 0);
    return Math.max(0, (totalMs - breakMs) / 3600000);
  };

  const getBreakMinutes = (entry: ClockEntry): number => {
    return entry.breaks.reduce((s, b) => s + ((b.end || new Date()).getTime() - b.start.getTime()), 0) / 60000;
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const totalHoursToday = todayEntries.reduce((s, e) => s + getHoursWorked(e), 0);
  const completedToday = todayEntries.filter(e => e.clockOut).length;

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: Users, label: "Clocked In", value: clockedIn.length, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: Coffee, label: "On Break", value: onBreak.length, color: "text-amber-500", bg: "bg-amber-500/10" },
          { icon: CheckCircle2, label: "Completed", value: completedToday, color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Timer, label: "Hours Today", value: formatDuration(totalHoursToday), color: "text-purple-500", bg: "bg-purple-500/10" },
          { icon: TrendingUp, label: "Active Staff", value: employees.length, color: "text-sky-500", bg: "bg-sky-500/10" },
        ].map((s, i) => (
          <Card key={i} className="p-3.5">
            <div className="flex items-center gap-2.5">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.bg)}><s.icon className={cn("w-4.5 h-4.5", s.color)} /></div>
              <div><p className="text-[10px] text-muted-foreground font-medium">{s.label}</p><p className="text-base font-bold">{s.value}</p></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Clock-In */}
      <Card className="p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><LogIn className="w-4 h-4 text-emerald-500" /> Quick Clock In</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Select Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger><SelectValue placeholder="Choose employee..." /></SelectTrigger>
              <SelectContent>
                {employees.filter((e: any) => !clockedIn.some(c => c.employeeId === e.id)).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="flex items-center gap-2">{e.name} <Badge variant="secondary" className="text-[9px] capitalize">{e.role}</Badge></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleClockIn} disabled={!selectedEmployee} className="gap-1.5 shrink-0"><LogIn className="w-3.5 h-3.5" /> Clock In</Button>
        </div>
        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
          <MapPin className="w-3 h-3" /> Location tracking available · <Clock className="w-3 h-3" /> {format(new Date(), "h:mm a")}
        </div>
      </Card>

      {/* QR Code Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StoreQRDisplay storeId={storeId} />
        <Card className="p-5 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <ScanLine className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-sm mb-1">Scan Employee QR</h3>
          <p className="text-[11px] text-muted-foreground text-center mb-3">Scan an employee's personal QR code to clock them in or out</p>
          <Button onClick={() => setAdminScannerOpen(true)} className="gap-1.5">
            <QrCode className="w-3.5 h-3.5" /> Open Scanner
          </Button>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="today" className="text-xs gap-1.5"><Clock className="w-3.5 h-3.5" /> Live View</TabsTrigger>
          <TabsTrigger value="log" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Today's Log</TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs gap-1.5"><Calendar className="w-3.5 h-3.5" /> Weekly Summary</TabsTrigger>
        </TabsList>

        {/* Live View */}
        <TabsContent value="today" className="mt-4 space-y-3">
          {clockedIn.length === 0 ? (
            <Card className="p-8 text-center"><Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No one is currently clocked in.</p></Card>
          ) : (
            clockedIn.map(entry => {
              const hours = getHoursWorked(entry);
              const breakMins = getBreakMinutes(entry);
              const progress = Math.min((hours / 8) * 100, 100);
              const isOvertime = hours > 8;
              return (
                <Card key={entry.id} className={cn("p-4", entry.isOnBreak ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/20 bg-emerald-500/5")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", entry.isOnBreak ? "bg-amber-500/10" : "bg-emerald-500/10")}>
                        <span className={cn("text-sm font-bold", entry.isOnBreak ? "text-amber-600" : "text-emerald-600")}>{entry.employeeName.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[13px]">{entry.employeeName}</p>
                          <Badge variant="secondary" className="text-[9px] capitalize">{entry.role}</Badge>
                          {entry.isOnBreak && <Badge className="text-[9px] bg-amber-500/10 text-amber-600">On Break</Badge>}
                          {isOvertime && <Badge className="text-[9px] bg-red-500/10 text-red-600"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />OT</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          In: {format(entry.clockIn, "h:mm a")} · Working: {formatDuration(hours)}
                          {breakMins > 0 && ` · Breaks: ${Math.round(breakMins)}m`}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className={cn("text-[10px] font-semibold", isOvertime ? "text-red-500" : "text-muted-foreground")}>{hours.toFixed(1)}/8h</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className={cn("gap-1 h-8 text-[11px]", entry.isOnBreak ? "text-emerald-600 border-emerald-200" : "text-amber-600 border-amber-200")} onClick={() => toggleBreak(entry.id)}>
                        {entry.isOnBreak ? <><Play className="w-3 h-3" /> Resume</> : <><Pause className="w-3 h-3" /> Break</>}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 h-8 text-[11px] text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleClockOut(entry.id)}>
                        <LogOut className="w-3 h-3" /> Out
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Today's Log */}
        <TabsContent value="log" className="mt-4">
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm">Time Log — {format(new Date(), "EEEE, MMMM d")}</h3>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" /> Export</Button>
            </div>
            {todayEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No entries for today.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Employee</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Clock In</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Clock Out</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Breaks</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Hours</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                  </tr></thead>
                  <tbody>
                    {todayEntries.map(entry => {
                      const hours = getHoursWorked(entry);
                      return (
                        <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{entry.employeeName.charAt(0)}</div><span className="font-medium text-[13px]">{entry.employeeName}</span></div>
                          </td>
                          <td className="px-4 py-2.5"><Badge variant="secondary" className="text-[10px] capitalize">{entry.role}</Badge></td>
                          <td className="px-4 py-2.5 text-[13px]">{format(entry.clockIn, "h:mm a")}</td>
                          <td className="px-4 py-2.5 text-[13px]">{entry.clockOut ? format(entry.clockOut, "h:mm a") : "—"}</td>
                          <td className="px-4 py-2.5 text-right text-[13px]">{entry.breaks.length > 0 ? `${Math.round(getBreakMinutes(entry))}m` : "—"}</td>
                          <td className={cn("px-4 py-2.5 text-right font-mono text-[13px] font-semibold", hours > 8 && "text-red-500")}>{hours.toFixed(1)}h</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge className={cn("text-[10px]",
                              entry.isOnBreak ? "bg-amber-500/10 text-amber-600" :
                              entry.clockOut ? "bg-muted text-muted-foreground" :
                              "bg-emerald-500/10 text-emerald-600"
                            )}>{entry.isOnBreak ? "Break" : entry.clockOut ? "Done" : "Working"}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-semibold">
                      <td colSpan={5} className="px-4 py-2.5 text-[13px]">Total</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px]">{totalHoursToday.toFixed(1)}h</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Weekly Summary */}
        <TabsContent value="weekly" className="mt-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-muted-foreground" /> Weekly Hours Summary</h3>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No employees to show.</p>
            ) : (
              <div className="space-y-3">
                {employees.map((emp: any) => {
                  const empEntries = entries.filter(e => e.employeeId === emp.id);
                  const weekHours = empEntries.reduce((s, e) => s + getHoursWorked(e), 0);
                  const pct = Math.min((weekHours / 40) * 100, 100);
                  return (
                    <div key={emp.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">{emp.name.charAt(0)}</div>
                          <span className="text-[13px] font-medium">{emp.name}</span>
                          {weekHours > 40 && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        </div>
                        <span className={cn("text-xs font-semibold", weekHours > 40 ? "text-red-500" : "text-foreground")}>{weekHours.toFixed(1)}h / 40h</span>
                      </div>
                      <Progress value={pct} className={cn("h-2", weekHours > 40 && "[&>div]:bg-red-500")} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admin QR Scanner */}
      <QRScannerModal
        open={adminScannerOpen}
        onClose={() => setAdminScannerOpen(false)}
        onScan={async (token) => {
          try {
            const { data, error } = await supabase.functions.invoke("clock-qr", {
              body: { action: "validate", token, scanner_type: "admin_scans_employee" },
            });

            if (error) {
              const details = (error as any)?.context ? await (error as any).context.json().catch(() => null) : null;
              return {
                success: false,
                message: details?.error || details?.message || error.message || "Clock scan failed",
              };
            }

            if (data?.success) {
              toast.success(
                data.action_performed === "clock_in" ? "Employee Clocked In" : "Employee Clocked Out",
                { description: data.employee_name }
              );
              refetchEntries();
              return { success: true, message: data.employee_name || "Success", action: data.action_performed };
            }

            return { success: false, message: data?.error || "Clock scan failed" };
          } catch (err: any) {
            return { success: false, message: err?.message || "Network error" };
          }
        }}
        title="Scan Employee QR"
      />

      {/* Clock Out Reason Dialog */}
      <Dialog open={!!clockOutTarget} onOpenChange={(open) => !open && setClockOutTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <LogOut className="w-4 h-4 text-destructive" />
              Clock Out — {clockOutTarget?.employeeName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {clockOutTarget && clockOutTarget.hoursWorked < 8 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-700">
                  This employee has only worked <strong>{clockOutTarget.hoursWorked.toFixed(1)} hours</strong> (less than a full 8-hour shift).
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[13px] font-medium">Reason for clocking out</Label>
              <RadioGroup value={clockOutReason} onValueChange={setClockOutReason} className="grid gap-2">
                {CLOCK_OUT_REASONS.map(r => (
                  <Label
                    key={r.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      clockOutReason === r.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <RadioGroupItem value={r.value} />
                    <span className="text-[13px]">{r.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {(clockOutReason === "other" || clockOutReason === "early_leave" || clockOutReason === "emergency") && (
              <div className="space-y-1.5">
                <Label className="text-[12px]">Additional notes</Label>
                <Textarea
                  placeholder="Please provide more details..."
                  value={clockOutNote}
                  onChange={(e) => setClockOutNote(e.target.value)}
                  className="text-[13px] min-h-[80px] resize-none"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setClockOutTarget(null)}>Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={confirmClockOut}
              disabled={clockOutReason === "other" && !clockOutNote.trim()}
              className="gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Confirm Clock Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
