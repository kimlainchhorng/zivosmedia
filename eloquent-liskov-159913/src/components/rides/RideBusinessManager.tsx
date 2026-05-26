/**
 * RideBusinessManager — Corporate ride policies, expense tagging, team rides, business receipts
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Receipt, Users, FileText, DollarSign, Tag, CheckCircle, Clock, AlertTriangle, ChevronRight, Download, Filter, Briefcase, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "overview" | "expenses" | "team" | "policy";

const businessProfile = {
  company: "Acme Corp",
  department: "Engineering",
  monthlyBudget: 500,
  monthlySpent: 287.50,
  pendingApprovals: 2,
  totalRides: 18,
};

const recentExpenses = [
  { id: "1", route: "Office → Airport", amount: 42.50, date: "Today", status: "approved", tag: "Client Meeting", receipt: true },
  { id: "2", route: "Airport → Hotel", amount: 28.00, date: "Yesterday", status: "pending", tag: "Conference", receipt: true },
  { id: "3", route: "Hotel → Convention Center", amount: 15.50, date: "Yesterday", status: "approved", tag: "Conference", receipt: true },
  { id: "4", route: "Office → Restaurant", amount: 22.00, date: "Mar 3", status: "rejected", tag: "Personal", receipt: false },
];

const teamMembers = [
  { name: "You", role: "Manager", rides: 18, spent: 287.50, status: "active" },
  { name: "Alex Chen", role: "Engineer", rides: 12, spent: 195.00, status: "active" },
  { name: "Sarah Kim", role: "Designer", rides: 8, spent: 142.00, status: "active" },
  { name: "Mike R.", role: "PM", rides: 5, spent: 89.00, status: "limit-warning" },
];

export default function RideBusinessManager() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [expenseTag, setExpenseTag] = useState("");

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Building2 },
    { id: "expenses" as const, label: "Expenses", icon: Receipt },
    { id: "team" as const, label: "Team", icon: Users },
    { id: "policy" as const, label: "Policy", icon: Shield },
  ];

  const budgetPercent = (businessProfile.monthlySpent / businessProfile.monthlyBudget) * 100;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Company card */}
              <div className="rounded-2xl to-primary/5 border border-border p-5 bg-secondary">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="w-4 h-4 text-foreground" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{businessProfile.company}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{businessProfile.department} · Business Account</p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">Monthly budget</span>
                    <span className="font-bold text-foreground">${businessProfile.monthlySpent} / ${businessProfile.monthlyBudget}</span>
                  </div>
                  <Progress value={budgetPercent} className="h-2" />
                  <p className="text-[9px] text-muted-foreground mt-1">${(businessProfile.monthlyBudget - businessProfile.monthlySpent).toFixed(2)} remaining</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: "Rides", value: businessProfile.totalRides },
                    { label: "Pending", value: businessProfile.pendingApprovals },
                    { label: "Spent", value: `$${businessProfile.monthlySpent}` },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl bg-card/60 p-2.5 text-center">
                      <p className="text-lg font-black text-foreground">{s.value}</p>
                      <p className="text-[9px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick tag */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Tag Next Ride
                </h3>
                <div className="flex gap-2">
                  <Input placeholder="e.g., Client Meeting" value={expenseTag} onChange={e => setExpenseTag(e.target.value)} className="h-11 rounded-xl text-sm" />
                  <Button className="h-11 px-4 rounded-xl font-bold" disabled={!expenseTag.trim()} onClick={() => { toast.success(`Tagged: ${expenseTag}`); setExpenseTag(""); }}>
                    Tag
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Client Meeting", "Conference", "Airport Transfer", "Team Dinner"].map(t => (
                    <button type="button" key={t} onClick={() => setExpenseTag(t)} className="px-2.5 py-1 rounded-lg bg-muted/20 border border-border/40 text-[10px] font-medium text-foreground hover:border-primary/20 transition-colors">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "expenses" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Expenses</h3>
                <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-lg gap-1">
                  <Download className="w-3 h-3" /> Export
                </Button>
              </div>
              {recentExpenses.map((exp, i) => (
                <motion.div key={exp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl bg-card border border-border/40 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", exp.status === "approved" ? "bg-emerald-500/10" : exp.status === "pending" ? "bg-amber-500/10" : "bg-red-500/10")}>
                      {exp.status === "approved" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : exp.status === "pending" ? <Clock className="w-4 h-4 text-amber-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{exp.route}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{exp.date}</span>
                        <Badge variant="outline" className="text-[8px] font-bold h-4">{exp.tag}</Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-foreground">${exp.amount.toFixed(2)}</p>
                      <Badge className={cn("text-[8px] font-bold border-0 capitalize", exp.status === "approved" ? "bg-emerald-500/10 text-emerald-500" : exp.status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500")}>
                        {exp.status}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "team" && (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground px-1">Team ride usage this month</p>
              {teamMembers.map((member, i) => (
                <motion.div key={member.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl bg-card border border-border/40 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{member.name.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-foreground">{member.name}</p>
                        <Badge variant="outline" className="text-[8px] font-bold h-4">{member.role}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{member.rides} rides · ${member.spent.toFixed(2)}</p>
                    </div>
                    {member.status === "limit-warning" && (
                      <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[8px] font-bold">Near limit</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "policy" && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">Company Policy</h3>
                {[
                  { rule: "Max ride cost", value: "$75 per trip" },
                  { rule: "Monthly budget", value: "$500 per employee" },
                  { rule: "Approved categories", value: "Business only" },
                  { rule: "Premium rides", value: "Manager approval required" },
                  { rule: "Weekend rides", value: "Not covered" },
                  { rule: "Airport transfers", value: "Auto-approved" },
                ].map(policy => (
                  <div key={policy.rule} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <span className="text-xs text-muted-foreground">{policy.rule}</span>
                    <span className="text-xs font-bold text-foreground">{policy.value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-muted/20 border border-border/30 p-3">
                <p className="text-[10px] text-muted-foreground">Policy set by your company admin. Contact your travel manager for changes.</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
