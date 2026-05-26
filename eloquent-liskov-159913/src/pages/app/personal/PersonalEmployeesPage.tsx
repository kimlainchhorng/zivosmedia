import { useState } from "react";
import { ArrowLeft, Users, Plus, X, Shield, Clock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Employee { id: string; name: string; role: string; email: string; status: "active" | "inactive"; joinDate: string; }

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: "1", name: "Sarah Johnson", role: "Driver", email: "sarah.j@zivo.app", status: "active", joinDate: "Jan 2024" },
  { id: "2", name: "Marcus Lee", role: "Admin", email: "marcus.l@zivo.app", status: "active", joinDate: "Mar 2024" },
  { id: "3", name: "Priya Patel", role: "Support", email: "priya.p@zivo.app", status: "inactive", joinDate: "Jun 2024" },
];

const ROLES = ["Driver", "Admin", "Support", "Manager", "Dispatcher"];

const EMP_KEY = "zivo_personal_employees";

export default function PersonalEmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try { return JSON.parse(localStorage.getItem(EMP_KEY) || "null") ?? DEFAULT_EMPLOYEES; } catch { return DEFAULT_EMPLOYEES; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Driver");
  const [newEmail, setNewEmail] = useState("");

  const save = (updated: Employee[]) => { setEmployees(updated); localStorage.setItem(EMP_KEY, JSON.stringify(updated)); };

  const addEmployee = () => {
    if (!newName.trim() || !newEmail.trim()) return;
    const emp: Employee = { id: Date.now().toString(), name: newName.trim(), role: newRole, email: newEmail.trim(), status: "active", joinDate: "Mar 2026" };
    save([...employees, emp]);
    toast.success(`${emp.name} added to your team`);
    setNewName(""); setNewEmail(""); setShowAdd(false);
  };

  const toggleStatus = (id: string) => {
    const updated = employees.map(e => e.id === id ? { ...e, status: e.status === "active" ? "inactive" : "active" } as Employee : e);
    save(updated);
    const emp = updated.find(e => e.id === id)!;
    toast.success(`${emp.name} set to ${emp.status}`);
  };

  const removeEmployee = (id: string) => {
    const emp = employees.find(e => e.id === id)!;
    save(employees.filter(e => e.id !== id));
    toast.success(`${emp.name} removed`);
  };

  const active = employees.filter(e => e.status === "active").length;

  return (
    <AppLayout title="Employees" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-bold text-[17px]">Employees</h1>
          </div>
          <button type="button" aria-label="Add employee" onClick={() => setShowAdd(v => !v)} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center active:scale-90 transition-transform">
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total", value: employees.length, icon: Users, color: "text-foreground" },
            { label: "Active", value: active, icon: Shield, color: "text-emerald-500" },
            { label: "Inactive", value: employees.length - active, icon: Clock, color: "text-amber-500" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl bg-card border border-border/40 p-3 text-center">
                <Icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
                <p className={cn("text-xl font-black", s.color)}>{s.value}</p>
                <p className="text-[9px] text-muted-foreground font-bold">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-[13px] font-bold text-foreground">Add Team Member</p>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/40" autoFocus />
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email address" type="email"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/40" />
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map(r => (
                  <button type="button" key={r} onClick={() => setNewRole(r)}
                    className={cn("px-3 py-1 rounded-full text-[11px] font-bold border transition-colors",
                      newRole === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button size="sm" className="flex-1" disabled={!newName.trim() || !newEmail.trim()} onClick={addEmployee}>Add Member</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Employee list */}
        <div className="space-y-2">
          {employees.map((emp, i) => (
            <motion.div key={emp.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-card border border-border/40 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-sm font-black text-primary shrink-0">
                  {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-foreground truncate">{emp.name}</p>
                    <Badge variant="outline" className={cn("text-[9px] font-bold shrink-0", emp.status === "active" ? "text-emerald-600 border-emerald-500/30" : "text-muted-foreground")}>
                      {emp.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[9px] font-bold">{emp.role}</Badge>
                    <span className="text-[10px] text-muted-foreground truncate">{emp.email}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Since {emp.joinDate}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button type="button" aria-label="Toggle status" onClick={() => toggleStatus(emp.id)}
                    className={cn("w-8 h-5 rounded-full flex items-center px-0.5 transition-colors", emp.status === "active" ? "bg-emerald-500 justify-end" : "bg-muted justify-start")}>
                    <div className="w-4 h-4 rounded-full bg-background shadow-sm" />
                  </button>
                  <button type="button" aria-label="Remove employee" onClick={() => removeEmployee(emp.id)} className="p-1 rounded-lg hover:bg-muted/60">
                    <X className="w-3 h-3 text-muted-foreground/50" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {employees.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-[13px] font-semibold text-muted-foreground">No team members yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">Tap + to add your first team member</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
