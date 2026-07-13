import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, ClipboardCheck, Award, Plus, Search,
  CheckCircle2, Clock, Users, ChevronRight, Sparkles, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useStoreTrainingPrograms,
  type ProgramDraft,
  type ProgramType,
  type TrainingProgram,
} from "@/hooks/store/useStoreTrainingPrograms";
import { useStoreTrainingAssignments } from "@/hooks/store/useStoreTrainingAssignments";

interface Props { storeId: string; }

const DEFAULT_PROGRAMS: ProgramDraft[] = [
  {
    name: "New Hire Onboarding",
    type: "onboarding",
    description: "Complete onboarding checklist for new employees",
    modules: [
      { title: "Company Overview & Culture", duration_minutes: 30 },
      { title: "Systems & Tools Setup", duration_minutes: 60 },
      { title: "Role-Specific Training", duration_minutes: 120 },
      { title: "Safety & Compliance", duration_minutes: 45 },
      { title: "First Week Goals", duration_minutes: 15 },
    ],
  },
  {
    name: "Customer Service Excellence",
    type: "training",
    description: "Advanced customer interaction and conflict resolution",
    modules: [
      { title: "Communication Fundamentals", duration_minutes: 45 },
      { title: "Handling Complaints", duration_minutes: 60 },
      { title: "Upselling Techniques", duration_minutes: 30 },
    ],
  },
  {
    name: "Food Safety Certification",
    type: "certification",
    description: "Required food handling and safety certification",
    modules: [
      { title: "Food Handling Basics", duration_minutes: 60 },
      { title: "Temperature Control", duration_minutes: 45 },
      { title: "Sanitation Procedures", duration_minutes: 60 },
      { title: "Final Assessment", duration_minutes: 30 },
    ],
  },
];

const TYPE_CONFIG: Record<ProgramType, { label: string; color: string }> = {
  onboarding: { label: "Onboarding", color: "bg-success/10 text-success" },
  training: { label: "Training", color: "bg-primary/10 text-primary" },
  certification: { label: "Certification", color: "bg-warning/10 text-warning" },
};

