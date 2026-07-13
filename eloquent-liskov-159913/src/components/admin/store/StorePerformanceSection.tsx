import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/shared/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Star, Target, TrendingUp, MessageSquare, Plus, Search, Calendar,
  ChevronRight, Award, BarChart3, Users, ThumbsUp, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface Props { storeId: string; }

type Review = {
  id: string; employeeId: string; employeeName: string; period: string;
  rating: number; status: "draft" | "submitted" | "completed";
  goals: Goal[]; feedback: string; reviewDate: string;
};
type Goal = { id: string; title: string; progress: number; status: "on-track" | "at-risk" | "completed"; };

export default function StorePerformanceSection({ storeId }: Props) {
  const [tab, setTab] = useState<"reviews" | "goals" | "feedback">("reviews");
  const [search, setSearch] = useState("");
  const [showNewReview, setShowNewReview] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [newReview, setNewReview] = useState({ employeeId: "", period: "Q2 2026", feedback: "" });

  const { data: employees = [] } = useQuery({
    queryKey: ["store-employees-perf", storeId],
    queryFn: async () => {
      const { data } = await supabase.from("store_employees").select("*").eq("store_id", storeId).eq("status", "active");
      return data || [];
    },
  });

  const [reviews, setReviews] = useState<Review[]>([
    {
      id: "1", employeeId: "e1", employeeName: "kimlain", period: "Q1 2026",
      rating: 4.2, status: "completed", reviewDate: "2026-03-31",
      feedback: "Excellent customer service skills. Consistently meets targets.",
      goals: [
        { id: "g1", title: "Increase sales by 15%", progress: 85, status: "on-track" },
        { id: "g2", title: "Complete advanced training", progress: 100, status: "completed" },
        { id: "g3", title: "Reduce customer complaints", progress: 60, status: "at-risk" },
      ],
    },
  ]);

  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "0";
  const completedReviews = reviews.filter(r => r.status === "completed").length;
  const totalGoals = reviews.reduce((a, r) => a + r.goals.length, 0);
  const completedGoals = reviews.reduce((a, r) => a + r.goals.filter(g => g.status === "completed").length, 0);

  const stats = [
    { icon: Star, label: "Avg Rating", value: `${avgRating}/5`, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { icon: BarChart3, label: "Reviews", value: `${completedReviews}/${reviews.length}`, color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Target, label: "Goals Met", value: `${completedGoals}/${totalGoals}`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Users, label: "Active Staff", value: employees.length, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  const statusConfig = {
    draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
    submitted: { label: "Submitted", color: "bg-blue-100 text-blue-600" },
    completed: { label: "Completed", color: "bg-emerald-100 text-emerald-600" },
  };

  const goalStatusConfig = {
    "on-track": { label: "On Track", color: "text-emerald-600", icon: TrendingUp },
    "at-risk": { label: "At Risk", color: "text-amber-600", icon: AlertCircle },
    completed: { label: "Completed", color: "text-blue-600", icon: Award },
  };

  const renderStars = (rating: number) => (
    <StarRating value={rating} size="sm" showValue />
  );

  const handleCreateReview = () => {
    if (!newReview.employeeId) return toast.error("Select an employee");
    const emp = employees.find((e: any) => e.id === newReview.employeeId);
    const r: Review = {
      id: Date.now().toString(), employeeId: newReview.employeeId,
      employeeName: (emp as any)?.name || "Employee", period: newReview.period,
      rating: 0, status: "draft", reviewDate: new Date().toISOString().split("T")[0],
      feedback: newReview.feedback, goals: [],
    };
    setReviews(prev => [r, ...prev]);
    setShowNewReview(false);
    setNewReview({ employeeId: "", period: "Q2 2026", feedback: "" });
    toast.success("Review created");
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
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
          { id: "reviews" as const, label: "Reviews", icon: Star },
          { id: "goals" as const, label: "Goals", icon: Target },
          { id: "feedback" as const, label: "Feedback", icon: MessageSquare },
        ].map(t => (
          <button type="button" key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search reviews..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setShowNewReview(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          <Plus className="w-4 h-4 mr-1.5" /> New Review
        </Button>
      </div>

      {/* Reviews Tab */}
      {tab === "reviews" && (
        <div className="space-y-3">
          {reviews.filter(r => r.employeeName.toLowerCase().includes(search.toLowerCase())).map(r => (
            <button type="button" key={r.id} onClick={() => setSelectedReview(r)}
              className="w-full text-left rounded-xl border border-border/40 bg-card p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-sm font-bold text-yellow-600">
                    {r.employeeName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{r.employeeName}</p>
                    <p className="text-[10px] text-muted-foreground">{r.period} • {r.reviewDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusConfig[r.status].color)}>
                    {statusConfig[r.status].label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              {r.rating > 0 && renderStars(r.rating)}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span>{r.goals.length} goals</span>
                <span>{r.goals.filter(g => g.status === "completed").length} completed</span>
              </div>
            </button>
          ))}
          {!reviews.length && <div className="text-center py-12 text-muted-foreground text-sm">No reviews yet.</div>}
        </div>
      )}

      {/* Goals Tab */}
      {tab === "goals" && (
        <div className="space-y-3">
          {reviews.flatMap(r => r.goals.map(g => ({ ...g, employee: r.employeeName, period: r.period }))).map(g => {
            const cfg = goalStatusConfig[g.status];
            return (
              <div key={g.id} className="rounded-xl border border-border/40 bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <cfg.icon className={cn("w-4 h-4", cfg.color)} />
                    <h3 className="font-medium text-sm">{g.title}</h3>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={g.progress} className="h-2 flex-1" />
                  <span className="text-xs font-medium">{g.progress}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{g.employee} • {g.period}</p>
              </div>
            );
          })}
          {!reviews.flatMap(r => r.goals).length && <div className="text-center py-12 text-muted-foreground text-sm">No goals set.</div>}
        </div>
      )}

      {/* Feedback Tab */}
      {tab === "feedback" && (
        <div className="space-y-3">
          {reviews.filter(r => r.feedback).map(r => (
            <div key={r.id} className="rounded-xl border border-border/40 bg-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                  {r.employeeName[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{r.employeeName}</p>
                  <p className="text-[10px] text-muted-foreground">{r.period}</p>
                </div>
                {r.rating > 0 && <div className="ml-auto">{renderStars(r.rating)}</div>}
              </div>
              <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 mt-2">"{r.feedback}"</p>
            </div>
          ))}
          {!reviews.filter(r => r.feedback).length && <div className="text-center py-12 text-muted-foreground text-sm">No feedback yet.</div>}
        </div>
      )}

      {/* Review Detail Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedReview && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Performance Review — {selectedReview.employeeName}</DialogTitle>
                <p className="text-xs text-muted-foreground">{selectedReview.period} • {selectedReview.reviewDate}</p>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {selectedReview.rating > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                    <span className="text-sm font-medium">Overall Rating:</span>
                    {renderStars(selectedReview.rating)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Goals ({selectedReview.goals.length})</h4>
                  <div className="space-y-2">
                    {selectedReview.goals.map(g => {
                      const cfg = goalStatusConfig[g.status];
                      return (
                        <div key={g.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30">
                          <cfg.icon className={cn("w-4 h-4 shrink-0", cfg.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{g.title}</p>
                            <Progress value={g.progress} className="h-1.5 mt-1" />
                          </div>
                          <span className="text-xs font-medium">{g.progress}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selectedReview.feedback && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Manager Feedback</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">"{selectedReview.feedback}"</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Review Dialog */}
      <Dialog open={showNewReview} onOpenChange={setShowNewReview}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Performance Review</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Employee</Label>
              <select value={newReview.employeeId} onChange={e => setNewReview(p => ({ ...p, employeeId: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="">Select employee...</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Review Period</Label>
              <Input value={newReview.period} onChange={e => setNewReview(p => ({ ...p, period: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Initial Feedback</Label>
              <Textarea value={newReview.feedback} onChange={e => setNewReview(p => ({ ...p, feedback: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReview(false)}>Cancel</Button>
            <Button onClick={handleCreateReview} className="bg-emerald-500 hover:bg-emerald-600 text-white">Create Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
