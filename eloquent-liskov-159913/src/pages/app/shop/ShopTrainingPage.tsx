/**
 * ShopTrainingPage — Employee training & onboarding tracker
 * Stores records in feedback_submissions (category: shop_training)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, GraduationCap, Plus, CheckCircle2, Clock, BookOpen, X, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const DEFAULT_MODULES = [
  { id: "safety", title: "Workplace Safety", duration: "30 min", category: "Compliance" },
  { id: "pos",    title: "POS & Payments",   duration: "45 min", category: "Operations" },
  { id: "cs",     title: "Customer Service", duration: "60 min", category: "Soft Skills" },
  { id: "inv",    title: "Inventory Management", duration: "40 min", category: "Operations" },
  { id: "food",   title: "Food Handling & Hygiene", duration: "50 min", category: "Compliance" },
  { id: "brand",  title: "Brand & Store Values", duration: "20 min", category: "Onboarding" },
];

export default function ShopTrainingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeName: "", moduleTitle: "", status: "completed", completedAt: new Date().toISOString().slice(0, 10), notes: "" });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["shop-training", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("feedback_submissions")
        .select("id, message, created_at")
        .eq("user_id", user!.id)
        .eq("category", "shop_training")
        .order("created_at", { ascending: false })
        .limit(200);
      return ((data as any[]) || []).map((r) => {
        try { return { id: r.id, created_at: r.created_at, ...JSON.parse(r.message) }; }
        catch { return null; }
      }).filter(Boolean);
    },
    enabled: !!user,
  });

  const completedModuleIds = new Set(records.filter((r: any) => r.status === "completed").map((r: any) => r.moduleId));

  const handleSave = async () => {
    if (!form.employeeName.trim() || !form.moduleTitle.trim()) {
      toast.error("Employee name and module are required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("feedback_submissions")
        .insert({
          user_id: user!.id,
          category: "shop_training",
          message: JSON.stringify({
            employeeName: form.employeeName.trim(),
            moduleTitle: form.moduleTitle.trim(),
            status: form.status,
            completedAt: form.completedAt,
            notes: form.notes.trim(),
          }),
        });
      if (error) throw error;
      toast.success("Training record saved");
      queryClient.invalidateQueries({ queryKey: ["shop-training", user?.id] });
      setShowForm(false);
      setForm({ employeeName: "", moduleTitle: "", status: "completed", completedAt: new Date().toISOString().slice(0, 10), notes: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickLog = async (module: typeof DEFAULT_MODULES[0]) => {
    const name = prompt("Employee name:");
    if (!name?.trim()) return;
    try {
      await (supabase as any).from("feedback_submissions").insert({
        user_id: user!.id,
        category: "shop_training",
        message: JSON.stringify({
          employeeName: name.trim(),
          moduleTitle: module.title,
          moduleId: module.id,
          status: "completed",
          completedAt: new Date().toISOString().slice(0, 10),
        }),
      });
      toast.success(`${module.title} marked complete for ${name.trim()}`);
      queryClient.invalidateQueries({ queryKey: ["shop-training", user?.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <AppLayout title="Training" hideHeader>
      <div className="flex flex-col pb-28">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
          <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-lg flex-1">Training</h1>
          <button type="button" onClick={() => setShowForm(true)} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="w-4.5 h-4.5 text-primary" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Records", value: records.length, color: "text-blue-500" },
              { label: "Completed", value: records.filter((r: any) => r.status === "completed").length, color: "text-emerald-500" },
              { label: "In Progress", value: records.filter((r: any) => r.status === "in_progress").length, color: "text-amber-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/30 bg-card p-2.5 text-center">
                <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick log form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border/40 bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Log Training Record</p>
                  <button type="button" onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <input className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Employee name" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} />
                <input className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Module / course title" value={form.moduleTitle} onChange={(e) => setForm({ ...form, moduleTitle: e.target.value })} />
                <div className="flex gap-1.5">
                  {["completed", "in_progress", "not_started"].map((s) => (
                    <button type="button" key={s} onClick={() => setForm({ ...form, status: s })}
                      className={cn("px-3 py-1 rounded-full text-xs font-medium border",
                        form.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/40")}>
                      {s === "completed" ? "Completed" : s === "in_progress" ? "In Progress" : "Not Started"}
                    </button>
                  ))}
                </div>
                <input type="date" className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  value={form.completedAt} onChange={(e) => setForm({ ...form, completedAt: e.target.value })} />
                <button type="button" onClick={handleSave} disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Default modules */}
          <div>
            <p className="font-semibold text-sm mb-2">Standard Modules</p>
            <div className="rounded-xl border border-border/30 overflow-hidden divide-y divide-border/20">
              {DEFAULT_MODULES.map((mod) => (
                <button type="button" key={mod.id} onClick={() => handleQuickLog(mod)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-muted/30 text-left transition-colors">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    completedModuleIds.has(mod.id) ? "bg-emerald-500/10" : "bg-blue-500/10")}>
                    {completedModuleIds.has(mod.id)
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <BookOpen className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">{mod.title}</p>
                    <p className="text-[11px] text-muted-foreground">{mod.category} · {mod.duration}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent records */}
          {records.length > 0 && (
            <div>
              <p className="font-semibold text-sm mb-2">Recent Records</p>
              <div className="space-y-2">
                {records.slice(0, 20).map((r: any, i: number) => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-border/30 bg-card px-3.5 py-3 flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      r.status === "completed" ? "bg-emerald-500/10" : r.status === "in_progress" ? "bg-amber-500/10" : "bg-muted")}>
                      {r.status === "completed"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <Clock className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{r.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{r.moduleTitle} · {r.completedAt}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && records.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium">No training records yet</p>
              <p className="text-xs text-muted-foreground">Tap a module above to log completions</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
