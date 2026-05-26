import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield, Lock, Eye, Clock, AlertTriangle, Plus, Search,
  CheckCircle2, Edit, Trash2, Users, FileText, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useStoreEmployeeRules, type RuleSeverity, type StoreEmployeeRule, type RuleDraft } from "@/hooks/store/useStoreEmployeeRules";

interface Props { storeId: string; }

const SEVERITY_CONFIG: Record<RuleSeverity, { label: string; tone: string }> = {
  low: { label: "Low", tone: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", tone: "bg-primary/10 text-primary" },
  high: { label: "High", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  critical: { label: "Critical", tone: "bg-destructive/10 text-destructive" },
};

const CATEGORY_OPTIONS = ["Workplace Conduct", "Attendance", "Security & Access", "Dress Code", "Communication", "Safety", "Data & Privacy"];

const DEFAULT_RULES: RuleDraft[] = [
  { title: "Clock In/Out Required", category: "Attendance", description: "All employees must clock in and out for every shift. Failure to do so will result in a warning.", severity: "high", applies_to: "All Staff" },
  { title: "Uniform Policy", category: "Dress Code", description: "Employees must wear the provided company uniform during work hours. Name badge must be visible at all times.", severity: "medium", applies_to: "All Staff" },
  { title: "No Personal Phone Usage", category: "Workplace Conduct", description: "Personal phones must be kept in lockers during shift. Emergency calls are permitted in break areas.", severity: "medium", applies_to: "Floor Staff" },
  { title: "Cash Register Access", category: "Security & Access", description: "Only authorized personnel may access cash registers. Each employee has a unique PIN.", severity: "critical", applies_to: "Cashiers" },
  { title: "Break Schedule", category: "Attendance", description: "15-minute break for 4-hour shifts, 30-minute break for 6+ hour shifts. Breaks must be taken at designated times.", severity: "low", applies_to: "All Staff" },
  { title: "Customer Data Privacy", category: "Data & Privacy", description: "Employee must not share, copy, or discuss customer information outside of work. Violation results in immediate termination.", severity: "critical", applies_to: "All Staff" },
  { title: "Safety Equipment Required", category: "Safety", description: "Appropriate PPE must be worn in storage and kitchen areas at all times.", severity: "high", applies_to: "Kitchen & Storage" },
  { title: "Social Media Policy", category: "Communication", description: "Employees may not post about internal operations, customers, or proprietary info on social media.", severity: "medium", applies_to: "All Staff", is_active: false },
];

const ACCESS_LEVELS = [
  { role: "Manager", permissions: ["Full POS Access", "Employee Management", "Reports", "Settings", "Inventory", "Refunds"], tone: "text-primary" },
  { role: "Supervisor", permissions: ["POS Access", "View Reports", "Inventory", "Refunds up to $50"], tone: "text-primary/80" },
  { role: "Cashier", permissions: ["POS Access", "View Own Schedule", "Clock In/Out"], tone: "text-emerald-600 dark:text-emerald-400" },
  { role: "Staff", permissions: ["View Own Schedule", "Clock In/Out", "View Tasks"], tone: "text-muted-foreground" },
];

const STARTER_POLICIES = [
  { title: "Employee Handbook", version: "v3.2", updated: "2026-03-01", pages: 42 },
  { title: "Code of Conduct", version: "v2.1", updated: "2026-02-15", pages: 12 },
  { title: "Health & Safety Policy", version: "v1.8", updated: "2026-01-20", pages: 18 },
  { title: "Anti-Harassment Policy", version: "v2.0", updated: "2026-03-10", pages: 8 },
  { title: "Data Protection Guidelines", version: "v1.5", updated: "2026-03-01", pages: 15 },
];

const blankForm: RuleDraft = { title: "", category: "Workplace Conduct", description: "", severity: "medium", applies_to: "All Staff" };

export default function StoreEmployeeRulesSection({ storeId }: Props) {
  const { list, upsert, remove, toggleActive, seedDefaults } = useStoreEmployeeRules(storeId);
  const rules = list.data || [];

  const [tab, setTab] = useState<"rules" | "access" | "policies">("rules");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleDraft>(blankForm);

  const activeRules = rules.filter((r) => r.is_active).length;
  const criticalRules = rules.filter((r) => r.severity === "critical" && r.is_active).length;
  const categories = useMemo(() => Array.from(new Set(rules.map((r) => r.category))), [rules]);

  const stats = [
    { icon: Shield, label: "Total Rules", value: rules.length, tone: "bg-primary/10 text-primary" },
    { icon: CheckCircle2, label: "Active", value: activeRules, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { icon: AlertTriangle, label: "Critical", value: criticalRules, tone: "bg-destructive/10 text-destructive" },
    { icon: FileText, label: "Categories", value: categories.length, tone: "bg-muted text-foreground/70" },
  ];

  const filtered = rules.filter((r) =>
    (categoryFilter === "All" || r.category === categoryFilter) &&
    (r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(blankForm);
    setShowCreate(true);
  };

  const openEdit = (r: StoreEmployeeRule) => {
    setEditingId(r.id);
    setForm({
      id: r.id,
      title: r.title,
      category: r.category,
      description: r.description,
      severity: r.severity,
      applies_to: r.applies_to,
      is_active: r.is_active,
    });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    try {
      await upsert.mutateAsync(editingId ? { ...form, id: editingId } : form);
      toast.success(editingId ? "Rule updated" : "Rule created");
      setShowCreate(false);
      setEditingId(null);
      setForm(blankForm);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleToggle = async (r: StoreEmployeeRule) => {
    try {
      await toggleActive.mutateAsync({ id: r.id, is_active: r.is_active });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success("Rule deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleSeed = async () => {
    try {
      await seedDefaults.mutateAsync(DEFAULT_RULES);
      toast.success("Default rules added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/40 bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", s.tone)}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {[
          { id: "rules" as const, label: "Rules", icon: Shield },
          { id: "access" as const, label: "Access Levels", icon: Lock },
          { id: "policies" as const, label: "Policies", icon: FileText },
        ].map((t) => (
          <button type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "rules" && (
        <>
          {/* Loading */}
          {list.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!list.isLoading && rules.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">No employee rules yet</h3>
                <p className="text-xs text-muted-foreground mt-1">Add your first rule, or start with our recommended defaults.</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button onClick={openCreate} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Rule
                </Button>
                <Button onClick={handleSeed} disabled={seedDefaults.isPending} size="sm">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {seedDefaults.isPending ? "Adding…" : "Seed defaults"}
                </Button>
              </div>
            </div>
          )}

          {/* Filters + create */}
          {!list.isLoading && rules.length > 0 && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {["All", ...categories].map((c) => (
                  <button type="button"
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      categoryFilter === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search rules..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Button onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Rule
                </Button>
              </div>

              <div className="space-y-2">
                {filtered.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "rounded-xl border bg-card p-4 transition-all",
                      r.is_active ? "border-border/40" : "border-border/20 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-sm">{r.title}</h3>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", SEVERITY_CONFIG[r.severity].tone)}>
                            {SEVERITY_CONFIG[r.severity].label}
                          </span>
                          <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 whitespace-pre-wrap">{r.description}</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.applies_to}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={r.is_active} onCheckedChange={() => handleToggle(r)} className="scale-90" />
                        <Button variant="ghost" size="icon" aria-label="Edit rule" className="h-7 w-7" onClick={() => openEdit(r)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete rule" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No rules match your filters.</p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === "access" && (
        <div className="space-y-4">
          {ACCESS_LEVELS.map((a) => (
            <div key={a.role} className="rounded-xl border border-border/40 bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Lock className={cn("w-5 h-5", a.tone)} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{a.role}</h3>
                  <p className="text-[10px] text-muted-foreground">{a.permissions.length} permissions</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.permissions.map((p) => (
                  <span key={p} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-muted/50 text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "policies" && (
        <div className="space-y-3">
          {STARTER_POLICIES.map((p) => (
            <div key={p.title} className="rounded-xl border border-border/40 bg-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{p.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{p.version} • {p.pages} pages • Updated {p.updated}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs"><Eye className="w-3 h-3 mr-1" /> View</Button>
                <Button variant="outline" size="sm" className="text-xs"><Edit className="w-3 h-3 mr-1" /> Edit</Button>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Document library coming next — these are templates only.
          </p>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) { setEditingId(null); setForm(blankForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Rule" : "Add Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. No Late Arrivals" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
              >
                {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <div className="flex gap-2 flex-wrap">
                {(["low", "medium", "high", "critical"] as const).map((s) => (
                  <button type="button"
                    key={s}
                    onClick={() => setForm((p) => ({ ...p, severity: s }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      form.severity === s ? cn("border-transparent", SEVERITY_CONFIG[s].tone) : "border-border text-muted-foreground"
                    )}
                  >
                    {SEVERITY_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Input value={form.applies_to} onChange={(e) => setForm((p) => ({ ...p, applies_to: e.target.value }))} placeholder="e.g. All Staff" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); setForm(blankForm); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : editingId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
