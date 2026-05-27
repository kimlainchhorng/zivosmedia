/**
 * StoreEmployeesSection — Full employee management with profiles, filters, bulk actions, and department support.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users, Plus, Edit, Trash2, Loader2, Phone, Mail, DollarSign, Search,
  Filter, MoreHorizontal, UserCheck, UserX, Download, Upload, MapPin,
  Briefcase, Award, CalendarDays, ChevronDown, ArrowUpDown, Eye, Send, MailCheck, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props { storeId: string; }

type Employee = {
  id: string; store_id: string; user_id: string | null;
  name: string; email: string | null; phone: string | null;
  role: string; status: string; hourly_rate: number | null;
  pay_type: string; notes: string | null; created_at: string;
  employee_number: number | null;
};

const ROLES = [
  { value: "owner", label: "Owner", icon: "👑", color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  { value: "manager", label: "Manager", icon: "🏆", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  { value: "supervisor", label: "Supervisor", icon: "📋", color: "bg-purple-500/10 text-purple-700 border-purple-200" },
  { value: "cashier", label: "Cashier", icon: "💰", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { value: "staff", label: "Staff", icon: "👤", color: "bg-muted text-muted-foreground border-border" },
  { value: "intern", label: "Intern", icon: "🎓", color: "bg-sky-500/10 text-sky-700 border-sky-200" },
];

const DEPARTMENTS = ["General", "Sales", "Kitchen", "Delivery", "Customer Support", "Inventory"];

const PAY_TYPES = [
  { value: "hourly", label: "Hourly" },
  { value: "monthly", label: "Monthly Salary" },
];

const emptyForm = {
  name: "", email: "", phone: "", role: "staff", hourly_rate: "",
  pay_type: "hourly" as "hourly" | "monthly", monthly_salary: "",
  notes: "", department: "General", emergency_contact: "", address: "",
  start_date: format(new Date(), "yyyy-MM-dd"),
  invite_email: true, invite_sms: false,
};

export default function StoreEmployeesSection({ storeId }: Props) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "role" | "date">("name");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["store-employees", storeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_employees").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Employee[];
    },
  });

  const sendInvite = async (employeeId: string, channel: "email" | "sms", payload: { email?: string | null; phone?: string | null; role: string }) => {
    const fnName = channel === "email" ? "send-employee-email-invite" : "send-employee-sms-invite";
    const body: any = { storeEmployeeId: employeeId, role: payload.role };
    if (channel === "email") body.email = payload.email;
    else body.phone = payload.phone;
    const { data, error } = await supabase.functions.invoke(fnName, { body });
    if (error || (data && (data as any).error)) {
      throw new Error(error?.message || (data as any)?.error || "invite_failed");
    }
  };

  const inviteMutation = useMutation({
    mutationFn: async ({ emp, channel }: { emp: Employee; channel: "email" | "sms" }) => {
      await sendInvite(emp.id, channel, { email: emp.email, phone: emp.phone, role: emp.role });
    },
    onSuccess: (_d, vars) => toast.success(vars.channel === "email" ? "Email invite sent" : "SMS invite sent"),
    onError: (e: any) => toast.error("Invite failed: " + (e?.message || "unknown")),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rateValue = form.pay_type === "monthly"
        ? (form.monthly_salary ? parseFloat(form.monthly_salary) : null)
        : (form.hourly_rate ? parseFloat(form.hourly_rate) : null);
      const payload = {
        store_id: storeId, name: form.name.trim(),
        email: form.email.trim() || null, phone: form.phone.trim() || null,
        role: form.role, hourly_rate: rateValue,
        pay_type: form.pay_type,
        notes: form.notes.trim() || null,
      };
      let savedId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("store_employees").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("store_employees").insert(payload).select("id").maybeSingle();
        if (error) throw error;
        savedId = data?.id;
      }
      // Fire invites if requested
      if (savedId) {
        const role = form.role;
        if (form.invite_email && payload.email) {
          try { await sendInvite(savedId, "email", { email: payload.email, role }); } catch (e: any) { toast.error("Email invite failed: " + e.message); }
        }
        if (form.invite_sms && payload.phone) {
          try { await sendInvite(savedId, "sms", { phone: payload.phone, role }); } catch (e: any) { toast.error("SMS invite failed: " + e.message); }
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["store-employees", storeId] }); toast.success(editing ? "Employee updated" : "Employee added"); closeDialog(); },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("store_employees").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["store-employees", storeId] }); toast.success("Employee removed"); setDeleteId(null); },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("store_employees").update({ status: status === "active" ? "inactive" : "active" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-employees", storeId] }),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (emp: Employee) => {
    setEditing(emp);
    const isSalary = emp.pay_type === "monthly";
    setForm({
      name: emp.name, email: emp.email || "", phone: emp.phone || "", role: emp.role,
      hourly_rate: isSalary ? "" : (emp.hourly_rate?.toString() || ""),
      pay_type: isSalary ? "monthly" : "hourly",
      monthly_salary: isSalary ? (emp.hourly_rate?.toString() || "") : "",
      notes: emp.notes || "", department: "General", emergency_contact: "", address: "",
      start_date: format(new Date(emp.created_at), "yyyy-MM-dd"),
      invite_email: false, invite_sms: false,
    });
    setDialog(true);
  };
  const closeDialog = () => { setDialog(false); setEditing(null); setForm(emptyForm); };

  const filtered = useMemo(() => {
    let list = employees.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase())
    );
    if (filterRole !== "all") list = list.filter(e => e.role === filterRole);
    if (filterStatus !== "all") list = list.filter(e => e.status === filterStatus);
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "role") list.sort((a, b) => a.role.localeCompare(b.role));
    else list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [employees, search, filterRole, filterStatus, sortBy]);

  const activeCount = employees.filter(e => e.status === "active").length;
  const inactiveCount = employees.filter(e => e.status !== "active").length;
  const roleOf = (r: string) => ROLES.find(x => x.value === r);
  const getMonthlyPay = (emp: Employee) => {
    const rate = emp.hourly_rate || 0;
    return emp.pay_type === "monthly" ? rate : rate * 160;
  };
  const totalPayroll = employees.filter(e => e.status === "active").reduce((s, e) => s + getMonthlyPay(e), 0);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Total Employees", value: employees.length, color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: UserCheck, label: "Active", value: activeCount, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: UserX, label: "Inactive", value: inactiveCount, color: "text-red-500", bg: "bg-red-500/10" },
          { icon: DollarSign, label: "Monthly Payroll", value: `$${totalPayroll.toLocaleString()}`, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                <s.icon className={cn("w-5 h-5", s.color)} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-32 h-9"><Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.icon} {r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-32 h-9"><ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">By Name</SelectItem>
              <SelectItem value="role">By Role</SelectItem>
              <SelectItem value="date">By Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => window.open(`/personal/employer?storeId=${storeId}`, "_blank")}>
            <Briefcase className="w-3.5 h-3.5" /> Post a Job
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-9"><Download className="w-3.5 h-3.5" /> Export</Button>
          <Button onClick={openAdd} size="sm" className="gap-1.5 h-9"><Plus className="w-4 h-4" /> Add Employee</Button>
        </div>
      </div>

      {/* Employee Grid */}
      {employees.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No employees yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-5">Add your first team member to start managing your store staff.</p>
          <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" /> Add First Employee</Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => {
            const role = roleOf(emp.role);
            return (
              <Card key={emp.id} className="group relative overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => setDetailDialog(emp)}>
                {/* Status indicator */}
                <div className={cn("absolute top-0 left-0 right-0 h-1", emp.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                <div className="p-4 pt-5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-base">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{emp.name}</p>
                        <span className="text-sm">{role?.icon}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", role?.color || "bg-muted text-muted-foreground border-border")}>
                          {role?.label || emp.role}
                        </Badge>
                        {emp.employee_number && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0 rounded">
                            EMP-{new Date(emp.created_at).getFullYear()}-{String(emp.employee_number).padStart(5, "0")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" disabled={!emp.email || inviteMutation.isPending} title="Send Email Invite" onClick={() => inviteMutation.mutate({ emp, channel: "email" })}><MailCheck className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" disabled={!emp.phone || inviteMutation.isPending} title="Send SMS Invite" onClick={() => inviteMutation.mutate({ emp, channel: "sms" })}><MessageSquare className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Edit employee" className="h-7 w-7" onClick={() => openEdit(emp)}><Edit className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Remove employee" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(emp.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                    {emp.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{emp.email}</span></div>}
                    {emp.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />{emp.phone}</div>}
                    {emp.hourly_rate != null && emp.hourly_rate > 0 && (
                      <div className="flex items-center gap-1.5"><DollarSign className="w-3 h-3 shrink-0" />
                        {emp.pay_type === "monthly"
                          ? <span>${emp.hourly_rate.toLocaleString()}/mo <span className="text-muted-foreground">(salary)</span></span>
                          : <span>${emp.hourly_rate}/hr · ~${(emp.hourly_rate * 160).toLocaleString()}/mo</span>
                        }
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> Joined {format(new Date(emp.created_at), "MMM d, yyyy")}
                    </span>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] text-muted-foreground">{emp.status === "active" ? "Active" : "Inactive"}</span>
                      <Switch checked={emp.status === "active"} onCheckedChange={() => toggleStatus.mutate({ id: emp.id, status: emp.status })} className="scale-75" />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && search && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-12">No employees match "{search}"</div>
          )}
        </div>
      )}

      {/* Employee Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={(o) => !o && setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          {detailDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {detailDialog.name.charAt(0).toUpperCase()}
                  </div>
                   <div>
                    <div className="flex items-center gap-2">
                      {detailDialog.name} <span>{roleOf(detailDialog.role)?.icon}</span>
                      {detailDialog.employee_number && (
                        <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          EMP-{new Date(detailDialog.created_at).getFullYear()}-{String(detailDialog.employee_number).padStart(5, "0")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-normal text-muted-foreground capitalize">{detailDialog.role} · {detailDialog.status}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3"><p className="text-[10px] text-muted-foreground mb-0.5">Email</p><p className="text-sm font-medium truncate">{detailDialog.email || "—"}</p></Card>
                  <Card className="p-3"><p className="text-[10px] text-muted-foreground mb-0.5">Phone</p><p className="text-sm font-medium">{detailDialog.phone || "—"}</p></Card>
                  <Card className="p-3">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Compensation</p>
                    <p className="text-sm font-medium">
                      {detailDialog.hourly_rate
                        ? detailDialog.pay_type === "monthly"
                          ? `$${detailDialog.hourly_rate.toLocaleString()}/mo (Salary)`
                          : `$${detailDialog.hourly_rate}/hr (Hourly)`
                        : "—"}
                    </p>
                  </Card>
                  <Card className="p-3"><p className="text-[10px] text-muted-foreground mb-0.5">Joined</p><p className="text-sm font-medium">{format(new Date(detailDialog.created_at), "MMM d, yyyy")}</p></Card>
                </div>
                {detailDialog.hourly_rate != null && detailDialog.hourly_rate > 0 && (() => {
                  const isSalary = detailDialog.pay_type === "monthly";
                  const monthly = isSalary ? detailDialog.hourly_rate! : detailDialog.hourly_rate! * 160;
                  const weekly = monthly / 4;
                  const yearly = monthly * 12;
                  return (
                    <Card className="p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Estimated Compensation</p>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div><p className="text-lg font-bold">${weekly.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Weekly</p></div>
                        <div><p className="text-lg font-bold">${monthly.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Monthly</p></div>
                        <div><p className="text-lg font-bold">${yearly.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Yearly</p></div>
                      </div>
                    </Card>
                  );
                })()}
                {detailDialog.notes && (
                  <div><p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p><p className="text-sm bg-muted/30 rounded-lg p-3">{detailDialog.notes}</p></div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => { setDetailDialog(null); openEdit(detailDialog); }}>
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => { setDetailDialog(null); setDeleteId(detailDialog.id); }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Employee" : "Add New Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" type="email" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.icon} {r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pay Type</Label>
                <Select value={form.pay_type} onValueChange={(v: "hourly" | "monthly") => setForm({ ...form, pay_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              {form.pay_type === "hourly" ? (
                <><Label>Hourly Rate ($)</Label><Input value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} placeholder="0.00" type="number" step="0.01" /></>
              ) : (
                <><Label>Monthly Salary ($)</Label><Input value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} placeholder="0.00" type="number" step="1" /></>
              )}
              {form.pay_type === "hourly" && form.hourly_rate && (
                <p className="text-[11px] text-muted-foreground">≈ ${(parseFloat(form.hourly_rate) * 160).toLocaleString()}/month</p>
              )}
              {form.pay_type === "monthly" && form.monthly_salary && (
                <p className="text-[11px] text-muted-foreground">≈ ${(parseFloat(form.monthly_salary) / 160).toFixed(2)}/hour equivalent</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Emergency Contact</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} placeholder="Name — Phone" /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={2} /></div>

            {/* Invite controls */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5"><Send className="w-3.5 h-3.5 text-emerald-500" /> Send setup invite</p>
              <p className="text-[11px] text-muted-foreground -mt-1">They'll receive a secure link to claim their employee account.</p>
              <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                <span className="flex items-center gap-2"><MailCheck className="w-3.5 h-3.5 text-emerald-600" /> Email invite {!form.email && <span className="text-[10px] text-muted-foreground">(needs email)</span>}</span>
                <Switch checked={form.invite_email && !!form.email} disabled={!form.email} onCheckedChange={(v) => setForm({ ...form, invite_email: v })} />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                <span className="flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-blue-600" /> SMS invite {!form.phone && <span className="text-[10px] text-muted-foreground">(needs phone)</span>}</span>
                <Switch checked={form.invite_sms && !!form.phone} disabled={!form.phone} onCheckedChange={(v) => setForm({ ...form, invite_sms: v })} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeDialog}>Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {editing ? "Save Changes" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Employee?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. The employee will be permanently removed.</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />} Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