function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h} hr`;
}

export default function StoreTrainingSection({ storeId }: Props) {
  const { list, upsert, remove, seedDefaults } = useStoreTrainingPrograms(storeId);
  const programs = list.data || [];

  const [tab, setTab] = useState<"programs" | "assignments" | "certifications">("programs");
  const [search, setSearch] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newProgram, setNewProgram] = useState<{ name: string; type: ProgramType; description: string }>({
    name: "", type: "training", description: "",
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["store-employees-training", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_employees")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "active");
      return data || [];
    },
  });

  const stats = [
    { icon: BookOpen, label: "Programs", value: programs.length, color: "text-primary", bg: "bg-primary/10" },
    { icon: ClipboardCheck, label: "Modules", value: programs.reduce((a, p) => a + p.modules.length, 0), color: "text-info", bg: "bg-info/10" },
    { icon: Award, label: "Certifications", value: programs.filter((p) => p.type === "certification").length, color: "text-warning", bg: "bg-warning/10" },
    { icon: Users, label: "Active Staff", value: employees.length, color: "text-success", bg: "bg-success/10" },
  ];

  const filtered = useMemo(
    () => programs.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [programs, search],
  );

  const handleCreate = async () => {
    if (!newProgram.name.trim()) return toast.error("Name required");
    try {
      await upsert.mutateAsync({
        name: newProgram.name.trim(),
        type: newProgram.type,
        description: newProgram.description.trim(),
      });
      setShowCreate(false);
      setNewProgram({ name: "", type: "training", description: "" });
      toast.success("Program created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create program");
    }
  };

  const handleSeed = async () => {
    try {
      await seedDefaults.mutateAsync(DEFAULT_PROGRAMS);
      toast.success("Default programs added");
    } catch (e: any) {
      toast.error(e.message || "Failed to seed defaults");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      setSelectedProgram(null);
      toast.success("Program deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/40 bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", s.bg)}>
                <s.icon className={cn("w-5 h-5", s.color)} />
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
          { id: "programs" as const, label: "Programs", icon: BookOpen },
          { id: "assignments" as const, label: "Assignments", icon: Users },
          { id: "certifications" as const, label: "Certifications", icon: Award },
        ].map((t) => (
          <button type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search programs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Program
        </Button>
      </div>

      {/* Programs List */}
      {tab === "programs" && (
        <div className="space-y-3">
          {list.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/50 p-10 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-sm font-semibold mb-1">No training programs yet</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Create your first program or load our recommended starter set.
              </p>
              <Button variant="outline" size="sm" onClick={handleSeed} disabled={seedDefaults.isPending}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {seedDefaults.isPending ? "Seeding..." : "Seed default programs"}
              </Button>
            </div>
          ) : (
            filtered.map((p) => {
              const cfg = TYPE_CONFIG[p.type];
              return (
                <button type="button"
                  key={p.id}
                  onClick={() => setSelectedProgram(p)}
                  className="w-full text-left rounded-xl border border-border/40 bg-card p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{p.name}</h3>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", cfg.color)}>
                          {cfg.label}
                        </span>
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{p.modules.length} modules</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {tab === "assignments" && <AssignmentsView programs={programs} employees={employees} />}

      {/* Certifications Tab */}
      {tab === "certifications" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.filter((p) => p.type === "certification").map((p) => (
            <button type="button"
              key={p.id}
              onClick={() => setSelectedProgram(p)}
              className="text-left rounded-xl border border-border/40 bg-card p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{p.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{p.modules.length} modules • Required</p>
                </div>
              </div>
            </button>
          ))}
          {programs.filter((p) => p.type === "certification").length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">No certifications yet.</div>
          )}
        </div>
      )}

      {/* Program Detail Dialog */}
      <Dialog open={!!selectedProgram} onOpenChange={() => setSelectedProgram(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedProgram && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base">{selectedProgram.name}</DialogTitle>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", TYPE_CONFIG[selectedProgram.type].color)}>
                    {TYPE_CONFIG[selectedProgram.type].label}
                  </span>
                </div>
                {selectedProgram.description && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedProgram.description}</p>
                )}
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {selectedProgram.modules.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No modules added yet.</p>
                ) : (
                  selectedProgram.modules.map((m, i) => (
                    <div
                      key={m.id}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/40 text-left"
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-muted text-muted-foreground">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(m.duration_minutes)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(selectedProgram.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete program
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Program</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Program Name</Label>
              <Input
                value={newProgram.name}
                onChange={(e) => setNewProgram((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Safety Training"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(["training", "onboarding", "certification"] as const).map((t) => (
                  <button type="button"
                    key={t}
                    onClick={() => setNewProgram((p) => ({ ...p, type: t }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      newProgram.type === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newProgram.description}
                onChange={(e) => setNewProgram((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={upsert.isPending}>
              {upsert.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Assignments tab — shows employee progress per program (uses first program if any). */
function AssignmentsView({ programs, employees }: { programs: TrainingProgram[]; employees: any[] }) {
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(programs[0]?.id || null);
  const { list, assign, unassign } = useStoreTrainingAssignments(selectedProgramId);
  const assignments = list.data || [];
  const assignedIds = new Set(assignments.map((a) => a.employee_id));

  if (!programs.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Create a program first to manage assignments.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {programs.map((p) => (
          <button type="button"
            key={p.id}
            onClick={() => setSelectedProgramId(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              selectedProgramId === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 text-xs text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Employee</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Progress</th>
              <th className="text-right px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {employees.length ? employees.map((emp: any) => {
              const a = assignments.find((x) => x.employee_id === emp.id);
              const assigned = !!a;
              return (
                <tr key={emp.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(emp.name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-xs">{emp.name}</p>
                        <p className="text-[10px] text-muted-foreground">{emp.role || "Staff"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {assigned ? (
                      <Badge variant="outline" className="text-[10px]">
                        {a!.status === "completed" ? <><CheckCircle2 className="w-3 h-3 mr-1 text-success" />Completed</> : a!.status}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {assigned ? <Progress value={a!.progress_pct} className="h-1.5 w-24" /> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {assigned ? (
                      <Button variant="ghost" size="sm" onClick={() => unassign.mutate(a!.id)}>Remove</Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => assign.mutate([emp.id])}
                        disabled={assignedIds.has(emp.id)}
                      >
                        Assign
                      </Button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">No active employees.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
