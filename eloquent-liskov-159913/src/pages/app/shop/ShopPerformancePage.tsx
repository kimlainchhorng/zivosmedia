/**
 * ShopPerformancePage — Employee performance reviews
 * Stores records in feedback_submissions (category: shop_performance)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, Plus, X, TrendingUp, Award } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const PERIODS = ["Monthly", "Quarterly", "Annual"];
const RATINGS = [1, 2, 3, 4, 5];

const RATING_LABEL: Record<number, string> = {
  1: "Needs Improvement",
  2: "Below Expectations",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Outstanding",
};

const RATING_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-amber-500",
  4: "text-blue-500",
  5: "text-emerald-500",
};

export default function ShopPerformancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeName: "",
    period: "Monthly",
    rating: 3,
    strengths: "",
    improvements: "",
    goals: "",
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["shop-performance", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("feedback_submissions")
        .select("id, message, created_at")
        .eq("user_id", user!.id)
        .eq("category", "shop_performance")
        .order("created_at", { ascending: false })
        .limit(100);
      return ((data as any[]) || []).map((r) => {
        try { return { id: r.id, created_at: r.created_at, ...JSON.parse(r.message) }; }
        catch { return null; }
      }).filter(Boolean);
    },
    enabled: !!user,
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
    : "—";

  const handleSave = async () => {
    if (!form.employeeName.trim()) { toast.error("Employee name required"); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("feedback_submissions")
        .insert({
          user_id: user!.id,
          category: "shop_performance",
          message: JSON.stringify({
            employeeName: form.employeeName.trim(),
            period: form.period,
            rating: form.rating,
            strengths: form.strengths.trim(),
            improvements: form.improvements.trim(),
            goals: form.goals.trim(),
            reviewDate: new Date().toISOString().slice(0, 10),
          }),
        });
      if (error) throw error;
      toast.success("Review saved");
      queryClient.invalidateQueries({ queryKey: ["shop-performance", user?.id] });
      setShowForm(false);
      setForm({ employeeName: "", period: "Monthly", rating: 3, strengths: "", improvements: "", goals: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Performance" hideHeader>
      <div className="flex flex-col pb-28">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
          <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-lg flex-1">Performance Reviews</h1>
          <button type="button" onClick={() => setShowForm(true)} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="w-4.5 h-4.5 text-primary" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/30 bg-card p-2.5 text-center">
              <p className="text-xl font-bold text-primary">{reviews.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Reviews</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-card p-2.5 text-center">
              <p className="text-xl font-bold text-amber-500">{avgRating}</p>
              <p className="text-[10px] text-muted-foreground">Avg Rating</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-card p-2.5 text-center">
              <p className="text-xl font-bold text-emerald-500">
                {reviews.filter((r: any) => r.rating >= 4).length}
              </p>
              <p className="text-[10px] text-muted-foreground">Top Performers</p>
            </div>
          </div>

          {/* Add review form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border/40 bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">New Performance Review</p>
                  <button type="button" onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <input
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Employee name"
                  value={form.employeeName}
                  onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
                />
                <div className="flex gap-1.5">
                  {PERIODS.map((p) => (
                    <button type="button" key={p} onClick={() => setForm({ ...form, period: p })}
                      className={cn("px-3 py-1 rounded-full text-xs font-medium border",
                        form.period === p ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/40")}>
                      {p}
                    </button>
                  ))}
                </div>
                {/* Star rating */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Overall rating</p>
                  <div className="flex gap-2">
                    {RATINGS.map((r) => (
                      <button type="button" key={r} onClick={() => setForm({ ...form, rating: r })}>
                        <Star className={cn("w-7 h-7 transition-colors",
                          r <= form.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
                      </button>
                    ))}
                  </div>
                  <p className={cn("text-xs mt-1 font-medium", RATING_COLOR[form.rating])}>
                    {RATING_LABEL[form.rating]}
                  </p>
                </div>
                <textarea
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30 resize-none min-h-[60px]"
                  placeholder="Key strengths"
                  value={form.strengths}
                  onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                />
                <textarea
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30 resize-none min-h-[60px]"
                  placeholder="Areas for improvement"
                  value={form.improvements}
                  onChange={(e) => setForm({ ...form, improvements: e.target.value })}
                />
                <textarea
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30 resize-none min-h-[50px]"
                  placeholder="Goals for next period"
                  value={form.goals}
                  onChange={(e) => setForm({ ...form, goals: e.target.value })}
                />
                <button type="button" onClick={handleSave} disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                  {saving ? "Saving…" : "Save Review"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reviews list */}
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Award className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium">No reviews yet</p>
              <p className="text-xs text-muted-foreground">Tap + to create your first performance review</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.map((r: any, i: number) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border/30 bg-card p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px]">{r.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground">{r.period} · {r.reviewDate}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {RATINGS.map((s) => (
                        <Star key={s} className={cn("w-3.5 h-3.5",
                          s <= (r.rating ?? 0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")} />
                      ))}
                    </div>
                  </div>
                  {r.strengths && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      <span className="font-semibold text-foreground/60">Strengths:</span> {r.strengths}
                    </p>
                  )}
                  {r.improvements && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      <span className="font-semibold text-foreground/60">Improve:</span> {r.improvements}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
