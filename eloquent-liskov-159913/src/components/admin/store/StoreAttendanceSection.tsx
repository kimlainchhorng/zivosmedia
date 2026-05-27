/**
 * StoreAttendanceSection — 2026 Attendance & Leave with calendar view, leave balances, history, and bulk attendance.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarCheck, Plus, CheckCircle2, XCircle, Clock, AlertTriangle,
  Palmtree, Thermometer, Baby, Calendar, BarChart3, TrendingUp,
  Filter, Download, History, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format, subDays, differenceInDays } from "date-fns";
import { toast } from "sonner";

interface Props { storeId: string; }

type LeaveRequest = {
  id: string; employeeId: string; employeeName: string;
  type: string; startDate: string; endDate: string;
  reason: string; status: "pending" | "approved" | "rejected";
  createdAt: Date; days: number;
};

type AttendanceRecord = {
  employeeId: string; employeeName: string;
  date: string; status: "present" | "absent" | "late" | "half-day" | "remote";
};

const LEAVE_TYPES = [
  { value: "vacation", label: "Vacation", icon: Palmtree, color: "text-emerald-500", bg: "bg-emerald-500/10", max: 20 },
  { value: "sick", label: "Sick Leave", icon: Thermometer, color: "text-red-500", bg: "bg-red-500/10", max: 10 },
  { value: "personal", label: "Personal", icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10", max: 5 },
  { value: "parental", label: "Parental", icon: Baby, color: "text-purple-500", bg: "bg-purple-500/10", max: 60 },
  { value: "bereavement", label: "Bereavement", icon: Calendar, color: "text-muted-foreground", bg: "bg-muted", max: 5 },
];

const ATTENDANCE_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  present: { label: "Present", color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  absent: { label: "Absent", color: "bg-red-500/10 text-red-600", icon: XCircle },
  late: { label: "Late", color: "bg-amber-500/10 text-amber-600", icon: Clock },
  "half-day": { label: "Half Day", color: "bg-blue-500/10 text-blue-600", icon: AlertTriangle },
  remote: { label: "Remote", color: "bg-purple-500/10 text-purple-600", icon: Eye },
};

export default function StoreAttendanceSection({ storeId }: Props) {
  const [tab, setTab] = useState("attendance");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ employeeId: "", type: "vacation", startDate: "", endDate: "", reason: "" });
  const [leaveFilter, setLeaveFilter] = useState("all");
  const [bulkMode, setBulkMode] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["store-employees-attendance", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("store_employees").select("*").eq("store_id", storeId).eq("status", "active").order("name");
      return (data || []) as any[];
    },
  });

  const submitLeave = () => {
    if (!leaveForm.employeeId || !leaveForm.startDate) return;
    const emp = employees.find((e: any) => e.id === leaveForm.employeeId);
    const end = leaveForm.endDate || leaveForm.startDate;
    const days = differenceInDays(new Date(end), new Date(leaveForm.startDate)) + 1;
    setLeaveRequests(prev => [...prev, {
      id: crypto.randomUUID(), employeeId: leaveForm.employeeId,
      employeeName: emp?.name || "", type: leaveForm.type,
      startDate: leaveForm.startDate, endDate: end,
      reason: leaveForm.reason, status: "pending",
      createdAt: new Date(), days,
    }]);
    setLeaveDialog(false);
    setLeaveForm({ employeeId: "", type: "vacation", startDate: "", endDate: "", reason: "" });
    toast.success("Leave request submitted");
  };

  const updateLeaveStatus = (id: string, status: "approved" | "rejected") => {
    setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success(`Leave ${status}`);
  };

  const markAttendance = (employeeId: string, status: string) => {
    const emp = employees.find((e: any) => e.id === employeeId);
    const today = format(new Date(), "yyyy-MM-dd");
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => !(r.employeeId === employeeId && r.date === today));
      return [...filtered, { employeeId, employeeName: emp?.name || "", date: today, status: status as any }];
    });
  };

  const markAllPresent = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const newRecords = employees.map((emp: any) => ({
      employeeId: emp.id, employeeName: emp.name, date: today, status: "present" as const,
    }));
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => r.date !== today);
      return [...filtered, ...newRecords];
    });
    toast.success("All employees marked present");
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const pendingCount = leaveRequests.filter(r => r.status === "pending").length;
  const presentToday = attendanceRecords.filter(r => r.date === todayStr && r.status === "present").length;
  const lateToday = attendanceRecords.filter(r => r.date === todayStr && r.status === "late").length;
  const absentToday = attendanceRecords.filter(r => r.date === todayStr && r.status === "absent").length;
  const remoteToday = attendanceRecords.filter(r => r.date === todayStr && r.status === "remote").length;
  const markedToday = attendanceRecords.filter(r => r.date === todayStr).length;
  const attendanceRate = employees.length > 0 ? ((presentToday + remoteToday + lateToday) / employees.length) * 100 : 0;

  const filteredLeaves = leaveFilter === "all" ? leaveRequests : leaveRequests.filter(r => r.status === leaveFilter);

  // Leave balances per employee (mock)
  const getLeaveBalance = (employeeId: string, type: string) => {
    const used = leaveRequests.filter(r => r.employeeId === employeeId && r.type === type && r.status === "approved").reduce((s, r) => s + r.days, 0);
    const max = LEAVE_TYPES.find(t => t.value === type)?.max || 0;
    return { used, max, remaining: max - used };
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: CheckCircle2, label: "Present", value: presentToday, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: Clock, label: "Late", value: lateToday, color: "text-amber-500", bg: "bg-amber-500/10" },
          { icon: XCircle, label: "Absent", value: absentToday, color: "text-red-500", bg: "bg-red-500/10" },
          { icon: Eye, label: "Remote", value: remoteToday, color: "text-purple-500", bg: "bg-purple-500/10" },
          { icon: CalendarCheck, label: "Pending Leaves", value: pendingCount, color: "text-sky-500", bg: "bg-sky-500/10" },
        ].map((s, i) => (
          <Card key={i} className="p-3.5">
            <div className="flex items-center gap-2.5">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.bg)}><s.icon className={cn("w-4.5 h-4.5", s.color)} /></div>
              <div><p className="text-[10px] text-muted-foreground font-medium">{s.label}</p><p className="text-base font-bold">{s.value}</p></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Attendance Rate */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-muted-foreground" /><p className="text-xs font-semibold">Today's Attendance Rate</p></div>
          <p className="text-sm font-bold">{attendanceRate.toFixed(0)}%</p>
        </div>
        <Progress value={attendanceRate} className="h-2.5" />
        <p className="text-[10px] text-muted-foreground mt-1">{markedToday} of {employees.length} marked · {format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="attendance" className="gap-1.5 text-xs"><CalendarCheck className="w-3.5 h-3.5" /> Daily Attendance</TabsTrigger>
          <TabsTrigger value="leave" className="gap-1.5 text-xs">
            <Palmtree className="w-3.5 h-3.5" /> Leave Requests
            {pendingCount > 0 && <Badge className="ml-1 text-[9px] h-4 px-1.5 bg-amber-500 text-white">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="balances" className="gap-1.5 text-xs"><TrendingUp className="w-3.5 h-3.5" /> Leave Balances</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs"><History className="w-3.5 h-3.5" /> History</TabsTrigger>
        </TabsList>

        {/* Daily Attendance */}
        <TabsContent value="attendance" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{format(new Date(), "EEEE, MMMM d")}</h3>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={markAllPresent}>
              <CheckCircle2 className="w-3 h-3" /> Mark All Present
            </Button>
          </div>
          <Card className="overflow-hidden">
            {employees.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No employees yet.</div>
            ) : (
              <div className="divide-y">
                {employees.map((emp: any) => {
                  const record = attendanceRecords.find(r => r.employeeId === emp.id && r.date === todayStr);
                  return (
                    <div key={emp.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{emp.name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                          <p className="font-medium text-[13px]">{emp.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{emp.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Object.entries(ATTENDANCE_STATUS).map(([key, s]) => {
                          const isActive = record?.status === key;
                          return (
                            <button type="button" key={key} onClick={() => markAttendance(emp.id, key)}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all",
                                isActive ? s.color + " border-current shadow-sm" : "bg-muted/20 text-muted-foreground border-transparent hover:bg-muted"
                              )}>
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Leave Requests */}
        <TabsContent value="leave" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Select value={leaveFilter} onValueChange={setLeaveFilter}>
              <SelectTrigger className="w-36 h-8"><Filter className="w-3 h-3 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1.5 h-8" onClick={() => setLeaveDialog(true)}><Plus className="w-3.5 h-3.5" /> New Request</Button>
          </div>

          {filteredLeaves.length === 0 ? (
            <Card className="p-10 text-center"><Palmtree className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No leave requests{leaveFilter !== "all" ? ` with status "${leaveFilter}"` : ""}.</p></Card>
          ) : (
            <div className="space-y-2">
              {filteredLeaves.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(req => {
                const leaveType = LEAVE_TYPES.find(t => t.value === req.type);
                const Icon = leaveType?.icon || Calendar;
                return (
                  <Card key={req.id} className="p-4 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", leaveType?.bg || "bg-muted")}>
                          <Icon className={cn("w-5 h-5", leaveType?.color || "text-muted-foreground")} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[13px]">{req.employeeName}</p>
                            <Badge variant="secondary" className="text-[10px] capitalize">{req.type}</Badge>
                            <Badge variant="outline" className="text-[10px]">{req.days} day{req.days > 1 ? "s" : ""}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {req.startDate}{req.endDate !== req.startDate ? ` → ${req.endDate}` : ""}
                          </p>
                          {req.reason && <p className="text-[11px] text-muted-foreground mt-0.5 italic truncate max-w-xs">"{req.reason}"</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">Submitted {format(req.createdAt, "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {req.status === "pending" ? (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-[11px] text-red-500 border-red-200" onClick={() => updateLeaveStatus(req.id, "rejected")}>Reject</Button>
                            <Button size="sm" className="h-7 text-[11px]" onClick={() => updateLeaveStatus(req.id, "approved")}>Approve</Button>
                          </>
                        ) : (
                          <Badge className={cn("text-[10px]", req.status === "approved" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
                            {req.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Leave Balances */}
        <TabsContent value="balances" className="mt-4">
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b"><h3 className="font-semibold text-sm">Leave Balances — {new Date().getFullYear()}</h3></div>
            {employees.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No employees.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Employee</th>
                      {LEAVE_TYPES.slice(0, 4).map(t => (
                        <th key={t.value} className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">{t.label}</th>
                      ))}
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Total Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp: any) => {
                      const totalUsed = LEAVE_TYPES.slice(0, 4).reduce((s, t) => s + getLeaveBalance(emp.id, t.value).used, 0);
                      return (
                        <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{emp.name.charAt(0)}</div><span className="font-medium text-[13px]">{emp.name}</span></div>
                          </td>
                          {LEAVE_TYPES.slice(0, 4).map(t => {
                            const bal = getLeaveBalance(emp.id, t.value);
                            const pct = (bal.used / bal.max) * 100;
                            return (
                              <td key={t.value} className="px-3 py-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[12px] font-semibold">{bal.remaining}/{bal.max}</span>
                                  <Progress value={pct} className="h-1.5 w-16" />
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-3 py-3 text-center"><span className="text-[12px] font-bold">{totalUsed} days</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2"><History className="w-4 h-4 text-muted-foreground" /> Recent Attendance History</h3>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs"><Download className="w-3.5 h-3.5" /> Export</Button>
            </div>
            {attendanceRecords.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No attendance records yet. Mark attendance above to see history.</div>
            ) : (
              <div className="space-y-2">
                {[...attendanceRecords].reverse().slice(0, 20).map((rec, i) => {
                  const statusInfo = ATTENDANCE_STATUS[rec.status];
                  const StatusIcon = statusInfo?.icon || CheckCircle2;
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <StatusIcon className={cn("w-4 h-4", statusInfo?.color.split(" ")[1])} />
                        <span className="text-[13px] font-medium">{rec.employeeName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">{rec.date}</span>
                        <Badge className={cn("text-[10px]", statusInfo?.color)}>{statusInfo?.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2"><Label>Employee</Label><Select value={leaveForm.employeeId} onValueChange={v => setLeaveForm(f => ({ ...f, employeeId: v }))}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {LEAVE_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button type="button" key={t.value} onClick={() => setLeaveForm(f => ({ ...f, type: t.value }))}
                      className={cn("flex items-center gap-2 p-2.5 rounded-xl border text-left text-[12px] font-medium transition-all",
                        leaveForm.type === t.value ? t.bg + " " + t.color + " border-current shadow-sm" : "bg-muted/20 text-muted-foreground border-transparent hover:bg-muted")}>
                      <Icon className="w-4 h-4 shrink-0" />{t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            {leaveForm.startDate && (
              <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                Duration: <span className="font-semibold text-foreground">{differenceInDays(new Date(leaveForm.endDate || leaveForm.startDate), new Date(leaveForm.startDate)) + 1} day(s)</span>
              </div>
            )}
            <div className="space-y-2"><Label>Reason (optional)</Label><Textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Brief reason..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialog(false)}>Cancel</Button>
            <Button onClick={submitLeave} disabled={!leaveForm.employeeId || !leaveForm.startDate}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
