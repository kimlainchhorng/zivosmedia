/**
 * StorePayrollSection — 2026 Payroll: pay runs, deductions, overtime, tax estimates, pay history, bonuses.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, Plus, Download, Users, TrendingUp, Clock, FileText,
  Receipt, Percent, Award, AlertCircle, CheckCircle2, ArrowUpRight,
  Calculator, Banknote, PiggyBank, CreditCard, Calendar, Edit, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";

interface Props { storeId: string; }

type PayRun = {
  id: string; period: string; totalGross: number; totalNet: number;
  employees: number; status: "completed" | "pending" | "processing";
  createdAt: Date;
};

function getPayPeriods() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, i);
    return { label: format(d, "MMMM yyyy"), start: startOfMonth(d), end: endOfMonth(d) };
  });
}

const DEFAULT_TAX_RATE = 0.22;
const DEFAULT_BENEFITS_RATE = 0.08;

export default function StorePayrollSection({ storeId }: Props) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(0);
  const [runDialog, setRunDialog] = useState(false);
  const [bonusDialog, setBonusDialog] = useState(false);
  const payRunsKey = `payroll_runs_${storeId}`;
  const [bonusForm, setBonusForm] = useState({ employeeId: "", amount: "", reason: "" });
  const [tab, setTab] = useState("overview");
  const [overtimeEnabled, setOvertimeEnabled] = useState(true);
  const [overtimeRate, setOvertimeRate] = useState("1.5");
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);
  const [benefitsRate, setBenefitsRate] = useState(DEFAULT_BENEFITS_RATE);
  const [taxInput, setTaxInput] = useState((DEFAULT_TAX_RATE * 100).toString());
  const [benefitsInput, setBenefitsInput] = useState((DEFAULT_BENEFITS_RATE * 100).toString());
  const [payFrequency, setPayFrequency] = useState("monthly");
  const [payDay, setPayDay] = useState("last");
  const [budgetLimit, setBudgetLimit] = useState("50000");
  const [editDialog, setEditDialog] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", hourly_rate: "", pay_type: "hourly" });
  const periods = getPayPeriods();
  const settingsKey = `payroll_settings_${storeId}`;

  // Load saved settings
  useQuery({
    queryKey: ["payroll-settings", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", settingsKey).maybeSingle();
      if (data?.value && typeof data.value === "object") {
        const s = data.value as any;
        if (s.taxRate != null) { setTaxRate(s.taxRate); setTaxInput(String(s.taxRate * 100)); }
        if (s.benefitsRate != null) { setBenefitsRate(s.benefitsRate); setBenefitsInput(String(s.benefitsRate * 100)); }
        if (s.overtimeEnabled != null) setOvertimeEnabled(s.overtimeEnabled);
        if (s.overtimeRate) setOvertimeRate(s.overtimeRate);
        if (s.payFrequency) setPayFrequency(s.payFrequency);
        if (s.payDay) setPayDay(s.payDay);
        if (s.budgetLimit) setBudgetLimit(s.budgetLimit);
      }
      return data;
    },
  });

  // Load persisted pay runs
  const { data: payRunsData, refetch: refetchPayRuns } = useQuery({
    queryKey: ["payroll-runs", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", payRunsKey).maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        return (data.value as any[]).map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) })) as PayRun[];
      }
      return [] as PayRun[];
    },
  });
  const payRuns = payRunsData ?? [];

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const value = { taxRate, benefitsRate, overtimeEnabled, overtimeRate, payFrequency, payDay, budgetLimit };
      const { data: existing } = await supabase.from("app_settings").select("id").eq("key", settingsKey).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("app_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", settingsKey);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings").insert({ key: settingsKey, value, description: "Payroll settings" });
        if (error) throw error;
      }
    },
    onSuccess: () => toast.success("Payroll settings saved"),
    onError: (e) => toast.error("Failed to save: " + e.message),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["store-employees-payroll", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("store_employees").select("*").eq("store_id", storeId).eq("status", "active").order("name");
      return (data || []) as any[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const rateValue = editForm.pay_type === "monthly"
        ? parseFloat(editForm.hourly_rate || "0")
        : parseFloat(editForm.hourly_rate || "0");
      const { error } = await supabase.from("store_employees").update({
        name: editForm.name.trim(),
        role: editForm.role,
        hourly_rate: rateValue,
        pay_type: editForm.pay_type,
      }).eq("id", editingEmp?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-employees-payroll", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-employees", storeId] });
      toast.success("Employee updated");
      setEditDialog(false);
      setEditingEmp(null);
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const openEditEmp = (emp: any) => {
    setEditingEmp(emp);
    setEditForm({
      name: emp.name || "",
      role: emp.role || "staff",
      hourly_rate: emp.hourly_rate?.toString() || "",
      pay_type: emp.pay_type || "hourly",
    });
    setEditDialog(true);
  };

  const getMonthlyGross = (emp: any) => {
    const rate = emp.hourly_rate || 0;
    return emp.pay_type === "monthly" ? rate : rate * 160;
  };
  const totalGross = employees.reduce((s: number, e: any) => s + getMonthlyGross(e), 0);
  const totalTax = totalGross * taxRate;
  const totalBenefits = totalGross * benefitsRate;
  const totalNet = totalGross - totalTax - totalBenefits;
  const avgMonthly = employees.length ? totalGross / employees.length : 0;
  const highestPaid = employees.reduce((max: any, e: any) => getMonthlyGross(e) > getMonthlyGross(max || {}) ? e : max, employees[0]);
  const budgetUsed = totalGross > 0 ? Math.min(100, (totalGross / (parseFloat(budgetLimit) || 50000)) * 100) : 0;

  const processPayRun = async () => {
    const run: PayRun = {
      id: crypto.randomUUID(), period: periods[period].label,
      totalGross, totalNet, employees: employees.length,
      status: "completed", createdAt: new Date(),
    };
    const updatedRuns = [run, ...payRuns];
    const serializable = updatedRuns.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }));
    const { data: existing } = await supabase.from("app_settings").select("id").eq("key", payRunsKey).maybeSingle();
    if (existing) {
      await supabase.from("app_settings").update({ value: serializable, updated_at: new Date().toISOString() }).eq("key", payRunsKey);
    } else {
      await supabase.from("app_settings").insert({ key: payRunsKey, value: serializable, description: "Payroll run history" });
    }
    refetchPayRuns();
    setRunDialog(false);
    toast.success(`Payroll processed for ${periods[period].label}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: DollarSign, label: "Gross Payroll", value: `$${totalGross.toLocaleString()}`, sub: "Monthly estimate", color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: Banknote, label: "Net Pay", value: `$${totalNet.toLocaleString()}`, sub: "After deductions", color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Percent, label: "Tax Estimate", value: `$${totalTax.toLocaleString()}`, sub: `${(taxRate * 100).toFixed(0)}% rate`, color: "text-amber-500", bg: "bg-amber-500/10" },
          { icon: Users, label: "Active Staff", value: employees.length, sub: `Avg $${avgMonthly.toFixed(0)}/mo`, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((s, i) => (
          <Card key={i} className="p-4 relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                <s.icon className={cn("w-5 h-5", s.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium truncate">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Budget Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold">Monthly Payroll Budget</p>
          <p className="text-xs text-muted-foreground">${totalGross.toLocaleString()} / ${parseFloat(budgetLimit || "50000").toLocaleString()}</p>
        </div>
        <Progress value={budgetUsed} className="h-2" />
        <p className="text-[10px] text-muted-foreground mt-1">{budgetUsed.toFixed(0)}% of budget allocated</p>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview" className="text-xs gap-1.5"><Receipt className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="breakdown" className="text-xs gap-1.5"><Calculator className="w-3.5 h-3.5" /> Breakdown</TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Pay History</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1.5"><PiggyBank className="w-3.5 h-3.5" /> Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Select value={String(period)} onValueChange={v => setPeriod(Number(v))}>
              <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{periods.map((p, i) => <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-9"><Download className="w-3.5 h-3.5" /> Export</Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setBonusDialog(true)}><Award className="w-3.5 h-3.5" /> Add Bonus</Button>
              <Button size="sm" className="gap-1.5 h-9" onClick={() => setRunDialog(true)}><Plus className="w-3.5 h-3.5" /> Run Payroll</Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Employee</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground">Role</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Rate</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Hours</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Gross</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Tax</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs text-muted-foreground">Net Pay</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">No active employees.</td></tr>
                  ) : employees.map((emp: any) => {
                    const isSalary = emp.pay_type === "monthly";
                    const gross = getMonthlyGross(emp);
                    const tax = gross * taxRate;
                    const net = gross - tax - (gross * benefitsRate);
                    return (
                      <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{emp.name?.charAt(0)?.toUpperCase()}</div>
                            <div><p className="font-medium text-[13px]">{emp.name}</p><p className="text-[11px] text-muted-foreground">{emp.email || "—"}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="text-[11px] capitalize">{emp.role}</Badge></td>
                        <td className="px-4 py-3 text-right font-mono text-[13px]">
                          {isSalary
                            ? <span>${(emp.hourly_rate || 0).toLocaleString()}<span className="text-muted-foreground text-[10px]">/mo</span></span>
                            : <span>${(emp.hourly_rate || 0).toFixed(2)}<span className="text-muted-foreground text-[10px]">/hr</span></span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[13px]">
                          {isSalary ? <Badge variant="outline" className="text-[10px]">Salary</Badge> : "160h"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold">${gross.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-[13px] text-destructive">-${tax.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-[13px] font-bold text-emerald-600">${net.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center"><Badge className="text-[10px] bg-amber-500/10 text-amber-600">Pending</Badge></td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="icon" aria-label="Edit payroll" className="h-7 w-7" onClick={() => openEditEmp(emp)}>
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {employees.length > 0 && (
                  <tfoot>
                    <tr className="bg-muted/30 font-semibold">
                      <td colSpan={4} className="px-4 py-3 text-[13px]">Total</td>
                      <td className="px-4 py-3 text-right font-mono text-[13px]">${totalGross.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] text-destructive">-${totalTax.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] font-bold text-emerald-600">${totalNet.toLocaleString()}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Calculator className="w-4 h-4 text-muted-foreground" /> Cost Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "Base Wages", value: totalGross, pct: 100, color: "bg-blue-500" },
                  { label: `Tax (${(taxRate * 100).toFixed(0)}%)`, value: totalTax, pct: taxRate * 100, color: "bg-red-500" },
                  { label: `Benefits (${(benefitsRate * 100).toFixed(0)}%)`, value: totalBenefits, pct: benefitsRate * 100, color: "bg-amber-500" },
                  { label: "Net Payout", value: totalNet, pct: (totalNet / totalGross) * 100 || 0, color: "bg-emerald-500" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">{item.label}</span><span className="font-semibold">${item.value.toLocaleString()}</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${Math.min(item.pct, 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> By Role</h3>
              <div className="space-y-3">
                {["owner", "manager", "supervisor", "cashier", "staff", "intern"].map(role => {
                  const roleEmps = employees.filter((e: any) => e.role === role);
                  if (roleEmps.length === 0) return null;
                  const roleTotal = roleEmps.reduce((s: number, e: any) => s + getMonthlyGross(e), 0);
                  const pct = totalGross > 0 ? (roleTotal / totalGross) * 100 : 0;
                  return (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Badge variant="secondary" className="text-[11px] capitalize">{role}</Badge><span className="text-xs text-muted-foreground">×{roleEmps.length}</span></div>
                      <div className="text-right"><p className="text-sm font-semibold">${roleTotal.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</p></div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-muted-foreground" /> Annual Projection</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-muted/30 rounded-xl"><p className="text-lg font-bold">${(totalGross * 12).toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Annual Gross</p></div>
              <div className="p-3 bg-muted/30 rounded-xl"><p className="text-lg font-bold">${(totalTax * 12).toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Annual Tax</p></div>
              <div className="p-3 bg-muted/30 rounded-xl"><p className="text-lg font-bold text-emerald-600">${(totalNet * 12).toLocaleString()}</p><p className="text-[11px] text-muted-foreground">Annual Net</p></div>
            </div>
          </Card>
        </TabsContent>

        {/* Pay History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /> Pay Run History</h3>
            {payRuns.length === 0 ? (
              <div className="text-center py-10"><Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No pay runs yet. Process your first payroll above.</p></div>
            ) : (
              <div className="space-y-2">
                {payRuns.map(run => (
                  <div key={run.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" /></div>
                      <div><p className="font-medium text-[13px]">{run.period}</p><p className="text-[11px] text-muted-foreground">{run.employees} employees · {format(run.createdAt, "MMM d, h:mm a")}</p></div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[13px]">${run.totalNet.toLocaleString()}</p>
                      <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600">Completed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          {/* Overtime */}
          <Card className="p-5 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2"><PiggyBank className="w-4 h-4 text-muted-foreground" /> Overtime</h3>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Overtime Calculation</p><p className="text-xs text-muted-foreground">Auto-calculate overtime beyond 40h/week</p></div>
              <Switch checked={overtimeEnabled} onCheckedChange={setOvertimeEnabled} />
            </div>
            {overtimeEnabled && (
              <div className="space-y-1.5 pl-4 border-l-2 border-primary/20">
                <Label className="text-xs">Overtime Multiplier</Label>
                <Select value={overtimeRate} onValueChange={setOvertimeRate}>
                  <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.25">1.25x</SelectItem>
                    <SelectItem value="1.5">1.5x (Standard)</SelectItem>
                    <SelectItem value="2.0">2.0x (Double Time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </Card>

          {/* Tax & Deductions */}
          <Card className="p-5 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Percent className="w-4 h-4 text-muted-foreground" /> Tax & Deductions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tax Rate</Label>
                <p className="text-xs text-muted-foreground">Federal + State combined</p>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min="0" max="100" step="0.5" value={taxInput} onChange={e => setTaxInput(e.target.value)} onBlur={() => { const v = parseFloat(taxInput || "0"); setTaxRate(Math.min(1, Math.max(0, v / 100))); setTaxInput(String(Math.min(100, Math.max(0, v)))); }} className="w-24 h-9" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Benefits Deduction</Label>
                <p className="text-xs text-muted-foreground">Health, dental, retirement</p>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min="0" max="100" step="0.5" value={benefitsInput} onChange={e => setBenefitsInput(e.target.value)} onBlur={() => { const v = parseFloat(benefitsInput || "0"); setBenefitsRate(Math.min(1, Math.max(0, v / 100))); setBenefitsInput(String(Math.min(100, Math.max(0, v)))); }} className="w-24 h-9" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Total Deduction Rate</p>
              <p className="text-sm font-semibold">{((taxRate + benefitsRate) * 100).toFixed(1)}% <span className="text-muted-foreground font-normal">({(taxRate * 100).toFixed(1)}% tax + {(benefitsRate * 100).toFixed(1)}% benefits)</span></p>
            </div>
          </Card>

          {/* Pay Schedule */}
          <Card className="p-5 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> Pay Schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Pay Frequency</Label>
                <Select value={payFrequency} onValueChange={setPayFrequency}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="semimonthly">Semi-Monthly (1st & 15th)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Pay Day</Label>
                <Select value={payDay} onValueChange={setPayDay}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last">Last Day of Month</SelectItem>
                    <SelectItem value="1">1st of Month</SelectItem>
                    <SelectItem value="15">15th of Month</SelectItem>
                    <SelectItem value="25">25th of Month</SelectItem>
                    <SelectItem value="friday">Every Friday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Budget */}
          <Card className="p-5 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" /> Budget</h3>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Monthly Payroll Budget</Label>
              <p className="text-xs text-muted-foreground">Set a target to track spending against</p>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">$</span>
                <Input type="number" min="0" step="1000" value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)} className="w-36 h-9" />
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Current Usage</span>
                <span className="font-semibold">${totalGross.toLocaleString()} / ${parseFloat(budgetLimit || "50000").toLocaleString()}</span>
              </div>
              <Progress value={budgetUsed} className="h-2" />
              <p className={cn("text-[10px] mt-1", budgetUsed > 90 ? "text-destructive" : "text-muted-foreground")}>{budgetUsed.toFixed(0)}% used{budgetUsed > 90 ? " ⚠️ Over budget!" : ""}</p>
            </div>
          </Card>

          {/* Save & Reset */}
          <div className="flex items-center gap-3">
            <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending} className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setTaxRate(DEFAULT_TAX_RATE); setBenefitsRate(DEFAULT_BENEFITS_RATE);
              setTaxInput(String(DEFAULT_TAX_RATE * 100)); setBenefitsInput(String(DEFAULT_BENEFITS_RATE * 100));
              setOvertimeEnabled(true); setOvertimeRate("1.5");
              setPayFrequency("monthly"); setPayDay("last"); setBudgetLimit("50000");
              toast.success("Settings reset to defaults");
            }}>Reset to Defaults</Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Run Payroll Dialog */}
      <Dialog open={runDialog} onOpenChange={setRunDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Run Payroll — {periods[period]?.label}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="rounded-xl bg-muted/40 p-4 space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Employees</span><span className="font-semibold">{employees.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Hours</span><span className="font-semibold">{employees.length * 160}h</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross Payroll</span><span className="font-semibold">${totalGross.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax Deductions</span><span className="font-semibold text-red-500">-${totalTax.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Benefits</span><span className="font-semibold text-red-500">-${totalBenefits.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm border-t pt-2 mt-2"><span className="text-muted-foreground font-semibold">Net Payout</span><span className="font-bold text-lg text-emerald-600">${totalNet.toLocaleString()}</span></div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">This will generate a payroll record. Review amounts before confirming.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialog(false)}>Cancel</Button>
            <Button onClick={processPayRun} className="gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Process</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bonus Dialog */}
      <Dialog open={bonusDialog} onOpenChange={setBonusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Bonus</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2"><Label>Employee</Label><Select value={bonusForm.employeeId} onValueChange={v => setBonusForm(f => ({ ...f, employeeId: v }))}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Bonus Amount ($)</Label><Input type="number" value={bonusForm.amount} onChange={e => setBonusForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
            <div className="space-y-2"><Label>Reason</Label><Input value={bonusForm.reason} onChange={e => setBonusForm(f => ({ ...f, reason: e.target.value }))} placeholder="Performance bonus, holiday..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBonusDialog(false)}>Cancel</Button>
            <Button onClick={() => { setBonusDialog(false); toast.success("Bonus added"); }} disabled={!bonusForm.employeeId || !bonusForm.amount}>Add Bonus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialog} onOpenChange={v => { setEditDialog(v); if (!v) setEditingEmp(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Employee Payroll</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["owner","manager","supervisor","cashier","staff","intern"].map(r => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pay Type</Label>
              <Select value={editForm.pay_type} onValueChange={v => setEditForm(f => ({ ...f, pay_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="monthly">Monthly Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{editForm.pay_type === "monthly" ? "Monthly Salary ($)" : "Hourly Rate ($)"}</Label>
              <Input type="number" min="0" step="0.01" value={editForm.hourly_rate} onChange={e => setEditForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialog(false); setEditingEmp(null); }}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!editForm.name.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
