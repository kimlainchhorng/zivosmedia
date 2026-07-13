/**
 * ShopAttendancePage — Employee attendance & leave management
 * Stores records in feedback_submissions (category: shop_attendance)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CalendarCheck, Clock, Plus, CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type RecordType = "present" | "absent" | "late" | "leave";

const STATUS_META: Record<RecordType, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  present: { label: "Present",  color: "text-emerald-500 bg-emerald-500/10", icon: CheckCircle2 },
  absent:  { label: "Absent",   color: "text-red-500 bg-red-500/10",         icon: XCircle },
  late:    { label: "Late",     color: "text-amber-500 bg-amber-500/10",      icon: AlertCircle },
  leave:   { label: "On Leave", color: "text-purple-500 bg-purple-500/10",    icon: CalendarCheck },
};

const filterTabs = ["All", "Present", "Absent", "Late", "Leave"] as const;

export default function ShopAttendancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filterTab, setFilterTab] = useState<typeof filterTabs[number]>("All");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeName: "",
    date: new Date().toISOString().slice(0, 10),
    status: "present" as RecordType,
    notes: "",
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["shop-attendance", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("feedback_submissions")
        .select("id, message, created_at")
        .eq("user_id", user!.id)
        .eq("category", "shop_attendance")
        .order("created_at", { ascending: false })
        .limit(100);
      return ((data as any[]) || []).map((r) => {
        try { return { id: r.id, created_at: r.created_at, ...JSON.parse(r.message) }; }
        catch { return null; }
      }).filter(Boolean);
    },
    enabled: !!user,
  });

  const filtered = records.filter((r: any) =>
    filterTab === "All" ? true : r.status === filterTab.toLowerCase()
  );

  const handleSave = async () => {
    if (!form.employeeName.trim()) { toast.error("Employee name required"); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("feedback_submissions")
        .insert({
          user_id: user!.id,
          category: "shop_attendance",
          message: JSON.stringify({
            employeeName: form.employeeName.trim(),
            date: form.date,
            status: form.status,
            notes: form.notes.trim(),
          }),
        });
      if (error) throw error;
      toast.success("Attendance recorded");
      queryClient.invalidateQueries({ queryKey: ["shop-attendance", user?.id] });
      setShowForm(false);
      setForm({ employeeName: "", date: new Date().toISOString().slice(0, 10), status: "present", notes: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    present: records.filter((r: any) => r.status === "present").length,
    absent:  records.filter((r: any) => r.status === "absent").length,
    late:    records.filter((r: any) => r.status === "late").length,
    leave:   records.filter((r: any) => r.status === "leave").length,
  };

  return (
    <AppLayout title="Attendance & Leave" hideHeader>
      <div className="flex flex-col pb-28">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
          <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-lg flex-1">Attendance & Leave</h1>
          <button type="button"
            onClick={() => setShowForm(true)}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Plus className="w-4.5 h-4.5 text-primary" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(stats) as [RecordType, number][]).map(([key, val]) => {
              const meta = STATUS_META[key];
              return (
                <div key={key} className="rounded-xl border border-border/30 bg-card p-2.5 text-center">
                  <p className="text-lg font-bold">{val}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{meta.label}</p>
                </div>
              );
            })}
          </div>

          {/* Add form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border/40 bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Add Attendance Record</p>
                  <button type="button" onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <input
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Employee name"
                  value={form.employeeName}
                  onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
                />
                <input
                  type="date"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(STATUS_META) as RecordType[]).map((s) => (
                    <button type="button"
                      key={s}
                      onClick={() => setForm({ ...form, status: s })}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                        form.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/40"
                      )}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
                <input
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Notes (optional)"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
                <button type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Record"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {filterTabs.map((tab) => (
              <button type="button"
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  filterTab === tab ? "bg-primary text-primary-foreground border-primary" : "border-border/50 bg-muted/30"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Records */}
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CalendarCheck className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium">No records yet</p>
              <p className="text-xs text-muted-foreground">Tap + to add attendance records</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r: any, i: number) => {
                const meta = STATUS_META[r.status as RecordType] ?? STATUS_META.present;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-border/30 bg-card px-3.5 py-3 flex items-center gap-3"
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", meta.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px]">{r.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground">{r.date} {r.notes ? `· ${r.notes}` : ""}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", meta.color)}>
                      {meta.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
